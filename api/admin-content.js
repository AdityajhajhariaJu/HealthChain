import { createClient } from '@supabase/supabase-js';

import { allowedOrigin } from '../shared/http-origins.js';
import { checkRateLimit } from '../server/rate-limit.js';
import { decodeContentImage } from '../server/content-image.js';
import { randomUUID } from 'node:crypto';

export function hasContentAdminAccess(user) {
  const ids = (process.env.CONTENT_ADMIN_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  return !!user?.id && (user.app_metadata?.healthchain_admin === true || user.app_metadata?.role === 'admin' || ids.includes(user.id));
}

// Vercel Serverless Function
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
  if (allowedOrigin(req.headers?.origin)) res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'method_not_allowed' });

  // Initialize service_role client for admin access
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration missing service_role key.' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Authenticate user via JWT in Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  let user, authError;
  try { const result = await supabase.auth.getUser(token); user = result.data?.user; authError = result.error; }
  catch { return res.status(503).json({ error: 'content_service_unavailable' }); }

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // User-editable metadata and a hidden route never authorize privileged access.
  if (!hasContentAdminAccess(user)) return res.status(403).json({ error: 'content_admin_required' });
  if (!(await checkRateLimit(req, 30, 60000, `content-admin:${user.id}`))) return res.status(429).json({ error: 'rate_limited' });

  try {
    if (req.method === 'GET') {
      const [content, categories] = await Promise.all([
        supabase.from('fitness_content').select('*').order('created_at', { ascending: false }),
        supabase.from('fitness_categories').select('*').order('sort_order'),
      ]);
      if (content.error || categories.error) throw new Error('content_read_failed');
      return res.status(200).json({ content: content.data || [], categories: categories.data || [] });
    }
    const { action, payload, table = 'fitness_content' } = req.body || {};
    if (action === 'upload' && table === 'fitness_content') {
      let image;
      try { image = decodeContentImage(payload); } catch { return res.status(400).json({ error: 'Choose a JPEG, PNG or WebP image smaller than 2 MB.' }); }
      const bucketId = 'fitness-content';
      const bucket = await supabase.storage.getBucket(bucketId);
      if (bucket.error) {
        if (String(bucket.error.statusCode) !== '404') throw bucket.error;
        const created = await supabase.storage.createBucket(bucketId, { public: true, fileSizeLimit: 2 * 1024 * 1024, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] });
        if (created.error) { const retry = await supabase.storage.getBucket(bucketId); if (retry.error) throw retry.error; }
      }
      const path = `covers/${randomUUID()}.${image.ext}`;
      const uploaded = await supabase.storage.from(bucketId).upload(path, image.bytes, { contentType: image.mime, upsert: false });
      if (uploaded.error) throw uploaded.error;
      return res.status(200).json({ url: supabase.storage.from(bucketId).getPublicUrl(path).data.publicUrl });
    }
    if (table !== 'fitness_content' || !['insert', 'update', 'delete'].includes(action)) return res.status(400).json({ error: 'invalid_action' });
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return res.status(400).json({ error: 'invalid_payload' });
    if (action !== 'insert' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.id || '')) return res.status(400).json({ error: 'invalid_content_id' });

    if (action === 'insert') {
      const { data, error } = await supabase.from(table).insert(payload).select();
      if (error) throw error;
      if (!data?.length) return res.status(404).json({ error: 'content_not_found' });
      return res.status(200).json(data);
    } 
    
    if (action === 'update') {
      const { id, ...updates } = payload;
      const { data, error } = await supabase.from(table).update(updates).eq('id', id).select();
      if (error) throw error;
      if (!data?.length) return res.status(404).json({ error: 'content_not_found' });
      return res.status(200).json(data);
    }

    if (action === 'delete') {
      const { id } = payload;
      // Soft delete
      const { data, error } = await supabase.from(table).update({ is_active: false }).eq('id', id).select('id');
      if (error) throw error;
      if (!data?.length) return res.status(404).json({ error: 'content_not_found' });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Admin Content API Error:', error);
    return res.status(503).json({ error: 'content_service_unavailable' });
  }
}
