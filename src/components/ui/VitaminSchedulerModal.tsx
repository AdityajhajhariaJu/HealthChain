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
import { useIsMobile } from '../../hooks/useIsMobile';
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
  { name: 'Daily Multivitamin', dosage: '1 tablet with breakfast', defaultTime: '08:30' },
  { name: 'Vitamin D3 & K2', dosage: '2000 IU', defaultTime: '09:00' },
  { name: 'Omega-3 Fish Oil', dosage: '1000mg with meal', defaultTime: '13:00' },
  { name: 'Magnesium Glycinate', dosage: '200mg before sleep', defaultTime: '21:30' },
  { name: 'Vitamin C 1000mg', dosage: '1 tablet morning', defaultTime: '08:30' },
  { name: 'Zinc Picolinate', dosage: '15mg with food', defaultTime: '13:00' },
  { name: 'Vitamin B-Complex', dosage: '1 capsule morning', defaultTime: '08:30' },
  { name: 'Probiotics', dosage: '1 capsule empty stomach', defaultTime: '07:30' }
];

export const VitaminSchedulerModal: React.FC<VitaminSchedulerModalProps> = ({ isOpen, onClose, onUpdated }) => {
  const isMobile = useIsMobile();
  const [vitamins, setVitamins] = useState<VitaminItem[]>([]);
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTime, setNewTime] = useState('08:30');
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

  const handleToggleTaken = (id: string, name: string) => {
    triggerHapticSelection();
    const nextState = toggleVitaminTaken(id);
    setVitamins(getVitaminSchedule());
    if (nextState) {
      awardPoints(2, `Tablet taken: ${name}`, 'lifestyle', `pill_${id}_${getTodayDateString()}`);
    }
    if (onUpdated) onUpdated();
  };

  const handleToggleEnabled = (id: string) => {
    triggerHapticLight();
    setVitamins(prev => prev.map(v => v.id === id ? { ...v, enabled: !v.enabled } : v));
  };

  const handleTimeChange = (id: string, time: string) => {
    setVitamins(prev => prev.map(v => v.id === id ? { ...v, time } : v));
  };

  const handleDelete = (id: string) => {
    triggerHapticLight();
    setVitamins(prev => prev.filter(v => v.id !== id));
  };

  const handleAddCustom = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    triggerHapticSuccess();

    const newItem: VitaminItem = {
      id: 'vit_' + Date.now(),
      name: trimmedName,
      dosage: newDosage.trim() || '1 tablet',
      time: newTime || '08:30',
      enabled: true,
      takenToday: false
    };

    setVitamins(prev => [...prev, newItem]);
    setNewName('');
    setNewDosage('');
  };

  const handleAddPreset = (preset: typeof POPULAR_PRESETS[0]) => {
    triggerHapticLight();
    const existing = vitamins.find(v => v.name.toLowerCase() === preset.name.toLowerCase());
    if (existing) {
      // Toggle or highlight existing
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

  return createPortal(
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '16px 12px' : '24px',
          zIndex: 100000,
          overflowY: 'auto'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '540px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '18px 22px',
              borderBottom: '1px solid #F1F5F9',
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)'
                }}
              >
                <Pill size={22} strokeWidth={2.4} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                    Daily Vitamins & Tablets
                  </h3>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '6px',
                      background: '#FEF3C7',
                      color: '#B45309'
                    }}
                  >
                    PILL REMINDERS
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Set your tablets, decide given times & receive signature pill alerts
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '8px'
              }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Notification Permission Banner if disabled */}
            {!hasNotificationPermission && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} color="#B45309" />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#92400E' }}>
                    Enable notifications to receive alerts at your chosen times
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
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Allow Alerts
                </button>
              </div>
            )}

            {/* List of active tablets */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Your Scheduled Tablets ({vitamins.length})
                </span>
                <button
                  type="button"
                  onClick={() => handleTestPillNotification()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#D97706',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0
                  }}
                >
                  <Sparkles size={13} /> Test Pill Notification
                </button>
              </div>

              {vitamins.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    background: '#F8FAFC',
                    borderRadius: '14px',
                    border: '1px dashed #CBD5E1',
                    color: '#94A3B8',
                    fontSize: '13px'
                  }}
                >
                  No tablets added yet. Write a tablet below or pick from clinical presets.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {vitamins.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: item.takenToday ? '#F0FDF4' : '#FFFFFF',
                        borderRadius: '14px',
                        border: item.takenToday ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                        gap: '10px'
                      }}
                    >
                      {/* Check toggle for today */}
                      <button
                        type="button"
                        onClick={() => handleToggleTaken(item.id, item.name)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          border: item.takenToday ? '2px solid #10B981' : '2px solid #CBD5E1',
                          background: item.takenToday ? '#10B981' : 'transparent',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                        title={item.takenToday ? 'Taken today' : 'Mark taken today'}
                      >
                        {item.takenToday && <Check size={16} strokeWidth={2.6} />}
                      </button>

                      {/* Name & Dosage */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 700,
                              color: item.takenToday ? '#065F46' : '#0F172A',
                              textDecoration: item.takenToday ? 'line-through' : 'none',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {item.name}
                          </span>
                          {item.takenToday && (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#10B981' }}>
                              ✓ TAKEN
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                          {item.dosage}
                        </span>
                      </div>

                      {/* Decided Given Time Picker */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <Clock size={13} color="#D97706" />
                        <input
                          type="time"
                          value={item.time}
                          onChange={(e) => handleTimeChange(item.id, e.target.value)}
                          style={{
                            padding: '4px 6px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#0F172A',
                            background: '#F8FAFC',
                            cursor: 'pointer'
                          }}
                          aria-label={`Time for ${item.name}`}
                        />

                        {/* Bell Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleEnabled(item.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: item.enabled ? '#059669' : '#94A3B8'
                          }}
                          title={item.enabled ? 'Reminder active' : 'Reminder silenced'}
                        >
                          {item.enabled ? <Bell size={16} /> : <BellOff size={16} />}
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#EF4444'
                          }}
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Write and Add Custom Tablet Section */}
            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
                ✍️ Write & Add a Custom Tablet / Medicine
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 100px auto', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Tablet name (e.g. Multivitamin, Zinc)"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    background: '#FFFFFF'
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustom(); } }}
                />

                <input
                  type="text"
                  value={newDosage}
                  onChange={(e) => setNewDosage(e.target.value)}
                  placeholder="Dosage (e.g. 500mg, 1 cap)"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    background: '#FFFFFF'
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustom(); } }}
                />

                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: '#FFFFFF'
                  }}
                />

                <button
                  type="button"
                  onClick={handleAddCustom}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: '#0F766E',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    height: '38px'
                  }}
                >
                  <Plus size={15} /> Add
                </button>
              </div>

              {/* Quick Preset Chips */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px' }}>
                  Tap to add popular supplements:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {POPULAR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      style={{
                        padding: '4px 9px',
                        borderRadius: '999px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        color: '#334155',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={12} color="#0F766E" />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '14px 22px',
              borderTop: '1px solid #F1F5F9',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <button
              type="button"
              onClick={handleMarkAllTaken}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                background: '#ECFDF5',
                color: '#047857',
                border: '1px solid #A7F3D0',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Check size={15} strokeWidth={2.6} /> Mark All Taken (+5 PTS)
            </button>

            <button
              type="button"
              onClick={handleSaveAndClose}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={15} /> Save & Set Pill Alarms
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
