// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCaseDraft,
  saveReviewSnapshot,
  ensureRecordPassages,
  getRecordPassage,
  getCaseQuestions,
  addCaseQuestion,
  updateCaseQuestionOutcome,
  clearCaseEngineCache,
} from '../CaseEngine';
import { getConnectionDetectiveReport } from '../ConnectionDetectiveEngine';
import { getHealthMemory, recordHealthMemory } from '../HealthMemory';

describe('8 Core Landing Page Promises Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    clearCaseEngineCache();
  });

  it('Promise 1: Multi-Perspective Specialist Review generates explicit stances and clinical questions', () => {
    const c = createCaseDraft({ title: 'Multi-Perspective Case' });
    const updatedCase = saveReviewSnapshot({
      caseId: c.id,
      type: 'jarvis',
      report: {
        perspectives: [
          {
            id: 'pers_test_1',
            specialty: 'Autonomic Neurology',
            doctorName: 'Dr. Elena Rostova',
            uniqueContribution: 'Strongly supports postural orthostatic tachycardia syndrome.',
            supportingEvidenceIds: ['delta_38_bpm'],
            remainingQuestions: [],
          },
          {
            id: 'pers_test_2',
            specialty: 'Hematology / Metabolism',
            doctorName: 'Dr. Marcus Vance',
            uniqueContribution: 'Identifies functional non-anemic iron deficiency as co-factor.',
            supportingEvidenceIds: ['ferritin_14'],
            remainingQuestions: [],
          }
        ],
        questions: [
          {
            questionText: 'Has a 10-minute NASA Lean Test been completed?',
            raisedBySpecialty: 'Autonomic Neurology',
            supportingEvidenceIds: ['delta_38_bpm'],
            status: 'open',
          },
        ],
      },
    });

    const latestReview = updatedCase.reviews[0];
    expect(latestReview.perspectives).toHaveLength(2);
    expect(latestReview.perspectives?.[0].specialty).toBe('Autonomic Neurology');
    expect(latestReview.perspectives?.[0].uniqueContribution).toContain('orthostatic tachycardia');
    expect(latestReview.perspectives?.[1].doctorName).toBe('Dr. Marcus Vance');

    const caseQuestions = getCaseQuestions(c.id);
    expect(caseQuestions.length).toBeGreaterThanOrEqual(1);
    expect(caseQuestions[0].questionText).toContain('NASA Lean Test');
  });

  it('Promise 2 & 6: One continuous workflow & Doctor visit outcome recording', () => {
    const c = createCaseDraft({ title: 'Continuous Workflow Case' });
    const q = addCaseQuestion(c.id, {
      questionText: 'Should we order an active NASA lean tilt log?',
      raisedBySpecialty: 'Cardiology',
      supportingEvidenceIds: [],
      status: 'open',
    });

    expect(q).toBeDefined();
    expect(q?.status).toBe('open');

    // Simulate post-visit outcome recording by user
    const success = updateCaseQuestionOutcome(
      c.id,
      q!.id,
      'addressed',
      'Doctor agreed and scheduled tilt-table study for next Tuesday.'
    );

    expect(success).toBe(true);
    const updatedQuestions = getCaseQuestions(c.id);
    const found = updatedQuestions.find((item) => item.id === q!.id);
    expect(found?.status).toBe('addressed');
    expect(found?.outcomeNote).toContain('scheduled tilt-table study');
  });

  it('Promise 3: Cross-System Thinking explains why edges exist, supporting evidence & weakening factors', () => {
    const report = getConnectionDetectiveReport();
    const connections = report.mapData.connections;

    expect(connections.length).toBeGreaterThan(0);
    const ferritinEdge = connections.find((e) => e.from === 'cond_ferritin' && e.to === 'symp_fatigue');
    expect(ferritinEdge).toBeDefined();
    expect(ferritinEdge?.whyItExists).toContain('mitochondrial complex I and IV');
    expect(ferritinEdge?.supportingEvidenceIds).toBeDefined();
    expect(ferritinEdge?.weakeningFactors).toBeDefined();
    expect(ferritinEdge?.weakeningFactors?.[0]).toContain('Normal hemoglobin');

    const potsEdge = connections.find((e) => e.from === 'cond_pots' && e.to === 'symp_palpitations');
    expect(potsEdge).toBeDefined();
    expect(potsEdge?.whyItExists).toContain('Venous pooling upon standing');
  });

  it('Promise 4: Keep the source visible with resolvable document and passage references', () => {
    const record = {
      id: 'rec_endocrinology_01',
      filename: 'Endocrine Panel & Thyroid Antibodies',
      source: 'diagnostic_lab',
      type: 'lab',
      addedAt: '2026-02-15',
      findings: 'TSH is 2.8 mIU/L. Free T3 is 2.4 pg/mL (low-optimal). TPO Antibodies are negative (<9 IU/mL).',
    };

    const enhanced = ensureRecordPassages(record);
    expect(enhanced.passages).toBeDefined();
    expect(enhanced.passages!.length).toBeGreaterThan(0);

    const c = createCaseDraft({
      title: 'Thyroid Diagnostic Case',
      medicalRecords: [enhanced],
    });

    const passageResult = getRecordPassage(c.id, 'rec_endocrinology_01', enhanced.passages![0].id);
    expect(passageResult).not.toBeNull();
    expect(passageResult?.record.filename).toBe('Endocrine Panel & Thyroid Antibodies');
    expect(passageResult?.passage?.text).toContain('Free T3');
  });

  it('Promise 5: Never repeat your story semantic memory accounting', () => {
    recordHealthMemory({
      kind: 'health_buddy',
      source: 'health_buddy',
      title: 'Patient experienced postprandial tachycardia 45 minutes after fermented meal.',
      occurredAt: new Date().toISOString(),
      payload: { symptom: 'tachycardia', trigger: 'fermented food' },
    });

    const memories = getHealthMemory();
    expect(memories.length).toBeGreaterThanOrEqual(1);
    expect(memories.some((m) => m.title.includes('postprandial tachycardia'))).toBe(true);
  });
});
