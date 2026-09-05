import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Activity, Moon, Heart, Footprints, Thermometer, Wind, ChevronRight, ShieldCheck } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';
import { getWeeklySymptomSeverity, getExposureTrends } from '../../services/TriggerEngine';
import FocusTrap from './FocusTrap';

interface TriggerSensitivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMindfulness?: () => void;
}

export const TriggerSensitivityModal: React.FC<TriggerSensitivityModalProps> = ({
  isOpen,
  onClose,
  onOpenMindfulness,
}) => {
  const [activeTab, setActiveTab] = useState<'trends' | 'sensitivities'>('trends');
  const weeklySeverity = getWeeklySymptomSeverity();
  const exposureTrends = getExposureTrends();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <FocusTrap isActive={isOpen}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Whole Health Picture and Food Sensitivities"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF8F3 40%, #FEF2E8 100%)',
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              border: '1.5px solid rgba(254, 215, 195, 0.95)',
              boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Grab Handle */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '12px' }}>
              <div style={{ width: '40px', height: '4.5px', borderRadius: '999px', background: '#E2E8F0' }} />
            </div>

            {/* Header */}
            <div
              style={{
                padding: '16px 24px 12px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#E11D48', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  PRECISION METABOLIC INTELLIGENCE
                </span>
                <h2 style={{ margin: '2px 0 0 0', fontSize: '22px', fontWeight: 800, color: '#1C1917', letterSpacing: '-0.4px' }}>
                  Your Whole <span style={{ color: '#E11D48' }}>Health Picture</span>
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  onClose();
                }}
                aria-label="Close modal"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1.5px solid #F3D9C9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#78716C',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Top Metric Pills (Image 4 Reference) */}
            <div
              style={{
                padding: '0 20px 14px 20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
              }}
            >
              <div style={{
                background: '#FFFFFF', borderRadius: '18px', padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #F1F5F9',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                  <Moon size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Sleep</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>7h 45m</div>
                </div>
              </div>

              <div style={{
                background: '#FFFFFF', borderRadius: '18px', padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #F1F5F9',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E11D48' }}>
                  <Heart size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Resting HR</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>64 bpm</div>
                </div>
              </div>

              <div style={{
                background: '#FFFFFF', borderRadius: '18px', padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #F1F5F9',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                  <Footprints size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Steps</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>8,420</div>
                </div>
              </div>

              <div style={{
                background: '#FFFFFF', borderRadius: '18px', padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #F1F5F9',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                  <Thermometer size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Symptoms</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>Mild (Gut)</div>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 32px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Weekly Symptom Severity Bar Chart Card (Image 3 Reference) */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '22px',
                padding: '18px 20px',
                border: '1.5px solid #F1F5F9',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={17} color="#E11D48" />
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917' }}>Symptom Severity</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>7-Day History</span>
                </div>

                {/* Bars */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '110px', padding: '0 8px 8px 8px' }}>
                  {weeklySeverity.map((col, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <div
                        style={{
                          width: '28px',
                          height: `${col.height}px`,
                          borderRadius: '8px',
                          background: col.color,
                          boxShadow: `0 4px 12px ${col.color}40`,
                          transition: 'height 0.4s ease',
                        }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                        {col.day}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F8FAFC' }}>
                  <span style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} /> Severe
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} /> Moderate
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} /> Calm / Stable
                  </span>
                </div>
              </div>

              {/* Exposure Curves Card */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '22px',
                padding: '18px 20px',
                border: '1.5px solid #F1F5F9',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#8E9AAF', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '14px' }}>
                  BIOCHEMICAL EXPOSURE
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {exposureTrends.map((exp) => (
                    <div key={exp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '110px' }}>
                        <span style={{ fontSize: '18px' }}>{exp.icon}</span>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1C1917' }}>{exp.name}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>{exp.bites} exposures</div>
                        </div>
                      </div>

                      <div style={{ flex: 1, height: '34px', position: 'relative' }}>
                        <svg viewBox="0 0 120 35" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                          <path d={exp.path} fill="none" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                      </div>

                      <div style={{
                        padding: '4px 8px', borderRadius: '999px',
                        background: '#FFF1F2', color: '#E11D48',
                        fontSize: '12.5px', fontWeight: 800, whiteSpace: 'nowrap'
                      }}>
                        {exp.changePercent}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Food Sensitivities Pill Cloud (Image 4 Reference) */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '22px',
                padding: '18px 20px',
                border: '1.5px solid #F1F5F9',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#8E9AAF', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>
                  FOOD SENSITIVITIES
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { label: 'Histamine', icon: '⚗️', color: '#E11D48', bg: '#FFF1F2' },
                    { label: 'Salicylate', icon: '🌸', color: '#BE185D', bg: '#FDF2F8' },
                    { label: 'Oxalates', icon: '💎', color: '#0284C7', bg: '#F0F9FF' },
                    { label: 'FODMAPs', icon: '🌾', color: '#D97706', bg: '#FFFBEB' },
                    { label: 'Tyramine', icon: '🧀', color: '#7C3AED', bg: '#F5F3FF' },
                    { label: 'Sulfites', icon: '🍷', color: '#B91C1C', bg: '#FEF2F2' },
                    { label: '+14 more tracked', icon: '✨', color: '#475569', bg: '#F8FAFC' },
                  ].map((s, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        background: s.bg,
                        color: s.color,
                        fontSize: '13px',
                        fontWeight: 700,
                        border: `1px solid ${s.color}25`,
                      }}
                    >
                      <span>{s.icon}</span> {s.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Calm Your Body & Mind Card (Image 4 Left Reference) */}
              <div style={{
                background: 'linear-gradient(135deg, #FFF7F2 0%, #FFEFE6 100%)',
                borderRadius: '22px',
                padding: '18px 20px',
                border: '1.5px solid #FCD9C6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#EA580C', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '2px' }}>
                    MINDFULNESS & VAGAL TONE
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#1C1917' }}>
                    Calm your body & mind
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#78716C', marginTop: '2px' }}>
                    4-7-8 parasympathetic breathwork to settle autonomic gut contractions.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    onClose();
                    if (onOpenMindfulness) {
                      onOpenMindfulness();
                    } else {
                      window.dispatchEvent(new CustomEvent('hc_reopen_meditation'));
                    }
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(255, 107, 74, 0.3)',
                    flexShrink: 0,
                  }}
                >
                  <Wind size={15} /> Practice
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      </FocusTrap>
    </AnimatePresence>
  );
};
