import React, { useMemo, useState } from 'react';
import { Activity, ArrowRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, CircleHelp, Clock3, FileText, History, Lightbulb, Plus, Search, Sparkles, Utensils, X } from 'lucide-react';
import type { Observation, ObservationPayload } from '../../domain/observations/types';
import type { GutSnapshot } from '../../services/GutHealthSummary';
import { captureObservationScope, createObservation, listObservations } from '../../services/HealthObservationService';
import { createGutThread, deriveGutEvidence, listGutThreads, updateGutThread, type GutQuestionThread, type GutSymptom } from '../../services/GutResolutionService';
import { gutSynthesisFingerprint, reasonOverGutEvidence } from '../../services/GutReasoningService';
import { GutInnerJourney } from './GutInnerJourney';
import { GutSourceRecord, type GutSourceReference } from './GutSourceRecord';
import './GutDailyHome.css';

type Page = 'log' | 'understanding' | 'research' | 'week' | 'journey';
type LogKind = 'symptom' | 'meal' | 'context';
type SymptomChoice = { label: string; code: GutSymptom; icon: string };
const symptoms: SymptomChoice[] = [
  { label: 'Bloating', code: 'bloating', icon: '◉' }, { label: 'Reflux', code: 'reflux', icon: '✦' },
  { label: 'Stomach pain', code: 'discomfort', icon: '◌' }, { label: 'Nausea', code: 'nausea', icon: '◐' },
  { label: 'Bowel change', code: 'bowel_changes', icon: '▣' },
];
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const shortDate = (date: Date) => date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const newKey = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `gut-${Date.now()}-${Math.random()}`;
const sentence = (value: string, max = 120) => value.length > max ? `${value.slice(0, max - 1)}…` : value;
const activityLabel = (kind: 'question' | 'sources' | 'understanding' | 'next_step' | 'checkin') => ({ question: 'Question started', sources: 'Sources saved', understanding: 'Understanding updated', next_step: 'Next step saved', checkin: 'Follow-up recorded' })[kind];
const observationLabel = (observation: Observation) => observation.payload.kind === 'symptom' ? observation.payload.symptom : observation.payload.kind === 'meal' ? observation.payload.description : observation.payload.kind === 'context' ? observation.payload.description : observation.payload.kind === 'bowel' ? 'Bowel entry' : 'Daily check-in';

interface Props {
  snapshot: GutSnapshot;
  observations: Observation[];
  initialThreadId?: string | null;
  initialPage?: Page;
  onOpenThread: (id: string) => void;
  onOpenSource: (source: GutSourceReference) => void;
  onOpenRecords: (date?: string) => void;
  onOpenVisit: () => void;
  onRefresh: () => Promise<void>;
}

