import { afterEach, expect, it, vi } from 'vitest';

const requests = vi.hoisted(() => ({ signals: [] as AbortSignal[] }));
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        abortSignal: (signal: AbortSignal) => {
          requests.signals.push(signal);
          if (requests.signals.length > 1) return Promise.resolve({ data: [], error: null });
          return new Promise((_, reject) =>
            signal.addEventListener('abort', () => reject(signal.reason), { once: true })
          );
        },
      };
      return query;
    },
  },
}));
import { FitnessService } from '../FitnessService';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it('bounds a stalled catalog read and retries without relying on AbortSignal.timeout', async () => {
  vi.useFakeTimers();
  vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
    throw new Error('Unsupported browser API');
  });
  const read = FitnessService.getCategories();
  const failure = expect(read).rejects.toMatchObject({ name: 'AbortError' });
  await vi.advanceTimersByTimeAsync(15001);
  await failure;
  expect(requests.signals[0].aborted).toBe(true);
  expect(await FitnessService.getCategories()).toEqual([]);
  expect(requests.signals).toHaveLength(2);
  expect(vi.getTimerCount()).toBe(0);
});
