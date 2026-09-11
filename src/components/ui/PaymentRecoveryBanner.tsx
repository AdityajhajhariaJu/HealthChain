import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, CheckCircle2, X } from 'lucide-react';
import {
  getPendingPayment,
  clearPendingPayment,
  recoverPendingPayment,
  resumeInterruptedTask,
  PendingPaymentRecord,
} from '../../services/razorpay';
import { supabase } from '../../services/supabaseClient';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';

interface PaymentRecoveryBannerProps {
  onSuccess?: () => void;
  style?: React.CSSProperties;
}

export function PaymentRecoveryBanner({ onSuccess, style }: PaymentRecoveryBannerProps) {
  const [pending, setPending] = useState<PendingPaymentRecord | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function checkPending() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);

        const userId = data.session?.user?.id;
        if (userId) {
          const item = getPendingPayment(userId);
          // Only show if younger than 24 hours
          if (item && Date.now() - item.timestamp < 24 * 60 * 60 * 1000) {
            setPending(item);
          } else if (item) {
            clearPendingPayment(userId);
          }
        }
      } catch (err) {
        console.warn('Failed to check pending payment status', err);
      }
    }

    checkPending();

    const handlePaymentCompleted = () => {
      setPending(null);
    };

    window.addEventListener('hc_payment_completed', handlePaymentCompleted);
    return () => {
      mounted = false;
      window.removeEventListener('hc_payment_completed', handlePaymentCompleted);
    };
  }, []);

  if (!pending || !session) return null;

  const handleVerify = async () => {
    triggerHapticLight();
    setIsRecovering(true);
    setFeedback(null);

    try {
      const recovered = await recoverPendingPayment(session.user.id, session.access_token);
      if (recovered) {
        triggerHapticSuccess();
        setFeedback('Payment verified! Your access has been unlocked.');
        setPending(null);
        if (onSuccess) onSuccess();

        setTimeout(() => {
          resumeInterruptedTask((path, opts) => navigate(path, opts), session.user.id);
        }, 1200);
      } else {
        setFeedback('Payment confirmation is still pending from the bank. Please try again shortly.');
      }
    } catch {
      setFeedback('Unable to reach verification servers. Please check your network.');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleDismiss = () => {
    triggerHapticLight();
    clearPendingPayment(session.user.id);
    setPending(null);
  };

  return (
    <div
      style={{
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
        <AlertCircle size={18} color="#2563EB" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF' }}>
            Pending Transaction Detected ({pending.planId})
          </div>
          <div style={{ fontSize: '12px', color: '#3B82F6', marginTop: '2px' }}>
            {feedback || 'If your payment was completed, click to restore your access immediately.'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={handleVerify}
          disabled={isRecovering}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: isRecovering ? 'wait' : 'pointer',
          }}
        >
          <RefreshCw size={13} style={{ animation: isRecovering ? 'spin 1s linear infinite' : 'none' }} />
          <span>{isRecovering ? 'Checking...' : 'Verify & Restore'}</span>
        </button>

        <button
          onClick={handleDismiss}
          title="Dismiss if not charged"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6B7280',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
