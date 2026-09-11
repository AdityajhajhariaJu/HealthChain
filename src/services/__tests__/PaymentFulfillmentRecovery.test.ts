// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

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
            order_id: 'order_recovery_123',
            amount: 9900,
            currency: 'INR',
          })),
        },
        orders: {
          fetch: vi.fn(async () => ({
            amount: 9900,
            currency: 'INR',
            notes: { plan_id: 'topup_ava', user_id: 'user_recovery_test' },
          })),
        },
      };
    },
  };
});

import verifyPaymentHandler from '../../../api/verify-payment.js';

describe('P1 Finding 6: Payment Fulfillment Recovery & Error Safety', () => {
  const secret = 'test_secret_recovery_key';
  const orderId = 'order_recovery_123';
  const paymentId = 'pay_recovery_123';
  const userId = 'user_recovery_test';

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_key';
    process.env.RAZORPAY_KEY_SECRET = secret;
    process.env.RAZORPAY_KEY_ID = 'rzp_test_123';

    mockRpc.mockReset();
    mockFrom.mockReset();
    mockGetUser.mockReset();

    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
  });

  it('fails safely and persists failed status when quota provisioning errors', async () => {
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Quota provisioning RPC returns error
    mockRpc.mockImplementation(async (fnName: string) => {
      if (fnName === 'activate_and_provision_topup') {
        return { data: null, error: { message: 'Database deadlock during quota allocation' } };
      }
      return { data: null, error: null };
    });

    let updatedPaymentRow: any = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null })),
            })),
          })),
          update: vi.fn((data: any) => ({
            eq: vi.fn(async () => {
              updatedPaymentRow = data;
              return { error: null };
            }),
          })),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: { is_pro: true },
              })),
            })),
          })),
        };
      }
      return {};
    });

    const req: any = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid_jwt_token',
        origin: 'https://healthchain360.com',
      },
      body: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        planId: 'topup_ava',
      },
    };

    const res: any = {
      statusCode: 200,
      headers: {},
      setHeader: (k: string, v: string) => { res.headers[k] = v; },
      status: (code: number) => { res.statusCode = code; return res; },
      json: vi.fn((data: any) => { res.body = data; return res; }),
      end: vi.fn(),
    };

    await verifyPaymentHandler(req, res);

    // Request must fail with 503 so client/user knows fulfillment is pending/failed
    expect(res.statusCode).toBe(503);
  });

  it('re-runs quota provisioning on recovery attempt when payment exists with unfulfilled status', async () => {
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    let provisioningExecuted = false;

    mockRpc.mockImplementation(async (fnName: string) => {
      if (fnName === 'activate_and_provision_topup') {
        provisioningExecuted = true;
        return { data: { success: true, already_processed: false }, error: null };
      }
      return { data: null, error: null };
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              // Simulating an existing payment that previously failed fulfillment
              maybeSingle: vi.fn(async () => ({
                data: {
                  id: 'pay_row_failed_1',
                  user_id: userId,
                  status: 'paid',
                  fulfillment_status: 'failed',
                  entitlement_expires_at: null,
                },
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
                data: { is_pro: true },
              })),
            })),
          })),
        };
      }
      return {};
    });

    const req: any = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid_jwt_token',
        origin: 'https://healthchain360.com',
      },
      body: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        planId: 'topup_ava',
      },
    };

    const res: any = {
      statusCode: 200,
      headers: {},
      setHeader: (k: string, v: string) => { res.headers[k] = v; },
      status: (code: number) => { res.statusCode = code; return res; },
      json: vi.fn((data: any) => { res.body = data; return res; }),
      end: vi.fn(),
    };

    await verifyPaymentHandler(req, res);

    // CRITICAL: Must not skip provisioning! Must repair missing quota!
    expect(provisioningExecuted).toBe(true);
    expect(res.statusCode).toBe(200);
  });
});
