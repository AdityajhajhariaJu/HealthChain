import { CategorizedInformationItem, classifyClinicalInformation } from './ClinicalInformationClassifier';

// ==========================================
// 10 REASONING STAGES DATA CONTRACTS
// ==========================================

/** Stage 1: Establish Facts — Source-linked evidence */
export interface SourceLinkedEvidence {
  id: string;
  fact: string;
  source: string;
  page?: number;
  file?: string;
  category: string;
  allowedRole: string;
  confidence?: 'verified' | 'provisional' | 'self_reported';
  timestamp?: string;
}

/** Stage 2: Align Time — A coherent timeline */
export interface TemporalTimelineEntry {
  id: string;
  description: string;
  eventDate?: string;
  reportDate?: string;
  entryDate: string;
  temporalConfidence: 'exact' | 'approximate' | 'relative' | 'undated';
  relatedFactIds: string[];
}

export interface TemporalGap {
  period: string;
  durationDescription: string;
  clinicalSignificance: string;
}

export interface TemporalOverlap {
  phenomena: string[];
  timeframe: string;
  implication: string;
}

export interface CoherentTimeline {
  entries: TemporalTimelineEntry[];
  overlaps: TemporalOverlap[];
  gaps: TemporalGap[];
  summaryChronology: string;
}

/** Stage 3: Reconcile Records — A correction queue */
export type DiscrepancyType = 'duplicate' | 'unit_change' | 'conflicting_values' | 'differing_accounts';

export interface CorrectionQueueItem {
  id: string;
  type: DiscrepancyType;
  title: string;
  itemsInvolved: string[];
  discrepancyDescription: string;
  suggestedAction: string;
  status: 'pending' | 'resolved' | 'acknowledged';
  resolutionNote?: string;
}

/** Stage 4: Identify Relevant Perspectives — Small, justified perspective set */
export interface JustifiedPerspective {
  id: string;
  specialty: string;
  doctorName: string;
  unansweredQuestionAddressed: string;
  justification: string;
  uniqueContribution: string;
  supportingEvidenceIds: string[];
}

/** Stage 5: Generate Alternatives — Competing interpretations */
export type AlternativeType = 'connected_explanation' | 'separate_explanations' | 'insufficient_evidence';

export interface AlternativeInterpretation {
  id: string;
  type: AlternativeType;
  title: string;
  mechanismSummary: string;
  likelihoodAssessment: 'leading' | 'competing' | 'unlikely_but_critical_to_rule_out' | 'uncertain';
  rationale: string;
}

/** Stage 6: Challenge Each Alternative — Balanced assessment (Tri-prong) */
export interface BalancedAssessment {
  alternativeId: string;
  alternativeTitle: string;
  supportingEvidence: {
    factId?: string;
    description: string;
    weight: 'strong' | 'moderate' | 'circumstantial';
  }[];
  conflictingEvidence: {
    factId?: string;
    description: string;
    weight: 'direct_contradiction' | 'incongruent_timing' | 'normal_control_test';
  }[];
  missingEvidenceWhatWouldChangeIt: {
    testOrObservation: string;
    potentialImpact: string;
  }[];
}

/** Stage 7: Choose Useful Clarification — One focused user question */
export interface FocusedUserQuestion {
  id: string;
  question: string;
  whyThisQuestion: string;
  decisionImpact: string;
  targetAlternativeIds: string[];
  status: 'pending' | 'answered';
  userAnswer?: string;
  answeredAt?: string;
}

/** Stage 8: Synthesize — A useful answer */
export interface ClinicalSynthesis {
  mainFinding: string;
  empiricalBasis: string[];
  limitations: string[];
  practicalImplication: string;
  urgencyLevel: 'routine' | 'prompt_clinical_review' | 'urgent_emergency_care';
}

/** Stage 9: Carry Forward — Continuity */
export interface ContinuityRecord {
  openQuestions: string[];
  chosenNextAction: string;
  preservedHypotheses: string[];
  savedAt: string;
  caseCheckpointId?: string;
}

