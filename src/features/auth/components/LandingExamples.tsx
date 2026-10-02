import { ArrowRight, Brain, Eye, Layers, Microscope, ShieldAlert, Sparkles } from 'lucide-react';
import {
  getLandingWorkflowScenarios,
  type LandingWorkflowScenario,
} from '../../../data/LandingWorkflowScenarios';
import { triggerHapticLight } from '../../../services/haptics';
import styles from '../Landing.module.css';
import { LATEST_ACTIVITIES } from '../landingContent';
import type { StartLandingReview } from '../landingTypes';

export default function LandingExamples({
  onInspect,
  onLaunch,
  onStart,
}: {
  onInspect: (scenario: LandingWorkflowScenario) => void;
  onLaunch: (id: string) => void;
  onStart: StartLandingReview;
}) {
  const workflowScenarios = getLandingWorkflowScenarios();
  return (
    <section className={styles.casesSection}>
      <div className={styles.workflowSectionHeader}>
        <div className={styles.workflowBadgeBanner}>
          <Brain size={14} /> USEFUL REASONING • WORKFLOW DESIGNS
        </div>
        <h2 className={styles.sectionTitle}>When the story is complex, organize the questions</h2>
        <p className={styles.sectionSubtitle} style={{ marginBottom: 6 }}>
          Explore clearly labeled examples of turning symptoms, dates, measurements, and records
          into a reviewable case for a clinician visit.
        </p>
        <div className={styles.workflowMandatoryDisclaimer}>
          "These are workflow designs using the illustrated scenarios, not conclusions about a
          patient."
        </div>
      </div>

      {/* Case Cards Grid / Feed */}
      <div className={styles.casesFeed}>
        {workflowScenarios.map((item, idx) => (
          <div
            key={item.id}
            className={`${styles.caseCard} ${idx === 0 ? styles.caseCardTop1 : idx === 1 ? styles.caseCardTop2 : idx === 2 ? styles.caseCardTop3 : ''}`}
          >
            <div
              className={`${styles.caseRankBadge} ${idx === 0 ? styles.caseRank1 : idx === 1 ? styles.caseRank2 : idx === 2 ? styles.caseRank3 : ''}`}
            >
              {item.rank}
            </div>
            <div className={styles.caseCardBody}>
              <div className={styles.caseCardHeader}>
                <div className={styles.caseTitleRow}>
                  <span className={styles.caseIcon}>{item.icon}</span>
                  <h3 className={styles.caseTitle}>{item.title}</h3>
                </div>
                <span className={styles.caseMatchScore}>Workflow Design</span>
              </div>

              <div className={styles.workflowCardColumns}>
                {/* Pillar 1: What to Connect */}
                <div className={styles.workflowConnectSection}>
                  <div className={styles.workflowConnectTitle}>
                    <Layers size={13} color="#059669" />
                    <span>Information to keep together</span>
                  </div>
                  <div className={styles.workflowConnectPills}>
                    {item.whatToConnect.map((conn, cIdx) => (
                      <span key={cIdx} className={styles.workflowConnectPill}>
                        <span>{conn.icon}</span>
                        <span>{conn.tag}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pillar 2: What to Keep Separate */}
                <div className={styles.workflowBoundaryBox}>
                  <div className={styles.workflowBoundaryTitle}>
                    <ShieldAlert size={14} color="#D97706" />
                    <span>What the records leave open</span>
                  </div>
                  <div className={styles.workflowBoundaryContent}>
                    <strong>{item.epistemicBoundary.boundaryTitle}:</strong>{' '}
                    {item.epistemicBoundary.whatToKeepSeparate}
                  </div>
                </div>

                {/* Pillar 3: Valuable Final Output */}
                <div className={styles.workflowOutputBox}>
                  <div className={styles.workflowOutputTitle}>
                    <Sparkles size={13} color="#166534" />
                    <span>Questions and notes for the visit</span>
                  </div>
                  <div className={styles.workflowOutputQuote}>
                    "{item.valuableOutput.clinicianQuote}"
                  </div>
                </div>
              </div>

              <div className={styles.caseCardFooter}>
                <div className={styles.caseSpecialistMeta}>
                  <span
                    className={styles.caseSpecialistLabel}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Microscope size={13} color="#059669" />
                    <span>{item.specialistTag}</span>
                  </span>
                  <span>•</span>
                  <span>Case Simulation</span>
                </div>
                <div className={styles.workflowCardButtons}>
                  <button
                    type="button"
                    className={styles.workflowInspectBtn}
                    onClick={() => {
                      triggerHapticLight();
                      onInspect(item);
                    }}
                  >
                    <Eye size={13} />
                    <span>Inspect Reasoning Design</span>
                  </button>
                  <button
                    type="button"
                    className={styles.workflowLaunchBtn}
                    onClick={() => onLaunch(item.id)}
                  >
                    <span>Try with this scenario</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Latest Clinical Consensus Activity Bar */}
        <div className={styles.latestConsensusBar}>
          <div className={styles.consensusBarTitle}>
            <span className={styles.liveActivityPulse}>●</span>
            <span>USEFUL STARTING TEMPLATES</span>
          </div>
          <div className={styles.consensusPills}>
            {LATEST_ACTIVITIES.map((act, aIdx) => (
              <button
                type="button"
                key={aIdx}
                className={styles.consensusPill}
                onClick={() => onStart(`activity_pill_${aIdx}`, act.symptom, act.specId)}
              >
                <span>{act.icon}</span>
                <span>{act.text}</span>
                <span className={styles.consensusPillTime}>· {act.time}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
