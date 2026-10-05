import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../../server/rate-limit.js', () => ({ checkRateLimit: async () => true }));
import {
  issueRegionProof,
  verifyRegionProof,
  regionProofHandler,
} from '../../../server/ai-region.js';
import { createHealthEdgeHandler } from '../../../server/health-edge-adapter.js';

const secret = 'synthetic-region-key-at-least-32-bytes';
const requestId = 'synthetic-request-123456';
const healthUrl = 'https://synthetic.supabase.co/functions/v1/healthchain-health/api/gemini';
const response = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  setHeader(k, v) {
    this.headers[k] = v;
    return this;
  },
  status(s) {
    this.statusCode = s;
    return this;
  },
  json(b) {
    this.body = b;
    return this;
  },
});
afterEach(() => vi.unstubAllEnvs());

describe('server-observed Gemini region proofs', () => {
  it.each(['IN', 'US', 'GB', 'DE', 'AU', 'CH', 'IT', 'BR'])(
    'allows primary market %s',
    (country) => {
      const proof = issueRegionProof(country, requestId, secret, 100000, '192.0.2.1');
      expect(verifyRegionProof(proof, requestId, secret, 101000)).toBe(true);
    }
  );
  it('rejects unsupported regions, invented proof, tampering, expiry and request-ID reuse', () => {
    expect(issueRegionProof('CN', requestId, secret)).toBeNull();
    expect(issueRegionProof('XX', requestId, secret)).toBeNull();
    const proof = issueRegionProof('GB', requestId, secret, 100000, '192.0.2.1');
    expect(verifyRegionProof(proof, requestId, secret, 221000)).toBe(false);
    expect(verifyRegionProof(proof, 'different-request-12345', secret, 101000)).toBe(false);
    expect(verifyRegionProof(proof.replace('GB', 'US') + 'a', requestId, secret, 101000)).toBe(
      false
    );
    expect(verifyRegionProof(proof, requestId, 'wrong-key-at-least-thirty-two-bytes', 101000)).toBe(
      false
    );
  });
  it('uses Vercel country signals and never accepts a browser-declared country', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('AI_REGION_SIGNING_KEY', secret);
    const res = response();
    await regionProofHandler(
      {
        method: 'GET',
        query: { requestId, country: 'US' },
        headers: { 'x-vercel-ip-country': 'CN', 'x-vercel-forwarded-for': '192.0.2.1' },
      },
      res
    );
    expect(res.statusCode).toBe(403);
    const allowed = response();
    await regionProofHandler(
      {
        method: 'GET',
        query: { requestId },
        headers: { 'x-vercel-ip-country': 'US', 'x-vercel-forwarded-for': '192.0.2.1' },
      },
      allowed
    );
    expect(verifyRegionProof(allowed.body.proof, requestId, secret)).toBe(true);
    expect(JSON.stringify(allowed.body)).not.toContain('192.0.2.1');
  });
  it('does not use development country overrides in an untrusted production host', async () => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LOCAL_AI_COUNTRY', 'US');
    const res = response();
    await regionProofHandler(
      { method: 'GET', query: { requestId }, headers: { 'x-vercel-ip-country': 'US' } },
      res
    );
    expect(res.statusCode).toBe(403);
  });
});

describe('direct health backend boundaries', () => {
  it('rejects missing region verification before reading health input or invoking the provider', async () => {
    const handler = vi.fn(),
      serve = createHealthEdgeHandler({ '/api/gemini': handler }, secret);
    const req = new Request(healthUrl, { method: 'POST', body: '{"health":"synthetic"}' });
    const result = await serve(req);
    expect(result.status).toBe(403);
    expect(req.bodyUsed).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
  it('preserves request/account/consent headers and JSON while ignoring forged rate-limit identities', async () => {
    const handler = vi.fn(async (req, res) => res.status(200).json({ candidate: 'synthetic' }));
    const serve = createHealthEdgeHandler({ '/api/gemini': handler }, secret);
    const proof = issueRegionProof('AU', requestId, secret, Date.now(), '192.0.2.1');
    const result = await serve(
      new Request(healthUrl, {
        method: 'POST',
        headers: {
          origin: 'https://healthchain360.com',
          'x-hc-region-proof': proof,
          'x-hc-request-id': requestId,
          'x-hc-ai-consent': 'synthetic-consent',
          authorization: 'Bearer synthetic',
          'x-real-ip': 'forged',
        },
        body: '{"health":"synthetic"}',
      })
    );
    expect(result.status).toBe(200);
    const req = handler.mock.calls[0][0];
    expect(req.body).toEqual({ health: 'synthetic' });
    expect(req.headers.authorization).toBe('Bearer synthetic');
    expect(req.headers['x-real-ip']).toMatch(/^[a-f0-9]{64}$/);
    expect(req.headers['x-real-ip']).toBe(req.headers['x-forwarded-for']);
    expect(result.headers.get('access-control-allow-headers')).toContain('X-HC-Region-Proof');
    expect(result.headers.get('cache-control')).toBe('no-store');
  });
  it('blocks unrelated origins, unsupported routes and oversized streams', async () => {
    const handler = vi.fn(),
      serve = createHealthEdgeHandler({ '/api/delete-account': handler }, secret);
    expect(
      (await serve(new Request(healthUrl, { headers: { origin: 'https://attacker.example' } })))
        .status
    ).toBe(403);
    expect((await serve(new Request(healthUrl.replace('gemini', 'unknown')))).status).toBe(404);
    expect(
      (
        await serve(
          new Request(healthUrl.replace('gemini', 'delete-account'), {
            method: 'POST',
            body: 'x'.repeat(10001),
          })
        )
      ).status
    ).toBe(413);
    expect(handler).not.toHaveBeenCalled();
  });
});
