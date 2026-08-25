import { useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';

/**
 * Dedicated OAuth callback handler.
 * 
 * This component renders at /auth/callback — the URL that Google (and other
 * OAuth providers) redirect to after authentication. Its ONLY job is to:
 * 
 * 1. Show a spinner while Supabase exchanges the PKCE ?code= for a session
 * 2. Redirect to /app once the session is established
 * 3. Redirect to /login if the exchange fails after a timeout
 * 
 * By isolating the callback into its own route, we completely avoid the race
 * conditions that occurred when the Landing page was the callback URL.
 */
export default function AuthCallback() {
  const handled = useRef(false);

  useEffect(() => {
    // Safety timeout: if the auth exchange doesn't complete within 10 seconds,
    // redirect to /login so the user isn't stuck on a spinner forever.
    const timeout = setTimeout(() => {
      if (!handled.current) {
        console.warn('[AuthCallback] Timed out waiting for auth exchange');
        window.location.replace('/login');
      }
    }, 10000);

    // Check if session is already active immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !handled.current) {
        handled.current = true;
        clearTimeout(timeout);
        console.log('[AuthCallback] Session already active, redirecting to /app');
        window.location.replace('/app');
      }
    }).catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (handled.current) return;

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || (event === 'INITIAL_SESSION' && session)) && session) {
        handled.current = true;
        clearTimeout(timeout);
        console.log('[AuthCallback] Session established, redirecting to /app');
        // Hard redirect — cannot be swallowed by React lifecycle
        window.location.replace('/app');
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0f1e',
      color: '#10b981',
      fontFamily: 'system-ui, sans-serif',
      gap: '16px',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid rgba(16, 185, 129, 0.2)',
        borderTopColor: '#10b981',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#94a3b8', fontSize: '14px' }}>Completing sign in...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
