import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { pendingErasedOwners } from '../../services/DurableHealthStorage';
import { supabase } from '../../services/supabaseClient';

const AccountLifecycle = lazy(() => import('../../features/account/AccountLifecycle'));

function needsRecovery(pathname: string) {
  if (/^\/(app(?:\/|$)|onboarding|auth\/callback|update-password)/.test(pathname)) return true;
  try {
    return (
      localStorage.getItem('hc_guest_mode') === 'true' ||
      Boolean(localStorage.getItem('hc_account')) ||
      pendingErasedOwners().length > 0
    );
  } catch {
    return false;
  }
}

/** Public visitors need auth detection, but no health repositories or sync workers. */
export default function AccountRuntime() {
  const { pathname } = useLocation();
  const [enabled, setEnabled] = useState(() => needsRecovery(pathname));
  const required = enabled || needsRecovery(pathname);
  useEffect(() => {
    // Keep the runtime mounted after activation so logout and cleanup can finish.
    if (required) setEnabled(true);
  }, [required]);
  useEffect(() => {
    let active = true;
    const enable = () => {
      if (active) setEnabled(true);
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) enable();
    });
    const check = () => {
      if (needsRecovery(window.location.pathname)) enable();
    };
    window.addEventListener('hc_profile_updated', check);
    window.addEventListener('hc_owner_erased', enable);
    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener('hc_profile_updated', check);
      window.removeEventListener('hc_owner_erased', enable);
    };
  }, []);
  return required ? (
    <Suspense fallback={null}>
      <AccountLifecycle />
    </Suspense>
  ) : null;
}
