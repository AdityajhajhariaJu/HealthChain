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
          try { localStorage.setItem('isAuthenticated', 'true'); } catch {}
          return;
        }

        // Check if there is an auth token in multi-tier storage (localStorage, cookie, memory)
        const storedToken = await safariSafeAuthStorage.getItem('healthchain_auth_token');
        const hasStoredToken = Boolean(
          storedToken ||
          (typeof localStorage !== 'undefined' && localStorage.getItem('isAuthenticated') === 'true')
        );

        if (hasStoredToken) {
          // DO NOT manually call refreshSession() here!
          // Supabase's client automatically runs _recoverAndRefresh() on initialization.
          // Calling it manually causes a race condition where two refresh requests are sent simultaneously,
          // triggering Supabase's "Refresh Token Reuse Detection" which immediately revokes the session
          // and logs the user out.
          
          // If we have a stored token but session is null, it means the initial recovery is still pending
          // or the token is valid but offline. We assume authenticated for now to prevent flicker,
          // and the global onAuthStateChange listener in App.tsx will handle the SIGNED_OUT event
          // if the token is truly invalid.
          setIsAuthenticated(true);
          return;
        }

        // Definitely unauthenticated & explicitly rejected by auth server
        try { localStorage.removeItem('isAuthenticated'); } catch {}
        setIsAuthenticated(false);
      } catch (err) {
        if (!isMounted) return;
        // On network error or offline, preserve session if previously logged in
        const stored = await safariSafeAuthStorage.getItem('healthchain_auth_token');
        if (localStorage.getItem('isAuthenticated') === 'true' || stored) {
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
        setIsAuthenticated(true);
        try { localStorage.setItem('isAuthenticated', 'true'); } catch {}
      } else if (event === 'SIGNED_OUT') {
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
