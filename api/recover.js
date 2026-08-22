import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Read all valid payments
  const { data: payments } = await supabase
    .from('payments')
    .select('user_id, entitlement_expires_at')
    .eq('status', 'paid')
    .gt('entitlement_expires_at', new Date().toISOString());
  
  if (!payments || payments.length === 0) return res.json({ success: true, message: 'No lost entitlements found.' });

  let recovered = 0;
  for (const p of payments) {
    const { data: profile } = await supabase.from('profiles').select('is_pro').eq('id', p.user_id).single();
    if (profile && !profile.is_pro) {
      // Set updated_at to future to force client to pull
      const future = new Date(Date.now() + 60000).toISOString();
      await supabase.from('profiles')
        .update({ 
          is_pro: true, 
          pro_expires_at: p.entitlement_expires_at,
          updated_at: future
        })
        .eq('id', p.user_id);
      recovered++;
    }
  }

  res.json({ success: true, message: "Recovered " + recovered + " lost entitlements." });
}
