import { del, get } from 'idb-keyval';
import { sameObservationMutation } from '../../shared/observation-sync-content';
import {
  validateObservationDraft,
  type Observation,
  type ObservationDraft,
  type ObservationScope,
} from '../domain/observations/types';
import {
  captureAccountScope as captureHealthMemoryScope,
  isAccountScopeCurrent as isHealthMemoryScopeCurrent,
} from './AccountScope';
import { isOwnerErased } from './DurableHealthStorage';
import { setOwned as set } from './OwnedIdb';
import { getProfileEngineState } from './ProfileEngine';
import { completeActivity } from './GamificationHub';
import { supabase } from './supabaseClient';
import {
  enqueueSync,
  getObservationConflicts,
  getPendingObservationIds,
  settleObservationConflict,
} from './SyncOutbox';

export type ObservationCommandResult =
  | { ok: true; observation: Observation; sync: 'local_only' | 'pending' | 'queue_failed' }
  | { ok: false; error: 'validation' | 'scope_changed' | 'not_found' | 'revision_conflict' | 'storage_failure'; details?: string[] };

const key = (scope: ObservationScope) => `hc_observations_v1:${scope.ownerId}:${scope.profileId}`;
const failedQueueKey = (scope: ObservationScope) => `hc_observation_queue_fail:${scope.ownerId}:${scope.profileId}`;
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
  const account = captureHealthMemoryScope();
  const profileId = getProfileEngineState()?.activeId || 'profile_1';
  // The current caregiver release is disabled. The SQL policy also accepts only profile_1.
  if (profileId !== 'profile_1') return null;
  if (account.accountId === 'guest' && localStorage.getItem('hc_guest_mode') === 'true') return {ownerId:'guest',profileId};
  const { data: { session } } = await supabase.auth.getSession();
  if (!isHealthMemoryScopeCurrent(account)) return null;
  if (session?.user?.id && session.user.id === account.accountId) return { ownerId: session.user.id, profileId };
  return typeof localStorage !== 'undefined' && localStorage.getItem('hc_guest_mode') === 'true'
    ? { ownerId: 'guest', profileId } : null;
}

async function sameScope(scope: ObservationScope): Promise<boolean> {
  const active = await captureObservationScope();
  return active?.ownerId === scope.ownerId && active?.profileId === scope.profileId;
}

async function readLocal(scope: ObservationScope): Promise<Observation[]> {
  if (isOwnerErased(scope.ownerId)) return [];
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
      if (isOwnerErased(scope.ownerId)) { await del(storageKey); return []; }
      localStorage.removeItem(storageKey);
    } catch {
      // Keep the fallback copy until IndexedDB accepts the reconciled state.
    }
  }
  return records;
}

async function writeLocal(scope: ObservationScope, records: Observation[]): Promise<boolean> {
  if (isOwnerErased(scope.ownerId)) return false;
  const storageKey = key(scope);
  try {
    await set(storageKey, records);
    if (isOwnerErased(scope.ownerId)) { await del(storageKey); return false; }
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
    record_references: observation.references || [],
    revision: observation.revision, idempotency_key: observation.idempotencyKey,
    deleted_at: observation.deletedAt, created_at: observation.createdAt,
    updated_at: observation.updatedAt, expected_revision: expectedRevision,
  };
}

async function queueRemote(observation: Observation, expectedRevision: number): Promise<'local_only' | 'pending' | 'queue_failed'> {
  if (observation.ownerId === 'guest') return 'local_only';
  const mark = (failed: boolean) => {
    try {
      const storageKey = failedQueueKey(observation);
      const ids = new Set<string>(JSON.parse(localStorage.getItem(storageKey) || '[]'));
      if (failed) ids.add(observation.id);
      else ids.delete(observation.id);
      if (ids.size) localStorage.setItem(storageKey, JSON.stringify([...ids]));
      else localStorage.removeItem(storageKey);
    } catch { /* The caller still receives queue_failed. */ }
  };
  if (!await sameScope(observation)) { mark(true); return 'queue_failed'; }
  try {
    const queued = await enqueueSync('health_observation_upsert', observation.ownerId, remoteRow(observation, expectedRevision));
    mark(!queued);
    return queued ? 'pending' : 'queue_failed';
  } catch { mark(true); return 'queue_failed'; }
}

