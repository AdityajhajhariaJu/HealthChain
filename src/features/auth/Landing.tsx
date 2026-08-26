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
  Filter
} from 'lucide-react';
import { motion, useInView, animate, AnimatePresence } from 'framer-motion';
import { setActiveCase } from '../../services/CaseEngine';
import { useMDTStore } from '../../stores/useMDTStore';
import styles from './Landing.module.css';
import { getActiveSession } from '../../services/authSession';
import { supabase } from '../../services/supabaseClient';
import { trackPageView, trackButtonClick } from '../../services/analytics';
import { triggerHapticLight } from '../../services/haptics';

const CATEGORIES = [
  { id: 'all', label: 'All Specialties', icon: '🌐', count: '1,420 cases', specId: undefined },
  { id: 'cardio', label: 'Cardiology & Circulation', icon: '🫀', count: '284 cases', specId: 'cardio' },
  { id: 'neuro', label: 'Neurology & Cognitive', icon: '🧠', count: '312 cases', specId: 'neuro' },
  { id: 'endo', label: 'Endocrinology & Thyroid', icon: '🔬', count: '245 cases', specId: 'endo' },
  { id: 'gastro', label: 'Gastroenterology & Gut', icon: '🩺', count: '198 cases', specId: 'gastro' },
  { id: 'immuno', label: 'Immunology & Mast Cell', icon: '🛡️', count: '142 cases', specId: 'immuno' },
  { id: 'rheum', label: 'Rheumatology & Autoimmune', icon: '🦴', count: '128 cases', specId: 'rheum' },
  { id: 'pulmo', label: 'Pulmonology & Vagus Axis', icon: '🌬️', count: '111 cases', specId: 'pulmo' },
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
  {
    id: 'case-5',
    rank: '#5',
    category: 'gastro',
    title: 'Sub-Clinical SIBO with Intestinal Permeability & Brain Sluggishness',
    icon: '🩺',
    specialistTag: 'Gastroenterology & Functional',
    score: '89% Match',
    desc: 'Correlated persistent bloating and food sensitivities with gut-derived LPS endotoxins crossing the blood-brain barrier.',
    meta: '#1 in Gastroenterology · 6 days ago · 2,670 matched cases',
    symptom: 'SIBO, bloating, and post-eating brain sluggishness',
    specId: 'gastro',
  },
  {
    id: 'case-6',
    rank: '#6',
    category: 'rheum',
    title: 'Seronegative Autoimmune Joint Inflammation & Morning Stiffness',
    icon: '🦴',
    specialistTag: 'Rheumatology & Immunology',
    score: '88% Match',
    desc: 'Synthesized elevated ANA titers with normal CRP and mitochondrial cofactor depletion to guide targeted rheumatology appointment.',
    meta: '#1 in Rheumatology · 1 week ago · 1,820 matched cases',
    symptom: 'Joint inflammation, stiffness, and autoimmune fatigue',
    specId: 'rheum',
  },
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
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState('all');
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
    if (presetSpecialist && presetSpecialist !== 'all') {
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

  const filteredCases = activeCategory === 'all'
    ? RANKED_CASES
    : RANKED_CASES.filter((c) => c.category === activeCategory);

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

      {/* 2. Outbid-Style Hero Section */}
      <div className={styles.heroWrapper}>
        <div className={styles.heroGradientBg}></div>

        <div className={styles.heroContent}>
          <motion.div variants={containerVariants} initial="hidden" animate="show">
            
            {/* Outbid-Style Top Live Stats Pill */}
            <motion.div 
              variants={itemVariants} 
              className={styles.topLiveStatPill}
              onClick={() => handleStartInvestigation('landing_top_pill')}
            >
              <div className={styles.liveStatDot} />
              <span className={styles.liveStatHighlight}>16 Specialists Active</span>
              <span>· 1,420+ Inquiries Synthesized ·</span>
              <span className={styles.liveStatLink}>Start Consultation →</span>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className={styles.heroTitle}>
              Your Symptoms. <br/>
              <span className={styles.heroHighlight}>Finally Explained.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className={styles.heroDescription}>
              Been to 5 different doctors with no answers? HealthChain convenes 16 AI medical specialists to cross-analyze your complex symptoms, blood work, and history—uncovering root-cause connections standard 15-minute visits miss.
            </motion.p>

            {/* Outbid-style Search / Intake Bar */}
            <motion.div variants={itemVariants} className={styles.heroSearchContainer}>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleStartInvestigation('landing_search_bar', customInput.trim() || 'General Multi-Specialist Intake', selectedSpecialtyFilter);
                }}
                className={styles.heroSearchForm}
              >
                <Search size={18} style={{ color: '#64748B', marginLeft: '4px' }} />
                <input 
                  ref={inputRef}
                  type="text" 
                  placeholder="Describe symptoms or paste lab biomarkers (e.g., fatigue, post-meal palpitations)..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className={styles.heroSearchInput}
                />
                <select 
                  className={styles.heroCategorySelect}
                  value={selectedSpecialtyFilter}
                  onChange={(e) => setSelectedSpecialtyFilter(e.target.value)}
                >
                  <option value="all">All 16 Specialists</option>
                  <option value="cardio">Cardiology</option>
                  <option value="neuro">Neurology</option>
                  <option value="endo">Endocrinology</option>
                  <option value="gastro">Gastroenterology</option>
                  <option value="immuno">Immunology</option>
                  <option value="rheum">Rheumatology</option>
                  <option value="pulmo">Pulmonology</option>
                </select>
                <button type="submit" className={styles.heroSearchSubmitBtn}>
                  <span>Analyze Case →</span>
                </button>
              </form>
            </motion.div>

          </motion.div>
        </div>
      </div>

      {/* 3. Outbid-Style 2-Column Medical Board Directory */}
      <section className={styles.directorySection}>
        <div className={styles.directoryGrid}>
          
          {/* Left Category Sidebar */}
          <div className={styles.directorySidebar}>
            <div className={styles.sidebarHeader}>Specialties & Case Volumes</div>
            <div className={styles.categoryList}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`${styles.categoryItem} ${activeCategory === cat.id ? styles.categoryItemActive : ''}`}
                  onClick={() => {
                    triggerHapticLight();
                    setActiveCategory(cat.id);
                  }}
                >
                  <div className={styles.categoryLeft}>
                    <span className={styles.categoryIcon}>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </div>
                  <span className={styles.categoryCount}>{cat.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Main Feed of Ranked Cases */}
          <div className={styles.directoryMain}>
            
            {/* Top 3 Ranked Cases */}
            {filteredCases.slice(0, 3).map((item, idx) => (
              <div 
                key={item.id}
                className={`${styles.rankedCard} ${idx === 0 ? styles.rankedCardTop1 : idx === 1 ? styles.rankedCardTop2 : styles.rankedCardTop3}`}
                onClick={() => handleStartInvestigation(`directory_case_${item.id}`, item.symptom, item.specId)}
              >
                <div className={`${styles.rankBadge} ${idx === 0 ? styles.rankBadge1 : idx === 1 ? styles.rankBadge2 : styles.rankBadge3}`}>
                  {item.rank}
                </div>
                <div className={styles.rankedCardBody}>
                  <div className={styles.rankedCardHeader}>
                    <div className={styles.rankedTitleArea}>
                      <span className={styles.rankedSpecialistAvatar}>{item.icon}</span>
                      <span className={styles.rankedTitle}>{item.title}</span>
                    </div>
                    <span className={styles.rankedConfidenceScore}>{item.score}</span>
                  </div>
                  <p className={styles.rankedDesc}>{item.desc}</p>
                  <div className={styles.rankedFooter}>
                    <div className={styles.rankedFooterTags}>
                      <span className={styles.rankedSpecialistTag}>🔬 {item.specialistTag}</span>
                      <span>{item.meta}</span>
                    </div>
                    <span className={styles.rankedFooterAction}>See Clinical Brief →</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Outbid-style Horizontal Latest Activity Strip */}
            <div className={styles.latestActivitySection}>
              <div className={styles.latestActivityHeader}>
                <span>● Latest Clinical Consensus Activity</span>
              </div>
              <div className={styles.latestActivityPills}>
                {LATEST_ACTIVITIES.map((act, aIdx) => (
                  <div 
                    key={aIdx} 
                    className={styles.activityPill}
                    onClick={() => handleStartInvestigation(`activity_pill_${aIdx}`, act.symptom, act.specId)}
                  >
                    <span>{act.icon}</span>
                    <span>{act.text}</span>
                    <span className={styles.activityPillTime}>· {act.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Remaining Ranked Cases (#4, #5, #6...) */}
            {filteredCases.slice(3).map((item, idx) => (
              <div 
                key={item.id}
                className={styles.rankedCard}
                onClick={() => handleStartInvestigation(`directory_case_${item.id}`, item.symptom, item.specId)}
              >
                <div className={styles.rankBadge}>
                  {item.rank}
                </div>
                <div className={styles.rankedCardBody}>
                  <div className={styles.rankedCardHeader}>
                    <div className={styles.rankedTitleArea}>
                      <span className={styles.rankedSpecialistAvatar}>{item.icon}</span>
                      <span className={styles.rankedTitle}>{item.title}</span>
                    </div>
                    <span className={styles.rankedConfidenceScore}>{item.score}</span>
                  </div>
                  <p className={styles.rankedDesc}>{item.desc}</p>
                  <div className={styles.rankedFooter}>
                    <div className={styles.rankedFooterTags}>
                      <span className={styles.rankedSpecialistTag}>🔬 {item.specialistTag}</span>
                      <span>{item.meta}</span>
                    </div>
                    <span className={styles.rankedFooterAction}>See Clinical Brief →</span>
                  </div>
                </div>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* 4. Product Video Demos */}
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

      {/* 5. FAQ Section */}
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

      {/* 6. Final CTA */}
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

      {/* 7. Footer */}
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
