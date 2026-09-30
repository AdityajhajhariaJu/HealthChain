import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MealPlanItem } from '../../services/dietPlanLifecycle';
import { MealDetailsFields, emptyMealDetails, mealDetailsEntry } from './MealDetailsFields';
import FocusTrap from '../../components/ui/FocusTrap';
export function ConfirmPlannedMeal({
  meal,
  date,
  onClose,
  onConfirm,
}: {
  meal: MealPlanItem;
  date: string;
  onClose: () => void;
  onConfirm: (date: string, ratio: number | null, details: any) => Promise<boolean>;
}) {
  const today = new Date().toLocaleDateString('en-CA');
  const [eatingDate, setEatingDate] = useState(date > today ? today : date),
    [ratio, setRatio] = useState('1'),
    [details, setDetails] = useState(emptyMealDetails),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const dismiss = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 11010,
        background: 'rgba(15,23,42,.55)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <FocusTrap isActive onEscape={dismiss} style={{ width: 'min(480px,90vw)', height: 'auto' }}>
        <div
          className="diet-everyday diet-tools"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm planned meal eaten"
          style={{ width: 'min(480px,90vw)', maxHeight: '85vh', overflowY: 'auto' }}
        >
          <h3>What did you actually eat?</h3>
          <h4>{meal.name}</h4>
          <p>
            Planning never logs food automatically. Confirm the actual date and portion; nutrient
            values remain recipe estimates.
          </p>
          <label>
            Actual eating date
            <input
              type="date"
              value={eatingDate}
              max={today}
              onChange={(event) => setEatingDate(event.target.value)}
            />
          </label>
          <label>
            Portion compared with this planned serving
            <select value={ratio} onChange={(e) => setRatio(e.target.value)}>
              <option value="">Different or unknown portion · keep nutrients unknown</option>
              {[0.5, 1, 1.5, 2].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? 'As planned' : `${n} times planned serving`}
                </option>
              ))}
            </select>
          </label>
          <MealDetailsFields date={eatingDate} value={details} onChange={setDetails} />
          <div role="status">{message}</div>
          <div className="diet-row">
            <button disabled={busy} onClick={onClose}>
              Cancel
            </button>
            <button
              disabled={busy}
              className="primary"
              onClick={async () => {
                setBusy(true);
                try {
                  const ok = await onConfirm(
                    eatingDate,
                    ratio ? Number(ratio) : null,
                    mealDetailsEntry(eatingDate, details)
                  );
                  if (ok) onClose();
                  else setMessage('Eating record was not saved. Review the date and retry.');
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : 'Meal save failed.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm meal was eaten
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>, document.body
  );
}
