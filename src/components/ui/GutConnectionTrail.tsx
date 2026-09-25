import React from 'react';
import { Activity, ArrowRight, BookOpen, Clipboard, GitBranch, ShieldCheck, Utensils } from 'lucide-react';
import type { GutMeal } from '../../services/GutHealthSummary';
import type { GutBacktraceProjection, GutEvidence, GutQuestionThread } from '../../services/GutResolutionService';
import type { GutSourceReference } from './GutSourceRecord';

interface Props {
  thread: GutQuestionThread;
  evidence: GutEvidence | null;
  backtrace: GutBacktraceProjection | null;
  meals: GutMeal[];
  dietMealIds: Set<string>;
  trial: { status: string; checkins: number } | null;
  researchStatus: 'idle' | 'loading' | 'ready' | 'error';
  researchCount: number;
  onOpenEvidence: () => void;
  onChooseComparison: () => void;
  onOpenResearch: () => void;
  onOpenNext: () => void;
  onReviewMissing: (mealId: string) => void;
  onOpenSource: (source: GutSourceReference) => void;
  onOpenHistory: () => void;
  onOpenTrial?: () => void;
  onRecordMeal: () => void;
}

export const GutConnectionTrail: React.FC<Props> = ({ thread, evidence, backtrace, meals, dietMealIds, trial, researchStatus, researchCount, onOpenEvidence, onChooseComparison, onOpenResearch, onOpenNext, onReviewMissing, onOpenSource, onOpenHistory, onOpenTrial, onRecordMeal }) => {
  const occasions = evidence?.occasions || [];
  const explicit = (evidence?.support || 0) + (evidence?.tension || 0);
  const timed = backtrace?.timedItems || [];
  const dated = backtrace?.dateOnlyItems || [];
  const alternatives = evidence?.bundle.alternativeContext || [];
  const selectedStep = thread.selectedStep?.trim();
  const actionLabel = thread.intent === 'now' ? 'Review care next steps' : thread.intent === 'care' ? 'Prepare a visit' : thread.intent === 'decide' ? 'Review next steps' : 'Choose a next step';

  return <section className="gr-connection-trail" aria-label="Connected record trail">
    <div className="gr-connection-head"><span className="gr-connection-mark"><GitBranch size={19} /></span><div><span className="gr-connection-eyebrow">LIVING QUESTION MAP</span><h3>Follow the connections</h3><p>Open each link to inspect its source. A shared date or sequence does not prove a cause.</p></div></div>
    <div className="gr-connection-question"><strong>{thread.question}</strong><span>{thread.focus ? `Examining “${thread.focus}”` : 'No meal comparison chosen'} · {thread.symptom === 'unspecified' ? 'symptom not selected' : thread.symptom.replace('_', ' ')}</span></div>
    <div className="gr-connection-grid">
      <details className="gr-connection-node">
        <summary><span className="gr-connection-node-icon"><Utensils size={17} /></span><span><strong>Meal reports</strong><small>{thread.focus ? `${occasions.length} matching occasion${occasions.length === 1 ? '' : 's'} · ${explicit} explicit outcome${explicit === 1 ? '' : 's'}` : `${meals.length} saved meal${meals.length === 1 ? '' : 's'} · choose a comparison`}</small></span></summary>
        <div className="gr-connection-detail">
          {!thread.focus ? <><p>Saved meals become comparable when you choose a meal or phrase. A matching name alone does not prove the same recipe.</p><button type="button" className="gr-connection-more" onClick={onChooseComparison}>Choose a meal to examine <ArrowRight size={14} /></button></> : occasions.length === 0 ? <p>No saved meal name matches this phrase. Your question can remain open.</p> : <>
            <p>{evidence?.support || 0} with the selected symptom · {evidence?.tension || 0} without · {evidence?.unknown || 0} unknown or disputed. Only explicit reports count.</p>
            {occasions.slice(0, 3).map(({ meal, answer, answerOrigin }) => <button type="button" key={meal.id} onClick={() => onOpenSource({ sourceKind: dietMealIds.has(meal.id) ? 'diet_meal' : 'observation', sourceId: meal.id, localDate: meal.date })}><span>{meal.name} · {meal.date}</span><small>{answerOrigin === 'conflict' ? 'Reports disagree' : answer === 'yes' ? 'Symptom reported' : answer === 'no' ? 'No symptom reported' : 'Outcome unknown'}</small><ArrowRight size={14} /></button>)}
            <button type="button" className="gr-connection-more" onClick={onOpenEvidence}>Inspect all meal evidence <ArrowRight size={14} /></button>
          </>}
          <button type="button" className="gr-connection-more" onClick={onRecordMeal}>Record a meal <ArrowRight size={14} /></button>
        </div>
      </details>

      <details className="gr-connection-node">
        <summary><span className="gr-connection-node-icon"><Activity size={17} /></span><span><strong>Time & other context</strong><small>{timed.length} timed · {dated.length} date-only · {alternatives.length} other same-date source{alternatives.length === 1 ? '' : 's'}</small></span></summary>
        <div className="gr-connection-detail">
          <p>The 48-hour window is anchored to when this question was saved, not to a verified symptom onset. Timing and other factors do not establish cause.</p>
          {[...timed, ...dated].slice(0, 3).map((item) => <button type="button" key={`${item.sourceKind}:${item.sourceId}`} onClick={() => onOpenSource({ sourceKind: item.sourceKind, sourceId: item.sourceId, localDate: 'sourceLocalDate' in item && typeof item.sourceLocalDate === 'string' ? item.sourceLocalDate : item.localDate })}><span>{item.label}</span><small>{item.localDate} · {item.sourceKind.replace('_', ' ')}</small><ArrowRight size={14} /></button>)}
          {alternatives.slice(0, 2).map((item) => <button type="button" key={`${item.kind}:${item.sourceId}`} onClick={() => onOpenSource({ sourceKind: item.kind === 'other_meal_same_date' ? dietMealIds.has(item.sourceId) ? 'diet_meal' : 'observation' : 'observation', sourceId: item.sourceId, localDate: occasions.find((occasion) => occasion.alternativeContext.some((context) => context.sourceId === item.sourceId))?.meal.date || '' })}><span>{item.label}</span><small>Other same-date {item.contextType || 'meal'} record</small><ArrowRight size={14} /></button>)}
          {trial && <p>Separate food trial: {trial.status}, {trial.checkins} check-in{trial.checkins === 1 ? '' : 's'}. Trial reports are not counted as meal outcomes here.</p>}
          {trial && onOpenTrial && <button type="button" className="gr-connection-more" onClick={onOpenTrial}>Open separate trial record <ArrowRight size={14} /></button>}
          {timed.length === 0 && dated.length === 0 && alternatives.length === 0 && !trial && <p>No timed or same-date context is available for this question yet.</p>}
          <button type="button" className="gr-connection-more" onClick={onOpenHistory}>Open recorded history <ArrowRight size={14} /></button>
        </div>
      </details>

      <details className="gr-connection-node">
        <summary><span className="gr-connection-node-icon"><BookOpen size={17} /></span><span><strong>Research lens</strong><small>{researchStatus === 'ready' ? `${researchCount} general paper${researchCount === 1 ? '' : 's'} found` : researchStatus === 'loading' ? 'Looking up general research' : researchStatus === 'error' ? 'Research could not load' : 'Not reviewed for this question'}</small></span></summary>
        <div className="gr-connection-detail"><p>Published findings give general context. They cannot confirm what caused your own symptoms.</p><button type="button" className="gr-connection-more" onClick={onOpenResearch}>Explore sourced research <ArrowRight size={14} /></button></div>
      </details>

      <details className="gr-connection-node">
        <summary><span className="gr-connection-node-icon"><Clipboard size={17} /></span><span><strong>One next move</strong><small>{selectedStep || (evidence?.nextQuestionMealId ? 'One unknown report may help' : actionLabel)}</small></span></summary>
        <div className="gr-connection-detail"><p>{selectedStep ? `Saved step: ${selectedStep}` : evidence?.nextQuestion || 'Choose a useful action from the evidence and your situation. No daily log is required.'}</p>{evidence?.nextQuestionMealId && <button type="button" className="gr-connection-more" onClick={() => onReviewMissing(evidence.nextQuestionMealId!)}>Review that occasion <ArrowRight size={14} /></button>}<button type="button" className="gr-connection-more" onClick={onOpenNext}>{actionLabel} <ArrowRight size={14} /></button></div>
      </details>
    </div>
    <p className="gr-connection-caveat"><ShieldCheck size={15} /> Personal reports, same-date context and research have different meanings. Inspect a source before acting.</p>
  </section>;
};
