import { modelRequestKey, ModelResultCache } from './modelCache';
import { CLINICAL_SAFETY_RULES } from './clinicalSafety';
import { fetchWithTimeout } from './transport';
import { API_URL } from './transport';
import { parseModelJson } from '../modelJson';
import type { AppointmentBrief } from '../CaseEngine';
import { sha256Hash } from './transport';
import { buildReviewEvidence } from '../clinicalReview';
import { buildClinicalReviewPrompt } from '../clinicalReview';
import { normalizeClinicalReview } from '../clinicalReview';
import { evaluateClinicalUrgency } from '../clinicalTriageEngine';
import type { Message } from './gut';

export async function suggestSpecialists(
  profileData: any,
  availableSpecialists: { id: string; label: string }[]
) {
  const cleanConditions = (profileData?.conditions || profileData?.health?.conditions || []).filter(
    (c: string) => {
      const l = (c || '').toLowerCase();
      return (
        !l.includes('diagnostic ambig') &&
        !l.includes('undifferentiated') &&
        !l.includes('unknown') &&
        !l.includes('review')
      );
    }
  );

  const availableIds = new Set(availableSpecialists.map((s) => s.id));
  const suggested = new Set<string>();

  const condText = [
    ...cleanConditions,
    profileData?.healthFocus || '',
    ...(profileData?.medications || []).map((m: any) =>
      typeof m === 'string' ? m : m?.name || ''
    ),
  ]
    .join(' ')
    .toLowerCase();

  if (
    /reflux|gerd|acid|lpr|dyspepsia|gut|ibs|sibo|bloat|nausea|constipat|diarrhea|digest/i.test(
      condText
    )
  ) {
    if (availableIds.has('gastro')) suggested.add('gastro');
  }
  if (
    /tachycardia|pots|palpitation|dysautonomia|orthostatic|syncope|blood pressure|hypertens|cardio|chest/i.test(
      condText
    )
  ) {
    if (availableIds.has('cardio')) suggested.add('cardio');
  }
  if (/headache|migraine|neuro|brain|fog|tingling|numbness|dizziness|vertigo/i.test(condText)) {
    if (availableIds.has('neuro')) suggested.add('neuro');
  }
  if (/joint|arthrit|lupus|autoimmune|inflammat|connective|ankylos/i.test(condText)) {
    if (availableIds.has('rheum')) suggested.add('rheum');
  }
  if (
    /thyroid|hashimoto|diabetes|insulin|hormon|endocrine|adrenal|pcos|metabolic/i.test(condText)
  ) {
    if (availableIds.has('endo')) suggested.add('endo');
  }
  if (/allerg|histamine|mcas|urticaria|anaphylax|immune/i.test(condText)) {
    if (availableIds.has('allergy')) suggested.add('allergy');
  }
  if (/breath|asthma|lung|cough|pulmon|respirat/i.test(condText)) {
    if (availableIds.has('pulmo')) suggested.add('pulmo');
  }
  if (/pain|fibromyalgia|chronic pain/i.test(condText)) {
    if (availableIds.has('pain')) suggested.add('pain');
  }

  // If deterministic clinical rules matched specialists, return immediately (0 token burn, <0.1ms)
  if (suggested.size >= 2) {
    return {
      suggestedSpecialistIds: Array.from(suggested).slice(0, 4),
      professionalAdvice:
        'Recommended multi-specialist perspectives aligned directly with your active medical conditions and clinical history.',
    };
  }

  if (suggested.size === 1) {
    if (availableIds.has('gp')) suggested.add('gp');
    return {
      suggestedSpecialistIds: Array.from(suggested),
      professionalAdvice:
        'Primary specialist pathway identified alongside general clinical oversight.',
    };
  }

  const profileSummary = {
    age: profileData?.demographics?.age,
    gender: profileData?.demographics?.gender,
    conditions: cleanConditions,
    medications: (profileData?.medications || []).map((m: any) => m.name),
    healthFocus: profileData?.healthFocus,
  };
  const specialistIds = availableSpecialists.map((s: any) => ({ id: s.id, label: s.label }));

  const prompt = `
You are a medical triage AI. Recommend 2 to 4 specialists to investigate this patient's case.

Patient: ${JSON.stringify(profileSummary)}
Specialists: ${JSON.stringify(specialistIds)}

Respond ONLY as JSON:
{
  "suggestedSpecialistIds": ["id1", "id2"],
  "professionalAdvice": "These may be useful specialist perspectives to discuss with your primary clinician based on the information provided."
}
${CLINICAL_SAFETY_RULES}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      maxOutputTokens: 250,
    },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'suggest_specialists' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      return parseModelJson<any>(text, null);
    }
  } catch (err) {
    console.error('Specialist suggestion error:', err);
    return null;
  }
}

const differentialInFlight = new Map<string, Promise<any>>();

export async function runDifferentialAnalysis(
  intakeData: any,
  medicalRecords: any[],
  profileData: any
) {
  const requestKey = modelRequestKey({
    intakeData,
    records: (medicalRecords || []).map((record: any) => ({
      id: record.id,
      filename: record.filename,
      findings: record.findings,
      keyFindings: record.keyFindings,
    })),
    profile: {
      age: profileData?.demographics?.age,
      gender: profileData?.demographics?.gender,
      conditions: profileData?.health?.conditions || profileData?.medicalConditions,
    },
  });
  const existing = differentialInFlight.get(requestKey);
  if (existing) return existing;

  const request = (async () => {
    const prompt = `
You are an AI appointment-preparation assistant, not a clinician.
Use only the supplied symptoms and medical records to organize a short list of possibilities for clinician discussion. Do not diagnose, invent findings, or imply that a possibility is likely.

Patient Profile:
${JSON.stringify({ age: profileData?.demographics?.age, gender: profileData?.demographics?.gender, conditions: profileData?.health?.conditions || profileData?.medicalConditions })}

Case Intake & Symptoms:
${JSON.stringify(intakeData)}

Uploaded Medical Records:
${JSON.stringify(medicalRecords.map((r) => ({ test: r.testName || r.filename, findings: r.keyFindings || (typeof r.findings === 'string' ? r.findings.substring(0, 300) + '...' : 'Available'), abnormal: r.abnormalities })))}

Identify up to 4 possible discussion pathways only when the supplied evidence supports mentioning them. Set probability to 0 because HealthChain does not calculate diagnostic probability. Do not recommend tests; leave nextBestTests empty and put missing evidence in refutingEvidence.

Respond ONLY with a JSON array of objects in this exact format, with no markdown formatting or backticks:
[
  {
    "id": "uuid1",
    "condition": "Hypothyroidism",
    "probability": 0,
    "trend": "stable",
    "supportingEvidence": ["Fatigue", "Weight gain", "Low T4"],
    "refutingEvidence": ["Normal TSH (from 6 months ago)"],
    "nextBestTests": []
  }
]
${CLINICAL_SAFETY_RULES}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        maxOutputTokens: 1000,
      },
    };

    try {
      const res = await fetchWithTimeout(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-HC-Operation': 'differential_generation',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      if (data.candidates?.[0]) {
        const text = data.candidates[0].content.parts[0].text;
        const possibilities = parseModelJson<any[]>(text, []);
        return Array.isArray(possibilities)
          ? possibilities.map((item) => ({
              ...item,
              probability: 0,
              trend: 'stable',
              nextBestTests: [],
            }))
          : [];
      }
    } catch (err) {
      console.error('DDx analysis error:', err);
      return null;
    }
  })();
  differentialInFlight.set(requestKey, request);
  request.finally(() => differentialInFlight.delete(requestKey)).catch(() => {});
  return request;
}

