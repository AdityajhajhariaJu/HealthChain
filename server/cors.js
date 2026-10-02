import { trustedOrigin } from '../shared/http-origins.js';

/** Sensitive endpoints keep exact origins; public endpoints may supply their existing policy. */
export function setCors(
  req,
  res,
  {
    methods = 'POST, OPTIONS',
    headers = 'Content-Type, Authorization',
    accepts = trustedOrigin,
  } = {}
) {
  const origin = req.headers?.origin;
  if (accepts(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', headers);
}
