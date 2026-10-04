import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocked = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), limiter: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc: mocked.rpc, auth: { getUser: mocked.getUser } }) }));
vi.mock('../../../server/rate-limit.js', () => ({ checkRateLimit: mocked.limiter }));
import handler from '../../../api/product-metrics.js';
import { MEASUREMENT_VERSION, METRIC_DIMENSIONS, validMetric } from '../../../shared/product-metrics.js';
const response = () => ({ statusCode: 200, body: null as any, setHeader: vi.fn(),
  status(code: number) { this.statusCode = code; return this; },
  json(body: unknown) { this.body = body; return this; }, end() { return this; } });
const request = () => ({ method: 'POST', headers: { origin: 'http://localhost:3001', 'x-hc-measurement-consent': MEASUREMENT_VERSION } as Record<string, string>,
  body: { event: 'audio_action', dimension: 'playing', platform: 'ios' } as any, query: {} as any });
describe('server-enforced aggregate measurement', () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv('SUPABASE_URL', 'https://synthetic.supabase.co'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-service');
    mocked.rpc.mockResolvedValue({ data: [], error: null }); mocked.limiter.mockResolvedValue(true);
    mocked.getUser.mockResolvedValue({ data: { user: { id: 'synthetic-admin', app_metadata: { healthchain_admin: true } } }, error: null });
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each([undefined, 'old'])('rejects missing/stale permission %s before storage', async version => {
    const req = request(); req.headers['x-hc-measurement-consent'] = version as any;
    const res = response(); await handler(req, res); expect(res.statusCode).toBe(428); expect(mocked.rpc).not.toHaveBeenCalled();
  });
  it('honors GPC without storing a count', async () => {
    const req = request(); req.headers['sec-gpc'] = '1'; const res = response(); await handler(req, res);
    expect(res.statusCode).toBe(204); expect(mocked.rpc).not.toHaveBeenCalled();
  });
  it.each([{ user_id: 'private' }, { symptom: 'private' }, { dimension: 'private sound name' }, { event: ['audio_action'] }])('rejects forged or sensitive fields %j', async change => {
    const req = request(); Object.assign(req.body, change); const res = response(); await handler(req, res);
    expect(res.statusCode).toBe(400); expect(mocked.rpc).not.toHaveBeenCalled();
  });
  it.each(['https://unrelated.vercel.app', 'https://healthchain360.com.attacker.test', ''])('rejects unrelated/missing origin %s', async origin => {
    const req = request(); req.headers.origin = origin; const res = response(); await handler(req, res);
    expect(res.statusCode).toBe(403); expect(mocked.rpc).not.toHaveBeenCalled();
  });
  it('counts valid events without forwarding identity or connection headers', async () => {
    const req = request(); req.headers.authorization = 'Bearer private'; req.headers['x-forwarded-for'] = '192.0.2.1';
    const res = response(); await handler(req, res);
    expect(res.statusCode).toBe(204); expect(mocked.rpc).toHaveBeenCalledExactlyOnceWith('healthchain_count_product_metric', { p_event: 'audio_action', p_dimension: 'playing', p_platform: 'ios' });
    expect(mocked.getUser).not.toHaveBeenCalled();
  });
  it('does not count when rate limiting fails closed', async () => {
    mocked.limiter.mockResolvedValue(false); const res = response(); await handler(request(), res);
    expect(res.statusCode).toBe(429); expect(mocked.rpc).not.toHaveBeenCalled();
  });
  it('returns an unavailable result when storage fails', async () => {
    mocked.rpc.mockResolvedValue({ error: { message: 'Synthetic failure' } }); const res = response(); await handler(request(), res);
    expect(res.statusCode).toBe(503);
  });
  it('requires login for reports', async () => {
    const req = request(); req.method = 'GET'; const res = response(); await handler(req, res);
    expect(res.statusCode).toBe(401); expect(mocked.rpc).not.toHaveBeenCalled();
  });
  it('does not accept user-editable metadata as report authorization', async () => {
    mocked.getUser.mockResolvedValue({ data: { user: { id: 'ordinary-user', user_metadata: { role: 'admin', healthchain_admin: true } } }, error: null });
    const req = request(); req.method = 'GET'; req.headers.authorization = 'Bearer synthetic'; const res = response(); await handler(req, res);
    expect(res.statusCode).toBe(403); expect(mocked.rpc).not.toHaveBeenCalled();
  });
  it('rate limits report authentication before contacting the auth provider', async () => {
    mocked.limiter.mockResolvedValue(false);
    const req = request(); req.method = 'GET'; req.headers.authorization = 'Bearer synthetic';
    const res = response(); await handler(req, res);
    expect(res.statusCode).toBe(429); expect(mocked.getUser).not.toHaveBeenCalled(); expect(mocked.rpc).not.toHaveBeenCalled();
  });
  it('restricts administrator reports to bounded periods', async () => {
    const req = request(); req.method = 'GET'; req.headers.authorization = 'Bearer synthetic'; req.query.days = '999';
    const res = response(); await handler(req, res); expect(res.statusCode).toBe(400); expect(mocked.rpc).not.toHaveBeenCalled();
  });
  it('returns aggregate rows to an authorized administrator', async () => {
    const req = request(); req.method = 'GET'; req.headers.authorization = 'Bearer synthetic'; req.query.days = '7';
    const res = response(); await handler(req, res); expect(res.statusCode).toBe(200);
    expect(mocked.rpc).toHaveBeenCalledExactlyOnceWith('healthchain_product_metric_report', { p_days: 7 });
  });
  it('accepts each documented contract category and rejects arbitrary text', () => {
    for (const [event, dimensions] of Object.entries(METRIC_DIMENSIONS)) for (const dimension of dimensions)
      expect(validMetric({ event, dimension, platform: 'web' })).toBe(true);
    expect(validMetric({ event: 'app_error', dimension: 'private stack', platform: 'web' })).toBe(false);
    expect(validMetric({ event: '__proto__', dimension: 'private', platform: 'web' })).toBe(false);
  });
});
