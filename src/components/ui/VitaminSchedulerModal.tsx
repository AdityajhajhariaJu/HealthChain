import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Pill, 
  Clock, 
  Plus, 
  Trash2, 
  Check, 
  Bell, 
  BellOff, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { 
  getVitaminSchedule, 
  saveVitaminSchedule, 
  toggleVitaminTaken, 
  markAllVitaminsTaken,
  triggerPillNotification,
  VitaminItem,
  getTodayDateString
} from '../../services/VitaminScheduleService';
import { requestNotificationPermission } from '../../services/DailyCheckinNotificationService';

interface VitaminSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const POPULAR_PRESETS = [
  { name: 'Daily Multivitamin', dosage: '1 tablet with meal', defaultTime: '08:30' },
  { name: 'Vitamin D3 & K2', dosage: '2000 IU', defaultTime: '09:00' },
  { name: 'Omega-3 Fish Oil', dosage: '1000mg with meal', defaultTime: '13:00' },
  { name: 'Magnesium Glycinate', dosage: '200mg before sleep', defaultTime: '21:30' },
  { name: 'Vitamin C 1000mg', dosage: '1 tablet morning', defaultTime: '08:30' },
  { name: 'Zinc Picolinate', dosage: '15mg with food', defaultTime: '13:00' },
  { name: 'Vitamin B-Complex', dosage: '1 capsule morning', defaultTime: '08:30' },
  { name: 'Probiotics', dosage: '1 capsule empty stomach', defaultTime: '07:30' }
];

