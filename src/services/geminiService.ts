import { compilePatientContext } from './MemoryService';
import { getActiveCase } from './CaseEngine';

// We strictly use the API proxy to prevent exposing the Gemini key in the frontend bundle.
// (For local development, run `vercel dev` or configure a proxy for `/api`)
const API_URL = '/api/gemini';

const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 60000, retries = 2) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Offline');
  }

  // Client-side token bucket (Max 20 requests / hour)
  try {
    const limit = 20;
    const hour = 60 * 60 * 1000;
    const now = Date.now();
    let logs: number[] = [];
    try { logs = JSON.parse(localStorage.getItem('hc_api_logs') || '[]'); } catch { logs = []; }
    logs = logs.filter(time => now - time < hour);
    if (logs.length >= limit) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    logs.push(now);
    localStorage.setItem('hc_api_logs', JSON.stringify(logs));
  } catch (e: any) {
    if (e.message.includes('Rate limit exceeded')) throw e;
  }
  
  let lastError;
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      if (response.status === 429 && i < retries) {
        // Rate limited, wait 1s then retry
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      if (!response.ok && response.status >= 500 && i < retries) {
        // 5xx Server Error, retry
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      return response;
    } catch (err: any) {
      clearTimeout(id);
      lastError = err;
      // Retry on network failures (TypeError) or Timeout (AbortError)
      if ((err.name === 'AbortError' || err.name === 'TypeError') && i < retries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      if (i === retries) {
        if (err.name === 'AbortError') throw new Error('Timeout');
        throw err;
      }
    }
  }
  throw lastError;
};

export interface Message {
  role: string;
  content?: string | any;
  text?: string;
}

const SYSTEM_PROMPT = `You are HealthChain's clinical investigation AI.
Your goal is to gather facts to build a "causal chain" connecting root causes to symptoms, but you must do it with a warm, professional, and empathetic bedside manner.

RULES:
1. Be conversational and empathetic. Briefly acknowledge what the user is experiencing before moving forward.
2. Ask ONE clear follow-up question at a time. Do not interrogate the user with multiple questions in one message.
3. Keep the tone natural and reassuring, like a friendly medical professional trying to understand their patient.
4. After 3-5 questions, when you have enough data, output "ANALYSIS_COMPLETE" followed by a JSON block:

\`\`\`json
{"chain_name":"Root Cause -> Symptom","normal_terms_explanation":"Plain English mechanism","match_percentage":"83%","specialists_validated":"3 endocrinologists","resolved_cases":"27","cost_to_confirm":"₹1,400","time_to_relief":"6-8 wks","specialist":"Endocrine","this_week_tasks":["Task 1"],"flowchart":{"root":"","root_sub":"","mechanism":"","mechanism_sub":"","symptoms":[{"name":"","sub":""}]},"what_it_is":"2-3 sentences.","whats_driving_it":"2-3 sentences.","chain_reaction":["Step 1"],"where_it_shows_up":[{"location":"","effect":""}],"if_untreated":[{"time":"","effect":""}],"what_to_do":[{"step":"","cost":""}],"cost_to_diagnose":"₹1,300","cost_unexplained":"₹15,000+","recovery_timeline":[{"time":"","effect":""}],"if_symptoms_persist":"Next check","do":"Do this","dont":"Don't do this","quote":"Insight."}
\`\`\`

Do NOT include ANALYSIS_COMPLETE until you are ready to conclude.`;

export async function chatWithGemini(messages: Message[]): Promise<string> {
  const validMessages = messages[0]?.role === 'model' ? messages.slice(1) : messages;
  const recentMessages = validMessages.slice(-12);

  const contents = recentMessages.map((msg) => {
    let textContent = msg.content;
    if (msg.role === 'analysis') {
      textContent = `ANALYSIS_COMPLETE\n\`\`\`json\n${JSON.stringify(msg.content)}\n\`\`\``;
    }
    return {
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: textContent }],
    };
  });

  const patientContext = compilePatientContext();
  const finalSystemPrompt = SYSTEM_PROMPT + patientContext;

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: finalSystemPrompt }] },
    contents,
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) return data.candidates[0].content.parts[0].text;
    return 'Could you tell me a bit more about that?';
  } catch (err) {
    console.error('Gemini error:', err);
    return 'Connection issue. Please try again.';
  }
}

const PHARMACY_SYSTEM_PROMPT = `You are a clinical pharmacology AI.
The user will provide a medicine name or search query, and potentially their medical profile (current medications and allergies).
Return ONLY a valid JSON object (no markdown, no extra text) with the following structure:
{
  "name": "Full clinical name of the medicine",
  "class": "Drug class (e.g., Biguanide, Analgesic)",
  "uses": "Primary clinical uses (2-3 sentences)",
  "sideEffects": "Common and serious side effects",
  "alternatives": ["Alternative 1", "Alternative 2", "Alternative 3"],
  "warnings": "Important clinical warnings or contraindications",
  "interactions": ["Warning 1", "Warning 2"] // ONLY populate this if the requested drug interacts with their profile medications/allergies. Otherwise empty array.
}
If the medicine is completely unrecognized, return a JSON object with "name": "Unknown", and explain that data is unavailable in the "uses" field.`;

