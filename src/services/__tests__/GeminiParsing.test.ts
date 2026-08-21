import { describe, expect, it } from 'vitest';
import { parseModelJson } from '../geminiService';

describe('parseModelJson', () => {
  it('extracts a complete nested object from surrounding model prose', () => {
    const result = parseModelJson<{ items: Array<{ label: string }> }>(
      'Here is the result:\n```json\n{"items":[{"label":"fatigue"}]}\n```\n'
    );
    expect(result).toEqual({ items: [{ label: 'fatigue' }] });
  });

  it('does not greedily join two adjacent JSON values', () => {
    const result = parseModelJson<{ ok: boolean }>('prefix {"ok":true} suffix {"ignored":true}');
    expect(result).toEqual({ ok: true });
  });

  it('returns the fallback for malformed output', () => {
    expect(parseModelJson('not json', { safe: true })).toEqual({ safe: true });
  });
});
