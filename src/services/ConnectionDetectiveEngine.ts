import { updateCaseConnectionMap } from './CaseEngine';
import { getUnifiedCaseScope } from './caseWorkspace';
import { getProfile } from './ProfileEngine';
import { getItemSync, setItemSync } from './storage';

export interface ConnectionStream {
  id: 'labs' | 'notes' | 'vitals' | 'diet';
  title: string;
  icon: string;
  color: string;
  count: number;
  status: string;
  items: string[];
}

export interface SpecialistDialogue {
  role: string;
  doctorName: string;
  specialty: string;
  icon: string;
  color: string;
  bg: string;
  finding: string;
  organ: string;
  credentials: string;
}

export interface ClinicalMissItem {
  overlookedBy: string;
  standardFinding: string;
  whatWasMissed: string;
  clinicalImpact: string;
  hiddenConnection: string;
}

export interface NodeDetail {
  id: string;
  title: string;
  system: 'autonomic' | 'metabolic' | 'gut' | 'neuro' | 'immune' | 'vascular';
  systemName: string;
  systemIcon: string;
  confidence: number;
  biochemicalMechanism: string;
  biomarkers: {
    name: string;
    standardRange: string;
    optimalRange: string;
    userValue: string;
    status: 'depleted' | 'elevated' | 'suboptimal' | 'normal';
    clinicalNote: string;
  }[];
  dietaryTriggers: {
    name: string;
    category: string;
    icon: string;
    impact: string;
  }[];
  specialistQuote: {
    doctor: string;
    role: string;
    quote: string;
  };
  whatDoctorsMissed: string;
  confirmatoryWorkup: string[];
}

export interface CausalCascadeStage {
  stage: number;
  title: string;
  organSystem: string;
  organIcon: string;
  mechanism: string;
  clinicalSigns: string[];
  biochemicalLag: string;
  upstreamCause: string;
  downstreamEffect: string;
}

export interface SymptomClusterItem {
  id: string;
  name: string;
  icon: string;
  commonMisattribution: string;
  rootCauseAxis: string;
  involvedBoards: string[];
}

export interface SystemAxis {
  id: 'all' | 'autonomic' | 'metabolic' | 'gut' | 'neuro' | 'immune';
  label: string;
  icon: string;
  color: string;
  count: number;
}

export interface ConnectionMapGraph {
  centralSymptoms: {
    id: string;
    label: string;
    severity: 'high' | 'medium' | 'low';
    system?: string;
  }[];
  conditions: {
    id: string;
    label: string;
    confidence: number;
    specialty: string;
    category:
      'metabolic' | 'autonomic' | 'gastrointestinal' | 'inflammatory' | 'vascular' | 'neuro';
    rationale: string;
  }[];
  connections: {
    from: string;
    to: string;
    type: 'shared_symptom' | 'causal_progression' | 'differential_overlap' | 'common_mechanism';
    label: string;
    strength: 'strong' | 'moderate' | 'weak';
    whyItExists?: string;
    supportingEvidenceIds?: string[];
    weakeningFactors?: string[];
  }[];
  precautions: {
    text: string;
    severity: 'red_flag' | 'watch' | 'info';
    relatedConditions: string[];
  }[];
  missingEvidence: {
    test: string;
    wouldDifferentiate: string[];
    urgency: string;
    recommendedSpecialists: string;
  }[];
  narrative: string;
}

export interface ConnectionDetectiveReport {
  id: string;
  generatedAt: string;
  patientName: string;
  primaryHypothesis: string;
  matchConfidence: number;
  streams: ConnectionStream[];
  consensusDialogue: SpecialistDialogue[];
  clinicalMisses: ClinicalMissItem[];
  mapData: ConnectionMapGraph;
  systemAxes: SystemAxis[];
  cascadeStages: CausalCascadeStage[];
  symptomCluster: SymptomClusterItem[];
  nodeDetails: Record<string, NodeDetail>;
  doctorDossier: {
    sbar: {
      situation: string;
      background: string;
      assessment: string;
      recommendation: string;
    };
    testsToOrder: { test: string; rationale: string; priority: 'High' | 'Routine' }[];
    icdCodes: { code: string; label: string }[];
    citations: string[];
  };
}

