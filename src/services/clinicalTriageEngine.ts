/**
 * Deterministic Clinical Emergency Triage Engine
 * Fast client-side urgent-phrase screen; this is not a diagnosis or complete triage.
 * Catches acute life threats before any remote LLM network call.
 */

export interface TriageEvaluation {
  isEmergency: boolean;
  category?: 'CEREBROVASCULAR' | 'CARDIOVASCULAR' | 'RESPIRATORY' | 'SEPSIS_INFECTION' | 'ACUTE_SURGICAL' | 'PSYCHIATRIC_CRISIS';
  redFlagReason?: string;
  immediateAction: string;
  suggestedContact: string;
}

interface RedFlagRule {
  category: TriageEvaluation['category'];
  pattern: RegExp;
  reason: string;
  immediateAction: string;
}

const RED_FLAG_RULES: RedFlagRule[] = [
  // 1. CEREBROVASCULAR (Stroke / SAH)
  {
    category: 'CEREBROVASCULAR',
    pattern: /\b(thunderclap\s+headache|worst\s+headache\s+of\s+my\s+life|sudden\s+severe\s+headache|facial\s+droop|face\s+droop|slurred\s+speech|can'?t\s+speak|unable\s+to\s+speak|one\s+side(d)?\s+weakness|arm\s+numbness\s+and\s+leg\s+weakness|loss\s+of\s+vision\s+in\s+one\s+eye)\b/i,
    reason: 'Symptoms suggest possible acute cerebrovascular event (stroke, intracranial hemorrhage, or subarachnoid bleed).',
    immediateAction: 'Immediately call 911 or your local emergency number. Do not drive yourself. Note the exact time symptoms started.'
  },

  // 2. CARDIOVASCULAR (Acute Coronary Syndrome / Aortic Dissection)
  {
    category: 'CARDIOVASCULAR',
    pattern: /\b(crushing\s+chest\s+pain|chest\s+pain\s+(radiating|spreading)\s+to\s+(left\s+arm|jaw|neck|back)|chest\s+pressure\s+with\s+(sweat|sweating|nausea|shortness\s+of\s+breath)|tearing\s+pain\s+in\s+(my\s+)?back|passed\s+out\s+while\s+exercising|syncope\s+during\s+exertion)\b/i,
    reason: 'Symptoms correlate with potential acute coronary syndrome or major vascular emergency.',
    immediateAction: 'Call emergency services (911) immediately. Sit or rest quietly. If not allergic, ask dispatcher about chewable aspirin.'
  },

  // 3. RESPIRATORY (Pulmonary Embolism / Severe Respiratory Distress)
  {
    category: 'RESPIRATORY',
    pattern: /\b(sudden\s+(severe\s+)?shortness\s+of\s+breath|gasping\s+for\s+air|lips\s+turning\s+blue|fingers\s+turning\s+blue|(swollen|painful)\s+calf\s+and\s+(shortness\s+of\s+breath|chest\s+pain)|coughing\s+up\s+blood)\b/i,
    reason: 'Symptoms indicate acute respiratory compromise or possible pulmonary embolism.',
    immediateAction: 'Seek immediate emergency medical evaluation. Sit upright in a position of comfort and do not exert yourself.'
  },

  // 4. SEPSIS & MENINGEAL (Severe Infection / Meningitis)
  {
    category: 'SEPSIS_INFECTION',
    pattern: /\b((stiff|rigid)\s+neck\s+with\s+(high\s+)?fever|fever\s+with\s+(purple|dark|petechial)\s+rash|confusion\s+with\s+(high\s+)?fever|shivering\s+uncontrollably\s+and\s+(clammy|mottled)\s+skin)\b/i,
    reason: 'Symptoms may indicate acute meningitis, bacterial sepsis, or critical systemic infection.',
    immediateAction: 'Urgent emergency hospital assessment required for blood cultures and IV evaluation.'
  },

  // 5. ACUTE ABDOMINAL (Peritonitis / Ruptured Viscus)
  {
    category: 'ACUTE_SURGICAL',
    pattern: /\b((board|rock)\s+hard\s+abdomen|sudden\s+excruciating\s+abdominal\s+pain|vomiting\s+blood|black\s+tarry\s+stools\s+with\s+dizziness)\b/i,
    reason: 'Findings suggest an acute surgical abdomen or active internal hemorrhage.',
    immediateAction: 'Do not eat or drink anything. Proceed to the nearest emergency department immediately.'
  },

  // 6. PSYCHIATRIC CRISIS (Imminent Self-Harm)
  {
    category: 'PSYCHIATRIC_CRISIS',
    pattern: /\b(want\s+to\s+(kill|end)\s+myself|going\s+to\s+commit\s+suicide|plan\s+to\s+overdose|suicidal\s+thoughts\s+right\s+now)\b/i,
    reason: 'Active distress or self-harm crisis detected.',
    immediateAction: 'You are not alone. Please contact the 988 Suicide & Crisis Lifeline immediately by calling or texting 988 (free, 24/7 confidential support).'
  }
];

export function evaluateEmergencyTriage(input: string): TriageEvaluation {
  if (!input || typeof input !== 'string') {
    return {
      isEmergency: false,
      immediateAction: '',
      suggestedContact: ''
    };
  }

  const normalized = input.trim();
  const clauses=normalized.split(/[.!;\n]|\bbut\b/i);
  const currentClauses=clauses.filter(clause=>!/^\s*(?:what (?:is|are|does)|how (?:does|do)|can you explain|tell me about|for (?:a|my) (?:class|assignment)|in a (?:book|movie)|hypothetically)/i.test(clause));
  const extraDanger=[
   {category:'PSYCHIATRIC_CRISIS' as const,pattern:/(?:i (?:am|feel) suicidal|i (?:might|will|intend to) (?:kill|hurt) myself|i want to (?:die|end my life)|i (?:have a plan|plan|intend) to (?:kill|hurt) myself|i (?:have|already) (?:taken|took) an overdose|i overdosed|मुझे आत्महत्या|मैं (?:खुद को|अपनी जान).*(?:मार|खत्म))/i},
   {category:'RESPIRATORY' as const,pattern:/(?:i (?:cannot|can't|can’t) breathe|unable to breathe|mujhe saans nahi aa rahi|severe (?:difficulty|trouble) breathing|सांस नहीं (?:आ|ले)|साँस नहीं (?:आ|ले))/i},
   {category:'CARDIOVASCULAR' as const,pattern:/(?:severe chest pain|सीने में (?:तेज|बहुत|भयंकर) दर्द)/i},
  ];
  for(const extra of extraDanger)if(currentClauses.some(clause=>extra.pattern.test(clause) && !/\b(?:not|never)\s+(?:feeling\s+)?suicidal|\bdo not want to die/i.test(clause))){
   return {isEmergency:true,category:extra.category,redFlagReason:'Your words may describe immediate danger. Seek urgent human help now.',immediateAction:'Contact local emergency services now. Ask a trusted nearby person to stay with you. Do not wait for an AI reply.',suggestedContact:''};
  }

  for (const rule of RED_FLAG_RULES) {
    if (currentClauses.some(clause=>{
      const match=rule.pattern.exec(clause);if(!match)return false;
      const before=clause.slice(Math.max(0,match.index-50),match.index);
      return !/\b(?:no|not|without|denies|never had)\s+(?:any\s+|currently\s+|having\s+|experiencing\s+|a\s+|the\s+){0,3}$/i.test(before);
    })) {
      return {
        isEmergency: true,
        category: rule.category,
        redFlagReason: rule.reason,
        immediateAction: 'Contact local emergency services now. Do not wait for an AI reply. Ask a trusted nearby person to help.',
        suggestedContact: ''
      };
    }
  }

  return {
    isEmergency: false,
    immediateAction: '',
    suggestedContact: ''
  };
}
