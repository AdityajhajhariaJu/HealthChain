import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Flame, Gift, Brain, HelpCircle, CheckCircle2, XCircle, Check, X, ShieldAlert } from 'lucide-react';
import { awardTriviaPoints, awardMysteryDrop, awardMythBusterPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticWarning } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';

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

interface MythBusterItem {
  id: number;
  statement: string;
  isFact: boolean;
  explanation: string;
  category: string;
}

const MYTH_BANK: MythBusterItem[] = [
  {
    id: 1,
    category: 'Joint Health',
    statement: 'Cracking your knuckles causes long-term osteoarthritis in your fingers.',
    isFact: false,
    explanation: 'Extensive clinical research demonstrates knuckle popping simply releases harmless dissolved nitrogen gas bubbles in the synovial fluid.',
  },
  {
    id: 2,
    category: 'Thermogenesis',
    statement: 'Mild cold exposure activates Brown Adipose Tissue (BAT) to burn stored triglycerides for heat.',
    isFact: true,
    explanation: 'Brown fat is rich in mitochondria expressing UCP-1, converting calories directly into heat through non-shivering thermogenesis.',
  },
  {
    id: 3,
    category: 'Brain Health',
    statement: 'Consistent aerobic exercise triggers BDNF release and stimulates hippocampal neurogenesis.',
    isFact: true,
    explanation: 'Aerobic exertion releases Brain-Derived Neurotrophic Factor (BDNF), enhancing synapse density and memory resilience.',
  },
  {
    id: 4,
    category: 'Digestion & Metabolism',
    statement: 'Drinking water with meals dilutes stomach acid to dangerous levels and halts digestion.',
    isFact: false,
    explanation: 'The stomach produces acid adaptively and water actually aids smooth peristalsis and bolus transit down the GI tract.',
  },
  {
    id: 5,
    category: 'Detoxification',
    statement: 'Commercial juice cleanses are essential to flush accumulated toxins from the bloodstream.',
    isFact: false,
    explanation: 'Your liver and kidneys perform 24/7 detoxification continuously; juice cleanses often lack the amino acids needed for Phase II liver detox.',
  },
];

export default function VitalityPlayground() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'mystery' | 'trivia' | 'myth'>('mystery');
  const todayStr = new Date().toISOString().split('T')[0];

  // Storage keys
  const mysteryKey = `hc_mystery_${todayStr}`;
  const triviaKey = `hc_trivia_${todayStr}`;
  const mythKey = `hc_myth_${todayStr}`;

  // Mystery Drop State
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

  // MythBuster State
  const [mythAnswered, setMythAnswered] = useState<boolean>(() => {
    try {
      return localStorage.getItem(mythKey) === 'true';
    } catch {
      return false;
    }
  });
  const [selectedMythChoice, setSelectedMythChoice] = useState<boolean | null>(null);

  // Day indexing
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const currentTrivia = TRIVIA_BANK[dayOfYear % TRIVIA_BANK.length];
  const currentMyth = MYTH_BANK[dayOfYear % MYTH_BANK.length];

  const handleRevealMystery = () => {
    if (mysteryClaimed !== null || isRevealingMystery) return;
    triggerHapticLight();
    setIsRevealingMystery(true);

    setTimeout(() => {
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

  const handleMythChoice = (choice: boolean) => {
    if (mythAnswered) return;
    setSelectedMythChoice(choice);
    setMythAnswered(true);
    try {
      localStorage.setItem(mythKey, 'true');
    } catch {}

    if (choice === currentMyth.isFact) {
      awardMythBusterPoints();
      triggerHapticSuccess();
    } else {
      triggerHapticWarning();
    }
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
      {/* Ambient glow */}
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
              Longevity Micro-Challenges & Quizzes
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
              setActiveTab('myth');
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
              background: activeTab === 'myth' ? '#10B981' : 'transparent',
              color: activeTab === 'myth' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.15s ease',
              flex: isMobile ? 1 : 'unset',
              justifyContent: 'center',
            }}
          >
            <HelpCircle size={14} />
            <span>Myth vs Fact</span>
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

              {/* Interactive Chest */}
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

          {/* TAB 3: MYTH VS FACT (CLINICAL MYTHBUSTER) */}
          {activeTab === 'myth' && (
            <motion.div
              key="tab-myth"
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
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#F472B6', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <HelpCircle size={13} color="#F472B6" /> {currentMyth.category} · Myth vs Fact
                </span>
                <span style={{ background: 'rgba(244, 114, 182, 0.15)', color: '#FBCFE8', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>
                  +2 PTS Reward
                </span>
              </div>

              <h4 style={{ margin: '0 0 16px', fontSize: isMobile ? '14.5px' : '16px', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.4 }}>
                "{currentMyth.statement}"
              </h4>

              {/* 2 Big Action Buttons: Myth vs Fact */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <button
                  onClick={() => handleMythChoice(false)}
                  disabled={mythAnswered}
                  style={{
                    padding: '12px',
                    borderRadius: '14px',
                    background: mythAnswered
                      ? !currentMyth.isFact
                        ? 'rgba(16, 185, 129, 0.25)'
                        : selectedMythChoice === false
                        ? 'rgba(239, 68, 68, 0.25)'
                        : 'rgba(255, 255, 255, 0.04)'
                      : 'rgba(239, 68, 68, 0.15)',
                    border: mythAnswered
                      ? !currentMyth.isFact
                        ? '1.5px solid #10B981'
                        : selectedMythChoice === false
                        ? '1.5px solid #EF4444'
                        : '1px solid rgba(255, 255, 255, 0.08)'
                      : '1.5px solid rgba(239, 68, 68, 0.3)',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: mythAnswered ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <X size={16} color="#F87171" strokeWidth={3} />
                  <span>❌ It's a Myth</span>
                </button>

                <button
                  onClick={() => handleMythChoice(true)}
                  disabled={mythAnswered}
                  style={{
                    padding: '12px',
                    borderRadius: '14px',
                    background: mythAnswered
                      ? currentMyth.isFact
                        ? 'rgba(16, 185, 129, 0.25)'
                        : selectedMythChoice === true
                        ? 'rgba(239, 68, 68, 0.25)'
                        : 'rgba(255, 255, 255, 0.04)'
                      : 'rgba(16, 185, 129, 0.15)',
                    border: mythAnswered
                      ? currentMyth.isFact
                        ? '1.5px solid #10B981'
                        : selectedMythChoice === true
                        ? '1.5px solid #EF4444'
                        : '1px solid rgba(255, 255, 255, 0.08)'
                      : '1.5px solid rgba(16, 185, 129, 0.3)',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: mythAnswered ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Check size={16} color="#34D399" strokeWidth={3} />
                  <span>✔️ It's a Fact</span>
                </button>
              </div>

              {/* Explanation Note */}
              {mythAnswered && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    fontSize: '12.5px',
                    color: '#E2E8F0',
                    lineHeight: 1.45,
                  }}
                >
                  <strong style={{ color: currentMyth.isFact ? '#34D399' : '#F87171' }}>
                    {currentMyth.isFact ? '✔️ VERIFIED CLINICAL FACT: ' : '❌ DEBUNKED MYTH: '}
                  </strong>
                  {currentMyth.explanation}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
