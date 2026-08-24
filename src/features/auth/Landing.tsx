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
  CheckCircle2
} from 'lucide-react';
import { motion, useInView, animate, AnimatePresence } from 'framer-motion';
import { setActiveCase } from '../../services/CaseEngine';
import { useMDTStore } from '../../stores/useMDTStore';
import styles from './Landing.module.css';
import { getActiveSession } from '../../services/authSession';

const AnimatedCounter = ({ from, to, duration = 2, suffix = '' }: { from: number; to: number; duration?: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (inView && ref.current) {
      const controls = animate(from, to, {
        duration: duration,
        onUpdate(value) {
          if (ref.current) {
            ref.current.textContent = Math.round(value).toString() + suffix;
          }
        }
      });
      return () => controls.stop();
    }
  }, [inView, from, to, duration, suffix]);

  return <span ref={ref}>{from}{suffix}</span>;
};

const landingFaqs = [
  {
    question: "Is HealthChain a replacement for my doctor?",
    answer: "No. HealthChain is an AI-assisted health assessment and appointment-preparation tool. It helps you organize your history, spot questions and evidence gaps to discuss, and prepare for clinician visits. It does not diagnose, prescribe, or replace professional medical care."
  },
  {
    question: "How is my medical data secured?",
    answer: "You control your case information. Guest-mode information stays in your browser on that device; signed-in features may sync the information needed to provide the service. Use a personal device, protect it with a passcode, and review our Privacy Policy for the current storage and processing details."
  },
  {
    question: "How do the Deep Collaborative Specialists work?",
    answer: "The Deep Collaborative Specialists feature coordinates multiple AI perspective modules (for example, cardiology, neurology, or endocrinology perspectives) to organize your information, surface evidence gaps, and prepare discussion points for a qualified clinician. It is not a real consultation or a medical recommendation."
  },
  {
    question: "Are the AI agents trained on real medical literature?",
    answer: "HealthChain is designed to help organize medical information and discussion points. AI output can be incomplete or wrong, so it should be checked against the original record and discussed with a qualified clinician. We do not present AI output as a diagnosis."
  }
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const [isNavigating, setIsNavigating] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const isLoggedOut = !hasSession && !guestMode;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActiveSession().then((session) => {
      if (!cancelled) {
        setHasSession(Boolean(session));
        setGuestMode(localStorage.getItem('hc_guest_mode') === 'true');
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleStartInvestigation = () => {
    setIsNavigating(true);
    setActiveCase(null);
    useMDTStore.getState().reset();
    
    if (!hasSession && !guestMode) {
      try { localStorage.setItem('hc_guest_mode', 'true'); } catch(e) {}
    }

    setTimeout(() => {
      navigate('/app/today');
    }, 1100);
  };

  // Scroll listener for navbar glass effect
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
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  const testimonials = [
    {
      quote: "HealthChain helped me put years of symptoms and test results into one clear timeline for my next appointment.",
      name: "Sarah M.",
      location: "New York",
      rating: 5
    },
    {
      quote: "The case brief made it much easier to explain what had changed and ask focused questions during my clinician visit.",
      name: "Rajesh K.",
      location: "Mumbai",
      rating: 5
    },
    {
      quote: "I felt more prepared to have a constructive conversation with my clinician instead of trying to piece everything together alone.",
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
              background: '#0B1120',
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
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 40px rgba(16, 185, 129, 0.15)'
              }}
            >
              <Activity size={32} color="#10B981" />
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ fontSize: '32px', fontWeight: 900, color: '#F1F5F9', margin: 0, letterSpacing: '-0.5px' }}
            >
              HealthChain
            </motion.h2>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{
                width: '120px',
                height: '2px',
                background: 'rgba(255,255,255,0.1)',
                marginTop: '16px',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '2px'
              }}
            >
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  top: 0, bottom: 0, left: 0,
                  width: '50%',
                  background: '#10B981',
                  borderRadius: '2px'
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
            <button className={`btn ${styles.navLoginButton}`} onClick={() => navigate('/login')}>
              Log In
            </button>
          ) : (
            <button className={`btn ${styles.navLoginButton}`} onClick={() => navigate('/app/today')}>
              Health Today
            </button>
          )}
          <button className={`btn btn-primary ${styles.navButton}`} onClick={handleStartInvestigation}>
            Get Started
          </button>
        </div>
      </nav>
      <main>

      {/* 2. Vibrant Hero Section */}
      <div className={styles.heroWrapper}>
        <div className={styles.heroGradientBg}></div>
        
        {/* Floating Abstract UI Elements */}
        <motion.div 
          className={styles.floatingCard1}
          animate={{ y: [0, -15, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        >
          <CheckCircle2 size={16} color="#00D4B2" /> Organizing evidence and questions...
        </motion.div>
        
        <motion.div 
          className={styles.floatingCard2}
          animate={{ y: [0, 20, 0] }}
          transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }}
        >
          <div className={styles.pulseDot}></div> Discussion Pathway Ready
        </motion.div>

        <div className={styles.heroContent}>
          <motion.div variants={containerVariants} initial="hidden" animate="show" className={styles.heroTextCenter}>
            <motion.div variants={itemVariants} className={styles.premiumBadge}>
              <Zap size={14} fill="currentColor" /> CLINICIAN-READY HEALTH ASSESSMENT
            </motion.div>
            
            <motion.h1 variants={itemVariants} className={styles.heroTitle}>
              Your Symptoms. <br/>
              <span className={styles.heroHighlight}>Finally Explained.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className={styles.heroDescription}>
              HealthChain is an AI-assisted health assessment engine that helps turn symptoms, records, and unanswered questions into a clearer case you can discuss with your clinician.
            </motion.p>
            
            <motion.div variants={itemVariants} className={styles.heroCtaGroup}>
              <button className={`btn btn-primary btn-lg ${styles.heroPrimaryBtn}`} onClick={handleStartInvestigation}>
                Get Started <ArrowRight size={18} />
              </button>
              <button className={`btn btn-outline btn-lg ${styles.heroSecondaryBtn}`} onClick={() => navigate('/pricing')}>
                View Pricing
              </button>
            </motion.div>

            <motion.div variants={itemVariants} className={styles.storeBadges}>
              <button className={styles.storeBadge} onClick={(e) => {
                const badge = e.currentTarget;
                const flash = badge.querySelector('.coming-soon-flash') as HTMLElement;
                if (flash) { flash.classList.remove('flash'); void flash.offsetWidth; flash.classList.add('flash'); }
              }}>
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path fill="#4caf50" d="M3.5,2.1C3.2,2.4,3,2.9,3,3.6v16.8c0,0.7,0.2,1.2,0.5,1.5l0.1,0.1l8.4-8.4v-0.2L3.6,2L3.5,2.1z"/>
                  <path fill="#ffeb3b" d="M15.4,14.6l-3.3-3.3l-0.2-0.2l3.5-3.5l0.1,0.1l3.9,2.2c1.1,0.6,1.1,1.7,0,2.3L15.4,14.6z"/>
                  <path fill="#f44336" d="M15.5,14.5l-3.4-3.4L3.6,22.1c0.4,0.4,1,0.5,1.6,0.1l10.3-5.9L15.5,14.5z"/>
                  <path fill="#2196f3" d="M15.5,9.5L5.2,3.6C4.6,3.3,4,3.4,3.6,3.8L12.1,13L15.5,9.5z"/>
                </svg>
                <div className={styles.storeBadgeText}>
                  <span className={styles.storeBadgeSmall}>GET IT ON</span>
                  <span className={styles.storeBadgeName}>Google Play</span>
                </div>
                <span className={styles.comingSoonTag}>Coming Soon</span>
                <span className="coming-soon-flash">Coming Soon</span>
              </button>
              <button className={styles.storeBadge} onClick={(e) => {
                const badge = e.currentTarget;
                const flash = badge.querySelector('.coming-soon-flash') as HTMLElement;
                if (flash) { flash.classList.remove('flash'); void flash.offsetWidth; flash.classList.add('flash'); }
              }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                <div className={styles.storeBadgeText}>
                  <span className={styles.storeBadgeSmall}>Download on the</span>
                  <span className={styles.storeBadgeName}>App Store</span>
                </div>
                <span className={styles.comingSoonTag}>Coming Soon</span>
                <span className="coming-soon-flash">Coming Soon</span>
              </button>
            </motion.div>

          </motion.div>
        </div>
      </div>

      {/* 3. Trusted By / Logos */}
      <div className={styles.logoMarqueeSection}>
        <p className={styles.logoMarqueeTitle}>DESIGNED TO HELP YOU REVIEW RELEVANT HEALTH INFORMATION</p>
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

      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <h3 className={styles.statValue}>Structured</h3>
            <p className={styles.statLabel}>Case information</p>
          </div>
          <div className={styles.statItem}>
            <h3 className={styles.statValue}>Multiple</h3>
            <p className={styles.statLabel}>AI perspectives</p>
          </div>
          <div className={styles.statItem}>
            <h3 className={styles.statValue}>Clearer</h3>
            <p className={styles.statLabel}>Appointment preparation</p>
          </div>
        </div>
      </section>

      {/* 4. The Problem */}
      <section className={styles.problemSection}>
        <motion.div 
          initial={{ opacity: 0, y: 40 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className={styles.problemContent}
        >
          <h2 className={styles.problemTitle}>
            When standard medicine hits a wall, you need a new approach.
          </h2>
          <p className={styles.problemText}>
            Appointments can be short and your health story can be complex. HealthChain helps you bring the important context, records, and questions together for the conversation.
          </p>
          <p className={styles.problemText} style={{ marginTop: '24px', color: '#0F172A', fontWeight: 600 }}>
            If your symptoms continue despite inconclusive results, a clear timeline and well-organized questions can make the next conversation more useful. Your clinician remains the decision-maker.
          </p>
        </motion.div>
      </section>

      {/* 5. Features Bento Box */}
      <section className={styles.bentoSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Complete Clinical Clarity</h2>
          <p className={styles.sectionSubtitle}>Everything you need to take control of your health journey.</p>
        </div>

        <div className={styles.bentoGrid}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className={`${styles.bentoCard} ${styles.bentoLarge}`}
          >
            <div className={styles.bentoIconBg} style={{background: 'var(--gradient-teal)'}}>
              <GitBranch size={24} color="#fff" />
            </div>
            <h3 className={styles.bentoTitle}>Health Assessment Engine</h3>
            <p className={styles.bentoDesc}>Organize complex, multi-system symptoms into possible connections, evidence gaps, and questions you can take to your clinician.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }}
            className={styles.bentoCard}
          >
            <div className={styles.bentoIconBg} style={{background: 'var(--gradient-purple)'}}>
              <Shield size={24} color="#fff" />
            </div>
            <h3 className={styles.bentoTitle}>Doctor-Ready Dossier</h3>
            <p className={styles.bentoDesc}>Export a focused case brief with your timeline, record highlights, uncertainty, and questions for a more productive clinician conversation.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }}
            className={styles.bentoCard}
          >
            <div className={styles.bentoIconBg} style={{background: 'var(--gradient-blue)'}}>
              <Search size={24} color="#fff" />
            </div>
            <h3 className={styles.bentoTitle}>Deep Research Hub</h3>
            <p className={styles.bentoDesc}>Keep your records, questions, and relevant research notes together so you can review them with a qualified clinician.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }}
            className={`${styles.bentoCard} ${styles.bentoWide}`}
          >
            <div className={styles.bentoIconBg} style={{background: 'var(--gradient-orange)'}}>
              <MessageSquare size={24} color="#fff" />
            </div>
            <h3 className={styles.bentoTitle}>Ava Health Buddy</h3>
            <p className={styles.bentoDesc}>A supportive companion for organizing questions, tracking your case, and preparing for next steps—not a replacement for urgent or professional care.</p>
          </motion.div>
        </div>
      </section>

      {/* 6. AI Brain Simulation */}
      <section className={styles.aiBrainSection}>
        <div className={styles.aiBrainContent}>
          <div className={styles.aiBrainText}>
            <h2>Multiple AI Perspectives. <br/>One Organized Case.</h2>
            <p>HealthChain organizes your case through multiple AI perspectives to surface questions, evidence gaps, and topics that may be useful to discuss with your clinician.</p>
          </div>
          <div className={styles.aiBrainVisual}>
             <div className={styles.nodeNetwork}>
                <div className={`${styles.node} ${styles.nodeCenter}`}></div>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`${styles.node} ${styles.nodeOrbit}`} style={{ '--i': i } as React.CSSProperties}></div>
                ))}
                <svg className={styles.nodeLines}>
                   <circle cx="150" cy="150" r="100" stroke="rgba(0,212,178,0.2)" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                   <circle cx="150" cy="150" r="140" stroke="rgba(0,212,178,0.1)" strokeWidth="1" fill="none" />
                </svg>
             </div>
          </div>
        </div>
      </section>

      {/* 7. How It Works */}
      <section id="how-it-works" className={styles.timelineSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>The Path to a Better Visit</h2>
        </div>

        <div className={styles.timelineContainer}>
          {[
            {
              step: '01',
              title: 'Upload Your Records',
              desc: 'Add your blood panels, MRI reports, and symptoms in plain English. Review your information before sharing it with a clinician.'
            },
            {
              step: '02',
              title: 'AI-Assisted Case Review',
              desc: 'Our engine organizes what you shared into possible discussion points, missing context, and questions for your next appointment.'
            },
            {
              step: '03',
              title: 'Take Action',
              desc: 'Take a structured case brief to your clinician and agree together on the most appropriate next step.'
            }
          ].map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
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
            transition={{ duration: 0.4 }}
            className={styles.testimonialContent}
          >
            <p className={styles.testimonialQuote}>{testimonials[activeTestimonial].quote}</p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialStars}>
                {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <h4>{testimonials[activeTestimonial].name}</h4>
              <span>{testimonials[activeTestimonial].location}</span>
            </div>
          </motion.div>
          
          <div className={styles.testimonialControls}>
            <button aria-label="Previous testimonial" onClick={() => setActiveTestimonial(p => (p === 0 ? testimonials.length - 1 : p - 1))} className={styles.controlBtn}><ChevronLeft size={24}/></button>
            <div className={styles.testimonialDots} role="tablist">
              {testimonials.map((_, i) => (
                <button key={i} aria-label={`Go to testimonial ${i + 1}`} role="tab" aria-selected={i === activeTestimonial} className={`${styles.dot} ${i === activeTestimonial ? styles.activeDot : ''}`} onClick={() => setActiveTestimonial(i)} />
              ))}
            </div>
            <button aria-label="Next testimonial" onClick={() => setActiveTestimonial(p => (p === testimonials.length - 1 ? 0 : p + 1))} className={styles.controlBtn}><ChevronRight size={24}/></button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
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
                {openFaq === i ? <ChevronUp size={20} className={styles.faqIcon} /> : <ChevronDown size={20} className={styles.faqIcon} />}
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

      {/* 9. Final CTA */}
      <section className={styles.finalCtaSection}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className={styles.finalCtaBox}
        >
          <div className={styles.finalCtaMesh}></div>
          <div className={styles.finalCtaContent}>
            <h2 className={styles.finalCtaTitle}>Ready to organize your health story?</h2>
            <p className={styles.finalCtaDesc}>Create a private case, prepare your questions, and take a clearer summary into your next clinician conversation.</p>
            <button className={`btn btn-primary btn-lg ${styles.finalCtaBtn}`} onClick={handleStartInvestigation}>
              Get Started <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </section>
      </main>

      {/* 10. Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <div className={styles.logoIconBg}><Activity size={20} className={styles.logoIcon} /></div> HealthChain
            </div>
            <p className={styles.footerBrandText}>AI-assisted health assessment and clinician-visit preparation, built for clarity and transparency.</p>
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
