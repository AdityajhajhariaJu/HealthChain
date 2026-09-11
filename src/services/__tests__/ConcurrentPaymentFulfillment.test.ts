// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

// Mocks for createClient
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

vi.mock('razorpay', () => {
  return {
    default: function RazorpayMock() {
      return {
        payments: {
          fetch: vi.fn(async () => ({
            order_id: 'order_concurrent_123',
            amount: 49900,
            currency: 'INR',
          })),
        },
        orders: {
          fetch: vi.fn(async () => ({
            amount: 49900,
            currency: 'INR',
            notes: { plan_id: 'pro_30_days', user_id: 'user_concurrent_test' },
          })),
        },
      };
    },
  };
});

import verifyPaymentHandler from '../../../api/verify-payment.js';
import webhookHandler from '../../../api/razorpay-webhook.js';

describe('P1 Finding 5: Concurrent Payment Entitlement & Single Quota Allocation', () => {
  const secret = 'test_secret_key_12345';
  const orderId = 'order_concurrent_123';
  const paymentId = 'pay_concurrent_123';
  const userId = 'user_concurrent_test';

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_key';
    process.env.RAZORPAY_KEY_SECRET = secret;
    process.env.RAZORPAY_KEY_ID = 'rzp_test_123';
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;

    mockRpc.mockReset();
    mockFrom.mockReset();
    mockGetUser.mockReset();

    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
  });

  it('allocates quota exactly once when browser verify and webhook fire concurrently', async () => {
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    let quotaAllocationCount = 0;
    let paymentFulfillCount = 0;

    // Simulate atomic database behavior:
    // First thread executes activate_and_provision_subscription and provisions quota
    // Second thread sees payment already fulfilled and returns already_processed
    mockRpc.mockImplementation(async (fnName: string, args: any) => {
      if (fnName === 'activate_and_provision_subscription') {
        paymentFulfillCount++;
        if (paymentFulfillCount === 1) {
          quotaAllocationCount++;
          return {
            data: { success: true, already_processed: false, expires_at: '2026-10-11T12:00:00Z' },
            error: null,
          };
        } else {
          return {
            data: { success: true, already_processed: true, expires_at: '2026-10-11T12:00:00Z' },
            error: null,
          };
        }
      }

      // Legacy separate RPCs (if called instead of atomic RPC)
      if (fnName === 'provision_base_quota') {
        quotaAllocationCount++;
        return { data: null, error: null };
      }
      if (fnName === 'activate_payment_entitlement') {
        return { data: true, error: null };
      }

      return { data: null, error: null };
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: null, // Initial check: not yet processed
                error: null,
              })),
            })),
          })),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: { is_pro: false, pro_expires_at: null },
                error: null,
              })),
            })),
          })),
        };
      }
      return {};
    });

    // Device / Browser verification request
    const browserReq: any = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid_jwt_token',
        origin: 'https://healthchain360.com',
      },
      body: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        planId: 'pro_30_days',
      },
    };

    const browserRes: any = {
      statusCode: 200,
      headers: {},
      setHeader: (k: string, v: string) => { browserRes.headers[k] = v; },
      status: (code: number) => { browserRes.statusCode = code; return browserRes; },
      json: vi.fn((data: any) => { browserRes.body = data; return browserRes; }),
      end: vi.fn(),
    };

    // Webhook request with payment.captured event
    const webhookPayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 49900,
            currency: 'INR',
            notes: { plan_id: 'pro_30_days', user_id: userId },
          },
        },
      },
    });

    const webhookSignature = crypto
      .createHmac('sha256', secret)
      .update(webhookPayload)
      .digest('hex');

    const webhookReq: any = {
      method: 'POST',
      headers: {
        'x-razorpay-signature': webhookSignature,
      },
      on: (event: string, cb: any) => {
        if (event === 'data') cb(Buffer.from(webhookPayload));
        if (event === 'end') cb();
        return webhookReq;
      },
    };

    const webhookRes: any = {
      statusCode: 200,
      status: (code: number) => { webhookRes.statusCode = code; return webhookRes; },
      json: vi.fn((data: any) => { webhookRes.body = data; return webhookRes; }),
      end: vi.fn(),
    };

    // Run both handlers concurrently
    await Promise.all([
      verifyPaymentHandler(browserReq, browserRes),
      webhookHandler(webhookReq, webhookRes),
    ]);

    // Both requests must complete successfully
    expect(browserRes.statusCode).toBe(200);
    expect(webhookRes.statusCode).toBe(200);

    // CRITICAL: Quota must only be allocated EXACTLY ONCE (1x), never duplicated!
    expect(quotaAllocationCount).toBe(1);
  });
});