export async function generateProfileSynthesis(profileData: any) {
  const prompt = `
You are an AI record-organization assistant. Summarize only the information explicitly present in this saved profile for clinician discussion. Do not score the person's health, infer organ-system performance, diagnose, or invent trends.
Patient Profile: ${JSON.stringify(profileData)}

Provide your response strictly as a JSON object with this exact format (no markdown, no backticks):
{
  "radarData": [],
  "overallScore": 0,
  "synthesisText": "A 2-4 sentence summary that separates saved facts from missing information and suggests what the user may want to verify before a clinician visit."
}
${CLINICAL_SAFETY_RULES}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      maxOutputTokens: 600,
    },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'health_synthesis' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const synthesis = parseModelJson<any>(text, null);
      return synthesis ? { ...synthesis, radarData: [], overallScore: 0 } : null;
    }
  } catch (err) {
    console.error('Synthesis error:', err);
    return null;
  }
}

export async function checkDrugInteractions(newMedication: string, currentMedications: any[]) {
  const currentMedsList = currentMedications.map((m) => m.name).join(', ');

  const prompt = `
You are an AI medication-information assistant. Flag potential interaction questions between a newly added medication and the patient's current regimen for pharmacist or clinician review.
New Medication: ${newMedication}
Current Regimen: ${currentMedsList || 'None'}

Provide your response strictly as a JSON object with this exact format (no markdown, no backticks):
{
  "hasInteraction": true/false,
  "severity": "High" | "Moderate" | "Low" | "None",
  "description": "A 1-2 sentence explanation of the potential interaction question. If None, say no potential interaction was identified from the available information, not that it is safe."
}
${CLINICAL_SAFETY_RULES}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      maxOutputTokens: 250,
    },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'drug_interaction' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      return parseModelJson<any>(text, null);
    }
  } catch (err) {
    console.error('Interaction check error:', err);
    return null;
  }
}

