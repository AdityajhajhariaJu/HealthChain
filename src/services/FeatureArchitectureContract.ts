/**
 * FeatureArchitectureContract.ts
 *
 * CANONICAL ARCHITECTURE SPECIFICATION: STEP 2 (Distinct purposes: one job per feature)
 *
 * Implements the 12-feature matrix and unidirectional pipeline flow:
 * 1. Ava: "Help me describe this and understand my next step."
 * 2. Clinical Data Engine: "What does all this evidence suggest together?"
 * 3. Connection Detective: "Why are these things connected?"
 * 4. Health Canvas: "What happened, what is open, and what changed?"
 * 5. My Cases: "Where is the complete history of this issue?"
 * 6. Case Prep: "What should I bring and ask?"
 * 7. Medicine & Lab Reports: "What does this original item contain?"
 * 8. Diet Plan: "What can I realistically eat?"
 * 9. Food Detective: "What patterns occur in my food logs?"
 * 10. Clinical Elimination Suite: "How do I follow and document this selected plan?"
 * 11. Clinical Trials: "What relevant research can I investigate?"
 * 12. Zen Garden / Calm Space: "How do I take a worthwhile break?"
 */

export type FeatureId =
  | 'ava'
  | 'engine'
  | 'connection-detective'
  | 'canvas'
  | 'cases'
  | 'case-prep'
  | 'medicine-labs'
  | 'diet-plan'
  | 'food-detective'
  | 'elimination-suite'
  | 'clinical-trials'
  | 'zen-garden';

export type PipelineStage =
  | 'intake'
  | 'storage'
  | 'synthesis'
  | 'exploration'
  | 'prep'
  | 'action'
  | 'outcome'
  | 'discovery'
  | 'wellness';

export interface HandoffRoute {
  targetFeatureId: FeatureId;
  label: string;
  actionDescription: string;
  route: string;
  targetTab?: string;
}

export interface UpstreamFeed {
  sourceFeatureId: FeatureId | 'user';
  label: string;
  artifactType: string;
}

export interface FeatureContract {
  id: FeatureId;
  name: string;
  shortLabel: string;
  uniqueQuestion: string;
  owns: string;
  produces: string;
  mustNotDuplicate: string;
  pipelineStage: PipelineStage;
  route: string;
  badgeColor: {
    bg: string;
    text: string;
    border: string;
    accent: string;
  };
  downstreamHandoffs: HandoffRoute[];
  upstreamFeeds: UpstreamFeed[];
}

