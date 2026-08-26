import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Shield,
  Zap,
  GitBranch,
  Search,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Star,
  CheckCircle2,
  Sparkles,
  Heart,
  Brain,
  Microscope,
  ArrowUpRight,
  FileText,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { motion, useInView, animate, AnimatePresence } from 'framer-motion';
import { setActiveCase } from '../../services/CaseEngine';
import { useMDTStore } from '../../stores/useMDTStore';
import styles from './Landing.module.css';
import { getActiveSession } from '../../services/authSession';
import { supabase } from '../../services/supabaseClient';
import { trackPageView, trackButtonClick } from '../../services/analytics';
import { triggerHapticLight } from '../../services/haptics';

const SYMPTOM_PRESETS = [
  { label: '⚡ Chronic Fatigue', symptom: 'Unexplained chronic fatigue, unrefreshing sleep, and low afternoon energy', specialist: 'endo' },
  { label: '🤕 Daily Headache', symptom: 'Chronic daily throbbing headaches with light sensitivity and neck tightness', specialist: 'neuro' },
  { label: '🫀 Palpitations', symptom: 'Sudden resting heart racing, post-meal palpitations, and postural dizziness', specialist: 'cardio' },
  { label: '🧬 Brain Fog', symptom: 'Memory lapses, word-finding difficulty, and cognitive sluggishness after exertion', specialist: 'neuro' },
  { label: '🩺 Gut & Bloating', symptom: 'Chronic post-meal bloating, food sensitivities, and alternating bowel habits', specialist: 'gastro' },
  { label: '➕ Other Complex Cases', symptom: 'Complex overlapping multi-system symptoms across multiple organs', specialist: 'gp' },
];

const CONSENSUS_DIALOGUE = [
  {
    role: 'Cardiologist',
    icon: '🩺',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    finding: 'Resting tachycardia noted despite normal ECG.',
  },
  {
    role: 'Neurologist',
    icon: '🧠',
    color: '#A78BFA',
    bg: 'rgba(139, 92, 246, 0.15)',
    finding: 'Possible autonomic / vagal nerve involvement.',
  },
  {
    role: 'Endocrinologist',
    icon: '🔬',
    color: '#60A5FA',
    bg: 'rgba(59, 130, 246, 0.15)',
    finding: 'Check ferritin and cortisol before next doctor visit.',
  },
];

const LIVE_NETWORK_UPDATES = [
  'Debating Cases in Real Time',
  '1,420+ Clinical Inquiries Analyzed Today',
  'Resolving Complex & Unexplained Symptoms',
  'Grounded in 35M+ PubMed & NIH Trials',
  'Instant Intake • Zero Medical Jargon',
];

const CASE_TABS = [
  { id: 'all', label: 'All Cases (1,420)', icon: '🌐' },
  { id: 'endo', label: '⚡ Fatigue & Hormones', icon: '🔬' },
  { id: 'neuro', label: '🧠 Migraine & Brain Fog', icon: '🤕' },
  { id: 'cardio', label: '🫀 Palpitations & POTS', icon: '💓' },
  { id: 'gastro', label: '🩺 Gut & SIBO', icon: '🧬' },
  { id: 'immuno', label: '🛡️ Mast Cell / MCAS', icon: '🌿' },
];

const RANKED_CASES = [
  {
    id: 'case-1',
    rank: '#1',
    category: 'endo',
    title: 'Subclinical Ferritin Depletion & Post-Viral Autonomic Fatigue',
    icon: '🔬',
    specialistTag: 'Endocrinology & Neurology',
    score: '96% Match',
    desc: 'Correlated standard "normal" iron (65 μg/dL) with depleted ferritin (18 ng/mL) and blunted morning cortisol curve—explaining severe afternoon brain fog.',
    meta: '#1 in Endocrinology · 2 days ago · 3,420 matched cases',
    symptom: 'Chronic fatigue, brain fog, and low ferritin symptoms',
    specId: 'endo',
  },
  {
    id: 'case-2',
    rank: '#2',
    category: 'neuro',
    title: 'Histamine-Mediated Neuro-Vascular Migraine with Morning Spikes',
    icon: '🧠',
    specialistTag: 'Neurology & Gastroenterology',
    score: '94% Match',
    desc: 'Identified gut-brain axis dysbiosis with histamine sensitivity triggering daily throbbing occipital pressure and morning vasomotor blood pressure spikes.',
    meta: '#1 in Neurology · 3 days ago · 2,890 matched cases',
    symptom: 'Daily throbbing headache and occipital pressure',
    specId: 'neuro',
  },
  {
    id: 'case-3',
    rank: '#3',
    category: 'cardio',
    title: 'Gastrocardiac (Roemheld) Post-Meal Palpitations & Vagal Irritation',
    icon: '🫀',
    specialistTag: 'Cardiology & Gastroenterology',
    score: '93% Match',
    desc: 'Traced sinus tachycardia and lightheadedness after meals to splanchnic blood pooling and diaphragmatic vagus nerve compression.',
    meta: '#1 in Cardiology · 4 days ago · 4,110 matched cases',
    symptom: 'Post-meal palpitations, dizziness, and rapid heart rate',
    specId: 'cardio',
  },
  {
    id: 'case-4',
    rank: '#4',
    category: 'immuno',
    title: 'Mast Cell Mediator Release & Postural Tachycardia Overlap',
    icon: '🛡️',
    specialistTag: 'Immunology & Cardiology',
    score: '91% Match',
    desc: 'Identified episodic facial flushing, dermographia, and postural heart rate spikes matching hyperadrenergic POTS / MCAS overlap profile.',
    meta: '#1 in Immunology · 5 days ago · 1,940 matched cases',
    symptom: 'Postural tachycardia, flushing, and mast cell triggers',
    specId: 'immuno',
  },
];