export function getConnectionDetectiveReport(
  customReviewReport?: any,
  customCaseItem?: any
): ConnectionDetectiveReport {
  const caseItem = customCaseItem !== undefined ? customCaseItem : getUnifiedCaseScope().caseItem;
  const saved = customReviewReport || caseItem?.reviews?.[0]?.report;
  // Legacy snapshots remain in history, but must be re-reviewed before their
  // template findings can populate a patient-facing clinical map.
  const review = saved?.groundingVersion === 1 ? saved : null;
  const facts = review?.documentedFacts || [];
  const perspectives = review?.meaningfulPerspectives || [];
  const alternatives = review?.reasoningPipeline?.stage5_alternatives || [];
  const assessments = review?.reasoningPipeline?.stage6_balancedAssessments || [];
  const nodeDetails: Record<string, NodeDetail> = {};
  for (const alternative of alternatives)
    nodeDetails[alternative.id] = {
      id: alternative.id,
      title: alternative.title,
      system: 'neuro',
      systemName: 'Case review',
      systemIcon: '📄',
      confidence: 0,
      biochemicalMechanism: alternative.mechanismSummary || 'No mechanism established.',
      biomarkers: [],
      dietaryTriggers: [],
      specialistQuote: {
        doctor: 'AI consideration',
        role: 'Evidence review',
        quote: alternative.rationale || '',
      },
      whatDoctorsMissed: 'No conclusion about prior clinical care is made.',
      confirmatoryWorkup: (
        assessments.find((a: any) => a.alternativeId === alternative.id)
          ?.missingEvidenceWhatWouldChangeIt || []
      ).map((m: any) => m.testOrObservation),
    };

  const stream = (
    id: ConnectionStream['id'],
    title: string,
    items: string[],
    color: string
  ): ConnectionStream => ({
    id,
    title,
    icon: '',
    items,
    count: items.length,
    status: items.length ? 'Recorded observations' : 'No records linked',
    color,
  });
  return {
    id: caseItem?.id || 'unassigned',
    generatedAt: caseItem?.reviews?.[0]?.createdAt || '',
    patientName: getProfile()?.name || '',
    primaryHypothesis:
      review?.primaryHypothesis || 'Run a source-linked review to explore this case',
    matchConfidence: 0,
    streams: [
      stream(
        'labs',
        'Lab & Blood Tests',
        facts.filter((f: any) => f.category === 'extracted_finding').map((f: any) => f.fact),
        '#0284C7'
      ),
      stream(
        'notes',
        'Doctor & Clinic Notes',
        facts
          .filter((f: any) => f.category === 'documented_clinician_assessment')
          .map((f: any) => f.fact),
        '#7C3AED'
      ),
      stream(
        'vitals',
        'Wearables & Vitals',
        facts.filter((f: any) => f.category === 'recorded_measurement').map((f: any) => f.fact),
        '#0D9488'
      ),
      stream(
        'diet',
        'Reported Observations',
        facts.filter((f: any) => f.category === 'user_report').map((f: any) => f.fact),
        '#0D9488'
      ),
    ],
    consensusDialogue: perspectives.map((p: any) => ({
      role: 'AI perspective',
      doctorName: p.doctorName,
      specialty: p.specialty,
      icon: '📄',
      color: '#0D9488',
      bg: '#F0FDFA',
      finding: p.interpretation,
      organ: p.questionAddressed,
      credentials: 'AI-generated; not a clinician consultation',
    })),
    clinicalMisses: (review?.missingLinks || []).map((question: string) => ({
      overlookedBy: 'Not established',
      standardFinding: 'Open information gap',
      whatWasMissed: question,
      clinicalImpact: 'Review this question in context.',
      hiddenConnection: 'No hidden connection assumed.',
    })),
    cascadeStages: [],
    symptomCluster: facts
      .filter((f: any) => f.category === 'user_report')
      .map((f: any) => ({
        id: f.id,
        name: f.fact,
        icon: '📄',
        commonMisattribution: 'User-reported observation',
        rootCauseAxis: 'Not established',
        involvedBoards: perspectives
          .filter((p: any) => p.evidenceConsidered.includes(f.id))
          .map((p: any) => p.specialty),
      })),
    nodeDetails,
    systemAxes: [
      { id: 'all', label: 'All evidence', icon: '📄', color: '#0D9488', count: facts.length },
    ],
    mapData: {
      centralSymptoms: facts
        .filter((f: any) => f.category === 'user_report')
        .map((f: any) => ({ id: f.id, label: f.fact, severity: 'low' as const })),
      conditions: alternatives.map((a: any) => ({
        id: a.id,
        label: a.title,
        confidence: 0,
        specialty: 'AI consideration',
        category: 'neuro' as const,
        rationale: a.mechanismSummary || '',
      })),
      connections: assessments.flatMap((a: any) =>
        (a.supportingEvidence || []).map((e: any) => ({
          from: a.alternativeId,
          to: e.factId,
          type: 'differential_overlap' as const,
          label: 'Proposed relationship',
          strength: 'weak' as const,
          whyItExists: e.description,
          supportingEvidenceIds: [e.factId],
          weakeningFactors: (a.conflictingEvidence || []).map((c: any) => c.description),
        }))
      ),
      precautions: [],
      missingEvidence: [],
      narrative: review?.executiveSummary || 'No grounded review available.',
    },
    doctorDossier: {
      sbar: {
        situation: caseItem?.intakeData?.chiefComplaint || '',
        background: facts
          .slice(0, 4)
          .map((f: any) => f.fact)
          .join('\n'),
        assessment: review?.executiveSummary || '',
        recommendation: (review?.questionsForClinician || []).join('\n'),
      },
      testsToOrder: [],
      icdCodes: [],
      citations: [],
    },
  };
}

