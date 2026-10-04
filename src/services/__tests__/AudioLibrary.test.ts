import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { createStore, set } from 'idb-keyval';
import { afterEach, expect, it, vi } from 'vitest';
import {
  AUDIO_STORAGE_LIMIT,
  audioInfo,
  audioStreamUrl,
  cachedAudio,
  clearAudioDownloads,
  downloadAudio,
  listAudioDownloads,
  removeAudioDownload,
} from '../AudioLibrary';

const path = '/audio/Tranquil Breathing Space.m4a';
const bytes = () => readFile('public' + path);
afterEach(async () => {
  await clearAudioDownloads();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('uses a versioned production HTTPS URL on native and a relative URL on web', () => {
  expect(audioStreamUrl(path, true)).toBe(
    `https://www.healthchain360.com/audio/Tranquil%20Breathing%20Space.m4a?v=${audioInfo(path).sha256.slice(0, 16)}`
  );
  expect(audioStreamUrl(path, false)).toMatch(/^\/audio\/Tranquil%20Breathing%20Space.m4a\?v=/);
  vi.stubEnv('VITE_MEDIA_BASE_URL', 'http://unsafe.test');
  expect(() => audioStreamUrl(path, true)).toThrow('HTTPS origin');
  expect(() => audioInfo('/audio/unknown.m4a')).toThrow('not in the audio library');
});

it('saves only a complete verified file and supports removal and clearing', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(await bytes()))
  );
  const progress: number[] = [];
  await downloadAudio(path, new AbortController().signal, (value) => progress.push(value));
  expect(progress[progress.length - 1]).toBe(100);
  expect((await cachedAudio(path))?.size).toBe(audioInfo(path).bytes);
  expect(await listAudioDownloads()).toEqual([
    { path, bytes: audioInfo(path).bytes, available: true },
  ]);
  await removeAudioDownload(path);
  expect(await cachedAudio(path)).toBeUndefined();
  expect(await listAudioDownloads()).toEqual([]);
});

it('rejects a corrupted file even when its length matches', async () => {
  const data = await bytes();
  data[data.length - 1] ^= 1;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(data))
  );
  await expect(downloadAudio(path, new AbortController().signal, () => {})).rejects.toThrow(
    'incomplete or changed'
  );
  expect(await cachedAudio(path)).toBeUndefined();
});

it('does not store interrupted or unavailable downloads', async () => {
  const controller = new AbortController();
  controller.abort();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(await bytes()))
  );
  await expect(downloadAudio(path, controller.signal, () => {})).rejects.toBeDefined();
  expect(await listAudioDownloads()).toEqual([]);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('', { status: 404 }))
  );
  await expect(downloadAudio(path, new AbortController().signal, () => {})).rejects.toThrow(
    'could not be downloaded'
  );
  expect(await listAudioDownloads()).toEqual([]);
});

it('enforces the quota atomically and preserves existing downloads', async () => {
  const store = createStore('healthchain-audio-v1', 'downloads');
  await set(
    '/reserved',
    {
      path: '/reserved',
      version: 'old',
      blob: new Blob([new Uint8Array(AUDIO_STORAGE_LIMIT)]),
      savedAt: 0,
    },
    store
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(await bytes()))
  );
  await expect(downloadAudio(path, new AbortController().signal, () => {})).rejects.toThrow(
    'storage is full'
  );
  expect(await cachedAudio(path)).toBeUndefined();
  expect((await listAudioDownloads())[0].bytes).toBe(AUDIO_STORAGE_LIMIT);
});
