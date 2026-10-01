import { AlertCircle, RefreshCw, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { captureAccountScope, isAccountScopeCurrent } from '../../services/AccountScope';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import {
  clearPendingPayment,
  getPendingPayment,
  PendingPaymentRecord,
  recoverPendingPayment,
  resumeInterruptedTask,
} from '../../services/razorpay';
import { supabase } from '../../services/supabaseClient';

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
      const scope = captureAccountScope();
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted || !isAccountScopeCurrent(scope)) return;
        setSession(data.session);

        const userId = data.session?.user?.id;
        if (userId) {
          const item = getPendingPayment(userId);
          if (item) {
            setPending(item);
          } else setPending(null);
        } else setPending(null);
      } catch (err) {
        console.warn('Failed to check pending payment status', err);
      }
    }

    checkPending();

    const handlePaymentCompleted = () => { void checkPending(); };
    const clear = () => { setPending(null); setSession(null); setIsRecovering(false); };

    window.addEventListener('hc_payment_completed', handlePaymentCompleted);
    window.addEventListener('hc_payment_pending', handlePaymentCompleted);
    window.addEventListener('hc_profile_updated', handlePaymentCompleted);
    window.addEventListener('hc_logout', clear);
    return () => {
      mounted = false;
      window.removeEventListener('hc_payment_completed', handlePaymentCompleted);
      window.removeEventListener('hc_payment_pending', handlePaymentCompleted);
      window.removeEventListener('hc_profile_updated', handlePaymentCompleted);
      window.removeEventListener('hc_logout', clear);
    };
  }, []);

  if (!pending || !session) return null;

  const handleVerify = async () => {
    if (isRecovering) return;
    const scope = captureAccountScope();
    triggerHapticLight();
    setIsRecovering(true);
    setFeedback(null);

    try {
      const { data } = await supabase.auth.getSession();
      if (!isAccountScopeCurrent(scope) || data.session?.user?.id !== session.user.id) return;
      if (!data.session?.access_token) throw new Error('Sign in again to verify this saved receipt.');
      const recovered = await recoverPendingPayment(data.session.user.id, data.session.access_token);
      if (!isAccountScopeCurrent(scope)) return;
      if (recovered) {
        triggerHapticSuccess();
        setFeedback('Payment verified! Your access has been unlocked.');
        setPending(null);
        if (onSuccess) onSuccess();

        setTimeout(() => {
          if (isAccountScopeCurrent(scope)) resumeInterruptedTask((path, opts) => navigate(path, opts), session.user.id);
        }, 1200);
      } else {
        setFeedback('Payment confirmation is still pending from the bank. Please try again shortly.');
      }
    } catch {
      if (isAccountScopeCurrent(scope)) setFeedback('Unable to reach verification servers. Please check your network.');
    } finally {
      if (isAccountScopeCurrent(scope)) setIsRecovering(false);
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
