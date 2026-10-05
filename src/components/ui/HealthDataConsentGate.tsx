import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { captureAccountScope, isAccountScopeCurrent } from '../../services/AccountScope';
import {
  healthDataChoice,
  setHealthDataConsent,
  HEALTH_DATA_CONSENT_CHANGED,
  OPEN_HEALTH_DATA_CONSENT,
} from '../../services/HealthDataConsent';

export default function HealthDataConsentGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [scope, setScope] = useState(captureAccountScope);
  const scopeRef = useRef(scope);
  const [review, setReview] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const update = () => {
      const next = captureAccountScope();
      if (next.key !== scopeRef.current.key || next.epoch !== scopeRef.current.epoch) {
        setChecked(false);
        setError('');
      }
      scopeRef.current = next;
      setScope(next);
    };
    const open = () => {
      update();
      setChecked(false);
      setError('');
      setReview(true);
    };
    const events = [
      HEALTH_DATA_CONSENT_CHANGED,
      'hc_account_scope_changed',
      'hc_logout',
      'hc_profile_updated',
      'storage',
    ];
    events.forEach((event) => window.addEventListener(event, update));
    window.addEventListener(OPEN_HEALTH_DATA_CONSENT, open);
    return () => {
      events.forEach((event) => window.removeEventListener(event, update));
      window.removeEventListener(OPEN_HEALTH_DATA_CONSENT, open);
    };
  }, []);
  const workspace =
    pathname === '/onboarding' || pathname === '/app' || pathname.startsWith('/app/');
  if (
    !workspace ||
    scope.accountId === 'guest' ||
    (!review && isAccountScopeCurrent(scope) && healthDataChoice(scope) !== null)
  )
    return children;
  const choose = (accepted: boolean) => {
    if (accepted && !checked) return;
    if (!setHealthDataConsent(accepted, scope)) {
      setError('Your choice could not be saved. Please check device storage and try again.');
      return;
    }
    setReview(false);
    setScope(captureAccountScope());
  };
  return (
    <main
      style={{ maxWidth: 560, margin: 'auto', padding: '40px 24px', color: 'var(--text-main)' }}
    >
      <h1>Choose how to store your health records</h1>
      <p style={{ lineHeight: 1.65 }}>
        With cloud storage, HealthChain sends your health profile, symptoms, medicines, allergies,
        records, photos, daily logs and saved summaries to <strong>Supabase</strong> to store,
        synchronize and recover your account workspace.
      </p>
      <p style={{ lineHeight: 1.65 }}>
        The account database is in India. Provider support and technical processing can occur in
        other countries. Records stay until you delete them; backups, security logs and payment
        records have the retention and exceptions explained in our privacy policy.
      </p>
      <p style={{ lineHeight: 1.65 }}>
        You can keep records on this device instead. Cloud synchronization and signed-in AI
        processing will be paused. Local records can be lost if you clear storage or lose the
        device. You can change this choice in Settings. Changing your choice does not delete
        information already stored or change another device's choice. Use account deletion or
        contact our privacy inbox for an account-wide request.
      </p>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, margin: '24px 0' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
        I explicitly consent to HealthChain and Supabase processing my sensitive health information
        for the cloud storage, synchronization and recovery described above.
      </label>
      {error && <p role="alert">{error}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <button className="btn btn-outline" onClick={() => choose(false)}>
          Keep records on this device
        </button>
        <button className="btn btn-primary" disabled={!checked} onClick={() => choose(true)}>
          Allow cloud health storage
        </button>
      </div>
      <p style={{ lineHeight: 1.65 }}>
        Google Gemini processing requires a separate AI choice. Optional measurement and
        device-health access also have separate controls.
      </p>
      <p>
        <Link to="/privacy">Privacy policy</Link> ·{' '}
        <Link to="/consumer-health-privacy">Consumer health privacy</Link>
        {' · '}
        <Link to="/delete-account">Account deletion</Link>
      </p>
    </main>
  );
}
