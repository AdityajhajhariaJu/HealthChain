import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Link2, ArrowDown, ArrowRight, Sparkles, 
  HelpCircle, ShieldCheck, ShieldAlert, Scissors, 
  RotateCcw, Check, Copy, ExternalLink, Calendar,
  Clock, Activity, BookOpen
} from 'lucide-react';
import { 
  SemanticEvidenceGraph, 
  SemanticDetectiveNode, 
  SemanticDetectiveEdge,
  toggleDecoupleEdge 
} from '../../services/ConnectionDetectiveEngine';
import { InformationCategoryBadge } from './InformationCategoryBadge';
import { triggerHapticLight, triggerHapticSelection, triggerHapticSuccess } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';

interface SemanticEvidenceGraphViewProps {
  graph: SemanticEvidenceGraph;
  onOpenConsult?: () => void;
  onOpenCasePrep?: () => void;
  onOpenSourceModal?: (data: any) => void;
  className?: string;
}

export const SemanticEvidenceGraphView: React.FC<SemanticEvidenceGraphViewProps> = ({
  graph,
  onOpenConsult,
  onOpenCasePrep,
  onOpenSourceModal,
  className = '',
}) => {
  const isMobile = useIsMobile();
  const [selectedEdge, setSelectedEdge] = useState<SemanticDetectiveEdge | null>(null);
  const [selectedNode, setSelectedNode] = useState<SemanticDetectiveNode | null>(null);
  const [copiedBrief, setCopiedBrief] = useState(false);

  // Group nodes by role in the canonical flow
  const sourceNodes = graph.nodes.filter(n => n.category === 'source_document');
  const inputNodes = graph.nodes.filter(n => ['user_report', 'recorded_measurement', 'extracted_finding'].includes(n.category));
  const considerationNode = graph.downstreamPipeline.consideration;
  const questionNode = graph.downstreamPipeline.questionStillOpen;
  const briefNode = graph.downstreamPipeline.appointmentBrief;

  const handleToggleDecouple = (edgeId: string) => {
    triggerHapticSelection();
    toggleDecoupleEdge(edgeId);
    setSelectedEdge(null);
  };

  const handleCopyBrief = (text: string) => {
    triggerHapticLight();
    navigator.clipboard.writeText(text);
    setCopiedBrief(true);
    triggerHapticSuccess();
    setTimeout(() => setCopiedBrief(false), 2000);
  };

  return (
    <div 
      className={className}
      style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        border: '1.5px solid #CBD5E1',
        padding: isMobile ? '16px' : '22px',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: 'inherit',
      }}
    >
      {/* 1. HEADER & CANONICAL LEGEND (STEP 8 CONTRACT) */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: '12px',
        borderBottom: '1px solid #F1F5F9',
        paddingBottom: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              background: '#0284C7',
              color: '#FFF',
              fontSize: '10.5px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}>
              Step 8 • Connection Detective
            </span>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, background: '#ECFDF5', padding: '2px 8px', borderRadius: '999px', border: '1px solid #A7F3D0' }}>
              Semantic Edge Grammar
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: isMobile ? '16px' : '18px', fontWeight: 800, color: '#0F172A' }}>
            Give Every Line a Meaning
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
            Every connection is grounded in a verified source, chronological sequence, or labeled hypothesis.
          </p>
        </div>

        {/* 6 Canonical Edge Legend Pills */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          maxWidth: isMobile ? '100%' : '520px',
        }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, background: '#F0F9FF', border: '1px solid #BAE6FD', color: '#0369A1', padding: '3px 8px', borderRadius: '6px' }}>
            ━━ Solid: Recorded In
          </span>
          <span style={{ fontSize: '10.5px', fontWeight: 700, background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#334155', padding: '3px 8px', borderRadius: '6px' }}>
            ➔ Timeline Sequence
          </span>
          <span style={{ fontSize: '10.5px', fontWeight: 700, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '3px 8px', borderRadius: '6px' }}>
            ● Repeated Together
          </span>
          <span style={{ fontSize: '10.5px', fontWeight: 700, background: '#FFF7ED', border: '1px dashed #FDBA74', color: '#C2410C', padding: '3px 8px', borderRadius: '6px' }}>
            ┄┄ Dashed: Possible Link
          </span>
          <span style={{ fontSize: '10.5px', fontWeight: 700, background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '3px 8px', borderRadius: '6px' }}>
            ⚡ Weakens / Conflicts
          </span>
          <span style={{ fontSize: '10.5px', fontWeight: 700, background: '#EEF2FF', border: '1px solid #C7D2FE', color: '#3730A3', padding: '3px 8px', borderRadius: '6px' }}>
            ★ Clinician Documented
          </span>
        </div>
      </div>

      {/* 2. THE THREE-TIER PIPELINE VISUALIZATION (media_1789069049736.png) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        background: '#FAFAFA',
        borderRadius: '16px',
        padding: isMobile ? '14px' : '20px',
        border: '1px solid #E2E8F0',
      }}>
        {/* TIER 1: PRIMARY INPUTS & SOURCES */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748B', marginBottom: '12px' }}>
            Tier 1: Observations & Documented Sources
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
          }}>
            {inputNodes.map((node) => {
              const recEdge = graph.edges.find(e => e.from === node.id && e.relation === 'recorded_in');
              const isDecoupled = recEdge?.isUserDecoupled;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  style={{
                    background: node.category === 'extracted_finding' && node.status === 'contradicted' ? '#FEF2F2' : '#FFFFFF',
                    borderRadius: '14px',
                    padding: '14px',
                    border: node.status === 'contradicted' ? '1.5px solid #FECACA' : '1.5px solid #E2E8F0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: node.status === 'contradicted' ? '#FEE2E2' : (node.category === 'user_report' ? '#FEF3C7' : '#E0F2FE'),
                      color: node.status === 'contradicted' ? '#991B1B' : (node.category === 'user_report' ? '#92400E' : '#0369A1'),
                    }}>
                      {node.sublabel || node.category.replace(/_/g, ' ')}
                    </span>

                    {node.date && (
                      <span style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} /> {node.date}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>
                    {node.label}
                  </div>

                  {/* SOLID SOURCE LINK */}
                  {node.sourceDocName && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '4px',
                      padding: '6px 10px',
                      background: isDecoupled ? '#F1F5F9' : '#F0F9FF',
                      borderRadius: '8px',
                      border: isDecoupled ? '1px dashed #CBD5E1' : '1px solid #BAE6FD',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FileText size={12} color={isDecoupled ? '#94A3B8' : '#0284C7'} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: isDecoupled ? '#94A3B8' : '#0369A1' }}>
                          recorded in: {node.sourceDocName}
                        </span>
                      </div>
                      {recEdge && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleDecouple(recEdge.id);
                          }}
                          title={isDecoupled ? "Restore link" : "Keep these separate"}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: isDecoupled ? '#0284C7' : '#94A3B8',
                            fontSize: '10px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          {isDecoupled ? <RotateCcw size={11} /> : <Scissors size={11} />}
                          <span>{isDecoupled ? 'Reconnect' : 'Separate'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* TIER 2: CONVERGENCE ONTO [CONSIDERATION] */}
        {considerationNode && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 10px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FFF',
                border: '1px solid #E2E8F0',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748B',
              }}>
                <ArrowDown size={13} color="#0284C7" />
                Evidence links converge onto Clinical Consideration
              </div>
            </div>

            <div 
              onClick={() => setSelectedNode(considerationNode)}
              style={{
                background: 'linear-gradient(135deg, #FFFDFB 0%, #FFF7ED 100%)',
                borderRadius: '16px',
                border: '2px solid #FDBA74',
                padding: isMobile ? '16px' : '20px',
                boxShadow: '0 6px 18px rgba(234, 88, 12, 0.08)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  background: '#EA580C',
                  color: '#FFF',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  letterSpacing: '0.6px',
                }}>
                  [Consideration] • Leading Discussion Hypothesis
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#C2410C' }}>
                  AI Proposal (To examine with doctor)
                </span>
              </div>

              <div style={{ fontSize: isMobile ? '14px' : '15.5px', fontWeight: 800, color: '#0F172A', lineHeight: 1.4 }}>
                {considerationNode.label}
              </div>

              {/* Active Convergence Links List */}
              <div style={{
                marginTop: '12px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                {graph.edges.filter(e => e.to === considerationNode.id).map(edge => {
                  const isDecoupled = edge.isUserDecoupled;
                  const isWeaken = edge.relation === 'conflicts_with';
                  const isDashed = edge.relation === 'may_help_explain';

                  return (
                    <div
                      key={edge.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEdge(edge);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: isDecoupled ? '#F1F5F9' : (isWeaken ? '#FEF2F2' : (isDashed ? '#FFF7ED' : '#F0FDF4')),
                        border: isDecoupled ? '1px dashed #CBD5E1' : (isWeaken ? '1px solid #FECACA' : (isDashed ? '1px dashed #FDBA74' : '1px solid #BBF7D0')),
                        color: isDecoupled ? '#94A3B8' : (isWeaken ? '#991B1B' : (isDashed ? '#C2410C' : '#166534')),
                      }}
                    >
                      <span>{isWeaken ? '⚡' : (isDashed ? '┄┄' : '━━')}</span>
                      <span>{edge.label}</span>
                      {isDecoupled && <span style={{ fontSize: '9.5px', color: '#DC2626' }}>(Uncoupled)</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TIER 3: DOWNSTREAM ACTION PIPELINE */}
        {/* Consideration -> Question Still Open -> Appointment Brief */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr',
          gap: '12px',
          alignItems: 'center',
        }}>
          {/* Node 1: Question Still Open */}
          {questionNode && (
            <div
              onClick={() => setSelectedNode(questionNode)}
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1.5px solid #FDE68A',
                padding: '16px',
                boxShadow: '0 2px 10px rgba(217, 119, 6, 0.05)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#B45309', background: '#FEF3C7', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', marginBottom: '8px' }}>
                [Question Still Open]
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>
                "{questionNode.label}"
              </div>
              <div style={{ fontSize: '11px', color: '#78350F', marginTop: '6px' }}>
                Objective clarification need identified by multi-perspective review.
              </div>
            </div>
          )}

          {!isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', color: '#6366F1' }}>
              <ArrowRight size={22} />
            </div>
          )}

          {/* Node 2: Appointment Brief */}
          {briefNode && (
            <div
              style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #EEF2FF 100%)',
                borderRadius: '14px',
                border: '1.5px solid #A5B4FC',
                padding: '16px',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#4338CA', background: '#E0E7FF', padding: '2px 8px', borderRadius: '6px' }}>
                  [Appointment Brief]
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyBrief(briefNode.label)}
                  style={{
                    background: copiedBrief ? '#ECFDF5' : '#F5F3FF',
                    border: copiedBrief ? '1px solid #6EE7B7' : '1px solid #DDD6FE',
                    color: copiedBrief ? '#047857' : '#5B21B6',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedBrief ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedBrief ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E1B4B', lineHeight: 1.4 }}>
                {briefNode.label}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                {onOpenCasePrep && (
                  <button
                    type="button"
                    onClick={onOpenCasePrep}
                    style={{
                      background: '#4F46E5',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>Open in Case Prep</span>
                    <ArrowRight size={11} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. STEP 9 INTERACTIVE LEVER: "KEEP THESE SEPARATE" MODAL / DRAWER */}
      <AnimatePresence>
        {selectedEdge && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              background: '#0F172A',
              color: '#FFF',
              borderRadius: '14px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '2px' }}>
                Inspecting Relationship • {selectedEdge.relation.replace(/_/g, ' ').toUpperCase()}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>
                "{selectedEdge.label}" {selectedEdge.sublabel ? `(${selectedEdge.sublabel})` : ''}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                {selectedEdge.isUserDecoupled 
                  ? 'Currently uncoupled by user: The clinical engine will not force an association between these nodes.'
                  : 'Active relationship: Connects finding to clinical consideration or source document.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleToggleDecouple(selectedEdge.id)}
                style={{
                  background: selectedEdge.isUserDecoupled ? '#0284C7' : '#EF4444',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedEdge.isUserDecoupled ? <RotateCcw size={13} /> : <Scissors size={13} />}
                <span>{selectedEdge.isUserDecoupled ? 'Restore Connection' : 'Keep These Separate'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedEdge(null)}
                style={{
                  background: 'transparent',
                  color: '#94A3B8',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '7px 10px',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
