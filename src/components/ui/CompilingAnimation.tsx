import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Network, Activity, FileText, CheckCircle2, Sparkles, Database, GitMerge, Fingerprint } from 'lucide-react';

const STEPS = [
  { id: 'sync', icon: Network, label: 'Synchronizing clinical perspectives', desc: 'Aggregating AI specialist inputs' },
  { id: 'correlate', icon: GitMerge, label: 'Correlating symptom clusters', desc: 'Mapping interactions across body systems' },
  { id: 'evidence', icon: Database, label: 'Querying medical literature', desc: 'Cross-referencing global clinical trials' },
  { id: 'analyze', icon: Brain, label: 'Synthesizing discussion pathways', desc: 'Separating reported facts, possibilities, and gaps' },
  { id: 'map', icon: Fingerprint, label: 'Generating case connection map', desc: 'Plotting possible relationships & evidence gaps' },
  { id: 'compile', icon: FileText, label: 'Compiling final medical brief', desc: 'Structuring data for clinician review' }
];

const COMPUTATION_STRINGS = [
  "Analyzing biomarker correlations...",
  "Organizing possible discussion pathways...",
  "Checking for drug-symptom interactions...",
  "Mapping systemic inflammatory pathways...",
  "Checking context and uncertainty labels...",
  "Cross-referencing patient history...",
  "Synthesizing multidisciplinary perspectives...",
  "Formatting output for clinical interoperability..."
];

export function CompilingAnimation({ isDark = false, isMobile = false }: { isDark?: boolean; isMobile?: boolean }) {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [compText, setCompText] = useState(COMPUTATION_STRINGS[0]);

  useEffect(() => {
    // 6 steps over ~10 seconds = about 1667ms per step
    const stepInterval = setInterval(() => {
      setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }, 10000 / STEPS.length);

    // Smooth progress bar over 10 seconds
    const startTime = Date.now();
    const duration = 10000;
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(progressInterval);
    }, 50);

    // Random terminal text
    const textInterval = setInterval(() => {
      setCompText(COMPUTATION_STRINGS[Math.floor(Math.random() * COMPUTATION_STRINGS.length)]);
    }, 1200);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      clearInterval(textInterval);
    };
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
        padding: isMobile ? '20px 10px' : '40px 20px',
        maxWidth: '540px',
        margin: '0 auto',
        width: '100%',
        minHeight: isMobile ? '400px' : '500px',
        position: 'relative',
        zIndex: 10
      }}
    >
      {/* Background ambient pulse */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(168,85,247,0) 70%)',
          borderRadius: '50%',
          zIndex: -1,
          pointerEvents: 'none'
        }}
      />

      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 90, 180, 270, 360]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        style={{
          width: isMobile ? '50px' : '80px',
          height: isMobile ? '50px' : '80px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #6366F1, #A855F7, #EC4899)',
          backgroundSize: '200% 200%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: '0 20px 40px rgba(99, 102, 241, 0.4)'
        }}
      >
        <motion.div animate={{ rotate: [-360, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}>
          <Brain size={isMobile ? 24 : 40} color="#FFF" />
        </motion.div>
      </motion.div>

      <h2 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 900, color: textColor, marginBottom: '8px', textAlign: 'center' }}>
        Synthesizing Case Data
      </h2>
      <div style={{ height: '24px', overflow: 'hidden', marginBottom: '32px' }}>
        <AnimatePresence mode="wait">
          <motion.p 
            key={compText}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: '14px', color: activeColor, margin: 0, textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}
          >
            &gt; {compText}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '6px', background: isDark ? '#334155' : '#E2E8F0', borderRadius: '3px', marginBottom: '32px', overflow: 'hidden' }}>
        <motion.div 
          style={{ height: '100%', background: 'linear-gradient(90deg, #6366F1, #A855F7)', borderRadius: '3px' }}
          initial={{ width: '0%' }}
          animate={{ scaleX: progress / 100 }}
          transition={{ ease: 'linear' }}
        />
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px' }}>
        {STEPS.map((step, index) => {
          const isActive = index === activeStep;
          const isPast = index < activeStep;
          const Icon = step.icon;
          
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ 
                opacity: isPast || isActive ? 1 : 0.3,
                x: 0,
                scale: isActive ? 1.02 : 1
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '10px' : '16px',
                padding: isMobile ? '8px 12px' : '12px 16px',
                background: isActive ? (isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)') : bgColor,
                borderRadius: '16px',
                border: `1px solid ${isActive ? activeColor : borderColor}`,
                boxShadow: isActive ? `0 8px 24px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(99, 102, 241, 0.15)'}` : 'none',
                position: 'relative',
                overflow: 'hidden',
                transition: 'background 0.3s'
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
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: isPast ? '#10B981' : (isActive ? activeColor : 'transparent'),
                border: `1px solid ${isPast ? '#10B981' : (isActive ? activeColor : mutedColor)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: (isPast || isActive) ? '#FFF' : mutedColor,
                transition: 'all 0.3s'
              }}>
                {isPast ? <CheckCircle2 size={18} /> : <Icon size={18} />}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: 700, color: (isActive || isPast) ? textColor : mutedColor }}>
                  {step.label}
                </div>
                <div style={{ fontSize: isMobile ? '11px' : '13px', color: mutedColor, marginTop: '2px' }}>
                  {step.desc}
                </div>
              </div>

              {isActive && (
                <motion.div
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: activeColor,
                    boxShadow: `0 0 10px ${activeColor}`
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