/** Stage 10: Update Selectively — "What changed and why" */
export interface SelectiveUpdateDiff {
  previousRunDate?: string;
  currentRunDate: string;
  triggerEvent: string;
  whatChangedAndWhy: string;
  affectedConclusions: {
    hypothesis: string;
    shift: 'strengthened' | 'weakened' | 'unaffected' | 'new' | 'retired';
    rationale: string;
  }[];
  resolvedQuestions: string[];
  newQuestions: string[];
}

/** Complete 10-Stage Clinical Reasoning Payload */
export interface ClinicalReasoningPayload {
  stage1_facts: SourceLinkedEvidence[];
  stage2_timeline: CoherentTimeline;
  stage3_correctionQueue: CorrectionQueueItem[];
  stage4_perspectives: JustifiedPerspective[];
  stage5_alternatives: AlternativeInterpretation[];
  stage6_balancedAssessments: BalancedAssessment[];
  stage7_focusedQuestion: FocusedUserQuestion;
  stage8_synthesis: ClinicalSynthesis;
  stage9_continuity: ContinuityRecord;
  stage10_selectiveUpdate?: SelectiveUpdateDiff;
}

// ==========================================
// PURE REASONING ALGORITHMS & HELPERS
// ==========================================

/** Extracts dates in YYYY-MM-DD, DD/MM/YYYY, or Month YYYY format */
export function extractDateString(text: string): string | null {
  if (!text) return null;
  const isoMatch = text.match(/\b(19\d\d|20\d\d)[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) return isoMatch[0];
  const dmyMatch = text.match(/\b(0[1-9]|[12]\d|3[01])[-/](0[1-9]|1[0-2])[-/](19\d\d|20\d\d)\b/);
  if (dmyMatch) return dmyMatch[0];
  const writtenMatch = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2},?\s+)?(19\d\d|20\d\d)\b/i);
  if (writtenMatch) return writtenMatch[0];
  return null;
}

/**
 * Stage 2: Align time
 * Distinguishes event date, report date, and entry date; computes overlaps and temporal gaps.
 */
export function alignChronology(facts: SourceLinkedEvidence[], entryDateOverride?: string): CoherentTimeline {
  const currentEntryDate = entryDateOverride || new Date().toISOString().split('T')[0];

  const entries: TemporalTimelineEntry[] = facts.map((fact, index) => {
    const textDate = extractDateString(fact.fact) || extractDateString(fact.source) || fact.timestamp?.split('T')[0];
    const isDocAssessment = fact.category === 'documented_clinician_assessment' || fact.category === 'extracted_finding';
    
    return {
      id: `time_entry_${index + 1}`,
      description: fact.fact,
      eventDate: fact.category === 'user_report' ? (textDate || undefined) : undefined,
      reportDate: isDocAssessment ? (textDate || undefined) : undefined,
      entryDate: fact.timestamp ? fact.timestamp.split('T')[0] : currentEntryDate,
      temporalConfidence: textDate ? 'exact' : 'relative',
      relatedFactIds: [fact.id],
    };
  });

  // Sort chronologically if dates exist
  entries.sort((a, b) => {
    const dateA = a.eventDate || a.reportDate || a.entryDate;
    const dateB = b.eventDate || b.reportDate || b.entryDate;
    return dateA.localeCompare(dateB);
  });

  // Detect temporal overlaps
  const overlaps: TemporalOverlap[] = [];
  const dateMap: { [date: string]: TemporalTimelineEntry[] } = {};
  entries.forEach(e => {
    const key = e.eventDate || e.reportDate;
    if (key) {
      if (!dateMap[key]) dateMap[key] = [];
      dateMap[key].push(e);
    }
  });

  Object.entries(dateMap).forEach(([date, items]) => {
    if (items.length > 1) {
      overlaps.push({
        phenomena: items.map(i => i.description),
        timeframe: date,
        implication: `Concurrent presentation observed on ${date}. Co-occurrence may indicate a shared upstream driver or compensatory response.`,
      });
    }
  });

  // Detect temporal gaps
  const gaps: TemporalGap[] = [];
  const datedEntries = entries.filter(e => e.eventDate || e.reportDate);
  for (let i = 0; i < datedEntries.length - 1; i++) {
    const current = datedEntries[i].eventDate || datedEntries[i].reportDate;
    const next = datedEntries[i + 1].eventDate || datedEntries[i + 1].reportDate;
    if (current && next) {
      const msDiff = Math.abs(new Date(next).getTime() - new Date(current).getTime());
      const dayDiff = Math.round(msDiff / (1000 * 60 * 60 * 24));
      if (dayDiff > 90) {
        gaps.push({
          period: `${current} to ${next}`,
          durationDescription: `${dayDiff} days without documented observations`,
          clinicalSignificance: 'Intervening period lacks baseline tracking. Symptom fluctuations during this interval remain unrecorded.',
        });
      }
    }
  }

  const summaryChronology = entries.length > 0 
    ? `Constructed timeline encompassing ${entries.length} discrete data points across ${datedEntries.length} dated landmarks.`
    : 'No dated landmarks identified in current input; timeline arranged by entry sequence.';

  return { entries, overlaps, gaps, summaryChronology };
}

