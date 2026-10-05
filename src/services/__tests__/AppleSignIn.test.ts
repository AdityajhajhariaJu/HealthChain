import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ platform: 'ios', authorize: vi.fn(), token: vi.fn(), update: vi.fn(), session: vi.fn(), state: vi.fn(), signOut: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => m.platform }, registerPlugin: () => ({ authorize: m.authorize,
  getCredentialState: m.state, addListener: async () => ({ remove: async () => {} }) }) }));
vi.mock('@capacitor/app', () => ({ App: { addListener: async () => ({ remove: async () => {} }) } }));
vi.mock('../supabaseClient', () => ({ supabase: { auth: { signInWithIdToken: m.token, updateUser: m.update,
  getSession: m.session, signOut: m.signOut, onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } }));
import { signInWithApple, requestAppleDeletionCode, installAppleCredentialChecks } from '../AppleSignIn';
beforeEach(() => {
  vi.resetAllMocks(); m.platform = 'ios';
  m.authorize.mockImplementation(async ({ state }) => ({ state, identityToken: 'synthetic-id-token' }));
  m.token.mockResolvedValue({ data: { session: { user: { id: 'synthetic-owner' } } }, error: null });
  m.update.mockResolvedValue({ error: null });
  m.session.mockResolvedValue({ data: { session: { user: { id: 'owner-a', identities: [{ provider: 'apple', identity_data: { sub: 'apple-owner' } }] } } } });
  m.state.mockResolvedValue({ state: 'authorized' }); m.signOut.mockResolvedValue({ error: null });
});
it('sends a hashed random nonce to Apple and the corresponding raw nonce to verified Supabase authentication', async () => {
  expect(await signInWithApple()).toBe('signed_in');
  const raw = m.token.mock.calls[0][0].nonce;
  const hashed = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))), b => b.toString(16).padStart(2, '0')).join('');
  expect(m.authorize.mock.calls[0][0].nonce).toBe(hashed);
  expect(m.token).toHaveBeenCalledWith({ provider: 'apple', token: 'synthetic-id-token', nonce: raw });
  expect(m.update).not.toHaveBeenCalled();
});
it('rejects a mismatched state before accepting any token', async () => {
  m.authorize.mockResolvedValue({ state: 'wrong', identityToken: 'synthetic-id-token' });
  await expect(signInWithApple()).rejects.toThrow('verified'); expect(m.token).not.toHaveBeenCalled();
});
it('treats cancellation as a normal outcome without authenticating', async () => {
  m.authorize.mockRejectedValue({ code: 'CANCELLED' });
  expect(await signInWithApple()).toBe('cancelled'); expect(m.token).not.toHaveBeenCalled();
});
it('does not update a name when token verification fails', async () => {
  m.authorize.mockImplementation(async ({ state }) => ({ state, identityToken: 'synthetic-id-token', fullName: 'Example Person' }));
  m.token.mockResolvedValue({ data: { session: null }, error: new Error('private-provider-detail') });
  await expect(signInWithApple()).rejects.toThrow('verified'); expect(m.update).not.toHaveBeenCalled();
});
it('keeps the first-authorization name only after authentication', async () => {
  m.authorize.mockImplementation(async ({ state }) => ({ state, identityToken: 'synthetic-id-token', fullName: ' Example Person ' }));
  await signInWithApple(); expect(m.update).toHaveBeenCalledWith({ data: { full_name: 'Example Person' } });
});
it('does not open a native Apple flow on Android or web', async () => {
  m.platform = 'android'; await expect(signInWithApple()).rejects.toThrow('iOS'); expect(m.authorize).not.toHaveBeenCalled();
});
it('collects a fresh deletion code only for the same Apple identity without changing the session', async () => {
  m.authorize.mockImplementation(async ({ state }) => ({ state, appleUser: 'apple-owner', authorizationCode: 'synthetic-code' }));
  expect(await requestAppleDeletionCode({ identities: [{ provider: 'apple', identity_data: { sub: 'apple-owner' } }] })).toBe('synthetic-code');
  expect(m.token).not.toHaveBeenCalled();
});
it('does not pass a different Apple identity into account deletion', async () => {
  m.authorize.mockImplementation(async ({ state }) => ({ state, appleUser: 'other-owner', authorizationCode: 'synthetic-code' }));
  expect(await requestAppleDeletionCode({ identities: [{ provider: 'apple', identity_data: { sub: 'apple-owner' } }] })).toBeUndefined();
});
it.each(['revoked', 'notFound'])('signs out the same account after a confirmed Apple credential state: %s', async state => {
  m.state.mockResolvedValue({ state });
  const dispose = installAppleCredentialChecks();
  await vi.waitFor(() => expect(m.signOut).toHaveBeenCalledWith({ scope: 'local' })); dispose();
});
it('keeps a newly switched account open when an older Apple credential check completes', async () => {
  m.state.mockImplementation(async () => {
    m.session.mockResolvedValue({ data: { session: { user: { id: 'owner-b' } } } }); return { state: 'revoked' };
  });
  const dispose = installAppleCredentialChecks();
  await vi.waitFor(() => expect(m.session).toHaveBeenCalledTimes(2));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(m.signOut).not.toHaveBeenCalled(); dispose();
});
it('does not treat a provider/network failure as credential revocation', async () => {
  m.state.mockRejectedValue(new Error('synthetic-offline'));
  const dispose = installAppleCredentialChecks();
  await vi.waitFor(() => expect(m.state).toHaveBeenCalled());
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(m.signOut).not.toHaveBeenCalled(); dispose();
});
