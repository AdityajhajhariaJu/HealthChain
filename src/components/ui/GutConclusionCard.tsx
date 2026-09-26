import React from 'react';
import { ArrowRight, BookOpen, CircleHelp, ShieldCheck, Utensils } from 'lucide-react';
import type { GutAnswerState, GutEvidence, GutQuestionThread } from '../../services/GutResolutionService';
import type { GutSourceReference } from './GutSourceRecord';
import { getGutPublicSourceGuide } from '../../services/GutPublicSourceGuide';

interface Props {
  thread: GutQuestionThread;
  evidence: GutEvidence | null;
  state: GutAnswerState;
  onOpenSource: (source: GutSourceReference) => void;
  onInspect: (mealId?: string) => void;
  onResearch: () => void;
  onCopyBrief: () => void;
}

const stateLabel: Record<GutAnswerState, string> = {
  no_records: 'No matching records', needs_symptom: 'One detail optional', needs_one_fact: 'One report could help', date_only: 'Dates known · order unknown',
  reliable_timed: 'Timed records available', conflicts: 'Reports need review', single_confirmed: 'One reported occasion',
  mixed_counterexample: 'Reports are mixed', now_acute: 'Current concern', decision_recorded: 'Choice saved · outcome separate',
  visit_ready: 'Visit question saved', source_changed: 'Your records changed', research_outage: 'Research unavailable', account_sync_error: 'Sync needs attention',
};

function conclusionFor(thread: GutQuestionThread, evidence: GutEvidence | null) {
  if (thread.intent === 'now') return 'Your concern is saved in your words. This workspace cannot assess urgency or determine its cause.';
  if (thread.intent === 'decide') {
    const decision = thread.decision;
    if (decision?.outcome) return `You recorded what happened in your own words: “${decision.outcome}”`;
    if (decision?.chosen) return `You chose “${decision.options[decision.chosen].label || 'this option'}”. The actual meal and any symptom outcome remain unknown until you report them.`;
    return 'Your options are for thinking through a choice. Neither option is recorded as eaten, safe, or symptom-free.';
  }
  if (thread.intent === 'care' && !thread.focus) return 'Your question is ready to take to a clinician. Personal reports and general research remain separate; no diagnosis is inferred.';
  if (!thread.focus) return 'Your question is saved. Choose a saved meal name only if you want to compare your past reports; no meal link was inferred.';
  if (thread.symptom === 'unspecified') return 'Your question is saved. Select a symptom only if you want to compare symptom-specific reports.';
  return evidence?.answer || 'There are not enough matching records to summarize this comparison.';
}

