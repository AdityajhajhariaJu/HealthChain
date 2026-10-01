/**
 * Resilient Razorpay payment orchestration service with automatic pending charge recovery,
 * interrupted task resumption, and idempotent verification.
 */
import { PRODUCT_CATALOG } from '../../shared/productCatalog.js';
import { apiEndpoint } from './ApiEndpoint';
import { verifyProStatus } from './ProfileEngine';

export type PaymentPlanId =
  | 'pro_30_days'
  | 'pro_90_days'
  | 'topup_ava'
  | 'topup_quick_consult'
  | 'topup_deep_collab'
  | 'topup_jarvis'
  | 'topup_pharmacy_hub'
  | 'topup_lab_report';

export interface PendingPaymentRecord {
  orderId: string;
  planId: PaymentPlanId | string;
  userId: string;
  timestamp: number;
  attempts?: number;
}

export interface InterruptedTask {
  featureId: string;
  returnPath: string;
  draftState?: any;
  timestamp: number;
  title: string;
}

export type CheckoutResult =
  | {
      success: true;
      expiresAt?: string;
      alreadyProcessed?: boolean;
      recovered?: boolean;
      orderId: string;
    }
  | {
      success: false;
      reason:
        | 'cancelled'
        | 'network_error'
        | 'verification_failed'
        | 'sdk_failed'
        | 'unauthorized'
        | 'order_creation_failed'
        | 'missing_configuration';
      message: string;
      pendingOrderId?: string;
    };

const PENDING_PAYMENT_PREFIX = 'hc_pending_charge_';
const INTERRUPTED_TASK_PREFIX = 'hc_interrupted_task_';

/**
 * Resilient Razorpay SDK loader with script deduplication and error cleanup.
 */
let loadPromise: Promise<boolean> | null = null;

async function paymentFetch(path: string, options: RequestInit, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(apiEndpoint(path), { ...options, signal: controller.signal });
    // The deadline includes reading the response body, not only receiving headers.
    const body = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, json: async () => {
      if (body === null) throw new Error('Payment service returned an unreadable response.');
      return body;
    } };
  }
  finally { clearTimeout(timer); }
}

export function loadRazorpaySDK(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  if ((window as any).Razorpay) {
    return Promise.resolve(true);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.remove();
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    const timeout = setTimeout(() => {
      script.onload = null;
      script.onerror = null;
      loadPromise = null;
      script.remove();
      resolve(false);
    }, 20000);

    script.onload = () => {
      clearTimeout(timeout);
      loadPromise = null;
      resolve(Boolean((window as any).Razorpay));
    };

    script.onerror = () => {
      clearTimeout(timeout);
      loadPromise = null;
      script.remove();
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return loadPromise;
}

// ---------------------------------------------------------------------------
// Interrupted Task Persistence & Resumption
// ---------------------------------------------------------------------------

export function saveInterruptedTask(task: InterruptedTask, userId?: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const key = `${INTERRUPTED_TASK_PREFIX}${userId || 'anonymous'}`;
    localStorage.setItem(key, JSON.stringify(task));
  } catch (err) {
    console.warn('[Razorpay] Failed to save interrupted task', err);
  }
}

export function getInterruptedTask(userId?: string): InterruptedTask | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const key = `${INTERRUPTED_TASK_PREFIX}${userId || 'anonymous'}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as InterruptedTask;
  } catch {
    return null;
  }
}

export function clearInterruptedTask(userId?: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const key = `${INTERRUPTED_TASK_PREFIX}${userId || 'anonymous'}`;
    localStorage.removeItem(key);
  } catch {}
}

export function resumeInterruptedTask(
  navigate: (path: string, options?: any) => void,
  userId?: string
): boolean {
  const task = getInterruptedTask(userId);
  if (!task || !task.returnPath) return false;
  clearInterruptedTask(userId);
  navigate(task.returnPath, { state: task.draftState });
  return true;
}

// ---------------------------------------------------------------------------
// Pending Payment Record Tracking
// ---------------------------------------------------------------------------

export function recordPendingPayment(record: PendingPaymentRecord): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const key = `${PENDING_PAYMENT_PREFIX}${record.userId}`;
    localStorage.setItem(key, JSON.stringify(record));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hc_payment_pending', { detail: { userId: record.userId } }));
  } catch (err) {
    console.warn('[Razorpay] Failed to record pending payment', err);
  }
}

export function getPendingPayment(userId?: string): PendingPaymentRecord | null {
  if (typeof localStorage === 'undefined' || !userId) return null;
  try {
    const key = `${PENDING_PAYMENT_PREFIX}${userId}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    const record = JSON.parse(data);
    if (!record || record.userId !== userId || typeof record.orderId !== 'string' || !record.orderId ||
      !Object.prototype.hasOwnProperty.call(PRODUCT_CATALOG, record.planId) || !Number.isFinite(record.timestamp)) return null;
    return record as PendingPaymentRecord;
  } catch {
    return null;
  }
}

