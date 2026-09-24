import React, { useEffect, useState } from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';
import { getGutSnapshot } from '../../services/GutHealthSummary';

interface SuspectFoodsViewProps {
  onStartTrial?: (protocolId: string) => void;
}

/** Legacy tab name retained for route compatibility; the view shows records, not culprit rankings. */
export const SuspectFoodsView: React.FC<SuspectFoodsViewProps> = ({ onStartTrial }) => {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener('hc_profile_updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('hc_profile_updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  void revision;
  const snapshot = getGutSnapshot();
  const surface: React.CSSProperties = { background: 'linear-gradient(145deg,#FFFCFA,#FFF3EF)', border: '1px solid #ECD9D0', borderRadius: 18, padding: 17, color: '#493830' };
  return <div style={{ display: 'grid', gap: 14 }}>
    <section style={{ ...surface, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 15, flexShrink: 0, display: 'grid', placeItems: 'center', color: '#9B675B', background: 'radial-gradient(circle at 30% 25%,#FFF,#F7DED4 72%,#ECC3B4)', boxShadow: 'inset 0 1px 2px #FFF,0 4px 12px #C18E7950' }}><BookOpen size={21} /></span>
      <div>
        <h2 className="serif-heading" style={{ margin: 0, fontSize: 21 }}>Food observations</h2>
        <p style={{ color: '#746158', lineHeight: 1.5, margin: '6px 0 0' }}>These are your recorded meals and digestion notes. A food and symptom on the same day do not establish a cause, intolerance, or safe food. Missing dates are unknown.</p>
      </div>
    </section>
    <section style={surface}>
      <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Recent meals</h3>
      {snapshot.meals.length ? snapshot.meals.slice(0, 12).map((meal) => <p key={meal.id} style={{ margin: '7px 0', lineHeight: 1.45 }}><strong>{meal.date} · {meal.name}</strong>{meal.reaction ? ` — reported: ${meal.reaction}` : ' — no reaction report'}</p>) : <p style={{ margin: 0, color: '#746158' }}>No meals recorded yet.</p>}
    </section>
    <section style={surface}>
      <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Digestion records</h3>
      {snapshot.days.length ? snapshot.days.slice(0, 12).map((day) => <p key={day.date} style={{ margin: '7px 0', lineHeight: 1.45 }}><strong>{day.date}</strong> · bloating {day.bloating === null ? 'unknown' : `${day.bloating}/10`} · discomfort {day.discomfort === null ? 'unknown' : `${day.discomfort}/10`}{day.stoolForm === null ? '' : ` · stool form ${day.stoolForm}`}{day.note ? ` · ${day.note}` : ''}</p>) : <p style={{ margin: 0, color: '#746158' }}>No digestion records yet.</p>}
    </section>
    {onStartTrial && <button type="button" onClick={() => onStartTrial('record_only')} style={{ minHeight: 44, border: '1px solid #D8A999', background: '#9B675B', color: 'white', borderRadius: 11, padding: '9px 15px', fontWeight: 700, cursor: 'pointer', justifySelf: 'start' }}>Review plan records <ArrowRight size={15} style={{ verticalAlign: 'middle' }} /></button>}
  </div>;
};
