import { afterEach, expect, it, vi } from 'vitest';
import { PublicCatalogCache } from '../PublicCatalogCache';
afterEach(() => vi.useRealTimers());

it('shares one request between simultaneous views and caches an empty result', async () => {
  const cache = new PublicCatalogCache();
  const load = vi.fn(async () => []);
  const [first, second] = await Promise.all([cache.get('items', load), cache.get('items', load)]);
  expect(first).toBe(second);
  expect(await cache.get('items', load)).toEqual([]);
  expect(load).toHaveBeenCalledTimes(1);
});
it('expires each key independently; loading programs does not renew content', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const cache = new PublicCatalogCache(100);
  const load = vi.fn(async () => ['content']);
  await cache.get('content', load);
  vi.setSystemTime(90);
  await cache.get('programs', async () => []);
  vi.setSystemTime(101);
  await cache.get('content', load);
  expect(load).toHaveBeenCalledTimes(2);
});
it('a cancelled view cannot cancel another view sharing its request', async () => {
  const cache = new PublicCatalogCache();
  let finish!: (value: string[]) => void;
  const load = vi.fn(
    () =>
      new Promise<string[]>((resolve) => {
        finish = resolve;
      })
  );
  const controller = new AbortController();
  const first = cache.get('items', load, controller.signal);
  const second = cache.get('items', load);
  const cancelled = expect(first).rejects.toMatchObject({ name: 'AbortError' });
  await Promise.resolve();
  controller.abort();
  finish(['ready']);
  await cancelled;
  expect(await second).toEqual(['ready']);
  expect(load).toHaveBeenCalledTimes(1);
});
it('failed requests can retry without retaining the outage', async () => {
  const cache = new PublicCatalogCache();
  const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(['ready']);
  await expect(cache.get('items', load)).rejects.toThrow('offline');
  expect(await cache.get('items', load)).toEqual(['ready']);
});
it('clearing during a request prevents its result from refilling the cache', async () => {
  const cache = new PublicCatalogCache();
  let finish!: (value: string[]) => void;
  const pending = cache.get(
    'items',
    () =>
      new Promise<string[]>((resolve) => {
        finish = resolve;
      })
  );
  await Promise.resolve();
  cache.clear();
  finish(['old']);
  await pending;
  expect(await cache.get('items', async () => ['new'])).toEqual(['new']);
});
it('bounds the number of cached keys', async () => {
  const cache = new PublicCatalogCache(1000, 2);
  const first = vi.fn(async () => []);
  await cache.get('one', first);
  await cache.get('two', async () => []);
  await cache.get('three', async () => []);
  await cache.get('one', first);
  expect(first).toHaveBeenCalledTimes(2);
});
