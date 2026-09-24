// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { getClinicalDietarySwap, type DietarySwap } from '../clinicalDietarySwaps';
import {
  normalizeFullMealPlan,
  normalizeMealItem,
  updateMealServing,
  editMealContent,
  applyMealClinicalSwap,
  archiveCurrentPlan,
  FullMealPlan,
} from '../dietPlanLifecycle';
import {
  getProfileEngineState,
  saveProfile,
  getProfile,
  getProfileKey,
} from '../ProfileEngine';
import { resolveTabKey, validTabs, getInitialDietProfile } from '../../features/dietician/Dietician';

describe('Diet Feature Glitches & Persistence Fixes (Tickets 1 - 7)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Unreviewed dietary swap catalogue', () => {
    it('returns no automatic clinical replacement for a food name', () => {
      expect(getClinicalDietarySwap('oats')).toBeNull();
      expect(getClinicalDietarySwap('garlic')).toBeNull();
      expect(getClinicalDietarySwap('wooden chairs')).toBeNull();
    });
  });

  describe('Ticket 3: DIET-001 & DIET-007 Normalization Timestamps & Key Stability', () => {
    it('preserves existing updatedAt instead of generating a new one on every normalization', () => {
      const existingDate = '2026-01-15T08:00:00.000Z';
      const rawPlan = {
        id: 'plan_test_preserve',
        title: 'Stable Plan',
        updatedAt: existingDate,
        lifecycle: {
          status: 'active',
          createdAt: existingDate,
          updatedAt: existingDate,
        },
        days: [],
      };

      const normalized = normalizeFullMealPlan(rawPlan);
      expect(normalized.updatedAt).toBe(existingDate);
      expect(normalized.lifecycle.updatedAt).toBe(existingDate);
    });

    it('generates deterministic stable meal IDs for meals without IDs (no Math.random thrashing)', () => {
      const mealA = normalizeMealItem({ name: 'Steamed Rice', type: 'Lunch', calories: 250 }, 0);
      const mealB = normalizeMealItem({ name: 'Steamed Rice', type: 'Lunch', calories: 250 }, 0);

      expect(mealA.id).toBe(mealB.id);
      expect(mealA.id).toBe('meal_0_steamed_rice_lunch');
    });
  });

  describe('Ticket 3 & 4: DIET-002 & DIET-005 Lifecycle Updates & Swap Flags', () => {
    it('updates nested lifecycle.updatedAt when editing meal portions or content', () => {
      const plan: FullMealPlan = {
        id: 'plan_123',
        title: 'Test',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        lifecycle: {
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        days: [
          {
            day: 1,
            total_calories: 300,
            total_protein: 15,
            total_carbs: 40,
            total_fat: 10,
            meals: [
              {
                id: 'meal_1',
                name: 'Oatmeal',
                type: 'Breakfast',
                calories: 300,
                protein: 15,
                carbs: 40,
                fat: 10,
                servingMultiplier: 1.0,
                baseCalories: 300,
                baseProtein: 15,
                baseCarbs: 40,
                baseFat: 10,
              },
            ],
          },
        ],
      };

      const updated = updateMealServing(plan, 1, 'meal_1', 1.5);
      expect(updated.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
      expect(updated.lifecycle.updatedAt).toBe(updated.updatedAt);

      const edited = editMealContent(updated, 1, 'meal_1', { name: 'Enhanced Oats' });
      expect(edited.lifecycle.updatedAt).toBe(edited.updatedAt);
      expect(edited.days[0].meals[0].name).toBe('Enhanced Oats');
    });

    it('flags swapped meals with macrosNeedReview: true for clinical integrity', () => {
      const plan: FullMealPlan = {
        id: 'plan_swap',
        title: 'Swap Test',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        lifecycle: {
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        days: [
          {
            day: 1,
            total_calories: 300,
            total_protein: 15,
            total_carbs: 40,
            total_fat: 10,
            meals: [
              {
                id: 'meal_swap_1',
                name: 'Oats',
                type: 'Breakfast',
                calories: 300,
                protein: 15,
                carbs: 40,
                fat: 10,
                servingMultiplier: 1.0,
                baseCalories: 300,
                baseProtein: 15,
                baseCarbs: 40,
                baseFat: 10,
              },
            ],
          },
        ],
      };

      const swap: DietarySwap = { triggerName: 'Oats', category: 'ADDITIVE', offendingCompound: 'User preference', biologicalMechanism: 'User note', smartReplacement: 'Chosen meal', replacementDetails: 'User selected', expectedReliefTimeline: '' };
      const swapped = applyMealClinicalSwap(plan, 1, 'meal_swap_1', swap);
      expect(swapped.days[0].meals[0].isSwapped).toBe(true);
      expect(swapped.days[0].meals[0].macrosNeedReview).toBe(true);
      expect(swapped.lifecycle.updatedAt).toBe(swapped.updatedAt);
    });
  });

  describe('Ticket 6: DIET-006 Non-Destructive Plan Archiving', () => {
    it('preserves previous revisions of the same plan when updated and re-archived', () => {
      const planV1: FullMealPlan = {
        id: 'plan_unique',
        title: 'Plan Version 1',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        lifecycle: { status: 'active', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
        days: [],
      };

      const archive1 = archiveCurrentPlan(planV1, []);
      expect(archive1.length).toBe(1);
      expect(archive1[0].id).toBe('plan_unique');

      // Now plan is edited and archived again
      const planV2: FullMealPlan = {
        ...planV1,
        title: 'Plan Version 2 (Updated)',
        updatedAt: '2026-01-10T00:00:00.000Z',
      };

      const archive2 = archiveCurrentPlan(planV2, archive1);
      // Previous version is retained as historical revision rather than wiped!
      expect(archive2.length).toBe(2);
      expect(archive2[0].title).toBe('Plan Version 2 (Updated)');
      expect(archive2[1].id).toContain('plan_unique_rev_');
    });
  });

  describe('Ticket 1: PERSIST-001 & PERSIST-003 ProfileEngine Recovery & Timestamps', () => {
    it('auto-bumps profile.updatedAt and profile.demographics.updatedAt on saveProfile', async () => {
      const profile = getProfile();
      profile.profileName = 'Test Diet User';
      await saveProfile(profile);

      const state = getProfileEngineState();
      const saved = state.profiles[state.activeId];
      expect(saved.updatedAt).toBeDefined();
      expect(saved.demographics?.updatedAt).toBe(saved.updatedAt);
    });

    it('recovers from rolling backup if primary localStorage is corrupted', () => {
      const profile = getProfile();
      profile.profileName = 'Survivor User';
      const key = getProfileKey();

      const validState = {
        activeId: 'profile_1',
        profiles: { profile_1: profile },
      };
      localStorage.setItem(key + '_backup', JSON.stringify(validState));
      // Corrupt primary key
      localStorage.setItem(key, '{ corrupted json invalid');

      const state = getProfileEngineState();
      expect(state.profiles.profile_1.profileName).toBe('Survivor User');
    });
  });

  describe('Ticket 1-3: Diet Page-Switching & Navigation Fixes', () => {
    it('safely maps elimination and elimination-suite to sensitivities without triggering navigation', () => {
      expect(resolveTabKey('elimination')).toBe('sensitivities');
      expect(resolveTabKey('elimination-suite')).toBe('sensitivities');
      expect(resolveTabKey('ELIMINATION')).toBe('sensitivities');
    });

    it('maps legacy food-detective to sensitivities and diet-plan to mealplan', () => {
      expect(resolveTabKey('food-detective')).toBe('sensitivities');
      expect(resolveTabKey('diet-plan')).toBe('mealplan');
    });

    it('preserves all 8 valid tabs without alteration', () => {
      for (const tab of validTabs) {
        expect(resolveTabKey(tab)).toBe(tab);
      }
    });

    it('defaults to dashboard on invalid or missing tab strings for deterministic root navigation', () => {
      expect(resolveTabKey(null)).toBe('dashboard');
      expect(resolveTabKey(undefined)).toBe('dashboard');
      expect(resolveTabKey('')).toBe('dashboard');
      expect(resolveTabKey('nonexistent-tab')).toBe('dashboard');
    });

    it('getInitialDietProfile synchronously derives profile from demographics to prevent OnboardingWizard flash', () => {
      const profile = getProfile();
      profile.demographics = { name: 'Aditya', age: 28, weight: 72, height: 175, gender: 'male' };
      saveProfile(profile);

      const initialDiet = getInitialDietProfile();
      expect(initialDiet).not.toBeNull();
      expect(initialDiet.weight).toBe(72);
      expect(initialDiet.targetCalories).toBeGreaterThan(1200);
    });
  });
});
