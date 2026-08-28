import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pause, Play } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

interface ZenBreathingPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  bgImage?: string;
}

export function ZenBreathingPlayer({ isOpen, onClose, bgImage = 'https://images.unsplash.com/photo-1518085250985-78e7bbdf6a62?auto=format&fit=crop&q=80' }: ZenBreathingPlayerProps) {
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  
  useEffect(() => {
    if (!isPlaying) return;
    
    let currentPhase = 'Inhale';
    const interval = setInterval(() => {
      triggerHapticLight();
      if (currentPhase === 'Inhale') { currentPhase = 'Hold'; }
      else if (currentPhase === 'Hold') { currentPhase = 'Exhale'; }
      else { currentPhase = 'Inhale'; }
      
      setPhase(currentPhase as any);
    }, 4000); 
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white',
          fontFamily: 'sans-serif',
          backgroundColor: 'black',
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />

        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', zIndex: 10, paddingTop: '48px' }}>
          <button 
            onClick={onClose} 
            style={{ padding: '8px', backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', borderRadius: '9999px', border: 'none', cursor: 'pointer' }}
          >
            <X size={24} color="white" />
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, position: 'relative', width: '100%' }}>
            <motion.div 
                style={{ position: 'absolute', width: '256px', height: '256px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '9999px' }}
                animate={{ scale: isPlaying ? (phase === 'Inhale' ? 1.5 : phase === 'Exhale' ? 1 : 1.5) : 1 }}
                transition={{ duration: 4, ease: "easeInOut" }}
            />
            <motion.div 
                style={{ position: 'absolute', width: '192px', height: '192px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '9999px' }}
                animate={{ scale: isPlaying ? (phase === 'Inhale' ? 1.4 : phase === 'Exhale' ? 1 : 1.4) : 1 }}
                transition={{ duration: 4, ease: "easeInOut", delay: 0.1 }}
            />
            <motion.div 
                style={{ position: 'absolute', width: '128px', height: '128px', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(4px)' }}
                animate={{ scale: isPlaying ? (phase === 'Inhale' ? 1.2 : phase === 'Exhale' ? 1 : 1.2) : 1 }}
                transition={{ duration: 4, ease: "easeInOut", delay: 0.2 }}
            >
                <span style={{ fontSize: '20px', fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{isPlaying ? phase : 'Ready'}</span>
            </motion.div>
        </div>

        <div style={{ width: '100%', padding: '32px', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', marginBottom: '32px' }}>
            <button 
                onClick={() => {
                    triggerHapticLight();
                    setIsPlaying(!isPlaying);
                }}
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(24px)',
                  borderRadius: '9999px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: '1px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 0 40px rgba(255,255,255,0.1)',
                  cursor: 'pointer'
                }}
            >
                {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" style={{ marginLeft: '8px' }} />}
            </button>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 500, padding: '0 16px' }}>
                <span>00:00</span>
                <span>10:00</span>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '9999px', overflow: 'hidden', margin: '0 16px' }}>
                <div style={{ height: '100%', backgroundColor: 'white', width: '0' }} />
            </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}