import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, Clipboard, Compass, FileText, GitBranch, HeartHandshake, Plus, RotateCcw, Search, ShieldCheck, Sparkles, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatGutVisitNote, getGutSnapshot, type GutMeal } from '../../services/GutHealthSummary';
import { listObservations, loadObservationsFromCloud } from '../../services/HealthObservationService';
import { getActiveTrialV2, getHealthEvents } from '../../services/TrialWorkflowService';
import type { Observation } from '../../domain/observations/types';
import {
  classifyGutAnswerState,
  createGutThread,
  deriveGutBacktraceProjection,
  deriveGutChangeReceipt,
  deriveGutEvidence,
  hasStableGutMealId,
  listGutThreads,
  makeGutReviewSnapshot,
  recordGutMealOutcome,
  resolveDeterministicGutIntent,
  saveGutMealPreparation,
  updateGutThread,
  type GutIntent,
  type GutQuestionThread,
  type GutSymptom
} from '../../services/GutResolutionService';
import { gutGeneralGuidance, gutResearchTopics, searchGutResearch, type GutResearchPaper, type GutResearchTopic } from '../../services/GutResearchService';
import { GutDecisionPlanner } from './GutDecisionPlanner';
import { GutCaseHandoff } from './GutCaseHandoff';
import { GutBacktraceTimeline } from './GutBacktraceTimeline';
import { GutConnectionTrail } from './GutConnectionTrail';
import type { GutSourceReference } from './GutSourceRecord';
import { GutPreparationNote } from './GutPreparationNote';
import { getProfileEngineState } from '../../services/ProfileEngine';
import { getAccountScope } from '../../services/RunContext';
import './GutResolutionWorkspace.css';

