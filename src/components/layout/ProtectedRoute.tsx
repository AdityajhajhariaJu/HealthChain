import React from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { safariSafeAuthStorage } from '../../services/safariSafeAuthStorage';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(() => {
    try {
      if (localStorage.getItem('hc_guest_mode') === 'true') return true;
      if (localStorage.getItem('isAuthenticated') === 'true') return true;
      if (safariSafeAuthStorage.getItem('healthchain_auth_token')) return true;
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
        const hasStoredToken = Boolean(
          safariSafeAuthStorage.getItem('healthchain_auth_token') ||
          (typeof localStorage !== 'undefined' && localStorage.getItem('isAuthenticated') === 'true')
        );

        if (hasStoredToken) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!isMounted) return;
          if (!refreshError && refreshData?.session) {
            setIsAuthenticated(true);
            try { localStorage.setItem('isAuthenticated', 'true'); } catch {}
            return;
          }

          // If refresh failed due to network / sleeping tab (not an explicit invalid token rejection),
          // preserve authenticated state so Safari reopening a background tab doesn't kick the user out!
          const isExplicitAuthRejection =
            refreshError?.message?.includes('invalid_grant') ||
            refreshError?.message?.includes('refresh_token_not_found') ||
            refreshError?.message?.includes('User from sub claim in JWT does not exist');

          if (!isExplicitAuthRejection) {
            // Transient offline / sleep-wake state -> preserve access
            setIsAuthenticated(true);
            return;
          }
        }

        // Definitely unauthenticated & explicitly rejected by auth server
        try { localStorage.removeItem('isAuthenticated'); } catch {}
        setIsAuthenticated(false);
      } catch (err) {
        if (!isMounted) return;
        // On network error or offline, preserve session if previously logged in
        if (localStorage.getItem('isAuthenticated') === 'true' || safariSafeAuthStorage.getItem('healthchain_auth_token')) {
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
