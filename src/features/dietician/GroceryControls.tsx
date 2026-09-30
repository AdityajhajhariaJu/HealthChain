import React, { useState } from 'react';
import type { GroceryCategory } from '../../services/dietGroceryProjection';
import './DietEveryday.css';
export function GroceryControls({
  list,
  onSave,
}: {
  list: GroceryCategory[];
  onSave: (list: GroceryCategory[]) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState({ name: '', amount: '1', unit: 'piece' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (next: GroceryCategory[]) => {
    if (busy) return;
    setBusy(true);
    try {
      setMessage(
        (await onSave(next)) ? 'Shopping update saved.' : 'Shopping update was not confirmed.'
      );
    } catch {
      setMessage('Shopping update failed. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="diet-everyday diet-tools">
      <summary>Extra items and package sizes</summary>
      <p>
        Enter the pack size in the same unit as the ingredient. Pack counts round up; no prices or
        grams-per-piece are guessed.
      </p>
      <div className="diet-form-grid">
        <label>
          Extra item
          <input
            value={draft.name}
            maxLength={80}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label>
          Quantity
          <input
            type="number"
            min="0.1"
            max="100000"
            step="any"
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
          />
        </label>
        <label>
          Unit
          <select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })}>
            {['g', 'ml', 'piece'].map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </select>
        </label>
      </div>
      <button
        disabled={
          busy || !draft.name.trim() || !(Number(draft.amount) > 0) || Number(draft.amount) > 100000
        }
        onClick={() =>
          save([
            ...list,
            {
              category: 'My extra items',
              emoji: '🛒',
              items: [
                {
                  id: `manual:${crypto.randomUUID()}`,
                  name: `${draft.name.trim()} — ${draft.amount} ${draft.unit}`,
                  ingredient: draft.name.trim(),
                  amount: Number(draft.amount),
                  unit: draft.unit as any,
                  checked: false,
                  manual: true,
                },
              ],
            },
          ])
        }
      >
        Add extra shopping item
      </button>
      {list
        .flatMap((category) => category.items)
        .map((item) => (
          <div key={item.id} className="diet-row">
            <label style={{ flex: 1 }}>
              {item.ingredient} · {item.amount} {item.unit}
              {item.pantryUsed ? ` (pantry covers ${item.pantryUsed} ${item.unit})` : ''}
              <input
                type="number"
                min="0.1"
                max="100000"
                step="any"
                defaultValue={item.packageSize || ''}
                placeholder={`Pack size in ${item.unit}`}
                disabled={busy || item.manual}
                onBlur={(e) => {
                  const size = e.target.value.trim() ? Number(e.target.value) : undefined;
                  if (
                    size !== undefined &&
                    (!Number.isFinite(size) || size <= 0 || size > 100000)
                  ) {
                    setMessage('Enter a positive package size.');
                    return;
                  }
                  if (size !== item.packageSize)
                    save(
                      list.map((category) => ({
                        ...category,
                        items: category.items.map((old) =>
                          old.id === item.id ? { ...old, packageSize: size } : old
                        ),
                      }))
                    );
                }}
              />
            </label>
            {item.manual && (
              <button
                disabled={busy}
                onClick={() =>
                  save(
                    list.map((category) => ({
                      ...category,
                      items: category.items.filter((old) => old.id !== item.id),
                    }))
                  )
                }
              >
                Remove extra item
              </button>
            )}
          </div>
        ))}
      <div role="status">{message}</div>
    </details>
  );
}