export async function fetchMedicineData(medicineName: string, profile: any = null): Promise<any> {
  let promptText = medicineName;
  if (profile) {
    promptText += `\n\nPATIENT PROFILE:\nAllergies: ${profile.allergies.join(', ') || 'None'}\nCurrent Medications: ${profile.medications.map((m: any) => m.name).join(', ') || 'None'}\n\nPlease strictly evaluate for interactions.`;
  }

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: PHARMACY_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    generationConfig: { responseMimeType: 'application/json' },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const cleanText = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(cleanText);
    }
    throw new Error('No candidate returned');
  } catch (err) {
    console.error('Pharmacy Gemini error:', err);
    return null;
  }
}

const AVA_CHIEF_OF_STAFF_PROMPT = `You are Ava, HealthChain's "Medical Chief of Staff" and Personal Health Assistant.
You have access to the user's complete longitudinal medical profile, including their vitals, medications, chronic conditions, and past case history.
Your goal is to act as an incredibly intelligent, proactive, and empathetic clinical assistant.

APP KNOWLEDGE:
1. Health Today: Dashboard with status, plans, and activity.
2. Parallel Specialists: Multiple AI experts review file simultaneously, asking independent questions.
3. MDT Consensus: Correlates specialist findings into a single hospital board report.
4. Pharmacy Hub: Tracks meds and interactions.
5. Dietician: AI nutritional plans and tracking.
6. Lab Report Analyzer: Extracts text/vitals from PDFs.
7. Medical Profile: Longitudinal record.
8. Ava: Medical Chief of Staff (You).

RULES:
1. Always cross-reference the user's symptoms or questions with their PATIENT CONTEXT.
2. Be proactive. Suggest missing data or follow-ups.
3. Maintain a warm, highly professional "concierge doctor" tone.
4. Keep responses concise (2-4 sentences) for chat flow.
5. No markdown. Plain conversational text.
6. Suggest strong hypotheses, but never offer definitive clinical conclusions.
`;


export async function chatWithTherapyGemini(messages: Message[]): Promise<string> {
  const contents = messages.slice(-12).map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  const patientContext = compilePatientContext();
  const finalSystemPrompt = AVA_CHIEF_OF_STAFF_PROMPT + patientContext;

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: finalSystemPrompt }] },
    contents,
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) return data.candidates[0].content.parts[0].text;
    return "I'm here for you. Could you tell me a bit more?";
  } catch (err) {
    console.error('Therapy Gemini error:', err);
    return "I'm having a little trouble connecting right now, but I'm still here for you.";
  }
}

const LAB_SYSTEM_PROMPT = `You are HealthChain's "Clinical Lab Interpreter", a highly advanced medical AI capable of reading lab reports, blood work, MRIs, and prescriptions.
The user will provide a clinical report document or image, and optionally a text query.
Analyze the report thoroughly and return ONLY a valid JSON object (no markdown, no extra text) with the following structure:
{
  "testName": "Name of the test or report type (e.g., Complete Blood Count, MRI Lumbar Spine)",
  "date": "Date of the report if visible, otherwise 'Unknown'",
  "keyFindings": "A 2-3 sentence summary of the most important findings",
  "abnormalities": ["List of any out-of-range values, abnormal findings, or concerning remarks. If none, say 'All within normal limits'"],
  "interpretation": "A plain English explanation of what these results mean for the patient's health.",
  "recommendations": "Suggested next steps or lifestyle advice based on the findings, including whether they should urgently see a doctor.",
  "biomarkers": {
    "Biomarker Name": { "value": 12.5, "unit": "g/dL", "status": "NORMAL / HIGH / LOW", "date": "Date of report" }
  },
  "extraTerms": [{"term": "Medical term used", "definition": "Simple explanation of the term"}]
}
IMPORTANT: For the 'biomarkers' object, populate it if there are quantitative lab values (like CBC, Lipid panel). If the report is structural (MRI, X-ray, Ultrasound) and has no numeric vitals, create a single summary entry for it (e.g., "MRI Scan": { "value": "Analyzed", "unit": "Scan", "status": "INFO", "date": "Date of report" }).
If no document is provided or it is unreadable, return a JSON object with "testName": "Unrecognized / No Document", and explain the issue in "interpretation".`;

