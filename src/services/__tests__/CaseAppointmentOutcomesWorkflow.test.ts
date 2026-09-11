// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createCaseDraft,
  getCases,
  getCase,
  addCaseQuestion,
  getCaseQuestions,
  transitionCaseQuestionLifecycle,
  recordCaseQuestionOutcome,
  setQuestionsForAppointment,
  saveAppointmentBrief,
  generateStableQuestionId,
  clearCaseEngineCache,
  appendCaseRecords,
} from '../CaseEngine';
import { generateDeterministicBrief } from '../AppointmentBriefService';

// Mock localStorage for isolated testing
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: function (key: string) {
      return store[key] || null;
    },
    setItem: function (key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem: function (key: string) {
      delete store[key];
    },
    clear: function () {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Package 5 — Case Appointment Outcomes Workflow', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearCaseEngineCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('executes full 7-step workflow: case creation -> question selection -> Brief v1 -> outcomes -> new data -> Brief v2 diffing -> persistence', () => {
    // =========================================================================
    // STEP 1: User selects a case with observations and initial record
    // =========================================================================
    const initialCase = createCaseDraft({
      title: 'Persistent Orthostatic Tachycardia & Fatigue',
      intakeData: {
        chiefComplaint: 'Postural lightheadedness, heart rate jumps by 40 bpm upon standing, brain fog.',
      },
      medicalRecords: [
        {
          id: 'rec_ecg_01',
          filename: '12-Lead-ECG.pdf',
          source: 'Cardiology Clinic',
          type: 'ecg',
          findings: 'Sinus tachycardia at 112 bpm upon standing. Normal QT interval, no ST elevation.',
          addedAt: '2026-03-01T10:00:00.000Z',
        },
      ],
    });

    expect(initialCase.id).toBeDefined();
    expect(initialCase.title).toContain('Orthostatic Tachycardia');

    // =========================================================================
    // STEP 2: Harvest & seed clinical questions with deterministic deduplication
    // =========================================================================
    const q1 = addCaseQuestion(initialCase.id, {
      questionText: 'Is the orthostatic standing heart rate surge secondary to hypovolemia or hyperadrenergic POTS?',
      raisedBySpecialty: 'Cardiology',
      supportingEvidenceIds: ['rec_ecg_01'],
      status: 'open',
    });

    const q2 = addCaseQuestion(initialCase.id, {
      questionText: 'Could hidden iron depletion (ferritin < 30) explain the persistent exercise intolerance?',
      raisedBySpecialty: 'Hematology',
      supportingEvidenceIds: ['rec_ecg_01'],
      status: 'open',
    });

    const q3 = addCaseQuestion(initialCase.id, {
      questionText: 'Should a thyroid function panel be ordered to exclude hyperthyroidism?',
      raisedBySpecialty: 'Endocrinology',
      supportingEvidenceIds: [],
      status: 'open',
    });

    // Invariant: Questions have stable IDs
    expect(q1.id).toBeDefined();
    expect(q2.id).toBeDefined();
    expect(q3.id).toBeDefined();

    // Deduplication test: re-adding identical question should reuse existing question
    const q1Duplicate = addCaseQuestion(initialCase.id, {
      questionText: 'Is the orthostatic standing heart rate surge secondary to hypovolemia or hyperadrenergic POTS?',
      raisedBySpecialty: 'Cardiology',
      supportingEvidenceIds: [],
      status: 'open',
    });
    expect(q1Duplicate.id).toBe(q1.id);
    expect(getCaseQuestions(initialCase.id).length).toBe(3);

    // =========================================================================
    // STEP 3: User selects questions for the appointment
    // =========================================================================
    const selectedQuestionIds = [q1.id, q2.id, q3.id];
    const selectionSuccess = setQuestionsForAppointment(initialCase.id, selectedQuestionIds);
    expect(selectionSuccess).toBe(true);

    const afterSelectionQuestions = getCaseQuestions(initialCase.id);
    expect(afterSelectionQuestions.every(q => q.status === 'prepared')).toBe(true);

    // =========================================================================
    // STEP 4: User prepares Brief v1
    // =========================================================================
    const mockProfile = {
      name: 'Aditya',
      medications: ['Electrolyte hydration salts 1000mg daily'],
      conditions: ['Orthostatic intolerance'],
      updatedAt: '2026-03-01T09:00:00.000Z',
    };

    const reloadedCase1 = getCase(initialCase.id)!;
    const briefV1Draft = generateDeterministicBrief(reloadedCase1, mockProfile, {
      selectedQuestionIds,
    });
    briefV1Draft.generatedAt = '2026-03-02T10:00:00.000Z';

    const caseAfterV1 = saveAppointmentBrief(initialCase.id, briefV1Draft)!;
    expect(caseAfterV1.appointmentBriefs?.current).toBeDefined();
    expect(caseAfterV1.appointmentBriefs?.current?.version).toBe(1);
    expect(caseAfterV1.appointmentBriefs?.history?.length).toBe(0); // v1 is first, no prior history yet

    // =========================================================================
    // STEP 5: User records what happened at the appointment
    // Invariants:
    // - "Discussed" must NOT automatically mean "resolved"
    // - Store outcome date, note, doctor action, and provenance
    // - Provenance is 'user_reported_clinician_statement'
    // =========================================================================

    // Q1 Discussed: Doctor confirmed orthostatic tachycardia, ordered tilt-table test (remains open/discussed)
    const outcome1Success = recordCaseQuestionOutcome(
      initialCase.id,
      q1.id,
      'discussed',
      'Doctor agreed presentation fits POTS criteria; ordered tilt-table test.',
      {
        doctorAction: 'Ordered diagnostic lab / scan',
        provenance: 'user_reported_clinician_statement',
        outcomeDate: '2026-03-03T14:00:00.000Z',
      }
    );
    expect(outcome1Success).toBe(true);

    // Q2 Deferred: Deferred pending ferritin lab results
    const outcome2Success = recordCaseQuestionOutcome(
      initialCase.id,
      q2.id,
      'deferred',
      'Doctor deferred medication decision until full ferritin and iron saturation panel is completed.',
      {
        doctorAction: 'Ordered diagnostic lab / scan',
        provenance: 'user_reported_clinician_statement',
        outcomeDate: '2026-03-03T14:15:00.000Z',
      }
    );
    expect(outcome2Success).toBe(true);

    // Q3 Resolved: Doctor reviewed past TSH, ruled out hyperthyroidism
    const outcome3Success = recordCaseQuestionOutcome(
      initialCase.id,
      q3.id,
      'resolved',
      'TSH normal at 1.8 mIU/L; thyroid disease clinically excluded.',
      {
        doctorAction: 'General discussion / clinical reassurance',
        provenance: 'user_reported_clinician_statement',
        outcomeDate: '2026-03-03T14:30:00.000Z',
      }
    );
    expect(outcome3Success).toBe(true);

    // Verify Question Lifecycle Invariants on the Case Object
    const caseAfterOutcomes = getCase(initialCase.id)!;
    const recordedQ1 = caseAfterOutcomes.questions?.find(q => q.id === q1.id)!;
    const recordedQ2 = caseAfterOutcomes.questions?.find(q => q.id === q2.id)!;
    const recordedQ3 = caseAfterOutcomes.questions?.find(q => q.id === q3.id)!;

    // Strict invariant: "Discussed" has discussedAt set, but resolvedAt is strictly undefined!
    expect(recordedQ1.status).toBe('discussed');
    expect(recordedQ1.discussedAt).toBeDefined();
    expect(recordedQ1.resolvedAt).toBeUndefined();
    expect(recordedQ1.outcomeProvenance).toBe('user_reported_clinician_statement');
    expect(recordedQ1.doctorAction).toBe('Ordered diagnostic lab / scan');

    // Strict invariant: "Deferred" has deferredAt set
    expect(recordedQ2.status).toBe('deferred');
    expect(recordedQ2.deferredAt).toBeDefined();
    expect(recordedQ2.resolvedAt).toBeUndefined();

    // Strict invariant: "Resolved" has resolvedAt set
    expect(recordedQ3.status).toBe('resolved');
    expect(recordedQ3.resolvedAt).toBeDefined();

    // Verify case timeline events recorded with patient-reported provenance note
    const discussedEvent = caseAfterOutcomes.events?.find(e => e.label === 'Physician Question Discussed');
    expect(discussedEvent).toBeDefined();
    expect(discussedEvent?.note).toContain('Patient-reported clinician statement');

    // =========================================================================
    // STEP 6: Patient attaches new lab records & logs new symptoms before Visit 2
    // =========================================================================
    appendCaseRecords(initialCase.id, [
      {
        id: 'rec_ferritin_02',
        filename: 'Iron-and-Ferritin-Panel.pdf',
        source: 'Hematology Lab',
        type: 'lab',
        findings: 'Serum Ferritin is 14 ng/mL (depleted iron stores). Iron saturation 18%.',
        addedAt: '2026-03-05T11:00:00.000Z',
      },
    ]);

    // =========================================================================
    // STEP 7: The next visit shows what changed (Brief v2 with continuity diffing)
    // =========================================================================
    const caseBeforeV2 = getCase(initialCase.id)!;
    expect(caseBeforeV2.medicalRecords?.length).toBe(2);

    const briefV2Draft = generateDeterministicBrief(caseBeforeV2, mockProfile);
    briefV2Draft.generatedAt = '2026-03-06T09:00:00.000Z';

    const caseAfterV2 = saveAppointmentBrief(initialCase.id, briefV2Draft)!;

    // 1. Monotonic versioning check: v1 -> v2
    expect(caseAfterV2.appointmentBriefs?.current?.version).toBe(2);

    // 2. Immutability of history: v1 is in history as an untouched snapshot
    expect(caseAfterV2.appointmentBriefs?.history?.length).toBe(1);
    expect(caseAfterV2.appointmentBriefs?.history?.[0]?.version).toBe(1);
    expect(caseAfterV2.appointmentBriefs?.history?.[0]?.generatedAt).toBe('2026-03-02T10:00:00.000Z');

    // 3. What Changed Since Last Visit: Previous outcomes reviewed is populated
    const v2Brief = caseAfterV2.appointmentBriefs?.current!;
    expect(v2Brief.previousOutcomesReviewed).toBeDefined();
    expect(v2Brief.previousOutcomesReviewed?.length).toBeGreaterThanOrEqual(3);

    const reviewedQ1 = v2Brief.previousOutcomesReviewed?.find(po => po.questionId === q1.id);
    expect(reviewedQ1).toBeDefined();
    expect(reviewedQ1?.status).toBe('discussed');
    expect(reviewedQ1?.note).toContain('fits POTS criteria');
    expect(reviewedQ1?.provenance).toBe('user_reported_clinician_statement');

    const reviewedQ2 = v2Brief.previousOutcomesReviewed?.find(po => po.questionId === q2.id);
    expect(reviewedQ2?.status).toBe('deferred');

    const reviewedQ3 = v2Brief.previousOutcomesReviewed?.find(po => po.questionId === q3.id);
    expect(reviewedQ3?.status).toBe('resolved');

    // 4. What Changed Since Last Visit: Changes since last visit includes newly attached record
    expect(v2Brief.changesSinceLastVisit).toBeDefined();
    const recordAdditionChange = v2Brief.changesSinceLastVisit?.find(c => c.type === 'record_added');
    expect(recordAdditionChange).toBeDefined();
    expect(recordAdditionChange?.description).toContain('Iron-and-Ferritin-Panel.pdf');

    // 5. Questions carried forward for clinician in v2
    expect(v2Brief.questionsForClinician).toBeDefined();
    expect(v2Brief.questionsForClinician?.length).toBeGreaterThan(0);

    // =========================================================================
    // STEP 8: Cross-session persistence / reload simulation
    // Verify that clearing the in-memory cache and re-reading from storage
    // preserves all questions, outcomes, provenance tags, and brief history.
    // =========================================================================
    clearCaseEngineCache();

    const rehydratedCases = getCases();
    expect(rehydratedCases.length).toBe(1);

    const rehydratedCase = rehydratedCases[0];
    expect(rehydratedCase.id).toBe(initialCase.id);

    // Verify all 3 questions survived reload with precise lifecycle states
    expect(rehydratedCase.questions?.length).toBe(3);
    const rehydratedQ1 = rehydratedCase.questions?.find(q => q.id === q1.id)!;
    expect(rehydratedQ1.status).toBe('discussed');
    expect(rehydratedQ1.outcomeProvenance).toBe('user_reported_clinician_statement');
    expect(rehydratedQ1.discussedAt).toBeDefined();
    expect(rehydratedQ1.resolvedAt).toBeUndefined();

    const rehydratedQ2 = rehydratedCase.questions?.find(q => q.id === q2.id)!;
    expect(rehydratedQ2.status).toBe('deferred');
    expect(rehydratedQ2.deferredAt).toBeDefined();

    const rehydratedQ3 = rehydratedCase.questions?.find(q => q.id === q3.id)!;
    expect(rehydratedQ3.status).toBe('resolved');
    expect(rehydratedQ3.resolvedAt).toBeDefined();

    // Verify both Brief v2 (current) and Brief v1 (history) survived reload intact
    expect(rehydratedCase.appointmentBriefs?.current?.version).toBe(2);
    expect(rehydratedCase.appointmentBriefs?.history?.length).toBe(1);
    expect(rehydratedCase.appointmentBriefs?.history?.[0]?.version).toBe(1);
    expect(rehydratedCase.appointmentBriefs?.current?.previousOutcomesReviewed?.length).toBeGreaterThanOrEqual(3);
  });
});