const SPECIALIST_TICKER = [
  { name: 'Cardiology', icon: '🫀', tag: 'Arrhythmia & POTS' },
  { name: 'Neurology', icon: '🧠', tag: 'Migraine & Vagus Tone' },
  { name: 'Endocrinology', icon: '🔬', tag: 'Thyroid & Adrenals' },
  { name: 'Immunology', icon: '🧬', tag: 'Autoimmune & MCAS' },
  { name: 'Gastroenterology', icon: '🧪', tag: 'Gut-Brain Axis & SIBO' },
  { name: 'Rheumatology', icon: '🦴', tag: 'Connective Tissue' },
  { name: 'Pulmonology', icon: '🫁', tag: 'Dyspnea & Airway' },
  { name: 'Hematology', icon: '🩸', tag: 'Ferritin & Clotting' },
  { name: 'Nephrology', icon: '⚕️', tag: 'Electrolytes & Renal' },
  { name: 'Infectious Disease', icon: '🦠', tag: 'Post-Viral Fatigue' },
  { name: 'Pharmacology', icon: '💊', tag: 'Drug-Nutrient Interplay' },
  { name: 'Functional Medicine', icon: '🥗', tag: 'Mitochondrial Health' },
];

const LATEST_ACTIVITIES = [
  { icon: '🧪', text: 'Iron Panel & Ferritin mapped for patient in Chicago', time: '1m ago', specId: 'endo', symptom: 'Iron panel and ferritin check' },
  { icon: '🧠', text: 'POTS Tilt Correlation for patient in London', time: '4m ago', specId: 'neuro', symptom: 'POTS tilt and autonomic correlation' },
  { icon: '🔬', text: 'Thyroid Free T3/T4 ratio analyzed', time: '16m ago', specId: 'endo', symptom: 'Thyroid panel Free T3/T4 analysis' },
  { icon: '🩺', text: 'Histamine elimination brief generated', time: '27m ago', specId: 'gastro', symptom: 'Histamine elimination protocol' },
  { icon: '🫀', text: 'Resting ECG & Holter cross-analyzed', time: '33m ago', specId: 'cardio', symptom: 'Holter monitor and resting ECG' },
];

