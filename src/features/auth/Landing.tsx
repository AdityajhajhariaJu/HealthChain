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
  Pill,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Star,
  CheckCircle2
} from 'lucide-react';
import { motion, useInView, animate } from 'framer-motion';
import styles from './Landing.module.css';

// --- Sub-components for dynamic elements ---

const AnimatedCounter = ({ from, to, duration = 2, suffix = '' }: { from: number, to: number, duration?: number, suffix?: string }) => {
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
    answer: "No. HealthChain is an AI-powered diagnostic navigator. It is designed to help you organize your medical history, explore potential diagnostic pathways, and prepare for specialist visits. It does not provide definitive medical diagnoses or treatments."
  },
  {
    question: "How is my medical data secured?",
    answer: "Your privacy is our top priority. HealthChain uses enterprise-grade encryption for all data at rest and in transit. By default, your data is stored locally in your browser unless you explicitly create an account for cloud sync."
  },
  {
    question: "How does the MDT Consensus Hub work?",
    answer: "The Multidisciplinary Team (MDT) Consensus Hub simulates a consultation between multiple AI specialist agents (e.g., Cardiology, Neurology, Endocrinology) who review your case, debate findings, and provide a unified recommendation report."
  },
  {
    question: "Are the AI agents trained on real medical literature?",
    answer: "Yes, our reasoning engines are deeply integrated with PubMed, ClinicalTrials.gov, and OMIM, ensuring that every insight is backed by peer-reviewed research and cited accordingly."
  }
];

