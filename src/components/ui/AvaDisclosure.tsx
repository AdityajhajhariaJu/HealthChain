import { useState, type CSSProperties, type ReactNode } from 'react';
import { captureAccountScope } from '../../services/AccountScope';

/** A card's expansion belongs to its original message and account. */
export function AvaDisclosure({
  storageId,
  initiallyOpen = false,
  children,
  style,
}: {
  storageId?: string;
  initiallyOpen?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const owner = captureAccountScope();
  const key = storageId
    ? 'hc_ava_disclosure_' + owner.accountId + '_' + owner.profileId + '_' + storageId
    : null;
  const [open, setOpen] = useState(() => {
    try {
      const value = key ? sessionStorage.getItem(key) : null;
      return value === null ? initiallyOpen : value === 'open';
    } catch {
      return initiallyOpen;
    }
  });
  return (
    <details
      open={open}
      style={style}
      onClickCapture={(event) => {
        const summary = (event.target as HTMLElement).closest('summary');
        if (summary?.parentElement !== event.currentTarget) return;
        event.preventDefault();
        const expanded = !event.currentTarget.open;
        setOpen(expanded);
        try {
          if (key) sessionStorage.setItem(key, expanded ? 'open' : 'closed');
        } catch {}
      }}
      onToggle={(event) => {
        const expanded = event.currentTarget.open;
        setOpen(expanded);
        try {
          if (key) sessionStorage.setItem(key, expanded ? 'open' : 'closed');
        } catch {}
      }}
    >
      {children}
    </details>
  );
}
