import * as idb from 'idb-keyval';
import {
  captureAccountScope as captureHealthMemoryScope,
  isAccountScopeCurrent as isHealthMemoryScopeCurrent,
  type AccountScope as HealthMemoryScope,
} from './AccountScope';
import { setOwned } from './OwnedIdb';
import { getItemSync, setItemSync } from './storage';
import { supabase } from './supabaseClient';
import { enqueueSync } from './SyncOutbox';
export {
captureAccountScope as captureHealthMemoryScope,
isAccountScopeCurrent as isHealthMemoryScopeCurrent
} from './AccountScope';
export type { AccountScope as HealthMemoryScope } from './AccountScope';

export type HealthMemoryKind =
  | 'case_prep'
  | 'quick_consult'
  | 'deep_collab'
  | 'jarvis_analysis'
  | 'lab_report'
  | 'diet'
  | 'health_buddy'
  | 'profile_event'
  | 'pharmacy'
  | 'research'
  | 'discussion_guide';
export interface HealthMemoryItem {
  id: string;
  profileId: string;
  kind: HealthMemoryKind;
  source: string;
  title: string;
  occurredAt: string;
  payload: Record<string, any>;
  caseId?: string;
  dedupeKey?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
const kinds = new Set([
  'case_prep',
  'quick_consult',
  'deep_collab',
  'jarvis_analysis',
  'lab_report',
  'diet',
  'health_buddy',
  'profile_event',
  'pharmacy',
  'research',
  'discussion_guide',
]);
const cache = new Map<string, HealthMemoryItem[]>();
const hydration = new Map<string, Promise<void>>();
const writes = new Map<string, Promise<void>>();
const isUuid = (value?: string) =>
  !!value &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const uuid = () => crypto.randomUUID();
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));

if (typeof window !== 'undefined')
  window.addEventListener('hc_logout', () => {
    cache.clear();
    hydration.clear();
    writes.clear();
  });
