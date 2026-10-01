import { expect, test } from '@playwright/test';
test('profile conflict review keeps the selected cloud value across the connected profile store', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('hc_guest_mode', 'true'); localStorage.setItem('hc_onboarded', 'true'); localStorage.setItem('hc_product_tour_seen', 'true'); });
  await page.route(/https:\/\//, route => route.abort()); await page.goto('/app/today');
  await page.evaluate(async () => {
    const owner = 'profile-browser-owner'; const base = { id: 'profile_1', profileName: 'Synthetic profile', demographics: { weight: 70 }, medications: [], allergies: [] };
    localStorage.removeItem('hc_guest_mode'); localStorage.setItem('hc_account', JSON.stringify({ id: owner }));
    const local = { ...base, demographics: { weight: 73 } };
    localStorage.setItem(`hc_unified_profile_${owner}`, JSON.stringify({ activeId: 'profile_1', profiles: { profile_1: local } }));
    const { rememberProfileBaseline } = await import('/src/services/ProfileSyncBaseline.ts'); rememberProfileBaseline(owner, 'profile_1', base);
    const { supabase } = await import('/src/services/supabaseClient.ts');
    supabase.auth.getSession = async () => ({ data: { session: { user: { id: owner } } }, error: null }) as any;
    let remote = { ...base, demographics: { weight: 75 } };
    supabase.from = ((table: string) => { const data = table === 'healthchain_profiles' ? { data: remote, updated_at: '2026-10-01T00:00:00Z' } : table === 'profiles' ? null : [];
      const q: any = { select: () => q, eq: () => q, order: () => q, is: () => q, range: () => q, maybeSingle: async () => ({ data, error: null }), then: (resolve: Function) => resolve({ data, error: null }) }; return q;
    }) as any;
    supabase.rpc = (async (name: string, args: any) => { if (name === 'sync_health_profile_snapshot') { remote = args.p_data; return { data: { success: true, data: remote }, error: null }; } return { data: null, error: null }; }) as any;
    const outbox = await import('/src/services/SyncOutbox.ts'); await outbox.enqueueSync('caregiver_profile_upsert', owner, { user_id: owner, profile_id: 'profile_1', data: local }); await outbox.flushSyncOutbox(owner);
  });
  await page.getByRole('button', { name: /Review profile changes/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Review profile changes', exact: true }); await expect(dialog).toBeVisible();
  await dialog.getByRole('radio', { name: /Cloud/ }).check(); await dialog.getByRole('button', { name: 'Save reviewed values' }).click();
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hc_unified_profile_profile-browser-owner')!).profiles.profile_1.demographics.weight)).toBe(75);
});
