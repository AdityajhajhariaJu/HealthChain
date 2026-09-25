import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Clipboard, Clock3, Coffee, Compass, FileText, GitBranch, HeartHandshake, Milk, Plus, RotateCcw, Search, ShieldCheck, Sparkles, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatGutVisitNote, getGutSnapshot, mergeGutSnapshotWithObservations } from '../../services/GutHealthSummary';
import { getObservationSyncInfo, listObservations, loadObservationsFromCloud, type ObservationSyncInfo } from '../../services/HealthObservationService';
import { getActiveTrialV2, getHealthEvents } from '../../services/TrialWorkflowService';
import type { Observation } from '../../domain/observations/types';
import type { GutMeal } from '../../services/GutHealthSummary';
import {
  classifyGutAnswerState,
  createGutThread,
  deriveGutBacktraceProjection,
  deriveGutChangeReceipt,
  deriveGutEvidence,
  GUT_CONCLUSION_VERSION,
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
import { compareGutPublicationStatus, formatGutResearchBrief, getGutPublicationStatus, gutGeneralGuidance, gutResearchTopics, searchGutResearch, type GutPublicationStatus, type GutResearchPaper, type GutResearchTopic } from '../../services/GutResearchService';
import { GutDecisionPlanner } from './GutDecisionPlanner';
import { GutCaseHandoff } from './GutCaseHandoff';
import { GutBacktraceTimeline } from './GutBacktraceTimeline';
import { GutConnectionTrail } from './GutConnectionTrail';
import { GutStudyBridge } from './GutStudyBridge';
import { GutTheoryDuel } from './GutTheoryDuel';
import { GutQuestionAtlas } from './GutQuestionAtlas';
import { makeGutResearchPassport } from '../../services/GutResearchDossierService';
import type { GutSourceReference } from './GutSourceRecord';
import { GutPreparationNote } from './GutPreparationNote';
import { GutConclusionCard } from './GutConclusionCard';
import { GutReviewedEvidencePanel } from './GutReviewedEvidencePanel';
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
const researchTopicIcons: Record<GutResearchTopic, LucideIcon> = { food: Utensils, caffeine: Coffee, dairy: Milk, meal_timing: Clock3 };
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
  const liveResolution = useMemo(() => resolveDeterministicGutIntent(question), [question]);
  const startFormRef = useRef<HTMLElement>(null);
  const questionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedIntent || activeId) return;
    const frame = requestAnimationFrame(() => {
      startFormRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
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
  const [onsetDraft, setOnsetDraft] = useState('');
  const [onsetPrecision, setOnsetPrecision] = useState<'exact' | 'approximate'>('approximate');
  const [view, setView] = useState<View>('answer');
  useEffect(() => { document.querySelector<HTMLElement>('.gr-modal-dialog main')?.scrollTo(0, 0); }, [activeId, view]);
  const [focusOccasionId, setFocusOccasionId] = useState<string | null>(null);
  const [research, setResearch] = useState<GutResearchPaper[]>([]);
  const [researchStatus, setResearchStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [researchTopic, setResearchTopic] = useState<GutResearchTopic | null>(null);
  const [researchChanges, setResearchChanges] = useState<ReturnType<typeof compareGutPublicationStatus>>([]);
  const [researchCheck, setResearchCheck] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const researchRequest = useRef(0);
  const [stepDraft, setStepDraft] = useState('');
  const [reflectionDraft, setReflectionDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [cloudNote, setCloudNote] = useState('');
  const [observationSync, setObservationSync] = useState<ObservationSyncInfo>({ state: 'unavailable', pendingCount: 0 });
  const [trial, setTrial] = useState(trialContext);
  const thread = threads.find((item) => item.id === activeId) || null;
  const ThreadIcon = intents.find((item) => item.id === thread?.intent)?.icon || GitBranch;
  const SelectedIntentIcon = intents.find((item) => item.id === selectedIntent)?.icon || Sparkles;

  const sourcedSnapshot = useMemo(() => mergeGutSnapshotWithObservations(snapshot, observations), [snapshot, observations]);

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
    setObservationSync(await getObservationSyncInfo());
  }, []);

  useEffect(() => {
    let active = true;
    let cloudRequest = 0;
    const loadCloudObservations = async () => {
      const request = ++cloudRequest;
      try {
        const result = await loadObservationsFromCloud();
        if (!active || request !== cloudRequest) return;
        if (result.status === 'unavailable') setCloudNote('Your account records could not be loaded from the cloud. New reports stay on this device until sync works.');
        else if (result.status === 'conflict') setCloudNote('Some account records differ from this device. Local edits were preserved; review sync before relying on a combined history.');
        else if (result.status === 'storage_failure') setCloudNote('Account records were found, but this device could not save them. Check available storage.');
        else setCloudNote('');
        await refresh();
      } catch {
        if (active && request === cloudRequest) setCloudNote('Your account records could not be loaded from the cloud. Local records remain available.');
      }
    };
    void refresh();
    void loadCloudObservations();
    const events = ['hc_profile_updated', 'hc_digestion_updated', 'hc_nutrition_reaction_updated', 'hc_observations_updated', 'hc_trial_v2_updated', 'hc_health_event_appended', 'hc_sync_pending', 'hc_sync_complete'];
    const handle = (event: Event) => {
      if (event.type === 'hc_profile_updated') {
        setCloudNote('');
        void loadCloudObservations();
      } else void refresh();
    };
    events.forEach((event) => window.addEventListener(event, handle));
    return () => { active = false; cloudRequest++; events.forEach((event) => window.removeEventListener(event, handle)); };
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
    const anchorTimestamp = thread.symptomOnset?.occurredAt || thread.createdAt;
    return deriveGutBacktraceProjection(
      { type: thread.symptomOnset ? 'symptom_onset' : 'question_time', timestamp: anchorTimestamp, symptom: thread.symptom, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      sourcedSnapshot,
      observations
    );
  }, [thread, sourcedSnapshot, observations]);

  const answerState = useMemo(() => {
    if (!thread) return 'no_records';
    return classifyGutAnswerState(evidence, thread);
  }, [evidence, thread]);
  const todayGutObservations = useMemo(() => sourcedSnapshot.observations.filter((item) => item.localDate === snapshot.today && item.payload.kind !== 'meal' && item.payload.kind !== 'context'), [sourcedSnapshot, snapshot.today]);

  const openThreads = threads.filter((item) => item.status === 'open');
  const observationSyncNote = cloudNote || (observations.length > 0 && observationSync.state === 'pending'
    ? `${observationSync.pendingCount} Gut observation${observationSync.pendingCount === 1 ? '' : 's'} still need account sync. This question currently includes the copy saved on this device.`
    : observations.length > 0 && observationSync.state === 'local_only'
      ? 'These Gut observations are stored on this device only and are not available to another signed-in device.'
      : observations.length > 0 && observationSync.state === 'unavailable'
        ? 'Gut observation sync could not be confirmed. Check account sync before relying on records from another device.'
        : observations.length > 0 && observationSync.state === 'no_pending'
          ? 'No unsent Gut observation changes are waiting on this device. This does not confirm that another device has refreshed.' : '');
  const conclusionState = hasChanged ? 'source_changed' : cloudNote ? 'account_sync_error' : answerState;
  const observationSyncBrief = observationSync.state === 'pending'
    ? `${observationSync.pendingCount} observation change${observationSync.pendingCount === 1 ? '' : 's'} are waiting to sync from this device.`
    : observationSync.state === 'local_only'
      ? 'Gut observations are stored on this device only.'
      : observationSync.state === 'unavailable'
        ? 'Gut observation sync could not be confirmed.'
        : 'No observation changes are waiting in this device’s sync queue; another device’s refresh is not confirmed.';


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
    setOnsetDraft(item.symptomOnset?.occurredAt ? new Date(item.symptomOnset.occurredAt).toLocaleString('sv-SE').slice(0, 16).replace(' ', 'T') : '');
    setOnsetPrecision(item.symptomOnset?.precision || 'approximate');
    setStepDraft(item.selectedStep || '');
    setReflectionDraft(item.reflection || '');
    setView('answer');
    setResearch([]);
    setResearchStatus('idle');
    setResearchChanges([]);
    setResearchCheck('idle');
    setResearchTopic(null);
    setMessage('');
  };

  const savePatch = async (patch: Parameters<typeof updateGutThread>[1]) => {
    if (!thread) return null;
    setBusy(true);
    const saved = await updateGutThread(thread.id, patch);
    setBusy(false);
    if (saved) { setThreads(listGutThreads()); if (patch.symptom && patch.symptom !== thread.symptom) { researchRequest.current++; setResearch([]); setResearchStatus('idle'); setResearchTopic(null); } }
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
    const chosenFocus = mealPhrase.trim();
    // Text parsing may suggest a label in the draft UI, but only user-confirmed
    // controls are persisted as structured symptom/meal fields.
    const chosenSymptom = selectedSymptom;

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

  const loadResearch = async (selectedTopic: GutResearchTopic | null = researchTopic) => {
    if (!thread || !selectedTopic || researchStatus === 'loading') return;
    if (thread.symptom === 'unspecified') { setMessage('Choose a symptom to search general research. Your question stays saved.'); return; }
    const request = ++researchRequest.current;
    setResearchStatus('loading'); setResearch([]);
    try {
      const papers = await searchGutResearch(thread.symptom, selectedTopic);
      if (request === researchRequest.current) { setResearch(papers); setResearchStatus('ready'); }
    } catch { if (request === researchRequest.current) setResearchStatus('error'); }
  };

  const checkSavedResearch = async () => {
    if (!thread?.reviewedResearch?.sources.length || researchCheck === 'loading') return;
    setResearchCheck('loading');
    try {
      const fresh = await Promise.all(thread.reviewedResearch.sources.map((source) => getGutPublicationStatus(source.id)));
      setResearchChanges(compareGutPublicationStatus(thread.reviewedResearch.sources as GutPublicationStatus[], fresh));
      setResearchCheck('ready');
    } catch { setResearchCheck('error'); }
  };

  const saveReviewedResearch = async () => {
    if (!thread || !research.length || !researchTopic) return;
    await savePatch({ reviewedResearch: { at: new Date().toISOString(), topic: researchTopic, sources: research.map((paper) => ({ id: paper.id, title: paper.title, correctionNotice: paper.correctionNotice, publicationDate: paper.publicationDate, status: paper.correctionNotice ? 'corrected' as const : 'active' as const })) } });
    setResearchChanges([]);
    setResearchCheck('idle');
  };

  const copyBrief = async () => {
    if (!thread || !evidence) return;
    const researchSources = thread.reviewedResearch?.sources.length
      ? thread.reviewedResearch.sources.map((source) => ({ id: source.id, title: source.title, url: `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(source.id)}/`, status: source.status, correctionNotice: source.correctionNotice }))
      : research.map((paper) => ({ id: paper.id, title: paper.title, url: paper.url, status: 'search result' as const, correctionNotice: paper.correctionNotice }));
    const lines = [
      `Gut question — ${thread.question}`,
      `Conclusion rules version: ${thread.conclusionVersion || GUT_CONCLUSION_VERSION}`,
      observationSyncBrief,
      `Prepared ${new Date().toLocaleDateString()}`,
      `Symptom: ${symptomName(thread.symptom)}`,
      ...(thread.intent === 'now' ? [
        'Current concern: the user’s words above have not been assessed for urgency or cause.',
        thread.symptomOnset ? `Reported symptom onset: ${thread.symptomOnset.occurredAt} (${thread.symptomOnset.precision}).` : 'Symptom onset was not entered.',
        snapshot.todayDay ? `Today’s saved digestion record: bloating ${snapshot.todayDay.bloating === null ? 'not rated' : `${snapshot.todayDay.bloating}/10`}; discomfort ${snapshot.todayDay.discomfort === null ? 'not rated' : `${snapshot.todayDay.discomfort}/10`}.` : 'No dated digestion rating saved for today.',
      ] : [
        `Focus: ${thread.focus || 'not chosen'}`,
        `Personal records: ${evidence.support} linked report(s) with symptom, ${evidence.tension} explicit report(s) without, ${evidence.unknown} unknown or disputed outcome(s), including ${evidence.conflicts} conflicting source(s).`,
        evidence.answer,
        ...evidence.occasions.map((item) => `${item.meal.date}: ${item.meal.name}; ${item.answerOrigin === 'conflict' ? 'Diet and Gut reports disagree; outcome unresolved' : item.answer === 'yes' ? `${symptomName(thread.symptom)} reported` : item.answer === 'no' ? `no ${symptomName(thread.symptom)} reported` : 'outcome unknown'}; meal source ${item.meal.id}; answer source ${item.answerOrigin}${item.meal.reactionType ? `; Diet reaction ${item.meal.reactionType}` : ''}${item.answerSource ? `; Gut report ${item.answerSource.id}, revision ${item.answerSource.revision}` : ''}`),
      ]),
      `Next step chosen: ${thread.selectedStep || 'not chosen'}`,
      ...formatGutResearchBrief(researchSources),
      ...(thread.intent === 'decide' && thread.decision ? [
        `Upcoming options: A — ${thread.decision.options.a.label || 'not entered'}; B — ${thread.decision.options.b.label || 'not entered'}`,
        `Personal priority: ${thread.decision.priority || 'not entered'}`,
        `Choice: ${thread.decision.chosen ? thread.decision.options[thread.decision.chosen].label : 'undecided'}`,
        `Actual outcome, user report: ${thread.decision.outcome || 'unknown'}`,
        'A planned or chosen meal is not evidence that it was eaten or tolerated.',
      ] : []),
      `What happened: ${thread.reflection || 'not reported'}`,
      ...(trial ? [`Separate Clinical Elimination Suite trial: ${trial.id}; status ${trial.status}; ${trial.checkins} trial check-in(s). These were not counted as linked meal reports.`] : []),
      'A linked observation is not proof of cause. Date-only reports do not establish symptom timing. Search results are not independently reviewed findings; assess the original source before applying it.',
      '', formatGutVisitNote(sourcedSnapshot),
    ];
    try { await navigator.clipboard.writeText(lines.join('\n')); setMessage('Question brief copied.'); }
    catch { setMessage('Could not copy the brief. Please try again.'); }
  };

  const connectionTrail = !thread || thread.intent === 'now' ? null : <details className="gr-connection-disclosure">
    <summary><GitBranch size={16} aria-hidden="true" /><span>How these records connect</span><small>Optional detail</small></summary>
    <GutConnectionTrail thread={thread} evidence={evidence} backtrace={backtraceProjection} dietMealIds={new Set(sourcedSnapshot.meals.filter((meal) => meal.sourceKind === 'diet_meal').map((meal) => meal.id))} researchStatus={researchStatus} researchCount={research.length} onOpenEvidence={() => setView('evidence')} onOpenResearch={() => setView('research')} onOpenNext={() => setView('next')} onReviewMissing={(mealId) => { setFocusOccasionId(mealId); setView('evidence'); }} onReviewOnset={() => { const target = document.getElementById('gr-onset') as HTMLDetailsElement | null; if (target) { target.open = true; target.scrollIntoView({ block: 'center' }); target.querySelector('input')?.focus(); } }} onOpenSource={onOpenSource} />
  </details>;

  return <div className="gr-workspace">
    {observationSyncNote && <p className="gr-sync-note" role="status"><ShieldCheck size={17} /> {observationSyncNote}</p>}
    {!thread ? <>
      <div className="gr-eyebrow"><span className="gr-eyebrow-dot" /> GUT HEALTH <span className="gr-eyebrow-note">Your questions, in context</span></div>
      <h2 className="gr-title">What do you need help with today?</h2>
      <p className="gr-subtitle">Choose one starting point. We’ll keep your records, research and next step easy to inspect.</p>

      {openThreads.length > 0 && <section className="gr-continue">
        <div className="gr-small-icon"><RotateCcw size={19} /></div>
        <div className="gr-continue-text"><span>Continue where you left off</span><strong>{openThreads[0].question}</strong></div>
        <button type="button" className="gr-quiet-button" onClick={() => openThread(openThreads[0])}>Continue <ArrowRight size={16} /></button>
      </section>}
      {openThreads.length > 1 && <details className="gr-other-questions"><summary>{openThreads.length - 1} other open question{openThreads.length === 2 ? '' : 's'}</summary><div>{openThreads.slice(1).map((item) => <button type="button" key={item.id} onClick={() => openThread(item)}><span>{item.question}</span><ArrowRight size={15} /></button>)}</div></details>}

      <div className="gr-onboarding-step"><span className="gr-step-track" aria-hidden="true"><i /><i className={selectedIntent ? 'gr-step-ready' : ''} /></span><strong>START HERE</strong><span>Choose what fits today</span></div>
      <section className="gr-intent-grid" aria-label="Choose what you need help with">
        {intents.map(({ id, title, desc, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={`gr-intent gr-intent-${id}${selectedIntent === id ? ' gr-intent-active' : ''}`}
            aria-pressed={selectedIntent === id}
            onClick={() => setSelectedIntent(id)}
          >
            <span className={`gr-icon gr-icon-${id}`} aria-hidden="true"><Icon size={21} /></span>
            <span><strong>{title}</strong><small>{desc}</small></span>
            <ChevronRight size={18} className="gr-intent-arrow" aria-hidden="true" />
          </button>
        ))}
      </section>

      {!selectedIntent && <p className="gr-path-hint">A question is enough to begin. You can add details later.</p>}
      {selectedIntent && <section ref={startFormRef} className="gr-start-form" aria-label={`${intents.find((item) => item.id === selectedIntent)?.title} question setup`}>
        <div className="gr-onboarding-step"><span className="gr-step-track" aria-hidden="true"><i /><i className="gr-step-ready" /></span><strong>YOUR QUESTION</strong><span>{intents.find((item) => item.id === selectedIntent)?.title}</span></div>
        <h3 className="gr-path-heading"><span className={`gr-path-heading-icon gr-icon-${selectedIntent}`} aria-hidden="true"><SelectedIntentIcon size={18} /></span>{intentGuidance[selectedIntent].heading}</h3>
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

        {liveResolution.inferredFocus && !mealPhrase.trim() && (selectedIntent === 'understand' || selectedIntent === 'decide') && <button type="button" className="gr-draft-suggestion" onClick={() => setMealPhrase(liveResolution.inferredFocus)}><Search size={15} /><span>Compare this saved meal name, if that is what you meant: <strong>{liveResolution.inferredFocus}</strong></span><b>Use</b></button>}
        {liveResolution.inferredSymptom !== 'unspecified' && selectedSymptom === 'unspecified' && <button type="button" className="gr-draft-suggestion gr-symptom-suggestion" onClick={() => setSelectedSymptom(liveResolution.inferredSymptom)}><Sparkles size={15} /><span>Possible symptom from your wording: <strong>{symptoms.find((item) => item.id === liveResolution.inferredSymptom)?.label}</strong></span><b>Add</b></button>}

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
      <datalist id="gr-recorded-meals">{Array.from(new Set(sourcedSnapshot.meals.map((meal) => meal.name))).map((name) => <option key={name} value={name} />)}</datalist>
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

      <section className="gr-quick-record" aria-label="Optional meal record">
        <span className="gr-quick-record-icon" aria-hidden="true"><Utensils size={19} /></span>
        <div className="gr-quick-record-copy"><strong>Record a meal</strong><p>Optional. A saved meal can appear in a question’s evidence and record window. You can continue without logging one.</p></div>
        <button type="button" onClick={onOpenQuickMeal}><Plus size={16} /> Add meal <ArrowRight size={15} /></button>
      </section>

      <div className="gr-home-bottom">
        <div><ShieldCheck size={17} /> Your records and general research stay visibly separate.</div>
        <button type="button" onClick={() => onOpenHistory()}><Activity size={16} /> Open history</button>
      </div>

      {threads.filter((item) => item.status === 'closed').length > 0 && <section className="gr-closed"><h3>Past questions</h3>{threads.filter((item) => item.status === 'closed').slice(0, 4).map((item) => <button type="button" key={item.id} onClick={() => openThread(item)}>{item.question}<ArrowRight size={15} /></button>)}</section>}
    </> : <>
      <div className="gr-thread-top"><button type="button" className="gr-back" onClick={() => { setActiveId(null); setMessage(''); }}><ArrowLeft size={17} /> All questions</button><span className="gr-thread-kind"><ThreadIcon size={14} />{intents.find((item) => item.id === thread.intent)?.title}</span></div>
      <div className="gr-thread-heading"><div><div className="gr-eyebrow"><span className="gr-eyebrow-dot" /> {thread.intent === 'now' ? 'YOUR CURRENT CONCERN' : thread.intent === 'care' ? 'YOUR CARE QUESTION' : 'YOUR QUESTION'}</div><h2 className="gr-title">{thread.question}</h2><p className="gr-subtitle">{thread.intent === 'now' ? 'Your words are saved. See a care next step and the records you can bring.' : thread.intent === 'care' ? 'Keep your question and source records together for a visit.' : 'A reading you can inspect and update as your records change.'}</p></div><span className={`gr-icon gr-icon-${thread.intent}`}><ThreadIcon size={24} /></span></div>
      {view !== 'answer' && <nav className="gr-tabs" aria-label="Question sections">{(thread.intent === 'now' ? [['answer','My report'],['research','General information']] : [['answer',thread.intent === 'decide' ? 'My choice' : thread.intent === 'care' ? 'My question' : 'My answer'],['evidence','Records'],['research','Research'],['next','Next step']] as [View,string][]).map(([id, label]) => <button type="button" key={id} aria-current={view === id ? 'page' : undefined} className={view === id ? 'gr-tab-active' : ''} onClick={() => { setView(id as View); setMessage(''); }}>{label}</button>)}</nav>}
      {hasChanged && thread.intent !== 'now' && <div className="gr-change" role="status"><Sparkles size={19} /><div><strong>{thread.reviewedEvidence?.occasions ? 'Your records changed since this question was last reviewed.' : 'This question needs a fresh evidence review.'}</strong><span>Then: {changeReceipt?.previous.support} with, {changeReceipt?.previous.tension} without, {changeReceipt?.previous.unknown} unknown. Now: {changeReceipt?.current.support} with, {changeReceipt?.current.tension} without, {changeReceipt?.current.unknown} unknown.</span>{changeReceipt?.comparisonChanged && <span>The meal comparison or symptom changed.</span>}{changeReceipt && changeReceipt.changes.length > 0 && <ul>{changeReceipt.changes.slice(0, 3).map((change) => <li key={change.mealId}><strong>{change.label}:</strong> {change.detail}</li>)}{changeReceipt.changes.length > 3 && <li>{changeReceipt.changes.length - 3} more changed occasion(s) in Evidence.</li>}</ul>}{thread.reviewedEvidence?.occasions && changeReceipt?.changes.length === 0 && <span>A comparison detail changed; inspect the source records before relying on the earlier answer.</span>}<button type="button" className="gr-change-review" disabled={busy || !evidence} onClick={() => void savePatch({ reviewedEvidence: makeGutReviewSnapshot({ ...thread, focus: comparisonFocus }, evidence!) })}>I reviewed the current evidence</button></div></div>}
      {view === 'answer' && thread.intent === 'now' && <section className="gr-current" aria-label="Current concern summary"><div className="gr-current-intro"><span className="gr-icon gr-icon-now"><HeartHandshake size={21} /></span><div><span className="gr-connection-eyebrow">START HERE</span><h3>Your concern is saved</h3><p>No meal link or cause has been inferred from your words.</p></div></div><div className="gr-current-care"><strong>If symptoms are severe, sudden, worsening, or otherwise concerning, seek medical care.</strong><p>Bring this question and any records you saved. This screen cannot assess urgency or diagnose you.</p><small>General safety guidance · independent clinical review pending</small></div><div className="gr-current-actions"><button type="button" className="gr-primary" onClick={() => void copyBrief()}><Clipboard size={17} /> Copy care brief</button><button type="button" className="gr-secondary" onClick={() => onOpenHistory(snapshot.today)}><Activity size={17} /> Open today’s log</button><button type="button" className="gr-link" onClick={() => setView('research')}><BookOpen size={17} /> General information</button></div>{(snapshot.todayDay || todayGutObservations.length > 0) && <div className="gr-current-record">{snapshot.todayDay ? <>Today’s saved digestion record: bloating {snapshot.todayDay.bloating === null ? 'not rated' : `${snapshot.todayDay.bloating}/10`}; discomfort {snapshot.todayDay.discomfort === null ? 'not rated' : `${snapshot.todayDay.discomfort}/10`}. <button type="button" onClick={() => onOpenHistory(snapshot.today)}>Inspect history <ArrowRight size={13} /></button></> : `${todayGutObservations.length} dated digestion report${todayGutObservations.length === 1 ? '' : 's'} saved today.`}{todayGutObservations.map((item) => <button type="button" key={item.id} onClick={() => onOpenSource({ sourceKind: 'observation', sourceId: item.id, localDate: item.localDate || snapshot.today })}>{item.payload.kind === 'symptom' ? `Open ${item.payload.symptom}` : item.payload.kind === 'bowel' ? 'Open bowel report' : 'Open check-in'} <ArrowRight size={13} /></button>)}</div>}</section>}
      {view === 'answer' && thread.intent === 'decide' && <><GutConclusionCard thread={thread} evidence={evidence} state={conclusionState} onOpenSource={onOpenSource} onInspect={(mealId) => { if (mealId) setFocusOccasionId(mealId); setView('evidence'); }} onResearch={() => setView('research')} onCopyBrief={() => { void copyBrief(); }} />{connectionTrail}<GutDecisionPlanner thread={thread} snapshot={sourcedSnapshot} observations={observations} busy={busy} onSave={async (decision) => !!await savePatch({ decision })} onSymptomChange={async (newSymptom) => !!await savePatch({ symptom: newSymptom })} onOpenQuickMeal={onOpenQuickMeal} /></>}
      {view === 'answer' && thread.intent !== 'decide' && thread.intent !== 'now' && <div className="gr-answer-layout"><section className="gr-answer-main">
        {thread.intent === 'care' && <div className="gr-care-notice"><FileText size={20} /><div><strong>Bring a focused question to your clinician</strong><p>Medication schedules and personal notes are not verified care instructions. This brief keeps your reports separate from possible explanations.</p></div></div>}
        <GutConclusionCard
          thread={thread}
          evidence={evidence}
          state={conclusionState}
          onOpenSource={onOpenSource}
          onInspect={(mealId) => { if (mealId) setFocusOccasionId(mealId); setView('evidence'); }}
          onResearch={() => setView('research')}
          onCopyBrief={() => { void copyBrief(); }}
        />
        {connectionTrail}

        {/* 48-Hour Backtrace Projection */}
        {backtraceProjection && (backtraceProjection.timedItems.length > 0 || backtraceProjection.dateOnlyItems.length > 0) && <details className="gr-backtrace-disclosure"><summary>{backtraceProjection.timedItems.length > 0 ? 'See the 48-hour record window' : 'See dated records near this question'}</summary><GutBacktraceTimeline projection={backtraceProjection} onOpenSource={onOpenSource} /></details>}

      </section><aside className="gr-answer-side"><h3>Question controls</h3><p>Compare a specific meal name across your saved records. Similar names can still represent different recipes.</p><label htmlFor="gr-focus-edit">Meal or phrase</label><div className="gr-side-edit"><input id="gr-focus-edit" value={focusDraft} onChange={(event) => setFocusDraft(event.target.value)} list="gr-thread-meals" maxLength={120} placeholder="e.g. chai" /><button type="button" onClick={() => void savePatch({ focus: focusDraft })} disabled={busy || focusDraft === thread.focus}>Apply</button></div><datalist id="gr-thread-meals">{mealNames.map((name) => <option key={name} value={name} />)}</datalist><label htmlFor="gr-symptom-edit">Compare outcome</label><select id="gr-symptom-edit" value={thread.symptom} onChange={(event) => void savePatch({ symptom: event.target.value as GutSymptom })}>{symptoms.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><div className="gr-side-divider" /><button type="button" className="gr-link" onClick={() => onOpenHistory()}><Activity size={16} /> Open recorded history</button><button type="button" className="gr-link" onClick={() => void copyBrief()}><Clipboard size={16} /> Copy question brief</button></aside></div>}
      {view === 'answer' && thread.intent !== 'now' && <details className="gr-passport"><summary>How this question is being read <ChevronRight size={15} /></summary><p>Your exact wording stays intact. These fields guide this question and generic research topics; they do not infer a diagnosis.</p><dl>{Object.entries(makeGutResearchPassport(thread)).filter(([key]) => key !== 'exactQuestion').map(([key, value]) => <div key={key}><dt>{key.replace('_', ' ')}</dt><dd>{value || 'Unknown'}</dd></div>)}</dl><p>Change the meal and symptom in Question controls. For a decision, edit options in My choice.</p></details>}
      {view === 'answer' && thread.intent !== 'now' && <details id="gr-onset" className="gr-onset"><summary>When did this symptom start? <span>(optional)</span></summary><p>A reported onset changes the time window. If you are unsure, leave it blank; the question save time remains clearly labeled.</p><div className="gr-onset-fields"><label>Local date and time<input type="datetime-local" value={onsetDraft} max={new Date().toLocaleString('sv-SE').slice(0, 16).replace(' ', 'T')} onChange={(event) => setOnsetDraft(event.target.value)} /></label><label>How certain is the time?<select value={onsetPrecision} onChange={(event) => setOnsetPrecision(event.target.value as 'exact' | 'approximate')}><option value="approximate">Approximate</option><option value="exact">Exact, as I recall</option></select></label></div><div className="gr-onset-actions"><button type="button" disabled={!onsetDraft || busy || Number.isNaN(new Date(onsetDraft).getTime()) || new Date(onsetDraft).getTime() > Date.now()} onClick={() => void savePatch({ symptomOnset: { occurredAt: new Date(onsetDraft).toISOString(), precision: onsetPrecision } })}>Save reported onset</button>{thread.symptomOnset && <button type="button" disabled={busy} onClick={() => { setOnsetDraft(''); void savePatch({ symptomOnset: null }); }}>I am not sure / clear</button>}</div><small>{thread.symptomOnset ? `Current anchor: ${thread.symptomOnset.precision} onset you entered. Saved-question time remains separate.` : 'No onset saved. Timeline uses the saved-question time as a browsing window only.'}</small></details>}
      {view === 'answer' && thread.intent === 'understand' && <GutTheoryDuel key={thread.id} thread={thread} meals={sourcedSnapshot.meals} days={sourcedSnapshot.days} observations={observations} onOpenSource={onOpenSource} />}
      {view === 'answer' && thread.intent !== 'now' && <GutQuestionAtlas thread={thread} threads={threads} meals={sourcedSnapshot.meals} days={sourcedSnapshot.days} observations={observations} onOpenThread={openThread} />}
      {view === 'evidence' && <div className="gr-evidence-view"><div className="gr-section-intro"><div><h3>Evidence hearing</h3><p>Only symptom-specific user reports linked to a saved meal go in “with” or “without.” Disagreeing reports remain unresolved. Same-day ratings and free-text notes provide context, not meal causation.</p></div><span>{evidence?.occasions.length || 0} matching occasions</span></div>
        {trial && <div className="gr-trial-context"><div><strong>Separate Clinical Elimination Suite record</strong><p>A {trial.status} trial has {trial.checkins} check-in{trial.checkins === 1 ? '' : 's'}. They are available in the Suite and are not counted as meal-linked answers here.</p><small>Trial source · {trial.id}</small></div>{onOpenElimination && <button type="button" className="gr-secondary" onClick={onOpenElimination}>Open Suite <ArrowRight size={15} /></button>}</div>}
        {!comparisonFocus ? <div className="gr-empty"><Search size={25} /><strong>{thread.intent === 'decide' ? 'Choose a saved meal name on My choice' : 'Choose a meal or phrase on My answer'}</strong><p>We will only match saved meal names. No ingredients or symptoms are guessed from the name.</p></div> : evidence?.occasions.length === 0 ? <div className="gr-empty"><Utensils size={25} /><strong>No matching saved meals</strong><p>Your question remains available. You can search another phrase, record a meal, or go straight to research or a care question.</p><button type="button" className="gr-secondary" onClick={onOpenQuickMeal}>Record a meal</button></div> : <>
          {evidence && evidence.bundle.nameVariants.length > 1 && <section className="gr-variants" aria-label="Saved meal name variants"><strong>{evidence.bundle.nameVariants.length} saved name or user-confirmed preparation groups match “{comparisonFocus}”</strong><p>Each group has its own reports. Unknown preparation remains unknown; no ingredient is inferred from a meal name.</p><div className="gr-variant-list">{evidence.bundle.nameVariants.slice(0, 3).map((variant) => <button type="button" key={variant.sourceIds[0]} onClick={() => setFocusOccasionId(variant.sourceIds[0])}><b>{variant.name}{variant.preparation ? ` · ${variant.preparation}` : ' · preparation unknown'}</b><span>{variant.support} with · {variant.counterexamples} without · {variant.unknown} unknown</span></button>)}</div>{evidence.bundle.nameVariants.length > 3 && <details><summary>Show {evidence.bundle.nameVariants.length - 3} more groups</summary><div className="gr-variant-list">{evidence.bundle.nameVariants.slice(3).map((variant) => <button type="button" key={variant.sourceIds[0]} onClick={() => setFocusOccasionId(variant.sourceIds[0])}><b>{variant.name}{variant.preparation ? ` · ${variant.preparation}` : ' · preparation unknown'}</b><span>{variant.support} with · {variant.counterexamples} without · {variant.unknown} unknown</span></button>)}</div></details>}</section>}
        <div className="gr-occasion-list">{evidence?.occasions.map((item) => <article className="gr-occasion" id={`gr-occasion-${item.meal.id}`} tabIndex={-1} key={item.meal.id}><div className="gr-occasion-heading"><div><span className={`gr-status gr-status-${item.answerOrigin === 'conflict' ? 'conflict' : item.answer}`}>{item.answerOrigin === 'conflict' ? 'Reports disagree' : item.answer === 'yes' ? `${symptomName(thread.symptom)} reported` : item.answer === 'no' ? `No ${symptomName(thread.symptom)} reported` : 'Outcome unknown'}</span><h4>{item.meal.name}</h4><small>{item.meal.date}{item.meal.time ? ` · ${item.meal.time}` : item.meal.timePrecision === 'date_only' ? ' · date only' : ' · exact time unavailable'}</small></div><button type="button" className="gr-source" onClick={() => onOpenSource({ sourceKind: item.meal.sourceKind || 'diet_meal', sourceId: item.meal.id, localDate: item.meal.date })}>Open meal <ChevronRight size={15} /></button></div>
            {sourcedSnapshot.meals.filter((meal) => meal.name.trim().toLocaleLowerCase() === item.meal.name.trim().toLocaleLowerCase()).length > 1 && item.meal.sourceKind !== 'observation' && <GutPreparationNote meal={item.meal} onSave={saveGutMealPreparation} />}
            {item.meal.reaction && item.answerOrigin !== 'meal_reaction' && <p className="gr-source-note"><strong>{item.meal.reactionType ? 'Diet reaction selection:' : 'Existing meal note:'}</strong> {item.meal.reaction}{!item.meal.reactionType && <em> (not classified automatically)</em>}</p>}
            {item.answerOrigin === 'meal_reaction' && <p className="gr-source-note"><strong>{item.edge.inclusionRule === 'unstable_legacy_meal_id' ? 'Diet report, not counted:' : 'Counted from Diet:'}</strong> This meal's explicit “{item.meal.reaction}” reaction selection. A chosen reaction is a user report, not proof the meal caused it.</p>}
            {item.answerOrigin === 'conflict' && <p className="gr-source-note gr-conflict-note"><strong>Two user reports disagree:</strong> Diet's meal reaction and the linked Gut report differ for this symptom. This occasion is counted as unresolved. {onOpenDiet && <button type="button" className="gr-link" onClick={onOpenDiet}>Open Diet to review <ArrowRight size={14} /></button>}</p>}
            {item.sameDay && <p className="gr-source-note"><strong>Same-date digestion record:</strong> bloating {item.sameDay.bloating === null ? 'not rated' : `${item.sameDay.bloating}/10`}; discomfort {item.sameDay.discomfort === null ? 'not rated' : `${item.sameDay.discomfort}/10`}. Same date does not establish which came first.</p>}
            {item.otherMeals.length > 0 && <p className="gr-source-note"><strong>Other meals recorded that date:</strong> {item.otherMeals.slice(0, 3).map((meal) => meal.name).join(', ')}{item.otherMeals.length > 3 ? `, and ${item.otherMeals.length - 3} more in the source details` : ''}.</p>}
            {item.alternativeContext.some((context) => context.kind === 'recorded_context_same_date') && <p className="gr-source-note"><strong>Other saved context that date:</strong> {item.alternativeContext.filter((context) => context.kind === 'recorded_context_same_date').map((context) => context.contextType === 'medication' ? 'medication note' : context.contextType || 'other note').join(', ')}. This is date-matched context, not evidence of cause or of a medication dose taken.</p>}
            <div className="gr-occasion-actions"><span>{hasStableGutMealId(item.meal) ? 'If you remember this occasion:' : 'This older meal has no stable source ID, so a report cannot be linked to it.'}</span><button type="button" disabled={busy || thread.symptom === 'unspecified' || !hasStableGutMealId(item.meal)} onClick={() => void record(item.meal, 'yes')}>Had {symptomName(thread.symptom)}</button><button type="button" disabled={busy || thread.symptom === 'unspecified' || !hasStableGutMealId(item.meal)} onClick={() => void record(item.meal, 'no')}>Did not have it</button><button type="button" disabled={busy || thread.excludedMealIds.includes(item.meal.id)} onClick={() => void savePatch({ excludedMealIds: [...thread.excludedMealIds, item.meal.id] })}>Keep out of this question</button></div>
            <details className="gr-source-details"><summary>Why this occasion appears</summary><p>The saved meal name matches “{comparisonFocus}”. That match does not verify ingredients, portion or recipe.</p><dl><div><dt>Meal source ID</dt><dd>{item.meal.id}</dd></div><div><dt>Meal date</dt><dd>{item.meal.date}{item.meal.time ? ` · saved time ${item.meal.time}` : ' · exact time unavailable'}</dd></div><div><dt>Diet reaction</dt><dd>{item.meal.reactionType ? `${item.meal.reaction || item.meal.reactionType}${item.meal.reactionRecordedAt ? ` · reported ${item.meal.reactionRecordedAt}` : ''}` : 'No structured Diet reaction'}</dd></div><div><dt>Gut report</dt><dd>{item.answerSource ? `${item.answerSource.payload.kind === 'daily_checkin' ? item.answerSource.payload.answers[thread.symptom] : 'unknown'} · ${item.answerSource.id} · revision ${item.answerSource.revision}` : 'No explicit Gut report linked to this meal'}</dd></div><div><dt>Counting rule</dt><dd>{item.edge.inclusionRule === 'unstable_legacy_meal_id' ? 'This older meal has no stable source ID, so its report is not counted.' : item.answerOrigin === 'conflict' ? 'Disagreeing user reports remain unresolved until a source is corrected.' : item.answerOrigin === 'meal_reaction' ? 'Only a symptom-specific Diet reaction is counted. Broad “No reaction” selections remain unknown.' : item.answerSource ? 'Explicit user report linked by meal ID and date. Date-only precision does not establish when the symptom began.' : 'Unknown outcome. A same-date symptom rating is shown as context only.'}</dd></div></dl>
            <p><strong>Source trail:</strong> {item.edge.mealSource.timePrecision === 'exact' ? 'Meal time saved' : 'Meal date only'} · {item.edge.answerSources.length ? item.edge.answerSources.map((source) => `${source.kind === 'gut_report' ? 'Gut report' : 'Diet reaction'} ${source.id}${source.revision === null ? '' : ` revision ${source.revision}`} (${source.timePrecision.replace('_', ' ')})`).join(' · ') : 'No symptom-specific answer source'}{item.edge.inclusionRule === 'unstable_legacy_meal_id' ? ' · Older meal ID may change when records reorder, so its answer stays unknown.' : ''}</p>
            {item.alternativeContext.length > 0 && <><strong>Same-date context, outside the symptom count</strong><ul>{item.alternativeContext.map((context) => <li key={`${context.kind}:${context.sourceId}`}>{context.kind === 'other_meal_same_date' ? 'Other meal' : `${context.contextType || 'Other'} note`}: {context.label} · source {context.sourceId}{context.revision === null ? '' : ` · revision ${context.revision}`} · {context.timePrecision.replace('_', ' ')} timing</li>)}</ul><p>Same date does not establish order or cause. A medication note does not confirm a dose was taken.</p></>}</details>
          </article>)}</div>
          {thread.excludedMealIds.length > 0 && <div className="gr-excluded"><strong>Kept separate</strong>{thread.excludedMealIds.map((mealId) => <button type="button" key={mealId} onClick={() => void savePatch({ excludedMealIds: thread.excludedMealIds.filter((id) => id !== mealId) })}>Restore {sourcedSnapshot.meals.find((meal) => meal.id === mealId)?.name || 'meal'} <RotateCcw size={15} /></button>)}</div>}
        </>}
      </div>}
      {view === 'research' && <div className="gr-research-view"><div className="gr-section-intro"><div><h3>General information</h3><p>{thread.symptom === 'unspecified' ? 'Choose the symptom you want to read about. Your question remains saved as written.' : `Start with a trusted overview for ${symptomName(thread.symptom)}. If you want published studies, choose a topic below. These sources do not explain your personal symptoms.`}</p></div></div>
        {thread.symptom === 'unspecified' && <div className="gr-research-select"><label htmlFor="gr-research-symptom">Which symptom would you like to read about?</label><select id="gr-research-symptom" value="unspecified" disabled={busy} onChange={(event) => void savePatch({ symptom: event.target.value as GutSymptom })}><option value="unspecified">Choose a symptom</option>{symptoms.filter((item) => item.id !== 'unspecified').map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><small>This choice selects general sources; it does not add a symptom report to your records.</small></div>}
        {thread.reviewedResearch?.sources.length ? <section className="gr-research-receipt"><strong>Saved source list · {new Date(thread.reviewedResearch.at).toLocaleDateString()}</strong><p>{thread.reviewedResearch.sources.length} exact PMID{thread.reviewedResearch.sources.length === 1 ? '' : 's'} saved for this question. Check their current publication status independently of search rankings.</p><button type="button" disabled={researchCheck === 'loading'} onClick={() => void checkSavedResearch()}>{researchCheck === 'loading' ? 'Checking exact sources…' : 'Check source updates'}</button>{researchCheck === 'error' && <p role="status">Status check unavailable. Earlier source information remains labeled as saved metadata.</p>}{researchCheck === 'ready' && (researchChanges.length ? <div role="status">{researchChanges.map((item) => <p key={item.id}><strong>PMID {item.id}:</strong> {item.changes.join('; ')}. Recheck the original before using this paper; no personal conclusion was updated.</p>)}</div> : <p role="status">No indexed status change was found for the saved PMIDs. This does not verify the paper’s findings or check guideline changes.</p>)}</section> : null}
        {gutGeneralGuidance[thread.symptom] && <section className="gr-paper" aria-label="General guidance"><div className="gr-paper-source-heading"><span aria-hidden="true"><BookOpen size={17} /></span><strong>Open a trusted overview</strong></div><p>Read the original source directly. This app has not independently reviewed or summarized this page, and it cannot explain your personal symptoms.</p><a href={gutGeneralGuidance[thread.symptom]?.url} target="_blank" rel="noopener noreferrer">{gutGeneralGuidance[thread.symptom]?.title} <ArrowRight size={15} /></a><small>{gutGeneralGuidance[thread.symptom]?.sourceOrganization} public information · source list version {gutGeneralGuidance[thread.symptom]?.contentVersion} · independent clinical review pending</small></section>}
        {thread.symptom !== 'unspecified' && <GutReviewedEvidencePanel symptom={thread.symptom} topic={researchTopic} />}
        {thread.symptom !== 'unspecified' && <section className="gr-research-picker"><h4>Explore published studies <span>(optional)</span></h4><p>Choose the subject you want to search. Your question and records are never sent; the search uses only the selected subject and symptom. It can miss relevant studies.</p><div className="gr-research-topics" role="group" aria-label="Research topic">{(Object.entries(gutResearchTopics) as [GutResearchTopic, { label: string; query: string }][]).map(([id, item]) => { const TopicIcon = researchTopicIcons[id]; return <button type="button" key={id} aria-pressed={researchTopic === id} onClick={() => { setResearchTopic(id); void loadResearch(id); }} disabled={researchStatus === 'loading'}><TopicIcon size={15} aria-hidden="true" />{item.label}</button>; })}</div></section>}
        {researchTopic && <div className="gr-research-warning"><ShieldCheck size={19} /> Studies describe groups, not your personal cause. Check each source’s population and methods before applying it to yourself.</div>}
        {researchStatus === 'loading' && <p role="status" className="gr-loading">Searching Europe PMC for general research…</p>}
        {researchStatus === 'error' && <div className="gr-empty"><BookOpen size={24} /><strong>Research is temporarily unavailable</strong><p>Your personal records remain accessible. Try again later.</p><button type="button" className="gr-secondary" onClick={() => void loadResearch()}>Retry</button></div>}
        {researchStatus === 'ready' && (research.length ? <div className="gr-paper-list">{research.map((paper) => <article key={paper.id} className="gr-paper">
          <span className="gr-paper-type">PUBMED · PMID {paper.id}</span><h4>{paper.title}</h4>
          {paper.publicationTypes.length > 0 && <div className="gr-paper-tags">{paper.publicationTypes.map((type) => <span key={type}>{type}</span>)}</div>}
          {paper.correctionNotice && <p className="gr-paper-correction">Publication notice: {paper.correctionNotice}. Check the original record before relying on it.</p>}
          <p>{paper.abstract ? `${paper.abstract.slice(0, 430)}${paper.abstract.length > 430 ? '…' : ''}` : 'Abstract unavailable.'}</p>
          <div className="gr-paper-appraisal"><strong>Source check</strong><p>{paper.titlePopulationCue ? `The title names ${paper.titlePopulationCue}. Check whether that population fits your question.` : 'The study population is not verified from the index metadata.'} The comparator and measured outcome require checking the original paper.</p><small>Publication type is an index label, not a quality grade. This paper cannot identify your personal trigger.</small></div>
          {researchTopic && <GutStudyBridge paper={paper} thread={thread} topic={researchTopic} />}
          <div className="gr-paper-foot"><span>{paper.journal || 'Journal unverified'}{paper.publicationDate ? ` · ${paper.publicationDate} (${paper.publicationDateSource} date)` : paper.year ? ` · ${paper.year} (year only)` : ' · Publication date unverified'}</span><a href={paper.url} target="_blank" rel="noopener noreferrer">Open original <ArrowRight size={15} /></a></div>
          <small>Abstract excerpt only · metadata checked {new Date(paper.retrievedAt).toLocaleDateString()}</small>
        </article>)}</div> : <div className="gr-empty"><BookOpen size={24} /><strong>No studies matched this search</strong><p>This symptom-and-topic search can miss relevant research. No result here is not evidence that the topic has not been studied.</p>{researchTopic !== 'food' && <button type="button" className="gr-secondary" onClick={() => { setResearchTopic('food'); void loadResearch('food'); }}>Try the broader food topic</button>}</div>)}
        {researchStatus === 'ready' && research.length > 0 && <button type="button" className="gr-secondary" disabled={busy} onClick={() => void saveReviewedResearch()}>Save these source IDs for later status checks</button>}
      </div>}
      {view === 'next' && <div className="gr-next-view"><div className="gr-section-intro"><div><h3>Close the loop</h3><p>A useful outcome may be a choice, a clinician question, or deciding to leave this unresolved.</p></div></div><div className="gr-next-grid"><section><div className="gr-card-label"><Compass size={16} /> MY NEXT STEP</div><p className="gr-soft">Choose one or write your own. The app is not prescribing a diet, challenge or medicine change.</p><div className="gr-step-choices">{['Leave this question open without tracking', 'Discuss this uncertainty with a clinician', 'Notice what happens on an ordinary future occasion'].map((choice) => <button type="button" key={choice} className={stepDraft === choice ? 'gr-choice-active' : ''} onClick={() => setStepDraft(choice)}>{choice}{stepDraft === choice && <Check size={16} />}</button>)}</div><label htmlFor="gr-step-custom">Or write your next step</label><textarea id="gr-step-custom" value={stepDraft} onChange={(event) => setStepDraft(event.target.value)} maxLength={300} rows={2} placeholder="What would actually help you?" /><button type="button" className="gr-primary" disabled={busy || stepDraft === (thread.selectedStep || '')} onClick={() => void savePatch({ selectedStep: stepDraft })}>Save my step</button></section><section><div className="gr-card-label"><RotateCcw size={16} /> AFTERWARD, IF YOU WANT</div><p className="gr-soft">What happened or what did you decide? Skip this if it adds no value.</p><label htmlFor="gr-reflection">Your own words</label><textarea id="gr-reflection" value={reflectionDraft} onChange={(event) => setReflectionDraft(event.target.value)} maxLength={1000} rows={5} placeholder="I asked my clinician… / I chose to leave it alone…" /><button type="button" className="gr-secondary" disabled={busy || reflectionDraft === (thread.reflection || '')} onClick={() => void savePatch({ reflection: reflectionDraft })}>Save outcome</button></section></div><div className="gr-next-footer"><button type="button" className="gr-secondary" onClick={() => void copyBrief()}><Clipboard size={16} /> Copy question brief</button>{onOpenConsult && <button type="button" className="gr-secondary" onClick={onOpenConsult}>Open consultation <ArrowRight size={16} /></button>}<button type="button" className="gr-link" disabled={busy} onClick={() => void savePatch({ status: thread.status === 'open' ? 'closed' : 'open' })}>{thread.status === 'open' ? 'Close this question' : 'Reopen question'}</button><button type="button" className="gr-link" disabled={busy || !evidence} onClick={() => void savePatch({ reviewedEvidence: makeGutReviewSnapshot({ ...thread, focus: comparisonFocus }, evidence!) })}>Mark evidence reviewed</button></div></div>}
      {((view === 'next') || (view === 'answer' && thread.intent === 'care')) && onOpenCasePrep && onOpenCases && <GutCaseHandoff key={thread.id} thread={thread} onOpenCasePrep={onOpenCasePrep} onOpenCases={onOpenCases} />}
      {message && <p className="gr-message" role="status">{message}</p>}
    </>}
  </div>;
};
