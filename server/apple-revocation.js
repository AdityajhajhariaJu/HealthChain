import { createPublicKey, sign, verify } from 'node:crypto';

const clientId = 'com.healthchain.app';
const appleOrigin = 'https://appleid.apple.com';
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');

export function appleIdentity(user) {
  const identity = user.identities?.find(item => item.provider === 'apple');
  return identity?.identity_data?.sub || identity?.provider_id || identity?.id || null;
}

function clientSecret() {
  const team = process.env.APPLE_SIGN_IN_TEAM_ID;
  const keyId = process.env.APPLE_SIGN_IN_KEY_ID;
  const privateKey = process.env.APPLE_SIGN_IN_PRIVATE_KEY;
  if (!team || !keyId || !privateKey) throw new Error('Apple revocation is not configured');
  const now = Math.floor(Date.now() / 1000);
  const input = encode({ alg: 'ES256', kid: keyId }) + '.' + encode({
    iss: team, iat: now, exp: now + 300, aud: appleOrigin, sub: clientId,
  });
  return input + '.' + sign('sha256', Buffer.from(input), {
    key: privateKey.replace(/\\n/g, '\n'), dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
}

async function appleRequest(path, form) {
  return fetch(appleOrigin + path, { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form), signal: AbortSignal.timeout(5000),
  });
}

// A fresh native authorization code avoids retaining Apple refresh tokens.
// Missing/unavailable Apple credentials must not prevent HealthChain erasure:
// Apple documents a manual revocation route for that situation (TN3194).
export async function revokeAppleAccess(user, authorizationCode) {
  const subject = appleIdentity(user);
  if (!subject) return { required: Boolean(user.identities?.some(item => item.provider === 'apple')), revoked: false };
  if (typeof authorizationCode !== 'string' || !authorizationCode || authorizationCode.length > 4096)
    return { required: true, revoked: false };
  try {
    const secret = clientSecret();
    const response = await appleRequest('/auth/token', {
      client_id: clientId, client_secret: secret, code: authorizationCode, grant_type: 'authorization_code',
    });
    if (!response.ok) throw new Error('Apple code exchange unavailable');
    const tokens = await response.json();
    const parts = typeof tokens.id_token === 'string' ? tokens.id_token.split('.') : [];
    if (parts.length !== 3 || tokens.id_token.length > 16000) throw new Error('Invalid Apple identity');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    const keysResponse = await fetch(appleOrigin + '/auth/keys', { signal: AbortSignal.timeout(5000) });
    if (!keysResponse.ok) throw new Error('Apple verification unavailable');
    const keys = await keysResponse.json();
    const key = keys.keys?.find(item => item.kid === header.kid && item.kty === 'RSA' && item.alg === 'RS256');
    if (header.alg !== 'RS256' || !key || claims.iss !== appleOrigin || claims.aud !== clientId
      || claims.sub !== subject || !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000
      || !verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), createPublicKey({ key, format: 'jwk' }), Buffer.from(parts[2], 'base64url')))
      throw new Error('Apple identity mismatch');
    const token = tokens.refresh_token || tokens.access_token;
    if (typeof token !== 'string' || !token) throw new Error('Apple revocation token unavailable');
    const revoked = await appleRequest('/auth/revoke', { client_id: clientId, client_secret: secret, token,
      token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token' });
    if (!revoked.ok) throw new Error('Apple revocation unavailable');
    return { required: true, revoked: true };
  } catch {
    console.warn('Apple access requires manual revocation after account deletion.');
    return { required: true, revoked: false };
  }
}
