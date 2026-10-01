import { del, set } from 'idb-keyval';
import { isErasedStorageKey } from './DurableHealthStorage';
const pending = new Set<Promise<void>>();
/** Erasure is a barrier: pending writes finish before cleanup, and later writes are rejected. */
export function setOwned(key: IDBValidKey, value: unknown): Promise<void> {
  if (typeof key === 'string' && isErasedStorageKey(key)) return Promise.resolve();
  const work = Promise.resolve().then(async () => {
    if (typeof key === 'string' && isErasedStorageKey(key)) return;
    await set(key, value);
    if (typeof key === 'string' && isErasedStorageKey(key)) await del(key);
  });
  pending.add(work);
  void work.then(() => pending.delete(work), () => pending.delete(work));
  return work;
}
export async function flushOwnedWrites() { await Promise.allSettled([...pending]); }