export function getSymptomCluster(): SymptomClusterItem[] {
  return getConnectionDetectiveReport().symptomCluster;
}

export function evaluateSymptomCluster(selectedIds: string[]): {
  matchConfidence: number;
  summonedBoards: string[];
  primaryAxes: string[];
  summaryNote: string;
} {
  const cluster = getSymptomCluster().filter((item) => selectedIds.includes(item.id));
  return {
    matchConfidence: 0,
    summonedBoards: [],
    primaryAxes: [],
    summaryNote:
      cluster.length +
      ' recorded observations selected. Selection alone does not establish a shared cause.',
  };
}

// ─────────────────────────────────────────────────────────────
// 5. DUAL-BAND OPTIMAL FUNCTIONAL LAB BIOMARKERS ENGINE
// ─────────────────────────────────────────────────────────────
export interface FunctionalBiomarker {
  id: string;
  name: string;
  category: 'metabolic' | 'endocrine' | 'immune' | 'enteric' | 'neuromuscular';
  categoryLabel: string;
  categoryIcon: string;
  standardRange: { min: number; max: number; unit: string; label: string };
  optimalRange: { min: number; max: number; unit: string; label: string };
  userValue: number;
  userUnit: string;
  status: 'critical_low' | 'suboptimal_low' | 'optimal' | 'suboptimal_high' | 'critical_high';
  clinicalSummary: string;
  whyDoctorsMissIt: string;
  actionableDietaryCofactors: string[];
  retestTimeline: string;
  originalValue?: string;
  originalRange?: string;
  comparator?: '<' | '<=' | '>' | '>=' | '=';
  isComparable?: boolean;
  extractionState?: 'parsed' | 'needs_review';
}

