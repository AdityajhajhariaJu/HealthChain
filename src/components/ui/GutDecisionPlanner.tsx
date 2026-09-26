import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Compass, RotateCcw, Utensils } from 'lucide-react';
import type { Observation } from '../../domain/observations/types';
import type { GutDay, GutMeal } from '../../services/GutHealthSummary';
import { deriveGutChoiceHistory, emptyGutDecision, type GutDecisionPlan, type GutQuestionThread, type GutSymptom } from '../../services/GutResolutionService';

interface Props {
  thread: GutQuestionThread;
  snapshot: { meals: GutMeal[]; days: GutDay[] };
  observations: Observation[];
  busy: boolean;
  onSave: (decision: GutDecisionPlan) => Promise<boolean>;
  onSymptomChange: (symptom: GutSymptom) => Promise<boolean>;
  onOpenQuickMeal: () => void;
}

const keys = ['a', 'b'] as const;
const same = (a: GutDecisionPlan, b: GutDecisionPlan) => JSON.stringify(a) === JSON.stringify(b);

export const GutDecisionPlanner: React.FC<Props> = ({ thread, snapshot, observations, busy, onSave, onSymptomChange, onOpenQuickMeal }) => {
  const [draft, setDraft] = useState<GutDecisionPlan>(() => thread.decision || emptyGutDecision());
  const [message, setMessage] = useState('');
  const saved = thread.decision || emptyGutDecision();
  const mealNames = useMemo(() => [...new Set(snapshot.meals.map((meal) => meal.name))].slice(0, 80), [snapshot.meals]);
  const histories = useMemo(() => ({
    a: deriveGutChoiceHistory(thread, draft.options.a.mealName, snapshot, observations),
    b: deriveGutChoiceHistory(thread, draft.options.b.mealName, snapshot, observations),
  }), [thread, draft.options.a.mealName, draft.options.b.mealName, snapshot, observations]);

  useEffect(() => { setDraft(thread.decision || emptyGutDecision()); }, [thread.id, thread.decision]);

  const editOption = (key: 'a' | 'b', field: 'label' | 'mealName', value: string) => {
    setDraft((current) => ({ ...current, options: { ...current.options, [key]: { ...current.options[key], [field]: value } } }));
    setMessage('');
  };
  const save = async (next: GutDecisionPlan, success: string) => {
    if (await onSave(next)) { setMessage(success); return true; }
    setMessage('Could not save this decision. Your text is still here; try again.');
    return false;
  };
  const choose = async (key: 'a' | 'b') => {
    if (!draft.options.a.label.trim() || !draft.options.b.label.trim()) { setMessage('Name both options first.'); return; }
    const next = { ...draft, chosen: key, chosenAt: new Date().toISOString(), outcome: null, outcomeAt: null, actualMealId: null };
    if (await save(next, 'Your choice is saved. The outcome remains unknown until you tell us.')) setDraft(next);
  };
  const recordOutcome = async () => {
    const next = { ...draft, outcome: draft.outcome?.trim() || null, outcomeAt: draft.outcome?.trim() ? new Date().toISOString() : null };
    if (await save(next, next.outcome ? 'Your own account of what happened is saved.' : 'The outcome note was cleared.')) setDraft(next);
  };

  return <div className="gr-decision">
    <div className="gr-decision-intro"><span className="gr-icon gr-icon-decide"><Compass size={22} /></span><div><h3>Compare your options</h3><p>Choose what fits today. Your past records are shown beside each option.</p></div></div>
    <details className="gr-decision-more"><summary>Add a priority or a symptom to compare <span>(optional)</span></summary>
    <label htmlFor="gr-decision-priority">What matters most in this situation?</label>
    <input id="gr-decision-priority" value={draft.priority} maxLength={160} onChange={(event) => setDraft({ ...draft, priority: event.target.value })} placeholder="e.g. Enjoy dinner without making a broad food rule" />
    <label htmlFor="gr-decision-symptom">Past symptom to compare</label>
    <select id="gr-decision-symptom" value={thread.symptom} disabled={busy} onChange={(event) => { void onSymptomChange(event.target.value as GutSymptom).then((ok) => { if (!ok) setMessage('Could not change the comparison symptom.'); }); }}>
      <option value="unspecified">No symptom selected</option>
      <option value="bloating">Bloating</option><option value="discomfort">Abdominal discomfort</option><option value="reflux">Reflux</option><option value="nausea">Nausea</option><option value="bowel_changes">Bowel changes</option>
    </select></details>
    <div className="gr-decision-options">{keys.map((key, index) => {
      const option = draft.options[key];
      const history = histories[key];
      return <section key={key} className={`gr-decision-option ${draft.chosen === key ? 'gr-decision-chosen' : ''}`}>
        <div className="gr-decision-option-head"><span>OPTION {index + 1}</span>{draft.chosen === key && <b><Check size={15} /> My choice</b>}</div>
        <label htmlFor={`gr-option-${key}`}>What could you do?</label>
        <input id={`gr-option-${key}`} value={option.label} maxLength={120} onChange={(event) => editOption(key, 'label', event.target.value)} placeholder={key === 'a' ? 'e.g. Order my usual meal' : 'e.g. Choose something different'} />
        <label htmlFor={`gr-meal-${key}`}>Saved meal name to look up <span>(optional)</span></label>
        <input id={`gr-meal-${key}`} value={option.mealName} maxLength={120} list="gr-decision-meals" onChange={(event) => editOption(key, 'mealName', event.target.value)} placeholder="Select an exact name from your records" />
        <div className="gr-decision-history">{!option.mealName.trim() ? <p>No meal history attached. This option is still valid.</p> : history.matched === 0 ? <p>No saved meal has this exact name. Future outcome unknown.</p> : <><strong>{history.matched} same-name past occasion{history.matched === 1 ? '' : 's'}</strong><p>{history.withSymptom} explicitly with {thread.symptom.replace('_', ' ')}, {history.withoutSymptom} explicitly without, {history.unknown} unknown. Name matches do not establish the same recipe or predict this choice.</p><small>Sources: {history.sourceIds.join(', ')}</small></>}</div>
        <button type="button" className="gr-secondary" disabled={busy || !draft.options.a.label.trim() || !draft.options.b.label.trim()} onClick={() => void choose(key)}>Choose this option <ArrowRight size={15} /></button>
      </section>;
    })}</div>
    <datalist id="gr-decision-meals">{mealNames.map((name) => <option value={name} key={name} />)}</datalist>
    <div className="gr-decision-actions"><button type="button" className="gr-secondary" disabled={busy || same(draft, saved)} onClick={() => void save(draft, 'Your options are saved. You can decide later.')}>Save options for later</button>{draft.chosen && <button type="button" className="gr-link" disabled={busy} onClick={() => void save({ ...draft, chosen: null, chosenAt: null, outcome: null, outcomeAt: null, actualMealId: null }, 'Choice cleared. Your options remain.')}>Leave undecided</button>}</div>
    {draft.chosen && <section className="gr-decision-return"><div><RotateCcw size={19} /><div><strong>When the situation has passed</strong><p>What did you actually choose or notice? You can skip this. A chosen option is not recorded as eaten.</p></div></div><label htmlFor="gr-decision-actual-meal">Actual meal in Diet <span>(optional, select only if you ate it)</span></label><select id="gr-decision-actual-meal" value={draft.actualMealId || ''} onChange={(event) => setDraft({ ...draft, actualMealId: event.target.value || null })}><option value="">No actual meal linked</option>{snapshot.meals.filter((meal) => meal.id && !/^meal-\d+$/.test(meal.id)).slice(0, 40).map((meal) => <option key={meal.id} value={meal.id}>{meal.date} · {meal.name}</option>)}</select>{saved.actualMealId && !snapshot.meals.some((meal) => meal.id === saved.actualMealId) && <p role="status">The previously linked Diet meal is no longer available. Clear the link when you save.</p>}<label htmlFor="gr-decision-outcome">Your own outcome</label><textarea id="gr-decision-outcome" value={draft.outcome || ''} maxLength={1000} rows={3} onChange={(event) => setDraft({ ...draft, outcome: event.target.value })} placeholder="What happened, in your words?" /><div><button type="button" className="gr-primary" disabled={busy || ((draft.outcome || '') === (saved.outcome || '') && (draft.actualMealId || '') === (saved.actualMealId || ''))} onClick={() => void recordOutcome()}>Save what happened</button><button type="button" className="gr-link" onClick={onOpenQuickMeal}><Utensils size={16} /> Record an actual meal separately</button></div></section>}
    <p className="gr-decision-caution">Past observations do not label a future food safe or unsafe. This workspace does not recommend a restrictive diet or a food challenge.</p>
    {message && <p className="gr-message" role="status">{message}</p>}
  </div>;
};