// --- Main Landing Component ---

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      quote: "After 4 years and 7 different specialists telling me everything was 'normal', HealthChain's AI traced my symptoms to a rare autoimmune marker in seconds. I finally have my life back.",
      name: "Sarah M.",
      location: "New York",
      rating: 5
    },
    {
      quote: "The clinical dossier it produced was so comprehensive that my primary care doctor actually asked what platform I used. It completely changed the direction of my treatment.",
      name: "Rajesh K.",
      location: "Mumbai",
      rating: 5
    },
    {
      quote: "I was overwhelmed by all the conflicting medical advice online. HealthChain cut through the noise and gave me a heavily-cited, evidence-based path forward.",
      name: "Elena V.",
      location: "London",
      rating: 5
    }
  ];

  return (
    <div className={styles.container}>
      
      {/* 1. Floating Glass Navbar */}
      <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.logoContainer}>
          <div className={styles.logoIconBg}><Activity size={20} className={styles.logoIcon} /></div>
          <span className={styles.logoText}>HealthChain</span>
        </div>
        <div className={styles.navActions}>
          <button className={`btn ${styles.navLoginButton}`} onClick={() => navigate('/login')}>
            Log In
          </button>
          <button className={`btn btn-primary ${styles.navButton}`} onClick={() => navigate('/signup')}>
            Start Investigation
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
          <CheckCircle2 size={16} color="#00D4B2" /> Analyzing 50M+ Papers...
        </motion.div>
        
        <motion.div 
          className={styles.floatingCard2}
          animate={{ y: [0, 20, 0] }}
          transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }}
        >
          <div className={styles.pulseDot}></div> Root Cause Identified
        </motion.div>

        <div className={styles.heroContent}>
          <motion.div variants={containerVariants} initial="hidden" animate="show" className={styles.heroTextCenter}>
            <motion.div variants={itemVariants} className={styles.premiumBadge}>
              <Zap size={14} fill="currentColor" /> The Medical AI Standard
            </motion.div>
            
            <motion.h1 variants={itemVariants} className={styles.heroTitle}>
              Your Symptoms. <br/>
              <span className={styles.heroHighlight}>Finally Explained.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className={styles.heroDescription}>
              HealthChain is an elite medical investigation engine. We cross-reference your case against the entirety of published medical literature to find the root cause your doctors missed.
            </motion.p>
            
            <motion.div variants={itemVariants} className={styles.heroCtaGroup}>
                <button className={`btn btn-primary btn-lg ${styles.heroPrimaryBtn}`} onClick={() => navigate('/signup')}>
                  Start Your Investigation <ArrowRight size={18} />
                </button>
                <button className={`btn btn-outline btn-lg ${styles.heroSecondaryBtn}`} onClick={() => navigate('/pricing')}>
                  View Pricing
                </button>
              </motion.div>
          </motion.div>
        </div>
      </div>

      {/* 3. Trusted By / Logos */}
      <div className={styles.logoMarqueeSection}>
        <p className={styles.logoMarqueeTitle}>BUILT ON THE WORLD'S LEADING CLINICAL DATABASES</p>
        <div className={styles.marqueeContainer}>
          <div className={styles.marqueeTrack}>
            <span className={styles.textLogo}>PubMed</span>
            <span className={styles.textLogo}>NIH</span>
            <span className={styles.textLogo}>Google Gemini</span>
            <span className={styles.textLogo}>ClinicalTrials.gov</span>
            <span className={styles.textLogo}>OMIM</span>
            <span className={styles.textLogo}>Cochrane Library</span>
            {/* Duplicate for infinite scroll */}
            <span className={styles.textLogo} aria-hidden="true">PubMed</span>
            <span className={styles.textLogo} aria-hidden="true">NIH</span>
            <span className={styles.textLogo} aria-hidden="true">Google Gemini</span>
            <span className={styles.textLogo} aria-hidden="true">ClinicalTrials.gov</span>
            <span className={styles.textLogo} aria-hidden="true">OMIM</span>
            <span className={styles.textLogo} aria-hidden="true">Cochrane Library</span>
          </div>
        </div>
      </div>

      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <h3 className={styles.statValue}><AnimatedCounter from={0} to={50} suffix="M+" /></h3>
            <p className={styles.statLabel}>Papers Indexed</p>
          </div>
          <div className={styles.statItem}>
            <h3 className={styles.statValue}><AnimatedCounter from={0} to={12} /></h3>
            <p className={styles.statLabel}>Specialist Agents</p>
          </div>
          <div className={styles.statItem}>
            <h3 className={styles.statValue}>&lt;<AnimatedCounter from={0} to={3} suffix="m" /></h3>
            <p className={styles.statLabel}>Avg Analysis Time</p>
          </div>
        </div>
      </section>

      {/* 4. The Problem (Emotional Hook) */}
      <section className={styles.problemSection}>
        <motion.div 
          initial={{ opacity: 0, y: 40 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className={styles.problemContent}
        >
          <h2 className={styles.problemTitle}>
            Traditional healthcare is fundamentally broken.
          </h2>
          <p className={styles.problemText}>
            Doctors have 8 minutes per patient. They don't have the time to connect the complex dots of chronic, multi-systemic illness. You've seen 5 doctors. Your labs are "normal." But you still feel terrible. You are not crazy. You just need a better detective.
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
            <h3 className={styles.bentoTitle}>Chain Investigation Engine</h3>
            <p className={styles.bentoDesc}>Trace complex, multi-systemic symptoms back to a single root cause using our proprietary cross-referencing algorithm that scans millions of biomedical papers instantly.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }}
            className={styles.bentoCard}
          >
            <div className={styles.bentoIconBg} style={{background: 'var(--gradient-purple)'}}>
              <Shield size={24} color="#fff" />
            </div>
            <h3 className={styles.bentoTitle}>Doctor-Ready Dossier</h3>
            <p className={styles.bentoDesc}>Export a robust, fully-cited PDF report to hand directly to your doctor to command immediate respect and action.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }}
            className={styles.bentoCard}
          >
            <div className={styles.bentoIconBg} style={{background: 'var(--gradient-blue)'}}>
              <Search size={24} color="#fff" />
            </div>
            <h3 className={styles.bentoTitle}>Deep Research Hub</h3>
            <p className={styles.bentoDesc}>Direct integration with global medical literature, active clinical trials, and genome databases.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }}
            className={`${styles.bentoCard} ${styles.bentoWide}`}
          >
            <div className={styles.bentoIconBg} style={{background: 'var(--gradient-orange)'}}>
              <MessageSquare size={24} color="#fff" />
            </div>
            <h3 className={styles.bentoTitle}>Ava Health Buddy</h3>
            <p className={styles.bentoDesc}>A 24/7 intelligent companion that remembers your entire medical history. Ask any question about your case, explore treatment alternatives, or simply get empathetic support when you're feeling overwhelmed.</p>
          </motion.div>
        </div>
      </section>

      {/* 6. AI Brain Simulation */}
      <section className={styles.aiBrainSection}>
        <div className={styles.aiBrainContent}>
          <div className={styles.aiBrainText}>
            <h2>12 Specialist Agents. <br/>Working Synchronously.</h2>
            <p>The moment you upload your data, HealthChain activates an entire Multi-Disciplinary Team (MDT). Rheumatology, Neurology, Endocrinology, and 9 other specialized AI agents cross-examine your case simultaneously.</p>
          </div>
          <div className={styles.aiBrainVisual}>
             {/* Abstract Node Network */}
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

      {/* 7. How It Works (Timeline) */}
      <section id="how-it-works" className={styles.timelineSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>The Path to Answers</h2>
        </div>

        <div className={styles.timelineContainer}>
          {[
            {
              step: '01',
              title: 'Upload Your Records',
              desc: 'Securely upload your blood panels, MRI reports, or simply describe your symptoms in plain English.'
            },
            {
              step: '02',
              title: 'AI Cross-Examination',
              desc: 'Our engine queries millions of peer-reviewed papers for rare correlations matching your unique profile.'
            },
            {
              step: '03',
              title: 'Take Action',
              desc: 'Receive your personalized, heavily-cited clinical dossier. Book the right specialist, demand the right tests.'
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
              <h2 className={styles.finalCtaTitle}>Ready to find your root cause?</h2>
              <p className={styles.finalCtaDesc}>Join thousands of patients who took back control of their health.</p>
              <button className={`btn btn-primary btn-lg ${styles.finalCtaBtn}`} onClick={() => navigate('/signup')}>
                Create Free Account <ArrowRight size={18} />
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
            <p className={styles.footerBrandText}>The world's most advanced AI diagnostic navigator. Built for transparency, speed, and accuracy.</p>
          </div>
          <div className={styles.footerLinks}>
            <h4>Product</h4>
            <Link to="/login">AI Engine</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/changelog">Changelog</Link>
          </div>
          <div className={styles.footerLinks}>
            <h4>Company</h4>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <a href="mailto:support@healthchain360.com">Contact Us</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} HealthChain. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
