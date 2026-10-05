import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/ToastProvider';
import { requestAccountRecovery } from '../../services/AccountRecovery';
import {
  captureAccountScope,
  invalidateAccountScope,
  isAccountScopeCurrent,
} from '../../services/AccountScope';
import {
  backfillCaseHealthMemory,
  clearCaseEngineCache,
  initCaseEngine,
} from '../../services/CaseEngine';
import {
  isDurableHealthStorageKey,
  retainHealthStorage,
} from '../../services/DurableHealthStorage';
import { syncHealthMemoryFromSupabase } from '../../services/HealthMemory';
import {
  loadObservationsFromCloud,
  retryFailedObservationQueues,
} from '../../services/HealthObservationService';
import { initNativeLifecycle } from '../../services/NativeLifecycle';
import {
  backfillHealthMemoryFromProfile,
  getProfileEngineState,
  syncProfileFromSupabase,
} from '../../services/ProfileEngine';
import {
  registerPushNotifications,
  setupPushListeners,
  unregisterPushDevice,
} from '../../services/PushService';
import { SessionBootstrapGate } from '../../services/SessionBootstrapGate';
import { getItemSync, removeItemSync, setItemSync } from '../../services/storage';
import { supabase } from '../../services/supabaseClient';
import { ensureWelcomeGrant } from '../../services/VitalityPointsEngine';
import { clearPersistedMDTSession } from '../../stores/useMDTStore';
import DeviceErasureRecovery from './components/DeviceErasureRecovery';
import ObservationConflictReview from './components/ObservationConflictReview';
import ProductTour from './components/ProductTour';
import ProfileConflictReview from './components/ProfileConflictReview';

