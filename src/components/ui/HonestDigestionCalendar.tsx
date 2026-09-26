import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, ChevronLeft, ChevronRight, Clipboard, Plus, X } from 'lucide-react';
import { getDigestionLogs, getProfile, saveDigestionLog } from '../../services/ProfileEngine';
import { hasRecordedDigestionEntry } from '../../services/GutHealthSummary';
import { useToast } from './ToastProvider';

export type BristolStoolType = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type StomachComfortLevel = 'calm' | 'mild_acid' | 'moderate_reflux' | 'severe_burning' | 'nausea';
export type DistensionPattern = 'flat_all_day' | 'flat_am_bloated_pm' | 'post_meal_distension' | 'persistent_distension';
export type DigestionSubTab = 'summary' | 'stomach' | 'bloating' | 'bowel';

export interface DigestionDayEntry {
  date: string;
  bloatingScore?: number;
  stomachScore?: number;
  stomachComfort?: StomachComfortLevel;
  stomachNotes?: string;
  bristolType?: BristolStoolType;
  bowelFrequency?: number;
  distensionPattern?: DistensionPattern;
  updatedAt?: string;
  [key: string]: unknown;
}

export const BRISTOL_STOOL_INFO = {
  1: { type: 1, label: 'Type 1: Hard lumps', sublabel: 'Separate hard lumps', desc: 'Separate hard lumps, like nuts.', clinicalNote: 'Recorded stool form only; this does not measure transit time.', icon: '●', badgeColor: '#9A6A52' },
  2: { type: 2, label: 'Type 2: Lumpy sausage', sublabel: 'Lumpy sausage shape', desc: 'Sausage-shaped but lumpy.', clinicalNote: 'Recorded stool form only; this does not measure transit time.', icon: '●', badgeColor: '#9A6A52' },
  3: { type: 3, label: 'Type 3: Cracked sausage', sublabel: 'Surface cracks', desc: 'Sausage-shaped with surface cracks.', clinicalNote: 'Recorded stool form only; this does not measure transit time.', icon: '●', badgeColor: '#9A6A52' },
  4: { type: 4, label: 'Type 4: Smooth and soft', sublabel: 'Smooth and soft', desc: 'Smooth, soft sausage or snake shape.', clinicalNote: 'Recorded stool form only; this does not measure transit time.', icon: '●', badgeColor: '#9A6A52' },
  5: { type: 5, label: 'Type 5: Soft blobs', sublabel: 'Soft blobs', desc: 'Separate soft blobs with clear edges.', clinicalNote: 'Recorded stool form only; this does not measure transit time.', icon: '●', badgeColor: '#9A6A52' },
  6: { type: 6, label: 'Type 6: Mushy', sublabel: 'Mushy pieces', desc: 'Fluffy pieces with ragged edges.', clinicalNote: 'Recorded stool form only; this does not measure transit time.', icon: '●', badgeColor: '#9A6A52' },
  7: { type: 7, label: 'Type 7: Watery', sublabel: 'Liquid', desc: 'Entirely liquid.', clinicalNote: 'Recorded stool form only; this does not measure transit time.', icon: '●', badgeColor: '#9A6A52' },
} as const;

export const STOMACH_COMFORT_INFO = {
  calm: { label: 'Comfortable', icon: '○', color: '#48816E' },
  mild_acid: { label: 'Mild burning', icon: '○', color: '#BD835F' },
  moderate_reflux: { label: 'Reflux', icon: '○', color: '#BD835F' },
  severe_burning: { label: 'Severe burning', icon: '○', color: '#B45E5B' },
  nausea: { label: 'Nausea', icon: '○', color: '#8C789E' },
} as const;

export const DISTENSION_PATTERN_INFO = {
  flat_all_day: { label: 'No noticeable distension' },
  flat_am_bloated_pm: { label: 'More bloated by evening' },
  post_meal_distension: { label: 'Bloating after a meal' },
  persistent_distension: { label: 'Bloating throughout the day' },
} as const;

