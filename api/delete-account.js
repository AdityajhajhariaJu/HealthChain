import { setCors } from '../server/cors.js';
import { checkRateLimit } from '../server/rate-limit.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate Limiting: Max 10 requests per minute per IP
  if (!(await checkRateLimit(req, 10, 60000))) {
    return res
      .status(429)
      .json({ error: 'Too many requests. Please wait 60 seconds before trying again.' });
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
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user?.id) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }

    const userId = user.id;
    const { error: signOutError } = await supabaseClient.auth.admin.signOut(token, 'global');
    // A retry may carry an unexpired JWT whose refresh session was already revoked.
    // getUser above still verifies the identity; a missing session is already signed out.
    if (signOutError && signOutError.status !== 404)
      return res
        .status(503)
        .json({ error: 'Sessions could not be revoked. Account deletion was stopped; try again.' });

    // Delete application data in one database transaction. The function is
    // deliberately unavailable to client roles and must be installed by the
    // account-deletion migration; fail closed if the deployment is incomplete.
    const { error: dataDeleteError } = await supabaseClient.rpc('delete_healthchain_user_data', {
      p_user_id: userId,
    });
    if (dataDeleteError) {
      console.error('HealthChain data deletion transaction failed:', dataDeleteError);
      return res
        .status(503)
        .json({ error: 'Account deletion is temporarily unavailable. Please contact support.' });
    }

    // Use Storage's supported removal API so the file bytes are erased as well.
    for (let page = 0; page < 1000; page++) {
      const { data: objects, error: listError } = await supabaseClient.rpc(
        'list_healthchain_user_storage',
        { p_user_id: userId }
      );
      if (listError) throw listError;
      if (!objects?.length) break;
      const buckets = new Map();
      for (const object of objects)
        buckets.set(object.bucket_id, [...(buckets.get(object.bucket_id) || []), object.name]);
      for (const [bucket, names] of buckets) {
        const { error } = await supabaseClient.storage.from(bucket).remove(names);
        if (error) throw error;
      }
      if (page === 999) throw new Error('Storage cleanup requires support assistance');
    }

    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(`Failed deleting auth identity: ${deleteError.message}`);

    return res
      .status(200)
      .json({
        success: true,
        message: 'Account and user-owned HealthChain data permanently deleted.',
      });
  } catch (error) {
    console.error('Delete account error:', error);
    return res
      .status(500)
      .json({ error: 'Account deletion could not be completed. Please contact support.' });
  }
}
