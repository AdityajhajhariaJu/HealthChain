import { useEffect, useState } from 'react';

/** Decorative animations stop while paused, hidden, or reduced motion is requested. */
export function useVisualActivity(enabled = true) {
  const [active, setActive] = useState(
    () =>
      document.visibilityState !== 'hidden' &&
      !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const refresh = () => setActive(document.visibilityState !== 'hidden' && !query?.matches);
    refresh();
    document.addEventListener('visibilitychange', refresh);
    if (query?.addEventListener) query.addEventListener('change', refresh);
    else query?.addListener?.(refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      if (query?.removeEventListener) query.removeEventListener('change', refresh);
      else query?.removeListener?.(refresh);
    };
  }, []);
  return enabled && active;
}
