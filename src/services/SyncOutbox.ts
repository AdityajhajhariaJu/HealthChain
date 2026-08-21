import { get, set } from 'idb-keyval';
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

function currentUserKey(userId: string) { return `hc_sync_outbox_${userId}`; }

async function readQueue(userId: string): Promise<OutboxEntry[]> {
  const key = currentUserKey(userId);
  try {
    const value = await get(key);
    if (Array.isArray(value)) return value;
  } catch {}
  try {
    const value = JSON.parse(getItemSync(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

async function writeQueue(userId: string, queue: OutboxEntry[]) {
  const key = currentUserKey(userId);
  const bounded = queue.slice(-500);
  try { await set(key, bounded); } catch {}
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
    if (remaining.length) window.dispatchEvent(new CustomEvent('hc_sync_pending', { detail: { count: remaining.length } }));
  })().finally(() => { flushInFlight = null; });
  return flushInFlight;
}

export async function getPendingSyncCount(userId: string) {
  return (await readQueue(userId)).length;
}
