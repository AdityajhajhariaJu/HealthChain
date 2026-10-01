import { del, get } from 'idb-keyval';
import { sameObservationMutation } from '../../shared/observation-sync-content.js';
import { captureAccountScope, isAccountScopeCurrent } from './AccountScope';
import { validateArchiveQueue, validateCloudRecovery } from './ArchiveRecoveryValidation';
import type { CaseItem } from './CaseEngine';
import { mergeCaseItems } from './CaseMergeEngine';
import { mergeConnectedProfiles } from './ConnectedProfileMerge';
import { isOwnerErased } from './DurableHealthStorage';
import { setOwned as set } from './OwnedIdb';
import { sendProfileSnapshot } from './ProfileCloudSync';
import { getProfileEngineState, getProfileKey } from './ProfileEngine';
import { applyProfileChoice } from './ProfileFieldMerge';
import { readProfileBaseline, rebaseDeviceProfile } from './ProfileSyncBaseline';
import { getItemSync } from './storage';
import { supabase } from './supabaseClient';
import { SyncStatusDetail, SyncStatusState } from './SyncTypes';
import { isTombstoned, recordTombstone } from './TombstoneManager';

type OutboxKind = 
  | 'ava_message_upsert'
  | 'case_upsert' 
  | 'case_delete' 
  | 'health_memory_upsert' 
  | 'health_observation_upsert'
  | 'profile_upsert' 
  | 'caregiver_profile_upsert'
  | 'fitness_history_upsert'
  | 'body_measurements_upsert'
  | 'health_metrics_upsert'
  | 'archive_cloud_restore';

interface OutboxEntry {
  id: string;
  kind: OutboxKind;
  userId: string;
  payload: any;
  attempts: number;
  createdAt: string;
  lastError?: string;
  scopeKey?: string;
  conflictRemote?: any;
}

let flushInFlight: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncError: string | null = null;
let lastSyncedAt: string | null = null;
const MAX_OUTBOX_ENTRIES = 500;

function currentUserKey(userId: string) { return `hc_sync_outbox_${userId}`; }

function getCurrentScope(): string {
  try {
    return `${getProfileKey()}:${getProfileEngineState()?.activeId || 'profile_1'}`;
  } catch {
    return 'default:profile_1';
  }
}

async function readQueue(userId: string): Promise<OutboxEntry[]> {
  if (isOwnerErased(userId)) return [];
  const key = currentUserKey(userId);
  let indexedDbQueue: OutboxEntry[] = [];
  try {
    const value = await get(key);
    if (Array.isArray(value)) indexedDbQueue = value;
  } catch {}
  let fallbackQueue: OutboxEntry[] = [];
  try {
    const value = JSON.parse(getItemSync(key) || '[]');
    if (Array.isArray(value)) fallbackQueue = value;
  } catch {}
  const merged = new Map<string, OutboxEntry>();
  for (const entry of [...indexedDbQueue, ...fallbackQueue]) {
    if (!entry || entry.userId !== userId || !entry.id) continue;
    const previous = merged.get(entry.id);
    const priorRevision = Number(previous?.payload?.revision || 0);
    const nextRevision = Number(entry.payload?.revision || 0);
    if (!previous || nextRevision > priorRevision ||
        (nextRevision === priorRevision && String(entry.payload?.updated_at || '') >= String(previous.payload?.updated_at || ''))) {
      merged.set(entry.id, entry);
    }
  }
  const queue = [...merged.values()];
  if (fallbackQueue.length > 0 && !isOwnerErased(userId)) {
    try {
      await set(key, queue);
      if (isOwnerErased(userId)) { await del(key); return []; }
      try { window.localStorage.removeItem(key); } catch {}
    } catch {
      // Leave fallback entries in place until reconciliation can persist.
    }
  }
  return queue;
}

async function writeQueue(userId: string, queue: OutboxEntry[]) {
  if (isOwnerErased(userId)) return false;
  const key = currentUserKey(userId);
  try {
    await set(key, queue);
    if (isOwnerErased(userId)) { await del(key); return false; }
    try { window.localStorage.removeItem(key); } catch {}
    return true;
  } catch {}
  try { window.localStorage.setItem(key, JSON.stringify(queue)); return true; } catch {}
  return false;
}

