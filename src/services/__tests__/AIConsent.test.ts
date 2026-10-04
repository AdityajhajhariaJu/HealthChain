// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ owner: 'guest', epoch: 1 }));
vi.mock('../AccountScope', () => ({
  captureAccountScope: () => ({ accountId: state.owner, profileId: 'profile_1', key: state.owner, epoch: state.epoch }),
  isAccountScopeCurrent: (scope: any) => scope.accountId === state.owner && scope.epoch === state.epoch,
}));
vi.mock('../storage', () => ({
  getItemSync: (key: string) => localStorage.getItem(key),
  setItemSync: (key: string, value: string) => localStorage.setItem(key, value),
  removeItemSync: (key: string) => localStorage.removeItem(key),
}));
import { AI_CONSENT_VERSION, hasAIConsent, pendingAIConsent, requestAIConsent,
  resolveAIConsent, revokeAIConsent } from '../AIConsent';
describe('affirmative account-scoped AI permission', () => {
  beforeEach(() => { localStorage.clear(); state.owner = 'guest'; state.epoch = 1; });
  afterEach(() => resolveAIConsent(false));
  it('waits for permission and persists a versioned choice only after acceptance', async () => {
    const promise = requestAIConsent();
    expect(hasAIConsent()).toBe(false); expect(pendingAIConsent()).toBe(true);
    resolveAIConsent(true); await promise;
    expect(hasAIConsent()).toBe(true);
    expect(JSON.parse(localStorage.getItem('hc_ai_consent_guest')!)).toMatchObject({ accepted: true, version: AI_CONSENT_VERSION });
  });
  it('refuses a declined request without recording consent', async () => {
    const promise = requestAIConsent(); const rejection = expect(promise).rejects.toThrow('not given');
    resolveAIConsent(false); await rejection; expect(hasAIConsent()).toBe(false);
  });
  it('never treats a cookie choice or outdated AI policy version as permission', () => {
    localStorage.setItem('hc_cookies_accepted', 'accepted');
    localStorage.setItem('hc_ai_consent_guest', JSON.stringify({ accepted: true, version: 'old' }));
    expect(hasAIConsent()).toBe(false);
  });
  it('does not carry permission between accounts', async () => {
    state.owner = 'owner-a';
    const first = requestAIConsent(); resolveAIConsent(true); await first;
    state.owner = 'owner-b'; state.epoch++;
    expect(hasAIConsent()).toBe(false);
  });
  it('does not approve a pending old-account request after switching accounts', async () => {
    state.owner = 'owner-a';
    const promise = requestAIConsent(); const rejection = expect(promise).rejects.toThrow('not given');
    state.owner = 'owner-b'; state.epoch++; resolveAIConsent(true); await rejection;
    expect(hasAIConsent()).toBe(false);
  });
  it('cancels while the permission dialog is open', async () => {
    const controller = new AbortController();
    const promise = requestAIConsent(controller.signal);
    const rejection = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort(); await rejection; expect(pendingAIConsent()).toBe(false);
  });
  it('withdrawal removes permission for future requests', async () => {
    const first = requestAIConsent(); resolveAIConsent(true); await first;
    revokeAIConsent(); expect(hasAIConsent()).toBe(false);
    const second = requestAIConsent(); const rejection = expect(second).rejects.toThrow('not given');
    resolveAIConsent(false); await rejection;
  });
  it('one affirmative choice resolves simultaneous same-account requests', async () => {
    const requests = [requestAIConsent(), requestAIConsent()];
    resolveAIConsent(true); await Promise.all(requests); expect(pendingAIConsent()).toBe(false);
  });
});
