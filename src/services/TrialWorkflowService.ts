import { getItemSync, setItemSync } from './storage';
import { getProfileKey, getProfileEngineState } from './ProfileEngine';
import {
  TrialV2,
  TrialIntakeAssessment,
  FoodChallenge,
  HealthEvent,
  TrialDailyObservation,
  TrialChecklistCompletion,
  AdherenceLevel,
  ChallengeOutcome,
  TrialStatus,
  ClinicalVerdictData
} from '../domain/trials/types';
import { stopActiveTrial, getActiveTrial } from './TriggerEngine';

// No protocol in the legacy catalogue has a verified, versioned clinical approval
// record. Keep new dietary challenges closed until that governance exists.
const isChallengeProtocolApproved = (_trial: TrialV2): boolean => false;

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
  return `hc_trial_v2:${getProfileKey()}:${pid}`;
}

export function healthEventsStorageKey(profileId?: string): string {
  const pid = profileId || getActiveProfileId();
  return `hc_health_events:${getProfileKey()}:${pid}`;
}

export function challengesStorageKey(trialId: string): string {
  return `hc_challenges:${getProfileKey()}:${getActiveProfileId()}:${trialId}`;
}

export function checklistStorageKey(trialId: string, dateKey: string): string {
  return `hc_checklist:${getProfileKey()}:${getActiveProfileId()}:${trialId}:${dateKey}`;
}

/**
 * Migrates a legacy ActiveTrialState into the canonical TrialV2 model
 */
export function migrateLegacyTrialToV2(legacy: any, profileId?: string): TrialV2 {
  const pid = profileId || getActiveProfileId();
  if (!legacy.startDate || Number.isNaN(new Date(legacy.startDate).getTime())) throw new Error('Legacy trial start time is not evidenced. Preserve it for manual recovery.');
  const startedAt = legacy.startDate;
  const totalDays = Number(legacy.totalDays) || 28;
  const currentDay = Math.max(1, Math.min(totalDays, Number(legacy.currentDay) || 1));
  // Calendar day and inferred legacy consent never authorize a dietary stage.
  const status: TrialStatus = 'baseline';

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
      completedObservations: 0,
      baselineSeverity: typeof legacy.baselineSeverity === 'number' ? legacy.baselineSeverity : null,
    },
    activeFilters: [],
    consent: {
      acknowledgedLimitations: false,
    }
  };
}

export function getActiveTrialV2(profileId?: string): TrialV2 | null {
  const pid = profileId || getActiveProfileId();
  if (pid !== getActiveProfileId()) return null;
  try {
    const raw = getItemSync(trialV2StorageKey(pid));
    if (raw) {
      return JSON.parse(raw);
    }
    // An older V2 key had no account namespace. Migrate only when the
    // separately account-scoped legacy trial corroborates its identity.
    const legacy = getActiveTrial();
    const unscopedRaw = legacy && getItemSync(`hc_trial_v2_${pid}`);
    if (unscopedRaw) {
      const candidate: TrialV2 = JSON.parse(unscopedRaw);
      if (candidate.profileId === pid && candidate.protocolId === legacy.trialId &&
          Math.abs(new Date(candidate.startedAt).getTime() - new Date(legacy.startDate).getTime()) < 60_000 && candidate.id) {
        try {
          const oldEvents = JSON.parse(getItemSync(`hc_health_events_${pid}`) || '[]');
          const trialEvents = Array.isArray(oldEvents) ? oldEvents.filter((event: HealthEvent) => event.profileId === pid && event.trialId === candidate.id) : [];
          if (trialEvents.length && !getItemSync(healthEventsStorageKey(pid))) setItemSync(healthEventsStorageKey(pid), JSON.stringify(trialEvents));
          const oldChallenges = getItemSync(`hc_challenges_${candidate.id}`);
          if (oldChallenges && !getItemSync(challengesStorageKey(candidate.id))) setItemSync(challengesStorageKey(candidate.id), oldChallenges);
        } catch { /* Keep the source untouched for manual recovery. */ }
        saveActiveTrialV2(candidate);
        return candidate;
      }
    }
    return null;
  } catch (err) {
    console.warn('Failed to get active TrialV2:', err);
    return null;
  }
}

