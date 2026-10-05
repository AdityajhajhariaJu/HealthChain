import { readRegionProof, REGION_PROOF_HEADER } from './ai-region.js';
import { trustedOrigin } from '../shared/http-origins.js';

const corsHeaders = (origin) => ({
  'Cache-Control': 'no-store',
  Vary: 'Origin',
  ...(trustedOrigin(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, apikey, X-HC-Request-Id, X-HC-Operation, X-HC-AI-Consent, X-HC-Region-Proof',
});

// Reuse the reviewed handlers, including their authentication, owner checks,
// consent, quotas, idempotency, refunds and provider-output validation.
export function createHealthEdgeHandler(handlers, signingKey) {
  return async function (request) {
    const url = new URL(request.url),
      origin = request.headers.get('origin');
    const headers = new Headers(corsHeaders(origin));
    const fail = (status, error, code) =>
      Response.json({ error, ...(code ? { code } : {}) }, { status, headers });
    if (origin && !trustedOrigin(origin)) return fail(403, 'Origin is not allowed.');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const route = url.pathname.match(/\/healthchain-health(\/api\/[a-z-]+)$/)?.[1];
    const handler = handlers[route];
    if (!handler) return fail(404, 'Unknown health service route.');
    if (!['GET', 'POST'].includes(request.method)) return fail(405, 'Method not allowed.');
    const regionProof =
      route === '/api/gemini' && request.method === 'POST'
        ? readRegionProof(
            request.headers.get(REGION_PROOF_HEADER),
            request.headers.get('x-hc-request-id'),
            signingKey
          )
        : null;
    if (route === '/api/gemini' && request.method === 'POST' && !regionProof)
      return fail(
        403,
        'AI region verification is required. Please try again.',
        'AI_REGION_CHECK_REQUIRED'
      );
    let body;
    if (request.method === 'POST') {
      const limit = route === '/api/gemini' ? 4194304 : 10000;
      if (Number(request.headers.get('content-length')) > limit)
        return fail(413, 'Request is too large.');
      const reader = request.body?.getReader();
      const chunks = [];
      let size = 0;
      if (reader) {
        try {
          while (true) {
            const item = await reader.read();
            if (item.done) break;
            size += item.value.byteLength;
            if (size > limit) {
              await reader.cancel();
              return fail(413, 'Request is too large.');
            }
            chunks.push(item.value);
          }
        } catch {
          return fail(400, 'Request could not be read.');
        }
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      try {
        body = JSON.parse(new TextDecoder().decode(bytes) || '{}');
      } catch {
        return fail(400, 'Invalid JSON request.');
      }
    }
    const req = {
      method: request.method,
      url: route + url.search,
      query: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(request.headers),
      body,
    };
    if (regionProof) {
      // Ignore client-supplied forwarding headers. The rate principal derives
      // from Vercel's observed address, signed before any health input is sent.
      req.headers['x-real-ip'] = regionProof.principal;
      req.headers['x-forwarded-for'] = regionProof.principal;
    }
    let status = 200,
      responseBody = null;
    const res = {
      setHeader(name, value) {
        headers.set(name, String(value));
        return this;
      },
      status(code) {
        status = code;
        return this;
      },
      json(value) {
        headers.set('Content-Type', 'application/json');
        responseBody = JSON.stringify(value);
        return this;
      },
      end(value) {
        responseBody = value ?? null;
        return this;
      },
    };
    try {
      await handler(req, res);
    } catch {
      return fail(503, 'Health processing is temporarily unavailable.');
    }
    // Node handlers have a narrower CORS list; always preserve the proof header.
    headers.set(
      'Access-Control-Allow-Headers',
      corsHeaders(origin)['Access-Control-Allow-Headers']
    );
    return new Response([204, 205, 304].includes(status) ? null : responseBody, {
      status,
      headers,
    });
  };
}
