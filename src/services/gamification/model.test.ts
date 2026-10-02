import { describe, expect, it } from 'vitest';
import {
  activityDay,
  createLedger,
  mergeLedgers,
  normalizeLedger,
  projectLedger,
  recordActivity,
  type GamificationLedger,
} from './model';
import { earnedTrophies } from './trophies';
const date = (day: number) => new Date(Date.UTC(2026, 0, day, 12));
const fresh = () => ({ ...createLedger(), timezone: 'UTC' });
function participate(days: number, active: boolean) {
  let ledger = fresh();
  for (let day = 1; day <= days; day++) {
    ledger = recordActivity(ledger, 'garden.tended', `tend-${day}`, date(day)).ledger;
    if (active) {
      ledger = recordActivity(ledger, 'record.saved', `log-${day}`, date(day)).ledger;
      ledger = recordActivity(ledger, 'research.saved', `source-${day}`, date(day)).ledger;
    }
  }
  return ledger;
}
describe('balanced island policy', () => {
  it('caps a heavy first day at six growth, fifteen points and the starter island', () => {
    let ledger = fresh();
    for (let i = 0; i < 1000; i++)
      for (const type of [
        'record.saved',
        'reflection.saved',
        'garden.tended',
        'calm.completed',
        'research.saved',
        'preparation.saved',
        'profile.completed',
      ] as const)
        ledger = recordActivity(ledger, type, `event-${i}`, date(1)).ledger;
    expect(projectLedger(ledger, date(1))).toMatchObject({
      growth: 6,
      todayGrowth: 6,
      points: 20,
      participationDays: 1,
      stage: { level: 1 },
    });
    expect(Object.keys(ledger.receipts)).toHaveLength(7);
  });
  it('gives 3, 2 and 1 to different categories and gives no extra for another calm action', () => {
    let ledger = fresh();
    for (const [type, id, expected] of [
      ['garden.tended', 't', 3],
      ['calm.completed', 'c', 0],
      ['record.saved', 'r', 2],
      ['reflection.saved', 'f', 1],
      ['research.saved', 's', 0],
    ] as const) {
      const result = recordActivity(ledger, type, id, date(1));
      expect(result.growth).toBe(expected);
      ledger = result.ledger;
    }
    expect(earnedTrophies(ledger)).toContain('mindful_master');
  });
  it('requires time as well as growth and offers a reachable route for occasional users', () => {
    expect(projectLedger(participate(2, true)).stage.level).toBe(1);
    expect(projectLedger(participate(3, false)).stage.level).toBe(2);
    expect(projectLedger(participate(7, true)).stage.level).toBe(2);
    expect(projectLedger(participate(10, true)).stage.level).toBe(3);
    expect(projectLedger(participate(14, false)).stage.level).toBe(2);
    expect(projectLedger(participate(15, false)).stage.level).toBe(3);
    expect(projectLedger(participate(28, true)).stage.level).toBe(4);
    expect(projectLedger(participate(60, true)).stage.level).toBe(5);
  });
  it('keeps progress through a long break and does not require consecutive days', () => {
    let ledger = participate(2, false);
    ledger = recordActivity(ledger, 'garden.tended', 'return', date(100)).ledger;
    expect(projectLedger(ledger, date(300))).toMatchObject({
      growth: 9,
      participationDays: 3,
      stage: { level: 2 },
      todayGrowth: 0,
    });
    expect(earnedTrophies(ledger)).toContain('3_day_streak');
  });
  it('keeps source deduplication beyond the visible recent-history window', () => {
    const ledger = participate(180, true);
    expect(recordActivity(ledger, 'record.saved', 'log-1', date(181)).added).toBe(false);
    expect(projectLedger(ledger).history).toHaveLength(540);
  });
  it('preserves legacy points and real garden stages without turning old points into growth', () => {
    const ledger = createLedger(
      { points: 800, pointsHistory: [{ amount: 10, dedupeKey: 'old-award' }] },
      { level: 3, lastWateredDate: '2026-01-01' }
    );
    expect(projectLedger(ledger)).toMatchObject({
      points: 800,
      growth: 0,
      participationDays: 0,
      stage: { level: 3 },
    });
    expect(ledger.legacySourceKeys).toEqual(['old-award']);
    expect(
      projectLedger(
        createLedger({}, { level: 3, waterCount: 22, breathworkMinutes: 45, cleanMealsCount: 18 })
      ).stage.level
    ).toBe(1);
  });
  it('uses a stable named timezone across midnight and daylight-saving changes', () => {
    expect(activityDay(new Date('2026-01-01T20:00:00Z'), 'Asia/Calcutta')).toBe('2026-01-02');
    expect(activityDay(new Date('2026-03-08T04:30:00Z'), 'America/New_York')).toBe('2026-03-07');
    expect(activityDay(new Date('2026-03-08T07:30:00Z'), 'America/New_York')).toBe('2026-03-08');
  });
  it('rejects malformed and unknown activity receipts rather than granting growth', () => {
    const ledger = fresh();
    const parsed = normalizeLedger({
      ...ledger,
      receipts: {
        bad: { type: 'api.called', at: date(1).toISOString(), day: '2026-01-01' },
        wrong: { type: 'record.saved', at: date(1).toISOString(), day: '2026-01-02' },
      },
    });
    expect(parsed?.receipts).toEqual({});
    expect(normalizeLedger({ ...ledger, timezone: 'invalid-timezone' })).toBeUndefined();
  });
});
describe('offline reward convergence', () => {
  it('merges simultaneous devices without doubling a daily category or its points', () => {
    const base = fresh();
    let a = recordActivity(base, 'record.saved', 'a', date(1)).ledger;
    let b = recordActivity(base, 'record.saved', 'b', date(1)).ledger;
    a = recordActivity(a, 'garden.tended', 't', date(1)).ledger;
    b = recordActivity(b, 'reflection.saved', 'f', date(1)).ledger;
    const merged = mergeLedgers(a, b)!;
    expect(projectLedger(merged, date(1))).toMatchObject({
      growth: 6,
      points: 20,
      participationDays: 1,
    });
    expect(projectLedger(mergeLedgers(b, a)!).growth).toBe(6);
    expect(mergeLedgers(merged, merged)).toEqual(merged);
  });
  it('preserves unique receipts, legacy achievements and the latest atmosphere', () => {
    const a = participate(3, false),
      b: GamificationLedger = {
        ...fresh(),
        importedBadges: ['iron_lungs'],
        theme: { value: 'dusk', at: date(4).toISOString() },
      };
    const merged = mergeLedgers(a, b)!;
    expect(projectLedger(merged).theme).toBe('dusk');
    expect(earnedTrophies(merged)).toContain('iron_lungs');
    expect(Object.keys(merged.receipts)).toHaveLength(3);
    const sameTime = { ...a, theme: { value: 'blossom' as const, at: b.theme.at } };
    expect(mergeLedgers(sameTime, b)?.theme).toEqual(mergeLedgers(b, sameTime)?.theme);
  });
});
