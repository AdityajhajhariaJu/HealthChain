import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const state = vi.hoisted(() => ({ platform: 'web', user: null as any, calls: [] as string[], authThrow: false, writeError: false, missing: false, rate: true, bucketMissing: false }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => state.platform } }));
vi.mock('../../../server/rate-limit.js', () => ({ checkRateLimit: () => state.rate }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({
  auth: { getUser: async () => { if (state.authThrow) throw new Error('offline'); return { data: { user: state.user }, error: null }; } },
  storage: {
    getBucket: async () => ({ error: state.bucketMissing ? { statusCode: '404' } : null }),
    createBucket: async () => { state.calls.push('create-public-content-bucket'); return { error: null }; },
    from: () => ({ upload: async () => { state.calls.push('upload-content-image'); return { error: null }; }, getPublicUrl: (path: string) => ({ data: { publicUrl: 'https://synthetic.supabase.co/storage/v1/object/public/fitness-content/' + path } }) }),
  },
  from: (table: string) => {
    state.calls.push(table);
    const q: any = { select: () => q, order: () => q, eq: () => q, insert: () => q, update: () => q, then: (resolve: any) => Promise.resolve({ data: state.missing ? [] : [{ id: '00000000-0000-0000-0000-000000000001' }], error: state.writeError ? new Error('database failed') : null }).then(resolve) };
    return q;
  },
}) }));
import adminHandler, { hasContentAdminAccess } from '../../../api/admin-content.js';
import { apiEndpoint, resolveBackendBase } from '../ApiEndpoint';
import { inspectModelOutput } from '../../../shared/model-output-validation.js';
import { decodeContentImage } from '../../../server/content-image.js';
const response = () => ({ statusCode: 200, body: null as any, headers: {} as Record<string, unknown>, setHeader(name: string, value: unknown) { this.headers[name] = value; }, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; }, end() { return this; } });
const req = (body: any = { action: 'insert', payload: { title: 'Synthetic content', type: 'article' } }, method = 'POST') => ({ method, headers: { authorization: 'Bearer synthetic', origin: 'https://localhost' }, body });
beforeEach(() => { state.platform = 'web'; state.user = null; state.calls = []; state.authThrow = false; state.writeError = false; state.missing = false; state.rate = true; vi.stubEnv('SUPABASE_URL', 'https://synthetic.supabase.co'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-only'); vi.stubEnv('CONTENT_ADMIN_USER_IDS', ''); vi.stubEnv('VITE_BACKEND_URL', ''); });
afterEach(() => vi.unstubAllEnvs());

describe('actual API destinations', () => {
  it.each(['ios', 'android'])('routes every mobile API to the hosted backend for %s', platform => { state.platform = platform; expect(apiEndpoint('/api/gemini')).toBe('https://healthchain360.com/api/gemini'); expect(apiEndpoint('/api/create-order')).toBe('https://healthchain360.com/api/create-order'); });
  it('keeps browser APIs on the page origin and honors configured HTTPS backends', () => { expect(apiEndpoint('/api/gemini')).toBe('/api/gemini'); expect(resolveBackendBase(' https://healthchain360.com/// ', true)).toBe('https://healthchain360.com'); });
  it('rejects unsafe paths, credentials and insecure mobile configuration', () => { expect(() => apiEndpoint('//attacker.test/api/gemini')).toThrow(); expect(() => resolveBackendBase('https://user:pass@example.test', false)).toThrow(); expect(() => resolveBackendBase('http://example.test', true)).toThrow(); });
  it('allows the native API destination in both shipped CSP definitions', () => { for (const path of ['index.html', 'vercel.json']) { const text = readFileSync(path, 'utf8'); expect(text).toContain("connect-src 'self' https://healthchain360.com https://www.healthchain360.com"); } });
});

describe('privileged content access', () => {
  it('rejects ordinary users and forged user_metadata before accessing tables', async () => { state.user = { id: 'ordinary', user_metadata: { role: 'admin', healthchain_admin: true } }; const res = response(); await adminHandler(req(), res); expect(res.statusCode).toBe(403); expect(state.calls).toEqual([]); });
  it('requires a valid authenticated user', async () => { const res = response(); await adminHandler(req(), res); expect(res.statusCode).toBe(401); expect(state.calls).toEqual([]); });
  it('accepts only server-controlled permissions or an explicit server allowlist', () => { expect(hasContentAdminAccess({ id: 'admin', app_metadata: { healthchain_admin: true } })).toBe(true); vi.stubEnv('CONTENT_ADMIN_USER_IDS', 'owner-a, owner-b'); expect(hasContentAdminAccess({ id: 'owner-b' })).toBe(true); expect(hasContentAdminAccess({ id: 'outsider' })).toBe(false); });
  it('rejects arbitrary table selection even for administrators', async () => { state.user = { id: 'admin', app_metadata: { role: 'admin' } }; const res = response(); await adminHandler(req({ action: 'update', table: 'profiles', payload: { id: '00000000-0000-0000-0000-000000000001', is_pro: true } }), res); expect(res.statusCode).toBe(400); expect(state.calls).toEqual([]); });
  it('loads active and inactive content through the authorized backend', async () => { state.user = { id: 'admin', app_metadata: { role: 'admin' } }; const res = response(); await adminHandler(req(undefined, 'GET'), res); expect(res.statusCode).toBe(200); expect(state.calls.sort()).toEqual(['fitness_categories', 'fitness_content']); expect(res.headers['Access-Control-Allow-Origin']).toBe('https://localhost'); });
  it('does not claim a nonexistent update succeeded', async () => { state.user = { id: 'admin', app_metadata: { role: 'admin' } }; state.missing = true; const res = response(); await adminHandler(req({ action: 'update', payload: { id: '00000000-0000-0000-0000-000000000001', title: 'Changed' } }), res); expect(res.statusCode).toBe(404); });
  it('reports auth and write outages as recoverable failures', async () => { state.authThrow = true; const auth = response(); await adminHandler(req(), auth); expect(auth.statusCode).toBe(503); state.authThrow = false; state.user = { id: 'admin', app_metadata: { role: 'admin' } }; state.writeError = true; const write = response(); await adminHandler(req(), write); expect(write.statusCode).toBe(503); });
  it('rejects dangerous or oversized content images', () => { expect(() => decodeContentImage({ mimeType: 'image/svg+xml', data: 'PHN2Zz4=' })).toThrow(); expect(() => decodeContentImage({ mimeType: 'image/png', data: Buffer.from('not a PNG').toString('base64') })).toThrow(); });
  it('creates a missing content bucket and returns the authorized image URL', async () => {
    state.user = { id: 'admin', app_metadata: { role: 'admin' } }; state.bucketMissing = true;
    const res = response(); await adminHandler(req({ action: 'upload', payload: { mimeType: 'image/jpeg', data: Buffer.from([255, 216, 255, 0]).toString('base64') } }), res);
    expect(res.statusCode).toBe(200); expect(res.body.url).toMatch(/\/covers\/[0-9a-f-]+\.jpg$/);
    expect(state.calls).toEqual(['create-public-content-bucket', 'upload-content-image']); state.bucketMissing = false;
  });
});

describe('provider result integrity across operations', () => {
  it.each([{}, { candidates: [] }, { candidates: [{ content: { parts: [{ text: '   ' }] } }] }, { candidates: [{ content: { parts: [{ thought: true, text: 'private thought' }] } }] }])('rejects unusable provider output', data => { expect(inspectModelOutput(data).valid).toBe(false); });
  it('rejects truncation and malformed structured output', () => { expect(inspectModelOutput({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'cut off' }] } }] }).valid).toBe(false); expect(inspectModelOutput({ candidates: [{ content: { parts: [{ text: '{broken' }] } }] }, true).valid).toBe(false); });
  it('joins answer parts while excluding model thought parts', () => { expect(inspectModelOutput({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'private' }, { text: 'First ' }, { text: 'second.' }] } }] })).toEqual({ valid: true, text: 'First second.' }); });
});