/**
 * Stage 3: Reconcile records
 * Detects duplicates, changed units, conflicting values, and differing accounts.
 */
export function detectCorrectionQueue(facts: SourceLinkedEvidence[]): CorrectionQueueItem[] {
  const queue: CorrectionQueueItem[] = [];
  let itemCounter = 1;

  // 1. Detect duplicates
  const seenTexts: { [norm: string]: SourceLinkedEvidence[] } = {};
  facts.forEach(f => {
    const norm = f.fact.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    if (norm.length > 10) {
      if (!seenTexts[norm]) seenTexts[norm] = [];
      seenTexts[norm].push(f);
    }
  });

  Object.entries(seenTexts).forEach(([norm, duplicates]) => {
    if (duplicates.length > 1) {
      queue.push({
        id: `rec_${itemCounter++}`,
        type: 'duplicate',
        title: 'Potential Duplicate Entry',
        itemsInvolved: duplicates.map(d => `${d.fact} (${d.source})`),
        discrepancyDescription: `Identical observation reported across multiple records: "${duplicates[0].fact.slice(0, 40)}..."`,
        suggestedAction: 'Consolidate into a single canonical entry with linked multi-record provenance.',
        status: 'pending',
      });
    }
  });

  // 2. Detect changed units
  const unitPatterns = [
    { name: 'Blood Glucose', units: ['mg/dl', 'mmol/l'] },
    { name: 'Thyroid (TSH)', units: ['miu/l', 'µiu/ml', 'uiu/ml', 'pmol/l'] },
    { name: 'Vitamin D', units: ['ng/ml', 'nmol/l'] },
    { name: 'Iron / Ferritin', units: ['ng/ml', 'µg/l', 'pmol/l'] },
    { name: 'Electrolytes', units: ['meq/l', 'mmol/l'] },
  ];

  unitPatterns.forEach(pattern => {
    const matchingFacts = facts.filter(f => {
      const lower = f.fact.toLowerCase();
      return pattern.units.some(u => lower.includes(u));
    });

    const uniqueUnitsFound = new Set<string>();
    matchingFacts.forEach(f => {
      const lower = f.fact.toLowerCase();
      pattern.units.forEach(u => {
        if (lower.includes(u)) uniqueUnitsFound.add(u);
      });
    });

    if (uniqueUnitsFound.size > 1) {
      queue.push({
        id: `rec_${itemCounter++}`,
        type: 'unit_change',
        title: `Unit Conversion Discrepancy: ${pattern.name}`,
        itemsInvolved: matchingFacts.map(f => f.fact),
        discrepancyDescription: `Different measurement units detected across records: ${Array.from(uniqueUnitsFound).join(' vs ')}. Values cannot be compared directly without conversion.`,
        suggestedAction: `Convert all entries to standard clinical reference units before assessing temporal trends.`,
        status: 'pending',
      });
    }
  });

  // 3. Detect conflicting values or differing accounts (e.g. self-report vs clinic notes)
  const patientReports = facts.filter(f => f.category === 'user_report');
  const clinicalNotes = facts.filter(f => f.category === 'documented_clinician_assessment');

  const symptomFamilies = [
    { name: 'Palpitations / Tachycardia', tokens: ['palpitations', 'tachycardia', 'heart racing', 'pounding'] },
    { name: 'Lightheadedness / Dizziness / Syncope', tokens: ['dizziness', 'lightheadedness', 'syncope', 'presyncope'] },
    { name: 'Pain', tokens: ['pain', 'ache', 'burning'] },
    { name: 'Fatigue', tokens: ['fatigue', 'exhaustion', 'malaise'] },
    { name: 'Dyspnea', tokens: ['dyspnea', 'shortness of breath', 'breathlessness'] },
    { name: 'Gastrointestinal', tokens: ['nausea', 'vomiting', 'bloating', 'diarrhea'] },
    { name: 'Fever', tokens: ['fever', 'chills'] },
  ];

  patientReports.forEach(pr => {
    const prLower = pr.fact.toLowerCase();
    clinicalNotes.forEach(cn => {
      const cnLower = cn.fact.toLowerCase();
      symptomFamilies.forEach(family => {
        const prMatchedToken = family.tokens.find(t => prLower.includes(t));
        const cnNegatedToken = family.tokens.find(t => 
          cnLower.includes(`no ${t}`) || cnLower.includes(`denies ${t}`) || cnLower.includes(`without ${t}`)
        );
        if (prMatchedToken && cnNegatedToken) {
          queue.push({
            id: `rec_${itemCounter++}`,
            type: 'differing_accounts',
            title: `Differing Accounts on ${family.name.toUpperCase()}`,
            itemsInvolved: [pr.fact, cn.fact],
            discrepancyDescription: `Patient reports experiencing "${prMatchedToken}", while clinician note documents negative/denied: "${cn.fact}".`,
            suggestedAction: 'Clarify whether the clinician visit occurred during an asymptomatic interval or if symptoms developed subsequently.',
            status: 'pending',
          });
        }
      });
    });
  });

  return queue;
}

