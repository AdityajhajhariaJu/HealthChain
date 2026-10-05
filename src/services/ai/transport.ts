import { apiEndpoint, aiRegionEndpoint } from '../ApiEndpoint';
import {
  captureAccountScope as captureHealthMemoryScope,
  isAccountScopeCurrent as isHealthMemoryScopeCurrent,
} from '../AccountScope';
import { supabase } from '../supabaseClient';
import { requestAIConsent, hasAIConsent, AI_CONSENT_CHANGED } from '../AIConsent';
import { trackEvent } from '../analytics';
import { AI_CONSENT_HEADER, AI_CONSENT_VERSION } from '../../../shared/privacy-consent.js';

// Vite proxies /api/gemini to the local backend in development. A same-origin default
// also keeps the request inside the page's Content Security Policy.
export const API_URL = apiEndpoint('/api/gemini');

export async function sha256Hash(text: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Date.now().toString();
  }
}

function freshRequestId() {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
  }
  return `hc.${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}.${Math.random().toString(36).slice(2)}`;
}

export const fetchWithTimeout = async (
  url: string,
  options: any = {},
  timeoutMs = 60000,
  idempotencyKey?: string
) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Offline');
  }

  const avaScope = captureHealthMemoryScope();
  // No request body leaves the device until affirmative, account-scoped permission.
  await requestAIConsent(options.signal);
  if (!isHealthMemoryScopeCurrent(avaScope)) throw new Error('Account changed. Please retry.');
  const explicitGuest =
    typeof localStorage !== 'undefined' && localStorage.getItem('hc_guest_mode') === 'true';
  const reviewedConversation = ['ava_chat', 'memory_extraction'].includes(
    options.headers?.['X-HC-Operation']
  );
  let sessionToken = '';
  // Explicit guests never send an account token. Avoid waiting for account
  // storage recovery (which can stall in WebKit) for an anonymous request.
  if (!explicitGuest)
    try {
      const { data } = await supabase.auth.getSession();
      if (
        avaScope &&
        (!isHealthMemoryScopeCurrent(avaScope) ||
          (avaScope.accountId !== 'guest' && data?.session?.user?.id !== avaScope.accountId))
      )
        throw new Error('Account changed. Please retry.');
      if (
        data?.session?.access_token &&
        !explicitGuest &&
        (!reviewedConversation || avaScope.accountId !== 'guest')
      ) {
        sessionToken = data.session.access_token;
      }
    } catch (error) {
      if (avaScope) throw error;
    }

  // Use caller-provided idempotency key or request ID, or generate a fresh collision-resistant request ID
  const passedRequestId = options.headers?.['X-HC-Request-Id'] || idempotencyKey;
  // Fresh requests need uniqueness, not a hash of a potentially large photo
  // payload. Keep a caller's recovery/idempotency key unchanged across retries.
  const requestId = passedRequestId || freshRequestId();

  const secureOptions = {
    ...options,
    headers: {
      'X-HC-Request-Id': requestId,
      ...options.headers,
      'X-HC-Operation': options.headers?.['X-HC-Operation'] || 'gemini',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      [AI_CONSENT_HEADER]: AI_CONSENT_VERSION,
    },
  };
  const executeFetch = async (retryCount = 0): Promise<Response> => {
    if (avaScope && !isHealthMemoryScopeCurrent(avaScope))
      throw new Error('Account changed. Please retry.');
    if (!hasAIConsent(avaScope))
      throw new Error('AI permission was withdrawn. No further AI requests can start.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const externalSignal = options.signal as AbortSignal | undefined;
    const abortForCaller = () => controller.abort();
    const abortForWithdrawal = () => {
      if (!hasAIConsent(avaScope)) controller.abort();
    };
    if (externalSignal?.aborted) controller.abort();
    else externalSignal?.addEventListener('abort', abortForCaller, { once: true });
    if (typeof window !== 'undefined')
      window.addEventListener(AI_CONSENT_CHANGED, abortForWithdrawal);
    // Recheck after registering cancellation; an auth lookup or earlier attempt
    // may have yielded while the user withdrew permission.
    abortForWithdrawal();
    try {
      if (import.meta.env.VITE_HEALTH_BACKEND_URL) {
        const region = await fetch(aiRegionEndpoint(requestId), {
          signal: controller.signal,
          credentials: 'omit',
          cache: 'no-store',
        });
        const confirmation = await region.json();
        if (!region.ok || typeof confirmation?.proof !== 'string')
          throw new Error(
            confirmation?.code === 'AI_REGION_UNAVAILABLE'
              ? 'AI_REGION_UNAVAILABLE: AI features are unavailable in your current region. Your saved records remain available.'
              : 'AI_REGION_CHECK_UNAVAILABLE: AI region verification is temporarily unavailable. Please try again.'
          );
        if (!hasAIConsent(avaScope) || !isHealthMemoryScopeCurrent(avaScope))
          throw new Error('AI permission or account changed. No AI request was sent.');
        secureOptions.headers['X-HC-Region-Proof'] = confirmation.proof;
      }
      const received = await fetch(url, { ...secureOptions, signal: controller.signal });
      // These operations return finite JSON/text, never a streaming chat. Keep
      // the deadline and caller cancellation active until all bytes arrive.
      const body = await received.arrayBuffer();
      if (!isHealthMemoryScopeCurrent(avaScope)) throw new Error('Account changed. Please retry.');
      if (!hasAIConsent(avaScope))
        throw new Error(
          'AI permission was withdrawn. Please retry only if you choose to allow AI processing.'
        );
      const response = new Response([204, 205, 304].includes(received.status) ? null : body, {
        status: received.status,
        statusText: received.statusText,
        headers: received.headers,
      });
      if (!response.ok) {
        if (response.status === 401 && retryCount < 1 && !explicitGuest) {
          // getSession() automatically triggers a safe, lock-protected refresh if the token is expired.
          // Using manual refreshSession() risks token revocation if a background refresh is already running.
          const { data, error } = await supabase.auth.getSession();
          if (
            !error &&
            data?.session &&
            (!avaScope ||
              (data.session.user.id === avaScope.accountId && isHealthMemoryScopeCurrent(avaScope)))
          ) {
            secureOptions.headers['Authorization'] = `Bearer ${data.session.access_token}`;
            return executeFetch(retryCount + 1);
          }
          throw new Error('Session expired or unauthorized. Please verify your login.');
        } else if (response.status === 429) {
          throw new Error('RATE_LIMITED: Too many requests right now. Wait a moment and retry.');
        } else if (response.status === 402) {
          window.dispatchEvent(
            new CustomEvent('hc_quota_exceeded', {
              detail: { operation: secureOptions.headers['X-HC-Operation'], isRateLimit: false },
            })
          );
          throw new Error('QUOTA_EXCEEDED');
        } else if (
          (response.status === 502 || response.status === 503 || response.status === 504) &&
          retryCount < 2
        ) {
          // A confirmed failed plan has been refunded. Replaying its ID hides the
          // original failure behind a duplicate-request 409 and cannot recover it.
          if (
            ['dietician_meal_plan', 'ava_chat'].includes(secureOptions.headers['X-HC-Operation'])
          ) {
            const failure = await response
              .clone()
              .json()
              .catch(() => ({}));
            if (failure.requestState === 'failed') return response;
          }
          const delay = (retryCount + 1) * 800;
          await new Promise((res) => setTimeout(res, delay));
          return executeFetch(retryCount + 1);
        }
      }
      return response;
    } catch (err: any) {
      if (
        retryCount < 2 &&
        err.name !== 'AbortError' &&
        err.message !== 'QUOTA_EXCEEDED' &&
        !err.message?.startsWith('RATE_LIMITED') &&
        !err.message?.startsWith('AI_REGION_') &&
        isHealthMemoryScopeCurrent(avaScope) &&
        hasAIConsent(avaScope)
      ) {
        const delay = (retryCount + 1) * 800;
        await new Promise((res) => setTimeout(res, delay));
        return executeFetch(retryCount + 1);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortForCaller);
      if (typeof window !== 'undefined')
        window.removeEventListener(AI_CONSENT_CHANGED, abortForWithdrawal);
    }
  };

  trackEvent('ai_request', { action: 'started' });
  try {
    const response = await executeFetch(0);
    trackEvent('ai_request', { action: response.ok ? 'completed' : 'failed' });
    return response;
  } catch (error) {
    trackEvent('ai_request', { action: 'failed' });
    throw error;
  }
};
