import React, { useState } from 'react';
import { 
  CheckCircle2, ChevronDown, ChevronUp, FileText, 
  HelpCircle, ArrowRight, Sparkles, Copy, Check,
  AlertCircle, Link2, ShieldCheck, Scale, Compass, Calendar
} from 'lucide-react';
import { 
  StructuredClinicalAnswer, 
  EpistemicRelationshipStatus, 
  DoctorVisitBrief 
} from '../../services/StructuredAnswerEngine';
import { InformationCategoryBadge } from './InformationCategoryBadge';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';

interface StructuredAnswerViewProps {
  answer: StructuredClinicalAnswer;
  onOpenSourceModal?: (source: any) => void;
  className?: string;
}

const statusBadgeStyles: Record<EpistemicRelationshipStatus, { bg: string; border: string; text: string; label: string }> = {
  supported: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', label: 'Supported' },
  proposed: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', label: 'Proposed' },
  contradicted: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', label: 'Contradicted' },
  unknown: { bg: '#F8FAFC', border: '#E2E8F0', text: '#475569', label: 'Unknown' },
};

export const StructuredAnswerView: React.FC<StructuredAnswerViewProps> = ({
  answer,
  onOpenSourceModal,
  className = '',
}) => {
  const isMobile = useIsMobile();
  const [expandL1, setExpandL1] = useState(false);
  const [expandL2, setExpandL2] = useState(false);
  const [expandL3, setExpandL3] = useState(false);
  const [expandL4, setExpandL4] = useState(false);
  const [expandL5, setExpandL5] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);

  const {
    layer1_mainAnswer,
    layer2_whyThisMatters,
    layer3_otherExplanations,
    layer4_whatWeStillNeed,
    layer5_nextStep,
  } = answer;

  const handleCopyDoctorBrief = async () => {
    triggerHapticLight();
    const brief = layer5_nextStep.doctorVisitBrief;
    const text = `CLINICAL VISIT BRIEF (HealthChain)
Question for Clinician:
${brief.specificQuestion}

Why This Matters:
${brief.whyItMatters}

Relevant Records to Review:
${brief.relevantRecords.map(r => `• ${r}`).join('\n')}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedBrief(true);
      triggerHapticSuccess();
      setTimeout(() => setCopiedBrief(false), 2500);
    } catch {
      // clipboard fallback
    }
  };

  return (
    <div 
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        margin: '0 0 24px',
        fontFamily: 'inherit',
      }}
    >
      {/* HEADER: STEP 7 ARCHITECTURAL CONTRACT */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '12px 18px',
        background: '#F8FAFC',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: '#0F172A',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 800,
          }}>
            5L
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.2px' }}>
              Structured Case Synthesis
            </span>
            <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '8px' }}>
              Progressive disclosure • Source-grounded reasoning
            </span>
          </div>
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#059669',
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          padding: '2px 8px',
          borderRadius: '999px',
        }}>
          No Fake Probabilities
        </span>
      </div>

      {/* ==========================================
          LAYER 1: MAIN ANSWER (2-3 Sentences -> Full Synthesis)
          ========================================== */}
      <div style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
        border: '1.5px solid #86EFAC',
        borderRadius: '16px',
        padding: isMobile ? '16px' : '20px',
        boxShadow: '0 4px 14px rgba(34, 197, 94, 0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: '#166534',
              background: '#DCFCE7',
              padding: '2px 8px',
              borderRadius: '6px',
            }}>
              Layer 1 • Main Answer
            </span>
          </div>
          <button
            onClick={() => {
              triggerHapticLight();
              setExpandL1(!expandL1);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#166534',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
            }}
          >
            <span>{expandL1 ? 'Hide Full Synthesis' : 'Expand Full Synthesis'}</span>
            {expandL1 ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        <p style={{
          margin: '0 0 4px',
          fontSize: isMobile ? '14px' : '15px',
          fontWeight: 600,
          lineHeight: 1.6,
          color: '#0F172A',
        }}>
          {layer1_mainAnswer.conciseAnswer}
        </p>

        {expandL1 && (
          <div style={{
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: '1px solid #BBF7D0',
            fontSize: '13px',
            lineHeight: 1.65,
            color: '#334155',
            whiteSpace: 'pre-line',
            background: 'rgba(255, 255, 255, 0.7)',
            padding: '12px 14px',
            borderRadius: '10px',
          }}>
            <div style={{ fontWeight: 800, fontSize: '11.5px', color: '#14532D', textTransform: 'uppercase', marginBottom: '6px' }}>
              Full Pathophysiological & Evidentiary Synthesis
            </div>
            {layer1_mainAnswer.fullSynthesis}
          </div>
        )}
      </div>

      {/* ==========================================
          LAYER 2: WHY THIS MATTERS IN MY CASE (Observations -> Source Passages)
          ========================================== */}
      <div style={{
        background: '#FFFFFF',
        border: '1.5px solid #BAE6FD',
        borderRadius: '16px',
        padding: isMobile ? '16px' : '20px',
        boxShadow: '0 2px 10px rgba(14, 165, 233, 0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: '#0369A1',
            background: '#E0F2FE',
            padding: '2px 8px',
            borderRadius: '6px',
          }}>
            Layer 2 • Why This Matters in My Case
          </span>
          <button
            onClick={() => {
              triggerHapticLight();
              setExpandL2(!expandL2);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0369A1',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
            }}
          >
            <span>{expandL2 ? 'Hide Source Details' : 'View Source Passages & Dates'}</span>
            {expandL2 ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {layer2_whyThisMatters.strongestObservations.map((obs, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '8px', 
                fontSize: '13.5px', 
                lineHeight: 1.5,
                color: '#0F172A',
                fontWeight: 500,
              }}
            >
              <div style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: '#0284C7', 
                marginTop: '7px', 
                flexShrink: 0 
              }} />
              <span>{obs}</span>
            </div>
          ))}
        </div>

        {expandL2 && (
          <div style={{
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: '1px solid #E0F2FE',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <div style={{ fontWeight: 800, fontSize: '11px', color: '#0369A1', textTransform: 'uppercase' }}>
              Documented Origins & Verified Timestamps (Acceptance Criterion 2)
            </div>
            {layer2_whyThisMatters.sourcePassages.map((src, idx) => (
              <div 
                key={idx}
                style={{
                  background: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontSize: '12.5px',
                }}
              >
                <div style={{ color: '#0F172A', fontWeight: 600, marginBottom: '4px' }}>
                  "{src.passage}"
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <InformationCategoryBadge category={(src.category as any) || 'extracted_finding'} size="sm" />
                  <span style={{ fontSize: '11px', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <FileText size={12} color="#0284C7" />
                    {src.source}
                  </span>
                  {src.date && (
                    <span style={{ fontSize: '11px', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      {src.date}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==========================================
          LAYER 3: OTHER EXPLANATIONS (Alternatives -> Balanced Differential -> Relations)
          ========================================== */}
      <div style={{
        background: '#FFFFFF',
        border: '1.5px solid #FED7AA',
        borderRadius: '16px',
        padding: isMobile ? '16px' : '20px',
        boxShadow: '0 2px 10px rgba(234, 88, 12, 0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: '#C2410C',
            background: '#FFEDD5',
            padding: '2px 8px',
            borderRadius: '6px',
          }}>
            Layer 3 • Other Explanations
          </span>
          <button
            onClick={() => {
              triggerHapticLight();
              setExpandL3(!expandL3);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#C2410C',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
            }}
          >
            <span>{expandL3 ? 'Hide Alternatives' : 'View Differential & Relationship Statuses'}</span>
            {expandL3 ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {layer3_otherExplanations.plausibleAlternatives.map((alt, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '8px', 
                fontSize: '13.5px', 
                color: '#334155',
                lineHeight: 1.5,
              }}
            >
              <Scale size={15} color="#EA580C" style={{ marginTop: '3px', flexShrink: 0 }} />
              <span>{alt}</span>
            </div>
          ))}
        </div>

        {expandL3 && (
          <div style={{
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: '1px solid #FFEDD5',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            {/* Balanced evidence cards */}
            <div style={{ fontWeight: 800, fontSize: '11px', color: '#9A3412', textTransform: 'uppercase' }}>
              Balanced Evidence (Supporting vs Conflicting)
            </div>
            {layer3_otherExplanations.balancedEvidence.map((item, idx) => (
              <div 
                key={idx}
                style={{
                  background: '#FFFDFB',
                  border: '1px solid #FED7AA',
                  borderRadius: '12px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px', fontStyle: 'italic' }}>
                  {item.mechanism}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: '#ECFDF5', padding: '8px 10px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', marginBottom: '2px' }}>
                      Supporting Observation
                    </div>
                    {item.supportingEvidence.map((s, i) => (
                      <div key={i} style={{ fontSize: '11.5px', color: '#0F172A' }}>• {s}</div>
                    ))}
                  </div>
                  <div style={{ background: '#FEF2F2', padding: '8px 10px', borderRadius: '8px', border: '1px solid #FECACA' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', marginBottom: '2px' }}>
                      Conflicting / Missing
                    </div>
                    {item.conflictingEvidence.map((c, i) => (
                      <div key={i} style={{ fontSize: '11.5px', color: '#0F172A' }}>• {c}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Epistemic relationship status replacements */}
            <div style={{ fontWeight: 800, fontSize: '11px', color: '#9A3412', textTransform: 'uppercase', marginTop: '4px' }}>
              Connection Statuses (Replacing "Everything Is Connected")
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {layer3_otherExplanations.relationshipStatuses.map((rel, idx) => {
                const badge = statusBadgeStyles[rel.status] || statusBadgeStyles.unknown;
                return (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      padding: '8px 12px',
                      background: '#FFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                        {rel.connection}
                      </span>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                        {rel.rationale}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                      color: badge.text,
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          LAYER 4: WHAT WE STILL NEED (1-2 Gaps -> Complete Checklist)
          ========================================== */}
      <div style={{
        background: '#FFFFFF',
        border: '1.5px solid #FDE68A',
        borderRadius: '16px',
        padding: isMobile ? '16px' : '20px',
        boxShadow: '0 2px 10px rgba(202, 138, 4, 0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: '#B45309',
            background: '#FEF3C7',
            padding: '2px 8px',
            borderRadius: '6px',
          }}>
            Layer 4 • What We Still Need
          </span>
          <button
            onClick={() => {
              triggerHapticLight();
              setExpandL4(!expandL4);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#B45309',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
            }}
          >
            <span>{expandL4 ? 'Hide Gaps' : 'View Complete Missing-Information List'}</span>
            {expandL4 ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {layer4_whatWeStillNeed.criticalGaps.map((gap, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '8px', 
                fontSize: '13.5px', 
                color: '#78350F',
                lineHeight: 1.5,
              }}
            >
              <HelpCircle size={15} color="#D97706" style={{ marginTop: '3px', flexShrink: 0 }} />
              <span>{gap}</span>
            </div>
          ))}
        </div>

        {expandL4 && (
          <div style={{
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: '1px solid #FEF3C7',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ fontWeight: 800, fontSize: '11px', color: '#92400E', textTransform: 'uppercase' }}>
              Complete Diagnostic Gaps Checklist
            </div>
            {layer4_whatWeStillNeed.completeMissingList.map((item, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  color: '#92400E',
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D97706', marginTop: '6px', flexShrink: 0 }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==========================================
          LAYER 5: NEXT STEP (1 Action -> Doctor Visit Brief)
          ========================================== */}
      <div style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #EEF2FF 100%)',
        border: '1.5px solid #A5B4FC',
        borderRadius: '16px',
        padding: isMobile ? '16px' : '20px',
        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: '#4338CA',
            background: '#E0E7FF',
            padding: '2px 8px',
            borderRadius: '6px',
          }}>
            Layer 5 • Next Step
          </span>
          <button
            onClick={() => {
              triggerHapticLight();
              setExpandL5(!expandL5);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#4338CA',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
            }}
          >
            <span>{expandL5 ? 'Hide Other Actions' : 'View Doctor Brief & Other Options'}</span>
            {expandL5 ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: isMobile ? '14px' : '14.5px',
          fontWeight: 700,
          color: '#1E1B4B',
          lineHeight: 1.5,
        }}>
          <Compass size={17} color="#4F46E5" style={{ flexShrink: 0 }} />
          <span>{layer5_nextStep.chosenAction}</span>
        </div>

        {/* ALWAYS PRESENT OR EXPANDABLE: THE DOCTOR VISIT BRIEF (Avoid Rule 1) */}
        <div style={{
          marginTop: '14px',
          background: '#FFFFFF',
          border: '1px solid #C7D2FE',
          borderRadius: '12px',
          padding: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="#4F46E5" />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#312E81', textTransform: 'uppercase' }}>
                Doctor Visit Brief (Empowering Consultation)
              </span>
            </div>
            <button
              onClick={handleCopyDoctorBrief}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: copiedBrief ? '#ECFDF5' : '#F5F3FF',
                border: copiedBrief ? '1px solid #6EE7B7' : '1px solid #DDD6FE',
                color: copiedBrief ? '#047857' : '#5B21B6',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {copiedBrief ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedBrief ? 'Copied' : 'Copy Brief'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#6366F1', textTransform: 'uppercase' }}>
                Specific Question to Ask
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                "{layer5_nextStep.doctorVisitBrief.specificQuestion}"
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#6366F1', textTransform: 'uppercase' }}>
                Why It Matters in Your Case
              </div>
              <div style={{ fontSize: '12.5px', color: '#334155', marginTop: '2px' }}>
                {layer5_nextStep.doctorVisitBrief.whyItMatters}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#6366F1', textTransform: 'uppercase' }}>
                Relevant Records to Review
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                {layer5_nextStep.doctorVisitBrief.relevantRecords.map((r, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#475569' }}>• {r}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {expandL5 && layer5_nextStep.otherActions.length > 0 && (
          <div style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #E0E7FF',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{ fontWeight: 800, fontSize: '11px', color: '#4338CA', textTransform: 'uppercase' }}>
              Other Available Actions
            </div>
            {layer5_nextStep.otherActions.map((act, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  color: '#312E81',
                }}
              >
                <ArrowRight size={13} color="#6366F1" />
                <span>{act}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