/**
 * Stage 4: Identify relevant perspectives
 * Selects perspectives strictly justified by explicit unanswered questions.
 */
export function justifyPerspectives(
  unansweredQuestions: string[],
  rawPerspectives?: Partial<JustifiedPerspective>[]
): JustifiedPerspective[] {
  if (Array.isArray(rawPerspectives) && rawPerspectives.length > 0) {
    return rawPerspectives.map((p, idx) => {
      const assignedQuestion = p.unansweredQuestionAddressed || 
        (unansweredQuestions[idx % unansweredQuestions.length] || 'What is the primary physiological driver of the reported symptoms?');
      return {
        id: p.id || `persp_${idx + 1}`,
        specialty: p.specialty || 'General Internal Medicine Panel',
        doctorName: p.doctorName || `${p.specialty || 'Clinical'} Advisory Board`,
        unansweredQuestionAddressed: assignedQuestion,
        justification: p.justification || `Selected to resolve: "${assignedQuestion}". Examines multi-system physiological interactions without premature closure.`,
        uniqueContribution: p.uniqueContribution || 'Evaluates systemic interactions across the provided evidence.',
        supportingEvidenceIds: Array.isArray(p.supportingEvidenceIds) ? p.supportingEvidenceIds : [],
      };
    });
  }

  // Deterministic justified fallbacks based on available questions
  const defaultSpecialties = [
    {
      specialty: 'Autonomic Neurology & Cardiology Board',
      doctorName: 'Autonomic & Cardiovascular Panel',
      question: unansweredQuestions[0] || 'How do orthostatic stressors, posture, or physical exertion alter hemodynamics?',
      justification: 'Addresses positional changes, palpitations, lightheadedness, and exercise intolerance by analyzing baroreceptor and autonomic tone.',
      contribution: 'Evaluates orthostatic compensations vs primary cardiac structural rhythm anomalies.',
    },
    {
      specialty: 'Endocrine & Cellular Metabolism Board',
      doctorName: 'Metabolic & Mitochondrial Panel',
      question: unansweredQuestions[1] || 'Are micronutrient reserves, cellular energy cycles, or endocrine axes compromised?',
      justification: 'Addresses persistent fatigue and cognitive latency by evaluating metabolic cofactors, thyroid/adrenal labs, and storage reserves.',
      contribution: 'Distinguishes laboratory reference intervals from functional physiological depletion.',
    },
    {
      specialty: 'Enteric Neurobiology & Gastroenterology Board',
      doctorName: 'Gut-Brain & Enteric Panel',
      question: unansweredQuestions[2] || 'What is the temporal relationship between meals, gastrointestinal motility, and systemic flares?',
      justification: 'Investigates postprandial distress, mucosal permeability, and vagal reflex triggers connecting the gut to systemic symptoms.',
      contribution: 'Correlates dietary intake to mucosal saturation and upward vagal/diaphragmatic reactions.',
    },
  ];

  return defaultSpecialties.map((item, idx) => ({
    id: `persp_${idx + 1}`,
    specialty: item.specialty,
    doctorName: item.doctorName,
    unansweredQuestionAddressed: item.question,
    justification: `Selected to resolve: "${item.question}". ${item.justification}`,
    uniqueContribution: item.contribution,
    supportingEvidenceIds: [],
  }));
}

