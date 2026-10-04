import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../server/rate-limit.js';
import { allowedOrigin } from '../shared/http-origins.js';
import { pushConfigured, sendRemotePushTest } from '../server/push-transport.js';
export default async function handler(req, res) {
  const origin = req.headers?.origin;
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Vary', 'Origin');
  if (allowedOrigin(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const bearer = req.headers?.authorization;
  if (!bearer?.startsWith('Bearer ')) return res.status(401).json({ error: 'sign_in_required' });
  const { token, requestId } = req.body || {};
  if (typeof token !== 'string' || !token || token.length > 4096 || !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId || '')) return res.status(400).json({ error: 'invalid_request' });
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(503).json({ error: 'notification_service_unavailable' });
  try {
    const client = createClient(url, key, { global: { headers: { Authorization: bearer } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await client.auth.getUser(bearer.slice(7));
    if (error || !user) return res.status(401).json({ error: 'sign_in_required' });
    const active = await client.rpc('healthchain_current_account_active');
    if (active.error || !active.data) return res.status(403).json({ error: 'account_unavailable' });
    if (!(await checkRateLimit(req, 3, 60000, `push-test:${user.id}`))) { res.setHeader('Retry-After', '60'); return res.status(429).json({ error: 'test_rate_limited' }); }
    const device = await client.from('user_devices').select('platform').eq('user_id', user.id).eq('push_token', token).maybeSingle();
    if (device.error) return res.status(503).json({ error: 'notification_service_unavailable' });
    if (!device.data) return res.status(409).json({ error: 'device_not_registered' });
    if (!pushConfigured(device.data.platform)) return res.status(503).json({ error: 'remote_push_not_configured' });
    const result = await sendRemotePushTest(device.data.platform, token, user.id, requestId);
    if (result.expired) { await client.from('user_devices').delete().eq('user_id', user.id).eq('push_token', token); return res.status(409).json({ error: 'device_registration_expired' }); }
    if (!result.accepted) return res.status(502).json({ error: 'push_provider_rejected' });
    return res.status(202).json({ accepted: true, delivered: false, requestId });
  } catch { return res.status(503).json({ error: 'notification_service_unavailable' }); }
}
