import { createCaseDraft, saveReviewSnapshot, CaseItem, MedicalRecord } from './CaseEngine';
import { runClinicalReasoningPipeline, SourceLinkedEvidence } from './ClinicalReasoningEngine';
import { buildVersionedEvidenceSet, generateMeaningfulPerspectives, executeBoundedComparison } from './MultiPerspectiveReviewEngine';

export type LandingWorkflowScenarioId = 
  | 'workflow_fatigue_iron'
  | 'workflow_headache_food'
  | 'workflow_palpitation_hr'
  | 'workflow_flushing_pots';

export interface EpistemicBoundary {
  boundaryTitle: string;
  whatToKeepSeparate: string;
  epistemicRisk: string;
  safeguardRule: string;
}

export interface ValuableFinalOutput {
  clinicianQuote: string;
  summaryStatement: string;
  overlappingEvents: string[];
  missingRecordsOrDates: string[];
  supportedQuestions: string[];
}

export interface GenericVsUsefulComparison {
  genericAdvice: string;
  genericPitfall: string;
  usefulReasoning: string;
  clinicalValue: string;
}

export interface ConnectableInput {
  tag: string;
  icon: string;
  description: string;
  sourceExample: string;
}

export interface LandingWorkflowScenario {
  id: LandingWorkflowScenarioId;
  rank: string;
  title: string;
  icon: string;
  specialistTag: string;
  category: 'endo' | 'neuro' | 'cardio' | 'immuno';
  example: string;
  whatToConnect: ConnectableInput[];
  epistemicBoundary: EpistemicBoundary;
  valuableOutput: ValuableFinalOutput;
  comparison: GenericVsUsefulComparison;
  sampleIntake: {
    chiefComplaint: string;
    timeline: string;
    triggerContext: string;
  };
  sampleRecords: Partial<MedicalRecord>[];
}

