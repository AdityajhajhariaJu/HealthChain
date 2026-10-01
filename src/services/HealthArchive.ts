import { setOwned } from './OwnedIdb';
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
import { isOwnerStorageKey, isDurableHealthStorageKey } from './DurableHealthStorage';
import { ALLOWED_FILE_MIME_TYPES, MAX_FILE_SIZE_BYTES, originalBlobFromStored, storeOriginalBlob } from './caseRecordFiles';
import { supabase } from './supabaseClient';

type ArchivedOriginal = { encoding: 'base64'; data: string; type: string; size: number; sha256: string };
const MAX_ARCHIVE_ORIGINAL_BYTES = 100 * 1024 * 1024;
const hash = async (bytes: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
async function bytesOf(blob: Blob): Promise<Uint8Array> {
  if (blob.arrayBuffer) return new Uint8Array(await blob.arrayBuffer());
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = reject; reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer)); reader.readAsArrayBuffer(blob); });
}
function encode(bytes: Uint8Array) {
  let text = ''; for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}

/** Stable pages and explicit failure avoid silently exporting only the first 1,000 rows. */
export async function exportCloudArchive(ownerId: string) {
  const scope = captureHealthMemoryScope();
  if (scope.accountId !== ownerId) throw new Error('Account changed.');
  const { data, error } = await supabase.from('profiles').select('*').eq('id', ownerId).maybeSingle();
  if (error) throw error;
  const collections: Record<string, unknown[]> = {};
  for (const table of ['cases', 'health_memory', 'healthchain_profiles', 'health_observations', 'ava_messages', 'user_health_metrics']) {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      if (!isHealthMemoryScopeCurrent(scope)) throw new Error('Account changed.');
      const result = await supabase.from(table).select('*').eq('user_id', ownerId).order('id', { ascending: true }).range(offset, offset + 499);
      if (result.error) throw new Error(`Cloud export failed for ${table}. No partial archive was downloaded.`);
      rows.push(...(result.data || []));
      if (!result.data || result.data.length < 500) break;
      if (offset >= 100000) throw new Error('This history needs a support-assisted export. No partial archive was downloaded.');
    }
    collections[table] = rows;
  }
  if (!isHealthMemoryScopeCurrent(scope)) throw new Error('Account changed.');
  return withoutClaims({ userId: ownerId, profile: data, ...collections, counts: Object.fromEntries(Object.entries(collections).map(([key, rows]) => [key, rows.length])) });
}

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
  const pendingSync: Record<string, unknown> = {};
  for (const key of Object.keys(localStorage)) {
    if (isOwnerStorageKey(key, scope.accountId) && isDurableHealthStorageKey(key)) {
      const value = getItemSync(key);
      if (value !== null && key.startsWith('hc_sync_outbox_')) { pendingSync[key] = withoutClaims(JSON.parse(value)); delete local[key]; }
      else if (value !== null) local[key] = value;
    }
  }
  const originals: Record<string, ArchivedOriginal> = {};
  let totalBytes = 0;
  for (const key of await idb.keys()) {
    if (typeof key === 'string' && isOwnerStorageKey(key, scope.accountId) && (key.startsWith('hc_tombstones_') || key.startsWith('hc_sync_outbox_'))) {
      const value = await idb.get(key);
      if (key.startsWith('hc_sync_outbox_')) pendingSync[key] = withoutClaims(value);
      else if (value !== undefined) local[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    if (typeof key !== 'string' || !key.startsWith('hc_original_record:') || !isOwnerStorageKey(key, scope.accountId)) continue;
    if (!isHealthMemoryScopeCurrent(scope)) throw new Error('Account changed.');
    const blob = originalBlobFromStored(await idb.get(key));
    if (!blob) throw new Error('An original document is unreadable. Export was stopped.');
    totalBytes += blob.size;
    if (totalBytes > MAX_ARCHIVE_ORIGINAL_BYTES) throw new Error('Original documents exceed the 100 MB JSON archive limit. Export the originals separately before creating a support-assisted backup.');
    const bytes = await bytesOf(blob);
    originals[key] = { encoding: 'base64', data: encode(bytes), type: blob.type, size: bytes.length, sha256: await hash(bytes) };
  }
  if (!isHealthMemoryScopeCurrent(scope))
    throw new Error('Account changed. Export again from the intended account.');
  local[scope.key] = JSON.stringify(memory);
  if (messages) local[avaConversationKey()] = JSON.stringify(messages);
  return {
    ownerId: scope.accountId,
    originals,
    pendingSync,
    manifest: { version: 3, localCount: Object.keys(local).length, observationCount: observations.length, originalCount: Object.keys(originals).length, originalBytes: totalBytes, restoreScope: 'local-device-records-and-originals; pending sync and cloud snapshots are reference copies' },
    indexedDB: { ['hc_observations_v1:' + scope.accountId + ':' + scope.profileId]: observations },
  };
}
export function validateHealthArchive(raw: unknown, prefixes: string[]) {
  const scope = captureHealthMemoryScope();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid archive.');
  const archive = raw as any;
  if (archive.format && !['healthchain-user-data-v2', 'healthchain-user-data-v3'].includes(archive.format))
    throw new Error('Unsupported archive version.');
  const owner = archive.ownerId || archive.supabase?.userId;
  if (owner && owner !== scope.accountId)
    throw new Error('This archive belongs to a different account.');
  const local =
    archive.format?.startsWith('healthchain-user-data-v') ? archive.localStorage : archive.data || archive;
  if (!local || typeof local !== 'object' || Array.isArray(local))
    throw new Error('Archive has no supported local records.');
  const entries: Record<string, string> = {};
  const indexed: Record<string, unknown> = {};
  const originals: Record<string, ArchivedOriginal> = {};
  let skipped = 0;
  const allowed = (key: string) =>
    ((prefixes.some((prefix) => key === prefix || key.startsWith(prefix + '_')) || isDurableHealthStorageKey(key)) && isOwnerStorageKey(key, scope.accountId)) || key === 'hc_theme';
  for (const [key, value] of Object.entries(local)) {
    if (key.startsWith('hc_sync_outbox_') || !allowed(key)) {
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
    if (key.startsWith('hc_active_case_')) {
      if (!/^[a-zA-Z0-9_-]{1,200}$/.test(value)) throw new Error('Invalid active case identifier.');
      entries[key] = value; continue;
    }
    if (key.startsWith('hc_daily_ledger_migrated:')) {
      if (value !== 'v1') throw new Error('Invalid daily migration marker.');
      entries[key] = value; continue;
    }
    if (key.startsWith('hc_daily_checkin_reminder_time:')) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Invalid reminder time.');
      entries[key] = value; continue;
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
    } else if (key.startsWith('hc_medication_schedule_linked:')) {
      if (typeof parsed !== 'boolean') throw new Error('Invalid medication migration setting.');
    } else if (key.startsWith('healthchain_') || key.startsWith('hc_daily_checkin_reminder_')) {
      if (!['object', 'number', 'boolean', 'string'].includes(typeof parsed) || parsed === null) throw new Error('Invalid tracker setting.');
    } else if (!parsed || typeof parsed !== 'object')
      throw new Error('Invalid record structure: ' + key);
    entries[key] = JSON.stringify(withoutClaims(parsed));
  }
  let originalBytes = 0;
  for (const [key, value] of Object.entries(archive.originals || {})) {
    const file = value as ArchivedOriginal;
    if (!key.startsWith('hc_original_record:') || !isOwnerStorageKey(key, scope.accountId)) throw new Error('Original document belongs to a different account.');
    if (!file || file.encoding !== 'base64' || typeof file.data !== 'string' || file.data.length > Math.ceil(MAX_FILE_SIZE_BYTES / 3) * 4 ||
        !Number.isInteger(file.size) || file.size < 1 || file.size > MAX_FILE_SIZE_BYTES || !/^[a-f0-9]{64}$/.test(file.sha256) ||
        (file.type && !ALLOWED_FILE_MIME_TYPES.includes(file.type))) throw new Error('Invalid original document archive.');
    originalBytes += file.size; originals[key] = file;
  }
  if (originalBytes > MAX_ARCHIVE_ORIGINAL_BYTES) throw new Error('Original archive exceeds 100 MB.');
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
  if (archive.manifest && (archive.manifest.localCount !== Object.keys(local).length || archive.manifest.observationCount !== ((indexed['hc_observations_v1:' + scope.accountId + ':' + scope.profileId] as any[]) || []).length || archive.manifest.originalCount !== Object.keys(originals).length || archive.manifest.originalBytes !== originalBytes)) throw new Error('Archive manifest counts do not match its records.');
  if (!Object.keys(entries).length && !Object.keys(indexed).length)
    throw new Error('No restorable records for this account were found.');
  return { entries, indexed, originals, skipped, scope };
}
export async function restoreHealthArchive(raw: unknown, prefixes: string[]) {
  const validated = validateHealthArchive(raw, prefixes);
  const localBefore = new Map<string, string | null>();
  const idbBefore = new Map<string, unknown>();
  try {
    const decoded: Record<string, Blob> = {};
    for (const [key, file] of Object.entries(validated.originals)) {
      const bytes = Uint8Array.from(atob(file.data), char => char.charCodeAt(0));
      if (bytes.length !== file.size || await hash(bytes) !== file.sha256) throw new Error('An original document failed its integrity check. Nothing was restored.');
      decoded[key] = new Blob([bytes], { type: file.type });
    }
    for (const key of Object.keys(decoded)) idbBefore.set(key, await idb.get(key));
    for (const key of Object.keys(validated.indexed)) idbBefore.set(key, await idb.get(key));
    if (!isHealthMemoryScopeCurrent(validated.scope)) throw new Error('Account changed.');
    for (const [key, value] of Object.entries(validated.entries)) {
      if (!isHealthMemoryScopeCurrent(validated.scope)) throw new Error('Account changed.');
      localBefore.set(key, getItemSync(key));
      setItemSync(key, value);
      if (getItemSync(key) !== value) throw new Error('Device storage is full or unavailable.');
      if (key.startsWith('hc_ava_messages_') || key.startsWith('hc_health_memory_') || key.startsWith('hc_tombstones_')) {
        idbBefore.set(key, await idb.get(key));
        await setOwned(key, key.startsWith('hc_tombstones_') ? JSON.parse(value) : value);
      }
    }
    for (const [key, value] of Object.entries(validated.indexed)) {
      if (!isHealthMemoryScopeCurrent(validated.scope)) throw new Error('Account changed.');
      await setOwned(key, value);
    }
    for (const [key, value] of Object.entries(decoded)) {
      if (!isHealthMemoryScopeCurrent(validated.scope)) throw new Error('Account changed.');
      await storeOriginalBlob(key, value);
    }
    if (!isHealthMemoryScopeCurrent(validated.scope)) throw new Error('Account changed.');
    return {
      count: Object.keys(validated.entries).length + Object.keys(validated.indexed).length + Object.keys(validated.originals).length,
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
        else await setOwned(key, value);
      } catch {}
    }
    throw error;
  }
}
