import { getItemSync, setItemSync } from './storage';
import { getProfileKey, getProfileEngineState } from './ProfileEngine';
import {
  TrialV2,
  FoodChallenge,
  HealthEvent,
  TrialDailyObservation,
  TrialChecklistCompletion,
  AdherenceLevel,
  ChallengeOutcome,
  TrialStatus
} from '../domain/trials/types';

function getActiveProfileId(): string {
  try {
    const state = getProfileEngineState();
    return state?.activeId || 'profile_1';
  } catch {
    return 'profile_1';
  }
}

export function trialV2StorageKey(profileId?: string): string {
  const pid = profileId || getActiveProfileId();
  return `hc_trial_v2_${pid}`;
}

export function healthEventsStorageKey(profileId?: string): string {
  const pid = profileId || getActiveProfileId();
  return `hc_health_events_${pid}`;
}

export function challengesStorageKey(trialId: string): string {
  return `hc_challenges_${trialId}`;
}

export function checklistStorageKey(trialId: string, dateKey: string): string {
  return `hc_checklist_${trialId}_${dateKey}`;
}

/**
 * Migrates a legacy ActiveTrialState into the canonical TrialV2 model
 */
export function migrateLegacyTrialToV2(legacy: any, profileId?: string): TrialV2 {
  const pid = profileId || getActiveProfileId();
  const startedAt = legacy.startDate || new Date().toISOString();
  const totalDays = Number(legacy.totalDays) || 28;
  const currentDay = Math.max(1, Math.min(totalDays, Number(legacy.currentDay) || 1));
  const scores = Array.isArray(legacy.symptomScores) ? legacy.symptomScores : [];
  
  let status: TrialStatus = 'baseline';
  if (currentDay > 14) {
    status = 'ready_for_challenge';
  } else if (currentDay > 7) {
    status = 'restriction';
  }

  return {
    id: legacy.id || `trial_v2_${Date.now()}`,
    schemaVersion: 2,
    profileId: pid,
    protocolId: legacy.trialId || 'hunt_bloat',
    protocolVersion: '1.0.0',
    status,
    startedAt,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    totalDurationDays: totalDays,
    currentElapsedDays: currentDay,
    baseline: {
      requiredObservations: 5,
      completedObservations: scores.length,
      baselineSeverity: legacy.baselineSeverity ?? (scores[0]?.severity ?? null),
    },
    activeFilters: [],
    consent: {
      acceptedAt: startedAt,
      acknowledgedLimitations: true,
    }
  };
}

export function getActiveTrialV2(profileId?: string): TrialV2 | null {
  const pid = profileId || getActiveProfileId();
  try {
    const raw = getItemSync(trialV2StorageKey(pid));
    if (raw) {
      return JSON.parse(raw);
    }
    // Attempt migration from legacy storage key
    const legacyRaw = getItemSync('hc_active_trial_state');
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (legacy && legacy.trialId) {
        const migrated = migrateLegacyTrialToV2(legacy, pid);
        saveActiveTrialV2(migrated);
        return migrated;
      }
    }
    return null;
  } catch (err) {
    console.warn('Failed to get active TrialV2:', err);
    return null;
  }
}

export function saveActiveTrialV2(trial: TrialV2): void {
  try {
    setItemSync(trialV2StorageKey(trial.profileId), JSON.stringify(trial));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hc_trial_v2_updated', { detail: trial }));
      window.dispatchEvent(new Event('hc_trial_updated')); // Legacy bridge
    }
  } catch (err) {
    console.warn('Failed to save TrialV2:', err);
  }
}

/**
 * Append-only Event Sourcing Pipeline
 */
