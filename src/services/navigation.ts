import { NavigateFunction } from 'react-router-dom';
import { getItemSync } from './storage';

/**
 * Safely navigates back to the previous page in history if available.
 * If there is no previous history (e.g. direct URL entry, refresh, redirect replacement),
 * it safely falls back to the specified fallback route (or checks authentication).
 */
export function safeNavigateBack(
  navigate: NavigateFunction,
  fallbackUrl?: string
): void {
  const hasHistory =
    typeof window !== 'undefined' &&
    window.history.state &&
    typeof window.history.state.idx === 'number' &&
    window.history.state.idx > 0;

  if (hasHistory) {
    navigate(-1);
    return;
  }

  if (fallbackUrl) {
    navigate(fallbackUrl, { replace: true });
    return;
  }

  const isAuth = getItemSync('isAuthenticated') === 'true';
  navigate(isAuth ? '/app/today' : '/', { replace: true });
}
