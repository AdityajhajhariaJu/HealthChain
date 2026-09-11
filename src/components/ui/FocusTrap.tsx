import React, { useEffect, useRef } from 'react';

interface FocusTrapProps {
  children: React.ReactNode;
  isActive?: boolean;
  onEscape?: () => void;
  restoreFocus?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  style?: React.CSSProperties;
}

export default function FocusTrap({
  children,
  isActive = true,
  onEscape,
  restoreFocus = true,
  initialFocusRef,
  className,
  style,
}: FocusTrapProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Capture the trigger element that opened this modal/sheet
    if (document.activeElement instanceof HTMLElement) {
      previouslyFocusedElementRef.current = document.activeElement;
    }

    const root = rootRef.current;
    if (!root) return;

    const getFocusable = (): HTMLElement[] => {
      if (!root) return [];
      const nodes = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(nodes).filter((el) => {
        // Must be visible and not aria-hidden
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
      });
    };

    // Auto-focus initial element
    const timer = window.setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        const focusable = getFocusable();
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        e.stopPropagation();
        onEscape();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = getFocusable();
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !root.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !root.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      if (restoreFocus && previouslyFocusedElementRef.current) {
        try {
          previouslyFocusedElementRef.current.focus();
        } catch {
          // Ignore if unmounted
        }
      }
    };
  }, [isActive, onEscape, restoreFocus, initialFocusRef]);

  return (
    <div ref={rootRef} className={className} style={{ width: '100%', height: '100%', ...style }}>
      {children}
    </div>
  );
}
