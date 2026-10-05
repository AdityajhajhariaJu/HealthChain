import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { captureAccountScope, isAccountScopeCurrent } from '../../services/AccountScope';
import { getItemSync, setItemSync } from '../../services/storage';

const VERSION = '2026-10-05-age-18';
const keyFor = (accountId: string) => 'hc_adult_eligibility_' + accountId;
function hasConfirmation(accountId: string) {
  try {
    const record = JSON.parse(getItemSync(keyFor(accountId)) || 'null');
    return record?.version === VERSION && record?.minimumAge === 18 && record?.confirmed === true;
  } catch { return false; }
}

export default function AdultEligibilityGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [scope, setScope] = useState(captureAccountScope);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const update = () => {
      setScope(captureAccountScope());
      setChecked(false);
    };
    const events = ['hc_logout', 'hc_account_scope_changed', 'hc_profile_updated', 'storage'];
    events.forEach(event => window.addEventListener(event, update));
    return () => events.forEach(event => window.removeEventListener(event, update));
  }, []);
  const restricted = location.pathname === '/onboarding' || location.pathname === '/pricing' ||
    location.pathname === '/app' || location.pathname.startsWith('/app/');
  if (!restricted || (isAccountScopeCurrent(scope) && hasConfirmation(scope.accountId))) return children;

  return <main style={{ maxWidth: 520, margin: 'auto', padding: '48px 24px', color: 'var(--text-main)' }}>
    <h1>HealthChain is for adults</h1>
    <p style={{ lineHeight: 1.6 }}>You must be 18 or older to use HealthChain. Please confirm your age before entering your workspace or purchasing a plan.</p>
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
      <input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />
      I confirm that I am 18 or older.
    </label>
    <button className="btn btn-primary" disabled={!checked} onClick={() => {
      if (!checked || !isAccountScopeCurrent(scope)) {
        setScope(captureAccountScope()); setChecked(false); return;
      }
      setItemSync(keyFor(scope.accountId), JSON.stringify({ version: VERSION, minimumAge: 18,
        confirmed: true, confirmedAt: new Date().toISOString() }));
      setScope(captureAccountScope());
    }}>Continue</button>
    <p><Link to="/">Leave the workspace</Link></p>
    <p><Link to="/terms">Terms of Service</Link> · <Link to="/privacy">Privacy Policy</Link></p>
  </main>;
}