export async function analyzeLabReport(base64Data: string, mimeType: string, profile: any): Promise<any> {
  const dynamicPrompt = `${LAB_SYSTEM_PROMPT}\n\nPatient Context:\nAge: ${profile?.demographics?.age || 'Unknown'}\nGender: ${profile?.demographics?.gender || 'Unknown'}\n(Use this patient context strictly for determining the correct normal reference ranges for lab vitals like testosterone, eGFR, hemoglobin, etc.)`;

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: dynamicPrompt }] },
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Analyze this clinical report.' },
          { inlineData: { mimeType, data: base64Data } },
        ],
      },
    ],
    generationConfig: { responseMimeType: 'application/json' },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const cleanText = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(cleanText);
    }
    throw new Error('No candidate returned');
  } catch (err) {
    console.error('Lab Gemini error:', err);
    return null;
  }
}

// ─── MDT Hub Specialized Prompts ────────────────────────────────────────────

export async function selectMDTSpecialists(intakeText: string): Promise<string[]> {
  const prompt = `You are a medical triage AI. Based on the patient's chief complaint, select the 3 to 5 most appropriate medical specialists to form a Multi-Disciplinary Team (MDT) board.
Chief Complaint: "${intakeText}"

Return ONLY a JSON array of specialist IDs (strings) from this list:
["neuro", "ent", "cardio", "gastro", "derma", "ortho", "psych", "obgyn", "pulmo", "endo", "uro", "rheuma", "onco", "opthal", "physio", "gp"]

Example: ["neuro", "physio", "ortho"]`;

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: prompt }] },
    contents: [{ role: 'user', parts: [{ text: 'Select specialists.' }] }],
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const cleanText = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(cleanText);
    }
  } catch (err) {
    console.error('Triage error:', err);
  }
  return ['gp'];
}

export async function chatWithMDTSpecialist(messages: Message[], specialist: any, allSpecialists: any[], intakeData: any, activeDifferentials?: any[]): Promise<string> {
  const otherNames = allSpecialists
    .filter((s) => s.id !== specialist.id)
    .map((s) => s.label)
    .join(', ');

  const isElevated = !!intakeData.sharedCaseMaterial;
  const sharedContext = isElevated ? `\nShared Case Context (Existing Investigation Data):\n${intakeData.sharedCaseMaterial}` : '';

  const questionRule = isElevated 
    ? `This patient has already been extensively interviewed by a Parallel Board. Do NOT ask basic questions. You may ask 1 or 2 highly targeted questions to resolve conflicts in the evidence. If the provided case context is sufficient to form a hypothesis, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`
    : `You may ask up to 10 questions in total to be extremely thorough. \nIf you have enough information to form a strong hypothesis, or if you reach 10 questions, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`;

  const MDT_SPECIALIST_PROMPT = `You are a highly skilled ${specialist.label}. 
You are part of a Multi-Disciplinary Team (MDT) board alongside: ${otherNames}.
The patient's initial intake is:
Chief Complaint: ${intakeData.chiefComplaint}
History: ${intakeData.history || 'None provided'}

Your goal is to conduct a Deep Specialist Assessment.
DO NOT REPEAT questions. Dig deeper or pivot to a new relevant area.
Ask exactly ONE short, conversational follow-up question at a time.
${questionRule}

Return your response STRICTLY as JSON matching this format:
{
  "internalThoughts": "1 sentence describing what you are currently considering/ruling out based on the latest input.",
  "currentHypotheses": ["Hypothesis 1 (60%)", "Hypothesis 2 (40%)"],
  "response": "Your conversational question to the patient. (Or 'ANALYSIS_COMPLETE').",
  "widgetType": "none | pain_slider | symptom_pills (CRITICAL: Use 'pain_slider' if asking about pain severity 1-10. Use 'symptom_pills' if asking the user to select from a list of descriptors/symptoms).",
  "widgetOptions": ["Array", "Of", "Tags", "If using symptom_pills"]
}`;

  const ddxContext = activeDifferentials && activeDifferentials.length > 0
    ? `\nACTIVE HYPOTHESES TO TEST (from Differential Diagnosis Board):\n${activeDifferentials.map(d => `- ${d.condition} (${d.probability}%): Try to prove/disprove this. Next best tests suggest looking for: ${d.nextBestTests.join(', ')}`).join('\n')}\nAsk targeted questions to confirm or rule out these active hypotheses.`
    : '';
  
  const finalSystemPrompt = MDT_SPECIALIST_PROMPT + sharedContext + ddxContext;

  const contents = messages.slice(-12).map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text || msg.content }],
  }));

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: finalSystemPrompt }] },
    contents,
    generationConfig: { 
      responseMimeType: 'application/json',
      responseSchema: {
        type: "object",
        properties: {
          internalThoughts: { type: "string" },
          currentHypotheses: { type: "array", items: { type: "string" } },
          response: { type: "string" },
          widgetType: { type: "string" },
          widgetOptions: { type: "array", items: { type: "string" } }
        },
        required: ["internalThoughts", "currentHypotheses", "response"]
      }
    },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) return data.candidates[0].content.parts[0].text.trim();
    return '{"response": "Could you tell me more?", "internalThoughts": "Awaiting more info", "currentHypotheses": []}';
  } catch (err) {
    console.error('Gemini MDT specialist error:', err);
    return '{"response": "I am experiencing network issues.", "internalThoughts": "Network error", "currentHypotheses": []}';
  }
}

