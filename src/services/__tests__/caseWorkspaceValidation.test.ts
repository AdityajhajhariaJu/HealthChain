// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { getUnifiedCaseScope, validateCaseIdentifier } from '../caseWorkspace';
import { createCaseDraft, setActiveCase } from '../CaseEngine';

describe('caseWorkspace Validation & Missing Identifier Detection', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('validateCaseIdentifier', () => {
    it('returns false with clear error for empty or whitespace case IDs', () => {
      expect(validateCaseIdentifier('')).toEqual({
        isValid: false,
        caseItem: null,
        error: 'No case identifier was provided.',
      });
      expect(validateCaseIdentifier('   ')).toEqual({
        isValid: false,
        caseItem: null,
        error: 'No case identifier was provided.',
      });
      expect(validateCaseIdentifier(null)).toEqual({
        isValid: false,
        caseItem: null,
        error: 'No case identifier was provided.',
      });
      expect(validateCaseIdentifier(undefined)).toEqual({
        isValid: false,
        caseItem: null,
        error: 'No case identifier was provided.',
      });
    });

    it('returns false with explicit not-found error for non-existent case ID', () => {
      const result = validateCaseIdentifier('case_non_existent_999');
      expect(result.isValid).toBe(false);
      expect(result.caseItem).toBeNull();
      expect(result.error).toContain('case_non_existent_999');
    });

    it('returns true with resolved caseItem when case ID exists', () => {
      const newCase = createCaseDraft({
        title: 'Validation Test Case',
        intakeData: { chiefComplaint: 'Testing validation semantics' },
      });
      expect(newCase).toBeDefined();

      const result = validateCaseIdentifier(newCase.id);
      expect(result.isValid).toBe(true);
      expect(result.caseItem).not.toBeNull();
      expect(result.caseItem?.id).toBe(newCase.id);
      expect(result.caseItem?.title).toBe('Validation Test Case');
    });
  });

  describe('getUnifiedCaseScope', () => {
    it('flags isRequestedCaseMissing without silently falling back when explicit ID does not exist', () => {
      // Create a background case so storage is not empty
      const backgroundCase = createCaseDraft({
        title: 'Background Active Case',
        intakeData: { chiefComplaint: 'Should not be silently selected' },
      });
      setActiveCase(backgroundCase.id);

      const scope = getUnifiedCaseScope('case_invalid_target_404');
      // Must NOT silently fall back to backgroundCase!
      expect(scope.isRequestedCaseMissing).toBe(true);
      expect(scope.requestedCaseId).toBe('case_invalid_target_404');
      expect(scope.caseItem).toBeNull();
      expect(scope.caseId).toBeNull();
      expect(scope.validationError).toContain('case_invalid_target_404');
    });

    it('successfully resolves requested case when explicit ID exists', () => {
      const targetCase = createCaseDraft({
        title: 'Target Case',
        intakeData: { chiefComplaint: 'Explicitly targeted' },
      });

      const scope = getUnifiedCaseScope(targetCase.id);
      expect(scope.isRequestedCaseMissing).toBe(false);
      expect(scope.caseItem?.id).toBe(targetCase.id);
      expect(scope.caseId).toBe(targetCase.id);
      expect(scope.validationError).toBeUndefined();
    });

    it('falls back to active case only when preferredCaseId is omitted or undefined', () => {
      const activeCase = createCaseDraft({
        title: 'Active Case For Default Fallback',
        intakeData: { chiefComplaint: 'Normal default context' },
      });
      setActiveCase(activeCase.id);

      const scope = getUnifiedCaseScope();
      expect(scope.isRequestedCaseMissing).toBe(false);
      expect(scope.caseItem?.id).toBe(activeCase.id);
      expect(scope.caseId).toBe(activeCase.id);
    });
  });
});
