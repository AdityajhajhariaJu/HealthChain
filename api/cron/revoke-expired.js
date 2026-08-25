import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'Database configuration missing' });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_pro: false, updated_at: new Date().toISOString() })
      .eq('is_pro', true)
      .not('pro_expires_at', 'is', null)
      .lt('pro_expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Error revoking expired pro status:', error);
      return res.status(500).json({ error: 'Failed to revoke expired profiles' });
    }

    console.log(`Revoked pro status for ${data?.length || 0} profiles`);
    return res.status(200).json({ status: 'ok', revoked_count: data?.length || 0 });
  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