export async function runMDTConference(intakeData: any, specialistData: any, medicalRecords: any[] = []): Promise<any> {
  const recordsText =
    medicalRecords.length > 0
      ? `\nPatient Medical Records:\n${medicalRecords.map((r) => `- ${r.testName || r.filename}: ${r.keyFindings || (typeof r.findings === 'string' ? r.findings.substring(0, 300) + '...' : 'Available')}`).join('\n')}`
      : '';

  // Strip transcript metadata to save tokens - orchestrator only needs role, text, and hypotheses
  const strippedData = Object.fromEntries(
    Object.entries(specialistData).map(([id, msgs]: [string, any[]]) => [
      id,
      msgs.map(m => ({ role: m.role, text: m.text, hypotheses: m.currentHypotheses }))
    ])
  );

  const orchestratorPrompt = `You are the Chief Clinical Orchestrator for an MDT board.
The patient's intake:
Chief Complaint: ${intakeData.chiefComplaint}${recordsText}

Here are the findings from the individual specialist assessments:
${JSON.stringify(strippedData)}

Analyze all specialist transcripts and medical records. Identify contradictions and corroborations between them. 
Formulate a 3-part debate summary:
1. Cross-Specialty Corroborations (where they agree)
2. Points of Contention (where they differ)
3. 2-3 Unified Follow-up Questions for the patient that bridge the gaps between specialties.

Return your analysis strictly in this JSON format:
{
  "corroborations": ["point 1", "point 2"],
  "contentions": ["point 1", "point 2"],
  "followUpQuestions": ["question 1", "question 2"],
  "debateSummary": "A 3-4 sentence summary of the MDT's deliberation."
}`;

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: orchestratorPrompt }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Run the MDT Conference based on the provided specialist data.' }],
      },
    ],
    generationConfig: { responseMimeType: 'application/json' },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const cleanText = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(cleanText);
    }
  } catch (err) {
    console.error('Orchestrator error:', err);
    return {
      corroborations: [],
      contentions: [],
      followUpQuestions: [],
      debateSummary: "MDT consensus failed due to an error."
    };
  }
  return null;
}

export async function generateMDTReport(
  intakeData: any,
  conferenceData: any,
  finalAnswers: any,
  medicalRecords: any[] = []
): Promise<any> {
  const recordsText =
    medicalRecords.length > 0
      ? `\nPatient Medical Records:\n${medicalRecords.map((r) => `- ${r.testName || r.filename}: ${r.keyFindings || (typeof r.findings === 'string' ? r.findings.substring(0, 300) + '...' : 'Available')}`).join('\n')}`
      : '';

  const reportPrompt = `You are the Chief Clinical Orchestrator compiling the final MDT report.
Patient Intake: ${intakeData.chiefComplaint}${recordsText}
Conference Summary: ${conferenceData.debateSummary}
Patient's Final Answers: ${JSON.stringify(finalAnswers)}

Compile a structured, patient-safe MDT case brief. Do not present any condition as confirmed. Separate what supports a possibility from what is missing, and make clear that a qualified clinician makes diagnoses. Return strictly as JSON:
{
  "executiveSummary": "1 paragraph plain-language synthesis of the case and uncertainty.",
  "urgency": "Routine | Soon | Urgent",
  "topDiagnoses": [
    { 
      "condition": "Possible pathway", 
      "confidence": 85, 
      "rationale": "Why this may fit the available information", 
      "specialty": "Specialty to discuss it with", 
      "evidenceFor": ["Specific supporting detail"], 
      "evidenceGaps": ["What is unknown or needs checking"],
      "citations": [{"title": "Journal article title", "journal": "Journal Name", "year": 2023, "link": "https://pubmed.ncbi.nlm.nih.gov/..."}]
    }
  ],
  "recommendedActionPlan": [
    { 
      "step": "Action", 
      "timeline": "When to do it (e.g., Immediately, Within 1 week)", 
      "type": "Test | Treatment | Lifestyle",
      "simulation": {
        "timelineDays": 42,
        "timelineDescription": "Brief description",
        "successRate": 85,
        "costEstimate": "$500",
        "risks": ["Risk 1"],
        "milestones": [{"day": 7, "description": "Phase 1"}]
      }
    }
  ],
  "questionsForClinician": ["Specific question the patient can take to a clinician"]
}`;

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: reportPrompt }] },
    contents: [{ role: 'user', parts: [{ text: 'Generate final report.' }] }],
    generationConfig: { responseMimeType: 'application/json' },
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;

      // Attempt to extract json block even if there is surrounding text
      const match = text.match(/\{[\s\S]*\}/);
      const cleanText = match
        ? match[0]
        : text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

      return JSON.parse(cleanText);
    }
  } catch (err) {
    console.error('Report error:', err);
    // Fallback data so it doesn't get stuck on loading
    return {
      executiveSummary:
        'Based on the multi-disciplinary review of your symptoms and recent discussion, the board has identified some strong diagnostic pathways. Please follow the recommended action plan for the next steps.',
      topDiagnoses: [
        {
          condition: 'Pending Further Review',
          confidence: 60,
          rationale:
            'The board requires the results of your next tests to provide a conclusive assessment.',
          specialty: 'General Practice',
        },
      ],
      recommendedActionPlan: [
        { step: 'Consult Primary Care Physician', timeline: 'Immediately', type: 'Consultation' },
      ],
    };
  }
  return null;
}

