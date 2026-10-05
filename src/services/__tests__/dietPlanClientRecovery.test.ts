// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../AIConsent', () => ({ requestAIConsent: async () => {}, hasAIConsent: () => true, AI_CONSENT_VERSION: '2026-10-05-provider-retention' }));
import { webcrypto } from 'node:crypto';

vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'test-token', user: { id: 'account-a' } } } })) } } }));
import { generateMealPlan, hasPendingDietPlanRequest } from '../geminiService';
import { getTrialStatus, recordTrialUsage } from '../TrialEngine';

const profile = { age: 28, gender: 'male', targetCalories: 2114, cuisine: 'North Indian', mealSchedule: '5 Small Meals', goal: 'Maintain' };
const storageKey = 'hc_diet_plan_pending_v1:account-a:profile_1';
const validResponse = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ plan: [{ day: 1 }] }) }] } }] }), { status: 200 });

describe('meal plan transport and recovery', () => {
  beforeEach(() => { localStorage.clear(); vi.stubGlobal('crypto', webcrypto); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('keeps the free-trial display bounded when a saved plan is recovered or corrected', () => {
    recordTrialUsage('dietician');
    recordTrialUsage('dietician');
    expect(getTrialStatus().dietician).toMatchObject({ used: 1, total: 1, remaining: 0 });
  });

  it('shows a terminal generation failure without retrying it or keeping a dead recovery key', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: 'Incomplete week', reason: 'meal_plan_truncated', requestState: 'failed' }), { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(generateMealPlan(profile, 7, 'profile_1')).rejects.toThrow('diet_plan_incomplete');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it('recovers a previously failed request with a fresh ID in the same user action', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => validResponse()));
    await generateMealPlan(profile, 7, 'profile_1');
    const previousId = JSON.parse(localStorage.getItem(storageKey)!).id;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ reason: 'request_failed' }), { status: 409 }))
      .mockResolvedValueOnce(validResponse());
    vi.stubGlobal('fetch', fetchMock);
    await expect(generateMealPlan(profile, 7, 'profile_1')).resolves.toHaveProperty('plan');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].headers['X-HC-Request-Id']).toBe(previousId);
    expect(fetchMock.mock.calls[1][1].headers['X-HC-Request-Id']).not.toBe(previousId);
  });

  it('preserves the original request after a transport timeout for safe replay', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('Timed out', 'AbortError'); }));
    await expect(generateMealPlan(profile, 7, 'profile_1')).rejects.toThrow('diet_plan_not_received');
    expect(await hasPendingDietPlanRequest(profile, 'profile_1')).toBe(true);
    const pendingId = JSON.parse(localStorage.getItem(storageKey)!).id;
    const fetchMock = vi.fn().mockResolvedValue(validResponse());
    vi.stubGlobal('fetch', fetchMock);
    await generateMealPlan(profile, 7, 'profile_1');
    expect(fetchMock.mock.calls[0][1].headers['X-HC-Request-Id']).toBe(pendingId);
  });

  it('sends location and starts a distinct request when the region changes', async () => {
    const fetchMock = vi.fn(async (_input: any, _init: any) => validResponse());
    vi.stubGlobal('fetch', fetchMock);
    const localProfile = { ...profile, cuisine: 'Local', countryCode: 'JP', region: 'Osaka' };
    await generateMealPlan(localProfile, 7, 'profile_1');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.dietPlanRequest).toMatchObject({ cuisine: 'Local', countryCode: 'JP', region: 'Osaka' });
    await generateMealPlan({ ...localProfile, region: 'Tokyo' }, 7, 'profile_1');
    expect(fetchMock.mock.calls[1][1].headers['X-HC-Request-Id']).not.toBe(fetchMock.mock.calls[0][1].headers['X-HC-Request-Id']);
  });
});
