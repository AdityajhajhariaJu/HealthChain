// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';

const rpc = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ rpc, from: vi.fn() }),
}));

import webhookHandler from '../../../api/razorpay-webhook.js';

function requestFor(payload: object, secret: string) {
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const req: any = {
    method: 'POST',
    headers: { 'x-razorpay-signature': signature },
    on(event: string, callback: (value?: Buffer) => void) {
      if (event === 'data') callback(Buffer.from(body));
      if (event === 'end') callback();
      return req;
    },
  };
  const res: any = {
    statusCode: 200,
    status(code: number) { res.statusCode = code; return res; },
    json: vi.fn((value: unknown) => { res.body = value; return res; }),
    end: vi.fn(),
  };
  return { req, res };
}

describe('Razorpay refund reconciliation', () => {
  const secret = 'refund_webhook_secret';

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    rpc.mockReset();
    rpc.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('waits for refund.processed before reversing entitlement or quota', async () => {
    const { req, res } = requestFor({
      event: 'refund.created',
      payload: { refund: { entity: { id: 'rfnd_1', payment_id: 'pay_1', amount: 2500 } } },
    }, secret);

    await webhookHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(rpc).not.toHaveBeenCalledWith('process_payment_refund', expect.anything());
  });

  it('sends a processed refund to the idempotent database transaction', async () => {
    const { req, res } = requestFor({
      event: 'refund.processed',
      payload: { refund: { entity: { id: 'rfnd_2', payment_id: 'pay_2', amount: 9900 } } },
    }, secret);

    await webhookHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith('process_payment_refund', {
      p_refund_id: 'rfnd_2',
      p_payment_id: 'pay_2',
      p_refund_amount: 9900,
    });
  });
});
