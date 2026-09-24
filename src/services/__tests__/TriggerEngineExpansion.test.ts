// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getEmpiricalFrequencyMatches,
  ELIMINATION_PROTOCOLS,
  recordConfirmedTrigger,
  getConfirmedTriggers,
  getActiveTrial,
  getTrialHistory,
  logTrialDay,
  startTrial,
} from '../TriggerEngine';

describe('TriggerEngine Expansion (Empirical Matches & 4-Week Hunts)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('does not manufacture empirical matches when no observations exist', () => {
    const matches = getEmpiricalFrequencyMatches();
    expect(matches).toEqual([]);
  });

  it('includes patient-confirmed triggers into empirical frequency matches', () => {
    recordConfirmedTrigger({
      food: 'Spicy Samosa',
      symptom: 'Acid Surge',
      sensitivity: 'Refined Carbs & Seed Oil',
    });

    const confirmed = getConfirmedTriggers();
    expect(confirmed.some((c) => c.food === 'Spicy Samosa')).toBe(true);

    const matches = getEmpiricalFrequencyMatches();
    const userMatch = matches.find((m) => m.foodName === 'Spicy Samosa');
    expect(userMatch).toBeDefined();
    expect(userMatch?.symptomName).toBe('Acid Surge');
    expect(userMatch?.matchRatioText).toBe('1 recorded observation');
    expect(userMatch?.correlationPercent).toBe(0);
  });

  it('provides 5 structured 28-day clinical symptom hunts with 4-phase protocols', () => {
    const hunts = ELIMINATION_PROTOCOLS.filter((p) => p.durationDays === 28);
    expect(hunts).toHaveLength(5);

    const bloatHunt = hunts.find((h) => h.id === 'hunt_bloat');
    expect(bloatHunt).toBeDefined();
    expect(bloatHunt?.huntTitle).toContain('The Bloating Hunt');
    expect(bloatHunt?.phases).toHaveLength(4);
    expect(bloatHunt?.phases?.[0].title).toContain('Phase 1');
    expect(bloatHunt?.phases?.[2].title).toContain('Challenge');
    expect(bloatHunt?.dailyChecklist?.length).toBeGreaterThanOrEqual(3);

    const heartburnHunt = hunts.find((h) => h.id === 'hunt_heartburn');
    expect(heartburnHunt).toBeDefined();
    expect(heartburnHunt?.huntTitle).toContain('Heartburn');

    const histamineHunt = hunts.find((h) => h.id === 'hunt_histamine');
    expect(histamineHunt).toBeDefined();
    expect(histamineHunt?.huntTitle).toContain('Histamine');

    const kineticHunt = hunts.find((h) => h.id === 'hunt_kinetic_headache');
    expect(kineticHunt).toBeDefined();
    expect(kineticHunt?.huntTitle).toContain('Kinetic Cephalgia');

    const potsHunt = hunts.find((h) => h.id === 'hunt_pots_splanchnic');
    expect(potsHunt).toBeDefined();
    expect(potsHunt?.huntTitle).toContain('POTS');
  });

  it('requires an explicit valid protocol before accepting a check-in', () => {
    expect(() => startTrial('not-a-real-protocol')).toThrow(/Unknown elimination protocol/);
    expect(getActiveTrial()).toBeNull();
    expect(() => logTrialDay(4, true)).toThrow(/Start an elimination protocol/);
  });

  it('rejects direct starts for every unreviewed protocol', () => {
    for (const protocol of ELIMINATION_PROTOCOLS) {
      expect(() => startTrial(protocol.id)).toThrow(/verified clinical review/i);
      expect(protocol.governance?.reviewedBy).toBeUndefined();
      expect(protocol.governance?.reviewedAt).toBeUndefined();
    }
    expect(getActiveTrial()).toBeNull();
    expect(getTrialHistory()).toHaveLength(0);
  });

  it('guarantees clinical governance, abundance definitions, and non-overclaiming impact statements across all 11 protocols', () => {
    expect(ELIMINATION_PROTOCOLS).toHaveLength(11);

    ELIMINATION_PROTOCOLS.forEach((proto) => {
      expect(proto.id).toBeTruthy();
      expect(proto.name).toBeTruthy();
      expect(proto.targetSensitivity).toBeTruthy();
      expect(proto.eliminatedFoods.length).toBeGreaterThanOrEqual(1);
      expect(proto.allowedAlternatives.length).toBeGreaterThanOrEqual(1);

      // Truthful observational impact statement: no fabricated percentages or cure promises
      expect(proto.expectedBiomarkerImpact).toBeTruthy();
      expect(proto.expectedBiomarkerImpact).not.toMatch(/100%|cure|guaranteed|zero symptoms/i);

      // Governance metadata (TICKET-202)
      expect(proto.governance).toBeDefined();
      expect(proto.governance?.intendedUse).toBeTruthy();
      expect(proto.governance?.notFor.length).toBeGreaterThanOrEqual(2);
      expect(proto.governance?.evidenceScope).toBeTruthy();
      expect(proto.governance?.sourceReferences.length).toBeGreaterThanOrEqual(1);
      expect(proto.governance?.challengeRules.minimumBaselineDays).toBeGreaterThanOrEqual(1);
      expect(proto.governance?.challengeRules.observationWindowHours).toBeGreaterThanOrEqual(24);
      expect(proto.governance?.challengeRules.recoveryDaysBetweenChallenges).toBeGreaterThanOrEqual(1);
      expect(proto.governance?.contentVersion).toBe('2.0.0');
    });
  });
});
