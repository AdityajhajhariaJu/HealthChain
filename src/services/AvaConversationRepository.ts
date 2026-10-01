import { setOwned } from './OwnedIdb';
import * as idb from 'idb-keyval';
import { getItemSync, setItemSync } from './storage';
import { supabase } from './supabaseClient';
import { enqueueSync } from './SyncOutbox';
import {
  captureAccountScope as captureHealthMemoryScope,
  isAccountScopeCurrent as isHealthMemoryScopeCurrent,
} from './AccountScope';

export interface AvaMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  caseId: string;
  createdAt: string;
  attachments?: string[];
  isStreaming?: boolean;
  isUpgradePrompt?: boolean;
  diarySnapshot?: any[];
  sourceStudy?: any;
  contextManifest?: any;
  receipts?: Record<string, { caseId: string; recordId?: string; savedAt: string }>;
}
export function normalizeAvaSourceStudy(raw: any) {
  if (!raw || typeof raw !== 'object' || typeof raw.nctId !== 'string' || raw.nctId.length > 100)
    return undefined;
  const string = (value: any, max = 16000) =>
    typeof value === 'string' ? value.slice(0, max) : undefined;
  return {
    nctId: raw.nctId,
    title: string(raw.title, 1000),
    briefTitle: string(raw.briefTitle, 1000),
    abstract: string(raw.abstract),
    phase: string(raw.phase, 200),
    conditions: Array.isArray(raw.conditions)
      ? raw.conditions.filter((value: any) => typeof value === 'string').slice(0, 100)
      : [],
    matchStatus: string(raw.matchStatus, 200),
    criteriaBreakdown:
      raw.criteriaBreakdown &&
      typeof raw.criteriaBreakdown === 'object' &&
      !Array.isArray(raw.criteriaBreakdown)
        ? raw.criteriaBreakdown
        : undefined,
    sourceUrl: string(raw.sourceUrl || raw.url, 2000),
    sourceType: string(raw.sourceType, 200),
    sourceName: string(raw.sourceName, 200),
    hasResults: raw.hasResults === true,
    ownerScope: string(raw.ownerScope, 200),
    caseId: string(raw.caseId, 200),
  };
}
const fingerprints = new Map<string, string>();
let writeSerial: Promise<unknown> = Promise.resolve();
if (typeof window !== 'undefined') window.addEventListener('hc_logout', () => fingerprints.clear());
export const avaConversationKey = () =>
  'hc_ava_messages_' + captureHealthMemoryScope().accountId + '_profile_1';
