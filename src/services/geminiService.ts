import { compilePatientContext } from './MemoryService';
import { getActiveCase, AppointmentBrief } from './CaseEngine';
import { supabase } from './supabaseClient';
import { parseModelJson } from './modelJson';
export { parseModelJson } from './modelJson';

const API_URL = import.meta.env.DEV ? 'http://localhost:3000/api/gemini' : '/api/gemini';

async function sha256Hash(text: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Date.now().toString();
  }
}

const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 60000, idempotencyKey?: string) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Offline');
  }

  let sessionToken = '';
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      sessionToken = data.session.access_token;
    }
  } catch {}

    // Create an idempotency key that expires every 5 minutes.
  // This prevents double-clicks and page-refresh quota burns, but allows
  // genuine retries later if the user gets stuck or the UI drops the response.
  const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000));
  const requestId = idempotencyKey || await sha256Hash((options.body || '') + timeWindow.toString());

  const secureOptions = {
    ...options,
    headers: {
      ...options.headers,
      'X-HC-Request-Id': requestId,
      'X-HC-Operation': options.headers?.['X-HC-Operation'] || 'gemini',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    }
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...secureOptions, signal: controller.signal });
    if (!response.ok) {
      if (response.status === 401) {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session) {
          window.dispatchEvent(new Event('hc_logout'));
          throw new Error('Session expired. Please log in again.');
        }
        secureOptions.headers['Authorization'] = `Bearer ${data.session.access_token}`;
        return await fetch(url, { ...secureOptions, signal: controller.signal });
      } else if (response.status === 402) {
        window.dispatchEvent(new CustomEvent('hc_quota_exceeded', { 
          detail: { operation: secureOptions.headers['X-HC-Operation'] } 
        }));
        throw new Error('QUOTA_EXCEEDED');
      }
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

export interface Message {
  role: string;
  content?: string | any;
  text?: string;
}

const CLINICAL_SAFETY_RULES = `

SAFETY AND CLINICAL BOUNDARIES:
- You are an AI assessment assistant, not a clinician. Do not diagnose, prescribe, give dosing instructions, or present a conclusion as certain.
- Separate patient-reported information, record-supported facts, and possibilities that need clinician review.
- State material uncertainty plainly. Do not invent citations, source links, statistics, success rates, or clinical validation. If no source is provided in the case, say that a source citation is not available.
- Encourage review with a qualified clinician. For severe, sudden, rapidly worsening, or emergency symptoms, advise urgent local medical care or emergency services.
- Use neutral language such as "may be worth discussing" or "a clinician can help assess" rather than "you have" or "this proves."`;

const SYSTEM_PROMPT = `You are HealthChain's clinical assessment AI.
Your goal is to gather facts and organize possible connections worth discussing with a clinician, with a warm, professional, and empathetic bedside manner.

RULES:
1. Be conversational and empathetic. Briefly acknowledge what the user is experiencing before moving forward.
2. Ask ONE clear follow-up question at a time. Do not interrogate the user with multiple questions in one message.
3. Keep the tone natural and reassuring, like a friendly medical professional trying to understand their patient.
4. After 3-5 questions, when you have enough data, output "ANALYSIS_COMPLETE" followed by a JSON block:

\`\`\`json
{"chain_name":"Symptoms and factors to discuss","normal_terms_explanation":"Plain English summary","match_percentage":"","specialist":"AI perspective","this_week_tasks":["Question to discuss with a clinician"],"flowchart":{"root":"","root_sub":"","mechanism":"","mechanism_sub":"","symptoms":[{"name":"","sub":""}]},"what_it_is":"2-3 sentences.","whats_driving_it":"2-3 sentences.","chain_reaction":["Possible connection to discuss"],"where_it_shows_up":[{"location":"","effect":""}],"if_untreated":[],"what_to_do":[{"step":"Discuss with a qualified clinician","cost":"Varies"}],"if_symptoms_persist":"Discuss next steps with a clinician","do":"Record changes and bring them to your clinician","dont":"Do not treat this as a diagnosis or emergency service","quote":"Insight to discuss."}
\`\`\`

Do NOT include ANALYSIS_COMPLETE until you are ready to conclude.${CLINICAL_SAFETY_RULES}`;

