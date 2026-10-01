import {
  DIET_EQUIPMENT,
  DIET_PURPOSES,
  DIET_VOICE_LANGUAGES,
  normalizeDietPreferences,
} from '../../../shared/diet-preferences';
import { FoodLocationFields } from '../../components/ui/FoodLocationFields';
import './DietEveryday.css';

export function DietPracticalPreferences({
  value,
  onChange,
}: {
  value: any;
  onChange: (value: any) => void;
}) {
  const p = normalizeDietPreferences(value);
  const change = (key: string, next: any) => onChange({ ...p, [key]: next });
  const toggle = (key: 'purposes' | 'equipment', item: string) =>
    change(
      key,
      p[key].includes(item)
        ? p[key].filter((value) => value !== item)
        : key === 'equipment'
          ? item === 'No cooking'
            ? [item]
            : [...p[key].filter((value) => value !== 'No cooking'), item]
          : [...p[key], item]
    );
  return (
    <div className="diet-everyday">
      <fieldset>
        <legend>What would help you?</legend>
        <div className="diet-row">
          {DIET_PURPOSES.map((item) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={p.purposes.includes(item)}
                onChange={() => toggle('purposes', item)}
              />{' '}
              {item}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        <input
          type="checkbox"
          checked={p.showNumbers}
          onChange={(e) => change('showNumbers', e.target.checked)}
        />{' '}
        Show calories and nutrient numbers
      </label>
      <div className="diet-form-grid">
        <label>
          Preparation time per meal
          <select
            value={p.maxPrepMinutes}
            onChange={(e) => change('maxPrepMinutes', Number(e.target.value))}
          >
            {[15, 30, 60].map((n) => (
              <option key={n} value={n}>
                {n} minutes or less
              </option>
            ))}
          </select>
        </label>
        <label>
          Cooking experience
          <select value={p.skill} onChange={(e) => change('skill', e.target.value)}>
            <option>Beginner</option>
            <option>Confident</option>
          </select>
        </label>
        <label>
          Shopping budget
          <select value={p.budget} onChange={(e) => change('budget', e.target.value)}>
            <option>Economical</option>
            <option>Flexible</option>
          </select>
        </label>
        <label>
          Currency (optional, 3-letter code)
          <input
            defaultValue={p.currency}
            key={p.currency}
            maxLength={3}
            placeholder="INR, USD, EUR"
            onBlur={(e) => change('currency', e.target.value.trim().toUpperCase())}
          />
        </label>
        <label>
          People sharing the recipe
          <input
            type="number"
            min={1}
            max={12}
            value={p.householdSize}
            onChange={(e) => change('householdSize', Number(e.target.value))}
          />
        </label>
        <label>
          Speech language
          <select value={p.voiceLocale} onChange={(e) => change('voiceLocale', e.target.value)}>
            <option value="">Use browser language</option>
            {Object.entries(DIET_VOICE_LANGUAGES).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Available equipment</legend>
        <div className="diet-row">
          {DIET_EQUIPMENT.map((item) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={p.equipment.includes(item)}
                onChange={() => toggle('equipment', item)}
              />{' '}
              {item}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Foods you dislike (separate with commas)
        <input
          defaultValue={p.dislikes.join(', ')}
          key={p.dislikes.join('|')}
          maxLength={1600}
          onBlur={(e) => change('dislikes', e.target.value.split(','))}
          placeholder="For preference only; save allergies in Medical Profile"
        />
      </label>
      <p>
        Economical meals favor ordinary staples and ingredient reuse. Local prices and stock are not
        known.
      </p>
      <label>
        <input
          type="checkbox"
          checked={p.usePantry}
          onChange={(e) => change('usePantry', e.target.checked)}
        />{' '}
        Use my pantry stock in planning and shopping
      </label>
      <details>
        <summary>Temporary travel location</summary>
        <FoodLocationFields
          temporary
          countryCode={p.travelCountryCode}
          region={p.travelRegion}
          onChange={(location) =>
            onChange({
              ...p,
              travelCountryCode: location.countryCode,
              travelRegion: location.region,
            })
          }
        />
        <label>
          Use this location through
          <input
            type="date"
            value={p.travelUntil}
            onChange={(e) => change('travelUntil', e.target.value)}
          />
        </label>
        <p>Your home location stays saved. Clear the travel country to end the override.</p>
      </details>
    </div>
  );
}
