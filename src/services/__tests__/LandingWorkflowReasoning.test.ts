// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLandingWorkflowScenarios,
  getLandingWorkflowScenario,
  instantiateWorkflowCase,
  compareGenericVsUsefulReasoning,
  LANDING_WORKFLOW_SCENARIOS
} from '../LandingCaseWorkflowEngine';
import { clearCaseEngineCache, getCase, getActiveCaseId } from '../CaseEngine';

describe('LandingWorkflowReasoning (Step 6)', () => {
  beforeEach(() => {
    localStorage.clear();
    clearCaseEngineCache();
  });

  describe('1. Canonical Workflow Scenarios (4 Rows from Reference Table)', () => {
    it('provides exactly the 4 canonical workflow design scenarios', () => {
      const scenarios = getLandingWorkflowScenarios();
      expect(scenarios).toHaveLength(4);

      const ids = scenarios.map(s => s.id);
      expect(ids).toEqual([
        'workflow_fatigue_iron',
        'workflow_headache_food',
        'workflow_palpitation_hr',
        'workflow_flushing_pots'
      ]);
    });

    it('Scenario 1: Fatigue, iron results, post-viral timeline matches reference specifications', () => {
      const scenario = getLandingWorkflowScenario('workflow_fatigue_iron');
      expect(scenario).toBeDefined();
      expect(scenario?.example).toBe('Fatigue, iron results, post-viral timeline');
      
      // What to connect
      const connectTags = scenario!.whatToConnect.map(c => c.tag.toLowerCase());
      expect(connectTags).toContain('symptom onset');
      expect(connectTags).toContain('illness dates');
      expect(connectTags).toContain('dated results');
      expect(connectTags).toContain('prior notes');

      // What to keep separate (Epistemic Boundary)
      expect(scenario!.epistemicBoundary.boundaryTitle).toBe(
        'A lab finding versus an explanation for all fatigue'
      );
      expect(scenario!.epistemicBoundary.whatToKeepSeparate).toContain('Ferritin');
      expect(scenario!.epistemicBoundary.safeguardRule).toContain('Never equate');

      // Valuable final output
      expect(scenario!.valuableOutput.clinicianQuote).toBe(
        'These events overlap; these dates or records are missing; here are the questions the available evidence supports.'
      );
      expect(scenario!.valuableOutput.overlappingEvents.length).toBeGreaterThan(0);
      expect(scenario!.valuableOutput.missingRecordsOrDates.length).toBeGreaterThan(0);
      expect(scenario!.valuableOutput.supportedQuestions.length).toBeGreaterThan(0);
    });

    it('Scenario 2: Morning headaches, food observations, prior care matches reference specifications', () => {
      const scenario = getLandingWorkflowScenario('workflow_headache_food');
      expect(scenario).toBeDefined();
      expect(scenario?.example).toBe('Morning headaches, food observations, prior care');

      // What to connect
      const connectTags = scenario!.whatToConnect.map(c => c.tag.toLowerCase());
      expect(connectTags).toContain('headache timing');
      expect(connectTags).toContain('sleep entries');
      expect(connectTags).toContain('food records');
      expect(connectTags).toContain('medication history');
      expect(connectTags).toContain('prior assessments');

      // What to keep separate
      expect(scenario!.epistemicBoundary.boundaryTitle).toBe(
        'Food timing versus a demonstrated trigger'
      );

      // Valuable final output
      expect(scenario!.valuableOutput.clinicianQuote).toBe(
        'A focused timeline showing recurring and non-recurring patterns, with alternative contexts.'
      );
    });

    it('Scenario 3: Post-meal palpitations and measured heart rate matches reference specifications', () => {
      const scenario = getLandingWorkflowScenario('workflow_palpitation_hr');
      expect(scenario).toBeDefined();
      expect(scenario?.example).toBe('Post-meal palpitations and measured heart rate');

      // What to connect
      const connectTags = scenario!.whatToConnect.map(c => c.tag.toLowerCase());
      expect(connectTags).toContain('meal time');
      expect(connectTags).toContain('symptom time');
      expect(connectTags).toContain('measurement conditions');
      expect(connectTags).toContain('posture & context');

      // What to keep separate
      expect(scenario!.epistemicBoundary.boundaryTitle).toBe(
        'Symptoms versus device readings; repeated observations versus isolated events'
      );

      // Valuable final output
      expect(scenario!.valuableOutput.clinicianQuote).toBe(
        'Comparable episodes, missing comparison information and a concise visit question.'
      );
    });

    it('Scenario 4: Flushing, postural symptoms, recurring observations matches reference specifications', () => {
      const scenario = getLandingWorkflowScenario('workflow_flushing_pots');
      expect(scenario).toBeDefined();
      expect(scenario?.example).toBe('Flushing, postural symptoms, recurring observations');

      // What to connect
      const connectTags = scenario!.whatToConnect.map(c => c.tag.toLowerCase());
      expect(connectTags).toContain('co-occurring symptoms');
      expect(connectTags).toContain('independent symptoms');
      expect(connectTags).toContain('temporal clustering');
      expect(connectTags).toContain('recurring triggers');

      // What to keep separate
      expect(scenario!.epistemicBoundary.boundaryTitle).toBe(
        'A cluster of observations versus a named syndrome'
      );

      // Valuable final output
      expect(scenario!.valuableOutput.clinicianQuote).toBe(
        'An explicit account of whether the record supports grouping them together.'
      );
    });
  });

  describe('2. Generic Advice vs Useful Reasoning Comparison', () => {
    it('articulates clinical pitfalls of generic advice and the value of useful reasoning for all scenarios', () => {
      LANDING_WORKFLOW_SCENARIOS.forEach(scenario => {
        const comp = compareGenericVsUsefulReasoning(scenario.id);
        expect(comp.genericAdvice).toBeDefined();
        expect(comp.genericPitfall.length).toBeGreaterThan(20);
        expect(comp.usefulReasoning.length).toBeGreaterThan(20);
        expect(comp.clinicalValue.length).toBeGreaterThan(20);
      });
    });
  });

  describe('3. Living Case Instantiation (No Placeholders)', () => {
    it('instantiates an active, functional CaseItem with medical records and pre-computed Step 4/5 reasoning pipeline', () => {
      const c = instantiateWorkflowCase('workflow_fatigue_iron');
      expect(c).toBeDefined();
      expect(c.id).toBeDefined();
      expect(c.title).toContain('Fatigue, Iron Results');
      expect(c.mode).toBe('jarvis');
      expect(c.medicalRecords.length).toBeGreaterThanOrEqual(2);

      // Case must be set as active in CaseEngine
      expect(getActiveCaseId()).toBe(c.id);

      // Verify case can be retrieved from storage
      const fetched = getCase(c.id);
      expect(fetched).toBeDefined();
      expect(fetched?.reviews).toHaveLength(1);

      const review = fetched!.reviews[0];
      expect(review.report).toBeDefined();

      // Step 4 Verification: 10-stage reasoning pipeline exists
      expect(review.report.reasoningPipeline).toBeDefined();
      expect(review.report.reasoningPipeline.stage1_facts.length).toBeGreaterThan(0);
      expect(review.report.reasoningPipeline.stage8_synthesis).toBeDefined();

      // Step 5 Verification: Meaningful multi-perspective review & bounded comparison exist
      expect(review.report.versionedEvidence).toBeDefined();
      expect(review.report.meaningfulPerspectives.length).toBeGreaterThanOrEqual(3);
      expect(review.report.boundedComparison).toBeDefined();
      expect(['unifying_explanation', 'multiple_unrelated_issues', 'insufficient_evidence']).toContain(
        review.report.boundedComparison.outcomeType
      );

      // Step 6 Verification: Workflow design metadata preserved
      expect(review.report.workflowDesign).toBeDefined();
      expect(review.report.workflowDesign.example).toBe('Fatigue, iron results, post-viral timeline');
      expect(review.report.workflowDesign.epistemicBoundary.boundaryTitle).toContain('lab finding');
    });

    it('can instantiate all 4 scenarios without errors', () => {
      const scenarioIds = [
        'workflow_fatigue_iron',
        'workflow_headache_food',
        'workflow_palpitation_hr',
        'workflow_flushing_pots'
      ];

      scenarioIds.forEach(id => {
        const c = instantiateWorkflowCase(id);
        expect(c).toBeDefined();
        expect(c.reviews.length).toBe(1);
        expect(c.reviews[0].report.workflowDesign.valuableOutput.clinicianQuote.length).toBeGreaterThan(15);
      });
    });
  });

  describe('4. Epistemic Safeguard: Not Conclusions About a Patient', () => {
    it('ensures all scenarios frame outputs as workflow designs, missing questions, and reviewable cases', () => {
      LANDING_WORKFLOW_SCENARIOS.forEach(scenario => {
        // Output must state what evidence supports or what questions remain, never a final medical diagnosis
        expect(scenario.valuableOutput.clinicianQuote).not.toContain('You have');
        expect(scenario.valuableOutput.clinicianQuote).not.toContain('Diagnosed with');
        expect(scenario.valuableOutput.supportedQuestions.length).toBeGreaterThan(0);
      });
    });
  });
});
