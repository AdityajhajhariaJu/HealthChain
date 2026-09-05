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
  Droplet,
  Wind,
  Syringe,
  Leaf
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

export type PillCategory = 'All' | 'Essentials' | 'Rx Medications' | 'Vitamins' | 'Sleep & Stress';

interface PresetPill {
  name: string;
  dosage: string;
  defaultTime: string;
  category: PillCategory;
  iconType: 'pill' | 'syringe' | 'wind' | 'droplet' | 'leaf';
}

// Curated reference pills (faithfully reflecting reference screenshot media_1788635360813.png & wellness essentials)
const CURATED_PILLS: PresetPill[] = [
  // Prescriptions from reference
  { name: 'Ondansetron', dosage: '4mg oral tablet', defaultTime: '08:00', category: 'Rx Medications', iconType: 'pill' },
  { name: 'Metformin', dosage: '500mg with meal', defaultTime: '19:30', category: 'Rx Medications', iconType: 'pill' },
  { name: 'Spironolactone', dosage: '25mg morning', defaultTime: '08:30', category: 'Rx Medications', iconType: 'pill' },
  { name: 'Birth Control', dosage: '1 tablet daily', defaultTime: '21:00', category: 'Essentials', iconType: 'pill' },
  { name: 'Levothyroxine', dosage: '50mcg empty stomach', defaultTime: '07:00', category: 'Rx Medications', iconType: 'pill' },
  { name: 'Insulin', dosage: 'Basal dose', defaultTime: '22:00', category: 'Rx Medications', iconType: 'syringe' },
  { name: 'Sertraline (Zoloft)', dosage: '50mg morning', defaultTime: '08:30', category: 'Rx Medications', iconType: 'pill' },
  { name: 'Escitalopram (Lexapro)', dosage: '10mg morning', defaultTime: '09:00', category: 'Rx Medications', iconType: 'pill' },
  { name: 'Fluoxetine (Prozac)', dosage: '20mg morning', defaultTime: '08:30', category: 'Rx Medications', iconType: 'pill' },
  { name: 'Prednisone', dosage: '10mg with breakfast', defaultTime: '08:00', category: 'Rx Medications', iconType: 'pill' },
  { name: 'Ventolin (Salbutamol)', dosage: 'Inhaler as directed', defaultTime: '08:00', category: 'Rx Medications', iconType: 'wind' },
  { name: 'Atorvastatin (Lipitor)', dosage: '20mg bedtime', defaultTime: '21:30', category: 'Rx Medications', iconType: 'pill' },
  { name: 'Lisinopril', dosage: '10mg morning', defaultTime: '08:30', category: 'Rx Medications', iconType: 'pill' },
  { name: 'Fexofenadine (Allegra)', dosage: '120mg daily', defaultTime: '09:00', category: 'Rx Medications', iconType: 'pill' },
  { name: 'Levocetirizine (Xyzal)', dosage: '5mg evening', defaultTime: '20:30', category: 'Rx Medications', iconType: 'pill' },
  { name: 'Diphenhydramine (Benadryl)', dosage: '25mg at night', defaultTime: '22:00', category: 'Rx Medications', iconType: 'pill' },

  // Daily Essentials & Vitamins
  { name: 'Daily Multivitamin', dosage: '1 tablet with meal', defaultTime: '08:30', category: 'Essentials', iconType: 'pill' },
  { name: 'Vitamin D3 & K2', dosage: '2000 IU morning', defaultTime: '09:00', category: 'Vitamins', iconType: 'droplet' },
  { name: 'Omega-3 Fish Oil', dosage: '1000mg with meal', defaultTime: '13:00', category: 'Essentials', iconType: 'droplet' },
  { name: 'Magnesium Glycinate', dosage: '200mg before bed', defaultTime: '21:30', category: 'Sleep & Stress', iconType: 'pill' },
  { name: 'Zinc Picolinate', dosage: '15mg with food', defaultTime: '13:00', category: 'Vitamins', iconType: 'pill' },
  { name: 'Vitamin B-Complex', dosage: '1 capsule morning', defaultTime: '08:30', category: 'Vitamins', iconType: 'pill' },
  { name: 'Ashwagandha', dosage: '600mg evening', defaultTime: '20:00', category: 'Sleep & Stress', iconType: 'leaf' },
  { name: 'Probiotics', dosage: '1 capsule empty stomach', defaultTime: '07:30', category: 'Essentials', iconType: 'leaf' },
  { name: 'Iron Bisglycinate', dosage: '25mg with citrus', defaultTime: '10:00', category: 'Vitamins', iconType: 'pill' },
  { name: 'CoQ10 Ubiquinol', dosage: '100mg with meal', defaultTime: '12:30', category: 'Essentials', iconType: 'pill' },
  { name: 'Collagen Peptides', dosage: '10g in warm water', defaultTime: '09:30', category: 'Essentials', iconType: 'droplet' }
];

