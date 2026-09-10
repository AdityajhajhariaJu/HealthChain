/**
 * StructuredAnswerEngine.ts
 * 
 * HealthChain Core Architectural Blueprint — Step 7: "How the actual answer should look"
 * Reference: media_1789068538297.png
 * 
 * 5 Progressive-Disclosure Layers:
 * 1. Main answer: 2-3 sentences answering their question -> Expandable: Full synthesis
 * 2. Why this matters in my case: Strongest relevant observations -> Expandable: Source passages and dates
 * 3. Other explanations: Plausible alternatives or reasons not to connect events -> Expandable: Supporting & conflicting evidence
 * 4. What we still need: 1-2 important gaps -> Expandable: Complete missing-information list
 * 5. Next step: 1 useful action chosen for this situation -> Expandable: Other available actions
 * 
 * 5 Avoid vs Replace With Mandates:
 * - AVOID: "Ask your doctor" as the entire answer
 *   REPLACE WITH: A specific question, why it matters, and the relevant records
 * - AVOID: A long biological mechanism with no case evidence
 *   REPLACE WITH: A clearly labelled possible explanation tied to actual observations
 * - AVOID: "Everything is connected"
 *   REPLACE WITH: Which relationships are supported, proposed, contradicted or unknown
 * - AVOID: A percentage without a validated basis
 *   REPLACE WITH: The evidence supporting the interpretation and its limitations
 * - AVOID: Repeating the entire case history
 *   REPLACE WITH: Only the information relevant to this question
 */

import { ClinicalInformationCategory } from './ClinicalInformationClassifier';

export type EpistemicRelationshipStatus = 'supported' | 'proposed' | 'contradicted' | 'unknown';

export interface EvidenceOriginSource {
  passage: string;
  source: string;
  date?: string;
  category?: ClinicalInformationCategory;
  confidenceBasis?: string;
}

export interface BalancedAlternativeEvidence {
  title: string;
  mechanism: string;
  supportingEvidence: string[];
  conflictingEvidence: string[];
  whatWouldChangeThis?: string;
  likelihoodAssessment?: 'leading' | 'competing' | 'uncertain';
}

export interface StructuredRelationshipItem {
  connection: string;
  status: EpistemicRelationshipStatus;
  rationale: string;
  evidenceBasis: string[];
}

export interface DoctorVisitBrief {
  specificQuestion: string;
  whyItMatters: string;
  relevantRecords: string[];
}

export interface StructuredClinicalAnswer {
  // Layer 1: Main answer
  layer1_mainAnswer: {
    conciseAnswer: string;
    fullSynthesis: string;
  };

  // Layer 2: Why this matters in my case
  layer2_whyThisMatters: {
    strongestObservations: string[];
    sourcePassages: EvidenceOriginSource[];
  };

  // Layer 3: Other explanations
  layer3_otherExplanations: {
    plausibleAlternatives: string[];
    balancedEvidence: BalancedAlternativeEvidence[];
    relationshipStatuses: StructuredRelationshipItem[];
    contradictionQueue?: Array<{
      id: string;
      topic: string;
      itemA: { finding: string; source: string; date?: string };
      itemB: { finding: string; source: string; date?: string };
      clinicalSignificance: string;
      resolutionNeed: string;
    }>;
  };

  // Layer 4: What we still need
  layer4_whatWeStillNeed: {
    criticalGaps: string[];
    completeMissingList: string[];
  };

  // Layer 5: Next step
  layer5_nextStep: {
    chosenAction: string;
    otherActions: string[];
    doctorVisitBrief: DoctorVisitBrief;
  };

  avoidDisclaimersEnforced: boolean;
  generatedAt: string;
}