function entryId() {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

let queueMutation:Promise<unknown>=Promise.resolve();
function serializeQueue<T>(work:()=>Promise<T>):Promise<T>{
 const result=queueMutation.then(work,work);queueMutation=result.catch(()=>{});return result;
}
export function enqueueSync(kind:OutboxKind,userId:string,payload:any){
 return serializeQueue(()=>enqueueSyncUnserialized(kind,userId,payload));
}
async function enqueueSyncUnserialized(kind: OutboxKind, userId: string, payload: any) {
  if (!userId || isOwnerErased(userId)) return false;
  const queue = await readQueue(userId);
  const stableId = payload?.id || payload?.profile_id || payload?.data?.id || entryId();
  const existing = queue.findIndex((entry) => entry.kind === kind &&
    (entry.payload?.id || entry.payload?.profile_id || entry.payload?.data?.id) === stableId &&
    (kind !== 'health_observation_upsert' || entry.payload?.revision === payload?.revision));
  const currentScope = getCurrentScope();
  if (kind === 'caregiver_profile_upsert' || kind === 'profile_upsert') {
    payload = { ...payload, _sync_base: existing >= 0 ? queue[existing].payload._sync_base
      : payload._sync_base ?? readProfileBaseline(userId, payload.profile_id || 'profile_1') ?? {} };
  }
  const entry: OutboxEntry = {
    id: existing >= 0 ? queue[existing].id : entryId(),
    kind,
    userId,
    payload: JSON.parse(JSON.stringify(payload)),
    attempts: existing >= 0 ? queue[existing].attempts : 0,
    createdAt: existing >= 0 ? queue[existing].createdAt : new Date().toISOString(),
    scopeKey: currentScope,
  };
  if (existing >= 0) queue[existing] = entry;
  else if (queue.length >= MAX_OUTBOX_ENTRIES) {
    const detail = { count: queue.length, reason: 'outbox_full', kind };
    lastSyncError = 'Offline changes are waiting to sync. Reconnect before adding more records.';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hc_sync_backpressure', { detail }));
      window.dispatchEvent(new CustomEvent('hc_sync_pending', { detail }));
    }
    return false;
  } else queue.push(entry);
  if (!await writeQueue(userId, queue)) {
    lastSyncError = 'Offline changes could not be saved for sync. Free device storage and try again.';
    return false;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_sync_pending', { detail: { count: queue.length } }));
  }
  return true;
}

