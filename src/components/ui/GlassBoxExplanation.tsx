import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, FileText, Activity, ChevronRight, CheckCircle2 } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

export const GlassBoxExplanation = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => {
    triggerHapticLight();
    setIsOpen(!isOpen);
  };

  return (
    <div style={{ marginTop: '12px' }}>
      <button
        onClick={toggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Collapse neural breakdown" : "Expand neural breakdown"}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none', padding: 0,
          color: '#10B981', fontSize: '13px', fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        <Brain size={14} /> Neural Breakdown {isOpen ? 'Collapse' : 'Expand'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              background: 'rgba(255, 255, 255, 0.5)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              
              {/* Evidence 1 */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Activity size={14} color="#10B981" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Apple Health (Sleep Data)</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                    Analyzed last 3 nights. Found average deep sleep of 42 mins (below optimal 90 mins threshold).
                  </div>
                </div>
              </div>

              {/* Evidence 2 */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={14} color="#3B82F6" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Clinical Literature (PubMed ID: 23853635)</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                    Cross-referenced Magnesium Glycinate efficacy on slow-wave sleep enhancement.
                  </div>
                </div>
              </div>

              {/* Conclusion */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={14} color="#F59E0B" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Synthesized Recommendation</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                    Recommended 200mg dosage at 9:00 PM to align with circadian dip.
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
