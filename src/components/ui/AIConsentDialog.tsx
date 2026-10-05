import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AI_CONSENT_EVENT, pendingAIConsent, resolveAIConsent } from '../../services/AIConsent';
import FocusTrap from './FocusTrap';
import OverlayPortal from './OverlayPortal';

export default function AIConsentDialog() {
  const [open, setOpen] = useState(pendingAIConsent);
  useEffect(() => {
    const update = () => setOpen(pendingAIConsent());
    window.addEventListener(AI_CONSENT_EVENT, update);
    update();
    return () => window.removeEventListener(AI_CONSENT_EVENT, update);
  }, []);
  if (!open) return null;
  return <OverlayPortal>
    <div style={{ position: 'fixed', inset: 0, zIndex: 12000, background: 'rgba(0,0,0,.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <FocusTrap onEscape={() => resolveAIConsent(false)} style={{ width: '100%', maxWidth: 520 }}>
        <section role="dialog" aria-modal="true" aria-labelledby="ai-consent-title"
          style={{ background: 'var(--surface)', color: 'var(--text-main)', padding: 24,
            borderRadius: 20, maxHeight: '85dvh', overflowY: 'auto' }}>
          <h2 id="ai-consent-title" style={{ marginTop: 0 }}>Choose whether to use AI</h2>
          <p style={{ lineHeight: 1.65 }}>To run the AI feature you selected, HealthChain sends relevant
            information through its server to <strong>Google Gemini API</strong>. Depending on the
            feature, this may include your message, health profile, symptoms, saved case context,
            meal details, or a photo or document you choose to analyze.</p>
          <p style={{ lineHeight: 1.65 }}>Our paid Gemini API service does not use your prompts or
            responses to improve Google’s products. Google’s standard abuse monitoring retains
            prompts, context and responses for 55 days; authorized reviewers may inspect flagged
            content. Processing may occur outside your country. See the privacy policy for provider
            handling and exceptions.</p>
          <p style={{ lineHeight: 1.65 }}>
            AI can make mistakes and does not replace a clinician or emergency care. Share only
            information you are authorized to provide.</p>
          <p style={{ lineHeight: 1.65 }}>You can decline and continue using manual organization,
            logging and other features. You can withdraw AI permission in Settings. Withdrawal
            stops future AI requests; it does not recall requests already processed.</p>
          <p><Link to="/privacy" onClick={() => resolveAIConsent(false)}>Read the privacy policy</Link></p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => resolveAIConsent(false)}>Not now</button>
            <button className="btn btn-primary" onClick={() => resolveAIConsent(true)}>Allow AI processing</button>
          </div>
        </section>
      </FocusTrap>
    </div>
  </OverlayPortal>;
}
