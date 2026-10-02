import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export const NATIVE_AUTH_SCHEME = 'com.healthchain.app';
export function authRedirectUrl(path: '/auth/callback' | '/update-password') {
  if (Capacitor.getPlatform() !== 'web') {
    return `${NATIVE_AUTH_SCHEME}://auth/${path === '/update-password' ? 'update-password' : 'callback'}`;
  }
  const origin =
    window.location.hostname === 'www.healthchain360.com'
      ? 'https://healthchain360.com'
      : window.location.origin;
  return origin + path;
}

export async function openAuthProvider(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
    throw new Error('Invalid sign-in URL.');
  if (Capacitor.getPlatform() !== 'web') await Browser.open({ url });
  else window.location.assign(url);
}

export function parseNativeAuthCallback(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== `${NATIVE_AUTH_SCHEME}:` ||
      url.hostname !== 'auth' ||
      url.port ||
      url.username ||
      url.password ||
      !['/callback', '/update-password'].includes(url.pathname)
    )
      return null;
    // Native sessions use PKCE: bearer tokens in incoming URLs are not accepted.
    const code = url.searchParams.get('code');
    const error =
      url.searchParams.has('error') || new URLSearchParams(url.hash.slice(1)).has('error');
    if (!error && (!code || code.length > 4096)) return null;
    return { code, error, path: url.pathname === '/update-password' ? '/update-password' : '/app' };
  } catch {
    return null;
  }
}

const exchanges = new Map<string, Promise<void>>();
if (typeof window !== 'undefined') window.addEventListener('hc_logout', () => exchanges.clear());
async function exchangeOnce(code: string) {
  let exchange = exchanges.get(code);
  if (!exchange) {
    exchange = (async () => {
      const { supabase } = await import('./supabaseClient');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data?.session)
        throw new Error('Sign-in link expired or could not be verified. Start sign-in again.');
    })();
    exchanges.set(code, exchange);
    // Limit memory while retaining duplicate callback protection.
    if (exchanges.size > 10) exchanges.delete(exchanges.keys().next().value!);
  }
  await exchange;
}

/** Handles both a running app and a cold launch; unregisters on React cleanup. */
export function installNativeAuthCallbacks(
  navigate: (path: string, options: { replace: boolean }) => void
) {
  if (Capacitor.getPlatform() === 'web') return () => {};
  let disposed = false;
  let listener: { remove: () => Promise<void> } | undefined;
  const handle = async (value: string) => {
    const callback = parseNativeAuthCallback(value);
    if (!callback || disposed) return;
    try {
      if (callback.error) throw new Error('Sign-in was cancelled or declined. Please try again.');
      await exchangeOnce(callback.code!);
      if (disposed) return;
      await Browser.close().catch(() => {}); // Android may close automatically.
      try {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.removeItem('hc_guest_mode');
      } catch {
        /* Session remains authoritative. */
      }
      navigate(callback.path, { replace: true });
    } catch (error) {
      if (disposed) return;
      await Browser.close().catch(() => {});
      try {
        sessionStorage.setItem(
          'hc_auth_error',
          error instanceof Error ? error.message : 'Sign-in could not be completed.'
        );
      } catch {
        /* Login remains available. */
      }
      navigate('/login', { replace: true });
    }
  };
  void App.addListener('appUrlOpen', ({ url }) => {
    void handle(url);
  })
    .then((handle) => {
      listener = handle;
      if (disposed) void handle.remove();
    })
    .catch(() => {
      if (!disposed) console.warn('Native sign-in callback listener could not be registered.');
    });
  void App.getLaunchUrl()
    .then((value) => {
      if (value?.url) void handle(value.url);
    })
    .catch(() => {});
  return () => {
    disposed = true;
    if (listener) void listener.remove();
  };
}
