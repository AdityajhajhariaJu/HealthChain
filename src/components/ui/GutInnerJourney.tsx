import React, { useMemo, useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays, Check, ChevronRight, Clipboard, Clock3, FileText, HeartPulse, Lightbulb, LoaderCircle, Pencil, Plus, RotateCcw, Search, ShieldCheck, Sparkles, Trash2, Utensils, X } from 'lucide-react';
import type { Observation, ObservationDraft } from '../../domain/observations/types';
import { captureObservationScope, createObservation, deleteObservation, listObservations, reviseObservation } from '../../services/HealthObservationService';
import { getGutSnapshot, mergeGutSnapshotWithObservations, type GutMeal, type GutSnapshot } from '../../services/GutHealthSummary';
import { deriveGutChangeReceipt, deriveGutEvidence, listGutThreads, makeGutReviewSnapshot, recordGutMealOutcome, recordGutFollowup, updateGutThread, type GutQuestionThread, type GutSymptom } from '../../services/GutResolutionService';
import { getGutPublicationStatus, searchGutResearch, gutGeneralGuidance, gutResearchTopics, type GutResearchPaper, type GutResearchTopic } from '../../services/GutResearchService';
import type { GutSourceReference } from './GutSourceRecord';
import { gutSynthesisFingerprint } from '../../services/GutReasoningService';
import { downloadGutReminder } from '../../services/GutReminderCalendar';
import './GutInnerJourney.css';

type Step = 'home' | 'permission' | 'gap' | 'compare' | 'possibility' | 'source' | 'correct' | 'simple' | 'uncertainty' | 'research' | 'paper' | 'note' | 'saved' | 'checkin' | 'changed' | 'history' | 'visit' | 'safety' | 'complete' | 'error';
type Possibility = { kind: 'meal' | 'portion' | 'timing'; label: string; meals: GutMeal[] };
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const shorten = (value: string, max = 90) => value.length > max ? `${value.slice(0, max - 1)}…` : value;
const symptomName: Record<GutSymptom, string> = { unspecified: 'a symptom', bloating: 'bloating', discomfort: 'stomach discomfort', reflux: 'reflux', nausea: 'nausea', bowel_changes: 'bowel changes' };

interface Props {
  thread: GutQuestionThread;
  snapshot: GutSnapshot;
  observations: Observation[];
  initialStep?: Step;
  generating: boolean;
  onGenerate: (thread: GutQuestionThread) => Promise<boolean>;
  onUpdated: () => void;
  onRefresh: () => Promise<void>;
  onOpenSource: (source: GutSourceReference) => void;
  onOpenQuestion: (id: string) => void;
  onResearch: () => void;
  onOpenVisit: () => void;
  onLog: () => void;
  onBack: () => void;
}