async function send(entry: OutboxEntry, expectedScope?: string) {
  if (entry.kind === 'archive_cloud_restore') {
    validateCloudRecovery(entry.payload.archive, entry.userId);
    const result = await supabase.rpc('restore_health_archive_records', { p_archive: entry.payload.archive });
    if (result.error) return result;
    return { error: result.data?.success ? null : new Error('Cloud archive recovery was not acknowledged') };
  }
  const table = entry.kind === 'case_upsert' || entry.kind === 'case_delete'
    ? 'cases'
    : entry.kind === 'ava_message_upsert' ? 'ava_messages'
    : entry.kind === 'health_memory_upsert' ? 'health_memory'
      : entry.kind === 'health_observation_upsert' ? 'health_observations'
      : entry.kind === 'caregiver_profile_upsert' ? 'healthchain_profiles'
      : entry.kind === 'fitness_history_upsert' ? 'user_fitness_history'
      : entry.kind === 'body_measurements_upsert' ? 'user_body_measurements'
      : entry.kind === 'health_metrics_upsert' ? 'user_health_metrics' : 'profiles';
  const recordId = entry.payload?.id;
  const localUpdatedAt = entry.payload?.updated_at;

  // Protect non-case entities from stale offline snapshots overwriting newer remote updates
  if (entry.kind !== 'case_upsert' && entry.kind !== 'case_delete' &&
      entry.kind !== 'health_observation_upsert' && entry.kind !== 'caregiver_profile_upsert' && entry.kind !== 'profile_upsert' &&
      recordId && localUpdatedAt) {
    const ownerColumn = table === 'profiles' ? 'id' : 'user_id';
    const remoteResult = table === 'healthchain_profiles'
      ? await supabase.from(table).select('updated_at').eq(ownerColumn, entry.userId)
        .eq('profile_id', entry.payload.profile_id).maybeSingle()
      : await supabase.from(table).select('updated_at').eq(ownerColumn, entry.userId)
        .eq('id', recordId).maybeSingle();
    const { data: remote, error: readError } = remoteResult;
    if (readError && readError.code !== 'PGRST116') return { error: readError };
    if (remote?.updated_at && new Date(remote.updated_at).getTime() > new Date(localUpdatedAt).getTime()) {
      return { error: new Error(`A newer cloud ${table} record needs review. Your local change remains saved on this device.`) };
    }
  }

  if (entry.kind === 'case_upsert') {
    const caseId = recordId;
    const profileId = entry.payload?.data?.__profileId || getProfileEngineState()?.activeId || 'profile_1';

    // 1. Tombstone check: if case was deleted locally or remotely, do not resurrect
    if (caseId) {
      const tombstoned = await isTombstoned(caseId, entry.userId, profileId);
      if (tombstoned) {
        return { error: null };
      }

      // Also check remote case_tombstones
      try {
        const { data: remoteTombstone } = await supabase
          .from('case_tombstones')
          .select('id')
          .eq('user_id', entry.userId)
          .eq('id', caseId)
          .maybeSingle();

        if (remoteTombstone) {
          await recordTombstone({
            id: caseId,
            entityType: 'case',
            deletedAt: new Date().toISOString(),
            userId: entry.userId,
            profileId,
          });
          return { error: null };
        }
      } catch {}
    }

    if (expectedScope && getCurrentScope() !== expectedScope) {
      return { error: new Error('Scope switched during case sync operation') };
    }

    // 2. Try atomic revision-conditional sync via RPC if available
    const expectedRevision = entry.payload?.expected_revision !== undefined
      ? entry.payload.expected_revision
      : (entry.payload?.data?.revision !== undefined ? entry.payload.data.revision - 1 : (entry.payload?.revision !== undefined ? entry.payload.revision - 1 : 0));

    if (supabase.rpc && caseId) {
      const { data: rpcData, error: rpcError } = await supabase.rpc('sync_case_with_revision_check', {
        p_user_id: entry.userId,
        p_case_id: caseId,
        p_expected_revision: expectedRevision,
        p_payload: entry.payload,
      });

      if (!rpcError && rpcData) {
        if (rpcData.success) {
          if (entry.payload?.data) {
            entry.payload.data.revision = rpcData.new_revision;
          }
          entry.payload.revision = rpcData.new_revision;
          return { error: null };
        }

        if (rpcData.conflict) {
          if (rpcData.deleted) {
            await recordTombstone({
              id: caseId,
              entityType: 'case',
              deletedAt: rpcData.deleted_at || new Date().toISOString(),
              userId: entry.userId,
              profileId,
            });
            return { error: null };
          }

          // Revision conflict: 3-way merge
          const remoteCase = (rpcData.current_data?.data || rpcData.current_data) as CaseItem;
          const localCase = (entry.payload?.data || entry.payload) as CaseItem;

          if (remoteCase && localCase) {
            const mergeResult = mergeCaseItems(localCase, remoteCase);
            const nextRevision = Math.max(localCase.revision || 1, rpcData.current_revision || 1) + 1;
            const mergedCase: CaseItem = {
              ...mergeResult.merged,
              revision: nextRevision,
              updatedAt: new Date().toISOString(),
            };

            entry.payload.data = mergedCase;
            entry.payload.title = mergedCase.title;
            entry.payload.revision = nextRevision;
            entry.payload.expected_revision = rpcData.current_revision;
            entry.payload.updated_at = mergedCase.updatedAt;

            if (mergeResult.conflicts.length > 0 && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('hc_sync_conflict', {
                detail: { caseId, conflicts: mergeResult.conflicts }
              }));
            }

            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('hc_case_merged', {
                detail: { case: mergedCase }
              }));
            }

            return { error: new Error(`Revision conflict on case ${caseId}: server is at revision ${rpcData.current_revision}; 3-way merged and scheduled retry`) };
          }
        }
      }

      if (rpcError && rpcError.code !== '42883' && !rpcError.message?.includes('does not exist') && !rpcError.message?.includes('Unknown RPC')) {
        return { error: rpcError };
      }
    }

    // 3. Fallback when RPC is unavailable: Concurrency-safe read & merge before write
    if (caseId) {
      const { data: remoteRow, error: readError } = await supabase
        .from('cases')
        .select('data, revision, updated_at, deleted_at')
        .eq('user_id', entry.userId)
        .eq('id', caseId)
        .maybeSingle();

      if (readError && readError.code !== 'PGRST116') {
        return { error: readError };
      }

      if (remoteRow) {
        // If server marked deleted_at, record tombstone locally and drop
        if (remoteRow.deleted_at) {
          await recordTombstone({
            id: caseId,
            entityType: 'case',
            deletedAt: remoteRow.deleted_at,
            userId: entry.userId,
            profileId,
          });
          return { error: null };
        }

        const remoteCase = remoteRow.data as CaseItem;
        const localCase = entry.payload?.data as CaseItem;

        if (remoteCase && localCase) {
          // Perform 3-way merge by stable entity IDs
          const mergeResult = mergeCaseItems(localCase, remoteCase);
          const nextRevision = Math.max(localCase.revision || 1, remoteRow.revision || 1) + 1;
          const mergedCase: CaseItem = {
            ...mergeResult.merged,
            revision: nextRevision,
            updatedAt: new Date().toISOString(),
          };

          entry.payload.data = mergedCase;
          entry.payload.title = mergedCase.title;
          entry.payload.revision = nextRevision;
          entry.payload.updated_at = mergedCase.updatedAt;

          // Dispatch conflict event if competing edits occurred
          if (mergeResult.conflicts.length > 0 && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('hc_sync_conflict', {
              detail: { caseId, conflicts: mergeResult.conflicts }
            }));
          }

          // Notify local case cache of the merged state
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('hc_case_merged', {
              detail: { case: mergedCase }
            }));
          }
        }
      } else {
        // New record on server: ensure revision is initialized
        if (!entry.payload.revision) {
          entry.payload.revision = entry.payload?.data?.revision || 1;
        }
      }
    }

    if (expectedScope && getCurrentScope() !== expectedScope) {
      return { error: new Error('Scope switched during case sync operation') };
    }

    const caseRow = { ...entry.payload };
    // This controls the RPC; it is not a column in the cases table.
    delete caseRow.expected_revision;
    return supabase.from('cases').upsert(caseRow, { onConflict: 'id' });
  }

  if (entry.kind === 'case_delete') {
    const caseId = entry.payload.id;
    const profileId = entry.payload.profile_id || getProfileEngineState()?.activeId || 'profile_1';
    const deletedAt = entry.payload.updated_at || new Date().toISOString();

    if (expectedScope && getCurrentScope() !== expectedScope) {
      return { error: new Error('Scope switched during case deletion operation') };
    }

    // 1. Record local tombstone to prevent resurrection from other tabs/reconnects
    await recordTombstone({
      id: caseId,
      entityType: 'case',
      deletedAt,
      userId: entry.userId,
      profileId,
    });

    // 2. Try atomic server-side delete with tombstone via RPC if available
    if (supabase.rpc) {
      const { data: rpcSuccess, error: rpcError } = await supabase.rpc('delete_case_with_tombstone', {
        p_user_id: entry.userId,
        p_case_id: caseId,
        p_profile_id: profileId,
        p_deleted_at: deletedAt,
      });

      if (!rpcError && rpcSuccess) {
        return { error: null };
      }

      if (rpcError && rpcError.code !== '42883' && !rpcError.message?.includes('does not exist') && !rpcError.message?.includes('Unknown RPC')) {
        return { error: rpcError };
      }
    }

    // 3. Fallback: Push durable tombstone to Supabase case_tombstones first
    const { error: tombError } = await supabase.from('case_tombstones').upsert({
      id: caseId,
      user_id: entry.userId,
      profile_id: profileId,
      deleted_at: deletedAt,
    });

    if (tombError) {
      // CRITICAL: NEVER delete from cases if durable tombstone failed!
      // Abort deletion immediately to avoid resurrection races.
      return { error: tombError };
    }

    // 4. Delete from cases only after durable tombstone is successfully written
    return supabase.from('cases').delete().eq('id', caseId).eq('user_id', entry.userId);
  }

  if (entry.kind === 'health_observation_upsert') {
    if (entry.scopeKey && entry.scopeKey !== getCurrentScope()) return { error: new Error('Scope switched during observation sync operation') };
    const { expected_revision: expectedRevision, ...row } = entry.payload || {};
    if (!row.id || row.user_id !== entry.userId || row.profile_id !== 'profile_1' || !Number.isInteger(row.revision)) {
      return { error: new Error('Invalid observation sync payload') };
    }
    const lookup = () => supabase.from('health_observations').select('*')
      .eq('id', row.id).eq('user_id', entry.userId).eq('profile_id', row.profile_id).maybeSingle();
    if (!expectedRevision) {
      const inserted = await supabase.from('health_observations').insert(row);
      if (!inserted.error) return inserted;
      if (inserted.error.code !== '23505') return inserted;
      const existing = await lookup();
      if (existing.error) return { error: existing.error };
      return { error: sameObservationMutation(row, existing.data)
        ? null : Object.assign(new Error('Observation revision conflict'), { conflictRemote: existing.data }) };
    }
    const updated = await supabase.from('health_observations').update(row)
      .eq('id', row.id).eq('user_id', entry.userId).eq('profile_id', row.profile_id)
      .eq('revision', expectedRevision).select('id').maybeSingle();
    if (updated.error || updated.data) return updated;
    const existing = await lookup();
    if (existing.error) return { error: existing.error };
    if (!existing.data) return supabase.from('health_observations').insert(row);
    return { error: sameObservationMutation(row, existing.data)
      ? null : Object.assign(new Error('Observation revision conflict'), { conflictRemote: existing.data }) };
  }

  if (entry.kind === 'health_memory_upsert') {
    const result = await supabase.from('health_memory').upsert(entry.payload, { onConflict: 'id' });
    if (result.error?.code === '23505' && entry.payload?.dedupe_key) {
      const { data: existing, error: lookupError } = await supabase
        .from('health_memory')
        .select('id')
        .eq('user_id', entry.userId)
        .eq('profile_id', entry.payload.profile_id)
        .eq('dedupe_key', entry.payload.dedupe_key)
        .maybeSingle();
      if (!lookupError && existing?.id) {
        const replacement = { ...entry.payload, id: existing.id };
        return supabase.from('health_memory').update(replacement)
          .eq('id', existing.id)
          .eq('user_id', entry.userId);
      }
    }
    return result;
  }

  if (entry.kind === 'caregiver_profile_upsert' || entry.kind === 'profile_upsert') return sendProfileSnapshot(entry);

  if (entry.kind === 'fitness_history_upsert') {
    return supabase.from('user_fitness_history').upsert(entry.payload, { onConflict: 'id' });
  }

  if (entry.kind === 'ava_message_upsert') {
    if (entry.payload?.user_id !== entry.userId || entry.payload?.profile_id !== 'profile_1') return {error:new Error('Invalid Ava owner')};
    if (expectedScope && getCurrentScope() !== expectedScope) return {error:new Error('Account changed during Ava sync')};
    return supabase.from('ava_messages').upsert(entry.payload, {onConflict:'id'});
  }

  if (entry.kind === 'body_measurements_upsert') {
    return supabase.from('user_body_measurements').upsert(entry.payload, { onConflict: 'id' });
  }

  if (entry.kind === 'health_metrics_upsert') {
    return supabase.from('user_health_metrics').upsert(entry.payload, { onConflict: 'user_id,metric_type,start_time,end_time' });
  }

  return { error: new Error('Unknown outbox kind') };
}

