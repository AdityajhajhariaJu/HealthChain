import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Apple,
  Droplets,
  Zap,
  Check,
  Play,
  Pause,
  RotateCcw,
  Plus,
  ShieldCheck,
  Info
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { triggerHapticLight, triggerHapticMedium, triggerHapticSuccess } from '../../services/haptics';
import {
  awardPhytoPoints,
  awardHydrationPoints,
  awardMicroMovementPoints
} from '../../services/VitalityPointsEngine';

interface PhytoColor {
  id: string;
  name: string;
  compound: string;
  benefit: string;
  examples: string;
  hex: string;
  bgHex: string;
  borderHex: string;
  icon: string;
}

const PHYTO_COLORS: PhytoColor[] = [
  {
    id: 'red',
    name: 'Red Spectrum',
    compound: 'Lycopene & Anthocyanins',
    benefit: 'Cardiovascular & DNA Cell Defense',
    examples: 'Tomatoes, Berries, Pomegranates, Watermelon',
    hex: '#EF4444',
    bgHex: 'rgba(239, 68, 68, 0.15)',
    borderHex: 'rgba(239, 68, 68, 0.35)',
    icon: '🍅',
  },
  {
    id: 'orange_yellow',
    name: 'Orange / Yellow',
    compound: 'Beta-Carotene & Lutein',
    benefit: 'Retinal Health & Gut Mucosal Barrier',
    examples: 'Carrots, Sweet Potatoes, Citrus, Bell Peppers',
    hex: '#F59E0B',
    bgHex: 'rgba(245, 158, 11, 0.15)',
    borderHex: 'rgba(245, 158, 11, 0.35)',
    icon: '🥕',
  },
  {
    id: 'green',
    name: 'Green Spectrum',
    compound: 'Sulforaphane & Chlorophyll',
    benefit: 'Phase II Liver Detox & Vascular Elasticity',
    examples: 'Broccoli, Spinach, Matcha, Avocados, Kale',
    hex: '#10B981',
    bgHex: 'rgba(16, 185, 129, 0.15)',
    borderHex: 'rgba(16, 185, 129, 0.35)',
    icon: '🥦',
  },
  {
    id: 'purple_blue',
    name: 'Purple / Blue',
    compound: 'Resveratrol & Pterostilbene',
    benefit: 'Cerebral Micro-Circulation & Longevity Genes',
    examples: 'Blueberries, Blackberries, Eggplant, Purple Cabbage',
    hex: '#8B5CF6',
    bgHex: 'rgba(139, 92, 246, 0.15)',
    borderHex: 'rgba(139, 92, 246, 0.35)',
    icon: '🫐',
  },
  {
    id: 'white_tan',
    name: 'White / Tan',
    compound: 'Allicin & Beta-Glucans',
    benefit: 'Microbiome SCFA Synthesis & NK Immune Cells',
    examples: 'Garlic, Onions, Mushrooms, Oats, Ginger',
    hex: '#E2E8F0',
    bgHex: 'rgba(226, 232, 240, 0.15)',
    borderHex: 'rgba(226, 232, 240, 0.35)',
    icon: '🧄',
  },
];

const MOVEMENT_STEPS = [
  {
    title: 'Soleus Muscle Pushups',
    duration: 30,
    subtitle: 'Seated or standing heel lifts that activate local oxidative glucose metabolism without fatigue.',
    badge: 'Glucose Sink',
    color: '#10B981',
  },
  {
    title: 'Thoracic Wall Angel & Chest Opener',
    duration: 30,
    subtitle: 'Reverses forward-head screen posture, opening chest fascia and expanding thoracic mobility.',
    badge: 'Spine Alignment',
    color: '#06B6D4',
  },
  {
    title: 'Diaphragmatic 3D Rib Expansion',
    duration: 30,
    subtitle: 'Deep lower-rib breathing that mobilizes the thoracolumbar junction and lowers sympathetic tone.',
    badge: 'Autonomic Reset',
    color: '#8B5CF6',
  },
];

function getLocalDateKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function LongevityBioStackCard() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'rainbow' | 'hydration' | 'movement'>('rainbow');
  const todayStr = getLocalDateKey();
  const isoStr = new Date().toISOString().split('T')[0];

  // Storage Keys
  const phytoKey = `hc_phyto_${todayStr}`;
  const hydrationKey = `hc_hydration_${todayStr}`;
  const movementKey = `hc_movement_${todayStr}`;

  // State: Rainbow Tracker
  const [selectedColors, setSelectedColors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(phytoKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [phytoRewardClaimed, setPhytoRewardClaimed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`${phytoKey}_claimed`) === 'true';
    } catch {
      return false;
    }
  });

  // State: Hydration Matrix
  const [waterMl, setWaterMl] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(hydrationKey);
      return saved ? parseInt(saved, 10) : 500;
    } catch {
      return 500;
    }
  });
  const [hydrationRewardClaimed, setHydrationRewardClaimed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`${hydrationKey}_claimed`) === 'true';
    } catch {
      return false;
    }
  });

  // State: Movement Timer
  const [movementStepIndex, setMovementStepIndex] = useState(0);
  const [movementTimeLeft, setMovementTimeLeft] = useState(30);
  const [isMovementActive, setIsMovementActive] = useState(false);
  const [movementDone, setMovementDone] = useState<boolean>(() => {
    try {
      return localStorage.getItem(movementKey) === 'true';
    } catch {
      return false;
    }
  });

  const movementTimerRef = useRef<any>(null);

  // Rainbow toggle handler
  const handleToggleColor = (id: string) => {
    triggerHapticLight();
    const updated = selectedColors.includes(id)
      ? selectedColors.filter((c) => c !== id)
      : [...selectedColors, id];

    setSelectedColors(updated);
    try {
      localStorage.setItem(phytoKey, JSON.stringify(updated));
    } catch {}

    if (updated.length >= 3 && !phytoRewardClaimed) {
      setPhytoRewardClaimed(true);
      try {
        localStorage.setItem(`${phytoKey}_claimed`, 'true');
      } catch {}
      awardPhytoPoints();
      triggerHapticSuccess();
    }
  };

  // Hydration adder
  const handleAddWater = (amount: number) => {
    triggerHapticMedium();
    const newTotal = Math.min(4000, waterMl + amount);
    setWaterMl(newTotal);
    try {
      localStorage.setItem(hydrationKey, newTotal.toString());
    } catch {}

    if (newTotal >= 2000 && !hydrationRewardClaimed) {
      setHydrationRewardClaimed(true);
      try {
        localStorage.setItem(`${hydrationKey}_claimed`, 'true');
      } catch {}
      awardHydrationPoints();
      triggerHapticSuccess();
    }
  };

  const handleResetWater = () => {
    triggerHapticLight();
    setWaterMl(0);
    try {
      localStorage.setItem(hydrationKey, '0');
    } catch {}
  };

  // Movement timer interval
  useEffect(() => {
    if (isMovementActive) {
      movementTimerRef.current = setInterval(() => {
        setMovementTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else if (movementTimerRef.current) {
      clearInterval(movementTimerRef.current);
    }

    return () => {
      if (movementTimerRef.current) clearInterval(movementTimerRef.current);
    };
  }, [isMovementActive]);

  // Handle step transition and completion cleanly
  useEffect(() => {
    if (isMovementActive && movementTimeLeft === 0) {
      triggerHapticMedium();
      if (movementStepIndex < MOVEMENT_STEPS.length - 1) {
        const nextStep = movementStepIndex + 1;
        setMovementStepIndex(nextStep);
        setMovementTimeLeft(MOVEMENT_STEPS[nextStep].duration);
      } else {
        setIsMovementActive(false);
        setMovementDone(true);
        try {
          localStorage.setItem(movementKey, 'true');
        } catch {}
        awardMicroMovementPoints();
        triggerHapticSuccess();
      }
    }
  }, [movementTimeLeft, isMovementActive, movementStepIndex, movementKey]);

  const toggleMovementTimer = () => {
    triggerHapticLight();
    if (movementDone) {
      // Replay
      setMovementDone(false);
      setMovementStepIndex(0);
      setMovementTimeLeft(MOVEMENT_STEPS[0].duration);
      setIsMovementActive(true);
    } else {
      setIsMovementActive(!isMovementActive);
    }
  };

  const resetMovementTimer = () => {
    triggerHapticLight();
    setIsMovementActive(false);
    setMovementStepIndex(0);
    setMovementTimeLeft(MOVEMENT_STEPS[0].duration);
  };

  const targetMl = 2500;
  const hydrationPercent = Math.min(100, Math.round((waterMl / targetMl) * 100));

  return (
    <div
      style={{
        borderRadius: isMobile ? '20px' : '24px',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 12px 35px -6px rgba(15, 23, 42, 0.25)',
        padding: isMobile ? '18px 16px' : '24px 28px',
        color: '#FFFFFF',
        marginBottom: '28px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '-30px',
          left: '-30px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.18) 0%, rgba(14, 165, 233, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '12px' : '16px',
          marginBottom: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
              color: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            <Zap size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Longevity Bio-Stack
              </span>
              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#38BDF8' }} />
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Cellular Optimization</span>
            </div>
            <h3 style={{ margin: '2px 0 0', fontSize: isMobile ? '16px' : '18px', fontWeight: 700, letterSpacing: '-0.2px' }}>
              Daily Metabolic & Cellular Defense
            </h3>
          </div>
        </div>

        {/* Pill Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            width: isMobile ? '100%' : 'auto',
            justifyContent: isMobile ? 'space-between' : 'flex-start',
            gap: '4px',
          }}
        >
          <button
            onClick={() => {
              triggerHapticLight();
              setActiveTab('rainbow');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: isMobile ? '7px 10px' : '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'rainbow' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'rainbow' ? '#38BDF8' : '#94A3B8',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              flex: isMobile ? 1 : 'none',
              transition: 'all 0.15s ease',
              borderBottom: activeTab === 'rainbow' ? '2px solid #38BDF8' : '2px solid transparent',
            }}
          >
            <Apple size={14} />
            <span>Rainbow Diet</span>
          </button>

          <button
            onClick={() => {
              triggerHapticLight();
              setActiveTab('hydration');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: isMobile ? '7px 10px' : '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'hydration' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'hydration' ? '#38BDF8' : '#94A3B8',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              flex: isMobile ? 1 : 'none',
              transition: 'all 0.15s ease',
              borderBottom: activeTab === 'hydration' ? '2px solid #38BDF8' : '2px solid transparent',
            }}
          >
            <Droplets size={14} />
            <span>Hydration Matrix</span>
          </button>

          <button
            onClick={() => {
              triggerHapticLight();
              setActiveTab('movement');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: isMobile ? '7px 10px' : '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'movement' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'movement' ? '#38BDF8' : '#94A3B8',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              flex: isMobile ? 1 : 'none',
              transition: 'all 0.15s ease',
              borderBottom: activeTab === 'movement' ? '2px solid #38BDF8' : '2px solid transparent',
            }}
          >
            <Zap size={14} />
            <span>90s Posture Flow</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT AREA */}
      <AnimatePresence mode="wait">
        {/* 1. RAINBOW DIET / PHYTONUTRIENT MATRIX */}
        {activeTab === 'rainbow' && (
          <motion.div
            key="rainbow"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                padding: isMobile ? '14px' : '18px 20px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#F1F5F9' }}>
                    Phytonutrient Cellular Shield
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                    Tap the bioactive plant pigment colors you consumed today. Log 3+ for <strong style={{ color: '#38BDF8' }}>+2 PTS</strong>.
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: selectedColors.length >= 3 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                    border: selectedColors.length >= 3 ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <ShieldCheck size={14} color={selectedColors.length >= 3 ? '#10B981' : '#94A3B8'} />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: selectedColors.length >= 3 ? '#34D399' : '#CBD5E1',
                    }}
                  >
                    {selectedColors.length} / 5 Colors · {selectedColors.length * 20}% Shield
                  </span>
                </div>
              </div>

              {/* 5 Color Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)',
                  gap: '8px',
                }}
              >
                {PHYTO_COLORS.map((c) => {
                  const isSelected = selectedColors.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleToggleColor(c.id)}
                      style={{
                        background: isSelected ? c.bgHex : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? `1.5px solid ${c.hex}` : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '18px' }}>{c.icon}</span>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: isSelected ? c.hex : 'rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                          }}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#FFFFFF' : '#E2E8F0' }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: '10px', color: isSelected ? c.hex : '#94A3B8', fontWeight: 600, marginTop: '2px' }}>
                          {c.compound}
                        </div>
                      </div>

                      <div style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.3 }}>
                        {c.benefit}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Reward Callout */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                background: 'rgba(56, 189, 248, 0.08)',
                borderRadius: '12px',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={15} color="#38BDF8" />
                <span style={{ color: '#E2E8F0' }}>
                  {selectedColors.length >= 3 ? (
                    <strong style={{ color: '#34D399' }}>✓ Cellular Shield Activated! +2 Vitality PTS Claimed Today.</strong>
                  ) : (
                    <span>Select at least 3 distinct plant colors to activate daily polyphenol defense.</span>
                  )}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. CELLULAR HYDRATION & MINERAL MATRIX */}
        {activeTab === 'hydration' && (
          <motion.div
            key="hydration"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                padding: isMobile ? '16px' : '20px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: '16px',
                  
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#F1F5F9' }}>
                      Cellular Osmosis & Fluid Target
                    </h4>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: waterMl >= 2000 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                        color: waterMl >= 2000 ? '#34D399' : '#38BDF8',
                        fontWeight: 700,
                      }}
                    >
                      {waterMl >= 2000 ? 'Optimal Osmosis 💧' : 'Hydrating'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                    Optimal intracellular hydration supports renal filtration, CSF brain fluid, and metabolic efficiency.
                  </p>
                </div>

                <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#38BDF8', letterSpacing: '-0.5px' }}>
                    {waterMl} <span style={{ fontSize: '14px', color: '#94A3B8', fontWeight: 600 }}>/ {targetMl} ml</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    {Math.round(waterMl / 250)} Glasses Logged ({hydrationPercent}%)
                  </div>
                </div>
              </div>

              {/* Fluid Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '10px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                  
                  position: 'relative',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${hydrationPercent}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)',
                    borderRadius: '999px',
                    boxShadow: '0 0 12px rgba(56, 189, 248, 0.6)',
                  }}
                />
              </div>

              {/* Quick Log Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={() => handleAddWater(250)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38BDF8',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={15} /> +250 ml (Glass)
                </button>

                <button
                  onClick={() => handleAddWater(500)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(56, 189, 248, 0.18)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38BDF8',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={15} /> +500 ml (Bottle)
                </button>

                <button
                  onClick={handleResetWater}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#64748B',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  <RotateCcw size={13} /> Reset
                </button>
              </div>
            </div>

            {/* Mineral Tip */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '12px',
                color: '#94A3B8',
              }}
            >
              <span>
                💡 <strong style={{ color: '#E2E8F0' }}>Cellular Mineral Tip:</strong> Add a pinch of Himalayan salt or lemon to optimize sodium-potassium ATP pumps. Reaching 2000 ml awards <strong style={{ color: '#38BDF8' }}>+2 PTS</strong>.
              </span>
              {waterMl >= 2000 && <span style={{ color: '#34D399', fontWeight: 800 }}>✓ Rewarded</span>}
            </div>
          </motion.div>
        )}

        {/* 3. 90s POSTURE & METABOLIC FLOW */}
        {activeTab === 'movement' && (
          <motion.div
            key="movement"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                padding: isMobile ? '16px' : '20px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: '16px',
                  
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: MOVEMENT_STEPS[movementStepIndex].color,
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      Step {movementStepIndex + 1} of 3 · {MOVEMENT_STEPS[movementStepIndex].badge}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>90s Circadian Micro-Break</span>
                  </div>
                  <h4 style={{ margin: '6px 0 2px', fontSize: '16px', fontWeight: 700, color: '#F1F5F9' }}>
                    {MOVEMENT_STEPS[movementStepIndex].title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', maxWidth: '520px' }}>
                    {MOVEMENT_STEPS[movementStepIndex].subtitle}
                  </p>
                </div>

                {/* Circular Timer & Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: `2px solid ${MOVEMENT_STEPS[movementStepIndex].color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      fontWeight: 900,
                      color: '#FFFFFF',
                      boxShadow: isMovementActive ? `0 0 18px ${MOVEMENT_STEPS[movementStepIndex].color}40` : 'none',
                    }}
                  >
                    {movementDone ? <Check size={26} color="#10B981" /> : `${movementTimeLeft}s`}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button
                      onClick={toggleMovementTimer}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: movementDone
                          ? 'rgba(16, 185, 129, 0.2)'
                          : isMovementActive
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                        border: movementDone ? '1px solid #10B981' : 'none',
                        color: '#FFFFFF',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {movementDone ? (
                        <>
                          <RotateCcw size={14} /> Replay Flow
                        </>
                      ) : isMovementActive ? (
                        <>
                          <Pause size={14} /> Pause
                        </>
                      ) : (
                        <>
                          <Play size={14} /> Start 90s Flow
                        </>
                      )}
                    </button>

                    {isMovementActive && (
                      <button
                        onClick={resetMovementTimer}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748B',
                          fontSize: '11px',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        Reset Flow
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Steps Indicators */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                {MOVEMENT_STEPS.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background:
                        idx < movementStepIndex || movementDone
                          ? '#10B981'
                          : idx === movementStepIndex
                          ? step.color
                          : 'rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Bottom Reward Callout */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '12px',
                color: '#94A3B8',
              }}
            >
              <span>
                ⚡ Complete all 3 micro-drills (90 seconds total) to earn <strong style={{ color: '#38BDF8' }}>+2 PTS</strong> daily.
              </span>
              {movementDone && <span style={{ color: '#34D399', fontWeight: 800 }}>✓ +2 PTS Claimed</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
