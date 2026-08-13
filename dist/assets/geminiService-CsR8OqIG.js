import{g as C,b as T}from"./index-BBJ1MsOc.js";import"./framer-motion-CDW5Q6YF.js";import"./react-vendor-DURbyAIq.js";import"./pdf-tools-BU1OiuD_.js";import"./supabase-BddhP1o-.js";let S=null,b=null;function x(){var t,i;let n=[];const a=C(),e=T(),d=`${a==null?void 0:a.id}-${a==null?void 0:a.updatedAt}-${e==null?void 0:e.id}-${e==null?void 0:e.updatedAt}`;if(S&&b===d)return S;let l=`PATIENT PROFILE:
`;(a.demographics.age||a.demographics.gender)&&(l+=`- ${a.demographics.age||"?"} yr ${a.demographics.gender||""}
`),a.conditions&&a.conditions.length>0&&(l+=`- Conditions: ${a.conditions.join(", ")}
`),a.medications&&a.medications.length>0&&(l+=`- Meds: ${a.medications.map(o=>o.name).join(", ")}
`),a.familyHistory&&a.familyHistory.length>0&&(l+=`- Family Hx: ${a.familyHistory.join(", ")}
`),l!==`PATIENT PROFILE:
`&&n.push(l);const s=Object.entries(a.vitals.latestLabValues);if(s.length>0){let o=`LABS:
`;s.slice(0,8).forEach(([h,p])=>{o+=`- ${h}: ${p.value} ${p.unit} (${p.status})
`}),n.push(o)}if(e){let o=`ACTIVE CASE:
`;o+=`- ${e.title}
`,(t=e.intakeData)!=null&&t.chiefComplaint&&(o+=`- Concern: ${e.intakeData.chiefComplaint.substring(0,200)}
`),(i=e.report)!=null&&i.executiveSummary&&(o+=`- Synthesis: ${e.report.executiveSummary.substring(0,200)}
`);const h=(e.medicalRecords||[]).slice(0,3);h.length&&(o+=`- Evidence: ${h.map(p=>`${p.filename} (${p.keyFindings||"On file"})`).join("; ")}
`),n.push(o)}const r=a.timeline.filter(o=>["diagnosis","mdt_report","lab_report"].includes(o.type));if(r.length>0){let o=`HISTORY:
`;r.slice(0,3).forEach(h=>{o+=`- ${new Date(h.date).toLocaleDateString()}: ${h.title}
`}),n.push(o)}if(n.length===0)return S="",b=d,"";let c=`

=== PATIENT CONTEXT ===
${n.join(`
`)}========================
`;return c.length>1500&&(c=c.substring(0,1497)+`...
`),S=c,b=d,c}const u="/api/gemini",y=async(n,a={},e=6e4,d=2)=>{if(typeof navigator<"u"&&!navigator.onLine)throw new Error("Offline");try{const c=Date.now();let t=[];try{t=JSON.parse(localStorage.getItem("hc_api_logs")||"[]")}catch{t=[]}if(t=t.filter(i=>c-i<36e5),t.length>=20)throw new Error("Rate limit exceeded. Please try again later.");t.push(c),localStorage.setItem("hc_api_logs",JSON.stringify(t))}catch(s){if(s.message.includes("Rate limit exceeded"))throw s}let l;for(let s=0;s<=d;s++){const r=new AbortController,c=setTimeout(()=>r.abort(),e);try{const t=await fetch(n,{...a,signal:r.signal});if(clearTimeout(c),t.status===429&&s<d){await new Promise(i=>setTimeout(i,1e3*(s+1)));continue}if(!t.ok&&t.status>=500&&s<d){await new Promise(i=>setTimeout(i,1e3*Math.pow(2,s)));continue}return t}catch(t){if(clearTimeout(c),l=t,(t.name==="AbortError"||t.name==="TypeError")&&s<d){await new Promise(i=>setTimeout(i,1e3*Math.pow(2,s)));continue}if(s===d)throw t.name==="AbortError"?new Error("Timeout"):t}}throw l},P=`You are HealthChain's clinical investigation AI.
Your goal is to gather facts to build a "causal chain" connecting root causes to symptoms, but you must do it with a warm, professional, and empathetic bedside manner.

RULES:
1. Be conversational and empathetic. Briefly acknowledge what the user is experiencing before moving forward.
2. Ask ONE clear follow-up question at a time. Do not interrogate the user with multiple questions in one message.
3. Keep the tone natural and reassuring, like a friendly medical professional trying to understand their patient.
4. After 3-5 questions, when you have enough data, output "ANALYSIS_COMPLETE" followed by a JSON block:

\`\`\`json
{"chain_name":"Root Cause -> Symptom","normal_terms_explanation":"Plain English mechanism","match_percentage":"83%","specialists_validated":"3 endocrinologists","resolved_cases":"27","cost_to_confirm":"₹1,400","time_to_relief":"6-8 wks","specialist":"Endocrine","this_week_tasks":["Task 1"],"flowchart":{"root":"","root_sub":"","mechanism":"","mechanism_sub":"","symptoms":[{"name":"","sub":""}]},"what_it_is":"2-3 sentences.","whats_driving_it":"2-3 sentences.","chain_reaction":["Step 1"],"where_it_shows_up":[{"location":"","effect":""}],"if_untreated":[{"time":"","effect":""}],"what_to_do":[{"step":"","cost":""}],"cost_to_diagnose":"₹1,300","cost_unexplained":"₹15,000+","recovery_timeline":[{"time":"","effect":""}],"if_symptoms_persist":"Next check","do":"Do this","dont":"Don't do this","quote":"Insight."}
\`\`\`

Do NOT include ANALYSIS_COMPLETE until you are ready to conclude.`;async function j(n){var c,t;const d=(((c=n[0])==null?void 0:c.role)==="model"?n.slice(1):n).slice(-12).map(i=>{let o=i.content;return i.role==="analysis"&&(o=`ANALYSIS_COMPLETE
\`\`\`json
${JSON.stringify(i.content)}
\`\`\``),{role:i.role==="user"?"user":"model",parts:[{text:o}]}}),l=x(),r={systemInstruction:{role:"system",parts:[{text:P+l}]},contents:d};try{const i=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)});if(!i.ok)throw new Error(`API Error: ${i.status}`);const o=await i.json();return(t=o.candidates)!=null&&t[0]?o.candidates[0].content.parts[0].text:"Could you tell me a bit more about that?"}catch{return"Connection issue. Please try again."}}const O=`You are a clinical pharmacology AI.
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
If the medicine is completely unrecognized, return a JSON object with "name": "Unknown", and explain that data is unavailable in the "uses" field.`;async function M(n,a=null){var l;let e=n;a&&(e+=`

PATIENT PROFILE:
Allergies: ${a.allergies.join(", ")||"None"}
Current Medications: ${a.medications.map(s=>s.name).join(", ")||"None"}

Please strictly evaluate for interactions.`);const d={systemInstruction:{role:"system",parts:[{text:O}]},contents:[{role:"user",parts:[{text:e}]}],generationConfig:{responseMimeType:"application/json"}};try{const s=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!s.ok)throw new Error(`API Error: ${s.status}`);const r=await s.json();if((l=r.candidates)!=null&&l[0]){const t=r.candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(t)}throw new Error("No candidate returned")}catch{return null}}const v=`You are Ava, HealthChain's "Medical Chief of Staff" and Personal Health Assistant.
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
`;async function R(n){var s;const a=n.slice(-12).map(r=>({role:r.role==="user"?"user":"model",parts:[{text:r.content}]})),e=x(),l={systemInstruction:{role:"system",parts:[{text:v+e}]},contents:a};try{const r=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!r.ok)throw new Error(`API Error: ${r.status}`);const c=await r.json();return(s=c.candidates)!=null&&s[0]?c.candidates[0].content.parts[0].text:"I'm here for you. Could you tell me a bit more?"}catch{return"I'm having a little trouble connecting right now, but I'm still here for you."}}const A=`You are HealthChain's "Clinical Lab Interpreter", a highly advanced medical AI capable of reading lab reports, blood work, MRIs, and prescriptions.
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
If no document is provided or it is unreadable, return a JSON object with "testName": "Unrecognized / No Document", and explain the issue in "interpretation".`;async function _(n,a,e){var s,r,c;const l={systemInstruction:{role:"system",parts:[{text:`${A}

Patient Context:
Age: ${((s=e==null?void 0:e.demographics)==null?void 0:s.age)||"Unknown"}
Gender: ${((r=e==null?void 0:e.demographics)==null?void 0:r.gender)||"Unknown"}
(Use this patient context strictly for determining the correct normal reference ranges for lab vitals like testosterone, eGFR, hemoglobin, etc.)`}]},contents:[{role:"user",parts:[{text:"Analyze this clinical report."},{inlineData:{mimeType:a,data:n}}]}],generationConfig:{responseMimeType:"application/json"}};try{const t=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!t.ok)throw new Error(`API Error: ${t.status}`);const i=await t.json();if((c=i.candidates)!=null&&c[0]){const h=i.candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(h)}throw new Error("No candidate returned")}catch{return null}}async function J(n){var d;const e={systemInstruction:{role:"system",parts:[{text:`You are a medical triage AI. Based on the patient's chief complaint, select the 3 to 5 most appropriate medical specialists to form a Multi-Disciplinary Team (MDT) board.
Chief Complaint: "${n}"

Return ONLY a JSON array of specialist IDs (strings) from this list:
["neuro", "ent", "cardio", "gastro", "derma", "ortho", "psych", "obgyn", "pulmo", "endo", "uro", "rheuma", "onco", "opthal", "physio", "gp"]

Example: ["neuro", "physio", "ortho"]`}]},contents:[{role:"user",parts:[{text:"Select specialists."}]}]};try{const l=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!l.ok)throw new Error(`API Error: ${l.status}`);const s=await l.json();if((d=s.candidates)!=null&&d[0]){const c=s.candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(c)}}catch{}return["gp"]}async function L(n,a,e,d,l){var f;const s=e.filter(m=>m.id!==a.id).map(m=>m.label).join(", "),r=!!d.sharedCaseMaterial,c=r?`
Shared Case Context (Existing Investigation Data):
${d.sharedCaseMaterial}`:"",t=r?'This patient has already been extensively interviewed by a Parallel Board. Do NOT ask basic questions. You may ask 1 or 2 highly targeted questions to resolve conflicts in the evidence. If the provided case context is sufficient to form a hypothesis, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.':`You may ask up to 10 questions in total to be extremely thorough. 
If you have enough information to form a strong hypothesis, or if you reach 10 questions, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`,i=`You are a highly skilled ${a.label}. 
You are part of a Multi-Disciplinary Team (MDT) board alongside: ${s}.
The patient's initial intake is:
Chief Complaint: ${d.chiefComplaint}
History: ${d.history||"None provided"}

Your goal is to conduct a Deep Specialist Assessment.
DO NOT REPEAT questions. Dig deeper or pivot to a new relevant area.
Ask exactly ONE short, conversational follow-up question at a time.
${t}

Return your response STRICTLY as JSON matching this format:
{
  "internalThoughts": "1 sentence describing what you are currently considering/ruling out based on the latest input.",
  "currentHypotheses": ["Hypothesis 1 (60%)", "Hypothesis 2 (40%)"],
  "response": "Your conversational question to the patient. (Or 'ANALYSIS_COMPLETE').",
  "widgetType": "none | pain_slider | symptom_pills (CRITICAL: Use 'pain_slider' if asking about pain severity 1-10. Use 'symptom_pills' if asking the user to select from a list of descriptors/symptoms).",
  "widgetOptions": ["Array", "Of", "Tags", "If using symptom_pills"]
}`,o=l&&l.length>0?`
ACTIVE HYPOTHESES TO TEST (from Differential Diagnosis Board):
${l.map(m=>`- ${m.condition} (${m.probability}%): Try to prove/disprove this. Next best tests suggest looking for: ${m.nextBestTests.join(", ")}`).join(`
`)}
Ask targeted questions to confirm or rule out these active hypotheses.`:"",h=i+c+o,p=n.slice(-12).map(m=>({role:m.role==="user"?"user":"model",parts:[{text:m.text||m.content}]})),g={systemInstruction:{role:"system",parts:[{text:h}]},contents:p,generationConfig:{responseMimeType:"application/json",responseSchema:{type:"object",properties:{internalThoughts:{type:"string"},currentHypotheses:{type:"array",items:{type:"string"}},response:{type:"string"},widgetType:{type:"string"},widgetOptions:{type:"array",items:{type:"string"}}},required:["internalThoughts","currentHypotheses","response"]}}};try{const m=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(g)});if(!m.ok)throw new Error(`API Error: ${m.status}`);const w=await m.json();return(f=w.candidates)!=null&&f[0]?w.candidates[0].content.parts[0].text.trim():'{"response": "Could you tell me more?", "internalThoughts": "Awaiting more info", "currentHypotheses": []}'}catch{return'{"response": "I am experiencing network issues.", "internalThoughts": "Network error", "currentHypotheses": []}'}}async function Y(n,a,e=[]){var c;const d=e.length>0?`
Patient Medical Records:
${e.map(t=>`- ${t.testName||t.filename}: ${t.keyFindings||(typeof t.findings=="string"?t.findings.substring(0,300)+"...":"Available")}`).join(`
`)}`:"",l=Object.fromEntries(Object.entries(a).map(([t,i])=>[t,i.map(o=>({role:o.role,text:o.text,hypotheses:o.currentHypotheses}))])),r={systemInstruction:{role:"system",parts:[{text:`You are the Chief Clinical Orchestrator for an MDT board.
The patient's intake:
Chief Complaint: ${n.chiefComplaint}${d}

Here are the findings from the individual specialist assessments:
${JSON.stringify(l)}

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
}`}]},contents:[{role:"user",parts:[{text:"Run the MDT Conference based on the provided specialist data."}]}],generationConfig:{responseMimeType:"application/json"}};try{const t=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)});if(!t.ok)throw new Error(`API Error: ${t.status}`);const i=await t.json();if((c=i.candidates)!=null&&c[0]){const h=i.candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(h)}}catch{return{corroborations:[],contentions:[],followUpQuestions:[],debateSummary:"MDT consensus failed due to an error."}}return null}async function H(n,a,e,d=[]){var c;const l=d.length>0?`
Patient Medical Records:
${d.map(t=>`- ${t.testName||t.filename}: ${t.keyFindings||(typeof t.findings=="string"?t.findings.substring(0,300)+"...":"Available")}`).join(`
`)}`:"",r={systemInstruction:{role:"system",parts:[{text:`You are the Chief Clinical Orchestrator compiling the final MDT report.
Patient Intake: ${n.chiefComplaint}${l}
Conference Summary: ${a.debateSummary}
Patient's Final Answers: ${JSON.stringify(e)}

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
}`}]},contents:[{role:"user",parts:[{text:"Generate final report."}]}],generationConfig:{responseMimeType:"application/json"}};try{const t=new AbortController,i=setTimeout(()=>t.abort(),6e4),o=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r),signal:t.signal});if(clearTimeout(i),!o.ok)throw new Error(`API Error: ${o.status}`);const h=await o.json();if((c=h.candidates)!=null&&c[0]){const p=h.candidates[0].content.parts[0].text,g=p.match(/\{[\s\S]*\}/),f=g?g[0]:p.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(f)}}catch{return{executiveSummary:"Based on the multi-disciplinary review of your symptoms and recent discussion, the board has identified some strong diagnostic pathways. Please follow the recommended action plan for the next steps.",topDiagnoses:[{condition:"Pending Further Review",confidence:60,rationale:"The board requires the results of your next tests to provide a conclusive assessment.",specialty:"General Practice"}],recommendedActionPlan:[{step:"Consult Primary Care Physician",timeline:"Immediately",type:"Consultation"}]}}return null}async function F(n,a,e,d,l=[]){return{critique:"Awaiting Orchestrator consensus.",revisedHypothesis:"Deferred to MDT Orchestrator.",confidenceUpdate:50}}async function q(n,a,e=[]){var c;let d="";for(const[t,i]of Object.entries(a)){d+=`

--- Specialist (${t}) Transcript ---
`;const o=i.length;let h=i;o>10&&(h=[...i.slice(0,2),{role:"system",text:`... [${o-8} messages omitted for brevity] ...`},...i.slice(o-6)]),h.forEach(p=>{d+=`${p.role.toUpperCase()}: ${p.text}
`,p.internalThoughts&&(d+=`[Internal Thoughts: ${p.internalThoughts}]
`),p.currentHypotheses&&p.currentHypotheses.length>0&&(d+=`[Active Hypotheses: ${p.currentHypotheses.join(", ")}]
`)})}const l=e.length>0?`

--- Patient Medical Records ---
${e.map(t=>`File: ${t.testName||t.filename}
Findings: ${t.keyFindings||(typeof t.findings=="string"?t.findings.substring(0,300)+"...":"Available")}`).join(`

`)}`:"",r={systemInstruction:{role:"system",parts:[{text:`You are an elite Medical AI orchestrating parallel diagnostic assessments.
The patient presented with: "${n}"

Below are the independent interview transcripts from several specialists who questioned the patient simultaneously, along with any uploaded medical records:
${d}${l}

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
}`}]},contents:[{role:"user",parts:[{text:"Generate final parallel report."}]}],generationConfig:{responseMimeType:"application/json"}};try{const t=new AbortController,i=setTimeout(()=>t.abort(),6e4),o=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r),signal:t.signal});if(clearTimeout(i),!o.ok)throw new Error(`API Error: ${o.status}`);const h=await o.json();if((c=h.candidates)!=null&&c[0]){const p=h.candidates[0].content.parts[0].text,g=p.match(/\{[\s\S]*\}/),f=g?g[0]:p.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(f)}}catch{return{executiveSummary:"Due to network instability, the multi-specialist synthesis could not be completed at this time.",urgency:"Routine",topDiagnoses:[],recommendedActionPlan:[],questionsForClinician:["Are there any alternative pathways we should explore while the system reconnects?"]}}}async function U(n){var e;const a={contents:[{parts:[{text:`You are a clinical dietician AI. Analyze this food entry and return a strictly valid JSON object with the nutritional breakdown.
Entry: "${n}"

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
}`}]}],generationConfig:{responseMimeType:"application/json"}};try{const d=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(!d.ok)throw new Error("API Error");const l=await d.json();if((e=l.candidates)!=null&&e[0]){const r=l.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return r?JSON.parse(r[0]):null}}catch{return null}}async function B(n){var e;const a={contents:[{parts:[{text:`You are a clinical dietician AI. Provide exactly 2 sentences of highly personalized clinical nutritional advice.
Conditions: ${(n.medicalConditions||[]).join(", ")||"None"}
Cuisine: ${n.cuisine||"Not specified"}
Goal: ${n.targetCalories||2e3} kcal/day

Rules:
1. Do not use quotes or introductory text. Just the 2 sentences.
2. Specifically mention their medical conditions and cuisine preference.
3. Be practical, actionable, and culturally relevant.`}]}]};try{const d=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(!d.ok)throw new Error("API Error");const l=await d.json();if((e=l.candidates)!=null&&e[0])return l.candidates[0].content.parts[0].text}catch{}return"Stay hydrated and focus on hitting your daily protein goals for optimal health."}async function D(n,a=7){var s,r,c;const e=T(),d=((r=(s=e==null?void 0:e.currentSummary)==null?void 0:s.topDiagnoses)==null?void 0:r.map(t=>t.condition).join(", "))||"None",l={contents:[{parts:[{text:`You are a clinical dietician AI. Generate a strictly valid JSON ${a}-day meal plan.
Conditions: ${(n.medicalConditions||[]).join(", ")||"None"}
Active Diagnoses: ${d}
Cuisine: ${n.cuisine||"Any"}
Target: ${n.targetCalories||2e3} kcal/day
Schedule: ${n.mealSchedule||"Standard 3 meals"}

Rules:
1. Output ONLY JSON.
2. Total daily calories should closely match their target (${n.targetCalories||2e3} kcal).
3. Cuisine: Strictly follow the '${n.cuisine}' cuisine preference. Generate authentic dishes.
4. Medical & Diagnosis: Strictly avoid foods contraindicated for '${(n.medicalConditions||[]).join(", ")}' AND their Active Diagnoses ('${d}'). Condition-tailored nutrition is CRITICAL.
5. Schedule: Strictly follow the '${n.mealSchedule}' meal schedule. If Intermittent Fasting, skip breakfast. If 5 small meals, add extra snacks.
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
}`}]}]};try{const t=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!t.ok)throw new Error("API Error");const i=await t.json();if((c=i.candidates)!=null&&c[0]){const h=i.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return h?JSON.parse(h[0]):null}}catch{return null}}async function z(n,a){var r,c,t,i;const e={age:(r=n==null?void 0:n.demographics)==null?void 0:r.age,gender:(c=n==null?void 0:n.demographics)==null?void 0:c.gender,conditions:(n==null?void 0:n.conditions)||((t=n==null?void 0:n.health)==null?void 0:t.conditions)||[],medications:((n==null?void 0:n.medications)||[]).map(o=>o.name),healthFocus:n==null?void 0:n.healthFocus},d=a.map(o=>({id:o.id,label:o.label})),s={contents:[{parts:[{text:`
You are a medical triage AI. Recommend 2 to 4 specialists to investigate this patient's case.

Patient: ${JSON.stringify(e)}
Specialists: ${JSON.stringify(d)}

Respond ONLY as JSON:
{
  "suggestedSpecialistIds": ["id1", "id2"],
  "professionalAdvice": "Based on your medical profile, we recommend a [Specialist 1] and [Specialist 2] to investigate your [condition/symptom]."
}
`}]}],generationConfig:{temperature:.2,response_mime_type:"application/json"}};try{const o=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(!o.ok)throw new Error("API Error");const h=await o.json();if((i=h.candidates)!=null&&i[0]){const g=h.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return g?JSON.parse(g[0]):null}}catch{return null}}async function G(n,a,e){var s,r,c,t;const l={contents:[{parts:[{text:`
You are the Chief Diagnostician AI for HealthChain.
Analyze the patient's symptoms, active clinical cases, and medical records to generate a Differential Diagnosis (DDx).

Patient Profile:
${JSON.stringify({age:(s=e==null?void 0:e.demographics)==null?void 0:s.age,gender:(r=e==null?void 0:e.demographics)==null?void 0:r.gender,conditions:((c=e==null?void 0:e.health)==null?void 0:c.conditions)||(e==null?void 0:e.medicalConditions)})}

Case Intake & Symptoms:
${JSON.stringify(n)}

Uploaded Medical Records:
${JSON.stringify(a.map(i=>({test:i.testName||i.filename,findings:i.keyFindings||(typeof i.findings=="string"?i.findings.substring(0,300)+"...":"Available"),abnormal:i.abnormalities})))}

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
`}]}],generationConfig:{temperature:.2,response_mime_type:"application/json"}};try{const i=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!i.ok)throw new Error("API Error");const o=await i.json();if((t=o.candidates)!=null&&t[0]){const p=o.candidates[0].content.parts[0].text.match(/\\[[\\s\\S]*\\]/);return p?JSON.parse(p[0]):null}}catch{return null}}async function W(n){var d;const e={contents:[{parts:[{text:`
You are an expert Clinical AI. Analyze this patient profile and generate a holistic health synthesis.
Patient Profile: ${JSON.stringify(n)}

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
`}]}],generationConfig:{temperature:.3,response_mime_type:"application/json"}};try{const l=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!l.ok)throw new Error("API Error");const s=await l.json();if((d=s.candidates)!=null&&d[0]){const c=s.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return c?JSON.parse(c[0]):null}}catch{return null}}async function V(n,a){var s;const e=a.map(r=>r.name).join(", "),l={contents:[{parts:[{text:`
You are a Clinical Pharmacist AI. Check for drug interactions between a newly added medication and the patient's current regimen.
New Medication: ${n}
Current Regimen: ${e||"None"}

Provide your response strictly as a JSON object with this exact format (no markdown, no backticks):
{
  "hasInteraction": true/false,
  "severity": "High" | "Moderate" | "Low" | "None",
  "description": "A 1-2 sentence clinical explanation of the interaction risk. If None, explain that it is safe."
}
`}]}],generationConfig:{temperature:.1,response_mime_type:"application/json"}};try{const r=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!r.ok)throw new Error("API Error");const c=await r.json();if((s=c.candidates)!=null&&s[0]){const i=c.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return i?JSON.parse(i[0]):null}}catch{return null}}async function X(n,a){var s,r,c,t;const e=a?`Patient Context: Age ${((s=a.personal)==null?void 0:s.age)||"unknown"}, Gender: ${((r=a.personal)==null?void 0:r.gender)||"unknown"}. Existing conditions: ${(((c=a.health)==null?void 0:c.conditions)||[]).join(", ")||"None"}.`:"",l={contents:[{parts:[{text:`You are an elite Clinical Pathway Simulator AI. 
The patient is considering this treatment action: "${n.step}"
${e}

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
}`}]}],generationConfig:{temperature:.2,response_mime_type:"application/json"}};try{const i=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!i.ok)throw new Error("API Error");const o=await i.json();if((t=o.candidates)!=null&&t[0]){const p=o.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return p?JSON.parse(p[0]):null}}catch{return null}}async function K(n,a,e){var s,r,c,t;if(!n||n.length===0)return[];const l={contents:[{parts:[{text:`You are a clinical trials matching algorithm.
I am providing you with a list of actively recruiting clinical trials and the patient's case data.

Patient Age: ${((s=e==null?void 0:e.demographics)==null?void 0:s.age)||"Unknown"}
Patient Gender: ${((r=e==null?void 0:e.demographics)==null?void 0:r.gender)||"Unknown"}
Case Symptoms/Data: ${((c=a==null?void 0:a.intakeData)==null?void 0:c.chiefComplaint)||"Unknown"}
Current Active Diagnoses/Hypotheses: ${JSON.stringify(((a==null?void 0:a.differentials)||[]).map(i=>i.condition))}

Trials to analyze:
${JSON.stringify(n)}

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
]`}]}],generationConfig:{temperature:.1,response_mime_type:"application/json"}};try{const i=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!i.ok)throw new Error("API Error");const o=await i.json();if((t=o.candidates)!=null&&t[0]){const p=o.candidates[0].content.parts[0].text.match(/\[[\s\S]*\]/),g=p?JSON.parse(p[0]):[];return n.map(f=>{const m=g.find(w=>w.id===f.id)||{};return{...f,matchScore:m.matchScore||Math.floor(Math.random()*20)+60,aiContext:m.aiContext||"Relevance based on your active clinical hypotheses."}})}}catch{}return n}async function Q(n,a,e){var s,r,c,t;if(!n||n.length===0)return[];const l={contents:[{parts:[{text:`You are a clinical research AI.
I am providing you with a list of recent medical papers (from PubMed/EuropePMC) and the patient's case data.

Patient Age: ${((s=e==null?void 0:e.demographics)==null?void 0:s.age)||"Unknown"}
Patient Gender: ${((r=e==null?void 0:e.demographics)==null?void 0:r.gender)||"Unknown"}
Case Symptoms/Data: ${((c=a==null?void 0:a.intakeData)==null?void 0:c.chiefComplaint)||"Unknown"}
Current Active Diagnoses/Hypotheses: ${JSON.stringify(((a==null?void 0:a.differentials)||[]).map(i=>i.condition))}

Papers to analyze:
${JSON.stringify(n.map(i=>({id:i.id,title:i.title,abstract:i.abstract})))}

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
]`}]}],generationConfig:{temperature:.1,response_mime_type:"application/json"}};try{const i=await y(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!i.ok)throw new Error("API Error");const o=await i.json();if((t=o.candidates)!=null&&t[0]){const p=o.candidates[0].content.parts[0].text.match(/\[[\s\S]*\]/),g=p?JSON.parse(p[0]):[];return n.map(f=>{const m=g.find(w=>w.id===f.id)||{};return{...f,matchScore:m.matchScore||Math.floor(Math.random()*20)+60,aiContext:m.aiContext||"This research paper investigates biological mechanisms relevant to your hypotheses."}})}}catch{}return n}export{U as analyzeFoodEntry,_ as analyzeLabReport,Q as analyzeLiteratureRelevance,K as analyzeTrialRelevance,j as chatWithGemini,L as chatWithMDTSpecialist,R as chatWithTherapyGemini,V as checkDrugInteractions,M as fetchMedicineData,B as generateDieticianAdvice,H as generateMDTReport,D as generateMealPlan,q as generateParallelMultiReport,W as generateProfileSynthesis,F as runDebateRound,G as runDifferentialAnalysis,Y as runMDTConference,J as selectMDTSpecialists,X as simulatePathway,z as suggestSpecialists};