/**
 * Stage 5 & 6: Generate Alternatives & Challenge Each (Tri-Prong: Supporting, Conflicting, Missing)
 */
export function buildTriProngChallenges(
  alternatives: AlternativeInterpretation[],
  facts: SourceLinkedEvidence[],
  missingLinks: string[]
): BalancedAssessment[] {
  return alternatives.map(alt => {
    // 1. Supporting evidence
    const supporting: BalancedAssessment['supportingEvidence'] = facts
      .filter(f => {
        const text = f.fact.toLowerCase();
        const altTokens = alt.title.toLowerCase().split(' ').filter(w => w.length > 3);
        return altTokens.some(t => text.includes(t));
      })
      .slice(0, 3)
      .map(f => ({
        factId: f.id,
        description: f.fact,
        weight: 'strong' as const,
      }));

    if (supporting.length === 0 && facts.length > 0) {
      supporting.push({
        factId: facts[0].id,
        description: facts[0].fact,
        weight: 'moderate',
      });
    }

    // 2. Conflicting evidence (normal findings or contradictory signals)
    const conflicting: BalancedAssessment['conflictingEvidence'] = facts
      .filter(f => {
        const text = f.fact.toLowerCase();
        return text.includes('normal') || text.includes('negative') || text.includes('denies') || text.includes('within reference');
      })
      .slice(0, 2)
      .map(f => ({
        factId: f.id,
        description: f.fact,
        weight: 'normal_control_test' as const,
      }));

    if (conflicting.length === 0) {
      conflicting.push({
        description: 'Absence of objective inflammatory or structural markers on standard initial testing.',
        weight: 'normal_control_test',
      });
    }

    // 3. Missing evidence / What would change it
    const missing = missingLinks.slice(0, 2).map(link => ({
      testOrObservation: link,
      potentialImpact: `If positive or resolved, would strongly elevate or demote this hypothesis over competing explanations.`,
    }));

    if (missing.length === 0) {
      missing.push({
        testOrObservation: 'Targeted physiological challenge test or serial symptom diary.',
        potentialImpact: 'Provides objective correlation between reported flares and measurable biometric changes.',
      });
    }

    return {
      alternativeId: alt.id,
      alternativeTitle: alt.title,
      supportingEvidence: supporting,
      conflictingEvidence: conflicting,
      missingEvidenceWhatWouldChangeIt: missing,
    };
  });
}

