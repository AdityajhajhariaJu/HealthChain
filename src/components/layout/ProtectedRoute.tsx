import React from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

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

        // If no session but local storage had authenticated flag, attempt auto-refresh
        if (localStorage.getItem('isAuthenticated') === 'true') {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!isMounted) return;
          if (!refreshError && refreshData?.session) {
            setIsAuthenticated(true);
            return;
          }
        }

        // Definitely unauthenticated
        try { localStorage.removeItem('isAuthenticated'); } catch {}
        setIsAuthenticated(false);
      } catch (err) {
        if (!isMounted) return;
        // On network error or offline, preserve session if previously logged in
        if (localStorage.getItem('isAuthenticated') === 'true') {
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

    // Re-validate when window regains focus without abruptly kicking out
    const onFocus = () => {
      if (isGuest || !isMounted) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;
        if (session) {
          setIsAuthenticated(true);
          try { localStorage.setItem('isAuthenticated', 'true'); } catch {}
        }
      }).catch(() => {
        // Do not kick out on focus error - allow background auto-refresh
      });
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
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
