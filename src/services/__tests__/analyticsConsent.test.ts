// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
const insert = vi.fn();
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn(() => ({ insert })),
  },
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }));
import { hasAnalyticsConsent, trackEvent, trackPurchase } from '../analytics';

describe('optional analytics consent', () => {
  beforeEach(() => {
    localStorage.clear();
    insert.mockClear();
    window.gtag = vi.fn();
    window.fbq = vi.fn();
  });
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
    await vi.waitFor(() => expect(insert).toHaveBeenCalled());
  });
  it.each([null, 'declined'])(
    'does not send purchase conversions with consent %s',
    async (consent) => {
      if (consent) localStorage.setItem('hc_cookies_accepted', consent);
      trackPurchase(499, 'pro');
      await Promise.resolve();
      expect(window.gtag).not.toHaveBeenCalled();
      expect(insert).not.toHaveBeenCalled();
      expect(localStorage.getItem('hc_anon_id')).toBeNull();
    }
  );
  it('retains purchase conversion tracking after acceptance', () => {
    localStorage.setItem('hc_cookies_accepted', 'accepted');
    trackPurchase(499, 'pro');
    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'conversion',
      expect.objectContaining({
        send_to: 'AW-18407555330/FYfpCI65uOccEIKCtMlE',
        value: 499,
        currency: 'INR',
      })
    );
  });
});