export const FEATURE_CONTRACTS: Record<FeatureId, FeatureContract> = {
  ava: {
    id: 'ava',
    name: 'Ava Health Buddy',
    shortLabel: 'Ava',
    uniqueQuestion: 'Help me describe this and understand my next step.',
    owns: 'Conversation, clarification, capture',
    produces: 'Confirmed observations, explanations, focused questions',
    mustNotDuplicate: 'A separate competing clinical report',
    pipelineStage: 'intake',
    route: '/app/ava',
    badgeColor: {
      bg: '#F0FDF4',
      text: '#166534',
      border: '#BBF7D0',
      accent: '#22C55E',
    },
    downstreamHandoffs: [
      {
        targetFeatureId: 'cases',
        label: 'Save Confirmed Observations to Case',
        actionDescription: 'Anchor confirmed symptoms into your canonical case timeline',
        route: '/app/my-cases',
      },
      {
        targetFeatureId: 'engine',
        label: 'Review in Clinical Data Engine',
        actionDescription: 'Transfer structured facts for deep clinical review and contradiction checks',
        route: '/app/consult',
      },
      {
        targetFeatureId: 'case-prep',
        label: 'Prepare Questions for Doctor',
        actionDescription: 'Draft an appointment brief with your clarified questions',
        route: '/app/case-prep',
      },
    ],
    upstreamFeeds: [
      {
        sourceFeatureId: 'user',
        label: 'Patient Concern or Symptom',
        artifactType: 'Natural language input, voice reflection, or feeling',
      },
    ],
  },

  engine: {
    id: 'engine',
    name: 'Clinical Data Engine',
    shortLabel: 'Clinical Data Engine',
    uniqueQuestion: 'What does all this evidence suggest together?',
    owns: 'Structured review and synthesis',
    produces: 'Versioned findings, alternative interpretations, contradictions, gaps',
    mustNotDuplicate: 'Day-to-day logging or a decorative specialist chat',
    pipelineStage: 'synthesis',
    route: '/app/consult',
    badgeColor: {
      bg: '#FFFBEB',
      text: '#92400E',
      border: '#FDE68A',
      accent: '#D97706',
    },
    downstreamHandoffs: [
      {
        targetFeatureId: 'connection-detective',
        label: 'Explore Why in Connection Detective',
        actionDescription: 'Investigate biological mechanisms, domino triggers, and counter-factors',
        route: '/app/cases',
      },
      {
        targetFeatureId: 'case-prep',
        label: 'Prepare for Doctor in Case Prep',
        actionDescription: 'Export contradictions, questions, and red flags directly to your visit brief',
        route: '/app/case-prep',
      },
    ],
    upstreamFeeds: [
      {
        sourceFeatureId: 'cases',
        label: 'Canonical Case Records & Timeline',
        artifactType: 'Stored clinical evidence, labs, history, and timeline entries',
      },
      {
        sourceFeatureId: 'clinical-trials',
        label: 'Clinical Trials Research Shortlist',
        artifactType: 'Source-backed research studies & clinical trial citations',
      },
    ],
  },

  'connection-detective': {
    id: 'connection-detective',
    name: 'Connection Detective',
    shortLabel: 'Connection Detective',
    uniqueQuestion: 'Why are these things connected?',
    owns: "Exploration of the Engine's relationships",
    produces: 'Inspectable connections and evidence paths',
    mustNotDuplicate: 'Another independently generated diagnosis list',
    pipelineStage: 'exploration',
    route: '/app/cases',
    badgeColor: {
      bg: '#F0F9FF',
      text: '#075985',
      border: '#BAE6FD',
      accent: '#0284C7',
    },
    downstreamHandoffs: [
      {
        targetFeatureId: 'case-prep',
        label: 'Take Inspected Pathways to Case Prep',
        actionDescription: 'Arm your physician with verified biological connection paths',
        route: '/app/case-prep',
      },
    ],
    upstreamFeeds: [
      {
        sourceFeatureId: 'engine',
        label: 'Engine Relationships & Cross-System Findings',
        artifactType: 'Synthesized hypotheses, contraindications, and specialist rationales',
      },
    ],
  },

  canvas: {
    id: 'canvas',
    name: 'Health Canvas',
    shortLabel: 'Health Canvas',
    uniqueQuestion: 'What happened, what is open, and what changed?',
    owns: 'Ongoing case work',
    produces: 'Updates, unresolved questions, appointment outcomes',
    mustNotDuplicate: 'Simulated specialist discussion after every post',
    pipelineStage: 'outcome',
    route: '/app/cases',
    badgeColor: {
      bg: '#F8FAFC',
      text: '#334155',
      border: '#E2E8F0',
      accent: '#64748B',
    },
    downstreamHandoffs: [
      {
        targetFeatureId: 'cases',
        label: 'Sync Closed Loops to My Cases',
        actionDescription: 'Commit updated status, visit outcomes, and resolved questions into case history',
        route: '/app/my-cases',
      },
    ],
    upstreamFeeds: [
      {
        sourceFeatureId: 'case-prep',
        label: 'Clinician Visit & Doctor Notes',
        artifactType: 'Post-visit outcomes, physician feedback, and medication changes',
      },
    ],
  },

  cases: {
    id: 'cases',
    name: 'My Cases',
    shortLabel: 'My Cases',
    uniqueQuestion: 'Where is the complete history of this issue?',
    owns: 'Case organisation',
    produces: 'Canonical case record and history',
    mustNotDuplicate: 'Another interpretation engine',
    pipelineStage: 'storage',
    route: '/app/my-cases',
    badgeColor: {
      bg: '#F0FDFA',
      text: '#115E59',
      border: '#99F6E4',
      accent: '#0F766E',
    },
    downstreamHandoffs: [
      {
        targetFeatureId: 'engine',
        label: 'Review Case Evidence in Engine',
        actionDescription: 'Feed the canonical case history into the Clinical Data Engine for synthesis',
        route: '/app/consult',
      },
    ],
    upstreamFeeds: [
      {
        sourceFeatureId: 'medicine-labs',
        label: 'Verified Medication & Lab Records',
        artifactType: 'Corrected lab values and medication dosages',
      },
      {
        sourceFeatureId: 'ava',
        label: 'Confirmed Observations & Questions',
        artifactType: 'Structured intake data and symptom descriptions',
      },
      {
        sourceFeatureId: 'canvas',
        label: 'Health Canvas Outcomes & Updates',
        artifactType: 'Appointment resolutions and longitudinal changes',
      },
    ],
  },

  'case-prep': {
    id: 'case-prep',
    name: 'Case Prep',
    shortLabel: 'Case Prep',
    uniqueQuestion: 'What should I bring and ask?',
    owns: 'Visit preparation',
    produces: 'Editable appointment brief',
    mustNotDuplicate: 'An entirely new assessment',
    pipelineStage: 'prep',
    route: '/app/case-prep',
    badgeColor: {
      bg: '#FAF5FF',
      text: '#6B21A8',
      border: '#E9D5FF',
      accent: '#9333EA',
    },
    downstreamHandoffs: [
      {
        targetFeatureId: 'canvas',
        label: 'Record Doctor Decisions in Health Canvas',
        actionDescription: 'Log clinician feedback and outcomes directly into your ongoing case timeline',
        route: '/app/cases',
      },
    ],
    upstreamFeeds: [
      {
        sourceFeatureId: 'engine',
        label: 'Synthesized Findings & Knowledge Gaps',
        artifactType: 'High-priority clinical questions and flagged contradictions',
      },
      {
        sourceFeatureId: 'connection-detective',
        label: 'Corroborated Evidence Paths',
        artifactType: 'Specific biological connection chains to show the doctor',
      },
    ],
  },

  'medicine-labs': {
    id: 'medicine-labs',
    name: 'Medicine & Lab Reports',
    shortLabel: 'Medicine & Labs',
    uniqueQuestion: 'What does this original item contain?',
    owns: 'Record intake and correction',
    produces: 'Verified medication and measurement entries',
    mustNotDuplicate: 'Cross-case conclusions',
    pipelineStage: 'intake',
    route: '/app/medicine-lab',
    badgeColor: {
      bg: '#EFF6FF',
      text: '#1E40AF',
      border: '#BFDBFE',
      accent: '#3B82F6',
    },
    downstreamHandoffs: [
      {
        targetFeatureId: 'cases',
        label: 'Link Verified Records to My Cases',
        actionDescription: 'Attach confirmed lab values and prescriptions into your active clinical case',
        route: '/app/my-cases',
      },
    ],
    upstreamFeeds: [
      {
        sourceFeatureId: 'user',
        label: 'Original Medical Documents',
        artifactType: 'Lab report PDF, prescription image, blood test paper',
      },
    ],
  },

  'diet-plan': {
    id: 'diet-plan',
    name: 'Diet Plan',
    shortLabel: 'Diet Plan',
    uniqueQuestion: 'What can I realistically eat?',
    owns: 'Practical meal planning',
    produces: 'Editable meals, swaps and shopping support',
    mustNotDuplicate: 'Food-trigger investigation',
    pipelineStage: 'wellness',
    route: '/app/dietician',
    badgeColor: {
      bg: '#ECFDF5',
      text: '#065F46',
      border: '#A7F3D0',
      accent: '#10B981',
    },
    downstreamHandoffs: [
      {
        targetFeatureId: 'food-detective',
        label: 'Analyze Meal Patterns in Food Detective',
        actionDescription: 'Track digestion and post-meal reactions to identify associations',
        route: '/app/dietician',
        targetTab: 'insights',
      },
    ],
    upstreamFeeds: [
      {
        sourceFeatureId: 'user',
        label: 'Nutritional Preferences & Constraints',
        artifactType: 'Cuisine preferences, schedule, medical conditions, and pantry items',
      },
    ],
  },

  'food-detective': {
    id: 'food-detective',
    name: 'Food Detective',
    shortLabel: 'Food Detective',
    uniqueQuestion: 'What patterns occur in my food logs?',
    owns: 'Food-specific observation analysis',
    produces: 'Dated associations and gaps',
    mustNotDuplicate: 'Broad cross-system reasoning',
    pipelineStage: 'exploration',
    route: '/app/dietician',
    badgeColor: {
      bg: '#FEF3C7',
      text: '#92400E',
      border: '#FDE68A',
      accent: '#F59E0B',
    },
    downstreamHandoffs: [
      {
        targetFeatureId: 'elimination-suite',
        label: 'Run 4-Week Clinical Elimination Protocol',
        actionDescription: 'Isolate suspected food triggers under structured clinical phases',
        route: '/app/dietician',
        targetTab: 'elimination',
      },
      {
        targetFeatureId: 'engine',
        label: 'Review Systemic Triggers in Engine',
        actionDescription: 'Examine if dietary triggers overlap with broader multisystem symptoms',
        route: '/app/consult',
      },
    ],
    upstreamFeeds: [
      {
        sourceFeatureId: 'diet-plan',
        label: 'Logged Meals & Reactions',
        artifactType: 'Post-meal reaction timestamps, symptom severity, and digestive notes',
      },
    ],
  },

  'elimination-suite': {
    id: 'elimination-suite',
    name: 'Clinical Elimination Suite',
    shortLabel: 'Elimination Suite',
    uniqueQuestion: 'How do I follow and document this selected plan?',
    owns: 'Plan execution and observation',
    produces: 'Progress logs and reviewable outcomes',
    mustNotDuplicate: 'Automatically deciding what caused symptoms',
    pipelineStage: 'action',
    route: '/app/dietician',
    badgeColor: {
      bg: '#FFF7ED',
      text: '#9A3412',
      border: '#FED7AA',
      accent: '#EA580C',
    },
    downstreamHandoffs: [
      {
        targetFeatureId: 'case-prep',
        label: 'Export Protocol Outcome to Doctor Brief',
        actionDescription: 'Bring verified elimination results to your gastroenterologist or allergist',
        route: '/app/case-prep',
      },
      {
        targetFeatureId: 'canvas',
        label: 'Record Protocol in Case Canvas',
        actionDescription: 'Commit completed elimination phase outcomes into your longitudinal timeline',
        route: '/app/cases',
      },
    ],
    upstreamFeeds: [
      {
        sourceFeatureId: 'food-detective',
        label: 'Suspected Food Triggers',
        artifactType: 'Correlated foods with high symptom frequency',
      },
    ],
  },

  'clinical-trials': {
    id: 'clinical-trials',
    name: 'Clinical Trials',
    shortLabel: 'Clinical Trials',
    uniqueQuestion: 'What relevant research can I investigate?',
    owns: 'External evidence discovery',
    produces: 'Source-backed research shortlist',
    mustNotDuplicate: 'Eligibility determination',
    pipelineStage: 'discovery',
    route: '/app/trials',
    badgeColor: {
      bg: '#F5F3FF',
      text: '#5B21B6',
      border: '#DDD6FE',
      accent: '#7C3AED',
    },
    downstreamHandoffs: [
      {
        targetFeatureId: 'engine',
        label: 'Attach Studies to Clinical Data Engine',
        actionDescription: 'Enrich engine synthesis with peer-reviewed trials and clinical evidence',
        route: '/app/consult',
      },
      {
        targetFeatureId: 'case-prep',
        label: 'Include Research in Doctor Brief',
        actionDescription: 'Bring clinical trial identifiers and mechanisms to discuss with your specialist',
        route: '/app/case-prep',
      },
    ],
    upstreamFeeds: [
      {
        sourceFeatureId: 'engine',
        label: 'Diagnostic Queries & Biomarkers',
        artifactType: 'Conditions, phenotypes, and interventions under review',
      },
    ],
  },

  'zen-garden': {
    id: 'zen-garden',
    name: 'Zen Garden / Calm Space',
    shortLabel: 'Calm Space',
    uniqueQuestion: 'How do I take a worthwhile break?',
    owns: 'Separate wellness experiences',
    produces: 'Completed activities and sessions',
    mustNotDuplicate: 'Clinical interpretation',
    pipelineStage: 'wellness',
    route: '/app/today',
    badgeColor: {
      bg: '#FDF2F8',
      text: '#9D174D',
      border: '#FBCFE8',
      accent: '#EC4899',
    },
    downstreamHandoffs: [
      {
        targetFeatureId: 'canvas',
        label: 'Return to Case Timeline',
        actionDescription: 'Resume your active case review when you feel refreshed',
        route: '/app/cases',
      },
    ],
    upstreamFeeds: [
      {
        sourceFeatureId: 'user',
        label: 'Need for Rest and De-escalation',
        artifactType: 'Mindful breathing, guided somatic pauses, sensory reset',
      },
    ],
  },
};

