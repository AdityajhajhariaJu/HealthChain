/**
 * Accessibility (a11y) live announcement utility.
 * Delivers screen-reader notifications for status changes, saving events, and errors.
 */

export type AnnouncementPriority = 'polite' | 'assertive';

export function announceToScreenReader(message: string, priority: AnnouncementPriority = 'polite'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const liveRegion = document.getElementById('a11y-live-region');
  if (liveRegion) {
    liveRegion.setAttribute('aria-live', priority);
    // Clearing text briefly triggers screen-readers to re-announce identical consecutive strings
    liveRegion.textContent = '';
    window.setTimeout(() => {
      liveRegion.textContent = message;
    }, 50);
  }

  // Also dispatch custom DOM event for testing or sub-components
  window.dispatchEvent(
    new CustomEvent('hc_a11y_announced', {
      detail: { message, priority },
    })
  );
}

// Global listener for cross-component announcement dispatch
if (typeof window !== 'undefined') {
  window.addEventListener('hc_a11y_announce', (e: Event) => {
    const detail = (e as CustomEvent)?.detail;
    if (detail?.message) {
      announceToScreenReader(detail.message, detail.priority || 'polite');
    }
  });
}