/** Re-enqueue only observations whose previous local write explicitly reported queue failure. */
export async function retryFailedObservationQueues(): Promise<{ retried: number; remaining: number }> {
  const scope = await captureObservationScope();
  if (!scope || scope.ownerId === 'guest') return { retried: 0, remaining: 0 };
  let ids: string[];
  try { ids = JSON.parse(localStorage.getItem(failedQueueKey(scope)) || '[]'); }
  catch { return { retried: 0, remaining: 0 }; }
  if (!Array.isArray(ids)) return { retried: 0, remaining: 0 };
  const records = await readLocal(scope);
  let retried = 0;
  for (const id of ids) {
    if (!await sameScope(scope)) break;
    const record = records.find((item) => item.id === id);
    if (record && await queueRemote(record, record.revision - 1) === 'pending') retried++;
  }
  let remaining = 0;
  try { remaining = JSON.parse(localStorage.getItem(failedQueueKey(scope)) || '[]').length; } catch {}
  return { retried, remaining };
}

export async function listObservations(): Promise<Observation[]> {
  const scope = await captureObservationScope();
  if (!scope) return [];
  const records = await readLocal(scope);
  if (!await sameScope(scope)) return [];
  return records.filter((record) => !record.deletedAt).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

/** Includes tombstones so migration readers cannot resurrect deleted legacy meals. */
export async function listObservationHistory(): Promise<Observation[]> {
  const scope = await captureObservationScope();
  if (!scope) return [];
  const records = await readLocal(scope);
  if (!await sameScope(scope)) return [];
  return records.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
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

export function observationFromRemote(row: any, scope: ObservationScope): Observation | null {
  if (!row || row.user_id !== scope.ownerId || row.profile_id !== scope.profileId || typeof row.id !== 'string' ||
      !Number.isInteger(row.revision) || row.revision < 1 || !Number.isFinite(Date.parse(row.recorded_at)) ||
      !Number.isFinite(Date.parse(row.created_at)) || !Number.isFinite(Date.parse(row.updated_at))) return null;
  const draft: ObservationDraft = {
    ownerId: row.user_id, profileId: row.profile_id, payload: row.payload,
    occurredAt: row.occurred_at, localDate: row.local_date, timezone: row.timezone,
    timePrecision: row.time_precision, source: row.source, evidenceType: row.evidence_type,
    sourceRecordId: row.source_record_id || undefined, sourceLocator: row.source_locator || undefined,
    references: row.record_references || [],
    idempotencyKey: row.idempotency_key,
  };
  if (!validateObservationDraft(draft).ok) return null;
  return { ...draft, id: row.id, schemaVersion: 1, recordedAt: row.recorded_at,
    revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at,
    deletedAt: row.deleted_at || null };
}

export async function resolveObservationConflict(entryId: string, choice: 'local' | 'remote') {
  const account = captureHealthMemoryScope();
  const scope = await captureObservationScope();
  if (!scope || !isHealthMemoryScopeCurrent(account)) throw new Error('Account changed.');
  const conflict = (await getObservationConflicts(scope.ownerId)).find(item => item.entryId === entryId);
  if (!conflict) throw new Error('Conflict is no longer available.');
  const lookup = await supabase.from('health_observations').select('*').eq('user_id', scope.ownerId).eq('profile_id', scope.profileId).eq('id', conflict.remote.id).maybeSingle();
  if (lookup.error) throw lookup.error;
  if (!isHealthMemoryScopeCurrent(account)) throw new Error('Account changed.');
  const remote = observationFromRemote(lookup.data, scope);
  const local = observationFromRemote(conflict.local, scope);
  if (!remote || !local || !sameObservationMutation(lookup.data, conflict.remote)) throw new Error('The cloud record changed. Retry sync and review the newer version.');
  // A deletion wins unless the person explicitly creates a new observation.
  if (choice === 'local' && remote.deletedAt && !local.deletedAt) throw new Error('The cloud record was deleted. Keep its deletion, or create a new observation explicitly.');
  return serialize(async () => {
    if (!isHealthMemoryScopeCurrent(account)) throw new Error('Account changed.');
    const records = await readLocal(scope);
    const current = records.find(item => item.id === local.id);
    if (!current || !sameObservationMutation(remoteRow(current, 0), conflict.local)) throw new Error('Your device record changed. Reopen the conflict.');
    const resolved = choice === 'remote' ? remote : { ...local, revision: remote.revision + 1, updatedAt: new Date().toISOString() };
    if (!await writeLocal(scope, records.map(item => item.id === resolved.id ? resolved : item))) throw new Error('Device storage is unavailable.');
    try { await settleObservationConflict(scope.ownerId, entryId, conflict.local); }
    catch (error) {
      if (isHealthMemoryScopeCurrent(account)) await writeLocal(scope, records);
      throw error;
    }
    if (choice === 'local' && await queueRemote(resolved, remote.revision) === 'queue_failed') throw new Error('Your decision was saved locally and needs a sync retry.');
    const auditKey = `hc_observation_conflict_history:${scope.ownerId}:${scope.profileId}`;
    let history: any[] = []; try { history = JSON.parse(localStorage.getItem(auditKey) || '[]'); } catch {}
    try { localStorage.setItem(auditKey, JSON.stringify([...history, { id: resolved.id, choice, at: new Date().toISOString(), localRevision: local.revision, remoteRevision: remote.revision, resolvedRevision: resolved.revision, local: conflict.local, remote: lookup.data }])); } catch { /* The resolved record and queue remain durable. */ }
    window.dispatchEvent(new CustomEvent('hc_observations_updated', { detail: { id: resolved.id } }));
    return resolved;
  });
}

/** Import account-owned server history without overwriting unsent or divergent local edits. */
export async function loadObservationsFromCloud(): Promise<ObservationCloudLoad> {
  const empty = (status: ObservationCloudLoad['status']): ObservationCloudLoad => ({ status, imported: 0, conflicts: 0 });
  const scope = await captureObservationScope();
  if (!scope) return empty('scope_changed');
  if (scope.ownerId === 'guest') return empty('local_only');
  const remote: Observation[] = [];
  const pageSize = 500;
  for (let offset = 0; offset < 50000; offset += pageSize) {
    if (!await sameScope(scope)) return empty('scope_changed');
    const { data, error } = await supabase.from('health_observations').select('*')
      .eq('user_id', scope.ownerId).eq('profile_id', scope.profileId)
      // Matches health_observations_owner_updated_idx (updated_at DESC, id ASC).
      .order('updated_at', { ascending: false }).order('id', { ascending: true }).range(offset, offset + pageSize - 1);
    if (error || !Array.isArray(data)) return empty('unavailable');
    const parsed = data.map((row) => observationFromRemote(row, scope));
    if (parsed.some((item) => !item)) return empty('unavailable');
    remote.push(...parsed as Observation[]);
    if (data.length < pageSize) break;
    if (offset + pageSize >= 50000) return empty('unavailable');
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
            JSON.stringify(item.payload) !== JSON.stringify(previous.payload) || item.deletedAt !== previous.deletedAt ||
            JSON.stringify(item.references || []) !== JSON.stringify(previous.references || []))) conflicts++;
        continue;
      }
      if (item.revision > previous.revision) { merged.set(item.id, item); imported++; continue; }
      if (item.revision < previous.revision || !sameObservationMutation(remoteRow(item, 0), remoteRow(previous, 0))) {
        conflicts++;
        // Recover a missing outbox entry without overwriting either source.
        await queueRemote(previous, previous.revision - 1);
      }
    }
    if (!await sameScope(scope)) return empty('scope_changed');
    if (imported && !await writeLocal(scope, [...merged.values()])) return empty('storage_failure');
    if (imported && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hc_observations_updated', { detail: { imported } }));
    return { status: conflicts ? 'conflict' : 'loaded', imported, conflicts };
  });
}

