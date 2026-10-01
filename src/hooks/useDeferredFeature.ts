import { useEffect, useState } from 'react';

/** Load a tool on its first opening, then retain its draft state until the parent leaves. */
export function useDeferredFeature(isOpen: boolean): boolean {
  const [hasOpened, setHasOpened] = useState(isOpen);
  useEffect(() => {
    if (isOpen) setHasOpened(true);
  }, [isOpen]);
  return isOpen || hasOpened;
}
