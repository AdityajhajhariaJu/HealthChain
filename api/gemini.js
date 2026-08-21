import { checkRateLimit } from './utils/rate-limit.js';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = [
  'https://www.healthchain360.com',
  'https://healthchain360.com',
  'https://healthchain-live.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost'
];
const supabaseUrl = process.env.VITE_SUPABASE_URL;

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-HC-Request-Id, X-HC-Operation');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;

  let userId = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
        }
      } catch (e) {
        console.warn('Token validation error:', e);
      }
    }
  }

  // Development can use a local proxy without Supabase, but production AI
  // processing must always be attributable to an authenticated account.
  if (!userId && process.env.NODE_ENV !== 'development') {
    return res.status(401).json({ error: 'Unauthorized request. Valid authentication required.' });
  }

  if (!checkRateLimit(req, 30, 60000)) return res.status(429).json({ error: 'Too many requests' });
  if (userId && !checkRateLimit(req, 12, 60000, userId)) {
    return res.status(429).json({ error: 'Too many AI requests for this account. Please try again shortly.' });
  }

  const requestId = req.headers['x-hc-request-id'];
  if (!requestId || !/^[a-zA-Z0-9._:-]{8,120}$/.test(String(requestId))) {
    return res.status(400).json({ error: 'Missing or invalid request id' });
  }
  const operation = String(req.headers['x-hc-operation'] || 'gemini').slice(0, 80);

  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminClient = adminKey && supabaseUrl
    ? createClient(supabaseUrl, adminKey)
    : null;
  if (adminClient && userId) {
    const { error: ledgerError } = await adminClient.from('ai_requests').insert({
      request_id: String(requestId),
      user_id: userId,
      operation,
      status: 'in_progress',
    });
    if (ledgerError && ledgerError.code === '23505') {
      return res.status(409).json({ error: 'Duplicate AI request rejected' });
    }
    if (ledgerError && !['42P01', 'PGRST205'].includes(ledgerError.code)) {
      return res.status(503).json({ error: 'AI request ledger unavailable' });
    }
  }

  const API_KEY = process.env.GEMINI_API_KEY || (process.env.NODE_ENV === 'development' ? process.env.VITE_GEMINI_API_KEY : '');
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  // Use the verified gemini-2.5-flash endpoint
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

  try {
    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > 250000) return res.status(413).json({ error: 'AI request is too large' });
    const bodyPayload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!bodyPayload || typeof bodyPayload !== 'object') {
      return res.status(400).json({ error: 'Invalid AI request body' });
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API returned an error:', response.status, errorData);
      return res.status(response.status).json({ error: errorData });
    }

    const data = await response.json();
    if (adminClient && userId) {
      const usage = data?.usageMetadata || {};
      await adminClient.from('ai_requests').update({
        status: 'completed',
        input_tokens: usage.promptTokenCount || null,
        output_tokens: usage.candidatesTokenCount || null,
        total_tokens: usage.totalTokenCount || null,
        finished_at: new Date().toISOString(),
      }).eq('request_id', String(requestId));
    }
    return res.status(200).json(data);
  } catch (error) {
    if (adminClient && userId) {
      await adminClient.from('ai_requests').update({
        status: 'failed',
        error_code: error?.code || error?.name || 'provider_error',
        finished_at: new Date().toISOString(),
      }).eq('request_id', String(requestId)).catch(() => {});
    }
    console.error('Gemini API Proxy Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}


