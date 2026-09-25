import React, { useMemo, useState } from 'react';
import { ArrowRight, GitCompareArrows } from 'lucide-react';
import type { GutMeal, GutDay } from '../../services/GutHealthSummary';
import type { Observation } from '../../domain/observations/types';
import { deriveGutEvidence, type GutQuestionThread } from '../../services/GutResolutionService';
import type { GutSourceReference } from './GutSourceRecord';

export const GutTheoryDuel: React.FC<{ thread: GutQuestionThread; meals: GutMeal[]; days: GutDay[]; observations: Observation[]; onOpenSource: (source: GutSourceReference) => void }> = ({ thread, meals, days, observations, onOpenSource }) => {
  const names = useMemo(() => [...new Set(meals.map((meal) => meal.name.trim()).filter(Boolean))].slice(0, 80), [meals]);
  const [left, setLeft] = useState(thread.focus || '');
  const [right, setRight] = useState('');
  const compare = (name: string) => name ? deriveGutEvidence({ ...thread, focus: name }, { meals, days }, observations) : null;
  const cases = [{ name: left, evidence: compare(left) }, { name: right, evidence: compare(right) }];
  return <details className="gr-theory-duel"><summary><GitCompareArrows size={16} /> Compare two ideas</summary><p>Choose two saved meal names. This shows competing reports, without declaring a winner or treating a name as a verified recipe.</p><div className="gr-duel-pickers"><label>First idea<select value={left} onChange={(event) => setLeft(event.target.value)}><option value="">Choose a saved meal</option>{names.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><label>Second idea<select value={right} onChange={(event) => setRight(event.target.value)}><option value="">Choose a different saved meal</option>{names.filter((name) => name !== left).map((name) => <option key={name} value={name}>{name}</option>)}</select></label></div>{left && right && left !== right && <><div className="gr-duel-cases">{cases.map(({ name, evidence }) => <section key={name}><strong>{name}</strong><span>{evidence?.support || 0} with · {evidence?.tension || 0} without · {evidence?.unknown || 0} unresolved</span><small>{evidence?.occasions.length ? 'Saved occasions only; no cause ranking.' : 'No matching saved occasion.'}</small>{evidence?.occasions.slice(0, 2).map((item) => <button type="button" key={item.meal.id} onClick={() => onOpenSource({ sourceKind: observations.some((observation) => observation.id === item.meal.id) ? 'observation' : 'diet_meal', sourceId: item.meal.id, localDate: item.meal.date })}>{item.meal.date} · {item.answer === 'yes' ? 'symptom reported' : item.answer === 'no' ? 'symptom not reported' : 'unknown'} <ArrowRight size={14} /></button>)}</section>)}</div><p>What would distinguish these ideas? A comparable occasion with an explicit outcome could help; other meals, timing and context may still differ. Your records cannot isolate either idea as a cause.</p></>}</details>;
};
