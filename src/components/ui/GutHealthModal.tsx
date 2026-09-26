import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, ArrowRight, CalendarDays, Clipboard, FileText, ShieldCheck, Sparkles, Utensils, X } from 'lucide-react';
import { getGutSnapshot, formatGutVisitNote, mergeGutSnapshotWithObservations, summarizeRecordedBloating } from '../../services/GutHealthSummary';
import { listObservations } from '../../services/HealthObservationService';
import type { Observation } from '../../domain/observations/types';
import { DigestionCalendarHeatmap } from './DigestionCalendarHeatmap';
import { QuickMealIntakeSheet } from './QuickMealIntakeSheet';
import { GutResolutionWorkspace } from './GutResolutionWorkspace';
import { GutSourceRecord, type GutSourceReference } from './GutSourceRecord';
import { GutLinkStrip } from './GutLinkStrip';
import FocusTrap from './FocusTrap';
import './GutHealthModal.css';

interface Props { isOpen: boolean; initialThreadId?: string | null; onClose: () => void; onOpenConsult?: () => void; onOpenElimination?: () => void; onOpenDiet?: () => void; onOpenCasePrep?: (caseId: string) => void; onOpenCases?: () => void }
type Tab = 'studio' | 'records' | 'visit';
const surface: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #F1E5E7', borderRadius: 18, boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)' };
const button: React.CSSProperties = { minHeight: 38, border: '1px solid #F1E5E7', borderRadius: 11, background: '#FFFDFC', color: '#AD234A', padding: '8px 13px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 };
const icon: React.CSSProperties = { width: 46, height: 46, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg,#f72c5e,#c50e40)', color: '#FFFFFF', boxShadow: 'inset 0 1px 1px rgba(255,255,255,.45),0 7px 17px rgba(183,25,69,.25)', flexShrink: 0 };

export const GutHealthModal: React.FC<Props> = ({ isOpen, initialThreadId, onClose, onOpenConsult, onOpenElimination, onOpenDiet, onOpenCasePrep, onOpenCases }) => {
  const [tab, setTab] = useState<Tab>('studio');
  const [historyInitialDate, setHistoryInitialDate] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<GutSourceReference | null>(null);
  const [quickMealOpen, setQuickMealOpen] = useState(false);
  const [baseSnapshot, setBaseSnapshot] = useState(() => getGutSnapshot());
  const [observations, setObservations] = useState<Observation[]>([]);
  const snapshot = useMemo(() => mergeGutSnapshotWithObservations(baseSnapshot, observations), [baseSnapshot, observations]);
  const [message, setMessage] = useState('');
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const refresh = async () => {
      setBaseSnapshot(getGutSnapshot());
      try { const records = await listObservations(); if (active) setObservations(records); }
      catch { if (active) setObservations([]); }
    };
    void refresh();
    const events = ['hc_profile_updated', 'hc_digestion_updated', 'hc_nutrition_reaction_updated', 'hc_observations_updated'];
    for (const event of events) window.addEventListener(event, refresh);
    return () => { active = false; for (const event of events) window.removeEventListener(event, refresh); };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || quickMealOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, quickMealOpen, onClose]);

  const openHistory = (date?: string) => { setSelectedSource(null); setHistoryInitialDate(date || null); setTab('records'); mainRef.current?.scrollTo(0, 0); };
  const openSource = (source: GutSourceReference) => {
    setBaseSnapshot(getGutSnapshot());
    void listObservations().then(setObservations).catch(() => setObservations([]));
    setSelectedSource(source); setHistoryInitialDate(null); setTab('records'); mainRef.current?.scrollTo(0, 0);
  };
  const copyVisitNote = async () => {
    try { await navigator.clipboard.writeText(formatGutVisitNote(snapshot)); setMessage('Recorded history copied.'); }
    catch { setMessage('Could not copy. Please try again.'); }
  };
  const trend = summarizeRecordedBloating(snapshot);

  useEffect(() => { if (selectedSource && tab === 'visit') setTab('records'); }, [selectedSource, tab]);

  if (!isOpen) return null;
  return createPortal(<>
    <FocusTrap isActive={!quickMealOpen}>
      <div role="dialog" aria-modal="true" aria-label="Gut Health" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 10 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <div className="gr-modal-dialog" style={{ width: 'min(100%,1160px)', height: 'min(94vh,980px)', background: '#FFFFFF', borderRadius: 26, border: '1px solid #F1E5E7', boxShadow: '0 24px 80px rgba(45, 25, 25, 0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#0F172A' }}>
          <header className="gr-modal-header" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px clamp(16px,3.5vw,38px)', borderBottom: '1px solid #F1E5E7', background: 'radial-gradient(circle at 5% 10%,#fff1f4,#fffaf9 45%,#ffffff)' }}>
            <span aria-hidden="true" style={icon}><Activity size={22} /></span>
            <div style={{ flex: 1, minWidth: 0 }}><div className="gr-modal-eyebrow" style={{ fontSize: 10, letterSpacing: '.09em', color: '#AD234A', fontWeight: 850, marginBottom: 2 }}>CLINICAL GUT WORKSPACE <Sparkles size={11} style={{ verticalAlign: 'middle' }} /></div><h1 className="serif-heading" style={{ margin: 0, fontSize: 'clamp(21px,2.7vw,30px)', color: '#0F172A' }}>Gut Health</h1></div>
            <span className="gr-modal-privacy" style={{ border: '1px solid #F9D2D7', borderRadius: 99, padding: '6px 11px', background: '#FEF2F3', color: '#AD234A', fontSize: 11.5, fontWeight: 750, display: 'flex', gap: 5, alignItems: 'center' }}><ShieldCheck size={14} /> Sources shown when available</span>
            <button type="button" aria-label="Close Gut Health" onClick={onClose} style={{ ...button, padding: 8, width: 40, minHeight: 40, borderRadius: '50%', color: '#8D7167' }}><X size={18} /></button>
          </header>
          <nav aria-label="Gut Health sections" style={{ display: 'flex', padding: '10px clamp(12px,3.5vw,38px)', gap: 7, borderBottom: '1px solid #F1E5E7', overflowX: 'auto', background: '#FFFCFB' }}>
            {([['studio','My questions',Sparkles],['records','My records',CalendarDays],['visit','Visit notes',Clipboard]] as const).map(([id,label,Icon]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => { setSelectedSource(null); setTab(id); setMessage(''); }} style={{ ...button, minHeight: 41, background: tab === id ? '#FFF1F3' : '#FFFFFF', borderColor: tab === id ? '#F6A8BA' : '#E8E4E7', color: tab === id ? '#BE123C' : '#5E687B', fontSize: 13.5, whiteSpace: 'nowrap', boxShadow: tab === id ? '0 3px 9px rgba(205,49,83,.13)' : 'none' }}><Icon size={16} />{label}</button>)}
          </nav>
          <main ref={mainRef} style={{ overflowY: 'auto', padding: '24px clamp(14px,3.5vw,38px)', flex: 1 }}>
            <div style={{ display: tab === 'studio' ? 'block' : 'none' }}><GutResolutionWorkspace initialThreadId={initialThreadId} onOpenHistory={openHistory} onOpenSource={openSource} onOpenQuickMeal={() => setQuickMealOpen(true)} onOpenConsult={onOpenConsult} onOpenElimination={onOpenElimination} onOpenDiet={onOpenDiet} onOpenCasePrep={onOpenCasePrep} onOpenCases={onOpenCases} /></div>
            {tab === 'records' && <div style={{ maxWidth: 850, margin: '0 auto' }}>
            {selectedSource ? <GutSourceRecord source={selectedSource} meals={snapshot.meals} days={snapshot.days} onBack={() => setSelectedSource(null)} onOpenDate={openHistory} /> : <>
              <div style={{ marginBottom: 12 }}><div style={{ color: '#AD234A', fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em' }}>YOUR SOURCE RECORDS</div><h2 className="serif-heading" style={{ fontSize: 24, margin: '6px 0 2px', color: '#0F172A' }}>Your meals and digestion, together</h2><p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>Explore the dates you saved. Blank days stay unknown.</p></div>
              <GutLinkStrip label="From saved meals and digestion to a question" items={[{ label: 'Meals', value: `${snapshot.mealRecordCount} saved`, detail: 'Add a meal when it matters', icon: Utensils, tone: 'rose', onClick: () => setQuickMealOpen(true) }, { label: 'Digestion', value: `${snapshot.digestionDateCount} dated record${snapshot.digestionDateCount === 1 ? '' : 's'}`, detail: 'See the original dates below', icon: Activity, tone: 'violet' }, { label: 'Your questions', value: 'See what connects', detail: 'Use only what you actually reported', icon: Sparkles, tone: 'amber', onClick: () => setTab('studio') }]} />
              <h3 className="gr-records-calendar-title">Explore your dates</h3>
              <DigestionCalendarHeatmap hideHeader initialDate={historyInitialDate} onOpenQuickMeal={() => setQuickMealOpen(true)} onOpenConsult={onOpenConsult} />
              {(trend.current.count > 0 || trend.previous.count > 0) && <details className="gr-recorded-trend"><summary>See recorded bloating ratings</summary><section style={{ ...surface, padding: '12px 16px', marginTop: 9 }}>{trend.comparable ? <p style={{ margin: 0, color: '#475569', fontSize: 12.5, lineHeight: 1.45 }}>Last 7 days: <strong>{trend.current.average}/10</strong> across {trend.current.count} rated dates. Previous 7 days: <strong>{trend.previous.average}/10</strong> across {trend.previous.count} rated dates.</p> : <p style={{ margin: 0, color: '#475569', fontSize: 12.5, lineHeight: 1.45 }}>Last 7 days: {trend.current.count} rated dates. Previous 7 days: {trend.previous.count}. A comparison appears when each week has at least 3 ratings.</p>}<p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#94A3B8', lineHeight: 1.4 }}>Only rated dates are included. This does not identify a cause or account for unrecorded days.</p></section></details>}
              </>}
            </div>}
            {tab === 'visit' && <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gap: 14 }}>
              <div><div style={{ color: '#AD234A', fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em' }}>PREPARE FOR A VISIT</div><h2 className="serif-heading" style={{ margin: '8px 0 2px', color: '#0F172A', fontSize: 26 }}>Bring a clearer story</h2><p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>Bring your question and the records you actually saved.</p></div>
              <GutLinkStrip label="From your question and records to a visit note" items={[{ label: 'Your question', value: 'Open your Gut brief', detail: 'Use your own words', icon: Sparkles, tone: 'rose', onClick: () => setTab('studio') }, { label: 'Saved history', value: `${snapshot.mealRecordCount} meal${snapshot.mealRecordCount === 1 ? '' : 's'} · ${snapshot.digestionDateCount} digestion date${snapshot.digestionDateCount === 1 ? '' : 's'}`, detail: 'Only recorded details are included', icon: Utensils, tone: 'violet', onClick: () => setTab('records') }, { label: 'For your visit', value: snapshot.days.length || snapshot.mealRecordCount || snapshot.observations.length ? 'History ready to share' : 'No history saved yet', detail: 'A source-labeled note to discuss', icon: FileText, tone: 'blue' }]} />
              <div className="gr-visit-actions"><button type="button" onClick={() => void copyVisitNote()} className="gr-visit-primary" disabled={snapshot.days.length === 0 && snapshot.mealRecordCount === 0 && snapshot.observations.length === 0}><Clipboard size={16} /> Copy recorded history <ArrowRight size={16} /></button>{onOpenConsult && <button type="button" onClick={onOpenConsult} style={button}>Open consultation</button>}</div>
              {message && <p role="status" style={{ color: '#AD234A', fontSize: 12.5, margin: 0 }}>{message}</p>}
              <details className="gr-visit-detail"><summary>Inspect the records in this note</summary><section style={{ ...surface, padding: 18 }}>
                {snapshot.days.length === 0 && snapshot.meals.length === 0 && snapshot.observations.length === 0 ? <p style={{ color: '#64748B', fontSize: 13 }}>No observations have been recorded. You can still save a question in Resolution Studio.</p> : <>{snapshot.days.length > 0 && <><h4 style={{ margin: '14px 0 6px', fontSize: 14, color: '#0F172A' }}>Recent digestion</h4>{snapshot.days.slice(0, 5).map((day) => <button type="button" key={day.date} onClick={() => setSelectedSource({ sourceKind: 'daily_digest', sourceId: `day-${day.date}`, localDate: day.date })} style={{ ...button, width: '100%', justifyContent: 'flex-start', minHeight: 34, margin: '3px 0', color: '#475569', fontWeight: 600 }}>{day.date} · bloating {day.bloating === null ? 'not rated' : `${day.bloating}/10`} · discomfort {day.discomfort === null ? 'not rated' : `${day.discomfort}/10`}</button>)}</>}{snapshot.observations.filter((item) => item.payload.kind !== 'meal' && item.payload.kind !== 'context').slice(0, 5).map((item) => <button type="button" key={item.id} onClick={() => setSelectedSource({ sourceKind: 'observation', sourceId: item.id, localDate: item.localDate || undefined })} style={{ ...button, width: '100%', justifyContent: 'flex-start', minHeight: 34, margin: '3px 0', color: '#475569', fontWeight: 600 }}>{item.localDate || 'Date unknown'} · {item.payload.kind === 'symptom' ? `Reported ${item.payload.symptom}` : item.payload.kind === 'bowel' ? 'Bowel report' : 'Digestion check-in'} · Inspect source</button>)}{snapshot.observations.some((item) => item.payload.kind === 'context') && <h4 style={{ margin: '12px 0 6px', fontSize: 14, color: '#0F172A' }}>Context notes</h4>}{snapshot.observations.filter((item) => item.payload.kind === 'context').slice(0, 5).map((item) => item.payload.kind === 'context' ? <button type="button" key={item.id} onClick={() => setSelectedSource({ sourceKind: 'observation', sourceId: item.id, localDate: item.localDate || undefined })} style={{ ...button, width: '100%', justifyContent: 'flex-start', minHeight: 34, margin: '3px 0', color: '#475569', fontWeight: 600 }}>{item.localDate || 'Date unknown'} · {item.payload.contextType === 'medication' ? 'Medication note (dose not confirmed)' : `${item.payload.contextType} note`} · {item.payload.description} · Inspect source</button> : null)}{snapshot.meals.length > 0 && <h4 style={{ margin: '12px 0 6px', fontSize: 14, color: '#0F172A' }}>Recent meals</h4>}{snapshot.meals.slice(0, 5).map((meal) => <button type="button" key={meal.id} onClick={() => setSelectedSource({ sourceKind: meal.sourceKind || 'diet_meal', sourceId: meal.id, localDate: meal.date })} style={{ ...button, width: '100%', justifyContent: 'flex-start', minHeight: 34, margin: '3px 0', color: '#475569', fontWeight: 600 }}>{meal.date} · {meal.name} · {meal.sourceKind === 'observation' ? 'health observation' : 'Diet record'} <ArrowRight size={13} /></button>)}{snapshot.undatedMealObservations.length > 0 && <><h4 style={{ margin: '12px 0 6px', fontSize: 14, color: '#0F172A' }}>Meals without a date</h4>{snapshot.undatedMealObservations.map((item) => item.payload.kind === 'meal' ? <button type="button" key={item.id} onClick={() => setSelectedSource({ sourceKind: 'observation', sourceId: item.id, localDate: item.localDate || undefined })} style={{ ...button, width: '100%', justifyContent: 'flex-start', minHeight: 34, margin: '3px 0', color: '#475569', fontWeight: 600 }}>Date not recorded · {item.payload.description} · excluded from dated comparisons · Inspect source</button> : null)}</>}</>}
                <p style={{ fontSize: 11.5, color: '#7B8595', lineHeight: 1.5, margin: '12px 0 0' }}>Missing days remain unknown. These records do not establish a diagnosis or food cause.</p>
              </section></details>
            </div>}
          </main>
          <footer className="gr-modal-footer" style={{ borderTop: '1px solid #F1E5E7', padding: '9px 18px', color: '#8D7167', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 6, background: '#FFFCFB' }}><ShieldCheck size={14} /> Personal observations, research and clinician records have different meanings. Inspect the source before acting.</footer>
        </div>
      </div>
    </FocusTrap>
    <QuickMealIntakeSheet simple isOpen={quickMealOpen} onClose={() => setQuickMealOpen(false)} onMealLogged={() => { setBaseSnapshot(getGutSnapshot()); void listObservations().then(setObservations).catch(() => setObservations([])); }} />
  </>, document.body);
};
