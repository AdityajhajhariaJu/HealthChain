// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
const insert = vi.fn();
vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) }, from: vi.fn(() => ({ insert })) } }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }));
import { hasAnalyticsConsent, trackEvent } from '../analytics';

describe('optional analytics consent', () => {
  beforeEach(() => { localStorage.clear(); insert.mockClear(); window.gtag = vi.fn(); window.fbq = vi.fn(); });
  it('does not create an identifier or contact analytics before opt-in', async () => {
    trackEvent('chat_prompt', { inputLength: 50 });
    await Promise.resolve();
    expect(hasAnalyticsConsent()).toBe(false);
    expect(localStorage.getItem('hc_anon_id')).toBeNull();
    expect(window.gtag).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
  it('allows analytics after explicit acceptance', async () => {
    localStorage.setItem('hc_cookies_accepted', 'accepted');
    trackEvent('feature_used', { feature: 'today' });
    await Promise.resolve();
    await Promise.resolve();
    expect(window.gtag).toHaveBeenCalled();
    expect(insert).toHaveBeenCalled();
  });
});
