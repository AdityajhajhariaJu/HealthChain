import { CaseItem, createCaseDraft, MedicalRecord, saveReviewSnapshot } from './CaseEngine';
import { runClinicalReasoningPipeline, SourceLinkedEvidence } from './ClinicalReasoningEngine';
import {
  buildVersionedEvidenceSet,
  executeBoundedComparison,
  generateMeaningfulPerspectives,
} from './MultiPerspectiveReviewEngine';

import {
  getLandingWorkflowScenario,
  LANDING_WORKFLOW_SCENARIOS,
  type GenericVsUsefulComparison,
} from '../data/LandingWorkflowScenarios';
export {
  getLandingWorkflowScenario,
  getLandingWorkflowScenarios,
  LANDING_WORKFLOW_SCENARIOS,
} from '../data/LandingWorkflowScenarios';
export type {
  LandingWorkflowScenario,
  LandingWorkflowScenarioId,
  EpistemicBoundary,
  ValuableFinalOutput,
  GenericVsUsefulComparison,
  ConnectableInput,
} from '../data/LandingWorkflowScenarios';

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
    category:
      idx === 0
        ? 'user_report'
        : idx === 2
          ? 'extracted_finding'
          : 'documented_clinician_assessment',
    allowedRole: 'Evidence of the reported experience',
    confidence: idx === 2 ? 'verified' : 'self_reported',
    timestamp: new Date(Date.now() - (30 - idx * 7) * 86400000).toISOString(),
  }));

  // Build the versioned evidence set (Step 5)
  const versionedEvidence = buildVersionedEvidenceSet(sourceLinkedFacts, scenario.sampleRecords);

  // Generate meaningful perspectives (Step 5)
  const meaningfulPerspectives = generateMeaningfulPerspectives(
    versionedEvidence,
    scenario.valuableOutput.supportedQuestions
  );

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
        rationale:
          'Accounts for temporal overlap between systemic signals while respecting documented data boundaries.',
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