export async function createObservation(draft: ObservationDraft, deterministicLegacyId?: string): Promise<ObservationCommandResult> {
  const rewardScope = `hc_unified_profile_${draft.ownerId}:${draft.profileId}`;
  const account = captureHealthMemoryScope();
  draft = JSON.parse(JSON.stringify(draft));
  const validated = validateObservationDraft(draft);
  if (!validated.ok) return { ok: false, error: 'validation', details: validated.errors };
  if (draft.evidenceType !== 'user_report') return { ok: false, error: 'validation', details: ['Imported or clinician evidence requires a verified server import.'] };
  if (deterministicLegacyId && (draft.source !== 'legacy' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deterministicLegacyId)))
    return { ok: false, error: 'validation', details: ['A deterministic record ID is allowed only for a legacy import.'] };
  return serialize(async () => {
    if (!isHealthMemoryScopeCurrent(account) || !await sameScope(draft)) return { ok: false, error: 'scope_changed' } as const;
    const records = await readLocal(draft);
    const existing = records.find((record) => record.idempotencyKey === draft.idempotencyKey);
    if (existing) {
      if (existing.deletedAt) return { ok: false, error: 'revision_conflict' } as const;
      const { id, schemaVersion, recordedAt, revision, createdAt, updatedAt, deletedAt, ...original } = existing;
      if (JSON.stringify(original) !== JSON.stringify(draft)) return { ok: false, error: 'revision_conflict' } as const;
      // A previous local save may have succeeded while the outbox write failed.
      // Retrying the same idempotent command must retry its durable sync enqueue.
      const sync = await queueRemote(existing, existing.revision - 1);
      return { ok: true, observation: existing, sync } as const;
    }
    if (deterministicLegacyId && records.some((record) => record.id === deterministicLegacyId))
      return { ok: false, error: 'revision_conflict' } as const;
    const now = new Date().toISOString();
    const observation: Observation = { ...draft, id: deterministicLegacyId || newId(), schemaVersion: 1, recordedAt: now, revision: 1, createdAt: now, updatedAt: now, deletedAt: null };
    if (!isHealthMemoryScopeCurrent(account) || !await sameScope(draft)) return { ok: false, error: 'scope_changed' } as const;
    if (!await writeLocal(draft, [...records, observation])) return { ok: false, error: 'storage_failure' } as const;
    // Rewards follow a committed record and never turn a successful health write into an error.
    try {
      if (
        isHealthMemoryScopeCurrent(account) &&
        !deterministicLegacyId &&
        draft.source !== 'import'
      )
        completeActivity('record.saved', observation.id, rewardScope);
    } catch {
      /* Reward storage can retry independently. */
    }
    const sync = await queueRemote(observation, 0);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hc_observations_updated', { detail: { id: observation.id } }));
    return { ok: true, observation, sync } as const;
  });
}