export function normalizeHealthMemoryItems(raw: unknown): HealthMemoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.source === 'string' &&
        item.profileId === 'profile_1' &&
        kinds.has(item.kind) &&
        date(item.occurredAt) &&
        date(item.updatedAt) &&
        date(item.createdAt) &&
        item.payload &&
        typeof item.payload === 'object' &&
        !Array.isArray(item.payload)
    )
    .slice(0, 3000);
}
const validate = normalizeHealthMemoryItems;
function parse(raw: unknown) {
  try {
    return validate(typeof raw === 'string' ? JSON.parse(raw) : raw);
  } catch {
    return [];
  }
}
function merge(...collections: HealthMemoryItem[][]) {
  const merged = new Map<string, HealthMemoryItem>();
  for (const items of collections)
    for (const item of items) {
      const old = merged.get(item.id);
      if (
        !old ||
        (item.deletedAt && !old.deletedAt) ||
        (!old.deletedAt && Date.parse(item.updatedAt) >= Date.parse(old.updatedAt)) ||
        (item.deletedAt && old.deletedAt && Date.parse(item.updatedAt) >= Date.parse(old.updatedAt))
      )
        merged.set(item.id, item);
    }
  const forgotten = new Set(
    [...merged.values()]
      .filter((item) => item.deletedAt && item.dedupeKey)
      .map((item) => item.dedupeKey)
  );
  return [...merged.values()]
    .filter((item) => item.deletedAt || !item.dedupeKey || !forgotten.has(item.dedupeKey))
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, 3000);
}
function local(scope: HealthMemoryScope) {
  if (!cache.has(scope.key)) cache.set(scope.key, parse(getItemSync(scope.key)));
  return cache.get(scope.key)!;
}
function notify(scope: HealthMemoryScope) {
  if (isHealthMemoryScopeCurrent(scope))
    window.dispatchEvent(new Event('hc_health_memory_updated'));
}
export async function hydrateHealthMemory(scope = captureHealthMemoryScope()) {
  if (!hydration.has(scope.key))
    hydration.set(
      scope.key,
      (async () => {
        let disk: HealthMemoryItem[] = [];
        try {
          disk = parse(await idb.get(scope.key));
        } catch {}
        if (!isHealthMemoryScopeCurrent(scope)) return;
        cache.set(scope.key, merge(disk, local(scope)));
        notify(scope);
      })()
    );
  await hydration.get(scope.key);
}
export function getHealthMemory(): HealthMemoryItem[] {
  const scope = captureHealthMemoryScope();
  void hydrateHealthMemory(scope);
  return JSON.parse(JSON.stringify(local(scope).filter((item) => !item.deletedAt)));
}
export function getLatestHealthMemory(kind: HealthMemoryKind, source?: string) {
  return getHealthMemory().find(
    (item) => item.kind === kind && (!source || item.source === source)
  );
}
function writeLocal(items: HealthMemoryItem[], scope: HealthMemoryScope) {
  if (!isHealthMemoryScopeCurrent(scope)) return;
  cache.set(scope.key, JSON.parse(JSON.stringify(items.slice(0, 3000))));
  // Keep a synchronous mirror; never remove the only reload-readable copy.
  try {
    setItemSync(scope.key, JSON.stringify(local(scope)));
  } catch {}
  const pending = (writes.get(scope.key) || Promise.resolve())
    .catch(() => {})
    .then(async () => {
      await hydrateHealthMemory(scope);
      if (!isHealthMemoryScopeCurrent(scope)) return;
      const json = JSON.stringify(local(scope));
      let mirrored = false;
      try {
        setItemSync(scope.key, json);
        mirrored = getItemSync(scope.key) === json;
      } catch {}
      try {
        await setOwned(scope.key, json);
      } catch (error) {
        if (!mirrored) throw error;
      }
    });
  writes.set(scope.key, pending);
  void pending.catch(() => {
    if (isHealthMemoryScopeCurrent(scope))
      window.dispatchEvent(
        new CustomEvent('hc_sync_error', {
          detail: { area: 'health_memory', code: 'LOCAL_STORAGE_FAILED' },
        })
      );
  });
  notify(scope);
}
export async function flushHealthMemory(scope = captureHealthMemoryScope()) {
  await hydrateHealthMemory(scope);
  await writes.get(scope.key);
  if (!isHealthMemoryScopeCurrent(scope))
    throw new Error('Account changed. Please retry in the original account.');
}
export async function exportHealthMemory() {
  const scope = captureHealthMemoryScope();
  await flushHealthMemory(scope);
  return JSON.parse(JSON.stringify(local(scope)));
}
function safePayload(payload: any) {
  const json = JSON.stringify(payload ?? {});
  if (json.length <= 30000) return JSON.parse(json);
  return { summary: json.slice(0, 28000), truncated: true };
}
function remotePayload(item: HealthMemoryItem, scope: HealthMemoryScope, id = item.id) {
  return {
    id,
    user_id: scope.accountId,
    profile_id: scope.profileId,
    case_id: isUuid(item.caseId) ? item.caseId : null,
    kind: item.kind === 'jarvis_analysis' ? 'deep_collab' : item.kind,
    source: item.source,
    title: item.title,
    occurred_at: item.occurredAt,
    payload: item.payload,
    dedupe_key: item.dedupeKey || null,
    updated_at: item.updatedAt,
    ...(item.deletedAt ? { deleted_at: item.deletedAt } : {}),
  };
}
async function syncItem(item: HealthMemoryItem, scope: HealthMemoryScope) {
  await hydrateHealthMemory(scope);
  if (scope.accountId === 'guest' || !isHealthMemoryScopeCurrent(scope)) return;
  if (!local(scope).some((entry) => entry.id === item.id && entry.updatedAt === item.updatedAt))
    return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!isHealthMemoryScopeCurrent(scope) || session?.user?.id !== scope.accountId) return;
  const row = remotePayload(item, scope);
  const { error } = await supabase.from('health_memory').upsert(row, { onConflict: 'id' });
  if (!isHealthMemoryScopeCurrent(scope)) return;
  if (error?.code === '23505' && item.dedupeKey) {
    const { data: existing, error: lookupError } = await supabase
      .from('health_memory')
      .select('id,deleted_at')
      .eq('user_id', scope.accountId)
      .eq('profile_id', scope.profileId)
      .eq('dedupe_key', item.dedupeKey)
      .maybeSingle();
    if (!isHealthMemoryScopeCurrent(scope)) return;
    if (!lookupError && existing?.id) {
      if (existing.deleted_at && !item.deletedAt) {
        writeLocal(
          local(scope).map((entry) =>
            entry.id === item.id
              ? { ...entry, id: existing.id, deletedAt: existing.deleted_at }
              : entry
          ),
          scope
        );
        return;
      }
      const replacement = remotePayload(item, scope, existing.id);
      const { error: updateError } = await supabase
        .from('health_memory')
        .update(replacement)
        .eq('id', existing.id)
        .eq('user_id', scope.accountId);
      if (!isHealthMemoryScopeCurrent(scope)) return;
      if (!updateError) {
        writeLocal(
          local(scope).map((entry) =>
            entry.id === item.id ? { ...entry, id: existing.id } : entry
          ),
          scope
        );
        return;
      }
    }
  }
  if (error) {
    const queued = await enqueueSync('health_memory_upsert', scope.accountId, row);
    if (!queued) {
      if (isHealthMemoryScopeCurrent(scope))
        window.dispatchEvent(
          new CustomEvent('hc_sync_error', {
            detail: { area: 'health_memory', code: 'QUEUE_FAILED' },
          })
        );
      throw new Error('Memory is saved on this device, but account sync could not be queued.');
    }
    if (isHealthMemoryScopeCurrent(scope))
      window.dispatchEvent(
        new CustomEvent('hc_sync_pending', { detail: { area: 'health_memory' } })
      );
    return;
  }
  window.dispatchEvent(
    new CustomEvent('hc_sync_complete', {
      detail: { area: 'health_memory', at: new Date().toISOString() },
    })
  );
}
export function recordHealthMemory(
  input: Omit<HealthMemoryItem, 'id' | 'profileId' | 'createdAt' | 'updatedAt'> & { id?: string }
) {
  const scope = captureHealthMemoryScope();
  void hydrateHealthMemory(scope);
  const existing = local(scope);
  const now = new Date().toISOString();
  if (typeof input.title !== 'string' || !input.title.trim() || !kinds.has(input.kind))
    throw new Error('Invalid health memory.');
  const match = input.dedupeKey
    ? existing.find((item) => item.dedupeKey === input.dedupeKey)
    : undefined;
  // A forgotten proposal must not silently reappear during background extraction.
  if (match?.deletedAt) return JSON.parse(JSON.stringify(match));
  const item: HealthMemoryItem = {
    id: isUuid(input.id) ? input.id! : match?.id || uuid(),
    profileId: scope.profileId,
    kind: input.kind,
    source: input.source,
    title: input.title.trim().slice(0, 2000),
    occurredAt: date(input.occurredAt) ? input.occurredAt : now,
    payload: safePayload(input.payload),
    caseId: input.caseId,
    dedupeKey: input.dedupeKey,
    createdAt: match?.createdAt || now,
    updatedAt: now,
  };
  writeLocal([item, ...existing.filter((entry) => entry.id !== item.id)], scope);
  void syncItem(item, scope).catch(() => {
    /* Local copy remains available for retry. */
  });
  return JSON.parse(JSON.stringify(item));
}
export async function reviseHealthMemory(
  id: string,
  title: string | null,
  scope = captureHealthMemoryScope()
) {
  await hydrateHealthMemory(scope);
  if (!isHealthMemoryScopeCurrent(scope)) throw new Error('Account changed.');
  const item = local(scope).find((entry) => entry.id === id);
  if (!item) throw new Error('Memory is no longer available.');
  if (title !== null && !title.trim()) throw new Error('Enter a correction.');
  const revised = {
    ...item,
    title: title === null ? item.title : title.trim().slice(0, 2000),
    updatedAt: new Date().toISOString(),
    ...(title === null ? { deletedAt: new Date().toISOString() } : {}),
    payload: { ...item.payload, userConfirmed: true, corrected: title !== null },
  };
  writeLocal(
    local(scope).map((entry) => (entry.id === id ? revised : entry)),
    scope
  );
  await flushHealthMemory(scope);
  await syncItem(revised, scope);
  return JSON.parse(JSON.stringify(revised));
}
export async function syncHealthMemoryFromSupabase() {
  const scope = captureHealthMemoryScope();
  await hydrateHealthMemory(scope);
  if (scope.accountId === 'guest' || !isHealthMemoryScopeCurrent(scope)) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!isHealthMemoryScopeCurrent(scope) || session?.user?.id !== scope.accountId) return;
  const rows: any[] = [];
  for (let page = 0; page < 6; page++) {
    const { data, error } = await supabase
      .from('health_memory')
      .select('*')
      .eq('user_id', scope.accountId)
      .eq('profile_id', scope.profileId)
      .order('occurred_at', { ascending: false })
      .range(page * 500, (page + 1) * 500 - 1);
    if (!isHealthMemoryScopeCurrent(scope)) return;
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return;
      throw error;
    }
    rows.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  const remote = validate(
    rows.map((row) => ({
      id: row.id,
      profileId: row.profile_id,
      kind: row.kind,
      source: row.source,
      title: row.title,
      occurredAt: row.occurred_at,
      payload: row.payload || {},
      caseId: row.case_id || undefined,
      dedupeKey: row.dedupe_key || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at || undefined,
    }))
  );
  for (const item of local(scope)) {
    const cloud = remote.find((entry) => entry.id === item.id);
    if (cloud?.deletedAt && !item.deletedAt) continue;
    if (!cloud || Date.parse(item.updatedAt) > Date.parse(cloud.updatedAt))
      await syncItem(item, scope);
    if (!isHealthMemoryScopeCurrent(scope)) return;
  }
  writeLocal(merge(remote, local(scope)), scope);
  await flushHealthMemory(scope);
}
