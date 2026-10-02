import { Activity } from 'lucide-react';
import styles from '../Landing.module.css';
export default function LandingLaunchStatus() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"

      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#FBF9F6',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
      }}
    >
      <div
        style={{
          width: '68px',
          height: '68px',
          borderRadius: '50%',
          background: '#ECFDF5',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)',
        }}
      >
        <Activity size={32} color="#059669" />
      </div>

      <h2
        style={{
          fontSize: '28px',
          fontWeight: 900,
          color: '#0F172A',
          margin: 0,
          letterSpacing: '-0.5px',
        }}
      >
        Opening your workspace…
      </h2>

      <div
        style={{
          width: '140px',
          height: '4px',
          background: '#E2E8F0',
          marginTop: '12px',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '4px',
        }}
      >
        <div
          className={styles.launchProgress}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '50%',
            background: '#059669',
            borderRadius: '4px',
          }}
        />
      </div>
    </div>
  );
}
