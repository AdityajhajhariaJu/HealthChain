import { Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import styles from '../Landing.module.css';
import { CONSENSUS_DIALOGUE, SPECIALIST_TICKER, SYMPTOM_PRESETS } from '../landingContent';
import type { StartLandingReview } from '../landingTypes';

export default function LandingHero({ onStart }: { onStart: StartLandingReview }) {
  const [customInput, setCustomInput] = useState('');
  return (
    <div className={styles.heroWrapper}>
      <div className={styles.heroGradientBg}></div>

      <div className={styles.heroContent}>
        <div>
          {/* High-Tech Black Look Window Card with Continuous Specialist Ticker */}
          <div
            role="button"
            tabIndex={0}
            className={styles.darkTickerWindowCard}
            onClick={() => onStart('landing_ticker_window')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onStart('landing_ticker_window');
              }
            }}
          >
            <div className={styles.darkTickerPrefix}>
              <div className={styles.darkTickerLiveDot} />
              <span id="landing-perspective-board-label" className={styles.darkTickerPrefixLabel}>
                AI PERSPECTIVE BOARD
              </span>
            </div>
            <div className={styles.darkTickerDivider} />
            <div className={styles.darkTickerViewport} aria-hidden="true">
              <div className={styles.stockTickerTrack}>
                {[...SPECIALIST_TICKER, ...SPECIALIST_TICKER].map((spec, i) => (
                  <div
                    key={i}
                    className={styles.darkTickerItem}
                    aria-hidden={i >= SPECIALIST_TICKER.length}
                  >
                    <span className={styles.darkTickerIcon}>{spec.icon}</span>
                    <span className={styles.darkTickerName}>{spec.name}</span>
                    <span className={styles.darkTickerTag}>{spec.tag}</span>
                    <span className={styles.darkTickerDot}>•</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h1 className={styles.heroTitle}>
            Your Health Story. <br />
            <span className={styles.heroHighlight}>Finally Connected.</span>
          </h1>

          <p className={styles.heroDescription}>
            Bring scattered symptoms, records, and questions into one evolving case.
            HealthChain360.ai helps you understand what is documented, what remains uncertain, and
            what to discuss at your next appointment.
          </p>

          {/* Instant Symptom Input Box */}
          <div className={styles.heroInputContainer}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customInput.trim()) {
                  onStart('landing_hero_input', customInput.trim());
                } else {
                  onStart('landing_hero_input');
                }
              }}
              className={styles.heroInputBox}
            >
              <Search size={18} className={styles.heroInputIcon} />
              <input
                type="text"
                aria-label="Describe your symptoms or paste blood test results"
                placeholder="Type your symptoms or paste blood test results (e.g. chronic fatigue, morning headaches)..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className={styles.heroInputField}
                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
              />
              <button type="submit" className={styles.heroInputBtn}>
                <span>Start review →</span>
              </button>
            </form>
          </div>

          {/* 1-Tap Symptom Presets Bar */}
          <div className={styles.symptomChipsSection}>
            <div className={styles.symptomChipsHeader}>OR TAP A FREQUENT SYMPTOM TO BEGIN:</div>
            <div className={styles.symptomChipsGrid}>
              {SYMPTOM_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  className={styles.symptomChip}
                  onClick={() => onStart(`landing_chip_${idx}`, preset.symptom, preset.specialist)}
                >
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Live Consensus Simulation Card */}
          <div className={styles.consensusDemoCard}>
            <div className={styles.demoHeader}>
              <div className={styles.demoBadge}>
                <div className={styles.demoLiveDot} />
                <span>ILLUSTRATIVE MULTI-PERSPECTIVE REVIEW</span>
              </div>
              <div style={{ fontSize: '12px', color: '#71717A', fontWeight: 600 }}>
                Case #4120 • 35-yo Female (Post-Viral Fatigue)
              </div>
            </div>

            <div className={styles.demoChatArea}>
              {CONSENSUS_DIALOGUE.map((dialogue, dIdx) => (
                <div key={dIdx} className={styles.demoMessage}>
                  <div
                    className={styles.demoSpecialistIcon}
                    style={{ background: dialogue.bg, color: dialogue.color }}
                  >
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
                <span>Organizing documented facts, uncertainties, and clinician questions...</span>
              </div>
              <button
                className={styles.demoCtaMini}
                onClick={() =>
                  onStart('landing_consensus_demo', 'Post-viral chronic fatigue with normal labs')
                }
              >
                <span>Start with these symptoms →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
