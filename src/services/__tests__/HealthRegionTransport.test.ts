import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ consent: true, current: true }));
vi.mock('../AccountScope', () => ({
  captureAccountScope: () => ({ accountId: 'guest' }),
  isAccountScopeCurrent: () => state.current,
}));
vi.mock('../supabaseClient', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));
vi.mock('../analytics', () => ({ trackEvent: () => {} }));
vi.mock('../AIConsent', () => ({
  AI_CONSENT_CHANGED: 'hc_ai_consent_changed',
  requestAIConsent: async () => {},
  hasAIConsent: () => state.consent,
}));
import { fetchWithTimeout } from '../ai/transport';

const destination =
  'https://cikikocfvfshloqwnyfe.supabase.co/functions/v1/healthchain-health/api/gemini';
beforeEach(() => {
  state.consent = true;
  state.current = true;
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubEnv('VITE_HEALTH_BACKEND_URL', destination.replace('/api/gemini', ''));
  vi.stubEnv('VITE_BACKEND_URL', 'https://healthchain360.com');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('checks country without health input or account tokens, then sends the proof to the direct health destination', async () => {
  const fetcher = vi.fn(async (url: string) =>
    url.includes('?region=1')
      ? Response.json({ proof: 'synthetic-proof' })
      : Response.json({ result: 'synthetic' })
  );
  vi.stubGlobal('fetch', fetcher);
  const result = await fetchWithTimeout(
    destination,
    { method: 'POST', body: '{"health":"synthetic"}' },
    1000,
    'synthetic-request-123'
  );
  expect(result.ok).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(2);
  const [regionUrl, regionOptions] = fetcher.mock.calls[0] as any;
  expect(regionUrl).toBe(
    'https://healthchain360.com/api/gemini?region=1&requestId=synthetic-request-123'
  );
  expect(regionOptions.body).toBeUndefined();
  expect(regionOptions.headers).toBeUndefined();
  expect(regionOptions.credentials).toBe('omit');
  const [healthUrl, healthOptions] = fetcher.mock.calls[1] as any;
  expect(healthUrl).toBe(destination);
  expect(healthOptions.body).toContain('synthetic');
  expect(healthOptions.headers['X-HC-Region-Proof']).toBe('synthetic-proof');
});

it.each(['AI_REGION_UNAVAILABLE', 'AI_REGION_CHECK_UNAVAILABLE'])(
  'sends no health input when the country check returns %s',
  async (code) => {
    const fetcher = vi.fn(async () => Response.json({ code }, { status: 403 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(
      fetchWithTimeout(
        destination,
        { method: 'POST', body: '{"health":"synthetic"}' },
        1000,
        'synthetic-request-123'
      )
    ).rejects.toThrow(code);
    expect(fetcher).toHaveBeenCalledOnce();
  }
);

it.each(['consent', 'current'] as const)(
  'withdrawal or account change during country checking prevents the health request (%s)',
  async (field) => {
    const fetcher = vi.fn(async () => {
      state[field] = false;
      return Response.json({ proof: 'synthetic-proof' });
    });
    vi.stubGlobal('fetch', fetcher);
    await expect(
      fetchWithTimeout(
        destination,
        { method: 'POST', body: '{"health":"synthetic"}' },
        1000,
        'synthetic-request-123'
      )
    ).rejects.toThrow(/permission or account changed/);
    expect(fetcher).toHaveBeenCalledOnce();
  }
);

it('never falls back to Vercel when the direct health backend refuses the request', async () => {
  const fetcher = vi.fn(async (url: string) =>
    url.includes('?region=1')
      ? Response.json({ proof: 'synthetic-proof' })
      : Response.json({ error: 'synthetic rejection' }, { status: 403 })
  );
  vi.stubGlobal('fetch', fetcher);
  const result = await fetchWithTimeout(
    destination,
    { method: 'POST', body: '{}' },
    1000,
    'synthetic-request-123'
  );
  expect(result.status).toBe(403);
  expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
    'https://healthchain360.com/api/gemini?region=1&requestId=synthetic-request-123',
    destination,
  ]);
});
