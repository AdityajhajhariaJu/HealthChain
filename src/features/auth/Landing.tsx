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
  ArrowUpRight
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
  { icon: '⚡', label: 'Chronic Fatigue', specialistId: 'endo', symptom: 'Chronic fatigue, low energy, and sluggishness for months' },
  { icon: '🤕', label: 'Daily Headache', specialistId: 'neuro', symptom: 'Daily headache, eye pressure, and migraine flare-ups' },
  { icon: '🫀', label: 'Palpitations', specialistId: 'cardio', symptom: 'Unexplained palpitations, racing pulse, and lightheadedness' },
  { icon: '🧬', label: 'Brain Fog', specialistId: 'neuro', symptom: 'Brain fog, memory lapses, and cognitive sluggishness' },
  { icon: '🩺', label: 'Gut Issues', specialistId: 'gastro', symptom: 'Chronic gut issues, bloating, and food sensitivity' },
  { icon: '➕', label: 'Other...', isCustom: true },
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

const landingFaqs = [
  {
    question: "Is HealthChain a replacement for my doctor?",
    answer: "No. HealthChain is an AI-assisted health assessment and appointment-preparation tool. It helps you organize your history, spot questions and evidence gaps to discuss, and prepare for clinician visits. It does not diagnose, prescribe, or replace professional medical care."
  },
  {
    question: "How is my medical data secured?",
    answer: "You control your case information. Guest-mode information stays in your browser on that device; signed-in features sync securely to your encrypted cloud vault. We never sell your medical records."
  },
  {
    question: "How do the Deep Collaborative Specialists work?",
    answer: "The Deep Collaborative Specialists feature coordinates 16 AI perspective modules (such as cardiology, neurology, endocrinology, and immunology) to organize your information, surface evidence gaps, and prepare prioritized discussion points for a qualified clinician."
  },
  {
    question: "Are the AI agents trained on real medical literature?",
    answer: "Yes. HealthChain grounds its reasoning in peer-reviewed clinical guidelines (PubMed, NIH, OMIM, ClinicalTrials.gov). AI output is synthesized for patient clarity and must always be reviewed with your personal physician."
  }
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleChipClick = (preset: typeof SYMPTOM_PRESETS[0], idx: number) => {
    triggerHapticLight();
    if (preset.isCustom) {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    handleStartInvestigation(`landing_chip_${idx}`, preset.symptom, preset.specialistId);
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
      transition: { staggerChildren: 0.12 },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  const testimonials = [
    {
      quote: "After 3 years of being told my fatigue was 'just stress', HealthChain's specialist board connected my gut symptoms to sub-clinical ferritin deficiency. My doctor immediately ordered the right test.",
      name: "Sarah M.",
      location: "New York",
      rating: 5
    },
    {
      quote: "I visited 4 different specialists and got 4 contradictory diagnoses. HealthChain's consensus report synthesized my entire 5-year timeline into a 2-page brief my rheumatologist actually read.",
      name: "Rajesh K.",
      location: "Mumbai",
      rating: 5
    },
    {
      quote: "The J.A.R.V.I.S. investigation caught a medication clash between my migraine pills and blood pressure meds that two clinics missed. Incredible diagnostic intelligence.",
      name: "Elena V.",
      location: "London",
      rating: 5
    }
  ];

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
              background: '#070C18',
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
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
              }}
            >
              <Activity size={32} color="#38BDF8" />
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' }}
            >
              Convening 16 AI Medical Specialists...
            </motion.h2>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{
                width: '140px',
                height: '3px',
                background: 'rgba(255,255,255,0.1)',
                marginTop: '12px',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '3px'
              }}
            >
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  top: 0, bottom: 0, left: 0,
                  width: '50%',
                  background: '#38BDF8',
                  borderRadius: '3px'
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 1. Floating Glass Navbar */}
      <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.logoContainer}>
          <div className={styles.logoIconBg}><Activity size={20} className={styles.logoIcon} /></div>
          <span className={styles.logoText}>HealthChain</span>
        </div>
        <div className={styles.navActions}>
          {isLoggedOut ? (
            <button className={styles.navLoginButton} onClick={() => navigate('/login')}>
              Log In
            </button>
          ) : (
            <button className={styles.navLoginButton} onClick={() => navigate('/app/today')}>
              Health Today
            </button>
          )}
          <button className={styles.navButton} onClick={() => handleStartInvestigation('landing_nav')}>
            Get Started
          </button>
        </div>
      </nav>
      
      <main>

      {/* 2. Vibrant Hero Section */}
      <div className={styles.heroWrapper}>
        <div className={styles.heroGradientBg}></div>

        <div className={styles.heroContent}>
          <motion.div variants={containerVariants} initial="hidden" animate="show">
            
            <motion.div variants={itemVariants} className={styles.premiumBadge}>
              <Zap size={13} fill="currentColor" /> 16-SPECIALIST AI MEDICAL BOARD
            </motion.div>
            
            <motion.h1 variants={itemVariants} className={styles.heroTitle}>
              Your Symptoms. <br/>
              <span className={styles.heroHighlight}>Finally Explained.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className={styles.heroDescription}>
              Been to 5 different doctors with no answers? HealthChain convenes 16 AI medical specialists to cross-analyze your complex symptoms, blood work, and history—uncovering root-cause connections standard 15-minute visits miss.
            </motion.p>

            {/* 💡 Idea 3: Instant Symptom Input Box in the Hero */}
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
                  placeholder="Type your symptoms or upload a lab report..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className={styles.heroInputField}
                />
                <button type="submit" className={styles.heroInputBtn}>
                  <span>Analyze →</span>
                </button>
              </form>
            </motion.div>

            {/* 💡 Idea 1: 1-Tap Symptom Chips (Direct Intake Hook) */}
            <motion.div variants={itemVariants} className={styles.symptomChipsSection}>
              <div className={styles.symptomChipsHeader}>
                ⚡ 1-Tap Quick Start (Instant Specialist Launch)
              </div>
              <div className={styles.symptomChipsGrid}>
                {SYMPTOM_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    className={styles.symptomChip}
                    onClick={() => handleChipClick(preset, idx)}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* 💡 Idea 2: Interactive "Live Specialist Consensus" Preview Card */}
            <motion.div 
              variants={itemVariants} 
              className={styles.consensusDemoCard}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className={styles.demoHeader}>
                <div className={styles.demoBadge}>
                  <div className={styles.demoLiveDot} />
                  <span>Live 16-Specialist AI Medical Board Debate</span>
                </div>
              </div>

              <div className={styles.demoChatArea}>
                {CONSENSUS_DIALOGUE.map((spec, sIdx) => (
                  <div key={sIdx} className={styles.demoMessage}>
                    <div className={styles.demoSpecialistIcon} style={{ background: spec.bg, color: spec.color }}>
                      {spec.icon}
                    </div>
                    <div className={styles.demoMessageContent}>
                      <div className={styles.demoSpecialistName} style={{ color: spec.color }}>
                        <span>{spec.role}:</span>
                      </div>
                      <p className={styles.demoText}>"{spec.finding}"</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.demoFooter}>
                <div className={styles.demoConfidenceText}>
                  <Sparkles size={16} />
                  <span>Consensus: Root-Cause Synthesis Ready</span>
                </div>
                <button 
                  className={styles.demoCtaMini}
                  onClick={() => handleStartInvestigation('landing_consensus_card', 'Symptom Cross-Analysis & Lab Investigation')}
                >
                  Try with your symptoms →
                </button>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </div>

      {/* 3. Trusted By / Logos */}
      <div className={styles.logoMarqueeSection}>
        <p className={styles.logoMarqueeTitle}>BACKED BY PEER-REVIEWED EVIDENCE & CLINICAL DATASETS</p>
        <div className={styles.marqueeContainer}>
          <div className={styles.marqueeTrack}>
            <span className={styles.textLogo}>PubMed</span>
            <span className={styles.textLogo}>NIH</span>
            <span className={styles.textLogo}>ClinicalTrials.gov</span>
            <span className={styles.textLogo}>OMIM</span>
            <span className={styles.textLogo}>Cochrane Library</span>
            <span className={styles.textLogo} aria-hidden="true">PubMed</span>
            <span className={styles.textLogo} aria-hidden="true">NIH</span>
            <span className={styles.textLogo} aria-hidden="true">ClinicalTrials.gov</span>
            <span className={styles.textLogo} aria-hidden="true">OMIM</span>
            <span className={styles.textLogo} aria-hidden="true">Cochrane Library</span>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <h3 className={styles.statValue}>16 Specialists</h3>
            <p className={styles.statLabel}>Multi-disciplinary AI board</p>
          </div>
          <div className={styles.statItem}>
            <h3 className={styles.statValue}>85% Faster</h3>
            <p className={styles.statLabel}>To root-cause clarity</p>
          </div>
          <div className={styles.statItem}>
            <h3 className={styles.statValue}>Plain English</h3>
            <p className={styles.statLabel}>Zero confusing medical jargon</p>
          </div>
        </div>
      </section>

      {/* 3.5 Product Video Demos */}
      <section className={styles.videoShowcaseSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.premiumBadge} style={{ marginBottom: '12px' }}>
            🎬 MULTI-SPECIALIST AI DEMO
          </div>
          <h2 className={styles.sectionTitle}>See HealthChain in Action</h2>
          <p className={styles.sectionSubtitle}>
            Watch how our 16 AI clinical specialists cross-analyze contradictory symptoms, lab biomarkers, and medical history.
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
              <h3 className={styles.videoTitle}>16-Specialist AI Medical Board Debate</h3>
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

      {/* 4. The Problem (The Diagnostic Odyssey) */}
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
          <p className={styles.problemText} style={{ marginTop: '20px', color: '#FFFFFF', fontWeight: 700 }}>
            HealthChain replaces medical guesswork with autonomous multi-specialist intelligence. We correlate your symptoms, labs, and history into a unified clinical brief with ranked differentials and doctor-ready questions.
          </p>
        </motion.div>
      </section>

      {/* 5. Features Bento Box */}
      <section className={styles.bentoSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Complete Diagnostic Intelligence</h2>
          <p className={styles.sectionSubtitle}>Everything you need to uncover the root cause and prepare for your doctor visits.</p>
        </div>

        <div className={styles.bentoGrid}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className={`${styles.bentoCard} ${styles.bentoLarge}`}
          >
            <div className={styles.bentoIconBg} style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
              <GitBranch size={24} color="#fff" />
            </div>
            <h3 className={styles.bentoTitle}>16-Specialist Deep Collab</h3>
            <p className={styles.bentoDesc}>Convene cardiology, neurology, immunology, and endocrinology simultaneously to debate complex, multi-system cases and surface hidden root causes.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }}
            className={styles.bentoCard}
          >
            <div className={styles.bentoIconBg} style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}>
              <Shield size={24} color="#fff" />
            </div>
            <h3 className={styles.bentoTitle}>Doctor-Ready PDF Dossier</h3>
            <p className={styles.bentoDesc}>Export a high-yield clinical brief with your timeline, key differentials, and top 5 targeted questions to ensure a productive doctor visit.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }}
            className={styles.bentoCard}
          >
            <div className={styles.bentoIconBg} style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}>
              <Search size={24} color="#fff" />
            </div>
            <h3 className={styles.bentoTitle}>AI Lab Report & Scan Analyzer</h3>
            <p className={styles.bentoDesc}>Upload blood panels, MRIs, and biopsy reports. Get instant plain-English explanations and sub-clinical functional flags.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }}
            className={`${styles.bentoCard} ${styles.bentoWide}`}
          >
            <div className={styles.bentoIconBg} style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' }}>
              <MessageSquare size={24} color="#fff" />
            </div>
            <h3 className={styles.bentoTitle}>Ava: 24/7 AI Medical Chief of Staff</h3>
            <p className={styles.bentoDesc}>Instant conversational symptom triage, drug interaction screening, calming acute reassurance, and clinical follow-up planning.</p>
          </motion.div>
        </div>
      </section>

      {/* 6. AI Brain Simulation */}
      <section className={styles.aiBrainSection}>
        <div className={styles.aiBrainContent}>
          <div className={styles.aiBrainText}>
            <h2>16 AI Specialists Concurring <br/>On Your Case in Real Time.</h2>
            <p>Instead of waiting 6 months for fragmented specialist referrals, HealthChain orchestrates an autonomous medical board to debate evidence, rule out conditions, and connect unseen symptoms in minutes.</p>
          </div>
          <div className={styles.aiBrainVisual}>
             <div className={styles.nodeNetwork}>
                <div className={`${styles.node} ${styles.nodeCenter}`}></div>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`${styles.node} ${styles.nodeOrbit}`} style={{ '--i': i } as React.CSSProperties}></div>
                ))}
                <svg className={styles.nodeLines}>
                   <circle cx="140" cy="140" r="90" stroke="rgba(0,212,178,0.25)" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                   <circle cx="140" cy="140" r="130" stroke="rgba(0,212,178,0.12)" strokeWidth="1" fill="none" />
                </svg>
             </div>
          </div>
        </div>
      </section>

      {/* 7. How It Works */}
      <section id="how-it-works" className={styles.timelineSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>From Symptoms to Clarity in 3 Steps</h2>
        </div>

        <div className={styles.timelineContainer}>
          {[
            {
              step: '01',
              title: 'Upload Symptoms & Lab Work',
              desc: 'Add blood panels, scan PDFs, or select your symptom timeline in your own words. Zero medical jargon required.'
            },
            {
              step: '02',
              title: 'Multi-Specialist AI Consensus',
              desc: '16 specialized AI modules cross-reference your biomarkers against peer-reviewed literature to rank differential hypotheses.'
            },
            {
              step: '03',
              title: 'Walk into Your Clinic Prepared',
              desc: 'Print your Doctor-Ready Dossier with prioritized questions and clinical cheat sheets so your doctor can take immediate action.'
            }
          ].map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className={styles.timelineItem}
            >
              <div className={styles.timelineStep}>{item.step}</div>
              <div className={styles.timelineContent}>
                <h3 className={styles.timelineItemTitle}>{item.title}</h3>
                <p className={styles.timelineItemDesc}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 8. Testimonials */}
      <section className={styles.testimonialSection}>
        <div className={styles.testimonialContainer}>
          <div className={styles.quoteMark}>"</div>
          <motion.div 
            key={activeTestimonial}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={styles.testimonialContent}
          >
            <p className={styles.testimonialQuote}>{testimonials[activeTestimonial].quote}</p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialStars}>
                {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
              </div>
              <h4>{testimonials[activeTestimonial].name}</h4>
              <span>{testimonials[activeTestimonial].location}</span>
            </div>
          </motion.div>
          
          <div className={styles.testimonialControls}>
            <button aria-label="Previous testimonial" onClick={() => setActiveTestimonial(p => (p === 0 ? testimonials.length - 1 : p - 1))} className={styles.controlBtn}><ChevronLeft size={20}/></button>
            <div className={styles.testimonialDots} role="tablist">
              {testimonials.map((_, i) => (
                <button key={i} aria-label={`Go to testimonial ${i + 1}`} role="tab" aria-selected={i === activeTestimonial} className={`${styles.dot} ${i === activeTestimonial ? styles.activeDot : ''}`} onClick={() => setActiveTestimonial(i)} />
              ))}
            </div>
            <button aria-label="Next testimonial" onClick={() => setActiveTestimonial(p => (p === testimonials.length - 1 ? 0 : p + 1))} className={styles.controlBtn}><ChevronRight size={20}/></button>
          </div>
        </div>
      </section>

      {/* 9. FAQ Section */}
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

      {/* 10. Final CTA */}
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
            <p className={styles.finalCtaDesc}>Convene 16 AI specialists, organize your biomarkers, and prepare prioritized discussion questions for your next clinician visit.</p>
            <button className={styles.finalCtaBtn} onClick={() => handleStartInvestigation('landing_bottom_cta')}>
              Start Free Consultation <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </section>
      </main>

      {/* 11. Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <div className={styles.logoIconBg}><Activity size={18} className={styles.logoIcon} /></div> HealthChain
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
          <p>© {new Date().getFullYear()} HealthChain. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
