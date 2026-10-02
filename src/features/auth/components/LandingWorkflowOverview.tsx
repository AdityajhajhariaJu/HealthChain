import { ArrowRight, Eye, ShieldCheck } from 'lucide-react';
import styles from '../Landing.module.css';
import { BENTO_COL_LEFT, BENTO_COL_RIGHT } from '../landingContent';
import type { StartLandingReview } from '../landingTypes';

const overviewCards = [...BENTO_COL_LEFT, ...BENTO_COL_RIGHT];

export default function LandingWorkflowOverview({ onStart }: { onStart: StartLandingReview }) {
  return (
    <section className={styles.bentoShowcaseSection}>
      <div className={styles.bentoContainerCard}>
        <div className={styles.bentoTopBadgeRow}>
          <span className={styles.bentoTopBadge}>CONNECTED CASE WORKFLOW</span>
        </div>
        <div className={styles.bentoHeaderRow}>
          <div className={styles.bentoHeaderTitleArea}>
            <div className={styles.bentoHeaderIcon}>
              <Eye size={20} color="#059669" aria-hidden="true" />
            </div>
            <h2 className={styles.bentoHeaderTitle}>From scattered records to one case</h2>
          </div>
          <p className={styles.bentoHeaderSubtitle}>
            <strong>One continuous workflow.</strong> Keep records, personal notes, AI
            considerations, uncertainties and appointment questions connected. These examples
            explain the workflow; they are not your health data.
          </p>
        </div>
        <div
          className={styles.workflowOverviewGrid}
          role="region"
          aria-label="Connected case workflow examples"
        >
          {overviewCards.map((card) => (
            <article
              key={card.id}
              className={`${styles.bentoCard} ${card.type === 'privacy' ? styles.bentoCardPrivacy : ''}`}
            >
              {'img' in card && (
                <div className={styles.bentoImgWrapper}>
                  <img
                    src={card.img}
                    alt=""
                    className={styles.bentoImg}
                    loading="lazy"
                    decoding="async"
                    width={600}
                    height={300}
                    onError={(event) => {
                      const image = event.currentTarget;
                      const fallback = '/images/immersive/doctor-biomarker.png';
                      if (image.getAttribute('src') === fallback) image.hidden = true;
                      else image.src = fallback;
                    }}
                  />
                  <div className={styles.bentoImgOverlay} />
                </div>
              )}
              {card.type === 'privacy' && (
                <div className={styles.bentoPrivacyIconBg}>
                  <ShieldCheck size={28} color="#059669" aria-hidden="true" />
                </div>
              )}
              <div className={styles.bentoCardBody}>
                <div className={styles.bentoCardTags}>
                  <span className={styles.bentoCategoryTag}>{card.tag}</span>
                  <span className={styles.bentoStatusTag}>{card.status}</span>
                </div>
                <h3 className={styles.bentoCardTitle}>{card.title}</h3>
                <p className={styles.bentoCardDesc}>{card.desc}</p>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.bentoBottomCta}>
          <button
            type="button"
            className={styles.bentoCtaButton}
            onClick={() => onStart('bento_bottom_cta')}
          >
            <span>Start Free Case Dossier</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
