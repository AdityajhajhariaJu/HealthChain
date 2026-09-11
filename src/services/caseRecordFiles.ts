import { get, set, del, keys } from 'idb-keyval';
import { getProfileKey, getProfileEngineState } from './ProfileEngine';

export type FileStorageErrorCode =
  | 'quota_exceeded'
  | 'storage_unavailable'
  | 'unsupported_file'
  | 'interrupted_upload'
  | 'profile_mismatch'
  | 'file_not_found';

export class FileStorageError extends Error {
  code: FileStorageErrorCode;
  originalError?: unknown;

  constructor(code: FileStorageErrorCode, message: string, originalError?: unknown) {
    super(message);
    this.name = 'FileStorageError';
    this.code = code;
    this.originalError = originalError;
  }
}

export const ALLOWED_FILE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const scope = () => getProfileKey() + ':' + (getProfileEngineState()?.activeId || 'profile_1');
export const key = (caseId: string, recordId: string) => 'hc_original_record:' + scope() + ':' + caseId + ':' + recordId;

export function validateCaseFile(file: File): void {
  if (!file) {
    throw new FileStorageError('unsupported_file', 'No document provided for storage.');
  }
  if (file.size === 0) {
    throw new FileStorageError('unsupported_file', 'The document is empty (0 bytes).');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new FileStorageError('unsupported_file', `File size exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB maximum.`);
  }
  if (file.type && !ALLOWED_FILE_MIME_TYPES.includes(file.type)) {
    throw new FileStorageError('unsupported_file', `Unsupported document format: "${file.type}". Please upload a PDF, PNG, JPG, or WebP.`);
  }
}

function isQuotaError(err: any): boolean {
  if (!err) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

export function checkIndexedDBAvailable(): void {
  if (typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB === null) {
    throw new FileStorageError('storage_unavailable', 'Local device database (IndexedDB) is disabled or blocked in this browser.');
  }
}

/** Originals stay on this device; the case stores metadata and extracted text only. */
export async function saveOriginalCaseFile(caseId: string, recordId: string, file: File): Promise<void> {
  if (!caseId || !recordId) {
    throw new Error('A case and record are required.');
  }
  validateCaseFile(file);
  checkIndexedDBAvailable();

  const startScope = scope();
  const storageKey = key(caseId, recordId);

  try {
    await set(storageKey, file);
  } catch (err: any) {
    if (isQuotaError(err)) {
      throw new FileStorageError('quota_exceeded', 'Device storage limit exceeded. Free up space on this device to keep original records.', err);
    }
    throw new FileStorageError('storage_unavailable', 'Could not save document to device storage.', err);
  }

  // Profile switch mid-operation race protection
  if (scope() !== startScope) {
    // Attempt rollback of the mismatched write
    try { await del(storageKey); } catch {}
    throw new FileStorageError('profile_mismatch', 'Active profile changed during file save operation.');
  }
}

export async function loadOriginalCaseFile(caseId: string, recordId: string): Promise<Blob | null> {
  if (!caseId || !recordId) return null;
  checkIndexedDBAvailable();

  const requestScope = scope();
  const storageKey = key(caseId, recordId);

  try {
    const result = await get<Blob>(storageKey);
    return scope() === requestScope && result instanceof Blob ? result : null;
  } catch (err) {
    return null;
  }
}

export async function checkOriginalFileAvailability(caseId: string, recordId: string): Promise<{ isAvailable: boolean; reason?: string }> {
  if (!caseId || !recordId) {
    return { isAvailable: false, reason: 'Invalid case or record identifier.' };
  }
  const file = await loadOriginalCaseFile(caseId, recordId);
  if (file) {
    return { isAvailable: true };
  }
  return {
    isAvailable: false,
    reason: 'Original file unavailable on this device',
  };
}

export async function reattachOriginalCaseFile(caseId: string, recordId: string, file: File): Promise<void> {
  await saveOriginalCaseFile(caseId, recordId, file);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_case_file_reattached', { detail: { caseId, recordId } }));
  }
}

export async function deleteOriginalCaseFile(caseId: string, recordId: string): Promise<void> {
  if (!caseId || !recordId) return;
  try {
    const storageKey = key(caseId, recordId);
    await del(storageKey);
  } catch (err) {
    console.warn('[caseRecordFiles] Failed to delete original file:', err);
  }
}

export async function cleanupCaseOriginalFiles(caseId: string): Promise<void> {
  if (!caseId) return;
  try {
    if (typeof keys !== 'function') return;
    const allKeys = await keys();
    const casePrefix = `:${caseId}:`;
    const targetKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('hc_original_record:') && k.includes(casePrefix));
    for (const k of targetKeys) {
      await del(k);
    }
  } catch (err) {
    console.warn('[caseRecordFiles] Failed to cleanup case original files:', err);
  }
}