const landingFaqs = [
  {
    question: "Is HealthChain360.ai a replacement for my doctor?",
    answer: "No. HealthChain360.ai is an AI-assisted health assessment and appointment-preparation tool. It helps you organize your history, spot questions and evidence gaps to discuss, and prepare for clinician visits. It does not diagnose, prescribe, or replace professional medical care."
  },
  {
    question: "How is my medical data secured?",
    answer: "You control your case information. Guest-mode information stays in your browser on that device; signed-in features sync securely to your encrypted cloud vault. We never sell your medical records."
  },
  {
    question: "How do the Deep Collaborative Specialists work?",
    answer: "The Deep Collaborative Specialists feature coordinates AI perspective modules (such as cardiology, neurology, endocrinology, and immunology) to organize your information, surface evidence gaps, and prepare prioritized discussion points for a qualified clinician."
  },
  {
    question: "Are the AI agents trained on real medical literature?",
    answer: "Yes. HealthChain360.ai grounds its reasoning in peer-reviewed clinical guidelines (PubMed, NIH, OMIM, ClinicalTrials.gov). AI output is synthesized for patient clarity and must always be reviewed with your personal physician."
  }
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeTickerIndex, setActiveTickerIndex] = useState(0);
  const [selectedCaseFilter, setSelectedCaseFilter] = useState('all');
  const [customInput, setCustomInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTickerIndex((prev) => (prev + 1) % LIVE_NETWORK_UPDATES.length);
    }, 3600);
    return () => clearInterval(interval);
  }, []);

  const [isNavigating, setIsNavigating] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const isLoggedOut = !hasSession && !guestMode;
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    trackPageView('/');
  }, []);

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  // Redirect authenticated users away from landing page
  useEffect(() => {
    let cancelled = false;
    getActiveSession().then((session) => {
      if (!cancelled && session) {
        setHasSession(true);
        navigate('/app', { replace: true });
        return;
      }
      if (!cancelled) {
        setHasSession(false);
        setGuestMode(localStorage.getItem('hc_guest_mode') === 'true');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || (event === 'INITIAL_SESSION' && session)) && session) {
        setHasSession(true);
        window.location.replace('/app');
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleStartInvestigation = (context: string = 'landing_hero', presetSymptom?: string, presetSpecialist?: string) => {
    triggerHapticLight();
    trackButtonClick('Get Started', context);
    setIsNavigating(true);
    setActiveCase(null);
    useMDTStore.getState().reset();
    
    if (!hasSession && !guestMode) {
      try { localStorage.setItem('hc_guest_mode', 'true'); } catch(e) {}
    }

    if (presetSymptom) {
      try { sessionStorage.setItem('hc_preset_symptom', presetSymptom); } catch(e) {}
    }
    if (presetSpecialist) {
      try { sessionStorage.setItem('hc_preset_specialist', presetSpecialist); } catch(e) {}
    }

    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => {
      navigate('/app/consult?new=true');
    }, 900);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  const filteredCaseCards = selectedCaseFilter === 'all'
    ? RANKED_CASES
    : RANKED_CASES.filter((c) => c.category === selectedCaseFilter);

  return (
    <div className={styles.container}>
      
      {/* Loading Overlay */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: '#F4FBF7',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: '#ECFDF5',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)'
              }}
            >
              <Activity size={32} color="#059669" />
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}
            >
              Convening AI Medical Specialists...
            </motion.h2>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{
                width: '140px',
                height: '4px',
                background: '#E2E8F0',
                marginTop: '12px',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '4px'
              }}
            >
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  top: 0, bottom: 0, left: 0,
                  width: '50%',
                  background: '#059669',
                  borderRadius: '4px'
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 1. Floating Neutral Glass Navbar */}
      <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.logoContainer}>
          <img src="/logo.png" alt="HealthChain360.ai" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          <span className={styles.logoText}>HealthChain360.ai</span>
        </div>
        <div className={styles.navActions}>
          {isLoggedOut ? (
            <>
              <button className={styles.navLoginButton} onClick={() => navigate('/login')}>
                Log In
              </button>
              <button className={styles.navButton} onClick={() => handleStartInvestigation('landing_nav')}>
                Get Started
              </button>
            </>
          ) : (
            <button className={styles.navButton} onClick={() => navigate('/app/today')}>
              Health Today →
            </button>
          )}
        </div>
      </nav>
      
      <main>

      {/* 2. Hero Section */}
      <div className={styles.heroWrapper}>
        <div className={styles.heroGradientBg}></div>

        <div className={styles.heroContent}>
          <motion.div variants={containerVariants} initial="hidden" animate="show">
            
            {/* High-Tech Black Look Window Card with Continuous Specialist Ticker */}
            <motion.div 
              variants={itemVariants} 
              className={styles.darkTickerWindowCard}
              onClick={() => handleStartInvestigation('landing_ticker_window')}
            >
              <div className={styles.darkTickerPrefix}>
                <div className={styles.darkTickerLiveDot} />
                <span className={styles.darkTickerPrefixLabel}>LIVE AI BOARD</span>
              </div>
              <div className={styles.darkTickerDivider} />
              <div className={styles.darkTickerViewport}>
                <div className={styles.stockTickerTrack}>
                  {[...SPECIALIST_TICKER, ...SPECIALIST_TICKER].map((spec, i) => (
                    <div key={i} className={styles.darkTickerItem}>
                      <span className={styles.darkTickerIcon}>{spec.icon}</span>
                      <span className={styles.darkTickerName}>{spec.name}</span>
                      <span className={styles.darkTickerTag}>{spec.tag}</span>
                      <span className={styles.darkTickerDot}>•</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className={styles.heroTitle}>
              Your Symptoms. <br/>
              <span className={styles.heroHighlight}>Finally Explained.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className={styles.heroDescription}>
              Been to 5 different doctors with no answers? HealthChain360.ai convenes AI medical specialists to cross-analyze your complex symptoms, blood work, and history—uncovering root-cause connections standard 15-minute visits miss.
            </motion.p>

            {/* Instant Symptom Input Box */}
            <motion.div variants={itemVariants} className={styles.heroInputContainer}>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customInput.trim()) {
                    handleStartInvestigation('landing_hero_input', customInput.trim());
                  } else {
                    handleStartInvestigation('landing_hero_input');
                  }
                }}
                className={styles.heroInputBox}
              >
                <Search size={18} className={styles.heroInputIcon} />
                <input 
                  ref={inputRef}
                  type="text" 
                  placeholder="Type your symptoms or paste blood test results (e.g. chronic fatigue, morning headaches)..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className={styles.heroInputField}
                  style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                />
                <button type="submit" className={styles.heroInputBtn}>
                  <span>Analyze →</span>
                </button>
              </form>
            </motion.div>

            {/* 1-Tap Symptom Presets Bar */}
            <motion.div variants={itemVariants} className={styles.symptomChipsSection}>
              <div className={styles.symptomChipsHeader}>
                OR TAP A FREQUENT SYMPTOM TO BEGIN:
              </div>
              <div className={styles.symptomChipsGrid}>
                {SYMPTOM_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    className={styles.symptomChip}
                    onClick={() => handleStartInvestigation(`landing_chip_${idx}`, preset.symptom, preset.specialist)}
                  >
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Interactive Live Consensus Simulation Card */}
            <motion.div 
              variants={itemVariants} 
              className={styles.consensusDemoCard}
            >
              <div className={styles.demoHeader}>
                <div className={styles.demoBadge}>
                  <div className={styles.demoLiveDot} />
                  <span>MULTI-DISCIPLINARY SPECIALIST CONSENSUS ACTIVE</span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#71717A', fontWeight: 600 }}>
                  Case #4120 • 35-yo Female (Post-Viral Fatigue)
                </div>
              </div>

              <div className={styles.demoChatArea}>
                {CONSENSUS_DIALOGUE.map((dialogue, dIdx) => (
                  <div key={dIdx} className={styles.demoMessage}>
                    <div className={styles.demoSpecialistIcon} style={{ background: dialogue.bg, color: dialogue.color }}>
                      {dialogue.icon}
                    </div>
                    <div className={styles.demoMessageContent}>
                      <div className={styles.demoSpecialistName}>
                        <span>{dialogue.role}</span>
                        <span className={styles.demoSpecialistField}>Specialist perspective</span>
                      </div>
                      <p className={styles.demoText}>"{dialogue.finding}"</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.demoFooter}>
                <div className={styles.demoConfidenceText}>
                  <Sparkles size={14} />
                  <span>Synthesizing root-cause differentials & clinician discussion brief...</span>
                </div>
                <button 
                  className={styles.demoCtaMini}
                  onClick={() => handleStartInvestigation('landing_consensus_demo', 'Post-viral chronic fatigue with normal labs')}
                >
                  <span>Try with your symptoms →</span>
                </button>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </div>

      {/* 3. Illustrated Clinical Results (FameHero Style) */}
      <section className={styles.statsSection}>
        <div className={styles.sectionHeader} style={{ marginBottom: '32px' }}>
          <h2 className={styles.sectionTitle} style={{ fontSize: '36px', marginBottom: '8px' }}>
            Results You Can Measure <br/>
            <span className={styles.heroHighlight}>Clinical Clarity That Delivers</span>
          </h2>
          <p className={styles.sectionSubtitle} style={{ maxWidth: '680px' }}>
            Patients don't just get answers — they get clarity. HealthChain360.ai drives measurable improvements across root-cause discovery, lab synthesis, and clinician appointment preparation.
          </p>
        </div>

        <div className={styles.statsGrid}>
          {/* Metric Card 1: Speedometer Gauge */}
          <motion.div 
            className={styles.statItem}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.statGraphicWrapper}>
              <svg viewBox="0 0 200 120" className={styles.statSvg} fill="none">
                <path d="M 30 105 A 68 68 0 0 1 170 105" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="12" strokeLinecap="round" />
                <path d="M 30 105 A 68 68 0 0 1 155 48" stroke="#059669" strokeWidth="12" strokeLinecap="round" />
                <line x1="100" y1="100" x2="146" y2="46" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="100" cy="100" r="5" fill="#FFFFFF" stroke="#059669" strokeWidth="3" />
              </svg>
            </div>
            <div className={styles.statValueRow}>
              <span className={styles.statNumber}>94%</span>
              <span className={styles.statTrend}>↗</span>
            </div>
            <h4 className={styles.statTitle}>Diagnostic Consensus</h4>
            <p className={styles.statDesc}>
              Multi-specialist AI agreement rate on complex cross-system differential diagnoses and root causes.
            </p>
            <button className={styles.statCtaLink} onClick={() => handleStartInvestigation('stats_card_1')}>
              Start Free Review →
            </button>
          </motion.div>

          {/* Metric Card 2: Ascending Bar Chart */}
          <motion.div 
            className={styles.statItem}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className={styles.statGraphicWrapper}>
              <svg viewBox="0 0 200 120" className={styles.statSvg} fill="none">
                <rect x="25" y="75" width="16" height="35" rx="8" fill="rgba(16, 185, 129, 0.2)" />
                <rect x="52" y="60" width="16" height="50" rx="8" fill="rgba(16, 185, 129, 0.3)" />
                <rect x="79" y="48" width="16" height="62" rx="8" fill="rgba(16, 185, 129, 0.45)" />
                <rect x="106" y="38" width="16" height="72" rx="8" fill="rgba(16, 185, 129, 0.6)" />
                <rect x="133" y="24" width="16" height="86" rx="8" fill="rgba(16, 185, 129, 0.75)" />
                <rect x="160" y="10" width="16" height="100" rx="8" fill="#059669" />
              </svg>
            </div>
            <div className={styles.statValueRow}>
              <span className={styles.statNumber}>4.8x</span>
              <span className={styles.statTrend}>↗</span>
            </div>
            <h4 className={styles.statTitle}>Evidence Breadth</h4>
            <p className={styles.statDesc}>
              Evaluates 4.8x more multi-system biomarker correlations than standard 15-minute primary care visits.
            </p>
            <button className={styles.statCtaLink} onClick={() => handleStartInvestigation('stats_card_2')}>
              Start Free Review →
            </button>
          </motion.div>

          {/* Metric Card 3: Smooth Spline Trend Line */}
          <motion.div 
            className={styles.statItem}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className={styles.statGraphicWrapper}>
              <svg viewBox="0 0 200 120" className={styles.statSvg} fill="none">
                <path d="M 20 85 Q 50 82 70 58 T 120 65 T 180 18" stroke="#10B981" strokeWidth="4" strokeLinecap="round" />
                <circle cx="180" cy="18" r="6" fill="#FFFFFF" stroke="#059669" strokeWidth="3" />
              </svg>
            </div>
            <div className={styles.statValueRow}>
              <span className={styles.statNumber}>&lt; 60s</span>
              <span className={styles.statTrend}>↗</span>
            </div>
            <h4 className={styles.statTitle}>Synthesized Dossier</h4>
            <p className={styles.statDesc}>
              Transforms years of fragmented blood tests and symptoms into an actionable clinician brief in seconds.
            </p>
            <button className={styles.statCtaLink} onClick={() => handleStartInvestigation('stats_card_3')}>
              Start Free Review →
            </button>
          </motion.div>
        </div>
      </section>

      {/* 3.5 FameHero-Style Bento Clinical Intelligence Showcase */}
      <section className={styles.bentoShowcaseSection}>
        <div className={styles.bentoContainerCard}>
          <div className={styles.bentoTopBadgeRow}>
            <span className={styles.bentoTopBadge}>AUTOMATED CLINICAL INTELLIGENCE</span>
          </div>

          <div className={styles.bentoHeaderRow}>
            <div className={styles.bentoHeaderTitleArea}>
              <div className={styles.bentoHeaderIcon}>
                <Eye size={20} color="#059669" />
              </div>
              <h2 className={styles.bentoHeaderTitle}>Clinical Campaign &amp; Dossier Preview</h2>
            </div>
            <p className={styles.bentoHeaderSubtitle}>
              <strong style={{ color: '#059669' }}>Real-World Intelligence.</strong> See how HealthChain360.ai structures your scattered medical records into doctor-ready, multi-specialist briefs that get taken seriously.
            </p>
          </div>

          {/* Masonry / Bento 4-Card Grid */}
          <div className={styles.bentoGrid}>
            {/* Card 1: Patient Guide */}
            <motion.div 
              className={styles.bentoCard}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              onClick={() => handleStartInvestigation('bento_card_1', 'Chronological symptom timeline')}
            >
              <div className={styles.bentoImgWrapper}>
                <img 
                  src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80" 
                  alt="Doctor consultation" 
                  className={styles.bentoImg}
                  loading="lazy"
                />
                <div className={styles.bentoImgOverlay} />
              </div>
              <div className={styles.bentoCardBody}>
                <div className={styles.bentoCardTags}>
                  <span className={styles.bentoCategoryTag}>📖 Patient Guide</span>
                  <span className={styles.bentoStatusTag}>VERIFIED</span>
                </div>
                <h3 className={styles.bentoCardTitle}>
                  What is HealthChain360.ai and How Does It Connect 5+ Doctor Visits?
                </h3>
                <p className={styles.bentoCardDesc}>
                  Confused about managing scattered PDFs and blood tests? HealthChain360.ai centralizes your health timeline so you never repeat your story from scratch.
                </p>
              </div>
            </motion.div>

            {/* Card 2: Multi-Specialist Board */}
            <motion.div 
              className={styles.bentoCard}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              onClick={() => handleStartInvestigation('bento_card_2', 'Multi-specialist clinical review')}
            >
              <div className={styles.bentoImgWrapper}>
                <img 
                  src="https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=800&q=80" 
                  alt="Specialist clinical board" 
                  className={styles.bentoImg}
                  loading="lazy"
                />
                <div className={styles.bentoImgOverlay} />
              </div>
              <div className={styles.bentoCardBody}>
                <div className={styles.bentoCardTags}>
                  <span className={styles.bentoCategoryTag}>🔬 Multi-Specialist Board</span>
                  <span className={styles.bentoStatusTag}>LIVE CONSENSUS</span>
                </div>
                <h3 className={styles.bentoCardTitle}>
                  How HealthChain360.ai Bridges Communication Gaps With Your Doctors
                </h3>
                <p className={styles.bentoCardDesc}>
                  Ever felt unheard during a 15-minute visit? Equip yourself with prioritized differential questions and evidence flags that clinicians immediately respect.
                </p>
              </div>
            </motion.div>

            {/* Card 3: PubMed & Lab Biomarkers */}
            <motion.div 
              className={styles.bentoCard}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              onClick={() => handleStartInvestigation('bento_card_3', 'Lab biomarkers and PubMed evidence')}
            >
              <div className={styles.bentoImgWrapper}>
                <img 
                  src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80" 
                  alt="Doctor with medical brief" 
                  className={styles.bentoImg}
                  loading="lazy"
                />
                <div className={styles.bentoImgOverlay} />
              </div>
              <div className={styles.bentoCardBody}>
                <div className={styles.bentoCardTags}>
                  <span className={styles.bentoCategoryTag}>📊 Integrated Data Management</span>
                  <span className={styles.bentoStatusTag}>NIH GROUNDED</span>
                </div>
                <h3 className={styles.bentoCardTitle}>
                  Real-Time Lab Synthesis &amp; 35M+ NIH Clinical Trial Matching
                </h3>
                <p className={styles.bentoCardDesc}>
                  Automatically cross-references subtle anomalies in thyroid ratios, ferritin, and autonomic markers with latest peer-reviewed clinical studies.
                </p>
              </div>
            </motion.div>

            {/* Card 4: Verified Privacy Vault */}
            <motion.div 
              className={`${styles.bentoCard} ${styles.bentoCardPrivacy}`}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              onClick={() => handleStartInvestigation('bento_card_4')}
            >
              <div className={styles.bentoPrivacyIconBg}>
                <ShieldCheck size={28} color="#059669" />
              </div>
              <div className={styles.bentoCardBody}>
                <div className={styles.bentoCardTags}>
                  <span className={styles.bentoCategoryTag}>🛡️ Encrypted Vault</span>
                  <span className={styles.bentoStatusTag}>ZERO-KNOWLEDGE</span>
                </div>
                <h3 className={styles.bentoCardTitle}>
                  Reviewed &amp; Encrypted Before It Reaches Your Doctor
                </h3>
                <p className={styles.bentoCardDesc}>
                  Every assessment runs through client-side encryption. We never sell, monetize, or train third-party public models on your personal health records.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Bottom Primary Action Button */}
          <div className={styles.bentoBottomCta}>
            <button 
              className={styles.bentoCtaButton}
              onClick={() => handleStartInvestigation('bento_bottom_cta')}
            >
              <span>Start Your Free Case Dossier</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Real-Time Diagnostic Intelligence Board */}
      <section className={styles.casesSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.categoryBadge}>
            <Brain size={13} /> REAL-WORLD DIAGNOSTIC RESOLUTIONS
          </div>
          <h2 className={styles.sectionTitle}>When Tests Look Normal, Specialists Connect the Dots</h2>
          <p className={styles.sectionSubtitle}>
            Explore real multi-system cases where standard 15-minute visits stalled, but our AI clinical specialists uncovered hidden root causes.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className={styles.caseFilterTabs}>
          {CASE_TABS.map((tab) => (
            <button 
              key={tab.id}
              className={`${styles.caseFilterTab} ${selectedCaseFilter === tab.id ? styles.caseFilterTabActive : ''}`}
              onClick={() => {
                triggerHapticLight();
                setSelectedCaseFilter(tab.id);
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Case Cards Grid / Feed */}
        <div className={styles.casesFeed}>
          {filteredCaseCards.map((item, idx) => (
            <motion.div
              key={item.id}
              className={`${styles.caseCard} ${idx === 0 ? styles.caseCardTop1 : idx === 1 ? styles.caseCardTop2 : idx === 2 ? styles.caseCardTop3 : ''}`}
              whileHover={{ y: -2 }}
              onClick={() => handleStartInvestigation(`case_${item.id}`, item.symptom, item.specId)}
            >
              <div className={`${styles.caseRankBadge} ${idx === 0 ? styles.caseRank1 : idx === 1 ? styles.caseRank2 : idx === 2 ? styles.caseRank3 : ''}`}>
                {item.rank}
              </div>
              <div className={styles.caseCardBody}>
                <div className={styles.caseCardHeader}>
                  <div className={styles.caseTitleRow}>
                    <span className={styles.caseIcon}>{item.icon}</span>
                    <h3 className={styles.caseTitle}>{item.title}</h3>
                  </div>
                  <span className={styles.caseMatchScore}>{item.score}</span>
                </div>
                <p className={styles.caseDesc}>{item.desc}</p>
                <div className={styles.caseCardFooter}>
                  <div className={styles.caseSpecialistMeta}>
                    <span className={styles.caseSpecialistLabel}>🔬 {item.specialistTag}</span>
                    <span>•</span>
                    <span>{item.meta}</span>
                  </div>
                  <span className={styles.caseActionLink}>
                    <span>Test with your symptoms</span>
                    <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Latest Clinical Consensus Activity Bar */}
          <div className={styles.latestConsensusBar}>
            <div className={styles.consensusBarTitle}>
              <span className={styles.liveActivityPulse}>●</span>
              <span>LATEST CLINICAL CONSENSUS ACTIVITY</span>
            </div>
            <div className={styles.consensusPills}>
              {LATEST_ACTIVITIES.map((act, aIdx) => (
                <div 
                  key={aIdx}
                  className={styles.consensusPill}
                  onClick={() => handleStartInvestigation(`activity_pill_${aIdx}`, act.symptom, act.specId)}
                >
                  <span>{act.icon}</span>
                  <span>{act.text}</span>
                  <span className={styles.consensusPillTime}>· {act.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Product Video Demos */}
      <section className={styles.videoShowcaseSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.categoryBadge}>
            🎬 MULTI-SPECIALIST AI DEMO
          </div>
          <h2 className={styles.sectionTitle}>See HealthChain360.ai in Action</h2>
          <p className={styles.sectionSubtitle}>
            Watch how our AI clinical specialists cross-analyze contradictory symptoms, lab biomarkers, and medical history.
          </p>
        </div>

        <div className={styles.videoGrid}>
          {/* Video 1 */}
          <motion.div 
            className={styles.videoCard}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.videoWrapper}>
              <video 
                src="/videos/healthchain-overview.mp4" 
                controls 
                preload="metadata"
                playsInline 
                loop 
                muted
                className={styles.videoPlayer}
              />
            </div>
            <div className={styles.videoMeta}>
              <div className={styles.videoBadge}>DEMO 1 • OVERVIEW</div>
              <h3 className={styles.videoTitle}>AI Medical Board Debate</h3>
              <p className={styles.videoDesc}>
                Watch how cardiology, neurology, endocrinology, and immunology correlate multi-system symptoms to uncover missed root causes.
              </p>
              <button 
                className={styles.videoCta}
                onClick={() => handleStartInvestigation('landing_video_1', 'AI Medical Board Consultation')}
              >
                <span>Try this with your symptoms</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>

          {/* Video 2 */}
          <motion.div 
            className={styles.videoCard}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className={styles.videoWrapper}>
              <video 
                src="/videos/specialist-board-demo.mp4" 
                controls 
                preload="metadata"
                playsInline 
                loop 
                muted
                className={styles.videoPlayer}
              />
            </div>
            <div className={styles.videoMeta}>
              <div className={styles.videoBadge}>DEMO 2 • WORKFLOW</div>
              <h3 className={styles.videoTitle}>From Symptoms to Doctor-Ready Dossier</h3>
              <p className={styles.videoDesc}>
                See how blood panels and symptoms synthesize into ranked differentials and doctor-ready discussion points in minutes.
              </p>
              <button 
                className={styles.videoCta}
                onClick={() => handleStartInvestigation('landing_video_2', 'Full Lab & Symptom Dossier')}
              >
                <span>Generate your clinical brief</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. The Problem (The Diagnostic Odyssey) */}
      <section className={styles.problemSection}>
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className={styles.problemContent}
        >
          <h2 className={styles.problemTitle}>
            Tired of hearing "All your tests are normal" while you still feel sick?
          </h2>
          <p className={styles.problemText}>
            The average chronic patient spends years visiting 5+ disconnected specialists, repeating expensive blood tests, and receiving contradictory advice. Standard 15-minute doctor appointments simply don't have time to connect the dots across your gut, hormones, nervous system, and history.
          </p>
          <p className={styles.problemText} style={{ marginTop: '20px', color: '#0F172A', fontWeight: 700 }}>
            HealthChain360.ai replaces medical guesswork with autonomous multi-specialist intelligence. We correlate your symptoms, labs, and history into a unified clinical brief with ranked differentials and doctor-ready questions.
          </p>
        </motion.div>
      </section>

      {/* 6. Bento Grid Features */}
      <section className={styles.bentoSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.categoryBadge}>CLINICAL ARCHITECTURE</div>
          <h2 className={styles.sectionTitle}>Engineered for Complex Cases</h2>
          <p className={styles.sectionSubtitle}>Why standard medical search engines fail chronic patients and how HealthChain360.ai fixes it.</p>
        </div>

        <div className={styles.bentoGrid}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`${styles.bentoCard} ${styles.bentoLarge}`}>
            <div className={styles.bentoIconBg} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#0284C7' }}><Brain size={24} /></div>
            <h3 className={styles.bentoTitle}>Multi-Specialist AI Perspectives</h3>
            <p className={styles.bentoDesc}>Instead of a single AI giving a generic answer, clinical specialists evaluate your case independently, then debate and cross-examine evidence to uncover multi-system interactions.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={styles.bentoCard}>
            <div className={styles.bentoIconBg} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}><Microscope size={24} /></div>
            <h3 className={styles.bentoTitle}>Biomarker Synthesis</h3>
            <p className={styles.bentoDesc}>Upload raw blood test results, PDFs, or photos. The engine spots suboptimal patterns standard "normal ranges" overlook.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={styles.bentoCard}>
            <div className={styles.bentoIconBg} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}><Shield size={24} /></div>
            <h3 className={styles.bentoTitle}>Grounded Evidence</h3>
            <p className={styles.bentoDesc}>Every differential and suggested inquiry cites peer-reviewed PubMed and clinical trial literature.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`${styles.bentoCard} ${styles.bentoLarge}`}>
            <div className={styles.bentoIconBg} style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}><FileText size={24} /></div>
            <h3 className={styles.bentoTitle}>Doctor-Ready Consultation Dossier</h3>
            <p className={styles.bentoDesc}>Export an organized 1-page clinical summary formatted specifically for your doctor, complete with prioritized questions and recommended follow-up tests.</p>
          </motion.div>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <p className={styles.sectionSubtitle}>Everything you need to know about the platform and your privacy.</p>
        </div>
        <div className={styles.faqList}>
          {landingFaqs.map((faq, i) => (
            <div 
              key={i} 
              className={`${styles.faqItem} ${openFaq === i ? styles.faqItemOpen : ''}`}
            >
              <button
                aria-expanded={openFaq === i}
                className={styles.faqButton}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className={styles.faqQuestion}>{faq.question}</span>
                {openFaq === i ? <ChevronUp size={18} className={styles.faqIcon} /> : <ChevronDown size={18} className={styles.faqIcon} />}
              </button>
              {openFaq === i && (
                <div className={styles.faqAnswer}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 8. Final CTA */}
      <section className={styles.finalCtaSection}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className={styles.finalCtaBox}
        >
          <div className={styles.finalCtaMesh}></div>
          <div className={styles.finalCtaContent}>
            <h2 className={styles.finalCtaTitle}>Ready to uncover your root cause?</h2>
            <p className={styles.finalCtaDesc}>Convene AI specialists, organize your biomarkers, and prepare prioritized discussion questions for your next clinician visit.</p>
            <button className={styles.finalCtaBtn} onClick={() => handleStartInvestigation('landing_bottom_cta')}>
              Start Free Consultation <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </section>
      </main>

      {/* 9. Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <img src="/logo.png" alt="HealthChain360.ai" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
              <span>HealthChain360.ai</span>
            </div>
            <p className={styles.footerBrandText}>AI-assisted health assessment and clinician-visit preparation, built for clinical clarity and privacy.</p>
          </div>
          <div className={styles.footerLinks}>
            <h4>Product</h4>
            <Link to="/app/today">Health Today</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/changelog">Changelog</Link>
          </div>
          <div className={styles.footerLinks}>
            <h4>Company</h4>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <a href="mailto:healthchain360@gmail.com">Contact Us</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} HealthChain360.ai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
