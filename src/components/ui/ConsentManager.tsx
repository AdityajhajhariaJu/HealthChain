import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getItemSync } from '../../services/storage';
import { ANALYTICS_CONSENT_KEY, hasAnalyticsConsent, setAnalyticsConsent } from '../../services/analytics';

export const OPEN_PRIVACY_PREFERENCES = 'hc_open_privacy_preferences';

export default function ConsentManager() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const value = getItemSync(ANALYTICS_CONSENT_KEY);
    if (value !== 'declined' && !hasAnalyticsConsent()) setOpen(true);
    const show = () => setOpen(true);
    window.addEventListener(OPEN_PRIVACY_PREFERENCES, show);
    return () => window.removeEventListener(OPEN_PRIVACY_PREFERENCES, show);
  }, []);
  const choose = (accepted: boolean) => {
    setAnalyticsConsent(accepted);
    setOpen(false);
  };
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') choose(false); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open]);
  if (!open) return null;
  return <section role="region" aria-label="Privacy preferences" className="hc-page-enter"
    style={{ position: 'fixed', bottom: isMobile ? 80 : 24, left: 16, right: 16,
      background: 'var(--surface)', color: 'var(--text-main)', borderRadius: 16, padding: 20,
      border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,.2)',
      zIndex: 9999, maxWidth: 740, margin: '0 auto', maxHeight: '60dvh', overflowY: 'auto' }}>
    <div style={{ display: 'flex', gap: 12 }}>
      <ShieldCheck size={24} color="var(--teal)" style={{ flexShrink: 0 }} />
      <div>
        <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>Your privacy choices</h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Necessary storage keeps sign-in and your workspace working. Optional measurement sends
          general visit, onboarding, audio, AI outcome and error counts to HealthChain's database.
          Reports combine daily totals without account or device identifiers. Health details,
          messages, document contents and advertising tracking are excluded. You can change this choice in Settings.
        </p>
        <p style={{ fontSize: 14, margin: '10px 0' }}>
          <Link to="/privacy">Privacy policy</Link> · <Link to="/terms">Terms</Link>
        </p>
      </div>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
      <button className="btn btn-outline" onClick={() => choose(false)}>Necessary only</button>
      <button className="btn btn-primary" onClick={() => choose(true)}>Allow optional measurement</button>
    </div>
  </section>;
}
