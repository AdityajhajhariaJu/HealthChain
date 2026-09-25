import React, { useEffect, useState } from 'react';
import { ArrowRight, FileText } from 'lucide-react';
import { getCases, type CaseItem } from '../../services/CaseEngine';
import { addGutQuestionToCase } from '../../services/GutCaseHandoffService';
import type { GutQuestionThread } from '../../services/GutResolutionService';

interface Props {
  thread: GutQuestionThread;
  onOpenCasePrep: (caseId: string) => void;
  onOpenCases: () => void;
}

export const GutCaseHandoff: React.FC<Props> = ({ thread, onOpenCasePrep, onOpenCases }) => {
  const [cases, setCases] = useState<CaseItem[]>(() => getCases().filter((item) => item.status === 'active'));
  const [caseId, setCaseId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const refresh = () => setCases(getCases().filter((item) => item.status === 'active'));
    window.addEventListener('hc_cases_updated', refresh);
    return () => window.removeEventListener('hc_cases_updated', refresh);
  }, []);

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
      {cases.length ? <div className="gr-case-actions"><label htmlFor="gr-case-target">Case</label><select id="gr-case-target" value={caseId} onChange={(event) => { setCaseId(event.target.value); setMessage(''); }}><option value="">Choose a case</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.title || 'Untitled case'}</option>)}</select><button type="button" className="gr-secondary" disabled={!caseId} onClick={handoff}>Add question and open brief <ArrowRight size={15} /></button></div> : <button type="button" className="gr-secondary" onClick={onOpenCases}>Create or choose a case <ArrowRight size={15} /></button>}
      {message && <p role="alert" className="gr-case-error">{message}</p>}
    </div>
  </section>;
};
