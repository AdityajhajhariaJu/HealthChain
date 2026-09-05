import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Droplets, 
  X, 
  Plus, 
  Trash2, 
  Bell, 
  BellOff, 
  Check, 
  Award, 
  Sparkles, 
  Coffee, 
  Zap, 
  Citrus, 
  GlassWater,
  Flame,
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

const CONTAINER_PRESETS = [
  { label: 'Glass', amount: 250, icon: '🥛', desc: 'Standard cup' },
  { label: 'Mug', amount: 300, icon: '☕', desc: 'Warm tea/infusion' },
  { label: 'Tall Glass', amount: 350, icon: '💧', desc: 'Large drink' },
  { label: 'Bottle', amount: 500, icon: '🍶', desc: 'Fitness bottle' },
  { label: 'Hydro Flask', amount: 750, icon: '🧴', desc: 'Sport flask' },
  { label: 'Carafe', amount: 1000, icon: '🧊', desc: '1 Liter decanter' },
];

const BEVERAGE_TYPES: { id: HydrationLogItem['type']; label: string; icon: string; bonus?: string }[] = [
  { id: 'water', label: 'Pure Water', icon: '💧' },
  { id: 'electrolyte', label: 'Electrolytes', icon: '⚡', bonus: 'Cellular Ion Flow' },
  { id: 'lemon', label: 'Lemon Water', icon: '🍋', bonus: 'Bioflavonoids' },
  { id: 'tea', label: 'Herbal Tea', icon: '🍵', bonus: 'Polyphenols' },
  { id: 'coconut', label: 'Coconut Water', icon: '🥥', bonus: 'Potassium Rich' },
  { id: 'sparkling', label: 'Sparkling', icon: '✨' },
];

const TARGET_PRESETS = [2000, 2500, 3000];