export function appendHealthEvent(
  eventData: Omit<HealthEvent, 'id' | 'recordedAt'>
): HealthEvent {
  const pid = eventData.profileId || getActiveProfileId();
  const event: HealthEvent = {
    ...eventData,
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    recordedAt: new Date().toISOString(),
  };

  try {
    const key = healthEventsStorageKey(pid);
    const raw = getItemSync(key);
    const list: HealthEvent[] = raw ? JSON.parse(raw) : [];

    // Idempotency check
    if (event.idempotencyKey) {
      const exists = list.find((e) => e.idempotencyKey === event.idempotencyKey);
      if (exists) return exists;
    }

    list.push(event);
    // Keep past 500 events per profile in storage
    const trimmed = list.slice(-500);
    setItemSync(key, JSON.stringify(trimmed));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hc_health_event_appended', { detail: event }));
    }
  } catch (err) {
    console.warn('Failed to append HealthEvent:', err);
  }

  return event;
}

export function getHealthEvents(filter?: {
  profileId?: string;
  trialId?: string;
  type?: HealthEvent['type'];
  since?: string;
}): HealthEvent[] {
  const pid = filter?.profileId || getActiveProfileId();
  try {
    const raw = getItemSync(healthEventsStorageKey(pid));
    if (!raw) return [];
    let list: HealthEvent[] = JSON.parse(raw);

    if (filter?.trialId) {
      list = list.filter((e) => e.trialId === filter.trialId);
    }
    if (filter?.type) {
      list = list.filter((e) => e.type === filter.type);
    }
    if (filter?.since) {
      const sinceTime = new Date(filter.since).getTime();
      list = list.filter((e) => new Date(e.occurredAt).getTime() >= sinceTime);
    }
    return list;
  } catch {
    return [];
  }
}

/**
 * Readiness Gates: Decouples elapsed days from clinical progression
 */
export function evaluateChallengeReadiness(trial: TrialV2): {
  ready: boolean;
  reason: string;
  observedCount: number;
  requiredCount: number;
} {
  const events = getHealthEvents({ profileId: trial.profileId, trialId: trial.id, type: 'daily_checkin' });
  const observedCount = Math.max(events.length, trial.baseline.completedObservations || 0);
  const requiredCount = trial.baseline.requiredObservations || 5;

  if (trial.status === 'paused') {
    return { ready: false, reason: 'Trial is currently paused.', observedCount, requiredCount };
  }
  if (trial.status === 'stopped') {
    return { ready: false, reason: 'Trial has been stopped.', observedCount, requiredCount };
  }

  if (observedCount < requiredCount) {
    const diff = requiredCount - observedCount;
    return {
      ready: false,
      reason: `Recorded ${observedCount} of ${requiredCount} baseline check-ins. Record ${diff} more check-in${diff > 1 ? 's' : ''} to qualify for food challenges.`,
      observedCount,
      requiredCount,
    };
  }

  return {
    ready: true,
    reason: `Baseline criteria satisfied (${observedCount}/${requiredCount} recorded). Ready for structured single-item rechallenge.`,
    observedCount,
    requiredCount,
  };
}

/**
 * Record a validated daily observation into TrialV2 and the immutable event stream
 */
export function recordDailyObservation(
  trialId: string,
  observation: {
    date: string;
    severityScore: number;
    adherenceLevel: AdherenceLevel;
    notes?: string;
  },
  profileId?: string
): TrialV2 | null {
  const trial = findTrialById(trialId, profileId);
  if (!trial) return null;

  trial.baseline.completedObservations = (trial.baseline.completedObservations || 0) + 1;
  saveActiveTrialV2(trial);

  appendHealthEvent({
    profileId: trial.profileId,
    trialId: trial.id,
    type: 'daily_checkin',
    occurredAt: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    source: 'trial',
    payload: observation,
  });

  return trial;
}

/**
 * Durable Food Challenge Operations
 */
