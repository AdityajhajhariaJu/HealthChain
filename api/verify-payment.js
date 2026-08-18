import { checkRateLimit } from './utils/rate-limit.js';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_PLANS = {
  pro_30_days: {
    amount: 49900,
    days: 30
  }
};

const ALLOWED_ORIGINS = [
  'https://www.healthchain360.com',
  'https://healthchain-live.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost'
];

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
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
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      plan_id = 'pro_30_days',
      user_id: _clientUserId
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment signature verification parameters.' });
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'Database configuration missing on server.' });
    }

    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpaySecret) {
      return res.status(500).json({ error: 'Payment gateway configuration missing on server.' });
    }

    // 1. Authenticate user from Supabase JWT STRICTLY
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    let effectiveUserId = null;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    }

    // Subscription credit must always belong to the authenticated purchaser, never a client-supplied ID.
    const effectiveUserId = authenticatedUserId;
    if (!effectiveUserId) {
      return res.status(401).json({ error: 'Authentication required to activate Pro subscription.' });
    }
    effectiveUserId = user.id;

    // 2. Timing-safe signature check
    const expectedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(razorpay_signature, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return res.status(400).json({ error: 'Invalid Payment Signature.' });
    }

    // 3. Replay Protection: Ensure razorpay_payment_id was not previously used
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .maybeSingle();

    if (existingPayment) {
      return res.status(400).json({ error: 'This payment has already been processed and credited.' });
    }

    // 4. Server-Side Amount & Status Verification with Razorpay API
    const targetPlan = ALLOWED_PLANS[plan_id];
    if (!targetPlan) return res.status(400).json({ error: 'Invalid or unsupported subscription plan.' });
    let verifiedAmount = targetPlan.amount;

    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const instance = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        const paymentDetails = await instance.payments.fetch(razorpay_payment_id);
        
        if (paymentDetails.order_id !== razorpay_order_id || paymentDetails.amount !== targetPlan.amount || paymentDetails.currency !== 'INR') {
          return res.status(400).json({ error: `Payment amount ₹${paymentDetails.amount / 100} does not match required plan amount ₹${targetPlan.amount / 100}.` });
        }
        verifiedAmount = paymentDetails.amount;
      } catch (rzpErr) {
        console.warn('Razorpay fetch check warning (proceeding if signature matches):', rzpErr.message);
      }

      const orderDetails = await instance.orders.fetch(razorpay_order_id);
      if (orderDetails.notes?.user_id !== effectiveUserId) {
         return res.status(403).json({ error: 'Payment identity mismatch. This order does not belong to your account.' });
      }

      verifiedAmount = paymentDetails.amount;
    } catch (rzpErr) {
      console.error('Razorpay verification failed:', rzpErr);
      return res.status(502).json({ error: 'Failed to verify transaction with payment gateway.', details: rzpErr.message });
    }

    // 5. Log payment record
    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        user_id: effectiveUserId,
        razorpay_order_id,
        razorpay_payment_id,
        amount: verifiedAmount,
        status: 'paid'
      });

    if (insertError) {
      console.warn("DB payment log warning:", insertError);
    }

    // 6. Calculate expiration date and update profile
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + targetPlan.days);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_pro: true,
        pro_expires_at: expiryDate.toISOString()
      })
      .eq('id', effectiveUserId);

    if (updateError) {
      console.error("Profile Update Error:", updateError);
      return res.status(500).json({ error: 'Payment verified, but failed to update profile', details: updateError });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Payment verified and Pro status activated',
      expires_at: expiryDate.toISOString()
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