// Deterministic migration IDs prevent two devices duplicating the same legacy turns.
function legacyId(value: string) {
  const blocks = [0, 1, 2, 3]
    .map((seed) => {
      let hash = 2166136261 + seed;
      for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
      return (hash >>> 0).toString(16).padStart(8, '0');
    })
    .join('');
  return (
    blocks.slice(0, 8) +
    '-' +
    blocks.slice(8, 12) +
    '-4' +
    blocks.slice(13, 16) +
    '-a' +
    blocks.slice(17, 20) +
    '-' +
    blocks.slice(20)
  );
}
export function normalizeAvaMessages(raw: unknown): AvaMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item) =>
        item &&
        ['user', 'model'].includes(item.role) &&
        typeof item.content === 'string' &&
        item.content.trim() &&
        item.content.length <= 60000
    )
    .map((item, index) => ({
      ...item,
      id:
        typeof item.id === 'string' && /^[0-9a-f-]{36}$/i.test(item.id)
          ? item.id
          : legacyId(
              JSON.stringify([
                captureHealthMemoryScope().accountId,
                item.role,
                item.content,
                item.caseId || '',
                index,
              ])
            ),
      caseId: typeof item.caseId === 'string' ? item.caseId : '',
      createdAt:
        typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt))
          ? item.createdAt
          : new Date(index).toISOString(),
      receipts:
        item.receipts && typeof item.receipts === 'object' && !Array.isArray(item.receipts)
          ? item.receipts
          : {},
      attachments: Array.isArray(item.attachments)
        ? item.attachments.filter((v: unknown) => typeof v === 'string')
        : [],
      sourceStudy: normalizeAvaSourceStudy(item.sourceStudy),
      contextManifest:
        item.contextManifest && typeof item.contextManifest === 'object'
          ? {
              ...item.contextManifest,
              includedItems: Array.isArray(item.contextManifest.includedItems)
                ? item.contextManifest.includedItems.filter(
                    (v: any) =>
                      v &&
                      typeof v.title === 'string' &&
                      typeof v.source === 'string' &&
                      typeof v.time === 'string'
                  )
                : [],
              records: Array.isArray(item.contextManifest.records)
                ? item.contextManifest.records.filter(
                    (v: any) =>
                      v &&
                      typeof v.id === 'string' &&
                      typeof v.filename === 'string' &&
                      typeof v.content === 'string'
                  )
                : [],
            }
          : undefined,
      diarySnapshot: Array.isArray(item.diarySnapshot)
        ? item.diarySnapshot.filter((v: any) => v && typeof v.name === 'string').slice(0, 50)
        : [],
    }));
}
function parse(raw: unknown) {
  try {
    return normalizeAvaMessages(typeof raw === 'string' ? JSON.parse(raw) : raw);
  } catch {
    return [];
  }
}
export function mergeAvaMessages(...lists: AvaMessage[][]) {
  const merged = new Map<string, AvaMessage>();
  for (const list of lists)
    for (const message of list) {
      const previous = merged.get(message.id);
      merged.set(message.id, {
        ...previous,
        ...message,
        receipts: { ...previous?.receipts, ...message.receipts },
      });
    }
  return [...merged.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export function loadAvaMessages(legacy?: unknown): AvaMessage[] {
  const key = avaConversationKey();
  const raw = getItemSync(key);
  return raw !== null ? parse(raw) : normalizeAvaMessages(legacy);
}
export async function persistAvaMessages(messages: AvaMessage[]) {
  const scope = captureHealthMemoryScope();
  const key = avaConversationKey();
  const snapshot = normalizeAvaMessages(messages).map(({ isStreaming, ...message }) => message);
  const work = async () => {
    if (!isHealthMemoryScopeCurrent(scope)) return;
    let stored = parse(getItemSync(key));
    try {
      stored = mergeAvaMessages(parse(await idb.get(key)), stored);
    } catch {}
    if (!isHealthMemoryScopeCurrent(scope)) return;
    const clean = mergeAvaMessages(stored, snapshot);
    const json = JSON.stringify(clean);
    // No demographics/profile writes: conversations have their own repository.
    let durable = false;
    try {
      setItemSync(key, json);
      durable = getItemSync(key) === json;
    } catch {}
    try {
      await setOwned(key, json);
      durable = true;
    } catch {}
    if (!durable)
      throw new Error('Chat could not be saved on this device. Free storage and retry.');
    if (scope.accountId === 'guest' || !isHealthMemoryScopeCurrent(scope)) return;
    for (const message of clean) {
      if (!isHealthMemoryScopeCurrent(scope)) return;
      const row = {
        id: message.id,
        user_id: scope.accountId,
        profile_id: scope.profileId,
        case_id: message.caseId || null,
        role: message.role,
        content: message.content,
        created_at: message.createdAt,
        metadata: {
          attachments: message.attachments,
          diarySnapshot: message.diarySnapshot,
          sourceStudy: message.sourceStudy,
          contextManifest: message.contextManifest,
          receipts: message.receipts,
          isUpgradePrompt: message.isUpgradePrompt,
        },
      };
      const fingerprint = JSON.stringify(row);
      const fpKey = scope.key + message.id;
      if (fingerprints.get(fpKey) === fingerprint) continue;
      const queued = await enqueueSync('ava_message_upsert', scope.accountId, row);
      if (!isHealthMemoryScopeCurrent(scope)) return;
      if (!queued)
        throw new Error('Chat is saved on this device, but could not be queued for account sync.');
      fingerprints.set(fpKey, fingerprint);
    }
  };
  const next = writeSerial.then(work, work);
  writeSerial = next.catch(() => undefined);
  return next;
}
export async function hydrateAvaMessages(legacy?: unknown) {
  const scope = captureHealthMemoryScope();
  const key = avaConversationKey();
  let local = loadAvaMessages(legacy);
  try {
    local = mergeAvaMessages(parse(await idb.get(key)), local);
  } catch {}
  if (!isHealthMemoryScopeCurrent(scope)) return null;
  if (scope.accountId === 'guest') return local;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!isHealthMemoryScopeCurrent(scope) || session?.user?.id !== scope.accountId) return null;
  const remote: AvaMessage[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await supabase
      .from('ava_messages')
      .select('*')
      .eq('user_id', scope.accountId)
      .eq('profile_id', scope.profileId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(page * 500, (page + 1) * 500 - 1);
    if (!isHealthMemoryScopeCurrent(scope)) return null;
    if (error) return local;
    remote.push(
      ...normalizeAvaMessages(
        (data || []).map((row) => ({
          ...row.metadata,
          id: row.id,
          role: row.role,
          content: row.content,
          caseId: row.case_id || '',
          createdAt: row.created_at,
        }))
      )
    );
    if (!data || data.length < 500) break;
  }
  return mergeAvaMessages(remote, local);
}
export const newAvaMessage = (
  role: 'user' | 'model',
  content: string,
  caseId: string,
  extra = {}
): AvaMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
  caseId,
  createdAt: new Date().toISOString(),
  ...extra,
});
