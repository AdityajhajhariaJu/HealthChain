import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHapticLight, triggerHapticHeavy } from '../../services/haptics';

interface CinematicCheckboxProps {
  label: string;
  sublabel?: string;
  initialChecked?: boolean;
  onToggle?: (checked: boolean) => void;
}

// Micro-particle burst component
const ParticleBurst = () => {
  const particles = Array.from({ length: 6 });
  return (
    <div style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation',  position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none' }}>
      {particles.map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: Math.cos((i * 60) * (Math.PI / 180)) * 25,
            y: Math.sin((i * 60) * (Math.PI / 180)) * 25,
            scale: [0, 1.5, 0],
            opacity: [1, 1, 0]
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', 
            position: 'absolute',
            width: '4px', height: '4px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            marginTop: '-2px', marginLeft: '-2px'
          }}
        />
      ))}
    </div>
  );
};

const PillDrop = () => (
  <motion.div
    initial={{ y: -100, x: -10, rotate: -45, scale: 2 }}
    animate={{ y: 20, x: 0, rotate: 0, scale: 0 }}
    transition={{ type: 'spring', damping: 12, stiffness: 100, mass: 2 }}
    style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', 
      position: 'absolute', top: '-20px', right: '-20px', width: '20px', height: '10px',
      borderRadius: '10px', background: 'linear-gradient(90deg, #F43F5E 50%, #FFFFFF 50%)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)', pointerEvents: 'none', zIndex: 10
    }}
  />
);

export const CinematicCheckbox: React.FC<CinematicCheckboxProps> = ({ label, sublabel, initialChecked = false, onToggle }) => {
  const [isChecked, setIsChecked] = useState(initialChecked);
  const [showBurst, setShowBurst] = useState(false);

  const handleToggle = () => {
    const next = !isChecked;
    setIsChecked(next);
    if (onToggle) onToggle(next);

    if (next) {
      // Small delay to let the path-drawing finish before the heavy clunk and burst
      triggerHapticLight();
      setTimeout(() => {
        triggerHapticHeavy();
        setShowBurst(true);
        setTimeout(() => setShowBurst(false), 800);
      }, 300);
    } else {
      triggerHapticLight();
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={handleToggle}
      style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', 
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 20px',
        background: isChecked ? 'rgba(16, 185, 129, 0.05)' : '#FFFFFF',
        border: isChecked ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid #E2E8F0',
        borderRadius: '20px',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'visible',
        boxShadow: isChecked ? 'none' : '0 4px 12px rgba(0,0,0,0.02)'
      }}
    >
      <div style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation',  position: 'relative', flexShrink: 0, width: '28px', height: '28px' }}>
        {/* Checkbox border */}
        <motion.div
          animate={{
            backgroundColor: isChecked ? '#10B981' : '#F8FAFC',
            borderColor: isChecked ? '#10B981' : '#CBD5E1',
            scale: isChecked ? [1, 0.8, 1] : 1
          }}
          transition={{ duration: 0.3 }}
          style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', 
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderWidth: '2px',
            borderStyle: 'solid',
            borderRadius: '8px',
          }}
        />

        {/* Laser-traced checkmark */}
        <svg 
          viewBox="0 0 24 24" 
          style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation',  
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
            padding: '4px', zIndex: 2 
          }}
        >
          <motion.path
            d="M20 6L9 17l-5-5"
            fill="transparent"
            strokeWidth="3"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: isChecked ? 1 : 0, 
              opacity: isChecked ? 1 : 0 
            }}
            transition={{ 
              pathLength: { duration: 0.4, ease: "easeInOut" },
              opacity: { duration: 0.1 }
            }}
          />
        </svg>

        {showBurst && <ParticleBurst />} {showBurst && <PillDrop />}
      </div>

      <div style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation',  flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <motion.span 
          animate={{ 
            color: isChecked ? '#94A3B8' : '#0F172A',
            textDecoration: isChecked ? 'line-through' : 'none'
          }}
          style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation',  fontSize: '16px', fontWeight: 700 }}
        >
          {label}
        </motion.span>
        {sublabel && (
          <span style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation',  fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
            {sublabel}
          </span>
        )}
      </div>
    </motion.button>
  );
};
