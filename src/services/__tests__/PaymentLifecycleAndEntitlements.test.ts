// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveInterruptedTask,
  getInterruptedTask,
  clearInterruptedTask,
  resumeInterruptedTask,
  recordPendingPayment,
  getPendingPayment,
  clearPendingPayment,
  pollPaymentEntitlement,
  recoverPendingPayment,
  initiateRazorpayCheckout,
} from '../razorpay';
import crypto from 'crypto';

describe('PaymentLifecycleAndEntitlements (Package 10)', () => {
  const mockUserId = 'user-test-uuid-123';
  const mockToken = 'mock-jwt-token-xyz';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Interrupted Task Preservation and Resumption', () => {
    it('saves interrupted task state and restores accurately', () => {
      const task = {
        featureId: 'case_investigation',
        returnPath: '/app/jarvis?caseId=case-99',
        draftState: { notes: 'Severe episodic migraines with visual aura' },
        timestamp: Date.now(),
        title: 'Clinical Data Engine Review',
      };

      saveInterruptedTask(task, mockUserId);
      const retrieved = getInterruptedTask(mockUserId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.featureId).toBe('case_investigation');
      expect(retrieved?.returnPath).toBe('/app/jarvis?caseId=case-99');
      expect(retrieved?.draftState.notes).toBe('Severe episodic migraines with visual aura');
    });

    it('resumes interrupted task by navigating with saved state and clearing task', () => {
      const navigate = vi.fn();
      const task = {
        featureId: 'food_detective',
        returnPath: '/app/dietician?tab=elimination',
        draftState: { protocol: 'gluten_free', day: 3 },
        timestamp: Date.now(),
        title: 'Clinical Elimination Protocol',
      };

      saveInterruptedTask(task, mockUserId);
      const resumed = resumeInterruptedTask(navigate, mockUserId);

      expect(resumed).toBe(true);
      expect(navigate).toHaveBeenCalledWith('/app/dietician?tab=elimination', {
        state: { protocol: 'gluten_free', day: 3 },
      });
      // Task should be cleared from storage
      expect(getInterruptedTask(mockUserId)).toBeNull();
    });

    it('returns false cleanly when no interrupted task is present', () => {
      const navigate = vi.fn();
      const resumed = resumeInterruptedTask(navigate, mockUserId);
      expect(resumed).toBe(false);
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('2. Pending Payment Record Lifecycle', () => {
    it('persists and retrieves pending payment records by user ID', () => {
      const record = {
        orderId: 'order_12345',
        planId: 'pro_90_days',
        userId: mockUserId,
        timestamp: Date.now(),
      };

      recordPendingPayment(record);
      const pending = getPendingPayment(mockUserId);

      expect(pending).not.toBeNull();
      expect(pending?.orderId).toBe('order_12345');
      expect(pending?.planId).toBe('pro_90_days');
    });

    it('clears pending payment on explicit cancellation or resolution', () => {
      recordPendingPayment({
        orderId: 'order_abc',
        planId: 'pro_30_days',
        userId: mockUserId,
        timestamp: Date.now(),
      });

      expect(getPendingPayment(mockUserId)).not.toBeNull();
      clearPendingPayment(mockUserId);
      expect(getPendingPayment(mockUserId)).toBeNull();
    });
  });

  describe('3. Polling and Entitlement Recovery', () => {
    it('pollPaymentEntitlement returns true and triggers events when backend reports paid', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          status: 'paid',
          recovered: true,
          expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        }),
      } as any);

      const eventSpy = vi.fn();
      window.addEventListener('hc_payment_completed', eventSpy);

      const success = await pollPaymentEntitlement('order_test_999', mockToken, 2, 50);

      expect(success).toBe(true);
      expect(eventSpy).toHaveBeenCalled();
      window.removeEventListener('hc_payment_completed', eventSpy);
    });

    it('pollPaymentEntitlement retries and returns false if payment is not confirmed within max attempts', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          status: 'pending',
          message: 'Payment has not yet been processed.',
        }),
      } as any);

      const success = await pollPaymentEntitlement('order_pending_1', mockToken, 2, 20);
      expect(success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('recoverPendingPayment resolves pending record and clears storage on recovery', async () => {
      recordPendingPayment({
        orderId: 'order_unconfirmed_456',
        planId: 'pro_30_days',
        userId: mockUserId,
        timestamp: Date.now(),
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          status: 'paid',
          recovered: true,
        }),
      } as any);

      const recovered = await recoverPendingPayment(mockUserId, mockToken);
      expect(recovered).toBe(true);
      expect(getPendingPayment(mockUserId)).toBeNull();
    });
  });

  describe('4. Checkout Flow Orchestration and Safety', () => {
    it('rejects unauthenticated checkout attempts without creating orders', async () => {
      const result = await initiateRazorpayCheckout(
        'pro_30_days',
        { id: mockUserId },
        '' // empty token
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('unauthorized');
      }
    });

    it('clears pending payment and reports cancellation when user dismisses modal', async () => {
      // Mock window.Razorpay constructor function
      (window as any).Razorpay = function (options: any) {
        this.open = () => {
          setTimeout(() => {
            options.modal.ondismiss();
          }, 10);
        };
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'order_cancel_test',
          amount: 49900,
          currency: 'INR',
          plan_id: 'pro_30_days',
        }),
      } as any);

      import.meta.env.VITE_RAZORPAY_KEY_ID = 'rzp_test_mock_key';

      const result = await initiateRazorpayCheckout(
        'pro_30_days',
        { id: mockUserId, email: 'test@example.com' },
        mockToken
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('cancelled');
      }
      expect(getPendingPayment(mockUserId)).toBeNull();
    });

    it('completes successful checkout and dispatches hc_payment_completed event', async () => {
      (window as any).Razorpay = function (options: any) {
        this.open = () => {
          setTimeout(() => {
            options.handler({
              razorpay_payment_id: 'pay_success_123',
              razorpay_order_id: 'order_success_123',
              razorpay_signature: 'sig_valid_123',
            });
          }, 10);
        };
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'order_success_123',
            amount: 49900,
            currency: 'INR',
            plan_id: 'pro_30_days',
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            expires_at: '2026-10-11T12:00:00Z',
          }),
        } as any);

      import.meta.env.VITE_RAZORPAY_KEY_ID = 'rzp_test_mock_key';

      const eventSpy = vi.fn();
      window.addEventListener('hc_payment_completed', eventSpy);

      const result = await initiateRazorpayCheckout(
        'pro_30_days',
        { id: mockUserId, email: 'test@example.com' },
        mockToken
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.orderId).toBe('order_success_123');
        expect(result.expiresAt).toBe('2026-10-11T12:00:00Z');
      }
      expect(getPendingPayment(mockUserId)).toBeNull();
      expect(eventSpy).toHaveBeenCalled();
      window.removeEventListener('hc_payment_completed', eventSpy);
    });

    it('preserves pending payment record on verification network error so recovery can occur', async () => {
      (window as any).Razorpay = function (options: any) {
        this.open = () => {
          setTimeout(() => {
            options.handler({
              razorpay_payment_id: 'pay_net_err_1',
              razorpay_order_id: 'order_net_err_1',
              razorpay_signature: 'sig_mock',
            });
          }, 10);
        };
      };

      // Order creation succeeds, but verify-payment throws network error
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'order_net_err_1',
            amount: 49900,
            currency: 'INR',
            plan_id: 'pro_30_days',
          }),
        } as any)
        .mockRejectedValue(new Error('Failed to fetch (offline)'));

      import.meta.env.VITE_RAZORPAY_KEY_ID = 'rzp_test_mock_key';

      const onPendingSpy = vi.fn();
      const result = await initiateRazorpayCheckout(
        'pro_30_days',
        { id: mockUserId, email: 'test@example.com' },
        mockToken,
        { onPending: onPendingSpy }
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('network_error');
      }
      // Critical: pending record MUST be preserved for automatic recovery
      const preserved = getPendingPayment(mockUserId);
      expect(preserved).not.toBeNull();
      expect(preserved?.orderId).toBe('order_net_err_1');
    });
  });

  describe('5. Variable Plan Duration Stacking Logic Simulation', () => {
    it('calculates 90 days for pro_90_days vs 30 days for pro_30_days', () => {
      const calculateExpiry = (
        currentExpiry: Date | null,
        planDurationDays: number,
        now: Date
      ): Date => {
        const baseDate = currentExpiry && currentExpiry > now ? new Date(currentExpiry) : new Date(now);
        baseDate.setDate(baseDate.getDate() + planDurationDays);
        return baseDate;
      };

      const now = new Date('2026-09-11T12:00:00Z');
      const activeExpiry = new Date('2026-09-21T12:00:00Z'); // 10 days remaining

      // 1. Pro 90 Days stacking on active
      const stacked90 = calculateExpiry(activeExpiry, 90, now);
      const daysFromActive90 = Math.round(
        (stacked90.getTime() - activeExpiry.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysFromActive90).toBe(90);

      // 2. Pro 30 Days stacking on active
      const stacked30 = calculateExpiry(activeExpiry, 30, now);
      const daysFromActive30 = Math.round(
        (stacked30.getTime() - activeExpiry.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysFromActive30).toBe(30);

      // 3. Expired subscription resets from now
      const expiredDate = new Date('2026-08-01T12:00:00Z');
      const fromExpired = calculateExpiry(expiredDate, 30, now);
      const daysFromNow = Math.round(
        (fromExpired.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysFromNow).toBe(30);
    });
  });

  describe('6. Timing-Safe HMAC Signature Verification', () => {
    it('validates authentic signatures and rejects forged signatures', () => {
      const secret = 'rzp_test_secret_key_12345';
      const orderId = 'order_valid_001';
      const paymentId = 'pay_valid_001';

      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const forgedSignature = crypto
        .createHmac('sha256', 'wrong_secret')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const verifySig = (receivedSig: string): boolean => {
        const expectedSig = crypto
          .createHmac('sha256', secret)
          .update(`${orderId}|${paymentId}`)
          .digest('hex');

        const expectedBuf = Buffer.from(expectedSig, 'utf8');
        const receivedBuf = Buffer.from(receivedSig, 'utf8');
        if (expectedBuf.length !== receivedBuf.length) return false;
        return crypto.timingSafeEqual(expectedBuf, receivedBuf);
      };

      expect(verifySig(validSignature)).toBe(true);
      expect(verifySig(forgedSignature)).toBe(false);
      expect(verifySig('malformed_sig')).toBe(false);
    });
  });

  describe('7. Idempotent Concurrent Processing Simulation', () => {
    it('returns already_processed when duplicate webhook or callback arrives', () => {
      interface PaymentDbRow {
        paymentId: string;
        orderId: string;
        status: 'paid' | 'pending';
        entitlementExpiresAt: string | null;
      }

      const mockDb: Record<string, PaymentDbRow> = {};

      const processPayment = (paymentId: string, orderId: string, expiresAt: string) => {
        const existing = mockDb[paymentId];
        if (existing && existing.status === 'paid' && existing.entitlementExpiresAt) {
          return { status: 200, already_processed: true, expires_at: existing.entitlementExpiresAt };
        }

        mockDb[paymentId] = {
          paymentId,
          orderId,
          status: 'paid',
          entitlementExpiresAt: expiresAt,
        };

        return { status: 200, already_processed: false, expires_at: expiresAt };
      };

      const testExpiry = new Date(Date.now() + 90 * 86400000).toISOString();

      // First arrival (e.g. Webhook)
      const firstResult = processPayment('pay_duplicate_test', 'order_dup_1', testExpiry);
      expect(firstResult.already_processed).toBe(false);

      // Second arrival (e.g. Browser callback)
      const secondResult = processPayment('pay_duplicate_test', 'order_dup_1', testExpiry);
      expect(secondResult.already_processed).toBe(true);
      expect(secondResult.expires_at).toBe(testExpiry);
    });
  });
});
