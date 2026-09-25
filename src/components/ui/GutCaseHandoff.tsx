import React, { useEffect, useState } from 'react';
import { ArrowRight, FileText } from 'lucide-react';
import { getCases, type CaseItem } from '../../services/CaseEngine';
import { addGutQuestionToCase, getGutCaseFollowThrough } from '../../services/GutCaseHandoffService';
import type { GutQuestionThread } from '../../services/GutResolutionService';

interface Props {
  thread: GutQuestionThread;
  onOpenCasePrep: (caseId: string) => void;
  onOpenCases: () => void;
}

export const GutCaseHandoff: React.FC<Props> = ({ thread, onOpenCasePrep, onOpenCases }) => {
  const [cases, setCases] = useState<CaseItem[]>(() => getCases().filter((item) => item.status === 'active'));
  const [followThrough, setFollowThrough] = useState(() => getGutCaseFollowThrough(thread));
  const [caseId, setCaseId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const refresh = () => { setCases(getCases().filter((item) => item.status === 'active')); setFollowThrough(getGutCaseFollowThrough(thread)); };
    window.addEventListener('hc_cases_updated', refresh);
    window.addEventListener('hc_profile_updated', refresh);
    return () => { window.removeEventListener('hc_cases_updated', refresh); window.removeEventListener('hc_profile_updated', refresh); };
  }, [thread]);

  const handoff = () => {
    if (!caseId) return;
    const result = addGutQuestionToCase(thread, caseId);
    if (!result.ok) {
      setMessage(result.reason === 'question_missing' ? 'This Gut question is no longer available in the active profile.' : result.reason === 'case_missing' ? 'That case is no longer active. Choose another case.' : 'The question could not be saved to the case. Please try again.');
      return;
    }
    onOpenCasePrep(result.caseId);
  };

  return <section className="gr-case-handoff" aria-label="Prepare this question for a visit">
    <span className="gr-case-icon" aria-hidden="true"><FileText size={19} /></span>
    <div className="gr-case-content"><strong>Bring this question to a visit</strong><p>Choose a case to add your question to its appointment brief. Meal reports and research stay in Gut Health; they are not presented as clinician findings.</p>
      {followThrough.length > 0 && <div className="gr-case-return"><strong>Visit follow-through from Case Prep</strong>{followThrough.slice(0, 3).map((entry) => <div className="gr-case-return-item" key={`${entry.caseId}:${entry.questionId}`}><span>{entry.caseTitle || 'Untitled case'} · {entry.status}{entry.outcomeDate ? ` · ${entry.outcomeDate.slice(0, 10)}` : ''}</span>{entry.outcomeNote && <p><b>{entry.outcomeProvenance === 'user_reported_clinician_statement' || !entry.outcomeProvenance ? 'Patient-entered visit report:' : 'Case outcome (verify source in Case Prep):'}</b> {entry.outcomeNote}</p>}{entry.doctorAction && <small>Patient-entered action label: {entry.doctorAction}. Review the case before treating this as a care instruction.</small>}<button type="button" className="gr-link" onClick={() => onOpenCasePrep(entry.caseId)}>Open case source <ArrowRight size={14} /></button></div>)}{followThrough.length > 3 && <small>{followThrough.length - 3} more linked case outcome(s) in Case Prep.</small>}</div>}
      {cases.length ? <div className="gr-case-actions"><label htmlFor="gr-case-target">Case</label><select id="gr-case-target" value={caseId} onChange={(event) => { setCaseId(event.target.value); setMessage(''); }}><option value="">Choose a case</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.title || 'Untitled case'}</option>)}</select><button type="button" className="gr-secondary" disabled={!caseId} onClick={handoff}>Add question and open brief <ArrowRight size={15} /></button></div> : <button type="button" className="gr-secondary" onClick={onOpenCases}>Create or choose a case <ArrowRight size={15} /></button>}
      {message && <p role="alert" className="gr-case-error">{message}</p>}
    </div>
  </section>;
};
