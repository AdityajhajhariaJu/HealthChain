// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import OverlayPortal from './OverlayPortal';

afterEach(() => {
  cleanup();
  document.getElementById('main-content')?.remove();
  document.body.style.overflow = '';
});

it('escapes a transformed page and restores its existing scrolling styles', () => {
  const main = document.createElement('main');
  main.id = 'main-content';
  main.style.transform = 'translateZ(0)';
  main.style.overflow = 'auto';
  document.body.style.overflow = 'clip';
  document.body.append(main);
  const view = render(
    <OverlayPortal>
      <button>Dialog action</button>
    </OverlayPortal>,
    { container: main }
  );
  expect(screen.getByRole('button').closest('#main-content')).toBeNull();
  expect(main.classList.contains('hc-overlay-scroll-locked')).toBe(true);
  expect(document.body.classList.contains('hc-overlay-scroll-locked')).toBe(true);
  view.unmount();
  expect(main.style.overflow).toBe('auto');
  expect(document.body.style.overflow).toBe('clip');
  expect(main.classList.contains('hc-overlay-scroll-locked')).toBe(false);
});

it('keeps the page locked until the last nested dialog closes', () => {
  const main = document.createElement('main');
  main.id = 'main-content';
  main.style.overflow = 'auto';
  document.body.append(main);
  const parent = render(
    <OverlayPortal>
      <p>Parent dialog</p>
    </OverlayPortal>
  );
  const child = render(
    <OverlayPortal>
      <p>Child dialog</p>
    </OverlayPortal>
  );
  parent.unmount();
  expect(main.classList.contains('hc-overlay-scroll-locked')).toBe(true);
  child.unmount();
  expect(main.style.overflow).toBe('auto');
  expect(document.body.style.overflow).toBe('');
  expect(main.classList.contains('hc-overlay-scroll-locked')).toBe(false);
});