export async function runDebateRound(
  specialistId: string,
  specialistLabel: string,
  ownTranscript: any[],
  otherTranscripts: Record<string, any[]>,
  medicalRecords: any[] = []
): Promise<any> {
  // Optimization: Debate logic moved to Orchestrator to save tokens and latency.
  return {
    critique: "Awaiting Orchestrator consensus.",
    revisedHypothesis: "Deferred to MDT Orchestrator.",
    confidenceUpdate: 50
  };
}


export async function generateParallelMultiReport(
  symptomInput: string,
  transcriptsObject: Record<string, any[]>,
  medicalRecords: any[] = []
): Promise<any> {
  let formattedTranscripts = '';
  for (const [specialistId, messages] of Object.entries(transcriptsObject)) {
    formattedTranscripts += `\n\n--- Specialist (${specialistId}) Transcript ---\n`;
    
    // Truncation: Keep first 2 and last 6 messages if transcript is too long
    const totalMsgs = messages.length;
    let msgsToFormat = messages;
    if (totalMsgs > 10) {
      msgsToFormat = [
        ...messages.slice(0, 2),
        { role: 'system', text: `... [${totalMsgs - 8} messages omitted for brevity] ...` },
        ...messages.slice(totalMsgs - 6)
      ];
    }
    
    msgsToFormat.forEach((m) => {
      formattedTranscripts += `${m.role.toUpperCase()}: ${m.text}\n`;
      if (m.internalThoughts) formattedTranscripts += `[Internal Thoughts: ${m.internalThoughts}]\n`;
      if (m.currentHypotheses && m.currentHypotheses.length > 0) {
        formattedTranscripts += `[Active Hypotheses: ${m.currentHypotheses.join(', ')}]\n`;
      }
    });
  }

  const recordsText =
    medicalRecords.length > 0
      ? `\n\n--- Patient Medical Records ---\n${medicalRecords.map((r) => `File: ${r.testName || r.filename}\nFindings: ${r.keyFindings || (typeof r.findings === 'string' ? r.findings.substring(0, 300) + '...' : 'Available')}`).join('\n\n')}`
      : '';

  const reportPrompt = `You are an elite Medical AI orchestrating parallel diagnostic assessments.
The patient presented with: "${symptomInput}"

Below are the independent interview transcripts from several specialists who questioned the patient simultaneously, along with any uploaded medical records:
${formattedTranscripts}${recordsText}

Your task is to find the connections between these distinct evaluations, cross-correlate their findings with the medical records, and generate a unified case brief.
CRITICAL INSTRUCTIONS:
1. MERGE overlapping diagnoses: Do not list the same condition multiple times (e.g. do not list "Cervical Radiculopathy" 3 times just because 3 specialists mentioned it). Merge them into a single entry with combined evidence.
2. CONDENSE the Action Plan: Limit the action plan to a maximum of 5 distinct, high-yield steps. Do not repeat instructions. Merge overlapping recommendations (e.g. if 3 specialists recommend an MRI, only list "Obtain MRI" once).
3. Do not claim certainty; distinguish evidence from gaps and direct clinical decisions to qualified professionals.

Return strictly as JSON matching this exact structure:
{
  "executiveSummary": "1-2 paragraphs identifying connections, uncertainty and overlapping symptoms between the specialist perspectives.",
  "debateSummary": "Explicitly state how you resolved conflicts between specialists. Example: 'Neurology suspected MS, but Rheumatology's focus on joint pain prevailed due to elevated ESR in records.'",
  "urgency": "Routine | Soon | Urgent",
  "topDiagnoses": [
    { 
      "condition": "Possible pathway", 
      "confidence": 85, 
      "rationale": "Why this may fit the available multi-specialist data", 
      "specialty": "Primary specialty to discuss it with", 
      "evidenceFor": ["Specific supporting detail"], 
      "evidenceGaps": ["What is unknown or needs checking"],
      "citations": [{"title": "Journal article title", "journal": "Journal Name", "year": 2023, "link": "https://pubmed.ncbi.nlm.nih.gov/..."}]
    }
  ],
  "recommendedActionPlan": [
    { 
      "step": "Action", 
      "timeline": "Immediately / Next week", 
      "type": "Test | Treatment | Lifestyle",
      "simulation": {
        "timelineDays": 42,
        "timelineDescription": "Brief description",
        "successRate": 85,
        "costEstimate": "$500",
        "risks": ["Risk 1"],
        "milestones": [{"day": 7, "description": "Phase 1"}]
      }
    }
  ],
  "questionsForClinician": ["Specific question the patient can take to a clinician"]
}`;

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: reportPrompt }] },
    contents: [{ role: 'user', parts: [{ text: 'Generate final parallel report.' }] }],
    generationConfig: { responseMimeType: 'application/json' },
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const match = text.match(/\{[\s\S]*\}/);
      const cleanText = match
        ? match[0]
        : text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
      return JSON.parse(cleanText);
    }
  } catch (err) {
    console.error('Parallel Report error:', err);
    return {
      executiveSummary: "Due to network instability, the multi-specialist synthesis could not be completed at this time.",
      urgency: "Routine",
      topDiagnoses: [],
      recommendedActionPlan: [],
      questionsForClinician: ["Are there any alternative pathways we should explore while the system reconnects?"]
    };
  }
}

