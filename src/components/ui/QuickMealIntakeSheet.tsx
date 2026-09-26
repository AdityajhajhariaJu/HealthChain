import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, CheckCircle2, Utensils, CloudOff, ArrowRight, Clock3 } from 'lucide-react';
import { addNutritionLog, removeNutritionLog } from '../../services/ProfileEngine';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import FocusTrap from './FocusTrap';
import './QuickMealIntakeSheet.css';

export type CircadianSlot = 'Morning' | 'Noon' | 'Evening' | 'Night';

interface QuickMealIntakeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onMealLogged?: (mealName: string, slot: CircadianSlot) => void;
  simple?: boolean;
}

const CIRCADIAN_SLOTS: { id: CircadianSlot; label: string; icon: string; timeRange: string; organClock: string; organTip: string; desc: string }[] = [
  {
    id: 'Morning',
    label: 'Morning',
    icon: '☀️',
    timeRange: '07:00 – 11:00',
    organClock: 'Morning meal',
    organTip: 'Choose this slot if it matches when you ate.',
    desc: 'Breakfast & Fasting Break',
  },
  {
    id: 'Noon',
    label: 'Noon',
    icon: '🌤️',
    timeRange: '11:00 – 15:00',
    organClock: 'Midday meal',
    organTip: 'Choose this slot if it matches when you ate.',
    desc: 'Core Lunch & Digest',
  },
  {
    id: 'Evening',
    label: 'Evening',
    icon: '🌆',
    timeRange: '15:00 – 19:00',
    organClock: 'Evening meal',
    organTip: 'Choose this slot if it matches when you ate.',
    desc: 'Afternoon Tea & Transition',
  },
  {
    id: 'Night',
    label: 'Night',
    icon: '🌙',
    timeRange: '19:00 – 23:00',
    organClock: 'Night meal',
    organTip: 'Choose this slot if it matches when you ate.',
    desc: 'Dinner & Fasting Onset',
  },
];

const QUICK_INDIAN_CAPSULES = [
  { id: 'chai', name: 'Masala Chai', icon: '☕' },
  { id: 'poha', name: 'Poha with Peanuts', icon: '🥣' },
  { id: 'besan_chilla', name: 'Besan Chilla', icon: '🥞' },
  { id: 'curd_dahi', name: 'Curd / Dahi', icon: '🥛' },
  { id: 'achaar', name: 'Mango / Lime Achaar', icon: '🥭' },
  { id: 'chana_dal', name: 'Chana Dal Tadka', icon: '🍲' },
  { id: 'paneer_bhurji', name: 'Paneer Bhurji', icon: '🧀' },
  { id: 'roti_sabzi', name: 'Roti + Seasonal Sabzi', icon: '🫓' },
  { id: 'khichdi', name: 'Moong Dal Khichdi + Ghee', icon: '🍚' },
  { id: 'coffee', name: 'Filter Coffee', icon: '☕' },
  { id: 'makhana', name: 'Roasted Makhana', icon: '🍿' },
  { id: 'rusk', name: 'Tea Rusk / Biscuits', icon: '🍪' },
  { id: 'idli_sambar', name: 'Idli + Veg Sambar', icon: '🥘' },
  { id: 'sprout_salad', name: 'Sprouted Moong Salad', icon: '🥗' },
];

const slotForHour = (hour: number): CircadianSlot => {
  if (hour >= 5 && hour < 11) return 'Morning';
  if (hour >= 11 && hour < 15) return 'Noon';
  if (hour >= 15 && hour < 19) return 'Evening';
  return 'Night';
};