export async function chatWithGemini(messages: Message[]): Promise<string> {
  const validMessages = messages[0]?.role === 'model' ? messages.slice(1) : messages;
  const recentMessages = validMessages.slice(-12);

  const contents = recentMessages.map((msg) => {
    let textContent = msg.content;
    if (msg.role === 'analysis') {
      textContent = 'ANALYSIS_COMPLETE (structured findings already captured)';
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
    generationConfig: { maxOutputTokens: 600 },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'quick_chat' },
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
If the medicine is completely unrecognized, return a JSON object with "name": "Unknown", and explain that data is unavailable in the "uses" field.${CLINICAL_SAFETY_RULES}`;

export async function fetchMedicineData(medicineName: string, profile: any = null): Promise<any> {
  let promptText = medicineName;
  if (profile) {
    promptText += `\n\nPATIENT PROFILE:\nAllergies: ${(profile.allergies || []).join(', ') || 'None'}\nCurrent Medications: ${(profile.medications || []).map((m: any) => m.name).join(', ') || 'None'}\n\nPlease strictly evaluate for interactions.`;
  }

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: PHARMACY_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 450 },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'pharmacy' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const allowed = new Set(["neuro", "ent", "cardio", "gastro", "derma", "ortho", "psych", "obgyn", "pulmo", "endo", "uro", "rheuma", "onco", "opthal", "physio", "gp"]);
      const parsed = parseModelJson<unknown[]>(text, []);
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && allowed.has(id)).slice(0, 4) : [];
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
3. Board Consensus: Correlates specialist findings into a single hospital board report.
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
6. Suggest questions and possibilities, but never offer definitive clinical conclusions.
${CLINICAL_SAFETY_RULES}`;


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
    generationConfig: { maxOutputTokens: 2000 },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'ava_chat' },
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
If no document is provided or it is unreadable, return a JSON object with "testName": "Unrecognized / No Document", and explain the issue in "interpretation".${CLINICAL_SAFETY_RULES}`;

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
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1400 },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'lab_analysis' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      return parseModelJson(text, {
        testName: 'Unknown Report',
        keyFindings: 'Unable to parse report data.',
        interpretation: 'Please re-upload the document or try a clearer scan.',
        recommendations: '',
        abnormalities: [],
        biomarkers: {}
      });
    }
    throw new Error('No candidate returned');
  } catch (err) {
    console.error('Lab Gemini error:', err);
    return null;
  }
}

// â”€â”€â”€ MDT Hub Specialized Prompts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function selectMDTSpecialists(intakeText: string): Promise<string[]> {
  const prompt = `You are a medical triage AI. Based on the patient's chief complaint, select the 2 to 4 most highly relevant medical specialists to form a Collaborative Board. Be extremely precise and strict; do not select a specialist unless there is a strong, direct clinical reason based on the specific complaint.
Chief Complaint: "${intakeText}"

Return ONLY a JSON array of specialist IDs (strings) from this list:
["neuro", "ent", "cardio", "gastro", "derma", "ortho", "psych", "obgyn", "pulmo", "endo", "uro", "rheuma", "onco", "opthal", "physio", "gp"]

Example: ["neuro", "physio", "ortho"]${CLINICAL_SAFETY_RULES}`;

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: prompt }] },
    contents: [{ role: 'user', parts: [{ text: 'Select specialists.' }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 250 },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'specialist_selection' },
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

  const isElevated = !!intakeData.sharedCaseMaterial || (typeof intakeData.chiefComplaint === 'string' && intakeData.chiefComplaint.includes('Shared Case Material:'));
  const sharedContext = isElevated && intakeData.sharedCaseMaterial ? `
Shared Case Context (Existing Investigation Data):
${intakeData.sharedCaseMaterial}` : '';

  const questionCount = Math.floor(messages.length / 2);

  const isFollowUp = typeof intakeData.chiefComplaint === 'string' && intakeData.chiefComplaint.includes('[FOLLOW-UP FROM PREVIOUS EVALUATION]');

  let questionRule;
  let enforcementRule;

  if (isElevated) {
    // MDT Deep Collab Board (either new or imported case)
    questionRule = `[SPECIAL INSTRUCTION]: This patient's case is being reviewed by a Collaborative Board. DO NOT ask basic intake questions. You may ask 1 or 2 highly targeted cross-questions to resolve conflicts in the evidence or clarify changes. IF the provided case context is sufficient to form a hypothesis (e.g. the patient states their symptoms are the same), output exactly "ANALYSIS_COMPLETE" in the "response" field IMMEDIATELY. Do not prolong the questioning unnecessarily.`;
    
    enforcementRule = questionCount >= 3 
      ? `

[SYSTEM DIRECTIVE]: You have asked enough questions for this collaborative review. You MUST output exactly "ANALYSIS_COMPLETE" in the "response" field now.`
      : '';
  } else if (isFollowUp) {
    // Single Specialist Follow-Up (Quick Consult Import)
    questionRule = `[SPECIAL INSTRUCTION]: This is a follow-up evaluation where the patient is challenging a previous diagnosis or presenting new findings. YOUR ENTIRE FOCUS must be on investigating these discrepancies. Cross-question their new symptoms, analyze the new reports against the old baseline. 
You MUST ask questions to deeply investigate. Do NOT output "ANALYSIS_COMPLETE" until you have asked at least 3 questions, or until the user explicitly tells you they have no more information. You have currently asked ${questionCount} questions. You may ask up to 8 questions in total.`;
    
    enforcementRule = questionCount >= 8 
      ? `

[SYSTEM DIRECTIVE]: You have reached the maximum limit of 8 questions. You MUST output exactly "ANALYSIS_COMPLETE" in the "response" field now. Do not ask any more questions.`
      : (questionCount === 7 
          ? `

[SYSTEM DIRECTIVE]: This is your final question (8 of 8). You MUST end your response by saying something similar to: "This is my last question. Please provide any remaining details, and I will conclude my revised analysis."`
          : '');
  } else {
    // Normal Single Specialist (Quick Consult New)
    questionRule = `You have currently asked ${questionCount} questions. You may ask up to 8 questions in total to be extremely thorough. 
If you have enough information to form a strong hypothesis, or if you reach 8 questions, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`;

    enforcementRule = questionCount >= 8
      ? `

[SYSTEM DIRECTIVE]: You have reached the maximum limit of 8 questions. You MUST output exactly "ANALYSIS_COMPLETE" in the "response" field now. Do not ask any more questions.`
      : (questionCount === 7
          ? `

[SYSTEM DIRECTIVE]: This is your final question (8 of 8). You MUST end your response by saying something similar to: "This is my last question. Please provide any remaining details, and I will conclude my analysis."`
          : '');
  }

  const MDT_SPECIALIST_PROMPT = `You provide an AI-generated ${specialist.label} perspective for appointment preparation. You are not a licensed clinician, do not represent a real specialist, and must not say or imply that you examined the patient.
${(isFollowUp && !isElevated) ? 'You are acting as the dedicated Follow-up AI Specialist to resolve patient disagreements and new evidence.' : `You are part of a collaborative AI perspective board alongside: ${otherNames}.`}
The patient's initial intake is:
Chief Complaint: ${intakeData.chiefComplaint}
History: ${intakeData.history || 'None provided'}


Your goal is to organize focused questions, possible evidence gaps, and clinician-discussion topics.
DO NOT REPEAT questions. Dig deeper or pivot to a new relevant area.
You MUST finish your assessment in under 8 questions. To do this, ask highly-styled, multi-part questions to maximize information gathering per turn. Do not waste turns on single details - ask for timing, severity, and associated symptoms together when relevant, while remaining conversational.

CRITICAL FORMATTING RULES:
1. Divide your response into 2-3 short paragraphs using standard newline characters (\n\n) so it is easy to read. Do not write one giant wall of text.
2. DO NOT repeatedly thank the user for answering (e.g. stop saying "Thank you for clarifying"). Just get straight to the next medical question to save time.
3. If the user mentions they already answered a similar question for another specialist, accept that and move to a different diagnostic angle.
${questionRule}

Return your response STRICTLY as JSON matching this format:
{
  "evidenceNote": "One short, patient-facing note about which information is missing or relevant. Do not reveal hidden reasoning.",
  "patientFriendlySummary": "If outputting 'ANALYSIS_COMPLETE', provide a 1-2 sentence quick summary.",
  "keyFindings": "If outputting 'ANALYSIS_COMPLETE', summarize the core clinical findings in a clear paragraph. Leave empty otherwise.",
  "interpretation": "If outputting 'ANALYSIS_COMPLETE', explain what these findings mean in plain English. Leave empty otherwise.",
  "nextSteps": "If outputting 'ANALYSIS_COMPLETE', outline the actionable next steps for the patient. Leave empty otherwise.",
  "abnormalitiesNoted": ["List of concerning symptoms or red flags noted", "Leave empty if none"],
  "medicalTerms": [{"term": "Medical Term Used", "definition": "A 1-2 sentence, extremely clear and simple definition for the patient. STRICT RULE: DO NOT include meta-commentary like 'Definition tailored for...'."}],
  "currentHypotheses": [{"condition": "Hypothesis 1 (60%)", "rationale": "Patient-friendly ELI5 explanation of why this condition is suspected based on symptoms."}],
  "response": "Your conversational question to the patient. (Or 'ANALYSIS_COMPLETE').",
  "widgetType": "none | pain_slider | symptom_pills (CRITICAL: Use 'pain_slider' if asking about pain severity 1-10. Use 'symptom_pills' if asking the user to select from a list of descriptors/symptoms).",
  "widgetOptions": ["Array", "Of", "Tags", "If using symptom_pills"]
}${enforcementRule}`;

  const ddxContext = activeDifferentials && activeDifferentials.length > 0
    ? `\nACTIVE HYPOTHESES TO TEST (from Differential Diagnosis Board):\n${activeDifferentials.map(d => `- ${d.condition} (${d.probability}%): Try to prove/disprove this. Next best tests suggest looking for: ${d.nextBestTests.join(', ')}`).join('\n')}\nAsk targeted questions to confirm or rule out these active hypotheses.`
    : '';
  
  const finalSystemPrompt = MDT_SPECIALIST_PROMPT + sharedContext + ddxContext + CLINICAL_SAFETY_RULES;

  const contents = messages.slice(-12).map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text || msg.content }],
  }));

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: finalSystemPrompt }] },
    contents,
    generationConfig: { 
      responseMimeType: 'application/json',
      maxOutputTokens: 700,
      responseSchema: {
        type: "object",
        properties: {
          evidenceNote: { type: "string" },
          patientFriendlySummary: { type: "string" },
          keyFindings: { type: "string" },
          interpretation: { type: "string" },
          nextSteps: { type: "string" },
          abnormalitiesNoted: { type: "array", items: { type: "string" } },
          medicalTerms: { type: "array", items: { type: "object", properties: { term: { type: "string" }, definition: { type: "string" } } } },
          currentHypotheses: { type: "array", items: { type: "object", properties: { condition: { type: "string" }, rationale: { type: "string" } } } },
          response: { type: "string" },
          widgetType: { type: "string" },
          widgetOptions: { type: "array", items: { type: "string" } }
        },
        required: ["currentHypotheses", "response"]
      }
    },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': isFollowUp ? 'deep_import_specialist' : 'deep_specialist' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) return data.candidates[0].content.parts[0].text.trim();
    return '{"response": "Could you tell me more?", "internalThoughts": "Awaiting more info", "currentHypotheses": []}';
  } catch (err) {
    console.error('Gemini board specialist error:', err);
    return '{"response": "I am experiencing network issues.", "internalThoughts": "Network error", "currentHypotheses": []}';
  }
}

