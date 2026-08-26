import { useState, useEffect } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import { setItemSync } from '../../services/storage';
import { useToast } from '../../components/ui/ToastProvider';
import { awardSignupBonus } from '../../services/VitalityPointsEngine';

export default function Auth() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { toast, success, error: toastError } = useToast();

  // If already authenticated when visiting /login or /signup, immediately redirect to /app
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.replace('/app');
      }
    }).catch(() => {});
  }, []);

  const handleOAuth = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toastError('OAuth Error', err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    
    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/update-password`,
        });

        if (error) {
          setError(error.message);
          toastError('Failed to send reset link', error.message);
        } else {
          success('Reset link sent!', 'Check your email for instructions to reset your password.');
          setIsForgotPassword(false);
        }
        setLoading(false);
        return;
      }

      if (!isLogin) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          setError('Please enter a valid email address.');
          setLoading(false);
          return;
        }
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        
        success('Welcome back!');
        try { localStorage.setItem('isAuthenticated', 'true'); } catch(e) {}
        if (rememberMe) {
          try { localStorage.setItem('hc_remember', 'true'); } catch(e) {}
        } else {
          try { localStorage.removeItem('hc_remember'); } catch(e) {}
        }

        // Instant redirect to /app
        window.location.replace('/app');
        return;
      } else {
        const passwordVal = formData.password;
        if (passwordVal.length < 8) {
          setError('Password must be at least 8 characters long.');
          setLoading(false);
          return;
        }
        if (!/[A-Z]/.test(passwordVal)) {
          setError('Password must contain at least one uppercase letter.');
          setLoading(false);
          return;
        }
        if (!/[a-z]/.test(passwordVal)) {
          setError('Password must contain at least one lowercase letter.');
          setLoading(false);
          return;
        }
        if (!/[0-9]/.test(passwordVal)) {
          setError('Password must contain at least one number.');
          setLoading(false);
          return;
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(passwordVal)) {
          setError('Password must contain at least one special character.');
          setLoading(false);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.name },
          }
        });

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        if (!data.session) {
          setVerificationSent(true);
          setLoading(false);
          return;
        }
        
        awardSignupBonus();
        success('Account created! +5 Vitality Points awarded 🎉');
        if (rememberMe) {
          try { localStorage.setItem('hc_remember', 'true'); } catch(e) {}
        } else {
          localStorage.removeItem('hc_remember');
        }
        navigate('/onboarding', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
      toastError('Authentication Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Nav */}
      <nav style={{ padding: isMobile ? '16px 20px' : '24px 40px', width: '100%' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <img src="/logo.png" alt="HealthChain360" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain' }} />
          <span style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '18px' }}>
            HealthChain360
          </span>
        </div>
      </nav>

      {/* Main Form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="card"
          style={{
            width: '100%',
            maxWidth: '440px',
            padding: isMobile ? '24px 20px' : '40px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Glow */}
          <div
            style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'var(--teal-light)',
              filter: 'blur(60px)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />

          {verificationSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(20, 184, 166, 0.1)', color: 'var(--teal)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                <Activity size={32} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>Check your email</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.5', marginBottom: '16px' }}>
                We've sent a secure verification link to <strong>{formData.email}</strong>. Please click the link to activate your account.
              </p>
              <div style={{ background: 'var(--bg-card-hover)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <strong>Not seeing the email?</strong><br/>
                If you previously signed in with Google using this email, no new link will be sent. Try clicking "Back to Sign In" and use the <strong>Continue with Google</strong> button.
              </div>
              <button
                onClick={() => {
                  setVerificationSent(false);
                  navigate('/login');
                }}
                style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '12px', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer' }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <h1 style={{ margin: '0 0 8px 0', fontSize: isMobile ? '24px' : '28px', color: 'var(--text-main)', fontWeight: 700 }}>
                {isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome back' : 'Create an account'}
              </h1>
              <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '15px' }}>
                {isForgotPassword 
                  ? 'Enter your email to receive a password reset link.'
                  : isLogin
                  ? 'Enter your details to access your clinical dashboard.'
                  : 'Start organizing your health journey today.'}
              </p>

              <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                {error && (
                  <div style={{ padding: '12px', background: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', fontSize: '14px', border: '1px solid #FECACA' }}>
                    {error}
                  </div>
                )}
                {!isLogin && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginBottom: '8px',
                      }}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-hover)',
                        color: 'var(--text-main)',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      marginBottom: '8px',
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-hover)',
                      color: 'var(--text-main)',
                      outline: 'none',
                    }}
                  />
                </div>
                {!isForgotPassword && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                        }}
                      >
                        Password
                      </label>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--teal)',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-hover)',
                        color: 'var(--text-main)',
                        outline: 'none',
                      }}
                    />
                    
                    {!isLogin && formData.password.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                        {[
                          { test: (p: string) => p.length >= 8, label: '8+ chars' },
                          { test: (p: string) => /[A-Z]/.test(p), label: 'Uppercase' },
                          { test: (p: string) => /[0-9]/.test(p), label: 'Number' },
                        ].map((req, i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: '4px',
                              background: req.test(formData.password) ? '#10B981' : 'var(--border)',
                              borderRadius: '2px',
                              transition: 'background 0.3s ease',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {!isForgotPassword && !isLogin && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginBottom: '8px',
                      }}
                    >
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-hover)',
                        color: 'var(--text-main)',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}

                {!isForgotPassword && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                        accentColor: 'var(--teal)'
                      }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Remember me for 30 days</span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '10px',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <div style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  ) : isForgotPassword ? (
                    'Send Reset Link'
                  ) : isLogin ? (
                    'Sign In'
                  ) : (
                    'Create Account'
                  )}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </form>

              {!isForgotPassword && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    <span style={{ padding: '0 12px', fontSize: '13px', color: 'var(--text-muted)' }}>Or continue with</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                    <button
                      type="button"
                      onClick={() => handleOAuth('google')}
                      disabled={loading}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text-main)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        opacity: loading ? 0.7 : 1,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      Google
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        try { localStorage.setItem('hc_guest_mode', 'true'); } catch(e) {}
                        navigate('/app');
                      }}
                      disabled={loading}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text-main)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        opacity: loading ? 0.7 : 1,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      Guest
                    </button>
                  </div>
                </>
              )}

              <div
                style={{
                  textAlign: 'center',
                  marginTop: '24px',
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                }}
              >
                {isForgotPassword ? (
                  <>
                    Remember your password?{' '}
                    <span
                      onClick={() => setIsForgotPassword(false)}
                      style={{ color: 'var(--teal)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Back to login
                    </span>
                  </>
                ) : (
                  <>
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    <span
                      onClick={() => navigate(isLogin ? '/signup' : '/login')}
                      style={{ color: 'var(--teal)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {isLogin ? 'Sign up' : 'Log in'}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