export function saveActiveTrialV2(trial: TrialV2): void {
  if (trial.profileId !== getActiveProfileId()) throw new Error('Trial profile is not active.');
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
  const pid = getActiveProfileId();
  if (eventData.profileId !== pid) throw new Error('Event profile is not active.');
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
    setItemSync(key, JSON.stringify(list));

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
  if (pid !== getActiveProfileId()) return [];
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
  const observedCount = new Set(events.filter((event) => event.payload?.action !== 'trial_started')
    .map((event) => String(event.payload?.date || event.occurredAt).slice(0, 10))
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))).size;
  const requiredCount = trial.baseline.requiredObservations || 5;

  if (trial.status === 'paused') {
    return { ready: false, reason: 'Trial is currently paused.', observedCount, requiredCount };
  }
  if (trial.status === 'stopped') {
    return { ready: false, reason: 'Trial has been stopped.', observedCount, requiredCount };
  }
  if (trial.status === 'completed' || trial.status === 'challenge_active' || trial.status === 'recovery') {
    return { ready: false, reason: 'Finish the current challenge and review the recovery period before starting another.', observedCount, requiredCount };
  }

  if (observedCount < requiredCount) {
    const diff = requiredCount - observedCount;
    return {
      ready: false,
      reason: `Recorded ${observedCount} of ${requiredCount} baseline check-ins. ${diff} more dated check-in${diff > 1 ? 's' : ''} would complete this observation minimum; it does not establish clinical readiness.`,
      observedCount,
      requiredCount,
    };
  }

  if (!trial.consent.acknowledgedLimitations || !trial.consent.acceptedAt) {
    return { ready: false, reason: 'This legacy or draft plan has no verified consent record. Review it before any dietary challenge.', observedCount, requiredCount };
  }

  if (!isChallengeProtocolApproved(trial)) {
    return { ready: false, reason: 'New food challenges are unavailable until this plan and its safety rules receive verified clinical review.', observedCount, requiredCount };
  }

  return {
    ready: true,
    reason: `Observation minimum recorded (${observedCount}/${requiredCount}). Review all plan safety conditions before a food challenge.`,
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

  if (trial.status === 'paused' || trial.status === 'stopped' || trial.status === 'completed') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(observation.date) || !Number.isFinite(observation.severityScore) || observation.severityScore < 0 || observation.severityScore > 10) return null;
  const existing = getHealthEvents({ profileId: trial.profileId, trialId: trial.id, type: 'daily_checkin' })
    .find((event) => event.payload?.date === observation.date);
  if (existing && JSON.stringify(existing.payload) === JSON.stringify(observation)) return trial;
  appendHealthEvent({
    profileId: trial.profileId,
    trialId: trial.id,
    type: 'daily_checkin',
    occurredAt: `${observation.date}T12:00:00.000Z`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    source: 'trial',
    payload: observation,
    idempotencyKey: `trial-observation:${trial.id}:${observation.date}:${JSON.stringify(observation)}`,
  });

  trial.baseline.completedObservations = evaluateChallengeReadiness(trial).observedCount;
  saveActiveTrialV2(trial);

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
): FoodChallenge | null {
  const trial = findTrialById(trialId);
  if (!trial || !isChallengeProtocolApproved(trial) || !trial.consent.acknowledgedLimitations || !trial.consent.acceptedAt ||
      !evaluateChallengeReadiness(trial).ready || trial.status === 'challenge_active') return null;
  if (!params.itemId.trim() || !params.displayName.trim() || !params.doseDescription?.trim()) return null;
  const challenges = getFoodChallenges(trialId);
  if (challenges.some((challenge) => challenge.status === 'active' || challenge.status === 'reaction_recorded')) return null;
  const newChallenge: FoodChallenge = {
    id: `chal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    trialId,
    itemId: params.itemId,
    displayName: params.displayName,
    doseDescription: params.doseDescription,
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
  trial.status = 'challenge_active';
  trial.currentChallengeId = newChallenge.id;
  saveActiveTrialV2(trial);

  appendHealthEvent({
    profileId: trial.profileId,
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
  const trial = findTrialById(trialId);
  if (!trial || trial.status !== 'challenge_active' || trial.currentChallengeId !== challengeId) return null;
  const challenges = getFoodChallenges(trialId);
  const challenge = challenges.find((c) => c.id === challengeId);
  if (!challenge || (challenge.status !== 'active' && challenge.status !== 'reaction_recorded')) return null;

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
    profileId: trial.profileId,
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
  const trial = findTrialById(trialId);
  if (!trial || trial.status !== 'challenge_active' || trial.currentChallengeId !== challengeId) return null;
  const challenges = getFoodChallenges(trialId);
  const challenge = challenges.find((c) => c.id === challengeId);
  if (!challenge || (challenge.status !== 'active' && challenge.status !== 'reaction_recorded')) return null;

  challenge.status = 'completed';
  challenge.outcome = outcome;
  challenge.endedAt = new Date().toISOString();

  setItemSync(challengesStorageKey(trialId), JSON.stringify(challenges));

  trial.status = 'recovery';
  trial.currentChallengeId = undefined;
  saveActiveTrialV2(trial);

  appendHealthEvent({
    profileId: trial.profileId,
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
  const activeProfileId = getActiveProfileId();
  if (profileId && profileId !== activeProfileId) return null;
  const trial = getActiveTrialV2(activeProfileId);
  return trial?.id === trialId && trial.profileId === activeProfileId ? trial : null;
}

export function pauseTrialV2(trialId: string, profileId?: string): TrialV2 | null {
  const trial = findTrialById(trialId, profileId);
  if (!trial || trial.status === 'completed' || trial.status === 'stopped' || trial.status === 'paused') return null;

  (trial as TrialV2 & { statusBeforePause?: TrialStatus }).statusBeforePause = trial.status;
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
  if (!trial || trial.status !== 'paused') return null;

  trial.status = (trial as TrialV2 & { statusBeforePause?: TrialStatus }).statusBeforePause || 'baseline';
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
  if (!trial || trial.status === 'completed' || trial.status === 'stopped') return null;

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

export function completeTrialWithVerdict(
  trialId: string,
  verdict: ClinicalVerdictData,
  profileId?: string
): TrialV2 | null {
  const trial = findTrialById(trialId, profileId);
  if (!trial || trial.status === 'stopped' || trial.status === 'paused' || trial.status === 'completed') return null;

  const now = new Date().toISOString();
  const dated = getHealthEvents({ profileId: trial.profileId, trialId: trial.id, type: 'daily_checkin' })
    .filter((event) => Number.isFinite(event.payload?.severityScore) && event.payload?.date);
  dated.sort((a, b) => String(a.payload.date).localeCompare(String(b.payload.date)));
  const latest = dated.length ? Number(dated[dated.length - 1].payload.severityScore) : null;
  const baseline = trial.baseline.baselineSeverity;
  const reportedItems = [...(verdict.confirmedTriggers || []), ...(verdict.clearedFoods || []), ...(verdict.inconclusiveFoods || [])];
  const safeVerdict: ClinicalVerdictData = {
    graduatedAt: now,
    initialBaselineSeverity: baseline,
    finalSeverity: latest,
    symptomReductionPercentage: baseline !== null && baseline > 0 && latest !== null
      ? Math.round(((baseline - latest) / baseline) * 100) : null,
    confirmedTriggers: [],
    clearedFoods: [],
    inconclusiveFoods: reportedItems.map((item) => ({ ...item, classification: 'inconclusive', notes: item.notes || 'Reported observation; clinical status not established.' })),
    clinicianDossierSummary: `Recorded trial observations. Baseline: ${baseline === null ? 'not recorded' : `${baseline}/10`}; latest recorded check-in: ${latest === null ? 'not recorded' : `${latest}/10`}. Food responses require interpretation; this report does not confirm a trigger or safety.`,
    maintenanceDietRecommendations: ['Review observations and any dietary changes with a qualified clinician or dietitian.'],
  };
  trial.status = 'completed';
  trial.completedAt = now;
  trial.verdict = safeVerdict;
  trial.stoppedReason = 'completed';
  saveActiveTrialV2(trial);

  // Archive legacy trial if active
  try {
    stopActiveTrial();
  } catch {}

  appendHealthEvent({
    profileId: trial.profileId,
    trialId: trial.id,
    type: 'trial_completed',
    occurredAt: now,
    timezone: trial.timezone,
    source: 'trial',
    payload: {
      verdictSummary: safeVerdict.clinicianDossierSummary,
      symptomReductionPercentage: safeVerdict.symptomReductionPercentage,
      confirmedTriggersCount: 0,
      clearedFoodsCount: 0,
      inconclusiveFoodsCount: safeVerdict.inconclusiveFoods.length,
    },
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_trial_graduated', { detail: { trial, verdict: safeVerdict } }));
    window.dispatchEvent(new CustomEvent('hc_trial_v2_updated', { detail: trial }));
    window.dispatchEvent(new Event('hc_trial_updated'));
  }

  return trial;
}

export function startNewTrialV2(options: {
  protocolId: string;
  durationDays?: number;
  baselineSeverity?: number | null;
  profileId?: string;
  acknowledgedLimitations?: boolean;
  intakeAssessment?: TrialIntakeAssessment;
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
      completedObservations: 0,
      baselineSeverity: options.baselineSeverity ?? null,
    },
    activeFilters: [],
    consent: {
      ...(options.acknowledgedLimitations === true ? { acceptedAt: now } : {}),
      acknowledgedLimitations: options.acknowledgedLimitations === true,
    },
    intakeAssessment: options.intakeAssessment,
  };

  saveActiveTrialV2(trial);

  appendHealthEvent({
    profileId: pid,
    trialId,
    type: 'trial_started',
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

export function resetActiveTrialV2(profileId?: string): void {
  const pid = profileId || getActiveProfileId();
  try {
    const key = trialV2StorageKey(pid);
    localStorage.removeItem(key);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hc_trial_v2_updated'));
    }
  } catch (e) {
    console.warn('Failed to reset TrialV2:', e);
  }
}

