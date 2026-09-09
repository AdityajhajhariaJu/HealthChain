// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  BENCHMARK_INSIGHTS,
} from '../../components/ui/SmartCorrelationInsightsView';
import {
  JOURNEY_GOALS,
} from '../../components/ui/PersonalizedJourneyGoalSelector';
import {
  getEliminationProtocolState,
  saveEliminationProtocolState,
  saveDigestionLog,
  getDigestionLogs,
} from '../ProfileEngine';

describe('SmartCorrelationInsightsView & PersonalizedJourneyGoalSelector', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Benchmark Insights Reference Fidelity', () => {
    it('should include all benchmark items matching media_1788703634311.png', () => {
      const foods = BENCHMARK_INSIGHTS.map((i) => i.foodName.toLowerCase());
      expect(foods).toContain('eggs benedict');
      expect(foods).toContain('spinach dip');
      expect(foods).toContain('collard greens');
      expect(foods).toContain('baked beans');
    });

    it('should calculate exact day matches as depicted in the reference UI', () => {
      const eggs = BENCHMARK_INSIGHTS.find((i) => i.foodName.toLowerCase() === 'eggs benedict');
      expect(eggs).toBeDefined();
      expect(eggs?.matchingDays).toBe(4);
      expect(eggs?.totalDays).toBe(4);
      expect(`${eggs?.matchingDays}/${eggs?.totalDays} day match`).toBe('4/4 day match');

      const spinach = BENCHMARK_INSIGHTS.find((i) => i.foodName.toLowerCase() === 'spinach dip');
      expect(spinach).toBeDefined();
      expect(spinach?.matchingDays).toBe(4);
      expect(spinach?.totalDays).toBe(5);
      expect(`${spinach?.matchingDays}/${spinach?.totalDays} day match`).toBe('4/5 day match');

      const greens = BENCHMARK_INSIGHTS.find((i) => i.foodName.toLowerCase() === 'collard greens');
      expect(greens).toBeDefined();
      expect(greens?.matchingDays).toBe(3);
      expect(greens?.totalDays).toBe(3);
      expect(`${greens?.matchingDays}/${greens?.totalDays} day match`).toBe('3/3 day match');

      const beans = BENCHMARK_INSIGHTS.find((i) => i.foodName.toLowerCase() === 'baked beans');
      expect(beans).toBeDefined();
      expect(beans?.matchingDays).toBe(3);
      expect(beans?.totalDays).toBe(3);
      expect(`${beans?.matchingDays}/${beans?.totalDays} day match`).toBe('3/3 day match');
    });

    it('should contain robust clinical mechanisms and actionable Monash safe swaps', () => {
      BENCHMARK_INSIGHTS.forEach((insight) => {
        expect(insight.foodName).toBeTruthy();
        expect(insight.symptomName).toBeTruthy();
        expect(insight.biochemicalMechanism.length).toBeGreaterThan(15);
        expect(insight.clinicalCompound.length).toBeGreaterThan(3);
        expect(insight.incubationWindow).toContain('min postprandial');
        expect(insight.safeSwap.insteadOf).toBeTruthy();
        expect(insight.safeSwap.swapTo).toBeTruthy();
        expect(insight.safeSwap.culinaryNote.length).toBeGreaterThan(10);
      });
    });

    it('should include common Indian dietary staples with high clinical fidelity', () => {
      const foods = BENCHMARK_INSIGHTS.map((i) => i.foodName);
      expect(foods).toContain('Besan Chilla / Chana Dal');
      expect(foods).toContain('Garlic Naan / Allium Curries');
      expect(foods).toContain('Spicy Tomato Gravy / Chili Curry');
      expect(foods).toContain('Refined Wheat Paratha');
    });
  });

  describe('PersonalizedJourneyGoalSelector Reference Fidelity', () => {
    it('should contain exactly 4 symptom hunt goals matching media_1788703646266.png', () => {
      expect(JOURNEY_GOALS).toHaveLength(4);
      const goalIds = JOURNEY_GOALS.map((g) => g.id);
      expect(goalIds).toEqual(['bloating_hunt', 'heartburn_hunt', 'transit_hunt', 'vagal_hunt']);

      const goalNames = JOURNEY_GOALS.map((g) => g.name);
      expect(goalNames).toContain('Bloating Hunt');
      expect(goalNames).toContain('Heartburn Hunt');
      expect(goalNames).toContain('Diarrhea / Constipation Hunt');
      expect(goalNames).toContain('Stress + IBS Hunt');
    });

    it('should have 4 weeks duration for all goals as per reference design', () => {
      JOURNEY_GOALS.forEach((goal) => {
        expect(goal.durationLabel).toBe('4 weeks');
        expect(goal.emoji).toBeTruthy();
        expect(goal.description.length).toBeGreaterThan(15);
        expect(goal.badgeBg).toBeTruthy();
        expect(goal.badgeColor).toBeTruthy();
      });
    });

    it('should update active protocol state when goal is chosen', () => {
      const initial = getEliminationProtocolState();
      expect(initial.activeProtocolId).toBeNull();

      saveEliminationProtocolState('vagal_hunt', {
        startedAt: new Date().toISOString(),
      });

      const updated = getEliminationProtocolState();
      expect(updated.activeProtocolId).toBe('vagal_hunt');
    });
  });

  describe('Insights Filtering Logic', () => {
    it('filters correctly by category pills', () => {
      const stomachItems = BENCHMARK_INSIGHTS.filter((i) => i.category === 'Stomach');
      expect(stomachItems.length).toBeGreaterThanOrEqual(3);
      stomachItems.forEach((i) => expect(i.category).toBe('Stomach'));

      const bloatingItems = BENCHMARK_INSIGHTS.filter((i) => i.category === 'Bloating');
      expect(bloatingItems.length).toBeGreaterThanOrEqual(3);
      bloatingItems.forEach((i) => expect(i.category).toBe('Bloating'));
    });

    it('filters correctly by free-text search query', () => {
      const q = 'spinach';
      const results = BENCHMARK_INSIGHTS.filter(
        (i) =>
          i.foodName.toLowerCase().includes(q) ||
          i.symptomName.toLowerCase().includes(q) ||
          i.biochemicalMechanism.toLowerCase().includes(q)
      );
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].foodName).toBe('Spinach dip');
    });
  });

  describe('Dynamic Empirical Co-occurrence Calculations', () => {
    it('properly records digestion logs in ProfileEngine for live co-occurrence matching', () => {
      const dateStr = '2026-09-07';
      saveDigestionLog(dateStr, {
        equilibriumScore: 40,
        status: 'moderate_bloat',
        stomachComfort: 'cramping',
        stomachScore: 6,
        bloatingScore: 7,
        distensionPattern: 'severe_post_dinner',
        bristolType: 3,
        bowelFrequency: 1,
      });

      const logs = getDigestionLogs();
      expect(logs[dateStr]).toBeDefined();
      expect(logs[dateStr].bloatingScore).toBe(7);
      expect(logs[dateStr].stomachComfort).toBe('cramping');
      expect(logs[dateStr].distensionPattern).toBe('severe_post_dinner');
    });
  });
});
