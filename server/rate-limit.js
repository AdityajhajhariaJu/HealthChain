import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
// Development can run without a service key; production never falls back to
// process-local counters. Counter keys contain no raw IP address or health data.
const localCounters = new Map();
let serverClient;
let lastConfiguration = '';
const timeoutFetch = (url, options = {}) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(5000) });
export async function checkRateLimit(req, limit = 10, windowMs = 60000, identity) {
  const headers = req.headers || {};
  const forwarded = String(headers['x-real-ip'] || headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.socket?.remoteAddress || 'unknown';
  const route = String(req.url || 'api').split('?')[0].slice(0, 160);
  const principal = identity === 'food-product' ? 'food-product:ip:' + ip : identity || 'ip:' + ip;
  const domain = route + ':' + principal + ':' + limit + ':' + windowMs;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Shared rate limiting is not configured.');
      return false;
    }
    const now = Date.now();
    if (localCounters.size > 3000) {
      for (const [key, record] of localCounters) if (record.expires <= now) localCounters.delete(key);
      if (localCounters.size > 3000) return false;
    }
    const record = localCounters.get(domain);
    if (!record || record.expires <= now) {
      localCounters.set(domain, { count: 1, expires: now + windowMs });
      return true;
    }
    if (record.count >= limit) return false;
    record.count++;
    return true;
  }
  try {
    const signature = createHmac('sha256', serviceKey).update(url).digest('hex');
    if (!serverClient || signature !== lastConfiguration) {
      serverClient = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: timeoutFetch },
      });
      lastConfiguration = signature;
    }
    const key = createHmac('sha256', serviceKey).update(domain).digest('hex');
    const { data, error } = await serverClient.rpc('healthchain_consume_rate_limit', {
      p_key: key, p_limit: limit, p_window_ms: windowMs,
    });
    if (error || typeof data !== 'boolean') {
      console.error('Shared rate limiting is temporarily unavailable.');
      return false;
    }
    return data;
  } catch {
    console.error('Shared rate limiting is temporarily unavailable.');
    return false;
  }
}
