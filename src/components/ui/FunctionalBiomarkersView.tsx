import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Activity, AlertTriangle, FileUp } from 'lucide-react';
import {
  getFunctionalBiomarkers,
  FunctionalBiomarker,
} from '../../services/ConnectionDetectiveEngine';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';

export const FunctionalBiomarkersView: React.FC = () => {
  const initialBiomarkers = getFunctionalBiomarkers();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(initialBiomarkers[0]?.id || null);

  const categories = [
    { id: 'all', label: `All ${initialBiomarkers.length} values`, icon: '🧪' },
    { id: 'metabolic', label: 'Energy & Iron', icon: '⚡' },
    { id: 'endocrine', label: 'Thyroid Axis & Adrenals', icon: '🦋' },
    { id: 'immune', label: 'Immune & Mucosal Barrier', icon: '🛡️' },
    { id: 'enteric', label: 'Biogenic Amine Clearance', icon: '⚗️' },
    { id: 'neuromuscular', label: 'Neuromuscular', icon: '🧠' },
  ];

  const getComputedStatus = (b: FunctionalBiomarker, val: number) => {
    if (val < b.standardRange.min) return { key: 'below', label: 'Below printed range', color: '#DC2626', bg: '#FEF2F2' };
    if (val > b.standardRange.max) return { key: 'above', label: 'Above printed range', color: '#DC2626', bg: '#FEF2F2' };
    return { key: 'within', label: 'Within printed range', color: '#059669', bg: '#ECFDF5' };
  };

  const filtered = initialBiomarkers.filter((b) => selectedCategory === 'all' || b.category === selectedCategory);

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
            LAB MARKER COMPARISON
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', lineHeight: 1.2 }}>
            Extracted values and report ranges
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Compare each extracted value with the interval printed on its source report.
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      {initialBiomarkers.length > 0 && <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: '2px',
        }}
      >
        {categories.filter((c) => c.id === 'all' || initialBiomarkers.some((item) => item.category === c.id)).map((c) => {
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
                border: isCurrent ? '1.5px solid #0F766E' : '1px solid #E2E8F0',
                background: isCurrent ? '#0F766E' : '#FFFFFF',
                color: isCurrent ? '#FFFFFF' : '#64748B',
                boxShadow: isCurrent ? '0 2px 8px rgba(15, 118, 110, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>}

      {initialBiomarkers.length === 0 && (
        <div style={{ padding: '28px 20px', textAlign: 'center', border: '1px dashed #CBD5E1', borderRadius: '18px', background: '#F8FAFC' }}>
          <FileUp size={24} color="#0D9488" style={{ marginBottom: '8px' }} />
          <h4 style={{ margin: '0 0 5px', color: '#0F172A', fontSize: '15px' }}>No report values connected yet</h4>
          <p style={{ margin: '0 auto 14px', color: '#64748B', fontSize: '12.5px', maxWidth: '430px', lineHeight: 1.5 }}>
            Add a lab report in the Clinical Data Engine. Only extracted values with their printed ranges will appear here.
          </p>
          <button type="button" onClick={() => { window.location.href = '/app/consult'; }} style={{ border: 0, borderRadius: '10px', background: '#0F766E', color: '#FFFFFF', padding: '9px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
            Open Clinical Data Engine
          </button>
        </div>
      )}

      {/* Biomarkers List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map((b) => {
          const isExpanded = expandedId === b.id;
          const currentValue = b.userValue;
          const status = getComputedStatus(b, currentValue);

          // Range bar calculation
          const totalMin = Math.min(b.standardRange.min, b.optimalRange.min) * 0.8;
          const totalMax = Math.max(b.standardRange.max, b.optimalRange.max) * 1.2;
          const totalSpan = Math.max(totalMax - totalMin, 1);

          const stdLeft = Math.max(0, ((b.standardRange.min - totalMin) / totalSpan) * 100);
          const stdWidth = Math.min(100 - stdLeft, ((b.standardRange.max - b.standardRange.min) / totalSpan) * 100);

          const optLeft = Math.max(0, ((b.optimalRange.min - totalMin) / totalSpan) * 100);
          const optWidth = Math.min(100 - optLeft, ((b.optimalRange.max - b.optimalRange.min) / totalSpan) * 100);

          const userPos = Math.max(0, Math.min(100, ((currentValue - totalMin) / totalSpan) * 100));

          return (
            <motion.div
              key={b.id}
              layout
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                border: isExpanded ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                boxShadow: isExpanded ? '0 8px 24px rgba(13, 148, 136, 0.12)' : '0 2px 6px rgba(0,0,0,0.02)',
                overflow: 'hidden',
                transition: 'border-color 0.2s ease',
              }}
            >
              {/* Header Summary Row */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  triggerHapticLight();
                  setExpandedId(isExpanded ? null : b.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setExpandedId(isExpanded ? null : b.id);
                  }
                }}
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: '#F0FDFA',
                      color: '#0F766E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      flexShrink: 0,
                    }}
                  >
                    {b.categoryIcon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                      Printed range: {b.standardRange.label}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: status.color }}>
                      {currentValue} {b.userUnit}
                    </div>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: status.color }}>
                      {status.label}
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    color="#94A3B8"
                    style={{
                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </div>
              </div>

              {/* Expanded Deep-Dive Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      borderTop: '1px solid #F1F5F9',
                      background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    {/* Status Pill Badge */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        background: status.bg,
                        color: status.color,
                        border: `1px solid ${status.color}30`,
                        fontSize: '11.5px',
                        fontWeight: 700,
                        alignSelf: 'flex-start',
                      }}
                    >
                      <AlertTriangle size={14} />
                      <span>{status.label}</span>
                    </div>

                    {/* Dual-Band Range Visualization Bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>
                        <span>Printed range: {b.standardRange.label}</span>
                        <span>Extracted value: {currentValue} {b.userUnit}</span>
                      </div>

                      {/* Visual Spectrum Bar */}
                      <div
                        style={{
                          height: '24px',
                          borderRadius: '8px',
                          background: '#E2E8F0',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Standard hospital window */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${stdLeft}%`,
                            width: `${stdWidth}%`,
                            top: 0,
                            bottom: 0,
                            background: '#CBD5E1',
                            opacity: 0.65,
                          }}
                        />

                        {/* Range printed on the source report */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${optLeft}%`,
                            width: `${optWidth}%`,
                            top: 0,
                            bottom: 0,
                            background: 'linear-gradient(90deg, #10B981 0%, #0D9488 100%)',
                            boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
                          }}
                        />

                        {/* User Pin Indicator */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${userPos}%`,
                            top: '2px',
                            bottom: '2px',
                            width: '4px',
                            borderRadius: '2px',
                            background: '#0F172A',
                            transform: 'translateX(-50%)',
                            boxShadow: '0 0 6px rgba(0,0,0,0.5)',
                            zIndex: 5,
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94A3B8' }}>
                        <span>Below range</span>
                        <span style={{ color: '#059669', fontWeight: 700 }}>Printed interval</span>
                        <span>Above range</span>
                      </div>
                    </div>

                    {/* Clinical Summary */}
                    <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.5, background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      {b.clinicalSummary}
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