const mdtConferenceCache = new Map<string, any>();
const mdtConferenceInFlight = new Map<string, Promise<any>>();

export async function runMDTConference(intakeData: any, specialistData: any, medicalRecords: any[] = []): Promise<any> {
  const requestKey = JSON.stringify({ intakeData, specialistData, medicalRecords });
  if (mdtConferenceCache.has(requestKey)) return mdtConferenceCache.get(requestKey);
  if (mdtConferenceInFlight.has(requestKey)) return mdtConferenceInFlight.get(requestKey);

  const request = (async () => {
    const idempotencyKey = await sha256Hash('mdt-' + requestKey);
  const recordsText =
    medicalRecords.length > 0
      ? `\nPatient Medical Records:\n${medicalRecords.map((r) => `- ${r.testName || r.filename}: ${r.keyFindings || (typeof r.findings === 'string' ? r.findings.substring(0, 300) + '...' : 'Available')}`).join('\n')}`
      : '';

  // Compact transcripts into an Evidence Packet to save tokens
  const strippedData = Object.fromEntries(
    Object.entries(specialistData).map(([id, msgs]: [string, any[]]) => {
      const terminalMsg = msgs.slice().reverse().find(m => m.role === 'ai' && (m.text?.includes('ANALYSIS_COMPLETE') || m.parsedText?.includes('ANALYSIS_COMPLETE')));
      if (terminalMsg) {
        try {
          const textToParse = terminalMsg.text || '';
          const match = textToParse.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            return [id, {
              specialist: id,
              keyFindings: parsed.keyFindings || parsed.evidenceNote,
              interpretation: parsed.interpretation,
              hypotheses: parsed.currentHypotheses || terminalMsg.hypotheses,
              abnormalities: parsed.abnormalitiesNoted,
              nextSteps: parsed.nextSteps
            }];
          }
        } catch(e) { /* ignore */ }
      }
      // Fallback
      return [id, msgs.slice(-3).map(m => ({ role: m.role, text: m.text }))];
    })
  );

  const orchestratorPrompt = `You are the Chief Clinical Orchestrator and Lead Medical Research Scientist for a collaborative medical board. Your approach is deeply analytical, evidence-based, and rooted in the latest scientific literature. You synthesize data like a clinical researcher looking for root causes, mechanistic pathways, and scientific consensus.
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
  "debateSummary": "A 3-4 sentence summary of the board's deliberation."
}${CLINICAL_SAFETY_RULES}`;

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: orchestratorPrompt }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Run the Board Conference based on the provided specialist data.' }],
      },
    ],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 700 },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'deep_conference' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const result = parseModelJson(text, {
        corroborations: [],
        contentions: [],
        followUpQuestions: [],
        debateSummary: 'Board consensus could not be fully resolved.'
      });
      mdtConferenceCache.set(requestKey, result);
      return result;
    }
  } catch (err) {
    console.error('Orchestrator error:', err);
    return {
      corroborations: [],
      contentions: [],
      followUpQuestions: [],
      debateSummary: "Board consensus failed due to an error."
    };
  }
  return null;
  })();
  mdtConferenceInFlight.set(requestKey, request);
  request.finally(() => mdtConferenceInFlight.delete(requestKey)).catch(() => {});
  return request;
}

