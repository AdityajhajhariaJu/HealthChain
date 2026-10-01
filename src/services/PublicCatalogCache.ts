/** Bounded cache for public catalog data only. Never put account records here. */
export class PublicCatalogCache {
  private entries = new Map<string, { promise: Promise<unknown>; expiresAt: number }>();
  constructor(
    private ttlMs = 300_000,
    private capacity = 32
  ) {}

  clear() {
    this.entries.clear();
  }

  get<T>(key: string, load: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted)
      return Promise.reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    let entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      const next = { promise: null as unknown as Promise<T>, expiresAt: Infinity };
      next.promise = Promise.resolve()
        .then(load)
        .then(
          (value) => {
            next.expiresAt = Date.now() + this.ttlMs;
            return value;
          },
          (error) => {
            if (this.entries.get(key) === next) this.entries.delete(key);
            throw error;
          }
        );
      entry = next;
      this.entries.delete(key);
      this.entries.set(key, next);
      while (this.entries.size > this.capacity)
        this.entries.delete(this.entries.keys().next().value!);
    }
    const promise = entry.promise as Promise<T>;
    if (!signal) return promise;
    // One cancelled view must not abort a request shared by another view.
    return new Promise<T>((resolve, reject) => {
      const abort = () => {
        signal.removeEventListener('abort', abort);
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      };
      signal.addEventListener('abort', abort, { once: true });
      promise.then(
        (value) => {
          signal.removeEventListener('abort', abort);
          resolve(value);
        },
        (error) => {
          signal.removeEventListener('abort', abort);
          reject(error);
        }
      );
    });
  }
}
