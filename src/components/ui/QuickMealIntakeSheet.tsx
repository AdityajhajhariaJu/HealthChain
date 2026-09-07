import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, CheckCircle2, Utensils, CloudOff } from 'lucide-react';
import { addNutritionLog, removeNutritionLog } from '../../services/ProfileEngine';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import FocusTrap from './FocusTrap';

export type CircadianSlot = 'Morning' | 'Noon' | 'Evening' | 'Night';

interface QuickMealIntakeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onMealLogged?: (mealName: string, slot: CircadianSlot) => void;
}

const CIRCADIAN_SLOTS: { id: CircadianSlot; label: string; icon: string; timeRange: string; organClock: string; organTip: string; desc: string }[] = [
  {
    id: 'Morning',
    label: 'Morning',
    icon: '☀️',
    timeRange: '07:00 – 11:00',
    organClock: 'Stomach Agni Peak (07:00–09:00)',
    organTip: 'Maximum stomach acid (HCl) secretion; optimal for protein assimilation and dense complex carbohydrates.',
    desc: 'Breakfast & Fasting Break',
  },
  {
    id: 'Noon',
    label: 'Noon',
    icon: '🌤️',
    timeRange: '11:00 – 15:00',
    organClock: 'Spleen & Small Intestine Peak (11:00–13:00)',
    organTip: 'Solar metabolic fire at absolute peak; highest digestive enzyme concentration of the day.',
    desc: 'Core Lunch & Digest',
  },
  {
    id: 'Evening',
    label: 'Evening',
    icon: '🌆',
    timeRange: '15:00 – 19:00',
    organClock: 'Kidney & Autonomic Balance (17:00–19:00)',
    organTip: 'Optimal window for hydration & electrolyte balance; parasympathetic nervous system wind-down.',
    desc: 'Afternoon Tea & Transition',
  },
  {
    id: 'Night',
    label: 'Night',
    icon: '🌙',
    timeRange: '19:00 – 23:00',
    organClock: 'Triple Burner & Autophagy Onset (21:00–23:00)',
    organTip: 'Digestive enzyme secretion drops 70%; avoid high-histamine fermentations to prevent nocturnal vagal tachycardia.',
    desc: 'Dinner & Fasting Onset',
  },
];

const QUICK_INDIAN_CAPSULES = [
  { id: 'chai', name: 'Masala Chai', icon: '☕', cal: 90, tag: 'Caffeine / Dairy' },
  { id: 'poha', name: 'Poha with Peanuts', icon: '🥣', cal: 240, tag: 'Low FODMAP' },
  { id: 'besan_chilla', name: 'Besan Chilla', icon: '🥞', cal: 210, tag: 'GOS / FODMAP' },
  { id: 'curd_dahi', name: 'Curd / Dahi', icon: '🥛', cal: 120, tag: 'Fermented Dairy' },
  { id: 'achaar', name: 'Mango / Lime Achaar', icon: '🥭', cal: 45, tag: 'High Histamine' },
  { id: 'chana_dal', name: 'Chana Dal Tadka', icon: '🍲', cal: 280, tag: 'Fermentable Legume' },
  { id: 'paneer_bhurji', name: 'Paneer Bhurji', icon: '🧀', cal: 320, tag: 'Casein Rich' },
  { id: 'roti_sabzi', name: 'Roti + Seasonal Sabzi', icon: '🫓', cal: 310, tag: 'Whole Wheat / Fiber' },
  { id: 'khichdi', name: 'Moong Dal Khichdi + Ghee', icon: '🍚', cal: 290, tag: 'Gut Rest / Soothing' },
  { id: 'coffee', name: 'Filter Coffee', icon: '☕', cal: 110, tag: 'Adenosine Rebound' },
  { id: 'makhana', name: 'Roasted Makhana', icon: '🍿', cal: 130, tag: 'Anti-Inflammatory' },
  { id: 'rusk', name: 'Tea Rusk / Biscuits', icon: '🍪', cal: 160, tag: 'Refined Wheat' },
  { id: 'idli_sambar', name: 'Idli + Veg Sambar', icon: '🥘', cal: 260, tag: 'Fermented Rice' },
  { id: 'sprout_salad', name: 'Sprouted Moong Salad', icon: '🥗', cal: 140, tag: 'Raw Fiber' },
];