const mdtReportCache = new Map<string, any>();
const mdtReportInFlight = new Map<string, Promise<any>>();

export async function generateMDTReport(
  intakeData: any,
  conferenceData: any,
  finalAnswers: any,
  medicalRecords: any[] = [],
  specialistTranscripts?: Record<string, any[]>
): Promise<any> {
  const requestKey = JSON.stringify({ intakeData, conferenceData, finalAnswers, medicalRecords, specialistTranscripts });
  if (mdtReportCache.has(requestKey)) return mdtReportCache.get(requestKey);
  if (mdtReportInFlight.has(requestKey)) return mdtReportInFlight.get(requestKey);
  
  const request = (async () => {
    const idempotencyKey = await sha256Hash('mdt-' + requestKey);
  const recordsText =
    medicalRecords.length > 0
      ? `\nPatient Medical Records:\n${medicalRecords.map((r) => `- ${r.testName || r.filename}: ${r.keyFindings || (typeof r.findings === 'string' ? r.findings.substring(0, 300) + '...' : 'Available')}`).join('\n')}`
      : '';

  const specialistText = specialistTranscripts && Object.keys(specialistTranscripts).length > 0
    ? `\nTargeted specialist findings (included for imported/follow-up reviews):\n${Object.entries(specialistTranscripts).map(([id, messages]) => {
      const terminalMsg = (messages || []).slice().reverse().find((m: any) => m.role === 'ai' && m.text?.includes('ANALYSIS_COMPLETE'));
      if (terminalMsg) {
        try {
          const match = (terminalMsg.text || '').match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            return `--- ${id} ---\nKey Findings: ${parsed.keyFindings}\nInterpretation: ${parsed.interpretation}\nNext Steps: ${parsed.nextSteps}`;
          }
        } catch(e) {}
      }
      const tail = (messages || []).slice(-3).map((message: any) => `${message.role}: ${String(message.text || message.content || '').slice(0, 700)}`).join('\n');
      return `--- ${id} ---\n${tail}`;
    }).join('\n').slice(0, 5000)}`
    : '';

  const conferenceFindings = `
Cross-Specialty Corroborations: ${JSON.stringify(conferenceData.corroborations || [])}
Points of Contention: ${JSON.stringify(conferenceData.contentions || [])}
Follow-Up Questions Identified: ${JSON.stringify(conferenceData.followUpQuestions || [])}`;

  const reportPrompt = `You are the Chief Clinical Orchestrator compiling the final board report.
Patient Intake: ${intakeData.chiefComplaint}${recordsText}
Conference Summary: ${conferenceData.debateSummary}
${conferenceFindings}
Patient's Final Answers: ${JSON.stringify(finalAnswers)}
${specialistText}

Compile a structured, patient-safe Collaborative Board case brief. 
CRITICAL INSTRUCTIONS:
1. SCIENTIST PATIENT PERSONA: The patient wants to understand the biological mechanisms behind their condition like a scientist. They want rigorous, data-driven explanations and clear clinical linkages between symptoms, lab results, and hypotheses. Provide deep, rich informational density.
2. BEAUTIFUL EXPLANATIONS: Even though you are providing scientific density, you MUST explain the mechanisms and terminology in a simple, beautiful, easy-to-understand way. Do not use impenetrable medical jargon without clearly defining it.
3. Do not present any condition as confirmed. Separate what supports a possibility from what is missing, make clear that a qualified clinician makes diagnoses, and include citations only when a real source is supplied in the case; otherwise return an empty citations list.
Return strictly as JSON:
{
    "executiveSummary": "1 paragraph plain-language synthesis of the case and uncertainty.",
  "keyFindings": "Summarize the core clinical findings across all specialists in a clear paragraph.",
  "interpretation": "Explain what these collective findings mean in plain English.",
  "nextSteps": "Outline the actionable next steps for the patient, prioritizing the most critical ones.",
  "abnormalitiesNoted": ["List of concerning symptoms or red flags noted", "Leave empty if none"],
  "medicalTerms": [{"term": "Medical Term Used", "definition": "A 1-2 sentence, extremely clear and simple definition for the patient. STRICT RULE: DO NOT include meta-commentary like 'Definition tailored for...'."}],
  "specialistDebatePoints": ["Bullet points outlining agreements or differing perspectives among the specialists", "Leave empty if none"],
  "systemicCorrelations": ["Bullet points explaining how symptoms connect across different body systems", "Leave empty if none"],
    "scientificLiteratureContext": "A paragraph explaining what recent clinical research or literature says about this symptom cluster.",
    "alternativeOrRarePossibilities": "A brief mention of rare, environmental, or edge-case conditions a scientist might consider if standard tests are negative.",
  "urgency": "Routine | Soon | Urgent",
  "topDiagnoses": [
    { 
      "condition": "Possible pathway", 
      "confidence": 85, 
      "rationale": "Patient-friendly ELI5 explanation of why this condition is suspected. MUST BE EXTREMELY CONCISE (MAX 2-3 SENTENCES). Do NOT include internal reasoning here.", 
      "specialty": "Specialty to discuss it with", 
      "evidenceFor": ["Specific supporting detail"], 
      "evidenceGaps": ["What is unknown or needs checking"],
      "citations": [{"title": "Journal article title", "journal": "Journal Name", "year": 2023, "link": "https://pubmed.ncbi.nlm.nih.gov/..."}]
    }
  ],
  "recommendedActionPlan": [
    { 
      "step": "Short 3-6 word action title only (e.g. Schedule Primary Care Consultation)", 
      "timeline": "When to do it (e.g. Next Visit, Within 1-2 weeks)", 
      "type": "Consultation | Investigation | Lifestyle"
    }
  ],
  "questionsForClinician": ["Specific question the patient can take to a clinician"]
}${CLINICAL_SAFETY_RULES}`;

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: reportPrompt }] },
    contents: [{ role: 'user', parts: [{ text: 'Generate final report.' }] }],
    generationConfig: { 
      responseMimeType: 'application/json',
      maxOutputTokens: 1800,
      responseSchema: {
        type: "object",
        properties: {
          executiveSummary: { type: "string" },
          keyFindings: { type: "string" },
          interpretation: { type: "string" },
          nextSteps: { type: "string" },
          abnormalitiesNoted: { type: "array", items: { type: "string" } },
          medicalTerms: { type: "array", items: { type: "object", properties: { term: { type: "string" }, definition: { type: "string" } } } },
          specialistDebatePoints: { type: "array", items: { type: "string" } },
          systemicCorrelations: { type: "array", items: { type: "string" } },
          scientificLiteratureContext: { type: "string" },
          alternativeOrRarePossibilities: { type: "string" },
          urgency: { type: "string" },
          topDiagnoses: { type: "array", items: { type: "object", properties: { condition: { type: "string" }, confidence: { type: "number" }, rationale: { type: "string" }, specialty: { type: "string" }, evidenceFor: { type: "array", items: { type: "string" } }, evidenceGaps: { type: "array", items: { type: "string" } }, citations: { type: "array", items: { type: "object", properties: { title: { type: "string" }, journal: { type: "string" }, year: { type: "number" }, link: { type: "string" } } } } } } },
          recommendedActionPlan: { type: "array", items: { type: "object", properties: { step: { type: "string" }, timeline: { type: "string" }, type: { type: "string" } } } },
          questionsForClinician: { type: "array", items: { type: "string" } }
        },
        required: ["executiveSummary", "keyFindings", "interpretation", "nextSteps", "abnormalitiesNoted", "medicalTerms", "specialistDebatePoints", "systemicCorrelations", "topDiagnoses", "recommendedActionPlan"]
      }
    },
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': specialistTranscripts ? 'deep_import_summary' : 'deep_summary' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;

      // Attempt to extract json block even if there is surrounding text
      const result = parseModelJson(text);
      mdtReportCache.set(requestKey, result);
      return result;
    }
  } catch (err) {
    console.error('Report error:', err);
    // Fallback data so it doesn't get stuck on loading
    return {
      executiveSummary:
        'Based on the multi-perspective review of your symptoms and recent discussion, the board has identified discussion pathways. Review any next steps with a qualified clinician.',
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
  })();
  mdtReportInFlight.set(requestKey, request);
  request.finally(() => mdtReportInFlight.delete(requestKey)).catch(() => {});
  return request;
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
    revisedHypothesis: "Deferred to Board Orchestrator.",
    confidenceUpdate: 50
  };
}


