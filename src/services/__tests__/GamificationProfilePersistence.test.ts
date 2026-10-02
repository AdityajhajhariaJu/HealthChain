// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
const memory = vi.hoisted(() => vi.fn());
vi.mock('../HealthMemory', () => ({ recordHealthMemory: memory }));
vi.mock('../supabaseClient', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));
vi.mock('../SyncOutbox', () => ({ enqueueSync: vi.fn(), flushSyncOutbox: vi.fn() }));
beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  localStorage.setItem('hc_guest_mode', 'true');
  memory.mockClear();
  localStorage.setItem(
    'hc_unified_profile_guest',
    JSON.stringify({
      activeId: 'profile_1',
      profiles: {
        profile_1: {
          id: 'profile_1',
          profileName: 'Original',
          points: 73,
          demographics: { name: 'Original', updatedAt: '2026-01-01T00:00:00Z' },
          conditions: [],
          medications: [],
        },
      },
    })
  );
});
it('reads migration without changing the profile and commits rewards without clinical memory writes', async () => {
  const hub = await import('../GamificationHub');
  const updated = vi.fn();
  window.addEventListener('hc_profile_updated', updated);
  expect(hub.getGamificationHub().points).toBe(73);
  expect(updated).not.toHaveBeenCalled();
  expect(memory).not.toHaveBeenCalled();
  expect(hub.tendIsland()).toMatchObject({ saved: true, growth: 3, points: 5 });
  const profile = JSON.parse(localStorage.getItem('hc_unified_profile_guest')!).profiles.profile_1;
  expect(profile.demographics.updatedAt).toBe('2026-01-01T00:00:00Z');
  expect(memory).not.toHaveBeenCalled();
  expect(hub.getGamificationHub().points).toBe(78);
  window.removeEventListener('hc_profile_updated', updated);
});
it('undoing a profile edit retains independent earned growth and durable duplicate prevention', async () => {
  const engine = await import('../ProfileEngine');
  const hub = await import('../GamificationHub');
  const profile = engine.getProfile();
  profile.demographics.name = 'Edited';
  await engine.saveProfile(profile);
  hub.tendIsland();
  expect(engine.canUndo()).toBe(true);
  engine.undoProfileEdit();
  expect(engine.getProfile().demographics.name).toBe('Original');
  expect(hub.getGamificationHub()).toMatchObject({ points: 78, growth: 3, tendedToday: true });
  expect(hub.tendIsland().growth).toBe(0);
});
