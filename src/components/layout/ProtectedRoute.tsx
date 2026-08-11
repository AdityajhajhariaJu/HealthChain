import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Check if they are authenticated (either guest mode or true Supabase session)
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  if (!isAuthenticated) {
    // Redirect them to the landing/login page
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
