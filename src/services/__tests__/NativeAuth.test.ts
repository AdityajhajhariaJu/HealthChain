// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ platform: 'ios', open: vi.fn(), close: vi.fn(), exchange: vi.fn(), listener: undefined as any, remove: vi.fn(), launch: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => state.platform } }));
vi.mock('@capacitor/browser', () => ({ Browser: { open: state.open, close: state.close } }));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(async (_: string, callback: any) => { state.listener = callback; return { remove: state.remove }; }), getLaunchUrl: state.launch } }));
vi.mock('../supabaseClient', () => ({ supabase: { auth: { exchangeCodeForSession: state.exchange } } }));
import { authRedirectUrl, installNativeAuthCallbacks, openAuthProvider, parseNativeAuthCallback } from '../NativeAuth';
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); state.platform = 'ios'; state.close.mockResolvedValue(undefined); state.exchange.mockResolvedValue({ data: { session: { user: { id: 'synthetic' } } }, error: null }); state.launch.mockResolvedValue(undefined); });
it('routes sign-in and recovery to installed-app callbacks and opens the system browser', async () => {
  expect(authRedirectUrl('/auth/callback')).toBe('com.healthchain.app://auth/callback');
  expect(authRedirectUrl('/update-password')).toBe('com.healthchain.app://auth/update-password');
  await openAuthProvider('https://synthetic.supabase.co/auth/v1/authorize');
  expect(state.open).toHaveBeenCalledWith({ url: 'https://synthetic.supabase.co/auth/v1/authorize' });
  await expect(openAuthProvider('javascript:alert(1)')).rejects.toThrow();
});
it.each(['https://attacker.test/auth/callback?code=x', 'other.app://auth/callback?code=x', 'com.healthchain.app://attacker/callback?code=x', 'com.healthchain.app://auth/other?code=x', 'com.healthchain.app://auth/callback#access_token=unsafe&refresh_token=unsafe'])('ignores untrusted or non-PKCE callbacks %s', url => { expect(parseNativeAuthCallback(url)).toBeNull(); });
it('deduplicates warm callbacks, verifies PKCE and routes the password-reset page', async () => {
  const navigate = vi.fn(); const cleanup = installNativeAuthCallbacks(navigate);
  await vi.waitFor(() => expect(state.listener).toBeDefined());
  state.listener({ url: 'com.healthchain.app://auth/update-password?code=synthetic-warm-code' });
  state.listener({ url: 'com.healthchain.app://auth/update-password?code=synthetic-warm-code' });
  await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/update-password', { replace: true }));
  expect(state.exchange).toHaveBeenCalledTimes(1);
  cleanup(); expect(state.remove).toHaveBeenCalled();
});
it('handles cold launch and shows failed verification without accepting a session', async () => {
  state.launch.mockResolvedValue({ url: 'com.healthchain.app://auth/callback?code=synthetic-cold-failure' });
  state.exchange.mockResolvedValue({ data: { session: null }, error: new Error('Invalid verifier') });
  const navigate = vi.fn(); const cleanup = installNativeAuthCallbacks(navigate);
  await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/login', { replace: true }));
  expect(sessionStorage.getItem('hc_auth_error')).toContain('expired');
  expect(localStorage.getItem('isAuthenticated')).toBeNull(); cleanup();
});
it('keeps web redirects on the web origin and does not install native listeners', () => {
  state.platform = 'web';
  expect(authRedirectUrl('/auth/callback')).toBe(window.location.origin + '/auth/callback');
  installNativeAuthCallbacks(vi.fn())(); expect(state.launch).not.toHaveBeenCalled();
});
