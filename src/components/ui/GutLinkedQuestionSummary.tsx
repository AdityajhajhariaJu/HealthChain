import React, { useEffect, useState } from 'react';
import { ArrowRight, Utensils } from 'lucide-react';
import { getGutSnapshot, mergeGutSnapshotWithObservations } from '../../services/GutHealthSummary';
import { listObservations } from '../../services/HealthObservationService';
import { deriveGutEvidence, listGutThreads } from '../../services/GutResolutionService';
import { getGutConcernDate } from '../../services/GutCurrentConcernService';
import './GutLinkedQuestionSummary.css';

interface Props {
  threadId: string;
  profileId: string;
  onOpenGut: () => void;
}

export const GutLinkedQuestionSummary: React.FC<Props> = ({ threadId, profileId, onOpenGut }) => {
  const [summary, setSummary] = useState<React.ReactNode>(<p>Loading current Gut records…</p>);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const thread = listGutThreads().find((item) => item.id === threadId && item.profileId === profileId);
      if (!thread) { if (active) setSummary(<p>This Gut question is unavailable in the current profile. Its earlier Case Prep text remains a patient question.</p>); return; }
      try {
        const snapshot = mergeGutSnapshotWithObservations(getGutSnapshot(), await listObservations());
        if (!active) return;
        if (thread.intent === 'now') {
          const date = getGutConcernDate(thread);
          const meals = snapshot.meals.filter((meal) => meal.date === date);
          const day = snapshot.days.find((item) => item.date === date);
          setSummary(<><strong>Current patient report</strong><p>{thread.symptomOnset ? `Reported onset: ${new Date(thread.symptomOnset.occurredAt).toLocaleString()} (${thread.symptomOnset.precision}).` : 'Symptom onset was not recorded.'} {meals.length} meal record{meals.length === 1 ? '' : 's'} and {day ? 'one' : 'no'} digestion-day record dated {date || 'unknown'}. Same-date records do not establish cause or order.</p>{thread.reflection && <p>Later patient account: {thread.reflection}</p>}</>);
          return;
        }
        const evidence = deriveGutEvidence(thread, snapshot, snapshot.observations);
        setSummary(<><strong>Current patient-record reading</strong><p>{evidence.answer}</p>{evidence.occasions.length > 0 && <div className="gr-linked-counts"><span>{evidence.support} reported with</span><span>{evidence.tension} reported without</span><span>{evidence.unknown} unknown or disputed</span></div>}{thread.reflection && <p>Later patient account: {thread.reflection}</p>}</>);
      } catch { if (active) setSummary(<p>Current Gut records could not be loaded. Check the original question before relying on an older summary.</p>); }
    };
    void refresh();
    const events = ['hc_gut_question_updated', 'hc_digestion_updated', 'hc_nutrition_reaction_updated', 'hc_observations_updated', 'hc_profile_updated'];
    events.forEach((event) => window.addEventListener(event, refresh));
    return () => { active = false; events.forEach((event) => window.removeEventListener(event, refresh)); };
  }, [threadId, profileId]);
  return <section className="gr-linked-question" aria-label="Live Gut question context"><div><Utensils size={16} /><span>Patient report · read from current records</span></div>{summary}<button type="button" onClick={onOpenGut}>Open Gut question and exact sources <ArrowRight size={14} /></button><small>Personal records and research are not clinician findings. Verify source timing and missing outcomes before using this at a visit.</small></section>;
};
