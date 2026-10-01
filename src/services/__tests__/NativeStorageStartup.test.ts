// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({
  keys: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android' } }));
vi.mock('@capacitor/preferences', () => ({ Preferences: native }));
vi.mock('../DurableHealthStorage', () => ({ isErasedStorageKey: () => false }));
import { clearSync, flushNativeStorage, setItemSync, syncStorageFromPreferences } from '../storage';
beforeEach(async () => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  native.keys.mockResolvedValue({ keys: [] });
  native.set.mockResolvedValue({});
  native.clear.mockResolvedValue({});
  localStorage.clear();
  await flushNativeStorage();
});
afterEach(async () => {
  await flushNativeStorage();
  vi.useRealTimers();
});

it('bounds the complete restore when a value read stalls and ignores its late answer', async () => {
  let finish!: (value: { value: string }) => void;
  native.keys.mockResolvedValue({ keys: ['hc_test'] });
  native.get.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const restore = syncStorageFromPreferences();
  await vi.advanceTimersByTimeAsync(2001);
  await restore;
  finish({ value: 'late' });
  await Promise.resolve();
  await Promise.resolve();
  expect(localStorage.getItem('hc_test')).toBeNull();
});
it('bounds a stalled keys request', async () => {
  native.keys.mockImplementation(() => new Promise(() => {}));
  const restore = syncStorageFromPreferences();
  await vi.advanceTimersByTimeAsync(2001);
  await restore;
  expect(native.get).not.toHaveBeenCalled();
});
it('does not overwrite an edit made while restoring native preferences', async () => {
  let finish!: (value: { value: string }) => void;
  native.keys.mockResolvedValue({ keys: ['hc_test'] });
  native.get.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const restore = syncStorageFromPreferences();
  await vi.advanceTimersByTimeAsync(0);
  setItemSync('hc_test', 'edited');
  finish({ value: 'older' });
  await restore;
  expect(localStorage.getItem('hc_test')).toBe('edited');
});
it('does not revive preferences after a clear during restore', async () => {
  let finish!: (value: { value: string }) => void;
  native.keys.mockResolvedValue({ keys: ['hc_test'] });
  native.get.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const restore = syncStorageFromPreferences();
  await vi.advanceTimersByTimeAsync(0);
  clearSync();
  finish({ value: 'old' });
  await restore;
  expect(localStorage.getItem('hc_test')).toBeNull();
});
it('serializes clear between earlier and later native writes exactly once', async () => {
  const actions: string[] = [];
  native.set.mockImplementation(async ({ value }) => {
    actions.push(value);
  });
  native.clear.mockImplementation(async () => {
    actions.push('clear');
  });
  setItemSync('hc_test', 'before');
  clearSync();
  setItemSync('hc_test', 'after');
  await flushNativeStorage();
  expect(actions).toEqual(['before', 'clear', 'after']);
});
it('restores many preferences with bounded parallel bridge reads', async () => {
  native.keys.mockResolvedValue({ keys: Array.from({ length: 20 }, (_, n) => `hc_test_${n}`) });
  let active = 0;
  let maximum = 0;
  native.get.mockImplementation(async ({ key }) => {
    active++;
    maximum = Math.max(maximum, active);
    await Promise.resolve();
    active--;
    return { value: key };
  });
  await syncStorageFromPreferences();
  expect(maximum).toBeLessThanOrEqual(8);
  expect(maximum).toBeGreaterThan(1);
  expect(localStorage.getItem('hc_test_19')).toBe('hc_test_19');
});