export const GutDailyHome: React.FC<Props> = ({ snapshot, observations, initialThreadId, initialPage, onOpenThread, onOpenSource: onOpenExternalSource, onOpenRecords, onOpenVisit, onRefresh }) => {
  const [inlineSource, setInlineSource] = useState<GutSourceReference | null>(null);
  const onOpenSource = (source: GutSourceReference) => setInlineSource(source);
  const [page, setPage] = useState<Page>(initialPage || (initialThreadId ? 'research' : 'log'));
  const [kind, setKind] = useState<LogKind>('symptom');
  const [selectedSymptom, setSelectedSymptom] = useState('');
  const [customSymptom, setCustomSymptom] = useState('');
  const [meal, setMeal] = useState('');
  const [context, setContext] = useState('');
  const [contextType, setContextType] = useState<'sleep' | 'stress' | 'medication' | 'illness' | 'other'>('other');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe' | null>(null);
  const [portionSize, setPortionSize] = useState<'smaller' | 'usual' | 'larger' | null>(null);
  const [relatedMealId, setRelatedMealId] = useState<string | null>(null);
  const [when, setWhen] = useState<'today' | 'yesterday' | 'date'>('today');
  const [chosenDate, setChosenDate] = useState(dateKey(new Date()));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [threadVersion, setThreadVersion] = useState(0);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId || null);
  const [question, setQuestion] = useState('');
  const [showQuestion, setShowQuestion] = useState(false);
  const [questionBusy, setQuestionBusy] = useState(false);
  const [insightBusy, setInsightBusy] = useState(false);
  const [insightMode, setInsightMode] = useState<'compare' | 'simple' | 'research'>('compare');
  const [researchTab, setResearchTab] = useState<'investigations' | 'sources'>('investigations');
  const [weekOffset, setWeekOffset] = useState(0);
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week');
  const [selectedDay, setSelectedDay] = useState(dateKey(new Date()));
  const [journeyKey, setJourneyKey] = useState(0);
  const [journeyStep, setJourneyStep] = useState<'home' | 'compare' | 'simple' | 'research' | 'permission' | 'note' | 'changed'>('home');
  const [journeyReturn, setJourneyReturn] = useState<'understanding' | 'research' | 'week'>('understanding');
  const [logStage, setLogStage] = useState<'quick' | 'details' | 'review'>('quick');
  const [logNote, setLogNote] = useState('');
  const [logTime, setLogTime] = useState('');
  const [ingredientText, setIngredientText] = useState('');

  const threads = useMemo(() => listGutThreads(), [threadVersion, observations]);
  const activeThread = threads.find((item) => item.id === activeThreadId) || null;
  const activeEvidence = activeThread?.focus && activeThread.symptom !== 'unspecified' ? deriveGutEvidence(activeThread, snapshot, observations) : null;
  const synthesis = activeThread?.gutSynthesis && !observations.some((item) => item.updatedAt > activeThread.gutSynthesis!.at) && !snapshot.meals.some((item) => item.loggedAt && item.loggedAt > activeThread.gutSynthesis!.at) ? activeThread.gutSynthesis : null;
  const savedSources = useMemo(() => [...new Map(threads.flatMap((thread) => (thread.reviewedResearch?.sources || []).map((source) => [source.id, source]))).values()], [threads]);
  const hasData = observations.length > 0 || snapshot.meals.length > 0 || snapshot.days.length > 0;
  const dueReminders = threads.filter((item) => item.reminderAt && item.reminderAt <= dateKey(new Date()) && item.selectedStep);
  const recentReports = observations.filter((item) => item.payload.kind === 'symptom');
  const recentMeals = snapshot.meals;
  const localDate = when === 'today' ? dateKey(new Date()) : when === 'yesterday' ? dateKey(new Date(Date.now() - 86400000)) : chosenDate;
  const preview = kind === 'symptom' ? (customSymptom.trim() || selectedSymptom) : kind === 'meal' ? meal.trim() : context.trim();
  const activities = useMemo(() => threads.flatMap((thread) => [
    { id: `question-${thread.id}`, at: thread.createdAt, kind: 'question' as const, title: thread.question, threadId: thread.id },
    ...(thread.activity || []).map((event) => ({ ...event, threadId: thread.id })),
  ]).sort((a, b) => b.at.localeCompare(a.at)), [threads]);

  const jump = (target: Page) => { setPage(target); setStatus(''); document.querySelector<HTMLElement>('.gr-modal-dialog main')?.scrollTo(0, 0); };
  const refreshThreads = () => setThreadVersion((value) => value + 1);
  const openJourney = async (step: typeof journeyStep = 'home', threadId?: string) => {
    setQuestionBusy(true); setStatus('');
    try {
      let selected = threadId ? threads.find((item) => item.id === threadId) : activeThread;
      if (!selected) {
        const report = recentReports[0];
        const subject = report?.payload.kind === 'symptom' ? report.payload.symptom : recentMeals[0]?.name;
        const symptom = report?.payload.kind === 'symptom' ? report.payload.symptomCode || symptoms.find((item) => item.label.toLocaleLowerCase() === (report.payload as Extract<ObservationPayload, { kind: 'symptom' }>).symptom.toLocaleLowerCase())?.code || 'unspecified' : 'unspecified';
        selected = await createGutThread({ intent: 'understand', question: subject ? `What can I understand from my saved ${subject} log?` : 'What can I understand from my saved gut logs?', symptom, focus: linkedMeal?.name || (report ? '' : recentMeals[0]?.name || '') }) || undefined;
        if (!selected) throw new Error('Your investigation could not be started.');
        refreshThreads();
      }
      setActiveThreadId(selected.id); setJourneyReturn(page === 'research' || page === 'week' ? page : 'understanding');
      setJourneyStep(step); setJourneyKey((value) => value + 1); jump('journey');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not open the insight.'); }
    finally { setQuestionBusy(false); }
  };
  const saveLog = async () => {
    if (!preview || saving) return;
    setSaving(true); setStatus('');
    let observationSaved = false;
    try {
      const scope = await captureObservationScope();
      if (!scope) throw new Error('Choose an active profile before saving.');
      const chosenCode = !customSymptom.trim() ? symptoms.find((item) => item.label === selectedSymptom)?.code : undefined;
      const ingredients = ingredientText.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 12).map((name) => ({ name, status: 'user_confirmed' as const }));
      const payload: ObservationPayload = kind === 'symptom' ? { kind, symptom: preview, ...(chosenCode && chosenCode !== 'unspecified' ? { symptomCode: chosenCode } : {}), ...(severity !== null ? { severityLabel: severity } : {}), ...(relatedMealId ? { explicitMealIds: [relatedMealId] } : {}), ...(logNote.trim() ? { note: logNote.trim() } : {}) }
        : kind === 'meal' ? { kind, description: preview, ...(portionSize ? { portionSize } : {}), ...(ingredients.length ? { ingredients } : {}) } : { kind, description: logNote.trim() ? `${preview} — ${logNote.trim()}` : preview, contextType };
      const occurredAt = logTime ? new Date(`${localDate}T${logTime}:00`).toISOString() : null;
      if (occurredAt && Date.parse(occurredAt) > Date.now()) throw new Error('Choose a time that has already happened.');
      const result = await createObservation({ ...scope, payload, localDate, occurredAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null, timePrecision: logTime ? 'exact' : 'date_only', source: 'gut', evidenceType: 'user_report', idempotencyKey: newKey() });
      if (!result.ok) throw new Error(result.details?.[0] || `Could not save: ${result.error}`);
      observationSaved = true;
      await onRefresh();
      if (kind === 'symptom') { setSelectedSymptom(''); setCustomSymptom(''); setSeverity(null); setRelatedMealId(null); }
      if (kind === 'meal') { setMeal(''); setPortionSize(null); }
      if (kind === 'context') setContext('');
      setLogNote(''); setLogTime(''); setIngredientText(''); setLogStage('quick');
      const matchesLog = (item: GutQuestionThread) => item.status === 'open' && (kind === 'symptom' ? !!chosenCode && item.symptom === chosenCode : item.symptom === 'unspecified' && item.focus.trim().toLocaleLowerCase() === preview.toLocaleLowerCase());
      const matching = (activeThread && matchesLog(activeThread) ? activeThread : null) || threads.find(matchesLog);
      const savedQuestion = matching || await createGutThread({ intent: 'understand', question: kind === 'symptom' ? `What might explain ${preview.toLowerCase()}?` : kind === 'meal' ? `What do my ${preview} logs show?` : `What can I learn from my ${preview.toLowerCase()} log?`, symptom: chosenCode || 'unspecified', focus: kind === 'meal' || kind === 'context' ? preview : recentMeals.find((item) => item.id === relatedMealId)?.name || '' });
      setActiveThreadId(savedQuestion?.id || null);
      if (savedQuestion) refreshThreads();
      setJourneyStep('home'); setJourneyKey((value) => value + 1);
      jump('understanding');
      setStatus(savedQuestion ? 'Entry saved. Your understanding now includes it.' : 'Entry saved. You can start a question from My research.');
    } catch (error) { setStatus(observationSaved ? 'Entry saved, but the insight could not be opened. Find the entry in This week.' : error instanceof Error ? error.message : 'The entry could not be saved.'); }
    finally { setSaving(false); }
  };
  const startQuestion = async () => {
    if (!question.trim() || questionBusy) return;
    setQuestionBusy(true); setStatus('');
    try {
      const thread = await createGutThread({ intent: 'understand', question: question.trim() });
      if (!thread) throw new Error('Your question could not be saved.');
      refreshThreads(); setActiveThreadId(thread.id); setQuestion(''); setShowQuestion(false); jump('understanding');
      setJourneyStep('home'); setJourneyKey((value) => value + 1); setStatus('Question saved in My research.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not save question.'); }
    finally { setQuestionBusy(false); }
  };
  const generateInsight = async (thread: GutQuestionThread): Promise<boolean> => {
    if (insightBusy) return false;
    setInsightBusy(true); setStatus('');
    try {
      const scoped = await listObservations();
      const evidence = deriveGutEvidence(thread, snapshot, scoped);
      const contextRecords = scoped.slice(0, 14).map((item) => ({ id: item.id, kind: item.payload.kind, label: observationLabel(item), date: item.localDate || 'Date unknown', timing: item.timePrecision === 'date_only' ? 'Date only; order unknown' : item.timePrecision, sourceKind: 'observation' as const }));
      const contextFingerprint = JSON.stringify(scoped.slice(0, 14).map((item) => [item.id, item.revision, item.payload, item.localDate]));
      const topic = thread.researchTopic || 'food';
      const result = await reasonOverGutEvidence({ thread, evidence, papers: [], topic, contextRecords, contextFingerprint });
      result.evidenceFingerprint = gutSynthesisFingerprint(thread, evidence, contextFingerprint, topic);
      const saved = await updateGutThread(thread.id, { gutSynthesis: result });
      if (!saved) throw new Error('The answer could not be saved.');
      refreshThreads(); setActiveThreadId(saved.id);
      setStatus('Understanding updated from your saved records.');
      return true;
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not update your understanding.'); return false; }
    finally { setInsightBusy(false); }
  };
  const openObservation = (item: Observation) => onOpenSource({ sourceKind: 'observation', sourceId: item.id, localDate: item.localDate || undefined });
  const toDate = (key: string) => new Date(`${key}T12:00:00`);
  const selectedDate = toDate(selectedDay);
  const weekStart = new Date(); weekStart.setHours(12, 0, 0, 0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7) + 7 * weekOffset);
  const firstVisible = calendarMode === 'week' ? weekStart : new Date(new Date().getFullYear(), new Date().getMonth() + weekOffset, 1, 12);
  const weekActivityCount = activities.filter((item) => new Date(item.at) >= weekStart).length;
  const calendarDays = Array.from({ length: calendarMode === 'week' ? 7 : new Date(firstVisible.getFullYear(), firstVisible.getMonth() + 1, 0).getDate() }, (_, index) => { const day = new Date(firstVisible); day.setDate(day.getDate() + index); return day; });
  const visibleResearch = activities.filter((item) => { const day = dateKey(new Date(item.at)); return day >= dateKey(calendarDays[0]) && day <= dateKey(calendarDays[calendarDays.length - 1]); });
  const logsOn = (day: string) => observations.filter((item) => item.localDate === day);
  const activityOn = (day: string) => activities.filter((item) => dateKey(new Date(item.at)) === day);
  const selectedLogs = logsOn(selectedDay);
  const linkedReport = recentReports.find((item) => item.payload.kind === 'symptom' && item.payload.explicitMealIds?.some((id) => recentMeals.some((meal) => meal.id === id)));
  const linkedMeal = linkedReport?.payload.kind === 'symptom' ? recentMeals.find((meal) => linkedReport.payload.kind === 'symptom' && linkedReport.payload.explicitMealIds?.includes(meal.id)) : null;

  return <div className="gdh">
    {inlineSource && <GutSourceRecord source={inlineSource} meals={snapshot.meals} days={snapshot.days} onBack={() => setInlineSource(null)} onOpenDate={onOpenRecords} />}
    <div hidden={!!inlineSource}>
    <div className="gdh-page-head"><div className="gdh-kicker">{page === 'log' ? '01 / QUICK LOG' : page === 'understanding' ? '02 / YOUR UNDERSTANDING' : page === 'research' ? '03 / MY RESEARCH' : page === 'week' ? '04 / WEEKLY REVIEW' : 'YOUR INSIGHT / ONE STEP AT A TIME'}</div><button type="button" onClick={() => onOpenRecords()} className="gdh-history"><History size={15} /> History</button></div>
    {page === 'log' && <section className="gdh-page">
      <div className="gdh-brand"><span><Activity size={18} /></span>Gut Health</div>
      <h2>{logStage === 'quick' ? 'What happened?' : logStage === 'details' ? kind === 'meal' ? 'Meal details' : kind === 'symptom' ? 'Symptom details' : 'Context details' : 'Review your entry'}</h2>
      <p className="gdh-subtitle">{logStage === 'quick' ? 'A few taps. In your own words.' : logStage === 'details' ? 'Add only what you remember. Every field here is optional.' : 'Check the original details before saving.'}</p>
      {logStage === 'quick' && <>
        <div className="gdh-input-line"><Search size={16} /><input aria-label="Describe a meal or how you felt" placeholder="Describe a meal or feeling…" value={kind === 'symptom' ? customSymptom : kind === 'meal' ? meal : context} onChange={(event) => kind === 'symptom' ? setCustomSymptom(event.target.value) : kind === 'meal' ? setMeal(event.target.value) : setContext(event.target.value)} maxLength={200} /></div>
        <div className="gdh-segment" role="tablist" aria-label="Log type">{([['meal','Meal',Utensils],['symptom','Symptom',Activity],['context','Context',Sparkles]] as const).map(([id,label,Icon]) => <button type="button" role="tab" aria-selected={kind === id} className={kind === id ? 'active' : ''} key={id} onClick={() => setKind(id)}><Icon size={14} /> {label}</button>)}</div>
        {kind === 'symptom' && <div className="gdh-pill-grid">{symptoms.map((choice) => <button type="button" className={selectedSymptom === choice.label && !customSymptom ? 'chosen' : ''} key={choice.label} onClick={() => { setSelectedSymptom(choice.label); setCustomSymptom(''); }}><span className={`gdh-pill-icon gdh-tone-${choice.code}`}>{choice.icon}</span>{choice.label}{selectedSymptom === choice.label && !customSymptom && <Check size={14} />}</button>)}<button type="button" onClick={() => { setSelectedSymptom(''); document.querySelector<HTMLInputElement>('.gdh-input-line input')?.focus(); }}><span className="gdh-pill-icon gdh-tone-more"><Plus size={14} /></span>Something else</button></div>}
        {kind === 'meal' && <><div className="gdh-helper"><Utensils size={18} /><div><strong>What did you have?</strong><small>Name the meal above. Portion details are optional.</small></div></div><div className="gdh-field-label">Portion <small>Compared with your usual</small></div><div className="gdh-segment">{(['smaller','usual','larger'] as const).map((size) => <button type="button" key={size} className={portionSize === size ? 'active' : ''} onClick={() => setPortionSize(portionSize === size ? null : size)}>{size}</button>)}</div></>}
        {kind === 'context' && <div className="gdh-contexts">{(['sleep','stress','medication','illness','other'] as const).map((type) => <button type="button" key={type} className={contextType === type ? 'chosen' : ''} onClick={() => setContextType(type)}>{type}</button>)}</div>}
        <div className="gdh-rule" /><div className="gdh-field-label">When?</div>
        <div className="gdh-segment gdh-date-segment"><button type="button" className={when === 'today' ? 'active' : ''} onClick={() => setWhen('today')}>Today</button><button type="button" className={when === 'yesterday' ? 'active' : ''} onClick={() => setWhen('yesterday')}>Yesterday</button><button type="button" className={when === 'date' ? 'active' : ''} onClick={() => setWhen('date')}><CalendarDays size={14} /> Choose date</button></div>
        {when === 'date' && <input className="gdh-date-input" aria-label="Entry date" type="date" value={chosenDate} max={dateKey(new Date())} onChange={(event) => setChosenDate(event.target.value)} />}
        {preview && <div className="gdh-preview"><span>Your entry</span><strong>{sentence(preview)}</strong><small>{shortDate(toDate(localDate))} · {kind}</small></div>}
        {kind === 'symptom' && <><div className="gdh-field-label">How did it feel? <small>Optional</small></div><div className="gdh-segment gdh-severity">{(['mild','moderate','severe'] as const).map((value) => <button type="button" key={value} className={severity === value ? 'active' : ''} onClick={() => setSeverity(severity === value ? null : value)}>{value}</button>)}</div>{recentMeals.some((item) => item.date === localDate) && <><div className="gdh-field-label">Link to a meal you saved that day? <small>Only if you remember</small></div><div className="gdh-segment gdh-meal-link"><button type="button" className={!relatedMealId ? 'active' : ''} onClick={() => setRelatedMealId(null)}>Not sure</button>{recentMeals.filter((item) => item.date === localDate).slice(0, 3).map((item) => <button type="button" key={item.id} className={relatedMealId === item.id ? 'active' : ''} onClick={() => setRelatedMealId(item.id)}>{sentence(item.name, 25)}</button>)}</div></>}</>}
        {preview && <button type="button" className="gdh-secondary" onClick={() => setLogStage('details')}>Add details & review <ArrowRight size={14} /></button>}
        <button type="button" className="gdh-primary" disabled={!preview || saving || !localDate} onClick={() => void saveLog()}>{saving ? 'Saving…' : 'Save & see my understanding'} <ArrowRight size={16} /></button>
        <small className="gdh-footnote">Meals and symptoms are saved separately. A same-day entry does not prove a connection.</small>
        <div className="gdh-utility"><button type="button" onClick={() => jump('understanding')}>Your understanding <ArrowRight size={14} /></button><button type="button" onClick={onOpenVisit}>Prepare for visit <ArrowRight size={14} /></button></div>
      </>}
      {logStage === 'details' && <>
        <div className="gdh-preview"><span>{kind.toUpperCase()}</span><strong>{preview}</strong><small>{localDate}</small></div>
        <label className="gdh-detail-label">Exact time <small>Only if you remember</small><input type="time" aria-label="Exact time" value={logTime} onChange={(event) => setLogTime(event.target.value)} /></label>
        {kind === 'meal' && <label className="gdh-detail-label">Ingredients you know <small>Separate with commas</small><input aria-label="Known ingredients" value={ingredientText} maxLength={500} onChange={(event) => setIngredientText(event.target.value)} placeholder="e.g. rice, milk" /></label>}
        {kind !== 'meal' && <label className="gdh-detail-label">Your note <small>Optional</small><textarea aria-label="Entry note" value={logNote} maxLength={500} onChange={(event) => setLogNote(event.target.value)} placeholder="What else do you remember?" /></label>}
        <button type="button" className="gdh-primary" onClick={() => setLogStage('review')}>Review entry <ArrowRight size={15} /></button>
        <button type="button" className="gdh-text-link" onClick={() => setLogStage('quick')}>Back to Quick Log</button>
      </>}
      {logStage === 'review' && <>
        <div className="gdh-review"><div><span>What</span><strong>{preview}</strong></div><div><span>When</span><strong>{localDate}{logTime ? ` at ${logTime}` : ' · time not recorded'}</strong></div><div><span>{kind === 'meal' ? 'Portion' : kind === 'symptom' ? 'Severity' : 'Context'}</span><strong>{kind === 'meal' ? portionSize || 'Not recorded' : kind === 'symptom' ? severity || 'Not recorded' : contextType}</strong></div>{relatedMealId && <div><span>Linked meal</span><strong>{recentMeals.find((item) => item.id === relatedMealId)?.name || 'Original meal'}</strong></div>}{(logNote || ingredientText) && <div><span>Extra detail</span><strong>{logNote || ingredientText}</strong></div>}</div>
        <p className="gdh-footnote">Only the details above are saved. Blank fields stay unknown.</p>
        <button type="button" className="gdh-primary" disabled={saving} onClick={() => void saveLog()}>{saving ? 'Saving…' : 'Save & see my understanding'} <ArrowRight size={16} /></button>
        <button type="button" className="gdh-text-link" onClick={() => setLogStage('details')}>Edit details</button>
      </>}
    </section>}
    {page === 'understanding' && (!activeThread || showQuestion) && <section className="gdh-page">
      <div className="gdh-brand"><span><Activity size={18} /></span>Gut Health {hasData && <em>BASED ON YOUR LOGS</em>}</div>
      <h2>Your understanding</h2>
      {!hasData && !threads.length ? <div className="gdh-empty"><div className="gdh-empty-icon"><FileText size={34} /></div><strong>No personal findings yet.</strong><p>Your entries will help us look for patterns.</p><button type="button" className="gdh-primary" onClick={() => jump('log')}>Add an entry</button><button type="button" className="gdh-text-link" onClick={() => setShowQuestion(true)}>Or ask a question</button></div> : <>
        <p className="gdh-subtitle">{synthesis?.headline || (linkedMeal && linkedReport?.payload.kind === 'symptom' ? `You linked ${linkedReport.payload.symptom} with ${linkedMeal.name}. One report cannot establish a cause.` : recentReports.length ? `${recentReports.length} symptom ${recentReports.length === 1 ? 'report' : 'reports'} saved. Too early to name a cause.` : recentMeals.length ? `${recentMeals.length} meal ${recentMeals.length === 1 ? 'entry' : 'entries'} saved. No symptom outcome linked yet.` : 'Your records are ready to explore.')}</p>
        <div className="gdh-insight-list">{recentReports.slice(0, 2).map((item) => <button type="button" key={item.id} onClick={() => openObservation(item)}><span className="gdh-insight-icon rose"><Activity size={18} /></span><span><strong>{observationLabel(item)}</strong><small>{item.localDate || 'Date unknown'} · Your report</small></span><ChevronRight size={17} /></button>)}{recentReports.length === 0 && <div className="gdh-helper"><CircleHelp size={18} /><span>No symptom reports yet. You can still explore your meals or ask a question.</span></div>}{recentMeals.slice(0, 2).map((item) => <button type="button" key={item.id} onClick={() => onOpenSource({ sourceKind: item.sourceKind || 'diet_meal', sourceId: item.id, localDate: item.date })}><span className="gdh-insight-icon mint"><Utensils size={18} /></span><span><strong>{item.name}</strong><small>{item.date} · Recorded meal</small></span><ChevronRight size={17} /></button>)}</div>
        <button type="button" className="gdh-inline-link" onClick={() => onOpenRecords()}>View original logs <ArrowRight size={14} /></button>
        <div className="gdh-explain-tabs">{([['compare','Compare possibilities',Activity],['simple','Explain simply',FileText],['research','Check research',Search]] as const).map(([mode,label,Icon]) => <button type="button" key={mode} className={insightMode === mode ? 'active' : ''} onClick={() => { setInsightMode(mode); void openJourney(mode); }}><Icon size={14} />{label}</button>)}</div>
        {insightMode === 'compare' && <div className="gdh-explain-panel"><strong>What your records show</strong><p>{activeEvidence?.answer || (recentReports.length > 0 && recentMeals.length > 0 ? 'You have both meal and symptom records. Open a question to check their dates, timing and missing details before comparing them.' : 'Record a meal and an outcome on occasions that matter to you. Unknown days stay unknown.')}</p></div>}
        {insightMode === 'simple' && <div className="gdh-explain-panel"><strong>In simple words</strong><p>{synthesis?.personalReading || 'Your entries are saved. They describe what happened, but one entry cannot explain why it happened.'}</p></div>}
        {insightMode === 'research' && <div className="gdh-explain-panel"><strong>Research for this question</strong><p>{synthesis?.researchReading || 'Open a question to inspect general evidence and save the sources that help you.'}</p><button type="button" className="gdh-inline-link" onClick={() => void openJourney('research')}>Explore sources <ArrowRight size={14} /></button></div>}
        <div className="gdh-record-strip"><span>WHAT FITS YOUR RECORDS</span><div>{activeThread ? <button type="button" onClick={() => void openJourney('home', activeThread.id)}><BookOpen size={16} />{sentence(activeThread.question, 68)} <ChevronRight size={16} /></button> : <button type="button" onClick={() => setShowQuestion(true)}><Plus size={16} />Ask what you want to understand <ChevronRight size={16} /></button>}</div></div>
        <div className="gdh-next"><Lightbulb size={20} /><div><strong>What you can do</strong><p>{synthesis?.nextReason || 'Keep your question open. Add a log when something worth remembering happens.'}</p></div></div>
        {activeThread && <button type="button" className="gdh-primary" onClick={() => void openJourney('permission')} disabled={insightBusy}>{activeThread.gutSynthesis ? 'Refresh understanding' : 'Get a Gemini reading'} <Sparkles size={16} /></button>}
        {!activeThread && <button type="button" className="gdh-primary" onClick={() => setShowQuestion(true)}>Ask about my entries <ArrowRight size={16} /></button>}
      </>}
      {showQuestion && <div className="gdh-question"><button type="button" className="gdh-question-close" aria-label="Close question" onClick={() => setShowQuestion(false)}><X size={16} /></button><strong>What would you like to understand?</strong><textarea autoFocus aria-label="Your gut question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} placeholder="For example: What might explain bloating after dinner?" /><button type="button" className="gdh-primary" disabled={!question.trim() || questionBusy} onClick={() => void startQuestion()}>{questionBusy ? 'Saving…' : 'Start investigation'} <ArrowRight size={16} /></button></div>}
    </section>}
    {(page === 'journey' || (page === 'understanding' && !showQuestion)) && activeThread && <GutInnerJourney key={`${activeThread.id}:${journeyKey}`} thread={activeThread} snapshot={snapshot} observations={observations} initialStep={journeyStep} generating={insightBusy} onGenerate={generateInsight} onUpdated={refreshThreads} onRefresh={onRefresh} onOpenSource={onOpenSource} onOpenQuestion={(id) => void openJourney('home', id)} onResearch={() => jump('research')} onOpenVisit={onOpenVisit} onLog={() => jump('log')} onBack={() => jump(journeyReturn)} />}
    {page === 'research' && <section className="gdh-page">
      <div className="gdh-brand"><span><Activity size={18} /></span>Gut Health</div><h2>My research</h2><p className="gdh-subtitle">Your questions, findings and saved sources.</p>
      {dueReminders.length > 0 && <button type="button" className="gdh-reminder-banner" onClick={() => void openJourney('note', dueReminders[0].id)}><Lightbulb size={17} /><span><strong>Ready to revisit</strong><small>{sentence(dueReminders[0].selectedStep || dueReminders[0].question, 100)}</small></span><ArrowRight size={15} /></button>}
      {threads.length > 0 && <button type="button" className="gdh-week-banner" onClick={() => jump('week')}><CalendarDays size={18} /><span><strong>This week</strong><small>{weekActivityCount} saved research {weekActivityCount === 1 ? 'activity' : 'activities'}</small></span>Review week <ArrowRight size={15} /></button>}
      <div className="gdh-research-tabs"><button type="button" className={researchTab === 'investigations' ? 'active' : ''} onClick={() => setResearchTab('investigations')}><Search size={15} /> Investigations</button><button type="button" className={researchTab === 'sources' ? 'active' : ''} onClick={() => setResearchTab('sources')}><BookOpen size={15} /> Saved sources</button></div>
      {researchTab === 'investigations' && (threads.length ? <div className="gdh-thread-list">{threads.map((thread) => <article key={thread.id} className="gdh-thread"><div className="gdh-thread-top"><span className="gdh-insight-icon rose"><Activity size={18} /></span><strong>{sentence(thread.question, 100)}</strong><em>{thread.status === 'closed' ? 'Finished' : 'Exploring'}</em></div><small>Current understanding</small><p>{thread.gutSynthesis?.headline || (thread.symptom !== 'unspecified' && observations.some((item) => item.payload.kind === 'symptom' && item.payload.symptomCode === thread.symptom) ? 'Your symptom log is saved. The cause is still open.' : 'Your question is saved. Explore the records when you are ready.')}</p>{thread.selectedStep && <div className="gdh-thread-step"><Lightbulb size={13} /> {sentence(thread.selectedStep, 120)}{thread.reminderAt ? ` · Revisit ${thread.reminderAt}` : ''}</div>}<div className="gdh-thread-foot"><span><Clock3 size={13} /> Updated {shortDate(new Date(thread.updatedAt))}</span><button type="button" onClick={() => void openJourney('home', thread.id)}>{thread.gutSynthesis ? 'Continue' : 'Open'} <ArrowRight size={14} /></button></div></article>)}</div> : <div className="gdh-empty"><div className="gdh-empty-icon"><Search size={34} /></div><strong>No investigations yet.</strong><p>Start a question or save an insight here.</p><button type="button" className="gdh-primary" onClick={() => { jump('understanding'); setShowQuestion(true); }}>Start a question</button><button type="button" className="gdh-text-link" onClick={() => jump('log')}>Add a log</button></div>)}
      {researchTab === 'sources' && (savedSources.length ? <div className="gdh-source-list">{savedSources.map((source) => <a key={source.id} href={`https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(source.id)}/`} target="_blank" rel="noreferrer"><BookOpen size={17} /><span><strong>{source.title}</strong><small>{source.status === 'active' ? 'Saved research source' : `Status: ${source.status}`}</small></span><ArrowRight size={15} /></a>)}</div> : <div className="gdh-empty"><div className="gdh-empty-icon mint"><BookOpen size={32} /></div><strong>No saved sources.</strong><p>Sources appear here when you choose to save them.</p><button type="button" className="gdh-primary" onClick={() => threads[0] ? void openJourney('research', threads[0].id) : (jump('understanding'), setShowQuestion(true))}>Explore a question</button></div>)}
      {researchTab === 'investigations' && threads.length > 0 && <button type="button" className="gdh-list-action" onClick={() => { jump('understanding'); setShowQuestion(true); }}><Plus size={18} /> Start a question <ChevronRight size={17} /></button>}
    </section>}
    {page === 'week' && <section className="gdh-page">
      <div className="gdh-brand"><span><Activity size={18} /></span>Gut Health</div><h2>Your week</h2>
      <div className="gdh-week-controls"><div><button type="button" aria-label="Previous period" onClick={() => setWeekOffset((value) => value - 1)}><ChevronLeft size={15} /></button><strong>{calendarMode === 'week' ? `${shortDate(calendarDays[0])} – ${shortDate(calendarDays[calendarDays.length - 1])}` : calendarDays[0].toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Next period" disabled={weekOffset >= 0} onClick={() => setWeekOffset((value) => value + 1)}><ChevronRight size={15} /></button></div><div className="gdh-week-switch"><button type="button" className={calendarMode === 'week' ? 'active' : ''} onClick={() => setCalendarMode('week')}>Week</button><button type="button" className={calendarMode === 'month' ? 'active' : ''} onClick={() => setCalendarMode('month')}>Month</button></div></div>
      <div className={`gdh-calendar ${calendarMode === 'month' ? 'month' : ''}`}>{calendarDays.map((day) => { const key = dateKey(day); const logs = logsOn(key); const research = activityOn(key); return <button type="button" key={key} className={selectedDay === key ? `selected ${hasData || activities.length ? '' : 'empty'}` : ''} onClick={() => setSelectedDay(key)}><small>{day.toLocaleDateString(undefined, { weekday: 'short' })}</small><strong>{day.getDate()}</strong><span className="gdh-dots">{logs.length > 0 && <i className="log" />}{research.length > 0 && <i className="research" />}{!logs.length && !research.length && <i className="none" />}</span></button>; })}</div>
      <div className="gdh-legend"><span>Blank days mean no entry, not symptom-free.</span><div><i className="log" /> Log added <i className="research" /> Research saved</div></div>
      {!hasData && activities.length === 0 ? <div className="gdh-empty"><div className="gdh-empty-icon"><CalendarDays size={34} /></div><strong>Your week starts with an entry.</strong><p>Logs and saved research will appear on their dates.</p><button type="button" className="gdh-primary" onClick={() => jump('log')}>Add an entry</button><button type="button" className="gdh-text-link" onClick={() => { jump('understanding'); setShowQuestion(true); }}>Ask a question</button></div> : <>
        <div className="gdh-week-heading">What changed {calendarMode === 'week' ? 'this week' : 'this month'}</div>
        {visibleResearch.length ? <div className="gdh-day-list">{visibleResearch.slice(0, 12).map((item) => <button type="button" key={item.id} onClick={() => void openJourney(item.kind === 'understanding' || item.kind === 'checkin' ? 'changed' : 'home', item.threadId)}><span className="gdh-insight-icon blue"><BookOpen size={16} /></span><span>{item.kind !== 'question' && item.previousTitle && <span className="gdh-previous">Earlier: {sentence(item.previousTitle, 100)}</span>}<strong>{item.kind === 'understanding' ? 'Now: ' : item.kind === 'checkin' ? 'New log: ' : ''}{sentence(item.title, 120)}</strong>{item.kind !== 'question' && item.detail && <span className="gdh-milestone-detail">{sentence(item.detail, 160)}</span>}<small>{shortDate(new Date(item.at))} · {activityLabel(item.kind)}</small></span><ChevronRight size={16} /></button>)}</div> : <p className="gdh-no-day">No research changes saved in this period.</p>}
        <div className="gdh-week-heading">Logs · {selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</div>
        {selectedLogs.length === 0 ? <p className="gdh-no-day">No log recorded on this day.</p> : <div className="gdh-day-list">{selectedLogs.map((item) => <button type="button" key={item.id} onClick={() => openObservation(item)}><span className="gdh-insight-icon rose"><Activity size={16} /></span><span><strong>{sentence(observationLabel(item), 80)}</strong><small>Entry saved · Original record</small></span><ChevronRight size={16} /></button>)}</div>}
        <button type="button" className="gdh-text-link" onClick={() => onOpenRecords(selectedDay)}>Open this day’s records <ArrowRight size={14} /></button>
        {threads[0] && <button type="button" className="gdh-primary" onClick={() => void openJourney('home', threads[0].id)}>Continue {sentence(threads[0].question, 42)} <ArrowRight size={15} /></button>}
      </>}
    </section>}
    {status && <div className="gdh-status" role="status">{status}</div>}
    <nav className="gdh-bottom-nav" aria-label="Gut daily pages"><button type="button" className={page === 'log' ? 'active' : ''} onClick={() => jump('log')}><Plus size={18} /> Log</button><button type="button" className={page === 'research' || page === 'understanding' || page === 'journey' ? 'active' : ''} onClick={() => jump('research')}><Search size={17} /> My research</button><button type="button" className={page === 'week' ? 'active' : ''} onClick={() => jump('week')}><CalendarDays size={17} /> This week</button></nav>
    </div>
  </div>;
};
