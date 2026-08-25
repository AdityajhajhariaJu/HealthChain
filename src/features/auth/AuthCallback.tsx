import { useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';

/**
 * High-reliability OAuth callback handler.
 * Supports:
 * 1. PKCE Authorization Code Flow (?code=...) via explicit exchange + automatic exchange
 * 2. Implicit Flow (#access_token=...&refresh_token=...) via direct setSession
 * 3. Pre-existing active session check
 * 4. onAuthStateChange event stream
 */
export default function AuthCallback() {
  const handled = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const navigateSuccess = () => {
      if (handled.current || !isMounted) return;
      handled.current = true;
      try {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.removeItem('hc_guest_mode');
      } catch (e) {}
      console.log('[AuthCallback] Session confirmed, routing to /app');
      window.location.replace('/app');
    };

    const navigateFailure = (reason: string) => {
      if (handled.current || !isMounted) return;
      handled.current = true;
      console.warn('[AuthCallback] Auth failed:', reason);
      window.location.replace('/login');
    };

    // Safety timeout: 12 seconds max before redirecting to login
    const timeout = setTimeout(() => {
      navigateFailure('Auth callback timed out');
    }, 12000);

    async function processAuth() {
      try {
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
        const hashParams = new URLSearchParams(hash);

        // Check for error in callback
        const error = searchParams.get('error') || hashParams.get('error');
        const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');
        if (error) {
          console.error('[AuthCallback] Provider returned error:', error, errorDesc);
          clearTimeout(timeout);
          navigateFailure(errorDesc || error);
          return;
        }

        // Strategy 1: Hash fragment (Implicit Flow: #access_token=...&refresh_token=...)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          console.log('[AuthCallback] Found access_token in hash, setting session...');
          const { data, error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!setErr && data?.session) {
            clearTimeout(timeout);
            navigateSuccess();
            return;
          }
        }

        // Strategy 2: Query param (PKCE Flow: ?code=...)
        const code = searchParams.get('code');
        if (code) {
          console.log('[AuthCallback] Found code in query, exchanging code for session...');
          const { data, error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
          if (!exchErr && data?.session) {
            clearTimeout(timeout);
            navigateSuccess();
            return;
          } else if (exchErr) {
            console.warn('[AuthCallback] exchangeCodeForSession notice:', exchErr.message);
          }
        }

        // Strategy 3: Check existing Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          clearTimeout(timeout);
          navigateSuccess();
          return;
        }
      } catch (err) {
        console.warn('[AuthCallback] Direct resolution exception:', err);
      }
    }

    // Strategy 4: onAuthStateChange listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || (event === 'INITIAL_SESSION' && session)) && session) {
        clearTimeout(timeout);
        navigateSuccess();
      }
    });

    // Execute direct resolution
    processAuth();

    return () => {
      isMounted = false;
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
      <p style={{ color: '#94a3b8', fontSize: '14px', letterSpacing: '0.02em' }}>
        Authenticating securely with HealthChain...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
