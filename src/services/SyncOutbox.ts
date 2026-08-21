import { del, get, set } from 'idb-keyval';
import { getItemSync, setItemSync } from './storage';
import { supabase } from './supabaseClient';

type OutboxKind = 'case_upsert' | 'case_delete' | 'health_memory_upsert' | 'profile_upsert';

interface OutboxEntry {
  id: string;
  kind: OutboxKind;
  userId: string;
  payload: any;
  attempts: number;
  createdAt: string;
  lastError?: string;
}

let flushInFlight: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function currentUserKey(userId: string) { return `hc_sync_outbox_${userId}`; }

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

async function writeQueue(userId: string, queue: OutboxEntry[]) {
  const key = currentUserKey(userId);
  const bounded = queue.slice(-500);
  // Keep sensitive queued payloads in IndexedDB when available. Only use the
  // localStorage copy as a compatibility fallback for environments without
  // IndexedDB (older WebViews/private browsing).
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
  const stableId = payload?.id || payload?.data?.id || entryId();
  const existing = queue.findIndex((entry) => entry.kind === kind && (entry.payload?.id || entry.payload?.data?.id) === stableId);
  const entry: OutboxEntry = {
    id: existing >= 0 ? queue[existing].id : entryId(),
    kind,
    userId,
    payload,
    attempts: existing >= 0 ? queue[existing].attempts : 0,
    createdAt: existing >= 0 ? queue[existing].createdAt : new Date().toISOString(),
  };
  if (existing >= 0) queue[existing] = entry;
  else queue.push(entry);
  await writeQueue(userId, queue);
}

async function send(entry: OutboxEntry) {
  const table = entry.kind === 'case_upsert' || entry.kind === 'case_delete'
    ? 'cases'
    : entry.kind === 'health_memory_upsert' ? 'health_memory' : 'profiles';
  const recordId = entry.payload?.id;
  const localUpdatedAt = entry.payload?.updated_at;

  // Offline devices may reconnect out of order. Never let an older snapshot
  // overwrite a newer server record, and never let an old queued delete erase
  // a record updated on another device meanwhile.
  if (recordId && localUpdatedAt) {
    const ownerColumn = table === 'profiles' ? 'id' : 'user_id';
    const { data: remote, error: readError } = await supabase
      .from(table)
      .select('updated_at')
      .eq('id', recordId)
      .eq(ownerColumn, entry.userId)
      .maybeSingle();
    if (readError && readError.code !== 'PGRST116') return { error: readError };
    if (remote?.updated_at && new Date(remote.updated_at).getTime() > new Date(localUpdatedAt).getTime()) {
      return { error: null };
    }
  }

  if (entry.kind === 'case_upsert') {
    return supabase.from('cases').upsert(entry.payload, { onConflict: 'id' });
  }
  if (entry.kind === 'health_memory_upsert') {
    return supabase.from('health_memory').upsert(entry.payload, { onConflict: 'id' });
  }
  if (entry.kind === 'case_delete') {
    return supabase.from('cases').delete().eq('id', entry.payload.id).eq('user_id', entry.userId);
  }
  return supabase.from('profiles').upsert(entry.payload, { onConflict: 'id' });
}

export async function flushSyncOutbox(userId?: string) {
  if (flushInFlight) return flushInFlight;
  flushInFlight = (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const accountId = userId || session?.user?.id;
    if (!accountId) return;
    if (userId && session?.user?.id && userId !== session.user.id) return;
    const queue = await readQueue(accountId);
    if (!queue.length) return;
    const remaining: OutboxEntry[] = [];
    for (const entry of queue) {
      try {
        const { error } = await send(entry);
        if (error) throw error;
      } catch (error: any) {
        remaining.push({ ...entry, attempts: entry.attempts + 1, lastError: error?.message || 'Sync failed' });
      }
    }
    await writeQueue(accountId, remaining);
    if (remaining.length) {
      window.dispatchEvent(new CustomEvent('hc_sync_pending', { detail: { count: remaining.length } }));
      const attempts = Math.min(...remaining.map((entry) => entry.attempts));
      const delay = Math.min(5 * 60 * 1000, Math.max(5000, 5000 * (2 ** Math.min(attempts, 5))));
      if (!retryTimer) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          flushSyncOutbox().catch(() => {});
        }, delay);
      }
    }
  })().finally(() => { flushInFlight = null; });
  return flushInFlight;
}

export async function getPendingSyncCount(userId: string) {
  return (await readQueue(userId)).length;
}

/** Remove queued writes only after a confirmed account deletion. */
export async function clearSyncOutbox(userId: string) {
  if (!userId) return;
  const key = currentUserKey(userId);
  try { await del(key); } catch {}
  try { window.localStorage.removeItem(key); } catch {}
}
