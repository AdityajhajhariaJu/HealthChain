/** Durable, owner-scoped records survive logout; auth and transient caches do not. */
const prefixes = [
  'hc_unified_profile_',
  'hc_cases_',
  'hc_active_case_',
  'hc_case_prep_draft_',
  'hc_health_memory_',
  'hc_ava_messages_',
  'hc_tombstones_',
  'hc_sync_outbox_',
  'hc_observations_v1:',
  'hc_observation_queue_fail:',
  'hc_daily_ledger_migrated:',
  'hc_original_record:',
  'hc_clinical_intake_draft:',
  'hc_medication_schedule_linked:',
  'hc_observation_conflict_history:',
  'hc_observation_conflicts:',
  'hc_device_metrics:',
  'hc_profile_sync_base:',
  'hc_ava_vault_',
  'hc_plan_',
  'hc_pending_charge_',
  'hc_interrupted_task_',
  'hc_food_logs_',
  'hc_diet_profile_',
  'hc_hydration_',
  'hc_meal_plan_',
  'hc_diet_advice_',
];
export function isDurableHealthStorageKey(key: unknown): key is string {
  return (
    typeof key === 'string' &&
    (prefixes.some((prefix) => key.startsWith(prefix)) ||
      /^(hc_progress_photo|hc_daily_checkin_reminder_(enabled|time)|hc_notifications_(state|prefs)|hc_custom_notifications|hc_active_elimination_trial|hc_elimination_trial_history|hc_wellness_zen_garden):hc_unified_profile_[^:]+:profile_\d+$/.test(
        key
      ) ||
      /^healthchain_(hydration|vitamins|habits)[^:]*:hc_unified_profile_[^:]+:profile_\d+$/.test(
        key
      ))
  );
}
export function retainHealthStorage(storage: Storage): Record<string, string> {
  const retained: Record<string, string> = {};
  for (const key of Object.keys(storage)) {
    if (
      !key.startsWith('hc_push_registration:') &&
      !isDurableHealthStorageKey(key) &&
      !['hc_theme', 'hc_consent', 'hc_push_installation_id', 'hc_erasure_pending_owners'].includes(
        key
      )
    )
      continue;
    const value = storage.getItem(key);
    if (value !== null) retained[key] = value;
  }
  return retained;
}

// Owner matching is structural: account "a" must never match account "ab".
export function isOwnerStorageKey(key: unknown, ownerId: string): key is string {
  if (typeof key !== 'string' || !ownerId) return false;
  const namespace = `hc_unified_profile_${ownerId}`;
  if (key.split(':').includes(namespace)) return true;
  for (const prefix of prefixes) {
    if (prefix.endsWith(':')) {
      if (key.startsWith(prefix + ownerId + ':')) return true;
    } else if (key === prefix + ownerId || key.startsWith(prefix + ownerId + '_profile_'))
      return true;
  }
  return (
    key.startsWith(`hc_diet_plan_pending_v1:${ownerId}:`) ||
    key.startsWith(`hc_push_registration:${ownerId}:`)
  );
}
const erasedOwners = new Set<string>();
export function blockErasedOwner(ownerId: string) {
  erasedOwners.add(ownerId);
}
export function pendingErasedOwners(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem('hc_erasure_pending_owners') || '[]');
    return Array.isArray(value)
      ? value.filter((owner) => typeof owner === 'string' && owner !== 'guest')
      : [];
  } catch {
    return [];
  }
}
export function isOwnerErased(ownerId: string) {
  return erasedOwners.has(ownerId) || pendingErasedOwners().includes(ownerId);
}
export function isErasedStorageKey(key: string) {
  return [...erasedOwners, ...pendingErasedOwners()].some((owner) => isOwnerStorageKey(key, owner));
}
