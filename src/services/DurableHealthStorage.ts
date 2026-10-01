/** Durable, owner-scoped records survive logout; auth and transient caches do not. */
const prefixes = [
  'hc_unified_profile_', 'hc_cases_', 'hc_active_case_', 'hc_case_prep_draft_',
  'hc_health_memory_', 'hc_ava_messages_', 'hc_tombstones_', 'hc_sync_outbox_',
  'hc_observations_v1:', 'hc_observation_queue_fail:',
  'hc_medication_schedule_linked:',
  'hc_food_logs_', 'hc_diet_profile_', 'hc_hydration_', 'hc_meal_plan_', 'hc_diet_advice_',
];
export function isDurableHealthStorageKey(key: unknown): key is string {
  return typeof key === 'string' && (prefixes.some(prefix => key.startsWith(prefix)) ||
    /^healthchain_(hydration|vitamins|habits)[^:]*:hc_unified_profile_[^:]+:profile_\d+$/.test(key));
}
export function retainHealthStorage(storage: Storage): Record<string, string> {
  const retained: Record<string, string> = {};
  for (const key of Object.keys(storage)) {
    if (!isDurableHealthStorageKey(key) && !['hc_theme', 'hc_consent'].includes(key)) continue;
    const value = storage.getItem(key); if (value !== null) retained[key] = value;
  }
  return retained;
}