export function getFoodChallenges(trialId: string): FoodChallenge[] {
  try {
    const raw = getItemSync(challengesStorageKey(trialId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function startFoodChallenge(
  trialId: string,
  params: {
    itemId: string;
    displayName: string;
    doseDescription?: string;
    quantity?: number;
    unit?: string;
    observationWindowHours?: number;
  }
): FoodChallenge {
  const challenges = getFoodChallenges(trialId);
  const newChallenge: FoodChallenge = {
    id: `chal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    trialId,
    itemId: params.itemId,
    displayName: params.displayName,
    doseDescription: params.doseDescription || '1 standard portion consumed in isolation',
    quantity: params.quantity,
    unit: params.unit,
    startedAt: new Date().toISOString(),
    observationWindowHours: params.observationWindowHours || 48,
    status: 'active',
    observations: [],
  };

  challenges.push(newChallenge);
  setItemSync(challengesStorageKey(trialId), JSON.stringify(challenges));

  // Update trial state
  const trial = getActiveTrialV2();
  if (trial && trial.id === trialId) {
    trial.status = 'challenge_active';
    trial.currentChallengeId = newChallenge.id;
    saveActiveTrialV2(trial);
  }

  appendHealthEvent({
    profileId: getActiveProfileId(),
    trialId,
    type: 'challenge_started',
    occurredAt: newChallenge.startedAt,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    source: 'trial',
    payload: { challengeId: newChallenge.id, item: params.displayName },
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_challenge_updated', { detail: newChallenge }));
  }

  return newChallenge;
}

export function recordChallengeObservation(
  trialId: string,
  challengeId: string,
  severityScore: number,
  hasReaction: boolean,
  symptomNotes?: string
): FoodChallenge | null {
  const challenges = getFoodChallenges(trialId);
  const challenge = challenges.find((c) => c.id === challengeId);
  if (!challenge) return null;

  const now = new Date();
  const startTime = new Date(challenge.startedAt).getTime();
  const hoursSince = Math.max(0, Math.round(((now.getTime() - startTime) / 3600000) * 10) / 10);

  challenge.observations.push({
    timestamp: now.toISOString(),
    hoursSinceIngestion: hoursSince,
    severityScore,
    symptomNotes,
    hasReaction,
  });

  if (hasReaction) {
    challenge.status = 'reaction_recorded';
    challenge.outcome = 'reaction_recorded';
  }

  setItemSync(challengesStorageKey(trialId), JSON.stringify(challenges));

  appendHealthEvent({
    profileId: getActiveProfileId(),
    trialId,
    type: 'challenge_response',
    occurredAt: now.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    source: 'trial',
    payload: { challengeId, severityScore, hasReaction, hoursSince },
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_challenge_updated', { detail: challenge }));
  }

  return challenge;
}

export function completeFoodChallenge(
  trialId: string,
  challengeId: string,
  outcome: ChallengeOutcome
): FoodChallenge | null {
  const challenges = getFoodChallenges(trialId);
  const challenge = challenges.find((c) => c.id === challengeId);
  if (!challenge) return null;

  challenge.status = 'completed';
  challenge.outcome = outcome;
  challenge.endedAt = new Date().toISOString();

  setItemSync(challengesStorageKey(trialId), JSON.stringify(challenges));

  const trial = findTrialById(trialId);
  if (trial) {
    trial.status = 'ready_for_challenge';
    trial.currentChallengeId = undefined;
    saveActiveTrialV2(trial);
  }

  appendHealthEvent({
    profileId: getActiveProfileId(),
    trialId,
    type: 'challenge_completed',
    occurredAt: challenge.endedAt,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    source: 'trial',
    payload: { challengeId, outcome },
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_challenge_updated', { detail: challenge }));
  }

  return challenge;
}

/**
 * Checklist Completion Persistence
 */
export function getChecklistCompletion(trialId: string, dateKey: string): string[] {
  try {
    const raw = getItemSync(checklistStorageKey(trialId, dateKey));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleChecklistTask(trialId: string, paramA: string, paramB: string): string[] {
  const isDateKeyA = /^\d{4}-\d{2}-\d{2}$/.test(paramA);
  const dateKey = isDateKeyA ? paramA : paramB;
  const taskId = isDateKeyA ? paramB : paramA;

  const current = getChecklistCompletion(trialId, dateKey);
  const updated = current.includes(taskId)
    ? current.filter((id) => id !== taskId)
    : [...current, taskId];

  setItemSync(checklistStorageKey(trialId, dateKey), JSON.stringify(updated));

  appendHealthEvent({
    profileId: getActiveProfileId(),
    trialId,
    type: 'task_completed',
    occurredAt: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    source: 'today',
    payload: { taskId, completed: updated.includes(taskId), dateKey },
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_checklist_updated', { detail: { trialId, dateKey, tasks: updated } }));
  }

  return updated;
}

export function findTrialById(trialId: string, profileId?: string): TrialV2 | null {
  if (profileId) {
    const p = getActiveTrialV2(profileId);
    if (p && (p.id === trialId || p.protocolId === trialId)) return p;
    return p;
  }
  const primary = getActiveTrialV2(getActiveProfileId());
  if (primary && (primary.id === trialId || primary.protocolId === trialId)) return primary;

  // Search storage for matching trial ID if profileId not provided
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('hc_trial_v2_')) {
        try {
          const t: TrialV2 = JSON.parse(localStorage.getItem(key) || '');
          if (t && (t.id === trialId || t.protocolId === trialId)) return t;
        } catch {}
      }
    }
  }
  return primary;
}

export function pauseTrialV2(trialId: string, profileId?: string): TrialV2 | null {
  const trial = findTrialById(trialId, profileId);
  if (!trial) return null;

  trial.status = 'paused';
  saveActiveTrialV2(trial);

  appendHealthEvent({
    profileId: trial.profileId,
    trialId: trial.id,
    type: 'trial_paused',
    occurredAt: new Date().toISOString(),
    timezone: trial.timezone,
    source: 'trial',
    payload: {},
  });

  return trial;
}

export function resumeTrialV2(trialId: string, profileId?: string): TrialV2 | null {
  const trial = findTrialById(trialId, profileId);
  if (!trial) return null;

  trial.status = trial.baseline.completedObservations >= trial.baseline.requiredObservations
    ? 'ready_for_challenge'
    : 'baseline';
  saveActiveTrialV2(trial);

  appendHealthEvent({
    profileId: trial.profileId,
    trialId: trial.id,
    type: 'trial_resumed',
    occurredAt: new Date().toISOString(),
    timezone: trial.timezone,
    source: 'trial',
    payload: {},
  });

  return trial;
}

export function stopTrialV2(trialId: string, reason: TrialV2['stoppedReason'] = 'other', profileId?: string): TrialV2 | null {
  const trial = findTrialById(trialId, profileId);
  if (!trial) return null;

  trial.status = 'stopped';
  trial.stoppedReason = reason;
  trial.stoppedAt = new Date().toISOString();
  saveActiveTrialV2(trial);

  appendHealthEvent({
    profileId: trial.profileId,
    trialId: trial.id,
    type: 'trial_stopped',
    occurredAt: trial.stoppedAt,
    timezone: trial.timezone,
    source: 'trial',
    payload: { reason },
  });

  return trial;
}

export function startNewTrialV2(options: {
  protocolId: string;
  durationDays?: number;
  baselineSeverity?: number | null;
  profileId?: string;
  acknowledgedLimitations?: boolean;
}): TrialV2 {
  const pid = options.profileId || getActiveProfileId();
  const duration = options.durationDays || 28;
  const now = new Date().toISOString();
  const trialId = `trial_${Date.now()}`;

  const trial: TrialV2 = {
    id: trialId,
    schemaVersion: 2,
    profileId: pid,
    protocolId: options.protocolId,
    protocolVersion: '2.0.0',
    status: 'baseline',
    startedAt: now,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    totalDurationDays: duration,
    currentElapsedDays: 1,
    baseline: {
      requiredObservations: 5,
      completedObservations: options.baselineSeverity !== null && options.baselineSeverity !== undefined ? 1 : 0,
      baselineSeverity: options.baselineSeverity ?? null,
    },
    activeFilters: [],
    consent: {
      acceptedAt: now,
      acknowledgedLimitations: options.acknowledgedLimitations ?? true,
    },
  };

  saveActiveTrialV2(trial);

  appendHealthEvent({
    profileId: pid,
    trialId,
    type: 'daily_checkin',
    occurredAt: now,
    timezone: trial.timezone,
    source: 'trial',
    payload: {
      action: 'trial_started',
      protocolId: options.protocolId,
      baselineSeverity: options.baselineSeverity,
    },
  });

  return trial;
}