export async function flushSyncOutbox(userId?: string) {
  if (flushInFlight) return flushInFlight;
  flushInFlight = (async () => {
    const accountScope = captureAccountScope();
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const { data: { session } } = await supabase.auth.getSession();
    const accountId = userId || session?.user?.id;
    if (!accountId || isOwnerErased(accountId) || !isAccountScopeCurrent(accountScope) || session?.user?.id !== accountId || accountScope.accountId !== accountId) return;

    const startScope = getCurrentScope();
    const queue = await readQueue(accountId);
    if (!queue.length) {
      lastSyncError = null;
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hc_sync_complete', { detail: { at: lastSyncedAt } }));
      return;
    }
    // send() updates revisions and conflict payloads. Compare concurrent
    // enqueues against an immutable snapshot, not those mutated entries.
    const initialPayloadById = new Map(queue.map(entry => [entry.id, JSON.stringify(entry.payload)]));

    const remaining: OutboxEntry[] = [];
    const profileAcknowledgements = new Map<string, any>();
    for (const entry of queue) {
      if (entry.conflictRemote) { remaining.push(entry); continue; }
      // Step 15: Guard against profile switch mid-operation
      if (getCurrentScope() !== startScope || !isAccountScopeCurrent(accountScope)) {
        remaining.push(entry);
        continue;
      }

      try {
        const result = await send(entry, startScope);
        const { error } = result;
        if (!isAccountScopeCurrent(accountScope)) return;
        if (error) throw error;
        if ('profileAcknowledgement' in result) profileAcknowledgements.set(entry.id, result.profileAcknowledgement);
        lastSyncError = null;
        lastSyncedAt = new Date().toISOString();
      } catch (error: any) {
        if (error?.message?.includes('Scope switched')) {
          remaining.push(entry);
          continue;
        }
        lastSyncError = error?.message || 'Sync failed';
        const isNetworkError =
          (typeof navigator !== 'undefined' && !navigator.onLine) ||
          error?.message?.includes('Failed to fetch') ||
          error?.message?.includes('NetworkError') ||
          error?.message?.includes('network') ||
          error?.message?.includes('fetch failed') ||
          error?.name === 'AbortError' ||
          error?.code === 'PGRST000';

        const isAuthError =
          error?.code === 'PGRST301' ||
          error?.status === 401 ||
          error?.message?.includes('JWT expired') ||
          error?.message?.includes('invalid claim');

        if (isAuthError) {
          // Auth expired: preserve queue item without incrementing attempts penalty
          remaining.push({ ...entry, lastError: 'Authentication expired' });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('hc_sync_auth_expired', { detail: error }));
          }
        } else if (isNetworkError) {
          remaining.push({ ...entry, lastError: error?.message || 'Network unavailable' });
        } else {
          // Preserve unsynced clinical data until the underlying schema or
          // service problem is repaired. Never discard it after retries.
          remaining.push({ ...entry, attempts: Math.min(entry.attempts + 1, 25), lastError: error?.message || 'Sync failed', ...(error?.conflictRemote ? { conflictRemote: error.conflictRemote } : {}) });
        }
      }
    }

    // Enqueues can occur while network requests are in flight. Re-read and
    // merge new or updated entries instead of replacing them with the stale
    // snapshot captured at the beginning of this flush.
    const persistedRemaining = await serializeQueue(async()=>{
    if (!isAccountScopeCurrent(accountScope)) return remaining;
    const latestQueue = await readQueue(accountId);
    const concurrentEntries = latestQueue.filter((entry) => {
      const initial = initialPayloadById.get(entry.id);
      return initial === undefined || initial !== JSON.stringify(entry.payload);
    });
    for (const entry of concurrentEntries) {
      const ack = profileAcknowledgements.get(entry.id);
      if (!ack || entry.kind !== 'caregiver_profile_upsert') continue;
      const rebased = mergeConnectedProfiles(ack.local, entry.payload.data, ack.cloud, accountId, ack.profileId);
      let data = rebased.merged;
      for (const field of rebased.conflicts) data = applyProfileChoice(data, field, 'local');
      entry.payload = { ...entry.payload, data, _sync_base: ack.cloud };
    }
    const merged = new Map(remaining.map((entry) => [entry.id, entry]));
    concurrentEntries.forEach((entry) => merged.set(entry.id, entry));
    const result = Array.from(merged.values());
    if (!await writeQueue(accountId, result)) {
      lastSyncError = 'Sync results could not be saved on this device.';
      throw new Error(lastSyncError);
    }

    return result;
    });

    if (persistedRemaining.length) {
      const failedEntry = persistedRemaining.find(entry => entry.lastError);
      lastSyncError = failedEntry?.lastError || null;
      if (persistedRemaining.some(entry => entry.conflictRemote) && typeof window !== 'undefined')
        window.dispatchEvent(new CustomEvent('hc_sync_conflict', { detail: { entityType: 'observation' } }));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hc_sync_pending', { detail: { count: persistedRemaining.length } }));
        if (lastSyncError) window.dispatchEvent(new CustomEvent('hc_sync_error', { detail: { message: lastSyncError, count: persistedRemaining.length } }));
      }
      if (persistedRemaining.some(entry => !entry.conflictRemote) && (typeof navigator === 'undefined' || navigator.onLine)) {
        const attempts = Math.min(...persistedRemaining.map((entry) => entry.attempts));
        const delay = Math.min(5 * 60 * 1000, Math.max(5000, 5000 * (2 ** Math.min(attempts, 5))));
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            flushSyncOutbox().catch(() => {});
          }, delay);
        }
      }
    } else {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hc_sync_complete', { detail: { at: lastSyncedAt } }));
      }
    }
  })().finally(() => { flushInFlight = null; });
  return flushInFlight;
}

