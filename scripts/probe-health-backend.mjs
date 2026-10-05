import assert from 'node:assert/strict';

// Safe activation probes: no account token, customer input, purchase or AI call.
const base = 'https://cikikocfvfshloqwnyfe.supabase.co/functions/v1/healthchain-health';
const probes = [
  { name: 'AI GET refuses generation', path: '/api/gemini', status: 405 },
  {
    name: 'AI requires regional proof',
    path: '/api/gemini',
    options: {
      method: 'POST',
      body: JSON.stringify({ probe: true }),
      headers: { 'Content-Type': 'application/json' },
    },
    status: 403,
    code: 'AI_REGION_CHECK_REQUIRED',
  },
  {
    name: 'Allowed-origin preflight',
    path: '/api/gemini',
    options: { method: 'OPTIONS', headers: { origin: 'https://healthchain360.com' } },
    status: 204,
    cors: 'https://healthchain360.com',
  },
  {
    name: 'Untrusted origin rejected',
    path: '/api/gemini',
    options: { headers: { origin: 'https://attacker.example' } },
    status: 403,
  },
  {
    name: 'Deletion requires an account',
    path: '/api/delete-account',
    options: { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } },
    status: 401,
  },
];
const outcomes = await Promise.allSettled(
  probes.map(async (probe) => {
    const response = await fetch(base + probe.path, {
      ...probe.options,
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(response.status, probe.status, probe.name);
    if (probe.code) assert.equal((await response.json()).code, probe.code);
    if (probe.cors) assert.equal(response.headers.get('access-control-allow-origin'), probe.cors);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    console.log(`PASS ${probe.name}`);
  })
);
for (const outcome of outcomes)
  if (outcome.status === 'rejected') {
    console.error(`FAIL ${outcome.reason.message}`);
    process.exitCode = 1;
  }
