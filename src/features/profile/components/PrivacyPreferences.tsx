import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AI_CONSENT_CHANGED, hasAIConsent, revokeAIConsent } from '../../../services/AIConsent';
import { hasAnalyticsConsent, PRIVACY_PREFERENCES_EVENT, setAnalyticsConsent } from '../../../services/analytics';

export default function PrivacyPreferences() {
  const [measurement, setMeasurement] = useState(hasAnalyticsConsent);
  const [ai, setAI] = useState(hasAIConsent);
  useEffect(() => {
    const update = () => { setMeasurement(hasAnalyticsConsent()); setAI(hasAIConsent()); };
    for (const event of [AI_CONSENT_CHANGED, PRIVACY_PREFERENCES_EVENT, 'hc_profile_updated', 'hc_logout'])
      window.addEventListener(event, update);
    return () => {
      for (const event of [AI_CONSENT_CHANGED, PRIVACY_PREFERENCES_EVENT, 'hc_profile_updated', 'hc_logout'])
        window.removeEventListener(event, update);
    };
  }, []);
  return <section aria-label="Privacy controls" style={{ padding: 16, border: '1px solid var(--border)',
    borderRadius: 16, marginBottom: 20, background: 'var(--bg)', color: 'var(--text-main)' }}>
    <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Privacy controls</h3>
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <input type="checkbox" checked={measurement} onChange={e => setAnalyticsConsent(e.target.checked)} />
      Allow optional product measurement
    </label>
    <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
      Limited events go to HealthChain's database. Health details, messages, documents and
      free-text button labels are excluded. Advertising pixels are not used.
    </p>
    <p style={{ fontSize: 14 }}>AI processing permission: <strong>{ai ? 'Allowed' : 'Not allowed'}</strong></p>
    <button className="btn btn-outline" disabled={!ai} onClick={revokeAIConsent}>Withdraw AI permission</button>
    <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
      Withdrawal prevents future AI requests. Information already processed cannot be recalled.
      You will be asked again if you choose another AI feature.
    </p>
    <p style={{ fontSize: 14, lineHeight: 1.8 }}>
      <Link to="/terms-policies">All policies</Link> · <Link to="/privacy-security">Security and privacy</Link>
      {' · '}<Link to="/consumer-health-privacy">Consumer health privacy</Link>
      {' · '}<Link to="/delete-account">Account deletion</Link>
    </p>
  </section>;
}
