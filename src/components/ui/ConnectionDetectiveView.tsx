import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitMerge,
  Sparkles,
  Stethoscope,
  Activity,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Printer,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  getConnectionDetectiveReport,
  ConnectionDetectiveReport,
  SpecialistDialogue,
  ClinicalMissItem,
} from '../../services/ConnectionDetectiveEngine';
import { triggerHapticLight } from '../../services/haptics';
import { CaseConnectionMap } from './CaseConnectionMap';
import { useIsMobile } from '../../hooks/useIsMobile';

interface ConnectionDetectiveViewProps {
  onOpenFoodDetective?: () => void;
  onOpenConsult?: () => void;
}

export const ConnectionDetectiveView: React.FC<ConnectionDetectiveViewProps> = ({
  onOpenFoodDetective,
  onOpenConsult,
}) => {
  const isMobile = useIsMobile();
  const [report] = useState<ConnectionDetectiveReport>(getConnectionDetectiveReport());
  const [activeTab, setActiveTab] = useState<'map' | 'consensus' | 'misses' | 'dossier'>('map');
  const [isCopied, setIsCopied] = useState(false);

  const handleCopySbar = () => {
    triggerHapticLight();
    const text = `HEALTHCHAIN 360 • CLINIC USP CONNECTION DETECTIVE REPORT
Patient: ${report.patientName}
Generated: ${report.generatedAt}
Primary Root-Cause Hypothesis: ${report.primaryHypothesis} (Alignment: ${report.matchConfidence}%)

[S] SITUATION:
${report.doctorDossier.sbar.situation}

[B] BACKGROUND:
${report.doctorDossier.sbar.background}

[A] ASSESSMENT:
${report.doctorDossier.sbar.assessment}

[R] RECOMMENDATION:
${report.doctorDossier.sbar.recommendation}

PRIORITIZED TESTS TO ORDER:
${report.doctorDossier.testsToOrder.map((t) => `• [${t.priority}] ${t.test} — ${t.rationale}`).join('\n')}

ICD-10 CODES:
${report.doctorDossier.icdCodes.map((c) => `• ${c.code}: ${c.label}`).join('\n')}

CLINICAL CITATIONS:
${report.doctorDossier.citations.map((cite) => `• ${cite}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    triggerHapticLight();
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Multi-Stream Data Convergence Top Banner (Matching Landing Page USP!) */}
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '24px',
          padding: isMobile ? '18px 16px' : '22px 24px',
          color: '#FFFFFF',
          border: '1.5px solid #334155',
          boxShadow: '0 16px 36px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              CROSS-SYSTEM CLINICAL CONVERGENCE
            </span>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '999px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38BDF8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            {report.matchConfidence}% Board Aligned
          </span>
        </div>

        <h3 style={{ margin: '0 0 6px 0', fontSize: isMobile ? '17px' : '20px', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.3px', lineHeight: 1.3 }}>
          {report.primaryHypothesis}
        </h3>
        <p style={{ margin: 0, fontSize: '12.5px', color: '#94A3B8', lineHeight: 1.4 }}>
          {report.mapData.narrative}
        </p>

        {/* 4 Data Stream Chips (Landing Page Convergence) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '8px',
            marginTop: '16px',
          }}
        >
          {report.streams.map((stream) => (
            <div
              key={stream.id}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '14px',
                padding: '10px 12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '18px' }}>{stream.icon}</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#F1F5F9' }}>{stream.title}</div>
                <div style={{ fontSize: '10px', color: stream.color, fontWeight: 700 }}>{stream.status}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Animated SVG Convergence Conduits (from Landing page) */}
        <div style={{ width: '100%', height: '36px', marginTop: '10px', overflow: 'hidden' }}>
          <svg viewBox="0 0 400 36" style={{ width: '100%', height: '100%' }} fill="none">
            <motion.path
              d="M 50 0 C 50 20, 190 20, 200 36"
              stroke="#F43F5E"
              strokeWidth="2"
              strokeDasharray="4 4"
              animate={{ strokeDashoffset: [20, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            />
            <motion.path
              d="M 150 0 C 150 18, 195 24, 200 36"
              stroke="#0284C7"
              strokeWidth="2"
              strokeDasharray="4 4"
              animate={{ strokeDashoffset: [20, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            />
            <motion.path
              d="M 250 0 C 250 18, 205 24, 200 36"
              stroke="#10B981"
              strokeWidth="2"
              strokeDasharray="4 4"
              animate={{ strokeDashoffset: [20, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            />
            <motion.path
              d="M 350 0 C 350 20, 210 20, 200 36"
              stroke="#8B5CF6"
              strokeWidth="2"
              strokeDasharray="4 4"
              animate={{ strokeDashoffset: [20, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            />
            <circle cx="200" cy="34" r="3" fill="#10B981" />
          </svg>
        </div>
      </div>

      {/* 2. Sub-Tab Selector Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: '2px',
        }}
      >
        {[
          { id: 'map', label: 'Connection Map', icon: '🌐' },
          { id: 'consensus', label: 'Specialist Debate', icon: '⚡' },
          { id: 'misses', label: 'What Doctors Missed', icon: '🔍' },
          { id: 'dossier', label: 'Doctor Dossier (<60s)', icon: '📋' },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                triggerHapticLight();
                setActiveTab(t.id as any);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '999px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: isActive ? '1.5px solid #0284C7' : '1.5px solid #E2E8F0',
                background: isActive ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#475569',
                boxShadow: isActive ? '0 4px 12px rgba(2, 132, 199, 0.28)' : '0 2px 6px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Sub-Tab Contents */}

      {/* TAB 1: INTERACTIVE CONNECTION MAP */}
      {activeTab === 'map' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '22px',
              padding: '18px 20px',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#6366F1', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  MULTI-ORGAN SYSTEMIC TOPOLOGY
                </span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  Symptom-to-Organ Pathway Graph
                </h4>
              </div>

              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                Hover or tap nodes to trace causal links
              </span>
            </div>

            <CaseConnectionMap data={report.mapData} isMobile={isMobile} />
          </div>

          {/* Quick Bridge CTA to Food Detective */}
          {onOpenFoodDetective && (
            <div
              style={{
                background: 'linear-gradient(135deg, #FFF1ED 0%, #FFEBE6 100%)',
                borderRadius: '18px',
                padding: '14px 18px',
                border: '1.5px solid #FCD9C6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🔬</span>
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#1C1917', display: 'block' }}>
                    Connected Food Sensitivities Detected
                  </strong>
                  <span style={{ fontSize: '12px', color: '#78716C' }}>
                    Histamine & FODMAPs identified as upstream vascular triggers.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  onOpenFoodDetective();
                }}
                style={{
                  background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: '0 3px 10px rgba(255, 107, 74, 0.28)',
                }}
              >
                Inspect Foods <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SPECIALIST BOARD CONSENSUS */}
      {activeTab === 'consensus' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#8E9AAF', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            CROSS-DISCIPLINARY CASE DEBATE
          </div>

          {report.consensusDialogue.map((dialogue, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '16px 18px',
                border: '1.5px solid #F1F5F9',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: dialogue.bg,
                      color: dialogue.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      flexShrink: 0,
                    }}
                  >
                    {dialogue.icon}
                  </div>
                  <div>
                    <strong style={{ fontSize: '15px', color: '#0F172A', display: 'block' }}>
                      {dialogue.role}
                    </strong>
                    <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                      {dialogue.specialty} • {dialogue.organ}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: '#ECFDF5',
                    color: '#059669',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  Active Finding
                </span>
              </div>

              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  color: '#334155',
                  lineHeight: 1.5,
                  border: '1px solid #E2E8F0',
                }}
              >
                "{dialogue.finding}"
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* TAB 3: WHAT 15-MINUTE DOCTOR VISITS MISSED */}
      {activeTab === 'misses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              background: '#FFF1F2',
              borderRadius: '16px',
              padding: '14px 16px',
              border: '1px solid #FECDD3',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertTriangle size={20} color="#E11D48" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '13.5px', color: '#BE123C', display: 'block' }}>
                The Single-Specialist Silo Problem
              </strong>
              <span style={{ fontSize: '12px', color: '#9F1239' }}>
                Standard 15-minute consultations review single organs in isolation. Here are the specific clinical gaps HealthChain uncovered.
              </span>
            </div>
          </div>

          {report.clinicalMisses.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                padding: '16px 18px',
                border: '1.5px solid #F1F5F9',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                {item.overlookedBy}
              </div>

              <div style={{ background: '#FEF2F2', padding: '10px 12px', borderRadius: '10px', border: '1px solid #FCA5A5' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                  Routine 15-Min Conclusion:
                </span>
                <span style={{ fontSize: '12.5px', color: '#991B1B' }}>{item.standardFinding}</span>
              </div>

              <div style={{ background: '#F0FDF4', padding: '10px 12px', borderRadius: '10px', border: '1px solid #86EFAC' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                  What Was Missed (HealthChain Connection):
                </span>
                <span style={{ fontSize: '12.5px', color: '#166534', fontWeight: 600 }}>{item.whatWasMissed}</span>
              </div>

              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                <strong>Clinical Consequence:</strong> {item.clinicalImpact}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: DOCTOR DOSSIER (<60s SBAR BRIEF) */}
      {activeTab === 'dossier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#8E9AAF', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              PHYSICIAN-READY APPOINTMENT BRIEF
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleCopySbar}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: isCopied ? '#ECFDF5' : '#FFFFFF',
                  color: isCopied ? '#059669' : '#1E293B',
                  border: isCopied ? '1.5px solid #10B981' : '1px solid #CBD5E1',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isCopied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                <span>{isCopied ? 'Copied' : 'Copy SBAR'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Printer size={13} />
                <span>Print / PDF</span>
              </button>
            </div>
          </div>

          {/* SBAR Container */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '20px',
              border: '1.5px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
              <div style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                Consultation Discussion Brief
              </div>
              <h4 style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                {report.primaryHypothesis}
              </h4>
            </div>

            {/* SBAR Boxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <strong style={{ fontSize: '11px', color: '#0284C7', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                  [S] Situation
                </strong>
                <span style={{ fontSize: '12.5px', color: '#334155' }}>{report.doctorDossier.sbar.situation}</span>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <strong style={{ fontSize: '11px', color: '#0284C7', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                  [B] Background
                </strong>
                <span style={{ fontSize: '12.5px', color: '#334155' }}>{report.doctorDossier.sbar.background}</span>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <strong style={{ fontSize: '11px', color: '#0284C7', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                  [A] Assessment
                </strong>
                <span style={{ fontSize: '12.5px', color: '#334155' }}>{report.doctorDossier.sbar.assessment}</span>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <strong style={{ fontSize: '11px', color: '#0284C7', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                  [R] Recommendation
                </strong>
                <span style={{ fontSize: '12.5px', color: '#334155' }}>{report.doctorDossier.sbar.recommendation}</span>
              </div>
            </div>

            {/* Prioritized Tests to Order */}
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                Recommended Tests to Request:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {report.doctorDossier.testsToOrder.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#166534', display: 'block' }}>{t.test}</strong>
                      <span style={{ color: '#15803D', fontSize: '11px' }}>{t.rationale}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: t.priority === 'High' ? '#DC2626' : '#0284C7',
                        color: '#FFFFFF',
                      }}
                    >
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ICD-10 & Citations */}
            <div style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                Associated ICD-10 Diagnostic Codes:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {report.doctorDossier.icdCodes.map((c) => (
                  <span
                    key={c.code}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: '#F1F5F9',
                      color: '#475569',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <strong>{c.code}</strong> — {c.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
