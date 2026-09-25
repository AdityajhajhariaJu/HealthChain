import { get, set } from 'idb-keyval';
import { supabase } from './supabaseClient';
import { enqueueSync, getPendingObservationIds } from './SyncOutbox';
import { getProfileEngineState } from './ProfileEngine';
import { validateObservationDraft, type Observation, type ObservationDraft, type ObservationScope } from '../domain/observations/types';

export type ObservationCommandResult =
  | { ok: true; observation: Observation; sync: 'local_only' | 'pending' | 'queue_failed' }
  | { ok: false; error: 'validation' | 'scope_changed' | 'not_found' | 'revision_conflict' | 'storage_failure'; details?: string[] };

const key = (scope: ObservationScope) => `hc_observations_v1:${scope.ownerId}:${scope.profileId}`;
const newId = () => typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (digit) => {
    const random = Math.floor(Math.random() * 16);
    return (digit === 'x' ? random : (random & 3) | 8).toString(16);
  });

let writeSerial: Promise<unknown> = Promise.resolve();
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const next = writeSerial.then(work, work);
  writeSerial = next.catch(() => undefined);
  return next;
}

export async function captureObservationScope(): Promise<ObservationScope | null> {
  const profileId = getProfileEngineState()?.activeId || 'profile_1';
  // The current caregiver release is disabled. The SQL policy also accepts only profile_1.
  if (profileId !== 'profile_1') return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return { ownerId: session.user.id, profileId };
  return typeof localStorage !== 'undefined' && localStorage.getItem('hc_guest_mode') === 'true'
    ? { ownerId: 'guest', profileId } : null;
}

async function sameScope(scope: ObservationScope): Promise<boolean> {
  const active = await captureObservationScope();
  return active?.ownerId === scope.ownerId && active?.profileId === scope.profileId;
}

async function readLocal(scope: ObservationScope): Promise<Observation[]> {
  const storageKey = key(scope);
  let indexed: unknown;
  let fallback: unknown;
  try { indexed = await get(storageKey); } catch {}
  if (typeof localStorage !== 'undefined') {
    try { fallback = localStorage.getItem(storageKey); } catch {}
  }
  const parse = (raw: unknown): Observation[] => {
    try {
      const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(value) ? value.filter((item) => item?.ownerId === scope.ownerId && item?.profileId === scope.profileId && typeof item?.id === 'string') : [];
    } catch { return []; }
  };
  const merged = new Map<string, Observation>();
  for (const record of [...parse(indexed), ...parse(fallback)]) {
    const previous = merged.get(record.id);
    if (!previous || record.revision > previous.revision ||
        (record.revision === previous.revision && record.updatedAt > previous.updatedAt)) merged.set(record.id, record);
  }
  const records = [...merged.values()];
  if (fallback !== null && fallback !== undefined) {
    try {
      await set(storageKey, records);
      localStorage.removeItem(storageKey);
    } catch {
      // Keep the fallback copy until IndexedDB accepts the reconciled state.
    }
  }
  return records;
}

async function writeLocal(scope: ObservationScope, records: Observation[]): Promise<boolean> {
  const storageKey = key(scope);
  try {
    await set(storageKey, records);
    try { localStorage.removeItem(storageKey); } catch {}
    return true;
  } catch {}
  try { localStorage.setItem(storageKey, JSON.stringify(records)); return true; } catch { return false; }
}

function remoteRow(observation: Observation, expectedRevision: number) {
  return {
    id: observation.id, user_id: observation.ownerId, profile_id: observation.profileId,
    kind: observation.payload.kind, occurred_at: observation.occurredAt,
    local_date: observation.localDate, timezone: observation.timezone,
    time_precision: observation.timePrecision, recorded_at: observation.recordedAt,
    source: observation.source, evidence_type: observation.evidenceType,
    source_record_id: observation.sourceRecordId || null,
    source_locator: observation.sourceLocator || null, payload: observation.payload,
    revision: observation.revision, idempotency_key: observation.idempotencyKey,
    deleted_at: observation.deletedAt, created_at: observation.createdAt,
    updated_at: observation.updatedAt, expected_revision: expectedRevision,
  };
}

async function queueRemote(observation: Observation, expectedRevision: number): Promise<'local_only' | 'pending' | 'queue_failed'> {
  if (observation.ownerId === 'guest') return 'local_only';
  if (!await sameScope(observation)) return 'queue_failed';
  try {
    const queued = await enqueueSync('health_observation_upsert', observation.ownerId, remoteRow(observation, expectedRevision));
    return queued ? 'pending' : 'queue_failed';
  } catch { return 'queue_failed'; }
}