export async function getPendingSyncCount(userId: string): Promise<number> {
  return (await readQueue(userId)).length;
}

/** Protect unsent local observation revisions while importing remote history. */
export async function getPendingObservationIds(userId: string, profileId: string): Promise<Set<string>> {
  const queue = await readQueue(userId);
  return new Set(queue.filter((entry) => entry.kind === 'health_observation_upsert' &&
    entry.payload?.user_id === userId && entry.payload?.profile_id === profileId &&
    typeof entry.payload?.id === 'string').map((entry) => entry.payload.id as string));
}

export async function getSyncStatus(userId?: string): Promise<SyncStatusDetail> {
  if (!userId) {
    return {
      state: 'saved_locally',
      pendingCount: 0,
      conflictsCount: 0,
      lastSyncedAt: lastSyncedAt || undefined,
      lastError: lastSyncError || undefined,
    };
  }
  const queue = await readQueue(userId);
  let state: SyncStatusState = 'synced';
  if (queue.some(entry => entry.conflictRemote)) state = 'conflict_needs_review';
  else if (lastSyncError && queue.length > 0) {
    state = 'sync_failed';
  } else if (queue.length > 0) {
    state = 'sync_pending';
  }

  return {
    state,
    pendingCount: queue.length,
    lastSyncedAt: lastSyncedAt || undefined,
    lastError: lastSyncError || undefined,
    conflictsCount: queue.filter(entry => entry.conflictRemote).length,
  };
}

