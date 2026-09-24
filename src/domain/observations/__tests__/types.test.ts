import { describe, expect, it } from 'vitest';
import { validateObservationDraft, type ObservationDraft } from '../types';

const base: ObservationDraft = {
  ownerId: 'user-a', profileId: 'profile_1', payload: { kind: 'symptom', symptom: 'Bloating' },
  occurredAt: null, localDate: '2026-09-24', timezone: null, timePrecision: 'date_only',
  source: 'gut', evidenceType: 'user_report', idempotencyKey: 'test-1',
};

describe('observation command validation', () => {
  it('accepts date-only observations with unknown severity', () => {
    expect(validateObservationDraft(base).ok).toBe(true);
  });

  it('rejects invented time and invalid symptom scale', () => {
    const result = validateObservationDraft({ ...base, occurredAt: '2026-09-24T12:00:00Z', payload: { kind: 'symptom', symptom: 'Pain', severity: { value: 11, max: 10 } } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/date-only/i), expect.stringMatching(/severity/i)]));
  });

  it('keeps a reported doctor quote as a user report unless a located document was imported', () => {
    const result = validateObservationDraft({ ...base, source: 'ava', evidenceType: 'documented_clinician_record' });
    expect(result.ok).toBe(false);
  });

  it('rejects cross-profile linked records and nonexistent calendar dates', () => {
    const result = validateObservationDraft({ ...base, localDate: '2026-02-30', references: [{ id: 'case-1', ownerId: 'user-b', profileId: 'profile_1', kind: 'case' }] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/local date/i), expect.stringMatching(/same account/i)]));
  });

  it('distinguishes an explicit no from an unanswered daily question', () => {
    const result = validateObservationDraft({ ...base, payload: { kind: 'daily_checkin', localDate: '2026-09-24', answers: { bloating: 'no', pain: 'unanswered' } } });
    expect(result.ok).toBe(true);
  });
});
