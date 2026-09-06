import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, HelpCircle, ChevronRight, Activity, ShieldCheck, AlertTriangle, Clock, Pill, ArrowRight, Stethoscope } from 'lucide-react';
import { getFunctionalBiomarkers, FunctionalBiomarker } from '../../services/ConnectionDetectiveEngine';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';

export const FunctionalBiomarkersView: React.FC = () => {
  const [biomarkers] = useState<FunctionalBiomarker[]>(getFunctionalBiomarkers());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(biomarkers[0]?.id || null);

  const categories = [
    { id: 'all', label: 'All Biomarkers', icon: '🧪' },
    { id: 'metabolic', label: 'Cellular Energetics', icon: '⚡' },
    { id: 'endocrine', label: 'Thyroid Axis', icon: '🦋' },
    { id: 'immune', label: 'Barrier & Immunity', icon: '🛡️' },
    { id: 'enteric', label: 'Gut Enzymes', icon: '⚗️' },
    { id: 'neuromuscular', label: 'Neuromuscular', icon: '🧠' },
  ];

  const filtered = biomarkers.filter((b) => selectedCategory === 'all' || b.category === selectedCategory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 50%, #F0FDFA 100%)',
          borderRadius: '22px',
          padding: '18px 20px',
          border: '1.5px solid #99F6E4',
          boxShadow: '0 4px 16px rgba(13, 148, 136, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(13, 148, 136, 0.28)',
            flexShrink: 0,
          }}
        >
          <Activity size={22} />
        </div>
        <div>
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            DUAL-BAND METABOLIC REFERENCE SCALES
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', lineHeight: 1.2 }}>
            Optimal Functional vs Hospital Cutoffs
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Standard labs flag end-stage disease; functional ranges identify cellular starvation before pathology begins.
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: '2px',
        }}
      >
        {categories.map((c) => {
          const isCurrent = selectedCategory === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                triggerHapticSelection();
                setSelectedCategory(c.id);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: isCurrent ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                background: isCurrent ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)' : '#FFFFFF',
                color: isCurrent ? '#FFFFFF' : '#64748B',
                boxShadow: isCurrent ? '0 2px 8px rgba(13, 148, 136, 0.22)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dual-Band Biomarker Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.map((item) => {
          const isExpanded = expandedId === item.id;
          const isOptimal = item.status === 'optimal';
          const isSuboptimal = item.status.includes('suboptimal');
          const isCritical = item.status.includes('critical');

          const statusColor = isOptimal ? '#059669' : isCritical ? '#DC2626' : '#D97706';
          const statusBg = isOptimal ? '#ECFDF5' : isCritical ? '#FEF2F2' : '#FFFBEB';
          const statusBorder = isOptimal ? '#A7F3D0' : isCritical ? '#FECDD3' : '#FDE68A';

          return (
            <div
              key={item.id}
              onClick={() => {
                triggerHapticSelection();
                setExpandedId(isExpanded ? null : item.id);
              }}
              style={{
                background: '#FFFFFF',
                borderRadius: '22px',
                padding: '16px 18px',
                border: isExpanded ? `1.5px solid ${statusColor}` : '1.5px solid #F1F5F9',
                boxShadow: isExpanded
                  ? `0 6px 20px ${statusColor}18`
                  : '0 2px 8px rgba(0,0,0,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Card Header Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    {item.categoryIcon}
                  </div>
                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#1E293B' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                      {item.categoryLabel}
                    </div>
                  </div>
                </div>

                {/* User Result Value Badge */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: statusColor }}>
                    {item.userValue} {item.userUnit}
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '999px',
                      background: statusBg,
                      color: statusColor,
                      border: `1px solid ${statusBorder}`,
                      textTransform: 'uppercase',
                      marginTop: '2px',
                    }}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* DUAL-BAND GRADUATED RANGE VISUALIZER */}
              <div style={{ marginTop: '14px', marginBottom: '8px' }}>
                {/* Visual Continuum Bar */}
                <div style={{ position: 'relative', width: '100%', height: '14px', borderRadius: '999px', background: '#E2E8F0', overflow: 'hidden' }}>
                  {/* Standard Hospital Range Overlay (Soft slate-blue) */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '10%',
                      width: '80%',
                      height: '100%',
                      background: '#E2E8F0',
                      borderLeft: '1.5px dashed #94A3B8',
                      borderRight: '1.5px dashed #94A3B8',
                    }}
                  />

                  {/* Optimal Functional Target Zone (Glowing Emerald) */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '35%',
                      width: '35%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #34D399 0%, #059669 100%)',
                      borderRadius: '999px',
                      boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
                    }}
                  />
                </div>

                {/* Range Labels Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748B', marginTop: '6px', fontWeight: 600 }}>
                  <span>Hospital Cutoff: {item.standardRange.label}</span>
                  <span style={{ color: '#059669', fontWeight: 800 }}>
                    ★ Optimal Functional: {item.optimalRange.label}
                  </span>
                </div>
              </div>

              {/* Collapsed Brief Highlight */}
              {!isExpanded && (
                <div style={{ fontSize: '11.5px', color: '#64748B', lineHeight: 1.35, marginTop: '4px' }}>
                  {item.clinicalSummary.slice(0, 110)}... <span style={{ color: '#0D9488', fontWeight: 700 }}>Deep Dive →</span>
                </div>
              )}

              {/* Expanded Detailed Breakdown */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      overflow: 'hidden',
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #F1F5F9',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {/* Pathophysiology */}
                    <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.45 }}>
                      <strong style={{ color: '#0F172A' }}>Cellular Impact: </strong>
                      {item.clinicalSummary}
                    </div>

                    {/* Why 15-Minute Doctors Missed This */}
                    <div
                      style={{
                        background: '#FFFBEB',
                        borderRadius: '14px',
                        padding: '10px 12px',
                        border: '1px solid #FDE68A',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        ⚠️ Why 15-Minute Visits Missed This:
                      </span>
                      <span style={{ fontSize: '11.5px', color: '#78350F', lineHeight: 1.35 }}>
                        {item.whyDoctorsMissIt}
                      </span>
                    </div>

                    {/* Actionable Dietary Cofactors */}
                    <div style={{ background: '#F0FDFA', borderRadius: '14px', padding: '10px 12px', border: '1px solid #CCFBF1' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '4px' }}>
                        Actionable Clinical Cofactors & Food Sources:
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {item.actionableDietaryCofactors.map((cofactor, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11.5px', color: '#065F46' }}>
                            <span style={{ color: '#0D9488', fontWeight: 800 }}>•</span>
                            <span>{cofactor}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Retest Guidance */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                      <Clock size={13} color="#0D9488" />
                      <span>{item.retestTimeline}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default FunctionalBiomarkersView;
