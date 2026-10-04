import { createClient } from '@supabase/supabase-js';
import { MEASUREMENT_VERSION, validMetric } from '../shared/product-metrics.js';
import { trustedOrigin } from '../shared/http-origins.js';
import { setCors } from '../server/cors.js';
import { checkRateLimit } from '../server/rate-limit.js';
import { hasContentAdminAccess } from './admin-content.js';

const acceptsOrigin = origin => trustedOrigin(origin) || ['VERCEL_URL', 'VERCEL_BRANCH_URL']
  .some(key => process.env[key] && origin === `https://${process.env[key]}`);
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  setCors(req, res, { methods: 'GET, POST, OPTIONS', headers: 'Content-Type, Authorization, X-HC-Measurement-Consent', accepts: acceptsOrigin });
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'method_not_allowed' });
  if (req.headers.origin && !acceptsOrigin(req.headers.origin)) return res.status(403).json({ error: 'origin_not_allowed' });
  let metric;
  if (req.method === 'POST') {
    if (!acceptsOrigin(req.headers.origin)) return res.status(403).json({ error: 'origin_required' });
    if (req.headers['sec-gpc'] === '1') return res.status(204).end();
    if (req.headers['x-hc-measurement-consent'] !== MEASUREMENT_VERSION) return res.status(428).json({ error: 'measurement_permission_required' });
    if (Number(req.headers['content-length'] || 0) > 512) return res.status(413).json({ error: 'event_too_large' });
    try { metric = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { return res.status(400).json({ error: 'invalid_event' }); }
    if (!validMetric(metric)) return res.status(400).json({ error: 'invalid_event' });
    if (!(await checkRateLimit(req, 60, 60000))) return res.status(429).json({ error: 'rate_limited' });
  }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'measurement_unavailable' });
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(5000) }) } });
  try {
    if (req.method === 'POST') {
      const { error } = await client.rpc('healthchain_count_product_metric', {
        p_event: metric.event, p_dimension: metric.dimension, p_platform: metric.platform,
      });
      return error ? res.status(503).json({ error: 'measurement_unavailable' }) : res.status(204).end();
    }
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) return res.status(401).json({ error: 'sign_in_required' });
    if (!(await checkRateLimit(req, 30, 60000))) return res.status(429).json({ error: 'rate_limited' });
    const { data, error } = await client.auth.getUser(authorization.slice(7));
    if (error || !data?.user) return res.status(401).json({ error: 'invalid_session' });
    if (!hasContentAdminAccess(data.user)) return res.status(403).json({ error: 'administrator_required' });
    if (!(await checkRateLimit(req, 20, 60000, `product-report:${data.user.id}`))) return res.status(429).json({ error: 'rate_limited' });
    const days = Number(req.query?.days || 30);
    if (![7, 30, 90].includes(days)) return res.status(400).json({ error: 'invalid_period' });
    const result = await client.rpc('healthchain_product_metric_report', { p_days: days });
    return result.error ? res.status(503).json({ error: 'measurement_unavailable' }) : res.status(200).json({ days, rows: result.data || [] });
  } catch { return res.status(503).json({ error: 'measurement_unavailable' }); }
}
