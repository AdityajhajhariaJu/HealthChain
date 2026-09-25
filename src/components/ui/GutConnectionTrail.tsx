import React, { useMemo, useState } from 'react';
import { Activity, ArrowRight, BookOpen, Compass, GitBranch, ShieldCheck, Utensils } from 'lucide-react';
import type { GutBacktraceProjection, GutEvidence, GutQuestionThread } from '../../services/GutResolutionService';
import { deriveGutDossier } from '../../services/GutResearchDossierService';
import type { GutSourceReference } from './GutSourceRecord';

interface Props {
  thread: GutQuestionThread;
  evidence: GutEvidence | null;
  backtrace: GutBacktraceProjection | null;
  dietMealIds: Set<string>;
  researchStatus: 'idle' | 'loading' | 'ready' | 'error';
  researchCount: number;
  onOpenEvidence: () => void;
  onOpenResearch: () => void;
  onOpenNext: () => void;
  onReviewMissing: (mealId: string) => void;
  onReviewOnset: () => void;
  onOpenSource: (source: GutSourceReference) => void;
}

/** A short first reading. The detailed reasoning stays behind three purposeful paths. */
export const GutConnectionTrail: React.FC<Props> = ({ thread, evidence, backtrace, dietMealIds, researchStatus, researchCount, onOpenEvidence, onOpenResearch, onOpenNext, onReviewMissing, onReviewOnset, onOpenSource }) => {
  const [showWhy, setShowWhy] = useState(false);
  const dossier = useMemo(() => deriveGutDossier(thread, evidence, backtrace, dietMealIds), [thread, evidence, backtrace, dietMealIds]);
  const reports = (evidence?.support || 0) + (evidence?.tension || 0);
  const counterexample = dossier.links.find((link) => link.relation === 'explicit_without');
  const openCounterexample = () => {
    if (!counterexample || counterexample.source.kind === 'publication') return;
    onOpenSource({ sourceKind: counterexample.source.kind, sourceId: counterexample.source.id, localDate: counterexample.source.localDate || undefined });
  };
  return <section className="gr-reading" aria-label="Question reading">
    <div className="gr-reading-heading"><span className="gr-reading-symbol"><GitBranch size={18} /></span><div><span className="gr-connection-eyebrow">YOUR QUESTION</span><h3>Start with what is known</h3></div></div>
    <p className="gr-reading-summary">{thread.focus ? evidence?.answer || dossier.reading : dossier.reading}</p>
    <div className="gr-reading-paths" aria-label="Explore this question">
      <button type="button" onClick={onOpenEvidence}><span className="gr-reading-icon gr-reading-records"><Utensils size={20} /></span><span><strong>My records</strong><small>{reports ? `${reports} explicit report${reports === 1 ? '' : 's'} · ${evidence?.unknown || 0} unresolved` : 'See what was actually saved'}</small></span><ArrowRight size={17} /></button>
      <button type="button" onClick={onOpenResearch}><span className="gr-reading-icon gr-reading-research"><BookOpen size={20} /></span><span><strong>What research studied</strong><small>{researchStatus === 'ready' ? `${researchCount} general source${researchCount === 1 ? '' : 's'}` : researchStatus === 'error' ? 'Sources unavailable for now' : 'Check the original study'}</small></span><ArrowRight size={17} /></button>
      <button type="button" onClick={onOpenNext}><span className="gr-reading-icon gr-reading-next"><Compass size={20} /></span><span><strong>One useful next step</strong><small>{thread.selectedStep || 'Decide, prepare a visit, or leave it open'}</small></span><ArrowRight size={17} /></button>
    </div>
    {counterexample && <button type="button" className="gr-reading-counterexample" onClick={openCounterexample}><GitBranch size={15} /><span>A counterexample is saved: open the exact occasion</span><ArrowRight size={14} /></button>}
    {dossier.nextFact && <div className="gr-reading-question"><div><strong>{dossier.nextFact.question}</strong><small>Optional. {dossier.nextFact.reason}</small></div><button type="button" onClick={() => setShowWhy(!showWhy)} aria-expanded={showWhy}>{showWhy ? 'Hide' : 'Why ask?'} <ArrowRight size={14} /></button></div>}
    {showWhy && dossier.nextFact && <div className="gr-reading-why"><p>Possible answers would change how this record is read. Neither path is a fact until you report it.</p><div>{dossier.nextFact.kind === 'meal_outcome' ? <><span>Symptom remembered → one more “with” report</span><span>Symptom absent → a counterexample</span></> : <><span>Onset known → inspect earlier records</span><span>Unsure → sequence stays unresolved</span></>}</div><button type="button" onClick={() => dossier.nextFact?.sourceId ? onReviewMissing(dossier.nextFact.sourceId) : onReviewOnset()}>Review this detail <ArrowRight size={14} /></button><button type="button" onClick={() => setShowWhy(false)}>Leave it open</button></div>}
    {dossier.links.some((link) => link.lane === 'context') && <details className="gr-reading-context"><summary><Activity size={15} /> Other nearby records</summary><p>These records share a date or precede the browsing anchor. They are context, not evidence of cause.</p>{dossier.links.filter((link) => link.lane === 'context').slice(0, 4).map((link) => <button type="button" key={link.id} onClick={() => link.source.kind !== 'publication' && onOpenSource({ sourceKind: link.source.kind, sourceId: link.source.id, localDate: link.source.localDate || undefined })}>{link.label} <ArrowRight size={14} /></button>)}</details>}
    <p className="gr-reading-foot"><ShieldCheck size={15} /> Personal reports and published research answer different questions. Neither establishes a cause here.</p>
  </section>;
};
