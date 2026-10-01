export const CLOUD_ARCHIVE_TABLES = ['cases', 'case_tombstones', 'health_memory', 'healthchain_profiles', 'health_observations', 'ava_messages', 'user_health_metrics', 'user_body_measurements', 'user_fitness_history'] as const;
const kinds = new Set(['ava_message_upsert', 'case_upsert', 'case_delete', 'health_memory_upsert', 'health_observation_upsert', 'profile_upsert', 'caregiver_profile_upsert', 'fitness_history_upsert', 'body_measurements_upsert', 'health_metrics_upsert', 'archive_cloud_restore']);
export const MAX_HEALTH_ARCHIVE_BYTES = 160 * 1024 * 1024;
const object = (value: any) => !!value && typeof value === 'object' && !Array.isArray(value);
export function validateCloudRecovery(raw: any, owner: string) {
  if (!raw) return null;
  if (owner === 'guest' || !object(raw) || raw.userId !== owner) throw new Error('Cloud archive belongs to a different account.');
  if (raw.profile && (!object(raw.profile) || raw.profile.id !== owner)) throw new Error('Invalid cloud profile owner.');
  for (const table of CLOUD_ARCHIVE_TABLES) {
    const rows = raw[table] || [];
    if (!Array.isArray(rows) || rows.length > 100000 || rows.some(row => !object(row) || row.user_id !== owner ||
      (table === 'healthchain_profiles' ? !/^profile_\d+$/.test(row.profile_id) || !object(row.data) : typeof row.id !== 'string' || !row.id)))
      throw new Error('Invalid cloud archive collection: ' + table);
    if (raw.counts && raw.counts[table] !== undefined && raw.counts[table] !== rows.length) throw new Error('Cloud archive count mismatch: ' + table);
  }
  if (JSON.stringify(raw).length > 10000000) throw new Error('Cloud history exceeds the automatic restore limit. Keep this archive for support-assisted recovery.');
  return raw;
}
export function validateArchiveQueue(raw: any, owner: string): any[] {
  if (!raw) return [];
  if (!object(raw) || Object.keys(raw).some(key => key !== `hc_sync_outbox_${owner}`)) throw new Error('Unsent changes belong to a different account.');
  const queue = raw[`hc_sync_outbox_${owner}`] || [];
  if (!Array.isArray(queue) || queue.length > 500) throw new Error('Invalid unsent changes archive.');
  for (const entry of queue) {
    const p = entry?.payload;
    if (!object(entry) || !kinds.has(entry.kind) || entry.userId !== owner || typeof entry.id !== 'string' || !entry.id || !object(p) ||
      !Number.isInteger(entry.attempts) || entry.attempts < 0 || entry.attempts > 25 || !Number.isFinite(Date.parse(entry.createdAt)) ||
      (entry.kind === 'profile_upsert' ? p.id !== owner : entry.kind === 'archive_cloud_restore' ? p.archive?.userId !== owner : entry.kind === 'case_delete' ? typeof p.id !== 'string' : p.user_id !== owner) ||
      (p.profile_id && !/^profile_\d+$/.test(p.profile_id)) || (p.id !== undefined && typeof p.id !== 'string'))
      throw new Error('Invalid unsent change or owner. Nothing was restored.');
    if (entry.kind === 'caregiver_profile_upsert' && !object(p.data)) throw new Error('Invalid profile change archive.');
    if (entry.kind === 'archive_cloud_restore') validateCloudRecovery(p.archive, owner);
  }
  return queue;
}
