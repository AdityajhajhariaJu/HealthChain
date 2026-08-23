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
const MAX_OUTPUT_TOKENS = 8192;
const SERVER_SAFETY_INSTRUCTION = `
HEALTHCHAIN SAFETY GATE:
- You are an AI health-information and assessment assistant, not a licensed clinician.
- Do not state or imply a diagnosis, definitive cause, prognosis, prescription, dosage, or treatment directive.
- Clearly separate user-reported facts, record-supported facts, possibilities, and unknowns.
- Use uncertainty labels and recommend discussion with a qualified clinician.
- For severe, sudden, rapidly worsening, or emergency symptoms, advise local emergency services or urgent medical care.
- Do not claim that a clinician, specialist, medical board, or evidence source reviewed the case unless that is explicitly supplied in the input.
- Do not invent citations, statistics, validation, costs, timelines, or outcomes.
- Do not reveal hidden reasoning, chain-of-thought, internal scratchpads, or private deliberation. Return concise conclusions and supporting evidence only.
`;

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('healthchain360.com')
  );
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
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

  // Development and production allow guest access up to 5 messages, enforced by local storage on frontend.

  if (!checkRateLimit(req, 40, 60000)) return res.status(429).json({ error: 'Too many requests' });
  if (userId && !checkRateLimit(req, 15, 60000, userId)) {
    return res.status(429).json({ error: 'Too many AI requests for this account. Please try again shortly.' });
  }

  const requestId = req.headers['x-hc-request-id'];
  if (!requestId || !/^[a-zA-Z0-9._:-]{8,120}$/.test(String(requestId))) {
    return res.status(400).json({ error: 'Missing or invalid request id' });
  }
  const operation = String(req.headers['x-hc-operation'] || 'gemini').slice(0, 80);
  const API_KEY = process.env.GEMINI_API_KEY || (process.env.NODE_ENV === 'development' ? process.env.VITE_GEMINI_API_KEY : '');
  if (!API_KEY) {
    return res.status(500).json({ error: 'AI service is temporarily unavailable' });
  }

  // Validate before charging a daily request slot. Invalid or oversized
  // payloads must never consume metered AI capacity.
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > 250000) return res.status(413).json({ error: 'AI request is too large' });
  let bodyPayload;
  try {
    bodyPayload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid AI request body' });
  }
  if (!bodyPayload || typeof bodyPayload !== 'object' || Array.isArray(bodyPayload)) {
    return res.status(400).json({ error: 'Invalid AI request body' });
  }
  if (Buffer.byteLength(JSON.stringify(bodyPayload), 'utf8') > 250000) {
    return res.status(413).json({ error: 'AI request is too large' });
  }

  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminClient = adminKey && supabaseUrl
    ? createClient(supabaseUrl, adminKey)
    : null;
  if (process.env.NODE_ENV !== 'development' && !adminClient) {
    return res.status(503).json({ error: 'AI accounting service is temporarily unavailable' });
  }
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
    if (ledgerError) {
      return res.status(503).json({ error: 'AI request ledger unavailable' });
    }
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_pro, pro_expires_at')
      .eq('id', userId)
      .single();

    const isPro = profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date());
    const dailyLimit = isPro ? 500 : 10;

    const { data: allowed, error: quotaError } = await adminClient.rpc('consume_ai_request', {
      p_user_id: userId,
      p_daily_limit: dailyLimit,
    });
    if (quotaError) {
      await adminClient.from('ai_requests').update({ status: 'failed', error_code: 'quota_unavailable', finished_at: new Date().toISOString() }).eq('request_id', String(requestId));
      return res.status(503).json({ error: 'AI quota service unavailable' });
    }
    if (allowed === false) {
      await adminClient.from('ai_requests').update({ status: 'failed', error_code: 'daily_limit', finished_at: new Date().toISOString() }).eq('request_id', String(requestId));
      return res.status(429).json({ error: 'Daily AI request limit reached. Please try again tomorrow.' });
    }
    if (allowed !== true) {
      await adminClient.from('ai_requests').update({ status: 'failed', error_code: 'quota_invalid', finished_at: new Date().toISOString() }).eq('request_id', String(requestId));
      return res.status(503).json({ error: 'AI quota service unavailable' });
    }

    // --- GHOST MODE METERED QUOTAS ---
    // Track usage natively in the new user_quotas table. Paywall enforcement 
    // is disabled (Ghost Mode) until explicitly toggled on by admin.
    let featureCode = null;
    const opLow = operation.toLowerCase();
    const contentsCount = Array.isArray(bodyPayload.contents) ? bodyPayload.contents.length : 0;
    
    // Bill Ava per message
    if (opLow.includes('ava') || opLow.includes('buddy')) featureCode = 'ava_replies';
    // Bill Quick Consult ONLY on the first message (contents.length === 1) to bill per-session
    else if (opLow.includes('quick') && contentsCount <= 1) featureCode = 'quick_consult';
    // Bill Deep Collab ONLY at triage (specialist_selection) to bill per-session
    else if (opLow.includes('specialist_selection')) featureCode = 'deep_collab';
    // Single-shot tools bill every time
    else if (opLow.includes('jarvis')) featureCode = 'jarvis';
    else if (opLow.includes('lab')) featureCode = 'lab_report';
    else if (opLow.includes('pharmacy')) featureCode = 'pharmacy_hub';

    if (featureCode) {
      try {
        const { data: quotaResult, error: quotaError } = await adminClient.rpc('consume_feature_quota', {
          p_user_id: userId,
          p_feature_name: featureCode
        });
        
        // const ENFORCE_PAYWALLS = false;
        // if (ENFORCE_PAYWALLS) {
        //   if (quotaError) return res.status(503).json({ error: 'Quota service unavailable' });
        //   if (!quotaResult?.allowed) return res.status(402).json({ error: 'Feature quota exceeded' });
        // }
      } catch (e) {
        // Ghost mode ignores tracking failures to prevent service disruption
      }
    }
  }

  // Use the verified gemini-2.5-flash endpoint
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

  try {
    const existingInstruction = Array.isArray(bodyPayload.systemInstruction?.parts)
      ? bodyPayload.systemInstruction.parts
      : [];
    bodyPayload.systemInstruction = {
      ...(bodyPayload.systemInstruction || {}),
      parts: [...existingInstruction, { text: SERVER_SAFETY_INSTRUCTION }],
    };
    const incomingGenerationConfig = bodyPayload.generationConfig && typeof bodyPayload.generationConfig === 'object'
      ? bodyPayload.generationConfig
      : {};
    const requestedOutputTokens = Number(incomingGenerationConfig.maxOutputTokens);
    bodyPayload.generationConfig = {
      ...incomingGenerationConfig,
      thinkingConfig: incomingGenerationConfig.thinkingConfig || { thinkingBudget: 0 },
      maxOutputTokens: Number.isFinite(requestedOutputTokens) && requestedOutputTokens > 0
        ? Math.min(Math.floor(requestedOutputTokens), MAX_OUTPUT_TOKENS)
        : MAX_OUTPUT_TOKENS,
      candidateCount: 1,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API returned an error:', response.status, errorData.slice(0, 1000));
      if (adminClient && userId) {
        await adminClient.from('ai_requests').update({
          status: 'failed',
          error_code: `provider_${response.status}`,
          finished_at: new Date().toISOString(),
        }).eq('request_id', String(requestId));
      }
      return res.status(502).json({ error: 'AI provider request failed' });
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
      if (usage.totalTokenCount) {
        await adminClient.rpc('record_ai_tokens', { p_user_id: userId, p_total_tokens: usage.totalTokenCount });
      }
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



