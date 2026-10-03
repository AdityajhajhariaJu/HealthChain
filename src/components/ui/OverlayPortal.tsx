import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

let locks = 0;
let restoreScrolling: (() => void) | undefined;

/** Keep page dialogs outside animated/scrolling containers and above app chrome. */
export default function OverlayPortal({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (locks++ === 0) {
      const targets = [document.body, document.getElementById('main-content')].filter(
        (target): target is HTMLElement => !!target
      );
      const previous = targets.map((target) =>
        target.classList.contains('hc-overlay-scroll-locked')
      );
      targets.forEach((target) => target.classList.add('hc-overlay-scroll-locked'));
      restoreScrolling = () => {
        targets.forEach((target, i) =>
          target.classList.toggle('hc-overlay-scroll-locked', previous[i])
        );
      };
    }
    return () => {
      if (--locks === 0) {
        restoreScrolling?.();
        restoreScrolling = undefined;
      }
    };
  }, []);

  return createPortal(<div className="hc-overlay-root">{children}</div>, document.body);
}