export function getFunctionalBiomarkers(): FunctionalBiomarker[] {
  const saved = getUnifiedCaseScope().caseItem?.reviews?.[0]?.report as any;
  if (saved?.groundingVersion !== 1) return [];
  return (saved.functionalBiomarkers || []).map((b: any, index: number) => {
    const rawValue = String(b.value ?? '').trim();
    const suppliedRange = b.standardRange ?? b.referenceRange ?? '';
    const rawRange =
      typeof suppliedRange === 'object' && suppliedRange !== null
        ? `${suppliedRange.min ?? ''}${suppliedRange.min != null && suppliedRange.max != null ? ' - ' : ''}${suppliedRange.max ?? ''}${suppliedRange.unit ? ` ${suppliedRange.unit}` : ''}`.trim()
        : String(suppliedRange).trim();
    const valueMatch = rawValue.match(/^\s*(<=|>=|<|>|=)?\s*(-?\d+(?:\.\d+)?)\s*(.*)$/);
    const interval = rawRange.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
    const upper = rawRange.match(/^\s*(?:<=|<)\s*(-?\d+(?:\.\d+)?)/);
    const lower = rawRange.match(/^\s*(?:>=|>)\s*(-?\d+(?:\.\d+)?)/);
    const value = valueMatch ? Number(valueMatch[2]) : 0;
    const unit = String(valueMatch?.[3] || b.unit || '').trim();
    let min = Number.NEGATIVE_INFINITY;
    let max = Number.POSITIVE_INFINITY;
    if (interval) {
      min = Number(interval[1]);
      max = Number(interval[2]);
    } else if (upper) {
      max = Number(upper[1]);
    } else if (lower) {
      min = Number(lower[1]);
    }
    const hasExactValue = !valueMatch?.[1] || valueMatch[1] === '=';
    const isComparable = Boolean(valueMatch && hasExactValue && (interval || upper || lower));
    const normalizedMin = Number.isFinite(min) ? min : Math.min(0, value);
    const normalizedMax = Number.isFinite(max) ? max : Math.max(value * 1.25, value + 1, 1);
    const markerName = String(b.biomarker || b.name || 'Laboratory value');
    const nameKey = markerName.toLowerCase();
    const category: FunctionalBiomarker['category'] = /thyroid|tsh|cortisol|hormone/.test(nameKey)
      ? 'endocrine'
      : /crp|immune|antibody|vitamin d/.test(nameKey)
        ? 'immune'
        : /dao|histamine|amine/.test(nameKey)
          ? 'enteric'
          : /magnesium|b12|neuromuscular/.test(nameKey)
            ? 'neuromuscular'
            : 'metabolic';
    const range = {
      min: normalizedMin,
      max: normalizedMax,
      unit,
      label: rawRange || 'No printed range extracted',
    };
    return {
      id: b.factId || `lab_${index}`,
      name: markerName,
      category,
      categoryLabel: 'Recorded laboratory value',
      categoryIcon: '🧪',
      userValue: value,
      userUnit: unit,
      standardRange: range,
      optimalRange: { ...range, label: 'No separate optimal range established' },
      status: !isComparable
        ? 'optimal'
        : value < min
          ? 'suboptimal_low'
          : value > max
            ? 'suboptimal_high'
            : 'optimal',
      clinicalSummary: isComparable
        ? 'Provisional extraction. Compare with the original report and its printed interval.'
        : 'This result was preserved, but its value or printed range needs review before comparison.',
      whyDoctorsMissIt: 'No inference about previous care is made.',
      actionableDietaryCofactors: [],
      retestTimeline: 'Discuss follow-up if appropriate.',
      originalValue: rawValue || 'Value not extracted',
      originalRange: rawRange || 'Range not extracted',
      comparator: (valueMatch?.[1] || '=') as FunctionalBiomarker['comparator'],
      isComparable,
      extractionState: isComparable ? 'parsed' : 'needs_review',
    };
  });
}

// =========================================================================
// STEP 8: CONNECTION DETECTIVE SEMANTIC EVIDENCE GRAPH CONTRACTS & ENGINE
// Reference: media_1789069049736.png
// =========================================================================

