import { createHmac, timingSafeEqual } from 'node:crypto';
import regions from '../shared/gemini-regions.json' with { type: 'json' };
import { trustedOrigin } from '../shared/http-origins.js';
import { checkRateLimit } from './rate-limit.js';

const supported = new Set(regions.countryCodes);
export const REGION_PROOF_HEADER = 'x-hc-region-proof';
const validRequestId = (value) =>
  typeof value === 'string' && /^[a-zA-Z0-9._:-]{8,120}$/.test(value);

export function issueRegionProof(country, requestId, secret, now = Date.now(), clientIp = '') {
  if (
    !supported.has(country) ||
    !validRequestId(requestId) ||
    typeof secret !== 'string' ||
    secret.length < 32
  )
    return null;
  const principal = createHmac('sha256', secret)
    .update('region-client:' + clientIp)
    .digest('hex');
  const payload = Buffer.from(
    JSON.stringify({ country, requestId, principal, expires: Math.floor(now / 1000) + 120 })
  ).toString('base64url');
  return payload + '.' + createHmac('sha256', secret).update(payload).digest('base64url');
}

export function verifyRegionProof(proof, requestId, secret, now = Date.now()) {
  return Boolean(readRegionProof(proof, requestId, secret, now));
}

export function readRegionProof(proof, requestId, secret, now = Date.now()) {
  if (
    typeof proof !== 'string' ||
    proof.length > 1024 ||
    !validRequestId(requestId) ||
    typeof secret !== 'string' ||
    secret.length < 32
  )
    return false;
  try {
    const parts = proof.split('.');
    if (parts.length !== 2) return false;
    const expected = createHmac('sha256', secret).update(parts[0]).digest();
    const supplied = Buffer.from(parts[1], 'base64url');
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
    const claims = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const seconds = Math.floor(now / 1000);
    return supported.has(claims.country) &&
      claims.requestId === requestId &&
      /^[a-f0-9]{64}$/.test(claims.principal) &&
      Number.isInteger(claims.expires) &&
      claims.expires > seconds &&
      claims.expires <= seconds + 120
      ? claims
      : false;
  } catch {
    return false;
  }
}

// This endpoint receives an opaque request ID only. Health input and account
// tokens never accompany it. Vercel supplies the country header at its ingress.
export async function regionProofHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
  const origin = req.headers?.origin;
  if (trustedOrigin(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  if (origin && !trustedOrigin(origin))
    return res.status(403).json({ error: 'Origin is not allowed.' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const country =
    process.env.VERCEL === '1'
      ? req.headers?.['x-vercel-ip-country']
      : process.env.NODE_ENV !== 'production'
        ? process.env.LOCAL_AI_COUNTRY
        : undefined;
  if (!supported.has(country))
    return res
      .status(403)
      .json({
        code: 'AI_REGION_UNAVAILABLE',
        error:
          'AI features are unavailable in your current region. Your saved records remain available.',
      });
  const clientIp =
    process.env.VERCEL === '1' ? req.headers?.['x-vercel-forwarded-for'] : 'local-development';
  if (typeof clientIp !== 'string' || !clientIp)
    return res
      .status(503)
      .json({
        code: 'AI_REGION_CHECK_UNAVAILABLE',
        error: 'AI region verification is temporarily unavailable.',
      });
  const rateRequest = {
    ...req,
    headers: { ...req.headers, 'x-real-ip': clientIp, 'x-forwarded-for': clientIp },
  };
  if (!(await checkRateLimit(rateRequest, 60, 60000)))
    return res.status(429).json({ error: 'Too many region checks. Please retry shortly.' });
  const proof = issueRegionProof(
    country,
    req.query?.requestId,
    process.env.AI_REGION_SIGNING_KEY,
    Date.now(),
    clientIp
  );
  if (!proof)
    return res
      .status(503)
      .json({
        code: 'AI_REGION_CHECK_UNAVAILABLE',
        error: 'AI region verification is temporarily unavailable. Please try again.',
      });
  return res.status(200).json({ proof });
}
