import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Activity, ShieldCheck, ChevronRight } from 'lucide-react';
import { triggerHapticLight, triggerHapticHeavy } from '../../services/haptics';
import { useActionIslandStore } from '../../store/actionIslandStore';

export const MedicalActionIsland = () => {
  const [expanded, setExpanded] = useState(false);
  const { currentState, title, subtitle, actionText, dismissIsland } = useActionIslandStore();

  // Auto-collapse after some time
  useEffect(() => {
    if (expanded) {
      const timer = setTimeout(() => {
        setExpanded(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [expanded]);

  const toggleIsland = () => {
    triggerHapticLight();
    setExpanded(!expanded);
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticHeavy();
    dismissIsland();
    setExpanded(false);
  };

  if (currentState === 'idle') return null;

  return (
    <div style={{
      position: 'fixed',
      top: 'env(safe-area-inset-top, 44px)',
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      zIndex: 9999,
      pointerEvents: 'none',
      marginTop: '12px'
    }}>
      <motion.div
        layout
        onClick={toggleIsland}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '32px',
          padding: expanded ? '16px 20px' : '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          pointerEvents: 'auto',
          cursor: 'pointer',
          minWidth: expanded ? '320px' : 'auto',
          overflow: 'hidden'
        }}
        transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.8 }}
      >
        <motion.div layout style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          {/* Icon */}
          <motion.div layout style={{ 
            width: '32px', height: '32px', borderRadius: '50%', 
            background: currentState === 'medication' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {currentState === 'medication' ? <Pill size={16} color="#F43F5E" /> : <Activity size={16} color="#10B981" />}
          </motion.div>

          {/* Collapsed State Text */}
          <AnimatePresence mode="popLayout">
            {!expanded && (
              <motion.div
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(4px)', scale: 0.9 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span style={{ color: '#F8FAFC', fontSize: '14px', fontWeight: 600, letterSpacing: '-0.2px' }}>
                  {title}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expanded State Header */}
          <AnimatePresence mode="popLayout">
            {expanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ flex: 1 }}
              >
                <div style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {subtitle}
                </div>
                <div style={{ color: '#F8FAFC', fontSize: '16px', fontWeight: 700 }}>
                  {title}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Expanded Actions */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              style={{ width: '100%', display: 'flex', gap: '8px' }}
            >
              <button 
                onClick={handleAction}
                style={{ 
                  flex: 1, padding: '12px', borderRadius: '16px', border: 'none',
                  background: currentState === 'medication' ? '#F43F5E' : '#10B981',
                  color: '#FFFFFF', fontSize: '14px', fontWeight: 700,
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px'
                }}
              >
                <>{actionText} {currentState === 'medication' ? <ShieldCheck size={16} /> : <ChevronRight size={16} />}</>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
