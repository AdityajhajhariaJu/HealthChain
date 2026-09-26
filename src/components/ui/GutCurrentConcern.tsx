import React from 'react';
import { Activity, ArrowRight, BookOpen, Clipboard, Clock3, HeartHandshake, ShieldCheck } from 'lucide-react';
import type { GutSnapshot } from '../../services/GutHealthSummary';
import type { GutQuestionThread } from '../../services/GutResolutionService';
import { getGutConcernDate } from '../../services/GutCurrentConcernService';
import type { GutSourceReference } from './GutSourceRecord';

interface Props {
  thread: GutQuestionThread;
  snapshot: GutSnapshot;
  busy: boolean;
  onsetDraft: string;
  onOnsetDraft: (value: string) => void;
  reflectionDraft: string;
  onReflectionDraft: (value: string) => void;
  onSaveOnset: () => void;
  onClearOnset: () => void;
  onSaveReflection: () => void;
  onCopyBrief: () => void;
  onOpenHistory: (date: string) => void;
  onOpenSource: (source: GutSourceReference) => void;
  onOpenResearch: () => void;
}

const careSource = 'https://www.niddk.nih.gov/health-information/digestive-diseases/indigestion-dyspepsia/symptoms-causes';

export const GutCurrentConcern: React.FC<Props> = ({ thread, snapshot, busy, onsetDraft, onOnsetDraft, reflectionDraft, onReflectionDraft, onSaveOnset, onClearOnset, onSaveReflection, onCopyBrief, onOpenHistory, onOpenSource, onOpenResearch }) => {
  const date = getGutConcernDate(thread);
  const meals = snapshot.meals.filter((meal) => meal.date === date);
  const day = snapshot.days.find((item) => item.date === date);
  const hasOnsetDraft = !!onsetDraft && !Number.isNaN(new Date(onsetDraft).getTime()) && new Date(onsetDraft).getTime() <= Date.now();

  return <section className="gr-current" aria-label="Current concern summary">
    <div className="gr-current-intro"><span className="gr-icon gr-icon-now"><HeartHandshake size={22} /></span><div><span className="gr-connection-eyebrow">YOUR READING TODAY</span><h3>What you can do now</h3><p>See the records near your report and bring a clear story to care. No cause is inferred.</p></div></div>
    <p className="gr-current-urgent">Severe or constant pain, bleeding, chest pain or breathlessness? Seek medical help promptly. This screen cannot assess urgency or cause. <a href={careSource} target="_blank" rel="noopener noreferrer">NIDDK source <ArrowRight size={12} /></a></p>
    <div className="gr-current-care"><ShieldCheck size={21} aria-hidden="true" /><div><strong>Severe or constant pain, bleeding, chest pain or trouble breathing? Seek medical help promptly.</strong><p>General information; this screen cannot assess urgency. <a href={careSource} target="_blank" rel="noopener noreferrer">Read the NIDDK source <ArrowRight size={13} /></a></p></div></div>
    <div className="gr-current-outcome"><div><span><Clipboard size={17} /> YOUR CARE SUMMARY</span><h4>Bring the story, not a guessed diagnosis</h4><p>Your question, recalled start time, and same-date saved records form a short patient-labeled summary. Missing details stay missing.</p></div><button type="button" className="gr-primary" onClick={onCopyBrief}>Copy focused care summary <ArrowRight size={16} /></button></div>
    <div className="gr-current-grid">
      <div className="gr-current-fact"><span><Clock3 size={17} /> ONE DETAIL THAT CAN HELP</span><strong>When did it start?</strong><p>Only if you recall. This separates your reported onset from the time you opened this question.</p><div className="gr-current-onset"><input aria-label="When did this concern start?" type="datetime-local" value={onsetDraft} max={new Date().toLocaleString('sv-SE').slice(0, 16).replace(' ', 'T')} onChange={(event) => onOnsetDraft(event.target.value)} /><button type="button" disabled={!hasOnsetDraft || busy} onClick={onSaveOnset}>{thread.symptomOnset ? 'Update time' : 'Save time'}</button></div>{thread.symptomOnset && <button type="button" className="gr-link" disabled={busy} onClick={onClearOnset}>Clear my reported time</button>}</div>
      <div className="gr-current-fact"><span><Activity size={17} /> YOUR SAVED CONTEXT</span><strong>{meals.length || day ? `${meals.length} meal${meals.length === 1 ? '' : 's'} and ${day ? 'a' : 'no'} digestion record` : 'No records on this date'}</strong><p>{date ? `Dated ${date}. ` : ''}{meals.length || day ? 'Inspect the originals; dates alone cannot establish sequence or cause.' : 'That does not mean you did not eat or have symptoms.'}</p>{meals.length > 0 && <div className="gr-current-sources">{meals.slice(0, 3).map((meal) => <button type="button" key={`${meal.sourceKind || 'diet_meal'}:${meal.id}`} onClick={() => onOpenSource({ sourceKind: meal.sourceKind || 'diet_meal', sourceId: meal.id, localDate: meal.date })}>{meal.name} <ArrowRight size={13} /></button>)}{meals.length > 3 && <small>+{meals.length - 3} more in records</small>}</div>}{day && <button type="button" className="gr-current-date" onClick={() => onOpenHistory(date)}>Open that day’s digestion record <ArrowRight size={14} /></button>}{!meals.length && !day && <button type="button" className="gr-current-date" onClick={() => onOpenHistory(date)}>Open recorded history <ArrowRight size={14} /></button>}</div>
    </div>
    <details className="gr-current-follow"><summary>Later, what happened? <span>Optional · helps you return to this question</span></summary><label htmlFor="gr-current-reflection">Your own account</label><textarea id="gr-current-reflection" rows={3} maxLength={1000} value={reflectionDraft} onChange={(event) => onReflectionDraft(event.target.value)} placeholder="For example, the pain settled; I spoke with a clinician; I am still unsure." /><button type="button" className="gr-secondary" disabled={busy || reflectionDraft === (thread.reflection || '')} onClick={onSaveReflection}>Save what happened</button>{thread.reflection && <p>Your saved follow-up: {thread.reflection}</p>}</details>
    <button type="button" className="gr-current-research" onClick={onOpenResearch}><BookOpen size={16} /> Read source-backed general context <ArrowRight size={14} /></button>
  </section>;
};