export const LANDING_WORKFLOW_SCENARIOS: LandingWorkflowScenario[] = [
  {
    id: 'workflow_fatigue_iron',
    rank: '#1',
    title: 'Fatigue, Iron Results & a Post-Viral Timeline',
    icon: '🔬',
    specialistTag: 'Endocrinology & Neurology',
    category: 'endo',
    example: 'Fatigue, iron results, post-viral timeline',
    whatToConnect: [
      {
        tag: 'Symptom Onset',
        icon: '⏱️',
        description: 'Documented onset date of profound unrefreshing exhaustion and afternoon cognitive crash.',
        sourceExample: 'Patient log: Oct 14 onset, worsening post-exertion.',
      },
      {
        tag: 'Illness Dates',
        icon: '🦠',
        description: 'Preceding acute viral illness with febrile prodrome and pulmonary symptoms.',
        sourceExample: 'Clinic note: Documented acute viral syndrome Sept 28–Oct 06.',
      },
      {
        tag: 'Dated Results',
        icon: '🧪',
        description: 'Serial laboratory assays with exact collection dates and measurement units.',
        sourceExample: 'LabCorp Nov 02: Serum Ferritin 14 ng/ml (normal CBC/Hb 13.8 g/dL).',
      },
      {
        tag: 'Prior Notes',
        icon: '📝',
        description: 'Historical clinic assessments and physician examination findings.',
        sourceExample: 'PCP Visit Nov 10: "Mild iron deficiency without anemia; rest recommended."',
      },
    ],
    epistemicBoundary: {
      boundaryTitle: 'A lab finding versus an explanation for all fatigue',
      whatToKeepSeparate: 'A documented low lab value (e.g. Ferritin 14 ng/ml) must remain distinct from a complete causal explanation for multi-system post-viral fatigue.',
      epistemicRisk: 'Premature diagnostic closure: prescribing iron supplements while ignoring viral mitochondrial convalescence, neuro-inflammation, or autonomic dysregulation.',
      safeguardRule: 'Never equate the presence of an isolated biomarker anomaly with the total clinical etiology of the patient’s systemic symptoms.',
    },
    valuableOutput: {
      clinicianQuote: 'These events overlap; these dates or records are missing; here are the questions the available evidence supports.',
      summaryStatement: 'The post-viral timeline and low ferritin overlap in the same 6-week window. While hypoferritinemia contributes to cellular cofactor depletion, it cannot alone explain the post-exertional crash following the viral syndrome.',
      overlappingEvents: [
        'Sept 28: Acute febrile viral illness onset.',
        'Oct 14: Post-viral fatigue emerged prior to full recovery.',
        'Nov 02: Serum ferritin 14 ng/ml documented (normal hemoglobin).',
      ],
      missingRecordsOrDates: [
        'Pre-illness baseline ferritin (to determine whether iron was chronically low or acute-phase drop).',
        'C-reactive protein (CRP) or ESR at the time of the iron draw to rule out acute-phase reaction masking.',
        'Objective standing vital signs (pulse & BP at 0, 5, 10 minutes).',
      ],
      supportedQuestions: [
        'Does the timing of fatigue starting immediately after the viral illness suggest post-viral mitochondrial convalescence alongside the low ferritin?',
        'Should we repeat iron indices alongside inflammatory markers to assess true cellular stores versus acute-phase fluctuations?',
        'Would an active stand test help determine if post-viral autonomic instability is driving the cognitive crashes?',
      ],
    },
    comparison: {
      genericAdvice: 'Your iron is low. You should take an over-the-counter iron pill, drink more water, and rest for 8 hours every night.',
      genericPitfall: 'Assumes iron deficiency is the single cause; ignores viral timeline; misses potential post-viral autonomic or inflammatory drivers.',
      usefulReasoning: 'Correlates the post-viral onset with dated iron panels, keeps the lab finding strictly separate from the total fatigue explanation, flags missing baseline labs, and generates focused visit questions.',
      clinicalValue: 'Provides an inspectable chronology that helps the treating clinician evaluate both post-viral convalescence and non-anemic iron deficiency without premature closure.',
    },
    sampleIntake: {
      chiefComplaint: 'Unrelenting physical exhaustion and brain fog following a viral infection, accompanied by low ferritin on recent bloodwork.',
      timeline: 'Began 6 weeks ago after acute respiratory infection; worsened over past 3 weeks.',
      triggerContext: 'Exertion and standing upright for more than 20 minutes triggers severe next-day cognitive lag.',
    },
    sampleRecords: [
      {
        id: 'rec_iron_panel',
        filename: 'Comprehensive_Metabolic_Iron_Panel.pdf',
        source: 'diagnostic_lab',
        type: 'lab',
        addedAt: '2024-11-02',
        findings: 'Serum Ferritin: 14 ng/ml (Reference: 30-200 ng/ml). Hemoglobin: 13.8 g/dL (Normal). Iron Saturation: 19%.',
      },
      {
        id: 'rec_pcp_note',
        filename: 'Clinic_Encounter_Note.pdf',
        source: 'clinical_note',
        type: 'doctor_note',
        addedAt: '2024-11-10',
        findings: 'Patient presents with fatigue lasting 4 weeks following acute viral illness. Physical exam unremarkable. Advised oral iron supplement.',
      },
    ],
  },

  {
    id: 'workflow_headache_food',
    rank: '#2',
    title: 'Morning Headaches, Food Observations & Prior Care',
    icon: '🧠',
    specialistTag: 'Neurology & Gastroenterology',
    category: 'neuro',
    example: 'Morning headaches, food observations, prior care',
    whatToConnect: [
      {
        tag: 'Headache Timing',
        icon: '⏱️',
        description: 'Exact diurnal timing of headache onset upon waking versus midday escalations.',
        sourceExample: 'Log: Awoke with dull bilateral occipital ache 6 out of 7 mornings.',
      },
      {
        tag: 'Sleep Entries',
        icon: '🌙',
        description: 'Sleep duration, fragmentation, nocturnal awakenings, and unrefreshing rest.',
        sourceExample: 'Sleep tracker: Frequent 3:00 AM micro-arousals; average 5.8 hours total sleep.',
      },
      {
        tag: 'Food Records',
        icon: '🥗',
        description: 'Evening dietary intake, dinner timing, and aged or high-tyramine ingredients.',
        sourceExample: 'Food log: Late dinners (9:30 PM) containing aged cheeses and red wine.',
      },
      {
        tag: 'Medication History',
        icon: '💊',
        description: 'Frequency of acute analgesic use (NSAIDs, triptans, caffeine compounds).',
        sourceExample: 'Pharmacy record: Taking acetaminophen/caffeine combination 4–5 mornings per week.',
      },
      {
        tag: 'Prior Assessments',
        icon: '📋',
        description: 'Previous physician diagnoses and neurological examinations.',
        sourceExample: 'Neurology consult (6 mos prior): Normal cranial nerve exam; presumptive tension headache.',
      },
    ],
    epistemicBoundary: {
      boundaryTitle: 'Food timing versus a demonstrated trigger',
      whatToKeepSeparate: 'Consuming a specific food prior to waking with a headache must remain distinct from establishing that food as an isolated pharmacological or biological trigger.',
      epistemicRisk: 'Adopting overly restrictive, nutritionally hazardous elimination diets while overlooking medication-overuse headache, sleep apnea, or nocturnal bruxism.',
      safeguardRule: 'A temporal sequence (Food A consumed -> Morning Headache B) is an observation, not a confirmed trigger, until nocturnal sleep physiology and rebound medication use are accounted for.',
    },
    valuableOutput: {
      clinicianQuote: 'A focused timeline showing recurring and non-recurring patterns, with alternative contexts.',
      summaryStatement: 'Morning headaches recurred on mornings following high-tyramine dinners, but also recurred on mornings with 3+ analgesic doses in the preceding 48 hours and severe sleep fragmentation.',
      overlappingEvents: [
        'Recurrent occipital headaches documented predominantly upon morning wakefulness (6:30 AM–8:00 AM).',
        'Analgesic use noted on 18 of the last 30 days, creating a potential medication-adaptation cycle.',
        'Late-night meals coincide with short sleep latency and fragmented deep sleep stages.',
      ],
      missingRecordsOrDates: [
        'Formal overnight pulse oximetry or sleep study to assess sleep-disordered breathing / nocturnal hypoxia.',
        'A medication washout tracking log to differentiate primary migraine from rebound medication-overuse headache.',
        'Blood pressure readings immediately upon waking.',
      ],
      supportedQuestions: [
        'Does the frequency of morning analgesic use raise the possibility of medication-adaptation (rebound) headaches rather than purely food triggers?',
        'Could nocturnal sleep quality or occult sleep apnea explain why headaches are present immediately upon waking regardless of dinner contents?',
        'What structured elimination and re-challenge protocol would provide valid trigger data without unnecessary dietary restriction?',
      ],
    },
    comparison: {
      genericAdvice: 'You are having migraines caused by food allergies. Stop eating cheese, wine, and chocolate, and take pain relievers when your head hurts.',
      genericPitfall: 'Misidentifies food as definitive trigger; promotes daily pain relievers which worsens rebound headaches; ignores sleep disruption.',
      usefulReasoning: 'Builds a focused timeline contrasting food logs against sleep disruption and medication frequency, separating food timing from demonstrated triggers, and surfacing rebound headaches as an alternative context.',
      clinicalValue: 'Equips the clinician with a 30-day pattern log that clearly separates dietary factors from analgesic frequency and sleep architecture.',
    },
    sampleIntake: {
      chiefComplaint: 'Waking up with throbbing headaches 4 to 5 mornings per week; suspecting food sensitivities.',
      timeline: 'Began 4 months ago; progressively increased in frequency from 1x/week to almost daily.',
      triggerContext: 'Noticed headaches often occur after eating aged cheese or drinking wine, but also occur on days with poor sleep.',
    },
    sampleRecords: [
      {
        id: 'rec_neuro_note',
        filename: 'Neurology_Progress_Note.pdf',
        source: 'clinical_note',
        type: 'doctor_note',
        addedAt: '2024-08-15',
        findings: '34-year-old with bilateral occipital throbbing headache upon waking. Neurological exam normal. MRI brain unremarkable.',
      },
    ],
  },

  {
    id: 'workflow_palpitation_hr',
    rank: '#3',
    title: 'Post-Meal Palpitations, Timing & Measured Heart Rate',
    icon: '🫀',
    specialistTag: 'Cardiology & Gastroenterology',
    category: 'cardio',
    example: 'Post-meal palpitations and measured heart rate',
    whatToConnect: [
      {
        tag: 'Meal Time',
        icon: '🍽️',
        description: 'Timestamp, macronutrient volume (carbohydrate vs lipid load), and speed of eating.',
        sourceExample: 'Log: Lunch at 12:45 PM (large pasta meal with carbonated beverage).',
      },
      {
        tag: 'Symptom Time',
        icon: '⏱️',
        description: 'Exact minutes elapsed from meal completion to onset of flutter or pounding sensation.',
        sourceExample: 'Symptom report: Strong chest pounding started at 1:25 PM (40 minutes post-meal).',
      },
      {
        tag: 'Measurement Conditions',
        icon: '⌚',
        description: 'Recording device (smartwatch, optical sensor, manual pulse, ECG strip) and device accuracy notes.',
        sourceExample: 'Apple Watch Series 9 single-lead ECG: Sinus rhythm at 118 bpm, no arrhythmia detected.',
      },
      {
        tag: 'Posture & Context',
        icon: '🧍',
        description: 'Physical position during symptom onset (seated, supine, standing, walking, post-exertional).',
        sourceExample: 'Context log: Stood up from desk to walk to meeting when palpitations intensified.',
      },
    ],
    epistemicBoundary: {
      boundaryTitle: 'Symptoms versus device readings; repeated observations versus isolated events',
      whatToKeepSeparate: 'A subjective sensation of heart racing must be evaluated alongside, but never equated with, consumer wearable optical heart rate data; an isolated postprandial spike must be separated from a sustained autonomic pattern.',
      epistemicRisk: 'Mistaking benign postprandial splanchnic vasodilation for a life-threatening ventricular arrhythmia, or conversely dismissing authentic postural tachycardia because an optical sensor averaged out the reading.',
      safeguardRule: 'Distinguish subjective palpitations from objective rhythm tracings; verify whether tachycardia persists across multiple comparable meals under standardized postural conditions.',
    },
    valuableOutput: {
      clinicianQuote: 'Comparable episodes, missing comparison information and a concise visit question.',
      summaryStatement: 'Heart rate elevations to 110–120 bpm occurred consistently across 4 documented episodes 30–60 minutes after high-carbohydrate meals, but only when transitioning to standing posture. Resting supine post-meal recordings remained normal.',
      overlappingEvents: [
        'Episodes occurred 35–45 minutes following high-glycemic or large-volume meals.',
        'Wearable single-lead ECG confirmed sinus tachycardia without ectopy or fibrillation.',
        'Standing posture intensified the heart rate delta by an additional +28 bpm compared to seated postprandial baseline.',
      ],
      missingRecordsOrDates: [
        'A formal Holter monitor or 14-day Zio patch to evaluate clinical-grade rhythm strips during symptomatic meals.',
        'Standardized 10-minute active standing heart rate and blood pressure check (to assess orthostatic baroreflex).',
        'Postprandial capillary glucose testing to rule out reactive hypoglycemia.',
      ],
      supportedQuestions: [
        'Does the combination of postprandial timing and orthostatic standing point to splanchnic venous pooling with compensatory reflex tachycardia?',
        'Should we obtain a 14-day Holter monitor to capture clinical-grade rhythm strips during these specific mealtime episodes?',
        'Would checking postprandial blood glucose help rule out reactive hypoglycemia as an adrenergic trigger?',
      ],
    },
    comparison: {
      genericAdvice: 'You are having heart palpitations. Cut down on coffee, do breathing exercises, and try not to get anxious after you eat.',
      genericPitfall: 'Dismisses physiological symptoms as anxiety; misses splanchnic pooling mechanism; fails to capture posture-meal interaction.',
      usefulReasoning: 'Correlates meal composition with standing posture and optical ECG tracings, keeps subjective sensation distinct from device readings, identifies missing Holter data, and provides a concise visit question.',
      clinicalValue: 'Transforms alarming wearable notifications into a structured meal-posture log that helps a cardiologist immediately assess hemodynamics versus arrhythmia.',
    },
    sampleIntake: {
      chiefComplaint: 'Heart racing and pounding sensation occurring 30 to 45 minutes after eating lunch.',
      timeline: 'Started approximately 2 months ago; occurs 3 to 4 times a week.',
      triggerContext: 'Noticeably worse after heavy carbohydrate meals and when standing up shortly after eating.',
    },
    sampleRecords: [
      {
        id: 'rec_cardio_ecg',
        filename: 'Standard_12_Lead_ECG.pdf',
        source: 'diagnostic_lab',
        type: 'lab',
        addedAt: '2024-10-05',
        findings: 'Resting 12-lead ECG: Normal sinus rhythm at 72 bpm. PR interval 154 ms. QTc 418 ms. No ST elevation or depression. Unremarkable.',
      },
    ],
  },

  {
    id: 'workflow_flushing_pots',
    rank: '#4',
    title: 'Flushing, Postural Symptoms & Recurring Triggers',
    icon: '🛡️',
    specialistTag: 'Immunology & Cardiology',
    category: 'immuno',
    example: 'Flushing, postural symptoms, recurring observations',
    whatToConnect: [
      {
        tag: 'Co-Occurring Symptoms',
        icon: '🔗',
        description: 'Symptoms that reliably appear together in the exact same physiological episode.',
        sourceExample: 'Episode log: Facial flushing, throat tightness sensation, and lightheadedness appeared together at 4:15 PM.',
      },
      {
        tag: 'Independent Symptoms',
        icon: '⚖️',
        description: 'Symptoms that occur at separate times or in response to entirely distinct environmental triggers.',
        sourceExample: 'Log: Postural dizziness on standing occurs every morning; facial flushing occurs only after heat exposure.',
      },
      {
        tag: 'Temporal Clustering',
        icon: '📅',
        description: 'Analysis of whether symptoms cluster around specific times of day, temperatures, or post-stress periods.',
        sourceExample: 'Timeline: 5 out of 6 flushing episodes coincided with ambient temperatures exceeding 26°C.',
      },
      {
        tag: 'Recurring Triggers',
        icon: '🌿',
        description: 'Specific documented environmental exposures (heat, temperature shifts, foods, exercise).',
        sourceExample: 'Trigger notes: Warm showers, alcohol, and emotional stress documented prior to flushing.',
      },
    ],
    epistemicBoundary: {
      boundaryTitle: 'A cluster of observations versus a named syndrome',
      whatToKeepSeparate: 'A documented cluster of multi-system observations (e.g. facial flushing + postural tachycardia) must remain distinct from an unverified diagnostic label (e.g. MCAS or Hyperadrenergic POTS).',
      epistemicRisk: 'Assuming complex unvalidated syndromes without meeting consensus criteria (e.g. elevated serum tryptase or 24-hour urine prostaglandins), leading to unnecessary polypharmacy.',
      safeguardRule: 'Never jump from multi-symptom co-occurrence to a named syndrome; explicitly record whether the evidence supports grouping the observations or treating them as concurrent independent processes.',
    },
    valuableOutput: {
      clinicianQuote: 'An explicit account of whether the record supports grouping them together.',
      summaryStatement: 'The records document co-occurring facial flushing and postural dizziness during heat exposure, but postural tachycardia also occurs in the absence of flushing during morning standing. The data supports investigating autonomic tone and vascular reactivity, but does not yet meet criteria for a unified mast cell syndrome.',
      overlappingEvents: [
        'Facial warmth and erythema documented following hot showers and spicy meals.',
        'Standing heart rate increases of +36 bpm documented consistently in morning tilt challenges.',
        'Normal baseline CBC, normal renal function, and normal thyroid panel.',
      ],
      missingRecordsOrDates: [
        'Baseline serum tryptase drawn at rest versus acute serum tryptase drawn within 1–2 hours of a flushing flare.',
        '24-hour urine collection for N-methylhistamine and prostaglandin D2.',
        'Formal 10-minute active standing NASA Lean test or Tilt Table study.',
      ],
      supportedQuestions: [
        'Does the available record support grouping the flushing and postural symptoms into a single syndrome, or should they be evaluated as independent vascular and autonomic responses?',
        'Should we establish baseline serum tryptase to compare against a symptomatic sample during an acute flushing flare?',
        'Could peripheral vasodilation from temperature exposure be exacerbating orthostatic pooling rather than primary mast cell degranulation?',
      ],
    },
    comparison: {
      genericAdvice: 'You have MCAS (Mast Cell Activation Syndrome) and POTS. You need to start taking antihistamines, avoid all histamine foods, and take high sodium.',
      genericPitfall: 'Jumps straight from two symptoms to complex rare syndromes; encourages self-medication and severe food restriction without objective laboratory validation.',
      usefulReasoning: 'Carefully separates co-occurring from independent episodes, explicitly tests whether the record supports grouping them together into a syndrome, identifies missing tryptase and tilt tests, and prepares targeted questions.',
      clinicalValue: 'Gives the immunologist and cardiologist an objective trigger-symptom ledger that prevents premature diagnostic labels while providing the exact testing protocol needed to resolve the case.',
    },
    sampleIntake: {
      chiefComplaint: 'Episodes of sudden facial flushing and redness, accompanied by dizziness and rapid heart rate when standing.',
      timeline: 'Occurring intermittently over the past 5 months; flares happen 2 to 3 times per week.',
      triggerContext: 'Hot showers, warm rooms, and stressful work deadlines appear to trigger flushing; morning standing triggers dizziness.',
    },
    sampleRecords: [
      {
        id: 'rec_allergy_note',
        filename: 'Allergy_Immunology_Consult.pdf',
        source: 'clinical_note',
        type: 'doctor_note',
        addedAt: '2024-09-18',
        findings: 'Patient reports episodes of flushing and lightheadedness. Skin exam normal today. Environmental IgE panel negative for common aeroallergens.',
      },
    ],
  },
];