export const HydrationTrackerModal: React.FC<HydrationTrackerModalProps> = ({
  isOpen,
  onClose,
  onUpdated
}) => {
  const [data, setData] = useState<HydrationDayData>(() => getHydrationData());
  const [selectedType, setSelectedType] = useState<HydrationLogItem['type']>('water');
  const [customMl, setCustomMl] = useState<string>('');
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setData(getHydrationData());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentMl = data.currentMl;
  const targetMl = data.targetMl;
  const percentage = Math.min(100, Math.round((currentMl / targetMl) * 100));
  const remainingMl = Math.max(0, targetMl - currentMl);
  const glasses = Math.round(currentMl / 250);
  const targetGlasses = Math.round(targetMl / 250);

  const handleAdd = (amount: number) => {
    triggerHapticSuccess();
    const updated = addWaterLog(amount, selectedType);
    setData(updated);
    if (onUpdated) onUpdated();
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customMl, 10);
    if (!isNaN(parsed) && parsed > 0) {
      handleAdd(parsed);
      setCustomMl('');
    }
  };

  const handleRemove = (logId: string) => {
    triggerHapticLight();
    const updated = removeWaterLog(logId);
    setData(updated);
    if (onUpdated) onUpdated();
  };

  const handleTargetSelect = (tgt: number) => {
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
    setReminderMsg(nextState ? 'Hourly hydration nudges scheduled (9am - 9pm)!' : 'Reminders turned off');
    setTimeout(() => setReminderMsg(null), 3500);
  };

  // Status message
  let clinicalStatus = { title: 'Optimal Hydration', color: '#10B981', desc: 'Cellular volume and renal clearance are fully sustained.' };
  if (percentage < 30) {
    clinicalStatus = { title: 'Rehydration Needed', color: '#EF4444', desc: 'Elevated morning osmolality. Drink 500ml upon waking.' };
  } else if (percentage < 70) {
    clinicalStatus = { title: 'Actively Hydrating', color: '#0284C7', desc: 'Progressing towards optimal systemic hemodynamic balance.' };
  } else if (percentage < 100) {
    clinicalStatus = { title: 'Near Target', color: '#06B6D4', desc: 'Excellent intravascular volume and cognitive focus.' };
  }

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          style={{
            width: '100%',
            maxWidth: '540px',
            maxHeight: '90vh',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%)',
            borderTopLeftRadius: '32px',
            borderTopRightRadius: '32px',
            boxShadow: '0 -10px 40px rgba(2, 132, 199, 0.18), 0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(14, 165, 233, 0.12)',
            background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.8) 0%, rgba(224, 242, 254, 0.5) 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(14, 165, 233, 0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
                color: '#FFF'
              }}>
                <Droplets size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                  Cellular Hydration Hub
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                  Intravascular volume, renal flush & osmolality
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                triggerHapticLight();
                onClose();
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Visual Fluid Progress Gauge */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 249, 255, 0.9) 100%)',
              borderRadius: '24px',
              padding: '20px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              boxShadow: '0 8px 24px rgba(14, 165, 233, 0.08), inset 0 1px 0 rgba(255,255,255,0.95)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background ambient water glow */}
              <div style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(255, 255, 255, 0) 70%)',
                pointerEvents: 'none'
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(14, 165, 233, 0.12)',
                    color: clinicalStatus.color,
                    padding: '3px 9px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    marginBottom: '8px'
                  }}>
                    <Sparkles size={11} /> {clinicalStatus.title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <h2 className="tabular-nums" style={{ margin: 0, fontSize: '32px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.8px' }}>
                      {currentMl.toLocaleString()}
                    </h2>
                    <span style={{ fontSize: '15px', color: '#64748B', fontWeight: 600 }}>
                      / {targetMl.toLocaleString()} ml
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
                    {remainingMl > 0 ? `${remainingMl.toLocaleString()}ml remaining (${targetGlasses - glasses} glasses)` : 'Daily target completed! 🎉'}
                  </p>
                </div>

                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
                  border: '3px solid #38BDF8',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.25), inset 0 2px 4px rgba(0,0,0,0.06)'
                }}>
                  <span className="tabular-nums" style={{ fontSize: '17px', fontWeight: 900, color: '#0369A1', lineHeight: 1 }}>
                    {percentage}%
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#0284C7', marginTop: '2px' }}>
                    GOAL
                  </span>
                </div>
              </div>

              {/* Progress Bar with Liquid Glow */}
              <div style={{
                width: '100%',
                height: '14px',
                background: '#E2E8F0',
                borderRadius: '999px',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #38BDF8 0%, #0284C7 50%, #0369A1 100%)',
                    borderRadius: '999px',
                    boxShadow: '0 0 12px rgba(14, 165, 233, 0.6)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                <span>0 ml</span>
                <span className="tabular-nums">Equiv: {glasses} / {targetGlasses} Glasses (250ml)</span>
                <span>{targetMl} ml</span>
              </div>
            </div>

            {/* Beverage Type Selection Chips */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                Beverage Type
              </label>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {BEVERAGE_TYPES.map((b) => {
                  const isSelected = selectedType === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setSelectedType(b.id);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: isSelected ? '1.5px solid #0284C7' : '1px solid #CBD5E1',
                        background: isSelected ? 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)' : '#FFF',
                        color: isSelected ? '#0369A1' : '#475569',
                        fontSize: '12px',
                        fontWeight: isSelected ? 700 : 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(2, 132, 199, 0.15)' : 'none'
                      }}
                    >
                      <span>{b.icon}</span>
                      <span>{b.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Logging Vessels (6 Presets) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Tap Container to Log
                </label>
                <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: 600 }}>
                  +Points with each sip
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px'
              }}>
                {CONTAINER_PRESETS.map((p) => (
                  <motion.button
                    key={p.amount}
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => handleAdd(p.amount)}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      padding: '12px 8px',
                      border: '1.5px solid rgba(56, 189, 248, 0.35)',
                      boxShadow: '0 4px 12px rgba(14, 165, 233, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      gap: '4px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{p.icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      +{p.amount}ml
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>
                      {p.label}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Custom Write-in Ml */}
              <form onSubmit={handleAddCustom} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <input
                  type="number"
                  placeholder="Custom amount (e.g. 400 ml)..."
                  value={customMl}
                  onChange={(e) => setCustomMl(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    background: '#FFF',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!customMl}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    background: customMl ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : '#E2E8F0',
                    color: customMl ? '#FFF' : '#94A3B8',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: customMl ? 'pointer' : 'default'
                  }}
                >
                  Add Custom
                </button>
              </form>
            </div>

            {/* Daily Target & Smart Reminders Config */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '18px',
              padding: '16px',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    Daily Hydration Goal
                  </span>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                    Clinical recommendation: 30-35ml per kg
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {TARGET_PRESETS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTargetSelect(t)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: targetMl === t ? '1.5px solid #0284C7' : '1px solid #CBD5E1',
                        background: targetMl === t ? '#E0F2FE' : '#FFF',
                        color: targetMl === t ? '#0369A1' : '#64748B',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {t / 1000}L
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: '1px', background: '#F1F5F9' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
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
                      Gentle hourly reminders to maintain blood volume
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleReminders}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    background: data.remindersEnabled ? '#0284C7' : '#E2E8F0',
                    color: data.remindersEnabled ? '#FFF' : '#64748B',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {data.remindersEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {reminderMsg && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: '#ECFDF5',
                  color: '#065F46',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Check size={14} /> {reminderMsg}
                </div>
              )}
            </div>

            {/* Today's Log History */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Today's Hydration Log ({data.logs.length})
                </label>
                {data.logs.length > 0 && (
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Tap trash to undo
                  </span>
                )}
              </div>

              {data.logs.length === 0 ? (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: '16px',
                  border: '1px dashed #CBD5E1',
                  color: '#94A3B8',
                  fontSize: '13px'
                }}>
                  No drinks logged yet today. Tap any vessel above to start!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.logs.map((log) => {
                    const bType = BEVERAGE_TYPES.find(b => b.id === log.type) || BEVERAGE_TYPES[0];
                    return (
                      <div
                        key={log.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: '#FFFFFF',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '18px' }}>{bType.icon}</span>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                              +{log.amountMl} ml ({bType.label})
                            </span>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                              {log.timestamp}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemove(log.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          aria-label="Remove drink entry"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Clinical Mechanism Accordion */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: '14px',
              padding: '12px 14px',
              border: '1px solid #E2E8F0',
              fontSize: '11.5px',
              color: '#475569',
              lineHeight: 1.4
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0284C7', fontWeight: 700, marginBottom: '4px' }}>
                <Info size={14} /> Clinical Impact
              </div>
              Optimal hydration prevents nocturnal hemoconcentration, lowering cardiovascular strain and boosting renal glomerular filtration rate (GFR). Drinking 500ml upon waking offsets overnight insensible fluid losses.
            </div>
          </div>

          {/* Footer CTA */}
          <div style={{
            padding: '14px 24px calc(14px + env(safe-area-inset-bottom))',
            borderTop: '1px solid rgba(14, 165, 233, 0.15)',
            background: '#FFFFFF',
            display: 'flex',
            gap: '10px'
          }}>
            <button
              type="button"
              onClick={() => handleAdd(250)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '14px',
                background: '#E0F2FE',
                color: '#0369A1',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <span>🥛</span> Quick +250ml Glass
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHapticSuccess();
                onClose();
              }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                cursor: 'pointer'
              }}
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
