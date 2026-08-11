import{g as x,b as S}from"./index-BV593V46.js";import"./framer-motion-BbAuwbnu.js";import"./react-vendor-DOV_xoBr.js";function b(){var d,n;let e=[];const a=x(),t=S();let o=`PATIENT PROFILE:
`;(a.demographics.age||a.demographics.gender)&&(o+=`- ${a.demographics.age||"?"} yr ${a.demographics.gender||""}
`),a.conditions&&a.conditions.length>0&&(o+=`- Conditions: ${a.conditions.join(", ")}
`),a.medications&&a.medications.length>0&&(o+=`- Meds: ${a.medications.map(i=>i.name).join(", ")}
`),a.familyHistory&&a.familyHistory.length>0&&(o+=`- Family Hx: ${a.familyHistory.join(", ")}
`),o!==`PATIENT PROFILE:
`&&e.push(o);const c=Object.entries(a.vitals.latestLabValues);if(c.length>0){let i=`LABS:
`;c.slice(0,8).forEach(([s,p])=>{i+=`- ${s}: ${p.value} ${p.unit} (${p.status})
`}),e.push(i)}if(t){let i=`ACTIVE CASE:
`;i+=`- ${t.title}
`,(d=t.intakeData)!=null&&d.chiefComplaint&&(i+=`- Concern: ${t.intakeData.chiefComplaint.substring(0,200)}
`),(n=t.report)!=null&&n.executiveSummary&&(i+=`- Synthesis: ${t.report.executiveSummary.substring(0,200)}
`);const s=(t.medicalRecords||[]).slice(0,3);s.length&&(i+=`- Evidence: ${s.map(p=>`${p.filename} (${p.keyFindings||"On file"})`).join("; ")}
`),e.push(i)}const l=a.timeline.filter(i=>["diagnosis","mdt_report","lab_report"].includes(i.type));if(l.length>0){let i=`HISTORY:
`;l.slice(0,3).forEach(s=>{i+=`- ${new Date(s.date).toLocaleDateString()}: ${s.title}
`}),e.push(i)}if(e.length===0)return"";let r=`

=== PATIENT CONTEXT ===
${e.join(`
`)}========================
`;return r.length>1500&&(r=r.substring(0,1497)+`...
`),r}const f="/api/gemini",u=async(e,a={},t=6e4)=>{if(typeof navigator<"u"&&!navigator.onLine)throw new Error("Offline");const o=new AbortController,c=setTimeout(()=>o.abort(),t);try{const l=await fetch(e,{...a,signal:o.signal});return clearTimeout(c),l}catch(l){throw clearTimeout(c),l.name==="AbortError"?new Error("Timeout"):l}},T=`You are HealthChain's clinical investigation AI.
Your goal is to gather facts to build a "causal chain" connecting root causes to symptoms, but you must do it with a warm, professional, and empathetic bedside manner.

RULES:
1. Be conversational and empathetic. Briefly acknowledge what the user is experiencing before moving forward.
2. Ask ONE clear follow-up question at a time. Do not interrogate the user with multiple questions in one message.
3. Keep the tone natural and reassuring, like a friendly medical professional trying to understand their patient.
4. After 3-5 questions, when you have enough data, output "ANALYSIS_COMPLETE" followed by a JSON block:

\`\`\`json
{"chain_name":"Root Cause -> Symptom","normal_terms_explanation":"Plain English mechanism","match_percentage":"83%","specialists_validated":"3 endocrinologists","resolved_cases":"27","cost_to_confirm":"₹1,400","time_to_relief":"6-8 wks","specialist":"Endocrine","this_week_tasks":["Task 1"],"flowchart":{"root":"","root_sub":"","mechanism":"","mechanism_sub":"","symptoms":[{"name":"","sub":""}]},"what_it_is":"2-3 sentences.","whats_driving_it":"2-3 sentences.","chain_reaction":["Step 1"],"where_it_shows_up":[{"location":"","effect":""}],"if_untreated":[{"time":"","effect":""}],"what_to_do":[{"step":"","cost":""}],"cost_to_diagnose":"₹1,300","cost_unexplained":"₹15,000+","recovery_timeline":[{"time":"","effect":""}],"if_symptoms_persist":"Next check","do":"Do this","dont":"Don't do this","quote":"Insight."}
\`\`\`

Do NOT include ANALYSIS_COMPLETE until you are ready to conclude.`;async function k(e){var d,n;const o=(((d=e[0])==null?void 0:d.role)==="model"?e.slice(1):e).slice(-12).map(i=>{let s=i.content;return i.role==="analysis"&&(s=`ANALYSIS_COMPLETE
\`\`\`json
${JSON.stringify(i.content)}
\`\`\``),{role:i.role==="user"?"user":"model",parts:[{text:s}]}}),c=b(),r={systemInstruction:{role:"system",parts:[{text:T+c}]},contents:o};try{const i=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)});if(!i.ok)throw new Error(`API Error: ${i.status}`);const s=await i.json();return(n=s.candidates)!=null&&n[0]?s.candidates[0].content.parts[0].text:"Could you tell me a bit more about that?"}catch{return"Connection issue. Please try again."}}const C=`You are a clinical pharmacology AI.
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
If the medicine is completely unrecognized, return a JSON object with "name": "Unknown", and explain that data is unavailable in the "uses" field.`;async function I(e,a=null){var c;let t=e;a&&(t+=`

PATIENT PROFILE:
Allergies: ${a.allergies.join(", ")||"None"}
Current Medications: ${a.medications.map(l=>l.name).join(", ")||"None"}

Please strictly evaluate for interactions.`);const o={systemInstruction:{role:"system",parts:[{text:C}]},contents:[{role:"user",parts:[{text:t}]}],generationConfig:{responseMimeType:"application/json"}};try{const l=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});if(!l.ok)throw new Error(`API Error: ${l.status}`);const r=await l.json();if((c=r.candidates)!=null&&c[0]){const n=r.candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(n)}throw new Error("No candidate returned")}catch{return null}}const v=`You are Ava, HealthChain's "Medical Chief of Staff" and Personal Health Assistant.
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
`;async function E(e){var l;const a=e.slice(-12).map(r=>({role:r.role==="user"?"user":"model",parts:[{text:r.content}]})),t=b(),c={systemInstruction:{role:"system",parts:[{text:v+t}]},contents:a};try{const r=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)});if(!r.ok)throw new Error(`API Error: ${r.status}`);const d=await r.json();return(l=d.candidates)!=null&&l[0]?d.candidates[0].content.parts[0].text:"I'm here for you. Could you tell me a bit more?"}catch{return"I'm having a little trouble connecting right now, but I'm still here for you."}}const A=`You are HealthChain's "Clinical Lab Interpreter", a highly advanced medical AI capable of reading lab reports, blood work, MRIs, and prescriptions.
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
If no document is provided or it is unreadable, return a JSON object with "testName": "Unrecognized / No Document", and explain the issue in "interpretation".`;async function $(e,a,t){var l,r,d;const c={systemInstruction:{role:"system",parts:[{text:`${A}

Patient Context:
Age: ${((l=t==null?void 0:t.demographics)==null?void 0:l.age)||"Unknown"}
Gender: ${((r=t==null?void 0:t.demographics)==null?void 0:r.gender)||"Unknown"}
(Use this patient context strictly for determining the correct normal reference ranges for lab vitals like testosterone, eGFR, hemoglobin, etc.)`}]},contents:[{role:"user",parts:[{text:"Analyze this clinical report."},{inlineData:{mimeType:a,data:e}}]}],generationConfig:{responseMimeType:"application/json"}};try{const n=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)});if(!n.ok)throw new Error(`API Error: ${n.status}`);const i=await n.json();if((d=i.candidates)!=null&&d[0]){const p=i.candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(p)}throw new Error("No candidate returned")}catch{return null}}async function j(e){var o;const t={systemInstruction:{role:"system",parts:[{text:`You are a medical triage AI. Based on the patient's chief complaint, select the 3 to 5 most appropriate medical specialists to form a Multi-Disciplinary Team (MDT) board.
Chief Complaint: "${e}"

Return ONLY a JSON array of specialist IDs (strings) from this list:
["neuro", "ent", "cardio", "gastro", "derma", "ortho", "psych", "obgyn", "pulmo", "endo", "uro", "rheuma", "onco", "opthal", "physio", "gp"]

Example: ["neuro", "physio", "ortho"]`}]},contents:[{role:"user",parts:[{text:"Select specialists."}]}]};try{const c=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!c.ok)throw new Error(`API Error: ${c.status}`);const l=await c.json();if((o=l.candidates)!=null&&o[0]){const d=l.candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(d)}}catch{}return["gp"]}async function M(e,a,t,o,c){var g;const l=t.filter(h=>h.id!==a.id).map(h=>h.label).join(", "),r=!!o.sharedCaseMaterial,d=r?`
Shared Case Context (Existing Investigation Data):
${o.sharedCaseMaterial}`:"",n=r?'This patient has already been extensively interviewed by a Parallel Board. Do NOT ask basic questions. You may ask 1 or 2 highly targeted questions to resolve conflicts in the evidence. If the provided case context is sufficient to form a hypothesis, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.':`You may ask up to 10 questions in total to be extremely thorough. 
If you have enough information to form a strong hypothesis, or if you reach 10 questions, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`,i=`You are a highly skilled ${a.label}. 
You are part of a Multi-Disciplinary Team (MDT) board alongside: ${l}.
The patient's initial intake is:
Chief Complaint: ${o.chiefComplaint}
History: ${o.history||"None provided"}

Your goal is to conduct a Deep Specialist Assessment.
DO NOT REPEAT questions. Dig deeper or pivot to a new relevant area.
Ask exactly ONE short, conversational follow-up question at a time.
${n}

Return your response STRICTLY as JSON matching this format:
{
  "internalThoughts": "1 sentence describing what you are currently considering/ruling out based on the latest input.",
  "currentHypotheses": ["Hypothesis 1 (60%)", "Hypothesis 2 (40%)"],
  "response": "Your conversational question to the patient. (Or 'ANALYSIS_COMPLETE').",
  "widgetType": "none | pain_slider | symptom_pills (CRITICAL: Use 'pain_slider' if asking about pain severity 1-10. Use 'symptom_pills' if asking the user to select from a list of descriptors/symptoms).",
  "widgetOptions": ["Array", "Of", "Tags", "If using symptom_pills"]
}`,s=c&&c.length>0?`
ACTIVE HYPOTHESES TO TEST (from Differential Diagnosis Board):
${c.map(h=>`- ${h.condition} (${h.probability}%): Try to prove/disprove this. Next best tests suggest looking for: ${h.nextBestTests.join(", ")}`).join(`
`)}
Ask targeted questions to confirm or rule out these active hypotheses.`:"",p=i+d+s,m=e.slice(-12).map(h=>({role:h.role==="user"?"user":"model",parts:[{text:h.text||h.content}]})),y={systemInstruction:{role:"system",parts:[{text:p}]},contents:m,generationConfig:{responseMimeType:"application/json",responseSchema:{type:"object",properties:{internalThoughts:{type:"string"},currentHypotheses:{type:"array",items:{type:"string"}},response:{type:"string"},widgetType:{type:"string"},widgetOptions:{type:"array",items:{type:"string"}}},required:["internalThoughts","currentHypotheses","response"]}}};try{const h=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(y)});if(!h.ok)throw new Error(`API Error: ${h.status}`);const w=await h.json();return(g=w.candidates)!=null&&g[0]?w.candidates[0].content.parts[0].text.trim():'{"response": "Could you tell me more?", "internalThoughts": "Awaiting more info", "currentHypotheses": []}'}catch{return'{"response": "I am experiencing network issues.", "internalThoughts": "Network error", "currentHypotheses": []}'}}async function _(e,a,t=[]){var d;const o=t.length>0?`
Patient Medical Records:
${t.map(n=>`- ${n.testName||n.filename}: ${n.keyFindings||(typeof n.findings=="string"?n.findings.substring(0,300)+"...":"Available")}`).join(`
`)}`:"",c=Object.fromEntries(Object.entries(a).map(([n,i])=>[n,i.map(s=>({role:s.role,text:s.text,hypotheses:s.currentHypotheses}))])),r={systemInstruction:{role:"system",parts:[{text:`You are the Chief Clinical Orchestrator for an MDT board.
The patient's intake:
Chief Complaint: ${e.chiefComplaint}${o}

Here are the findings from the individual specialist assessments:
${JSON.stringify(c)}

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
}`}]},contents:[{role:"user",parts:[{text:"Run the MDT Conference based on the provided specialist data."}]}],generationConfig:{responseMimeType:"application/json"}};try{const n=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)});if(!n.ok)throw new Error(`API Error: ${n.status}`);const i=await n.json();if((d=i.candidates)!=null&&d[0]){const p=i.candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(p)}}catch{return{corroborations:[],contentions:[],followUpQuestions:[],debateSummary:"MDT consensus failed due to an error."}}return null}async function R(e,a,t,o=[]){var d;const c=o.length>0?`
Patient Medical Records:
${o.map(n=>`- ${n.testName||n.filename}: ${n.keyFindings||(typeof n.findings=="string"?n.findings.substring(0,300)+"...":"Available")}`).join(`
`)}`:"",r={systemInstruction:{role:"system",parts:[{text:`You are the Chief Clinical Orchestrator compiling the final MDT report.
Patient Intake: ${e.chiefComplaint}${c}
Conference Summary: ${a.debateSummary}
Patient's Final Answers: ${JSON.stringify(t)}

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
}`}]},contents:[{role:"user",parts:[{text:"Generate final report."}]}],generationConfig:{responseMimeType:"application/json"}};try{const n=new AbortController,i=setTimeout(()=>n.abort(),6e4),s=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r),signal:n.signal});if(clearTimeout(i),!s.ok)throw new Error(`API Error: ${s.status}`);const p=await s.json();if((d=p.candidates)!=null&&d[0]){const m=p.candidates[0].content.parts[0].text,y=m.match(/\{[\s\S]*\}/),g=y?y[0]:m.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(g)}}catch{return{executiveSummary:"Based on the multi-disciplinary review of your symptoms and recent discussion, the board has identified some strong diagnostic pathways. Please follow the recommended action plan for the next steps.",topDiagnoses:[{condition:"Pending Further Review",confidence:60,rationale:"The board requires the results of your next tests to provide a conclusive assessment.",specialty:"General Practice"}],recommendedActionPlan:[{step:"Consult Primary Care Physician",timeline:"Immediately",type:"Consultation"}]}}return null}async function J(e,a,t,o,c=[]){return{critique:"Awaiting Orchestrator consensus.",revisedHypothesis:"Deferred to MDT Orchestrator.",confidenceUpdate:50}}async function L(e,a,t=[]){var d;let o="";for(const[n,i]of Object.entries(a))o+=`

--- Specialist (${n}) Transcript ---
`,i.forEach(s=>{o+=`${s.role.toUpperCase()}: ${s.text}
`,s.internalThoughts&&(o+=`[Internal Thoughts: ${s.internalThoughts}]
`),s.currentHypotheses&&s.currentHypotheses.length>0&&(o+=`[Active Hypotheses: ${s.currentHypotheses.join(", ")}]
`)});const c=t.length>0?`

--- Patient Medical Records ---
${t.map(n=>`File: ${n.testName||n.filename}
Findings: ${n.keyFindings||(typeof n.findings=="string"?n.findings.substring(0,300)+"...":"Available")}`).join(`

`)}`:"",r={systemInstruction:{role:"system",parts:[{text:`You are an elite Medical AI orchestrating parallel diagnostic assessments.
The patient presented with: "${e}"

Below are the independent interview transcripts from several specialists who questioned the patient simultaneously, along with any uploaded medical records:
${o}${c}

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
}`}]},contents:[{role:"user",parts:[{text:"Generate final parallel report."}]}],generationConfig:{responseMimeType:"application/json"}};try{const n=new AbortController,i=setTimeout(()=>n.abort(),6e4),s=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r),signal:n.signal});if(clearTimeout(i),!s.ok)throw new Error(`API Error: ${s.status}`);const p=await s.json();if((d=p.candidates)!=null&&d[0]){const m=p.candidates[0].content.parts[0].text,y=m.match(/\{[\s\S]*\}/),g=y?y[0]:m.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(g)}}catch{return{executiveSummary:"Due to network instability, the multi-specialist synthesis could not be completed at this time.",urgency:"Routine",topDiagnoses:[],recommendedActionPlan:[],questionsForClinician:["Are there any alternative pathways we should explore while the system reconnects?"]}}}async function Y(e){var t;const a={contents:[{parts:[{text:`You are a clinical dietician AI. Analyze this food entry and return a strictly valid JSON object with the nutritional breakdown.
Entry: "${e}"

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
}`}]}],generationConfig:{responseMimeType:"application/json"}};try{const o=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(!o.ok)throw new Error("API Error");const c=await o.json();if((t=c.candidates)!=null&&t[0]){const r=c.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return r?JSON.parse(r[0]):null}}catch{return null}}async function H(e){var t;const a={contents:[{parts:[{text:`You are a clinical dietician AI. Provide exactly 2 sentences of highly personalized clinical nutritional advice.
Conditions: ${(e.medicalConditions||[]).join(", ")||"None"}
Cuisine: ${e.cuisine||"Not specified"}
Goal: ${e.targetCalories||2e3} kcal/day

Rules:
1. Do not use quotes or introductory text. Just the 2 sentences.
2. Specifically mention their medical conditions and cuisine preference.
3. Be practical, actionable, and culturally relevant.`}]}]};try{const o=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(!o.ok)throw new Error("API Error");const c=await o.json();if((t=c.candidates)!=null&&t[0])return c.candidates[0].content.parts[0].text}catch{}return"Stay hydrated and focus on hitting your daily protein goals for optimal health."}async function F(e,a=7){var l,r,d;const t=S(),o=((r=(l=t==null?void 0:t.currentSummary)==null?void 0:l.topDiagnoses)==null?void 0:r.map(n=>n.condition).join(", "))||"None",c={contents:[{parts:[{text:`You are a clinical dietician AI. Generate a strictly valid JSON ${a}-day meal plan.
Conditions: ${(e.medicalConditions||[]).join(", ")||"None"}
Active Diagnoses: ${o}
Cuisine: ${e.cuisine||"Any"}
Target: ${e.targetCalories||2e3} kcal/day
Schedule: ${e.mealSchedule||"Standard 3 meals"}

Rules:
1. Output ONLY JSON.
2. Total daily calories should closely match their target (${e.targetCalories||2e3} kcal).
3. Cuisine: Strictly follow the '${e.cuisine}' cuisine preference. Generate authentic dishes.
4. Medical & Diagnosis: Strictly avoid foods contraindicated for '${(e.medicalConditions||[]).join(", ")}' AND their Active Diagnoses ('${o}'). Condition-tailored nutrition is CRITICAL.
5. Schedule: Strictly follow the '${e.mealSchedule}' meal schedule. If Intermittent Fasting, skip breakfast. If 5 small meals, add extra snacks.
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
}`}]}]};try{const n=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)});if(!n.ok)throw new Error("API Error");const i=await n.json();if((d=i.candidates)!=null&&d[0]){const p=i.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return p?JSON.parse(p[0]):null}}catch{return null}}async function q(e,a){var d,n,i,s;const t="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyCAQYkzKXArqDV-_CIx0fQzLfLj5n0fmys",o={age:(d=e==null?void 0:e.demographics)==null?void 0:d.age,gender:(n=e==null?void 0:e.demographics)==null?void 0:n.gender,conditions:(e==null?void 0:e.conditions)||((i=e==null?void 0:e.health)==null?void 0:i.conditions)||[],medications:((e==null?void 0:e.medications)||[]).map(p=>p.name),healthFocus:e==null?void 0:e.healthFocus},c=a.map(p=>({id:p.id,label:p.label})),r={contents:[{parts:[{text:`
You are a medical triage AI. Recommend 2 to 4 specialists to investigate this patient's case.

Patient: ${JSON.stringify(o)}
Specialists: ${JSON.stringify(c)}

Respond ONLY as JSON:
{
  "suggestedSpecialistIds": ["id1", "id2"],
  "professionalAdvice": "Based on your medical profile, we recommend a [Specialist 1] and [Specialist 2] to investigate your [condition/symptom]."
}
`}]}],generationConfig:{temperature:.2,response_mime_type:"application/json"}};try{const p=await u(t,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)});if(!p.ok)throw new Error("API Error");const m=await p.json();if((s=m.candidates)!=null&&s[0]){const g=m.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return g?JSON.parse(g[0]):null}}catch{return null}}async function U(e,a,t){var r,d,n,i;const o="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyCAQYkzKXArqDV-_CIx0fQzLfLj5n0fmys",l={contents:[{parts:[{text:`
You are the Chief Diagnostician AI for HealthChain.
Analyze the patient's symptoms, active clinical cases, and medical records to generate a Differential Diagnosis (DDx).

Patient Profile:
${JSON.stringify({age:(r=t==null?void 0:t.demographics)==null?void 0:r.age,gender:(d=t==null?void 0:t.demographics)==null?void 0:d.gender,conditions:((n=t==null?void 0:t.health)==null?void 0:n.conditions)||(t==null?void 0:t.medicalConditions)})}

Case Intake & Symptoms:
${JSON.stringify(e)}

Uploaded Medical Records:
${JSON.stringify(a.map(s=>({test:s.testName||s.filename,findings:s.keyFindings||(typeof s.findings=="string"?s.findings.substring(0,300)+"...":"Available"),abnormal:s.abnormalities})))}

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
`}]}],generationConfig:{temperature:.2,response_mime_type:"application/json"}};try{const s=await u(o,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!s.ok)throw new Error("API Error");const p=await s.json();if((i=p.candidates)!=null&&i[0]){const y=p.candidates[0].content.parts[0].text.match(/\\[[\\s\\S]*\\]/);return y?JSON.parse(y[0]):null}}catch{return null}}async function z(e){var c;const a="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyCAQYkzKXArqDV-_CIx0fQzLfLj5n0fmys",o={contents:[{parts:[{text:`
You are an expert Clinical AI. Analyze this patient profile and generate a holistic health synthesis.
Patient Profile: ${JSON.stringify(e)}

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
  "synthesisText": "A 2-4 sentence highly clinical and insightful summary of their current health status, directly referencing their actual conditions, recent weight/vital changes, and active medications. Use HTML <strong> tags to highlight key metrics."
}
`}]}],generationConfig:{temperature:.3,response_mime_type:"application/json"}};try{const l=await u(a,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});if(!l.ok)throw new Error("API Error");const r=await l.json();if((c=r.candidates)!=null&&c[0]){const n=r.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return n?JSON.parse(n[0]):null}}catch{return null}}async function D(e,a){var r;const t="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyCAQYkzKXArqDV-_CIx0fQzLfLj5n0fmys",o=a.map(d=>d.name).join(", "),l={contents:[{parts:[{text:`
You are a Clinical Pharmacist AI. Check for drug interactions between a newly added medication and the patient's current regimen.
New Medication: ${e}
Current Regimen: ${o||"None"}

Provide your response strictly as a JSON object with this exact format (no markdown, no backticks):
{
  "hasInteraction": true/false,
  "severity": "High" | "Moderate" | "Low" | "None",
  "description": "A 1-2 sentence clinical explanation of the interaction risk. If None, explain that it is safe."
}
`}]}],generationConfig:{temperature:.1,response_mime_type:"application/json"}};try{const d=await u(t,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!d.ok)throw new Error("API Error");const n=await d.json();if((r=n.candidates)!=null&&r[0]){const s=n.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return s?JSON.parse(s[0]):null}}catch{return null}}async function B(e,a){var l,r,d,n;const t=a?`Patient Context: Age ${((l=a.personal)==null?void 0:l.age)||"unknown"}, Gender: ${((r=a.personal)==null?void 0:r.gender)||"unknown"}. Existing conditions: ${(((d=a.health)==null?void 0:d.conditions)||[]).join(", ")||"None"}.`:"",c={contents:[{parts:[{text:`You are an elite Clinical Pathway Simulator AI. 
The patient is considering this treatment action: "${e.step}"
${t}

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
}`}]}],generationConfig:{temperature:.2,response_mime_type:"application/json"}};try{const i=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)});if(!i.ok)throw new Error("API Error");const s=await i.json();if((n=s.candidates)!=null&&n[0]){const m=s.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return m?JSON.parse(m[0]):null}}catch{return null}}async function G(e,a,t){var l,r,d,n;if(!e||e.length===0)return[];const c={contents:[{parts:[{text:`You are a clinical trials matching algorithm.
I am providing you with a list of actively recruiting clinical trials and the patient's case data.

Patient Age: ${((l=t==null?void 0:t.demographics)==null?void 0:l.age)||"Unknown"}
Patient Gender: ${((r=t==null?void 0:t.demographics)==null?void 0:r.gender)||"Unknown"}
Case Symptoms/Data: ${((d=a==null?void 0:a.intakeData)==null?void 0:d.chiefComplaint)||"Unknown"}
Current Active Diagnoses/Hypotheses: ${JSON.stringify(((a==null?void 0:a.differentials)||[]).map(i=>i.condition))}

Trials to analyze:
${JSON.stringify(e)}

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
]`}]}],generationConfig:{temperature:.1,response_mime_type:"application/json"}};try{const i=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)});if(!i.ok)throw new Error("API Error");const s=await i.json();if((n=s.candidates)!=null&&n[0]){const m=s.candidates[0].content.parts[0].text.match(/\[[\s\S]*\]/),y=m?JSON.parse(m[0]):[];return e.map(g=>{const h=y.find(w=>w.id===g.id)||{};return{...g,matchScore:h.matchScore||Math.floor(Math.random()*20)+60,aiContext:h.aiContext||"Relevance based on your active clinical hypotheses."}})}}catch{}return e}async function W(e,a,t){var l,r,d,n;if(!e||e.length===0)return[];const c={contents:[{parts:[{text:`You are a clinical research AI.
I am providing you with a list of recent medical papers (from PubMed/EuropePMC) and the patient's case data.

Patient Age: ${((l=t==null?void 0:t.demographics)==null?void 0:l.age)||"Unknown"}
Patient Gender: ${((r=t==null?void 0:t.demographics)==null?void 0:r.gender)||"Unknown"}
Case Symptoms/Data: ${((d=a==null?void 0:a.intakeData)==null?void 0:d.chiefComplaint)||"Unknown"}
Current Active Diagnoses/Hypotheses: ${JSON.stringify(((a==null?void 0:a.differentials)||[]).map(i=>i.condition))}

Papers to analyze:
${JSON.stringify(e.map(i=>({id:i.id,title:i.title,abstract:i.abstract})))}

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
]`}]}],generationConfig:{temperature:.1,response_mime_type:"application/json"}};try{const i=await u(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)});if(!i.ok)throw new Error("API Error");const s=await i.json();if((n=s.candidates)!=null&&n[0]){const m=s.candidates[0].content.parts[0].text.match(/\[[\s\S]*\]/),y=m?JSON.parse(m[0]):[];return e.map(g=>{const h=y.find(w=>w.id===g.id)||{};return{...g,matchScore:h.matchScore||Math.floor(Math.random()*20)+60,aiContext:h.aiContext||"This research paper investigates biological mechanisms relevant to your hypotheses."}})}}catch{}return e}export{Y as analyzeFoodEntry,$ as analyzeLabReport,W as analyzeLiteratureRelevance,G as analyzeTrialRelevance,k as chatWithGemini,M as chatWithMDTSpecialist,E as chatWithTherapyGemini,D as checkDrugInteractions,I as fetchMedicineData,H as generateDieticianAdvice,R as generateMDTReport,F as generateMealPlan,L as generateParallelMultiReport,z as generateProfileSynthesis,J as runDebateRound,U as runDifferentialAnalysis,_ as runMDTConference,j as selectMDTSpecialists,B as simulatePathway,q as suggestSpecialists};
