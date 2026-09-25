import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GutQuestionThread } from '../GutResolutionService';

const state = vi.hoisted(() => ({ questions: [] as any[], caseActive: true, threadAvailable: true }));
vi.mock('../CaseEngine', () => ({
  getCase: (id: string) => id === 'case-1' && state.caseActive ? { id, status: 'active' } : null,
  getCaseQuestions: () => state.questions,
  addCaseQuestion: (_id: string, question: any) => { state.questions.push(question); return question; },
}));
vi.mock('../GutResolutionService', () => ({ listGutThreads: () => state.threadAvailable ? [thread] : [] }));

import { addGutQuestionToCase } from '../GutCaseHandoffService';

const thread: GutQuestionThread = {
  id: 'thread-1', schemaVersion: 1, ownerKey: 'owner', profileId: 'profile-1', intent: 'care',
  question: 'What should I ask about recurring bloating?', focus: '', symptom: 'bloating',
  status: 'open', selectedStep: null, reflection: null, excludedMealIds: [], reviewedEvidence: null,
  createdAt: '2026-09-25T10:00:00Z', updatedAt: '2026-09-25T10:00:00Z',
};

describe('Gut question to case handoff', () => {
  beforeEach(() => { state.questions = []; state.caseActive = true; state.threadAvailable = true; });

  it('copies only the user question after choosing an active case and keeps a source reference', () => {
    expect(addGutQuestionToCase(thread, 'case-1')).toEqual({ ok: true, caseId: 'case-1', questionId: 'gut_thread-1', alreadyPresent: false });
    expect(state.questions[0]).toMatchObject({ questionText: thread.question, raisedBySpecialty: 'Patient', supportingEvidenceIds: [], sourceRef: { feature: 'gut_resolution', threadId: thread.id, profileId: thread.profileId } });
    expect(addGutQuestionToCase(thread, 'case-1')).toMatchObject({ ok: true, alreadyPresent: true });
    expect(state.questions).toHaveLength(1);
  });

  it('rejects missing cases and out-of-scope questions without writing', () => {
    expect(addGutQuestionToCase(thread, 'wrong')).toEqual({ ok: false, reason: 'case_missing' });
    state.threadAvailable = false;
    expect(addGutQuestionToCase(thread, 'case-1')).toEqual({ ok: false, reason: 'question_missing' });
    expect(state.questions).toHaveLength(0);
  });
});
