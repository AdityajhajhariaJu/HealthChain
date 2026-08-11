import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import FocusTrap from './FocusTrap';

const TOUR_STEPS = [
  {
    title: 'Welcome to HealthChain',
    content: 'Let\'s take a quick tour to help you get the most out of your AI-powered diagnosis navigator.',
  },
  {
    title: 'Your Dashboard',
    content: 'Start here to get an overview of your active cases, open action items, and recent updates.',
  },
  {
    title: 'Multiple Specialists',
    content: 'Get a parallel evaluation from different AI medical experts at the same time to see the whole picture.',
  },
  {
    title: 'MDT Consensus',
    content: 'Our Orchestrator synthesizes findings from all specialists into one unified clinical report.',
  },
  {
    title: 'Privacy First',
    content: 'Your data is securely stored on your device and encrypted. We do not sell your health data.',
  }
];

export default function ProductTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hc_product_tour_seen');
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!hasSeenTour && isAuthenticated) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem('hc_product_tour_seen', 'true');
  };

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(c => c + 1);
    } else {
      dismiss();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(c => c - 1);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(2px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <FocusTrap isActive={isVisible}>
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: '16px',
                padding: '24px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                position: 'relative'
              }}
            >
              <button
                onClick={dismiss}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
                aria-label="Skip Tour"
              >
                <X size={20} />
              </button>

              <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', paddingRight: '32px' }}>
                {TOUR_STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: '4px',
                      flex: 1,
                      backgroundColor: idx <= currentStep ? 'var(--teal)' : 'var(--border)',
                      borderRadius: '2px',
                      transition: 'background-color 0.3s'
                    }}
                  />
                ))}
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 12px 0' }}>
                {TOUR_STEPS[currentStep].title}
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 32px 0', minHeight: '66px' }}>
                {TOUR_STEPS[currentStep].content}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: currentStep === 0 ? 'transparent' : 'var(--text-muted)',
                    cursor: currentStep === 0 ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  onClick={nextStep}
                  style={{
                    backgroundColor: 'var(--teal)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {currentStep === TOUR_STEPS.length - 1 ? (
                    <>Get Started <Check size={16} /></>
                  ) : (
                    <>Next <ChevronRight size={16} /></>
                  )}
                </button>
              </div>
            </motion.div>
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
