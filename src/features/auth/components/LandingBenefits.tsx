import styles from '../Landing.module.css';
import type { StartLandingReview } from '../landingTypes';

export default function LandingBenefits({ onStart }: { onStart: StartLandingReview }) {
  return (
    <section className={styles.statsSection}>
      <div className={styles.sectionHeader} style={{ marginBottom: '24px' }}>
        <h2 className={styles.statsMainTitle}>
          What Your Review Keeps Visible <br />
          <span className={styles.heroHighlight}>Facts, Limits and Next Questions</span>
        </h2>
        <p className={styles.statsMainSubtitle}>
          Move from scattered information to a case you can revisit. Each review keeps source
          details, uncertainties, and appointment questions visible.
        </p>
      </div>

      <div className={styles.statsGrid}>
        {/* Metric Card 1: Speedometer Gauge */}
        <div className={styles.statItem}>
          <div className={styles.statGraphicWrapper}>
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 200 120"
              className={styles.statSvg}
              fill="none"
            >
              <path
                d="M 30 105 A 68 68 0 0 1 170 105"
                stroke="rgba(16, 185, 129, 0.15)"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M 30 105 A 68 68 0 0 1 155 48"
                stroke="#059669"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <g>
                <line
                  x1="100"
                  y1="100"
                  x2="146"
                  y2="46"
                  stroke="#334155"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </g>
              <circle cx="100" cy="100" r="5" fill="#FFFFFF" stroke="#059669" strokeWidth="3" />
            </svg>
          </div>
          <div className={styles.statValueRow}>
            <span className={styles.statNumber}>Clear</span>
            <span className={styles.statTrend}>↗</span>
          </div>
          <h3 className={styles.statTitle}>Evidence Boundaries</h3>
          <p className={styles.statDesc}>
            Reported information, record findings, AI considerations, and unknowns stay visibly
            distinct.
          </p>
          <button className={styles.statCtaLink} onClick={() => onStart('stats_card_1')}>
            Start Free Review →
          </button>
        </div>

        {/* Metric Card 2: Ascending Bar Chart */}
        <div className={styles.statItem}>
          <div className={styles.statGraphicWrapper}>
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 200 120"
              className={styles.statSvg}
              fill="none"
            >
              {[
                { x: 25, y: 75, h: 35, bg: 'rgba(16, 185, 129, 0.2)' },
                { x: 52, y: 60, h: 50, bg: 'rgba(16, 185, 129, 0.3)' },
                { x: 79, y: 48, h: 62, bg: 'rgba(16, 185, 129, 0.45)' },
                { x: 106, y: 38, h: 72, bg: 'rgba(16, 185, 129, 0.6)' },
                { x: 133, y: 24, h: 86, bg: 'rgba(16, 185, 129, 0.75)' },
                { x: 160, y: 10, h: 100, bg: '#059669' },
              ].map((bar, bIdx) => (
                <rect
                  key={bIdx}
                  x={bar.x}
                  y={bar.y}
                  width="16"
                  height={bar.h}
                  rx="8"
                  fill={bar.bg}
                />
              ))}
            </svg>
          </div>
          <div className={styles.statValueRow}>
            <span className={styles.statNumber}>One</span>
            <span className={styles.statTrend}>↗</span>
          </div>
          <h3 className={styles.statTitle}>Evidence Breadth</h3>
          <p className={styles.statDesc}>
            Keeps your timeline, documents, daily updates, and appointment preparation in one
            connected case.
          </p>
          <button className={styles.statCtaLink} onClick={() => onStart('stats_card_2')}>
            Start Free Review →
          </button>
        </div>

        {/* Metric Card 3: Smooth Spline Trend Line */}
        <div className={styles.statItem}>
          <div className={styles.statGraphicWrapper}>
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 200 120"
              className={styles.statSvg}
              fill="none"
            >
              <path
                d="M 20 85 Q 50 82 70 58 T 120 65 T 180 18"
                stroke="#10B981"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="180" cy="18" r="10" fill="rgba(16, 185, 129, 0.25)" />
              <circle cx="180" cy="18" r="6" fill="#FFFFFF" stroke="#059669" strokeWidth="3" />
            </svg>
          </div>
          <div className={styles.statValueRow}>
            <span className={styles.statNumber}>Reusable</span>
            <span className={styles.statTrend}>↗</span>
          </div>
          <h3 className={styles.statTitle}>Synthesized Dossier</h3>
          <p className={styles.statDesc}>
            Organizes fragmented blood tests and symptoms into a reusable clinician brief while
            keeping source details visible.
          </p>
          <button className={styles.statCtaLink} onClick={() => onStart('stats_card_3')}>
            Start Free Review →
          </button>
        </div>
      </div>
    </section>
  );
}