export async function listObservations(): Promise<Observation[]> {
  const scope = await captureObservationScope();
  if (!scope) return [];
  const records = await readLocal(scope);
  if (!await sameScope(scope)) return [];
  return records.filter((record) => !record.deletedAt).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export type ObservationCloudLoad = { status: 'loaded' | 'local_only' | 'unavailable' | 'conflict' | 'scope_changed' | 'storage_failure'; imported: number; conflicts: number };
export type ObservationSyncInfo = { state: 'no_pending' | 'pending' | 'local_only' | 'unavailable'; pendingCount: number };

/** Profile-scoped sync state for a conclusion; it never exposes another profile's queue. */
export async function getObservationSyncInfo(): Promise<ObservationSyncInfo> {
  const scope = await captureObservationScope();
  if (!scope) return { state: 'unavailable', pendingCount: 0 };
  if (scope.ownerId === 'guest') return { state: 'local_only', pendingCount: 0 };
  try {
    const pending = await getPendingObservationIds(scope.ownerId, scope.profileId);
    if (!await sameScope(scope)) return { state: 'unavailable', pendingCount: 0 };
    return { state: pending.size ? 'pending' : 'no_pending', pendingCount: pending.size };
  } catch { return { state: 'unavailable', pendingCount: 0 }; }
}

function observationFromRemote(row: any, scope: ObservationScope): Observation | null {
  if (!row || row.user_id !== scope.ownerId || row.profile_id !== scope.profileId || typeof row.id !== 'string' ||
      !Number.isInteger(row.revision) || row.revision < 1 || !Number.isFinite(Date.parse(row.recorded_at)) ||
      !Number.isFinite(Date.parse(row.created_at)) || !Number.isFinite(Date.parse(row.updated_at))) return null;
  const draft: ObservationDraft = {
    ownerId: row.user_id, profileId: row.profile_id, payload: row.payload,
    occurredAt: row.occurred_at, localDate: row.local_date, timezone: row.timezone,
    timePrecision: row.time_precision, source: row.source, evidenceType: row.evidence_type,
    sourceRecordId: row.source_record_id || undefined, sourceLocator: row.source_locator || undefined,
    idempotencyKey: row.idempotency_key,
  };
  if (!validateObservationDraft(draft).ok) return null;
  return { ...draft, id: row.id, schemaVersion: 1, recordedAt: row.recorded_at,
    revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at,
    deletedAt: row.deleted_at || null };
}

/** Import account-owned server history without overwriting unsent or divergent local edits. */
export async function loadObservationsFromCloud(): Promise<ObservationCloudLoad> {
  const empty = (status: ObservationCloudLoad['status']): ObservationCloudLoad => ({ status, imported: 0, conflicts: 0 });
  const scope = await captureObservationScope();
  if (!scope) return empty('scope_changed');
  if (scope.ownerId === 'guest') return empty('local_only');
  const remote: Observation[] = [];
  for (let offset = 0; offset < 5000; offset += 200) {
    const { data, error } = await supabase.from('health_observations').select('*')
      .eq('user_id', scope.ownerId).eq('profile_id', scope.profileId)
      .order('updated_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + 199);
    if (error || !Array.isArray(data)) return empty('unavailable');
    const parsed = data.map((row) => observationFromRemote(row, scope));
    if (parsed.some((item) => !item)) return empty('unavailable');
    remote.push(...parsed as Observation[]);
    if (data.length < 200) break;
    if (offset === 4800) return empty('unavailable');
  }
  if (!await sameScope(scope)) return empty('scope_changed');
  let pending: Set<string>;
  try { pending = await getPendingObservationIds(scope.ownerId, scope.profileId); }
  catch { return empty('unavailable'); }
  return serialize(async () => {
    if (!await sameScope(scope)) return empty('scope_changed');
    const local = await readLocal(scope);
    const merged = new Map(local.map((item) => [item.id, item]));
    let imported = 0;
    let conflicts = 0;
    for (const item of remote) {
      const previous = merged.get(item.id);
      if (!previous) { merged.set(item.id, item); imported++; continue; }
      if (pending.has(item.id)) {
        if (item.revision >= previous.revision && (item.revision !== previous.revision ||
            JSON.stringify(item.payload) !== JSON.stringify(previous.payload) || item.deletedAt !== previous.deletedAt)) conflicts++;
        continue;
      }
      if (item.revision > previous.revision) { merged.set(item.id, item); imported++; continue; }
      if (item.revision < previous.revision || JSON.stringify(item.payload) !== JSON.stringify(previous.payload) ||
          item.deletedAt !== previous.deletedAt) conflicts++;
    }
    if (!await sameScope(scope)) return empty('scope_changed');
    if (imported && !await writeLocal(scope, [...merged.values()])) return empty('storage_failure');
    if (imported && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hc_observations_updated', { detail: { imported } }));
    return { status: conflicts ? 'conflict' : 'loaded', imported, conflicts };
  });
}

export async function createObservation(draft: ObservationDraft): Promise<ObservationCommandResult> {
  const validated = validateObservationDraft(draft);
  if (!validated.ok) return { ok: false, error: 'validation', details: validated.errors };
  if (draft.evidenceType !== 'user_report') return { ok: false, error: 'validation', details: ['Imported or clinician evidence requires a verified server import.'] };
  return serialize(async () => {
    if (!await sameScope(draft)) return { ok: false, error: 'scope_changed' } as const;
    const records = await readLocal(draft);
    const existing = records.find((record) => record.idempotencyKey === draft.idempotencyKey);
    if (existing) {
      const { id, schemaVersion, recordedAt, revision, createdAt, updatedAt, deletedAt, ...original } = existing;
      if (JSON.stringify(original) !== JSON.stringify(draft)) return { ok: false, error: 'revision_conflict' } as const;
      // A previous local save may have succeeded while the outbox write failed.
      // Retrying the same idempotent command must retry its durable sync enqueue.
      const sync = await queueRemote(existing, existing.revision - 1);
      return { ok: true, observation: existing, sync } as const;
    }
    const now = new Date().toISOString();
    const observation: Observation = { ...draft, id: newId(), schemaVersion: 1, recordedAt: now, revision: 1, createdAt: now, updatedAt: now, deletedAt: null };
    if (!await sameScope(draft)) return { ok: false, error: 'scope_changed' } as const;
    if (!await writeLocal(draft, [...records, observation])) return { ok: false, error: 'storage_failure' } as const;
    const sync = await queueRemote(observation, 0);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hc_observations_updated', { detail: { id: observation.id } }));
    return { ok: true, observation, sync } as const;
  });
}

export async function reviseObservation(id: string, expectedRevision: number, draft: ObservationDraft): Promise<ObservationCommandResult> {
  const validated = validateObservationDraft(draft);
  if (!validated.ok) return { ok: false, error: 'validation', details: validated.errors };
  if (draft.evidenceType !== 'user_report') return { ok: false, error: 'validation', details: ['Imported or clinician evidence requires a verified server import.'] };
  return serialize(async () => {
    if (!await sameScope(draft)) return { ok: false, error: 'scope_changed' } as const;
    const records = await readLocal(draft);
    const index = records.findIndex((record) => record.id === id && !record.deletedAt);
    if (index < 0) return { ok: false, error: 'not_found' } as const;
    const original = records[index];
    if (original.revision !== expectedRevision || original.idempotencyKey !== draft.idempotencyKey) return { ok: false, error: 'revision_conflict' } as const;
    const updated: Observation = { ...draft, id, schemaVersion: 1, recordedAt: original.recordedAt,
      revision: expectedRevision + 1, createdAt: original.createdAt, updatedAt: new Date().toISOString(), deletedAt: null };
    if (!await sameScope(draft)) return { ok: false, error: 'scope_changed' } as const;
    records[index] = updated;
    if (!await writeLocal(draft, records)) return { ok: false, error: 'storage_failure' } as const;
    const sync = await queueRemote(updated, expectedRevision);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hc_observations_updated', { detail: { id } }));
    return { ok: true, observation: updated, sync } as const;
  });
}

export async function deleteObservation(id: string, expectedRevision: number): Promise<ObservationCommandResult> {
  return serialize(async () => {
    const scope = await captureObservationScope();
    if (!scope) return { ok: false, error: 'scope_changed' } as const;
    const records = await readLocal(scope);
    const index = records.findIndex((record) => record.id === id && !record.deletedAt);
    if (index < 0) return { ok: false, error: 'not_found' } as const;
    const original = records[index];
    if (original.revision !== expectedRevision) return { ok: false, error: 'revision_conflict' } as const;
    const now = new Date().toISOString();
    const deleted: Observation = { ...original, revision: expectedRevision + 1, updatedAt: now, deletedAt: now };
    if (!await sameScope(scope)) return { ok: false, error: 'scope_changed' } as const;
    records[index] = deleted;
    if (!await writeLocal(scope, records)) return { ok: false, error: 'storage_failure' } as const;
    const sync = await queueRemote(deleted, expectedRevision);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hc_observations_updated', { detail: { id } }));
    return { ok: true, observation: deleted, sync } as const;
  });
}
