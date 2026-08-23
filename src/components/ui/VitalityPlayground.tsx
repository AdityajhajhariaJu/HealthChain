import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Flame, Zap, Play, RotateCcw, CheckCircle2, XCircle, Gift, Brain, Heart, ChevronRight, Award, Compass, RefreshCw } from 'lucide-react';
import { awardMindfulPoints, awardTriviaPoints, awardMysteryDrop, getVitalityState } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticWarning } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getProfile, saveProfile } from '../../services/ProfileEngine';

interface TriviaQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  category: string;
}

const TRIVIA_BANK: TriviaQuestion[] = [
  {
    id: 1,
    category: 'Circadian Biology',
    question: 'Which daily habit provides the strongest clinical signal to reset your circadian clock and optimize deep sleep?',
    options: [
      'Morning sunlight exposure within 30-45 minutes of waking',
      'Drinking iced water immediately upon rising',
      'Taking melatonin at 5:00 PM',
      'Sleeping in a warm 26°C room',
    ],
    correct: 0,
    explanation: 'Morning photons stimulate retinal ganglion cells, synchronizing cortisol peak and setting the nocturnal melatonin timer ~14 hours later.',
  },
  {
    id: 2,
    category: 'Longevity Science',
    question: 'What type of physical activity is most strongly correlated with mitochondrial density and cellular longevity?',
    options: [
      'Heavy powerlifting 1RM sets',
      'Zone 2 steady-state aerobic conditioning (conversational pace)',
      'High-sugar energy drinks before sprinting',
      'Static stretching only',
    ],
    correct: 1,
    explanation: 'Zone 2 training maximizes mitochondrial biogenesis, lactate clearance, and fat oxidation efficiency without systemic overtraining.',
  },
  {
    id: 3,
    category: 'Metabolic Health',
    question: 'Consuming which macronutrient FIRST in a meal significantly reduces post-prandial glucose and insulin spikes?',
    options: [
      'Fibers and Vegetables (e.g., leafy greens/salads)',
      'Refined Carbohydrates (e.g., white rice/bread)',
      'Sugary Desserts',
      'Carbonated sweet drinks',
    ],
    correct: 0,
    explanation: 'Fiber creates a viscous mesh in the small intestine that slows carbohydrate absorption, blunting glucose and insulin spikes by up to 35%.',
  },
  {
    id: 4,
    category: 'Cardiovascular Health',
    question: 'What is Heart Rate Variability (HRV) primarily an indicator of in clinical medicine?',
    options: [
      'Autonomic Nervous System balance & systemic recovery capacity',
      'How fast your heart can pump at max effort',
      'Blood pressure cuff calibration accuracy',
      'Total cholesterol levels in the bloodstream',
    ],
    correct: 0,
    explanation: 'Higher HRV reflects robust parasympathetic (vagal) tone and adaptability to physical and psychological stressors.',
  },
  {
    id: 5,
    category: 'Cognitive Health',
    question: 'Which stage of sleep is primarily responsible for brain glymphatic clearance (clearing amyloid waste) and memory consolidation?',
    options: [
      'Deep Slow-Wave Sleep (Stage N3)',
      'Light Sleep (Stage N1)',
      'Late afternoon nap drowsy phase',
      'Hypnagogic transition',
    ],
    correct: 0,
    explanation: 'During Deep Slow-Wave Sleep, interstitial space increases by ~60%, allowing cerebrospinal fluid to flush metabolic toxins and consolidate memory.',
  },
];

