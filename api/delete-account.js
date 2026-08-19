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
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; 

export default async function handler(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

    // 1. Wipe Health Data (Profiles, Cases)
    // We execute these deletes sequentially to ensure no orphaned sensitive data
    await supabaseClient.from('cases').delete().eq('user_id', userId);
    await supabaseClient.from('profiles').delete().eq('id', userId);

    // 2. Anonymize Auth Identity (Hard Deletion Equivalent)
    // We scramble the email and password so the original email is freed up for reuse.
    // The payment history remains in the DB tied to this anonymized UUID.
    const ghostEmail = `deleted_${Date.now()}_${Math.random().toString(36).substring(2)}@healthchain.local`;
    const ghostPassword = `deleted_${crypto.randomUUID()}`;

    const { error: scrambleError } = await supabaseClient.auth.admin.updateUserById(userId, {
      email: ghostEmail,
      password: ghostPassword,
      user_metadata: { deleted: true },
      app_metadata: { deleted: true }
    });

    if (scrambleError) {
      console.error("Identity Scramble Error:", scrambleError);
      return res.status(500).json({ error: 'Failed to fully anonymize identity.', details: scrambleError.message });
    }

    return res.status(200).json({ success: true, message: 'Account permanently deleted and identity anonymized.' });
  } catch (error) {
    console.error("Delete account error:", error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