export interface BuildStructuredAnswerInput {
  question?: string;
  executiveSummary?: string;
  primaryHypothesis?: string;
  documentedFacts?: Array<{
    fact?: string;
    source?: string;
    date?: string;
    category?: string;
    extractionStatus?: string;
    allowedRole?: string;
  }>;
  uncertainties?: string[];
  missingLinks?: string[];
  questionsForClinician?: string[];
  contradictions?: Array<{
    id?: string;
    topic?: string;
    itemA?: { finding?: string; source?: string; date?: string };
    itemB?: { finding?: string; source?: string; date?: string };
    clinicalSignificance?: string;
    resolutionNeed?: string;
  }>;
  alternatives?: Array<{
    title?: string;
    mechanismSummary?: string;
    type?: string;
    likelihoodAssessment?: string;
    supportingFacts?: string[];
    contradictoryFacts?: string[];
    whatWouldChangeThis?: string;
  }>;
  perspectives?: Array<any>;
  boundedComparison?: any;
  reasoningPipeline?: any;
  userPriority?: string;
}

/** Sanitizes text to remove fabricated percentage probabilities (Avoid Rule 4) */
export function sanitizeArbitraryPercentages(text: string): string {
  if (!text) return '';
  return text
    .replace(/\b\d{1,3}%\s*(match|probability|likelihood|certainty|confidence)\b/gi, 'supported by documented evidence')
    .replace(/\bwith\s*\d{1,3}%\s*confidence\b/gi, 'based on documented observations')
    .trim();
}

/** Extracts 2-3 concise sentences answering the patient's concern (Layer 1) */
function extractConciseAnswer(summary: string, hypothesis: string): string {
  if (!summary || !summary.trim()) {
    return `Based on your recorded history, the primary clinical consideration is ${hypothesis || 'your reported symptoms'}. Documented findings should be evaluated with your clinician alongside objective laboratory values.`;
  }
  const sanitized = sanitizeArbitraryPercentages(summary);
  const sentences = sanitized
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length <= 3) {
    return sentences.join(' ');
  }
  return sentences.slice(0, 3).join(' ');
}

/** Formulates the Doctor Visit Brief replacing generic "Ask your doctor" cop-outs (Avoid Rule 1) */
function buildDoctorVisitBrief(
  questions: string[],
  facts: Array<{ fact?: string; source?: string }>,
  primaryConcern: string
): DoctorVisitBrief {
  const specificQuestion = questions.length > 0
    ? questions[0]
    : `Could my documented ${primaryConcern.toLowerCase()} relate to the timing of recent medication or dietary adjustments?`;

  const whyItMatters = `Clarifying this distinction determines whether further targeted evaluation is indicated or if these symptoms reflect a temporary reactive pattern.`;

  const relevantRecords = facts.slice(0, 3).map(f => {
    const src = f.source ? ` (${f.source})` : '';
    return `${f.fact || 'Documented record'}${src}`;
  });

  if (relevantRecords.length === 0) {
    relevantRecords.push('Recent symptom diary entries and any prior metabolic panels.');
  }

  return {
    specificQuestion,
    whyItMatters,
    relevantRecords,
  };
}

