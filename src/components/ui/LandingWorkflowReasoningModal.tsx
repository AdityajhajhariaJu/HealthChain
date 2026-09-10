import React, { useState } from 'react';
import { 
  X, Sparkles, ShieldAlert, ArrowRight, CheckCircle2, 
  HelpCircle, Split, Layers, FileText, AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LandingWorkflowScenario } from '../../services/LandingCaseWorkflowEngine';
import { triggerHapticLight } from '../../services/haptics';

interface LandingWorkflowReasoningModalProps {
  scenario: LandingWorkflowScenario | null;
  onClose: () => void;
  onLaunchCase: (scenarioId: string) => void;
}

export const LandingWorkflowReasoningModal: React.FC<LandingWorkflowReasoningModalProps> = ({
  scenario,
  onClose,
  onLaunchCase,
}) => {
  const [activeTab, setActiveTab] = useState<'workflow' | 'comparison'>('workflow');

  if (!scenario) return null;

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            triggerHapticLight();
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            border: '1.5px solid rgba(16, 185, 129, 0.3)',
            boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #E2E8F0',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  color: '#059669',
                  background: '#ECFDF5',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}>
                  Workflow Design {scenario.rank}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                  {scenario.specialistTag}
                </span>
              </div>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 900,
                color: '#0F172A',
                letterSpacing: '-0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span>{scenario.icon}</span>
                <span>{scenario.title}</span>
              </h2>
              <div style={{
                marginTop: 6,
                fontSize: '12px',
                color: '#94A3B8',
                fontWeight: 600,
                fontStyle: 'italic',
              }}>
                Illustrative workflow design using this scenario — not a conclusion about a patient.
              </div>
            </div>

            <button
              onClick={() => {
                triggerHapticLight();
                onClose();
              }}
              style={{
                background: '#F1F5F9',
                border: 'none',
                width: 34,
                height: 34,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
                flexShrink: 0,
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Subheader Navigation Tabs */}
          <div style={{
            display: 'flex',
            gap: 8,
            padding: '10px 24px',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
          }}>
            <button
              onClick={() => {
                triggerHapticLight();
                setActiveTab('workflow');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'workflow' ? '#059669' : 'transparent',
                color: activeTab === 'workflow' ? '#FFFFFF' : '#64748B',
                transition: 'all 0.15s ease',
              }}
            >
              The 3 Reasoning Pillars
            </button>
            <button
              onClick={() => {
                triggerHapticLight();
                setActiveTab('comparison');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'comparison' ? '#059669' : 'transparent',
                color: activeTab === 'comparison' ? '#FFFFFF' : '#64748B',
                transition: 'all 0.15s ease',
              }}
            >
              Generic Advice vs. Useful Reasoning
            </button>
          </div>

          {/* Body Content */}
          <div style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}>
            {activeTab === 'workflow' ? (
              <>
                {/* Pillar 1: What to Connect */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Layers size={17} color="#059669" />
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                      1. What to Connect (Synthesizing Multi-Modal Inputs)
                    </h3>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 10,
                  }}>
                    {scenario.whatToConnect.map((input, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: '14px' }}>{input.icon}</span>
                          <strong style={{ fontSize: '13px', color: '#0F172A' }}>{input.tag}</strong>
                        </div>
                        <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                          {input.description}
                        </p>
                        <div style={{
                          fontSize: '11px',
                          color: '#059669',
                          background: '#ECFDF5',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 600,
                        }}>
                          {input.sourceExample}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pillar 2: What to Keep Separate (Epistemic Boundary) */}
                <div style={{
                  background: '#FFFBEB',
                  border: '1.5px solid #FCD34D',
                  borderRadius: '16px',
                  padding: '16px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <ShieldAlert size={18} color="#D97706" />
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#92400E' }}>
                      2. What to Keep Separate (Epistemic Boundary)
                    </h3>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#78350F',
                    marginBottom: 6,
                  }}>
                    {scenario.epistemicBoundary.boundaryTitle}
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#92400E', lineHeight: 1.5 }}>
                    {scenario.epistemicBoundary.whatToKeepSeparate}
                  </p>
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #FDE68A',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}>
                    <div style={{ fontSize: '12px', color: '#B45309' }}>
                      <strong>Epistemic Hazard Avoided:</strong> {scenario.epistemicBoundary.epistemicRisk}
                    </div>
                    <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>
                      <strong>Strict Clinical Rule:</strong> {scenario.epistemicBoundary.safeguardRule}
                    </div>
                  </div>
                </div>

                {/* Pillar 3: Valuable Final Output */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1.5px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Sparkles size={17} color="#059669" />
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#065F46' }}>
                      3. Valuable Final Output (Doctor-Ready Brief)
                    </h3>
                  </div>
                  
                  {/* Quoted Clinician Summary */}
                  <blockquote style={{
                    margin: '0 0 14px',
                    padding: '10px 14px',
                    background: '#ECFDF5',
                    borderLeft: '4px solid #059669',
                    borderRadius: '0 8px 8px 0',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#065F46',
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                  }}>
                    "{scenario.valuableOutput.clinicianQuote}"
                  </blockquote>

                  <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                    {scenario.valuableOutput.summaryStatement}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                    {/* Overlapping Events */}
                    <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                        Overlapping Events
                      </span>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#334155', lineHeight: 1.45 }}>
                        {scenario.valuableOutput.overlappingEvents.map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Missing Records / Dates */}
                    <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#C2410C', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                        Identified Unknowns
                      </span>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#7C2D12', lineHeight: 1.45 }}>
                        {scenario.valuableOutput.missingRecordsOrDates.map((m, idx) => (
                          <li key={idx}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Visit Questions */}
                  <div style={{ marginTop: 14 }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      Specific Questions for the Doctor Visit
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {scenario.valuableOutput.supportedQuestions.map((q, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          fontSize: '12.5px',
                          color: '#0F172A',
                          lineHeight: 1.45,
                        }}>
                          <span style={{ color: '#0284C7', fontWeight: 800 }}>{idx + 1}.</span>
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Tab 2: Generic Advice vs. Useful Reasoning */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  background: '#F8FAFC',
                  borderRadius: '14px',
                  padding: '16px',
                  border: '1px solid #E2E8F0',
                }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>
                    Why Workflow Reasoning Matters
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                    Standard consumer health AI tools give generic lifestyle platitudes or jump directly to scary, unverified diagnostic labels. HealthChain uses structured workflow reasoning that coordinates evidence, maintains strict epistemic boundaries, and equips you for an authentic doctor consultation.
                  </p>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 14,
                }}>
                  {/* Generic Tool Column */}
                  <div style={{
                    background: '#FFF5F5',
                    border: '1.5px solid #FECACA',
                    borderRadius: '16px',
                    padding: '18px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <AlertTriangle size={16} color="#DC2626" />
                      <strong style={{ fontSize: '13.5px', color: '#991B1B' }}>Typical Generic Advice</strong>
                    </div>
                    <blockquote style={{
                      margin: '0 0 12px',
                      padding: '8px 12px',
                      background: '#FFFFFF',
                      borderLeft: '3px solid #EF4444',
                      borderRadius: '0 6px 6px 0',
                      fontSize: '12.5px',
                      color: '#7F1D1D',
                      fontStyle: 'italic',
                      lineHeight: 1.45,
                    }}>
                      "{scenario.comparison.genericAdvice}"
                    </blockquote>
                    <div style={{ fontSize: '12px', color: '#991B1B', lineHeight: 1.45 }}>
                      <strong>The Clinical Pitfall:</strong> {scenario.comparison.genericPitfall}
                    </div>
                  </div>

                  {/* HealthChain Column */}
                  <div style={{
                    background: '#ECFDF5',
                    border: '1.5px solid #A7F3D0',
                    borderRadius: '16px',
                    padding: '18px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <CheckCircle2 size={16} color="#059669" />
                      <strong style={{ fontSize: '13.5px', color: '#065F46' }}>HealthChain Useful Reasoning</strong>
                    </div>
                    <div style={{
                      margin: '0 0 12px',
                      padding: '8px 12px',
                      background: '#FFFFFF',
                      borderLeft: '3px solid #10B981',
                      borderRadius: '0 6px 6px 0',
                      fontSize: '12.5px',
                      color: '#065F46',
                      fontWeight: 600,
                      lineHeight: 1.45,
                    }}>
                      {scenario.comparison.usefulReasoning}
                    </div>
                    <div style={{ fontSize: '12px', color: '#047857', lineHeight: 1.45 }}>
                      <strong>Real Clinical Value:</strong> {scenario.comparison.clinicalValue}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '12.5px', color: '#64748B' }}>
              Want to see this workflow with your actual records?
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  triggerHapticLight();
                  onClose();
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: '100px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  triggerHapticLight();
                  onLaunchCase(scenario.id);
                }}
                style={{
                  padding: '9px 20px',
                  borderRadius: '100px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                }}
              >
                <span>Launch This Workflow Case</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
