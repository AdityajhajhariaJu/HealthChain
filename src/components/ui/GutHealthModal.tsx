import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, ArrowRight, CalendarDays, Clipboard, FileText, Plus, ShieldCheck, Sparkles, Utensils, X } from 'lucide-react';
import { getGutSnapshot, formatGutVisitNote, summarizeRecordedBloating } from '../../services/GutHealthSummary';
import { DigestionCalendarHeatmap } from './DigestionCalendarHeatmap';
import { QuickMealIntakeSheet } from './QuickMealIntakeSheet';
import { GutResolutionWorkspace } from './GutResolutionWorkspace';
import FocusTrap from './FocusTrap';

interface Props { isOpen: boolean; onClose: () => void; onOpenConsult?: () => void }
type Tab = 'studio' | 'records' | 'visit';
const surface: React.CSSProperties = { background: 'linear-gradient(150deg,#FFFCFA,#FFF3EF)', border: '1px solid #F0DFD8', borderRadius: 19, boxShadow: '0 8px 24px rgba(104,70,55,.055)' };
const button: React.CSSProperties = { minHeight: 44, border: '1px solid #E7D7D0', borderRadius: 12, background: '#FFFDFC', color: '#694149', padding: '9px 14px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 };
const icon: React.CSSProperties = { width: 46, height: 46, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 30% 25%,#FFF,#F5C9D5 68%,#D84970)', color: '#B71945', boxShadow: 'inset 0 1px 2px #FFF,0 5px 14px #C14E7850', flexShrink: 0 };

export const GutHealthModal: React.FC<Props> = ({ isOpen, onClose, onOpenConsult }) => {
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
      <div role="dialog" aria-modal="true" aria-label="Gut Health" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(48,34,32,.57)', display: 'grid', placeItems: 'center', padding: 10 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <div style={{ width: 'min(100%,1080px)', height: 'min(94vh,980px)', background: '#FFFDFC', borderRadius: 25, border: '1px solid #E9D6CD', boxShadow: '0 30px 90px #2D191955', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#42332F' }}>
          <header className="gr-modal-header" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '16px clamp(14px,3vw,27px)', borderBottom: '1px solid #F0DFD8', background: 'linear-gradient(115deg,#FFFCFA,#FBE7E7 60%,#FFF5EF)' }}>
            <span aria-hidden="true" style={icon}><Activity size={23} /></span>
            <div style={{ flex: 1, minWidth: 0 }}><div className="gr-modal-eyebrow" style={{ fontSize: 10, letterSpacing: '.09em', color: '#AD234A', fontWeight: 850, marginBottom: 3 }}>CLINICAL GUT WORKSPACE <Sparkles size={11} style={{ verticalAlign: 'middle' }} /></div><h1 className="serif-heading" style={{ margin: 0, fontSize: 'clamp(20px,2.6vw,27px)', color: '#242531' }}>Gut Health</h1></div>
            <span className="gr-modal-privacy" style={{ border: '1px solid #FFD0D9', borderRadius: 99, padding: '7px 11px', background: '#FFF8F9', color: '#AD234A', fontSize: 12, fontWeight: 750, display: 'flex', gap: 6, alignItems: 'center' }}><ShieldCheck size={15} /> Source linked</span>
            <button type="button" aria-label="Close Gut Health" onClick={onClose} style={{ ...button, padding: 9, width: 44 }}><X size={19} /></button>
          </header>
          <nav aria-label="Gut Health sections" style={{ display: 'flex', padding: '9px clamp(12px,3vw,27px)', gap: 7, borderBottom: '1px solid #F0DFD8', overflowX: 'auto', background: '#FFFCFB' }}>
            {([['studio','Resolution Studio',Sparkles],['records','My records',CalendarDays],['visit','Visit notes',Clipboard]] as const).map(([id,label,Icon]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setMessage(''); }} style={{ ...button, minHeight: 38, background: tab === id ? '#FFF0F4' : '#FFFDFC', borderColor: tab === id ? '#ED9DB3' : '#E8DFE1', color: tab === id ? '#AD234A' : '#6B6670', fontSize: 13, whiteSpace: 'nowrap', boxShadow: tab === id ? '0 2px 8px #D45A7D22' : 'none' }}><Icon size={15} />{label}</button>)}
          </nav>
          <main style={{ overflowY: 'auto', padding: '22px clamp(14px,4vw,32px)', flex: 1 }}>
            <div style={{ display: tab === 'studio' ? 'block' : 'none' }}><GutResolutionWorkspace onOpenHistory={openHistory} onOpenQuickMeal={() => setQuickMealOpen(true)} onOpenConsult={onOpenConsult} /></div>
            {tab === 'records' && <div style={{ maxWidth: 850, margin: '0 auto' }}>
              <div style={{ marginBottom: 18 }}><div style={{ color: '#AF264B', fontSize: 11, fontWeight: 850, letterSpacing: '.09em' }}>YOUR SOURCE RECORDS</div><h2 className="serif-heading" style={{ fontSize: 29, margin: '10px 0 4px', color: '#252834' }}>The details behind your questions</h2><p style={{ color: '#718092', fontSize: 14, margin: 0 }}>Record only what matters. Blank days and unreported outcomes remain unknown.</p></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 12, marginBottom: 18 }}>
                <section style={{ ...surface, padding: 17 }}><span aria-hidden="true" style={icon}><Utensils size={21} /></span><h3 style={{ margin: '12px 0 5px', fontSize: 17 }}>Meals</h3><p style={{ color: '#78655D', fontSize: 13, lineHeight: 1.5 }}>{snapshot.meals.length} recorded meal{snapshot.meals.length === 1 ? '' : 's'} in this profile.</p><button type="button" onClick={() => setQuickMealOpen(true)} style={button}><Plus size={15} /> Record a meal</button></section>
                <section style={{ ...surface, padding: 17 }}><span aria-hidden="true" style={icon}><Activity size={21} /></span><h3 style={{ margin: '12px 0 5px', fontSize: 17 }}>Digestion</h3><p style={{ color: '#78655D', fontSize: 13, lineHeight: 1.5 }}>{snapshot.days.length} date{snapshot.days.length === 1 ? '' : 's'} with a digestion observation.</p><button type="button" onClick={() => setHistoryInitialDate(snapshot.today)} style={button}><Plus size={15} /> Open today's date</button></section>
              </div>
              <DigestionCalendarHeatmap initialDate={historyInitialDate} onOpenQuickMeal={() => setQuickMealOpen(true)} onOpenConsult={onOpenConsult} />
              {(trend.current.count > 0 || trend.previous.count > 0) && <section style={{ ...surface, padding: 17, marginTop: 18 }}><h3 style={{ margin: '0 0 7px', fontSize: 16 }}>Your recorded bloating ratings</h3>{trend.comparable ? <p style={{ margin: 0, color: '#604D45', lineHeight: 1.5 }}>Last 7 days: <strong>{trend.current.average}/10</strong> across {trend.current.count} rated dates. Previous 7 days: <strong>{trend.previous.average}/10</strong> across {trend.previous.count} rated dates.</p> : <p style={{ margin: 0, color: '#604D45', lineHeight: 1.5 }}>Last 7 days: {trend.current.count} rated dates. Previous 7 days: {trend.previous.count}. A comparison appears when each week has at least 3 ratings.</p>}<p style={{ margin: '9px 0 0', fontSize: 13, color: '#78655D', lineHeight: 1.5 }}>Only rated dates are included. This does not identify a cause or account for unrecorded days.</p></section>}
            </div>}
            {tab === 'visit' && <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gap: 15 }}>
              <div><div style={{ color: '#AF264B', fontSize: 11, fontWeight: 850, letterSpacing: '.09em' }}>PREPARE FOR A VISIT</div><h2 className="serif-heading" style={{ margin: '10px 0 4px', color: '#252834', fontSize: 29 }}>Bring a clearer story</h2><p style={{ color: '#718092', fontSize: 14, margin: 0 }}>A saved question's brief is available from its thread. Your recorded history is available below.</p></div>
              <section style={{ ...surface, padding: 20 }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" style={icon}><FileText size={21} /></span><div><h3 style={{ margin: 0, fontSize: 17 }}>Recorded observations</h3><p style={{ color: '#78655D', fontSize: 13, margin: '3px 0 0' }}>{snapshot.days.length} digestion date{snapshot.days.length === 1 ? '' : 's'} · {snapshot.meals.length} meal{snapshot.meals.length === 1 ? '' : 's'}</p></div></div>
                {snapshot.days.length === 0 && snapshot.meals.length === 0 ? <p style={{ color: '#78655D' }}>No observations have been recorded. You can still save a question in Resolution Studio.</p> : <><h4 style={{ marginBottom: 6 }}>Recent digestion</h4>{snapshot.days.slice(0, 5).map((day) => <p key={day.date} style={{ fontSize: 13, color: '#604D45', margin: '7px 0' }}>{day.date} · bloating {day.bloating === null ? 'not rated' : `${day.bloating}/10`} · discomfort {day.discomfort === null ? 'not rated' : `${day.discomfort}/10`}</p>)}<h4 style={{ marginBottom: 6 }}>Recent meals</h4>{snapshot.meals.slice(0, 5).map((meal) => <p key={meal.id} style={{ fontSize: 13, color: '#604D45', margin: '7px 0' }}>{meal.date} · {meal.name}</p>)}</>}
                <p style={{ fontSize: 12, color: '#8D7C80', lineHeight: 1.55 }}>Missing days are not treated as symptom-free. These records do not establish a diagnosis or food cause.</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><button type="button" onClick={() => void copyVisitNote()} style={button} disabled={snapshot.days.length === 0 && snapshot.meals.length === 0}><Clipboard size={15} /> Copy recorded history</button><button type="button" onClick={() => setTab('studio')} style={button}>Open a question <ArrowRight size={15} /></button>{onOpenConsult && <button type="button" onClick={onOpenConsult} style={button}>Open consultation</button>}</div>{message && <p role="status" style={{ color: '#9D3A55', fontSize: 13 }}>{message}</p>}
              </section>
            </div>}
          </main>
          <footer className="gr-modal-footer" style={{ borderTop: '1px solid #F0DFD8', padding: '10px 18px', color: '#8D7167', fontSize: 12, display: 'flex', alignItems: 'center', gap: 7, background: '#FFFCFB' }}><ShieldCheck size={14} /> Personal observations, research and clinician records have different meanings. Inspect the source before acting.</footer>
        </div>
      </div>
    </FocusTrap>
    <QuickMealIntakeSheet isOpen={quickMealOpen} onClose={() => setQuickMealOpen(false)} onMealLogged={() => setSnapshot(getGutSnapshot())} />
  </>, document.body);
};