/** Account recovery is loaded only when an account, guest workspace or erasure receipt needs it. */
export default function AccountLifecycle() {
  const navigate = useNavigate();
  const { info } = useToast();
  useEffect(() => {
    if (getItemSync('hc_guest_mode') === 'true') {
      void initCaseEngine().catch((error) => console.warn('Guest case recovery failed', error));
    }
  }, []);
  useEffect(() => {
    ensureWelcomeGrant();
    const flush = () => {
      void requestAccountRecovery().catch((error) => console.warn('Sync recovery failed', error));
    };
    flush();
    window.addEventListener('online', flush);

    const handleLogout = async (event: Event) => {
      if ((event as CustomEvent)?.detail?.accountDeleted) return;
      const logoutScope = captureAccountScope();
      try {
        await unregisterPushDevice(logoutScope);
      } catch (error) {
        console.warn('Push logout cleanup failed', error);
      }
      try {
        const idb = await import('idb-keyval');
        await clearPersistedMDTSession();
        const keys = await idb.keys();
        for (const k of keys) {
          if (!isAccountScopeCurrent(logoutScope)) return;
          if (isDurableHealthStorageKey(k)) continue;
          await idb.del(k);
        }
      } catch (e) {}

      try {
        if (!isAccountScopeCurrent(logoutScope)) return;
        const retained = retainHealthStorage(localStorage);
        sessionStorage.clear();
        // Remove only transient keys, avoiding a native Preferences.clear race
        // that could erase the durable records being retained.
        Object.keys(localStorage).forEach((key) => {
          if (!(key in retained)) removeItemSync(key);
        });
        const clearedScope = captureAccountScope();
        if (!isAccountScopeCurrent(clearedScope)) return;
        await supabase.auth.signOut();
      } catch (e) {}

      if (captureAccountScope().accountId === 'guest') navigate('/', { replace: true });
    };
    window.addEventListener('hc_logout', handleLogout);

    // Profile updates are frequent (demographic edits, nutrition, timeline
    // entries). Only an active-profile change requires reloading the case and
    // Health Memory scopes; treating every edit as a switch caused redundant
    // reads and overlapping refreshes that could race with a save.
    let lastProfileId = getProfileEngineState().activeId;
    let profileRefresh: Promise<void> = Promise.resolve();
    const handleProfileSwitch = () => {
      const nextProfileId = getProfileEngineState().activeId;
      if (!nextProfileId || nextProfileId === lastProfileId) return;
      lastProfileId = nextProfileId;
      profileRefresh = profileRefresh
        .catch(() => {})
        .then(async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) return;
          await initCaseEngine();
          await syncHealthMemoryFromSupabase().catch(console.error);
        });
    };
    window.addEventListener('hc_profile_updated', handleProfileSwitch);

    return () => {
      window.removeEventListener('hc_logout', handleLogout);
      window.removeEventListener('hc_profile_updated', handleProfileSwitch);
      window.removeEventListener('online', flush);
    };
  }, []);

  useEffect(() => {
    initNativeLifecycle();
    void setupPushListeners(navigate).catch((error) =>
      console.warn('Push listeners unavailable', error)
    );

    // Check for email verification / password recovery hash
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      navigate('/update-password' + hash, { replace: true });
      try {
        window.history.replaceState(null, '', '/update-password');
      } catch {}
      return;
    }

    // Global Auth Listener. Do not await Supabase reads from inside this
    // callback: Supabase serializes auth events and a nested getSession() can
    // otherwise stall sign-in or device-switch transitions.
    const bootstrapGate = new SessionBootstrapGate();
    let profileUpdateTimer: ReturnType<typeof setTimeout> | null = null;
    let authBootstrapTimer: ReturnType<typeof setTimeout> | null = null;
    let lastSignedInAt = getItemSync('isAuthenticated') === 'true' ? Date.now() : 0; // Timestamp of last SIGNED_IN to debounce false SIGNED_OUT races
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'SIGNED_IN' ||
          event === 'INITIAL_SESSION' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED') &&
        session
      ) {
        lastSignedInAt = Date.now();
        setItemSync('isAuthenticated', 'true');

        if (getItemSync('hc_guest_mode') === 'true') {
          const guestPrefix = 'hc_unified_profile_guest';
          const authPrefix = `hc_unified_profile_${session.user.id}`;

          const guestProfile = getItemSync(guestPrefix);
          if (guestProfile && !getItemSync(authPrefix)) {
            setItemSync(authPrefix, guestProfile);
            if (getItemSync(authPrefix) === guestProfile) removeItemSync(guestPrefix);
          }

          // Older features used both *_guest and *_guest_profile_1 key shapes.
          // Migrate every guest-scoped health key without guessing a suffix, so no guest work is stranded on sign-in.
          try {
            Object.keys(localStorage).forEach((key) => {
              if (!key.startsWith('hc_') || !key.includes('_guest')) return;
              // A signed-in account must make its own adult eligibility choice.
              if (key === 'hc_adult_eligibility_guest') return;
              const value = getItemSync(key);
              if (!value) return;
              const targetKey = key.replace('_guest', `_${session.user.id}`);
              // A returning account keeps its existing records. Guest/account
              // reconciliation needs review rather than a blind overwrite.
              if (!isDurableHealthStorageKey(key) || getItemSync(targetKey) !== null) return;
              setItemSync(targetKey, value);
              if (getItemSync(targetKey) === value) removeItemSync(key);
            });
          } catch (e) {
            // Ignore if Object.keys(localStorage) throws due to security block
          }
        }

        removeItemSync('hc_guest_mode');

        // Sync account info from session to capture OAuth logins (like Google)
        const currentAccount = getItemSync('hc_account');
        let parsedAccount: any = {};
        try {
          parsedAccount = currentAccount ? JSON.parse(currentAccount) : {};
        } catch (e) {
          parsedAccount = {};
        }
        if (parsedAccount.id !== session.user.id) parsedAccount = {};
        setItemSync(
          'hc_account',
          JSON.stringify({
            ...parsedAccount,
            id: session.user.id,
            email: session.user.email,
            name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              parsedAccount.name ||
              '',
          })
        );

        // Use the session from the event directly — do NOT re-call getSession()
        // inside this callback. Re-calling getSession() acquires the internal
        // Supabase lock, which is already held during onAuthStateChange dispatch,
        // causing a deadlock or returning stale data from async storage.
        const bootstrapScope = captureAccountScope();
        if (!bootstrapGate.begin(bootstrapScope.key + ':' + bootstrapScope.epoch)) {
          if (event === 'USER_UPDATED') {
            if (profileUpdateTimer) clearTimeout(profileUpdateTimer);
            profileUpdateTimer = setTimeout(() => {
              if (isAccountScopeCurrent(bootstrapScope))
                void syncProfileFromSupabase(session.user.id).catch((error) =>
                  console.warn('Account profile refresh failed', error)
                );
            }, 0);
          }
          return;
        }
        if (authBootstrapTimer) clearTimeout(authBootstrapTimer);
        authBootstrapTimer = setTimeout(() => {
          if (!isAccountScopeCurrent(bootstrapScope)) return;
          void registerPushNotifications().catch((error) =>
            console.warn('Push registration failed', error)
          );
          // Profile readiness determines onboarding. Use the event's owner and
          // defer all network work until Supabase releases its auth lock.
          void (async () => {
            try {
              await syncProfileFromSupabase(session.user.id);
            } catch (err) {
              console.warn('Initial profile sync failed, falling back to local storage', err);
            }
            if (!isAccountScopeCurrent(bootstrapScope)) return;

            const path = window.location.pathname;
            if (
              path === '/' ||
              path === '/login' ||
              path === '/signup' ||
              path === '/onboarding' ||
              path === '/auth/callback'
            ) {
              navigate('/app', { replace: true });
            }

            // Sync other background data
            try {
              await initCaseEngine();
              if (!isAccountScopeCurrent(bootstrapScope)) return;
              syncHealthMemoryFromSupabase().catch(console.error);
              void loadObservationsFromCloud()
                .then(() => {
                  if (isAccountScopeCurrent(bootstrapScope)) return retryFailedObservationQueues();
                })
                .catch((error) => console.warn('Observation history sync failed', error));
              backfillHealthMemoryFromProfile();
              backfillCaseHealthMemory();
            } catch (err) {
              console.error('Background init failed', err);
            }
          })();
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        // Debounce false SIGNED_OUT events that race with a fresh SIGNED_IN.
        // Supabase's internal _recoverAndRefresh can fire SIGNED_OUT on stale
        // storage before our async IndexedDB write from a fresh login has
        // committed. If a SIGNED_IN occurred within the last 5 seconds, this
        // SIGNED_OUT is a false positive — ignore it.
        if (Date.now() - lastSignedInAt < 5000) {
          console.warn(
            '[Auth] Ignoring SIGNED_OUT that raced with recent SIGNED_IN (debounce window)'
          );
          return;
        }
        if (authBootstrapTimer) {
          clearTimeout(authBootstrapTimer);
          authBootstrapTimer = null;
        }
        bootstrapGate.reset();
        if (profileUpdateTimer) clearTimeout(profileUpdateTimer);
        try {
          const theme = localStorage.getItem('hc_theme');
          const consent = localStorage.getItem('hc_consent');
          clearCaseEngineCache();
          sessionStorage.clear();
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('hc_account');
          invalidateAccountScope();
          if (theme) localStorage.setItem('hc_theme', theme);
          if (consent) localStorage.setItem('hc_consent', consent);
        } catch (e) {
          console.warn('Failed to cleanup on sign out', e);
        }

        const path = window.location.pathname;
        if (path.startsWith('/app')) {
          const endedScope = captureAccountScope();
          info('Session ended', 'Please sign in to continue.');
          setTimeout(() => {
            if (isAccountScopeCurrent(endedScope)) navigate('/login', { replace: true });
          }, 300);
        }
      }
    });

    const handleWake = () => {
      if (document.visibilityState === 'hidden') return;
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (session) {
            setItemSync('isAuthenticated', 'true');
          }
        })
        .catch(() => {});
    };

    window.addEventListener('pageshow', handleWake);
    document.addEventListener('visibilitychange', handleWake);

    return () => {
      if (authBootstrapTimer) clearTimeout(authBootstrapTimer);
      if (profileUpdateTimer) clearTimeout(profileUpdateTimer);
      subscription.unsubscribe();
      window.removeEventListener('pageshow', handleWake);
      document.removeEventListener('visibilitychange', handleWake);
    };
  }, [navigate, info]);

  return (
    <>
      <ObservationConflictReview />
      <ProfileConflictReview />
      <DeviceErasureRecovery />
      <ProductTour />
    </>
  );
}
