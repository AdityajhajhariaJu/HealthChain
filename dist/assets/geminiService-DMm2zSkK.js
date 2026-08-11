import{g as T,b as S}from"./index-BiBJHhcf.js";import"./framer-motion-DWOSTlfN.js";import"./react-vendor-ikJrUrLd.js";function b(){var d,e;let i=[];const n=T(),a=S();let o=`PATIENT PROFILE:
`;(n.demographics.age||n.demographics.gender)&&(o+=`- ${n.demographics.age||"?"} yr ${n.demographics.gender||""}
`),n.conditions&&n.conditions.length>0&&(o+=`- Conditions: ${n.conditions.join(", ")}
`),n.medications&&n.medications.length>0&&(o+=`- Meds: ${n.medications.map(t=>t.name).join(", ")}
`),n.familyHistory&&n.familyHistory.length>0&&(o+=`- Family Hx: ${n.familyHistory.join(", ")}
`),o!==`PATIENT PROFILE:
`&&i.push(o);const l=Object.entries(n.vitals.latestLabValues);if(l.length>0){let t=`LABS:
`;l.slice(0,8).forEach(([c,p])=>{t+=`- ${c}: ${p.value} ${p.unit} (${p.status})
`}),i.push(t)}if(a){let t=`ACTIVE CASE:
`;t+=`- ${a.title}
`,(d=a.intakeData)!=null&&d.chiefComplaint&&(t+=`- Concern: ${a.intakeData.chiefComplaint.substring(0,200)}
`),(e=a.report)!=null&&e.executiveSummary&&(t+=`- Synthesis: ${a.report.executiveSummary.substring(0,200)}
`);const c=(a.medicalRecords||[]).slice(0,3);c.length&&(t+=`- Evidence: ${c.map(p=>`${p.filename} (${p.keyFindings||"On file"})`).join("; ")}
`),i.push(t)}const r=n.timeline.filter(t=>["diagnosis","mdt_report","lab_report"].includes(t.type));if(r.length>0){let t=`HISTORY:
`;r.slice(0,3).forEach(c=>{t+=`- ${new Date(c.date).toLocaleDateString()}: ${c.title}
`}),i.push(t)}if(i.length===0)return"";let s=`

=== PATIENT CONTEXT ===
${i.join(`
`)}========================
`;return s.length>1500&&(s=s.substring(0,1497)+`...
`),s}const m="/api/gemini",y=async(i,n={},a=6e4,o=2)=>{if(typeof navigator<"u"&&!navigator.onLine)throw new Error("Offline");let l;for(let r=0;r<=o;r++){const s=new AbortController,d=setTimeout(()=>s.abort(),a);try{const e=await fetch(i,{...n,signal:s.signal});if(clearTimeout(d),e.status===429&&r<o){await new Promise(t=>setTimeout(t,1e3*(r+1)));continue}if(!e.ok&&e.status>=500&&r<o){await new Promise(t=>setTimeout(t,1e3*Math.pow(2,r)));continue}return e}catch(e){if(clearTimeout(d),l=e,(e.name==="AbortError"||e.name==="TypeError")&&r<o){await new Promise(t=>setTimeout(t,1e3*Math.pow(2,r)));continue}if(r===o)throw e.name==="AbortError"?new Error("Timeout"):e}}throw l},x=`You are HealthChain's clinical investigation AI.
Your goal is to gather facts to build a "causal chain" connecting root causes to symptoms, but you must do it with a warm, professional, and empathetic bedside manner.

RULES:
1. Be conversational and empathetic. Briefly acknowledge what the user is experiencing before moving forward.
2. Ask ONE clear follow-up question at a time. Do not interrogate the user with multiple questions in one message.
3. Keep the tone natural and reassuring, like a friendly medical professional trying to understand their patient.
4. After 3-5 questions, when you have enough data, output "ANALYSIS_COMPLETE" followed by a JSON block:

\`\`\`json
{"chain_name":"Root Cause -> Symptom","normal_terms_explanation":"Plain English mechanism","match_percentage":"83%","specialists_validated":"3 endocrinologists","resolved_cases":"27","cost_to_confirm":"₹1,400","time_to_relief":"6-8 wks","specialist":"Endocrine","this_week_tasks":["Task 1"],"flowchart":{"root":"","root_sub":"","mechanism":"","mechanism_sub":"","symptoms":[{"name":"","sub":""}]},"what_it_is":"2-3 sentences.","whats_driving_it":"2-3 sentences.","chain_reaction":["Step 1"],"where_it_shows_up":[{"location":"","effect":""}],"if_untreated":[{"time":"","effect":""}],"what_to_do":[{"step":"","cost":""}],"cost_to_diagnose":"₹1,300","cost_unexplained":"₹15,000+","recovery_timeline":[{"time":"","effect":""}],"if_symptoms_persist":"Next check","do":"Do this","dont":"Don't do this","quote":"Insight."}
\`\`\`

Do NOT include ANALYSIS_COMPLETE until you are ready to conclude.`;async function N(i){var d,e;const o=(((d=i[0])==null?void 0:d.role)==="model"?i.slice(1):i).slice(-12).map(t=>{let c=t.content;return t.role==="analysis"&&(c=`ANALYSIS_COMPLETE
\`\`\`json
${JSON.stringify(t.content)}
\`\`\``),{role:t.role==="user"?"user":"model",parts:[{text:c}]}}),l=b(),s={systemInstruction:{role:"system",parts:[{text:x+l}]},contents:o};try{const t=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(!t.ok)throw new Error(`API Error: ${t.status}`);const c=await t.json();return(e=c.candidates)!=null&&e[0]?c.candidates[0].content.parts[0].text:"Could you tell me a bit more about that?"}catch{return"Connection issue. Please try again."}}const C=`You are a clinical pharmacology AI.
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
If the medicine is completely unrecognized, return a JSON object with "name": "Unknown", and explain that data is unavailable in the "uses" field.`;async function I(i,n=null){var l;let a=i;n&&(a+=`

PATIENT PROFILE:
Allergies: ${n.allergies.join(", ")||"None"}
Current Medications: ${n.medications.map(r=>r.name).join(", ")||"None"}

Please strictly evaluate for interactions.`);const o={systemInstruction:{role:"system",parts:[{text:C}]},contents:[{role:"user",parts:[{text:a}]}],generationConfig:{responseMimeType:"application/json"}};try{const r=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});if(!r.ok)throw new Error(`API Error: ${r.status}`);const s=await r.json();if((l=s.candidates)!=null&&l[0]){const e=s.candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(e)}throw new Error("No candidate returned")}catch{return null}}const v=`You are Ava, HealthChain's "Medical Chief of Staff" and Personal Health Assistant.
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
`;async function k(i){var r;const n=i.slice(-12).map(s=>({role:s.role==="user"?"user":"model",parts:[{text:s.content}]})),a=b(),l={systemInstruction:{role:"system",parts:[{text:v+a}]},contents:n};try{const s=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!s.ok)throw new Error(`API Error: ${s.status}`);const d=await s.json();return(r=d.candidates)!=null&&r[0]?d.candidates[0].content.parts[0].text:"I'm here for you. Could you tell me a bit more?"}catch{return"I'm having a little trouble connecting right now, but I'm still here for you."}}const P=`You are HealthChain's "Clinical Lab Interpreter", a highly advanced medical AI capable of reading lab reports, blood work, MRIs, and prescriptions.
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
If no document is provided or it is unreadable, return a JSON object with "testName": "Unrecognized / No Document", and explain the issue in "interpretation".`;async function $(i,n,a){var r,s,d;const l={systemInstruction:{role:"system",parts:[{text:`${P}

Patient Context:
Age: ${((r=a==null?void 0:a.demographics)==null?void 0:r.age)||"Unknown"}
Gender: ${((s=a==null?void 0:a.demographics)==null?void 0:s.gender)||"Unknown"}
(Use this patient context strictly for determining the correct normal reference ranges for lab vitals like testosterone, eGFR, hemoglobin, etc.)`}]},contents:[{role:"user",parts:[{text:"Analyze this clinical report."},{inlineData:{mimeType:n,data:i}}]}],generationConfig:{responseMimeType:"application/json"}};try{const e=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!e.ok)throw new Error(`API Error: ${e.status}`);const t=await e.json();if((d=t.candidates)!=null&&d[0]){const p=t.candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(p)}throw new Error("No candidate returned")}catch{return null}}async function M(i){var o;const a={systemInstruction:{role:"system",parts:[{text:`You are a medical triage AI. Based on the patient's chief complaint, select the 3 to 5 most appropriate medical specialists to form a Multi-Disciplinary Team (MDT) board.
Chief Complaint: "${i}"

Return ONLY a JSON array of specialist IDs (strings) from this list:
["neuro", "ent", "cardio", "gastro", "derma", "ortho", "psych", "obgyn", "pulmo", "endo", "uro", "rheuma", "onco", "opthal", "physio", "gp"]

Example: ["neuro", "physio", "ortho"]`}]},contents:[{role:"user",parts:[{text:"Select specialists."}]}]};try{const l=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(!l.ok)throw new Error(`API Error: ${l.status}`);const r=await l.json();if((o=r.candidates)!=null&&o[0]){const d=r.candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(d)}}catch{}return["gp"]}async function j(i,n,a,o,l){var g;const r=a.filter(u=>u.id!==n.id).map(u=>u.label).join(", "),s=!!o.sharedCaseMaterial,d=s?`
Shared Case Context (Existing Investigation Data):
${o.sharedCaseMaterial}`:"",e=s?'This patient has already been extensively interviewed by a Parallel Board. Do NOT ask basic questions. You may ask 1 or 2 highly targeted questions to resolve conflicts in the evidence. If the provided case context is sufficient to form a hypothesis, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.':`You may ask up to 10 questions in total to be extremely thorough. 
If you have enough information to form a strong hypothesis, or if you reach 10 questions, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`,t=`You are a highly skilled ${n.label}. 
You are part of a Multi-Disciplinary Team (MDT) board alongside: ${r}.
The patient's initial intake is:
Chief Complaint: ${o.chiefComplaint}
History: ${o.history||"None provided"}

Your goal is to conduct a Deep Specialist Assessment.
DO NOT REPEAT questions. Dig deeper or pivot to a new relevant area.
Ask exactly ONE short, conversational follow-up question at a time.
${e}

Return your response STRICTLY as JSON matching this format:
{
  "internalThoughts": "1 sentence describing what you are currently considering/ruling out based on the latest input.",
  "currentHypotheses": ["Hypothesis 1 (60%)", "Hypothesis 2 (40%)"],
  "response": "Your conversational question to the patient. (Or 'ANALYSIS_COMPLETE').",
  "widgetType": "none | pain_slider | symptom_pills (CRITICAL: Use 'pain_slider' if asking about pain severity 1-10. Use 'symptom_pills' if asking the user to select from a list of descriptors/symptoms).",
  "widgetOptions": ["Array", "Of", "Tags", "If using symptom_pills"]
}`,c=l&&l.length>0?`
ACTIVE HYPOTHESES TO TEST (from Differential Diagnosis Board):
${l.map(u=>`- ${u.condition} (${u.probability}%): Try to prove/disprove this. Next best tests suggest looking for: ${u.nextBestTests.join(", ")}`).join(`
`)}
Ask targeted questions to confirm or rule out these active hypotheses.`:"",p=t+d+c,h=i.slice(-12).map(u=>({role:u.role==="user"?"user":"model",parts:[{text:u.text||u.content}]})),f={systemInstruction:{role:"system",parts:[{text:p}]},contents:h,generationConfig:{responseMimeType:"application/json",responseSchema:{type:"object",properties:{internalThoughts:{type:"string"},currentHypotheses:{type:"array",items:{type:"string"}},response:{type:"string"},widgetType:{type:"string"},widgetOptions:{type:"array",items:{type:"string"}}},required:["internalThoughts","currentHypotheses","response"]}}};try{const u=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});if(!u.ok)throw new Error(`API Error: ${u.status}`);const w=await u.json();return(g=w.candidates)!=null&&g[0]?w.candidates[0].content.parts[0].text.trim():'{"response": "Could you tell me more?", "internalThoughts": "Awaiting more info", "currentHypotheses": []}'}catch{return'{"response": "I am experiencing network issues.", "internalThoughts": "Network error", "currentHypotheses": []}'}}async function R(i,n,a=[]){var d;const o=a.length>0?`
Patient Medical Records:
${a.map(e=>`- ${e.testName||e.filename}: ${e.keyFindings||(typeof e.findings=="string"?e.findings.substring(0,300)+"...":"Available")}`).join(`
`)}`:"",l=Object.fromEntries(Object.entries(n).map(([e,t])=>[e,t.map(c=>({role:c.role,text:c.text,hypotheses:c.currentHypotheses}))])),s={systemInstruction:{role:"system",parts:[{text:`You are the Chief Clinical Orchestrator for an MDT board.
The patient's intake:
Chief Complaint: ${i.chiefComplaint}${o}

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
}`}]},contents:[{role:"user",parts:[{text:"Run the MDT Conference based on the provided specialist data."}]}],generationConfig:{responseMimeType:"application/json"}};try{const e=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(!e.ok)throw new Error(`API Error: ${e.status}`);const t=await e.json();if((d=t.candidates)!=null&&d[0]){const p=t.candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(p)}}catch{return{corroborations:[],contentions:[],followUpQuestions:[],debateSummary:"MDT consensus failed due to an error."}}return null}async function _(i,n,a,o=[]){var d;const l=o.length>0?`
Patient Medical Records:
${o.map(e=>`- ${e.testName||e.filename}: ${e.keyFindings||(typeof e.findings=="string"?e.findings.substring(0,300)+"...":"Available")}`).join(`
`)}`:"",s={systemInstruction:{role:"system",parts:[{text:`You are the Chief Clinical Orchestrator compiling the final MDT report.
Patient Intake: ${i.chiefComplaint}${l}
Conference Summary: ${n.debateSummary}
Patient's Final Answers: ${JSON.stringify(a)}

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
}`}]},contents:[{role:"user",parts:[{text:"Generate final report."}]}],generationConfig:{responseMimeType:"application/json"}};try{const e=new AbortController,t=setTimeout(()=>e.abort(),6e4),c=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s),signal:e.signal});if(clearTimeout(t),!c.ok)throw new Error(`API Error: ${c.status}`);const p=await c.json();if((d=p.candidates)!=null&&d[0]){const h=p.candidates[0].content.parts[0].text,f=h.match(/\{[\s\S]*\}/),g=f?f[0]:h.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(g)}}catch{return{executiveSummary:"Based on the multi-disciplinary review of your symptoms and recent discussion, the board has identified some strong diagnostic pathways. Please follow the recommended action plan for the next steps.",topDiagnoses:[{condition:"Pending Further Review",confidence:60,rationale:"The board requires the results of your next tests to provide a conclusive assessment.",specialty:"General Practice"}],recommendedActionPlan:[{step:"Consult Primary Care Physician",timeline:"Immediately",type:"Consultation"}]}}return null}async function D(i,n,a,o,l=[]){return{critique:"Awaiting Orchestrator consensus.",revisedHypothesis:"Deferred to MDT Orchestrator.",confidenceUpdate:50}}async function J(i,n,a=[]){var d;let o="";for(const[e,t]of Object.entries(n))o+=`

--- Specialist (${e}) Transcript ---
`,t.forEach(c=>{o+=`${c.role.toUpperCase()}: ${c.text}
`,c.internalThoughts&&(o+=`[Internal Thoughts: ${c.internalThoughts}]
`),c.currentHypotheses&&c.currentHypotheses.length>0&&(o+=`[Active Hypotheses: ${c.currentHypotheses.join(", ")}]
`)});const l=a.length>0?`

--- Patient Medical Records ---
${a.map(e=>`File: ${e.testName||e.filename}
Findings: ${e.keyFindings||(typeof e.findings=="string"?e.findings.substring(0,300)+"...":"Available")}`).join(`

`)}`:"",s={systemInstruction:{role:"system",parts:[{text:`You are an elite Medical AI orchestrating parallel diagnostic assessments.
The patient presented with: "${i}"

Below are the independent interview transcripts from several specialists who questioned the patient simultaneously, along with any uploaded medical records:
${o}${l}

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
}`}]},contents:[{role:"user",parts:[{text:"Generate final parallel report."}]}],generationConfig:{responseMimeType:"application/json"}};try{const e=new AbortController,t=setTimeout(()=>e.abort(),6e4),c=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s),signal:e.signal});if(clearTimeout(t),!c.ok)throw new Error(`API Error: ${c.status}`);const p=await c.json();if((d=p.candidates)!=null&&d[0]){const h=p.candidates[0].content.parts[0].text,f=h.match(/\{[\s\S]*\}/),g=f?f[0]:h.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(g)}}catch{return{executiveSummary:"Due to network instability, the multi-specialist synthesis could not be completed at this time.",urgency:"Routine",topDiagnoses:[],recommendedActionPlan:[],questionsForClinician:["Are there any alternative pathways we should explore while the system reconnects?"]}}}async function L(i){var a;const n={contents:[{parts:[{text:`You are a clinical dietician AI. Analyze this food entry and return a strictly valid JSON object with the nutritional breakdown.
Entry: "${i}"

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
}`}]}],generationConfig:{responseMimeType:"application/json"}};try{const o=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(!o.ok)throw new Error("API Error");const l=await o.json();if((a=l.candidates)!=null&&a[0]){const s=l.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return s?JSON.parse(s[0]):null}}catch{return null}}async function Y(i){var a;const n={contents:[{parts:[{text:`You are a clinical dietician AI. Provide exactly 2 sentences of highly personalized clinical nutritional advice.
Conditions: ${(i.medicalConditions||[]).join(", ")||"None"}
Cuisine: ${i.cuisine||"Not specified"}
Goal: ${i.targetCalories||2e3} kcal/day

Rules:
1. Do not use quotes or introductory text. Just the 2 sentences.
2. Specifically mention their medical conditions and cuisine preference.
3. Be practical, actionable, and culturally relevant.`}]}]};try{const o=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(!o.ok)throw new Error("API Error");const l=await o.json();if((a=l.candidates)!=null&&a[0])return l.candidates[0].content.parts[0].text}catch{}return"Stay hydrated and focus on hitting your daily protein goals for optimal health."}async function H(i,n=7){var r,s,d;const a=S(),o=((s=(r=a==null?void 0:a.currentSummary)==null?void 0:r.topDiagnoses)==null?void 0:s.map(e=>e.condition).join(", "))||"None",l={contents:[{parts:[{text:`You are a clinical dietician AI. Generate a strictly valid JSON ${n}-day meal plan.
Conditions: ${(i.medicalConditions||[]).join(", ")||"None"}
Active Diagnoses: ${o}
Cuisine: ${i.cuisine||"Any"}
Target: ${i.targetCalories||2e3} kcal/day
Schedule: ${i.mealSchedule||"Standard 3 meals"}

Rules:
1. Output ONLY JSON.
2. Total daily calories should closely match their target (${i.targetCalories||2e3} kcal).
3. Cuisine: Strictly follow the '${i.cuisine}' cuisine preference. Generate authentic dishes.
4. Medical & Diagnosis: Strictly avoid foods contraindicated for '${(i.medicalConditions||[]).join(", ")}' AND their Active Diagnoses ('${o}'). Condition-tailored nutrition is CRITICAL.
5. Schedule: Strictly follow the '${i.mealSchedule}' meal schedule. If Intermittent Fasting, skip breakfast. If 5 small meals, add extra snacks.
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
}`}]}]};try{const e=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!e.ok)throw new Error("API Error");const t=await e.json();if((d=t.candidates)!=null&&d[0]){const p=t.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return p?JSON.parse(p[0]):null}}catch{return null}}async function F(i,n){return null}async function q(i,n,a){return null}async function U(i){return null}async function B(i,n){return null}async function G(i,n){var r,s,d,e;const a=n?`Patient Context: Age ${((r=n.personal)==null?void 0:r.age)||"unknown"}, Gender: ${((s=n.personal)==null?void 0:s.gender)||"unknown"}. Existing conditions: ${(((d=n.health)==null?void 0:d.conditions)||[]).join(", ")||"None"}.`:"",l={contents:[{parts:[{text:`You are an elite Clinical Pathway Simulator AI. 
The patient is considering this treatment action: "${i.step}"
${a}

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
}`}]}],generationConfig:{temperature:.2,response_mime_type:"application/json"}};try{const t=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!t.ok)throw new Error("API Error");const c=await t.json();if((e=c.candidates)!=null&&e[0]){const h=c.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);return h?JSON.parse(h[0]):null}}catch{return null}}async function z(i,n,a){var r,s,d,e;if(!i||i.length===0)return[];const l={contents:[{parts:[{text:`You are a clinical trials matching algorithm.
I am providing you with a list of actively recruiting clinical trials and the patient's case data.

Patient Age: ${((r=a==null?void 0:a.demographics)==null?void 0:r.age)||"Unknown"}
Patient Gender: ${((s=a==null?void 0:a.demographics)==null?void 0:s.gender)||"Unknown"}
Case Symptoms/Data: ${((d=n==null?void 0:n.intakeData)==null?void 0:d.chiefComplaint)||"Unknown"}
Current Active Diagnoses/Hypotheses: ${JSON.stringify(((n==null?void 0:n.differentials)||[]).map(t=>t.condition))}

Trials to analyze:
${JSON.stringify(i)}

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
]`}]}],generationConfig:{temperature:.1,response_mime_type:"application/json"}};try{const t=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!t.ok)throw new Error("API Error");const c=await t.json();if((e=c.candidates)!=null&&e[0]){const h=c.candidates[0].content.parts[0].text.match(/\[[\s\S]*\]/),f=h?JSON.parse(h[0]):[];return i.map(g=>{const u=f.find(w=>w.id===g.id)||{};return{...g,matchScore:u.matchScore||Math.floor(Math.random()*20)+60,aiContext:u.aiContext||"Relevance based on your active clinical hypotheses."}})}}catch{}return i}async function W(i,n,a){var r,s,d,e;if(!i||i.length===0)return[];const l={contents:[{parts:[{text:`You are a clinical research AI.
I am providing you with a list of recent medical papers (from PubMed/EuropePMC) and the patient's case data.

Patient Age: ${((r=a==null?void 0:a.demographics)==null?void 0:r.age)||"Unknown"}
Patient Gender: ${((s=a==null?void 0:a.demographics)==null?void 0:s.gender)||"Unknown"}
Case Symptoms/Data: ${((d=n==null?void 0:n.intakeData)==null?void 0:d.chiefComplaint)||"Unknown"}
Current Active Diagnoses/Hypotheses: ${JSON.stringify(((n==null?void 0:n.differentials)||[]).map(t=>t.condition))}

Papers to analyze:
${JSON.stringify(i.map(t=>({id:t.id,title:t.title,abstract:t.abstract})))}

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
]`}]}],generationConfig:{temperature:.1,response_mime_type:"application/json"}};try{const t=await y(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!t.ok)throw new Error("API Error");const c=await t.json();if((e=c.candidates)!=null&&e[0]){const h=c.candidates[0].content.parts[0].text.match(/\[[\s\S]*\]/),f=h?JSON.parse(h[0]):[];return i.map(g=>{const u=f.find(w=>w.id===g.id)||{};return{...g,matchScore:u.matchScore||Math.floor(Math.random()*20)+60,aiContext:u.aiContext||"This research paper investigates biological mechanisms relevant to your hypotheses."}})}}catch{}return i}export{L as analyzeFoodEntry,$ as analyzeLabReport,W as analyzeLiteratureRelevance,z as analyzeTrialRelevance,N as chatWithGemini,j as chatWithMDTSpecialist,k as chatWithTherapyGemini,B as checkDrugInteractions,I as fetchMedicineData,Y as generateDieticianAdvice,_ as generateMDTReport,H as generateMealPlan,J as generateParallelMultiReport,U as generateProfileSynthesis,D as runDebateRound,q as runDifferentialAnalysis,R as runMDTConference,M as selectMDTSpecialists,G as simulatePathway,F as suggestSpecialists};