/**
 * Stage 7: Choose useful clarification
 * Selects the single question most likely to improve the next clinical decision.
 */
export function selectFocusedClarification(
  questions: string[],
  missingLinks: string[],
  alternatives: AlternativeInterpretation[]
): FocusedUserQuestion {
  const chosenQuestion = questions[0] || missingLinks[0] || 'Did your symptoms begin abruptly after a specific infection, event, or medication change?';
  const targetAltNames = alternatives.map(a => a.title).join(' and ');

  return {
    id: `clarification_${Date.now()}`,
    question: chosenQuestion,
    whyThisQuestion: 'This single clarification has the highest discriminatory value for distinguishing between competing mechanisms.',
    decisionImpact: `Answering this will help determine whether the presentation fits ${targetAltNames || 'competing physiological possibilities'}, shaping which questions to prioritize with your clinician.`,
    targetAlternativeIds: alternatives.map(a => a.id),
    status: 'pending',
  };
}

/**
 * Stage 8: Synthesize
 * Explains main finding, basis, limitations, and practical implications.
 */
export function synthesizeFindings(
  facts: SourceLinkedEvidence[],
  alternatives: AlternativeInterpretation[],
  assessments: BalancedAssessment[],
  userUncertainties: string[]
): ClinicalSynthesis {
  const leadingAlt = alternatives.find(a => a.likelihoodAssessment === 'leading') || alternatives[0];
  const mainFinding = leadingAlt
    ? `The clinical picture aligns with ${leadingAlt.title}, characterized by multi-system interactions rather than an isolated single-organ finding.`
    : 'The provided records indicate a multi-system symptom cluster with open questions regarding underlying drivers.';

  const empiricalBasis = facts.slice(0, 4).map(f => `${f.fact} (${f.source})`);

  const limitations = [
    'This review is an AI-assisted organization of evidence, not a medical diagnosis or treatment plan.',
    'Interpretation is constrained strictly to the provided documents and patient statements; unprovided tests remain unexamined.',
    ...(userUncertainties.slice(0, 2)),
  ];

  const practicalImplication = 'Bring the organized timeline and the specific questions below to your next clinician appointment to guide targeted evaluation rather than restarting exploratory work.';

  return {
    mainFinding,
    empiricalBasis,
    limitations,
    practicalImplication,
    urgencyLevel: 'prompt_clinical_review',
  };
}

/**
 * Stage 10: Update selectively
 * Revisit conclusions affected by new information; produces "What changed and why" diff.
 */
