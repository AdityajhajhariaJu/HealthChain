import { captureAccountScope } from '../AccountScope';
import { getActiveProfileScope } from '../profileScope';

/** The same input under a different owner/profile must never share a model result. */
export function modelRequestKey(input: unknown) {
  const account = captureAccountScope();
  return JSON.stringify({
    account: account.key,
    epoch: account.epoch,
    profile: getActiveProfileScope(),
    input,
  });
}

const caches = new Set<ModelResultCache>();

/** Keep only recent results in memory; durable review history belongs to CaseEngine. */
export class ModelResultCache {
  private entries = new Map<string, any>();
  constructor(private capacity = 16) {
    caches.add(this);
  }
  has(key: string) {
    return this.entries.has(key);
  }
  get(key: string) {
    return this.entries.get(key);
  }
  set(key: string, value: any) {
    this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.capacity)
      this.entries.delete(this.entries.keys().next().value!);
  }
  clear() {
    this.entries.clear();
  }
}

if (typeof window !== 'undefined')
  window.addEventListener('hc_logout', () => {
    for (const cache of caches) cache.clear();
  });
