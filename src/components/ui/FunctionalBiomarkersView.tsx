import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  HelpCircle,
  ChevronRight,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Pill,
  ArrowRight,
  Stethoscope,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import {
  getFunctionalBiomarkers,
  FunctionalBiomarker,
  getClinicalProfilePresets,
  ClinicalProfilePreset,
} from '../../services/ConnectionDetectiveEngine';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';

export const FunctionalBiomarkersView: React.FC = () => {
  const initialBiomarkers = getFunctionalBiomarkers();
  const presets = getClinicalProfilePresets();

  const [activePresetId, setActivePresetId] = useState<string>('profile_baseline');
  const [customValues, setCustomValues] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    initialBiomarkers.forEach((b) => {
      map[b.id] = b.userValue;
    });
    return map;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(initialBiomarkers[0]?.id || null);

  const categories = [
    { id: 'all', label: 'All 20 Biomarkers', icon: '🧪' },
    { id: 'metabolic', label: 'Cellular Energetics & Iron', icon: '⚡' },
    { id: 'endocrine', label: 'Thyroid Axis & Adrenals', icon: '🦋' },
    { id: 'immune', label: 'Immune & Mucosal Barrier', icon: '🛡️' },
    { id: 'enteric', label: 'Biogenic Amine Clearance', icon: '⚗️' },
    { id: 'neuromuscular', label: 'Cellular Neuromuscular', icon: '🧠' },
  ];

  const handleSelectPreset = (preset: ClinicalProfilePreset) => {
    triggerHapticSelection();
    setActivePresetId(preset.id);
    setCustomValues((prev) => ({
      ...prev,
      ...preset.biomarkerValues,
    }));
  };

  const handleValueChange = (biomarkerId: string, val: number) => {
    setCustomValues((prev) => ({
      ...prev,
      [biomarkerId]: val,
    }));
  };

  const getComputedStatus = (b: FunctionalBiomarker, val: number) => {
    if (val < b.standardRange.min) return { key: 'critical_low', label: 'Pathology Deficit (Below Standard)', color: '#EF4444', bg: '#FEF2F2' };
    if (val < b.optimalRange.min) return { key: 'suboptimal_low', label: 'Subclinical Gap (Standard Normal, Cellular Starvation)', color: '#D97706', bg: '#FFFBEB' };
    if (val > b.standardRange.max) return { key: 'critical_high', label: 'Pathology Excess (Above Standard)', color: '#DC2626', bg: '#FEF2F2' };
    if (val > b.optimalRange.max) return { key: 'suboptimal_high', label: 'Subclinical Elevation (Compensatory Strain)', color: '#D97706', bg: '#FFFBEB' };
    return { key: 'optimal', label: 'Optimal Functional Longevity', color: '#059669', bg: '#ECFDF5' };
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
            DUAL-BAND METABOLIC REFERENCE SCALES • 20 LAB MARKERS
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', lineHeight: 1.2 }}>
            Optimal Functional vs Hospital Cutoffs
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Standard labs flag end-stage failure; functional optimal ranges uncover subclinical gaps years before diagnosis.
          </div>
        </div>
      </div>

      {/* Preset Profiles Selector Ribbon */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          Simulate Clinical Telemetry Profiles:
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
          {presets.map((p) => {
            const isSelected = activePresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '12px',
                  border: isSelected ? '1.5px solid #0F766E' : '1px solid #E2E8F0',
                  background: isSelected ? '#F0FDFA' : '#FFFFFF',
                  color: isSelected ? '#0F766E' : '#64748B',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.15)' : 'none',
                }}
              >
                <span>{isSelected ? '✓' : '•'}</span>
                <span>{p.name}</span>
                <span style={{ fontSize: '10px', background: isSelected ? '#CCFBF1' : '#F1F5F9', padding: '2px 6px', borderRadius: '6px' }}>
                  {p.badge}
                </span>
              </button>
            );
          })}
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
      </div>

      {/* Biomarkers List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map((b) => {
          const isExpanded = expandedId === b.id;
          const currentValue = customValues[b.id] ?? b.userValue;
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
                      Optimal: <span style={{ color: '#059669', fontWeight: 700 }}>{b.optimalRange.label}</span> • Standard: {b.standardRange.label}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: status.color }}>
                      {currentValue} {b.userUnit}
                    </div>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: status.color }}>
                      {status.key === 'optimal' ? 'Optimal 🟢' : status.key.includes('suboptimal') ? 'Subclinical 🟡' : 'Pathology 🔴'}
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
                        <span>Standard Range: {b.standardRange.label}</span>
                        <span style={{ color: '#059669', fontWeight: 700 }}>Optimal Functional: {b.optimalRange.label}</span>
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

                        {/* Optimal functional window */}
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
                        <span>Lower Pathology</span>
                        <span>Normal Lab Margin</span>
                        <span style={{ color: '#059669', fontWeight: 700 }}>Peak Cellular Health</span>
                        <span>Upper Pathology</span>
                      </div>
                    </div>

                    {/* Interactive Value Slider Adjuster */}
                    <div
                      style={{
                        background: '#F1F5F9',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                        <Sliders size={15} color="#0D9488" />
                        <span>Adjust Test Value:</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '240px' }}>
                        <input
                          type="range"
                          min={b.standardRange.min * 0.7}
                          max={b.standardRange.max * 1.3}
                          step={(b.standardRange.max - b.standardRange.min) / 100 || 0.1}
                          value={currentValue}
                          onChange={(e) => handleValueChange(b.id, parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: '#0D9488', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', minWidth: '45px', textAlign: 'right' }}>
                          {Number(currentValue).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Clinical Summary */}
                    <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.5, background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      {b.clinicalSummary}
                    </div>

                    {/* Why 15-Minute Doctors Missed It */}
                    <div
                      style={{
                        background: '#FFFBEB',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        border: '1px solid #FDE68A',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B45309', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        <AlertTriangle size={14} />
                        <span>Why 15-Minute Doctors Missed This</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#78350F', lineHeight: 1.45 }}>
                        {b.whyDoctorsMissIt}
                      </div>
                    </div>

                    {/* Actionable Dietary & Synergistic Cofactors */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Actionable Cofactors & Indian Dietary Sources:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {b.actionableDietaryCofactors.map((cofactor, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: '#334155' }}>
                            <span style={{ color: '#0D9488', fontWeight: 700 }}>•</span>
                            <span>{cofactor}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Retest Guidance */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                      <Clock size={13} />
                      <span>{b.retestTimeline}</span>
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