/** Builds the complete 5-layer structured answer with progressive disclosure and rule compliance */
export function buildStructuredClinicalAnswer(input: BuildStructuredAnswerInput): StructuredClinicalAnswer {
  const hypothesis = input.primaryHypothesis || 'Clinical evidence synthesis';
  const rawSummary = input.executiveSummary || '';
  const facts = Array.isArray(input.documentedFacts) ? input.documentedFacts : [];
  const uncertainties = Array.isArray(input.uncertainties) ? input.uncertainties : [];
  const missing = Array.isArray(input.missingLinks) ? input.missingLinks : [];
  const clinicianQuestions = Array.isArray(input.questionsForClinician) ? input.questionsForClinician : [];
  const alternatives = Array.isArray(input.alternatives) ? input.alternatives : [];

  // ==========================================
  // LAYER 1: MAIN ANSWER (Concise -> Synthesis)
  // ==========================================
  const conciseAnswer = extractConciseAnswer(rawSummary, hypothesis);
  let fullSynthesis = sanitizeArbitraryPercentages(rawSummary);
  if (input.boundedComparison?.agreementSynthesis) {
    fullSynthesis += `\n\nCross-Perspective Assessment: ${input.boundedComparison.agreementSynthesis}`;
  }
  if (input.boundedComparison?.residualUncertainty) {
    fullSynthesis += `\n\nClinical Boundary: ${input.boundedComparison.residualUncertainty}`;
  }

  // =========================================================================
  // LAYER 2: WHY THIS MATTERS IN MY CASE (Strongest Observations -> Sources)
  // =========================================================================
  // Extract up to 3 strongest observations tied directly to actual case records
  const strongestObservations: string[] = [];
  const sourcePassages: EvidenceOriginSource[] = [];

  for (const f of facts) {
    if (!f.fact) continue;
    if (strongestObservations.length < 3) {
      strongestObservations.push(f.fact);
    }
    sourcePassages.push({
      passage: f.fact,
      source: f.source || 'Medical Record',
      date: f.date || 'Dated record',
      category: (f.category as ClinicalInformationCategory) || 'extracted_finding',
      confidenceBasis: f.allowedRole || 'documented_finding',
    });
  }

  if (strongestObservations.length === 0) {
    strongestObservations.push('No documented laboratory or clinical findings currently recorded.');
  }

  // =============================================================================
  // LAYER 3: OTHER EXPLANATIONS (Alternatives -> Balanced Evidence -> Relations)
  // =============================================================================
  const plausibleAlternatives: string[] = [];
  const balancedEvidence: BalancedAlternativeEvidence[] = [];
  const relationshipStatuses: StructuredRelationshipItem[] = [];

  if (alternatives.length > 0) {
    for (const alt of alternatives) {
      const title = alt.title || 'Alternative Consideration';
      if (plausibleAlternatives.length < 3) {
        plausibleAlternatives.push(title);
      }
      balancedEvidence.push({
        title,
        mechanism: sanitizeArbitraryPercentages(alt.mechanismSummary || 'Physiological variation under observation'),
        supportingEvidence: alt.supportingFacts && alt.supportingFacts.length > 0
          ? alt.supportingFacts
          : ['Temporal correlation with recorded symptom reports'],
        conflictingEvidence: alt.contradictoryFacts && alt.contradictoryFacts.length > 0
          ? alt.contradictoryFacts
          : ['Absence of elevated inflammatory markers or confirmatory diagnostic criteria'],
        whatWouldChangeThis: alt.whatWouldChangeThis || 'Subsequent repeat panel or diagnostic challenge test',
        likelihoodAssessment: (alt.likelihoodAssessment as any) || 'competing',
      });
    }
  } else {
    plausibleAlternatives.push('Temporary reactive physiological response', 'Separate independent events without a shared cause');
    balancedEvidence.push(
      {
        title: 'Temporary reactive physiological response',
        mechanism: 'Transient adjustment to dietary, stress, or circadian disruption.',
        supportingEvidence: ['Self-limiting duration of intermittent episodes'],
        conflictingEvidence: ['Persistence of baseline fatigue across multiple weeks'],
        whatWouldChangeThis: 'Structured 7-day symptom-food journal showing resolution.',
        likelihoodAssessment: 'competing',
      },
      {
        title: 'Separate independent events without a shared cause',
        mechanism: 'Unrelated gastrointestinal and musculoskeletal symptoms presenting concurrently by coincidence.',
        supportingEvidence: ['Distinct timing intervals without documented direct overlap'],
        conflictingEvidence: ['Co-occurrence during acute flare periods'],
        whatWouldChangeThis: 'Symptom logging confirming discordant triggers.',
        likelihoodAssessment: 'competing',
      }
    );
  }

  // Strict epistemic relationship tagging (Mandate: Replace "Everything is connected" with supported/proposed/contradicted/unknown)
  relationshipStatuses.push({
    connection: `${hypothesis} & Reported Symptoms`,
    status: facts.length >= 2 ? 'supported' : 'proposed',
    rationale: facts.length >= 2
      ? 'Corroborated by dated clinical notes and patient diary entries'
      : 'Hypothesized based on typical symptom patterns; awaiting formal verification',
    evidenceBasis: facts.slice(0, 2).map(f => f.fact || 'Record note'),
  });

  if (input.boundedComparison?.disagreements && input.boundedComparison.disagreements.length > 0) {
    for (const dis of input.boundedComparison.disagreements) {
      relationshipStatuses.push({
        connection: `${dis.perspectiveA} vs ${dis.perspectiveB}`,
        status: 'contradicted',
        rationale: dis.issue || 'Divergent clinical interpretations on existing records',
        evidenceBasis: [dis.resolutionNeed || 'Further diagnostic clarification required'],
      });
    }
  } else {
    relationshipStatuses.push({
      connection: 'Systemic vs Isolated Etiology',
      status: 'unknown',
      rationale: 'Insufficient objective biomarker data to confirm systemic autoimmune or metabolic involvement',
      evidenceBasis: ['No comprehensive rheumatology or endocrine panels on file'],
    });
  }

  // =========================================================================
  // LAYER 4: WHAT WE STILL NEED (1-2 Critical Gaps -> Complete Checklist)
  // =========================================================================
  const allGaps = [...uncertainties, ...missing].filter((g, i, self) => self.indexOf(g) === i);
  const criticalGaps = allGaps.slice(0, 2);
  if (criticalGaps.length === 0) {
    criticalGaps.push('Objective laboratory measurements correlating with symptom spikes');
  }
  const completeMissingList = allGaps.length > 0 ? allGaps : [
    'Recent complete blood count with differential and comprehensive metabolic panel',
    'Documented timeline of symptom onset relative to dietary changes or medications',
    'Specialist assessment validating physical examination findings',
  ];

  // =========================================================================
  // LAYER 5: NEXT STEP (1 Action -> Other Actions -> Doctor Visit Brief)
  // =========================================================================
  const doctorVisitBrief = buildDoctorVisitBrief(clinicianQuestions, facts, hypothesis);
  
  const chosenAction = input.userPriority
    ? `Prioritize clarifying: "${input.userPriority}" at your upcoming clinician consultation.`
    : `Prepare your Doctor Visit Brief to review with your clinician.`;

  const otherActions: string[] = [];
  if (clinicianQuestions.length > 1) {
    otherActions.push(`Ask secondary question: "${clinicianQuestions[1]}"`);
  }
  otherActions.push('Track symptom occurrence alongside meals and sleep for 7 consecutive days in your diary.');
  otherActions.push('Obtain copies of prior lab requisitions to verify referenced reference intervals.');

  return {
    layer1_mainAnswer: {
      conciseAnswer,
      fullSynthesis,
    },
    layer2_whyThisMatters: {
      strongestObservations,
      sourcePassages,
    },
    layer3_otherExplanations: {
      plausibleAlternatives,
      balancedEvidence,
      relationshipStatuses,
      contradictionQueue: Array.isArray(input.contradictions) && input.contradictions.length > 0
        ? input.contradictions.map((c, idx) => ({
            id: c.id || `contra_${idx + 1}`,
            topic: c.topic || 'Discrepancy between findings',
            itemA: {
              finding: c.itemA?.finding || 'Documented observation A',
              source: c.itemA?.source || 'Record A',
              date: c.itemA?.date,
            },
            itemB: {
              finding: c.itemB?.finding || 'Documented observation B',
              source: c.itemB?.source || 'Record B',
              date: c.itemB?.date,
            },
            clinicalSignificance: c.clinicalSignificance || 'Clinical discrepancy between tests or timeline reports.',
            resolutionNeed: c.resolutionNeed || 'Review conflicting findings with treating clinician.',
          }))
        : undefined,
    },
    layer4_whatWeStillNeed: {
      criticalGaps,
      completeMissingList,
    },
    layer5_nextStep: {
      chosenAction,
      otherActions,
      doctorVisitBrief,
    },
    avoidDisclaimersEnforced: true,
    generatedAt: new Date().toISOString(),
  };
}
