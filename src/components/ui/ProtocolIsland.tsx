import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, Activity } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

export const ProtocolIsland = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ position: 'fixed', top: '12px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }}>
      <motion.div
        layout
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label="Toggle Fasting Protocol details"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerHapticLight();
            setExpanded(!expanded);
          }
        }}
        onClick={() => {
          triggerHapticLight();
          setExpanded(!expanded);
        }}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          background: '#000000',
          color: '#FFFFFF',
          borderRadius: '32px',
          padding: expanded ? '16px' : '8px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          cursor: 'pointer',
          pointerEvents: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          minWidth: expanded ? '300px' : 'auto',
          overflow: 'hidden'
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <motion.div layout style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ width: '8px', height: '8px', background: '#10B981', borderRadius: '50%' }}
          />
          <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.2px' }}>16h Fasting Protocol</span>
          {!expanded && (
            <motion.div layout style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', marginLeft: '8px' }}>
              <Clock size={14} />
              <span style={{ fontSize: '13px', fontWeight: 700 }}>02:15:00</span>
            </motion.div>
          )}
        </motion.div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div style={{ background: 'rgba(255,255,255,0.1)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} style={{ background: '#10B981', height: '100%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>
                <span>Elapsed: 13h 45m</span>
                <span>Goal: 16h</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHapticLight();
                  setExpanded(false);
                }}
                style={{ background: '#10B981', color: '#000', border: 'none', padding: '10px', borderRadius: '16px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '4px' }}
              >
                <CheckCircle2 size={16} /> Complete Fast
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};