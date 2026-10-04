import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const database = vi.hoisted(() => ({ rpc: vi.fn(), counts: new Map(), clients: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: (...args) => {
  database.clients(...args); return { rpc: database.rpc };
} }));
import { checkRateLimit } from '../../../server/rate-limit.js';
const request = (ip = '192.0.2.1', url = '/api/gemini') => ({ url, headers: { 'x-real-ip': ip } });
describe('shared server rate limits', () => {
  beforeEach(() => {
    database.counts.clear(); database.rpc.mockReset(); database.clients.mockClear();
    database.rpc.mockImplementation(async (_name, args) => {
      const count = (database.counts.get(args.p_key) || 0) + 1;
      database.counts.set(args.p_key, count);
      return { data: count <= args.p_limit, error: null };
    });
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-private-server-key');
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
  it('enforces a shared limit across concurrent requests and independent module instances', async () => {
    vi.resetModules(); const secondInstance = await import('../../../server/rate-limit.js');
    const results = await Promise.all(Array.from({ length: 8 }, (_, index) =>
      (index % 2 ? secondInstance.checkRateLimit : checkRateLimit)(request(), 3, 60000, 'owner-a')));
    expect(results.filter(Boolean)).toHaveLength(3);
    expect(database.counts.size).toBe(1);
    expect(database.rpc.mock.calls.every(([name]) => name === 'healthchain_consume_rate_limit')).toBe(true);
  });
  it('shares an authenticated account limit across IPs while isolating routes and accounts', async () => {
    expect(await checkRateLimit(request(), 1, 60000, 'owner-a')).toBe(true);
    expect(await checkRateLimit(request('192.0.2.2'), 1, 60000, 'owner-a')).toBe(false);
    expect(await checkRateLimit(request(), 1, 60000, 'owner-b')).toBe(true);
    expect(await checkRateLimit(request('192.0.2.2', '/api/create-order'), 1, 60000, 'owner-a')).toBe(true);
  });
  it('uses separate public food lookup limits per IP and excludes query parameters', async () => {
    expect(await checkRateLimit(request('192.0.2.1', '/api/food-product?code=private'), 1, 60000, 'food-product')).toBe(true);
    expect(await checkRateLimit(request('192.0.2.1', '/api/food-product?code=other'), 1, 60000, 'food-product')).toBe(false);
    expect(await checkRateLimit(request('192.0.2.2', '/api/food-product'), 1, 60000, 'food-product')).toBe(true);
    expect(database.rpc.mock.calls.map(([, args]) => args.p_key).every(key => /^[a-f0-9]{64}$/.test(key))).toBe(true);
  });
  it.each([{ data: null, error: { message: 'private diagnostics' } }, { data: null, error: null }])('fails closed on unavailable or invalid database replies', async reply => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); database.rpc.mockResolvedValue(reply);
    expect(await checkRateLimit(request())).toBe(false);
    expect(console.error).toHaveBeenCalledWith('Shared rate limiting is temporarily unavailable.');
  });
  it('does not use a local production fallback when service credentials are missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect(await checkRateLimit(request())).toBe(false); expect(database.rpc).not.toHaveBeenCalled();
  });
  it('does not disclose raw IP, owner or query content in its stored counter key', async () => {
    await checkRateLimit(request(), 10, 60000, 'private-owner');
    expect(JSON.stringify(database.rpc.mock.calls)).not.toContain('192.0.2.1');
    expect(JSON.stringify(database.rpc.mock.calls)).not.toContain('private-owner');
  });
});