export async function clearSyncOutbox(userId: string) {
  if (!userId) return;
  const key = currentUserKey(userId);
  try { await del(key); } catch {}
  try { window.localStorage.removeItem(key); } catch {}
}
/** Restore atomically with concurrent enqueues; existing device edits are never dropped. */
export function restoreArchivedSyncQueue(userId: string, archived: any[], cloud: any) {
  return serializeQueue(async () => {
    const scope = captureAccountScope();
    if (scope.accountId !== userId || !isAccountScopeCurrent(scope)) throw new Error('Account changed.');
    validateArchiveQueue({ [currentUserKey(userId)]: archived }, userId);
    validateCloudRecovery(cloud, userId);
    const current = await readQueue(userId), restored: OutboxEntry[] = [];
    if (cloud) restored.push({ id: entryId(), kind: 'archive_cloud_restore', userId, payload: { archive: cloud }, attempts: 0, createdAt: new Date().toISOString(), scopeKey: getCurrentScope() });
    for (const source of archived) {
      const sameId = current.find(entry => entry.id === source.id);
      if (sameId && JSON.stringify(sameId.payload) === JSON.stringify(source.payload)) continue;
      const entry = { ...JSON.parse(JSON.stringify(source)), id: sameId ? entryId() : source.id, scopeKey: getCurrentScope() };
      // Imported review state is untrusted and can be recomputed against the actual cloud.
      delete entry.conflictRemote; delete entry.lastError; entry.attempts = 0;
      restored.push(entry);
    }
    const queue = [...restored, ...current];
    if (queue.length > MAX_OUTBOX_ENTRIES) throw new Error('The restored and current unsent changes exceed device capacity. Sync existing changes first.');
    if (!isAccountScopeCurrent(scope) || !await writeQueue(userId, queue)) throw new Error('Unsent changes could not be restored.');
    window.dispatchEvent(new CustomEvent('hc_sync_pending', { detail: { count: queue.length } }));
    return restored.length;
  });
}
export async function exportSyncQueue(userId: string) { return JSON.parse(JSON.stringify(await serializeQueue(() => readQueue(userId)))); }

