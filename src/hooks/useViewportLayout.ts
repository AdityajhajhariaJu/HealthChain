import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';

/** Keep every overlay inside the visible area as device orientation or keyboard changes. */
export function useViewportLayout() {
  useEffect(() => {
    const root = document.documentElement;
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    document.body.appendChild(probe);
    let frame = 0;
    const update = () => {
      frame = 0;
      const style = getComputedStyle(probe);
      const top = parseFloat(style.paddingTop) || 0;
      const standalone = matchMedia('(display-mode: standalone)').matches;
      const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const native = Capacitor.isNativePlatform() || (standalone && mobile);
      const viewport = window.visualViewport;
      const unzoomed = !viewport || Math.abs(viewport.scale - 1) < 0.01;
      const compact = String((unzoomed && viewport ? viewport.height : window.innerHeight) < 600);
      if (root.dataset.viewportCompact !== compact) root.dataset.viewportCompact = compact;
      const values: Record<string, string> = {
        '--safe-area-top': String(top || (native ? 44 : 0)) + 'px',
        '--safe-area-bottom': style.paddingBottom,
        '--safe-area-left': style.paddingLeft,
        '--safe-area-right': style.paddingRight,
        '--app-viewport-height':
          String(unzoomed && viewport ? viewport.height : window.innerHeight) + 'px',
        '--app-viewport-top': String(unzoomed && viewport ? viewport.offsetTop : 0) + 'px',
      };
      for (const [key, value] of Object.entries(values))
        if (root.style.getPropertyValue(key) !== value) root.style.setProperty(key, value);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      cancelAnimationFrame(frame);
      probe.remove();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, []);
}
