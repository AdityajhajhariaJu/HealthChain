import {
  BookOpen,
  BrainCircuit,
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  GitMerge,
  MessageCircle,
  Network,
  Sparkles,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClinicalReasoningPipelineView } from '../../components/ui/ClinicalReasoningPipelineView';
import { MeaningfulMultiPerspectiveView } from '../../components/ui/MeaningfulMultiPerspectiveView';
import {
  SourcePassageModal,
  type SourcePassageModalProps,
} from '../../components/ui/SourcePassageModal';
import { StructuredAnswerView } from '../../components/ui/StructuredAnswerView';
import { useToast } from '../../components/ui/ToastProvider';
import { useClinicalDailySourceFreshness } from '../../hooks/useClinicalDailySourceFreshness';
import { useIsMobile } from '../../hooks/useIsMobile';
import { CaseItem } from '../../services/CaseEngine';

import { runClinicalReasoningPipeline } from '../../services/ClinicalReasoningEngine';
import { triggerHapticLight } from '../../services/haptics';
import {
  buildVersionedEvidenceSet,
  executeBoundedComparison,
  generateMeaningfulPerspectives,
} from '../../services/MultiPerspectiveReviewEngine';

import { isCurrentClinicalReview } from '../../services/clinicalReview';
import { buildClinicalOutcome } from '../../services/StructuredAnswerEngine';
import { awardPoints } from '../../services/VitalityPointsEngine';
import PathwaySimulator from './PathwaySimulator';

const formatDate = (value: string) => {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return 'N/A';
  }
};