export async function getObservationConflicts(userId: string) {
  return (await readQueue(userId)).filter(entry => entry.kind === 'health_observation_upsert' && entry.conflictRemote)
    .map(entry => JSON.parse(JSON.stringify({ entryId: entry.id, local: entry.payload, remote: entry.conflictRemote })));
}
export async function getProfileConflicts(userId: string) {
  return (await readQueue(userId)).filter(entry => ['profile_upsert', 'caregiver_profile_upsert'].includes(entry.kind) && entry.conflictRemote)
    .map(entry => JSON.parse(JSON.stringify(entry)));
}
export function settleProfileConflict(userId: string, reviewed: any, choices: Record<string, 'local' | 'remote'>) {
  return serializeQueue(async () => {
    const scope = captureAccountScope();
    if (scope.accountId !== userId) throw new Error('Account changed.');
    const queue = await readQueue(userId), entry = queue.find(item => item.id === reviewed.id);
    if (!entry || JSON.stringify(entry.payload) !== JSON.stringify(reviewed.payload) ||
        JSON.stringify(entry.conflictRemote) !== JSON.stringify(reviewed.conflictRemote)) throw new Error('This profile changed during review. Reopen it.');
    let merged = entry.conflictRemote.merged;
    for (const field of entry.conflictRemote.fields) {
      const choice = choices[JSON.stringify(field.path)];
      if (!choice) throw new Error('Choose a value for every conflicting field.');
      merged = applyProfileChoice(merged, field, choice);
    }
    entry.kind = 'caregiver_profile_upsert';
    entry.payload = { user_id: userId, profile_id: reviewed.payload.profile_id || 'profile_1',
      profile_name: merged.profileName || 'My Profile', data: merged, _sync_base: entry.conflictRemote.data };
    delete entry.conflictRemote; delete entry.lastError; entry.attempts = 0;
    if (!isAccountScopeCurrent(scope) || !await writeQueue(userId, queue)) throw new Error('The profile decision could not be saved.');
    rebaseDeviceProfile(userId, entry.payload.profile_id, reviewed.payload.data || {}, merged);
    window.dispatchEvent(new Event('hc_profile_updated'));
    window.dispatchEvent(new Event('hc_sync_pending'));
  });
}
/** Drop a reviewed snapshot only. Concurrent newer edits are never discarded. */
export function settleObservationConflict(userId: string, entryId: string, expectedPayload: any) {
  return serializeQueue(async () => {
    const queue = await readQueue(userId);
    const entry = queue.find(item => item.id === entryId);
    if (!entry || JSON.stringify(entry.payload) !== JSON.stringify(expectedPayload)) throw new Error('This edit changed during review. Reopen the conflict.');
    const remaining = queue.filter(item => item.kind !== 'health_observation_upsert' || item.payload.id !== entry.payload.id);
    if (!await writeQueue(userId, remaining)) throw new Error('The conflict decision could not be saved.');
  });
}
