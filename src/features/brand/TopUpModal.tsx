import OverlayPortal from '../../components/ui/OverlayPortal';
import { Loader2, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRODUCT_CATALOG } from '../../../shared/productCatalog.js';
import { useToast } from '../../components/ui/ToastProvider';
import { captureAccountScope, isAccountScopeCurrent } from '../../services/AccountScope';
import { trackPurchase } from '../../services/analytics';
import { triggerHapticLight } from '../../services/haptics';
import { initiateRazorpayCheckout, PaymentPlanId } from '../../services/razorpay';
import { supabase } from '../../services/supabaseClient';

interface TopUpModalProps {
  feature: 'ava_replies' | 'quick_consult' | 'deep_collab' | 'jarvis' | 'lab_report';
  onClose: () => void;
  onSuccess: () => void;
}

const TOPUPS = {
  ava_replies: { id: 'topup_ava', name: 'Ava Health Buddy', price: 99, qty: '10 Replies' },
  quick_consult: { id: 'topup_quick_consult', name: 'Quick Consult', price: 129, qty: '1 Session' },
  deep_collab: {
    id: 'topup_deep_collab',
    name: 'Clinical Perspectives',
    price: 149,
    qty: '1 Session',
  },
  jarvis: { id: 'topup_jarvis', name: 'Clinical Review', price: 169, qty: '1 Session' },
  lab_report: {
    id: 'topup_lab_report',
    name: 'Clinical document review',
    price: 99,
    qty: '2 Reports',
  },
};

export default function TopUpModal({ feature, onClose, onSuccess }: TopUpModalProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const checkoutLock = useRef(false);
  const metadata = TOPUPS[feature];
  const product = metadata && PRODUCT_CATALOG[metadata.id as keyof typeof PRODUCT_CATALOG];
  const plan =
    metadata && product && 'quantity' in product
      ? {
          ...metadata,
          price: product.amount / 100,
          qty: `${product.quantity} ${feature === 'ava_replies' ? 'Replies' : feature === 'lab_report' ? 'Reports' : 'Session'}`,
        }
      : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCheckout = async () => {
    if (!plan) return;
    if (checkoutLock.current) return;
    checkoutLock.current = true;
    const scope = captureAccountScope();
    setIsProcessing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!isAccountScopeCurrent(scope)) return;
      if (!session) {
        toast.error('Sign in required', 'Sign in again to purchase a top-up.');
        return;
      }
      const result = await initiateRazorpayCheckout(
        plan.id as PaymentPlanId,
        {
          id: session.user.id,
          email: session.user.email,
        },
        session.access_token,
        { planTitle: `${plan.name} (${plan.qty})` }
      );
      if (!isAccountScopeCurrent(scope)) return;
      if (result.success) {
        trackPurchase(plan.price, plan.id);
        toast.success('Top-Up Activated!', `${plan.name} credit added successfully.`);
        onSuccess();
      } else if (result.reason !== 'cancelled') {
        if (result.pendingOrderId) {
          toast.info('Payment confirmation pending', result.message);
          onClose();
          navigate('/pricing');
        } else toast.error('Checkout Error', result.message);
      }
    } catch (err: any) {
      if (isAccountScopeCurrent(scope))
        toast.error('Checkout Error', err.message || 'Unable to start checkout.');
    } finally {
      checkoutLock.current = false;
      if (isAccountScopeCurrent(scope)) setIsProcessing(false);
    }
  };

  if (!plan) return null;

  return (
    <OverlayPortal><div
      data-overlay-viewport="center"
      style={{
        position: 'fixed',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
    >
      <div
        data-overlay-panel=""
        className="card"
        role="dialog"
        aria-modal="true"
        aria-label="Feature Top-Up"
        style={{
          width: '100%',
          maxWidth: 400,
          padding: 24,
          margin: 16,
          position: 'relative',
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        <button
          type="button"
          aria-label="Close top up modal"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div
            style={{ background: 'var(--teal)', color: 'white', padding: 12, borderRadius: '50%' }}
          >
            <Sparkles size={24} />
          </div>
        </div>

        <h3
          style={{
            textAlign: 'center',
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 8,
            color: 'var(--text-main)',
          }}
        >
          Add {plan.name}
        </h3>
        <p
          style={{
            textAlign: 'center',
            fontSize: 14,
            color: 'var(--text-muted)',
            marginBottom: 24,
          }}
        >
          Quota limit reached. Add a top-up for <strong>{plan.qty}</strong>. Expires with the active
          subscription.
        </p>

        <div
          style={{
            background: 'var(--surface)',
            padding: 16,
            borderRadius: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{plan.qty}</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--teal)' }}>₹{plan.price}</span>
        </div>

        <button
          onClick={handleCheckout}
          disabled={isProcessing}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: 12,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {isProcessing ? <Loader2 size={18} className="spin" /> : null}
          {isProcessing ? 'Processing...' : 'Buy Now'}
        </button>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              triggerHapticLight();
              onClose();
              navigate('/pricing');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--teal)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Compare Pro plans and included usage
          </button>
        </div>
      </div>
    </div></OverlayPortal>
  );
}