const parallelReportCache = new Map<string, any>();
const parallelReportInFlight = new Map<string, Promise<any>>();

export async function generateParallelMultiReport(
  symptomInput: string,
  transcriptsObject: Record<string, any[]>,
  medicalRecords: any[] = []
): Promise<any> {
  const requestKey = JSON.stringify({ symptomInput, transcriptsObject, medicalRecords });
  if (parallelReportCache.has(requestKey)) return parallelReportCache.get(requestKey);
  if (parallelReportInFlight.has(requestKey)) return parallelReportInFlight.get(requestKey);

  const request = (async () => {
    const idempotencyKey = await sha256Hash('mdt-' + requestKey);
  let formattedTranscripts = '';
  for (const [specialistId, messages] of Object.entries(transcriptsObject)) {
    formattedTranscripts += `\n\n--- Specialist (${specialistId}) Transcript ---\n`;
    
    const terminalMsg = (messages || []).slice().reverse().find((m: any) => m.role === 'ai' && m.text?.includes('ANALYSIS_COMPLETE'));
    if (terminalMsg) {
      try {
        const match = (terminalMsg.text || '').match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          formattedTranscripts += `Key Findings: ${parsed.keyFindings}\nInterpretation: ${parsed.interpretation}\nNext Steps: ${parsed.nextSteps}\n`;
          if (parsed.currentHypotheses && parsed.currentHypotheses.length > 0) {
            formattedTranscripts += `[Active Hypotheses: ${parsed.currentHypotheses.map((h: any) => typeof h === 'string' ? h : h.condition).join(', ')}]\n`;
          }
          continue; // Skip appending the raw messages
        }
      } catch(e) {}
    }

    // Fallback: Keep first 2 and last 6 messages if transcript is too long
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
      if (m.currentHypotheses && m.currentHypotheses.length > 0) {
        formattedTranscripts += `[Active Hypotheses: ${m.currentHypotheses.map((h: any) => typeof h === 'string' ? h : h.condition).join(', ')}]\n`;
      }
    });
  }

  const recordsText =
    medicalRecords.length > 0
      ? `\n\n--- Patient Medical Records ---\n${medicalRecords.map((r) => `File: ${r.testName || r.filename}\nFindings: ${r.keyFindings || (typeof r.findings === 'string' ? r.findings.substring(0, 300) + '...' : 'Available')}`).join('\n\n')}`
      : '';

