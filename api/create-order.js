import { checkRateLimit } from './utils/rate-limit.js';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_PLANS = {
  pro_30_days: {
    amount: 49900, // â‚¹499.00 in paise
    currency: 'INR',
    description: 'Pro Access (30 Days)',
    type: 'subscription'
  },
  pro_90_days: {
    amount: 89900,
    currency: 'INR',
    description: 'Pro Access (90 Days)',
    type: 'subscription'
  },
  topup_ava: { amount: 9900, currency: 'INR', description: 'Ava Health Buddy Top-up', type: 'topup', feature: 'ava_replies', quantity: 10 },
  topup_quick_consult: { amount: 12900, currency: 'INR', description: 'Quick Consult Top-up', type: 'topup', feature: 'quick_consult', quantity: 1 },
  topup_deep_collab: { amount: 14900, currency: 'INR', description: 'Deep Collab Top-up', type: 'topup', feature: 'deep_collab', quantity: 1 },
  topup_jarvis: { amount: 16900, currency: 'INR', description: 'Jarvis Top-up', type: 'topup', feature: 'jarvis', quantity: 1 },
  topup_pharmacy_hub: { amount: 9900, currency: 'INR', description: 'Pharmacy Hub Top-up', type: 'topup', feature: 'pharmacy_hub', quantity: 30 },
  topup_lab_report: { amount: 9900, currency: 'INR', description: 'Lab Report Analyzer Top-up', type: 'topup', feature: 'lab_report', quantity: 2 }
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

  // 1. Rate Limiting: Max 10 requests per minute per IP
  if (!checkRateLimit(req, 10, 60000)) {
    return res.status(429).json({ error: 'Too many requests. Please wait 60 seconds before trying again.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!authHeader?.startsWith('Bearer ') || !supabaseUrl || !supabaseKey) {
      return res.status(401).json({ error: 'Authentication required to create an order.' });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
    if (!user) return res.status(401).json({ error: 'Invalid authentication session.' });
    const { planId, plan_id } = req.body || {};
    const resolvedPlanId = planId || plan_id || 'pro_30_days';
    const plan = ALLOWED_PLANS[resolvedPlanId];

    if (!plan) {
      return res.status(400).json({ error: 'Invalid or unsupported subscription plan.' });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Payment gateway configuration is missing on the server.' });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: plan.amount, // strictly use server-enforced amount
      currency: plan.currency,
      receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      notes: {
        plan_id: resolvedPlanId,
        user_id: user.id
      }
    };

    const order = await instance.orders.create(options);
    
    return res.status(200).json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
      plan_id
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return res.status(502).json({ error: 'Razorpay Error: ' + (error.error?.description || error.message || 'Unknown error') });
  }
}

