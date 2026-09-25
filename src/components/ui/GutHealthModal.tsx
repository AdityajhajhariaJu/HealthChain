import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, ArrowRight, CalendarDays, Clipboard, FileText, Plus, ShieldCheck, Sparkles, Utensils, X } from 'lucide-react';
import { getGutSnapshot, formatGutVisitNote, summarizeRecordedBloating } from '../../services/GutHealthSummary';
import { DigestionCalendarHeatmap } from './DigestionCalendarHeatmap';
import { QuickMealIntakeSheet } from './QuickMealIntakeSheet';
import { GutResolutionWorkspace } from './GutResolutionWorkspace';
import FocusTrap from './FocusTrap';

interface Props { isOpen: boolean; onClose: () => void; onOpenConsult?: () => void; onOpenElimination?: () => void; onOpenDiet?: () => void; onOpenCasePrep?: (caseId: string) => void; onOpenCases?: () => void }
type Tab = 'studio' | 'records' | 'visit';
const surface: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #F1E5E7', borderRadius: 18, boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)' };
const button: React.CSSProperties = { minHeight: 38, border: '1px solid #F1E5E7', borderRadius: 11, background: '#FFFDFC', color: '#AD234A', padding: '8px 13px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 };
const icon: React.CSSProperties = { width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 30% 25%,#FFF,#F5C9D5 68%,#D84970)', color: '#B71945', boxShadow: 'inset 0 1px 2px #FFF,0 4px 12px rgba(183, 25, 69, 0.25)', flexShrink: 0 };

export const GutHealthModal: React.FC<Props> = ({ isOpen, onClose, onOpenConsult, onOpenElimination, onOpenDiet, onOpenCasePrep, onOpenCases }) => {
  const [tab, setTab] = useState<Tab>('studio');
  const [historyInitialDate, setHistoryInitialDate] = useState<string | null>(null);
  const [quickMealOpen, setQuickMealOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(() => getGutSnapshot());
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const refresh = () => setSnapshot(getGutSnapshot());
    refresh();
    for (const event of ['hc_profile_updated', 'hc_digestion_updated', 'hc_nutrition_reaction_updated']) window.addEventListener(event, refresh);
    return () => { for (const event of ['hc_profile_updated', 'hc_digestion_updated', 'hc_nutrition_reaction_updated']) window.removeEventListener(event, refresh); };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || quickMealOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, quickMealOpen, onClose]);

  const openHistory = (date?: string) => { setHistoryInitialDate(date || null); setTab('records'); };
  const copyVisitNote = async () => {
    try { await navigator.clipboard.writeText(formatGutVisitNote(snapshot)); setMessage('Recorded history copied.'); }
    catch { setMessage('Could not copy. Please try again.'); }
  };
  const trend = summarizeRecordedBloating(snapshot);

  if (!isOpen) return null;
  return createPortal(<>
    <FocusTrap isActive={!quickMealOpen}>
      <div role="dialog" aria-modal="true" aria-label="Gut Health" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 10 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <div className="gr-modal-dialog" style={{ width: 'min(100%,1320px)', height: 'min(94vh,980px)', background: '#FFFFFF', borderRadius: 24, border: '1px solid #F1E5E7', boxShadow: '0 24px 80px rgba(45, 25, 25, 0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#0F172A' }}>
          <header className="gr-modal-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px clamp(14px,3vw,24px)', borderBottom: '1px solid #F1E5E7', background: 'linear-gradient(115deg,#FFFFFF,#FFF7F8 50%,#FFFAFA)' }}>
            <span aria-hidden="true" style={icon}><Activity size={22} /></span>
            <div style={{ flex: 1, minWidth: 0 }}><div className="gr-modal-eyebrow" style={{ fontSize: 10, letterSpacing: '.09em', color: '#AD234A', fontWeight: 850, marginBottom: 2 }}>CLINICAL GUT WORKSPACE <Sparkles size={11} style={{ verticalAlign: 'middle' }} /></div><h1 className="serif-heading" style={{ margin: 0, fontSize: 'clamp(20px,2.5vw,26px)', color: '#0F172A' }}>Gut Health</h1></div>
            <span className="gr-modal-privacy" style={{ border: '1px solid #F9D2D7', borderRadius: 99, padding: '6px 11px', background: '#FEF2F3', color: '#AD234A', fontSize: 11.5, fontWeight: 750, display: 'flex', gap: 5, alignItems: 'center' }}><ShieldCheck size={14} /> Source linked</span>
            <button type="button" aria-label="Close Gut Health" onClick={onClose} style={{ ...button, padding: 8, width: 40, minHeight: 40, borderRadius: '50%', color: '#8D7167' }}><X size={18} /></button>
          </header>
          <nav aria-label="Gut Health sections" style={{ display: 'flex', padding: '8px clamp(12px,3vw,24px)', gap: 6, borderBottom: '1px solid #F1E5E7', overflowX: 'auto', background: '#FFFCFB' }}>
            {([['studio','Resolution Studio',Sparkles],['records','My records',CalendarDays],['visit','Visit notes',Clipboard]] as const).map(([id,label,Icon]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setMessage(''); }} style={{ ...button, minHeight: 40, background: tab === id ? '#FEF2F3' : '#FFFDFC', borderColor: tab === id ? '#F9D2D7' : '#F1E5E7', color: tab === id ? '#CD3153' : '#64748B', fontSize: 13.5, whiteSpace: 'nowrap', boxShadow: tab === id ? '0 2px 6px rgba(205, 49, 83, 0.12)' : 'none' }}><Icon size={16} />{label}</button>)}
          </nav>
          <main style={{ overflowY: 'auto', padding: '16px clamp(14px,3vw,26px)', flex: 1 }}>
            <div style={{ display: tab === 'studio' ? 'block' : 'none' }}><GutResolutionWorkspace onOpenHistory={openHistory} onOpenQuickMeal={() => setQuickMealOpen(true)} onOpenConsult={onOpenConsult} onOpenElimination={onOpenElimination} onOpenDiet={onOpenDiet} onOpenCasePrep={onOpenCasePrep} onOpenCases={onOpenCases} /></div>
            {tab === 'records' && <div style={{ maxWidth: 850, margin: '0 auto' }}>
              <div style={{ marginBottom: 12 }}><div style={{ color: '#AD234A', fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em' }}>YOUR SOURCE RECORDS</div><h2 className="serif-heading" style={{ fontSize: 24, margin: '6px 0 2px', color: '#0F172A' }}>The details behind your questions</h2><p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>Record only what matters. Blank days and unreported outcomes remain unknown.</p></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginBottom: 14 }}>
                <section style={{ ...surface, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" style={{ ...icon, width: 38, height: 38, borderRadius: 12 }}><Utensils size={18} /></span><div><h3 style={{ margin: 0, fontSize: 14, color: '#0F172A', fontWeight: 800 }}>Meals</h3><p style={{ color: '#64748B', fontSize: 12, margin: '2px 0 0' }}>{snapshot.meals.length} recorded meal{snapshot.meals.length === 1 ? '' : 's'}</p></div></div><button type="button" onClick={() => setQuickMealOpen(true)} style={{ ...button, minHeight: 34, padding: '6px 11px', fontSize: 12 }}><Plus size={14} /> Log meal</button></section>
                <section style={{ ...surface, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" style={{ ...icon, width: 38, height: 38, borderRadius: 12 }}><Activity size={18} /></span><div><h3 style={{ margin: 0, fontSize: 14, color: '#0F172A', fontWeight: 800 }}>Digestion</h3><p style={{ color: '#64748B', fontSize: 12, margin: '2px 0 0' }}>{snapshot.days.length} date{snapshot.days.length === 1 ? '' : 's'} recorded</p></div></div><button type="button" onClick={() => setHistoryInitialDate(snapshot.today)} style={{ ...button, minHeight: 34, padding: '6px 11px', fontSize: 12 }}><Plus size={14} /> Today's log</button></section>
              </div>
              <DigestionCalendarHeatmap hideHeader initialDate={historyInitialDate} onOpenQuickMeal={() => setQuickMealOpen(true)} onOpenConsult={onOpenConsult} />
              {(trend.current.count > 0 || trend.previous.count > 0) && <section style={{ ...surface, padding: '12px 16px', marginTop: 12 }}><h3 style={{ margin: '0 0 4px', fontSize: 14, color: '#0F172A', fontWeight: 800 }}>Your recorded bloating ratings</h3>{trend.comparable ? <p style={{ margin: 0, color: '#475569', fontSize: 12.5, lineHeight: 1.45 }}>Last 7 days: <strong>{trend.current.average}/10</strong> across {trend.current.count} rated dates. Previous 7 days: <strong>{trend.previous.average}/10</strong> across {trend.previous.count} rated dates.</p> : <p style={{ margin: 0, color: '#475569', fontSize: 12.5, lineHeight: 1.45 }}>Last 7 days: {trend.current.count} rated dates. Previous 7 days: {trend.previous.count}. A comparison appears when each week has at least 3 ratings.</p>}<p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#94A3B8', lineHeight: 1.4 }}>Only rated dates are included. This does not identify a cause or account for unrecorded days.</p></section>}
            </div>}
            {tab === 'visit' && <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gap: 14 }}>
              <div><div style={{ color: '#AD234A', fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em' }}>PREPARE FOR A VISIT</div><h2 className="serif-heading" style={{ margin: '8px 0 2px', color: '#0F172A', fontSize: 26 }}>Bring a clearer story</h2><p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>A saved question's brief is available from its thread. Your recorded history is available below.</p></div>
              <section style={{ ...surface, padding: 18 }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" style={icon}><FileText size={20} /></span><div><h3 style={{ margin: 0, fontSize: 16, color: '#0F172A', fontWeight: 800 }}>Recorded observations</h3><p style={{ color: '#64748B', fontSize: 12.5, margin: '2px 0 0' }}>{snapshot.days.length} digestion date{snapshot.days.length === 1 ? '' : 's'} · {snapshot.meals.length} meal{snapshot.meals.length === 1 ? '' : 's'}</p></div></div>
                {snapshot.days.length === 0 && snapshot.meals.length === 0 ? <p style={{ color: '#64748B', fontSize: 13 }}>No observations have been recorded. You can still save a question in Resolution Studio.</p> : <><h4 style={{ margin: '14px 0 6px', fontSize: 14, color: '#0F172A' }}>Recent digestion</h4>{snapshot.days.slice(0, 5).map((day) => <p key={day.date} style={{ fontSize: 12.5, color: '#475569', margin: '5px 0' }}>{day.date} · bloating {day.bloating === null ? 'not rated' : `${day.bloating}/10`} · discomfort {day.discomfort === null ? 'not rated' : `${day.discomfort}/10`}</p>)}<h4 style={{ margin: '12px 0 6px', fontSize: 14, color: '#0F172A' }}>Recent meals</h4>{snapshot.meals.slice(0, 5).map((meal) => <p key={meal.id} style={{ fontSize: 12.5, color: '#475569', margin: '5px 0' }}>{meal.date} · {meal.name}</p>)}</>}
                <p style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.5, margin: '12px 0' }}>Missing days are not treated as symptom-free. These records do not establish a diagnosis or food cause.</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><button type="button" onClick={() => void copyVisitNote()} style={button} disabled={snapshot.days.length === 0 && snapshot.meals.length === 0}><Clipboard size={14} /> Copy recorded history</button><button type="button" onClick={() => setTab('studio')} style={button}>Open a question <ArrowRight size={14} /></button>{onOpenConsult && <button type="button" onClick={onOpenConsult} style={button}>Open consultation</button>}</div>{message && <p role="status" style={{ color: '#AD234A', fontSize: 12.5, marginTop: 8 }}>{message}</p>}
              </section>
            </div>}
          </main>
          <footer className="gr-modal-footer" style={{ borderTop: '1px solid #F1E5E7', padding: '9px 18px', color: '#8D7167', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 6, background: '#FFFCFB' }}><ShieldCheck size={14} /> Personal observations, research and clinician records have different meanings. Inspect the source before acting.</footer>
        </div>
      </div>
    </FocusTrap>
    <QuickMealIntakeSheet isOpen={quickMealOpen} onClose={() => setQuickMealOpen(false)} onMealLogged={() => setSnapshot(getGutSnapshot())} />
  </>, document.body);
};
