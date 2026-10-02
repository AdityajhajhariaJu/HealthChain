import { useEffect, useRef } from 'react';

/** Async UI callbacks must survive Strict Mode's setup/cleanup replay. */
export function useMountedRef() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}
