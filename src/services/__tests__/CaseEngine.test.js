// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createCaseDraft,
  getCases,
  getCase,
  ensureRecordPassages,
  getRecordPassage,
  addCaseQuestion,
  getCaseQuestions,
  updateCaseQuestionOutcome,
} from '../CaseEngine';

// Mock localStorage
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: function (key) {
      return store[key] || null;
    },
    setItem: function (key, value) {
      store[key] = value.toString();
    },
    removeItem: function (key) {
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

describe('CaseEngine', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a draft case correctly', () => {
    const draft = createCaseDraft({
      title: 'Test Draft Case',
      intakeData: { chiefComplaint: 'Headache' },
    });

    expect(draft).toBeDefined();
    expect(draft.title).toBe('Test Draft Case');
    expect(draft.intakeData.chiefComplaint).toBe('Headache');
    expect(draft.status).toBe('active');

    // Check if it was saved
    const cases = getCases();
    expect(cases.length).toBe(1);
    expect(cases[0].id).toBe(draft.id);
  });

  it('fetches an existing case by ID', () => {
    const draft = createCaseDraft({ title: 'Fetch Me' });
    const fetchedCase = getCase(draft.id);

    expect(fetchedCase).toBeDefined();
    expect(fetchedCase.title).toBe('Fetch Me');
  });

  it('generates resolvable passages for medical records and retrieves by ID', () => {
    const record = {
      id: 'rec_lab_123',
      title: 'Comprehensive Metabolic Panel',
      type: 'lab',
      date: '2026-03-01',
      findings: 'Serum Ferritin is severely depleted at 14 ng/mL. Standard serum iron is 65 ug/dL. High sensitivity CRP is elevated at 3.2 mg/L.',
    };

    const enhanced = ensureRecordPassages(record);
    expect(enhanced.passages).toBeDefined();
    expect(enhanced.passages.length).toBeGreaterThan(0);
    expect(enhanced.passages[0].id).toContain('summary_rec_lab_123');

    // Create a case with this record
    const c = createCaseDraft({
      title: 'Passage Test Case',
      medicalRecords: [enhanced],
    });

    const result = getRecordPassage(c.id, 'rec_lab_123', enhanced.passages[0].id);
    expect(result).toBeDefined();
    expect(result?.passage?.text).toContain('Serum Ferritin');
  });

  it('manages stable clinical questions and logs visit outcomes to timeline', () => {
    const c = createCaseDraft({ title: 'Question Bus Test' });

    const q = addCaseQuestion(c.id, {
      questionText: 'Is the orthostatic standing delta of 38 bpm primary or secondary?',
      raisedBySpecialty: 'Cardiology & Autonomic Board',
      supportingEvidenceIds: ['telemetry_ortho_38'],
    });

    expect(q.id).toBeDefined();
    expect(q.status).toBe('open');

    const questions = getCaseQuestions(c.id);
    expect(questions.length).toBe(1);
    expect(questions[0].questionText).toContain('38 bpm');

    // Update outcome
    const success = updateCaseQuestionOutcome(
      c.id,
      q.id,
      'addressed',
      'Clinician confirmed compensatory hyperadrenergic response; ordered tilt-table test.'
    );

    expect(success).toBe(true);

    const updatedCase = getCase(c.id);
    const updatedQ = updatedCase.questions.find((item) => item.id === q.id);
    expect(updatedQ.status).toBe('addressed');
    expect(updatedQ.outcomeNote).toContain('Clinician confirmed');

    // Verify timeline event was logged
    const outcomeEvent = updatedCase.events.find((e) => e.label === 'Physician Question Resolved');
    expect(outcomeEvent).toBeDefined();
    expect(outcomeEvent.note).toContain('Clinician confirmed');
  });
});
