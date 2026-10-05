import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Send, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { useToast } from './ToastProvider';
import { captureAccountScope, isAccountScopeCurrent } from '../../services/AccountScope';

const FEEDBACK_TOPICS = [
  '⚡ App Speed',
  '🎨 UI / Polish',
  '🩺 Medical Accuracy',
  '💊 Medication Alarms',
  '💡 New Feature Idea',
  '🐛 Bug Report',
];

export default function FeedbackWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);
  const lock = useRef(false);
  const { success, error: showError } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const clear = () => { setIsOpen(false); setFeedback(''); };
    window.addEventListener('hc_logout', clear);
    window.addEventListener('hc_account_scope_changed', clear);
    return () => {
      window.removeEventListener('hc_logout', clear);
      window.removeEventListener('hc_account_scope_changed', clear);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Hide floating feedback on today section, full-screen chats, onboarding, and consult to prevent input obstruction
  if (
    location.pathname === '/app' ||
    location.pathname.startsWith('/app/today') ||
    location.pathname.startsWith('/app/ava') ||
    location.pathname.startsWith('/app/war-room') ||
    location.pathname.startsWith('/app/onboarding') ||
    location.pathname.startsWith('/app/consult')
  ) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim() || lock.current) return;

    const msg = feedback.trim();
    const scope = captureAccountScope();
    lock.current = true;
    setSending(true);

    try {
      const { supabase } = await import('../../services/supabaseClient');
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!isAccountScopeCurrent(scope)) return;
      const { error } = await supabase.from('user_feedback').insert({
        user_id: session?.user?.id || null,
        user_email: session?.user?.email || 'Anonymous Guest',
        category: 'widget_feedback',
        rating: 5,
        subject: 'Quick Feedback Widget',
        message: msg,
        metadata: {
          submittedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
          appVersion: '10.0.0',
        },
      });
      if (!isAccountScopeCurrent(scope)) return;
      if (error) throw error;
      setFeedback('');
      setIsOpen(false);
      awardPoints(5, 'Shared Platform Feedback', 'research');
      triggerHapticSuccess();
      success('Feedback Sent', 'Your message was saved for HealthChain support.');
    } catch {
      console.warn('Feedback submission unavailable.');
      if (isAccountScopeCurrent(scope)) showError('Feedback not sent', 'Your draft is still here. Please retry.');
    } finally {
      lock.current = false;
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'relative',
          alignSelf: 'flex-end',
          margin: '16px',
          flexShrink: 0,
          width: 48,
          height: 48,
          borderRadius: '24px',
          backgroundColor: 'var(--teal)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 24px rgba(15, 139, 126, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9000,
          transition: 'transform 0.2s',
        }}
        aria-label="Send Feedback"
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <MessageSquare size={20} />
      </button>

      {createPortal(<AnimatePresence>
        {isOpen && (
          <motion.div
            className="hc-feedback-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Send Feedback"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: 'fixed',
              top: isMobile
                ? 'calc(var(--app-viewport-top, 0px) + max(16px, var(--safe-area-top, 0px)))'
                : 'auto',
              bottom: isMobile
                ? 'auto'
                : 'calc(100% - var(--app-viewport-top, 0px) - var(--app-viewport-height) + 96px)',
              right: 'max(16px, var(--safe-area-right, 0px))',
              left: isMobile ? 'max(16px, var(--safe-area-left, 0px))' : 'auto',
              width: isMobile ? 'auto' : 340,
              maxHeight:
                'calc(var(--app-viewport-height) - max(16px, var(--safe-area-top, 0px)) - max(16px, var(--safe-area-bottom, 0px)))',
              overflowY: 'auto',
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
              padding: '20px',
              zIndex: 9001,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3
                style={{
                  minWidth: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                }}
              >
                Send Feedback
              </h3>
              <button
                type="button"
                aria-label="Close feedback popover"
                onClick={() => setIsOpen(false)}
                style={{
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {/* 1-Tap Feedback Topic Chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                  }}
                >
                  Quick Topic (1-Tap)
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {FEEDBACK_TOPICS.map((topic, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setFeedback((prev) => {
                          const prefix = `[${topic}] `;
                          if (prev.startsWith('[')) {
                            return prev.replace(/^\[[^\]]+\]\s*/, prefix);
                          }
                          return `${prefix}${prev}`;
                        });
                      }}
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '999px',
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                aria-label="Feedback message"
                placeholder="What's on your mind? Found a bug or have a suggestion?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  fontSize: '14px',
                  resize: 'none',
                  outline: 'none',
                  color: 'var(--text-main)',
                }}
                autoFocus
              />
              <button
                type="submit"
                className="btn btn-primary"
                aria-label="Submit feedback to HealthChain"
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '8px',
                  background: feedback.trim()
                    ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)'
                    : undefined,
                  borderColor: feedback.trim() ? '#0D9488' : undefined,
                  boxShadow: feedback.trim() ? '0 4px 14px rgba(13, 148, 136, 0.25)' : undefined,
                }}
                disabled={!feedback.trim() || sending}
              >
                <Send size={16} /> {sending ? 'Sending…' : 'Send to HealthChain'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </>
  );
}
