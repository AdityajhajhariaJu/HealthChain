import React from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { safariSafeAuthStorage } from '../../services/safariSafeAuthStorage';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(() => {
    try {
      if (localStorage.getItem('hc_guest_mode') === 'true') return true;
      if (localStorage.getItem('isAuthenticated') === 'true') return true;
    } catch {}
    return null;
  });

  // Track the last SIGNED_IN timestamp so we can debounce false SIGNED_OUT events.
  // This mirrors the same debounce logic in App.tsx.
  const lastSignedInRef = React.useRef<number>(
    (() => {
      try {
        return localStorage.getItem('isAuthenticated') === 'true' ? Date.now() : 0;
      } catch {
        return 0;
      }
    })()
  );

  React.useEffect(() => {
    let isMounted = true;
    let isGuest = false;
    try { isGuest = localStorage.getItem('hc_guest_mode') === 'true'; } catch (e) {}
    if (isGuest) {
      setIsAuthenticated(true);
      return;
    }

    async function checkAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (session) {
          setIsAuthenticated(true);
          lastSignedInRef.current = Date.now();
          try { localStorage.setItem('isAuthenticated', 'true'); } catch {}
          return;
        }

        const getAuthFlag = () => {
          try {
            return typeof localStorage !== 'undefined' && localStorage.getItem('isAuthenticated') === 'true';
          } catch {
            return false;
          }
        };

        // Check if there is an auth token in multi-tier storage (localStorage, cookie, memory)
        const storedToken = await safariSafeAuthStorage.getItem('healthchain_auth_token');
        const hasStoredToken = Boolean(
          storedToken || getAuthFlag()
        );

        // Also check if there's a PKCE code in the URL — if so, Supabase is about to
        // exchange it for a session. Do NOT declare unauthenticated yet.
        const urlHasAuthCode = window.location.search.includes('code=') ||
          window.location.hash.includes('access_token=');

        if (hasStoredToken || urlHasAuthCode) {
          // Session recovery or PKCE exchange is still in progress.
          // Assume authenticated to prevent redirect flicker.
          // The onAuthStateChange listener below will correct this if the token is truly invalid.
          setIsAuthenticated(true);
          return;
        }

        // Definitely unauthenticated & no pending auth flow
        try { localStorage.removeItem('isAuthenticated'); } catch {}
        setIsAuthenticated(false);
      } catch (err) {
        if (!isMounted) return;
        // On network error or offline, preserve session if previously logged in
        const stored = await safariSafeAuthStorage.getItem('healthchain_auth_token');
        const fallbackAuthFlag = (() => { try { return localStorage.getItem('isAuthenticated') === 'true'; } catch { return false; }})();
        if (fallbackAuthFlag || stored) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      }
    }

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || (event === 'INITIAL_SESSION' && session)) {
        lastSignedInRef.current = Date.now();
        setIsAuthenticated(true);
        try { localStorage.setItem('isAuthenticated', 'true'); } catch {}
      } else if (event === 'SIGNED_OUT') {
        // CRITICAL: Debounce false SIGNED_OUT events that race with a fresh SIGNED_IN.
        // Supabase can fire a spurious SIGNED_OUT during PKCE exchange or when
        // _recoverAndRefresh encounters stale storage. If a SIGNED_IN occurred
        // within the last 8 seconds, this SIGNED_OUT is almost certainly a false
        // positive — ignore it. The App.tsx global listener has the same debounce.
        if (Date.now() - lastSignedInRef.current < 8000) {
          console.warn('[ProtectedRoute] Ignoring SIGNED_OUT that raced with recent SIGNED_IN');
          return;
        }
        try { localStorage.removeItem('isAuthenticated'); } catch {}
        setIsAuthenticated(false);
      }
    });

    // Re-validate when window regains focus or tab is reopened without abruptly kicking out
    const onWake = () => {
      if (isGuest || !isMounted) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;
        if (session) {
          setIsAuthenticated(true);
          try { localStorage.setItem('isAuthenticated', 'true'); } catch {}
        }
      }).catch(() => {
        // Do not kick out on wake error - allow background auto-refresh
      });
    };

    window.addEventListener('focus', onWake);
    window.addEventListener('pageshow', onWake);
    window.addEventListener('hc_auth_storage_restored', onWake);
    document.addEventListener('visibilitychange', onWake);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', onWake);
      window.removeEventListener('pageshow', onWake);
      window.removeEventListener('hc_auth_storage_restored', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
