// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../storage', () => ({
  getItemSync: (key: string) => localStorage.getItem(key),
  setItemSync: (key: string, value: string) => localStorage.setItem(key, value),
  removeItemSync: (key: string) => localStorage.removeItem(key),
}));
vi.mock('../DurableHealthStorage', () => ({ isOwnerErased: () => false }));
import { captureAccountScope } from '../AccountScope';
import { healthDataChoice, hasHealthDataConsent, setHealthDataConsent } from '../HealthDataConsent';
import { healthConsentFetch } from '../healthConsentFetch';
import { acceptAIConsent, hasAIConsent } from '../AIConsent';
const guarded = healthConsentFetch('https://example.supabase.co');
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('hc_account', JSON.stringify({ id: 'owner-a' }));
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
  );
});
afterEach(() => vi.unstubAllGlobals());
it.each([
  '/rest/v1/cases',
  '/rest/v1/profiles',
  '/rest/v1/healthchain_profiles',
  '/rest/v1/health_observations',
  '/rest/v1/rpc/sync_case_with_revision_check',
  '/rest/v1/rpc/delete_case_with_tombstone',
  '/rest/v1/rpc/%73ync_case_with_revision_check',
  '/storage/v1/object/private/record.pdf',
])('sends neither a read nor a write to %s before cloud permission', async (path) => {
  for (const method of ['GET', 'POST']) {
    const response = await guarded('https://example.supabase.co' + path, {
      method,
      ...(method === 'POST' ? { body: '{"health":"fictional"}' } : {}),
    });
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe('HC_HEALTH_CONSENT_REQUIRED');
  }
  expect(fetch).not.toHaveBeenCalled();
});
it('keeps auth and public catalog/media requests available without health consent', async () => {
  for (const path of [
    '/auth/v1/token',
    '/rest/v1/fitness_categories',
    '/storage/v1/object/public/audio/track.mp3',
  ])
    expect((await guarded('https://example.supabase.co' + path)).status).toBe(200);
  expect(fetch).toHaveBeenCalledTimes(3);
});
it('permits the selected account after an explicit choice and refuses another account', async () => {
  expect(setHealthDataConsent(true)).toBe(true);
  expect((await guarded('https://example.supabase.co/rest/v1/cases')).status).toBe(200);
  localStorage.setItem('hc_account', JSON.stringify({ id: 'owner-b' }));
  expect(healthDataChoice()).toBeNull();
  expect((await guarded('https://example.supabase.co/rest/v1/cases')).status).toBe(403);
  expect(fetch).toHaveBeenCalledOnce();
});
it('cannot accept an old account dialog or an outdated consent record', () => {
  const old = captureAccountScope();
  localStorage.setItem('hc_account', JSON.stringify({ id: 'owner-b' }));
  expect(setHealthDataConsent(true, old)).toBe(false);
  localStorage.setItem(
    'hc_health_data_consent_owner-b',
    JSON.stringify({ version: 'old', accountId: 'owner-b', accepted: true })
  );
  expect(hasHealthDataConsent()).toBe(false);
});
it('withdrawal aborts an in-flight transfer and discards a late response', async () => {
  setHealthDataConsent(true);
  let finish: (value: Response) => void = () => {};
  vi.mocked(fetch).mockImplementationOnce(
    (_input, _init) =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const response = guarded('https://example.supabase.co/rest/v1/cases');
  const signal = vi.mocked(fetch).mock.calls[0][1]!.signal!;
  setHealthDataConsent(false);
  expect(signal.aborted).toBe(true);
  finish(new Response('{"health":"late fictional result"}'));
  expect((await response).status).toBe(403);
  expect(healthDataChoice()).toBe(false);
});
it('withdrawal also removes signed-in AI permission without deleting local records', () => {
  setHealthDataConsent(true);
  acceptAIConsent();
  localStorage.setItem('hc_cases_owner-a', '[{"title":"fictional"}]');
  expect(hasAIConsent()).toBe(true);
  setHealthDataConsent(false);
  expect(hasAIConsent()).toBe(false);
  expect(localStorage.getItem('hc_ai_consent_owner-a')).toBeNull();
  expect(localStorage.getItem('hc_cases_owner-a')).toContain('fictional');
});
it('does not let a signed-in choice authorize guest database storage', async () => {
  setHealthDataConsent(true);
  localStorage.setItem('hc_guest_mode', 'true');
  expect((await guarded('https://example.supabase.co/rest/v1/cases')).status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
});
