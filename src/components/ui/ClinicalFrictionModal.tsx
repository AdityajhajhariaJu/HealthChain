import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Fingerprint, Lock, CheckCircle2, Activity, X } from 'lucide-react';
import { triggerHapticHeavy, triggerHapticLight } from '../../services/haptics';

interface Props {
  isOpen: boolean;
  onComplete: () => void;
  title?: string;
}

export const ClinicalFrictionModal: React.FC<Props> = ({ isOpen, onComplete, title = "Decrypting Secure Medical Record" }) => {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    if (isOpen) {
      setPhase(0);
      triggerHapticLight();
      
      const t1 = setTimeout(() => { setPhase(1); triggerHapticLight(); }, 800);
      const t2 = setTimeout(() => { setPhase(2); triggerHapticHeavy(); }, 1800);
      const t3 = setTimeout(() => { setPhase(3); triggerHapticLight(); }, 2500);
      const t4 = setTimeout(() => { onComplete(); }, 3000);

      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }
  }, [isOpen, onComplete]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            padding: '24px'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            style={{
              background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
              border: '1px solid #334155',
              borderRadius: '24px',
              padding: '32px',
              width: '100%',
              maxWidth: '360px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 24px 48px rgba(0,0,0,0.4)'
            }}
          >
            {/* Animated Icon Ring */}
            <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  border: '2px dashed rgba(16, 185, 129, 0.3)',
                  borderRadius: '50%'
                }}
              />
              <AnimatePresence mode="wait">
                {phase === 0 && <motion.div key="p0" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Lock size={32} color="#94A3B8" /></motion.div>}
                {phase === 1 && <motion.div key="p1" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Shield size={32} color="#3B82F6" /></motion.div>}
                {phase === 2 && <motion.div key="p2" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Activity size={32} color="#10B981" /></motion.div>}
                {phase === 3 && <motion.div key="p3" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><CheckCircle2 size={32} color="#10B981" /></motion.div>}
              </AnimatePresence>
            </div>

            <button aria-label="Close modal" onClick={onComplete} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={20} /></button>
              <h3 style={{ color: '#F8FAFC', fontSize: '18px', fontWeight: 600, margin: '0 0 16px', textAlign: 'center' }}>
              {title}
            </h3>

            {/* Stepper text */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <StepRow text="Verifying E2E Encryption" active={phase >= 0} completed={phase > 0} />
              <StepRow text="Cross-referencing Global Models" active={phase >= 1} completed={phase > 1} />
              <StepRow text="Synthesizing Clinical AI Output" active={phase >= 2} completed={phase > 2} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const StepRow = ({ text, active, completed }: { text: string, active: boolean, completed: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: active ? 1 : 0.3 }}>
    <div style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
      {completed ? (
        <CheckCircle2 size={16} color="#10B981" />
      ) : active ? (
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6' }} />
        </motion.div>
      ) : (
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#64748B' }} />
      )}
    </div>
    <span style={{ fontSize: '13px', color: completed ? '#94A3B8' : active ? '#F8FAFC' : '#64748B', fontWeight: 500 }}>
      {text}
    </span>
  </div>
);
