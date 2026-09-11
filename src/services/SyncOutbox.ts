import { del, get, set } from 'idb-keyval';
import { getItemSync, setItemSync } from './storage';
import { supabase } from './supabaseClient';
import type { CaseItem } from './CaseEngine';
import { mergeCaseItems } from './CaseMergeEngine';
import { recordTombstone, isTombstoned } from './TombstoneManager';
import { SyncStatusDetail, SyncStatusState } from './SyncTypes';
import { getProfileKey, getProfileEngineState } from './ProfileEngine';

type OutboxKind = 
  | 'case_upsert' 
  | 'case_delete' 
  | 'health_memory_upsert' 
  | 'profile_upsert' 
  | 'caregiver_profile_upsert'
  | 'fitness_history_upsert'
  | 'body_measurements_upsert'
  | 'health_metrics_upsert';

interface OutboxEntry {
  id: string;
  kind: OutboxKind;
  userId: string;
  payload: any;
  attempts: number;
  createdAt: string;
  lastError?: string;
  scopeKey?: string;
}

let flushInFlight: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncError: string | null = null;
let lastSyncedAt: string | null = null;

function currentUserKey(userId: string) { return `hc_sync_outbox_${userId}`; }

function getCurrentScope(): string {
  try {
    return `${getProfileKey()}:${getProfileEngineState()?.activeId || 'profile_1'}`;
  } catch {
    return 'default:profile_1';
  }
}

async function readQueue(userId: string): Promise<OutboxEntry[]> {
  const key = currentUserKey(userId);
  let indexedDbQueue: OutboxEntry[] | null = null;
  try {
    const value = await get(key);
    if (Array.isArray(value)) {
      indexedDbQueue = value;
      if (value.length > 0) return value;
    }
  } catch {}
  try {
    const value = JSON.parse(getItemSync(key) || '[]');
    if (Array.isArray(value) && value.length > 0) {
      // Migrate a queue written by an older/fallback storage path into the
      // primary store before returning it. This prevents an empty IndexedDB
      // namespace from masking recoverable localStorage work.
      try { await set(key, value); } catch {}
      return value;
    }
  } catch {}
  return indexedDbQueue || [];
}

const MAX_QUEUE_SIZE = 500;

async function writeQueue(userId: string, queue: OutboxEntry[]) {
  const key = currentUserKey(userId);
  const bounded = queue.slice(-MAX_QUEUE_SIZE);
  try {
    await set(key, bounded);
    try { window.localStorage.removeItem(key); } catch {}
    return;
  } catch {}
  try { setItemSync(key, JSON.stringify(bounded)); } catch {}
}

function entryId() {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

export async function enqueueSync(kind: OutboxKind, userId: string, payload: any) {
  if (!userId) return;
  const queue = await readQueue(userId);
  const stableId = payload?.id || payload?.profile_id || payload?.data?.id || entryId();
  const existing = queue.findIndex((entry) => entry.kind === kind &&
    (entry.payload?.id || entry.payload?.profile_id || entry.payload?.data?.id) === stableId);
  const currentScope = getCurrentScope();
  const entry: OutboxEntry = {
    id: existing >= 0 ? queue[existing].id : entryId(),
    kind,
    userId,
    payload,
    attempts: existing >= 0 ? queue[existing].attempts : 0,
    createdAt: existing >= 0 ? queue[existing].createdAt : new Date().toISOString(),
    scopeKey: currentScope,
  };
  if (existing >= 0) queue[existing] = entry;
  else queue.push(entry);
  await writeQueue(userId, queue);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_sync_pending', { detail: { count: queue.length } }));
  }
}

async function send(entry: OutboxEntry, expectedScope?: string) {
  const table = entry.kind === 'case_upsert' || entry.kind === 'case_delete'
    ? 'cases'
    : entry.kind === 'health_memory_upsert' ? 'health_memory'
      : entry.kind === 'caregiver_profile_upsert' ? 'healthchain_profiles'
      : entry.kind === 'fitness_history_upsert' ? 'user_fitness_history'
      : entry.kind === 'body_measurements_upsert' ? 'user_body_measurements'
      : entry.kind === 'health_metrics_upsert' ? 'user_health_metrics' : 'profiles';
  const recordId = entry.payload?.id;
  const localUpdatedAt = entry.payload?.updated_at;

  // Protect non-case entities from stale offline snapshots overwriting newer remote updates
  if (entry.kind !== 'case_upsert' && entry.kind !== 'case_delete' && recordId && localUpdatedAt) {
    const ownerColumn = table === 'profiles' ? 'id' : 'user_id';
    const remoteResult = table === 'healthchain_profiles'
      ? await supabase.from(table).select('updated_at').eq(ownerColumn, entry.userId)
        .eq('profile_id', entry.payload.profile_id).maybeSingle()
      : await supabase.from(table).select('updated_at').eq(ownerColumn, entry.userId)
        .eq('id', recordId).maybeSingle();
    const { data: remote, error: readError } = remoteResult;
    if (readError && readError.code !== 'PGRST116') return { error: readError };
    if (remote?.updated_at && new Date(remote.updated_at).getTime() > new Date(localUpdatedAt).getTime()) {
      return { error: null };
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

    return supabase.from('cases').upsert(entry.payload, { onConflict: 'id' });
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

  if (entry.kind === 'caregiver_profile_upsert') {
    return supabase.from('healthchain_profiles').upsert(entry.payload, { onConflict: 'user_id,profile_id' });
  }

  if (entry.kind === 'profile_upsert') {
    return supabase.from('profiles').upsert(entry.payload, { onConflict: 'id' });
  }

  if (entry.kind === 'fitness_history_upsert') {
    return supabase.from('user_fitness_history').upsert(entry.payload, { onConflict: 'id' });
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
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const { data: { session } } = await supabase.auth.getSession();
    const accountId = userId || session?.user?.id;
    if (!accountId) return;
    if (userId && session?.user?.id && userId !== session.user.id) return;

    const startScope = getCurrentScope();
    const queue = await readQueue(accountId);
    if (!queue.length) return;

    const remaining: OutboxEntry[] = [];
    for (const entry of queue) {
      // Step 15: Guard against profile switch mid-operation
      if (getCurrentScope() !== startScope) {
        remaining.push(entry);
        continue;
      }

      try {
        const { error } = await send(entry, startScope);
        if (error) throw error;
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
        } else if (entry.attempts + 1 <= 25) {
          remaining.push({ ...entry, attempts: entry.attempts + 1, lastError: error?.message || 'Sync failed' });
        } else {
          console.error(`[SyncOutbox] Dropping unrecoverable outbox entry after 25 attempts: ${entry.id} (${entry.kind})`, error);
        }
      }
    }

    // Save remaining queue (unprocessed/deferred operations stay safely queued)
    await writeQueue(accountId, remaining);

    if (remaining.length) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hc_sync_pending', { detail: { count: remaining.length } }));
      }
      if (typeof navigator === 'undefined' || navigator.onLine) {
        const attempts = Math.min(...remaining.map((entry) => entry.attempts));
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
  if (lastSyncError && queue.length > 0) {
    state = 'sync_failed';
  } else if (queue.length > 0) {
    state = 'sync_pending';
  }

  return {
    state,
    pendingCount: queue.length,
    lastSyncedAt: lastSyncedAt || undefined,
    lastError: lastSyncError || undefined,
    conflictsCount: 0,
  };
}

export async function clearSyncOutbox(userId: string) {
  if (!userId) return;
  const key = currentUserKey(userId);
  try { await del(key); } catch {}
  try { window.localStorage.removeItem(key); } catch {}
}