/**
 * Lookup helper to retrieve the feature boundary definition.
 */
export function getFeatureContract(id: FeatureId): FeatureContract {
  const contract = FEATURE_CONTRACTS[id];
  if (!contract) {
    throw new Error(`[FeatureArchitectureContract] Unknown feature id: "${id}"`);
  }
  return contract;
}

/**
 * Returns all 12 feature boundary contracts.
 */
export function getAllFeatureContracts(): FeatureContract[] {
  return Object.values(FEATURE_CONTRACTS);
}

/**
 * Retrieves valid downstream handoff routes for a feature.
 */
export function getDownstreamHandoffs(id: FeatureId): HandoffRoute[] {
  return FEATURE_CONTRACTS[id]?.downstreamHandoffs || [];
}

/**
 * Retrieves declared upstream feeds for a feature.
 */
export function getUpstreamFeeds(id: FeatureId): UpstreamFeed[] {
  return FEATURE_CONTRACTS[id]?.upstreamFeeds || [];
}

/**
 * Validates whether a direct pipeline transition between two features is architecturally permissible.
 */
export function isPermissiblePipelineHandoff(fromId: FeatureId, toId: FeatureId): boolean {
  const contract = FEATURE_CONTRACTS[fromId];
  if (!contract) return false;
  return contract.downstreamHandoffs.some((handoff) => handoff.targetFeatureId === toId);
}