const reportPrompt = `You are an AI assistant orchestrating parallel health-assessment perspectives.
The patient presented with: "${symptomInput}"

Below are the independent interview transcripts from several specialists who questioned the patient simultaneously, along with any uploaded medical records:
${formattedTranscripts}${recordsText}

Your task is to find the connections between these distinct evaluations, cross-correlate their findings with the medical records, and generate a unified case brief.
CRITICAL INSTRUCTIONS:
1. SCIENTIST PATIENT PERSONA: The patient wants to understand the biological mechanisms behind their condition like a scientist. They want rigorous, data-driven explanations and clear clinical linkages between symptoms, lab results, and hypotheses. Provide deep, rich informational density.
2. BEAUTIFUL EXPLANATIONS: Even though you are providing scientific density, you MUST explain the mechanisms and terminology in a simple, beautiful, easy-to-understand way. Do not use impenetrable medical jargon without clearly defining it.
3. MERGE overlapping diagnoses: Do not list the same condition multiple times. Merge them into a single entry with combined evidence.
4. CONDENSE the Action Plan: Limit the action plan to a maximum of 5 distinct, high-yield steps.
5. Do not claim certainty; distinguish evidence from gaps and direct clinical decisions to qualified professionals.
6. Include citations only when a real source is supplied in the case; otherwise return an empty citations list.

Return strictly as JSON matching this exact structure:
{
  "executiveSummary": "1-2 paragraphs identifying connections, uncertainty and overlapping symptoms between the specialist perspectives.",
  "keyFindings": "Summarize the core clinical findings in a clear paragraph.",
  "interpretation": "Explain what these findings mean in plain English.",
  "nextSteps": "Outline the actionable next steps for the patient.",
  "abnormalitiesNoted": ["List of concerning symptoms or red flags noted", "Leave empty if none"],
  "medicalTerms": [{"term": "Medical Term Used", "definition": "A 1-2 sentence, extremely clear and simple definition for the patient. STRICT RULE: DO NOT include meta-commentary like 'Definition tailored for...'."}],
  "debateSummary": "Explicitly state how you resolved conflicts between specialists. Example: 'Neurology suspected MS, but Rheumatology's focus on joint pain prevailed due to elevated ESR in records.'",
  "specialistDebatePoints": ["Bullet points outlining agreements or differing perspectives among the specialists", "Leave empty if none"],
  "systemicCorrelations": ["Bullet points explaining how symptoms connect across different body systems", "Leave empty if none"],
  "urgency": "Routine | Soon | Urgent",
  "topDiagnoses": [
    { 
      "condition": "Possible pathway", 
      "confidence": 85, 
      "rationale": "Patient-friendly ELI5 explanation of why this condition is suspected, so the patient can easily understand it.", 
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
      "type": "Discussion | Record | Follow-up"
    }
  ],
  "questionsForClinician": ["Specific question the patient can take to a clinician"]
}${CLINICAL_SAFETY_RULES}`;

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: reportPrompt }] },
    contents: [{ role: 'user', parts: [{ text: 'Generate final parallel report.' }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1800 },
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'deep_summary' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const result = parseModelJson(text);
      parallelReportCache.set(requestKey, result);
      return result;
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
  })();
  parallelReportInFlight.set(requestKey, request);
  request.finally(() => parallelReportInFlight.delete(requestKey)).catch(() => {});
  return request;
}

