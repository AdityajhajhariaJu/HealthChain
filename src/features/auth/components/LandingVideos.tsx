import { ArrowRight, Play } from 'lucide-react';
import styles from '../Landing.module.css';
import type { StartLandingReview } from '../landingTypes';
import DemoVideoPlayer from './DemoVideoPlayer';

export default function LandingVideos({ onStart }: { onStart: StartLandingReview }) {
  return (
    <section className={styles.videoShowcaseSection}>
      <div className={styles.sectionHeader}>
        <div
          className={styles.categoryBadge}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Play size={12} fill="#059669" color="#059669" />
          <span>MULTI-SPECIALIST AI DEMO</span>
        </div>
        <h2 className={styles.sectionTitle}>See HealthChain360.ai in Action</h2>
        <p className={styles.sectionSubtitle}>
          Watch how several AI perspectives organize symptoms, printed lab values, and medical
          history for clinician review.
        </p>
      </div>

      <div className={styles.videoGrid}>
        {/* Video 1 */}
        <div className={styles.videoCard}>
          <DemoVideoPlayer
            src="/videos/healthchain-overview.mp4"
            poster="/videos/healthchain-overview-poster.jpg"
            alt="AI perspective review demonstration"
          />
          <div className={styles.videoMeta}>
            <div className={styles.videoBadge}>DEMO 1 • OVERVIEW</div>
            <h3 className={styles.videoTitle}>AI Perspective Review</h3>
            <p className={styles.videoDesc}>
              Watch how several specialty perspectives can organize the same evidence, expose
              disagreements, and identify questions that need clinician review.
            </p>
            <button
              className={styles.videoCta}
              onClick={() => onStart('landing_video_1', 'AI Perspective Review')}
            >
              <span>Try this scenario</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Video 2 */}
        <div className={styles.videoCard}>
          <DemoVideoPlayer
            src="/videos/specialist-board-demo.mp4"
            poster="/videos/specialist-board-demo-poster.jpg"
            alt="From Symptoms to Doctor-Ready Dossier Demo"
          />
          <div className={styles.videoMeta}>
            <div className={styles.videoBadge}>DEMO 2 • WORKFLOW</div>
            <h3 className={styles.videoTitle}>From Symptoms to Doctor-Ready Dossier</h3>
            <p className={styles.videoDesc}>
              See how blood panels and symptoms become a structured possibility list and
              doctor-ready discussion points.
            </p>
            <button
              className={styles.videoCta}
              onClick={() => onStart('landing_video_2', 'Full Lab & Symptom Dossier')}
            >
              <span>Generate clinical brief</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
