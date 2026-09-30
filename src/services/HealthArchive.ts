import * as idb from 'idb-keyval';
import { getItemSync, setItemSync, removeItemSync } from './storage';
import {
  captureHealthMemoryScope,
  isHealthMemoryScopeCurrent,
  exportHealthMemory,
  normalizeHealthMemoryItems,
} from './HealthMemory';
import {
  avaConversationKey,
  hydrateAvaMessages,
  normalizeAvaMessages,
} from './AvaConversationRepository';
import { listObservationHistory } from './HealthObservationService';
import { validateObservationDraft } from '../domain/observations/types';

const sensitiveClaims = new Set([
  'isPro',
  'is_pro',
  'isPremium',
  'is_premium',
  'proExpiresAt',
  'pro_expires_at',
  'subscription',
  'subscriptionStatus',
  'access_token',
  'refresh_token',
]);
function withoutClaims(value: any): any {
  if (Array.isArray(value)) return value.map(withoutClaims);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !sensitiveClaims.has(key))
        .map(([key, v]) => [key, withoutClaims(v)])
    );
  return value;
}
export async function addDurableArchiveData(local: Record<string, string>) {
  const scope = captureHealthMemoryScope();
  const memory = await exportHealthMemory();
  const messages = await hydrateAvaMessages();
  const observations = await listObservationHistory();
  if (!isHealthMemoryScopeCurrent(scope))
    throw new Error('Account changed. Export again from the intended account.');
  local[scope.key] = JSON.stringify(memory);
  if (messages) local[avaConversationKey()] = JSON.stringify(messages);
  return {
    ownerId: scope.accountId,
    indexedDB: { ['hc_observations_v1:' + scope.accountId + ':' + scope.profileId]: observations },
  };
}
export function validateHealthArchive(raw: unknown, prefixes: string[]) {
  const scope = captureHealthMemoryScope();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid archive.');
  const archive = raw as any;
  if (archive.format && archive.format !== 'healthchain-user-data-v2')
    throw new Error('Unsupported archive version.');
  const owner = archive.ownerId || archive.supabase?.userId;
  if (owner && owner !== scope.accountId)
    throw new Error('This archive belongs to a different account.');
  const local =
    archive.format === 'healthchain-user-data-v2' ? archive.localStorage : archive.data || archive;
  if (!local || typeof local !== 'object' || Array.isArray(local))
    throw new Error('Archive has no supported local records.');
  const entries: Record<string, string> = {};
  const indexed: Record<string, unknown> = {};
  let skipped = 0;
  const allowed = (key: string) =>
    prefixes.some((prefix) => key === prefix || key.startsWith(prefix + '_')) || key === 'hc_theme';
  for (const [key, value] of Object.entries(local)) {
    if (!allowed(key)) {
      skipped++;
      continue;
    }
    if (typeof value !== 'string' || value.length > 10000000)
      throw new Error('Invalid stored record: ' + key);
    if (key === 'hc_theme') {
      if (!['light', 'dark', 'system'].includes(value)) throw new Error('Invalid theme.');
      entries[key] = value;
      continue;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error('Unreadable stored record: ' + key);
    }
    if (key.startsWith('hc_ava_')) {
      const normalized = normalizeAvaMessages(parsed);
      if (!Array.isArray(parsed) || normalized.length !== parsed.length)
        throw new Error('Archive contains unreadable Ava messages.');
      parsed = normalized;
    } else if (key.startsWith('hc_health_memory')) {
      if (!Array.isArray(parsed) || normalizeHealthMemoryItems(parsed).length !== parsed.length)
        throw new Error('Archive contains unreadable health memories.');
    } else if (!parsed || typeof parsed !== 'object')
      throw new Error('Invalid record structure: ' + key);
    entries[key] = JSON.stringify(withoutClaims(parsed));
  }
  for (const [key, value] of Object.entries(archive.indexedDB || {})) {
    if (key !== 'hc_observations_v1:' + scope.accountId + ':' + scope.profileId) {
      skipped++;
      continue;
    }
    if (
      !Array.isArray(value) ||
      value.some(
        (item) =>
          !item ||
          item.ownerId !== scope.accountId ||
          item.profileId !== scope.profileId ||
          typeof item.id !== 'string' ||
          item.schemaVersion !== 1 ||
          !Number.isInteger(item.revision) ||
          item.revision < 1 ||
          !Number.isFinite(Date.parse(item.createdAt)) ||
          !Number.isFinite(Date.parse(item.updatedAt)) ||
          !validateObservationDraft(item).ok
      )
    )
      throw new Error('Invalid observation archive.');
    indexed[key] = value;
  }
  if (!Object.keys(entries).length && !Object.keys(indexed).length)
    throw new Error('No restorable records for this account were found.');
  return { entries, indexed, skipped, scope };
}
export async function restoreHealthArchive(raw: unknown, prefixes: string[]) {
  const validated = validateHealthArchive(raw, prefixes);
  const localBefore = new Map<string, string | null>();
  const idbBefore = new Map<string, unknown>();
  try {
    for (const key of Object.keys(validated.indexed)) idbBefore.set(key, await idb.get(key));
    if (!isHealthMemoryScopeCurrent(validated.scope)) throw new Error('Account changed.');
    for (const [key, value] of Object.entries(validated.entries)) {
      if (!isHealthMemoryScopeCurrent(validated.scope)) throw new Error('Account changed.');
      localBefore.set(key, getItemSync(key));
      setItemSync(key, value);
      if (getItemSync(key) !== value) throw new Error('Device storage is full or unavailable.');
      if (key.startsWith('hc_ava_messages_') || key.startsWith('hc_health_memory_')) {
        idbBefore.set(key, await idb.get(key));
        await idb.set(key, value);
      }
    }
    for (const [key, value] of Object.entries(validated.indexed)) {
      if (!isHealthMemoryScopeCurrent(validated.scope)) throw new Error('Account changed.');
      await idb.set(key, value);
    }
    if (!isHealthMemoryScopeCurrent(validated.scope)) throw new Error('Account changed.');
    return {
      count: Object.keys(validated.entries).length + Object.keys(validated.indexed).length,
      skipped: validated.skipped,
    };
  } catch (error) {
    for (const [key, value] of localBefore) {
      try {
        if (value === null) removeItemSync(key);
        else setItemSync(key, value);
      } catch {}
    }
    for (const [key, value] of idbBefore) {
      try {
        if (value === undefined) await idb.del(key);
        else await idb.set(key, value);
      } catch {}
    }
    throw error;
  }
}