/**
 * Returns all 4 canonical landing workflow scenarios.
 */
export function getLandingWorkflowScenarios(): LandingWorkflowScenario[] {
  return LANDING_WORKFLOW_SCENARIOS;
}

/**
 * Retrieves a specific workflow scenario by ID.
 */
export function getLandingWorkflowScenario(id: string): LandingWorkflowScenario | undefined {
  return LANDING_WORKFLOW_SCENARIOS.find(s => s.id === id);
}

/**
 * Instantiates a fully populated, living workflow case in CaseEngine.
 * Populates authentic records, timelines, and pre-computed Step 4 & 5 reasoning artifacts.
 */
export function instantiateWorkflowCase(scenarioId: string): CaseItem {
  const scenario = getLandingWorkflowScenario(scenarioId) || LANDING_WORKFLOW_SCENARIOS[0];

  // Convert scenario inputs into SourceLinkedEvidence facts
  const sourceLinkedFacts: SourceLinkedEvidence[] = scenario.whatToConnect.map((input, idx) => ({
    id: `fact_${scenario.id}_${idx + 1}`,
    fact: `${input.tag}: ${input.sourceExample}`,
    source: input.tag,
    category: idx === 0 ? 'user_report' : idx === 2 ? 'extracted_finding' : 'documented_clinician_assessment',
    allowedRole: 'Evidence of the reported experience',
    confidence: idx === 2 ? 'verified' : 'self_reported',
    timestamp: new Date(Date.now() - (30 - idx * 7) * 86400000).toISOString(),
  }));

  // Build the versioned evidence set (Step 5)
  const versionedEvidence = buildVersionedEvidenceSet(sourceLinkedFacts, scenario.sampleRecords);

  // Generate meaningful perspectives (Step 5)
  const meaningfulPerspectives = generateMeaningfulPerspectives(versionedEvidence, scenario.valuableOutput.supportedQuestions);

  // Execute bounded comparison (Step 5)
  const boundedComparison = executeBoundedComparison(meaningfulPerspectives, versionedEvidence);

  // Run the 10-stage reasoning depth engine (Step 4)
  const reasoningPipeline = runClinicalReasoningPipeline({
    documentedFacts: sourceLinkedFacts,
    primaryHypothesis: scenario.title,
    executiveSummary: scenario.valuableOutput.summaryStatement,
    uncertainties: scenario.valuableOutput.missingRecordsOrDates,
    missingLinks: [scenario.epistemicBoundary.whatToKeepSeparate],
    questionsForClinician: scenario.valuableOutput.supportedQuestions,
    perspectives: meaningfulPerspectives,
    alternatives: [
      {
        id: `alt_${scenario.id}_1`,
        type: 'connected_explanation',
        title: `Connected Multi-System Framework: ${scenario.title}`,
        mechanismSummary: scenario.valuableOutput.summaryStatement,
        likelihoodAssessment: 'leading',
        rationale: 'Accounts for temporal overlap between systemic signals while respecting documented data boundaries.',
      },
      {
        id: `alt_${scenario.id}_2`,
        type: 'separate_explanations',
        title: `Independent Co-Occurring Factors: ${scenario.epistemicBoundary.boundaryTitle}`,
        mechanismSummary: scenario.epistemicBoundary.whatToKeepSeparate,
        likelihoodAssessment: 'viable_alternative',
        rationale: scenario.epistemicBoundary.epistemicRisk,
      },
      {
        id: `alt_${scenario.id}_3`,
        type: 'insufficient_evidence',
        title: 'Epistemic Limits & Missing Confirmatory Testing',
        mechanismSummary: 'Crucial baseline data or clinical challenge testing is unrecorded.',
        likelihoodAssessment: 'insufficient_data',
        rationale: scenario.valuableOutput.missingRecordsOrDates.join(' '),
      },
    ],
  });

  // Create active case draft in CaseEngine
  const caseDraft = createCaseDraft({
    title: '[Example] ' + scenario.title,
    intakeData: {
      chiefComplaint: scenario.sampleIntake.chiefComplaint,
      timeline: scenario.sampleIntake.timeline,
      triggerContext: scenario.sampleIntake.triggerContext,
      scenarioId: scenario.id,
      isExample: true,
      workflowDesignStandard: 'Point 6: Useful reasoning, not generic advice',
      epistemicBoundary: scenario.epistemicBoundary,
    },
    specialists: [scenario.specialistTag],
    mode: 'jarvis',
    medicalRecords: scenario.sampleRecords as MedicalRecord[],
  });

  // Save the complete review snapshot to the newly created case
  const updatedCase = saveReviewSnapshot({
    caseId: caseDraft.id,
    type: 'jarvis',
    report: {
      primaryHypothesis: scenario.title,
      executiveSummary: scenario.valuableOutput.summaryStatement,
      documentedFacts: sourceLinkedFacts,
      uncertainties: scenario.valuableOutput.missingRecordsOrDates,
      missingLinks: [scenario.epistemicBoundary.whatToKeepSeparate],
      questionsForClinician: scenario.valuableOutput.supportedQuestions,
      reasoningPipeline,
      versionedEvidence,
      meaningfulPerspectives,
      boundedComparison,
      perspectives: meaningfulPerspectives,
      workflowDesign: {
        example: scenario.example,
        whatToConnect: scenario.whatToConnect,
        epistemicBoundary: scenario.epistemicBoundary,
        valuableOutput: scenario.valuableOutput,
      },
    },
  });

  return updatedCase;
}

/**
 * Returns a comparison between generic advice and useful reasoning for a given scenario.
 */
export function compareGenericVsUsefulReasoning(scenarioId: string): GenericVsUsefulComparison {
  const scenario = getLandingWorkflowScenario(scenarioId) || LANDING_WORKFLOW_SCENARIOS[0];
  return scenario.comparison;
}
