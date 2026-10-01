import { useEffect, useState } from 'react';

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < breakpoint;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      const check = () => setIsMobile(window.innerWidth < breakpoint);
      check();
      window.addEventListener('resize', check, { passive: true });
      return () => window.removeEventListener('resize', check);
    }
    const query = window.matchMedia(`(max-width: ${breakpoint - 0.02}px)`);
    const checkIsMobile = () => setIsMobile(query.matches);
    checkIsMobile();
    if (query.addEventListener) {
      query.addEventListener('change', checkIsMobile);
      return () => query.removeEventListener('change', checkIsMobile);
    }
    query.addListener(checkIsMobile);
    return () => query.removeListener(checkIsMobile);
  }, [breakpoint]);

  return isMobile;
}
