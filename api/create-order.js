import Razorpay from 'razorpay';

const ALLOWED_PLANS = {
  pro_30_days: {
    amount: 49900, // ₹499.00 in paise
    currency: 'INR',
    description: 'Pro Access (30 Days)'
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan_id = 'pro_30_days' } = req.body || {};
    const plan = ALLOWED_PLANS[plan_id];

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
        plan_id
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
    return res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
}
