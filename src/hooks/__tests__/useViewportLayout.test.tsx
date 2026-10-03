// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useViewportLayout } from '../useViewportLayout';

const platform = vi.hoisted(() => ({ native: false }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => platform.native },
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('style');
  delete document.documentElement.dataset.viewportCompact;
  platform.native = false;
});
const initialize = () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const viewport = Object.assign(new EventTarget(), {
    height: 844,
    offsetTop: 0,
    scale: 1,
  });
  vi.stubGlobal('visualViewport', viewport);
  let scheduled: FrameRequestCallback | undefined;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    scheduled = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  return {
    viewport,
    flush: () =>
      act(() => {
        const cb = scheduled;
        scheduled = undefined;
        cb?.(0);
      }),
  };
};

it('uses the native safe-top fallback while ordinary browsers keep their measured zero inset', () => {
  initialize();
  const browser = renderHook(() => useViewportLayout());
  expect(document.documentElement.style.getPropertyValue('--safe-area-top')).toBe('0px');
  browser.unmount();
  platform.native = true;
  renderHook(() => useViewportLayout());
  expect(document.documentElement.style.getPropertyValue('--safe-area-top')).toBe('44px');
});

it('shrinks to the visible keyboard area and tracks its offset without waiting for a layout resize', () => {
  const { viewport, flush } = initialize();
  renderHook(() => useViewportLayout());
  expect(document.documentElement.style.getPropertyValue('--app-viewport-height')).toBe('844px');
  viewport.height = 420;
  viewport.offsetTop = 18;
  viewport.dispatchEvent(new Event('resize'));
  viewport.dispatchEvent(new Event('scroll'));
  flush();
  expect(document.documentElement.style.getPropertyValue('--app-viewport-height')).toBe('420px');
  expect(document.documentElement.style.getPropertyValue('--app-viewport-top')).toBe('18px');
  expect(document.documentElement.dataset.viewportCompact).toBe('true');
  viewport.height = 844;
  viewport.offsetTop = 0;
  viewport.dispatchEvent(new Event('resize'));
  flush();
  expect(document.documentElement.dataset.viewportCompact).toBe('false');
});

it('preserves layout space during pinch zoom and removes viewport listeners on unmount', () => {
  const { viewport, flush } = initialize(),
    remove = vi.spyOn(viewport, 'removeEventListener');
  const { unmount } = renderHook(() => useViewportLayout());
  viewport.scale = 2;
  viewport.height = 300;
  viewport.offsetTop = 40;
  viewport.dispatchEvent(new Event('resize'));
  flush();
  expect(document.documentElement.style.getPropertyValue('--app-viewport-height')).toBe(
    `${window.innerHeight}px`,
  );
  expect(document.documentElement.style.getPropertyValue('--app-viewport-top')).toBe('0px');
  unmount();
  expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  expect(document.body.querySelector('[style*="safe-area-inset"]')).toBeNull();
});
