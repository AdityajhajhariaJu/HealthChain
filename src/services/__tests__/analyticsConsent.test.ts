// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const insert = vi.fn();
vi.mock('../supabaseClient', () => ({ supabase: {
  auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  from: vi.fn(() => ({ insert })),
} }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }));
vi.mock('@capacitor/preferences', () => ({ Preferences: {} }));
import { hasAnalyticsConsent, safeAnalyticsPayload, setAnalyticsConsent, trackEvent, trackPurchase } from '../analytics';
describe('private optional product measurement', () => {
  beforeEach(() => {
    localStorage.clear(); insert.mockClear(); window.gtag = vi.fn(); window.fbq = vi.fn();
    insert.mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', insert);
  });
  afterEach(() => vi.unstubAllGlobals());
  it('contacts nothing and creates no identifier before affirmative consent', async () => {
    trackEvent('feature_used', { feature: 'today' });
    await Promise.resolve();
    expect(hasAnalyticsConsent()).toBe(false);
    expect(insert).not.toHaveBeenCalled();
    expect(window.gtag).not.toHaveBeenCalled();
    expect(localStorage.getItem('hc_anon_id')).toBeNull();
  });
  it('honors Global Privacy Control even when an old measurement choice is accepted', () => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
    try {
      localStorage.setItem('hc_cookies_accepted', 'accepted');
      expect(hasAnalyticsConsent()).toBe(false);
      setAnalyticsConsent(true);
      expect(localStorage.getItem('hc_cookies_accepted')).toBe('declined');
      trackEvent('feature_used', { feature: 'today' });
      expect(insert).not.toHaveBeenCalled();
    } finally { Reflect.deleteProperty(navigator, 'globalPrivacyControl'); }
  });
  it('drops sensitive and unknown metadata even after consent', async () => {
    setAnalyticsConsent(true);
    trackEvent('feature_used', { feature: 'daily_checkin', symptom: 'headache', severity: 'severe',
      score: 5, email: 'person@example.test', document: 'Private record', nested: { diagnosis: 'private' } });
    await vi.waitFor(() => expect(insert).toHaveBeenCalledOnce());
    expect(JSON.parse(insert.mock.calls[0][1].body)).toEqual({ event: 'feature_used', dimension: 'workspace', platform: 'web' });
    expect(window.gtag).not.toHaveBeenCalled();
    expect(window.fbq).not.toHaveBeenCalled();
  });
  it('ignores free text, raw prompt events, record identifiers and invalid payment values', () => {
    expect(safeAnalyticsPayload('button_click', { button: 'Private symptom label' })).toBeNull();
    expect(safeAnalyticsPayload('chat_prompt', { message: 'Private health message' })).toBeNull();
    expect(safeAnalyticsPayload('feature_used', { feature: 'private-person' })).toBeNull();
    expect(safeAnalyticsPayload('page_view', { path: '/app/cases/record-123?email=private' })).toEqual({ dimension: 'workspace' });
    expect(safeAnalyticsPayload('purchase', { value: NaN })).toBeNull();
  });
  it('does not dispatch a queued event after consent withdrawal', async () => {
    setAnalyticsConsent(true);
    trackEvent('feature_used', { feature: 'today' });
    setAnalyticsConsent(false);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(insert).not.toHaveBeenCalled();
  });
  it.each([null, 'declined'])('does not send purchase events with consent %s', async choice => {
    if (choice) localStorage.setItem('hc_cookies_accepted', choice);
    trackPurchase(499, 'pro'); await Promise.resolve();
    expect(insert).not.toHaveBeenCalled(); expect(window.gtag).not.toHaveBeenCalled();
  });
  it('sends only an aggregate checkout category without amount, plan or account details', async () => {
    setAnalyticsConsent(true); trackPurchase(499, 'pro');
    await vi.waitFor(() => expect(insert).toHaveBeenCalledOnce());
    expect(JSON.parse(insert.mock.calls[0][1].body)).toEqual({ event: 'purchase', dimension: 'web_checkout', platform: 'web' });
    expect(insert.mock.calls[0][1].credentials).toBe('omit');
    expect(insert.mock.calls[0][1].referrerPolicy).toBe('no-referrer');
    expect(window.gtag).not.toHaveBeenCalled();
  });
  it('requires a fresh choice instead of reusing the old accepted disclosure', () => {
    localStorage.setItem('hc_cookies_accepted', 'accepted');
    expect(hasAnalyticsConsent()).toBe(false);
    trackEvent('page_view', { path: '/' });
    expect(insert).not.toHaveBeenCalled();
  });
  it('aborts a dispatched measurement when permission is withdrawn', async () => {
    insert.mockImplementationOnce(() => new Promise(() => {}));
    setAnalyticsConsent(true); trackEvent('audio_action', { action: 'playing', title: 'Private selection' });
    await vi.waitFor(() => expect(insert).toHaveBeenCalledOnce());
    const signal = insert.mock.calls[0][1].signal;
    expect(signal.aborted).toBe(false);
    setAnalyticsConsent(false);
    expect(signal.aborted).toBe(true);
  });
  it('discards a pending event when the account changes before dispatch', async () => {
    setAnalyticsConsent(true); trackEvent('page_view', { path: '/' });
    localStorage.setItem('hc_account', JSON.stringify({ id: 'different-owner' }));
    await Promise.resolve();
    expect(insert).not.toHaveBeenCalled();
  });
});