const CATEGORIES: PillCategory[] = ['All', 'Essentials', 'Rx Medications', 'Vitamins', 'Sleep & Stress'];

export const VitaminSchedulerModal: React.FC<VitaminSchedulerModalProps> = ({ isOpen, onClose, onUpdated }) => {
  const [vitamins, setVitamins] = useState<VitaminItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PillCategory>('All');
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTime, setNewTime] = useState('08:30');
  const [showCustomForm, setShowCustomForm] = useState(false);
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

  const handleTogglePreset = (preset: PresetPill) => {
    triggerHapticSelection();
    const existing = vitamins.find(v => v.name.toLowerCase() === preset.name.toLowerCase());
    if (existing) {
      // One tap removes it from schedule
      handleRemove(existing.id);
      return;
    }

    // One tap adds it to schedule
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

  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newName.trim()) return;

    triggerHapticSuccess();
    const newItem: VitaminItem = {
      id: 'vit_' + Date.now(),
      name: newName.trim(),
      dosage: newDosage.trim() || '1 dose daily',
      time: newTime || '08:30',
      enabled: true,
      takenToday: false
    };

    setVitamins(prev => [...prev, newItem]);
    setNewName('');
    setNewDosage('');
    setShowCustomForm(false);
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

  const handleTestPillNotification = () => {
    triggerHapticLight();
    triggerPillNotification(vitamins.length > 0 ? vitamins[0] : undefined);
  };

  if (!isOpen) return null;

  const takenCount = vitamins.filter(v => v.takenToday).length;
  const allTaken = vitamins.length > 0 && takenCount === vitamins.length;

  const filteredPills = selectedCategory === 'All' 
    ? CURATED_PILLS 
    : CURATED_PILLS.filter(p => p.category === selectedCategory);

  const renderPillIcon = (iconType: PresetPill['iconType'], isScheduled: boolean) => {
    const iconColor = isScheduled ? '#10B981' : '#64748B';
    const size = 15;

    switch (iconType) {
      case 'syringe':
        return <Syringe size={size} color={iconColor} />;
      case 'wind':
        return <Wind size={size} color={iconColor} />;
      case 'droplet':
        return <Droplet size={size} color={iconColor} />;
      case 'leaf':
        return <Leaf size={size} color={iconColor} />;
      case 'pill':
      default:
        return <Pill size={size} color={iconColor} />;
    }
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
          backgroundColor: 'rgba(15, 23, 42, 0.52)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Medication & Vitamin Tracker"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          style={{
            width: '100%',
            maxWidth: '500px',
            maxHeight: 'calc(100vh - max(40px, env(safe-area-inset-top, 40px)))',
            background: 'linear-gradient(180deg, #FFFDFB 0%, #FFF8F4 45%, #FEF2E8 100%)',
            borderTopLeftRadius: '32px',
            borderTopRightRadius: '32px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -20px 60px rgba(251, 146, 60, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
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
            <div style={{ width: '38px', height: '4px', backgroundColor: '#E2D9D2', borderRadius: '999px' }} />
          </div>

          {/* Modal Header */}
          <div style={{
            padding: '4px 20px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(243, 232, 225, 0.85)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25), inset 0 1px 0 rgba(255,255,255,0.4)'
              }}>
                <Pill size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>
                  Medication & Vitamins
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#78716C', fontWeight: 500 }}>
                  Personalized dosing & signature pill alerts
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
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(243, 232, 225, 0.9)',
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
            gap: '18px'
          }}>
            {/* Status Summary & Pill Test Ribbon */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(254, 247, 242, 0.88) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '14px 16px',
              border: '1.5px solid rgba(243, 232, 225, 0.95)',
              boxShadow: '0 8px 24px rgba(220, 140, 100, 0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                    Today's Regimen:
                  </span>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    color: allTaken ? '#065F46' : '#9A3412',
                    background: allTaken ? '#DCFCE7' : '#FFEDD5',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: allTaken ? '1px solid #A7F3D0' : '1px solid #FED7AA'
                  }}>
                    {takenCount} of {vitamins.length} taken
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#78716C' }}>
                  {allTaken ? 'All daily doses completed! 🎉' : 'Tap capsules below to manage schedule'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestPillNotification}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1.5px solid #10B981',
                  borderRadius: '999px',
                  padding: '6px 12px',
                  color: '#059669',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)'
                }}
              >
                <Sparkles size={12} color="#10B981" /> Test Alert
              </button>
            </div>

            {/* Notification Permission Banner */}
            {!hasNotificationPermission && (
              <div style={{
                background: '#FFF7ED',
                border: '1px solid #FED7AA',
                borderRadius: '16px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={15} color="#EA580C" />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#9A3412' }}>
                    Enable device notifications for tablet alerts
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '8px',
                    background: '#EA580C',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Enable
                </button>
              </div>
            )}

            {/* SECTION 1: Tap Pills to Add / Remove (Direct Reference Replicant) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Select Medications & Tablets
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomForm(!showCustomForm)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#EA580C',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0
                  }}
                >
                  <Plus size={13} /> {showCustomForm ? 'Close' : 'Write Tablet'}
                </button>
              </div>

              {/* Category Filter Chips */}
              <div style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '8px',
                marginBottom: '8px',
                scrollbarWidth: 'none'
              }}>
                {CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setSelectedCategory(cat);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: isActive ? '1.5px solid #10B981' : '1px solid rgba(243, 232, 225, 0.9)',
                        background: isActive ? '#ECFDF5' : '#FFFFFF',
                        color: isActive ? '#065F46' : '#64748B',
                        fontSize: '11.5px',
                        fontWeight: isActive ? 800 : 600,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        boxShadow: isActive ? '0 2px 6px rgba(16, 185, 129, 0.12)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Custom Write-In Form (Expandable) */}
              <AnimatePresence>
                {showCustomForm && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                    onSubmit={handleAddCustom}
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '18px',
                      padding: '14px',
                      border: '1.5px solid rgba(251, 146, 60, 0.35)',
                      boxShadow: '0 4px 16px rgba(251, 146, 60, 0.08)',
                      marginBottom: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Tablet name (e.g. Lisinopril, Metformin, B12)..."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid #E2D9D2',
                        background: '#FFFDFB',
                        fontSize: '13px',
                        color: '#0F172A',
                        outline: 'none'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 500mg with meal)..."
                        value={newDosage}
                        onChange={(e) => setNewDosage(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: '1px solid #E2D9D2',
                          background: '#FFFDFB',
                          fontSize: '13px',
                          color: '#0F172A',
                          outline: 'none'
                        }}
                      />
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: '1px solid #E2D9D2',
                          background: '#FFFDFB',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0F172A'
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newName.trim()}
                      style={{
                        padding: '11px',
                        borderRadius: '12px',
                        background: newName.trim() ? 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)' : '#E2E8F0',
                        color: newName.trim() ? '#FFF' : '#94A3B8',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: newName.trim() ? 'pointer' : 'default',
                        boxShadow: newName.trim() ? '0 4px 12px rgba(234, 88, 12, 0.25)' : 'none'
                      }}
                    >
                      + Add Custom Medication
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Reference-Styled Rounded Capsule Pill Chips Grid */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {filteredPills.map((pill) => {
                  const isScheduled = vitamins.some(v => v.name.toLowerCase() === pill.name.toLowerCase());
                  return (
                    <motion.button
                      key={pill.name}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => handleTogglePreset(pill)}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '999px',
                        border: isScheduled ? '1.5px solid #10B981' : '1.5px solid #E8E2DC',
                        background: isScheduled ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' : '#FFFFFF',
                        color: isScheduled ? '#065F46' : '#1E293B',
                        fontSize: '13.5px',
                        fontWeight: isScheduled ? 800 : 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        cursor: 'pointer',
                        boxShadow: isScheduled 
                          ? '0 3px 12px rgba(16, 185, 129, 0.18)' 
                          : '0 2px 6px rgba(0, 0, 0, 0.03)',
                        transition: 'all 0.18s ease'
                      }}
                    >
                      {renderPillIcon(pill.iconType, isScheduled)}
                      <span>{pill.name}</span>
                      {isScheduled && (
                        <Check size={14} color="#10B981" strokeWidth={3} />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: Active Scheduled Doses (Our Functional Use Case) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Scheduled Doses & Alarms ({vitamins.length})
                </span>
                {vitamins.length > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllTaken}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#10B981',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    <Check size={14} /> Mark all done (+5)
                  </button>
                )}
              </div>

              {vitamins.length === 0 ? (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '20px',
                  border: '1.5px dashed #E2D9D2',
                  color: '#94A3B8',
                  fontSize: '13px'
                }}>
                  No tablets scheduled yet. Tap any pill capsule above to add!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {vitamins.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: item.takenToday 
                          ? 'linear-gradient(135deg, rgba(240, 253, 244, 0.95) 0%, rgba(220, 252, 231, 0.8) 100%)' 
                          : 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '20px',
                        padding: '14px 16px',
                        border: item.takenToday ? '1.5px solid #86EFAC' : '1px solid rgba(243, 232, 225, 0.9)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255,255,255,0.95)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      {/* Top Row: Icon, Name, Dosage, Delete */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: item.takenToday ? '#DCFCE7' : '#FFEDD5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            flexShrink: 0
                          }}>
                            💊
                          </div>
                          <div>
                            <span style={{
                              fontSize: '15px',
                              fontWeight: 800,
                              color: item.takenToday ? '#065F46' : '#0F172A',
                              textDecoration: item.takenToday ? 'line-through' : 'none',
                              display: 'block',
                              lineHeight: 1.25
                            }}>
                              {item.name}
                            </span>
                            <span style={{ fontSize: '12px', color: '#78716C', fontWeight: 500 }}>
                              {item.dosage || '1 daily dose'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Bottom Row: Time Picker, Alarm Toggle, and Take Button */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(0, 0, 0, 0.04)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Time Picker Capsule */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#FFFFFF',
                            border: '1px solid #E2D9D2',
                            borderRadius: '10px',
                            padding: '4px 8px'
                          }}>
                            <Clock size={12} color="#EA580C" />
                            <input
                              type="time"
                              value={item.time}
                              onChange={(e) => handleTimeChange(item.id, e.target.value)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                fontSize: '12.5px',
                                fontWeight: 800,
                                color: '#0F172A',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            />
                          </div>

                          {/* Alarm Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleEnabled(item.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: item.enabled ? '#FFEDD5' : '#F1F5F9',
                              color: item.enabled ? '#C2410C' : '#94A3B8',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '5px 9px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {item.enabled ? <Bell size={12} /> : <BellOff size={12} />}
                            {item.enabled ? 'Alarm' : 'Muted'}
                          </button>
                        </div>

                        {/* Take Dose Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleTaken(item.id, item.name)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: item.takenToday ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : '#FFFFFF',
                            color: item.takenToday ? '#FFFFFF' : '#059669',
                            border: item.takenToday ? 'none' : '1.5px solid #10B981',
                            borderRadius: '999px',
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: item.takenToday ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
                          }}
                        >
                          <Check size={13} strokeWidth={2.5} />
                          {item.takenToday ? 'Taken' : 'Take Dose'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reference-Styled Rose-Coral Bottom Action Button */}
          <div style={{
            padding: '12px 20px calc(14px + env(safe-area-inset-bottom, 16px))',
            borderTop: '1px solid rgba(243, 232, 225, 0.85)',
            background: '#FFFFFF'
          }}>
            <button
              type="button"
              onClick={handleSaveAndClose}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: '15px',
                boxShadow: '0 8px 24px rgba(225, 29, 72, 0.28), inset 0 1px 0 rgba(255,255,255,0.25)',
                cursor: 'pointer'
              }}
            >
              {vitamins.length > 0 
                ? `Save Schedule (${vitamins.length} Medications)` 
                : 'Save Schedule'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
