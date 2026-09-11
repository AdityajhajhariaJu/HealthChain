import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Stethoscope, Users, HelpCircle, ShieldAlert, CheckCircle2, 
  GitMerge, ArrowRight, AlertCircle, Sparkles, Scale, BookOpen,
  Info, ChevronDown, ChevronUp, Layers, Compass
} from 'lucide-react';
import { 
  MeaningfulPerspective, 
  BoundedComparisonSummary, 
  VersionedEvidenceSet 
} from '../../services/MultiPerspectiveReviewEngine';
import { triggerHapticLight } from '../../services/haptics';

interface MeaningfulMultiPerspectiveViewProps {
  perspectives: MeaningfulPerspective[];
  boundedComparison?: BoundedComparisonSummary;
  versionedEvidence?: VersionedEvidenceSet;
}

export const MeaningfulMultiPerspectiveView: React.FC<MeaningfulMultiPerspectiveViewProps> = ({
  perspectives,
  boundedComparison,
  versionedEvidence,
}) => {
  const [activePerspectiveId, setActivePerspectiveId] = useState<string>(
    perspectives[0]?.id || 'persp_meaningful_1'
  );
  const [expandedDetails, setExpandedDetails] = useState<boolean>(true);

  if (!perspectives || perspectives.length === 0) return null;

  const currentPerspective = perspectives.find(p => p.id === activePerspectiveId) || perspectives[0];

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '24px',
      border: '1.5px solid #BAE6FD',
      boxShadow: '0 8px 30px rgba(2, 132, 199, 0.06)',
      overflow: 'hidden',
      margin: '24px 0',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
        color: '#FFFFFF',
        padding: '24px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.15)', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
              <Stethoscope size={13} />
              AI perspectives on your case
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
              Multi-Disciplinary Board: One Evidence Set, Distinct Clinical Questions
            </h3>
            <p style={{ margin: '6px 0 0 0', fontSize: '13.5px', color: '#E0F2FE', lineHeight: 1.5, maxWidth: '760px' }}>
              Specialties do not repeat the same summary. Each board evaluates the versioned evidence set through a dedicated clinical inquiry, testing counter-evidence and asking cross-perspective questions.
            </p>
          </div>

          {versionedEvidence && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '6px 14px',
              borderRadius: '12px',
              fontSize: '11.5px',
              color: '#F0F9FF',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Layers size={13} />
              <span>Versioned Evidence: {versionedEvidence.facts.length} facts ({versionedEvidence.hash})</span>
            </div>
          )}
        </div>

        {/* Perspective Selector Pills */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '18px', overflowX: 'auto', paddingBottom: '4px' }}>
          {perspectives.map((pers) => {
            const isActive = pers.id === activePerspectiveId;
            return (
              <button
                key={pers.id}
                onClick={() => {
                  triggerHapticLight();
                  setActivePerspectiveId(pers.id);
                }}
                style={{
                  background: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.12)',
                  color: isActive ? '#0369A1' : '#FFFFFF',
                  border: isActive ? '1.5px solid #FFFFFF' : '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontSize: '12.5px',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Stethoscope size={13} color={isActive ? '#0284C7' : '#BAE6FD'} />
                <span>{pers.specialty.split(' ')[0]} Board</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Perspective Card: The 7 Attributes */}
      <div style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
              Active Clinical Board
            </div>
            <h4 style={{ margin: 0, fontSize: '19px', fontWeight: 900, color: '#0F172A' }}>
              {currentPerspective.specialty}
            </h4>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '3px' }}>
              <strong>Selection Reason:</strong> {currentPerspective.selectionReason}
            </div>
          </div>

          {/* 1. Question Addressed */}
          <div style={{
            background: '#F0F9FF',
            border: '1.5px solid #BAE6FD',
            borderRadius: '14px',
            padding: '12px 16px',
            maxWidth: '480px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
              1. Question Addressed (Prevents Repetitive Reviews)
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0C4A6E', lineHeight: 1.4 }}>
              "{currentPerspective.questionAddressed}"
            </div>
          </div>
        </div>

        {/* 3. Pathophysiological Interpretation */}
        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '18px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
            3. Unique Pathophysiological Interpretation
          </div>
          <p style={{ margin: 0, fontSize: '14.5px', color: '#1E293B', lineHeight: 1.6, fontWeight: 500 }}>
            {currentPerspective.interpretation}
          </p>
        </div>

        {/* Grid of Attributes 2, 4, 5, 6, 7 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {/* 2. Evidence Considered (Inspectable Coverage) */}
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
              2. Evidence Considered (Inspectable Coverage)
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
              {currentPerspective.evidenceConsidered.map((ev, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{ev}</li>
              ))}
            </ul>
          </div>

          {/* 4. Evidence Against (Prevents Confirmation Bias) */}
          <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
              4. Evidence Against / Normal Tests
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#7F1D1D', lineHeight: 1.4 }}>
              {currentPerspective.evidenceAgainst.map((ev, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{ev}</li>
              ))}
            </ul>
          </div>

          {/* 5. Missing Information (Epistemic Limits) */}
          <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
              5. Missing Information (Epistemic Limits)
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#78350F', lineHeight: 1.4 }}>
              {currentPerspective.missingInformation.map((ev, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{ev}</li>
              ))}
            </ul>
          </div>

          {/* 6. Question for Another Perspective (Cross-Specialty Integration) */}
          <div style={{ background: '#EEF2FF', border: '1.5px solid #C7D2FE', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#3730A3', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
              6. Question for {currentPerspective.questionForAnotherPerspective.targetSpecialty.split(' ')[0]}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E1B4B', lineHeight: 1.4, marginBottom: '6px' }}>
              "{currentPerspective.questionForAnotherPerspective.question}"
            </div>
            <div style={{ fontSize: '12px', color: '#4338CA' }}>
              <strong>Rationale:</strong> {currentPerspective.questionForAnotherPerspective.clinicalRationale}
            </div>
          </div>

          {/* 7. What Would Change This Interpretation (Future Updates) */}
          <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
              7. What Would Change This Interpretation
            </div>
            <div style={{ fontSize: '13px', color: '#14532D', lineHeight: 1.4 }}>
              {currentPerspective.whatWouldChangeInterpretation}
            </div>
          </div>
        </div>

        {/* Board-Level Bounded Comparison Panel */}
        {boundedComparison && (
          <div style={{
            background: '#F8FAFC',
            border: '2px solid #E2E8F0',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={18} color="#0284C7" />
                <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                  Board Synthesis: Bounded Cross-Perspective Comparison
                </h4>
              </div>

              {/* Outcome Type Pill */}
              <span style={{
                fontSize: '11.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '4px 12px',
                borderRadius: '999px',
                background: boundedComparison.outcomeType === 'unifying_explanation' ? '#ECFDF5' : boundedComparison.outcomeType === 'multiple_unrelated_issues' ? '#EFF6FF' : '#FEF3C7',
                color: boundedComparison.outcomeType === 'unifying_explanation' ? '#047857' : boundedComparison.outcomeType === 'multiple_unrelated_issues' ? '#1D4ED8' : '#B45309',
                border: '1px solid currentColor'
              }}>
                Verdict: {boundedComparison.outcomeType.replace(/_/g, ' ')}
              </span>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#334155', lineHeight: 1.55 }}>
              {boundedComparison.outcomeSummary}
            </p>

            {/* Shared Model Assumptions */}
            <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                Shared Model Assumptions Recognised
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
                {boundedComparison.sharedModelAssumptions.map((assump, i) => (
                  <li key={i} style={{ marginBottom: '3px' }}>{assump}</li>
                ))}
              </ul>
            </div>

            {/* Visible Disagreements with Resolving Evidence */}
            {boundedComparison.disagreements.length > 0 && (
              <div style={{ background: '#FFFDF5', border: '1.5px solid #FDE68A', borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                  Visible Clinical Disagreements & Evidence Needed to Resolve
                </div>
                {boundedComparison.disagreements.map((dis, i) => (
                  <div key={i} style={{ marginBottom: i < boundedComparison.disagreements.length - 1 ? '12px' : 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#78350F', lineHeight: 1.4 }}>
                      • Dispute: {dis.disputePoint}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#92400E', marginTop: '3px', background: 'rgba(255,255,255,0.7)', padding: '6px 10px', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                      <strong>Evidence Needed To Resolve:</strong> {dis.evidenceNeededToResolve}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Clear Decision or Question */}
            <div style={{ background: '#EFF6FF', border: '1.5px solid #93C5FD', borderRadius: '12px', padding: '12px 16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase' }}>
                Clear Actionable Takeaway
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E3A8A', marginTop: '2px' }}>
                {boundedComparison.clearDecisionOrQuestion}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
