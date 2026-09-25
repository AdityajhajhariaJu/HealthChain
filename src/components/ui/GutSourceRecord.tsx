import React, { useEffect, useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { GutDay, GutMeal } from '../../services/GutHealthSummary';
import { listObservations } from '../../services/HealthObservationService';
import type { Observation } from '../../domain/observations/types';

export interface GutSourceReference {
  sourceKind: 'diet_meal' | 'observation' | 'daily_digest';
  sourceId: string;
  localDate?: string;
}

interface Props {
  source: GutSourceReference;
  meals: GutMeal[];
  days: GutDay[];
  onBack: () => void;
  onOpenDate: (date: string) => void;
}

const row = (label: string, value: string | number | null | undefined) => value === null || value === undefined || value === '' ? null :
  <div key={label} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1fr) 2fr', gap: 10, padding: '8px 0', borderBottom: '1px solid #F1E5E7', fontSize: 13 }}><strong style={{ color: '#64748B' }}>{label}</strong><span style={{ color: '#1F2937', overflowWrap: 'anywhere' }}>{value}</span></div>;

export const GutSourceRecord: React.FC<Props> = ({ source, meals, days, onBack, onOpenDate }) => {
  const [observation, setObservation] = useState<Observation | null>(null);
  const [loading, setLoading] = useState(source.sourceKind === 'observation');

  useEffect(() => {
    if (source.sourceKind !== 'observation') { setObservation(null); setLoading(false); return; }
    let active = true;
    setObservation(null);
    setLoading(true);
    void listObservations().then((items) => { if (active) setObservation(items.find((item) => item.id === source.sourceId) || null); })
      .catch(() => { if (active) setObservation(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [source.sourceKind, source.sourceId]);

  const meal = source.sourceKind === 'diet_meal' ? meals.find((item) => item.id === source.sourceId) : null;
  const day = source.sourceKind === 'daily_digest' ? days.find((item) => `day-${item.date}` === source.sourceId) : null;
  const found = !!meal || !!day || !!observation;
  const payload = observation?.payload;
  const title = meal?.name || (day ? `Digestion on ${day.date}` : payload ? `${payload.kind.replace('_', ' ')} observation` : 'Source record');

  return <section aria-label="Exact source record" style={{ background: '#FFFDFC', border: '1px solid #F1E5E7', borderRadius: 18, padding: '18px clamp(14px,3vw,22px)', marginBottom: 16, boxShadow: '0 4px 18px rgba(189,44,88,.05)' }}>
    <button type="button" onClick={onBack} style={{ border: 0, background: 'none', color: '#AD234A', fontWeight: 750, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0 }}><ArrowLeft size={15} /> Back to records</button>
    <div style={{ color: '#AD234A', fontWeight: 800, fontSize: 11, letterSpacing: '.08em', marginTop: 18 }}>EXACT SOURCE RECORD</div>
    <h3 style={{ color: '#0F172A', margin: '5px 0 12px', fontSize: 20 }}>{title}</h3>
    {loading ? <p role="status">Loading this source record…</p> : !found ? <p role="status" style={{ color: '#8D354B' }}>This exact source record is no longer available in the current profile. No other record has been substituted.</p> : <>
      {row('Source', source.sourceKind === 'diet_meal' ? 'Diet meal' : source.sourceKind === 'daily_digest' ? 'Digestion day' : 'Health observation')}
      {row('Record ID', source.sourceId)}
      {meal && <>
        {row('Recorded date', meal.date)}{row('Meal', meal.name)}{row('Occurrence', meal.occurredAt || 'Date only; time not reported')}{row('Time precision', meal.timePrecision)}{row('Entered', meal.loggedAt)}{row('Reaction', meal.reaction)}{row('Preparation', meal.preparation?.detail)}
      </>}
      {day && <>
        {row('Date', day.date)}{row('Bloating', day.bloating === null ? null : `${day.bloating}/10`)}{row('Discomfort', day.discomfort === null ? null : `${day.discomfort}/10`)}{row('Stool form', day.stoolForm)}{row('Bowel frequency', day.bowelFrequency)}{row('Comfort', day.comfort)}{row('Distension', day.distensionPattern)}{row('Note', day.note)}
      </>}
      {observation && <>
        {row('Revision', observation.revision)}{row('Reported date', observation.localDate)}{row('Occurrence', observation.occurredAt || 'Exact time not reported')}{row('Time precision', observation.timePrecision)}{row('Entered', observation.recordedAt)}{row('Evidence', observation.evidenceType.replace(/_/g, ' '))}{row('Origin', observation.source)}{row('Original record ID', observation.sourceRecordId)}
        {payload?.kind === 'meal' && <>{row('Meal', payload.description)}{row('Amount', payload.amount ? `${payload.amount.value} ${payload.amount.unit}` : null)}{row('Ingredients', payload.ingredients?.map((item) => `${item.name} (${item.status.replace('_', ' ')})`).join(', '))}</>}
        {payload?.kind === 'symptom' && <>{row('Symptom', payload.symptom)}{row('Severity', payload.severity ? `${payload.severity.value}/${payload.severity.max}` : null)}{row('Note', payload.note)}</>}
        {payload?.kind === 'bowel' && <>{row('Stool form', payload.bristolType)}{row('Urgency', payload.urgency)}{row('Straining', payload.straining)}{row('Note', payload.note)}</>}
        {payload?.kind === 'daily_checkin' && <>{Object.entries(payload.answers).map(([key, value]) => row(key.replace(/_/g, ' '), value))}{row('Note', payload.note)}</>}
        {payload?.kind === 'context' && <>{row('Context type', payload.contextType)}{row('Description', payload.description)}</>}
      </>}
      <p style={{ display: 'flex', gap: 7, alignItems: 'flex-start', color: '#8D7167', fontSize: 12, lineHeight: 1.5 }}><ShieldCheck size={15} style={{ flexShrink: 0 }} />This is the saved source, not proof of a cause or a dose taken.</p>
      {(day || meal) && <button type="button" onClick={() => onOpenDate(day?.date || meal!.date)} style={{ border: '1px solid #F9D2D7', borderRadius: 10, background: '#FEF2F3', color: '#AD234A', padding: '8px 12px', cursor: 'pointer', fontWeight: 700 }}>Open this date in history</button>}
    </>}
  </section>;
};