// â”€â”€â”€ AI DIETICIAN FUNCTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 300 },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'dietician_food_log' },
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
    generationConfig: { maxOutputTokens: 150 },
  };
  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'dietician_advice' },
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
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1800 },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'dietician_meal_plan' },
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

// â”€â”€â”€ 3D BODY MAP / FABLE EXPERIMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  "professionalAdvice": "These may be useful specialist perspectives to discuss with your primary clinician based on the information provided."
}
${CLINICAL_SAFETY_RULES}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 250 },
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
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    }
  } catch (err) {
    console.error('Specialist suggestion error:', err);
    return null;
  }
}

const differentialInFlight = new Map<string, Promise<any>>();

export async function runDifferentialAnalysis(intakeData: any, medicalRecords: any[], profileData: any) {
  const requestKey = JSON.stringify({
    intakeData,
    records: (medicalRecords || []).map((record: any) => ({ id: record.id, filename: record.filename, findings: record.findings, keyFindings: record.keyFindings })),
    profile: { age: profileData?.demographics?.age, gender: profileData?.demographics?.gender, conditions: profileData?.health?.conditions || profileData?.medicalConditions },
  });
  const existing = differentialInFlight.get(requestKey);
  if (existing) return existing;

  const request = (async () => {
    const idempotencyKey = await sha256Hash('mdt-' + requestKey);


  const prompt = `
You are HealthChain's health assessment AI.
Analyze the patient's symptoms, active clinical cases, and medical records to generate a short list of possibilities for clinician discussion (DDx).
The patient has a "Scientist" mindset: they want to understand the deep biological mechanisms behind their symptoms, the rigorous connections between data points, and the rationale for your hypotheses. Provide high informational density, but explain all medical terminology beautifully and simply.

Patient Profile:
${JSON.stringify({ age: profileData?.demographics?.age, gender: profileData?.demographics?.gender, conditions: profileData?.health?.conditions || profileData?.medicalConditions })}

Case Intake & Symptoms:
${JSON.stringify(intakeData)}

Uploaded Medical Records:
${JSON.stringify(medicalRecords.map(r => ({ test: r.testName || r.filename, findings: r.keyFindings || (typeof r.findings === 'string' ? r.findings.substring(0, 300) + '...' : 'Available'), abnormal: r.abnormalities })))}

Identify the top 2 to 4 possible discussion pathways. The probability is an AI confidence estimate, not a medical probability or diagnosis. Specify questions or tests a qualified clinician may consider to rule in/out the possibility.

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
${CLINICAL_SAFETY_RULES}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 1000 },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'differential_generation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      return parseModelJson(text, []);
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
You are an AI health-assessment assistant. Organize this patient profile into a holistic health summary for clinician discussion.
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
${CLINICAL_SAFETY_RULES}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, responseMimeType: 'application/json', maxOutputTokens: 600 },
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
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', maxOutputTokens: 250 },
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
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 1000 },
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
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', maxOutputTokens: 1500 },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'case_connection_map' },
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
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', maxOutputTokens: 1500 },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'literature_relevance' },
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
        type: "object",
        properties: {
          name: { type: "string" },
          class: { type: "string" },
          uses: { type: "string" },
          sideEffects: { type: "string" },
          alternatives: { type: "array", items: { type: "string" } },
          warnings: { type: "string" },
          interactions: { type: "array", items: { type: "string" } }
        },
        required: ["name", "class", "uses", "sideEffects", "alternatives", "warnings", "interactions"]
      }
    }
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'case_prep_analysis' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || '');
  } catch (err) {
    console.error('Case prep analysis error:', err);
    return null;
  }
}


const connectionMapCache = new Map<string, any>();
const connectionMapInFlight = new Map<string, Promise<any>>();

export async function generateCaseConnectionMap(topDiagnoses: any[]): Promise<any> {
  if (!topDiagnoses || topDiagnoses.length === 0) return null;
  const requestKey = JSON.stringify(topDiagnoses);
  
  if (connectionMapCache.has(requestKey)) return connectionMapCache.get(requestKey);
  
  const existing = connectionMapInFlight.get(requestKey);
  if (existing) return existing;

  const request = (async () => {
    const idempotencyKey = await sha256Hash('mdt-' + requestKey);
  
  const prompt = `
You are an expert diagnostic correlation engine. I am providing you with the "Possible pathways" (top diagnoses) generated by independent AI medical specialists for a specific case.

Your job is to build a mental map that connects these distinct pathways together. 

Here are the pathways:
${JSON.stringify(topDiagnoses, null, 2)}

Identify:
1. The Central Symptoms: What are the 1-3 core symptoms tying all this together?
2. The Conditions: Map out the pathways provided.
3. The Connections: How do these conditions overlap? (e.g. they share a symptom, one causes the other, they share a mechanism, or they are just differentials).
4. Precautions: Any red flags or monitoring needed?
5. Missing Evidence: What tests would differentiate them?

Return ONLY a valid JSON object matching this exact schema:
{
  "centralSymptoms": [
    { "id": "symp1", "label": "Short symptom name", "severity": "high|medium|low" }
  ],
  "conditions": [
    { "id": "cond1", "label": "Condition Name", "confidence": 80, "specialty": "ENT", "category": "infectious|allergic|inflammatory|structural|functional" }
  ],
  "connections": [
    { "from": "cond1", "to": "cond2", "type": "shared_symptom|causal_progression|differential_overlap|common_mechanism", "label": "Sneezing is shared", "strength": "strong|moderate|weak" },
    { "from": "symp1", "to": "cond1", "type": "symptom_presentation", "label": "Primary presentation", "strength": "strong" }
  ],
  "precautions": [
    { "text": "Monitor for fever above 38.5Â°C", "severity": "red_flag|watch|info", "relatedConditions": ["cond1"] }
  ],
  "missingEvidence": [
    { "test": "Complete Blood Count", "wouldDifferentiate": ["cond1", "cond2"], "urgency": "Routine|Soon", "recommendedSpecialists": "General Physician or Hematologist" }
  ],
  "narrative": "A 2-3 sentence plain English summary of how everything connects."
}
`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', maxOutputTokens: 1200 },
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
      const result = parseModelJson(text);
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
  const prompt = `You are an expert clinical triage assistant helping a patient prepare for a doctor's appointment.
The patient has the following notes:
Concern: ${casePrepData.concern}
Timeline: ${casePrepData.timeline}
Records/Facts: ${casePrepData.records}

Generate exactly 4 highly specific, medical questions the patient should ask their doctor. 
The questions should sound like they were written by a smart, prepared patient.
Focus on differentiating diagnoses, next steps, and urgency.
Return strictly as a JSON array of strings.`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 600,
      responseSchema: {
        type: "array",
        items: { type: "string" }
      }
    }
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'appointment_questions' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || '');
  } catch (err) {
    console.error('generateAppointmentQuestions error:', err);
    return [];
  }
}

export async function askAppointmentCoach(casePrepData: any, userQuestion: string): Promise<string> {
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
        generationConfig: { temperature: 0.4, maxOutputTokens: 250 }
      })
    });
    if (!res.ok) return "I'm having trouble connecting right now. Please try asking again.";
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    console.error('askAppointmentCoach error:', err);
    return "I'm having trouble connecting right now. Please try asking again.";
  }
}

export async function refineAppointmentBrief(brief: AppointmentBrief): Promise<AppointmentBrief> {
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
        generationConfig: { temperature: 0.2, maxOutputTokens: 900 } // low temp for deterministic rewriting
      })
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonStr = rawText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
    const refined = JSON.parse(jsonStr);
    refined.isRefinedByAI = true;
    return refined;
  } catch (err) {
    console.error('refineAppointmentBrief error:', err);
    return brief; // Return original on failure
  }
}


export async function runJarvisInvestigation(history: string, files: { mimeType: string; data: string }[], profile: any): Promise<any> {
  const idempotencyKey = await sha256Hash('jarvis-' + history + files.length);
  const prompt = `You are J.A.R.V.I.S. (Joint Analytical Research & Validation Intelligence System), the world's most advanced functional medicine and diagnostic AI.
You are reviewing a complex, chronic patient case. This patient has likely seen multiple doctors and been told their labs are "normal", but they are still suffering. 

YOUR MISSION:
1. Identify "Sub-clinical" biomarkers: Look for labs that are technically "in range" but indicate suboptimal functional health (e.g. Ferritin of 15 is "normal" but causes severe fatigue).
2. Find Systemic Patterns: Connect siloed symptoms (e.g. GI, Neurological, Dermatological) to a single unifying root cause (e.g. Mast Cell, Dysautonomia, Mold, Lyme, Autoimmune).
3. Generate the "Missing Link": Explain exactly what previous doctors might have missed and why.

PATIENT PROFILE:
Age: ${profile?.demographics?.age || 'Unknown'}
Gender: ${profile?.demographics?.gender || 'Unknown'}

PATIENT HISTORY & SYMPTOMS:
${history}

Review the provided clinical documents, lab reports, and history carefully.

Return ONLY a JSON object with this exact structure:
{
  "executiveSummary": "A deeply empathetic, brilliant summary of the patient's long-term suffering and the primary pattern you have identified.",
  "functionalBiomarkers": [
    { "biomarker": "Ferritin", "value": "15", "standardRange": "12-150", "optimalRange": "50-100", "insight": "While technically 'normal', levels under 30 cause severe fatigue and restless leg syndrome." }
  ],
  "systemicPatterns": [
    { "pattern": "Post-Viral Dysautonomia", "evidence": "Started after a viral infection, includes dizziness, GI stasis, and fatigue." }
  ],
  "missingLinks": [
    "Endocrinologists looked at TSH but missed Free T3 pooling.",
    "GI doctor treated IBS, but missed the mast cell connection to the rashes."
  ],
  "topDiagnoses": [
    { "condition": "Mast Cell Activation Syndrome", "rationale": "Explains the systemic, multi-organ inflammation and normal standard labs.", "confidence": 75 }
  ],
  "questionsForClinician": [
    "Should we run a tryptase panel during a flare?",
    "Could this be functional B12 deficiency despite normal serum levels?"
  ]
}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          ...files.map(f => ({ inlineData: { mimeType: f.mimeType, data: f.data } }))
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
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'jarvis_investigation' },
      body: JSON.stringify(payload),
    }, 60000, idempotencyKey);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      return parseModelJson(text);
    }
  } catch (err) {
    console.error('Jarvis error:', err);
    return null;
  }
}





