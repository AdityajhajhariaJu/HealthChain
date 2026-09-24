import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Clipboard, Pause, Play, ShieldAlert, Square, X } from 'lucide-react';
import { EliminationOnboardingWizard } from './EliminationOnboardingWizard';
import { getActiveTrial, type ActiveTrialState } from '../../services/TriggerEngine';
import { getActiveTrialV2, getFoodChallenges, getHealthEvents, pauseTrialV2, recordChallengeObservation, recordDailyObservation, resumeTrialV2, stopTrialV2 } from '../../services/TrialWorkflowService';
import type { TrialV2 } from '../../domain/trials/types';
import FocusTrap from './FocusTrap';

export interface ClinicalEliminationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onTrialUpdated?: (trial: ActiveTrialState | null) => void;
  inline?: boolean;
  initialProtocolId?: string | null;
  initialMode?: 'onboarding' | 'active_trial' | 'directory';
}

const surface: React.CSSProperties = { background: 'linear-gradient(150deg,#FFFCFA,#FFF3EF)', border: '1px solid #F0DFD8', borderRadius: 20, padding: 20, boxShadow: '0 8px 24px rgba(104,70,55,.055)' };
const button: React.CSSProperties = { minHeight: 44, borderRadius: 11, border: '1px solid #D8A999', padding: '9px 14px', background: '#FFFDFC', color: '#604D45', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const icon: React.CSSProperties = { width: 45, height: 45, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 30% 25%,#FFF,#F7DED4 72%,#ECC3B4)', color: '#9B675B', boxShadow: 'inset 0 1px 2px #FFF,0 5px 14px #C18E7950', flexShrink: 0 };
const dateKey = (value: string) => value.slice(0, 10);

export const ClinicalEliminationModal: React.FC<ClinicalEliminationModalProps> = ({ isOpen = false, onClose, onTrialUpdated, inline = false, initialMode }) => {
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<'today' | 'history' | 'visit'>('today');
  const [score, setScore] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [reactionScore, setReactionScore] = useState<number | null>(null);
  const [reactionNote, setReactionNote] = useState('');
  const [message, setMessage] = useState('');
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => {
    const update = () => setRevision((value) => value + 1);
    window.addEventListener('hc_trial_v2_updated', update);
    window.addEventListener('hc_trial_updated', update);
    window.addEventListener('hc_challenge_updated', update);
    return () => {
      window.removeEventListener('hc_trial_v2_updated', update);
      window.removeEventListener('hc_trial_updated', update);
      window.removeEventListener('hc_challenge_updated', update);
    };
  }, []);
  useEffect(() => {
    if (!isOpen || inline) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, inline, onClose]);

  // The revision state is an explicit subscription trigger for the account-scoped stores.
  void revision;
  const trial: TrialV2 | null = getActiveTrialV2();
  const legacy = getActiveTrial();
  const events = trial ? getHealthEvents({ profileId: trial.profileId, trialId: trial.id, type: 'daily_checkin' }) : [];
  const observations = useMemo(() => {
    const latest = new Map<string, { date: string; severity: number | null; note: string | null }>();
    for (const event of events) {
      const date = String(event.payload.date || dateKey(event.occurredAt));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      latest.set(date, { date, severity: typeof event.payload.severityScore === 'number' && Number.isFinite(event.payload.severityScore) ? event.payload.severityScore : null,
        note: typeof event.payload.notes === 'string' && event.payload.notes.trim() ? event.payload.notes.trim() : null });
    }
    return Array.from(latest.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [events]);
  const challenges = trial ? getFoodChallenges(trial.id) : [];
  const activeChallenge = challenges.find((challenge) => challenge.status === 'active' || challenge.status === 'reaction_recorded');
  const stopped = trial?.status === 'stopped';
  const completed = trial?.status === 'completed';

  const openGut = () => {
    onClose?.();
    navigate('/app/today?gut=1');
  };
  const saveCheckin = () => {
    if (!trial || score === null || !Number.isFinite(score) || score < 0 || score > 10) return;
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const result = recordDailyObservation(trial.id, { date, severityScore: score, adherenceLevel: 'unknown', notes: note.trim() || undefined });
    if (!result) { setMessage('Could not save this check-in. Your entry is still here.'); return; }
    setScore(null); setNote(''); setMessage('Check-in recorded.');
    setRevision((value) => value + 1);
    onTrialUpdated?.(getActiveTrial());
  };
  const saveChallengeReport = (hasReaction: boolean) => {
    if (!trial || !activeChallenge || reactionScore === null || !Number.isFinite(reactionScore) || reactionScore < 0 || reactionScore > 10) return;
    const result = recordChallengeObservation(trial.id, activeChallenge.id, reactionScore, hasReaction, reactionNote.trim() || undefined);
    if (!result) { setMessage('Could not save this report. Your entry is still here.'); return; }
    setReactionScore(null); setReactionNote(''); setMessage('Challenge observation recorded.');
    setRevision((value) => value + 1);
  };
  const updateState = (action: 'pause' | 'resume' | 'stop') => {
    if (!trial) return;
    const result = action === 'pause' ? pauseTrialV2(trial.id) : action === 'resume' ? resumeTrialV2(trial.id) : stopTrialV2(trial.id, 'other');
    if (!result) { setMessage('Could not update this plan. Please try again.'); return; }
    setMessage(action === 'pause' ? 'Plan paused.' : action === 'resume' ? 'Plan resumed.' : 'Plan stopped. Your records remain available.');
    setConfirmStop(false);
    setRevision((value) => value + 1);
    onTrialUpdated?.(action === 'stop' ? null : getActiveTrial());
  };
  const visitText = `Gut plan — recorded observations\nPrepared ${new Date().toISOString().slice(0, 10)}\nPlan: ${trial?.protocolId || legacy?.trialId || 'not recorded'}\nStatus: ${trial?.status || 'legacy record'}\n${observations.length ? observations.map((item) => `${item.date}: ${item.severity === null ? 'severity not recorded' : `${item.severity}/10`}${item.note ? `; ${item.note}` : ''}`).join('\n') : 'No dated check-ins recorded in this plan.'}\n${challenges.length ? challenges.map((item) => `${item.displayName}: ${item.observations.length} observation(s), status ${item.status}`).join('\n') : 'No food challenges recorded.'}\nMissing dates were not treated as symptom-free. This summary cannot confirm a food cause or treatment outcome.`;
  const copyVisit = async () => {
    try { await navigator.clipboard.writeText(visitText); setMessage('Visit notes copied.'); }
    catch { setMessage('Could not copy visit notes.'); }
  };

  if (!inline && !isOpen) return null;
  const body = <div style={{ width: '100%', maxWidth: 780, margin: '0 auto', background: '#FFFDFC', color: '#42332F', borderRadius: inline ? 20 : 26, overflow: 'hidden', maxHeight: inline ? undefined : '94vh', display: 'flex', flexDirection: 'column', border: '1px solid #E9D6CD', boxShadow: inline ? undefined : '0 30px 90px #2D191955' }}>
    <header style={{ padding: '17px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #F0DFD8', background: 'linear-gradient(115deg,#FFFCFA,#FBE6DD)' }}><span aria-hidden="true" style={icon}><Activity size={23} /></span><div style={{ flex: 1, minWidth: 0 }}><h2 className="serif-heading" style={{ margin: 0, fontSize: 22 }}>Food trial records</h2><p style={{ margin: '3px 0 0', color: '#78655D', fontSize: 13 }}>{trial ? `Status: ${trial.status.replace(/_/g, ' ')}` : 'A safe place to start with observation'}</p></div>{!inline && <button type="button" aria-label="Close food trial records" onClick={onClose} style={{ ...button, width: 44, padding: 8 }}><X size={18} /></button>}</header>
    <div style={{ overflowY: 'auto', padding: '18px clamp(14px,3vw,25px)', flex: 1 }}>
      {!trial && !legacy ? <EliminationOnboardingWizard onComplete={() => undefined} onCancel={onClose} onOpenGutHealth={openGut} /> : <div style={{ display: 'grid', gap: 15 }}>
        <div style={{ ...surface, display: 'flex', gap: 12, alignItems: 'flex-start' }}><span aria-hidden="true" style={icon}><ShieldAlert size={21} /></span><div><strong>Use this as a record of your experience</strong><p style={{ margin: '5px 0 0', color: '#78655D', lineHeight: 1.55 }}>The older plan library is being clinically reviewed. This screen does not confirm a trigger, clear a food as safe, or recommend a new restriction. You can review the observations you already made.</p></div></div>
        {legacy && !trial && <section style={surface}><h3 style={{ marginTop: 0 }}>Legacy plan preserved</h3><p style={{ color: '#78655D', lineHeight: 1.5 }}>A previous plan named {legacy.trialId} is saved for this profile. Its ownership or consent details are not yet verified for the new trial workflow. Your original record remains in the app.</p><button type="button" onClick={openGut} style={button}>Open Gut Health <ArrowRight size={15} style={{ verticalAlign: 'middle' }} /></button></section>}
        {trial && <>
          <nav aria-label="Food trial sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{([['today','Today'],['history','History'],['visit','Visit notes']] as const).map(([id, label]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)} style={{ ...button, background: tab === id ? '#F7DED4' : '#FFFDFC' }}>{label}</button>)}</nav>
          {tab === 'today' && <>
            <section style={surface}><h3 style={{ marginTop: 0 }}>One check-in when it helps</h3><p style={{ color: '#78655D', lineHeight: 1.5 }}>Rate your current main symptom. Skip a day without losing progress. This records a score, not whether you followed a diet.</p>{stopped || completed ? <p>This plan is {trial.status}. You can review its history below.</p> : trial.status === 'paused' ? <p>Plan paused. Your records remain available.</p> : <><label style={{ display: 'block', fontWeight: 700 }}>Symptom severity, 0–10<input type="number" min="0" max="10" value={score ?? ''} onChange={(event) => setScore(event.target.value === '' ? null : Number(event.target.value))} style={{ ...button, display: 'block', width: '100%', marginTop: 6, boxSizing: 'border-box', fontWeight: 400 }} /></label><label style={{ display: 'block', marginTop: 12, fontWeight: 700 }}>Note (optional)<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} style={{ ...button, display: 'block', width: '100%', marginTop: 6, boxSizing: 'border-box', resize: 'vertical', fontWeight: 400 }} /></label><button type="button" disabled={score === null || score < 0 || score > 10} onClick={saveCheckin} style={{ ...button, marginTop: 12, background: '#9B675B', color: 'white', opacity: score === null ? .5 : 1 }}>Save check-in</button></>}</section>
             {activeChallenge && <section style={surface}><h3 style={{ marginTop: 0 }}>Existing food challenge: {activeChallenge.displayName}</h3><p style={{ color: '#78655D', lineHeight: 1.5 }}>Started {new Date(activeChallenge.startedAt).toLocaleString()}. Amount recorded: {activeChallenge.doseDescription || 'not recorded'}. Record only what you notice; a report does not prove cause or general tolerance.</p>{activeChallenge.observations.map((item, index) => <p key={index} style={{ fontSize: 14 }}>{new Date(item.timestamp).toLocaleString()}: {item.hasReaction ? 'Reaction reported' : 'No reaction reported'} · {item.severityScore}/10{item.symptomNotes ? ` · ${item.symptomNotes}` : ''}</p>)}<label style={{ display: 'block', fontWeight: 700 }}>Current symptom severity, 0–10<input type="number" min="0" max="10" value={reactionScore ?? ''} onChange={(event) => setReactionScore(event.target.value === '' ? null : Number(event.target.value))} style={{ ...button, display: 'block', width: '100%', marginTop: 6, boxSizing: 'border-box', fontWeight: 400 }} /></label><label style={{ display: 'block', marginTop: 12, fontWeight: 700 }}>What happened? (optional)<textarea value={reactionNote} onChange={(event) => setReactionNote(event.target.value)} rows={2} style={{ ...button, display: 'block', width: '100%', marginTop: 6, boxSizing: 'border-box', fontWeight: 400 }} /></label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}><button type="button" disabled={reactionScore === null || !Number.isFinite(reactionScore) || reactionScore < 0 || reactionScore > 10} onClick={() => saveChallengeReport(true)} style={button}>Record reaction</button><button type="button" disabled={reactionScore === null || !Number.isFinite(reactionScore) || reactionScore < 0 || reactionScore > 10} onClick={() => saveChallengeReport(false)} style={button}>Record no reaction</button></div></section>}
            {!activeChallenge && !stopped && !completed && <section style={surface}><h3 style={{ marginTop: 0 }}>Food challenges</h3><p style={{ marginBottom: 0, color: '#78655D', lineHeight: 1.5 }}>New food challenges are unavailable while the plan and its safety rules receive verified clinical review. Your existing observations remain available.</p></section>}
            {!stopped && !completed && <section style={{ ...surface, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{trial.status === 'paused' ? <button type="button" onClick={() => updateState('resume')} style={button}><Play size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />Resume record</button> : <button type="button" onClick={() => updateState('pause')} style={button}><Pause size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />Pause plan</button>}{confirmStop ? <><span>Stop this plan? Its records will remain.</span><button type="button" onClick={() => updateState('stop')} style={button}>Confirm stop</button><button type="button" onClick={() => setConfirmStop(false)} style={button}>Cancel</button></> : <button type="button" onClick={() => setConfirmStop(true)} style={button}><Square size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />Stop plan</button>}</section>}
          </>}
          {tab === 'history' && <section style={surface}><h3 style={{ marginTop: 0 }}>Recorded check-ins</h3>{observations.length ? observations.map((item) => <p key={item.date} style={{ color: '#604D45', lineHeight: 1.5 }}>{item.date}: {item.severity === null ? 'severity not recorded' : `${item.severity}/10`}{item.note ? ` · ${item.note}` : ''}</p>) : <p style={{ color: '#78655D' }}>No dated check-ins recorded. Blank dates are unknown.</p>}{challenges.length > 0 && <><h3 style={{ marginTop: 20 }}>Challenge history</h3>{challenges.map((item) => <p key={item.id} style={{ color: '#604D45' }}>{item.displayName}: {item.observations.length} observation{item.observations.length === 1 ? '' : 's'} · {item.status.replace(/_/g, ' ')}</p>)}</>}</section>}
          {tab === 'visit' && <section style={surface}><h3 style={{ marginTop: 0 }}>Visit notes</h3><p style={{ color: '#78655D', lineHeight: 1.5 }}>{observations.length} dated check-in{observations.length === 1 ? '' : 's'} and {challenges.length} challenge record{challenges.length === 1 ? '' : 's'} are available. Missing dates are not treated as symptom-free.</p><button type="button" onClick={copyVisit} style={button}><Clipboard size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />Copy visit notes</button><button type="button" onClick={openGut} style={{ ...button, marginLeft: 8 }}>Open Gut Health <ArrowRight size={15} style={{ verticalAlign: 'middle' }} /></button></section>}
        </>}
      </div>}
      {message && <p role="status" style={{ margin: '14px 0 0', color: '#78655D' }}>{message}</p>}
    </div>
  </div>;
  if (inline) return body;
  return createPortal(<FocusTrap isActive={isOpen}><div role="dialog" aria-modal="true" aria-label="Food trial records" style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'grid', placeItems: 'center', padding: 10, background: 'rgba(48,34,32,.58)' }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>{body}</div></FocusTrap>, document.body);
};

export default ClinicalEliminationModal;