export type CanonicalDetectiveRelation =
  | 'recorded_in' // 1. A finding appears in a source -> Solid source link
  | 'occurred_before_after' // 2. Dates establish order -> Directional timeline link
  | 'repeated_together' // 3. Logged observations meet an explicit comparison rule -> Labelled association with counts
  | 'may_help_explain' // 4. AI proposes a relationship -> Dashed line, "Possible relationship"
  | 'conflicts_with' // 5. Two items disagree -> Labelled contradiction (weakens)
  | 'documented_by_clinician'; // 6. A clinician's source explicitly states a relationship -> Source-attributed link

export interface SemanticDetectiveNode {
  id: string;
  label: string;
  category:
    | 'user_report'
    | 'recorded_measurement'
    | 'extracted_finding'
    | 'documented_clinician_assessment'
    | 'ai_consideration'
    | 'open_question'
    | 'appointment_brief'
    | 'source_document';
  sublabel?: string;
  sourceDocName?: string;
  caseId?: string;
  recordId?: string;
  passageText?: string;
  pageNumber?: number;
  date?: string;
  value?: string;
  status?: 'supported' | 'proposed' | 'contradicted' | 'unknown';
}

export interface SemanticDetectiveEdge {
  id: string;
  from: string;
  to: string;
  relation: CanonicalDetectiveRelation;
  displayType:
    | 'solid_source'
    | 'directional_timeline'
    | 'labelled_association'
    | 'dashed_proposal'
    | 'labelled_contradiction'
    | 'source_attributed';
  label: string;
  sublabel?: string;
  count?: number;
  timeDelta?: string;
  evidenceBasis?: string[];
  isUserDecoupled?: boolean; // Step 9 "Keep these separate"
}

export interface SemanticEvidenceGraph {
  caseId?: string;
  nodes: SemanticDetectiveNode[];
  edges: SemanticDetectiveEdge[];
  downstreamPipeline: {
    consideration: SemanticDetectiveNode | null;
    questionStillOpen: SemanticDetectiveNode | null;
    appointmentBrief: SemanticDetectiveNode | null;
  };
  generatedFromReviewId?: string;
  decoupledEdgeIds: string[];
}

const decoupledKey = (caseId?: string) =>
  'hc_detective_decoupled_edges:' + getUnifiedCaseScope(caseId).scopeKey;

