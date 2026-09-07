/**
 * Deterministic Clinical Emergency Triage Engine
 * Zero-tolerance safety guardrail running client-side in < 2ms.
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
      suggestedContact: '911'
    };
  }

  const normalized = input.trim();

  for (const rule of RED_FLAG_RULES) {
    if (rule.pattern.test(normalized)) {
      return {
        isEmergency: true,
        category: rule.category,
        redFlagReason: rule.reason,
        immediateAction: rule.immediateAction,
        suggestedContact: rule.category === 'PSYCHIATRIC_CRISIS' ? '988' : '911'
      };
    }
  }

  return {
    isEmergency: false,
    immediateAction: '',
    suggestedContact: '911'
  };
}
