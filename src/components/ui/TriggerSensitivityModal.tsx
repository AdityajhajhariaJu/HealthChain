import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Flower2,
  Footprints,
  Heart,
  Moon,
  Thermometer,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { triggerHapticLight } from '../../services/haptics';
import { listMealDiary } from '../../services/MealCommandService';
import { getProfile } from '../../services/ProfileEngine';
import { getWeeklySymptomSeverity } from '../../services/TriggerEngine';
import { DoctorSummaryView } from './DoctorSummaryView';
import { EliminationTrialsView } from './EliminationTrialsView';
import FocusTrap from './FocusTrap';
import { MonthlyHealthHeatmap } from './MonthlyHealthHeatmap';
import { SuspectFoodsView } from './SuspectFoodsView';
import { WellnessZenGardenView } from './WellnessZenGardenView';


export type WholeHealthTab = 'picture' | 'detective' | 'suspects' | 'trials' | 'garden' | 'doctor';

interface TriggerSensitivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: WholeHealthTab;
  standaloneTab?: boolean;
}

export const TriggerSensitivityModal: React.FC<TriggerSensitivityModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'picture',
  standaloneTab = false,
}) => {
  const [activeTab, setActiveTab] = useState<WholeHealthTab>(initialTab);
  const [selectedTrialProtocolId, setSelectedTrialProtocolId] = useState<string | null>(null);
  const [historyMode, setHistoryMode] = useState<'month' | '7day'>('month');
  const [recordedMealCount, setRecordedMealCount] = useState<number | null>(null);
  const weeklySeverity = getWeeklySymptomSeverity();
  const profile = getProfile();
  const restingHR = (profile as any)?.biometrics?.restingHR || (profile as any)?.vitals?.restingHR;
  const hrDisplay = restingHR ? `${restingHR} bpm` : '-- bpm';
  const steps = (profile as any)?.biometrics?.steps || (profile as any)?.vitals?.steps;
  const stepsDisplay = steps ? Number(steps).toLocaleString() : '--';
  const checkins = (profile?.timeline || []).filter((t: any) => t.type === 'checkin' || t.category === 'symptom');
  const latestCheckin = checkins[checkins.length - 1];
  const symptomDisplay = latestCheckin?.severity ? `Severity ${latestCheckin.severity}/10` : 'None logged';


  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const refreshMeals = () => {
      void listMealDiary().then((diary) => {
        if (active) setRecordedMealCount(Object.values(diary).reduce((total, day) => total + day.length, 0));
      }).catch(() => { if (active) setRecordedMealCount(null); });
    };
    refreshMeals();
    window.addEventListener('hc_observations_updated', refreshMeals);
    window.addEventListener('hc_profile_updated', refreshMeals);
    return () => {
      active = false;
      window.removeEventListener('hc_observations_updated', refreshMeals);
      window.removeEventListener('hc_profile_updated', refreshMeals);
    };
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!isOpen || activeTab !== 'garden') return;
    const targets = [document.body, document.getElementById('main-content')].filter(
      (target): target is HTMLElement => !!target
    );
    const previous = targets.map((target) => target.style.overflow);
    targets.forEach((target) => { target.style.overflow = 'hidden'; });
    return () => targets.forEach((target, index) => {
      if (target.style.overflow === 'hidden') target.style.overflow = previous[index];
    });
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const tabs: { id: WholeHealthTab; label: string; icon: string }[] = [
    { id: 'picture', label: 'Whole Picture', icon: '📊' },
    { id: 'detective', label: 'Food records', icon: '📖' },
    { id: 'suspects', label: 'Digestion records', icon: '📖' },
    { id: 'trials', label: 'Diet Trials', icon: '🔬' },
    { id: 'garden', label: 'Zen Garden', icon: '🌸' },
    { id: 'doctor', label: 'Doctor Export', icon: '📋' },
  ];

  return (
    <AnimatePresence>
      <FocusTrap isActive={isOpen} onEscape={onClose}>
        <div
          data-overlay-viewport={activeTab === 'garden' ? undefined : 'sheet'}
          role="dialog"
          className={activeTab === 'garden' ? 'zen-modal-backdrop' : undefined}
          aria-modal="true"
          aria-label={standaloneTab && activeTab === 'garden' ? 'Zen Garden' : 'Whole Health Picture and Food Sensitivities'}
          style={{
            position: 'fixed',
            top: 'var(--app-viewport-top, 0px)',
            left: 0,
            right: 0,
            bottom: 'auto',
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
            data-overlay-panel={activeTab === 'garden' ? undefined : ''}
            className={activeTab === 'garden' ? 'zen-modal-sheet' : undefined}
            initial={activeTab === 'garden' ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={activeTab === 'garden' ? undefined : { y: '100%' }}
            transition={activeTab === 'garden' ? { duration: 0 } : { type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '580px',
              maxHeight: activeTab === 'garden' ? undefined : 'var(--overlay-available-height)',
              background: activeTab === 'garden'
                ? 'linear-gradient(180deg, #FFFFFF 0%, #FFFAFA 40%, #FFF7F8 100%)'
                : 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 40%, #F0FDFA 100%)',
              borderTopLeftRadius: activeTab === 'garden' ? undefined : '32px',
              borderTopRightRadius: activeTab === 'garden' ? undefined : '32px',
              border: activeTab === 'garden' ? '1.5px solid #F1E5E7' : '1.5px solid #CCFBF1',
              boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Grab Handle */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '12px', flexShrink: 0 }}>
              <div style={{ width: '40px', height: '4.5px', borderRadius: '999px', background: activeTab === 'garden' ? '#F1E5E7' : '#E2E8F0' }} />
            </div>

            {/* Header */}
            <div
              className={activeTab === 'garden' ? 'zen-modal-header' : undefined}
              style={{
                padding: activeTab === 'garden' ? undefined : '14px 20px 10px 20px',
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {activeTab === 'garden' && (
                <button
                  type="button"
                  className="zen-modal-back"
                  onClick={() => {
                    triggerHapticLight();
                    if (standaloneTab) onClose();
                    else setActiveTab('picture');
                  }}
                >
                  <ArrowLeft size={18} aria-hidden="true" /> Back
                </button>
              )}
              <div style={activeTab === 'garden' ? { minWidth: 0, flex: 1 } : undefined}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  {standaloneTab && activeTab === 'garden' ? 'WELLNESS GARDEN' : 'PRECISION METABOLIC INTELLIGENCE'}
                </span>
                <h2 style={{ margin: '2px 0 0 0', fontSize: '21px', fontWeight: 800, color: '#1C1917', letterSpacing: '-0.4px' }}>
                  {standaloneTab && activeTab === 'garden' ? (
                    <>Zen <span style={{ color: '#0D9488' }}>Garden</span></>
                  ) : (
                    <>Your Whole <span style={{ color: '#0D9488' }}>Health Picture</span></>
                  )}
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
                  width: '44px',
                  height: '44px',
                  minWidth: '44px',
                  minHeight: '44px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: activeTab === 'garden' ? '1.5px solid #F1E5E7' : '1.5px solid #CCFBF1',
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

            {/* Horizontal Segmented Tabs (Triggerbites Architecture) */}
            {!standaloneTab && (
              <div
                style={{
                  padding: '0 20px 12px 20px',
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setActiveTab(tab.id);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '7px 13px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        border: isActive ? '1.5px solid #0D9488' : '1.5px solid #F1F5F9',
                        background: isActive ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)' : '#FFFFFF',
                        color: isActive ? '#FFFFFF' : '#64748B',
                        boxShadow: isActive ? '0 4px 12px rgba(13, 148, 136, 0.28)' : '0 2px 6px rgba(0,0,0,0.02)',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Scrollable Content Container */}
            <div
              className={activeTab === 'garden' ? 'zen-modal-content' : undefined}
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: activeTab === 'garden' ? undefined : '0 20px calc(32px + var(--safe-area-bottom, 0px)) 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* TAB 1: WHOLE PICTURE */}
              {activeTab === 'picture' && (
                <>
                  {/* Top Metric Pills */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '18px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: '1px solid #F1F5F9',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          background: '#EFF6FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#2563EB',
                        }}
                      >
                        <Moon size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Sleep</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>7h 45m</div>
                      </div>
                    </div>

                    <div
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '18px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: '1px solid #F1F5F9',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          background: '#FFF1F2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#E11D48',
                        }}
                      >
                        <Heart size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Resting HR</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>{hrDisplay}</div>
                      </div>
                    </div>

                    <div
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '18px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: '1px solid #F1F5F9',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          background: '#ECFDF5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#059669',
                        }}
                      >
                        <Footprints size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Steps</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>{stepsDisplay}</div>
                      </div>
                    </div>

                    <div
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '18px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: '1px solid #F1F5F9',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          background: '#FFFBEB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#D97706',
                        }}
                      >
                        <Thermometer size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Symptoms</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>{symptomDisplay}</div>
                      </div>
                    </div>
                  </div>

                  {/* View Mode Toggle: Monthly Matrix vs 7-Day Pulse */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      background: '#F1F5F9',
                      borderRadius: '14px',
                      padding: '4px',
                      gap: '4px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setHistoryMode('month');
                      }}
                      style={{
                        padding: '8px',
                        borderRadius: '10px',
                        border: 'none',
                        background: historyMode === 'month' ? '#FFFFFF' : 'transparent',
                        color: historyMode === 'month' ? '#0F766E' : '#64748B',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: historyMode === 'month' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                      }}
                    >
                      <span>📅 Monthly Trends</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setHistoryMode('7day');
                      }}
                      style={{
                        padding: '8px',
                        borderRadius: '10px',
                        border: 'none',
                        background: historyMode === '7day' ? '#FFFFFF' : 'transparent',
                        color: historyMode === '7day' ? '#0F766E' : '#64748B',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: historyMode === '7day' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                      }}
                    >
                      <span>📊 7-Day Pulse</span>
                    </button>
                  </div>

                  {historyMode === 'month' ? (
                    <MonthlyHealthHeatmap />
                  ) : (
                    /* 7-Day Symptom Severity Bar Chart */
                    <div
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '22px',
                        padding: '18px 20px',
                        border: '1.5px solid #F1F5F9',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Activity size={17} color="#E11D48" />
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917' }}>Symptom Severity</span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>7-Day History</span>
                      </div>

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
                        <span style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E2E8F0' }} /> No entry
                        </span>
                      </div>
                    </div>
                  )}


                  {/* Recorded food count only; no exposure or biochemical inference. */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '22px',
                      padding: '18px 20px',
                      border: '1.5px solid #F1F5F9',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#8E9AAF', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '14px' }}>
                      FOOD RECORDS
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1C1917' }}>
                      {recordedMealCount === null ? 'Food records unavailable' : `${recordedMealCount} meals recorded`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '5px' }}>
                      A food record alone does not measure a biochemical exposure or identify a sensitivity.
                    </div>
                  </div>

                  {/* Food Sensitivities Pill Cloud */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '22px',
                      padding: '18px 20px',
                      border: '1.5px solid #F1F5F9',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#8E9AAF', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                        FOOD TOPICS TO DISCUSS
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('detective')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0F766E',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        Explore in Detective <ChevronRight size={13} />
                      </button>
                    </div>

                    <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 12px' }}>
                      These are educational examples, not measured exposures or personal sensitivities.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {[
                        { label: 'Histamine', icon: '⚗️', color: '#E11D48', bg: '#FFF1F2' },
                        { label: 'Histamine Liberators', icon: '⚡', color: '#E11D48', bg: '#FFF1F2' },
                        { label: 'Tyramine', icon: '🧀', color: '#7C3AED', bg: '#F5F3FF' },
                        { label: 'Fructans (FODMAP)', icon: '🌾', color: '#D97706', bg: '#FFFBEB' },
                        { label: 'GOS (Legumes)', icon: '🫘', color: '#B45309', bg: '#FEF3C7' },
                        { label: 'Excess Fructose', icon: '🍎', color: '#DC2626', bg: '#FEF2F2' },
                        { label: 'Polyols (Sorbitol)', icon: '🍄', color: '#C026D3', bg: '#FDF4FF' },
                        { label: 'Lactose', icon: '🥛', color: '#0284C7', bg: '#F0F9FF' },
                        { label: 'Salicylates', icon: '🌸', color: '#BE185D', bg: '#FDF2F8' },
                        { label: 'Oxalates', icon: '💎', color: '#0284C7', bg: '#F0F9FF' },
                        { label: 'Nightshades', icon: '🍆', color: '#4338CA', bg: '#EEF2FF' },
                        { label: 'Lectins', icon: '🛡️', color: '#15803D', bg: '#F0F4FF' },
                        { label: 'Dietary Nickel', icon: '🪙', color: '#475569', bg: '#F8FAFC' },
                        { label: 'Sulfites', icon: '🍷', color: '#B91C1C', bg: '#FEF2F2' },
                        { label: 'Nitrites', icon: '🥓', color: '#B45309', bg: '#FEF3C7' },
                        { label: 'Free Glutamates', icon: '🥣', color: '#6D28D9', bg: '#EDE9FE' },
                        { label: 'Caffeine', icon: '☕', color: '#78350F', bg: '#FEF3C7' },
                        { label: 'Dairy Proteins', icon: '🧀', color: '#9333EA', bg: '#FAF5FF' },
                      ].map((s, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '999px',
                            background: s.bg,
                            color: s.color,
                            fontSize: '12px',
                            fontWeight: 700,
                            border: `1px solid ${s.color}25`,
                          }}
                        >
                          <span>{s.icon}</span> {s.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Calm Body & Mind CTA */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFAFA 50%, #FFF7F8 100%)',
                      borderRadius: '22px',
                      padding: '18px 20px',
                      border: '1.5px solid #F1E5E7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '2px' }}>
                        MINDFULNESS & RELAXATION
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#1C1917' }}>
                        Calm body & mind
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
                        4-7-8 breathing to ease digestive tension.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setActiveTab('garden');
                      }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
                        flexShrink: 0,
                      }}
                    >
                      <Flower2 size={15} /> Zen Garden
                    </button>
                  </div>
                </>
              )}

              {/* TAB 2: FOOD DETECTIVE */}
              {activeTab === 'detective' && <SuspectFoodsView />}

              {/* TAB 3: SUSPECT FOODS */}
              {activeTab === 'suspects' && (
                <SuspectFoodsView
                  onStartTrial={(protocolId) => {
                    setSelectedTrialProtocolId(protocolId);
                    setActiveTab('trials');
                  }}
                />
              )}

              {/* TAB 4: ELIMINATION TRIALS */}
              {activeTab === 'trials' && <EliminationTrialsView initialProtocolId={selectedTrialProtocolId} />}

              {/* TAB 5: ZEN GARDEN */}
              {activeTab === 'garden' && <WellnessZenGardenView />}

              {/* TAB 6: DOCTOR EXPORT */}
              {activeTab === 'doctor' && <DoctorSummaryView />}
            </div>
          </motion.div>
        </div>
      </FocusTrap>
    </AnimatePresence>
  );
};
