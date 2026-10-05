// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
vi.mock('../../services/supabaseClient', () => ({ supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } } }));
vi.mock('../../services/DurableHealthStorage', () => ({ isOwnerErased: () => false }));
vi.mock('../../services/storage', () => ({ getItemSync: (key: string) => localStorage.getItem(key),
  setItemSync: (key: string, value: string) => localStorage.setItem(key, value), removeItemSync: (key: string) => localStorage.removeItem(key) }));
import AIConsentDialog from './AIConsentDialog';
import { resolveAIConsent } from '../../services/AIConsent';
import { fetchWithTimeout } from '../../services/ai/transport';
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('hc_guest_mode', 'true');
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  render(<MemoryRouter><AIConsentDialog /></MemoryRouter>);
});
afterEach(() => { resolveAIConsent(false); cleanup(); vi.unstubAllGlobals(); });
it('displays the provider disclosure and sends no body when permission is declined', async () => {
  const result = fetchWithTimeout('/api/gemini', { method: 'POST', body: '{"health":"synthetic"}' })
    .then(() => 'sent', error => error.message);
  const dialog = await screen.findByRole('dialog', { name: 'Choose whether to use AI' });
  expect(dialog.textContent).toContain('Google Gemini API'); expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  expect(await result).toContain('not given'); expect(fetch).not.toHaveBeenCalled();
});
it('sends the versioned consent header only after an affirmative choice', async () => {
  const result = fetchWithTimeout('/api/gemini', { method: 'POST', body: '{"health":"synthetic"}' });
  await screen.findByRole('dialog'); expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Allow AI processing' }));
  expect((await result).status).toBe(200);
  expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toMatchObject({ 'X-HC-AI-Consent': '2026-10-05-provider-retention' });
});
it('does not authorize the new account from an old account dialog', async () => {
  localStorage.removeItem('hc_guest_mode'); localStorage.setItem('hc_account', JSON.stringify({ id: 'owner-a' }));
  const result = fetchWithTimeout('/api/gemini', { method: 'POST', body: '{}' }).then(() => 'sent', error => error.message);
  await screen.findByRole('dialog');
  localStorage.setItem('hc_account', JSON.stringify({ id: 'owner-b' }));
  fireEvent.click(screen.getByRole('button', { name: 'Allow AI processing' }));
  expect(await result).toContain('not given'); expect(fetch).not.toHaveBeenCalled();
  expect(localStorage.getItem('hc_ai_consent_owner-b')).toBeNull();
});
