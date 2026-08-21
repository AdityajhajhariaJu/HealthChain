import { checkRateLimit } from './utils/rate-limit.js';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = [
  'https://www.healthchain360.com',
  'https://healthchain-live.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost'
];

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate Limiting: Max 10 requests per minute per IP
  if (!checkRateLimit(req, 10, 60000)) {
    return res.status(429).json({ error: 'Too many requests. Please wait 60 seconds before trying again.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'Server configuration missing' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    }

    const token = authHeader.substring(7);
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Validate the token to get the calling user's ID
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user?.id) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }

    const userId = user.id;

    // Delete application data in one database transaction. The function is
    // deliberately unavailable to client roles and must be installed by the
    // account-deletion migration; fail closed if the deployment is incomplete.
    const { error: dataDeleteError } = await supabaseClient.rpc('delete_healthchain_user_data', {
      p_user_id: userId,
    });
    if (dataDeleteError) {
      console.error('HealthChain data deletion transaction failed:', dataDeleteError);
      return res.status(503).json({ error: 'Account deletion is temporarily unavailable. Please contact support.' });
    }

    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(`Failed deleting auth identity: ${deleteError.message}`);

    return res.status(200).json({ success: true, message: 'Account and user-owned HealthChain data permanently deleted.' });
  } catch (error) {
    console.error("Delete account error:", error);
    return res.status(500).json({ error: 'Account deletion could not be completed. Please contact support.' });
  }
}