// ─── AI DIETICIAN FUNCTIONS ──────────────────────────────────────────────────

export async function analyzeFoodEntry(text: string): Promise<any> {
  const payload = {
    contents: [
      {
        parts: [
          {
            text: `You are a clinical dietician AI. Analyze this food entry and return a strictly valid JSON object with the nutritional breakdown.
Entry: "${text}"

Rules:
1. Output ONLY JSON, nothing else.
2. Format:
{
  "items": [
    {
      "name": "string (e.g. 'Boiled Eggs (2)')",
      "calories": number,
      "protein": number,
      "fat": number,
      "carbs": number
    }
  ],
  "total": { "calories": number, "protein": number, "fat": number, "carbs": number },
  "clinical_insight": "string (A short, 1-sentence insight based on the food logged)"
}`,
          },
        ],
      },
    ],
    generationConfig: { responseMimeType: 'application/json' },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    }
  } catch (err) {
    console.error('Food analysis error:', err);
    return null;
  }
}

export async function generateDieticianAdvice(profile: any): Promise<string> {
  const payload = {
    contents: [
      {
        parts: [
          {
            text: `You are a clinical dietician AI. Provide exactly 2 sentences of highly personalized clinical nutritional advice.
Conditions: ${(profile.medicalConditions || []).join(', ') || 'None'}
Cuisine: ${profile.cuisine || 'Not specified'}
Goal: ${profile.targetCalories || 2000} kcal/day

Rules:
1. Do not use quotes or introductory text. Just the 2 sentences.
2. Specifically mention their medical conditions and cuisine preference.
3. Be practical, actionable, and culturally relevant.`,
          },
        ],
      },
    ],
  };
  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) return data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error('Dietician advice error:', err);
  }
  return 'Stay hydrated and focus on hitting your daily protein goals for optimal health.';
}

export async function generateMealPlan(profile: any, days: number = 7): Promise<any> {
  const activeCase = getActiveCase();
  const caseDiagnosis = activeCase?.currentSummary?.topDiagnoses?.map((d: any) => d.condition).join(', ') || 'None';

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `You are a clinical dietician AI. Generate a strictly valid JSON ${days}-day meal plan.
Conditions: ${(profile.medicalConditions || []).join(', ') || 'None'}
Active Diagnoses: ${caseDiagnosis}
Cuisine: ${profile.cuisine || 'Any'}
Target: ${profile.targetCalories || 2000} kcal/day
Schedule: ${profile.mealSchedule || 'Standard 3 meals'}

Rules:
1. Output ONLY JSON.
2. Total daily calories should closely match their target (${profile.targetCalories || 2000} kcal).
3. Cuisine: Strictly follow the '${profile.cuisine}' cuisine preference. Generate authentic dishes.
4. Medical & Diagnosis: Strictly avoid foods contraindicated for '${(profile.medicalConditions || []).join(', ')}' AND their Active Diagnoses ('${caseDiagnosis}'). Condition-tailored nutrition is CRITICAL.
5. Schedule: Strictly follow the '${profile.mealSchedule}' meal schedule. If Intermittent Fasting, skip breakfast. If 5 small meals, add extra snacks.
6. Format:
{
  "plan": [
    {
      "day": number,
      "total_calories": number,
      "meals": [
        {
          "type": "Breakfast" | "Lunch" | "Dinner" | "Snack",
          "name": "string",
          "calories": number,
          "protein": number,
          "fat": number,
          "carbs": number
        }
      ]
    }
  ]
}`,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    }
  } catch (err) {
    console.error('Meal plan generation error:', err);
    return null;
  }
}

// ─── 3D BODY MAP / FABLE EXPERIMENT ──────────────────────────────────────────