export const QuickMealIntakeSheet: React.FC<QuickMealIntakeSheetProps> = ({
  isOpen,
  onClose,
  onMealLogged,
}) => {
  // Determine default circadian slot based on hour of day
  const getCurrentSlot = (): CircadianSlot => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Morning';
    if (hour >= 11 && hour < 15) return 'Noon';
    if (hour >= 15 && hour < 19) return 'Evening';
    return 'Night';
  };

  const [selectedSlot, setSelectedSlot] = useState<CircadianSlot>(getCurrentSlot());
  const [mealText, setMealText] = useState('');
  const [selectedCapsules, setSelectedCapsules] = useState<string[]>([]);
  const [timingOffset, setTimingOffset] = useState<'now' | '30m' | '1h' | '2h'>('now');
  const [portion, setPortion] = useState<'light' | 'standard' | 'heavy'>('standard');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setSpeechSupported(supported);
  }, []);

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
    const finalMealName = mealText.trim() || (selectedCapsules.length > 0 ? selectedCapsules.join(', ') : 'Nutrient Intake');
    if (!finalMealName) return;

    triggerHapticSuccess();

    // Compute backdated timestamp if timingOffset is used
    const now = new Date();
    if (timingOffset === '30m') now.setMinutes(now.getMinutes() - 30);
    else if (timingOffset === '1h') now.setHours(now.getHours() - 1);
    else if (timingOffset === '2h') now.setHours(now.getHours() - 2);

    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Calculate approximate calories from capsules or portion
    const baseCal = selectedCapsules.reduce((sum, name) => {
      const found = QUICK_INDIAN_CAPSULES.find((c) => c.name === name);
      return sum + (found?.cal || 150);
    }, 0) || (portion === 'light' ? 220 : portion === 'standard' ? 450 : 750);

    const logPayload = {
      meal: finalMealName,
      name: finalMealName,
      slot: selectedSlot,
      category: selectedSlot,
      portion,
      calories: baseCal,
      protein: Math.round(baseCal * 0.04),
      carbs: Math.round(baseCal * 0.12),
      fat: Math.round(baseCal * 0.04),
      date: todayStr,
      loggedAt: now.toISOString(),
      tags: selectedCapsules,
    };

    const entryId = addNutritionLog(logPayload);
    awardPoints(15, 'Logged Circadian Meal Intake');
    window.dispatchEvent(new Event('hc_profile_updated'));

    // Dispatch 6-second undo safety toast (Nielsen H3/H5)
    window.dispatchEvent(new CustomEvent('hc_toast', {
      detail: {
        title: 'Meal Logged ✓',
        message: `${finalMealName} (+15 VP)`,
        type: 'success',
        actionLabel: 'Undo',
        onAction: () => {
          triggerHapticLight();
          removeNutritionLog(entryId || logPayload.loggedAt);
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
      onMealLogged(finalMealName, selectedSlot);
    }

    // Reset and close
    setMealText('');
    setSelectedCapsules([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <FocusTrap isActive={isOpen}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quick Circadian Meal Intake"
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
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 45%, #F0FDFA 100%)',
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              border: '1.5px solid #99F6E4',
              boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Grab Handle */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '12px' }}>
              <div style={{ width: '42px', height: '4px', borderRadius: '999px', background: '#CBD5E1' }} />
            </div>

            {/* Header */}
            <div
              style={{
                padding: '14px 20px 10px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    CIRCADIAN METABOLIC INTAKE
                  </span>
                  <span style={{ fontSize: '10px', background: '#CCFBF1', color: '#0F766E', padding: '1px 6px', borderRadius: '999px', fontWeight: 700 }}>
                    +15 Pts
                  </span>
                </div>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '20px', fontWeight: 800, color: '#1E293B', letterSpacing: '-0.3px' }}>
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
                  width: '44px',
                  height: '44px',
                  minWidth: '44px',
                  minHeight: '44px',
                  borderRadius: '50%',
                  background: '#F1F5F9',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
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
                  Circadian Timing Window
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
                          border: isCurrent ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                          background: isCurrent ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)' : '#FFFFFF',
                          color: isCurrent ? '#FFFFFF' : '#475569',
                          boxShadow: isCurrent ? '0 4px 12px rgba(13, 148, 136, 0.28)' : '0 1px 3px rgba(0,0,0,0.02)',
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
                        background: 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%)',
                        borderRadius: '14px',
                        padding: '10px 14px',
                        border: '1px solid #CCFBF1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>⏰</span>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E' }}>
                          {activeSlotMeta.organClock}
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.35 }}>
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
                      padding: '14px 50px 14px 16px',
                      borderRadius: '16px',
                      border: '1.5px solid #99F6E4',
                      background: '#FFFFFF',
                      fontSize: '14px',
                      color: '#1E293B',
                      outline: 'none',
                      boxSizing: 'border-box',
                      boxShadow: '0 2px 8px rgba(13, 148, 136, 0.06)',
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
                        width: '36px',
                        height: '36px',
                        borderRadius: '12px',
                        border: 'none',
                        background: isListening
                          ? '#EF4444'
                          : 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: isListening ? '0 0 14px rgba(239, 68, 68, 0.6)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Quick Indian & Clinical Capsules */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    1-Tap Indian Diet Capsules
                  </span>
                  <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: 600 }}>Multi-select</span>
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
                          border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                          background: isSelected ? '#F0FDFA' : '#FFFFFF',
                          color: isSelected ? '#0F766E' : '#475569',
                          boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.15)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{cap.icon}</span>
                        <span>{cap.name}</span>
                        {isSelected && <CheckCircle2 size={13} color="#0D9488" />}
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
                          border: timingOffset === t ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                          background: timingOffset === t ? '#F0FDFA' : '#FFFFFF',
                          color: timingOffset === t ? '#0F766E' : '#64748B',
                        }}
                      >
                        {t === 'now' ? 'Just Now' : `-${t}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Portion Size
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
                          border: portion === p ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                          background: portion === p ? '#F0FDFA' : '#FFFFFF',
                          color: portion === p ? '#0F766E' : '#64748B',
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
                borderTop: '1px solid #F1F5F9',
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
                      ? '#E2E8F0'
                      : 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
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
                      : '0 8px 24px rgba(13, 148, 136, 0.32)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Utensils size={18} />
                <span>Log Meal & Track Postprandial Latency</span>
              </button>
            </div>
          </motion.div>
        </div>
      </FocusTrap>
    </AnimatePresence>
  );
};
export default QuickMealIntakeSheet;
