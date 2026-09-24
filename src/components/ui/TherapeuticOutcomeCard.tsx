import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, BookOpen } from 'lucide-react';
import { getActiveTrial, logTrialDay, type ActiveTrialState } from '../../services/TriggerEngine';
import { getActiveTrialV2, getHealthEvents, recordDailyObservation } from '../../services/TrialWorkflowService';
import type { TrialV2 } from '../../domain/trials/types';
import { ClinicalEliminationModal } from './ClinicalEliminationModal';

export const openEliminationSuiteModal = () => {
  window.dispatchEvent(new CustomEvent('hc_open_elimination_suite'));
};

export interface TherapeuticOutcomeCardProps {
  span2?: boolean;
}

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const TherapeuticOutcomeCard: React.FC<TherapeuticOutcomeCardProps> = ({ span2 = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [trial, setTrial] = useState<ActiveTrialState | null>(() => getActiveTrial());
  const [trialV2, setTrialV2] = useState<TrialV2 | null>(() => getActiveTrialV2());
  const [open, setOpen] = useState(false);
  const [logging, setLogging] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const refresh = () => { setTrial(getActiveTrial()); setTrialV2(getActiveTrialV2()); };
    const show = () => setOpen(true);
    window.addEventListener('hc_trial_updated', refresh);
    window.addEventListener('hc_trial_v2_updated', refresh);
    window.addEventListener('hc_open_elimination_suite', show);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('hc_trial_updated', refresh);
      window.removeEventListener('hc_trial_v2_updated', refresh);
      window.removeEventListener('hc_open_elimination_suite', show);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openElimination') !== 'true' && !(location.state as { openElimination?: boolean } | null)?.openElimination) return;
    setOpen(true);
    params.delete('openElimination');
    navigate(`${location.pathname}${params.toString() ? `?${params}` : ''}${location.hash}`, { replace: true, state: {} });
  }, [location.search, location.state, location.pathname, location.hash, navigate]);

  const entries = trialV2 ? getHealthEvents({ profileId: trialV2.profileId, trialId: trialV2.id, type: 'daily_checkin' }) : [];
  const todayEntry = [...entries].reverse().find((event) => event.payload.date === today());
  const todayScore = typeof todayEntry?.payload.severityScore === 'number' ? todayEntry.payload.severityScore : null;
  const active = trialV2 && !['paused', 'stopped', 'completed'].includes(trialV2.status);

  const saveQuickScore = (score: number) => {
    if (!trialV2) return;
    const saved = recordDailyObservation(trialV2.id, { date: today(), severityScore: score, adherenceLevel: 'unknown' });
    if (!saved) { setMessage('Could not save. Please try again.'); return; }
    if (trial) logTrialDay(score, null, 'Quick symptom check-in; diet adherence was not asked');
    setTrial(getActiveTrial());
    setTrialV2(getActiveTrialV2());
    setLogging(false);
    setMessage('Check-in recorded.');
  };

  const card: React.CSSProperties = {
    gridColumn: span2 ? 'span 2' : undefined,
    background: 'linear-gradient(140deg,#FFFCFA,#FFF3EE 72%,#F7DED4)',
    border: '1px solid #EBD4CA',
    borderRadius: 24,
    padding: '17px 19px',
    color: '#42332F',
    boxShadow: '0 6px 20px rgba(104,70,55,.07)',
    display: 'grid',
    gap: 8,
  };
  const action: React.CSSProperties = {
    minHeight: 38,
    borderRadius: 11,
    border: '1px solid #D8A999',
    background: '#FFFDFC',
    color: '#765248',
    padding: '7px 12px',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
  };

  return <>
    <section style={card} aria-label="Gut plan records">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 14, display: 'grid', placeItems: 'center', color: '#9B675B', background: 'radial-gradient(circle at 30% 25%,#FFF,#F7DED4 72%,#ECC3B4)', boxShadow: 'inset 0 1px 2px #FFF,0 4px 12px #C18E7950' }}><BookOpen size={19} /></span>
        <div style={{ flex: 1 }}>
          <h3 className="serif-heading" style={{ margin: 0, fontSize: 17 }}>Gut plan records</h3>
          <p style={{ margin: '2px 0 0', color: '#7B655D', fontSize: 12 }}>
            {trialV2 ? `${trialV2.status.replace(/_/g, ' ')} · ${entries.length} recorded check-in${entries.length === 1 ? '' : 's'}` : trial ? 'Previous plan available to review' : 'START WITH OBSERVATION'}
          </p>
        </div>
      </div>
      <p style={{ margin: 0, color: '#66554F', fontSize: 13, lineHeight: 1.45 }}>
        {todayScore !== null ? `Today’s recorded symptom score: ${todayScore}/10.` : active ? 'A short check-in is available when it helps. Blank days stay unknown.' : 'Review records or find a simple starting point.'}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
        {active && !logging && <button type="button" style={action} onClick={() => setLogging(true)}><Activity size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{todayScore === null ? 'Check in' : 'Update check-in'}</button>}
        {active && logging && <div aria-label="Choose symptom severity" style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}><span style={{ fontSize: 12 }}>Symptom score:</span>{[0, 2, 5, 8, 10].map((score) => <button type="button" key={score} style={action} onClick={() => saveQuickScore(score)}>{score}</button>)}<button type="button" style={action} onClick={() => setLogging(false)}>Cancel</button></div>}
        <button type="button" style={{ ...action, background: '#9B675B', color: 'white', borderColor: '#9B675B' }} onClick={() => setOpen(true)}>{trialV2 || trial ? 'Review records' : 'Find a starting point'} <ArrowRight size={13} style={{ verticalAlign: 'middle' }} /></button>
      </div>
      {message && <span role="status" style={{ fontSize: 12, color: '#765248' }}>{message}</span>}
    </section>
    {open && <ClinicalEliminationModal isOpen onClose={() => setOpen(false)} onTrialUpdated={(updated) => { setTrial(updated); setTrialV2(getActiveTrialV2()); }} />}
  </>;
};