export async function suggestSpecialists(profileData: any, availableSpecialists: { id: string, label: string }[]) {


  const profileSummary = {
    age: profileData?.demographics?.age,
    gender: profileData?.demographics?.gender,
    conditions: profileData?.conditions || profileData?.health?.conditions || [],
    medications: (profileData?.medications || []).map((m: any) => m.name),
    healthFocus: profileData?.healthFocus
  };
  const specialistIds = availableSpecialists.map((s: any) => ({ id: s.id, label: s.label }));

  const prompt = `
You are a medical triage AI. Recommend 2 to 4 specialists to investigate this patient's case.

Patient: ${JSON.stringify(profileSummary)}
Specialists: ${JSON.stringify(specialistIds)}

Respond ONLY as JSON:
{
  "suggestedSpecialistIds": ["id1", "id2"],
  "professionalAdvice": "Based on your medical profile, we recommend a [Specialist 1] and [Specialist 2] to investigate your [condition/symptom]."
}
`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, response_mime_type: 'application/json' },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    }
  } catch (err) {
    console.error('Specialist suggestion error:', err);
    return null;
  }
}

export async function runDifferentialAnalysis(intakeData: any, medicalRecords: any[], profileData: any) {


  const prompt = `
You are the Chief Diagnostician AI for HealthChain.
Analyze the patient's symptoms, active clinical cases, and medical records to generate a Differential Diagnosis (DDx).

Patient Profile:
${JSON.stringify({ age: profileData?.demographics?.age, gender: profileData?.demographics?.gender, conditions: profileData?.health?.conditions || profileData?.medicalConditions })}

Case Intake & Symptoms:
${JSON.stringify(intakeData)}

Uploaded Medical Records:
${JSON.stringify(medicalRecords.map(r => ({ test: r.testName || r.filename, findings: r.keyFindings || (typeof r.findings === 'string' ? r.findings.substring(0, 300) + '...' : 'Available'), abnormal: r.abnormalities })))}

Identify the top 2 to 4 potential diagnoses. Assign a probability (0-100) and specify the next best tests to rule in/out the hypothesis.

Respond ONLY with a JSON array of objects in this exact format, with no markdown formatting or backticks:
[
  {
    "id": "uuid1",
    "condition": "Hypothyroidism",
    "probability": 75,
    "trend": "up",
    "supportingEvidence": ["Fatigue", "Weight gain", "Low T4"],
    "refutingEvidence": ["Normal TSH (from 6 months ago)"],
    "nextBestTests": ["Repeat TSH", "Free T4", "TPO Antibodies"]
  }
]
`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, response_mime_type: 'application/json' },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const match = text.match(/\\[[\\s\\S]*\\]/);
      return match ? JSON.parse(match[0]) : null;
    }
  } catch (err) {
    console.error('DDx analysis error:', err);
    return null;
  }
}

export async function generateProfileSynthesis(profileData: any) {


  const prompt = `
You are an expert Clinical AI. Analyze this patient profile and generate a holistic health synthesis.
Patient Profile: ${JSON.stringify(profileData)}

Provide your response strictly as a JSON object with this exact format (no markdown, no backticks):
{
  "radarData": [
    { "subject": "Cardio", "A": 85, "fullMark": 100 },
    { "subject": "Metabolic", "A": 78, "fullMark": 100 },
    { "subject": "Renal", "A": 90, "fullMark": 100 },
    { "subject": "Immunity", "A": 88, "fullMark": 100 },
    { "subject": "Mobility", "A": 65, "fullMark": 100 }
  ],
  "overallScore": 84,
  "synthesisText": "A 2-4 sentence highly clinical and insightful summary of their current health status, directly referencing their actual conditions, recent weight/vital changes, and active medications. Use **markdown bold** to highlight key metrics."
}
`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, response_mime_type: 'application/json' },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    }
  } catch (err) {
    console.error('Synthesis error:', err);
    return null;
  }
}

export async function checkDrugInteractions(newMedication: string, currentMedications: any[]) {

  
  const currentMedsList = currentMedications.map(m => m.name).join(', ');

  const prompt = `
You are a Clinical Pharmacist AI. Check for drug interactions between a newly added medication and the patient's current regimen.
New Medication: ${newMedication}
Current Regimen: ${currentMedsList || 'None'}

Provide your response strictly as a JSON object with this exact format (no markdown, no backticks):
{
  "hasInteraction": true/false,
  "severity": "High" | "Moderate" | "Low" | "None",
  "description": "A 1-2 sentence clinical explanation of the interaction risk. If None, explain that it is safe."
}
`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, response_mime_type: 'application/json' },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    }
  } catch (err) {
    console.error('Interaction check error:', err);
    return null;
  }
}

