// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  FEATURE_CONTRACTS,
  FeatureId,
  getAllFeatureContracts,
  getFeatureContract,
  getDownstreamHandoffs,
  getUpstreamFeeds,
} from '../FeatureArchitectureContract';
import { getUnifiedCaseScope, validateCaseIdentifier } from '../caseWorkspace';
import { createCaseDraft, setActiveCase, getActiveCaseId, clearCaseEngineCache } from '../CaseEngine';

describe('Feature Handoffs & Route Integrity (Work Package 4)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearCaseEngineCache();
  });

  describe('Step 1-5: Plain Language & Canonical Contract Integrity', () => {
    const ALL_12_FEATURES: FeatureId[] = [
      'ava',
      'engine',
      'connection-detective',
      'canvas',
      'cases',
      'case-prep',
      'medicine-labs',
      'diet-plan',
      'food-detective',
      'elimination-suite',
      'clinical-trials',
      'zen-garden',
    ];

    it('verifies every canonical feature defines plainDescription and plainPurpose without internal jargon', () => {
      const contracts = getAllFeatureContracts();
      expect(contracts).toHaveLength(12);

      for (const contract of contracts) {
        expect(contract.plainDescription).toBeDefined();
        expect(typeof contract.plainDescription).toBe('string');
        expect(contract.plainDescription!.trim().length).toBeGreaterThan(10);

        expect(contract.plainPurpose).toBeDefined();
        expect(typeof contract.plainPurpose).toBe('string');
        expect(contract.plainPurpose!.trim().length).toBeGreaterThan(10);

        // Verify plain descriptions do not contain internal architecture jargon
        expect(contract.plainDescription!.toLowerCase()).not.toContain('upstream feed');
        expect(contract.plainDescription!.toLowerCase()).not.toContain('downstream consumer');
        expect(contract.plainDescription!.toLowerCase()).not.toContain('strict boundary');
      }
    });

    it('verifies all downstream handoffs map to valid app routes', () => {
      const validAppRoutes = [
        '/app/ava',
        '/app/consult',
        '/app/cases',
        '/app/my-cases',
        '/app/case-prep',
        '/app/medicine-lab',
        '/app/dietician',
        '/app/trials',
        '/app/today',
        '/app/profile',
      ];

      for (const featId of ALL_12_FEATURES) {
        const handoffs = getDownstreamHandoffs(featId);
        for (const handoff of handoffs) {
          expect(validAppRoutes).toContain(handoff.route);
          expect(handoff.label.trim().length).toBeGreaterThan(0);
          expect(handoff.actionDescription.trim().length).toBeGreaterThan(5);
        }
      }
    });
  });

  describe('Step 6-11: Destination Validation & Missing Identifiers', () => {
    it('detects missing case IDs explicitly without falling back to an unrelated case', () => {
      const realCase = createCaseDraft({
        title: 'Patient Active Record',
        concern: 'Persistent fatigue',
      });
      setActiveCase(realCase.id);

      // Explicit target that does not exist
      const scope = getUnifiedCaseScope('case_missing_target_123');
      expect(scope.isRequestedCaseMissing).toBe(true);
      expect(scope.requestedCaseId).toBe('case_missing_target_123');
      expect(scope.caseItem).toBeNull();
      expect(scope.caseId).toBeNull();
    });

    it('resolves the correct case when explicit target exists', () => {
      const targetCase = createCaseDraft({
        title: 'Target Case',
        concern: 'Explicitly requested by URL parameter',
      });

      const scope = getUnifiedCaseScope(targetCase.id);
      expect(scope.isRequestedCaseMissing).toBe(false);
      expect(scope.caseItem?.id).toBe(targetCase.id);
      expect(scope.caseId).toBe(targetCase.id);
    });

    it('validateCaseIdentifier accurately differentiates existing vs non-existing cases', () => {
      expect(validateCaseIdentifier(null).isValid).toBe(false);
      expect(validateCaseIdentifier('').isValid).toBe(false);
      expect(validateCaseIdentifier('invalid_id_999').isValid).toBe(false);

      const created = createCaseDraft({
        title: 'Known ID Case',
        concern: 'Validation test',
      });
      const validResult = validateCaseIdentifier(created.id);
      expect(validResult.isValid).toBe(true);
      expect(validResult.caseItem?.id).toBe(created.id);
    });
  });

  describe('Step 12-16: Route Harmonization & Health Canvas Identity', () => {
    it('resolves active case ID for Health Canvas routing', () => {
      const sampleCase = createCaseDraft({
        title: 'Active Canvas Case',
        concern: 'Cardiovascular investigation',
      });
      setActiveCase(sampleCase.id);

      const activeId = getActiveCaseId();
      expect(activeId).toBe(sampleCase.id);

      // War Room redirect target should resolve to Health Canvas at /app/cases/:id
      const expectedPath = activeId ? `/app/cases/${activeId}` : '/app/my-cases';
      expect(expectedPath).toBe(`/app/cases/${sampleCase.id}`);
    });

    it('falls back to /app/my-cases when no active case exists for War Room redirect', () => {
      const activeId = getActiveCaseId();
      expect(activeId).toBeNull();

      const expectedPath = activeId ? `/app/cases/${activeId}` : '/app/my-cases';
      expect(expectedPath).toBe('/app/my-cases');
    });
  });
});