export async function reviseObservation(id: string, expectedRevision: number, draft: ObservationDraft): Promise<ObservationCommandResult> {
  const account = captureHealthMemoryScope();
  draft = JSON.parse(JSON.stringify(draft));
  const validated = validateObservationDraft(draft);
  if (!validated.ok) return { ok: false, error: 'validation', details: validated.errors };
  if (draft.evidenceType !== 'user_report') return { ok: false, error: 'validation', details: ['Imported or clinician evidence requires a verified server import.'] };
  return serialize(async () => {
    if (!isHealthMemoryScopeCurrent(account) || !await sameScope(draft)) return { ok: false, error: 'scope_changed' } as const;
    const records = await readLocal(draft);
    const index = records.findIndex((record) => record.id === id && !record.deletedAt);
    if (index < 0) return { ok: false, error: 'not_found' } as const;
    const original = records[index];
    if (original.revision !== expectedRevision || original.idempotencyKey !== draft.idempotencyKey) return { ok: false, error: 'revision_conflict' } as const;
    const updated: Observation = { ...draft, id, schemaVersion: 1, recordedAt: original.recordedAt,
      revision: expectedRevision + 1, createdAt: original.createdAt, updatedAt: new Date().toISOString(), deletedAt: null };
    if (!isHealthMemoryScopeCurrent(account) || !await sameScope(draft)) return { ok: false, error: 'scope_changed' } as const;
    records[index] = updated;
    if (!await writeLocal(draft, records)) return { ok: false, error: 'storage_failure' } as const;
    const sync = await queueRemote(updated, expectedRevision);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hc_observations_updated', { detail: { id } }));
    return { ok: true, observation: updated, sync } as const;
  });
}

export async function deleteObservation(id: string, expectedRevision: number): Promise<ObservationCommandResult> {
  const account = captureHealthMemoryScope();
  return serialize(async () => {
    const scope = await captureObservationScope();
    if (!scope || !isHealthMemoryScopeCurrent(account)) return { ok: false, error: 'scope_changed' } as const;
    const records = await readLocal(scope);
    const index = records.findIndex((record) => record.id === id && !record.deletedAt);
    if (index < 0) return { ok: false, error: 'not_found' } as const;
    const original = records[index];
    if (original.revision !== expectedRevision) return { ok: false, error: 'revision_conflict' } as const;
    const now = new Date().toISOString();
    const deleted: Observation = { ...original, revision: expectedRevision + 1, updatedAt: now, deletedAt: now };
    if (!isHealthMemoryScopeCurrent(account) || !await sameScope(scope)) return { ok: false, error: 'scope_changed' } as const;
    records[index] = deleted;
    if (!await writeLocal(scope, records)) return { ok: false, error: 'storage_failure' } as const;
    const sync = await queueRemote(deleted, expectedRevision);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hc_observations_updated', { detail: { id } }));
    return { ok: true, observation: deleted, sync } as const;
  });
}
