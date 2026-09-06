// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getEmpiricalFrequencyMatches,
  ELIMINATION_PROTOCOLS,
  recordConfirmedTrigger,
  getConfirmedTriggers,
} from '../TriggerEngine';

describe('TriggerEngine Expansion (Empirical Matches & 4-Week Hunts)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('calculates empirical frequency matches with match ratio text and correlation percentage', () => {
    const matches = getEmpiricalFrequencyMatches();
    expect(matches.length).toBeGreaterThanOrEqual(4);

    const besan = matches.find((m) => m.foodName.includes('Besan'));
    expect(besan).toBeDefined();
    expect(besan?.matchRatioText).toBe('4/4 day match');
    expect(besan?.correlationPercent).toBe(100);
    expect(besan?.targetedSwap).toContain('Yellow Moong');
    expect(besan?.pathophysiologicalMechanism).toContain('Galacto-oligosaccharides');

    const achaar = matches.find((m) => m.foodName.includes('Achaar'));
    expect(achaar).toBeDefined();
    expect(achaar?.matchRatioText).toBe('4/5 day match');
    expect(achaar?.correlationPercent).toBe(80);
    expect(achaar?.symptomName).toContain('Palpitations');

    const chai = matches.find((m) => m.foodName.includes('Chai'));
    expect(chai).toBeDefined();
    expect(chai?.matchRatioText).toBe('5/6 day match');
    expect(chai?.symptomName).toContain('Occipital');
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
});