const draftKey = () => `hc_gut_question_draft:${getAccountScope()}:${getProfileEngineState()?.activeId || 'profile_1'}`;
interface Props {
  onOpenHistory: (date?: string) => void;
  onOpenSource: (source: GutSourceReference) => void;
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
const intentGuidance: Record<GutIntent, { heading: string; help: string; placeholder: string; examples: string[] }> = {
  now: {
    heading: 'What is happening right now?',
    help: 'Describe what you feel and when it began. We will organize your report and show a useful care next step.',
    placeholder: 'For example, my stomach hurts after lunch today',
    examples: ['I have stomach pain after lunch today', 'I feel nauseous and want to organize what happened'],
  },
  decide: {
    heading: 'What decision is coming up?',
    help: 'Name the choice in your own words. You can compare options after opening your question.',
    placeholder: 'For example, should I choose tea or coffee tomorrow?',
    examples: ['Should I choose tea or coffee tomorrow?', 'How can I plan for a restaurant meal?'],
  },
  understand: {
    heading: 'What pattern are you curious about?',
    help: 'Ask about one possible connection. We will show what your records support and what remains unknown.',
    placeholder: 'For example, is chai linked to my bloating?',
    examples: ['Is chai linked to my bloating?', 'What pattern should I check after dinner?'],
  },
  care: {
    heading: 'What would you like to discuss at a visit?',
    help: 'Capture the question you want help explaining to a clinician. Your source records stay attached.',
    placeholder: 'For example, how do I describe recurring bloating at my visit?',
    examples: ['How do I describe my digestion at a visit?', 'What should I ask about recurring bloating?'],
  },
};
const symptoms: Array<{ id: GutSymptom; label: string }> = [
  { id: 'unspecified', label: 'Not selected' },
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

export const GutResolutionWorkspace: React.FC<Props> = ({ onOpenHistory, onOpenSource, onOpenQuickMeal, onOpenConsult, onOpenElimination, onOpenDiet, onOpenCasePrep, onOpenCases }) => {
  const [snapshot, setSnapshot] = useState(() => getGutSnapshot());
  const [observations, setObservations] = useState<Observation[]>([]);
  const [threads, setThreads] = useState<GutQuestionThread[]>(() => listGutThreads());
  const [activeId, setActiveId] = useState<string | null>(null);
  const draftScope = useRef(draftKey());
  const [question, setQuestion] = useState(() => {
    try {
      sessionStorage.removeItem('hc_gut_question_draft');
      return sessionStorage.getItem(draftKey()) || '';
    } catch {
      return '';
    }
  });
  const [selectedIntent, setSelectedIntent] = useState<GutIntent | null>(null);
  const [mealPhrase, setMealPhrase] = useState('');
  const [selectedSymptom, setSelectedSymptom] = useState<GutSymptom>('unspecified');
  const startFormRef = useRef<HTMLElement>(null);
  const questionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedIntent || activeId) return;
    const frame = requestAnimationFrame(() => {
      startFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      questionRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedIntent, activeId]);

  const handleQuestionChange = (val: string) => {
    setQuestion(val);
    try {
      sessionStorage.setItem(draftKey(), val);
    } catch {
      /* ignore storage quota/security issues */
    }
  };

  const [focusDraft, setFocusDraft] = useState('');
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
      occurredAt: item.timePrecision === 'exact' || item.timePrecision === 'approximate' ? item.occurredAt : null,
      timePrecision: item.timePrecision,
      reaction: null,
    }));
    return { ...snapshot, meals: [...snapshot.meals, ...canonicalMeals].sort((a, b) => b.date.localeCompare(a.date)) };
  }, [snapshot, observations]);

  const refresh = useCallback(async () => {
    const currentDraftScope = draftKey();
    if (draftScope.current !== currentDraftScope) {
      draftScope.current = currentDraftScope;
      setActiveId(null);
      try { setQuestion(sessionStorage.getItem(currentDraftScope) || ''); }
      catch { setQuestion(''); }
    }
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

  const backtraceProjection = useMemo(() => {
    if (!thread) return null;
    const anchorTimestamp = thread.createdAt;
    return deriveGutBacktraceProjection(
      { type: 'question_time', timestamp: anchorTimestamp, symptom: thread.symptom, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      sourcedSnapshot,
      observations
    );
  }, [thread, sourcedSnapshot, observations]);

  const answerState = useMemo(() => {
    if (!thread) return 'no_records';
    return classifyGutAnswerState(evidence, thread);
  }, [evidence, thread]);

  const openThreads = threads.filter((item) => item.status === 'open');
  const evidenceMapBranches = evidence ? ([
    { category: 'support', count: evidence.support, label: `with ${symptomName(thread!.symptom)}` },
    { category: 'counterexample', count: evidence.tension, label: 'without it' },
    { category: 'unknown', count: evidence.unknown, label: 'unknown or disputed' },
  ] as const).map((branch) => ({
    ...branch,
    firstSourceId: evidence.occasions.find((occasion) => occasion.edge.category === branch.category)?.meal.id,
  })) : [];

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

  const startWithQuery = async (customQuery?: string, forceIntent?: GutIntent) => {
    const raw = customQuery ?? question;
    const queryText = (raw || '').trim();
    if (!queryText || busy) return;

    setBusy(true);
    const resolution = resolveDeterministicGutIntent(queryText);
    const chosenIntent = forceIntent || selectedIntent || resolution.intent;
    const chosenFocus = mealPhrase.trim() || resolution.inferredFocus;
    const chosenSymptom = selectedSymptom !== 'unspecified' ? selectedSymptom : resolution.inferredSymptom;

    const created = await createGutThread({
      intent: chosenIntent,
      question: queryText,
      focus: chosenFocus,
      symptom: chosenSymptom,
    });
    setBusy(false);

    if (!created) {
      setMessage('Could not save your question. Please try again.');
      return;
    }

    if (chosenIntent === 'decide' && resolution.options) {
      await updateGutThread(created.id, {
        decision: {
          priority: '',
          options: {
            a: { label: resolution.options.a, mealName: resolution.options.a },
            b: { label: resolution.options.b, mealName: resolution.options.b },
          },
          chosen: null,
          chosenAt: null,
          outcome: null,
          outcomeAt: null,
        },
      });
    }

    handleQuestionChange('');
    setSelectedIntent(null);
    setMealPhrase('');
    setSelectedSymptom('unspecified');
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
    if (thread.symptom === 'unspecified') { setMessage('Choose a symptom to search general research. Your question stays saved.'); return; }
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
      <div className="gr-eyebrow"><span className="gr-eyebrow-dot" /> CLINICAL RESOLUTION STUDIO <span className="gr-eyebrow-note">Your evidence, in context</span></div>
      <h2 className="gr-title">What would you like help figuring out?</h2>
      <p className="gr-subtitle">Start with a single question that matters today. We will connect what your records actually show, surface what is still uncertain, and suggest one inspectable next step.</p>

      {openThreads.length > 0 && <section className="gr-continue">
        <div className="gr-small-icon"><RotateCcw size={19} /></div>
        <div className="gr-continue-text"><span>Continue where you left off</span><strong>{openThreads[0].question}</strong></div>
        <button type="button" className="gr-quiet-button" onClick={() => openThread(openThreads[0])}>Continue <ArrowRight size={16} /></button>
      </section>}
      {openThreads.length > 1 && <details className="gr-other-questions"><summary>{openThreads.length - 1} other open question{openThreads.length === 2 ? '' : 's'}</summary><div>{openThreads.slice(1).map((item) => <button type="button" key={item.id} onClick={() => openThread(item)}><span>{item.question}</span><ArrowRight size={15} /></button>)}</div></details>}

      <div className="gr-onboarding-step">STEP 1 OF 2 <span>Choose how we can help</span></div>
      <section className="gr-intent-grid" aria-label="Choose what you need help with">
        {intents.map(({ id, title, desc, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={`gr-intent${selectedIntent === id ? ' gr-intent-active' : ''}`}
            aria-pressed={selectedIntent === id}
            onClick={() => setSelectedIntent(id)}
          >
            <span className={`gr-icon gr-icon-${id}`} aria-hidden="true"><Icon size={21} /></span>
            <span><strong>{title}</strong><small>{desc}</small></span>
            <ChevronRight size={18} className="gr-intent-arrow" aria-hidden="true" />
          </button>
        ))}
      </section>

      <section className="gr-quick-record" aria-label="Optional meal record">
        <span className="gr-quick-record-icon" aria-hidden="true"><Utensils size={20} /></span>
        <div className="gr-quick-record-copy">
          <span className="gr-quick-record-kicker">OPTIONAL SOURCE RECORD</span>
          <strong>Have a meal worth remembering?</strong>
          <p>A saved meal can appear in a question’s evidence and record window. You can continue without logging one.</p>
          {snapshot.meals.length > 0 && <small>{snapshot.meals.length} meal{snapshot.meals.length === 1 ? '' : 's'} saved in this profile</small>}
        </div>
        <button type="button" onClick={onOpenQuickMeal}><Plus size={16} /> Record a meal <ArrowRight size={15} /></button>
      </section>

      {!selectedIntent && <p className="gr-path-hint">Choose a card to begin. One question is enough, and you can change paths at any time.</p>}
      {selectedIntent && <section ref={startFormRef} className="gr-start-form" aria-label={`${intents.find((item) => item.id === selectedIntent)?.title} question setup`}>
        <div className="gr-onboarding-step">STEP 2 OF 2 <span>{intents.find((item) => item.id === selectedIntent)?.title}</span></div>
        <h3 className="gr-path-heading">{intentGuidance[selectedIntent].heading}</h3>
        <p className="gr-path-help">{intentGuidance[selectedIntent].help}</p>
        <label htmlFor="gr-question">Your question or situation</label>
        <div className="gr-input-wrap">
          <Search size={20} />
          <input
            id="gr-question"
            ref={questionRef}
            value={question}
            maxLength={500}
            onChange={(event) => handleQuestionChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') void startWithQuery(); }}
            placeholder={intentGuidance[selectedIntent].placeholder}
          />
        </div>

        <details className="gr-optional-details">
          <summary>Add a meal or symptom from your records (optional)</summary>
        <div className="gr-form-row">
          <label htmlFor="gr-meal-phrase">Meal or phrase to examine <span>(optional)</span>
            <input
              id="gr-meal-phrase"
              list="gr-recorded-meals"
              value={mealPhrase}
              maxLength={120}
              onChange={(event) => setMealPhrase(event.target.value)}
              placeholder="Choose from records or type a phrase"
            />
            <datalist id="gr-recorded-meals">{Array.from(new Set(snapshot.meals.map((meal) => meal.name))).map((name) => <option key={name} value={name} />)}</datalist>
          </label>
          <label htmlFor="gr-symptom">Symptom <span>(optional)</span>
            <select id="gr-symptom" value={selectedSymptom} onChange={(event) => setSelectedSymptom(event.target.value as GutSymptom)}>
              {symptoms.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
        </div>
        </details>

        <details className="gr-example-disclosure">
          <summary>Need a starting point? See example questions</summary>
          <div className="gr-chips-row">
            {intentGuidance[selectedIntent].examples.map((prompt) => (
              <button
                type="button"
                key={prompt}
                className="gr-prompt-chip"
                onClick={() => {
                  handleQuestionChange(prompt);
                  document.getElementById('gr-question')?.focus();
                }}
              >
                <Sparkles size={12} style={{ color: '#AD234A' }} />
                {prompt}
              </button>
            ))}
          </div>
        </details>

        <div className="gr-start-actions">
          <button type="button" className="gr-primary" onClick={() => void startWithQuery()} disabled={!question.trim() || busy}>
            Open my question <ArrowRight size={17} />
          </button>
          <span>A question is enough. Meal and symptom details are optional.</span>
        </div>
      </section>}

      <div className="gr-home-bottom">
        <div><ShieldCheck size={17} /> Your records and general research stay visibly separate.</div>
        <button type="button" onClick={() => onOpenHistory()}><Activity size={16} /> Open history</button>
      </div>

      {threads.filter((item) => item.status === 'closed').length > 0 && <section className="gr-closed"><h3>Past questions</h3>{threads.filter((item) => item.status === 'closed').slice(0, 4).map((item) => <button type="button" key={item.id} onClick={() => openThread(item)}>{item.question}<ArrowRight size={15} /></button>)}</section>}
    </> : <>
      <div className="gr-thread-top"><button type="button" className="gr-back" onClick={() => { setActiveId(null); setMessage(''); }}><ArrowLeft size={17} /> All questions</button><span className="gr-thread-kind">{intents.find((item) => item.id === thread.intent)?.title}</span></div>
      <div className="gr-thread-heading"><div><div className="gr-eyebrow"><span className="gr-eyebrow-dot" /> QUESTION THREAD</div><h2 className="gr-title">{thread.question}</h2><p className="gr-subtitle">An answer you can inspect and change as your records change.</p></div><span className="gr-icon gr-icon-understand"><GitBranch size={24} /></span></div>
      {view !== 'answer' && <nav className="gr-tabs" aria-label="Question sections">{([['answer',thread.intent === 'decide' ? 'My choice' : 'My answer'],['evidence','Evidence'],['research','Research'],['next','Next step']] as const).map(([id, label]) => <button type="button" key={id} aria-current={view === id ? 'page' : undefined} className={view === id ? 'gr-tab-active' : ''} onClick={() => { setView(id); setMessage(''); }}>{label}</button>)}</nav>}
      {hasChanged && <div className="gr-change" role="status"><Sparkles size={19} /><div><strong>{thread.reviewedEvidence?.occasions ? 'Your records changed since this question was last reviewed.' : 'This question needs a fresh evidence review.'}</strong><span>Then: {changeReceipt?.previous.support} with, {changeReceipt?.previous.tension} without, {changeReceipt?.previous.unknown} unknown. Now: {changeReceipt?.current.support} with, {changeReceipt?.current.tension} without, {changeReceipt?.current.unknown} unknown.</span>{changeReceipt?.comparisonChanged && <span>The meal comparison or symptom changed.</span>}{changeReceipt && changeReceipt.changes.length > 0 && <ul>{changeReceipt.changes.slice(0, 3).map((change) => <li key={change.mealId}><strong>{change.label}:</strong> {change.detail}</li>)}{changeReceipt.changes.length > 3 && <li>{changeReceipt.changes.length - 3} more changed occasion(s) in Evidence.</li>}</ul>}{thread.reviewedEvidence?.occasions && changeReceipt?.changes.length === 0 && <span>A comparison detail changed; inspect the source records before relying on the earlier answer.</span>}<button type="button" className="gr-change-review" disabled={busy || !evidence} onClick={() => void savePatch({ reviewedEvidence: makeGutReviewSnapshot({ ...thread, focus: comparisonFocus }, evidence!) })}>I reviewed the current evidence</button></div></div>}
      {view === 'answer' && <GutConnectionTrail thread={thread} evidence={evidence} backtrace={backtraceProjection} meals={sourcedSnapshot.meals} dietMealIds={new Set(snapshot.meals.map((meal) => meal.id))} trial={trial} researchStatus={researchStatus} researchCount={research.length} onOpenEvidence={() => setView('evidence')} onChooseComparison={() => { const target = document.getElementById(thread.intent === 'decide' ? 'gr-meal-a' : 'gr-focus-edit'); target?.scrollIntoView({ block: 'center' }); target?.focus(); }} onOpenResearch={() => { setView('research'); if (researchStatus === 'idle') void loadResearch(); }} onOpenNext={() => setView('next')} onReviewMissing={(mealId) => { setFocusOccasionId(mealId); setView('evidence'); }} onOpenSource={onOpenSource} onOpenHistory={() => onOpenHistory()} onOpenTrial={onOpenElimination} onRecordMeal={onOpenQuickMeal} />}
      {view === 'answer' && thread.intent === 'decide' && <GutDecisionPlanner thread={thread} snapshot={sourcedSnapshot} observations={observations} busy={busy} onSave={async (decision) => !!await savePatch({ decision })} onSymptomChange={async (newSymptom) => !!await savePatch({ symptom: newSymptom })} onOpenQuickMeal={onOpenQuickMeal} />}
      {view === 'answer' && thread.intent !== 'decide' && <div className="gr-answer-layout"><section className="gr-answer-main">
        {thread.intent === 'now' && <div className="gr-care-notice"><HeartHandshake size={20} /><div><strong>If you feel unwell now</strong><p>This workspace cannot assess urgency or diagnose a new symptom. For severe, sudden, worsening or otherwise concerning symptoms, seek medical care. You can use your records to explain what happened.</p></div></div>}
        {thread.intent === 'care' && <div className="gr-care-notice"><FileText size={20} /><div><strong>Bring a focused question to your clinician</strong><p>Medication schedules and personal notes are not verified care instructions. This brief keeps your reports separate from possible explanations.</p></div></div>}
        <div className="gr-answer-card">
          <div className="gr-card-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><Sparkles size={16} /> WHAT YOUR RECORDS CAN SAY</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 750,
                padding: '2px 8px',
                borderRadius: '99px',
                background: '#FFF7F8',
                color: '#8D354B',
                border: '1px solid #F1E5E7',
              }}
            >
              {answerState === 'no_records' && 'No matching records'}
              {answerState === 'needs_symptom' && 'Symptom not selected'}
              {answerState === 'date_only' && 'Date-only precision (order unverified)'}
              {answerState === 'reliable_timed' && 'Timed meal reports'}
              {answerState === 'conflicts' && 'Conflicting source reports'}
              {answerState === 'single_confirmed' && 'One reported occasion'}
              {answerState === 'mixed_counterexample' && 'Mixed counterexamples'}
              {answerState === 'now_acute' && 'Current concern'}
            </span>
          </div>
          <p>{thread.focus ? evidence?.answer : thread.intent === 'now' ? snapshot.todayDay ? `Today’s recorded digestion includes ${snapshot.todayDay.bloating === null ? 'no bloating rating' : `bloating ${snapshot.todayDay.bloating}/10`} and ${snapshot.todayDay.discomfort === null ? 'no discomfort rating' : `discomfort ${snapshot.todayDay.discomfort}/10`}. This describes a report, not its cause or urgency.` : 'No digestion observation is saved for today. Your concern is saved; you can describe it to a clinician without completing a daily checklist.' : thread.intent === 'care' ? `Your question is saved with ${snapshot.days.length} dated digestion record${snapshot.days.length === 1 ? '' : 's'} and ${snapshot.meals.length} meal${snapshot.meals.length === 1 ? '' : 's'} available for a visit brief. These records do not establish a diagnosis.` : `Your question is saved. You have ${snapshot.meals.length} saved meal${snapshot.meals.length === 1 ? '' : 's'} and ${snapshot.days.length} dated digestion record${snapshot.days.length === 1 ? '' : 's'}. Without a selected symptom and explicit linked outcomes, these records cannot answer whether a meal is associated with it. You can inspect the dates, choose a comparison, or leave this open.`}</p>
          {thread.symptom === 'unspecified' && thread.intent === 'understand' && <label className="gr-optional-symptom">Which symptom would you like to compare? <span>(optional)</span><select value="unspecified" onChange={(event) => void savePatch({ symptom: event.target.value as GutSymptom })}><option value="unspecified">Leave unanswered for now</option>{symptoms.filter((item) => item.id !== 'unspecified').map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
          <span className="gr-caution">No diagnosis or food verdict is inferred from these records.</span>
        </div>

        {/* 48-Hour Backtrace Projection */}
        {backtraceProjection && (backtraceProjection.timedItems.length > 0 || backtraceProjection.dateOnlyItems.length > 0) && <details className="gr-backtrace-disclosure"><summary>{backtraceProjection.timedItems.length > 0 ? 'See the 48-hour record window' : 'See dated records near this question'}</summary><GutBacktraceTimeline projection={backtraceProjection} onOpenSource={onOpenSource} /></details>}

        {thread.focus && thread.symptom !== 'unspecified' && <><div className="gr-three-way"><button type="button" onClick={() => setView('evidence')}><span className="gr-count">{evidence?.support}</span><strong>Reported with {symptomName(thread.symptom)}</strong><small>Explicitly linked user reports</small></button><button type="button" onClick={() => setView('evidence')}><span className="gr-count">{evidence?.tension}</span><strong>Reported without it</strong><small>Counterexamples stay visible</small></button><button type="button" onClick={() => setView('evidence')}><span className="gr-count">{evidence?.unknown}</span><strong>Unknown or conflicting</strong><small>Missing is not symptom-free</small></button></div><div className="gr-reason"><CircleHelp size={19} /><div><strong>What might change the answer?</strong><p>{evidence?.nextQuestion}</p>{evidence?.nextQuestionMealId && <button type="button" className="gr-link" onClick={() => { setFocusOccasionId(evidence.nextQuestionMealId); setView('evidence'); }}>Review that occasion <ArrowRight size={14} /></button>}</div></div></>}
        <div className="gr-answer-actions"><button type="button" className="gr-primary" onClick={() => thread.intent === 'now' ? onOpenHistory(snapshot.today) : thread.intent === 'care' ? void copyBrief() : setView(thread.focus ? 'evidence' : 'next')}>{thread.intent === 'now' ? 'Open today’s record' : thread.intent === 'care' ? 'Copy care question' : thread.focus ? 'Inspect the evidence' : 'Choose a next step'} <ArrowRight size={17} /></button><button type="button" className="gr-secondary" onClick={() => { setView('research'); if (researchStatus === 'idle') void loadResearch(); }}><BookOpen size={17} /> Explore research</button></div>
      </section><aside className="gr-answer-side"><h3>Question controls</h3><p>Compare a specific meal name across your saved records. Similar names can still represent different recipes.</p><label htmlFor="gr-focus-edit">Meal or phrase</label><div className="gr-side-edit"><input id="gr-focus-edit" value={focusDraft} onChange={(event) => setFocusDraft(event.target.value)} list="gr-thread-meals" maxLength={120} placeholder="e.g. chai" /><button type="button" onClick={() => void savePatch({ focus: focusDraft })} disabled={busy || focusDraft === thread.focus}>Apply</button></div><datalist id="gr-thread-meals">{mealNames.map((name) => <option key={name} value={name} />)}</datalist><label htmlFor="gr-symptom-edit">Compare outcome</label><select id="gr-symptom-edit" value={thread.symptom} onChange={(event) => void savePatch({ symptom: event.target.value as GutSymptom })}>{symptoms.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><div className="gr-side-divider" /><button type="button" className="gr-link" onClick={() => onOpenHistory()}><Activity size={16} /> Open recorded history</button><button type="button" className="gr-link" onClick={() => void copyBrief()}><Clipboard size={16} /> Copy question brief</button></aside></div>}
      {view === 'evidence' && <div className="gr-evidence-view"><div className="gr-section-intro"><div><h3>Evidence hearing</h3><p>Only symptom-specific user reports linked to a saved meal go in “with” or “without.” Disagreeing reports remain unresolved. Same-day ratings and free-text notes provide context, not meal causation.</p></div><span>{evidence?.occasions.length || 0} matching occasions</span></div>
        {trial && <div className="gr-trial-context"><div><strong>Separate Clinical Elimination Suite record</strong><p>A {trial.status} trial has {trial.checkins} check-in{trial.checkins === 1 ? '' : 's'}. They are available in the Suite and are not counted as meal-linked answers here.</p><small>Trial source · {trial.id}</small></div>{onOpenElimination && <button type="button" className="gr-secondary" onClick={onOpenElimination}>Open Suite <ArrowRight size={15} /></button>}</div>}
        {!comparisonFocus ? <div className="gr-empty"><Search size={25} /><strong>{thread.intent === 'decide' ? 'Choose a saved meal name on My choice' : 'Choose a meal or phrase on My answer'}</strong><p>We will only match saved meal names. No ingredients or symptoms are guessed from the name.</p></div> : evidence?.occasions.length === 0 ? <div className="gr-empty"><Utensils size={25} /><strong>No matching saved meals</strong><p>Your question remains available. You can search another phrase, record a meal, or go straight to research or a care question.</p><button type="button" className="gr-secondary" onClick={onOpenQuickMeal}>Record a meal</button></div> : <>
          <section className="gr-map" aria-label={`Source map for ${comparisonFocus}`}><div className="gr-map-center">{comparisonFocus}<small>{thread.intent === 'decide' ? 'exact saved meal name' : 'saved meal name match'}</small></div><div className="gr-map-branches">{evidenceMapBranches.map((branch) => <button type="button" key={branch.category} disabled={!branch.firstSourceId} onClick={() => setFocusOccasionId(branch.firstSourceId || null)} aria-label={`${branch.count} ${branch.label} report${branch.count === 1 ? '' : 's'}. ${branch.firstSourceId ? 'Open the first source.' : 'No source in this group.'}`}><b>{branch.count}</b><span>{branch.label}</span><small>{branch.firstSourceId ? 'Open source' : 'No source yet'}</small></button>)}</div><p className="gr-map-explain">Branches group saved meal occasions by explicit symptom report. Select a branch to inspect its first source and counting rule. More occasions follow below. These connections do not establish a cause.</p></section>
          {evidence && evidence.bundle.nameVariants.length > 1 && <section className="gr-variants" aria-label="Saved meal name variants"><strong>{evidence.bundle.nameVariants.length} saved name or user-confirmed preparation groups match “{comparisonFocus}”</strong><p>Each group has its own reports. Unknown preparation remains unknown; no ingredient is inferred from a meal name.</p><div className="gr-variant-list">{evidence.bundle.nameVariants.slice(0, 3).map((variant) => <button type="button" key={variant.sourceIds[0]} onClick={() => setFocusOccasionId(variant.sourceIds[0])}><b>{variant.name}{variant.preparation ? ` · ${variant.preparation}` : ' · preparation unknown'}</b><span>{variant.support} with · {variant.counterexamples} without · {variant.unknown} unknown</span></button>)}</div>{evidence.bundle.nameVariants.length > 3 && <details><summary>Show {evidence.bundle.nameVariants.length - 3} more groups</summary><div className="gr-variant-list">{evidence.bundle.nameVariants.slice(3).map((variant) => <button type="button" key={variant.sourceIds[0]} onClick={() => setFocusOccasionId(variant.sourceIds[0])}><b>{variant.name}{variant.preparation ? ` · ${variant.preparation}` : ' · preparation unknown'}</b><span>{variant.support} with · {variant.counterexamples} without · {variant.unknown} unknown</span></button>)}</div></details>}</section>}
        <div className="gr-occasion-list">{evidence?.occasions.map((item) => <article className="gr-occasion" id={`gr-occasion-${item.meal.id}`} tabIndex={-1} key={item.meal.id}><div className="gr-occasion-heading"><div><span className={`gr-status gr-status-${item.answerOrigin === 'conflict' ? 'conflict' : item.answer}`}>{item.answerOrigin === 'conflict' ? 'Reports disagree' : item.answer === 'yes' ? `${symptomName(thread.symptom)} reported` : item.answer === 'no' ? `No ${symptomName(thread.symptom)} reported` : 'Outcome unknown'}</span><h4>{item.meal.name}</h4><small>{item.meal.date}{item.meal.time ? ` · ${item.meal.time}` : ' · exact time unavailable'}</small></div><button type="button" className="gr-source" onClick={() => onOpenSource({ sourceKind: 'diet_meal', sourceId: item.meal.id, localDate: item.meal.date })}>Open meal <ChevronRight size={15} /></button></div>
            {sourcedSnapshot.meals.filter((meal) => meal.name.trim().toLocaleLowerCase() === item.meal.name.trim().toLocaleLowerCase()).length > 1 && snapshot.meals.some((meal) => meal.id === item.meal.id) && <GutPreparationNote meal={item.meal} onSave={saveGutMealPreparation} />}
            {item.meal.reaction && item.answerOrigin !== 'meal_reaction' && <p className="gr-source-note"><strong>{item.meal.reactionType ? 'Diet reaction selection:' : 'Existing meal note:'}</strong> {item.meal.reaction}{!item.meal.reactionType && <em> (not classified automatically)</em>}</p>}
            {item.answerOrigin === 'meal_reaction' && <p className="gr-source-note"><strong>{item.edge.inclusionRule === 'unstable_legacy_meal_id' ? 'Diet report, not counted:' : 'Counted from Diet:'}</strong> This meal's explicit “{item.meal.reaction}” reaction selection. A chosen reaction is a user report, not proof the meal caused it.</p>}
            {item.answerOrigin === 'conflict' && <p className="gr-source-note gr-conflict-note"><strong>Two user reports disagree:</strong> Diet's meal reaction and the linked Gut report differ for this symptom. This occasion is counted as unresolved. {onOpenDiet && <button type="button" className="gr-link" onClick={onOpenDiet}>Open Diet to review <ArrowRight size={14} /></button>}</p>}
            {item.sameDay && <p className="gr-source-note"><strong>Same-date digestion record:</strong> bloating {item.sameDay.bloating === null ? 'not rated' : `${item.sameDay.bloating}/10`}; discomfort {item.sameDay.discomfort === null ? 'not rated' : `${item.sameDay.discomfort}/10`}. Same date does not establish which came first.</p>}
            {item.otherMeals.length > 0 && <p className="gr-source-note"><strong>Other meals recorded that date:</strong> {item.otherMeals.slice(0, 3).map((meal) => meal.name).join(', ')}{item.otherMeals.length > 3 ? `, and ${item.otherMeals.length - 3} more in the source details` : ''}.</p>}
            {item.alternativeContext.some((context) => context.kind === 'recorded_context_same_date') && <p className="gr-source-note"><strong>Other saved context that date:</strong> {item.alternativeContext.filter((context) => context.kind === 'recorded_context_same_date').map((context) => context.contextType === 'medication' ? 'medication note' : context.contextType || 'other note').join(', ')}. This is date-matched context, not evidence of cause or of a medication dose taken.</p>}
            <div className="gr-occasion-actions"><span>{hasStableGutMealId(item.meal) ? 'If you remember this occasion:' : 'This older meal has no stable source ID, so a report cannot be linked to it.'}</span><button type="button" disabled={busy || thread.symptom === 'unspecified' || !hasStableGutMealId(item.meal)} onClick={() => void record(item.meal, 'yes')}>Had {symptomName(thread.symptom)}</button><button type="button" disabled={busy || thread.symptom === 'unspecified' || !hasStableGutMealId(item.meal)} onClick={() => void record(item.meal, 'no')}>Did not have it</button><button type="button" disabled={busy} onClick={() => void savePatch({ excludedMealIds: [...thread.excludedMealIds, item.meal.id] })}>Different meal</button></div>
            <details className="gr-source-details"><summary>Why this occasion appears</summary><p>The saved meal name matches “{comparisonFocus}”. That match does not verify ingredients, portion or recipe.</p><dl><div><dt>Meal source ID</dt><dd>{item.meal.id}</dd></div><div><dt>Meal date</dt><dd>{item.meal.date}{item.meal.time ? ` · saved time ${item.meal.time}` : ' · exact time unavailable'}</dd></div><div><dt>Diet reaction</dt><dd>{item.meal.reactionType ? `${item.meal.reaction || item.meal.reactionType}${item.meal.reactionRecordedAt ? ` · reported ${item.meal.reactionRecordedAt}` : ''}` : 'No structured Diet reaction'}</dd></div><div><dt>Gut report</dt><dd>{item.answerSource ? `${item.answerSource.payload.kind === 'daily_checkin' ? item.answerSource.payload.answers[thread.symptom] : 'unknown'} · ${item.answerSource.id} · revision ${item.answerSource.revision}` : 'No explicit Gut report linked to this meal'}</dd></div><div><dt>Counting rule</dt><dd>{item.edge.inclusionRule === 'unstable_legacy_meal_id' ? 'This older meal has no stable source ID, so its report is not counted.' : item.answerOrigin === 'conflict' ? 'Disagreeing user reports remain unresolved until a source is corrected.' : item.answerOrigin === 'meal_reaction' ? 'Only a symptom-specific Diet reaction is counted. Broad “No reaction” selections remain unknown.' : item.answerSource ? 'Explicit user report linked by meal ID and date. Date-only precision does not establish when the symptom began.' : 'Unknown outcome. A same-date symptom rating is shown as context only.'}</dd></div></dl>
            <p><strong>Source trail:</strong> {item.edge.mealSource.timePrecision === 'exact' ? 'Meal time saved' : 'Meal date only'} · {item.edge.answerSources.length ? item.edge.answerSources.map((source) => `${source.kind === 'gut_report' ? 'Gut report' : 'Diet reaction'} ${source.id}${source.revision === null ? '' : ` revision ${source.revision}`} (${source.timePrecision.replace('_', ' ')})`).join(' · ') : 'No symptom-specific answer source'}{item.edge.inclusionRule === 'unstable_legacy_meal_id' ? ' · Older meal ID may change when records reorder, so its answer stays unknown.' : ''}</p>
            {item.alternativeContext.length > 0 && <><strong>Same-date context, outside the symptom count</strong><ul>{item.alternativeContext.map((context) => <li key={`${context.kind}:${context.sourceId}`}>{context.kind === 'other_meal_same_date' ? 'Other meal' : `${context.contextType || 'Other'} note`}: {context.label} · source {context.sourceId}{context.revision === null ? '' : ` · revision ${context.revision}`} · {context.timePrecision.replace('_', ' ')} timing</li>)}</ul><p>Same date does not establish order or cause. A medication note does not confirm a dose was taken.</p></>}</details>
          </article>)}</div>
          {thread.excludedMealIds.length > 0 && <div className="gr-excluded"><strong>Kept separate</strong>{thread.excludedMealIds.map((mealId) => <button type="button" key={mealId} onClick={() => void savePatch({ excludedMealIds: thread.excludedMealIds.filter((id) => id !== mealId) })}>Restore {sourcedSnapshot.meals.find((meal) => meal.id === mealId)?.name || 'meal'} <RotateCcw size={15} /></button>)}</div>}
        </>}
      </div>}
      {view === 'research' && <div className="gr-research-view"><div className="gr-section-intro"><div><h3>Research lens</h3><p>General research about {symptomName(thread.symptom)}. Choose a topic yourself; no meal name, question or personal record is sent. The narrow search keeps papers whose titles name the symptom and topic, so it can miss relevant work.</p></div></div><div className="gr-research-topics" role="group" aria-label="Research topic">{(Object.entries(gutResearchTopics) as [GutResearchTopic, { label: string; query: string }][]).map(([id, item]) => <button type="button" key={id} aria-pressed={researchTopic === id} onClick={() => { setResearchTopic(id); void loadResearch(id); }} disabled={researchStatus === 'loading'}>{item.label}</button>)}</div><div className="gr-research-warning"><ShieldCheck size={19} /> A paper cannot prove your personal cause. Publication type is not a quality grade; population, methods and applicability need review. Discuss restrictive diets with a clinician or dietitian before trying them.</div>
        {gutGeneralGuidance[thread.symptom] && <section className="gr-paper" aria-label="General guidance"><strong>Start with a source</strong><p>{gutGeneralGuidance[thread.symptom]?.summary}</p><a href={gutGeneralGuidance[thread.symptom]?.url} target="_blank" rel="noopener noreferrer">{gutGeneralGuidance[thread.symptom]?.title} <ArrowRight size={15} /></a><small>General information only · source page inspected September 2026 · independent clinical review pending</small></section>}
        {researchStatus === 'idle' && <button type="button" className="gr-primary" onClick={() => void loadResearch()}>Find relevant papers <Search size={17} /></button>}
        {researchStatus === 'loading' && <p role="status" className="gr-loading">Searching Europe PMC for general research…</p>}
        {researchStatus === 'error' && <div className="gr-empty"><BookOpen size={24} /><strong>Research is temporarily unavailable</strong><p>Your personal evidence remains accessible. Try again later or use your question brief.</p><button type="button" className="gr-secondary" onClick={() => void loadResearch()}>Retry</button></div>}
        {researchStatus === 'ready' && (research.length ? <div className="gr-paper-list">{research.map((paper) => <article key={paper.id} className="gr-paper">
          <span className="gr-paper-type">PUBMED · PMID {paper.id}</span><h4>{paper.title}</h4>
          {paper.publicationTypes.length > 0 && <div className="gr-paper-tags">{paper.publicationTypes.map((type) => <span key={type}>{type}</span>)}</div>}
          {paper.correctionNotice && <p className="gr-paper-correction">Publication notice: {paper.correctionNotice}. Check the original record before relying on it.</p>}
          <p>{paper.abstract ? `${paper.abstract.slice(0, 430)}${paper.abstract.length > 430 ? '…' : ''}` : 'Abstract unavailable.'}</p>
          <div className="gr-paper-appraisal"><strong>Source check</strong><p>{paper.titlePopulationCue ? `The title names ${paper.titlePopulationCue}. Check whether that population fits your question.` : 'The study population is not verified from the index metadata.'} The comparator and measured outcome require checking the original paper.</p><small>Publication type is an index label, not a quality grade. This paper cannot identify your personal trigger.</small></div>
          <div className="gr-paper-foot"><span>{paper.journal || 'Journal unverified'}{paper.publicationDate ? ` · ${paper.publicationDate} (${paper.publicationDateSource} date)` : paper.year ? ` · ${paper.year} (year only)` : ' · Publication date unverified'}</span><a href={paper.url} target="_blank" rel="noopener noreferrer">Open original <ArrowRight size={15} /></a></div>
          <small>Abstract excerpt only · metadata checked {new Date(paper.retrievedAt).toLocaleDateString()}</small>
        </article>)}</div> : <div className="gr-empty"><BookOpen size={24} /><strong>No title-matched abstracts found</strong><p>This narrow search does not mean the topic has no research. Try a broader topic or discuss the question with a clinician.</p></div>)}
      </div>}
      {view === 'next' && <div className="gr-next-view"><div className="gr-section-intro"><div><h3>Close the loop</h3><p>A useful outcome may be a choice, a clinician question, or deciding to leave this unresolved.</p></div></div><div className="gr-next-grid"><section><div className="gr-card-label"><Compass size={16} /> MY NEXT STEP</div><p className="gr-soft">Choose one or write your own. The app is not prescribing a diet, challenge or medicine change.</p><div className="gr-step-choices">{['Leave this question open without tracking', 'Discuss this uncertainty with a clinician', 'Notice what happens on an ordinary future occasion'].map((choice) => <button type="button" key={choice} className={stepDraft === choice ? 'gr-choice-active' : ''} onClick={() => setStepDraft(choice)}>{choice}{stepDraft === choice && <Check size={16} />}</button>)}</div><label htmlFor="gr-step-custom">Or write your next step</label><textarea id="gr-step-custom" value={stepDraft} onChange={(event) => setStepDraft(event.target.value)} maxLength={300} rows={2} placeholder="What would actually help you?" /><button type="button" className="gr-primary" disabled={busy || stepDraft === (thread.selectedStep || '')} onClick={() => void savePatch({ selectedStep: stepDraft })}>Save my step</button></section><section><div className="gr-card-label"><RotateCcw size={16} /> AFTERWARD, IF YOU WANT</div><p className="gr-soft">What happened or what did you decide? Skip this if it adds no value.</p><label htmlFor="gr-reflection">Your own words</label><textarea id="gr-reflection" value={reflectionDraft} onChange={(event) => setReflectionDraft(event.target.value)} maxLength={1000} rows={5} placeholder="I asked my clinician… / I chose to leave it alone…" /><button type="button" className="gr-secondary" disabled={busy || reflectionDraft === (thread.reflection || '')} onClick={() => void savePatch({ reflection: reflectionDraft })}>Save outcome</button></section></div><div className="gr-next-footer"><button type="button" className="gr-secondary" onClick={() => void copyBrief()}><Clipboard size={16} /> Copy question brief</button>{onOpenConsult && <button type="button" className="gr-secondary" onClick={onOpenConsult}>Open consultation <ArrowRight size={16} /></button>}<button type="button" className="gr-link" disabled={busy} onClick={() => void savePatch({ status: thread.status === 'open' ? 'closed' : 'open' })}>{thread.status === 'open' ? 'Close this question' : 'Reopen question'}</button><button type="button" className="gr-link" disabled={busy || !evidence} onClick={() => void savePatch({ reviewedEvidence: makeGutReviewSnapshot({ ...thread, focus: comparisonFocus }, evidence!) })}>Mark evidence reviewed</button></div></div>}
      {((view === 'next') || (view === 'answer' && thread.intent === 'care')) && onOpenCasePrep && onOpenCases && <GutCaseHandoff key={thread.id} thread={thread} onOpenCasePrep={onOpenCasePrep} onOpenCases={onOpenCases} />}
      {message && <p className="gr-message" role="status">{message}</p>}
    </>}
  </div>;
};