export const GutInnerJourney: React.FC<Props> = ({ thread, snapshot, observations, initialStep = 'home', generating, onGenerate, onUpdated, onRefresh, onOpenSource, onOpenQuestion, onResearch, onOpenVisit, onLog, onBack }) => {
  const [step, setStep] = useState<Step>(initialStep);
  const [stepTrail, setStepTrail] = useState<Step[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [possibility, setPossibility] = useState<Possibility | null>(null);
  const [sourceMeal, setSourceMeal] = useState<GutMeal | null>(null);
  const [sourceObservation, setSourceObservation] = useState<Observation | null>(null);
  const [editText, setEditText] = useState('');
  const [editPortion, setEditPortion] = useState<'smaller' | 'usual' | 'larger' | null>(null);
  const [editSeverity, setEditSeverity] = useState<'mild' | 'moderate' | 'severe' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [clarification, setClarification] = useState('');
  const [researchTopic, setResearchTopic] = useState<GutResearchTopic>(thread.researchTopic || 'food');
  const [researchSymptom, setResearchSymptom] = useState<GutSymptom>(thread.symptom);
  const [researchState, setResearchState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [papers, setPapers] = useState<GutResearchPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<GutResearchPaper | null>(null);
  const [paperStatus, setPaperStatus] = useState('');
  const [stepDraft, setStepDraft] = useState(thread.selectedStep || '');
  const [reminderDraft, setReminderDraft] = useState(thread.reminderAt || '');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [mealDraft, setMealDraft] = useState(thread.focus || '');
  const [portionDraft, setPortionDraft] = useState<'smaller' | 'usual' | 'larger' | null>(null);
  const [outcomeDraft, setOutcomeDraft] = useState<'yes' | 'no' | 'unanswered'>('unanswered');
  const [checkinDate, setCheckinDate] = useState(today());
  const [checkinNote, setCheckinNote] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');

  const evidence = useMemo(() => deriveGutEvidence(thread, snapshot, observations), [thread, snapshot, observations]);
  const matchingSymptoms = observations.filter((item) => item.payload.kind === 'symptom' && thread.symptom !== 'unspecified' && item.payload.symptomCode === thread.symptom).length;
  const matchingMeals = thread.focus ? snapshot.meals.filter((item) => item.name.trim().toLocaleLowerCase() === thread.focus.trim().toLocaleLowerCase()).length : 0;
  const groundedReading = evidence.support || evidence.tension ? evidence.answer
    : matchingSymptoms ? `${matchingSymptoms} ${symptomName[thread.symptom]} report${matchingSymptoms === 1 ? '' : 's'} saved. There is no comparable meal and outcome yet, so the cause remains open.`
    : matchingMeals ? `${matchingMeals} ${thread.focus} meal ${matchingMeals === 1 ? 'entry' : 'entries'} saved. No symptom outcome is linked to these meals yet.`
    : evidence.occasions.length ? evidence.answer
    : observations.length ? `${observations.length} observation${observations.length === 1 ? '' : 's'} saved. There is not enough linked detail to answer this question yet.`
    : evidence.answer;
  const groundedNextStep = matchingSymptoms && !evidence.support && !evidence.tension
    ? 'If it happens again, note the meal and how you felt. One report cannot identify a cause.'
    : matchingMeals && thread.symptom === 'unspecified'
      ? 'If you remember an outcome after a meal, add it. Leave anything uncertain blank.'
      : evidence.nextQuestion;
  const contextFingerprint = JSON.stringify(observations.slice(0, 14).map((item) => [item.id, item.revision, item.payload, item.localDate]));
  const synthesisStale = !!thread.gutSynthesis && thread.gutSynthesis.evidenceFingerprint !== gutSynthesisFingerprint(thread, evidence, contextFingerprint, thread.researchTopic || 'food');
  const synthesis = synthesisStale ? null : thread.gutSynthesis || null;
  const priorReading = (thread.activity || []).filter((item) => item.kind === 'understanding').slice(-2);
  const changes = thread.reviewedEvidence ? deriveGutChangeReceipt(thread.reviewedEvidence, thread, evidence) : null;
  const possibilities = useMemo<Possibility[]>(() => {
    const byName = new Map<string, GutMeal[]>();
    for (const meal of snapshot.meals) {
      const name = meal.name.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase();
      byName.set(key, [...(byName.get(key) || []), meal]);
    }
    const result: Possibility[] = [...byName.values()].sort((a, b) => b.length - a.length).slice(0, 4).map((meals) => ({ kind: 'meal', label: meals[0].name, meals }));
    const portions = snapshot.meals.filter((meal) => meal.preparation?.kind === 'portion');
    if (portions.length) result.unshift({ kind: 'portion', label: 'Meal size', meals: portions });
    const timed = snapshot.meals.filter((meal) => meal.occurredAt);
    if (timed.length) result.push({ kind: 'timing', label: 'Timing', meals: timed });
    return result.slice(0, 6);
  }, [snapshot.meals]);
  const selectedEvidence = possibility?.kind === 'meal' ? deriveGutEvidence({ ...thread, focus: possibility.label }, snapshot, observations) : null;
  const stepTitles: Record<Step, string> = {
    home: 'Your understanding', permission: 'Use Gemini for this question?', gap: 'Too early to see a pattern', compare: 'What fits your logs?', possibility: possibility?.label || 'A possibility', source: 'Your original record', correct: 'Correct a detail', simple: 'In plain words', uncertainty: 'What would clarify this?', research: 'Does research fit?', paper: 'Research detail', note: 'One thing to notice', saved: 'Saved to your next log', checkin: 'How was this occasion?', changed: 'What changed?', history: 'Saved history', visit: 'Prepare for a visit', safety: 'Your data and choices', complete: 'You are up to date', error: 'That did not finish',
  };
  const go = (next: Step) => { if (next !== step) setStepTrail((trail) => [...trail, step]); setStep(next); setMessage(''); document.querySelector<HTMLElement>('.gr-modal-dialog main')?.scrollTo(0, 0); };
  const goBack = () => { if (step === 'home') { onResearch(); return; } const previous = stepTrail[stepTrail.length - 1] || 'home'; setStepTrail((trail) => trail.slice(0, -1)); setStep(previous); setMessage(''); document.querySelector<HTMLElement>('.gr-modal-dialog main')?.scrollTo(0, 0); };
  const patchThread = async (patch: Parameters<typeof updateGutThread>[1]) => {
    const saved = await updateGutThread(thread.id, patch);
    if (!saved) throw new Error('This change could not be saved. Try again.');
    onUpdated();
    return saved;
  };
  const openMeal = (meal: GutMeal) => { setSourceMeal(meal); setSourceObservation(observations.find((item) => item.id === meal.id) || null); go('source'); };
  const editObservation = (item: Observation) => { setSourceObservation(item); setEditText(item.payload.kind === 'meal' ? item.payload.description : item.payload.kind === 'symptom' ? item.payload.symptom : item.payload.kind === 'context' ? item.payload.description : ''); setEditPortion(item.payload.kind === 'meal' ? item.payload.portionSize || null : null); setEditSeverity(item.payload.kind === 'symptom' ? item.payload.severityLabel || null : null); setConfirmDelete(false); go('correct'); };

  const saveCorrection = async () => {
    const item = sourceObservation;
    if (!item || !editText.trim() || busy || !['meal', 'symptom', 'context'].includes(item.payload.kind)) return;
    setBusy(true); setMessage('');
    try {
      const { id, schemaVersion, recordedAt, revision, createdAt, updatedAt, deletedAt, ...draft } = item;
      const payload: ObservationDraft['payload'] = item.payload.kind === 'meal' ? { ...item.payload, description: editText.trim(), portionSize: editPortion || undefined }
        : item.payload.kind === 'symptom' ? { ...item.payload, symptom: editText.trim(), severityLabel: editSeverity || undefined, symptomCode: editText.trim() === item.payload.symptom ? item.payload.symptomCode : undefined }
          : item.payload.kind === 'context' ? { ...item.payload, description: editText.trim() } : item.payload;
      const result = await reviseObservation(id, revision, { ...draft, payload });
      if (!result.ok) throw new Error(result.details?.[0] || 'The correction could not be saved.');
      setSourceObservation(result.observation); await onRefresh(); go('changed');
      setMessage('The original record was corrected. Saved interpretations may need updating.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save the correction.'); }
    finally { setBusy(false); }
  };
  const removeObservation = async () => {
    if (!sourceObservation || !confirmDelete || busy) return;
    setBusy(true);
    try {
      const result = await deleteObservation(sourceObservation.id, sourceObservation.revision);
      if (!result.ok) throw new Error('The record could not be deleted.');
      await onRefresh(); setSourceObservation(null); go('changed'); setMessage('Record deleted. Your comparison has been updated.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete the record.'); }
    finally { setBusy(false); setConfirmDelete(false); }
  };
  const askGemini = async () => {
    if (!consent || busy || generating) return;
    setBusy(true);
    const okay = await onGenerate(thread);
    setBusy(false); setConsent(false);
    go(okay ? 'home' : 'error');
  };
  const saveClarification = async () => {
    if (!clarification.trim() || busy) return;
    setBusy(true);
    try { await patchThread({ clarifications: [...(thread.clarifications || []), { question: synthesis?.followUpQuestion || evidence.nextQuestion, answer: clarification.trim() }] }); setClarification(''); go('permission'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save your answer.'); }
    finally { setBusy(false); }
  };
  const searchResearch = async () => {
    if (researchSymptom === 'unspecified') { setMessage('Choose a symptom category to search indexed studies.'); return; }
    setResearchState('loading'); setMessage('');
    try { setPapers(await searchGutResearch(researchSymptom, researchTopic, undefined, thread.researchConcept || '')); setResearchState('ready'); }
    catch { setResearchState('error'); }
  };
  const savePaper = async () => {
    if (!selectedPaper || busy) return;
    setBusy(true);
    try {
      const previous = thread.reviewedResearch?.sources || [];
      const sources = [...previous.filter((item) => item.id !== selectedPaper.id), { id: selectedPaper.id, title: selectedPaper.title, correctionNotice: selectedPaper.correctionNotice, publicationDate: selectedPaper.publicationDate, status: selectedPaper.correctionNotice ? 'corrected' as const : 'active' as const }].slice(-8);
      await patchThread({ reviewedResearch: { at: new Date().toISOString(), topic: researchTopic, sources } });
      setPaperStatus('Source saved to My research.');
    } catch (error) { setPaperStatus(error instanceof Error ? error.message : 'Could not save this source.'); }
    finally { setBusy(false); }
  };
  const checkPaperStatus = async () => {
    if (!selectedPaper) return;
    setPaperStatus('Checking publication status…');
    try { const fresh = await getGutPublicationStatus(selectedPaper.id); setPaperStatus(fresh.status === 'active' ? 'No correction or retraction is currently indexed.' : `Indexed status: ${fresh.status}${fresh.correctionNotice ? ` · ${fresh.correctionNotice}` : ''}`); }
    catch { setPaperStatus('Publication status is unavailable right now.'); }
  };
  const saveNextStep = async () => {
    if (!stepDraft.trim() || busy) return;
    setBusy(true);
    try { await patchThread({ selectedStep: stepDraft.trim(), reminderAt: reminderDraft || null, reviewedEvidence: makeGutReviewSnapshot(thread, evidence) }); go('saved'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save your next step.'); }
    finally { setBusy(false); }
  };
  const saveCheckin = async () => {
    if (!mealDraft.trim() || !checkinDate || busy) return;
    setBusy(true); setMessage('');
    try {
      const scope = await captureObservationScope();
      if (!scope) throw new Error('Choose an active profile before saving.');
      if (checkinDate > today()) throw new Error('Choose today or an earlier date.');
      if (!thread.reviewedEvidence) await patchThread({ reviewedEvidence: makeGutReviewSnapshot(thread, evidence) });
      const result = await createObservation({ ...scope, payload: { kind: 'meal', description: mealDraft.trim(), portionSize: portionDraft || undefined }, occurredAt: null, localDate: checkinDate, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null, timePrecision: 'date_only', source: 'gut', evidenceType: 'user_report', idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `gut-checkin-${Date.now()}-${Math.random()}` });
      if (!result.ok) throw new Error(result.details?.[0] || 'The meal could not be saved.');
      await onRefresh();
      if (thread.symptom !== 'unspecified' && outcomeDraft !== 'unanswered') {
        const meal: GutMeal = { id: result.observation.id, name: mealDraft.trim(), date: checkinDate, time: null, reaction: null, sourceKind: 'observation', timePrecision: 'date_only' };
        const outcome = await recordGutMealOutcome(meal, thread.symptom, outcomeDraft);
        if (!outcome.ok) throw new Error('The meal was saved, but its outcome was not. Open the day to complete it.');
      }
      const milestoneSaved = await recordGutFollowup(thread.id, result.observation.id, `${mealDraft.trim()} · ${thread.symptom === 'unspecified' || outcomeDraft === 'unanswered' ? 'outcome not recorded' : outcomeDraft === 'yes' ? symptomName[thread.symptom] + ' reported' : 'no ' + symptomName[thread.symptom] + ' reported'}${checkinNote.trim() ? ' · ' + checkinNote.trim() : ''}`);
      if (!milestoneSaved) { await onRefresh(); go('changed'); setMessage('Your log was saved, but its research milestone could not be saved. The log remains in your weekly history.'); return; }
      onUpdated();
      await onRefresh(); go('changed'); setMessage('Your check-in is saved. The comparison uses only your reported outcome.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save the check-in.'); }
    finally { setBusy(false); }
  };
  const copyVisit = async () => {
    try { await navigator.clipboard.writeText(`Gut question: ${thread.question}\nRecorded comparison: ${evidence.answer}\nNext step: ${thread.selectedStep || 'Not chosen'}\nSources: ${evidence.occasions.map((item) => item.meal.id).join(', ') || 'No linked meals'}`); setMessage('Source-labeled question brief copied.'); }
    catch { setMessage('Copy failed. Please try again.'); }
  };
  const storedSources = thread.reviewedResearch?.sources || [];

  return <div className="gij">
    <div className="gij-topline"><button type="button" onClick={goBack}><ArrowLeft size={15} /> {step === 'home' ? 'My research' : stepTrail.length ? 'Back' : 'Your understanding'}</button><span>{step === 'home' ? 'YOUR INSIGHT' : 'ONE STEP AT A TIME'}</span></div>
    <section className="gij-card">
      <div className="gij-brand"><span><Activity size={17} /></span><strong>Gut Health</strong><small>{thread.status === 'closed' ? 'FINISHED' : 'SAVED QUESTION'}</small></div>
      <h2>{stepTitles[step]}</h2>
      <p className="gij-sub">{step === 'home' ? shorten(thread.question, 180) : step === 'compare' ? 'Explore what your own records can and cannot compare.' : step === 'research' ? 'General studies can inform a question. They cannot establish your cause.' : step === 'gap' ? 'A saved log is useful even when a conclusion is not possible.' : ''}</p>

      {step === 'home' && <>
        <div className={`gij-conclusion ${observations.length || snapshot.meals.length ? 'has-data' : ''}`}>
          <strong>{synthesis?.headline || (synthesisStale ? 'Your logs changed. Review the new picture.' : evidence.support && evidence.tension ? 'Your reports are mixed.' : evidence.support ? 'A connection to explore.' : evidence.tension ? 'Your reported occasions were different.' : 'Too early to see a pattern.')}</strong>
          <p>{synthesis?.personalReading || groundedReading}</p>
        </div>
        {evidence.occasions.length > 0 && <div className="gij-evidence-pills"><span>{evidence.support} with {symptomName[thread.symptom]}</span><span>{evidence.tension} without</span><span>{evidence.unknown} unknown</span></div>}
        <div className="gij-tabs" aria-label="Explore your understanding">
          <button type="button" onClick={() => go(possibilities.length ? 'compare' : 'gap')}><Activity size={14} />Compare possibilities</button>
          <button type="button" onClick={() => go('simple')}><FileText size={14} />Explain simply</button>
          <button type="button" onClick={() => go('research')}><Search size={14} />Check research</button>
        </div>
        <details className="gij-uncertainty"><summary>What is still uncertain?</summary><p>{synthesis?.uncertainties?.[0] || (evidence.unknown ? `${evidence.unknown} matching occasions have no clear outcome. A pattern would still not establish a cause.` : 'These reports cannot establish what caused the symptom.')}</p><button type="button" onClick={() => go('uncertainty')}>Add what you remember</button></details>
        <div className="gij-state coral"><Lightbulb size={21} /><div><strong>What you can do</strong><p>{thread.selectedStep || synthesis?.nextReason || groundedNextStep}</p></div></div>
        {thread.selectedStep ? <><button type="button" className="gij-primary" onClick={() => go('checkin')}>Log a later outcome <ArrowRight size={15} /></button><button type="button" className="gij-quiet" onClick={() => go('saved')}>Edit saved next step or reminder</button></> : <button type="button" className="gij-primary" onClick={() => { setStepDraft(synthesis?.nextReason || 'Notice what happens on a later ordinary occasion'); go('note'); }}>Keep this in mind <Check size={15} /></button>}
        {!synthesis && <button type="button" className="gij-secondary" onClick={() => go('permission')}>{synthesisStale ? 'Refresh understanding' : 'Get a Gemini reading'} <Sparkles size={15} /></button>}
        <div className="gij-more"><button type="button" onClick={() => go('changed')}>See what changed</button><button type="button" onClick={() => go('history')}>Saved history</button><button type="button" onClick={() => go('visit')}>Prepare a visit</button><button type="button" onClick={() => go('safety')}>Data controls</button></div>
        <button type="button" className="gij-quiet" onClick={onResearch}>Done for now · saved in My research</button>
      </>}

      {step === 'permission' && <><div className="gij-state"><ShieldCheck size={21} /><div><strong>You choose when Gemini reads this</strong><p>It receives this question, relevant saved records, and source context. No AI request runs while you only log or browse.</p></div></div><div className="gij-record"><span>QUESTION</span><strong>{thread.question}</strong><small>{observations.length} saved observation{observations.length === 1 ? '' : 's'} available to this profile</small></div><label className="gij-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> Use these details for one Gemini reading</label><button type="button" className="gij-primary" disabled={!consent || busy || generating} onClick={() => void askGemini()}>{busy || generating ? 'Reading your records…' : 'Explain my question'} <Sparkles size={16} /></button><button type="button" className="gij-quiet" onClick={() => go('home')}>Keep it as a saved question</button></>}
      {step === 'gap' && <><div className="gij-empty"><div><Search size={31} /></div><strong>No comparable occasions yet.</strong><p>{groundedReading}</p></div><button type="button" className="gij-primary" onClick={onLog}>Add a remembered detail <Plus size={15} /></button><button type="button" className="gij-secondary" onClick={() => go('permission')}>Explain this uncertainty</button><button type="button" className="gij-quiet" onClick={() => go('complete')}>Finish for now</button></>}
      {step === 'compare' && <>{thread.symptom === 'unspecified' && <label className="gij-label">Which symptom are you comparing?<select aria-label="Comparison symptom" value={thread.symptom} onChange={(event) => { void patchThread({ symptom: event.target.value as GutSymptom }).catch(() => setMessage('Could not save the symptom.')); }}>{Object.entries(symptomName).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}<div className="gij-section-label">FROM YOUR SAVED LOGS</div><div className="gij-list">{possibilities.map((item) => { const compare = item.kind === 'meal' ? deriveGutEvidence({ ...thread, focus: item.label }, snapshot, observations) : null; return <button type="button" key={`${item.kind}:${item.label}`} onClick={() => { setPossibility(item); go('possibility'); }}><span className={`gij-round ${item.kind}`}><Utensils size={17} /></span><span><strong>{item.label}</strong><small>{item.kind === 'meal' && thread.symptom !== 'unspecified' ? `${compare?.support || 0} with · ${compare?.tension || 0} without · ${compare?.unknown || 0} unknown` : `${item.meals.length} recorded occasion${item.meals.length === 1 ? '' : 's'}`}</small></span><ChevronRight size={16} /></button>; })}</div><p className="gij-caveat">These are topics to inspect, not causes. Unrecorded days stay unknown.</p><button type="button" className="gij-secondary" onClick={() => go('simple')}>Explain what this means <ArrowRight size={14} /></button></>}
      {step === 'possibility' && possibility && <><div className="gij-headline"><strong>{possibility.label}</strong><p>{possibility.kind === 'meal' ? selectedEvidence?.answer : possibility.kind === 'portion' ? 'You recorded a portion on these occasions. Compare the original logs before interpreting it.' : 'These meals include a reported time. Timing alone does not establish a cause.'}</p></div><div className="gij-metrics"><div><strong>{selectedEvidence?.support ?? '—'}</strong><small>With {symptomName[thread.symptom]}</small></div><div><strong>{selectedEvidence?.tension ?? '—'}</strong><small>Without</small></div><div><strong>{selectedEvidence?.unknown ?? possibility.meals.length}</strong><small>Unknown</small></div></div><div className="gij-section-label">INSPECT ORIGINAL LOGS</div><div className="gij-list">{possibility.meals.slice(0, 8).map((meal) => <button type="button" key={meal.id} onClick={() => openMeal(meal)}><span className="gij-round blue"><FileText size={16} /></span><span><strong>{meal.name}</strong><small>{meal.date} · {meal.preparation?.detail || 'Portion not recorded'}</small></span><ChevronRight size={16} /></button>)}</div><button type="button" className="gij-secondary" onClick={() => go('uncertainty')}>What is still uncertain? <ArrowRight size={14} /></button></>}
      {step === 'source' && sourceMeal && <><div className="gij-record"><span>ORIGINAL MEAL</span><strong>{sourceMeal.name}</strong><small>{sourceMeal.date} · {sourceMeal.timePrecision === 'date_only' ? 'Date only; order unknown' : sourceMeal.time || 'Time not recorded'}</small></div><div className="gij-detail-rows"><div><span>Portion or preparation</span><strong>{sourceMeal.preparation?.detail || 'Not recorded'}</strong></div><div><span>Reported reaction</span><strong>{sourceMeal.reaction || 'Not recorded'}</strong></div><div><span>Source</span><strong>{sourceMeal.sourceKind === 'observation' ? 'Gut observation' : 'Diet meal'}</strong></div></div><button type="button" className="gij-secondary" onClick={() => onOpenSource({ sourceKind: sourceMeal.sourceKind || 'diet_meal', sourceId: sourceMeal.id, localDate: sourceMeal.date })}>Open exact source <ArrowRight size={14} /></button>{sourceObservation && <button type="button" className="gij-secondary" onClick={() => editObservation(sourceObservation)}><Pencil size={15} /> Correct this record</button>}</>}
      {step === 'correct' && sourceObservation && <><p className="gij-caveat">Edit your original report. The previous AI reading will need refreshing if this changes its evidence.</p><label className="gij-label">{sourceObservation.payload.kind === 'meal' ? 'Meal' : sourceObservation.payload.kind === 'symptom' ? 'Symptom' : 'Description'}<input value={editText} maxLength={200} onChange={(event) => setEditText(event.target.value)} /></label>{sourceObservation.payload.kind === 'meal' && <div className="gij-pills">{(['smaller','usual','larger'] as const).map((size) => <button type="button" key={size} className={editPortion === size ? 'selected' : ''} onClick={() => setEditPortion(editPortion === size ? null : size)}>{size}</button>)}</div>}{sourceObservation.payload.kind === 'symptom' && <div className="gij-pills">{(['mild','moderate','severe'] as const).map((severity) => <button type="button" key={severity} className={editSeverity === severity ? 'selected' : ''} onClick={() => setEditSeverity(editSeverity === severity ? null : severity)}>{severity}</button>)}</div>}<button type="button" className="gij-primary" disabled={!editText.trim() || busy} onClick={() => void saveCorrection()}>Save correction <Check size={15} /></button><div className="gij-danger"><button type="button" onClick={() => setConfirmDelete((value) => !value)}><Trash2 size={14} /> Delete this record</button>{confirmDelete && <div><p>This removes this report from your saved comparisons.</p><button type="button" disabled={busy} onClick={() => void removeObservation()}>Confirm delete</button><button type="button" onClick={() => setConfirmDelete(false)}>Cancel</button></div>}</div></>}
      {step === 'simple' && <><div className="gij-headline"><strong>{synthesis?.headline || 'Here is what your logs show.'}</strong><p>{synthesis?.personalReading || groundedReading}</p></div><div className="gij-detail-rows"><div><span>What you observed</span><strong>{evidence.occasions.length ? `${evidence.occasions.length} matching meal occasion${evidence.occasions.length === 1 ? '' : 's'}` : `${observations.length} saved observation${observations.length === 1 ? '' : 's'}`}</strong></div><div><span>What remains uncertain</span><strong>{synthesis?.uncertainties?.[0] || 'The record cannot identify a cause.'}</strong></div></div><button type="button" className="gij-secondary" onClick={() => go('uncertainty')}>What could clarify this? <ArrowRight size={14} /></button>{!synthesis && <button type="button" className="gij-primary" onClick={() => go('permission')}>Ask Gemini to explain <Sparkles size={15} /></button>}</>}
      {step === 'uncertainty' && <><div className="gij-state"><Lightbulb size={19} /><div><strong>One useful question</strong><p>{synthesis?.followUpQuestion || evidence.nextQuestion}</p></div></div><label className="gij-label">What do you remember? <small>Optional. “Not sure” is a useful answer.</small><textarea value={clarification} maxLength={500} onChange={(event) => setClarification(event.target.value)} placeholder="Write what you remember, or say not sure…" /></label><button type="button" className="gij-primary" disabled={!clarification.trim() || busy} onClick={() => void saveClarification()}>Save detail & update explanation <ArrowRight size={15} /></button><button type="button" className="gij-quiet" onClick={() => go('home')}>Leave this open</button></>}
      {step === 'research' && <><div className="gij-state"><BookOpen size={20} /><div><strong>General evidence</strong><p>Search terms use a symptom category and topic, not your private question or timeline.</p></div></div><div className="gij-detail-rows"><div><span>Your situation</span><strong>{thread.question}</strong></div><div><span>Personal cause</span><strong>Research cannot establish it for you</strong></div></div><label className="gij-label">Research topic<select value={researchTopic} onChange={(event) => { setResearchTopic(event.target.value as GutResearchTopic); setResearchState('idle'); }}>{Object.entries(gutResearchTopics).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label><label className="gij-label">Symptom category<select value={researchSymptom} onChange={(event) => { setResearchSymptom(event.target.value as GutSymptom); setResearchState('idle'); }}>{Object.entries(symptomName).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button type="button" className="gij-primary" disabled={researchState === 'loading' || researchSymptom === 'unspecified'} onClick={() => void searchResearch()}>{researchState === 'loading' ? <><LoaderCircle size={15} /> Finding relevant sources…</> : <><Search size={15} /> Search indexed studies</>}</button>{researchState === 'error' && <div className="gij-state warning"><span>!</span><div><strong>Research is unavailable</strong><p>Your question and logs are still saved. Try again later.</p></div></div>}{researchState === 'ready' && <><div className="gij-section-label">{papers.length} RELEVANT SOURCE{papers.length === 1 ? '' : 'S'}</div>{papers.length ? <div className="gij-list">{papers.map((paper) => <button type="button" key={paper.id} onClick={() => { setSelectedPaper(paper); setPaperStatus(''); go('paper'); }}><span className="gij-round blue"><BookOpen size={16} /></span><span><strong>{shorten(paper.title, 100)}</strong><small>{paper.journal || 'Journal not listed'} · {paper.year || 'Year unknown'}</small></span><ChevronRight size={16} /></button>)}</div> : <p className="gij-caveat">No matching indexed studies were found for these terms. That does not settle your personal question.</p>}</>}{gutGeneralGuidance[researchSymptom] && <a className="gij-external" href={gutGeneralGuidance[researchSymptom]?.url} target="_blank" rel="noreferrer">Open {gutGeneralGuidance[researchSymptom]?.sourceOrganization} overview <ArrowRight size={14} /></a>}</>}
      {step === 'paper' && selectedPaper && <><div className="gij-record"><span>INDEXED PUBLICATION · PMID {selectedPaper.id}</span><strong>{selectedPaper.title}</strong><small>{selectedPaper.journal || 'Journal not listed'} · {selectedPaper.publicationDate || selectedPaper.year || 'Date not indexed'}</small></div><div className="gij-detail-rows"><div><span>Population</span><strong>{selectedPaper.populationKnown ? selectedPaper.titlePopulationCue || 'See original study' : 'Not clear from indexed details'}</strong></div><div><span>Limit</span><strong>A study about a group is not a personal diagnosis.</strong></div><div><span>Correction notice</span><strong>{selectedPaper.correctionNotice || 'None indexed in this result'}</strong></div></div><details className="gij-abstract"><summary>Read the indexed abstract</summary><p>{selectedPaper.abstract || 'Abstract unavailable. Open the original record.'}</p></details><a className="gij-external" href={selectedPaper.url} target="_blank" rel="noreferrer">Open original source <ArrowRight size={14} /></a><button type="button" className="gij-secondary" onClick={() => void checkPaperStatus()}>Check current publication status</button><button type="button" className="gij-primary" disabled={busy} onClick={() => void savePaper()}><BookOpen size={15} /> Save source to My research</button>{paperStatus && <p className="gij-message" role="status">{paperStatus}</p>}</>}
      {step === 'note' && <><div className="gij-state coral"><Lightbulb size={20} /><div><strong>One thing to notice</strong><p>{synthesis?.nextReason || 'Choose one small next step that would help you understand this question.'}</p></div></div><label className="gij-label">Your next step<input value={stepDraft} maxLength={300} onChange={(event) => setStepDraft(event.target.value)} placeholder="What would actually help you?" /></label><div className="gij-pills">{['Keep this question open', 'Notice a later ordinary occasion', 'Discuss this with a clinician'].map((value) => <button type="button" key={value} className={stepDraft === value ? 'selected' : ''} onClick={() => setStepDraft(value)}>{value}</button>)}</div><label className="gij-label">Show this in My research on <small>Optional in-app revisit date</small><input type="date" value={reminderDraft} min={today()} onChange={(event) => setReminderDraft(event.target.value)} /></label><button type="button" className="gij-primary" disabled={!stepDraft.trim() || busy} onClick={() => void saveNextStep()}>Save to my next log <Check size={15} /></button></>}
      {step === 'saved' && <><div className="gij-state success"><Check size={21} /><div><strong>Your next step is saved</strong><p>{thread.selectedStep}</p></div></div><div className="gij-record"><span>IN MY RESEARCH</span><strong>{thread.selectedStep || 'No next step saved'}</strong><small>{thread.reminderAt ? `In-app revisit: ${thread.reminderAt}` : 'No revisit date chosen'}</small></div><div className="gij-pair"><button type="button" onClick={() => go('note')}><Pencil size={15} /> Edit</button><button type="button" onClick={() => { setStepDraft(''); setReminderDraft(''); void patchThread({ selectedStep: null, reminderAt: null }).then(() => go('home')).catch(() => setMessage('Could not remove the step.')); }}><X size={15} /> Remove</button></div><details className="gij-uncertainty"><summary><Bell size={14} /> Remind me</summary><label className="gij-label">Reminder date<input type="date" value={reminderDraft} min={today()} onChange={(event) => setReminderDraft(event.target.value)} /></label><label className="gij-label">Reminder time<input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} /></label><button type="button" className="gij-secondary" disabled={!reminderDraft} onClick={() => { try { downloadGutReminder(thread.id, reminderDraft, reminderTime); setMessage('Calendar file downloaded. Open it in your calendar and confirm its alert to activate the reminder.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create the reminder.'); } }}>Add to calendar</button><p>The calendar alert can run when HealthChain is closed. Its title does not include health details.</p></details><button type="button" className="gij-primary" onClick={() => go('checkin')}>Log what happens later <ArrowRight size={15} /></button></>}
      {step === 'checkin' && <><p className="gij-caveat">This creates a new meal log. Choose an outcome only if you clearly remember it.</p><label className="gij-label">Meal or drink<input value={mealDraft} maxLength={200} onChange={(event) => setMealDraft(event.target.value)} placeholder="What did you have?" /></label><label className="gij-label">Date<input type="date" value={checkinDate} max={today()} onChange={(event) => setCheckinDate(event.target.value)} /></label><div className="gij-section-label">PORTION · OPTIONAL</div><div className="gij-pills">{(['smaller','usual','larger'] as const).map((value) => <button type="button" key={value} className={portionDraft === value ? 'selected' : ''} onClick={() => setPortionDraft(portionDraft === value ? null : value)}>{value}</button>)}</div>{thread.symptom !== 'unspecified' && <><div className="gij-section-label">WAS {symptomName[thread.symptom].toUpperCase()} PRESENT?</div><div className="gij-pills">{([['yes','Yes'],['no','No'],['unanswered','Not sure']] as const).map(([value,label]) => <button type="button" key={value} className={outcomeDraft === value ? 'selected' : ''} onClick={() => setOutcomeDraft(value)}>{label}</button>)}</div></>}<label className="gij-label">Anything else? <small>Optional</small><textarea value={checkinNote} maxLength={1000} onChange={(event) => setCheckinNote(event.target.value)} placeholder="In your own words…" /></label><button type="button" className="gij-primary" disabled={!mealDraft.trim() || busy} onClick={() => void saveCheckin()}>Save & update insight <ArrowRight size={15} /></button><button type="button" className="gij-quiet" onClick={() => go('home')}>Skip for now</button></>}
      {step === 'changed' && <><div className="gij-state"><RotateCcw size={20} /><div><strong>{changes?.changed ? 'Your recorded comparison changed' : 'Your saved records are current'}</strong><p>{changes?.changes[0]?.detail || (synthesisStale ? 'A log changed after the saved explanation.' : 'No earlier reviewed comparison is available yet.')}</p></div></div><div className="gij-detail-rows"><div><span>Previously reviewed</span><strong>{changes ? `${changes.previous.support} with · ${changes.previous.tension} without · ${changes.previous.unknown} unknown` : priorReading[0]?.title || 'No earlier comparison'}</strong></div><div><span>Now in your records</span><strong>{evidence.support} with · {evidence.tension} without · {evidence.unknown} unknown</strong></div></div>{synthesisStale && <button type="button" className="gij-primary" onClick={() => go('permission')}>Refresh the explanation <Sparkles size={15} /></button>}{changes?.changes.length ? <div className="gij-change-list">{changes.changes.map((item) => <div key={item.mealId}><strong>{item.label}</strong><p>{item.detail}</p></div>)}</div> : null}<p className="gij-caveat">A changed comparison is not a confirmed cause. Keep the question open until the records can answer it.</p><button type="button" className="gij-secondary" onClick={() => go('compare')}>Explore another possibility <ArrowRight size={14} /></button><button type="button" className="gij-quiet" onClick={() => go('complete')}>Done for now</button></>}
      {step === 'history' && <><div className="gij-input"><Search size={16} /><input aria-label="Search saved questions" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search your saved questions…" /></div><div className="gij-list">{listGutThreads().filter((item) => item.question.toLocaleLowerCase().includes(historyQuery.toLocaleLowerCase())).map((item) => <button type="button" key={item.id} onClick={() => onOpenQuestion(item.id)}><span className="gij-round blue"><BookOpen size={16} /></span><span><strong>{item.question}</strong><small>{item.status === 'open' ? 'Current question' : 'Finished'} · Updated {new Date(item.updatedAt).toLocaleDateString()}</small></span><ChevronRight size={16} /></button>)}</div><button type="button" className="gij-secondary" onClick={onResearch}>Open My research <ArrowRight size={14} /></button></>}
      {step === 'visit' && <><div className="gij-state"><HeartPulse size={21} /><div><strong>Bring your own words and exact records</strong><p>Share what you logged, what remains uncertain, and your question.</p></div></div><div className="gij-record"><span>VISIT QUESTION</span><strong>{thread.question}</strong><small>{evidence.occasions.length} linked occasion{evidence.occasions.length === 1 ? '' : 's'} · {storedSources.length} saved research source{storedSources.length === 1 ? '' : 's'}</small></div><button type="button" className="gij-primary" onClick={onOpenVisit}>Open visit notes <ArrowRight size={15} /></button><button type="button" className="gij-secondary" onClick={() => void copyVisit()}><Clipboard size={15} /> Copy question brief</button></>}
      {step === 'safety' && <><div className="gij-state"><ShieldCheck size={22} /><div><strong>Your choices remain yours</strong><p>AI runs only after you choose it. Blank dates do not mean symptom-free days.</p></div></div><div className="gij-detail-rows"><div><span>Personal records</span><strong>{observations.length} saved in this profile</strong></div><div><span>General sources</span><strong>{storedSources.length} explicitly saved</strong></div><div><span>Corrections</span><strong>Open any original log to edit or delete it.</strong></div></div><button type="button" className="gij-secondary" onClick={() => go('compare')}>Inspect linked logs</button></>}
      {step === 'complete' && <><div className="gij-empty complete"><div><Check size={33} /></div><strong>Your question is saved.</strong><p>Return from My research whenever something changes.</p></div><button type="button" className="gij-primary" onClick={onBack}>Back to your understanding <ArrowRight size={15} /></button><button type="button" className="gij-secondary" onClick={onLog}>Add another log</button></>}
      {step === 'error' && <><div className="gij-state warning"><span>!</span><div><strong>The answer could not be updated</strong><p>Your question and original logs are still saved. You can retry or continue without AI.</p></div></div><button type="button" className="gij-primary" onClick={() => go('permission')}>Try again <RotateCcw size={15} /></button><button type="button" className="gij-secondary" onClick={() => go('compare')}>Use my records instead</button></>}
      {message && <p className="gij-message" role="status">{message}</p>}
    </section>

  </div>;
};
