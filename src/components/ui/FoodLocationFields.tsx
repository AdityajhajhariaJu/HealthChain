import React, { useId } from 'react';
import { COUNTRY_CODES, countryName } from '../../../shared/food-location';

const countryOptions = COUNTRY_CODES.map(code => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name, 'en'));

export function FoodLocationFields({ countryCode, region, onChange, required = false }: {
  countryCode: string;
  region: string;
  onChange: (location: { countryCode: string; region: string }) => void;
  required?: boolean;
}) {
  const id = useId();
  const fieldStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '12px', border: '1px solid #CBD5E1', borderRadius: 12, background: '#FFFFFF', color: '#0F172A', fontSize: 15 };
  return <fieldset style={{ minWidth: 0, border: '1px solid #D1FAE5', borderRadius: 16, padding: 16, margin: '0 0 18px', background: '#F0FDFA' }}>
    <legend style={{ padding: '0 6px', fontWeight: 800, color: '#0F172A', fontSize: 15 }}>Where do you live?</legend>
    <p id={`${id}-help`} style={{ margin: '0 0 12px', color: '#475569', fontSize: 13, lineHeight: 1.5 }}>Choose your current country so meals use familiar, locally available ingredients. Add a state or region for local dishes.</p>
    <label htmlFor={`${id}-country`} style={{ display: 'block', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Country / territory{required ? '' : ' (optional)'}</label>
    <select id={`${id}-country`} value={countryCode} required={required} aria-describedby={`${id}-help`} onChange={event => onChange({ countryCode: event.target.value, region: '' })} style={fieldStyle}>
      <option value="">Select your country</option>
      {countryOptions.map(option => <option key={option.code} value={option.code}>{option.name}</option>)}
    </select>
    <label htmlFor={`${id}-region`} style={{ display: 'block', fontWeight: 700, fontSize: 13, margin: '12px 0 6px' }}>State / region (optional)</label>
    <input id={`${id}-region`} value={region} disabled={!countryCode} maxLength={80} autoComplete="address-level1" placeholder="e.g. Tamil Nadu, California, Bavaria" onChange={event => onChange({ countryCode, region: event.target.value })} style={fieldStyle} />
  </fieldset>;
}
