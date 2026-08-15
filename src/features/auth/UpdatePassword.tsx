import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../components/ui/ToastProvider';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    // Supabase redirects to this route with the access_token in the hash
    // The session listener in App.tsx will automatically pick it up and log the user in,
    // allowing us to call updateUser() securely.
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // If there's no session, they shouldn't be here (or link is invalid/expired)
        setError('Invalid or expired reset link. Please request a new one.');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number.');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError('Password must contain at least one special character.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message);
        toastError('Failed to update password', updateError.message);
      } else {
        setUpdated(true);
        success('Password updated successfully!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
      toastError('Update Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav style={{ padding: '24px 40px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={24} color="var(--teal)" />
          <span style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '18px' }}>HealthChain</span>
        </div>
      </nav>

      {/* Main Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ width: '100%', maxWidth: '440px', padding: '24px', position: 'relative', overflow: 'hidden' }}
        >
          {/* Subtle Glow */}
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--teal-light)', filter: 'blur(60px)', borderRadius: '50%', pointerEvents: 'none' }} />

          {updated ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                <CheckCircle size={32} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>Password Updated</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
                Your password has been successfully reset. You can now access your dashboard.
              </p>
              <button onClick={() => navigate('/app')} className="btn btn-primary" style={{ width: '100%' }}>
                Go to Dashboard
              </button>
            </div>
          ) : (
            <>
              <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', color: 'var(--text-main)', fontWeight: 700 }}>
                Set New Password
              </h1>
              <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '15px' }}>
                Please enter your new password below.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {error && (
                  <div style={{ padding: '12px', background: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', fontSize: '14px', border: '1px solid #FECACA' }}>
                    {error}
                  </div>
                )}
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-hover)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-hover)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '10px', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? (
                    <div style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  ) : 'Update Password'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
