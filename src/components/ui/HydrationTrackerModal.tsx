import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Droplets, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  Bell, 
  BellOff, 
  Check, 
  Sparkles, 
  RotateCcw,
  Info
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

const TARGET_PRESETS = [2000, 2500, 3000];

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
    setReminderToast(nextState ? 'Hourly reminders active (9 AM - 9 PM) 💧' : 'Reminders disabled');
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
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
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
            maxWidth: '520px',
            maxHeight: 'calc(100vh - max(30px, env(safe-area-inset-top, 30px)))',
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: '32px',
            borderTopRightRadius: '32px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -15px 45px rgba(2, 132, 199, 0.25)',
            borderTop: '1px solid rgba(255, 255, 255, 0.9)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sheet Pull Bar */}
          <div 
            style={{ 
              width: '100%', 
              height: '24px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              paddingTop: '6px'
            }}
            onClick={onClose}
          >
            <div style={{ width: '42px', height: '5px', backgroundColor: '#CBD5E1', borderRadius: '999px' }} />
          </div>

          {/* Modal Header */}
          <div style={{
            padding: '4px 20px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #F1F5F9'
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
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
              }}>
                <Droplets size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                  Daily Water Tracker
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                  Tap to log sips • Stay hydrated
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
                background: '#F1F5F9',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer'
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Main Scrollable Content */}
          <div style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Visual Water Bottle Vessel Card */}
            <div style={{
              background: 'linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 100%)',
              borderRadius: '24px',
              padding: '20px 16px',
              border: '1.5px solid #BAE6FD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(14, 165, 233, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Left Side: Large readable numbers */}
              <div style={{ flex: 1, zIndex: 2 }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: percentage >= 100 ? '#DCFCE7' : 'rgba(2, 132, 199, 0.15)',
                  color: percentage >= 100 ? '#15803D' : '#0369A1',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  marginBottom: '8px'
                }}>
                  {percentage >= 100 ? '✓ Daily Goal Met' : `${percentage}% of Daily Target`}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span className="tabular-nums" style={{ fontSize: '38px', fontWeight: 900, color: '#0F172A', letterSpacing: '-1px', lineHeight: 1 }}>
                    {currentMl.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#64748B' }}>
                    / {targetMl.toLocaleString()} ml
                  </span>
                </div>

                <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                  {remainingMl > 0 
                    ? `${remainingMl.toLocaleString()} ml remaining (${targetGlasses - glasses} glasses)` 
                    : 'Optimal cellular hydration achieved! 🎉'}
                </p>

                <div style={{ marginTop: '10px', fontSize: '11px', color: '#0284C7', fontWeight: 700 }}>
                  Equivalent: {glasses} of {targetGlasses} Standard Glasses (250ml)
                </div>
              </div>

              {/* Right Side: Visual Water Tumbler Cylinder */}
              <div style={{
                width: '74px',
                height: '110px',
                borderRadius: '18px',
                border: '3px solid #0284C7',
                background: 'rgba(255, 255, 255, 0.65)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 6px 16px rgba(2, 132, 199, 0.2), inset 0 2px 6px rgba(0,0,0,0.06)',
                flexShrink: 0,
                marginLeft: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end'
              }}>
                {/* Measurement Tick Marks */}
                <div style={{ position: 'absolute', right: '4px', top: '15px', width: '6px', height: '1.5px', background: '#94A3B8' }} />
                <div style={{ position: 'absolute', right: '4px', top: '35px', width: '10px', height: '1.5px', background: '#0284C7' }} />
                <div style={{ position: 'absolute', right: '4px', top: '55px', width: '6px', height: '1.5px', background: '#94A3B8' }} />
                <div style={{ position: 'absolute', right: '4px', top: '75px', width: '10px', height: '1.5px', background: '#0284C7' }} />

                {/* Animated Rising Water */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${percentage}%` }}
                  transition={{ type: 'spring', damping: 18, stiffness: 120 }}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)',
                    boxShadow: '0 -2px 8px rgba(56, 189, 248, 0.6)',
                    position: 'relative'
                  }}
                >
                  {/* Wave surface shimmer */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.75)',
                    borderRadius: '2px'
                  }} />
                </motion.div>

                {/* Center % in tumbler */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 900,
                    color: percentage > 50 ? '#FFFFFF' : '#0369A1',
                    textShadow: percentage > 50 ? '0 1px 3px rgba(0,0,0,0.4)' : 'none'
                  }}>
                    {percentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Tap to Log: 3 Primary Vessels (Big & Easy to Tap) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Tap to Add Water
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
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => handleAdd(250)}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '18px',
                    padding: '14px 10px',
                    border: '2px solid #BAE6FD',
                    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '28px' }}>🥛</span>
                  <span style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>
                    +250 ml
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                    1 Glass
                  </span>
                </motion.button>

                {/* 2. Bottle 500ml */}
                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => handleAdd(500)}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '18px',
                    padding: '14px 10px',
                    border: '2px solid #38BDF8',
                    boxShadow: '0 4px 14px rgba(14, 165, 233, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '28px' }}>🍶</span>
                  <span style={{ fontSize: '15px', fontWeight: 900, color: '#0284C7' }}>
                    +500 ml
                  </span>
                  <span style={{ fontSize: '11px', color: '#0369A1', fontWeight: 700 }}>
                    1 Bottle
                  </span>
                </motion.button>

                {/* 3. Flask 750ml */}
                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => handleAdd(750)}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '18px',
                    padding: '14px 10px',
                    border: '2px solid #BAE6FD',
                    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '28px' }}>🧴</span>
                  <span style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>
                    +750 ml
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                    Big Flask
                  </span>
                </motion.button>
              </div>
            </div>

            {/* Daily Target & Daylight Reminders */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: '18px',
              padding: '14px 16px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Target Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Daily Target:
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {TARGET_PRESETS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTargetChange(t)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '999px',
                        border: targetMl === t ? '1.5px solid #0284C7' : '1px solid #CBD5E1',
                        background: targetMl === t ? '#E0F2FE' : '#FFFFFF',
                        color: targetMl === t ? '#0369A1' : '#64748B',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {t / 1000}L
                    </button>
                  ))}
                </div>
              </div>

              {/* Reminders Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: data.remindersEnabled ? '#E0F2FE' : '#E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: data.remindersEnabled ? '#0284C7' : '#94A3B8'
                  }}>
                    {data.remindersEnabled ? <Bell size={15} /> : <BellOff size={15} />}
                  </div>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
                    Hourly Reminders (9 AM - 9 PM)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleReminders}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '999px',
                    border: 'none',
                    background: data.remindersEnabled ? '#0284C7' : '#CBD5E1',
                    color: '#FFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {data.remindersEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {reminderToast && (
                <div style={{
                  background: '#ECFDF5',
                  color: '#065F46',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Check size={12} /> {reminderToast}
                </div>
              )}
            </div>

            {/* Today's Log Timeline (Compact) */}
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
                  fontSize: '12px'
                }}>
                  No drinks logged yet today. Tap +250ml to start!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {data.logs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#FFFFFF',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>💧</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          +{log.amountMl} ml
                        </span>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                          {log.timestamp}
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

          {/* Footer: Big prominent "Done" button */}
          <div style={{
            padding: '12px 20px calc(14px + env(safe-area-inset-bottom, 16px))',
            borderTop: '1px solid #F1F5F9',
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
                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: '15px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
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
