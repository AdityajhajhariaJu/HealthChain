import { useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import { setItemSync } from '../../services/storage';

export default function Auth() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          if (error.message.includes('Failed to fetch') || error.message.includes('placeholder')) {
            console.warn('Supabase not configured, falling back to local auth simulation');
          } else {
            throw error;
          }
        }
        
        setItemSync('isAuthenticated', 'true');
        navigate('/app');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.name },
          }
        });

        if (error) {
          if (error.message.includes('Failed to fetch') || error.message.includes('placeholder')) {
            console.warn('Supabase not configured, falling back to local auth simulation');
          } else {
            throw error;
          }
        }
        
        setItemSync('isAuthenticated', 'true');
        setItemSync(
          'hc_account',
          JSON.stringify({
            name: formData.name,
            email: formData.email,
            createdAt: new Date().toISOString(),
          })
        );
        navigate('/onboarding');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
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
          <Activity size={24} color="var(--teal)" />
          <span style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '18px' }}>
            HealthChain
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

          <h2
            style={{
              fontSize: '28px',
              fontWeight: 700,
              marginBottom: '8px',
              color: 'var(--text-main)',
            }}
          >
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '15px' }}>
            {isLogin
              ? 'Enter your details to access your clinical dashboard.'
              : 'Start your diagnostic journey today.'}
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
                Password
              </label>
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '10px',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')} <ArrowRight size={18} />
            </button>
          </form>

          <div
            style={{
              textAlign: 'center',
              marginTop: '24px',
              fontSize: '14px',
              color: 'var(--text-muted)',
            }}
          >
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <span
              onClick={() => navigate(isLogin ? '/signup' : '/login')}
              style={{ color: 'var(--teal)', fontWeight: 600, cursor: 'pointer' }}
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