const field: React.CSSProperties = { width: '100%', minHeight: 40, borderRadius: 12, border: '1px solid #F1E5E7', background: '#FFFDFC', color: '#0F172A', padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' };
const surface: React.CSSProperties = { background: 'linear-gradient(150deg, #FFFFFF, #FFFAFA)', border: '1px solid #F1E5E7', borderRadius: 18, boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)' };
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const isScore = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10;
const isStool = (value: unknown): value is BristolStoolType => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 7;

interface Props { onOpenQuickMeal?: () => void; onOpenConsult?: () => void; initialDate?: string | null; hideHeader?: boolean }
export const DigestionCalendarHeatmap: React.FC<Props> = ({ onOpenQuickMeal, onOpenConsult, initialDate, hideHeader }) => {
  const toast = useToast();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [logs, setLogs] = useState<Record<string, DigestionDayEntry>>(() => getDigestionLogs());
  const [profile, setProfile] = useState<any>(() => getProfile());
  const initialSelection = initialDate && initialDate <= dateKey(new Date()) ? initialDate : null;
  const [selected, setSelected] = useState<string | null>(initialSelection);
  const [draft, setDraft] = useState<Partial<DigestionDayEntry>>(() => initialSelection ? { ...(getDigestionLogs()[initialSelection] || {}) } : {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const refresh = () => { setLogs(getDigestionLogs()); setProfile(getProfile()); };
    window.addEventListener('hc_digestion_updated', refresh);
    window.addEventListener('hc_profile_updated', refresh);
    window.addEventListener('hc_nutrition_reaction_updated', refresh);
    return () => {
      window.removeEventListener('hc_digestion_updated', refresh);
      window.removeEventListener('hc_profile_updated', refresh);
      window.removeEventListener('hc_nutrition_reaction_updated', refresh);
    };
  }, []);

  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = month.getDay();
  const today = dateKey(new Date());
  const monthPrefix = dateKey(month).slice(0, 7);
  const recorded = useMemo(() => Object.entries(logs)
    .filter(([date, item]) => date.startsWith(monthPrefix) && date <= today && hasRecordedDigestionEntry(item))
    .map(([date, item]) => ({ ...item, date })), [logs, monthPrefix, today]);
  const bloatScores = recorded.map((item) => item.bloatingScore).filter(isScore);
  const stoolRecords = recorded.filter((item) => isStool(item.bristolType));
  const meals = useMemo(() => (profile?.nutrition?.recentLogs || []).filter((meal: any) =>
    selected && String(meal.date || meal.loggedAt || '').slice(0, 10) === selected), [profile, selected]);

  const openDate = (date: string) => {
    if (date > today) return;
    const existing = logs[date];
    setDraft(existing ? { ...existing } : {});
    setSelected(date);
  };

  const save = () => {
    if (!selected || selected > today) return;
    const entered = Object.fromEntries(Object.entries(draft).filter(([key, value]) =>
      key !== 'date' && value !== '' && value !== null && value !== undefined));
    if (Object.keys(entered).length === 0) {
      toast?.info?.('Add an observation before saving');
      return;
    }
    if ((entered.bloatingScore !== undefined && !isScore(entered.bloatingScore)) ||
        (entered.stomachScore !== undefined && !isScore(entered.stomachScore)) ||
        (entered.bristolType !== undefined && !isStool(entered.bristolType))) {
      toast?.error?.('Check the recorded values');
      return;
    }
    setSaving(true);
    try {
      const saved = saveDigestionLog(selected, entered);
      if (!saved) throw new Error('Save failed');
      setLogs(getDigestionLogs());
      setSelected(null);
      toast?.success?.('Observation saved');
    } catch {
      toast?.error?.('Could not save your observation. Your entry is still here.');
    } finally { setSaving(false); }
  };

  const summary = `Digestion observations — ${month.toLocaleString(undefined, { month: 'long', year: 'numeric' })}\nRecorded dates: ${recorded.length}\n${bloatScores.length ? `Average recorded bloating: ${(bloatScores.reduce((a, b) => a + b, 0) / bloatScores.length).toFixed(1)}/10 across ${bloatScores.length} rated date(s)` : 'Bloating: no ratings recorded'}\nStool form: ${stoolRecords.length} date(s) recorded\nMissing dates were not treated as symptom-free. No food trigger is inferred from this calendar.`;
  const extraObservationFields = <>
    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>What did it feel like? (optional)<select value={draft.stomachComfort ?? ''} onChange={(e) => setDraft({ ...draft, stomachComfort: e.target.value ? e.target.value as StomachComfortLevel : undefined })} style={{ ...field, marginTop: 4 }}><option value="">Not recorded</option>{Object.entries(STOMACH_COMFORT_INFO).map(([id, info]) => <option key={id} value={id}>{info.label}</option>)}</select></label>
    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>Stool form (optional)<select value={draft.bristolType ?? ''} onChange={(e) => setDraft({ ...draft, bristolType: e.target.value ? Number(e.target.value) as BristolStoolType : undefined })} style={{ ...field, marginTop: 4 }}><option value="">Not recorded</option>{Object.entries(BRISTOL_STOOL_INFO).map(([id, info]) => <option key={id} value={id}>{info.label}</option>)}</select></label>
    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>Bowel movements that day (optional)<input type="number" min="0" max="30" value={draft.bowelFrequency ?? ''} onChange={(e) => setDraft({ ...draft, bowelFrequency: e.target.value === '' ? undefined : Number(e.target.value) })} style={{ ...field, marginTop: 4 }} /></label>
    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>Notes (optional)<textarea value={draft.stomachNotes ?? ''} onChange={(e) => setDraft({ ...draft, stomachNotes: e.target.value })} rows={2} style={{ ...field, marginTop: 4, resize: 'vertical' }} /></label>
  </>;

  return <section aria-label="Digestion calendar" style={{ maxWidth: 780, margin: '0 auto', color: '#0F172A', fontFamily: 'inherit' }}>
    {!hideHeader && (
      <div style={{ ...surface, padding: '18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 14, color: '#B71945', background: 'radial-gradient(circle at 30% 25%, #FFF, #F9D2D7 70%, #ED9DB3)', boxShadow: 'inset 0 1px 2px #FFF, 0 4px 12px rgba(183, 25, 69, 0.2)' }}><Activity size={22} /></span>
          <div><h2 style={{ margin: 0, fontSize: 20, color: '#0F172A' }}>Digestion history</h2><p style={{ margin: '3px 0 0', color: '#64748B', lineHeight: 1.45, fontSize: 13.5 }}>See what you recorded. Blank dates stay blank.</p></div>
        </div>
      </div>
    )}
    <div style={{ ...surface, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
        <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={{ ...field, width: 40, minHeight: 38, padding: 6, display: 'grid', placeItems: 'center' }}><ChevronLeft size={18} /></button>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A', textAlign: 'center' }}>{month.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</h3>
        <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={{ ...field, width: 40, minHeight: 38, padding: 6, display: 'grid', placeItems: 'center' }}><ChevronRight size={18} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 5, textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: '#94A3B8' }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={index}>{day}</span>)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 5, marginTop: 7 }}>{Array.from({ length: offset }, (_, i) => <span key={`offset-${i}`} />)}{Array.from({ length: days }, (_, i) => {
        const day = i + 1; const date = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
        const entry = hasRecordedDigestionEntry(logs[date]); const future = date > today;
        return <button key={date} type="button" onClick={() => openDate(date)} disabled={future} aria-label={`${date}: ${entry ? 'recorded observation' : 'no observation'}`} style={{ minHeight: 44, borderRadius: 12, border: entry ? '1.5px solid #F9D2D7' : '1px solid #F1E5E7', background: entry ? 'linear-gradient(150deg, #FEF2F3, #FFE8EC)' : '#FFFDFC', color: future ? '#CBD5E1' : entry ? '#B71945' : '#0F172A', fontWeight: entry ? 800 : 500, cursor: future ? 'default' : 'pointer' }}>{day}{entry && <span aria-hidden="true" style={{ display: 'block', width: 5, height: 5, borderRadius: '50%', background: '#CD3153', margin: '2px auto 0' }} />}</button>;
      })}</div>
      <p style={{ color: '#64748B', fontSize: 12.5, lineHeight: 1.5, margin: '12px 0 0' }}>Select a date to add or review an observation. A mark means you saved a record, not that the day was good or bad.</p>
    </div>
    <div style={{ ...surface, padding: '16px 18px', marginTop: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
      <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, background: '#FEF2F3', border: '1px solid #F9D2D7', color: '#B71945' }}><CalendarDays size={19} /></span>
      <div style={{ flex: 1, minWidth: 190 }}><strong style={{ color: '#0F172A', fontSize: 14 }}>{recorded.length} recorded {recorded.length === 1 ? 'date' : 'dates'}</strong><div style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>{bloatScores.length ? `Average recorded bloating ${ (bloatScores.reduce((a, b) => a + b, 0) / bloatScores.length).toFixed(1)}/10 from ${bloatScores.length} ratings` : 'No bloating ratings yet'}</div><div style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>{stoolRecords.length} dates with a stool form recorded</div></div>
      <button type="button" onClick={() => navigator.clipboard.writeText(summary).then(() => toast?.success?.('Summary copied')).catch(() => toast?.error?.('Could not copy summary'))} style={{ ...field, width: 'auto', minHeight: 38, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 13, color: '#B71945' }}><Clipboard size={15} /> Copy summary</button>
    </div>
    {(onOpenQuickMeal || onOpenConsult) && !hideHeader && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>{onOpenQuickMeal && <button type="button" onClick={onOpenQuickMeal} style={{ ...field, width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Plus size={16} /> Log a meal</button>}{onOpenConsult && <button type="button" onClick={onOpenConsult} style={{ ...field, width: 'auto' }}>Prepare a visit</button>}</div>}
    {selected && <div role="dialog" aria-modal="true" aria-label={`Digestion observation for ${selected}`} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 12 }}><div style={{ ...surface, width: 'min(100%, 520px)', maxHeight: '90vh', overflowY: 'auto', padding: 22, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0, fontSize: 18, color: '#0F172A', fontWeight: 800 }}>Observation for {selected}</h3><button type="button" aria-label="Close" onClick={() => setSelected(null)} style={{ ...field, width: 36, minHeight: 36, padding: 6, display: 'grid', placeItems: 'center' }}><X size={16} /></button></div>
      <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.45, margin: '6px 0 14px' }}>Record only what you know. You can leave any field empty.</p>
      <div style={{ display: 'grid', gap: 11 }}>
        <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>Bloating, 0–10 (optional)<input type="number" min="0" max="10" value={draft.bloatingScore ?? ''} onChange={(e) => setDraft({ ...draft, bloatingScore: e.target.value === '' ? undefined : Number(e.target.value) })} style={{ ...field, marginTop: 4 }} /></label>
        <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>Stomach discomfort, 0–10 (optional)<input type="number" min="0" max="10" value={draft.stomachScore ?? ''} onChange={(e) => setDraft({ ...draft, stomachScore: e.target.value === '' ? undefined : Number(e.target.value) })} style={{ ...field, marginTop: 4 }} /></label>
        {hideHeader ? <details style={{ border:'1px solid #eedfe4', borderRadius:12, background:'#fff' }}><summary style={{ padding:'11px 12px', color:'#a9234a', fontSize:12, fontWeight:800, cursor:'pointer' }}>Add other details (optional)</summary><div style={{ display:'grid', gap:11, padding:'0 12px 12px' }}>{extraObservationFields}</div></details> : extraObservationFields}
      </div>
      {meals.length > 0 && <div style={{ marginTop: 14, borderTop: '1px solid #F1E5E7', paddingTop: 10 }}><strong>Meals already logged this date</strong>{meals.map((meal: any, index: number) => <div key={meal.id || index} style={{ marginTop: 4, color: '#64748B', fontSize: 13 }}>{meal.meal || meal.name || 'Meal'}{meal.time ? ` · ${meal.time}` : ''}</div>)}</div>}
      <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.45, margin: '12px 0 14px' }}>This record describes your observation. It does not identify a cause or measure transit time.</p>
      <button type="button" disabled={saving} onClick={save} style={{ ...field, background: 'linear-gradient(135deg, #D32C56 0%, #B31943 100%)', color: 'white', border: 'none', fontWeight: 800, boxShadow: '0 4px 14px rgba(205, 49, 83, 0.25)' }}>{saving ? 'Saving…' : 'Save observation'}</button>
    </div></div>}
  </section>;
};
