import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Shield,
  Zap,
  GitBranch,
  Github,
  Twitter,
  Mail,
  Leaf,
} from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './Landing.module.css';

export default function Landing() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  return (
    <div className={styles.container}>
      {/* Main Content Area */}
      <nav className={styles.nav}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className={styles.logoContainer}
        >
          <Activity size={24} color="var(--teal)" />
          <span className={styles.logoText}>
            HealthChain
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className={styles.navActions}
        >
          <button className="btn btn-primary btn-sm glow-transition" onClick={() => navigate('/signup')}>
            Apply for Case Review
          </button>
        </motion.div>
      </nav>

      {/* Hero Section - Split Layout */}
      <div className={styles.heroSection}>
        {/* Left: Text Content */}
        <motion.div variants={containerVariants} initial="hidden" animate="show">
          <motion.div
            variants={itemVariants}
            className={`badge badge-teal ${styles.badgeMargin}`}
          >
            <Shield size={12} /> Premium Medical Investigation
          </motion.div>
          <motion.h1
            variants={itemVariants}
            className={styles.heroTitle}
          >
            The Ultimate
            <br />
            <span className={styles.highlightText}>Diagnostic Journey</span>.
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className={styles.heroDescription}
          >
            An elite concierge investigation into your chronic symptoms. We build your case file, cross-reference medical literature, and deliver a heavily-cited clinical dossier to find your root cause.
          </motion.p>
          <motion.div
            variants={itemVariants}
            className={styles.ctaContainer}
          >
            <button
              className={`btn btn-primary btn-lg hover-scale glow-transition ${styles.ctaButton}`}
              onClick={() => navigate('/signup')}
            >
              Apply for Case Review <ArrowRight size={18} />
            </button>
          </motion.div>
        </motion.div>

        {/* Right: Image Composition */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={styles.heroImageContainer}
        >
          {/* Main Doctor Image */}
          <div className={styles.mainDoctorImage}>
            <img
              src="/images/doctor_hero.png"
              alt="Healthcare Professional"
              className={styles.imageFill}
            />
          </div>

          {/* Floating Nature Image */}
          <motion.div
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className={styles.floatingNatureImage}
          >
            <img
              src="/images/nature_calm.png"
              alt="Health Intelligence"
              className={styles.imageFill}
            />
            <div className={`badge badge-teal ${styles.floatingBadge}`}>
              <Activity size={12} /> Health Intelligence
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Marketing Hook Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.8 }}
        className={styles.marketingSection}
      >
        <h2 className={styles.marketingTitle}>
          "Why is this happening to me?
          <br />
          <span className={styles.marketingTitleMuted}>What is wrong with my body?"</span>
        </h2>
        <p className={styles.marketingDesc}>
          You’ve explained your symptoms to five different doctors. Your labs come back "normal,"
          but you still feel terrible. You aren't crazy, and it isn't in your head.
        </p>
        <div className={styles.marketingBox}>
          <p className={styles.marketingBoxText}>
            Stop guessing in the dark. Let HealthChain act as your medical detective to connect the
            dots they missed and finally build your case file with actual deep reasoning and
            solution.
          </p>
        </div>
      </motion.div>

      {/* Features */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
        className={styles.featuresGrid}
      >
        {[
          {
            icon: <GitBranch size={24} color="var(--teal)" />,
            title: 'Chain Investigation',
            desc: 'We trace every symptom back to one root cause using peer-reviewed medical literature.',
          },
          {
            icon: <Shield size={24} color="var(--teal)" />,
            title: 'Clinical Dossier',
            desc: 'Receive a heavily-cited, doctor-ready PDF report of your case and exact next steps.',
          },
          {
            icon: <Zap size={24} color="var(--teal)" />,
            title: 'MDT Review',
            desc: 'Your case is cross-examined by specialized AI agents acting as a medical board.',
          },
        ].map((f, i) => (
          <motion.div
            key={i}
            variants={itemVariants as any}
            whileHover={{ y: -5, boxShadow: 'var(--shadow-md)' }}
            className={`card ${styles.featureCard}`}
          >
            <div className={styles.featureIconWrapper}>
              {f.icon}
            </div>
            <h3 className={styles.featureTitle}>
              {f.title}
            </h3>
            <p className={styles.featureDesc}>
              {f.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Large CTA Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className={styles.ctaBannerSection}
      >
        <div className={styles.ctaBannerBox}>
          <h2 className={styles.ctaBannerTitle}>
            Ready to break the cycle?
          </h2>
          <p className={styles.ctaBannerDesc}>
            Join thousands of patients who finally found their answers using our advanced clinical
            mapping technology.
          </p>
          <button
            className={`btn btn-primary btn-lg ${styles.ctaBannerButton}`}
            onClick={() => navigate('/app')}
          >
            Invest in your health <ArrowRight size={18} className={styles.ctaBannerButtonIcon} />
          </button>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogoContainer}>
              <Activity size={24} color="var(--teal)" />
              <span className={styles.footerLogoText}>
                HealthChain
              </span>
            </div>
            <p className={styles.footerBrandDesc}>
              The world's most advanced AI diagnostic navigator. Built for transparency, speed, and
              accuracy in modern healthcare, combining clinical science with natural well-being.
            </p>
          </div>

          <div className={styles.footerLinksContainer}>
            <div>
              <h4 className={styles.footerSectionTitle}>Product</h4>
              <div className={styles.footerLinks}>
                <a href="/login" className={styles.footerLink}>Health-Chain AI</a>
                <a href="/changelog" className={styles.footerLink}>Changelog</a>
                <a href="/pricing" className={styles.footerLink}>Pricing</a>
                <a href="/help" className={styles.footerLink}>Help Center</a>
              </div>
            </div>
            <div>
              <h4 className={styles.footerSectionTitle}>Company</h4>
              <div className={styles.footerLinks}>
                <a href="/terms" className={styles.footerLink}>Terms</a>
                <a href="/privacy" className={styles.footerLink}>Privacy</a>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div>© {new Date().getFullYear()} HealthChain. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
