// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import {
  migrateLegacyTrialToV2,
  getActiveTrialV2,
  saveActiveTrialV2,
  appendHealthEvent,
  getHealthEvents,
  evaluateChallengeReadiness,
  startFoodChallenge,
  recordChallengeObservation,
  completeFoodChallenge,
  getChecklistCompletion,
  toggleChecklistTask,
  pauseTrialV2,
  resumeTrialV2,
  stopTrialV2,
  findTrialById,
  recordDailyObservation,
  startNewTrialV2
} from '../../../services/TrialWorkflowService';

describe('TrialWorkflowService & TrialV2 Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('hc_unified_profile', JSON.stringify({ activeId: 'profile_1', profiles: { profile_1: { id: 'profile_1', profileName: 'Test' } } }));
  });

  it('migrates a legacy trial without losing currentDay or scores', () => {
    const legacy = {
      id: 'legacy_123',
      trialId: 'hunt_bloat',
      startDate: '2026-09-01T00:00:00Z',
      totalDays: 28,
      currentDay: 8,
      symptomScores: [
        { day: 1, severity: 7, adhered: true },
        { day: 2, severity: 6, adhered: true },
      ],
      baselineSeverity: 7,
    };

    const v2 = migrateLegacyTrialToV2(legacy, 'profile_test');
    expect(v2.schemaVersion).toBe(2);
    expect(v2.protocolId).toBe('hunt_bloat');
    expect(v2.currentElapsedDays).toBe(8);
    expect(v2.baseline.completedObservations).toBe(0);
    expect(v2.baseline.baselineSeverity).toBe(7);
    expect(v2.status).toBe('baseline');
    expect(v2.consent.acceptedAt).toBeUndefined();
    expect(v2.consent.acknowledgedLimitations).toBe(false);
  });

  it('appends health events with idempotency keys', () => {
    const evt1 = appendHealthEvent({
      profileId: 'profile_1',
      trialId: 't1',
      type: 'meal_logged',
      occurredAt: '2026-09-18T12:00:00Z',
      timezone: 'UTC',
      source: 'diet',
      payload: { meal: 'Moong Khichdi' },
      idempotencyKey: 'idem_key_1',
    });

    const evt2 = appendHealthEvent({
      profileId: 'profile_1',
      trialId: 't1',
      type: 'meal_logged',
      occurredAt: '2026-09-18T12:00:00Z',
      timezone: 'UTC',
      source: 'diet',
      payload: { meal: 'Moong Khichdi Duplicate' },
      idempotencyKey: 'idem_key_1',
    });

    expect(evt1.id).toBe(evt2.id);

    const events = getHealthEvents({ profileId: 'profile_1', trialId: 't1' });
    expect(events).toHaveLength(1);
    expect(events[0].payload.meal).toBe('Moong Khichdi');
  });

  it('evaluates readiness gates: requires minimum observations and does not advance prematurely', () => {
    const trial = migrateLegacyTrialToV2({
      trialId: 'hunt_bloat',
      startDate: '2026-09-01T00:00:00Z',
      currentDay: 15, // Calendar day 15!
      totalDays: 28,
    }, 'profile_1');
    trial.id = 'trial_gate_test';
    trial.baseline.requiredObservations = 5;
    saveActiveTrialV2(trial);

    // With 0 observations, readiness MUST be false despite being Day 15!
    const readinessEmpty = evaluateChallengeReadiness(trial);
    expect(readinessEmpty.ready).toBe(false);
    expect(readinessEmpty.reason).toMatch(/Recorded 0 of 5/);

    // Log 5 daily check-ins
    for (let i = 1; i <= 5; i++) {
      appendHealthEvent({
        profileId: 'profile_1',
        trialId: 'trial_gate_test',
        type: 'daily_checkin',
        occurredAt: `2026-09-1${i}T12:00:00Z`,
        timezone: 'UTC',
        source: 'trial',
        payload: { severity: 3, adherence: 'followed' },
      });
    }

    const readinessSatisfied = evaluateChallengeReadiness(trial);
    expect(readinessSatisfied.ready).toBe(false);
    expect(readinessSatisfied.observedCount).toBe(5);
    expect(readinessSatisfied.reason).toMatch(/no verified consent/i);
  });

  it('blocks new food challenges until the protocol receives verified clinical review', () => {
    const trial = migrateLegacyTrialToV2({ trialId: 'hunt_bloat', startDate: '2026-09-01T00:00:00Z' }, 'profile_1');
    trial.id = 'trial_chal_test';
    trial.consent = { acceptedAt: '2026-09-01T00:00:00Z', acknowledgedLimitations: true };
    saveActiveTrialV2(trial);

    for (let i = 1; i <= 5; i++) {
      appendHealthEvent({ profileId: 'profile_1', trialId: trial.id, type: 'daily_checkin', occurredAt: `2026-09-0${i}T12:00:00Z`, timezone: 'UTC', source: 'trial', payload: { date: `2026-09-0${i}`, severityScore: 2 } });
    }

    const challenge = startFoodChallenge('trial_chal_test', {
      itemId: 'chana_dal',
      displayName: 'Yellow Chana Dal',
      doseDescription: '1/2 cup cooked dal',
      observationWindowHours: 48,
    });
    expect(challenge).toBeNull();
    expect(evaluateChallengeReadiness(trial).reason).toMatch(/clinical review/i);
  });

  it('persists daily checklist completions by trial and dateKey', () => {
    const trialId = 'trial_check_1';
    const dateKey = '2026-09-18';

    expect(getChecklistCompletion(trialId, dateKey)).toEqual([]);

    const afterOne = toggleChecklistTask(trialId, dateKey, 'task_ginger_water');
    expect(afterOne).toEqual(['task_ginger_water']);

    const reloaded = getChecklistCompletion(trialId, dateKey);
    expect(reloaded).toEqual(['task_ginger_water']);

    // Toggle off
    const toggledOff = toggleChecklistTask(trialId, dateKey, 'task_ginger_water');
    expect(toggledOff).toEqual([]);
  });

  it('supports patient agency: pause, resume, and stop with reason', () => {
    const trial = migrateLegacyTrialToV2({ trialId: 'hunt_bloat', startDate: '2026-09-01T00:00:00Z' }, 'profile_1');
    trial.id = 'trial_agency_test';
    saveActiveTrialV2(trial);

    const paused = pauseTrialV2('trial_agency_test');
    expect(paused?.status).toBe('paused');

    const resumed = resumeTrialV2('trial_agency_test');
    expect(resumed?.status).toBe('baseline');

    const stopped = stopTrialV2('trial_agency_test', 'flare');
    expect(stopped?.status).toBe('stopped');
    expect(stopped?.stoppedReason).toBe('flare');
  });

  it('counts unique observation dates and never treats a start event as a check-in', () => {
    const trial = startNewTrialV2({ protocolId: 'hunt_bloat', profileId: 'profile_1', baselineSeverity: 6 });
    expect(evaluateChallengeReadiness(trial).observedCount).toBe(0);
    for (let i = 0; i < 4; i++) {
      recordDailyObservation(trial.id, { date: '2026-09-23', severityScore: 6 - i, adherenceLevel: 'followed' });
    }
    const readiness = evaluateChallengeReadiness(trial);
    expect(readiness.observedCount).toBe(1);
    expect(readiness.ready).toBe(false);
    expect(startFoodChallenge(trial.id, { itemId: 'oats', displayName: 'Oats', doseDescription: 'Two spoons' })).toBeNull();
  });

  it('does not resolve an unknown instance, protocol ID, another profile, or another account', () => {
    const trial = startNewTrialV2({ protocolId: 'hunt_bloat', profileId: 'profile_1' });
    expect(findTrialById('missing')).toBeNull();
    expect(findTrialById('hunt_bloat')).toBeNull();
    expect(findTrialById(trial.id, 'profile_other')).toBeNull();
    localStorage.setItem('hc_account', JSON.stringify({ id: 'account_b' }));
    expect(findTrialById(trial.id)).toBeNull();
  });
});