export async function simulatePathway(actionItem: any, profile: any): Promise<any> {
  const profileContext = profile
    ? `Patient Context: Age ${profile.personal?.age || 'unknown'}, Gender: ${profile.personal?.gender || 'unknown'}. Existing conditions: ${(profile.health?.conditions || []).join(', ') || 'None'}.`
    : '';

  const prompt = `You are an AI appointment-preparation assistant.
The patient is considering this clinician-discussion item: "${actionItem.step}"
${profileContext}

Describe questions, risks, and possible follow-up topics to discuss with a qualified clinician. Do not predict outcomes, cost, recovery, or success rates. Return your findings strictly as JSON matching this exact structure:
{
  "timelineDescription": "A clinician can advise on the appropriate timing",
  "risks": ["Risk 1", "Risk 2"],
  "milestones": [
    { "day": 0, "description": "Discuss the item with a qualified clinician" }
  ],
  "alternative": "A question to ask if this option is not appropriate"
}${CLINICAL_SAFETY_RULES}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      maxOutputTokens: 1000,
    },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'treatment_simulation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      return parseModelJson(text);
    }
  } catch (err) {
    console.error('Simulation error:', err);
    return null;
  }
}

export async function generateCasePrepAnalysis(casePrepData: any): Promise<any> {
  const prompt = `You are an expert clinical triage assistant. The user is preparing for an upcoming doctor's appointment and has provided the following notes:
Concern: ${casePrepData.concern}
Timeline: ${casePrepData.timeline}
Records/Facts: ${casePrepData.records}
Care So Far: ${casePrepData.careSoFar}
Goal: ${casePrepData.goal}

Your goal is to synthesize this into a "Pharma Hub" style summary that categorizes the information perfectly for them.
Return strictly as JSON matching this structure:
{
  "name": "Case Prep Synthesis",
  "class": "Appointment Preparation",
  "uses": "A 2-3 sentence summary of the core clinical issue and timeline.",
  "sideEffects": "A 2-3 sentence summary of any red flag symptoms or significant warnings noted in their records/timeline.",
  "alternatives": ["Avenue 1: Discuss X with the doctor", "Avenue 2: Request test Y"],
  "warnings": "Important disclaimer about what they should prioritize discussing or any immediate care needed.",
  "interactions": ["Question 1 to ask the doctor", "Question 2 to ask the doctor"]
}`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 500,
      responseSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          class: { type: 'string' },
          uses: { type: 'string' },
          sideEffects: { type: 'string' },
          alternatives: { type: 'array', items: { type: 'string' } },
          warnings: { type: 'string' },
          interactions: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'name',
          'class',
          'uses',
          'sideEffects',
          'alternatives',
          'warnings',
          'interactions',
        ],
      },
    },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'case_prep_analysis' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseModelJson<any>(text, null);
  } catch (err) {
    console.error('Case prep analysis error:', err);
    return null;
  }
}

const connectionMapCache = new ModelResultCache();
const connectionMapInFlight = new Map<string, Promise<any>>();

export async function generateCaseConnectionMap(topDiagnoses: any[]): Promise<any> {
  if (!topDiagnoses || topDiagnoses.length === 0) return null;
  const requestKey = modelRequestKey(topDiagnoses);

  if (connectionMapCache.has(requestKey)) return connectionMapCache.get(requestKey);

  const existing = connectionMapInFlight.get(requestKey);
  if (existing) return existing;

  const request = (async () => {
    const prompt = `
You are an AI case-organization assistant. The input contains unverified possibilities generated by AI perspectives for a specific case; none are established diagnoses.

Build a review map that shows shared reported evidence and uncertainty without asserting causation.

Here are the pathways:
${JSON.stringify(topDiagnoses, null, 2)}

Identify:
1. The Central Symptoms: What are the 1-3 core symptoms tying all this together?
2. The Conditions: Map out the pathways provided.
3. The Connections: Show only shared symptoms, differential overlap, or explicitly uncertain possible mechanisms. Never say one condition causes another.
4. Precautions: Include only red flags supported by the supplied material; do not invent thresholds.
5. Missing Evidence: Describe information that is absent. Do not recommend tests.

Return ONLY a valid JSON object matching this exact schema:
{
  "centralSymptoms": [
    { "id": "symp1", "label": "Short symptom name", "severity": "high|medium|low" }
  ],
  "conditions": [
    { "id": "cond1", "label": "Possibility to discuss", "confidence": 0, "specialty": "Relevant specialty", "category": "infectious|allergic|inflammatory|structural|functional" }
  ],
  "connections": [
    { "from": "cond1", "to": "cond2", "type": "shared_symptom|differential_overlap|common_mechanism", "label": "Shared reported evidence or uncertain relationship", "strength": "strong|moderate|weak" },
    { "from": "symp1", "to": "cond1", "type": "symptom_presentation", "label": "Primary presentation", "strength": "strong" }
  ],
  "precautions": [
    { "text": "Only a warning explicitly supported by the supplied material", "severity": "red_flag|watch|info", "relatedConditions": ["cond1"] }
  ],
  "missingEvidence": [
    { "test": "Missing information to clarify", "wouldDifferentiate": ["cond1", "cond2"], "urgency": "Routine|Soon", "recommendedSpecialists": "Qualified clinician" }
  ],
  "narrative": "A 2-3 sentence plain English summary of how everything connects."
}
`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        maxOutputTokens: 1200,
      },
    };

    try {
      const res = await fetchWithTimeout(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'case_connection_map' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Gemini API Error: ${res.status}`);
      const data = await res.json();
      if (data.candidates?.[0]) {
        const text = data.candidates[0].content.parts[0].text;
        const result = parseModelJson<any>(text);
        if (Array.isArray(result?.conditions))
          result.conditions = result.conditions.map((condition: any) => ({
            ...condition,
            confidence: 0,
          }));
        if (Array.isArray(result?.connections))
          result.connections = result.connections.filter(
            (connection: any) => connection?.type !== 'causal_progression'
          );
        connectionMapCache.set(requestKey, result);
        return result;
      }
    } catch (err) {
      console.error('Failed to generate connection map:', err);
      return null;
    }
  })();
  connectionMapInFlight.set(requestKey, request);
  request.finally(() => connectionMapInFlight.delete(requestKey)).catch(() => {});
  return request;
}