export const VitaminSchedulerModal: React.FC<VitaminSchedulerModalProps> = ({ isOpen, onClose, onUpdated }) => {
  const [vitamins, setVitamins] = useState<VitaminItem[]>([]);
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTime, setNewTime] = useState('08:30');
  const [showAddForm, setShowAddForm] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setVitamins(getVitaminSchedule());
      checkPermission();
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

  const checkPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasNotificationPermission(Notification.permission === 'granted');
    }
  };

  const handleRequestPermission = async () => {
    triggerHapticLight();
    const granted = await requestNotificationPermission();
    setHasNotificationPermission(granted);
  };

  const handleTimeChange = (id: string, newTimeStr: string) => {
    setVitamins(prev => prev.map(v => v.id === id ? { ...v, time: newTimeStr } : v));
  };

  const handleToggleEnabled = (id: string) => {
    triggerHapticLight();
    setVitamins(prev => prev.map(v => v.id === id ? { ...v, enabled: !v.enabled } : v));
  };

  const handleRemove = (id: string) => {
    triggerHapticLight();
    setVitamins(prev => prev.filter(v => v.id !== id));
  };

  const handleToggleTaken = (id: string, name: string) => {
    const isNowTaken = toggleVitaminTaken(id);
    if (isNowTaken) {
      triggerHapticSuccess();
      awardPoints(2, `Taken: ${name}`, 'lifestyle', `pill_${id}_${getTodayDateString()}`);
    } else {
      triggerHapticLight();
    }
    setVitamins(getVitaminSchedule());
    if (onUpdated) onUpdated();
  };

  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newName.trim()) return;

    triggerHapticSuccess();
    const newItem: VitaminItem = {
      id: 'vit_' + Date.now(),
      name: newName.trim(),
      dosage: newDosage.trim() || '1 tablet daily',
      time: newTime || '08:30',
      enabled: true,
      takenToday: false
    };

    setVitamins(prev => [...prev, newItem]);
    setNewName('');
    setNewDosage('');
    setShowAddForm(false);
  };

  const handleAddPreset = (preset: typeof POPULAR_PRESETS[0]) => {
    triggerHapticLight();
    const existing = vitamins.find(v => v.name.toLowerCase() === preset.name.toLowerCase());
    if (existing) {
      return;
    }

    const newItem: VitaminItem = {
      id: 'vit_' + Date.now() + Math.random().toString(36).substring(2, 5),
      name: preset.name,
      dosage: preset.dosage,
      time: preset.defaultTime,
      enabled: true,
      takenToday: false
    };

    setVitamins(prev => [...prev, newItem]);
  };

  const handleSaveAndClose = async () => {
    triggerHapticSuccess();
    await saveVitaminSchedule(vitamins);
    if (onUpdated) onUpdated();
    onClose();
  };

  const handleMarkAllTaken = () => {
    triggerHapticSuccess();
    markAllVitaminsTaken();
    awardPoints(5, 'All Daily Tablets & Vitamins Taken 💊', 'lifestyle', `all_pills_${getTodayDateString()}`);
    setVitamins(getVitaminSchedule());
    if (onUpdated) onUpdated();
  };

  const handleTestPillNotification = (item?: VitaminItem) => {
    triggerHapticLight();
    triggerPillNotification(item || (vitamins.length > 0 ? vitamins[0] : undefined));
  };

  if (!isOpen) return null;

  const allTaken = vitamins.length > 0 && vitamins.filter(v => v.enabled).every(v => v.takenToday);

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
          aria-label="Vitamin and Tablet Schedule"
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
            boxShadow: '0 -15px 45px rgba(217, 119, 6, 0.25)',
            borderTop: '1px solid rgba(255, 255, 255, 0.9)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pull Bar */}
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
            borderBottom: '1px solid #F1F5F9',
            background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.4) 0%, rgba(255, 255, 255, 0.8) 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
              }}>
                <Pill size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                  Vitamin & Tablet Schedule
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                  Decide reminder times & get pill notifications
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

          {/* Scrollable Content Body */}
          <div style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Permission Banner if not granted */}
            {!hasNotificationPermission && (
              <div style={{
                background: '#FEF3C7',
                border: '1px solid #FCD34D',
                borderRadius: '14px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} color="#B45309" />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#92400E' }}>
                    Enable notifications for pill alarms
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: '#B45309',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Allow
                </button>
              </div>
            )}

            {/* Test Pill Banner Trigger */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              background: '#FFFBEB',
              borderRadius: '14px',
              border: '1px solid #FDE68A'
            }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#92400E' }}>
                  Pill Notification Preview
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#B45309' }}>
                  Test the floating capsule pill reminder
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTestPillNotification()}
                style={{
                  background: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)'
                }}
              >
                <Sparkles size={13} /> Test Pill
              </button>
            </div>

            {/* List of Active Tablets */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Your Scheduled Tablets ({vitamins.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#D97706',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <Plus size={14} /> {showAddForm ? 'Close Form' : 'Write Tablet'}
                </button>
              </div>

              {vitamins.length === 0 ? (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: '#F8FAFC',
                  borderRadius: '16px',
                  border: '1px dashed #CBD5E1',
                  color: '#94A3B8',
                  fontSize: '13px'
                }}>
                  No tablets added yet. Tap preset chips below to schedule!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {vitamins.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: item.takenToday ? '#F0FDF4' : '#FFFFFF',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        border: item.takenToday ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      {/* Top Line: Full Name & Trash */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '18px', flexShrink: 0 }}>💊</span>
                          <span style={{
                            fontSize: '15px',
                            fontWeight: 800,
                            color: item.takenToday ? '#065F46' : '#0F172A',
                            textDecoration: item.takenToday ? 'line-through' : 'none',
                            lineHeight: 1.3
                          }}>
                            {item.name}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '4px',
                            marginLeft: '8px'
                          }}
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Dosage subtitle */}
                      <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 500, paddingLeft: '26px' }}>
                        {item.dosage || '1 dose daily'}
                      </div>

                      {/* Controls Row: Time Picker, Alert Bell, and Take Button */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                        paddingTop: '8px',
                        marginTop: '4px',
                        borderTop: '1px solid #F1F5F9'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Native Time Picker */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#F8FAFC',
                            border: '1px solid #CBD5E1',
                            borderRadius: '10px',
                            padding: '4px 8px'
                          }}>
                            <Clock size={13} color="#D97706" />
                            <input
                              type="time"
                              value={item.time}
                              onChange={(e) => handleTimeChange(item.id, e.target.value)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                fontSize: '13px',
                                fontWeight: 800,
                                color: '#0F172A',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            />
                          </div>

                          {/* Bell toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleEnabled(item.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: item.enabled ? '#FEF3C7' : '#F1F5F9',
                              color: item.enabled ? '#B45309' : '#94A3B8',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {item.enabled ? <Bell size={13} /> : <BellOff size={13} />}
                            {item.enabled ? 'Alarm' : 'Muted'}
                          </button>
                        </div>

                        {/* Mark Taken / Done button */}
                        <button
                          type="button"
                          onClick={() => handleToggleTaken(item.id, item.name)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: item.takenToday ? '#10B981' : '#FFFFFF',
                            color: item.takenToday ? '#FFFFFF' : '#059669',
                            border: item.takenToday ? 'none' : '1.5px solid #10B981',
                            borderRadius: '10px',
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          <Check size={14} strokeWidth={2.5} />
                          {item.takenToday ? 'Taken' : 'Take Dose'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expandable Add Custom Tablet Form */}
            {showAddForm && (
              <form onSubmit={handleAddCustom} style={{
                background: '#F8FAFC',
                borderRadius: '18px',
                padding: '14px 16px',
                border: '1.5px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                  Add Custom Tablet or Medicine
                </span>

                <input
                  type="text"
                  placeholder="Tablet name (e.g. Zinc, CoQ10, Metformin)..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: '#FFF',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Dosage (e.g. 500mg, 1 cap)..."
                    value={newDosage}
                    onChange={(e) => setNewDosage(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      background: '#FFF',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#FFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    padding: '0 10px'
                  }}>
                    <Clock size={14} color="#D97706" />
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      style={{ border: 'none', fontSize: '13px', fontWeight: 700, outline: 'none' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!newName.trim()}
                  style={{
                    padding: '10px',
                    borderRadius: '12px',
                    background: newName.trim() ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : '#E2E8F0',
                    color: newName.trim() ? '#FFF' : '#94A3B8',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: newName.trim() ? 'pointer' : 'default'
                  }}
                >
                  + Add Tablet to Schedule
                </button>
              </form>
            )}

            {/* Popular Presets Chips (Quick 1-Tap Add) */}
            <div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                Quick-Add Popular Supplements
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {POPULAR_PRESETS.map((preset) => {
                  const alreadyAdded = vitamins.some(v => v.name.toLowerCase() === preset.name.toLowerCase());
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => handleAddPreset(preset)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: alreadyAdded ? '1px solid #E2E8F0' : '1.5px solid #FDE68A',
                        background: alreadyAdded ? '#F1F5F9' : '#FFFBEB',
                        color: alreadyAdded ? '#94A3B8' : '#92400E',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: alreadyAdded ? 'default' : 'pointer'
                      }}
                    >
                      {alreadyAdded ? '✓ Added' : `+ ${preset.name}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions (Zero Overlap with Bottom Tab Bar) */}
          <div style={{
            padding: '12px 20px calc(14px + env(safe-area-inset-bottom, 16px))',
            borderTop: '1px solid #F1F5F9',
            background: '#FFFFFF',
            display: 'flex',
            gap: '10px'
          }}>
            <button
              type="button"
              onClick={handleMarkAllTaken}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '14px',
                background: allTaken ? '#DCFCE7' : '#F0FDF4',
                color: '#15803D',
                border: '1.5px solid #86EFAC',
                fontWeight: 800,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Check size={16} strokeWidth={2.6} />
              {allTaken ? 'All Taken ✓' : 'Mark All Taken (+5)'}
            </button>

            <button
              type="button"
              onClick={handleSaveAndClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)',
                cursor: 'pointer'
              }}
            >
              Save Schedule
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
