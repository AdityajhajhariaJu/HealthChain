import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, Clipboard, Compass, FileText, GitBranch, HeartHandshake, Plus, RotateCcw, Search, ShieldCheck, Sparkles, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatGutVisitNote, getGutSnapshot, type GutMeal } from '../../services/GutHealthSummary';
import { listObservations, loadObservationsFromCloud } from '../../services/HealthObservationService';
import { getActiveTrialV2, getHealthEvents } from '../../services/TrialWorkflowService';
import type { Observation } from '../../domain/observations/types';
import { createGutThread, deriveGutChangeReceipt, deriveGutEvidence, hasStableGutMealId, listGutThreads, makeGutReviewSnapshot, recordGutMealOutcome, updateGutThread, type GutIntent, type GutQuestionThread, type GutSymptom } from '../../services/GutResolutionService';
import { gutResearchTopics, searchGutResearch, type GutResearchPaper, type GutResearchTopic } from '../../services/GutResearchService';
import { GutDecisionPlanner } from './GutDecisionPlanner';
import { GutCaseHandoff } from './GutCaseHandoff';
import './GutResolutionWorkspace.css';

interface Props {
  onOpenHistory: (date?: string) => void;
  onOpenQuickMeal: () => void;
  onOpenConsult?: () => void;
  onOpenElimination?: () => void;
  onOpenDiet?: () => void;
  onOpenCasePrep?: (caseId: string) => void;
  onOpenCases?: () => void;
}

type View = 'answer' | 'evidence' | 'research' | 'next';
const intents: Array<{ id: GutIntent; title: string; desc: string; icon: LucideIcon }> = [
  { id: 'now', title: 'I feel unwell', desc: 'Organize what happened and find care', icon: HeartHandshake },
  { id: 'decide', title: 'I need to choose', desc: 'Think through an upcoming situation', icon: Compass },
  { id: 'understand', title: 'I want to understand', desc: 'Examine a pattern without guessing', icon: GitBranch },
  { id: 'care', title: 'I have a care question', desc: 'Prepare a focused clinician discussion', icon: FileText },
];
const symptoms: Array<{ id: GutSymptom; label: string }> = [
  { id: 'bloating', label: 'Bloating' }, { id: 'discomfort', label: 'Abdominal discomfort' },
  { id: 'reflux', label: 'Reflux' }, { id: 'nausea', label: 'Nausea' }, { id: 'bowel_changes', label: 'Bowel changes' },
];
const symptomName = (symptom: GutSymptom) => symptoms.find((item) => item.id === symptom)?.label.toLowerCase() || 'symptoms';
const trialContext = () => {
  try {
    const trial = getActiveTrialV2();
    if (!trial) return null;
    return { id: trial.id, status: trial.status.replace(/_/g, ' '), checkins: getHealthEvents({ profileId: trial.profileId, trialId: trial.id, type: 'daily_checkin' }).length };
  } catch { return null; }
};