export function clearPendingPayment(userId?: string): void {
  if (typeof localStorage === 'undefined' || !userId) return;
  try {
    const key = `${PENDING_PAYMENT_PREFIX}${userId}`;
    localStorage.removeItem(key);
  } catch {}
}

// ---------------------------------------------------------------------------
// Polling & Entitlement Recovery
// ---------------------------------------------------------------------------

export async function pollPaymentEntitlement(
  orderId: string,
  token: string,
  maxAttempts: number = 5,
  intervalMs: number = 2000
): Promise<boolean> {

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await paymentFetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ check_order_id: orderId }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success && data.status === 'paid') {
          await verifyProStatus();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('hc_payment_completed', {
                detail: { orderId, success: true, recovered: true },
              })
            );
          }
          return true;
        }
      }
    } catch {
      // Continue next attempt
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  return false;
}

export async function recoverPendingPayment(userId: string, token: string): Promise<boolean> {
  const pending = getPendingPayment(userId);
  if (!pending || !pending.orderId) return false;

  const isRecovered = await pollPaymentEntitlement(pending.orderId, token, 3, 1500);
  if (isRecovered) {
    clearPendingPayment(userId);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Unified Razorpay Checkout Flow
// ---------------------------------------------------------------------------

type CheckoutOptions = { onPending?: (orderId: string) => void; planTitle?: string };
const activeCheckouts = new Set<string>();
export async function initiateRazorpayCheckout(planId: PaymentPlanId, user: { id: string; email?: string; name?: string; phone?: string }, token: string, options?: CheckoutOptions): Promise<CheckoutResult> {
  if (activeCheckouts.has(user.id)) return { success: false, reason: 'network_error', message: 'A checkout is already in progress for this account.', pendingOrderId: getPendingPayment(user.id)?.orderId };
  activeCheckouts.add(user.id);
  try { return await performRazorpayCheckout(planId, user, token, options); }
  finally { activeCheckouts.delete(user.id); }
}

async function performRazorpayCheckout(
  planId: PaymentPlanId,
  user: { id: string; email?: string; name?: string; phone?: string },
  token: string,
  options?: CheckoutOptions
): Promise<CheckoutResult> {
  if (!token) {
    return {
      success: false,
      reason: 'unauthorized',
      message: 'You must be signed in to upgrade or top up.',
    };
  }
  const pending = getPendingPayment(user.id);
  if (pending) return { success: false, reason: 'network_error', pendingOrderId: pending.orderId, message: 'A previous payment is awaiting confirmation. Check its saved status before starting another payment.' };

  const isLoaded = await loadRazorpaySDK();
  if (!isLoaded) {
    return {
      success: false,
      reason: 'sdk_failed',
      message: 'Razorpay checkout could not be initialized. Please check your internet connection.',
    };
  }


  // 1. Create order on server
  let orderData: any = null;
  try {
    const orderRes = await paymentFetch('/api/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan_id: planId }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.json().catch(() => ({ error: `Order creation failed (${orderRes.status})` }));
      return {
        success: false,
        reason: 'order_creation_failed',
        message: err.error || 'Failed to create payment order.',
      };
    }

    orderData = await orderRes.json();
  } catch (err: any) {
    return {
      success: false,
      reason: 'network_error',
      message: err.message || 'Network error while connecting to payment service.',
    };
  }

  const razorpayKey =
    (import.meta.env?.VITE_RAZORPAY_KEY_ID as string | undefined) ||
    (typeof window !== 'undefined' && (window as any).__ENV__?.VITE_RAZORPAY_KEY_ID);

  if (!orderData || typeof orderData.id !== 'string' || !orderData.id || !Number.isInteger(orderData.amount) || orderData.amount <= 0 || orderData.currency !== 'INR') {
    return { success: false, reason: 'order_creation_failed', message: 'The payment order could not be confirmed. Please retry.' };
  }

  if (!razorpayKey) {
    return {
      success: false,
      reason: 'missing_configuration',
      message: 'Payment gateway configuration is missing on the client.',
    };
  }

  // 2. Persist pending payment in case browser is closed or refreshed before callback completes
  recordPendingPayment({
    orderId: orderData.id,
    planId,
    userId: user.id,
    timestamp: Date.now(),
  });

  // 3. Open Razorpay Checkout modal
  return new Promise<CheckoutResult>((resolve) => {
    let handled = false;

    const rzpOptions = {
      key: razorpayKey,
      amount: orderData.amount,
      currency: orderData.currency,
      name: planId.startsWith('topup_') ? 'HealthChain Top-Up' : 'HealthChain Pro',
      description: options?.planTitle || `HealthChain (${planId})`,
      order_id: orderData.id,
      prefill: {
        email: user.email || '',
        name: user.name || '',
        contact: user.phone || '',
      },
      theme: {
        color: '#0D9488',
      },
      modal: {
        ondismiss: () => {
          if (!handled) {
            handled = true;
            // User intentionally closed modal without completing payment
            clearPendingPayment(user.id);
            resolve({
              success: false,
              reason: 'cancelled',
              message: 'Checkout cancelled by user.',
            });
          }
        },
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        if (handled) return;
        handled = true;

        try {
          const verifyRes = await paymentFetch('/api/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: planId,
            }),
          });

          const verifyData = await verifyRes.json().catch(() => ({
            success: false,
            error: `Verification response format error (${verifyRes.status})`,
          }));

          if (verifyRes.ok && verifyData.success) {
            clearPendingPayment(user.id);
            await verifyProStatus();

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('hc_payment_completed', {
                  detail: { orderId: orderData.id, planId, expiresAt: verifyData.expires_at },
                })
              );
            }

            resolve({
              success: true,
              expiresAt: verifyData.expires_at,
              alreadyProcessed: verifyData.already_processed,
              orderId: orderData.id,
            });
          } else {
            // Capture/provisioning/provider failures can be recoverable. Keep
            // the order receipt until authoritative confirmation or dismissal.
            options?.onPending?.(orderData.id);
            resolve({
              success: false,
              reason: 'verification_failed',
              message: `${verifyData.error || 'Payment confirmation could not be completed.'} Check the saved payment status before paying again.`,
              pendingOrderId: orderData.id,
            });
          }
        } catch {
          // Network failure during verification: do NOT discard pending charge!
          // Try background polling immediately to see if webhook captured it
          const recovered = await pollPaymentEntitlement(orderData.id, token, 3, 2000);
          if (recovered) {
            clearPendingPayment(user.id);
            resolve({
              success: true,
              recovered: true,
              orderId: orderData.id,
            });
          } else {
            options?.onPending?.(orderData.id);
            resolve({
              success: false,
              reason: 'network_error',
              message:
                'Payment was processed by your bank, but confirmation is delayed. Your status will update automatically.',
              pendingOrderId: orderData.id,
            });
          }
        }
      },
    };

    const RazorpayConstructor = (window as any).Razorpay;
    if (!RazorpayConstructor) {
      clearPendingPayment(user.id);
      resolve({
        success: false,
        reason: 'sdk_failed',
        message: 'Razorpay SDK instance not found on window.',
      });
      return;
    }

    try {
      const rzp = new RazorpayConstructor(rzpOptions);
      rzp.open();
    } catch {
      clearPendingPayment(user.id);
      resolve({ success: false, reason: 'sdk_failed', message: 'Checkout could not be opened. Please retry.' });
    }
  });
}