export const GutConclusionCard: React.FC<Props> = ({ thread, evidence, state, onOpenSource, onInspect, onResearch, onCopyBrief }) => {
  const records = evidence?.occasions || [];
  const publicGuide = getGutPublicSourceGuide(thread.symptom);
  const total = (evidence?.support || 0) + (evidence?.tension || 0) + (evidence?.unknown || 0);
  const primaryAction = thread.intent === 'care'
    ? { label: 'Copy care brief', run: onCopyBrief }
    : thread.intent === 'decide'
      ? { label: 'Review my options', run: () => document.querySelector('.gr-decision')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
      : evidence?.nextQuestionMealId
    ? { label: 'Review one unanswered occasion', run: () => onInspect(evidence.nextQuestionMealId!) }
    : records.length
      ? { label: 'Inspect the records', run: () => onInspect() }
      : { label: 'Explore general research', run: onResearch };
  const displayedState = thread.intent === 'decide'
    ? thread.decision?.outcome ? 'Outcome reported' : thread.decision?.chosen ? 'Choice saved · outcome unknown' : 'Choice not made yet'
    : thread.intent === 'care' ? 'Visit question saved' : stateLabel[state];

  return <section className="gr-conclusion" aria-labelledby="gr-conclusion-title" data-state={state}>
    <div className="gr-conclusion-heading">
      <span className="gr-conclusion-icon" aria-hidden="true"><CircleHelp size={19} /></span>
      <div><div className="gr-conclusion-eyebrow">YOUR CONCLUSION TODAY</div><h3 id="gr-conclusion-title">What your saved information can say</h3></div>
      <span className="gr-conclusion-state">{displayedState}</span>
    </div>
    <p className="gr-conclusion-answer">{conclusionFor(thread, evidence)}</p>
    <div className="gr-conclusion-actions gr-conclusion-actions-first">
      <button type="button" className="gr-primary" onClick={primaryAction.run}>{primaryAction.label}<ArrowRight size={16} /></button>
      {records.length > 0 ? <button type="button" className="gr-secondary" onClick={onResearch}><BookOpen size={16} />Research</button> : <button type="button" className="gr-secondary" onClick={() => onInspect()}><Utensils size={16} />My records</button>}
    </div>

    {records.length > 0 ? <>
      <div className="gr-conclusion-counts" aria-label={`${evidence?.support || 0} reports with the symptom, ${evidence?.tension || 0} without, ${evidence?.unknown || 0} unknown or disputed`}>
        <div data-tone="support"><strong>{evidence?.support || 0}</strong><span>with report</span></div>
        <div data-tone="counter"><strong>{evidence?.tension || 0}</strong><span>without report</span></div>
        <div data-tone="unknown"><strong>{evidence?.unknown || 0}</strong><span>unknown / disputed</span></div>
      </div>
      {total > 0 && <div className="gr-conclusion-distribution"><span>Saved occasion mix</span><div role="img" aria-label={`${evidence?.support || 0} with report, ${evidence?.tension || 0} without report, ${evidence?.unknown || 0} unknown or disputed. This is a count, not a probability.`}><i data-tone="support" style={{ width: `${((evidence?.support || 0) / total) * 100}%` }} /><i data-tone="counter" style={{ width: `${((evidence?.tension || 0) / total) * 100}%` }} /><i data-tone="unknown" style={{ width: `${((evidence?.unknown || 0) / total) * 100}%` }} /></div><small>Counts only · not a probability or prediction</small></div>}
      <div className="gr-conclusion-occasions" aria-label="Open the exact source for a recorded occasion">
        {records.slice(0, 8).map((item) => {
          const state = item.answerOrigin === 'conflict' ? 'conflict' : item.answer;
          const label = state === 'yes' ? 'symptom reported' : state === 'no' ? 'symptom not reported' : state === 'conflict' ? 'reports disagree' : 'outcome unknown';
          return <button type="button" key={item.meal.id} data-outcome={state} onClick={() => onOpenSource({ sourceKind: item.meal.sourceKind || 'diet_meal', sourceId: item.meal.id, localDate: item.meal.date })} aria-label={`${item.meal.name}, ${item.meal.date}, ${label}. Open exact source`}>
            <i aria-hidden="true" /><span><strong>{item.meal.name}</strong><small>{item.meal.date} · {label}</small></span><ArrowRight size={15} aria-hidden="true" />
          </button>;
        })}
        {records.length > 8 && <span className="gr-conclusion-more">+{records.length - 8} more saved occasions</span>}
      </div>
    </> : <div className="gr-conclusion-empty"><span aria-hidden="true"><BookOpen size={18} /></span><p>{!thread.focus && thread.intent !== 'decide' ? 'No meal has been linked to this question yet. Your saved records stay available to inspect; choosing a meal to compare is optional.' : 'No matching personal reports are available for this question yet. You can still read general research or bring the question to a clinician.'}</p></div>}

    {records.length === 0 && publicGuide && <div className="gr-conclusion-source"><strong>General context from NIDDK</strong><p>{publicGuide.sentence} {publicGuide.limit}</p><a href={publicGuide.url} target="_blank" rel="noopener noreferrer">Inspect original source <ArrowRight size={13} /></a></div>}

    {evidence?.nextQuestion && records.length > 0 && <p className="gr-conclusion-next"><ShieldCheck size={15} /><span><strong>What could help:</strong> {evidence.nextQuestion}</span></p>}
    <p className="gr-conclusion-caveat">Personal reports can show what was recorded; they cannot establish a diagnosis or prove a cause.</p>
  </section>;
};
