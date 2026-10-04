import { Brain, ChevronDown, ChevronUp, FileText, Microscope, Shield } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HCLogo } from '../../../components/ui/HCLogo';
import styles from '../Landing.module.css';
import { landingFaqs } from '../landingContent';

export default function LandingInformation() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  return (
    <>
      <section className={styles.problemSection}>
        <div className={styles.problemContent}>
          <h2 className={styles.problemTitle}>
            Tired of hearing "All your tests are normal" while you still feel sick?
          </h2>
          <p className={styles.problemText}>
            Complex symptoms can span many appointments, records, and specialties. Repeating the
            story from memory makes it harder to preserve dates, exact findings, changes, and
            unanswered questions.
          </p>
          <p
            className={styles.problemText}
            style={{ marginTop: '10px', color: '#0F172A', fontWeight: 700 }}
          >
            HealthChain360.ai keeps your own report, source documents, AI-generated considerations,
            uncertainties, and clinician questions in one evolving case—so every return visit starts
            with context instead of a blank page.
          </p>
        </div>
      </section>
      <section className={styles.bentoSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.categoryBadge}>CONNECTED REVIEW</div>
          <h2 className={styles.sectionTitle}>Engineered for Complex Cases</h2>
          <p className={styles.sectionSubtitle}>
            A connected workflow for understanding records, preserving uncertainty, and preparing a
            focused appointment.
          </p>
        </div>

        <div className={styles.bentoGrid}>
          <div className={`${styles.bentoCard} ${styles.bentoLarge}`}>
            <div
              className={styles.bentoIconBg}
              style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#0284C7' }}
            >
              <Brain size={24} />
            </div>
            <h3 className={styles.bentoTitle}>Multi-Specialist AI Perspectives</h3>
            <p className={styles.bentoDesc}>
              AI perspective modules examine the same selected evidence through different specialty
              lenses, then organize overlaps, disagreements, and missing information for clinician
              review.
            </p>
          </div>

          <div className={styles.bentoCard}>
            <div
              className={styles.bentoIconBg}
              style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}
            >
              <Microscope size={24} />
            </div>
            <h3 className={styles.bentoTitle}>Biomarker Synthesis</h3>
            <p className={styles.bentoDesc}>
              Upload blood-test PDFs or photos. The engine extracts visible values, units, dates,
              and printed ranges, then flags items that need verification or context.
            </p>
          </div>

          <div className={styles.bentoCard}>
            <div
              className={styles.bentoIconBg}
              style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}
            >
              <Shield size={24} />
            </div>
            <h3 className={styles.bentoTitle}>Grounded Evidence</h3>
            <p className={styles.bentoDesc}>
              When literature or trial records are retrieved, source links stay attached.
              Unsupported statements are marked as AI considerations rather than established facts.
            </p>
          </div>

          <div className={`${styles.bentoCard} ${styles.bentoLarge}`}>
            <div
              className={styles.bentoIconBg}
              style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}
            >
              <FileText size={24} />
            </div>
            <h3 className={styles.bentoTitle}>Doctor-Ready Consultation Dossier</h3>
            <p className={styles.bentoDesc}>
              Export an organized visit summary with your main concern, timeline, documented facts,
              missing information, and prioritized questions.
            </p>
          </div>
        </div>
      </section>
      <section className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <p className={styles.sectionSubtitle}>
            Everything you need to know about the platform and your privacy.
          </p>
        </div>
        <div className={styles.faqList}>
          {landingFaqs.map((faq, i) => (
            <div key={i} className={`${styles.faqItem} ${openFaq === i ? styles.faqItemOpen : ''}`}>
              <button
                id={`landing-faq-question-${i}`}
                aria-controls={`landing-faq-answer-${i}`}
                aria-expanded={openFaq === i}
                className={styles.faqButton}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className={styles.faqQuestion}>{faq.question}</span>
                {openFaq === i ? (
                  <ChevronUp size={18} className={styles.faqIcon} />
                ) : (
                  <ChevronDown size={18} className={styles.faqIcon} />
                )}
              </button>
              <div
                id={`landing-faq-answer-${i}`}
                role="region"
                aria-labelledby={`landing-faq-question-${i}`}
                hidden={openFaq !== i}
                className={styles.faqAnswer}
              >
                {faq.answer}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div>
          <div className={styles.footerLogo}>
            <HCLogo size={26} />
            <span>HealthChain360.ai</span>
          </div>
          <p className={styles.footerBrandText}>
            AI-assisted record organization and clinician-visit preparation, built for clarity and
            user control.
          </p>
        </div>
        <div className={styles.footerLinks}>
          <h3>Product</h3>
          <Link to="/app/today">Health Today</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/changelog">Changelog</Link>
        </div>
        <div className={styles.footerLinks}>
          <h3>Company</h3>
          <Link to="/terms-policies">All policies</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <a href="mailto:healthchain360@gmail.com">Contact Us</a>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <p>© {new Date().getFullYear()} HealthChain360.ai. All rights reserved.</p>
      </div>
    </footer>
  );
}
