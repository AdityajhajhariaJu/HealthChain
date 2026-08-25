import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => { resolve(body); });
    req.on('error', err => reject(err));
  });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is missing');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // 1. Verify the webhook signature
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    const bodyText = await getRawBody(req);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyText)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(bodyText);
    const event = payload.event;
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'Database configuration missing' });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Handle different events
    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = payload.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const amount = payment.amount; // in paise
      const notes = payment.notes || {};
      const userId = notes.user_id;
      const planId = notes.plan_id;

      if (!userId) {
        console.warn('Webhook payment captured but no user_id in notes');
        return res.status(200).json({ status: 'ignored', reason: 'No user_id in notes' });
      }

      let resolvedPlanId = planId || 'pro_30_days';
      // Basic plan map (mirrored from create-order.js)
      const ALLOWED_PLANS = {
        pro_30_days: { amount: 49900, days: 30, type: 'subscription' },
        pro_90_days: { amount: 89900, days: 90, type: 'subscription' },
        topup_ava: { amount: 9900, type: 'topup', feature: 'ava_replies', quantity: 10 },
        topup_quick_consult: { amount: 12900, type: 'topup', feature: 'quick_consult', quantity: 1 },
        topup_deep_collab: { amount: 14900, type: 'topup', feature: 'deep_collab', quantity: 1 },
        topup_jarvis: { amount: 16900, type: 'topup', feature: 'jarvis', quantity: 1 },
        topup_pharmacy_hub: { amount: 9900, type: 'topup', feature: 'pharmacy_hub', quantity: 30 },
        topup_lab_report: { amount: 9900, type: 'topup', feature: 'lab_report', quantity: 2 }
      };
      
      const targetPlan = ALLOWED_PLANS[resolvedPlanId] || ALLOWED_PLANS.pro_30_days;

      if (targetPlan.type === 'subscription') {
        const { data: currentProfile } = await supabase.from('profiles').select('pro_expires_at').eq('id', userId).single();
        const currentExpiry = currentProfile?.pro_expires_at ? new Date(currentProfile.pro_expires_at) : new Date();
        const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
        baseDate.setDate(baseDate.getDate() + targetPlan.days);
        const finalExpiry = baseDate.toISOString();

        const { error } = await supabase.rpc('activate_payment_entitlement', {
          p_user_id: userId,
          p_order_id: orderId,
          p_payment_id: paymentId,
          p_amount: amount,
          p_expires_at: finalExpiry,
        });

        if (!error) {
          await supabase.rpc('provision_base_quota', {
            p_user_id: userId,
            p_plan_id: resolvedPlanId,
            p_expires_at: finalExpiry
          });
        } else if (error.code === '23505') {
          // Idempotent: already processed
          return res.status(200).json({ status: 'ok', message: 'Already processed' });
        } else {
          console.error('Webhook entitlement error:', error);
          return res.status(500).json({ error: 'Failed to activate entitlement' });
        }
      } else if (targetPlan.type === 'topup') {
        const { error: insertError } = await supabase.from('payments').insert({
          user_id: userId,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          amount: amount,
          status: 'paid'
        });
        
        if (!insertError) {
          await supabase.rpc('provision_topup', {
            p_user_id: userId,
            p_feature_name: targetPlan.feature,
            p_amount: targetPlan.quantity
          });
        } else if (insertError.code === '23505') {
          // Idempotent: already processed
          return res.status(200).json({ status: 'ok', message: 'Already processed' });
        } else {
          console.error('Webhook topup error:', insertError);
          return res.status(500).json({ error: 'Failed to record topup' });
        }
      }

    } else if (event === 'refund.created' || event === 'refund.processed') {
      const refund = payload.payload.refund.entity;
      const paymentId = refund.payment_id;
      const notes = refund.notes || payload.payload.payment?.entity?.notes || {};
      
      // Update payment status to refunded
      const { data: paymentRecord } = await supabase
        .from('payments')
        .update({ status: 'refunded', entitlement_expires_at: null })
        .eq('razorpay_payment_id', paymentId)
        .select('user_id')
        .single();
        
      const userId = notes.user_id || paymentRecord?.user_id;
      if (userId) {
        // Recalculate Pro status instead of blindly revoking (handles stacked payments)
        const { data: validPayments } = await supabase
          .from('payments')
          .select('entitlement_expires_at')
          .eq('user_id', userId)
          .eq('status', 'paid')
          .gt('entitlement_expires_at', new Date().toISOString())
          .order('entitlement_expires_at', { ascending: false })
          .limit(1);
          
        if (validPayments && validPayments.length > 0) {
          await supabase
            .from('profiles')
            .update({ is_pro: true, pro_expires_at: validPayments[0].entitlement_expires_at, updated_at: new Date().toISOString() })
            .eq('id', userId);
        } else {
          await supabase
            .from('profiles')
            .update({ is_pro: false, pro_expires_at: null, updated_at: new Date().toISOString() })
            .eq('id', userId);
        }
      }
    } else if (event === 'payment.failed') {
      const payment = payload.payload.payment.entity;
      const userId = payment.notes?.user_id;
      const paymentId = payment.id;
      if (userId) {
        console.log(`Payment failed for user ${userId}, payment_id: ${paymentId}`);
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
