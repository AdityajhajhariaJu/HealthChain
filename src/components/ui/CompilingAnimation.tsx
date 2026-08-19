import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Network, Activity, FileText, CheckCircle2, Sparkles } from 'lucide-react';

const STEPS = [
  { id: 'sync', icon: Network, label: 'Synchronizing clinical perspectives', desc: 'Aggregating AI specialist inputs' },
  { id: 'correlate', icon: Brain, label: 'Correlating symptom data', desc: 'Finding hidden multi-system patterns' },
  { id: 'evidence', icon: Activity, label: 'Reviewing clinical evidence', desc: 'Cross-referencing medical literature' },
  { id: 'compile', icon: FileText, label: 'Compiling final medical brief', desc: 'Structuring data for clinician review' }
];

export function CompilingAnimation({ isDark = false }: { isDark?: boolean }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const mutedColor = isDark ? '#94A3B8' : '#64748B';
  const activeColor = isDark ? '#818CF8' : '#6366F1';
  const bgColor = isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.8)';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        maxWidth: '500px',
        margin: '0 auto',
        width: '100%',
        minHeight: '400px'
      }}
    >
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #6366F1, #A855F7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '32px',
          boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)'
        }}
      >
        <Sparkles size={40} color="#FFF" />
      </motion.div>

      <h2 style={{ fontSize: '24px', fontWeight: 800, color: textColor, marginBottom: '8px', textAlign: 'center' }}>
        Synthesizing Case Data
      </h2>
      <p style={{ fontSize: '15px', color: mutedColor, marginBottom: '40px', textAlign: 'center' }}>
        Our AI engines are processing your inputs.
      </p>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {STEPS.map((step, index) => {
          const isActive = index === activeStep;
          const isPast = index < activeStep;
          const Icon = step.icon;
          
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ 
                opacity: isPast || isActive ? 1 : 0.4,
                x: 0,
                scale: isActive ? 1.02 : 1
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                background: bgColor,
                borderRadius: '16px',
                border: `1px solid ${isActive ? activeColor : borderColor}`,
                boxShadow: isActive ? `0 8px 24px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(99, 102, 241, 0.15)'}` : 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="active-highlight"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    background: activeColor
                  }}
                />
              )}
              
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: isPast ? '#10B981' : (isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent'),
                border: `1px solid ${isPast ? '#10B981' : (isActive ? activeColor : mutedColor)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isPast ? '#FFF' : (isActive ? activeColor : mutedColor)
              }}>
                {isPast ? <CheckCircle2 size={20} /> : <Icon size={20} />}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: (isActive || isPast) ? textColor : mutedColor }}>
                  {step.label}
                </div>
                <div style={{ fontSize: '13px', color: mutedColor, marginTop: '2px' }}>
                  {step.desc}
                </div>
              </div>

              {isActive && (
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: activeColor
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}