export function getDecoupledEdgeIds(caseId?: string): string[] {
  try {
    const raw = getItemSync(decoupledKey(caseId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return getUnifiedCaseScope(caseId).caseItem?.connectionMap?.decoupledEdgeIds || [];
}

export function toggleDecoupleEdge(edgeId: string, caseId?: string): string[] {
  const current = getDecoupledEdgeIds(caseId);
  const updated = current.includes(edgeId)
    ? current.filter((id) => id !== edgeId)
    : [...current, edgeId];
  const scope = getUnifiedCaseScope(caseId);
  if (scope.caseItem)
    updateCaseConnectionMap(scope.caseItem.id, {
      ...scope.caseItem.connectionMap,
      decoupledEdgeIds: updated,
    });
  try {
    setItemSync(decoupledKey(caseId), JSON.stringify(updated));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_detective_edges_updated'));
  }
  return updated;
}

/**
 * Derives the authentic, source-grounded Semantic Evidence Graph from the Engine's saved review.
 * Permanently closes Point 10 Gap #6 and satisfies Point 11 Acceptance Criterion #5:
 * "Map and report cannot silently produce different findings."
 */

export function deriveSemanticEvidenceGraphFromEngineReview(
  report: any,
  caseItem?: any
): SemanticEvidenceGraph {
  const nodes: SemanticDetectiveNode[] = [],
    edges: SemanticDetectiveEdge[] = [];
  const decoupled = new Set(getDecoupledEdgeIds(caseItem?.id));
  const empty = {
    caseId: caseItem?.id,
    nodes,
    edges,
    downstreamPipeline: { consideration: null, questionStillOpen: null, appointmentBrief: null },
    decoupledEdgeIds: [...decoupled],
  };
  if (report?.groundingVersion !== 1) return empty;
  const facts = (report.documentedFacts || []).filter((f: any) => f.id && !f.isUnverifiedSource);
  const ids = new Set<string>();
  for (const f of facts) {
    const sourceId = 'source_' + (f.recordId || f.source);
    if (!ids.has(sourceId)) {
      ids.add(sourceId);
      nodes.push({
        id: sourceId,
        label: f.source,
        category: 'source_document',
        sublabel:
          f.category === 'user_report'
            ? 'User report'
            : 'Source text; extraction may require checking',
      });
    }
    ids.add(f.id);
    nodes.push({
      id: f.id,
      label: f.fact,
      category: f.category || 'user_report',
      sourceDocName: f.source,
      caseId: caseItem?.id,
      recordId: f.recordId,
      passageText: f.fact,
      pageNumber: f.page,
      date: f.eventDate || f.reportDate,
    });
    edges.push({
      id: 'record_' + f.id,
      from: f.id,
      to: sourceId,
      relation: 'recorded_in',
      displayType: 'solid_source',
      label: 'recorded in',
    });
  }
  // Render only explicit evidence references from the saved review.
  for (const a of report.reasoningPipeline?.stage5_alternatives || []) {
    nodes.push({
      id: a.id,
      label: a.title,
      category: 'ai_consideration',
      status: 'proposed',
      sublabel: 'AI consideration',
    });
    ids.add(a.id);
    const assessment = report.reasoningPipeline.stage6_balancedAssessments.find(
      (r: any) => r.alternativeId === a.id
    );
    for (const [kind, list] of [
      ['support', assessment?.supportingEvidence || []],
      ['conflict', assessment?.conflictingEvidence || []],
    ] as const) {
      for (const r of list as any[]) {
        if (!ids.has(r.factId)) continue;
        const edgeId = kind + '_' + r.factId + '_' + a.id;
        edges.push({
          id: edgeId,
          from: r.factId,
          to: a.id,
          relation: kind === 'support' ? 'may_help_explain' : 'conflicts_with',
          displayType: kind === 'support' ? 'dashed_proposal' : 'labelled_contradiction',
          label: kind === 'support' ? 'possible relationship' : 'proposed counter-evidence',
          sublabel: r.description,
          isUserDecoupled: decoupled.has(edgeId),
        });
      }
    }
  }
  // Timing is shown only when full timestamps are supplied for both events.
  const dated = facts
    .filter(
      (f: any) =>
        typeof f.eventDate === 'string' &&
        /T\d{2}:\d{2}/.test(f.eventDate) &&
        Number.isFinite(Date.parse(f.eventDate))
    )
    .sort((a: any, b: any) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
  for (let i = 1; i < dated.length; i++) {
    const a = dated[i - 1],
      b = dated[i],
      minutes = (Date.parse(b.eventDate) - Date.parse(a.eventDate)) / 60000;
    if (minutes <= 0) continue;
    edges.push({
      id: 'time_' + a.id + '_' + b.id,
      from: a.id,
      to: b.id,
      relation: 'occurred_before_after',
      displayType: 'directional_timeline',
      label: 'recorded before',
      timeDelta: minutes + ' min',
    });
  }
  const question = report.focusedQuestion?.question
    ? {
        id: report.focusedQuestion.id,
        label: report.focusedQuestion.question,
        category: 'open_question' as const,
      }
    : null;
  if (question) nodes.push(question);
  return {
    nodes,
    edges,
    caseId: caseItem?.id,
    downstreamPipeline: {
      consideration: nodes.find((n) => n.category === 'ai_consideration') || null,
      questionStillOpen: question,
      appointmentBrief: null,
    },
    generatedFromReviewId: report.versionedEvidence?.snapshotId,
    decoupledEdgeIds: [...decoupled],
  };
}
