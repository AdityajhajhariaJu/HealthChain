import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { triggerHapticLight, triggerHapticMedium } from '../../services/haptics';
import { Flame, Moon, ChevronRight, Sparkles, HeartPulse } from 'lucide-react';

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const handleSelect = () => {
    triggerHapticMedium();
    localStorage.setItem('hc_onboarded', 'true');
    navigate('/app/today');
  };

  return (
    <div style={{ 
      position: 'fixed', inset: 0, 
      background: 'url("/ava-floral-bg.jpg") center/cover no-repeat',
      zIndex: 9999, 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }} />

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', padding: '32px' }}>
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(16px)' }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
            >
              <div style={{ background: 'rgba(255,255,255,0.8)', padding: '16px', borderRadius: '50%', marginBottom: '32px', border: '1px solid rgba(15,23,42,0.1)' }}>
                <Sparkles size={36} color="#10B981" />
              </div>
              <h1 style={{ fontSize: '38px', fontWeight: 700, letterSpacing: '-1px', textAlign: 'center', color: '#0F172A', margin: '0 0 16px 0', lineHeight: 1.15 }}>
                Let's build your<br/>health story.
              </h1>
              <p style={{ color: '#475569', fontSize: '18px', textAlign: 'center', margin: 0, fontWeight: 400, opacity: 0.9 }}>
                Clinical precision meets daily wellness.
              </p>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                onClick={() => { triggerHapticLight(); setStep(1); }}
                style={{
                  marginTop: 'auto',
                  marginBottom: '20px',
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(15,23,42,0.15)',
                  padding: '16px 32px',
                  borderRadius: '99px',
                  color: '#0F172A',
                  fontSize: '17px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(12px)',
                  cursor: 'pointer'
                }}
                whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.9)' }}
                whileTap={{ scale: 0.95 }}
              >
                Begin Journey <ChevronRight size={20} />
              </motion.button>
            </motion.div>
          )}
          
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <h2 style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '12px', color: '#0F172A', lineHeight: 1.2 }}>What brings you to<br/><span style={{ color: '#10B981' }}>HealthChain</span>?</h2>
              <p style={{ color: '#64748B', fontSize: '16px', marginBottom: '40px' }}>Select your primary focus to personalize your experience.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { title: 'Chronic Management', desc: 'Organize symptoms & labs', icon: <HeartPulse size={26} color="#F43F5E" /> },
                  { title: 'Track Calories', desc: 'Monitor macros & nutrition goals', icon: <Flame size={26} color="#F59E0B" /> },
                  { title: 'Mental Clarity', desc: 'Focus, sleep, and meditation', icon: <Moon size={26} color="#8B5CF6" /> }
                ].map((goal, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 + 0.2 }}
                    whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.7)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSelect}
                    style={{
                      background: 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(15,23,42,0.12)',
                      borderRadius: '24px',
                      padding: '20px 24px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px'
                    }}
                  >
                    <div style={{ background: 'rgba(255,255,255,0.5)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(15,23,42,0.05)' }}>
                      {goal.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.3px' }}>{goal.title}</h3>
                      <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '14px' }}>{goal.desc}</p>
                    </div>
                    <ChevronRight size={20} color="#64748B" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}