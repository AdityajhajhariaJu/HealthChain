import { describe, expect, it } from 'vitest';
import { previewLegacyDigestionMigration } from '../LegacyGutObservationMigration';
import { validateObservationDraft } from '../../domain/observations/types';

const scope = { ownerId: 'account-a', profileId: 'profile_1' };

describe('legacy digestion migration preview', () => {
  it('maps only explicit saved fields as date-only user reports with stable identities', () => {
    const logs = {
      '2026-09-20': { bloatingScore: 0, stomachScore: 6, bristolType: 4, stomachNotes: 'After dinner', bowelFrequency: 2 },
      '2026-09-21': { bloatingScore: null, bristolType: 9 },
      '2026-09-30': { bloatingScore: 4 },
      'bad-date': { bloatingScore: 4 },
    };
    const first = previewLegacyDigestionMigration(scope, logs, '2026-09-24');
    const again = previewLegacyDigestionMigration(scope, logs, '2026-09-24');
    expect(first.drafts).toHaveLength(4);
    expect(first.drafts.map((draft) => draft.idempotencyKey)).toEqual(again.drafts.map((draft) => draft.idempotencyKey));
    expect(first.drafts.every((draft) => draft.timePrecision === 'date_only' && draft.occurredAt === null)).toBe(true);
    expect(first.drafts.every((draft) => validateObservationDraft(draft).ok)).toBe(true);
    expect(first.drafts[0].payload).toMatchObject({ kind: 'symptom', severity: { value: 0, max: 10 } });
    expect(first.skipped.map((item) => item.field)).toEqual(expect.arrayContaining(['bowelFrequency', 'bristolType', 'record']));
  });

  it('quarantines unverified guest ownership', () => {
    const preview = previewLegacyDigestionMigration({ ownerId: 'guest', profileId: 'profile_1' }, { '2026-09-20': { bloatingScore: 4 } }, '2026-09-24');
    expect(preview.drafts).toEqual([]);
    expect(preview.skipped[0].field).toBe('owner');
  });
});
