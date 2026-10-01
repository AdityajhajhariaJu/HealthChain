import './DietEveryday.css';
export const emptyMealDetails = () => ({
  time: '',
  approximate: false,
  amount: '',
  unit: 'g',
  hunger: '',
  fullness: '',
  note: '',
});
export function mealDetailsEntry(date: string, details: ReturnType<typeof emptyMealDetails>) {
  const dateValue = new Date(`${date}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(dateValue.getTime()) ||
    dateValue.toISOString().slice(0, 10) !== date ||
    date > new Date().toLocaleDateString('en-CA')
  )
    throw new Error('Choose a real eating date that is not in the future.');
  const local = details.time ? new Date(`${date}T${details.time}:00`) : null;
  if (
    local &&
    (Number.isNaN(local.getTime()) ||
      local > new Date() ||
      `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}` !==
        details.time)
  )
    throw new Error('Choose an actual eating time that is not in the future.');
  if (
    details.amount &&
    (!Number.isFinite(Number(details.amount)) ||
      Number(details.amount) <= 0 ||
      Number(details.amount) > 5000)
  )
    throw new Error('Amount must be greater than zero and at most 5,000.');
  return {
    occurredAt: local?.toISOString() || null,
    timePrecision: local ? (details.approximate ? 'approximate' : 'exact') : 'date_only',
    amountValue: details.amount ? Number(details.amount) : undefined,
    amountUnit: details.unit,
    hunger: details.hunger ? Number(details.hunger) : null,
    fullness: details.fullness ? Number(details.fullness) : null,
    note: details.note.trim(),
  };
}
export function MealDetailsFields({
  date,
  onDate,
  value,
  onChange,
  includeAmount = true,
}: {
  date: string;
  onDate?: (date: string) => void;
  value: ReturnType<typeof emptyMealDetails>;
  onChange: (value: ReturnType<typeof emptyMealDetails>) => void;
  includeAmount?: boolean;
}) {
  const change = (key: string, next: any) => onChange({ ...value, [key]: next });
  return (
    <details className="diet-everyday">
      <summary>Time, amount and how I felt (optional)</summary>
      <div className="diet-form-grid">
        {onDate && (
          <label>
            Eating date
            <input
              type="date"
              value={date}
              max={new Date().toLocaleDateString('en-CA')}
              onChange={(e) => onDate(e.target.value)}
            />
          </label>
        )}
        <label>
          Eating time
          <input type="time" value={value.time} onChange={(e) => change('time', e.target.value)} />
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.approximate}
            onChange={(e) => change('approximate', e.target.checked)}
          />{' '}
          Time is approximate
        </label>
        {includeAmount && (
          <>
            <label>
              Amount eaten
              <input
                type="number"
                min="0.1"
                max="5000"
                step="any"
                value={value.amount}
                onChange={(e) => change('amount', e.target.value)}
              />
            </label>
            <label>
              Amount unit
              <select value={value.unit} onChange={(e) => change('unit', e.target.value)}>
                <option value="g">grams</option>
                <option value="ml">milliliters</option>
              </select>
            </label>
          </>
        )}
        {(['hunger', 'fullness'] as const).map((key) => (
          <label key={key}>
            {key === 'hunger' ? 'Hunger before eating' : 'Fullness after eating'}
            <select value={value[key]} onChange={(e) => change(key, e.target.value)}>
              <option value="">Not recorded</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                  {n === 1 ? ' · low' : n === 5 ? ' · high' : ''}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <label>
        Context or notes
        <textarea
          maxLength={500}
          value={value.note}
          onChange={(e) => change('note', e.target.value)}
          placeholder="Restaurant meal, stress, shared portion, or anything you want to remember"
        />
      </label>
      <p>
        Leave time or amount blank if unknown. A gram amount alone does not determine nutrition.
      </p>
    </details>
  );
}
