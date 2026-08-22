import React, { useEffect } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function FallbackError({ error, resetErrorBoundary }) {
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (error && (error.message.includes('dynamically imported module') || error.message.includes('Importing a module script failed'))) {
      if (!sessionStorage.getItem('hc_reloaded_for_chunk')) {
        sessionStorage.setItem('hc_reloaded_for_chunk', 'true');
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '250px',
        padding: '24px',
        background: '#FEF2F2',
        borderRadius: '32px',
        border: '1px solid #FECACA',
        textAlign: 'center',
        margin: '20px',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: '#FFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)',
          marginBottom: '24px',
        }}
      >
        <ShieldAlert size={32} color="#EF4444" />
      </div>
      <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#7F1D1D', marginBottom: '12px' }}>
        A system error occurred
      </h2>
      <p style={{ color: '#991B1B', maxWidth: '400px', marginBottom: '24px', lineHeight: 1.6 }}>
        Our case-assessment module encountered an unexpected fault. The rest of the
        application is still functioning.
      </p>

      {error && (
        <pre
          style={{
            background: '#FFF',
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            color: '#EF4444',
            fontSize: '11px',
            textAlign: 'left',
            maxWidth: '100%',
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: '300px',
            marginBottom: '32px',
            border: '1px solid #FCA5A5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {error.message}
          {'\n\n'}
          {error.stack}
        </pre>
      )}

      <button
        onClick={resetErrorBoundary}
        style={{
          padding: '14px 28px',
          background: '#EF4444',
          color: '#FFF',
          border: 'none',
          borderRadius: '999px',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
        }}
      >
        <RefreshCw size={18} /> Recover Module
      </button>
    </div>
  );
}
