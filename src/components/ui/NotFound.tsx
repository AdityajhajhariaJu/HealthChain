import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '24px',
          padding: '24px',
          textAlign: 'center',
          maxWidth: '500px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            marginBottom: '24px'
          }}
        >
          <AlertCircle size={40} />
        </div>
        
        <h1 style={{ fontSize: '32px', color: 'var(--text-main)', marginBottom: '16px', margin: 0 }}>
          Page Not Found
        </h1>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: '1.6' }}>
          We couldn't find the page you were looking for. It might have been moved, deleted, or never existed in the first place.
        </p>

        <button
          onClick={() => {
            try {
              localStorage.setItem('hc_onboarded', 'true');
            } catch (e) {}
            navigate('/app/today', { replace: true });
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--teal)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'opacity 0.2s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Home size={20} />
          Return to Dashboard
        </button>
      </motion.div>
    </div>
  );
}
