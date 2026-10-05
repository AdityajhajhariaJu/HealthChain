import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { currentAIRegionAllowed } from '../../../server/ai-region.js';
import handler from '../../../api/gemini.js';

beforeEach(() => { vi.stubEnv('VERCEL', '1'); vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('HEALTHCHAIN_RUNTIME', ''); });
afterEach(() => vi.unstubAllEnvs());
it.each(['IN', 'US', 'GB', 'DE', 'AU', 'CH', 'IT', 'BR'])('keeps the primary market %s available on the current route', country => {
  expect(currentAIRegionAllowed({ headers: { 'x-vercel-ip-country': country } })).toBe(true);
});
it.each(['IR', 'KP', '', undefined, ['US'], 'XX'])('refuses unsupported or unverified location %s', country => {
  expect(currentAIRegionAllowed({ headers: { 'x-vercel-ip-country': country } })).toBe(false);
});
it('does not trust a browser header on an unverified production host', () => {
  vi.stubEnv('VERCEL', '');
  expect(currentAIRegionAllowed({ headers: { 'x-vercel-ip-country': 'US' } })).toBe(false);
});
it('blocks unsupported current-route requests before credentials, counters or a model call', async () => {
  const json = vi.fn(); const status = vi.fn().mockReturnValue({ json });
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  try {
    await handler({ method: 'POST', headers: { origin: 'https://healthchain360.com', 'x-vercel-ip-country': 'IR' }, body: { contents: [{ text: 'Synthetic input' }] } }, { setHeader: vi.fn(), status });
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AI_REGION_UNAVAILABLE' }));
    expect(fetch).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
