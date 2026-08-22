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
  'https://healthchain360.com',
  'https://healthchain-live.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost'
];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!checkRateLimit(req, 10, 60000)) {
    return res.status(429).json({ error: 'Too many requests. Please wait 60 seconds before trying again.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      plan_id = 'pro_30_days'
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

    // 1. Authenticate user from Supabase JWT
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user?.id) {
      return res.status(401).json({ error: 'Authentication required to activate Pro subscription.' });
    }

    const effectiveUserId = user.id;

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

    // 3. Server-Side Amount Verification
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
          return res.status(400).json({ error: 'Payment amount does not match required plan amount.' });
        }
        verifiedAmount = paymentDetails.amount;

        const orderDetails = await instance.orders.fetch(razorpay_order_id);
        if (
          orderDetails.amount !== targetPlan.amount ||
          orderDetails.currency !== 'INR' ||
          orderDetails.notes?.plan_id !== plan_id
        ) {
          return res.status(400).json({ error: 'Payment order does not match the selected plan.' });
        }
        // Orders created by this application always carry the authenticated
        // account binding. Missing metadata is not treated as trustworthy.
        if (orderDetails.notes?.user_id !== effectiveUserId) {
          return res.status(403).json({ error: 'Payment identity mismatch. This order does not belong to your account.' });
        }
      } catch (rzpErr) {
        console.error('Razorpay verification failed:', rzpErr);
        return res.status(502).json({ error: 'Payment provider verification is temporarily unavailable.' });
      }
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + targetPlan.days);
    // Payment logging and entitlement activation must happen together. The
    // RPC is installed by 20260821_payment_entitlement.sql; without it we
    // fail closed instead of accepting money with an unrecoverable entitlement.
    const { error: entitlementError } = await supabase.rpc('activate_payment_entitlement', {
      p_user_id: effectiveUserId,
      p_order_id: razorpay_order_id,
      p_payment_id: razorpay_payment_id,
      p_amount: verifiedAmount,
      p_expires_at: expiryDate.toISOString(),
    });

    if (entitlementError) {
      console.error('Payment entitlement transaction failed:', entitlementError);
      return res.status(503).json({ error: 'Payment verified, but entitlement activation is temporarily unavailable. Please contact support before retrying.' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Payment verified and Pro status activated',
      expires_at: expiryDate.toISOString()
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ error: 'Payment verification could not be completed.' });
  }
}

