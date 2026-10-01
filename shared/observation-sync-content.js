/** Compare the acknowledged mutation, including provenance and links. */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export function sameObservationMutation(local, remote) {
  if (!remote) return false;
  const fields = ['id', 'user_id', 'profile_id', 'kind', 'revision', 'idempotency_key', 'payload', 'occurred_at', 'local_date', 'timezone', 'time_precision', 'recorded_at', 'source', 'evidence_type', 'source_record_id', 'source_locator', 'record_references', 'deleted_at', 'created_at', 'updated_at'];
  const normalized = row => Object.fromEntries(fields.map(key => {
    let value = row[key] ?? (key === 'record_references' ? [] : null);
    if (value && ['occurred_at', 'recorded_at', 'deleted_at', 'created_at', 'updated_at'].includes(key)) value = Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : value;
    return [key, canonical(value)];
  }));
  return JSON.stringify(normalized(local)) === JSON.stringify(normalized(remote));
}
