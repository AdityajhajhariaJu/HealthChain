import { Capacitor } from '@capacitor/core';
import { clear, createStore, del, get, promisifyRequest, values, type UseStore } from 'idb-keyval';
import manifest from '../data/audio-manifest.json';

export const AUDIO_STORAGE_LIMIT = 100_000_000;
const MAX_TRACK_BYTES = 15_000_000;
const catalog: Record<string, { bytes: number; seconds: number; sha256: string }> = manifest;
let store: UseStore | undefined;
const downloadsStore = () => (store ||= createStore('healthchain-audio-v1', 'downloads'));
interface StoredAudio {
  path: string;
  version: string;
  data?: ArrayBuffer;
  blob?: Blob;
  savedAt: number;
}
export interface AudioDownload {
  path: string;
  bytes: number;
  available: boolean;
}
const storedBytes = (entry: StoredAudio) => entry.data?.byteLength ?? entry.blob?.size ?? 0;

export function audioInfo(path: string) {
  if (!catalog[path]) throw new Error('This sound is not in the audio library.');
  return catalog[path];
}

export function audioStreamUrl(path: string, native = Capacitor.isNativePlatform()) {
  const info = audioInfo(path);
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const configured = import.meta.env.VITE_MEDIA_BASE_URL?.trim();
  let base = configured || (native ? 'https://www.healthchain360.com' : '');
  if (base) {
    const url = new URL(base);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      throw new Error('The audio host must be an HTTPS origin.');
    base = url.origin;
  }
  return `${base}${encoded}?v=${info.sha256.slice(0, 16)}`;
}

export async function listAudioDownloads(): Promise<AudioDownload[]> {
  return (await values<StoredAudio>(downloadsStore())).map((entry) => ({
    path: entry.path,
    bytes: storedBytes(entry),
    available: Boolean(
      catalog[entry.path] &&
      entry.version === catalog[entry.path].sha256 &&
      storedBytes(entry) === catalog[entry.path].bytes
    ),
  }));
}

export async function cachedAudio(path: string): Promise<Blob | undefined> {
  const info = audioInfo(path);
  const entry = await get<StoredAudio>(path, downloadsStore());
  if (!entry || entry.version !== info.sha256 || storedBytes(entry) !== info.bytes)
    return undefined;
  return entry.data ? new Blob([entry.data], { type: 'audio/mp4' }) : entry.blob;
}

export async function downloadAudio(
  path: string,
  signal: AbortSignal,
  progress: (percent: number) => void
) {
  const info = audioInfo(path);
  if (info.bytes > MAX_TRACK_BYTES)
    throw new Error('This track is too large for an offline download.');
  const controller = new AbortController();
  const cancel = () => controller.abort(signal.reason);
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) cancel();
  const timeout = setTimeout(
    () => controller.abort(new Error('The download timed out. Check your connection and retry.')),
    60_000
  );
  try {
    const response = await fetch(audioStreamUrl(path), {
      signal: controller.signal,
      credentials: 'omit',
    });
    if (!response.ok || !response.body)
      throw new Error('The audio could not be downloaded. Check your connection and retry.');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > info.bytes || bytes > MAX_TRACK_BYTES)
          throw new Error(
            'The audio download was larger than expected. Retry after refreshing the app.'
          );
        chunks.push(value as Uint8Array);
        progress(Math.min(99, Math.round((bytes / info.bytes) * 100)));
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const blob = new Blob(chunks, { type: 'audio/mp4' });
    const data = await blob.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    if (bytes !== info.bytes || hash !== info.sha256)
      throw new Error('The audio download was incomplete or changed. Refresh the app and retry.');
    controller.signal.throwIfAborted();
    // Read and write under one transaction so concurrent tabs cannot exceed the limit.
    let full = false;
    await downloadsStore()('readwrite', (objectStore) => {
      const completion = promisifyRequest(objectStore.transaction);
      const request = objectStore.getAll();
      request.onsuccess = () => {
        const used = (request.result as StoredAudio[])
          .filter((entry) => entry.path !== path)
          .reduce((sum, entry) => sum + storedBytes(entry), 0);
        if (used + blob.size > AUDIO_STORAGE_LIMIT) {
          full = true;
          objectStore.transaction.abort();
          return;
        }
        if (controller.signal.aborted) {
          objectStore.transaction.abort();
          return;
        }
        objectStore.put(
          // Raw bytes avoid Blob serialization failures in some WebKit storage implementations.
          { path, data, version: info.sha256, savedAt: Date.now() } satisfies StoredAudio,
          path
        );
      };
      return completion;
    }).catch((error) => {
      if (full)
        throw new Error(
          'Offline storage is full (100 MB). Remove a download before adding this track.'
        );
      if (controller.signal.aborted) throw controller.signal.reason;
      if (error?.name === 'QuotaExceededError')
        throw new Error('Your device has insufficient storage. Remove downloads and retry.');
      throw error;
    });
    progress(100);
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
  }
}

export const removeAudioDownload = (path: string) => del(path, downloadsStore());
export const clearAudioDownloads = () => clear(downloadsStore());
