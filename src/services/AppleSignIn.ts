import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { supabase } from './supabaseClient';

const apple = registerPlugin<{
  authorize(options: { nonce: string; state: string }): Promise<{
    identityToken: string; state: string; fullName?: string; authorizationCode?: string; appleUser?: string;
  }>;
  getCredentialState(options: { userIdentifier: string }): Promise<{ state: string }>;
  addListener(event: 'credentialRevoked', listener: () => void): Promise<PluginListenerHandle>;
}>('HealthChainAppleSignIn');

function randomNonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
}

export async function requestAppleDeletionCode(user: { identities?: any[] }): Promise<string | undefined> {
  const identity = user.identities?.find(item => item.provider === 'apple');
  const subject = identity?.identity_data?.sub || identity?.id;
  if (!subject || Capacitor.getPlatform() !== 'ios') return undefined;
  const nonce = randomNonce(), state = randomNonce();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce));
  const hashedNonce = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  try {
    const credential = await apple.authorize({ nonce: hashedNonce, state });
    return credential.state === state && credential.appleUser === subject ? credential.authorizationCode : undefined;
  } catch { return undefined; }
}

export async function signInWithApple(): Promise<'signed_in' | 'cancelled'> {
  if (Capacitor.getPlatform() !== 'ios') throw new Error('Apple sign-in is available in the iOS app.');
  const nonce = randomNonce();
  const state = randomNonce();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce));
  const hashedNonce = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  let credential;
  try {
    credential = await apple.authorize({ nonce: hashedNonce, state });
  } catch (error) {
    if ((error as { code?: string })?.code === 'CANCELLED') return 'cancelled';
    throw new Error('Apple sign-in could not be completed. Please try again.');
  }
  if (credential.state !== state || !credential.identityToken)
    throw new Error('Apple sign-in could not be verified. Please try again.');
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple', token: credential.identityToken, nonce,
  });
  if (error || !data.session) throw new Error('Apple sign-in could not be verified. Please try again.');
  // Apple supplies the name only on first authorization. Never erase an existing name.
  if (credential.fullName?.trim()) {
    await supabase.auth.updateUser({ data: { full_name: credential.fullName.trim().slice(0, 200) } })
      .catch(() => {});
  }
  return 'signed_in';
}

export function installAppleCredentialChecks(): () => void {
  if (Capacitor.getPlatform() !== 'ios') return () => {};
  let disposed = false, checking = false;
  const handles: PluginListenerHandle[] = [];
  const check = async () => {
    if (disposed || checking) return;
    checking = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const identity = session?.user.identities?.find(item => item.provider === 'apple');
      const subject = identity?.identity_data?.sub || identity?.id;
      if (!session || !subject || disposed) return;
      const { state } = await apple.getCredentialState({ userIdentifier: subject });
      if (disposed || !['revoked', 'notFound'].includes(state)) return;
      const current = await supabase.auth.getSession();
      if (!disposed && current.data.session?.user.id === session.user.id)
        await supabase.auth.signOut({ scope: 'local' });
    } catch { /* Keep an offline/provider failure separate from a confirmed revocation. */ }
    finally { checking = false; }
  };
  const register = (promise: Promise<PluginListenerHandle>) => {
    void promise.then(handle => { if (disposed) void handle.remove(); else handles.push(handle); }).catch(() => {});
  };
  register(apple.addListener('credentialRevoked', () => { void check(); }));
  register(NativeApp.addListener('appStateChange', ({ isActive }) => { if (isActive) void check(); }));
  const { data } = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_IN') setTimeout(() => { void check(); }, 0); });
  void check();
  return () => { disposed = true; data.subscription.unsubscribe(); handles.forEach(handle => { void handle.remove(); }); };
}