export async function generateAppointmentQuestions(casePrepData: any): Promise<string[]> {
  const prompt = `You are an AI appointment-preparation assistant, not a clinician.
The patient has the following notes:
Concern: ${casePrepData.concern}
Timeline: ${casePrepData.timeline}
Records/Facts: ${casePrepData.records}

Generate exactly 4 specific questions the patient could ask their clinician.
The questions should sound like they were written by a smart, prepared patient.
Use only the supplied facts. Focus on interpretation, missing context, appropriate next steps, and urgency; do not name a diagnosis, order a test, or imply that a treatment is suitable.
Return strictly as a JSON array of strings.`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 600,
      responseSchema: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'appointment_questions' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseModelJson<string[]>(text, []) || [];
  } catch (err) {
    console.error('generateAppointmentQuestions error:', err);
    return [];
  }
}

export async function askAppointmentCoach(
  casePrepData: any,
  userQuestion: string
): Promise<string> {
  const prompt = `You are an expert patient-advocacy AI acting as an "Appointment Coach".
A patient is preparing for an upcoming doctor's appointment.
Here is their prep sheet:
Concern: ${casePrepData.concern || 'None'}
Timeline: ${casePrepData.timeline || 'None'}
Care so far: ${casePrepData.careSoFar || 'None'}
Goal: ${casePrepData.goal || 'None'}

The patient is anxious or curious and asks you this question about their upcoming appointment:
"${userQuestion}"

Answer them empathetically, concisely, and directly. Help them rehearse how to advocate for themselves, what specific medical terminology they might hear, or how to handle pushback from the doctor. Keep it under 4 sentences. Do NOT give a new medical diagnosis; focus entirely on *how to navigate the appointment*.`;

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'case_prep_coach' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 250 },
      }),
    });
    if (!res.ok) return "I'm having trouble connecting right now. Please try asking again.";
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    console.error('askAppointmentCoach error:', err);
    return "I'm having trouble connecting right now. Please try asking again.";
  }
}

