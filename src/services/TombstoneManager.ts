import { get, set, del } from 'idb-keyval';
import { getItemSync, setItemSync } from './storage';
import { Tombstone } from './SyncTypes';
import { supabase } from './supabaseClient';

const MAX_TOMBSTONES = 1000;

function tombstoneKey(userId: string, profileId: string): string {
  return `hc_tombstones_${userId}_${profileId || 'profile_1'}`;
}

export async function getTombstones(userId: string, profileId: string): Promise<Tombstone[]> {
  if (!userId) return [];
  const key = tombstoneKey(userId, profileId);
  try {
    const val = await get<Tombstone[]>(key);
    if (Array.isArray(val)) return val;
  } catch {}
  try {
    const raw = getItemSync(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export async function recordTombstone(tombstone: Tombstone): Promise<void> {
  const userId = tombstone.userId;
  const profileId = tombstone.profileId || 'profile_1';
  if (!userId || !tombstone.id) return;

  const key = tombstoneKey(userId, profileId);
  const existing = await getTombstones(userId, profileId);
  const idx = existing.findIndex(t => t.id === tombstone.id && t.entityType === tombstone.entityType);

  const updated = [...existing];
  if (idx >= 0) {
    // Keep newest deletedAt
    if (new Date(tombstone.deletedAt).getTime() > new Date(existing[idx].deletedAt).getTime()) {
      updated[idx] = tombstone;
    }
  } else {
    updated.push(tombstone);
  }

  const bounded = updated.slice(-MAX_TOMBSTONES);
  try {
    await set(key, bounded);
  } catch {}
  try {
    setItemSync(key, JSON.stringify(bounded));
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_tombstone_added', { detail: tombstone }));
  }
}

export async function isTombstoned(entityId: string, userId: string, profileId: string): Promise<boolean> {
  if (!entityId || !userId) return false;
  const tombstones = await getTombstones(userId, profileId);
  return tombstones.some(t => t.id === entityId);
}

export async function getTombstone(entityId: string, userId: string, profileId: string): Promise<Tombstone | null> {
  if (!entityId || !userId) return null;
  const tombstones = await getTombstones(userId, profileId);
  return tombstones.find(t => t.id === entityId) || null;
}

export async function mergeRemoteTombstones(userId: string, profileId: string, remoteTombstones: Tombstone[]): Promise<Tombstone[]> {
  if (!userId || !Array.isArray(remoteTombstones) || remoteTombstones.length === 0) {
    return getTombstones(userId, profileId);
  }
  const local = await getTombstones(userId, profileId);
  const tombstoneMap = new Map<string, Tombstone>();

  for (const t of local) {
    tombstoneMap.set(`${t.entityType}:${t.id}`, t);
  }
  for (const t of remoteTombstones) {
    const k = `${t.entityType}:${t.id}`;
    const existing = tombstoneMap.get(k);
    if (!existing || new Date(t.deletedAt).getTime() > new Date(existing.deletedAt).getTime()) {
      tombstoneMap.set(k, t);
    }
  }

  const merged = Array.from(tombstoneMap.values()).slice(-MAX_TOMBSTONES);
  const key = tombstoneKey(userId, profileId);
  try {
    await set(key, merged);
  } catch {}
  try {
    setItemSync(key, JSON.stringify(merged));
  } catch {}
  return merged;
}

export async function fetchRemoteTombstones(userId: string, profileId: string): Promise<Tombstone[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('case_tombstones')
      .select('id, user_id, profile_id, deleted_at')
      .eq('user_id', userId)
      .eq('profile_id', profileId || 'profile_1');

    if (error || !data) return [];
    const remote: Tombstone[] = data.map((row: any) => ({
      id: row.id,
      entityType: 'case',
      deletedAt: row.deleted_at,
      userId: row.user_id,
      profileId: row.profile_id,
    }));
    return mergeRemoteTombstones(userId, profileId, remote);
  } catch {
    return getTombstones(userId, profileId);
  }
}

export async function clearTombstones(userId?: string, profileId?: string): Promise<void> {
  if (userId) {
    const key = tombstoneKey(userId, profileId || 'profile_1');
    try { await del(key); } catch {}
    try { window.localStorage.removeItem(key); } catch {}
  }
}

