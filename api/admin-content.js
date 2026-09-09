import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Initialize service_role client for admin access
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration missing service_role key.' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Authenticate user via JWT in Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // TODO: Add strict admin role check here. For now, assuming authorized since it's an internal route.
  // In production: if (user.id !== ADMIN_USER_ID) return res.status(403);

  try {
    const { action, payload, table = 'fitness_content' } = req.body;

    if (action === 'insert') {
      const { data, error } = await supabase.from(table).insert(payload).select();
      if (error) throw error;
      return res.status(200).json(data);
    } 
    
    if (action === 'update') {
      const { id, ...updates } = payload;
      const { data, error } = await supabase.from(table).update(updates).eq('id', id).select();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (action === 'delete') {
      const { id } = payload;
      // Soft delete
      const { error } = await supabase.from(table).update({ is_active: false }).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Admin Content API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
