import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  current: true,
  consent: true,
  getSession: vi.fn(async (): Promise<any> => ({ data: { session: null } })),
}));
vi.mock('../AccountScope', () => ({
  captureAccountScope: () => ({
    accountId: 'guest',
    profileId: 'profile_1',
    key: 'guest:profile_1',
    epoch: 1,
  }),
  isAccountScopeCurrent: () => state.current,
}));
vi.mock('../supabaseClient', () => ({
  supabase: { auth: { getSession: state.getSession } },
}));
import { fetchWithTimeout } from '../ai/transport';
// Permission is exercised separately; deadline tests isolate body cancellation.
vi.mock('../AIConsent', () => ({
  AI_CONSENT_CHANGED: 'hc_ai_consent_changed',
  requestAIConsent: async () => {},
  hasAIConsent: () => state.consent,
}));

beforeEach(() => {
  state.current = true;
  state.consent = true;
  state.getSession.mockReset().mockResolvedValue({ data: { session: null } });
  vi.useFakeTimers();
  vi.stubGlobal('navigator', { onLine: true });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stalledResponse(signal: AbortSignal) {
  return new Response(
    new ReadableStream({
      start(controller) {
        signal.addEventListener(
          'abort',
          () => controller.error(new DOMException('Timed out', 'AbortError')),
          { once: true }
        );
      },
    }),
    { status: 200 }
  );
}

it('aborts a body that stalls after successful headers, without retrying or leaking its timer', async () => {
  const fetcher = vi.fn(async (_url: string, { signal }: any) => stalledResponse(signal));
  vi.stubGlobal('fetch', fetcher);
  const pending = fetchWithTimeout('/api/gemini', {}, 1000, 'synthetic-deadline');
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  await vi.advanceTimersByTimeAsync(1000);
  await rejected;
  expect(fetcher).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it('honors caller cancellation while receiving the body', async () => {
  const caller = new AbortController();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, { signal }: any) => stalledResponse(signal))
  );
  const pending = fetchWithTimeout(
    '/api/gemini',
    { signal: caller.signal },
    1000,
    'synthetic-cancel'
  );
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  await vi.advanceTimersByTimeAsync(0);
  caller.abort();
  await rejected;
  expect(vi.getTimerCount()).toBe(0);
});

it('withdrawal aborts an in-flight body, makes no retry and removes its listener', async () => {
  const target = new EventTarget();
  vi.stubGlobal('window', target);
  const removed = vi.spyOn(target, 'removeEventListener');
  let signal!: AbortSignal;
  const fetcher = vi.fn(async (_url: string, options: any) => {
    signal = options.signal;
    return stalledResponse(signal);
  });
  vi.stubGlobal('fetch', fetcher);
  const pending = fetchWithTimeout('/api/gemini', {}, 1000, 'synthetic-withdrawal');
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  await vi.advanceTimersByTimeAsync(0);
  state.consent = false;
  target.dispatchEvent(new Event('hc_ai_consent_changed'));
  await rejected;
  expect(signal.aborted).toBe(true);
  expect(fetcher).toHaveBeenCalledOnce();
  expect(removed).toHaveBeenCalledWith('hc_ai_consent_changed', expect.any(Function));
  expect(vi.getTimerCount()).toBe(0);
});

it('does not return a completed reply if permission changed without an event', async () => {
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  const fetcher = vi.fn(async () => new Response(new ReadableStream({
    start(controller) { stream = controller; },
  }), { status: 200 }));
  vi.stubGlobal('fetch', fetcher);
  const pending = fetchWithTimeout('/api/gemini', {}, 1000, 'synthetic-consent-race');
  const rejected = expect(pending).rejects.toThrow('permission was withdrawn');
  await vi.advanceTimersByTimeAsync(0);
  state.consent = false;
  stream.enqueue(new TextEncoder().encode('{"answer":"synthetic private answer"}'));
  stream.close();
  await rejected;
  expect(fetcher).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it('rejects an account change during body delivery', async () => {
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              stream = controller;
            },
          }),
          { status: 200 }
        )
    )
  );
  const pending = fetchWithTimeout('/api/gemini', {}, 1000, 'synthetic-owner');
  const rejected = expect(pending).rejects.toThrow('Account changed');
  await vi.advanceTimersByTimeAsync(0);
  state.current = false;
  stream.enqueue(new TextEncoder().encode('{"answer":"old account"}'));
  stream.close();
  await rejected;
  expect(vi.getTimerCount()).toBe(0);
});

it('returns a readable response with its status and headers once the body is complete', async () => {
  const fetcher = vi.fn(
    async () =>
      new Response('{"answer":"synthetic"}', { status: 200, headers: { 'X-HC-Test': 'retained' } })
  );
  vi.stubGlobal('fetch', fetcher);
  const response = await fetchWithTimeout('/api/gemini', {}, 1000, 'synthetic-success');
  expect(response.status).toBe(200);
  expect(response.headers.get('X-HC-Test')).toBe('retained');
  expect(await response.json()).toEqual({ answer: 'synthetic' });
  expect(vi.getTimerCount()).toBe(0);
});

it('returns an unauthorized guest response without waiting for account refresh', async () => {
  vi.stubGlobal('localStorage', { getItem: () => 'true' });
  state.getSession.mockImplementation(() => new Promise(() => {}));
  const fetcher = vi.fn(
    async () => new Response('{"error":"Authentication required"}', { status: 401 })
  );
  vi.stubGlobal('fetch', fetcher);
  const pending = fetchWithTimeout('/api/gemini', {}, 1000, 'synthetic-guest-401');
  await vi.advanceTimersByTimeAsync(0);
  expect(state.getSession).not.toHaveBeenCalled();
  const response = await pending;
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: 'Authentication required' });
  expect(fetcher).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