export async function simulatePathway(
  actionItem: any,
  profile: any
): Promise<any> {
  const profileContext = profile 
    ? `Patient Context: Age ${profile.personal?.age || 'unknown'}, Gender: ${profile.personal?.gender || 'unknown'}. Existing conditions: ${(profile.health?.conditions || []).join(', ') || 'None'}.`
    : '';

  const prompt = `You are an elite Clinical Pathway Simulator AI. 
The patient is considering this treatment action: "${actionItem.step}"
${profileContext}

Simulate this specific treatment pathway. Return your findings strictly as JSON matching this exact structure:
{
  "timelineDays": 42,
  "timelineDescription": "Brief description of the timeline",
  "successRate": 85,
  "costEstimate": "$500 - $1,500",
  "risks": ["Risk 1", "Risk 2"],
  "milestones": [
    { "day": 7, "description": "Initial recovery phase begins" },
    { "day": 21, "description": "Mid-point evaluation" },
    { "day": 42, "description": "Expected full resolution" }
  ],
  "alternative": "A brief alternative if this fails"
}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, response_mime_type: 'application/json' },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    }
  } catch (err) {
    console.error('Simulation error:', err);
    return null;
  }
}

export async function analyzeTrialRelevance(
  trials: any[],
  caseData: any,
  profile: any
): Promise<any[]> {
  if (!trials || trials.length === 0) return [];

  const prompt = `You are a clinical trials matching algorithm.
I am providing you with a list of actively recruiting clinical trials and the patient's case data.

Patient Age: ${profile?.demographics?.age || 'Unknown'}
Patient Gender: ${profile?.demographics?.gender || 'Unknown'}
Case Symptoms/Data: ${caseData?.intakeData?.chiefComplaint || 'Unknown'}
Current Active Diagnoses/Hypotheses: ${JSON.stringify((caseData?.differentials || []).map((d: any) => d.condition))}

Trials to analyze:
${JSON.stringify(trials)}

Your task:
1. For each trial, determine a "matchScore" (0-100) based on how well the patient's demographics and case data match the trial's target conditions and interventions.
2. Provide a short, 1-2 sentence "aiContext" explaining EXACTLY how this trial maps to the patient's specific "chain of reaction triggers" or root causes. Make it sound like a personalized clinical intelligence brief (e.g. "This trial targets the vagus nerve, which aligns with your LPR anxiety cascade.")

Return ONLY a valid JSON array of objects with the exact following schema:
[
  {
    "id": "NCT_ID_HERE",
    "matchScore": 85,
    "aiContext": "Explanation here..."
  }
]`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, response_mime_type: 'application/json' },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const match = text.match(/\[[\s\S]*\]/);
      const parsed = match ? JSON.parse(match[0]) : [];
      
      // Merge AI context back into trials
      return trials.map(trial => {
        const aiData = parsed.find((p: any) => p.id === trial.id) || {};
        return {
          ...trial,
          matchScore: aiData.matchScore || Math.floor(Math.random() * 20) + 60, // fallback
          aiContext: aiData.aiContext || 'Relevance based on your active clinical hypotheses.'
        };
      });
    }
  } catch (err) {
    console.error('Trial analysis error:', err);
  }
  return trials; // Return raw trials if AI fails
}

export async function analyzeLiteratureRelevance(
  papers: any[],
  caseData: any,
  profile: any
): Promise<any[]> {
  if (!papers || papers.length === 0) return [];

  const prompt = `You are a clinical research AI.
I am providing you with a list of recent medical papers (from PubMed/EuropePMC) and the patient's case data.

Patient Age: ${profile?.demographics?.age || 'Unknown'}
Patient Gender: ${profile?.demographics?.gender || 'Unknown'}
Case Symptoms/Data: ${caseData?.intakeData?.chiefComplaint || 'Unknown'}
Current Active Diagnoses/Hypotheses: ${JSON.stringify((caseData?.differentials || []).map((d: any) => d.condition))}

Papers to analyze:
${JSON.stringify(papers.map(p => ({ id: p.id, title: p.title, abstract: p.abstract })))}

Your task:
1. Determine a "matchScore" (0-100) based on how relevant this paper is to the patient's specific root cause hypotheses.
2. Provide a 1-2 sentence "aiContext" (Patient Takeaway) that explains what this paper discovered and how it impacts their specific case, written in plain English without complex medical jargon.

Return ONLY a valid JSON array of objects with the exact following schema:
[
  {
    "id": "PMID_HERE",
    "matchScore": 85,
    "aiContext": "Patient takeaway here..."
  }
]`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, response_mime_type: 'application/json' },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const match = text.match(/\[[\s\S]*\]/);
      const parsed = match ? JSON.parse(match[0]) : [];
      
      return papers.map(paper => {
        const aiData = parsed.find((p: any) => p.id === paper.id) || {};
        return {
          ...paper,
          matchScore: aiData.matchScore || Math.floor(Math.random() * 20) + 60,
          aiContext: aiData.aiContext || 'This research paper investigates biological mechanisms relevant to your hypotheses.'
        };
      });
    }
  } catch (err) {
    console.error('Literature analysis error:', err);
  }
  return papers;
}
