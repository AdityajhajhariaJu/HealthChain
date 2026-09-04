import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';
import { motion } from 'framer-motion';

export const FatigueModeToggle = () => {
  const [isFatigued, setIsFatigued] = useState(false);

  const toggle = () => {
    triggerHapticLight();
    const next = !isFatigued;
    setIsFatigued(next);
    
    // In a real app this would use a React Context or Zustand store, 
    // but applying to document body works for global CSS overrides.
    if (next) {
      document.body.classList.add('fatigue-mode-active');
    } else {
      document.body.classList.remove('fatigue-mode-active');
    }
  };

  return (
    <div style={{ padding: '0 24px', margin: '16px 0', display: 'flex', justifyContent: 'flex-end' }}>
      <button 
        onClick={toggle}
        aria-label={isFatigued ? "Disable Fatigue UI" : "Enable Fatigue UI"}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 16px', borderRadius: '20px', border: 'none',
          background: isFatigued ? '#3B82F6' : 'rgba(0,0,0,0.05)',
          color: isFatigued ? '#FFF' : '#64748B',
          fontSize: '13px', fontWeight: 600,
          transition: 'all 0.3s ease'
        }}
      >
        {isFatigued ? <Moon size={16} /> : <Sun size={16} />}
        {isFatigued ? 'Fatigue UI Active' : 'Standard UI'}
      </button>

      <style>{`
        body.fatigue-mode-active {
          /* Enlarge base font sizes and tap targets */
          --ui-scale: 1.15;
          /* Increase contrast */
          --text-primary: #000000;
          --text-secondary: #333333;
          background: #F1F5F9;
        }
        body.fatigue-mode-active .app-shell__grid {
          filter: contrast(1.1);
        }
        body.fatigue-mode-active button {
          transform: scale(var(--ui-scale));
          transform-origin: center right;
        }
        body.fatigue-mode-active h2 {
          font-size: calc(20px * var(--ui-scale)) !important;
          color: #000 !important;
        }
        body.fatigue-mode-active p {
          color: #333 !important;
        }
      `}</style>
    </div>
  );
};
