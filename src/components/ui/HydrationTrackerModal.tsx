import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Droplets, 
  Droplet,
  Waves,
  X, 
  Trash2, 
  Bell, 
  BellOff, 
  Check, 
  Sparkles, 
  RotateCcw
} from 'lucide-react';
import { 
  getHydrationData, 
  addWaterLog, 
  removeWaterLog, 
  setHydrationTarget, 
  setHydrationReminders, 
  HydrationDayData, 
  HydrationLogItem 
} from '../../services/HydrationService';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';

interface HydrationTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const TARGET_PRESETS = [
  { label: '2.0 L', value: 2000, desc: '8 glasses' },
  { label: '2.5 L', value: 2500, desc: '10 glasses' },
  { label: '3.0 L', value: 3000, desc: '12 glasses' }
];

export const HydrationTrackerModal: React.FC<HydrationTrackerModalProps> = ({
  isOpen,
  onClose,
  onUpdated
}) => {
  const [data, setData] = useState<HydrationDayData>(() => getHydrationData());
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setData(getHydrationData());
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentMl = data.currentMl;
  const targetMl = data.targetMl;
  const percentage = Math.min(100, Math.round((currentMl / targetMl) * 100));
  const remainingMl = Math.max(0, targetMl - currentMl);
  const glasses = Math.round(currentMl / 250);
  const targetGlasses = Math.round(targetMl / 250);

  // SVG circular dial parameters
  const ringSize = 104;
  const strokeWidth = 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const handleAdd = (amount: number, type: HydrationLogItem['type'] = 'water') => {
    triggerHapticSuccess();
    const updated = addWaterLog(amount, type);
    setData(updated);
    if (onUpdated) onUpdated();
  };

  const handleUndo = () => {
    if (data.logs.length === 0) return;
    triggerHapticLight();
    const lastLog = data.logs[0];
    const updated = removeWaterLog(lastLog.id);
    setData(updated);
    if (onUpdated) onUpdated();
  };

  const handleRemoveLog = (id: string) => {
    triggerHapticLight();
    const updated = removeWaterLog(id);
    setData(updated);
    if (onUpdated) onUpdated();
  };

  const handleTargetChange = (tgt: number) => {
    triggerHapticSelection();
    setHydrationTarget(tgt);
    setData(getHydrationData());
    if (onUpdated) onUpdated();
  };

  const handleToggleReminders = async () => {
    triggerHapticSelection();
    const nextState = !data.remindersEnabled;
    await setHydrationReminders(nextState, 2);
    setData(getHydrationData());
    setReminderToast(nextState ? 'Hourly reminders active (9 AM - 9 PM)' : 'Reminders muted');
    setTimeout(() => setReminderToast(null), 3000);
  };

  return createPortal(
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Hydration Tracker"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          style={{
            width: '100%',
            maxWidth: '500px',
            maxHeight: 'calc(100vh - max(40px, env(safe-area-inset-top, 40px)))',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFCFF 60%, #F0F9FF 100%)',
            borderTopLeftRadius: '32px',
            borderTopRightRadius: '32px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -20px 60px rgba(2, 132, 199, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.95)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Pull Indicator */}
          <div 
            style={{ 
              width: '100%', 
              height: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              paddingTop: '8px'
            }}
            onClick={onClose}
          >
            <div style={{ width: '38px', height: '4px', backgroundColor: '#CBD5E1', borderRadius: '999px' }} />
          </div>

          {/* Modal Header */}
          <div style={{
            padding: '4px 20px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(226, 232, 240, 0.7)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35), inset 0 1px 0 rgba(255,255,255,0.4)'
              }}>
                <Droplets size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>
                  Hydration Tracker
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                  Optimal cellular blood volume & renal clearance
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                onClose();
              }}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'rgba(241, 245, 249, 0.9)',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer'
              }}
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* HealthChain Glassmorphic Hero Dial */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(240, 249, 255, 0.65) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '18px 20px',
              border: '1.5px solid rgba(186, 230, 253, 0.7)',
              boxShadow: '0 12px 32px rgba(14, 165, 233, 0.08), inset 0 1px 0 rgba(255,255,255,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              {/* Left Side: Clean Typography & Stats */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: percentage >= 100 ? '#DCFCE7' : 'rgba(14, 165, 233, 0.12)',
                  color: percentage >= 100 ? '#15803D' : '#0284C7',
                  padding: '3px 9px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.2px',
                  marginBottom: '8px'
                }}>
                  <Sparkles size={11} />
                  {percentage >= 100 ? 'Target Achieved' : 'Cellular Hydration'}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span className="tabular-nums" style={{ fontSize: '36px', fontWeight: 900, color: '#0F172A', letterSpacing: '-1px', lineHeight: 1 }}>
                    {currentMl.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#64748B' }}>
                    / {targetMl.toLocaleString()} ml
                  </span>
                </div>

                <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: '#475569', fontWeight: 500 }}>
                  {remainingMl > 0 
                    ? `${remainingMl.toLocaleString()} ml to go (${targetGlasses - glasses} glasses)` 
                    : 'Daily cellular hydration met! 🎉'}
                </p>

                <div style={{
                  display: 'inline-block',
                  marginTop: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0284C7',
                  background: 'rgba(255, 255, 255, 0.7)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(186, 230, 253, 0.6)'
                }}>
                  {glasses} of {targetGlasses} Standard Glasses (250ml)
                </div>
              </div>

              {/* Right Side: Circular SVG Hydro Dial */}
              <div style={{ position: 'relative', width: ringSize, height: ringSize, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
                  <defs>
                    <linearGradient id="hcWaterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38BDF8" />
                      <stop offset="100%" stopColor="#0284C7" />
                    </linearGradient>
                  </defs>

                  {/* Background Track */}
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(2, 132, 199, 0.12)"
                    strokeWidth={strokeWidth}
                  />

                  {/* Animated Progress Circle */}
                  <motion.circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#hcWaterGradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                  />
                </svg>

                {/* Dial Center Content */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <span className="tabular-nums" style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>
                    {percentage}%
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#0284C7', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '2px' }}>
                    Goal
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Logging Section: 3 High-Craft Glassmorphic Tiles */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Quick Log Sips
                </span>
                {data.logs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0284C7',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <RotateCcw size={12} /> Undo last
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {/* 1. Glass 250ml */}
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => handleAdd(250)}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '20px',
                    padding: '14px 10px',
                    border: '1.5px solid rgba(226, 232, 240, 0.9)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255,255,255,0.9)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    gap: '6px',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(2, 132, 199, 0.08) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284C7'
                  }}>
                    <Droplet size={19} />
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                    +250 ml
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                    Standard Glass
                  </span>
                </motion.button>

                {/* 2. Bottle 500ml */}
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => handleAdd(500)}
                  style={{
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%)',
                    borderRadius: '20px',
                    padding: '14px 10px',
                    border: '1.5px solid #38BDF8',
                    boxShadow: '0 6px 20px rgba(14, 165, 233, 0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    gap: '6px',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    boxShadow: '0 3px 10px rgba(14, 165, 233, 0.3)'
                  }}>
                    <Droplets size={19} />
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0284C7', letterSpacing: '-0.3px' }}>
                    +500 ml
                  </span>
                  <span style={{ fontSize: '11px', color: '#0369A1', fontWeight: 700 }}>
                    Daily Kickstart
                  </span>
                </motion.button>

                {/* 3. Flask 750ml */}
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => handleAdd(750)}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '20px',
                    padding: '14px 10px',
                    border: '1.5px solid rgba(226, 232, 240, 0.9)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255,255,255,0.9)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    gap: '6px',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(13, 148, 136, 0.08) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0D9488'
                  }}>
                    <Waves size={19} />
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                    +750 ml
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                    Sport Flask
                  </span>
                </motion.button>
              </div>
            </div>

            {/* Daily Target & Daylight Reminders Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {/* iOS-Style Segmented Control for Target */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    Daily Hydration Goal
                  </span>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                    Target water intake volume
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  background: '#F1F5F9',
                  borderRadius: '12px',
                  padding: '3px',
                  gap: '3px'
                }}>
                  {TARGET_PRESETS.map((t) => {
                    const isSelected = targetMl === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => handleTargetChange(t.value)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '9px',
                          border: 'none',
                          background: isSelected ? '#FFFFFF' : 'transparent',
                          color: isSelected ? '#0284C7' : '#64748B',
                          boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                          fontSize: '12px',
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ height: '1px', background: '#F1F5F9' }} />

              {/* iOS-Style Switch for Hourly Reminders */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: data.remindersEnabled ? '#E0F2FE' : '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: data.remindersEnabled ? '#0284C7' : '#94A3B8'
                  }}>
                    {data.remindersEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      Daylight Reminders (9 AM - 9 PM)
                    </span>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                      Gentle hourly nudges to maintain hydration
                    </p>
                  </div>
                </div>

                {/* Smooth Animated Toggle Switch */}
                <button
                  type="button"
                  onClick={handleToggleReminders}
                  style={{
                    width: '46px',
                    height: '26px',
                    borderRadius: '999px',
                    border: 'none',
                    background: data.remindersEnabled ? '#0284C7' : '#E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  aria-label="Toggle daylight reminders"
                >
                  <motion.div
                    animate={{ x: data.remindersEnabled ? 20 : 2 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 350 }}
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                    }}
                  />
                </button>
              </div>

              {reminderToast && (
                <div style={{
                  background: '#ECFDF5',
                  color: '#065F46',
                  padding: '7px 12px',
                  borderRadius: '10px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Check size={14} /> {reminderToast}
                </div>
              )}
            </div>

            {/* Today's Log Timeline */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Today's Logs ({data.logs.length})
                </span>
                {data.logs.length > 0 && (
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                    Tap trash to delete
                  </span>
                )}
              </div>

              {data.logs.length === 0 ? (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  background: '#F8FAFC',
                  borderRadius: '14px',
                  color: '#94A3B8',
                  fontSize: '12px',
                  border: '1px dashed #CBD5E1'
                }}>
                  No drinks logged yet today. Tap +250ml above to start!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                  {data.logs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        background: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          background: '#E0F2FE',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#0284C7'
                        }}>
                          <Droplet size={14} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          +{log.amountMl} ml
                        </span>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                          • {log.timestamp}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLog(log.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        aria-label="Remove drink entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* HealthChain Premium Midnight Action Button */}
          <div style={{
            padding: '12px 20px calc(14px + env(safe-area-inset-bottom, 16px))',
            borderTop: '1px solid rgba(226, 232, 240, 0.7)',
            background: '#FFFFFF'
          }}>
            <button
              type="button"
              onClick={() => {
                triggerHapticSuccess();
                onClose();
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.15)',
                fontWeight: 800,
                fontSize: '15px',
                boxShadow: '0 6px 20px rgba(15, 23, 42, 0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
                cursor: 'pointer'
              }}
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
