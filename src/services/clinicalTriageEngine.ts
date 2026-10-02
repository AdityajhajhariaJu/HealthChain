import {
  affirmativeMatch,
  reportedCurrentClauses,
  sourceMeasurement,
  explicitCollectionDate,
} from './clinicalEvidenceText';

/**
 * Deterministic Clinical Emergency Triage Engine
 * Fast client-side urgent-phrase screen; this is not a diagnosis or complete triage.
 * Catches acute life threats before any remote LLM network call.
 */

export interface TriageEvaluation {
  isEmergency: boolean;
  category?:
    | 'CEREBROVASCULAR'
    | 'CARDIOVASCULAR'
    | 'RESPIRATORY'
    | 'SEPSIS_INFECTION'
    | 'ACUTE_SURGICAL'
    | 'PSYCHIATRIC_CRISIS';
  redFlagReason?: string;
  immediateAction: string;
  suggestedContact: string;
}

interface RedFlagRule {
  category: TriageEvaluation['category'];
  pattern: RegExp;
  reason: string;
}

const RED_FLAG_RULES: RedFlagRule[] = [
  // 1. CEREBROVASCULAR (Stroke / SAH)
  {
    category: 'CEREBROVASCULAR',
    pattern:
      /\b(thunderclap\s+headache|worst\s+headache\s+of\s+my\s+life|sudden\s+severe\s+headache|facial\s+droop|face\s+droop|slurred\s+speech|can'?t\s+speak|unable\s+to\s+speak|one\s+side(d)?\s+weakness|arm\s+numbness\s+and\s+leg\s+weakness|loss\s+of\s+vision\s+in\s+one\s+eye)\b/i,
    reason:
      'Symptoms suggest possible acute cerebrovascular event (stroke, intracranial hemorrhage, or subarachnoid bleed).',
  },

  // 2. CARDIOVASCULAR (Acute Coronary Syndrome / Aortic Dissection)
  {
    category: 'CARDIOVASCULAR',
    pattern:
      /\b(crushing\s+chest\s+pain|chest\s+pain\s+(radiating|spreading)\s+to\s+(left\s+arm|jaw|neck|back)|chest\s+pressure\s+with\s+(sweat|sweating|nausea|shortness\s+of\s+breath)|tearing\s+pain\s+in\s+(my\s+)?back|passed\s+out\s+while\s+exercising|syncope\s+during\s+exertion)\b/i,
    reason:
      'Symptoms correlate with potential acute coronary syndrome or major vascular emergency.',
  },

  // 3. RESPIRATORY (Pulmonary Embolism / Severe Respiratory Distress)
  {
    category: 'RESPIRATORY',
    pattern:
      /\b(sudden\s+(severe\s+)?shortness\s+of\s+breath|gasping\s+for\s+air|lips\s+turning\s+blue|fingers\s+turning\s+blue|(swollen|painful)\s+calf\s+and\s+(shortness\s+of\s+breath|chest\s+pain)|coughing\s+up\s+blood)\b/i,
    reason: 'Symptoms indicate acute respiratory compromise or possible pulmonary embolism.',
  },

  // 4. SEPSIS & MENINGEAL (Severe Infection / Meningitis)
  {
    category: 'SEPSIS_INFECTION',
    pattern:
      /\b((stiff|rigid)\s+neck\s+with\s+(high\s+)?fever|fever\s+with\s+(purple|dark|petechial)\s+rash|confusion\s+with\s+(high\s+)?fever|shivering\s+uncontrollably\s+and\s+(clammy|mottled)\s+skin)\b/i,
    reason:
      'Symptoms may indicate acute meningitis, bacterial sepsis, or critical systemic infection.',
  },

  // 5. ACUTE ABDOMINAL (Peritonitis / Ruptured Viscus)
  {
    category: 'ACUTE_SURGICAL',
    pattern:
      /\b((board|rock)\s+hard\s+abdomen|sudden\s+excruciating\s+abdominal\s+pain|vomiting\s+blood|black\s+tarry\s+stools\s+with\s+dizziness)\b/i,
    reason: 'Findings suggest an acute surgical abdomen or active internal hemorrhage.',
  },

  // 6. PSYCHIATRIC CRISIS (Imminent Self-Harm)
  {
    category: 'PSYCHIATRIC_CRISIS',
    pattern:
      /\b(want\s+to\s+(kill|end)\s+myself|going\s+to\s+commit\s+suicide|plan\s+to\s+overdose|suicidal\s+thoughts\s+right\s+now)\b/i,
    reason: 'Active distress or self-harm crisis detected.',
  },
];

export function evaluateEmergencyTriage(input: string): TriageEvaluation {
  if (!input || typeof input !== 'string') {
    return {
      isEmergency: false,
      immediateAction: '',
      suggestedContact: '',
    };
  }

  const currentClauses = reportedCurrentClauses(input);
  const extraDanger = [
    {
      category: 'PSYCHIATRIC_CRISIS' as const,
      pattern:
        /(?:i (?:am|feel) suicidal|i (?:might|will|intend to) (?:kill|hurt) myself|i want to (?:die|end my life)|i (?:have a plan|plan|intend) to (?:kill|hurt) myself|i (?:have|already) (?:taken|took) an overdose|i overdosed|मुझे आत्महत्या|मैं (?:खुद को|अपनी जान).*(?:मार|खत्म))/i,
    },
    {
      category: 'RESPIRATORY' as const,
      pattern:
        /(?:i (?:cannot|can't|can’t) breathe|unable to breathe|mujhe saans nahi aa rahi|severe (?:difficulty|trouble) breathing|सांस नहीं (?:आ|ले)|साँस नहीं (?:आ|ले))/i,
    },
    {
      category: 'CARDIOVASCULAR' as const,
      pattern:
        /(?:severe chest pain|chest (?:pressure|pain|tightness|discomfort).{0,50}(?:breathless(?:ness)?|shortness of breath|sweat(?:ing)?|nausea)|सीने में (?:तेज|बहुत|भयंकर) दर्द)/i,
    },
    {
      category: 'ACUTE_SURGICAL' as const,
      pattern:
        /\b(?:severe\s+(?:constant\s+)?(?:stomach|abdominal|belly|tummy)\s+pain|(?:stomach|abdominal|belly|tummy)\s+pain.{0,20}(?:severe|sudden))\b/i,
    },
  ];
  for (const extra of extraDanger)
    if (
      currentClauses.some(
        (clause) =>
          affirmativeMatch(clause, extra.pattern) &&
          !/\b(?:not|never)\s+(?:feeling\s+)?suicidal|\bdo not want to die/i.test(clause)
      )
    ) {
      return {
        isEmergency: true,
        category: extra.category,
        redFlagReason: 'Your words may describe immediate danger. Seek urgent human help now.',
        immediateAction:
          'Contact local emergency services now. Ask a trusted nearby person to stay with you. Do not wait for an AI reply.',
        suggestedContact: '',
      };
    }

  for (const rule of RED_FLAG_RULES) {
    if (currentClauses.some((clause) => affirmativeMatch(clause, rule.pattern))) {
      return {
        isEmergency: true,
        category: rule.category,
        redFlagReason: rule.reason,
        immediateAction:
          'Contact local emergency services now. Do not wait for an AI reply. Ask a trusted nearby person to help.',
        suggestedContact: '',
      };
    }
  }

  return {
    isEmergency: false,
    immediateAction: '',
    suggestedContact: '',
  };
}

export interface ClinicalUrgency {
  level: 'urgent_emergency_care' | 'prompt_clinical_review' | 'not_assessed';
  action: string;
  reason: string;
}

export function evaluateClinicalUrgency(
  input: string,
  evidence: Array<{ fact: string; eventDate?: string; reportDate?: string }> = []
): ClinicalUrgency {
  const emergency = evaluateEmergencyTriage(input);
  if (emergency.isEmergency)
    return {
      level: 'urgent_emergency_care',
      action: emergency.immediateAction,
      reason:
        'Your description may indicate immediate danger. This screen cannot determine its cause.',
    };
  const alarm =
    /\b(?:blood (?:mixed )?(?:into|in) (?:my |the |your )?stool|rectal bleeding|unintentional (?:\d+(?:\.\d+)?\s*(?:kg|pounds?|lbs?)\s*)?weight loss|lost\s+\d+(?:\.\d+)?\s*(?:kg|pounds?|lbs?).{0,25}without trying)\b/i;
  if (reportedCurrentClauses(input).some((clause) => affirmativeMatch(clause, alarm)))
    return {
      level: 'prompt_clinical_review',
      action:
        'Contact a qualified clinician promptly about these symptoms. Seek emergency help if symptoms are severe, rapidly worsening, or you feel faint.',
      reason:
        'Bleeding or unintended weight loss needs medical assessment; a dietary explanation alone is insufficient.',
    };
  const breathlessness = reportedCurrentClauses(input).some((clause) =>
    affirmativeMatch(clause, /\b(?:breathless(?:ness)?|short(?:ness)? of breath)\b/i)
  );
  const belowPrintedRange = evidence.some((fact) => {
    const date = fact.eventDate || explicitCollectionDate(fact.fact) || fact.reportDate || '';
    const age = Date.now() - Date.parse(date);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(age) ||
      age < 0 ||
      age > 30 * 86400000
    )
      return false;
    return ['Hemoglobin', 'Haemoglobin', 'Hb', 'Hgb'].some((marker) =>
      sourceMeasurement(fact.fact, marker).some((measurement) => {
        const range = measurement.excerpt.match(
          /(?:reference|ref\.?|range)\s*:?\s*(\d+(?:\.\d+)?)\s*[-–]\s*\d+(?:\.\d+)?\s*([a-zA-Z][a-zA-Z/]*)/i
        );
        return (
          range &&
          measurement.unit.toLowerCase() === range[2].toLowerCase() &&
          Number(measurement.value) < Number(range[1])
        );
      })
    );
  });
  if (breathlessness && belowPrintedRange)
    return {
      level: 'prompt_clinical_review',
      action:
        'Contact a qualified clinician promptly about your breathlessness and recent blood results. Seek emergency help if breathing becomes severe, symptoms worsen rapidly, or you feel faint.',
      reason:
        'A recent hemoglobin value is below its own printed reference range. This comparison cannot establish the cause of your symptoms.',
    };
  return { level: 'not_assessed', action: '', reason: '' };
}