export const GutResolutionWorkspace: React.FC<Props> = ({ onOpenHistory, onOpenQuickMeal, onOpenConsult, onOpenElimination, onOpenDiet, onOpenCasePrep, onOpenCases }) => {
  const [snapshot, setSnapshot] = useState(() => getGutSnapshot());
  const [observations, setObservations] = useState<Observation[]>([]);
  const [threads, setThreads] = useState<GutQuestionThread[]>(() => listGutThreads());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [intent, setIntent] = useState<GutIntent>('understand');
  const [question, setQuestion] = useState('');
  const [focus, setFocus] = useState('');
  const [focusDraft, setFocusDraft] = useState('');
  const [symptom, setSymptom] = useState<GutSymptom>('bloating');
  const [view, setView] = useState<View>('answer');
  const [focusOccasionId, setFocusOccasionId] = useState<string | null>(null);
  const [research, setResearch] = useState<GutResearchPaper[]>([]);
  const [researchStatus, setResearchStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [researchTopic, setResearchTopic] = useState<GutResearchTopic>('food');
  const researchRequest = useRef(0);
  const [stepDraft, setStepDraft] = useState('');
  const [reflectionDraft, setReflectionDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [cloudNote, setCloudNote] = useState('');
  const [trial, setTrial] = useState(trialContext);
  const thread = threads.find((item) => item.id === activeId) || null;

  const sourcedSnapshot = useMemo(() => {
    const represented = new Set(snapshot.meals.map((meal) => meal.id));
    const canonicalMeals: GutMeal[] = observations.filter((item) => item.payload.kind === 'meal' && !!item.localDate && !represented.has(item.id) && (!item.sourceRecordId || !represented.has(item.sourceRecordId))).map((item) => ({
      id: item.id,
      name: item.payload.kind === 'meal' ? item.payload.description : 'Meal',
      date: item.localDate!,
      time: item.timePrecision === 'exact' || item.timePrecision === 'approximate' ? new Date(item.occurredAt!).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : null,
      reaction: null,
    }));
    return { ...snapshot, meals: [...snapshot.meals, ...canonicalMeals].sort((a, b) => b.date.localeCompare(a.date)) };
  }, [snapshot, observations]);

  const refresh = useCallback(async () => {
    setSnapshot(getGutSnapshot());
    setThreads(listGutThreads());
    setTrial(trialContext());
    setObservations(await listObservations());
  }, []);

  useEffect(() => {
    void refresh();
    let active = true;
    void loadObservationsFromCloud().then((result) => {
      if (!active) return;
      if (result.status === 'unavailable') setCloudNote('Your account records could not be loaded from the cloud. New reports stay on this device until sync works.');
      else if (result.status === 'conflict') setCloudNote('Some account records differ from this device. Local edits were preserved; review sync before relying on a combined history.');
      else if (result.status === 'storage_failure') setCloudNote('Account records were found, but this device could not save them. Check available storage.');
      else setCloudNote('');
      void refresh();
    }).catch(() => { if (active) setCloudNote('Your account records could not be loaded from the cloud. Local records remain available.'); });
    const events = ['hc_profile_updated', 'hc_digestion_updated', 'hc_nutrition_reaction_updated', 'hc_observations_updated', 'hc_trial_v2_updated', 'hc_health_event_appended'];
    const handle = () => { void refresh(); };
    events.forEach((event) => window.addEventListener(event, handle));
    return () => { active = false; events.forEach((event) => window.removeEventListener(event, handle)); };
  }, [refresh]);

  const comparisonFocus = thread?.intent === 'decide' ? (thread.decision?.chosen ? thread.decision.options[thread.decision.chosen].mealName : thread.decision?.options.a.mealName || thread.decision?.options.b.mealName || '') : thread?.focus || '';
  const evidence = useMemo(() => {
    if (!thread) return null;
    const exactMeals = thread.intent === 'decide' ? sourcedSnapshot.meals.filter((meal) => meal.name.trim().toLocaleLowerCase() === comparisonFocus.trim().toLocaleLowerCase()) : sourcedSnapshot.meals;
    return deriveGutEvidence({ ...thread, focus: comparisonFocus }, { ...sourcedSnapshot, meals: exactMeals }, observations);
  }, [thread, sourcedSnapshot, observations, comparisonFocus]);
  const mealNames = useMemo(() => [...new Set(sourcedSnapshot.meals.map((meal) => meal.name))].slice(0, 40), [sourcedSnapshot.meals]);
  const changeReceipt = thread?.reviewedEvidence && evidence ? deriveGutChangeReceipt(thread.reviewedEvidence, { ...thread, focus: comparisonFocus }, evidence) : null;
  const hasChanged = !!changeReceipt?.changed;

  useEffect(() => {
    if (view !== 'evidence' || !focusOccasionId) return;
    const frame = requestAnimationFrame(() => {
      const occasion = document.getElementById(`gr-occasion-${focusOccasionId}`);
      occasion?.scrollIntoView({ block: 'center' });
      occasion?.focus();
      setFocusOccasionId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [view, focusOccasionId]);

  const openThread = (item: GutQuestionThread) => {
    researchRequest.current++;
    setActiveId(item.id);
    setFocusDraft(item.focus);
    setStepDraft(item.selectedStep || '');
    setReflectionDraft(item.reflection || '');
    setView('answer');
    setResearch([]);
    setResearchStatus('idle');
    setResearchTopic('food');
    setMessage('');
  };

  const savePatch = async (patch: Parameters<typeof updateGutThread>[1]) => {
    if (!thread) return null;
    setBusy(true);
    const saved = await updateGutThread(thread.id, patch);
    setBusy(false);
    if (saved) { setThreads(listGutThreads()); if (patch.symptom && patch.symptom !== thread.symptom) { researchRequest.current++; setResearch([]); setResearchStatus('idle'); } }
    else setMessage('Could not save this question. Your text is still here; please try again.');
    return saved;
  };

  const start = async () => {
    if (!question.trim() || busy) return;
    setBusy(true);
    const created = await createGutThread({ intent, question, focus, symptom });
    setBusy(false);
    if (!created) { setMessage('Could not save your question. Please try again.'); return; }
    setQuestion(''); setFocus('');
    setThreads(listGutThreads());
    openThread(created);
  };

  const record = async (meal: GutMeal, answer: 'yes' | 'no') => {
    if (!thread || busy) return;
    setBusy(true);
    const result = await recordGutMealOutcome(meal, thread.symptom, answer);
    setBusy(false);
    if (result.ok) { await refresh(); setMessage(result.sync === 'queue_failed' ? 'Saved on this device, but account sync could not be queued. Check your sync status.' : result.sync === 'pending' ? 'Saved on this device. Account sync is pending; the answer has been recalculated.' : 'Your explicit report was saved. The answer has been recalculated.'); }
    else setMessage('Could not save that report. Please check your account and try again.');
  };

  const loadResearch = async (selectedTopic: GutResearchTopic = researchTopic) => {
    if (!thread || researchStatus === 'loading') return;
    const request = ++researchRequest.current;
    setResearchStatus('loading'); setResearch([]);
    try {
      const papers = await searchGutResearch(thread.symptom, selectedTopic);
      if (request === researchRequest.current) { setResearch(papers); setResearchStatus('ready'); }
    } catch { if (request === researchRequest.current) setResearchStatus('error'); }
  };

  const copyBrief = async () => {
    if (!thread || !evidence) return;
    const lines = [
      `Gut question — ${thread.question}`,
      `Prepared ${new Date().toLocaleDateString()}`,
      `Focus: ${thread.focus || 'not chosen'}; symptom: ${symptomName(thread.symptom)}`,
      `Personal records: ${evidence.support} linked report(s) with symptom, ${evidence.tension} explicit report(s) without, ${evidence.unknown} unknown or disputed outcome(s), including ${evidence.conflicts} conflicting source(s).`,
      evidence.answer,
      ...evidence.occasions.map((item) => `${item.meal.date}: ${item.meal.name}; ${item.answerOrigin === 'conflict' ? 'Diet and Gut reports disagree; outcome unresolved' : item.answer === 'yes' ? `${symptomName(thread.symptom)} reported` : item.answer === 'no' ? `no ${symptomName(thread.symptom)} reported` : 'outcome unknown'}; meal source ${item.meal.id}; answer source ${item.answerOrigin}${item.meal.reactionType ? `; Diet reaction ${item.meal.reactionType}` : ''}${item.answerSource ? `; Gut report ${item.answerSource.id}, revision ${item.answerSource.revision}` : ''}`),
      `Next step chosen: ${thread.selectedStep || 'not chosen'}`,
      ...(thread.intent === 'decide' && thread.decision ? [
        `Upcoming options: A — ${thread.decision.options.a.label || 'not entered'}; B — ${thread.decision.options.b.label || 'not entered'}`,
        `Personal priority: ${thread.decision.priority || 'not entered'}`,
        `Choice: ${thread.decision.chosen ? thread.decision.options[thread.decision.chosen].label : 'undecided'}`,
        `Actual outcome, user report: ${thread.decision.outcome || 'unknown'}`,
        'A planned or chosen meal is not evidence that it was eaten or tolerated.',
      ] : []),
      `What happened: ${thread.reflection || 'not reported'}`,
      ...(trial ? [`Separate Clinical Elimination Suite trial: ${trial.id}; status ${trial.status}; ${trial.checkins} trial check-in(s). These were not counted as linked meal reports.`] : []),
      'A linked observation is not proof of cause. Date-only reports do not establish symptom timing. Research sources, if reviewed, must be assessed for their applicability to this person.',
      ...research.map((paper) => `General research shown (reading not confirmed): ${paper.title} — ${paper.url}${paper.correctionNotice ? `; publication notice: ${paper.correctionNotice}` : ''}`),
      '', formatGutVisitNote(snapshot),
    ];
    try { await navigator.clipboard.writeText(lines.join('\n')); setMessage('Question brief copied.'); }
    catch { setMessage('Could not copy the brief. Please try again.'); }
  };

  return <div className="gr-workspace">
    {cloudNote && <p className="gr-sync-note" role="status"><ShieldCheck size={17} /> {cloudNote}</p>}
    {!thread ? <>
      <div className="gr-eyebrow"><span className="gr-eyebrow-dot" /> GUT RESOLUTION STUDIO <span className="gr-eyebrow-note">Your evidence, in context</span></div>
      <h2 className="gr-title">What would you like help figuring out?</h2>
      <p className="gr-subtitle">Start with a question that matters today. We will connect what you actually recorded, show what is still uncertain, and help you choose a useful next step.</p>
      {threads.some((item) => item.status === 'open') && <section className="gr-continue">
        <div className="gr-small-icon"><RotateCcw size={19} /></div>
        <div className="gr-continue-text"><span>Continue where you left off</span><strong>{threads.find((item) => item.status === 'open')?.question}</strong></div>
        <button type="button" className="gr-quiet-button" onClick={() => openThread(threads.find((item) => item.status === 'open')!)}>Continue <ArrowRight size={16} /></button>
      </section>}
      <div className="gr-intent-grid" role="group" aria-label="Choose what kind of help you need">
        {intents.map(({ id, title, desc, icon: Icon }) => <button type="button" key={id} className={`gr-intent ${intent === id ? 'gr-intent-active' : ''}`} aria-pressed={intent === id} onClick={() => setIntent(id)}>
          <span className={`gr-icon gr-icon-${id}`}><Icon size={21} /></span><span><strong>{title}</strong><small>{desc}</small></span><ChevronRight size={17} className="gr-intent-arrow" />
        </button>)}
      </div>
      <section className="gr-start-form">
        <label htmlFor="gr-question">Your question or situation</label>
        <div className="gr-input-wrap"><Search size={20} /><input id="gr-question" value={question} maxLength={500} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void start(); }} placeholder={intent === 'now' ? 'What is happening right now?' : intent === 'decide' ? 'What are you trying to do?' : intent === 'care' ? 'What do you want to ask at your visit?' : 'What pattern are you wondering about?'} /></div>
        {intent === 'understand' && <div className="gr-form-row">
          <label>Meal or phrase to examine <span>(optional)</span><input value={focus} onChange={(event) => setFocus(event.target.value)} list="gr-meal-names" placeholder="Choose from your records or type a phrase" maxLength={120} /></label>
          <datalist id="gr-meal-names">{mealNames.map((name) => <option key={name} value={name} />)}</datalist>
          <label>Symptom <select value={symptom} onChange={(event) => setSymptom(event.target.value as GutSymptom)}>{symptoms.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        </div>}
        <div className="gr-start-actions"><button type="button" className="gr-primary" onClick={() => void start()} disabled={!question.trim() || busy}>Open my question <ArrowRight size={17} /></button><span>No questionnaire or daily log required.</span></div>
      </section>
      <div className="gr-home-bottom"><div><ShieldCheck size={17} /> Your records and research stay visibly separate.</div><button type="button" onClick={onOpenQuickMeal}><Plus size={16} /> Record a meal</button><button type="button" onClick={() => onOpenHistory()}><Activity size={16} /> Open history</button></div>
      {threads.filter((item) => item.status === 'closed').length > 0 && <section className="gr-closed"><h3>Past questions</h3>{threads.filter((item) => item.status === 'closed').slice(0, 4).map((item) => <button type="button" key={item.id} onClick={() => openThread(item)}>{item.question}<ArrowRight size={15} /></button>)}</section>}
    </> : <>
      <div className="gr-thread-top"><button type="button" className="gr-back" onClick={() => { setActiveId(null); setMessage(''); }}><ArrowLeft size={17} /> All questions</button><span className="gr-thread-kind">{intents.find((item) => item.id === thread.intent)?.title}</span></div>
      <div className="gr-thread-heading"><div><div className="gr-eyebrow"><span className="gr-eyebrow-dot" /> QUESTION THREAD</div><h2 className="gr-title">{thread.question}</h2><p className="gr-subtitle">An answer you can inspect and change as your records change.</p></div><span className="gr-icon gr-icon-understand"><GitBranch size={24} /></span></div>
      <nav className="gr-tabs" aria-label="Question sections">{([['answer',thread.intent === 'decide' ? 'My choice' : 'My answer'],['evidence','Evidence'],['research','Research'],['next','Next step']] as const).map(([id, label]) => <button type="button" key={id} aria-current={view === id ? 'page' : undefined} className={view === id ? 'gr-tab-active' : ''} onClick={() => { setView(id); setMessage(''); }}>{label}</button>)}</nav>
      {hasChanged && <div className="gr-change" role="status"><Sparkles size={19} /><div><strong>{thread.reviewedEvidence?.occasions ? 'Your records changed since this question was last reviewed.' : 'This question needs a fresh evidence review.'}</strong><span>Then: {changeReceipt?.previous.support} with, {changeReceipt?.previous.tension} without, {changeReceipt?.previous.unknown} unknown. Now: {changeReceipt?.current.support} with, {changeReceipt?.current.tension} without, {changeReceipt?.current.unknown} unknown.</span>{changeReceipt?.comparisonChanged && <span>The meal comparison or symptom changed.</span>}{changeReceipt && changeReceipt.changes.length > 0 && <ul>{changeReceipt.changes.slice(0, 3).map((change) => <li key={change.mealId}><strong>{change.label}:</strong> {change.detail}</li>)}{changeReceipt.changes.length > 3 && <li>{changeReceipt.changes.length - 3} more changed occasion(s) in Evidence.</li>}</ul>}{thread.reviewedEvidence?.occasions && changeReceipt?.changes.length === 0 && <span>A comparison detail changed; inspect the source records before relying on the earlier answer.</span>}<button type="button" className="gr-change-review" disabled={busy || !evidence} onClick={() => void savePatch({ reviewedEvidence: makeGutReviewSnapshot({ ...thread, focus: comparisonFocus }, evidence!) })}>I reviewed the current evidence</button></div></div>}
      {view === 'answer' && thread.intent === 'decide' && <GutDecisionPlanner thread={thread} snapshot={sourcedSnapshot} observations={observations} busy={busy} onSave={async (decision) => !!await savePatch({ decision })} onSymptomChange={async (newSymptom) => !!await savePatch({ symptom: newSymptom })} onOpenQuickMeal={onOpenQuickMeal} />}
      {view === 'answer' && thread.intent !== 'decide' && <div className="gr-answer-layout"><section className="gr-answer-main">
        {thread.intent === 'now' && <div className="gr-care-notice"><HeartHandshake size={20} /><div><strong>If you feel unwell now</strong><p>This workspace cannot assess urgency or diagnose a new symptom. For severe, sudden, worsening or otherwise concerning symptoms, seek medical care. You can use your records to explain what happened.</p></div></div>}
        {thread.intent === 'care' && <div className="gr-care-notice"><FileText size={20} /><div><strong>Bring a focused question to your clinician</strong><p>Medication schedules and personal notes are not verified care instructions. This brief keeps your reports separate from possible explanations.</p></div></div>}
        <div className="gr-answer-card"><div className="gr-card-label"><Sparkles size={16} /> WHAT YOUR RECORDS CAN SAY</div><p>{thread.focus ? evidence?.answer : thread.intent === 'now' ? snapshot.todayDay ? `Today’s recorded digestion includes ${snapshot.todayDay.bloating === null ? 'no bloating rating' : `bloating ${snapshot.todayDay.bloating}/10`} and ${snapshot.todayDay.discomfort === null ? 'no discomfort rating' : `discomfort ${snapshot.todayDay.discomfort}/10`}. This describes a report, not its cause or urgency.` : 'No digestion observation is saved for today. Your question is saved; you can describe this episode to a clinician without completing a daily checklist.' : thread.intent === 'care' ? `Your question is saved with ${snapshot.days.length} dated digestion record${snapshot.days.length === 1 ? '' : 's'} and ${snapshot.meals.length} meal${snapshot.meals.length === 1 ? '' : 's'} available for a visit brief. These records do not establish a diagnosis.` : 'Add a meal name or phrase from your records to compare explicit outcomes. You can also proceed with your question as it is.'}</p><span className="gr-caution">No diagnosis or food verdict is inferred from these records.</span></div>
        {thread.focus && <><div className="gr-three-way"><button type="button" onClick={() => setView('evidence')}><span className="gr-count">{evidence?.support}</span><strong>Reported with {symptomName(thread.symptom)}</strong><small>Explicitly linked user reports</small></button><button type="button" onClick={() => setView('evidence')}><span className="gr-count">{evidence?.tension}</span><strong>Reported without it</strong><small>Counterexamples stay visible</small></button><button type="button" onClick={() => setView('evidence')}><span className="gr-count">{evidence?.unknown}</span><strong>Unknown or conflicting</strong><small>Missing is not symptom-free</small></button></div><div className="gr-reason"><CircleHelp size={19} /><div><strong>What might change the answer?</strong><p>{evidence?.nextQuestion}</p>{evidence?.nextQuestionMealId && <button type="button" className="gr-link" onClick={() => { setFocusOccasionId(evidence.nextQuestionMealId); setView('evidence'); }}>Review that occasion <ArrowRight size={14} /></button>}</div></div></>}
        <div className="gr-answer-actions"><button type="button" className="gr-primary" onClick={() => thread.intent === 'now' ? onOpenHistory(snapshot.today) : thread.intent === 'care' ? void copyBrief() : setView(thread.focus ? 'evidence' : 'next')}>{thread.intent === 'now' ? 'Open today’s record' : thread.intent === 'care' ? 'Copy care question' : thread.focus ? 'Inspect the evidence' : 'Choose a next step'} <ArrowRight size={17} /></button><button type="button" className="gr-secondary" onClick={() => { setView('research'); if (researchStatus === 'idle') void loadResearch(); }}><BookOpen size={17} /> Explore research</button></div>
      </section><aside className="gr-answer-side"><h3>Question controls</h3><p>Compare a specific meal name across your saved records. Similar names can still represent different recipes.</p><label htmlFor="gr-focus-edit">Meal or phrase</label><div className="gr-side-edit"><input id="gr-focus-edit" value={focusDraft} onChange={(event) => setFocusDraft(event.target.value)} list="gr-thread-meals" maxLength={120} placeholder="e.g. chai" /><button type="button" onClick={() => void savePatch({ focus: focusDraft })} disabled={busy || focusDraft === thread.focus}>Apply</button></div><datalist id="gr-thread-meals">{mealNames.map((name) => <option key={name} value={name} />)}</datalist><label htmlFor="gr-symptom-edit">Compare outcome</label><select id="gr-symptom-edit" value={thread.symptom} onChange={(event) => void savePatch({ symptom: event.target.value as GutSymptom })}>{symptoms.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><div className="gr-side-divider" /><button type="button" className="gr-link" onClick={() => onOpenHistory()}><Activity size={16} /> Open recorded history</button><button type="button" className="gr-link" onClick={() => void copyBrief()}><Clipboard size={16} /> Copy question brief</button></aside></div>}
      {view === 'evidence' && <div className="gr-evidence-view"><div className="gr-section-intro"><div><h3>Evidence hearing</h3><p>Only symptom-specific user reports linked to a saved meal go in “with” or “without.” Disagreeing reports remain unresolved. Same-day ratings and free-text notes provide context, not meal causation.</p></div><span>{evidence?.occasions.length || 0} matching occasions</span></div>
        {trial && <div className="gr-trial-context"><div><strong>Separate Clinical Elimination Suite record</strong><p>A {trial.status} trial has {trial.checkins} check-in{trial.checkins === 1 ? '' : 's'}. They are available in the Suite and are not counted as meal-linked answers here.</p><small>Trial source · {trial.id}</small></div>{onOpenElimination && <button type="button" className="gr-secondary" onClick={onOpenElimination}>Open Suite <ArrowRight size={15} /></button>}</div>}
        {!comparisonFocus ? <div className="gr-empty"><Search size={25} /><strong>{thread.intent === 'decide' ? 'Choose a saved meal name on My choice' : 'Choose a meal or phrase on My answer'}</strong><p>We will only match saved meal names. No ingredients or symptoms are guessed from the name.</p></div> : evidence?.occasions.length === 0 ? <div className="gr-empty"><Utensils size={25} /><strong>No matching saved meals</strong><p>Your question remains available. You can search another phrase, record a meal, or go straight to research or a care question.</p><button type="button" className="gr-secondary" onClick={onOpenQuickMeal}>Record a meal</button></div> : <>
          <div className="gr-map" role="img" aria-label={`${evidence?.support} explicit symptom reports, ${evidence?.tension} explicit reports without symptoms, ${evidence?.unknown} unknown or conflicting outcomes for ${comparisonFocus}`}><div className="gr-map-center">{comparisonFocus}<small>{thread.intent === 'decide' ? 'exact saved meal name' : 'saved meal name match'}</small></div><div className="gr-map-branches"><div><b>{evidence?.support}</b><span>with {symptomName(thread.symptom)}</span></div><div><b>{evidence?.tension}</b><span>without it</span></div><div><b>{evidence?.unknown}</b><span>unknown or disputed</span></div></div></div>
          <div className="gr-occasion-list">{evidence?.occasions.map((item) => <article className="gr-occasion" id={`gr-occasion-${item.meal.id}`} tabIndex={-1} key={item.meal.id}><div className="gr-occasion-heading"><div><span className={`gr-status gr-status-${item.answerOrigin === 'conflict' ? 'conflict' : item.answer}`}>{item.answerOrigin === 'conflict' ? 'Reports disagree' : item.answer === 'yes' ? `${symptomName(thread.symptom)} reported` : item.answer === 'no' ? `No ${symptomName(thread.symptom)} reported` : 'Outcome unknown'}</span><h4>{item.meal.name}</h4><small>{item.meal.date}{item.meal.time ? ` · ${item.meal.time}` : ' · exact time unavailable'}</small></div><button type="button" className="gr-source" onClick={() => onOpenHistory(item.meal.date)}>Open date <ChevronRight size={15} /></button></div>
            {item.meal.reaction && item.answerOrigin !== 'meal_reaction' && <p className="gr-source-note"><strong>{item.meal.reactionType ? 'Diet reaction selection:' : 'Existing meal note:'}</strong> {item.meal.reaction}{!item.meal.reactionType && <em> (not classified automatically)</em>}</p>}
            {item.answerOrigin === 'meal_reaction' && <p className="gr-source-note"><strong>{item.edge.inclusionRule === 'unstable_legacy_meal_id' ? 'Diet report, not counted:' : 'Counted from Diet:'}</strong> This meal's explicit “{item.meal.reaction}” reaction selection. A chosen reaction is a user report, not proof the meal caused it.</p>}
            {item.answerOrigin === 'conflict' && <p className="gr-source-note gr-conflict-note"><strong>Two user reports disagree:</strong> Diet's meal reaction and the linked Gut report differ for this symptom. This occasion is counted as unresolved. {onOpenDiet && <button type="button" className="gr-link" onClick={onOpenDiet}>Open Diet to review <ArrowRight size={14} /></button>}</p>}
            {item.sameDay && <p className="gr-source-note"><strong>Same-date digestion record:</strong> bloating {item.sameDay.bloating === null ? 'not rated' : `${item.sameDay.bloating}/10`}; discomfort {item.sameDay.discomfort === null ? 'not rated' : `${item.sameDay.discomfort}/10`}. Same date does not establish which came first.</p>}
            {item.otherMeals.length > 0 && <p className="gr-source-note"><strong>Other meals recorded that date:</strong> {item.otherMeals.slice(0, 3).map((meal) => meal.name).join(', ')}{item.otherMeals.length > 3 ? `, and ${item.otherMeals.length - 3} more in the source details` : ''}.</p>}
            {item.alternativeContext.some((context) => context.kind === 'recorded_context_same_date') && <p className="gr-source-note"><strong>Other saved context that date:</strong> {item.alternativeContext.filter((context) => context.kind === 'recorded_context_same_date').map((context) => context.contextType === 'medication' ? 'medication note' : context.contextType || 'other note').join(', ')}. This is date-matched context, not evidence of cause or of a medication dose taken.</p>}
            <div className="gr-occasion-actions"><span>{hasStableGutMealId(item.meal) ? 'If you remember this occasion:' : 'This older meal has no stable source ID, so a report cannot be linked to it.'}</span><button type="button" disabled={busy || !hasStableGutMealId(item.meal)} onClick={() => void record(item.meal, 'yes')}>Had {symptomName(thread.symptom)}</button><button type="button" disabled={busy || !hasStableGutMealId(item.meal)} onClick={() => void record(item.meal, 'no')}>Did not have it</button><button type="button" disabled={busy} onClick={() => void savePatch({ excludedMealIds: [...thread.excludedMealIds, item.meal.id] })}>Different meal</button></div>
            <details className="gr-source-details"><summary>Why this occasion appears</summary><p>The saved meal name matches “{comparisonFocus}”. That match does not verify ingredients, portion or recipe.</p><dl><div><dt>Meal source ID</dt><dd>{item.meal.id}</dd></div><div><dt>Meal date</dt><dd>{item.meal.date}{item.meal.time ? ` · saved time ${item.meal.time}` : ' · exact time unavailable'}</dd></div><div><dt>Diet reaction</dt><dd>{item.meal.reactionType ? `${item.meal.reaction || item.meal.reactionType}${item.meal.reactionRecordedAt ? ` · reported ${item.meal.reactionRecordedAt}` : ''}` : 'No structured Diet reaction'}</dd></div><div><dt>Gut report</dt><dd>{item.answerSource ? `${item.answerSource.payload.kind === 'daily_checkin' ? item.answerSource.payload.answers[thread.symptom] : 'unknown'} · ${item.answerSource.id} · revision ${item.answerSource.revision}` : 'No explicit Gut report linked to this meal'}</dd></div><div><dt>Counting rule</dt><dd>{item.edge.inclusionRule === 'unstable_legacy_meal_id' ? 'This older meal has no stable source ID, so its report is not counted.' : item.answerOrigin === 'conflict' ? 'Disagreeing user reports remain unresolved until a source is corrected.' : item.answerOrigin === 'meal_reaction' ? 'Only a symptom-specific Diet reaction is counted. Broad “No reaction” selections remain unknown.' : item.answerSource ? 'Explicit user report linked by meal ID and date. Date-only precision does not establish when the symptom began.' : 'Unknown outcome. A same-date symptom rating is shown as context only.'}</dd></div></dl>
            <p><strong>Source trail:</strong> {item.edge.mealSource.timePrecision === 'exact' ? 'Meal time saved' : 'Meal date only'} · {item.edge.answerSources.length ? item.edge.answerSources.map((source) => `${source.kind === 'gut_report' ? 'Gut report' : 'Diet reaction'} ${source.id}${source.revision === null ? '' : ` revision ${source.revision}`} (${source.timePrecision.replace('_', ' ')})`).join(' · ') : 'No symptom-specific answer source'}{item.edge.inclusionRule === 'unstable_legacy_meal_id' ? ' · Older meal ID may change when records reorder, so its answer stays unknown.' : ''}</p>
            {item.alternativeContext.length > 0 && <><strong>Same-date context, outside the symptom count</strong><ul>{item.alternativeContext.map((context) => <li key={`${context.kind}:${context.sourceId}`}>{context.kind === 'other_meal_same_date' ? 'Other meal' : `${context.contextType || 'Other'} note`}: {context.label} · source {context.sourceId}{context.revision === null ? '' : ` · revision ${context.revision}`} · {context.timePrecision.replace('_', ' ')} timing</li>)}</ul><p>Same date does not establish order or cause. A medication note does not confirm a dose was taken.</p></>}</details>
          </article>)}</div>
          {thread.excludedMealIds.length > 0 && <div className="gr-excluded"><strong>Kept separate</strong>{thread.excludedMealIds.map((mealId) => <button type="button" key={mealId} onClick={() => void savePatch({ excludedMealIds: thread.excludedMealIds.filter((id) => id !== mealId) })}>Restore {sourcedSnapshot.meals.find((meal) => meal.id === mealId)?.name || 'meal'} <RotateCcw size={15} /></button>)}</div>}
        </>}
      </div>}
      {view === 'research' && <div className="gr-research-view"><div className="gr-section-intro"><div><h3>Research lens</h3><p>General research about {symptomName(thread.symptom)}. Choose a topic yourself; no meal name, question or personal record is sent. The narrow search keeps papers whose titles name the symptom and topic, so it can miss relevant work.</p></div></div><div className="gr-research-topics" role="group" aria-label="Research topic">{(Object.entries(gutResearchTopics) as [GutResearchTopic, { label: string; query: string }][]).map(([id, item]) => <button type="button" key={id} aria-pressed={researchTopic === id} onClick={() => { setResearchTopic(id); void loadResearch(id); }} disabled={researchStatus === 'loading'}>{item.label}</button>)}</div><div className="gr-research-warning"><ShieldCheck size={19} /> A paper cannot prove your personal cause. Publication type is not a quality grade; population, methods and applicability need review. Discuss restrictive diets with a clinician or dietitian before trying them.</div>
        {researchStatus === 'idle' && <button type="button" className="gr-primary" onClick={() => void loadResearch()}>Find relevant papers <Search size={17} /></button>}
        {researchStatus === 'loading' && <p role="status" className="gr-loading">Searching Europe PMC for general research…</p>}
        {researchStatus === 'error' && <div className="gr-empty"><BookOpen size={24} /><strong>Research is temporarily unavailable</strong><p>Your personal evidence remains accessible. Try again later or use your question brief.</p><button type="button" className="gr-secondary" onClick={() => void loadResearch()}>Retry</button></div>}
        {researchStatus === 'ready' && (research.length ? <div className="gr-paper-list">{research.map((paper) => <article key={paper.id} className="gr-paper"><span className="gr-paper-type">PUBMED · PMID {paper.id}</span><h4>{paper.title}</h4>{paper.publicationTypes.length > 0 && <div className="gr-paper-tags">{paper.publicationTypes.map((type) => <span key={type}>{type}</span>)}</div>}{paper.correctionNotice && <p className="gr-paper-correction">Publication notice: {paper.correctionNotice}. Check the original record before relying on it.</p>}<p>{paper.abstract ? `${paper.abstract.slice(0, 430)}${paper.abstract.length > 430 ? '…' : ''}` : 'Abstract unavailable.'}</p><div className="gr-paper-foot"><span>{paper.journal || 'Journal unverified'}{paper.year ? ` · ${paper.year}` : ' · Year unverified'}</span><a href={paper.url} target="_blank" rel="noopener noreferrer">Open original <ArrowRight size={15} /></a></div><small>Abstract excerpt only · population and applicability require review · checked {new Date(paper.retrievedAt).toLocaleDateString()}</small></article>)}</div> : <div className="gr-empty"><BookOpen size={24} /><strong>No title-matched abstracts found</strong><p>This narrow search does not mean the topic has no research. Try a broader topic or discuss the question with a clinician.</p></div>)}
      </div>}
      {view === 'next' && <div className="gr-next-view"><div className="gr-section-intro"><div><h3>Close the loop</h3><p>A useful outcome may be a choice, a clinician question, or deciding to leave this unresolved.</p></div></div><div className="gr-next-grid"><section><div className="gr-card-label"><Compass size={16} /> MY NEXT STEP</div><p className="gr-soft">Choose one or write your own. The app is not prescribing a diet, challenge or medicine change.</p><div className="gr-step-choices">{['Leave this question open without tracking', 'Discuss this uncertainty with a clinician', 'Notice what happens on an ordinary future occasion'].map((choice) => <button type="button" key={choice} className={stepDraft === choice ? 'gr-choice-active' : ''} onClick={() => setStepDraft(choice)}>{choice}{stepDraft === choice && <Check size={16} />}</button>)}</div><label htmlFor="gr-step-custom">Or write your next step</label><textarea id="gr-step-custom" value={stepDraft} onChange={(event) => setStepDraft(event.target.value)} maxLength={300} rows={2} placeholder="What would actually help you?" /><button type="button" className="gr-primary" disabled={busy || stepDraft === (thread.selectedStep || '')} onClick={() => void savePatch({ selectedStep: stepDraft })}>Save my step</button></section><section><div className="gr-card-label"><RotateCcw size={16} /> AFTERWARD, IF YOU WANT</div><p className="gr-soft">What happened or what did you decide? Skip this if it adds no value.</p><label htmlFor="gr-reflection">Your own words</label><textarea id="gr-reflection" value={reflectionDraft} onChange={(event) => setReflectionDraft(event.target.value)} maxLength={1000} rows={5} placeholder="I asked my clinician… / I chose to leave it alone…" /><button type="button" className="gr-secondary" disabled={busy || reflectionDraft === (thread.reflection || '')} onClick={() => void savePatch({ reflection: reflectionDraft })}>Save outcome</button></section></div><div className="gr-next-footer"><button type="button" className="gr-secondary" onClick={() => void copyBrief()}><Clipboard size={16} /> Copy question brief</button>{onOpenConsult && <button type="button" className="gr-secondary" onClick={onOpenConsult}>Open consultation <ArrowRight size={16} /></button>}<button type="button" className="gr-link" disabled={busy} onClick={() => void savePatch({ status: thread.status === 'open' ? 'closed' : 'open' })}>{thread.status === 'open' ? 'Close this question' : 'Reopen question'}</button><button type="button" className="gr-link" disabled={busy || !evidence} onClick={() => void savePatch({ reviewedEvidence: makeGutReviewSnapshot({ ...thread, focus: comparisonFocus }, evidence!) })}>Mark evidence reviewed</button></div></div>}
      {((view === 'next') || (view === 'answer' && thread.intent === 'care')) && onOpenCasePrep && onOpenCases && <GutCaseHandoff key={thread.id} thread={thread} onOpenCasePrep={onOpenCasePrep} onOpenCases={onOpenCases} />}
      {message && <p className="gr-message" role="status">{message}</p>}
    </>}
  </div>;
};
