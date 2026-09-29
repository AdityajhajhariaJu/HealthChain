import { beforeEach, describe, expect, it, vi } from 'vitest';

const records = vi.hoisted(() => ({ digestion: {} as Record<string, unknown>, profile: { nutrition: { recentLogs: [] as unknown[] } } }));
vi.mock('../ProfileEngine', () => ({ getDigestionLogs: () => records.digestion, getProfile: () => records.profile }));

import { formatGutVisitNote, getGutSnapshot, hasRecordedDigestionEntry, mergeGutSnapshotWithObservations, summarizeRecordedBloating } from '../GutHealthSummary';

describe('Gut Health recorded-data summary', () => {
  beforeEach(() => {
    records.digestion = {};
    records.profile.nutrition.recentLogs = [];
  });

  it('keeps missing scores and reactions unknown and excludes future records', () => {
    records.digestion = {
      '2026-09-23': { stomachNotes: 'Felt uncomfortable' },
      '2026-09-24': { bloatingScore: 0 },
      '2026-09-25': { bloatingScore: 10 },
    };
    records.profile.nutrition.recentLogs = [
      { id: 'a', date: '2026-09-24', meal: 'Rice and dal' },
      { id: 'b', date: '2026-09-25', meal: 'Future meal' },
    ];
    const snapshot = getGutSnapshot(new Date('2026-09-24T12:00:00'));
    expect(snapshot.days).toHaveLength(2);
    expect(snapshot.todayDay?.bloating).toBe(0);
    expect(snapshot.days[1].discomfort).toBeNull();
    expect(snapshot.meals).toHaveLength(1);
    const note = formatGutVisitNote(snapshot);
    expect(note).toContain('bloating not recorded');
    expect(note).toContain('no reaction report');
    expect(note).not.toContain('Future meal');
    expect(note).not.toMatch(/confirmed trigger/i);
  });

  it('compares only rated dates and requires coverage in both weeks', () => {
    records.digestion = {
      '2026-09-24': { bloatingScore: 0 }, '2026-09-23': { bloatingScore: 2 },
      '2026-09-22': { bloatingScore: 4 }, '2026-09-17': { bloatingScore: 8 },
      '2026-09-16': { bloatingScore: 6 }, '2026-09-15': { bloatingScore: 4 },
    };
    const snapshot = getGutSnapshot(new Date('2026-09-24T12:00:00'));
    expect(summarizeRecordedBloating(snapshot)).toEqual({
      current: { count: 3, average: 2 }, previous: { count: 3, average: 6 }, comparable: true,
    });
    delete records.digestion['2026-09-15'];
    expect(summarizeRecordedBloating(getGutSnapshot(new Date('2026-09-24T12:00:00'))).comparable).toBe(false);
  });

  it('does not count metadata alone but retains explicitly entered comfort and frequency', () => {
    records.digestion = {
      '2026-09-21': { equilibriumScore: 92, status: 'optimal', updatedAt: '2026-09-21T12:00:00Z' },
      '2026-09-22': { stomachComfort: 'nausea' },
      '2026-09-23': { bowelFrequency: 0 },
    };
    expect(hasRecordedDigestionEntry(records.digestion['2026-09-21'])).toBe(false);
    const snapshot = getGutSnapshot(new Date('2026-09-24T12:00:00'));
    expect(snapshot.days.map((day) => day.date)).toEqual(['2026-09-23', '2026-09-22']);
    expect(formatGutVisitNote(snapshot)).toContain('bowel movements: 0');
    expect(formatGutVisitNote(snapshot)).toContain('comfort: Nausea');
  });

  it('uses canonical meal identity and hides a deleted legacy projection', () => {
    records.profile.nutrition.recentLogs = [{ id: 'legacy-1', date: '2026-09-24', meal: 'Rice and dal' }];
    const base = getGutSnapshot(new Date('2026-09-24T12:00:00'));
    const canonical = { id: 'canonical-1', sourceRecordId: 'legacy-1', payload: { kind: 'meal', description: 'Rice and dal' },
      localDate: '2026-09-24', timePrecision: 'date_only', recordedAt: '2026-09-24T10:00:00Z', revision: 1, deletedAt: null } as any;
    const merged = mergeGutSnapshotWithObservations(base, [canonical]);
    expect(merged.meals.map((item) => item.id)).toEqual(['canonical-1']);
    const deleted = mergeGutSnapshotWithObservations(base, [{ ...canonical, revision: 2, deletedAt: '2026-09-24T11:00:00Z' }]);
    expect(deleted.meals).toHaveLength(0);
  });
});
