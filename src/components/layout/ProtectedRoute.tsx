import React from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const isGuest = localStorage.getItem('hc_guest_mode') === 'true';
      setIsAuthenticated(!!session || isGuest);
    });

    // Listen for session changes (e.g., token expires, user logged out in another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isGuest = localStorage.getItem('hc_guest_mode') === 'true';
      setIsAuthenticated(!!session || isGuest);
    });

    // Re-check when window regains focus (handles session expiry while tab was inactive)
    const onFocus = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const isGuest = localStorage.getItem('hc_guest_mode') === 'true';
        setIsAuthenticated(!!session || isGuest);
      });
    };
    window.addEventListener('focus', onFocus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
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
