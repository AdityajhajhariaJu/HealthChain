// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  account: 'user_account_1',
  profile: 'profile_patient_1',
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
}));

vi.mock('idb-keyval', () => ({
  get: mockState.get,
  set: mockState.set,
  del: mockState.del,
  keys: mockState.keys,
}));

vi.mock('../ProfileEngine', () => ({
  getProfileKey: () => mockState.account,
  getProfileEngineState: () => ({ activeId: mockState.profile }),
}));

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

import {
  saveOriginalCaseFile,
  loadOriginalCaseFile,
  checkOriginalFileAvailability,
  reattachOriginalCaseFile,
  deleteOriginalCaseFile,
  cleanupCaseOriginalFiles,
  validateCaseFile,
  FileStorageError,
} from '../caseRecordFiles';

import {
  matchesBiomarkerValue,
  matchesBiomarkerName,
  preserveAmbiguousDate,
  preserveAmbiguousUnit,
} from '../clinicalReview';

import {
  createCaseDraft,
  getCase,
  deleteCase,
  deleteCaseRecord,
  updateExtractedFindingCorrection,
  ensureRecordPassages,
  MedicalRecord,
} from '../CaseEngine';

describe('Package 2: Document Extraction and Correction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.account = 'user_account_1';
    mockState.profile = 'profile_patient_1';
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('1. Original File Storage Failure Modes & Cleanup', () => {
    it('validates document size and format, rejecting 0-byte, oversize, and unsupported types', () => {
      // 0-byte file
      const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
      expect(() => validateCaseFile(emptyFile)).toThrowError(FileStorageError);
      try {
        validateCaseFile(emptyFile);
      } catch (e: any) {
        expect(e.code).toBe('unsupported_file');
        expect(e.message).toContain('0 bytes');
      }

      // Oversize file (> 10MB)
      const bigBuffer = new Uint8Array(11 * 1024 * 1024);
      const bigFile = new File([bigBuffer], 'huge.pdf', { type: 'application/pdf' });
      expect(() => validateCaseFile(bigFile)).toThrowError(FileStorageError);
      try {
        validateCaseFile(bigFile);
      } catch (e: any) {
        expect(e.code).toBe('unsupported_file');
        expect(e.message).toContain('maximum');
      }

      // Unsupported format (e.g. executable or binary)
      const exeFile = new File(['bin'], 'malicious.exe', { type: 'application/x-msdownload' });
      expect(() => validateCaseFile(exeFile)).toThrowError(FileStorageError);
      try {
        validateCaseFile(exeFile);
      } catch (e: any) {
        expect(e.code).toBe('unsupported_file');
        expect(e.message).toContain('Unsupported document format');
      }
    });

    it('handles quota exceeded error gracefully with quota_exceeded code', async () => {
      const quotaErr = new Error('Quota exceeded on device');
      quotaErr.name = 'QuotaExceededError';
      mockState.set.mockRejectedValueOnce(quotaErr);

      const validPdf = new File(['sample pdf content'], 'report.pdf', { type: 'application/pdf' });
      await expect(saveOriginalCaseFile('case_123', 'rec_456', validPdf)).rejects.toThrowError(FileStorageError);

      try {
        mockState.set.mockRejectedValueOnce(quotaErr);
        await saveOriginalCaseFile('case_123', 'rec_456', validPdf);
      } catch (e: any) {
        expect(e.code).toBe('quota_exceeded');
        expect(e.message).toContain('Device storage limit exceeded');
      }
    });

    it('handles generic storage unavailable error when write fails', async () => {
      mockState.set.mockRejectedValueOnce(new Error('IndexedDB transaction aborted'));

      const validPng = new File(['image bytes'], 'scan.png', { type: 'image/png' });
      try {
        await saveOriginalCaseFile('case_123', 'rec_456', validPng);
      } catch (e: any) {
        expect(e.code).toBe('storage_unavailable');
      }
    });

    it('protects against profile switch mid-operation by rolling back and throwing profile_mismatch', async () => {
      mockState.set.mockImplementationOnce(async () => {
        // Switch profile in the middle of save
        mockState.profile = 'profile_patient_2';
      });

      const validPdf = new File(['sample content'], 'lab.pdf', { type: 'application/pdf' });
      await expect(saveOriginalCaseFile('case_123', 'rec_456', validPdf)).rejects.toThrowError(FileStorageError);

      try {
        mockState.set.mockImplementationOnce(async () => {
          mockState.profile = 'profile_patient_2';
        });
        await saveOriginalCaseFile('case_123', 'rec_456', validPdf);
      } catch (e: any) {
        expect(e.code).toBe('profile_mismatch');
        expect(mockState.del).toHaveBeenCalled(); // verified rollback
      }
    });

    it('accurately reports original file availability across devices without broken links', async () => {
      // Not present
      mockState.get.mockResolvedValueOnce(undefined);
      const unavailable = await checkOriginalFileAvailability('case_123', 'rec_missing');
      expect(unavailable.isAvailable).toBe(false);
      expect(unavailable.reason).toBe('Original file unavailable on this device');

      // Present
      mockState.get.mockResolvedValueOnce(new Blob(['pdf content'], { type: 'application/pdf' }));
      const available = await checkOriginalFileAvailability('case_123', 'rec_present');
      expect(available.isAvailable).toBe(true);
      expect(available.reason).toBeUndefined();
    });

    it('reattaches original file and dispatches hc_case_file_reattached event', async () => {
      let eventFired = false;
      const handler = (e: any) => {
        if (e.detail?.caseId === 'case_123' && e.detail?.recordId === 'rec_789') {
          eventFired = true;
        }
      };
      window.addEventListener('hc_case_file_reattached', handler);

      const reattachedFile = new File(['restored document'], 'restored.pdf', { type: 'application/pdf' });
      await reattachOriginalCaseFile('case_123', 'rec_789', reattachedFile);

      expect(mockState.set).toHaveBeenCalled();
      expect(eventFired).toBe(true);
      window.removeEventListener('hc_case_file_reattached', handler);
    });

    it('deletes original file blob when single case record is deleted', async () => {
      const caseItem = createCaseDraft({
        title: 'Cardiac Review',
        medicalRecords: [
          {
            id: 'rec_del_1',
            filename: 'lipid_panel.pdf',
            source: 'upload',
            type: 'application/pdf',
            addedAt: new Date().toISOString(),
            findings: 'Total cholesterol 240 mg/dL',
          },
          {
            id: 'rec_del_2',
            filename: 'cbc.pdf',
            source: 'upload',
            type: 'application/pdf',
            addedAt: new Date().toISOString(),
            findings: 'WBC 6.5',
          },
        ],
      });

      const updated = deleteCaseRecord(caseItem.id, 'rec_del_1');
      expect(updated).not.toBeNull();
      expect(updated?.medicalRecords?.length).toBe(1);
      expect(updated?.medicalRecords?.[0].id).toBe('rec_del_2');
      expect(mockState.del).toHaveBeenCalledWith(
        `hc_original_record:user_account_1:profile_patient_1:${caseItem.id}:rec_del_1`
      );
    });

    it('cleans up all associated original files when a case is deleted', async () => {
      const caseItem = createCaseDraft({
        title: 'Endocrine Investigation',
        medicalRecords: [
          {
            id: 'rec_endo_1',
            filename: 'tsh.pdf',
            source: 'upload',
            type: 'application/pdf',
            addedAt: new Date().toISOString(),
            findings: 'TSH 4.2',
          },
        ],
      });

      // Mock keys in storage
      mockState.keys.mockResolvedValueOnce([
        `hc_original_record:user_account_1:profile_patient_1:${caseItem.id}:rec_endo_1`,
        `hc_original_record:user_account_1:profile_patient_1:other_case:rec_other`,
      ]);

      deleteCase(caseItem.id);

      expect(getCase(caseItem.id)).toBeUndefined();
      // Verify cleanupCaseOriginalFiles was triggered
      expect(mockState.keys).toHaveBeenCalled();
    });
  });

  describe('2. Structural Biomarker Matching', () => {
    it('enforces word and digit boundaries preventing 12 from matching 112, 120, or decimals', () => {
      // Negative tests: 12 must NOT match numbers containing 12 as a substring
      expect(matchesBiomarkerValue('Glucose level: 112 mg/dL', '12')).toBe(false);
      expect(matchesBiomarkerValue('Triglycerides: 120 mg/dL', '12')).toBe(false);
      expect(matchesBiomarkerValue('Platelets: 212 K/uL', '12')).toBe(false);
      expect(matchesBiomarkerValue('Creatinine: 1.12 mg/dL', '12')).toBe(false);
      expect(matchesBiomarkerValue('Hemoglobin: 12.5 g/dL', '12')).toBe(false);

      // Positive tests: exact 12 matches cleanly
      expect(matchesBiomarkerValue('Hemoglobin: 12 g/dL', '12')).toBe(true);
      expect(matchesBiomarkerValue('Measured value (12)', '12')).toBe(true);
      expect(matchesBiomarkerValue('Result: 12.0', '12')).toBe(false); // strict decimal precision
      expect(matchesBiomarkerValue('Result: 12.0 mg/dL', '12.0')).toBe(true);
      expect(matchesBiomarkerValue('Anion Gap: 12', '12')).toBe(true);
    });

    it('matches boundary values with inequality operators accurately', () => {
      expect(matchesBiomarkerValue('TSH: <0.01 mIU/L', '<0.01')).toBe(true);
      expect(matchesBiomarkerValue('TSH: < 0.01 mIU/L', '<0.01')).toBe(true);
      expect(matchesBiomarkerValue('TSH: <0.015 mIU/L', '<0.01')).toBe(false);
      expect(matchesBiomarkerValue('Ferritin: >100 ng/mL', '>100')).toBe(true);
      expect(matchesBiomarkerValue('Ferritin: >1000 ng/mL', '>100')).toBe(false);
    });

    it('structurally matches biomarker names without partial token substring collisions', () => {
      expect(matchesBiomarkerName('TSH: 2.1 mIU/L', 'TSH')).toBe(true);
      expect(matchesBiomarkerName('Serum TSH reflex to free T4', 'TSH')).toBe(true);
      expect(matchesBiomarkerName('TSH3 test', 'TSH')).toBe(false);
      expect(matchesBiomarkerName('ATSH', 'TSH')).toBe(false);
      expect(matchesBiomarkerName('Glucose fasting: 95 mg/dL', 'Glucose')).toBe(true);
      expect(matchesBiomarkerName('Glucosed', 'Glucose')).toBe(false);
    });
  });

  describe('3. Ambiguous Date and Unit Preservation', () => {
    it('preserves ambiguous dates without speculative timestamp guessing', () => {
      // Explicit ISO date - non-ambiguous
      const iso = preserveAmbiguousDate('2026-03-01');
      expect(iso.isAmbiguous).toBe(false);
      expect(iso.normalizedDate).toBe('2026-03-01');

      // Ambiguous DD/MM vs MM/DD numeric date
      const ambiguousSlash = preserveAmbiguousDate('01/02/2026');
      expect(ambiguousSlash.isAmbiguous).toBe(true);
      expect(ambiguousSlash.rawString).toBe('01/02/2026');

      // Approximate / qualitative text dates
      const monthYear = preserveAmbiguousDate('March 2025');
      expect(monthYear.isAmbiguous).toBe(true);
      expect(monthYear.rawString).toBe('March 2025');

      const undated = preserveAmbiguousDate('undated');
      expect(undated.isAmbiguous).toBe(true);
      expect(undated.rawString).toBe('undated');

      const empty = preserveAmbiguousDate('');
      expect(empty.isAmbiguous).toBe(true);
      expect(empty.rawString).toBe('');
    });

    it('preserves non-standard or missing units without speculative coercion', () => {
      const standard = preserveAmbiguousUnit('mg/dL');
      expect(standard.isAmbiguous).toBe(false);
      expect(standard.unit).toBe('mg/dL');

      const ratio = preserveAmbiguousUnit('ratio');
      expect(ratio.isAmbiguous).toBe(true);
      expect(ratio.rawUnit).toBe('ratio');

      const arbitrary = preserveAmbiguousUnit('arb. units');
      expect(arbitrary.isAmbiguous).toBe(true);
      expect(arbitrary.rawUnit).toBe('arb. units');

      const missing = preserveAmbiguousUnit(undefined);
      expect(missing.isAmbiguous).toBe(true);
      expect(missing.rawUnit).toBe('');
    });
  });

  describe('4. Non-Destructive User Correction & Audit Trail', () => {
    it('initializes record passages with originalText, provisional status, and empty auditTrail', () => {
      const record: MedicalRecord = {
        id: 'rec_init_1',
        filename: 'cbc_report.pdf',
        source: 'upload',
        type: 'application/pdf',
        addedAt: new Date().toISOString(),
        findings: 'Hemoglobin 13.5 g/dL. Platelets 250 K/uL.',
      };

      const enriched = ensureRecordPassages(record);
      expect(enriched.passages).toBeDefined();
      expect(enriched.passages?.length).toBeGreaterThan(0);
      for (const p of enriched.passages || []) {
        expect(p.originalText).toBe(p.text);
        expect(p.extractionStatus).toBe('provisional');
        expect(p.auditTrail).toEqual([]);
      }
    });

    it('applies non-destructive corrections preserving original text and logging audit trail', () => {
      const caseItem = createCaseDraft({
        title: 'Hematology Review',
        medicalRecords: [
          {
            id: 'rec_corr_1',
            filename: 'cbc_scan.pdf',
            source: 'upload',
            type: 'application/pdf',
            addedAt: new Date().toISOString(),
            findings: 'WBC 112 K/uL (Suspected extraction error: actual was 12)',
            passages: [
              {
                id: 'pas_1',
                text: 'WBC 112 K/uL',
                originalText: 'WBC 112 K/uL',
                extractionStatus: 'provisional',
                auditTrail: [],
              },
            ],
          },
        ],
      });

      // User corrects the extraction from 112 to 12
      const updatedCase = updateExtractedFindingCorrection(
        caseItem.id,
        'rec_corr_1',
        'pas_1',
        'WBC 12 K/uL'
      );

      expect(updatedCase).not.toBeNull();
      const updatedRecord = updatedCase?.medicalRecords?.find((r) => r.id === 'rec_corr_1');
      expect(updatedRecord).toBeDefined();
      expect(updatedRecord?.extractionStatus).toBe('user_corrected');

      const correctedPassage = updatedRecord?.passages?.find((p) => p.id === 'pas_1');
      expect(correctedPassage).toBeDefined();
      // Current text updated to corrected value
      expect(correctedPassage?.text).toBe('WBC 12 K/uL');
      // ORIGINAL TEXT REMAINS COMPLETELY INTACT
      expect(correctedPassage?.originalText).toBe('WBC 112 K/uL');
      expect(correctedPassage?.extractionStatus).toBe('user_corrected');

      // Audit trail contains non-repudiable audit entry
      expect(correctedPassage?.auditTrail?.length).toBe(1);
      const audit = correctedPassage?.auditTrail?.[0];
      expect(audit?.originalText).toBe('WBC 112 K/uL');
      expect(audit?.correctedText).toBe('WBC 12 K/uL');
      expect(audit?.correctedBy).toBe('user');
      expect(audit?.correctedAt).toBeDefined();

      // Subsequent correction appends to audit trail rather than overwriting
      const secondUpdate = updateExtractedFindingCorrection(
        caseItem.id,
        'rec_corr_1',
        'pas_1',
        'WBC 12.1 K/uL'
      );
      const secondPassage = secondUpdate?.medicalRecords?.[0].passages?.[0];
      expect(secondPassage?.text).toBe('WBC 12.1 K/uL');
      expect(secondPassage?.originalText).toBe('WBC 112 K/uL');
      expect(secondPassage?.auditTrail?.length).toBe(2);
      expect(secondPassage?.auditTrail?.[1].originalText).toBe('WBC 12 K/uL');
      expect(secondPassage?.auditTrail?.[1].correctedText).toBe('WBC 12.1 K/uL');
    });
  });
});
