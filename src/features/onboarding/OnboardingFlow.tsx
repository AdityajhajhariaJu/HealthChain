import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { triggerHapticLight } from '../../services/haptics';

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const handleSelect = () => {
    triggerHapticLight();
    localStorage.setItem('hc_onboarded', 'true');
    navigate('/app/today');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0F172A', color: 'white', zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '32px' }}>
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
            onClick={() => { triggerHapticLight(); setStep(1); }}
          >
            <h1 style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-1px', textAlign: 'center' }}>Let's build your health story.</h1>
            <p style={{ color: '#94A3B8', marginTop: '16px', opacity: 0.8 }}>Tap anywhere to begin</p>
          </motion.div>
        )}
        
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
          >
            <h2 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.5px', marginBottom: '32px' }}>What brings you to HealthChain?</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { title: 'Chronic Management', desc: 'Organize symptoms & labs' },
                { title: 'Athletic Peak', desc: 'Optimize performance & recovery' },
                { title: 'Mental Clarity', desc: 'Focus, sleep, and meditation' }
              ].map((goal, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSelect}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '24px',
                    padding: '24px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'white' }}>{goal.title}</h3>
                  <p style={{ margin: '8px 0 0 0', color: '#94A3B8', fontSize: '15px' }}>{goal.desc}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}