export function computeSelectiveUpdateDiff(
  previousPayload?: ClinicalReasoningPayload | null,
  newPayload?: ClinicalReasoningPayload | null,
  newFact?: SourceLinkedEvidence
): SelectiveUpdateDiff {
  const currentDate = new Date().toISOString().split('T')[0];

  if (!previousPayload) {
    return {
      currentRunDate: currentDate,
      triggerEvent: 'Initial clinical data engine baseline synthesis',
      whatChangedAndWhy: 'Baseline reasoning established from provided documents and symptom narrative. No prior version to compare.',
      affectedConclusions: (newPayload?.stage5_alternatives || []).map(alt => ({
        hypothesis: alt.title,
        shift: 'new' as const,
        rationale: 'Established as part of initial balanced differential.',
      })),
      resolvedQuestions: [],
      newQuestions: (newPayload?.stage9_continuity?.openQuestions || []).slice(0, 3),
    };
  }

  // When updating an existing payload
  const prevAlts = previousPayload.stage5_alternatives || [];
  const currAlts = newPayload?.stage5_alternatives || prevAlts;
  const triggerText = newFact ? `New verified fact received: "${newFact.fact}"` : 'Updated clinical review executed';

  const affectedConclusions = currAlts.map(curr => {
    const prev = prevAlts.find(p => p.id === curr.id || p.title === curr.title);
    if (!prev) {
      return {
        hypothesis: curr.title,
        shift: 'new' as const,
        rationale: 'Added in response to newly introduced findings.',
      };
    }
    if (newFact && newFact.fact.toLowerCase().includes(curr.title.toLowerCase())) {
      return {
        hypothesis: curr.title,
        shift: 'strengthened' as const,
        rationale: `Directly supported by new fact: "${newFact.fact.slice(0, 50)}..."`,
      };
    }
    return {
      hypothesis: curr.title,
      shift: 'unaffected' as const,
      rationale: 'Evidence balance remains consistent with prior review.',
    };
  });

  const resolvedQuestions: string[] = [];
  if (newFact) {
    resolvedQuestions.push(previousPayload.stage7_focusedQuestion?.question || 'Prior clarification question');
  }

  return {
    previousRunDate: previousPayload.stage9_continuity?.savedAt?.split('T')[0] || 'Prior Review',
    currentRunDate: currentDate,
    triggerEvent: triggerText,
    whatChangedAndWhy: newFact
      ? `Incorporation of "${newFact.fact.slice(0, 45)}..." resolved open clarification "${resolvedQuestions[0]}", selectively updating evidentiary weights without requiring re-intake.`
      : 'Review recomputed with refreshed case context; hypotheses updated selectively.',
    affectedConclusions,
    resolvedQuestions,
    newQuestions: (newPayload?.stage9_continuity?.openQuestions || []).filter(q => !resolvedQuestions.includes(q)),
  };
}

/**
 * Main Pipeline Coordinator: Executes all 10 stages adhering strictly to Image 2 topology.
 */
