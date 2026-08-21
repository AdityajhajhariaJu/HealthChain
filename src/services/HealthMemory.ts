import { supabase } from './supabaseClient';
import { getItemSync, setItemSync } from './storage';
import { enqueueSync } from './SyncOutbox';

export type HealthMemoryKind =
  | 'case_prep'
  | 'quick_consult'
  | 'deep_collab'
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
}

const uuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (part) => {
    const random = Math.random() * 16 | 0;
    return (part === 'x' ? random : (random & 0x3 | 0x8)).toString(16);
  });
};
const isUuid = (value?: string) => !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const accountId = () => {
  try { return JSON.parse(localStorage.getItem('hc_account') || '{}').id || 'guest'; } catch { return 'guest'; }
};

const profileId = () => {
  try {
    const raw = getItemSync(`hc_unified_profile_${accountId()}`) || getItemSync('hc_unified_profile_guest') || getItemSync('hc_unified_profile');
    return JSON.parse(raw || '{}').activeId || 'profile_1';
  } catch { return 'profile_1'; }
};

const storageKey = () => `hc_health_memory_${accountId()}_${profileId()}`;
let remoteSchemaUnavailable = false;

const isSchemaUnavailable = (error: any) => error?.code === '42P01' || error?.code === 'PGRST205';

function safePayload(payload: any) {
  // Health Memory contains structured knowledge, not original files, data URLs, or unlimited transcripts.
  const json = JSON.stringify(payload ?? {});
  if (json.length <= 30000) return payload ?? {};
  return {
    summary: json.slice(0, 28000),
    truncated: true,
    notice: 'A large AI artefact was condensed for durable Health Memory storage.'
  };
}

export function getHealthMemory(): HealthMemoryItem[] {
  try { return JSON.parse(getItemSync(storageKey()) || '[]'); } catch { return []; }
}

function writeLocal(items: HealthMemoryItem[]) {
  setItemSync(storageKey(), JSON.stringify(items.slice(0, 3000)));
  window.dispatchEvent(new Event('hc_health_memory_updated'));
}

async function syncItem(item: HealthMemoryItem) {
  if (remoteSchemaUnavailable) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;
  const { error } = await supabase.from('health_memory').upsert({
    id: item.id,
    user_id: session.user.id,
    profile_id: item.profileId,
    case_id: item.caseId || null,
    kind: item.kind,
    source: item.source,
    title: item.title,
    occurred_at: item.occurredAt,
    payload: item.payload,
    dedupe_key: item.dedupeKey || null,
    updated_at: item.updatedAt,
  }, { onConflict: 'id' });
  if (error) {
    if (isSchemaUnavailable(error)) {
      // The feature can ship before its migration. Keep local data intact and retry after a reload once SQL is applied.
      remoteSchemaUnavailable = true;
      return;
    }
    await enqueueSync('health_memory_upsert', session.user.id, {
      id: item.id,
      user_id: session.user.id,
      profile_id: item.profileId,
      case_id: item.caseId || null,
      kind: item.kind,
      source: item.source,
      title: item.title,
      occurred_at: item.occurredAt,
      payload: item.payload,
      dedupe_key: item.dedupeKey || null,
      updated_at: item.updatedAt,
    });
    window.dispatchEvent(new CustomEvent('hc_sync_error', { detail: error }));
    throw error;
  }
  window.dispatchEvent(new CustomEvent('hc_sync_complete', { detail: { area: 'health_memory', at: new Date().toISOString() } }));
}

export function recordHealthMemory(input: Omit<HealthMemoryItem, 'id' | 'profileId' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  const now = new Date().toISOString();
  const existing = getHealthMemory();
  const match = input.dedupeKey ? existing.find(item => item.dedupeKey === input.dedupeKey) : undefined;
  const item: HealthMemoryItem = {
    // Older timeline IDs use an evt_ prefix; the database intentionally uses UUIDs.
    id: isUuid(input.id) ? input.id! : match?.id || uuid(),
    profileId: profileId(),
    kind: input.kind,
    source: input.source,
    title: input.title,
    occurredAt: input.occurredAt || now,
    payload: safePayload(input.payload),
    caseId: input.caseId,
    dedupeKey: input.dedupeKey,
    createdAt: match?.createdAt || now,
    updatedAt: now,
  };
  writeLocal([item, ...existing.filter(existingItem => existingItem.id !== item.id)]);
  syncItem(item).catch((error) => console.warn('Health Memory will retry on the next sign-in.', error));
  return item;
}

export async function syncHealthMemoryFromSupabase() {
  if (remoteSchemaUnavailable) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;
  const { data, error } = await supabase.from('health_memory')
    .select('*').eq('user_id', session.user.id).eq('profile_id', profileId()).order('occurred_at', { ascending: false });
  if (error) {
    if (isSchemaUnavailable(error)) {
      remoteSchemaUnavailable = true;
      return;
    }
    throw error;
  }
  const remote = (data || []).map((row: any): HealthMemoryItem => ({
    id: row.id, profileId: row.profile_id, kind: row.kind, source: row.source, title: row.title,
    occurredAt: row.occurred_at, payload: row.payload || {}, caseId: row.case_id || undefined,
    dedupeKey: row.dedupe_key || undefined, createdAt: row.created_at, updatedAt: row.updated_at,
  }));
  const local = getHealthMemory();
  const merged = new Map(remote.map(item => [item.id, item]));
  for (const item of local) {
    const cloud = merged.get(item.id);
    if (!cloud || new Date(item.updatedAt) > new Date(cloud.updatedAt)) {
      merged.set(item.id, item);
      await syncItem(item);
    }
  }
  writeLocal([...merged.values()].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()));
}
