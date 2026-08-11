import React from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    // Check real Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Also allow guest mode bypass if explicitly set
      const isGuest = localStorage.getItem('hc_guest_mode') === 'true';
      setIsAuthenticated(!!session || isGuest);
    });
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
