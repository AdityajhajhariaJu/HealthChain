import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Clock, AlertTriangle, Stethoscope, GitBranch, 
  ShieldAlert, HelpCircle, FileText, ArrowRight, RotateCw, 
  Sparkles, Check, ChevronRight, Scale, Info, ArrowDown, Send
} from 'lucide-react';
import { 
  ClinicalReasoningPayload, 
  SourceLinkedEvidence, 
  CorrectionQueueItem, 
  JustifiedPerspective, 
  AlternativeInterpretation, 
  BalancedAssessment,
  FocusedUserQuestion,
  ClinicalSynthesis,
  SelectiveUpdateDiff
} from '../../services/ClinicalReasoningEngine';
import { InformationCategoryBadge } from './InformationCategoryBadge';

interface ClinicalReasoningPipelineViewProps {
  payload: ClinicalReasoningPayload;
  onClarificationSubmit?: (answer: string) => void;
  isUpdating?: boolean;
}

export const ClinicalReasoningPipelineView: React.FC<ClinicalReasoningPipelineViewProps> = ({
  payload,
  onClarificationSubmit,
  isUpdating = false,
}) => {
  const [activeStage, setActiveStage] = useState<number>(7); // Default to focused question / synthesis
  const [userClarificationText, setUserClarificationText] = useState('');
  const [acknowledgedCorrections, setAcknowledgedCorrections] = useState<Set<string>>(new Set());

  const stages = [
    { num: 1, label: 'Verified Facts', icon: CheckCircle2, desc: 'Source-linked evidence' },
    { num: 2, label: 'Timeline', icon: Clock, desc: 'Event vs report vs entry' },
    { num: 3, label: 'Correction Queue', icon: AlertTriangle, desc: 'Reconcile discrepancies' },
    { num: 4, label: 'Perspectives', icon: Stethoscope, desc: 'Justified specialty set' },
    { num: 5, label: 'Alternatives', icon: GitBranch, desc: 'Competing interpretations' },
    { num: 6, label: 'Tri-Prong Challenge', icon: Scale, desc: 'Support / Conflict / Missing' },
    { num: 7, label: 'Clarification', icon: HelpCircle, desc: 'Focused decision question' },
    { num: 8, label: 'Synthesis', icon: Sparkles, desc: 'Useful clinical answer' },
    { num: 9, label: 'Continuity', icon: FileText, desc: 'Open questions & next step' },
    { num: 10, label: 'What Changed', icon: RotateCw, desc: 'Selective update diff' },
  ];

  const handleAcknowledgeCorrection = (id: string) => {
    setAcknowledgedCorrections(prev => new Set([...prev, id]));
  };

  const handleClarificationSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userClarificationText.trim() || !onClarificationSubmit) return;
    onClarificationSubmit(userClarificationText.trim());
    setUserClarificationText('');
  };

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '24px',
      border: '1.5px solid #E2E8F0',
      boxShadow: '0 8px 32px rgba(15, 23, 42, 0.05)',
      overflow: 'hidden',
      margin: '24px 0',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        color: '#FFFFFF',
        padding: '24px 28px',
        borderBottom: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38BDF8', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
              <Scale size={13} />
              Reasoning Depth Engine • Step 4 Specification
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.3px' }}>
              10-Stage Clinical Reasoning & Feedback Loop
            </h3>
            <p style={{ margin: '6px 0 0 0', fontSize: '13.5px', color: '#94A3B8', lineHeight: 1.5, maxWidth: '780px' }}>
              From source-verified facts to temporal alignment, record reconciliation, justified perspectives, tri-prong challenges, and continuous selective updates.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '6px 14px',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#E2E8F0',
              fontWeight: 600
            }}>
              <RotateCw size={14} className={isUpdating ? 'animate-spin' : ''} color="#38BDF8" />
              <span>{isUpdating ? 'Executing Feedback Loop...' : 'Cyclic State Active'}</span>
            </div>
          </div>
        </div>

        {/* The Cyclic Reasoning Graph (Image 2 Flowchart) */}
        <div style={{
          marginTop: '22px',
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '16px 20px',
          overflowX: 'auto'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Clinical Pipeline Topology (Click any node to inspect reasoning)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', minWidth: '850px', gap: '8px' }}>
            {/* Node 1: Verified Facts */}
            <button
              onClick={() => setActiveStage(1)}
              style={{
                background: activeStage === 1 ? '#0284C7' : 'rgba(255,255,255,0.06)',
                border: activeStage === 1 ? '1.5px solid #38BDF8' : '1px solid rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle2 size={13} color={activeStage === 1 ? '#FFFFFF' : '#38BDF8'} />
              <span>Verified facts</span>
            </button>

            <ArrowRight size={14} color="#64748B" />

            {/* Node 2: Timeline */}
            <button
              onClick={() => setActiveStage(2)}
              style={{
                background: activeStage === 2 ? '#0284C7' : 'rgba(255,255,255,0.06)',
                border: activeStage === 2 ? '1.5px solid #38BDF8' : '1px solid rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Clock size={13} color={activeStage === 2 ? '#FFFFFF' : '#38BDF8'} />
              <span>Timeline</span>
            </button>

            <ArrowRight size={14} color="#64748B" />

            {/* Node 3: Unanswered Questions & Reconcile */}
            <button
              onClick={() => setActiveStage(3)}
              style={{
                background: activeStage === 3 ? '#0284C7' : 'rgba(255,255,255,0.06)',
                border: activeStage === 3 ? '1.5px solid #38BDF8' : '1px solid rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <AlertTriangle size={13} color={activeStage === 3 ? '#FFFFFF' : '#FBBF24'} />
              <span>Unanswered questions</span>
            </button>

            <ArrowRight size={14} color="#64748B" />

            {/* Node 4: Relevant Perspectives */}
            <button
              onClick={() => setActiveStage(4)}
              style={{
                background: activeStage === 4 ? '#0284C7' : 'rgba(255,255,255,0.06)',
                border: activeStage === 4 ? '1.5px solid #38BDF8' : '1px solid rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Stethoscope size={13} color={activeStage === 4 ? '#FFFFFF' : '#A78BFA'} />
              <span>Relevant perspectives</span>
            </button>

            <ArrowRight size={14} color="#64748B" />

            {/* Node 5: Alternative Interpretations */}
            <button
              onClick={() => setActiveStage(5)}
              style={{
                background: activeStage === 5 ? '#0284C7' : 'rgba(255,255,255,0.06)',
                border: activeStage === 5 ? '1.5px solid #38BDF8' : '1px solid rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <GitBranch size={13} color={activeStage === 5 ? '#FFFFFF' : '#38BDF8'} />
              <span>Alternative interpretations</span>
            </button>

            <ArrowRight size={14} color="#64748B" />

            {/* Node 6: Tri-Prong Challenge */}
            <button
              onClick={() => setActiveStage(6)}
              style={{
                background: activeStage === 6 ? '#0284C7' : 'rgba(255,255,255,0.06)',
                border: activeStage === 6 ? '1.5px solid #38BDF8' : '1px solid rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <span style={{ color: '#34D399' }}>• Supporting</span>
              <span style={{ color: '#F87171' }}>• Conflicting</span>
              <span style={{ color: '#FBBF24' }}>• Missing</span>
            </button>

            <ArrowRight size={14} color="#64748B" />

            {/* Node 8: Synthesis */}
            <button
              onClick={() => setActiveStage(8)}
              style={{
                background: activeStage === 8 ? '#0284C7' : 'rgba(255,255,255,0.06)',
                border: activeStage === 8 ? '1.5px solid #38BDF8' : '1px solid rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={13} color={activeStage === 8 ? '#FFFFFF' : '#FCD34D'} />
              <span>Synthesis</span>
            </button>

            <ArrowRight size={14} color="#64748B" />

            {/* Node 7 & 9: Next useful question or action */}
            <button
              onClick={() => setActiveStage(7)}
              style={{
                background: activeStage === 7 ? '#EA580C' : 'rgba(234, 88, 12, 0.25)',
                border: '1.5px solid #FB923C',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 0 12px rgba(249, 115, 22, 0.3)'
              }}
            >
              <HelpCircle size={14} color="#FED7AA" />
              <span>Next question / action ⟲</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stage Tab Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '12px 20px',
        background: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0',
        overflowX: 'auto'
      }}>
        {stages.map((s) => {
          const Icon = s.icon;
          const isActive = activeStage === s.num;
          return (
            <button
              key={s.num}
              onClick={() => setActiveStage(s.num)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: isActive ? '1.5px solid #0284C7' : '1px solid transparent',
                background: isActive ? '#EFF6FF' : 'transparent',
                color: isActive ? '#0369A1' : '#64748B',
                fontSize: '13px',
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: isActive ? '#0284C7' : '#E2E8F0',
                color: isActive ? '#FFFFFF' : '#475569',
                fontSize: '11px',
                fontWeight: 800
              }}>
                {s.num}
              </span>
              <Icon size={14} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Stage Content Panel */}
      <div style={{ padding: '28px' }}>
        {/* STAGE 1: VERIFIED FACTS */}
        {activeStage === 1 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                  Stage 1: Establish Facts
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#64748B' }}>
                  What was actually reported or documented; partitioned into canonical categories with strict provenance.
                </p>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0369A1', background: '#F0F9FF', padding: '4px 12px', borderRadius: '999px', border: '1px solid #BAE6FD' }}>
                {payload.stage1_facts.length} Verified Evidence Points
              </span>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              {payload.stage1_facts.map((fact, idx) => (
                <div 
                  key={fact.id || idx}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', lineHeight: 1.5 }}>
                      {fact.fact}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                      Source: <span style={{ fontWeight: 600, color: '#334155' }}>{fact.source}</span>
                      {fact.page && <span> • Page {fact.page}</span>}
                    </div>
                  </div>

                  <InformationCategoryBadge
                    category={fact.category as any}
                    item={{
                      source: fact.source,
                      page: fact.page,
                      text: fact.fact,
                      extractionStatus: fact.confidence === 'provisional' ? 'provisional' : 'verified'
                    } as any}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* STAGE 2: TIMELINE */}
        {activeStage === 2 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                Stage 2: Align Time
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#64748B' }}>
                Strictly distinguishes event date, report date, and entry date to prevent chronology collapse.
              </p>
            </div>

            {/* Overlaps & Gaps Alert */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Temporal Overlaps ({payload.stage2_timeline.overlaps.length})
                </div>
                {payload.stage2_timeline.overlaps.length > 0 ? (
                  payload.stage2_timeline.overlaps.map((ov, i) => (
                    <div key={i} style={{ fontSize: '13px', color: '#14532D', lineHeight: 1.4, marginBottom: '6px' }}>
                      <strong>{ov.timeframe}:</strong> {ov.implication}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '13px', color: '#166534' }}>
                    No concurrent symptom surge or drug start overlaps detected.
                  </div>
                )}
              </div>

              <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Documented Gaps ({payload.stage2_timeline.gaps.length})
                </div>
                {payload.stage2_timeline.gaps.length > 0 ? (
                  payload.stage2_timeline.gaps.map((gp, i) => (
                    <div key={i} style={{ fontSize: '13px', color: '#78350F', lineHeight: 1.4, marginBottom: '6px' }}>
                      <strong>{gp.period}:</strong> {gp.durationDescription} — {gp.clinicalSignificance}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '13px', color: '#92400E' }}>
                    No prolonged gaps exceeding 90 days identified.
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Entries Table */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '120px 120px 1fr', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                <span>Event Date</span>
                <span>Report / Entry</span>
                <span>Documented Observation</span>
              </div>
              {payload.stage2_timeline.entries.map((entry, i) => (
                <div key={entry.id || i} style={{ padding: '12px 18px', borderBottom: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '120px 120px 1fr', fontSize: '13px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{entry.eventDate || '—'}</span>
                  <span style={{ color: '#64748B' }}>{entry.reportDate || entry.entryDate}</span>
                  <span style={{ color: '#1E293B', fontWeight: 500 }}>{entry.description}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* STAGE 3: CORRECTION QUEUE */}
        {activeStage === 3 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                  Stage 3: Reconcile Records (Correction Queue)
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#64748B' }}>
                  Identifies duplicates, changed units, conflicting values, and differing accounts before synthesis.
                </p>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#B45309', background: '#FEF3C7', padding: '4px 12px', borderRadius: '999px', border: '1px solid #FDE68A' }}>
                {payload.stage3_correctionQueue.length} Discrepancies Flagged
              </span>
            </div>

            {payload.stage3_correctionQueue.length === 0 ? (
              <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '14px', padding: '24px', textAlign: 'center', color: '#166534' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                <div style={{ fontWeight: 800, fontSize: '16px' }}>All Records Reconciled</div>
                <p style={{ margin: '6px 0 0 0', fontSize: '13.5px', color: '#15803D' }}>
                  No duplicates, incompatible measurement units, or conflicting patient-clinician reports were identified.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {payload.stage3_correctionQueue.map((item) => {
                  const isAcknowledged = acknowledgedCorrections.has(item.id);
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: isAcknowledged ? '#F8FAFC' : '#FFFBEB',
                        border: isAcknowledged ? '1px solid #E2E8F0' : '1.5px solid #FCD34D',
                        borderRadius: '14px',
                        padding: '18px',
                        opacity: isAcknowledged ? 0.75 : 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FEF3C7', color: '#92400E', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                            <AlertTriangle size={12} />
                            {item.type.replace('_', ' ')}
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                            {item.title}
                          </div>
                          <p style={{ margin: '6px 0 10px 0', fontSize: '13.5px', color: '#334155', lineHeight: 1.5 }}>
                            {item.discrepancyDescription}
                          </p>
                          <div style={{ fontSize: '12.5px', color: '#1E293B', background: 'rgba(255,255,255,0.7)', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <strong>Suggested Action:</strong> {item.suggestedAction}
                          </div>
                        </div>

                        <button
                          onClick={() => handleAcknowledgeCorrection(item.id)}
                          style={{
                            background: isAcknowledged ? '#E2E8F0' : '#0F172A',
                            color: isAcknowledged ? '#475569' : '#FFFFFF',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Check size={13} />
                          {isAcknowledged ? 'Acknowledged' : 'Acknowledge Discrepancy'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* STAGE 4: JUSTIFIED PERSPECTIVES */}
        {activeStage === 4 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                Stage 4: Identify Relevant Perspectives
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#64748B' }}>
                Specialties are strictly chosen because they address specific unanswered questions, not as decorative theater.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
              {payload.stage4_perspectives.map((pers) => (
                <div
                  key={pers.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #BAE6FD',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 4px 16px rgba(2, 132, 199, 0.05)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Stethoscope size={18} color="#0284C7" />
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                      {pers.specialty}
                    </div>
                  </div>

                  <div style={{ background: '#F0F9FF', border: '1px solid #E0F2FE', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', marginBottom: '3px' }}>
                      Unanswered Question Addressed:
                    </div>
                    <div style={{ fontSize: '13px', color: '#0C4A6E', fontWeight: 600 }}>
                      "{pers.unansweredQuestionAddressed}"
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, marginBottom: '8px' }}>
                    <strong>Why Chosen:</strong> {pers.justification}
                  </div>

                  <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5, background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px' }}>
                    <strong>Unique Contribution:</strong> {pers.uniqueContribution}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* STAGE 5: COMPETING ALTERNATIVES */}
        {activeStage === 5 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                Stage 5: Generate Alternatives
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#64748B' }}>
                Evaluates connected explanations, separate explanations, and insufficient evidence to prevent premature closure.
              </p>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              {payload.stage5_alternatives.map((alt) => {
                const isConnected = alt.type === 'connected_explanation';
                const isSeparate = alt.type === 'separate_explanations';
                return (
                  <div
                    key={alt.id}
                    style={{
                      background: '#FFFFFF',
                      border: isConnected ? '2px solid #FB923C' : '1px solid #CBD5E1',
                      borderRadius: '16px',
                      padding: '20px',
                      boxShadow: isConnected ? '0 4px 20px rgba(249, 115, 22, 0.08)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isConnected ? '#FFEDD5' : isSeparate ? '#EDE9FE' : '#F1F5F9',
                          color: isConnected ? '#9A3412' : isSeparate ? '#6B21A8' : '#475569'
                        }}>
                          {alt.type.replace('_', ' ')}
                        </span>
                        <h5 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                          {alt.title}
                        </h5>
                      </div>

                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: alt.likelihoodAssessment === 'leading' ? '#047857' : '#64748B',
                        background: alt.likelihoodAssessment === 'leading' ? '#ECFDF5' : '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        padding: '3px 10px',
                        borderRadius: '999px'
                      }}>
                        {alt.likelihoodAssessment.toUpperCase()}
                      </span>
                    </div>

                    <p style={{ margin: '8px 0', fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                      <strong>Physiological Mechanism:</strong> {alt.mechanismSummary}
                    </p>
                    <div style={{ fontSize: '13px', color: '#64748B' }}>
                      <strong>Evidence Grounding:</strong> {alt.rationale}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* STAGE 6: TRI-PRONG BALANCED ASSESSMENT */}
        {activeStage === 6 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                Stage 6: Challenge Each Alternative (Tri-Prong Assessment)
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#64748B' }}>
                Rigorous evaluation across Supporting Evidence, Conflicting Evidence, and Missing Evidence (what would change it).
              </p>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              {payload.stage6_balancedAssessments.map((assessment) => (
                <div
                  key={assessment.alternativeId}
                  style={{
                    background: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '18px',
                    padding: '20px'
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Scale size={18} color="#0284C7" />
                    <span>Hypothesis: {assessment.alternativeTitle}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                    {/* Prong 1: Supporting */}
                    <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                        🟢 Supporting Evidence ({assessment.supportingEvidence.length})
                      </div>
                      {assessment.supportingEvidence.map((sup, idx) => (
                        <div key={idx} style={{ fontSize: '13px', color: '#14532D', lineHeight: 1.4, marginBottom: '6px' }}>
                          • {sup.description}
                        </div>
                      ))}
                    </div>

                    {/* Prong 2: Conflicting */}
                    <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                        🔴 Conflicting / Normal Tests ({assessment.conflictingEvidence.length})
                      </div>
                      {assessment.conflictingEvidence.map((con, idx) => (
                        <div key={idx} style={{ fontSize: '13px', color: '#7F1D1D', lineHeight: 1.4, marginBottom: '6px' }}>
                          • {con.description}
                        </div>
                      ))}
                    </div>

                    {/* Prong 3: Missing / What would change it */}
                    <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                        🟡 Missing / What Would Change It
                      </div>
                      {assessment.missingEvidenceWhatWouldChangeIt.map((mis, idx) => (
                        <div key={idx} style={{ fontSize: '13px', color: '#78350F', lineHeight: 1.4, marginBottom: '6px' }}>
                          <strong>{mis.testOrObservation}:</strong> {mis.potentialImpact}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* STAGE 7: FOCUSED CLARIFICATION QUESTION & LIVE FEEDBACK LOOP */}
        {activeStage === 7 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FFEDD5', color: '#C2410C', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                <RotateCw size={13} />
                Stage 7 & The Cyclic Feedback Loop
              </div>
              <h4 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                The Single Most Decisive Clarification Question
              </h4>
              <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#64748B', lineHeight: 1.5 }}>
                Instead of asking a dozen scattered questions, the engine isolates the <strong>one question most likely to improve the next clinical decision</strong>.
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
              border: '2px solid #FDBA74',
              borderRadius: '20px',
              padding: '24px',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(249, 115, 22, 0.08)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#9A3412', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                High-Discriminatory Decision Question
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#7C2D12', lineHeight: 1.4, marginBottom: '14px' }}>
                "{payload.stage7_focusedQuestion.question}"
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '10px', padding: '12px', border: '1px solid #FED7AA' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#9A3412', textTransform: 'uppercase' }}>Why This Question:</div>
                  <div style={{ fontSize: '13px', color: '#431407', marginTop: '2px' }}>{payload.stage7_focusedQuestion.whyThisQuestion}</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '10px', padding: '12px', border: '1px solid #FED7AA' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#9A3412', textTransform: 'uppercase' }}>Decision Impact:</div>
                  <div style={{ fontSize: '13px', color: '#431407', marginTop: '2px' }}>{payload.stage7_focusedQuestion.decisionImpact}</div>
                </div>
              </div>

              {/* Interactive Answer Input (Completes Feedback Loop into Stage 1 Facts) */}
              {onClarificationSubmit && (
                <form onSubmit={handleClarificationSend} style={{ background: '#FFFFFF', borderRadius: '14px', padding: '16px', border: '1.5px solid #F97316' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#9A3412', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Answer this question to close the loop & update the case selectively:
                  </label>
                  <textarea
                    value={userClarificationText}
                    onChange={(e) => setUserClarificationText(e.target.value)}
                    placeholder="Provide your exact observation or timing (e.g., 'Symptoms began 2 weeks after my COVID infection in April 2024 with sudden heart racing on standing')..."
                    rows={3}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1px solid #FED7AA',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      outline: 'none',
                      color: '#0F172A'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="submit"
                      disabled={!userClarificationText.trim() || isUpdating}
                      style={{
                        background: '#EA580C',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: userClarificationText.trim() && !isUpdating ? 'pointer' : 'not-allowed',
                        opacity: userClarificationText.trim() && !isUpdating ? 1 : 0.6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Send size={14} />
                      <span>{isUpdating ? 'Updating Pipeline...' : 'Add to Verified Facts & Selectively Update'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}

        {/* STAGE 8: SYNTHESIS */}
        {activeStage === 8 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                Stage 8: Clinical Synthesis
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#64748B' }}>
                Explains the main finding, its basis, epistemic limitations, and practical implications for doctor review.
              </p>
            </div>

            <div style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '18px', padding: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', marginBottom: '6px' }}>
                Core Synthesized Finding
              </div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '19px', fontWeight: 800, color: '#0F172A', lineHeight: 1.4 }}>
                {payload.stage8_synthesis.mainFinding}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '18px' }}>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Empirical Basis
                  </div>
                  {payload.stage8_synthesis.empiricalBasis.map((basis, i) => (
                    <div key={i} style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4, marginBottom: '4px' }}>
                      • {basis}
                    </div>
                  ))}
                </div>

                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Epistemic Limitations
                  </div>
                  {payload.stage8_synthesis.limitations.map((limit, i) => (
                    <div key={i} style={{ fontSize: '13px', color: '#78350F', lineHeight: 1.4, marginBottom: '4px' }}>
                      • {limit}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Practical Implication For Clinician Appointment
                </div>
                <div style={{ fontSize: '14px', color: '#1E3A8A', fontWeight: 600, lineHeight: 1.5 }}>
                  {payload.stage8_synthesis.practicalImplication}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STAGE 9: CONTINUITY */}
        {activeStage === 9 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                Stage 9: Carry Forward (Continuity)
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#64748B' }}>
                Preserves open questions and the user's chosen next action across case sessions.
              </p>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                Open Questions Carried Forward
              </div>
              <ul style={{ margin: '0 0 16px 0', paddingLeft: '20px' }}>
                {payload.stage9_continuity.openQuestions.map((q, i) => (
                  <li key={i} style={{ fontSize: '13.5px', color: '#1E293B', padding: '4px 0' }}>
                    {q}
                  </li>
                ))}
              </ul>

              <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Chosen Next Action:</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                  {payload.stage9_continuity.chosenNextAction}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STAGE 10: WHAT CHANGED AND WHY */}
        {activeStage === 10 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                Stage 10: Update Selectively ("What Changed and Why")
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#64748B' }}>
                Revisits conclusions affected by new information; documents exact delta rather than regenerating from scratch.
              </p>
            </div>

            {payload.stage10_selectiveUpdate ? (
              <div style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '18px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F0F9FF', border: '1px solid #BAE6FD', color: '#0369A1', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
                    <RotateCw size={12} />
                    Trigger: {payload.stage10_selectiveUpdate.triggerEvent}
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Run Date: {payload.stage10_selectiveUpdate.currentRunDate}
                  </span>
                </div>

                <div style={{ fontSize: '14.5px', color: '#0F172A', lineHeight: 1.6, fontWeight: 500, marginBottom: '18px', background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  {payload.stage10_selectiveUpdate.whatChangedAndWhy}
                </div>

                <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Hypothesis Shift Analysis:
                </div>

                <div style={{ display: 'grid', gap: '8px' }}>
                  {payload.stage10_selectiveUpdate.affectedConclusions.map((conc, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: conc.shift === 'strengthened' ? '#F0FDF4' : conc.shift === 'weakened' ? '#FEF2F2' : '#F8FAFC',
                        border: conc.shift === 'strengthened' ? '1px solid #BBF7D0' : conc.shift === 'weakened' ? '1px solid #FECACA' : '1px solid #E2E8F0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                        {conc.hypothesis}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>{conc.rationale}</span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: conc.shift === 'strengthened' ? '#22C55E' : conc.shift === 'weakened' ? '#EF4444' : '#64748B',
                          color: '#FFFFFF'
                        }}>
                          {conc.shift}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ color: '#64748B', fontSize: '14px' }}>
                Baseline review active. Answer the Stage 7 clarification question to trigger an updated delta.
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};