export default function VitalityPlayground() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'mystery' | 'trivia' | 'breath'>('mystery');
  const todayStr = new Date().toISOString().split('T')[0];

  // Storage keys
  const mysteryKey = `hc_mystery_${todayStr}`;
  const triviaKey = `hc_trivia_${todayStr}`;
  const breathKey = `hc_breath_${todayStr}`;

  // State
  const [mysteryClaimed, setMysteryClaimed] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(mysteryKey);
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });
  const [isRevealingMystery, setIsRevealingMystery] = useState(false);

  // Trivia State
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [triviaSolved, setTriviaSolved] = useState<boolean>(() => {
    try {
      return localStorage.getItem(triviaKey) === 'true';
    } catch {
      return false;
    }
  });
  const [triviaSubmitted, setTriviaSubmitted] = useState<boolean>(false);

  // Breathwork State
  const [breathActive, setBreathActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');
  const [cycleCount, setCycleCount] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(4);
  const [breathCompletedToday, setBreathCompletedToday] = useState<boolean>(() => {
    try {
      return localStorage.getItem(breathKey) === 'true';
    } catch {
      return false;
    }
  });

  // Pick question based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const currentTrivia = TRIVIA_BANK[dayOfYear % TRIVIA_BANK.length];

  // Breathwork timer loop
  useEffect(() => {
    if (!breathActive) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Switch phase
          if (breathPhase === 'Inhale') {
            setBreathPhase('Hold');
            triggerHapticLight();
            return 4;
          } else if (breathPhase === 'Hold') {
            setBreathPhase('Exhale');
            triggerHapticLight();
            return 4;
          } else if (breathPhase === 'Exhale') {
            setBreathPhase('Rest');
            triggerHapticLight();
            return 4;
          } else {
            // Completed 1 full cycle
            const nextCycle = cycleCount + 1;
            setCycleCount(nextCycle);
            if (nextCycle >= 3) {
              // Finish 60s session!
              setBreathActive(false);
              setBreathCompletedToday(true);
              try {
                localStorage.setItem(breathKey, 'true');
              } catch {}
              awardMindfulPoints();
              triggerHapticSuccess();
              return 4;
            } else {
              setBreathPhase('Inhale');
              triggerHapticLight();
              return 4;
            }
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [breathActive, breathPhase, cycleCount]);

  const handleRevealMystery = () => {
    if (mysteryClaimed !== null || isRevealingMystery) return;
    triggerHapticLight();
    setIsRevealingMystery(true);

    setTimeout(() => {
      // Pick random drop (2 to 5 points)
      const possibleDrops = [2, 3, 4, 5, 3, 4];
      const drop = possibleDrops[Math.floor(Math.random() * possibleDrops.length)];
      setMysteryClaimed(drop);
      setIsRevealingMystery(false);
      try {
        localStorage.setItem(mysteryKey, drop.toString());
      } catch {}
      awardMysteryDrop(drop);
      triggerHapticSuccess();
    }, 900);
  };

  const handleTriviaAnswer = (index: number) => {
    if (triviaSubmitted || triviaSolved) return;
    setSelectedOption(index);
    setTriviaSubmitted(true);

    if (index === currentTrivia.correct) {
      setTriviaSolved(true);
      try {
        localStorage.setItem(triviaKey, 'true');
      } catch {}
      awardTriviaPoints();
      triggerHapticSuccess();
    } else {
      triggerHapticWarning();
    }
  };

  const startBreathwork = () => {
    triggerHapticLight();
    setBreathPhase('Inhale');
    setCycleCount(0);
    setSecondsRemaining(4);
    setBreathActive(true);
  };

  const resetBreathwork = () => {
    triggerHapticLight();
    setBreathActive(false);
    setBreathPhase('Inhale');
    setCycleCount(0);
    setSecondsRemaining(4);
  };

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
      {/* Background ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0) 70%)',
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
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              color: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Daily Vitality Arcade
              </span>
              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#34D399' }} />
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Play & Earn Points</span>
            </div>
            <h3 style={{ margin: '2px 0 0', fontSize: isMobile ? '16px' : '18px', fontWeight: 700, letterSpacing: '-0.2px' }}>
              Wellness Habits & Instant Boosters
            </h3>
          </div>
        </div>

        {/* Pill Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.06)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            width: isMobile ? '100%' : 'auto',
            justifyContent: isMobile ? 'space-between' : 'flex-end',
          }}
        >
          <button
            onClick={() => {
              triggerHapticLight();
              setActiveTab('mystery');
            }}
            style={{
              padding: isMobile ? '6px 10px' : '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'mystery' ? '#10B981' : 'transparent',
              color: activeTab === 'mystery' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.15s ease',
              flex: isMobile ? 1 : 'unset',
              justifyContent: 'center',
            }}
          >
            <Gift size={14} />
            <span>Mystery Drop</span>
          </button>

          <button
            onClick={() => {
              triggerHapticLight();
              setActiveTab('trivia');
            }}
            style={{
              padding: isMobile ? '6px 10px' : '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'trivia' ? '#10B981' : 'transparent',
              color: activeTab === 'trivia' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.15s ease',
              flex: isMobile ? 1 : 'unset',
              justifyContent: 'center',
            }}
          >
            <Brain size={14} />
            <span>Brain Byte</span>
          </button>

          <button
            onClick={() => {
              triggerHapticLight();
              setActiveTab('breath');
            }}
            style={{
              padding: isMobile ? '6px 10px' : '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'breath' ? '#10B981' : 'transparent',
              color: activeTab === 'breath' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.15s ease',
              flex: isMobile ? 1 : 'unset',
              justifyContent: 'center',
            }}
          >
            <Heart size={14} />
            <span>HRV Reset</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div style={{ minHeight: '160px' }}>
        <AnimatePresence mode="wait">
          {/* TAB 1: MYSTERY DROP */}
          {activeTab === 'mystery' && (
            <motion.div
              key="tab-mystery"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '18px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: isMobile ? '18px 16px' : '22px 24px',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '18px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Flame size={13} color="#F59E0B" /> 24-Hour Lucky Drop
                  </span>
                  <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>
                    +1 to +5 PTS
                  </span>
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: '16.5px', fontWeight: 800, color: '#FFFFFF' }}>
                  {mysteryClaimed !== null ? '✨ Today’s Mystery Drop Unlocked!' : 'Tap the Golden Vault to Unlock Today’s Reward'}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', lineHeight: 1.4 }}>
                  {mysteryClaimed !== null
                    ? `You received +${mysteryClaimed} Vitality Points! Come back tomorrow after midnight for your next drop.`
                    : 'Every day brings a new surprise vitality spark or multiplier boost. Test your daily luck!'}
                </p>
              </div>

              {/* Interactive Card/Chest */}
              <button
                onClick={handleRevealMystery}
                disabled={mysteryClaimed !== null || isRevealingMystery}
                style={{
                  minWidth: isMobile ? '100%' : '170px',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: mysteryClaimed !== null
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)'
                    : 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)',
                  border: mysteryClaimed !== null ? '1px solid #10B981' : '1px solid #FDE68A',
                  boxShadow: mysteryClaimed !== null
                    ? '0 4px 16px rgba(16, 185, 129, 0.15)'
                    : '0 8px 25px rgba(245, 158, 11, 0.35)',
                  cursor: mysteryClaimed !== null ? 'default' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  color: '#FFFFFF',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                }}
              >
                {isRevealingMystery ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    style={{ fontSize: '28px' }}
                  >
                    ✨
                  </motion.div>
                ) : mysteryClaimed !== null ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={22} color="#34D399" />
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#34D399' }}>+{mysteryClaimed} PTS</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#A7F3D0', fontWeight: 600 }}>Claimed Today</span>
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      style={{ fontSize: '26px' }}
                    >
                      🎁
                    </motion.div>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, letterSpacing: '0.2px' }}>
                      Tap to Reveal
                    </span>
                    <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                      Free Daily Grant
                    </span>
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* TAB 2: LONGEVITY BRAIN BYTE (TRIVIA) */}
          {activeTab === 'trivia' && (
            <motion.div
              key="tab-trivia"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '18px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: isMobile ? '16px' : '20px 24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Brain size={13} color="#38BDF8" /> {currentTrivia.category}
                </span>
                <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#7DD3FC', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>
                  +2 PTS Reward
                </span>
              </div>

              <h4 style={{ margin: '0 0 14px', fontSize: isMobile ? '14.5px' : '15.5px', fontWeight: 700, color: '#F1F5F9', lineHeight: 1.4 }}>
                {currentTrivia.question}
              </h4>

              {/* 4 Options Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {currentTrivia.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === currentTrivia.correct;
                  let bg = 'rgba(255, 255, 255, 0.06)';
                  let border = '1px solid rgba(255, 255, 255, 0.1)';
                  let textColor = '#CBD5E1';

                  if (triviaSubmitted || triviaSolved) {
                    if (isCorrect) {
                      bg = 'rgba(16, 185, 129, 0.2)';
                      border = '1px solid #10B981';
                      textColor = '#34D399';
                    } else if (isSelected && !isCorrect) {
                      bg = 'rgba(239, 68, 68, 0.2)';
                      border = '1px solid #EF4444';
                      textColor = '#F87171';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleTriviaAnswer(idx)}
                      disabled={triviaSubmitted || triviaSolved}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: bg,
                        border: border,
                        color: textColor,
                        fontSize: '12.5px',
                        fontWeight: 600,
                        textAlign: 'left',
                        cursor: (triviaSubmitted || triviaSolved) ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{option}</span>
                      {(triviaSubmitted || triviaSolved) && isCorrect && <CheckCircle2 size={15} color="#10B981" style={{ flexShrink: 0 }} />}
                      {(triviaSubmitted || triviaSolved) && isSelected && !isCorrect && <XCircle size={15} color="#EF4444" style={{ flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation note when solved */}
              {(triviaSubmitted || triviaSolved) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    fontSize: '12px',
                    color: '#D1FAE5',
                    lineHeight: 1.45,
                  }}
                >
                  <strong style={{ color: '#34D399' }}>💡 Clinical Takeaway: </strong>
                  {currentTrivia.explanation}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* TAB 3: 60S MINDFUL HRV RESET (BREATHWORK) */}
          {activeTab === 'breath' && (
            <motion.div
              key="tab-breath"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '18px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: isMobile ? '16px' : '20px 24px',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Heart size={13} color="#A78BFA" /> 4-4-4 Box Breathing
                  </span>
                  <span style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#DDD6FE', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>
                    +3 PTS
                  </span>
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: '16.5px', fontWeight: 800, color: '#FFFFFF' }}>
                  {breathCompletedToday ? '✨ 60s Breathwork Complete!' : '60-Second Vagal Nerve Calming Rhythm'}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', lineHeight: 1.4 }}>
                  {breathCompletedToday
                    ? 'Great job! You engaged parasympathetic recovery and collected +3 Vitality Points.'
                    : 'Follow the glowing rhythm for 3 cycles (1 minute) to boost HRV, lower acute cortisol, and earn points.'}
                </p>

                {/* Status / Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
                  {!breathActive ? (
                    <button
                      onClick={startBreathwork}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        background: '#10B981',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      <Play size={14} fill="#FFFFFF" /> {breathCompletedToday ? 'Repeat Practice' : 'Begin 60s Reset'}
                    </button>
                  ) : (
                    <button
                      onClick={resetBreathwork}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#CBD5E1',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <RotateCcw size={13} /> Stop / Reset
                    </button>
                  )}
                  {breathActive && (
                    <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>
                      Cycle {cycleCount + 1} of 3
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Animated Breathing Sphere */}
              <div
                style={{
                  width: '130px',
                  height: '130px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <motion.div
                  animate={{
                    scale: breathActive
                      ? breathPhase === 'Inhale'
                        ? 1.3
                        : breathPhase === 'Exhale'
                        ? 0.8
                        : breathPhase === 'Hold'
                        ? 1.3
                        : 0.8
                      : 1,
                  }}
                  transition={{ duration: 4, ease: 'easeInOut' }}
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    background: breathActive
                      ? breathPhase === 'Inhale'
                        ? 'radial-gradient(circle, #34D399 0%, #059669 80%)'
                        : breathPhase === 'Hold'
                        ? 'radial-gradient(circle, #60A5FA 0%, #2563EB 80%)'
                        : 'radial-gradient(circle, #A78BFA 0%, #7C3AED 80%)'
                      : 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, rgba(5, 150, 105, 0.15) 80%)',
                    boxShadow: breathActive
                      ? '0 0 35px rgba(52, 211, 153, 0.5)'
                      : '0 0 15px rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {breathActive ? breathPhase : 'Calm'}
                  </span>
                  {breathActive && (
                    <span style={{ fontSize: '16px', fontWeight: 900, marginTop: '2px' }}>
                      {secondsRemaining}s
                    </span>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