export const QuickMealIntakeSheet: React.FC<QuickMealIntakeSheetProps> = ({
  isOpen,
  onClose,
  onMealLogged,
  simple = false,
}) => {
  // Determine default circadian slot based on hour of day
  const getCurrentSlot = (): CircadianSlot => {
    return slotForHour(new Date().getHours());
  };

  const [selectedSlot, setSelectedSlot] = useState<CircadianSlot>(getCurrentSlot());
  const [mealText, setMealText] = useState('');
  const [selectedCapsules, setSelectedCapsules] = useState<string[]>([]);
  const [timingOffset, setTimingOffset] = useState<'now' | '30m' | '1h' | '2h'>('now');
  const [portion, setPortion] = useState<'light' | 'standard' | 'heavy' | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setSpeechSupported(supported);
  }, []);

  useEffect(() => {
    if (!isOpen || !simple) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, simple, onClose]);

  const handleToggleCapsule = (capName: string) => {
    triggerHapticSelection();
    if (selectedCapsules.includes(capName)) {
      setSelectedCapsules((prev) => prev.filter((c) => c !== capName));
    } else {
      setSelectedCapsules((prev) => [...prev, capName]);
      if (!mealText) {
        setMealText(capName);
      } else if (!mealText.includes(capName)) {
        setMealText((prev) => `${prev}, ${capName}`);
      }
    }
  };

  const handleVoiceInput = () => {
    triggerHapticLight();
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          triggerHapticSuccess();
          setMealText((prev) => (prev ? `${prev}, ${transcript}` : transcript));
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSaveMeal = () => {
    const finalMealName = mealText.trim() || selectedCapsules.join(', ');
    if (!finalMealName) return;

    // Compute backdated timestamp if timingOffset is used
    const loggedAt = new Date();
    const now = new Date(loggedAt);
    if (timingOffset === '30m') now.setMinutes(now.getMinutes() - 30);
    else if (timingOffset === '1h') now.setHours(now.getHours() - 1);
    else if (timingOffset === '2h') now.setHours(now.getHours() - 2);
    const savedSlot = simple ? slotForHour(now.getHours()) : selectedSlot;

    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const logPayload = {
      meal: finalMealName,
      name: finalMealName,
      slot: savedSlot,
      category: savedSlot,
      ...(portion ? { portion } : {}),
      date: todayStr,
      loggedAt: loggedAt.toISOString(),
      occurredAt: now.toISOString(),
      timePrecision: 'approximate',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      tags: selectedCapsules,
    };

    const entryId = addNutritionLog(logPayload);
    if (!entryId) {
      window.dispatchEvent(new CustomEvent('hc_toast', {
        detail: { title: 'Meal not saved', message: 'Your meal is still here. Free device storage and try again.', type: 'error' }
      }));
      return;
    }
    triggerHapticSuccess();
    window.dispatchEvent(new Event('hc_profile_updated'));

    // Dispatch 6-second undo safety toast (Nielsen H3/H5)
    window.dispatchEvent(new CustomEvent('hc_toast', {
      detail: {
        title: 'Meal Logged ✓',
        message: finalMealName,
        type: 'success',
        actionLabel: 'Undo',
        onAction: () => {
          triggerHapticLight();
          removeNutritionLog(entryId);
          window.dispatchEvent(new CustomEvent('hc_toast', {
            detail: {
              title: 'Meal Log Undone',
              message: `${finalMealName} removed from diary.`,
              type: 'info'
            }
          }));
        },
        duration: 6000
      }
    }));

    if (onMealLogged) {
      onMealLogged(finalMealName, savedSlot);
    }

    // Reset and close
    setMealText('');
    setSelectedCapsules([]);
    setPortion(null);
    setTimingOffset('now');
    onClose();
  };

  if (!isOpen) return null;

  if (simple) return <FocusTrap isActive={isOpen}>
    <div className="gr-meal-backdrop" role="dialog" aria-modal="true" aria-label="Record a meal" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="gr-meal-sheet">
        <div className="gr-meal-head"><span className="gr-meal-icon"><Utensils size={21} /></span><div><small>MY RECORDS</small><h2>Record a meal</h2></div><button type="button" aria-label="Close meal entry" onClick={onClose}><X size={18} /></button></div>
        <div className="gr-meal-body"><p>Save what you remember. You can connect it to a question later.</p><label htmlFor="gr-meal-name">What did you eat or drink?</label><input id="gr-meal-name" type="text" value={mealText} maxLength={180} onChange={(event) => setMealText(event.target.value)} placeholder="e.g. chai and toast" />
          <details className="gr-meal-time"><summary><Clock3 size={16} /> When was it? <span>Optional</span></summary><div role="group" aria-label="Approximate time eaten">{([['now','Now'],['30m','About 30 minutes ago'],['1h','About an hour ago'],['2h','About two hours ago']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={timingOffset === value} onClick={() => setTimingOffset(value)}>{label}</button>)}</div><small>Saved as an approximate time, using your device clock.</small></details>
          <p className="gr-meal-note">A meal entry does not say whether a symptom happened or what caused it.</p>
        </div>
        <div className="gr-meal-footer"><button type="button" disabled={!mealText.trim()} onClick={handleSaveMeal}>Save meal <ArrowRight size={17} /></button></div>
      </div>
    </div>
  </FocusTrap>;

  return (
    <AnimatePresence>
      <FocusTrap isActive={isOpen}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quick meal entry"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 11000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '540px',
              maxHeight: '90vh',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFAFA 45%, #FFF7F8 100%)',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              border: '1.5px solid #F1E5E7',
              boxShadow: '0 -16px 48px rgba(45, 25, 25, 0.16)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Grab Handle */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '12px' }}>
              <div style={{ width: '42px', height: '4px', borderRadius: '999px', background: '#E2D9DC' }} />
            </div>

            {/* Header */}
            <div
              style={{
                padding: '14px 20px 10px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #F1E5E7',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#AD234A', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    CIRCADIAN MEAL INTAKE
                  </span>
                  <span style={{ fontSize: '10px', background: '#FEF2F3', border: '1px solid #F9D2D7', color: '#CD3153', padding: '1px 6px', borderRadius: '999px', fontWeight: 700 }}>
                    +15 Pts
                  </span>
                </div>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                  What did you consume?
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  onClose();
                }}
                aria-label="Close meal intake sheet"
                style={{
                  width: '40px',
                  height: '40px',
                  minWidth: '40px',
                  minHeight: '40px',
                  borderRadius: '50%',
                  background: '#FFF8F9',
                  border: '1px solid #F1E5E7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#8D7167',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Offline Resilience Indicator (H4) */}
            {typeof navigator !== 'undefined' && !navigator.onLine && (
              <div style={{
                margin: '8px 20px 0',
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: '#92400E',
                fontWeight: 600
              }}>
                <CloudOff size={13} />
                <span>Working offline — Meal entry will be preserved locally and auto-synced.</span>
              </div>
            )}

            {/* Scrollable Content Body */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px 24px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* 1. Circadian 4-Slot Capsule Tabs */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  When did you eat?
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {CIRCADIAN_SLOTS.map((slot) => {
                    const isCurrent = selectedSlot === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          triggerHapticSelection();
                          setSelectedSlot(slot.id);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '10px 6px',
                          borderRadius: '16px',
                          border: isCurrent ? '1.5px solid #CD3153' : '1px solid #F1E5E7',
                          background: isCurrent ? 'linear-gradient(135deg, #FEF2F3 0%, #FFF0F4 100%)' : '#FFFFFF',
                          color: isCurrent ? '#AD234A' : '#475569',
                          boxShadow: isCurrent ? '0 4px 12px rgba(205, 49, 83, 0.16)' : '0 1px 3px rgba(0,0,0,0.02)',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <span style={{ fontSize: '20px', marginBottom: '2px' }}>{slot.icon}</span>
                        <span style={{ fontSize: '12px', fontWeight: 800 }}>{slot.label}</span>
                        <span style={{ fontSize: '9px', opacity: isCurrent ? 0.9 : 0.6, marginTop: '2px' }}>
                          {slot.timeRange.split('–')[0].trim()}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Circadian Organ Clock Capsule */}
                {(() => {
                  const activeSlotMeta = CIRCADIAN_SLOTS.find((s) => s.id === selectedSlot);
                  if (!activeSlotMeta) return null;
                  return (
                    <div
                      style={{
                        marginTop: '10px',
                        background: 'linear-gradient(135deg, #FFF8F9 0%, #FFFFFF 100%)',
                        borderRadius: '14px',
                        padding: '10px 14px',
                        border: '1px solid #F9D2D7',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>⏰</span>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#AD234A' }}>
                          {activeSlotMeta.organClock}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.35 }}>
                          {activeSlotMeta.organTip}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 2. Text Input Bar with Voice Mic Button */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  Meal Details / Description
                </div>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    value={mealText}
                    onChange={(e) => setMealText(e.target.value)}
                    placeholder="e.g. Masala chai, poha, mango achaar, curd..."
                    aria-label="Describe what you consumed"
                    style={{
                      width: '100%',
                      padding: '13px 48px 13px 15px',
                      borderRadius: '14px',
                      border: '1.5px solid #F1E5E7',
                      background: '#FFFFFF',
                      fontSize: '14px',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                    }}
                  />

                  {speechSupported && (
                    <button
                      type="button"
                      onClick={handleVoiceInput}
                      aria-label="Dictate meal by voice"
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isListening
                          ? '#EF4444'
                          : 'linear-gradient(135deg, #D32C56 0%, #B31943 100%)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: isListening ? '0 0 14px rgba(239, 68, 68, 0.6)' : '0 3px 8px rgba(179, 25, 67, 0.3)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Quick Indian & Clinical Capsules */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Quick Indian foods
                  </span>
                  <span style={{ fontSize: '11px', color: '#CD3153', fontWeight: 700 }}>Multi-select</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    maxHeight: '140px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                  }}
                >
                  {QUICK_INDIAN_CAPSULES.map((cap) => {
                    const isSelected = selectedCapsules.includes(cap.name);
                    return (
                      <button
                        key={cap.id}
                        type="button"
                        onClick={() => handleToggleCapsule(cap.name)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isSelected ? '1.5px solid #CD3153' : '1px solid #F1E5E7',
                          background: isSelected ? '#FEF2F3' : '#FFFFFF',
                          color: isSelected ? '#AD234A' : '#475569',
                          boxShadow: isSelected ? '0 2px 8px rgba(205, 49, 83, 0.15)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{cap.icon}</span>
                        <span>{cap.name}</span>
                        {isSelected && <CheckCircle2 size={13} color="#CD3153" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Intake Time & Portion Calibration */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Consumed At
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['now', '30m', '1h', '2h'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          triggerHapticSelection();
                          setTimingOffset(t);
                        }}
                        style={{
                          flex: 1,
                          padding: '6px 2px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: timingOffset === t ? '1.5px solid #CD3153' : '1px solid #F1E5E7',
                          background: timingOffset === t ? '#FEF2F3' : '#FFFFFF',
                          color: timingOffset === t ? '#AD234A' : '#64748B',
                        }}
                      >
                        {t === 'now' ? 'Just Now' : `-${t}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Portion Size (optional)
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['light', 'standard', 'heavy'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          triggerHapticSelection();
                          setPortion(p);
                        }}
                        style={{
                          flex: 1,
                          padding: '6px 2px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          cursor: 'pointer',
                          border: portion === p ? '1.5px solid #CD3153' : '1px solid #F1E5E7',
                          background: portion === p ? '#FEF2F3' : '#FFFFFF',
                          color: portion === p ? '#AD234A' : '#64748B',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Action Button */}
            <div
              style={{
                padding: '14px 20px 20px 20px',
                borderTop: '1px solid #F1E5E7',
                background: '#FFFFFF',
              }}
            >
              <button
                type="button"
                onClick={handleSaveMeal}
                disabled={!mealText.trim() && selectedCapsules.length === 0}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '16px',
                  border: 'none',
                  background:
                    !mealText.trim() && selectedCapsules.length === 0
                      ? '#F1E5E7'
                      : 'linear-gradient(135deg, #D32C56 0%, #B31943 100%)',
                  color: !mealText.trim() && selectedCapsules.length === 0 ? '#94A3B8' : '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: !mealText.trim() && selectedCapsules.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow:
                    !mealText.trim() && selectedCapsules.length === 0
                      ? 'none'
                      : '0 8px 24px rgba(205, 49, 83, 0.32)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Utensils size={18} />
                <span>Log Meal & Track Response</span>
              </button>
            </div>
          </motion.div>
        </div>
      </FocusTrap>
    </AnimatePresence>
  );
};
export default QuickMealIntakeSheet;
