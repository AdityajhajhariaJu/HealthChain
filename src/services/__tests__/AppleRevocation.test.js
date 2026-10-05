import { generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { revokeAppleAccess } from '../../../server/apple-revocation.js';

const ec = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
const owner = { identities: [{ provider: 'apple', identity_data: { sub: 'synthetic-apple-owner' } }] };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function identity(claims = {}) {
  const input = encode({ alg: 'RS256', kid: 'synthetic-kid' }) + '.' + encode({
    iss: 'https://appleid.apple.com', aud: 'com.healthchain.app', sub: 'synthetic-apple-owner',
    exp: Math.floor(Date.now() / 1000) + 60, ...claims,
  });
  return input + '.' + sign('RSA-SHA256', Buffer.from(input), rsa.privateKey).toString('base64url');
}
let fetchMock;
beforeEach(() => {
  vi.stubEnv('APPLE_SIGN_IN_TEAM_ID', 'synthetic-team'); vi.stubEnv('APPLE_SIGN_IN_KEY_ID', 'synthetic-key');
  vi.stubEnv('APPLE_SIGN_IN_PRIVATE_KEY', ec.privateKey.export({ type: 'pkcs8', format: 'pem' }));
  fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id_token: identity(), refresh_token: 'synthetic-refresh' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ keys: [{ ...rsa.publicKey.export({ format: 'jwk' }), kid: 'synthetic-kid', alg: 'RS256' }] }) })
    .mockResolvedValueOnce({ ok: true });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it('verifies Apple signature, bundle and authenticated identity before revoking', async () => {
  expect(await revokeAppleAccess(owner, 'synthetic-code')).toEqual({ required: true, revoked: true });
  expect(fetchMock.mock.calls[2][0]).toBe('https://appleid.apple.com/auth/revoke');
  expect(fetchMock.mock.calls[2][1].body.get('token')).toBe('synthetic-refresh');
  expect(fetchMock.mock.calls[2][1].body.get('token_type_hint')).toBe('refresh_token');
});
it('keeps account deletion possible without an Apple token or provider configuration', async () => {
  expect(await revokeAppleAccess(owner)).toEqual({ required: true, revoked: false });
  expect(await revokeAppleAccess({ identities: [] }, 'synthetic-code')).toEqual({ required: false, revoked: false });
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([{ sub: 'other-owner' }, { aud: 'other-app' }, { exp: 1 }])('does not revoke a token for incorrect or expired claims: %o', async claims => {
  const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
  fetchMock.mockReset().mockResolvedValueOnce({ ok: true, json: async () => ({ id_token: identity(claims), refresh_token: 'synthetic-refresh' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ keys: [{ ...rsa.publicKey.export({ format: 'jwk' }), kid: 'synthetic-kid', alg: 'RS256' }] }) });
  expect(await revokeAppleAccess(owner, 'synthetic-code')).toEqual({ required: true, revoked: false });
  expect(fetchMock).toHaveBeenCalledTimes(2); expect(log).toHaveBeenCalledWith('Apple access requires manual revocation after account deletion.');
});
it('rejects a forged signature without logging raw credentials', async () => {
  const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
  fetchMock.mockReset().mockResolvedValueOnce({ ok: true, json: async () => ({ id_token: identity().replace(/\.[^.]+$/, '.Zm9yZ2Vk'), refresh_token: 'synthetic-private-token' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ keys: [{ ...rsa.publicKey.export({ format: 'jwk' }), kid: 'synthetic-kid', alg: 'RS256' }] }) });
  expect(await revokeAppleAccess(owner, 'synthetic-code')).toEqual({ required: true, revoked: false });
  expect(fetchMock).toHaveBeenCalledTimes(2); expect(log.mock.calls).toEqual([['Apple access requires manual revocation after account deletion.']]);
});