export async function refineAppointmentBrief(
  brief: AppointmentBrief
): Promise<AppointmentBrief | null> {
  const prompt = `You are a clinical preparation AI.
Take the following structured appointment brief and refine it to be "easier to discuss".
Do NOT invent facts. Do NOT provide new medical diagnoses. Do NOT provide treatment directives.
Return ONLY valid JSON matching the exact schema of the input, but with refined text.
Input brief:
${JSON.stringify(brief, null, 2)}
`;

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'case_prep_refine' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 900 }, // low temp for deterministic rewriting
      }),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const refined = parseModelJson<any>(rawText, null);
    if (refined && typeof refined === 'object') {
      refined.isRefinedByAI = true;
      return refined;
    }
    return null;
  } catch (err) {
    console.error('refineAppointmentBrief error:', err);
    return null;
  }
}

export async function runJarvisInvestigation(
  history: string,
  files: { mimeType: string; data: string; name?: string }[],
  profile: any,
  sourceCase?: any
): Promise<any> {
  const urgency = evaluateClinicalUrgency(history);
  if (urgency.level === 'urgent_emergency_care') {
    const evidence = buildReviewEvidence(history, sourceCase);
    return normalizeClinicalReview({
      documentedFacts: evidence,
      executiveSummary: `${urgency.action} ${urgency.reason}`,
      primaryHypothesis: 'Urgent medical assessment needed',
      questionsForClinician: [],
    }, null, undefined, { evidence });
  }
  const fileHashes = await Promise.all(
    files.map((file) => sha256Hash(file.mimeType + ':' + file.data))
  );

  const evidence = buildReviewEvidence(history, sourceCase);
  const prompt =
    buildClinicalReviewPrompt(history, profile, evidence) +
    '\nATTACHMENT FILENAMES: ' +
    JSON.stringify(files.map((f) => f.name).filter(Boolean)) +
    '\nUSER REQUESTED SEPARATE RELATIONSHIPS (do not silently restore these as established connections): ' +
    JSON.stringify(sourceCase?.connectionMap?.decoupledEdgeIds || []);
  const idempotencyKey = await sha256Hash(
    JSON.stringify({ operation: 'jarvis', fileHashes, prompt })
  );

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          ...files.map((f) => ({ inlineData: { mimeType: f.mimeType, data: f.data } })),
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      maxOutputTokens: 8192,
    },
  };

  try {
    const res = await fetchWithTimeout(
      API_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'jarvis_investigation' },
        body: JSON.stringify(payload),
      },
      60000,
      idempotencyKey
    );
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      return normalizeClinicalReview(parseModelJson(text), null, undefined, {
        evidence,
        attachmentNames: files.map((f) => f.name).filter(Boolean),
      });
    }
  } catch (err) {
    console.error('Jarvis error:', err);
    return null;
  }
}

export async function extractClinicalMemory(messages: Message[]): Promise<any> {
  const transcript = messages
    .filter((message) => message.role === 'user' && typeof message.content === 'string')
    .slice(-12)
    .map((message) => message.content)
    .join('\n\n');
  if (!transcript.trim()) return [];

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'memory_extraction' },
      body: JSON.stringify({
        avaMemoryRequest: {
          userStatements: messages
            .filter(
              (message) =>
                message.role === 'user' &&
                typeof message.content === 'string' &&
                message.content.trim()
            )
            .slice(-12)
            .map((message) => message.content.slice(0, 8000)),
        },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const parsed = parseModelJson<unknown>(text, []);
    return Array.isArray(parsed)
      ? parsed
          .filter((fact) => typeof fact === 'string' && fact.trim() && fact.length <= 2000)
          .slice(0, 10)
      : [];
  } catch (err) {
    console.error('Memory extraction error:', err);
    return [];
  }
}
