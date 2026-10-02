import { afterEach, expect, it, vi } from 'vitest';
import handler from '../../../api/trials.js';
import { setCors } from '../../../server/cors.js';

function response() {
  return {
    headers: {} as Record<string, string>,
    statusCode: 0,
    body: undefined as any,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    status(value: number) {
      this.statusCode = value;
      return this;
    },
    json(value: any) {
      this.body = value;
      return this;
    },
    end() {
      return this;
    },
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('shares exact origins for payment/deletion endpoints, and rejects deceptive trial-site suffixes', async () => {
  const exact = response();
  setCors({ headers: { origin: 'https://healthchain-live.vercel.app' } }, exact);
  expect(exact.headers['Access-Control-Allow-Origin']).toBe('https://healthchain-live.vercel.app');
  const preview = response();
  setCors({ headers: { origin: 'https://other.vercel.app' } }, preview);
  expect(preview.headers['Access-Control-Allow-Origin']).toBeUndefined();
  const spoof = response();
  await handler(
    { method: 'OPTIONS', headers: { origin: 'https://evilhealthchain360.com' } },
    spoof
  );
  expect(spoof.headers['Access-Control-Allow-Origin']).toBeUndefined();
});

it.each([
  ['100000', 50],
  ['-4', 1],
  ['bad', 8],
])('bounds upstream result size for %s', async (pageSize, expected) => {
  const fetcher = vi.fn(async (_url: string) => ({
    ok: true,
    json: async () => ({ studies: [] }),
  }));
  vi.stubGlobal('fetch', fetcher);
  const res = response();
  await handler({ method: 'GET', headers: {}, query: { condition: 'synthetic', pageSize } }, res);
  expect(new URL(fetcher.mock.calls[0][0]).searchParams.get('pageSize')).toBe(String(expected));
  expect(res.statusCode).toBe(200);
});

it('rejects unsupported methods and oversized conditions without contacting the provider', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const unsupported = response();
  await handler({ method: 'DELETE', headers: {} }, unsupported);
  expect(unsupported.statusCode).toBe(405);
  const oversized = response();
  await handler({ method: 'GET', headers: {}, query: { condition: 'x'.repeat(301) } }, oversized);
  expect(oversized.statusCode).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});

it('keeps the deadline active while reading a stalled response body', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, { signal }: any) => ({
      ok: true,
      json: () =>
        new Promise((_, reject) =>
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Timed out', 'AbortError')),
            { once: true }
          )
        ),
    }))
  );
  const res = response();
  const pending = handler({ method: 'GET', headers: {}, query: {} }, res);
  await vi.advanceTimersByTimeAsync(12000);
  await pending;
  expect(res.statusCode).toBe(500);
  expect(vi.getTimerCount()).toBe(0);
});
