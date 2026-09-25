import React, { useMemo } from 'react';
import { ArrowRight, Network } from 'lucide-react';
import type { GutMeal, GutDay } from '../../services/GutHealthSummary';
import type { Observation } from '../../domain/observations/types';
import { deriveGutEvidence, type GutQuestionThread } from '../../services/GutResolutionService';

export const GutQuestionAtlas: React.FC<{ thread: GutQuestionThread; threads: GutQuestionThread[]; meals: GutMeal[]; days: GutDay[]; observations: Observation[]; onOpenThread: (thread: GutQuestionThread) => void }> = ({ thread, threads, meals, days, observations, onOpenThread }) => {
  const related = useMemo(() => {
    const own = new Set(deriveGutEvidence(thread, { meals, days }, observations).occasions.map((item) => item.meal.id));
    return threads.filter((other) => other.id !== thread.id && other.ownerKey === thread.ownerKey && other.profileId === thread.profileId && !!other.focus).map((other) => ({ thread: other, ids: deriveGutEvidence(other, { meals, days }, observations).occasions.map((item) => item.meal.id).filter((id) => own.has(id)) })).filter((item) => item.ids.length > 0);
  }, [thread, threads, meals, days, observations]);
  if (!related.length) return null;
  return <details className="gr-question-atlas"><summary><Network size={16} /> Connected questions · {related.length}</summary><p>The same saved source can appear in more than one question. It remains one event, not independent confirmation.</p>{related.map((item) => <button type="button" key={item.thread.id} onClick={() => onOpenThread(item.thread)}><span><strong>{item.thread.question}</strong><small>{item.ids.length} shared source event{item.ids.length === 1 ? '' : 's'} · distinct question and counting rule</small></span><ArrowRight size={15} /></button>)}</details>;
};
