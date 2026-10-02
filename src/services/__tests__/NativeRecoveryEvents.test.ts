// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  native: true,
  appListeners: new Map<string, (event: any) => void>(),
  networkListener: undefined as ((event: { connected: boolean }) => void) | undefined,
  recover: vi.fn(async () => {}),
  registerNetwork: vi.fn(async (_name: string, callback: any) => {
    state.networkListener = callback;
    return { remove: async () => {} };
  }),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => state.native, getPlatform: () => 'android' },
}));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: async (name: string, callback: any) => {
      state.appListeners.set(name, callback);
      return { remove: async () => {} };
    },
  },
}));
vi.mock('@capacitor/network', () => ({ Network: { addListener: state.registerNetwork } }));
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: { setResizeMode: async () => {} },
  KeyboardResize: { Body: 'body' },
}));
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide: async () => {} } }));
vi.mock('../AccountRecovery', () => ({ requestAccountRecovery: state.recover }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  state.native = true;
  state.appListeners.clear();
  state.networkListener = undefined;
});

it('recovers a foreground native reconnect without relying on a browser online event', async () => {
  const { initNativeLifecycle } = await import('../NativeLifecycle');
  initNativeLifecycle();
  initNativeLifecycle();
  expect(state.registerNetwork).toHaveBeenCalledOnce();
  state.networkListener!({ connected: false });
  state.appListeners.get('appStateChange')!({ isActive: false });
  expect(state.recover).not.toHaveBeenCalled();
  state.networkListener!({ connected: true });
  state.appListeners.get('appStateChange')!({ isActive: true });
  expect(state.recover).toHaveBeenCalledTimes(2);
});

it('leaves browser connectivity to the account runtime rather than registering native recovery', async () => {
  state.native = false;
  const { initNativeLifecycle } = await import('../NativeLifecycle');
  initNativeLifecycle();
  expect(state.registerNetwork).not.toHaveBeenCalled();
  expect(state.appListeners.size).toBe(0);
});
