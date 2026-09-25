import React, { useEffect, useState } from 'react';
import type { GutMeal } from '../../services/GutHealthSummary';

interface Props {
  meal: GutMeal;
  onSave: (mealId: string, preparation: NonNullable<GutMeal['preparation']> | null) => Promise<boolean>;
}

const kinds: Array<{ value: NonNullable<GutMeal['preparation']>['kind']; label: string }> = [
  { value: 'ingredient_or_substitution', label: 'Ingredient or substitution' },
  { value: 'portion', label: 'Portion' },
  { value: 'fresh_or_reheated', label: 'Fresh or reheated' },
  { value: 'cooking_method', label: 'Cooking method' },
];

/** A single optional, user-confirmed fact on a repeated saved meal name. */
export const GutPreparationNote: React.FC<Props> = ({ meal, onSave }) => {
  const [kind, setKind] = useState<NonNullable<GutMeal['preparation']>['kind']>(meal.preparation?.kind || 'ingredient_or_substitution');
  const [detail, setDetail] = useState(meal.preparation?.detail || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    setKind(meal.preparation?.kind || 'ingredient_or_substitution');
    setDetail(meal.preparation?.detail || '');
  }, [meal.id, meal.preparation?.kind, meal.preparation?.detail]);

  const save = async (remove = false) => {
    if (!remove && !detail.trim()) return;
    setBusy(true);
    const ok = await onSave(meal.id, remove ? null : { kind, detail: detail.trim(), source: 'user_confirmed' });
    setBusy(false);
    setMessage(ok ? remove ? 'Preparation detail removed.' : 'Your preparation detail is saved with this meal.' : 'Could not save. Your text is still here.');
  };

  return <details style={{ margin: '9px 0', border: '1px solid #F1E5E7', borderRadius: 10, padding: '8px 10px', background: '#FFFDFC' }}>
    <summary style={{ cursor: 'pointer', color: '#AD234A', fontSize: 12, fontWeight: 750 }}>{meal.preparation ? `Your preparation detail: ${meal.preparation.detail}` : 'Was this preparation different? (optional)'}</summary>
    <p style={{ color: '#64748B', fontSize: 11.5, lineHeight: 1.4 }}>Add one detail you know. Meal names do not tell us ingredients or cooking method. You can skip this.</p>
    <div style={{ display: 'grid', gap: 7, maxWidth: 390 }}>
      <label style={{ color: '#475569', fontSize: 12 }}>What differed?
        <select value={kind} onChange={(event) => setKind(event.target.value as NonNullable<GutMeal['preparation']>['kind'])} style={{ display: 'block', width: '100%', minHeight: 40, marginTop: 4, border: '1px solid #E8D9DC', borderRadius: 8, padding: 7, background: '#FFF' }}>{kinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      </label>
      <label style={{ color: '#475569', fontSize: 12 }}>Your own words
        <input value={detail} maxLength={120} onChange={(event) => setDetail(event.target.value)} placeholder="e.g. oat milk instead of dairy" style={{ display: 'block', width: '100%', minHeight: 40, marginTop: 4, border: '1px solid #E8D9DC', borderRadius: 8, padding: '7px 10px' }} />
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" disabled={busy || !detail.trim()} onClick={() => void save()} style={{ minHeight: 40, border: 0, borderRadius: 8, background: '#AD234A', color: '#FFF', padding: '7px 12px', cursor: 'pointer' }}>Save detail</button>
        {meal.preparation && <button type="button" disabled={busy} onClick={() => void save(true)} style={{ minHeight: 40, border: '1px solid #E8D9DC', borderRadius: 8, background: '#FFF', color: '#AD234A', padding: '7px 12px', cursor: 'pointer' }}>Remove</button>}
      </div>
      {message && <p role="status" style={{ margin: 0, color: '#8D354B', fontSize: 11.5 }}>{message}</p>}
    </div>
  </details>;
};
