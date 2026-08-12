import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      user_id,
      amount 
    } = req.body;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return res.status(500).json({ error: 'Supabase keys are missing on the server' });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ error: 'Razorpay keys are missing on the server' });
    }

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid Payment Signature' });
    }

    // Signature is valid. Payment is authentic!
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Insert into payments table
    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        user_id,
        razorpay_order_id,
        razorpay_payment_id,
        amount,
        status: 'paid'
      });

    if (insertError) {
      console.error("DB Insert Error:", insertError);
      return res.status(500).json({ error: 'Payment verified, but failed to log in database', details: insertError });
    }

    // 2. Update user's profile to PRO (add 30 days)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_pro: true,
        pro_expires_at: expiryDate.toISOString()
      })
      .eq('id', user_id);

    if (updateError) {
      console.error("Profile Update Error:", updateError);
      return res.status(500).json({ error: 'Payment verified, but failed to update profile', details: updateError });
    }

    res.status(200).json({ success: true, message: 'Payment verified and Pro status activated' });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