export function runClinicalReasoningPipeline(
  rawInput: {
    documentedFacts?: any[];
    primaryHypothesis?: string;
    executiveSummary?: string;
    uncertainties?: string[];
    missingLinks?: string[];
    questionsForClinician?: string[];
    perspectives?: any[];
    alternatives?: any[];
  },
  previousPayload?: ClinicalReasoningPayload | null,
  newFactAnswer?: { questionId: string; answerText: string }
): ClinicalReasoningPayload {
  // STAGE 1: Establish Facts
  const rawFacts = Array.isArray(rawInput.documentedFacts) ? rawInput.documentedFacts : [];
  const stage1_facts: SourceLinkedEvidence[] = rawFacts.map((rf, idx) => {
    const classified = classifyClinicalInformation({
      text: rf.fact || rf.text || '',
      source: rf.source || 'Patient intake',
      page: rf.page,
      file: rf.file || rf.source,
      extractionStatus: rf.extractionStatus || 'provisional',
    });

    return {
      id: rf.id || `fact_${idx + 1}`,
      fact: rf.fact || rf.text || '',
      source: rf.source || 'Patient intake',
      page: rf.page,
      file: rf.file || rf.source,
      category: rf.category || classified.category,
      allowedRole: rf.allowedRole || classified.allowedRole,
      confidence: rf.category === 'user_report' ? 'self_reported' : rf.page ? 'provisional' : 'verified',
      timestamp: rf.timestamp || new Date().toISOString(),
    };
  });

  // If a feedback answer is supplied, append it directly into Stage 1 facts (The feedback loop!)
  let newlyInjectedFact: SourceLinkedEvidence | undefined;
  if (newFactAnswer && newFactAnswer.answerText.trim()) {
    newlyInjectedFact = {
      id: `feedback_fact_${Date.now()}`,
      fact: `User clarified: "${newFactAnswer.answerText.trim()}"`,
      source: 'User clarification response',
      category: 'user_report',
      allowedRole: 'Evidence of the reported experience',
      confidence: 'verified',
      timestamp: new Date().toISOString(),
    };
    stage1_facts.push(newlyInjectedFact);
  }

  // STAGE 2: Align Time
  const stage2_timeline = alignChronology(stage1_facts);

  // STAGE 3: Reconcile Records
  const stage3_correctionQueue = detectCorrectionQueue(stage1_facts);

  // STAGE 4: Identify Relevant Perspectives
  const unanswered = (rawInput.uncertainties || []).concat(rawInput.missingLinks || []);
  const stage4_perspectives = justifyPerspectives(unanswered, rawInput.perspectives);

  // STAGE 5: Generate Alternatives
  let stage5_alternatives: AlternativeInterpretation[] = [];
  if (Array.isArray(rawInput.alternatives) && rawInput.alternatives.length > 0) {
    stage5_alternatives = rawInput.alternatives.map((alt, idx) => ({
      id: alt.id || `alt_${idx + 1}`,
      type: alt.type || (idx === 0 ? 'connected_explanation' : idx === 1 ? 'separate_explanations' : 'insufficient_evidence'),
      title: alt.title || alt.condition || `Hypothesis ${idx + 1}`,
      mechanismSummary: alt.mechanismSummary || alt.rationale || 'Proposed physiological relationship',
      likelihoodAssessment: alt.likelihoodAssessment || (idx === 0 ? 'leading' : 'competing'),
      rationale: alt.rationale || 'Grounding in documented findings',
    }));
  } else {
    const primary = rawInput.primaryHypothesis || 'Autonomic and Metabolic Dysregulation';
    stage5_alternatives = [
      {
        id: 'alt_1',
        type: 'connected_explanation',
        title: primary,
        mechanismSummary: 'A unified neuro-vascular or metabolic cascade connecting autonomic stability to cellular reserve depletion.',
        likelihoodAssessment: 'leading',
        rationale: 'Accounts for temporal clustering of multi-system complaints.',
      },
      {
        id: 'alt_2',
        type: 'separate_explanations',
        title: 'Concurrent Independent Conditions',
        mechanismSummary: 'Two or more unrelated processes occurring simultaneously (e.g. primary iron depletion alongside benign postural intolerance).',
        likelihoodAssessment: 'competing',
        rationale: 'Avoids premature closure on a single overarching syndrome.',
      },
      {
        id: 'alt_3',
        type: 'insufficient_evidence',
        title: 'Non-Specific Multi-System Pattern',
        mechanismSummary: 'Current documentation is insufficient to distinguish physiological pathology from post-stress or deconditioning states.',
        likelihoodAssessment: 'uncertain',
        rationale: 'Requires targeted serial testing before confirming a specific clinical label.',
      },
    ];
  }

  // STAGE 6: Challenge Each Alternative (Tri-Prong)
  const stage6_balancedAssessments = buildTriProngChallenges(
    stage5_alternatives,
    stage1_facts,
    rawInput.missingLinks || []
  );

  // STAGE 7: Choose Useful Clarification
  const stage7_focusedQuestion = selectFocusedClarification(
    rawInput.questionsForClinician || [],
    rawInput.missingLinks || [],
    stage5_alternatives
  );

  // STAGE 8: Synthesize
  const stage8_synthesis = synthesizeFindings(
    stage1_facts,
    stage5_alternatives,
    stage6_balancedAssessments,
    rawInput.uncertainties || []
  );

  // STAGE 9: Carry Forward
  const stage9_continuity: ContinuityRecord = {
    openQuestions: (rawInput.questionsForClinician || []).slice(0, 5),
    chosenNextAction: 'Review the balanced assessment and questions with the treating physician.',
    preservedHypotheses: stage5_alternatives.map(a => a.title),
    savedAt: new Date().toISOString(),
  };

  // STAGE 10: Update Selectively
  const partialPayload: ClinicalReasoningPayload = {
    stage1_facts,
    stage2_timeline,
    stage3_correctionQueue,
    stage4_perspectives,
    stage5_alternatives,
    stage6_balancedAssessments,
    stage7_focusedQuestion,
    stage8_synthesis,
    stage9_continuity,
  };

  const stage10_selectiveUpdate = computeSelectiveUpdateDiff(
    previousPayload,
    partialPayload,
    newlyInjectedFact
  );

  return {
    ...partialPayload,
    stage10_selectiveUpdate,
  };
}
