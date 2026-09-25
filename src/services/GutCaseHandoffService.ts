import { addCaseQuestion, getCase, getCaseQuestions } from './CaseEngine';
import { listGutThreads, type GutQuestionThread } from './GutResolutionService';

export type GutCaseHandoffResult =
  | { ok: true; caseId: string; questionId: string; alreadyPresent: boolean }
  | { ok: false; reason: 'question_missing' | 'case_missing' | 'write_failed' };

/** A user-triggered copy of the question, not an import of evidence or a clinician plan. */
export function addGutQuestionToCase(thread: GutQuestionThread, caseId: string): GutCaseHandoffResult {
  if (!listGutThreads().some((item) => item.id === thread.id && item.profileId === thread.profileId)) return { ok: false, reason: 'question_missing' };
  const target = getCase(caseId);
  if (!target || target.status !== 'active') return { ok: false, reason: 'case_missing' };
  const existing = getCaseQuestions(caseId).find((item) => item.sourceRef?.feature === 'gut_resolution' && item.sourceRef.threadId === thread.id);
  if (existing) return { ok: true, caseId, questionId: existing.id, alreadyPresent: true };
  const duplicate = getCaseQuestions(caseId).find((item) => item.questionText.trim().toLocaleLowerCase() === thread.question.trim().toLocaleLowerCase());
  if (duplicate) return { ok: true, caseId, questionId: duplicate.id, alreadyPresent: true };
  const questionId = `gut_${thread.id}`;
  addCaseQuestion(caseId, {
    id: questionId,
    questionText: thread.question,
    raisedBySpecialty: 'Patient',
    supportingEvidenceIds: [],
    sourceRef: { feature: 'gut_resolution', threadId: thread.id, profileId: thread.profileId, threadUpdatedAt: thread.updatedAt },
  });
  return getCaseQuestions(caseId).some((item) => item.id === questionId)
    ? { ok: true, caseId, questionId, alreadyPresent: false }
    : { ok: false, reason: 'write_failed' };
}
