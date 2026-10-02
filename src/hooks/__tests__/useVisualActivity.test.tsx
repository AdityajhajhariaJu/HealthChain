// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useVisualActivity } from '../useVisualActivity';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('stops decorative animation for reduced motion, background pages and paused media', () => {
  let hidden = false;
  const query = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => query);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
    hidden ? 'hidden' : 'visible'
  );
  const { result, rerender, unmount } = renderHook(({ playing }) => useVisualActivity(playing), {
    initialProps: { playing: true },
  });
  expect(result.current).toBe(true);
  act(() => {
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(result.current).toBe(false);
  act(() => {
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(result.current).toBe(true);
  act(() => {
    query.matches = true;
    query.addEventListener.mock.calls[0][1]();
  });
  expect(result.current).toBe(false);
  act(() => {
    query.matches = false;
    query.addEventListener.mock.calls[0][1]();
  });
  rerender({ playing: false });
  expect(result.current).toBe(false);
  unmount();
  expect(query.removeEventListener).toHaveBeenCalled();
});
