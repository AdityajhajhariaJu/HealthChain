import { checkRateLimit } from './utils/rate-limit.js';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_PLANS = {
  pro_30_days: {
    amount: 49900,
    days: 30,
    type: 'subscription'
  },
  pro_90_days: {
    amount: 89900,
    days: 90,
    type: 'subscription'
  },
  topup_ava: { amount: 9900, type: 'topup', feature: 'ava_replies', quantity: 10 },
  topup_quick_consult: { amount: 12900, type: 'topup', feature: 'quick_consult', quantity: 1 },
  topup_deep_collab: { amount: 14900, type: 'topup', feature: 'deep_collab', quantity: 1 },
  topup_jarvis: { amount: 16900, type: 'topup', feature: 'jarvis', quantity: 1 },
  topup_pharmacy_hub: { amount: 9900, type: 'topup', feature: 'pharmacy_hub', quantity: 30 },
  topup_lab_report: { amount: 9900, type: 'topup', feature: 'lab_report', quantity: 2 }
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
      planId, plan_id
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
    const resolvedPlanId = planId || plan_id || 'pro_30_days';
    const targetPlan = ALLOWED_PLANS[resolvedPlanId];
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
          orderDetails.notes?.plan_id !== resolvedPlanId
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

    let entitlementError = null;
    let finalExpiry = null;

    if (targetPlan.type === 'subscription') {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + targetPlan.days);
      finalExpiry = expiryDate.toISOString();
      
      const { error } = await supabase.rpc('activate_payment_entitlement', {
        p_user_id: effectiveUserId,
        p_order_id: razorpay_order_id,
        p_payment_id: razorpay_payment_id,
        p_amount: verifiedAmount,
        p_expires_at: finalExpiry,
      });
      entitlementError = error;

      if (!error) {
        await supabase.rpc('provision_base_quota', {
          p_user_id: effectiveUserId,
          p_plan_id: resolvedPlanId,
          p_expires_at: finalExpiry
        });
      }
    } else if (targetPlan.type === 'topup') {
      // Record payment safely (idempotent)
      const { error: insertError } = await supabase.from('payments').insert({
        user_id: effectiveUserId,
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        amount: verifiedAmount,
        status: 'paid'
      });
      // 23505 is duplicate key, which means already processed
      if (insertError && insertError.code !== '23505') {
        entitlementError = insertError;
      } else if (!insertError) {
        // Only provision if we successfully inserted (prevent double spend)
        await supabase.rpc('provision_topup', {
          p_user_id: effectiveUserId,
          p_feature_name: targetPlan.feature,
          p_amount: targetPlan.quantity
        });
      }
    }

    if (entitlementError) {
      console.error('Payment entitlement transaction failed:', entitlementError);
      return res.status(503).json({ error: 'Payment verified, but entitlement activation is temporarily unavailable. Please contact support before retrying.' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Payment verified and status updated',
      expires_at: finalExpiry
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ error: 'Payment verification could not be completed.' });
  }
}

