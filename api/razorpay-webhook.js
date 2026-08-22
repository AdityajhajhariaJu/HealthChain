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

    if (expectedSignature !== signature) {
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

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // Pro plan is 30 days

      // Call the entitlement RPC
      const { error } = await supabase.rpc('activate_payment_entitlement', {
        p_user_id: userId,
        p_order_id: orderId,
        p_payment_id: paymentId,
        p_amount: amount,
        p_expires_at: expiryDate.toISOString(),
      });

      if (error) {
        console.error('Webhook entitlement error:', error);
        return res.status(500).json({ error: 'Failed to activate entitlement' });
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
        // Revoke pro status
        await supabase
          .from('profiles')
          .update({ is_pro: false, pro_expires_at: null, updated_at: new Date().toISOString() })
          .eq('id', userId);
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
