import { addCaseQuestion, getCase, getCaseQuestions, getCases, type OutcomeProvenance, type QuestionLifecycleStatus } from './CaseEngine';
import { listGutThreads, type GutQuestionThread } from './GutResolutionService';

export type GutCaseHandoffResult =
  | { ok: true; caseId: string; questionId: string; alreadyPresent: boolean }
  | { ok: false; reason: 'question_missing' | 'case_missing' | 'write_failed' };

export interface GutCaseFollowThrough {
  caseId: string;
  caseTitle: string;
  questionId: string;
  status: QuestionLifecycleStatus;
  outcomeNote: string | null;
  outcomeDate: string | null;
  outcomeProvenance: OutcomeProvenance | null;
  doctorAction: string | null;
}

/** Read only: the case remains the source of the visit outcome and any correction. */
export function getGutCaseFollowThrough(thread: GutQuestionThread): GutCaseFollowThrough[] {
  if (!listGutThreads().some((item) => item.id === thread.id && item.profileId === thread.profileId)) return [];
  return getCases().flatMap((item) => (item.questions || [])
    .filter((question) => question.sourceRef?.feature === 'gut_resolution' && question.sourceRef.threadId === thread.id && question.sourceRef.profileId === thread.profileId)
    .map((question) => ({
      caseId: item.id, caseTitle: item.title, questionId: question.id, status: question.status,
      outcomeNote: question.outcomeNote?.trim() || null,
      outcomeDate: question.outcomeDate || null,
      outcomeProvenance: question.outcomeProvenance || null,
      doctorAction: question.doctorAction?.trim() || null,
    })))
    .sort((a, b) => (b.outcomeDate || '').localeCompare(a.outcomeDate || ''));
}

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