export default function SnapshotViewer({ item }: { item: CaseItem }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const toast = useToast();
  const dailySourceFreshness = useClinicalDailySourceFreshness(item);
  const reviews = (item.reviews || []).map((review) =>
    review.type !== 'jarvis' ||
    (dailySourceFreshness === 'current' && isCurrentClinicalReview(review.report, item))
      ? review
      : {
          ...review,
          report: {
            primaryHypothesis:
              dailySourceFreshness === 'checking'
                ? 'Checking linked sources'
                : 'Saved review needs refreshing',
            executiveSummary:
              dailySourceFreshness === 'checking'
                ? 'Checking whether the linked daily observations are still current.'
                : 'This saved review predates the current evidence checks or its source records have changed. Its interpretations are withheld. Run a fresh review from your current case records.',
          },
        }
  );
  const [activeReviewId, setActiveReviewId] = useState<string | null>(
    reviews.length > 0 ? reviews[0].id : null
  );
  const [elifMode, setElifMode] = useState(false);
  const [sourceModalData, setSourceModalData] = useState<SourcePassageModalProps | null>(null);
  const [simulatingAction, setSimulatingAction] = useState<any>(null);
  const [copiedSbar, setCopiedSbar] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    const opt = {
      margin: 10,
      filename: `Clinical_Report_${item.id}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };
    try {
      triggerHapticLight();
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set(opt).from(reportRef.current).save();
      awardPoints(10, 'Exported Clinical Report PDF 📄', 'research');
      toast.success('Report Exported', 'Clinical snapshot PDF has been generated.');
    } catch (e) {
      console.error('Failed to load PDF library, falling back to print dialog:', e);
      toast.info('Opening Print View', 'Select "Save as PDF" in your print options.');
      try {
        window.print();
      } catch (err) {
        toast.error('Export Error', 'Could not generate PDF. Please try again.');
      }
    }
  };

  const handleCopySbar = async () => {
    if (!activeReview?.report) return;
    triggerHapticLight();
    const rep = activeReview.report;
    const primary = rep.primaryHypothesis || rep.topDiagnoses?.[0]?.condition || 'Clinical Finding';
    const sbar = rep.doctorActionPlan?.sbar || {
      situation: rep.executiveSummary || 'Clinical review findings',
      background: 'See the original records and reported case history.',
      assessment: primary,
      recommendation:
        (rep.questionsForClinician || []).join('\n') ||
        'Review these concerns with the treating clinician.',
    };
    const text = `CLINICAL REVIEW • DOCTOR SBAR BRIEF
AI consideration for clinician review: ${primary}
Generated: ${rep.structuredAnswer?.generatedAt || 'Review date unavailable'}
${rep.interpretationUpdatePending ? 'Clarification saved; AI interpretation has not been rerun.' : ''}
${rep.structuredAnswer?.interpretationsWithheld ? 'Unsupported interpretations were withheld. Verify the source observations.' : ''}

[S] SITUATION:
${sbar.situation}

[B] BACKGROUND:
${sbar.background}

[A] ASSESSMENT:
${sbar.assessment}

[R] RECOMMENDATION:
${sbar.recommendation}

QUESTIONS FOR THE VISIT:
${(rep.questionsForClinician || []).map((question: string, i: number) => `${i + 1}. ${question}`).join('\n') || 'What additional information would help assess these concerns?'}

AI-generated preparation material. Verify against original records.`;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      toast.error('Copy unavailable', 'Select and copy the report text, or use Export PDF.');
      return;
    }
    setCopiedSbar(true);
    toast.success('SBAR Brief Copied', 'Formatted for MyChart/doctor portal notes.');
    setTimeout(() => setCopiedSbar(false), 3000);
  };

  const activeReview = reviews.find((r) => r.id === activeReviewId) || reviews[0];

  if (reviews.length === 0) {
    return (
      <div className="card" style={{ padding: 36, textAlign: 'center' }}>
        <h2>No reviews yet</h2>
        <p style={{ color: '#64748b' }}>
          Start a clinical investigation to generate your first snapshot.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '280px 1fr',
        gap: 24,
        alignItems: 'start',
      }}
    >
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#F8FAFC' }}
        >
          <h3 style={{ margin: 0, fontSize: 16 }}>Clinical Snapshots ({reviews.length})</h3>
        </div>
        <div>
          {[...reviews].reverse().map((review, _index) => {
            const isParallel = review.type === 'parallel';
            const isJarvis = review.type === 'jarvis';
            const isLab = review.type === 'lab_report';
            const Icon = isJarvis
              ? BrainCircuit
              : isLab
                ? FileText
                : isParallel
                  ? GitMerge
                  : Network;
            const label = isJarvis
              ? 'Clinical Review'
              : isLab
                ? 'Lab Report'
                : isParallel
                  ? 'Quick Consult'
                  : 'Deep Collab Correlation';
            const summary = review.report?.executiveSummary || 'Review saved to case.';
            const isSelected = activeReviewId === review.id;

            return (
              <div
                key={review.id}
                role="button"
                tabIndex={0}
                aria-selected={isSelected}
                aria-label={`Select ${label} snapshot from ${formatDate(review.createdAt)}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerHapticLight();
                    setActiveReviewId(review.id);
                  }
                }}
                onClick={() => {
                  triggerHapticLight();
                  setActiveReviewId(review.id);
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr',
                  gap: 12,
                  alignItems: 'start',
                  padding: '16px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  background: isSelected ? '#F1F5F9' : '#FFF',
                  borderLeft: isSelected ? '3px solid #10B981' : '3px solid transparent',
                  transition: 'background 0.2s',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    display: 'grid',
                    placeItems: 'center',
                    background: isJarvis ? '#FFF7ED' : isParallel ? '#eef2ff' : '#ecfdf5',
                    color: isJarvis ? '#EA580C' : isParallel ? '#4f46e5' : '#059669',
                  }}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <strong style={{ fontSize: 14, color: '#0f172a' }}>{label}</strong>
                  </div>
                  <small style={{ color: '#94a3b8', display: 'block', margin: '2px 0 6px' }}>
                    {formatDate(review.createdAt)}
                  </small>
                  <p
                    style={{
                      margin: 0,
                      color: '#64748b',
                      fontSize: 13,
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {summary}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeReview ? (
        <div className="card" style={{ padding: isMobile ? 16 : 32 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'stretch' : 'flex-start',
              marginBottom: 24,
              paddingBottom: 20,
              borderBottom: '1px solid #e2e8f0',
              gap: isMobile ? 16 : 0,
            }}
          >
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? 20 : 24 }}>
                  {activeReview.type === 'jarvis'
                    ? 'Clinical Review Report'
                    : activeReview.type === 'parallel'
                      ? 'Parallel Review Report'
                      : 'Clinical Consensus Report'}
                </h2>
                {activeReview.id === reviews[reviews.length - 1].id && (
                  <span className="badge badge-teal">Latest</span>
                )}
              </div>
              <div
                style={{ display: 'flex', gap: 16, marginTop: 8, color: '#64748b', fontSize: 14 }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CalendarClock size={16} /> {formatDate(activeReview.createdAt)}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline"
                aria-label="Discuss review findings with Ava AI"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#4F46E5',
                  borderColor: '#C7D2FE',
                  background: '#EEF2FF',
                  fontWeight: 600,
                }}
                onClick={() => {
                  triggerHapticLight();
                  navigate(`/app/ava?caseId=${encodeURIComponent(item.id)}`, {
                    state: {
                      initialPrompt: `I would like to discuss my case snapshot from ${formatDate(activeReview.createdAt)}. One AI-generated possibility was "${activeReview.report?.primaryHypothesis || activeReview.report?.topDiagnoses?.[0]?.condition || 'No named possibility'}". Please separate recorded facts, uncertainty, and clinician questions.`,
                    },
                  });
                }}
              >
                <MessageCircle size={16} /> Discuss with Ava
              </button>
              {activeReview.type === 'jarvis' && (
                <button
                  className="btn btn-outline"
                  onClick={handleCopySbar}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: copiedSbar ? '#047857' : '#C2410C',
                    borderColor: copiedSbar ? '#A7F3D0' : '#FED7AA',
                    background: copiedSbar ? '#ECFDF5' : '#FFF7ED',
                    fontWeight: 700,
                  }}
                >
                  {copiedSbar ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                  <span>{copiedSbar ? 'Copied SBAR' : 'Copy SBAR'}</span>
                </button>
              )}
              {activeReview.type !== 'jarvis' && (
                <button
                  className={`btn ${elifMode ? 'btn-primary' : 'btn-outline'}`}
                  aria-label={
                    elifMode ? 'Switch to detailed clinical view' : 'Switch to simplified ELIF view'
                  }
                  onClick={() => setElifMode(!elifMode)}
                >
                  <BookOpen size={16} /> {elifMode ? 'Normal View' : 'ELIF Mode'}
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={exportToPDF}
                aria-label="Export review report as PDF"
              >
                <Download size={16} /> Export PDF
              </button>
            </div>
          </div>

          <div ref={reportRef} style={{ display: 'grid', gap: 16, padding: '10px 0' }}>
            {activeReview.type === 'jarvis' ? (
              <>
                {isCurrentClinicalReview(activeReview.report, item) ? (
                  <>
                    <StructuredAnswerView
                      answer={buildClinicalOutcome(activeReview.report)}
                      onOpenSourceModal={setSourceModalData}
                    />
                    <details className="hc-outcome">
                      <summary>Review reasoning</summary>
                      <ClinicalReasoningPipelineView
                        payload={
                          activeReview.report.reasoningPipeline ||
                          runClinicalReasoningPipeline(activeReview.report)
                        }
                      />
                    </details>
                    {(
                      activeReview.report.meaningfulPerspectives ||
                      activeReview.report.perspectives ||
                      []
                    ).length > 0 && (
                      <details className="hc-outcome">
                        <summary>
                          Perspectives (
                          {
                            (
                              activeReview.report.meaningfulPerspectives ||
                              activeReview.report.perspectives
                            ).length
                          }
                          )
                        </summary>
                        <MeaningfulMultiPerspectiveView
                          perspectives={
                            activeReview.report.meaningfulPerspectives ||
                            activeReview.report.perspectives
                          }
                          boundedComparison={activeReview.report.boundedComparison}
                          versionedEvidence={activeReview.report.versionedEvidence}
                        />
                      </details>
                    )}
                  </>
                ) : (
                  <section className="hc-outcome">
                    <div className="hc-outcome-section hc-outcome-warning">
                      <h3>Saved review needs refreshing</h3>
                      <p>{activeReview.report.executiveSummary}</p>
                    </div>
                  </section>
                )}
                <button
                  className="btn btn-outline"
                  onClick={() =>
                    navigate(`/app/consult?caseId=${encodeURIComponent(item.id)}&review=new`)
                  }
                >
                  Review updated information
                </button>
              </>
            ) : (
              <>
                <section>
                  <h3 style={{ fontSize: 18, margin: '0 0 12px' }}>Executive Summary</h3>
                  <p style={{ margin: 0, lineHeight: 1.6, color: '#334155' }}>
                    {elifMode
                      ? activeReview.report?.executiveSummary || 'No summary available.'
                      : activeReview.report?.executiveSummary || 'No summary available.'}
                  </p>
                </section>

                <section>
                  <h3 style={{ fontSize: 18, margin: '0 0 12px' }}>Discussion Pathways</h3>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {(activeReview.report?.topDiagnoses || []).map((d: any, i: number) => {
                      const condition = typeof d === 'string' ? d : d?.condition || 'Diagnosis';
                      const rationale = typeof d === 'string' ? '' : d?.rationale || '';
                      const specialty = typeof d === 'string' ? 'Review' : d?.specialty || 'Review';
                      return (
                        <div
                          key={i}
                          style={{
                            padding: 16,
                            borderRadius: 14,
                            background: '#f8fafc',
                            borderLeft: '4px solid #10B981',
                          }}
                        >
                          <div
                            style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
                          >
                            <strong>{condition}</strong>
                            <span className="badge badge-teal">{specialty}</span>
                          </div>
                          <p
                            style={{
                              margin: '8px 0 0',
                              color: '#475569',
                              fontSize: 14,
                              lineHeight: 1.55,
                            }}
                          >
                            {elifMode
                              ? `AI-generated possibility: ${condition}. ${rationale}`
                              : rationale}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <h3 style={{ fontSize: 18, margin: 0 }}>Recommended Actions</h3>
                    <span style={{ fontSize: 12, color: '#64748B' }}>
                      Tap "Simulate & Guide" to prepare your doctor discussion
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(activeReview.report?.recommendedActionPlan || []).map(
                      (action: any, idx: number) => {
                        const actionText =
                          typeof action === 'string'
                            ? action
                            : action?.step || action?.title || action?.action || 'Action item';
                        const actionObj =
                          typeof action === 'string'
                            ? { step: action, id: `action_${idx}` }
                            : action;
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: isMobile ? 'flex-start' : 'center',
                              flexDirection: isMobile ? 'column' : 'row',
                              gap: 12,
                              padding: '12px 16px',
                              background: '#f8fafc',
                              borderRadius: 10,
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                gap: 12,
                                alignItems: 'center',
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0 }} />
                              <span
                                style={{
                                  fontSize: 14,
                                  color: '#334155',
                                  fontWeight: 500,
                                  lineHeight: 1.4,
                                }}
                              >
                                {actionText}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{
                                padding: '6px 12px',
                                fontSize: 12,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                borderRadius: 8,
                                borderColor: '#cbd5e1',
                                color: '#2563eb',
                                background: '#eff6ff',
                                cursor: 'pointer',
                                flexShrink: 0,
                                alignSelf: isMobile ? 'flex-end' : 'center',
                              }}
                              onClick={() => setSimulatingAction(actionObj)}
                            >
                              <Sparkles size={14} color="#3b82f6" /> Simulate & Guide
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>
                </section>

                {/* STEP 5: MEANINGFUL MULTI-PERSPECTIVE REVIEW & BOUNDED COMPARISON */}
                {activeReview.report?.groundingVersion === 1 &&
                  (() => {
                    const versionedEvidence =
                      activeReview.report.versionedEvidence ||
                      buildVersionedEvidenceSet(
                        (activeReview.report.documentedFacts || []).map((f: any) =>
                          typeof f === 'string' ? { fact: f, source: 'Clinical Record' } : f
                        ),
                        item.medicalRecords || []
                      );
                    const meaningfulPerspectives =
                      activeReview.report.meaningfulPerspectives ||
                      generateMeaningfulPerspectives(
                        versionedEvidence,
                        activeReview.report.questionsForClinician || [],
                        activeReview.report.perspectives
                      );
                    const boundedComparison =
                      activeReview.report.boundedComparison ||
                      executeBoundedComparison(meaningfulPerspectives, versionedEvidence);

                    return (
                      <div style={{ marginTop: 12 }}>
                        <MeaningfulMultiPerspectiveView
                          perspectives={meaningfulPerspectives}
                          boundedComparison={boundedComparison}
                          versionedEvidence={versionedEvidence}
                        />
                      </div>
                    );
                  })()}

                <section>
                  <h3 style={{ fontSize: 18, margin: '0 0 12px' }}>Participating Specialists</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(activeReview.specialists || []).map((s: any, sIdx: number) => {
                      const label = typeof s === 'string' ? s : s?.label || s?.name || 'Specialist';
                      return (
                        <span
                          key={label + sIdx}
                          style={{
                            background: '#e2e8f0',
                            color: '#334155',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 13,
                          }}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 36, textAlign: 'center' }}>
          <p style={{ color: '#64748b' }}>Select a snapshot to view its report.</p>
        </div>
      )}

      {sourceModalData && (
        <SourcePassageModal
          {...sourceModalData}
          caseId={item.id}
          isOpen
          onClose={() => setSourceModalData(null)}
        />
      )}
      {simulatingAction && (
        <PathwaySimulator actionItem={simulatingAction} onClose={() => setSimulatingAction(null)} />
      )}
    </div>
  );
}
