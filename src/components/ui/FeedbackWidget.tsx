import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './ToastProvider';
import { useIsMobile } from '../../hooks/useIsMobile';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';

export default function FeedbackWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const { success } = useToast();
  const isMobile = useIsMobile();

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

  // Hide floating feedback on full-screen chats and onboarding to prevent input obstruction
  if (
    location.pathname.startsWith('/app/ava') || 
    location.pathname.startsWith('/app/war-room') || 
    location.pathname.startsWith('/app/onboarding')
  ) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    
    const msg = feedback.trim();
    setFeedback('');
    setIsOpen(false);
    awardPoints(5, 'Shared Platform Feedback', 'research');
    triggerHapticSuccess();
    success('Feedback Sent (+5 PTS)', 'Thank you for contributing to HealthChain research & development!');

    try {
      const { supabase } = await import('../../services/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('user_feedback').insert({
        user_id: session?.user?.id || null,
        user_email: session?.user?.email || 'Anonymous Guest',
        category: 'widget_feedback',
        rating: 5,
        subject: 'Quick Feedback Widget',
        message: msg,
        metadata: {
          submittedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
          appVersion: '10.0.0'
        }
      });
    } catch (err) {
      console.warn('Feedback logging encountered an error:', err);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: isMobile ? 110 : 32, // Above mobile nav if mobile
          right: isMobile ? 16 : 32,
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
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageSquare size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Send Feedback"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: 'fixed',
              top: isMobile ? '15vh' : 'auto',
              bottom: isMobile ? 'auto' : 96,
              right: isMobile ? 16 : 32,
              left: isMobile ? 16 : 'auto',
              width: isMobile ? 'calc(100vw - 32px)' : 340,
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
              padding: '20px',
              zIndex: 9001,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>Send Feedback</h3>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
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
                  color: 'var(--text-main)'
                }}
                autoFocus
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
                disabled={!feedback.trim()}
              >
                <Send size={16} /> Send to HealthChain
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
