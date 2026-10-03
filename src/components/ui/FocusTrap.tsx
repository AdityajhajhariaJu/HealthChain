import React, { useEffect, useRef } from 'react';

const activeTraps: HTMLElement[] = [];

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
  const escapeRef = useRef(onEscape);
  const initialFocusTargetRef = useRef(initialFocusRef);
  escapeRef.current = onEscape;
  initialFocusTargetRef.current = initialFocusRef;

  useEffect(() => {
    if (!isActive) return;

    // Capture the trigger element that opened this modal/sheet
    if (document.activeElement instanceof HTMLElement) {
      previouslyFocusedElementRef.current = document.activeElement;
    }

    const root = rootRef.current;
    if (!root) return;
    activeTraps.push(root);
    const isTopTrap = () => activeTraps[activeTraps.length - 1] === root;

    const getFocusable = (): HTMLElement[] => {
      if (!root) return [];
      const nodes = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(nodes).filter((el) => {
        // A fieldset can disable a control without changing its disabled attribute.
        if (el.matches(':disabled')) return false;
        if (el.getAttribute('aria-hidden') === 'true') return false;
        // In real browser, check dimensions; in jsdom/test env allow visible focusable elements
        return (
          el.offsetWidth > 0 ||
          el.offsetHeight > 0 ||
          el.getClientRects().length > 0 ||
          (typeof window !== 'undefined' &&
            !('visualViewport' in window) &&
            !('layoutViewport' in window)) ||
          process.env.NODE_ENV === 'test'
        );
      });
    };

    // Auto-focus initial element
    const timer = window.setTimeout(() => {
      if (!isTopTrap()) return;
      // A person may already have focused an input while the dialog appeared.
      // Keep that focus, and do not restart initialization on every form render.
      if (root.contains(document.activeElement)) return;
      if (initialFocusTargetRef.current?.current) {
        initialFocusTargetRef.current.current.focus();
      } else {
        const focusable = getFocusable();
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTopTrap()) return;
      if (e.key === 'Escape' && escapeRef.current) {
        e.preventDefault();
        e.stopPropagation();
        escapeRef.current();
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
      const index = activeTraps.indexOf(root);
      if (index !== -1) activeTraps.splice(index, 1);
      // Exit animations can finish after a person has already selected another
      // field. Restore the opener only while focus still belongs to this dialog.
      const focused = document.activeElement;
      const focusStillOurs = !focused || focused === document.body || root.contains(focused);
      if (restoreFocus && focusStillOurs && previouslyFocusedElementRef.current) {
        try {
          previouslyFocusedElementRef.current.focus();
        } catch {
          // Ignore if unmounted
        }
      }
    };
  }, [isActive, restoreFocus]);

  return (
    <div ref={rootRef} className={className} style={{ width: '100%', height: '100%', ...style }}>
      {children}
    </div>
  );
}
