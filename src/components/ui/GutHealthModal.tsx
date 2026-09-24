import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, CalendarDays, Clipboard, Plus, Utensils, X } from 'lucide-react';
import { getGutSnapshot, formatGutVisitNote, summarizeRecordedBloating } from '../../services/GutHealthSummary';
import { DigestionCalendarHeatmap } from './DigestionCalendarHeatmap';
import { QuickMealIntakeSheet } from './QuickMealIntakeSheet';
import FocusTrap from './FocusTrap';

interface Props { isOpen: boolean; onClose: () => void; onOpenConsult?: () => void }
type Tab = 'today' | 'history' | 'visit';
const surface: React.CSSProperties = { background: 'linear-gradient(150deg,#FFFCFA,#FFF3EF)', border: '1px solid #F0DFD8', borderRadius: 20, boxShadow: '0 10px 28px rgba(104,70,55,.055)' };
const button: React.CSSProperties = { minHeight: 44, border: '1px solid #E7D7D0', borderRadius: 12, background: '#FFFDFC', color: '#5C4038', padding: '9px 14px', fontWeight: 700, fontSize: 14, cursor: 'pointer' };
const icon: React.CSSProperties = { width: 44, height: 44, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 30% 25%,#FFF,#F7DED4 72%,#ECC3B4)', color: '#9B675B', boxShadow: 'inset 0 1px 2px #FFF,0 5px 14px #C18E7950', flexShrink: 0 };

export const GutHealthModal: React.FC<Props> = ({ isOpen, onClose, onOpenConsult }) => {
  const [tab, setTab] = useState<Tab>('today');
  const [historyInitialDate, setHistoryInitialDate] = useState<string | null>(null);
  const [quickMealOpen, setQuickMealOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(() => getGutSnapshot());
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const refresh = () => setSnapshot(getGutSnapshot());
    refresh();
    window.addEventListener('hc_profile_updated', refresh);
    window.addEventListener('hc_digestion_updated', refresh);
    window.addEventListener('hc_nutrition_reaction_updated', refresh);
    return () => {
      window.removeEventListener('hc_profile_updated', refresh);
      window.removeEventListener('hc_digestion_updated', refresh);
      window.removeEventListener('hc_nutrition_reaction_updated', refresh);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || quickMealOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, quickMealOpen, onClose]);

  const copyVisitNote = async () => {
    try {
      await navigator.clipboard.writeText(formatGutVisitNote(snapshot));
      setMessage('Visit notes copied');
    } catch { setMessage('Could not copy. Please try again.'); }
  };
  const trend = summarizeRecordedBloating(snapshot);

  if (!isOpen) return null;
  return createPortal(<>
    <FocusTrap isActive={!quickMealOpen}>
      <div role="dialog" aria-modal="true" aria-label="Gut Health" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(48,34,32,.57)', display: 'grid', placeItems: 'center', padding: 10 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{ width: 'min(100%,900px)', height: 'min(94vh,950px)', background: '#FFFDFC', borderRadius: 26, border: '1px solid #E9D6CD', boxShadow: '0 30px 90px #2D191955', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#42332F' }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', borderBottom: '1px solid #F0DFD8', background: 'linear-gradient(115deg,#FFFCFA,#FBE6DD)' }}>
            <span aria-hidden="true" style={icon}><Activity size={23} /></span>
            <div style={{ flex: 1, minWidth: 0 }}><h1 className="serif-heading" style={{ margin: 0, fontSize: 24 }}>Gut Health</h1><p style={{ margin: '3px 0 0', color: '#78655D', fontSize: 13 }}>A clearer picture from what you actually record</p></div>
            <button type="button" aria-label="Close Gut Health" onClick={onClose} style={{ ...button, padding: 9, width: 44 }}><X size={19} /></button>
          </header>
          <nav aria-label="Gut Health sections" style={{ display: 'flex', padding: '10px 14px', gap: 8, borderBottom: '1px solid #F0DFD8', overflowX: 'auto' }}>
            {([['today','Today'],['history','History'],['visit','Visit notes']] as const).map(([id,label]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => { setHistoryInitialDate(null); setTab(id); }} style={{ ...button, background: tab === id ? '#F7DED4' : '#FFFDFC', borderColor: tab === id ? '#D8A999' : '#E7D7D0', whiteSpace: 'nowrap' }}>{label}</button>)}
          </nav>
          <main style={{ overflowY: 'auto', padding: '18px clamp(14px,4vw,28px)', flex: 1 }}>
            {tab === 'today' && <div style={{ display: 'grid', gap: 16, maxWidth: 760, margin: '0 auto' }}>
              <section style={{ ...surface, padding: 20 }}><h2 style={{ fontSize: 21, margin: '0 0 6px' }}>Start with one useful observation</h2><p style={{ margin: 0, color: '#78655D', lineHeight: 1.55 }}>You can record a meal or a digestion symptom. You do not need to complete a daily checklist.</p></section>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 12 }}>
                <section style={{ ...surface, padding: 18 }}><span aria-hidden="true" style={icon}><Utensils size={21} /></span><h3 style={{ margin: '12px 0 5px', fontSize: 17 }}>Meal</h3><p style={{ minHeight: 42, color: '#78655D', fontSize: 14, lineHeight: 1.5 }}>{snapshot.todayMeals.length ? `${snapshot.todayMeals.length} meal${snapshot.todayMeals.length === 1 ? '' : 's'} recorded today` : 'No meal recorded today'}</p><button type="button" onClick={() => setQuickMealOpen(true)} style={button}><Plus size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />Record a meal</button></section>
                <section style={{ ...surface, padding: 18 }}><span aria-hidden="true" style={icon}><Activity size={21} /></span><h3 style={{ margin: '12px 0 5px', fontSize: 17 }}>Digestion</h3><p style={{ minHeight: 42, color: '#78655D', fontSize: 14, lineHeight: 1.5 }}>{snapshot.todayDay ? `Recorded today${snapshot.todayDay.bloating === null ? '' : ` · bloating ${snapshot.todayDay.bloating}/10`}` : 'No digestion observation today'}</p><button type="button" onClick={() => { setHistoryInitialDate(snapshot.today); setTab('history'); }} style={button}><Plus size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />Record an observation</button></section>
              </div>
              {(snapshot.todayMeals.length > 0 || snapshot.todayDay) && <section style={{ ...surface, padding: 20 }}><h3 style={{ margin: '0 0 10px', fontSize: 17 }}>What you recorded today</h3>{snapshot.todayMeals.map((meal) => <p key={meal.id} style={{ margin: '8px 0', color: '#604D45' }}>• {meal.name}{meal.time ? ` · ${meal.time}` : ''}{meal.reaction ? ` · reported: ${meal.reaction}` : ''}</p>)}{snapshot.todayDay?.note && <p style={{ margin: '8px 0', color: '#604D45' }}>• Digestion note: {snapshot.todayDay.note}</p>}</section>}
              {(trend.current.count > 0 || trend.previous.count > 0) && <section style={{ ...surface, padding: 20 }}><h3 style={{ margin: '0 0 7px', fontSize: 17 }}>Your recorded bloating ratings</h3>{trend.comparable ? <p style={{ margin: 0, color: '#604D45', lineHeight: 1.5 }}>Last 7 days: <strong>{trend.current.average}/10</strong> across {trend.current.count} rated dates. Previous 7 days: <strong>{trend.previous.average}/10</strong> across {trend.previous.count} rated dates.</p> : <p style={{ margin: 0, color: '#604D45', lineHeight: 1.5 }}>Last 7 days: {trend.current.count} rated dates. Previous 7 days: {trend.previous.count}. A comparison will appear when each week has at least 3 ratings.</p>}<p style={{ margin: '9px 0 0', fontSize: 13, color: '#78655D', lineHeight: 1.5 }}>Only dates you rated are included. This does not identify a cause or account for unrecorded days.</p></section>}
              <p style={{ fontSize: 13, color: '#78655D', lineHeight: 1.5, margin: 0 }}>A blank day means no record. Food and symptoms appearing together do not establish cause.</p>
            </div>}
            {tab === 'history' && <DigestionCalendarHeatmap initialDate={historyInitialDate} onOpenQuickMeal={() => setQuickMealOpen(true)} onOpenConsult={onOpenConsult} />}
            {tab === 'visit' && <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 16 }}>
              <section style={{ ...surface, padding: 20, display: 'flex', gap: 13, alignItems: 'center' }}><span aria-hidden="true" style={icon}><Clipboard size={21} /></span><div><h2 style={{ margin: 0, fontSize: 21 }}>Your visit notes</h2><p style={{ margin: '4px 0 0', color: '#78655D', lineHeight: 1.5 }}>A concise record to discuss with your clinician.</p></div></section>
              <section style={{ ...surface, padding: 20 }}><p style={{ marginTop: 0 }}>{snapshot.days.length} digestion date{snapshot.days.length === 1 ? '' : 's'} and {snapshot.meals.length} meal{snapshot.meals.length === 1 ? '' : 's'} recorded.</p>{snapshot.days.length === 0 && snapshot.meals.length === 0 ? <p style={{ color: '#78655D' }}>There are no observations to summarize yet. Start with one entry when it is useful.</p> : <><h3 style={{ fontSize: 16 }}>Recent digestion</h3>{snapshot.days.slice(0, 7).map((day) => <p key={day.date} style={{ fontSize: 14, color: '#604D45', lineHeight: 1.5 }}>{day.date} · bloating {day.bloating === null ? 'unrecorded' : `${day.bloating}/10`} · discomfort {day.discomfort === null ? 'unrecorded' : `${day.discomfort}/10`}{day.note ? ` · ${day.note}` : ''}</p>)}<h3 style={{ fontSize: 16 }}>Recent meals</h3>{snapshot.meals.slice(0, 7).map((meal) => <p key={meal.id} style={{ fontSize: 14, color: '#604D45' }}>{meal.date} · {meal.name}{meal.reaction ? ` · user report: ${meal.reaction}` : ''}</p>)}</>}
                <p style={{ fontSize: 13, color: '#78655D', lineHeight: 1.5 }}>This summary uses only saved records. It does not diagnose a condition or confirm a food trigger.</p><button type="button" onClick={copyVisitNote} disabled={snapshot.days.length === 0 && snapshot.meals.length === 0} style={button}><Clipboard size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />Copy visit notes</button>{onOpenConsult && <button type="button" onClick={onOpenConsult} style={{ ...button, marginLeft: 8 }}>Open consultation</button>}{message && <p role="status" style={{ color: '#78655D' }}>{message}</p>}
              </section>
            </div>}
          </main>
          <footer style={{ borderTop: '1px solid #F0DFD8', padding: '10px 18px', color: '#8D7167', fontSize: 12, display: 'flex', alignItems: 'center', gap: 7 }}><CalendarDays size={14} /> Your records stay editable in History.</footer>
        </div>
      </div>
    </FocusTrap>
    <QuickMealIntakeSheet isOpen={quickMealOpen} onClose={() => setQuickMealOpen(false)} onMealLogged={() => setSnapshot(getGutSnapshot())} />
  </>, document.body);
};
