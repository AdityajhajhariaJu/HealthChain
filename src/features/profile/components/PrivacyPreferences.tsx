import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AI_CONSENT_CHANGED, hasAIConsent, revokeAIConsent } from '../../../services/AIConsent';
import {
  hasAnalyticsConsent,
  PRIVACY_PREFERENCES_EVENT,
  setAnalyticsConsent,
} from '../../../services/analytics';
import { captureAccountScope } from '../../../services/AccountScope';
import {
  hasHealthDataConsent,
  setHealthDataConsent,
  HEALTH_DATA_CONSENT_CHANGED,
  OPEN_HEALTH_DATA_CONSENT,
} from '../../../services/HealthDataConsent';

export default function PrivacyPreferences() {
  const [measurement, setMeasurement] = useState(hasAnalyticsConsent);
  const [ai, setAI] = useState(hasAIConsent);
  const [cloud, setCloud] = useState(hasHealthDataConsent);
  const [guest, setGuest] = useState(() => captureAccountScope().accountId === 'guest');
  useEffect(() => {
    const update = () => {
      setMeasurement(hasAnalyticsConsent());
      setAI(hasAIConsent());
      setCloud(hasHealthDataConsent());
      setGuest(captureAccountScope().accountId === 'guest');
    };
    const events = [
      AI_CONSENT_CHANGED,
      HEALTH_DATA_CONSENT_CHANGED,
      PRIVACY_PREFERENCES_EVENT,
      'hc_profile_updated',
      'hc_account_scope_changed',
      'hc_logout',
      'storage',
    ];
    for (const event of events) window.addEventListener(event, update);
    return () => {
      for (const event of events) window.removeEventListener(event, update);
    };
  }, []);
  return (
    <section
      aria-label="Privacy controls"
      style={{
        padding: 16,
        border: '1px solid var(--border)',
        borderRadius: 16,
        marginBottom: 20,
        background: 'var(--bg)',
        color: 'var(--text-main)',
      }}
    >
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Privacy controls</h3>
      {!guest && (
        <>
          <p style={{ fontSize: 14 }}>
            Cloud health storage: <strong>{cloud ? 'Allowed' : 'Paused'}</strong>
          </p>
          <button
            className="btn btn-outline"
            onClick={() =>
              cloud
                ? setHealthDataConsent(false)
                : window.dispatchEvent(new Event(OPEN_HEALTH_DATA_CONSENT))
            }
          >
            {cloud ? 'Withdraw cloud health permission' : 'Review cloud health permission'}
          </button>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
            Withdrawal pauses cloud health reads, uploads and synchronization, and withdraws
            signed-in AI permission. Local records remain available. It does not delete previously
            stored data; use account deletion to request removal. Sign-in and billing remain
            available. This choice applies on this device; contact our privacy inbox for an
            account-wide request.
          </p>
        </>
      )}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={measurement}
          onChange={(e) => setAnalyticsConsent(e.target.checked)}
        />
        Allow optional product measurement
      </label>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
        General visit, onboarding, audio, AI outcome, checkout and error counts go to HealthChain's
        database. Daily totals have no account or device identifiers and cover up to 90 days. Health
        details, selected sounds, messages, documents, amounts and error text are excluded.
        Advertising pixels are not used.
      </p>
      <p style={{ fontSize: 14 }}>
        AI processing permission: <strong>{ai ? 'Allowed' : 'Not allowed'}</strong>
      </p>
      <button className="btn btn-outline" disabled={!ai} onClick={revokeAIConsent}>
        Withdraw AI permission
      </button>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
        Withdrawal prevents future AI requests. Information already processed cannot be recalled.
        You will be asked again if you choose another AI feature.
      </p>
      <p style={{ fontSize: 14, lineHeight: 1.8 }}>
        <Link to="/terms-policies">All policies</Link> ·{' '}
        <Link to="/privacy-security">Security and privacy</Link>
        {' · '}
        <Link to="/consumer-health-privacy">Consumer health privacy</Link>
        {' · '}
        <Link to="/delete-account">Account deletion</Link>
      </p>
    </section>
  );
}
