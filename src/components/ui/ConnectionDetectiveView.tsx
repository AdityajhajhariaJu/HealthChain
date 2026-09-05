import React, { useState, useMemo } from 'react';
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
  ArrowLeft,
  X,
  Zap,
  CheckCircle2,
  Share2,
  Sliders,
  Scale,
  Pill,
} from 'lucide-react';
import {
  getConnectionDetectiveReport,
  ConnectionDetectiveReport,
  SpecialistDialogue,
  ClinicalMissItem,
  NodeDetail,
  CausalCascadeStage,
  SymptomClusterItem,
  SystemAxis,
  evaluateSymptomCluster,
} from '../../services/ConnectionDetectiveEngine';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';
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
  const [activeTab, setActiveTab] = useState<'map' | 'cascade' | 'matcher' | 'consensus' | 'misses' | 'dossier'>('map');
  const [activeSystemFilter, setActiveSystemFilter] = useState<string>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeCascadeStage, setActiveCascadeStage] = useState<number>(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['symp_fatigue', 'symp_palpitations', 'symp_bloat']);
  const [isCopied, setIsCopied] = useState(false);

  // Active selected node detail
  const activeNodeDetail = selectedNodeId ? report.nodeDetails[selectedNodeId] : null;

  // Real-time evaluation of symptom cluster
  const clusterEvaluation = useMemo(() => {
    return evaluateSymptomCluster(selectedSymptoms);
  }, [selectedSymptoms]);

  const toggleSymptom = (sympId: string) => {
    triggerHapticSelection();
    setSelectedSymptoms((prev) =>
      prev.includes(sympId) ? prev.filter((id) => id !== sympId) : [...prev, sympId]
    );
  };

  const handleCopySbar = () => {
    triggerHapticLight();
    const text = `HEALTHCHAIN 360 • CLINIC USP CONNECTION DETECTIVE REPORT
Patient: ${report.patientName}
Generated: ${report.generatedAt}
Primary Root-Cause Hypothesis: ${report.primaryHypothesis} (Board Alignment: ${report.matchConfidence}%)

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. Multi-Stream Data Convergence Top Banner */}
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF7ED 55%, #FFEDD5 100%)',
          borderRadius: '24px',
          padding: isMobile ? '18px 16px' : '22px 24px',
          color: '#1C1917',
          border: '1.5px solid #FCD9C6',
          boxShadow: '0 12px 32px rgba(249, 115, 22, 0.08)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#E11D48',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                background: '#FFF1F2',
                padding: '2px 8px',
                borderRadius: '999px',
                border: '1px solid #FECDD3',
              }}
            >
              CROSS-SYSTEM CLINICAL CONVERGENCE
            </span>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '999px',
              background: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0',
            }}
          >
            {report.matchConfidence}% Panel Consensus
          </span>
        </div>

        <h3 style={{ margin: '0 0 6px 0', fontSize: isMobile ? '17px' : '20px', fontWeight: 800, color: '#1C1917', letterSpacing: '-0.3px', lineHeight: 1.3 }}>
          {report.primaryHypothesis}
        </h3>
        <p style={{ margin: 0, fontSize: '12.5px', color: '#57534E', lineHeight: 1.4 }}>
          {report.mapData.narrative}
        </p>

        {/* 4 Data Stream Chips */}
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
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '10px 12px',
                border: '1px solid #FCD9C6',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <span style={{ fontSize: '18px' }}>{stream.icon}</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#1C1917' }}>{stream.title}</div>
                <div style={{ fontSize: '10px', color: stream.color, fontWeight: 700 }}>{stream.status}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Animated SVG Convergence Conduits */}
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
              stroke="#F97316"
              strokeWidth="2"
              strokeDasharray="4 4"
              animate={{ strokeDashoffset: [20, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            />
            <circle cx="200" cy="34" r="3" fill="#10B981" />
          </svg>
        </div>
      </div>

      {/* 2. Systemic Axis Filter Ribbon */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: '2px',
        }}
      >
        {report.systemAxes.map((axis) => {
          const isCurrent = activeSystemFilter === axis.id;
          return (
            <button
              key={axis.id}
              type="button"
              onClick={() => {
                triggerHapticSelection();
                setActiveSystemFilter(axis.id);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: isCurrent ? `1.5px solid ${axis.color}` : '1px solid #E2E8F0',
                background: isCurrent ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                color: isCurrent ? axis.color : '#64748B',
                boxShadow: isCurrent ? `0 2px 8px ${axis.color}25` : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{axis.icon}</span>
              <span>{axis.label}</span>
              <span style={{ fontSize: '10px', opacity: 0.75 }}>({axis.count})</span>
            </button>
          );
        })}
      </div>

      {/* 3. Sub-Tab Selector Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: '2px',
        }}
      >
        {[
          { id: 'map', label: 'Connection Map', icon: '🌐' },
          { id: 'cascade', label: 'Causal Flow', icon: '⚡' },
          { id: 'matcher', label: 'Cross-Matcher', icon: '🔍' },
          { id: 'consensus', label: 'Clinical Panels', icon: '🏛️' },
          { id: 'misses', label: 'What Doctors Missed', icon: '⚠️' },
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
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: isActive ? '1.5px solid #F43F5E' : '1.5px solid #FCD9C6',
                background: isActive ? 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#78716C',
                boxShadow: isActive ? '0 4px 12px rgba(244, 63, 94, 0.28)' : '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Interactive Node Deep-Dive Drawer (When Node is Tapped) */}
      <AnimatePresence>
        {activeNodeDetail && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
              borderRadius: '20px',
              padding: '18px 20px',
              border: '1.5px solid #38BDF8',
              boxShadow: '0 12px 32px rgba(2, 132, 199, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>{activeNodeDetail.systemIcon}</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                    {activeNodeDetail.title}
                  </h4>
                  <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: 700 }}>
                    {activeNodeDetail.systemName} • {activeNodeDetail.confidence}% Match
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  setSelectedNodeId(null);
                }}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
                aria-label="Close node detail"
              >
                <X size={15} />
              </button>
            </div>

            {/* Biochemical Mechanism */}
            <div style={{ background: '#F0F9FF', borderRadius: '12px', padding: '10px 12px', border: '1px solid #BAE6FD', fontSize: '12.5px', color: '#0369A1', lineHeight: 1.4 }}>
              <strong>Biochemical Chain:</strong> {activeNodeDetail.biochemicalMechanism}
            </div>

            {/* Biomarker High-Yield Comparison Table */}
            {activeNodeDetail.biomarkers.length > 0 && (
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  Laboratory Biomarkers Involved:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activeNodeDetail.biomarkers.map((bio, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 10px',
                        background: '#FFFFFF',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <strong style={{ color: '#0F172A' }}>{bio.name}</strong>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Standard: {bio.standardRange} • Optimal: <strong style={{ color: '#059669' }}>{bio.optimalRange}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: bio.status === 'depleted' || bio.status === 'elevated' ? '#FEF2F2' : '#F0FDF4',
                            color: bio.status === 'depleted' || bio.status === 'elevated' ? '#DC2626' : '#16A34A',
                            border: `1px solid ${bio.status === 'depleted' || bio.status === 'elevated' ? '#FECACA' : '#BBF7D0'}`,
                          }}
                        >
                          {bio.userValue}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connected Dietary Triggers */}
            {activeNodeDetail.dietaryTriggers.length > 0 && (
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  Connected Dietary Triggers:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {activeNodeDetail.dietaryTriggers.map((trig, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '5px 10px',
                        background: '#FFF7ED',
                        borderRadius: '8px',
                        border: '1px solid #FFEDD5',
                        fontSize: '11.5px',
                        color: '#C2410C',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span>{trig.icon}</span>
                      <span>{trig.name} ({trig.category})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Specialist Quote */}
            <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
              "{activeNodeDetail.specialistQuote.quote}" — <strong>{activeNodeDetail.specialistQuote.doctor}</strong> ({activeNodeDetail.specialistQuote.role})
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              {onOpenFoodDetective && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    onOpenFoodDetective();
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 3px 10px rgba(255, 107, 74, 0.25)',
                  }}
                >
                  <Sparkles size={14} /> Inspect in Food Detective
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  setActiveTab('dossier');
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: '#F1F5F9',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FileText size={14} /> Add to Doctor Dossier
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Sub-Tab Contents */}

      {/* TAB 1: CONNECTION MAP */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284C7', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  MULTI-ORGAN SYSTEMIC TOPOLOGY
                </span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  Symptom-to-Organ Pathway Graph
                </h4>
              </div>

              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                Filter: <strong style={{ color: '#0284C7' }}>{activeSystemFilter.toUpperCase()}</strong>
              </span>
            </div>

            <CaseConnectionMap
              data={report.mapData}
              isMobile={isMobile}
              selectedNodeId={selectedNodeId}
              onSelectNode={(nodeId) => {
                triggerHapticLight();
                setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
              }}
              filterSystem={activeSystemFilter}
            />
          </div>

          {/* Direct Bridge CTA to Food Detective */}
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

      {/* TAB 2: CAUSAL FLOW CASCADE */}
      {activeTab === 'cascade' && (
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
            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#EA580C', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                THE ROOT-CAUSE DOMINO EFFECT
              </span>
              <h4 style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                5-Stage Sequential Pathophysiology
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Scrub through the chronological chain reaction showing how cellular nutrient deficits trigger autonomic symptoms.
              </p>
            </div>

            {/* Stage Selector Stepper Rail */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '6px',
                background: '#F8FAFC',
                padding: '6px',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                marginBottom: '16px',
              }}
            >
              {report.cascadeStages.map((stage) => {
                const isSelected = activeCascadeStage === stage.stage;
                return (
                  <button
                    key={stage.stage}
                    type="button"
                    onClick={() => {
                      triggerHapticSelection();
                      setActiveCascadeStage(stage.stage);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      padding: '8px 4px',
                      borderRadius: '12px',
                      border: isSelected ? '1.5px solid #FF6B4A' : '1px solid transparent',
                      background: isSelected ? '#FFFFFF' : 'transparent',
                      color: isSelected ? '#EA580C' : '#64748B',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 2px 8px rgba(234, 88, 12, 0.15)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{stage.organIcon}</span>
                    <span style={{ fontSize: '10.5px', fontWeight: 800 }}>Stage {stage.stage}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Stage Card */}
            {(() => {
              const cur = report.cascadeStages.find((s) => s.stage === activeCascadeStage) || report.cascadeStages[0];
              return (
                <motion.div
                  key={cur.stage}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    background: 'linear-gradient(135deg, #FFFDFB 0%, #FFF8F4 100%)',
                    borderRadius: '18px',
                    padding: '16px 18px',
                    border: '1.5px solid #FCD9C6',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '24px' }}>{cur.organIcon}</span>
                      <div>
                        <strong style={{ fontSize: '15px', color: '#1C1917', display: 'block' }}>
                          Stage {cur.stage}: {cur.title}
                        </strong>
                        <span style={{ fontSize: '11.5px', color: '#EA580C', fontWeight: 700 }}>
                          Organ Axis: {cur.organSystem}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '999px', background: '#FFEDD5', color: '#C2410C', fontWeight: 800 }}>
                      Step {cur.stage} of 5
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, background: 'rgba(255,255,255,0.85)', padding: '10px 12px', borderRadius: '12px', border: '1px solid #FED7AA' }}>
                    <strong>Mechanism:</strong> {cur.mechanism}
                  </div>

                  {/* Clinical Signs */}
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#78716C', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Identified Clinical Manifestations:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {cur.clinicalSigns.map((sign, i) => (
                        <span key={i} style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A' }}>
                          • {sign}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Upstream / Downstream Linkage */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px', fontSize: '11.5px' }}>
                    <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <strong style={{ color: '#0284C7', display: 'block' }}>← Upstream Trigger:</strong>
                      <span style={{ color: '#475569' }}>{cur.upstreamCause}</span>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <strong style={{ color: '#059669', display: 'block' }}>→ Downstream Consequence:</strong>
                      <span style={{ color: '#475569' }}>{cur.downstreamEffect}</span>
                    </div>
                  </div>

                  {/* Stepper Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <button
                      type="button"
                      disabled={activeCascadeStage === 1}
                      onClick={() => {
                        triggerHapticLight();
                        setActiveCascadeStage((prev) => Math.max(1, prev - 1));
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        background: '#FFFFFF',
                        color: activeCascadeStage === 1 ? '#CBD5E1' : '#334155',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: activeCascadeStage === 1 ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <ArrowLeft size={13} /> Previous Stage
                    </button>

                    <button
                      type="button"
                      disabled={activeCascadeStage === 5}
                      onClick={() => {
                        triggerHapticLight();
                        setActiveCascadeStage((prev) => Math.min(5, prev + 1));
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: 'none',
                        background: activeCascadeStage === 5 ? '#E2E8F0' : 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
                        color: activeCascadeStage === 5 ? '#94A3B8' : '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: activeCascadeStage === 5 ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: activeCascadeStage === 5 ? 'none' : '0 3px 10px rgba(255, 107, 74, 0.28)',
                      }}
                    >
                      Next Stage <ArrowRight size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 3: SYMPTOM CROSS-MATCHER */}
      {activeTab === 'matcher' && (
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
            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284C7', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                MULTI-SPECIALIST CROSS-ANALYSIS
              </span>
              <h4 style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                Select Active Symptoms to Recalibrate
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Tap symptoms below. Watch HealthChain cross-reference multiple medical chairs in real time.
              </p>
            </div>

            {/* Symptom Chips Selector */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {report.symptomCluster.map((item) => {
                const isSelected = selectedSymptoms.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSymptom(item.id)}
                    style={{
                      padding: '9px 14px',
                      borderRadius: '999px',
                      border: isSelected ? '1.5px solid #0284C7' : '1.5px solid #E2E8F0',
                      background: isSelected ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#334155',
                      fontSize: '12.5px',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: isSelected ? '0 3px 10px rgba(2, 132, 199, 0.25)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                    {isSelected && <Check size={13} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>

            {/* Real-time Convergence Synthesis Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
                borderRadius: '16px',
                padding: '16px 18px',
                border: '1.5px solid #BAE6FD',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase' }}>
                    BOARD CONVERGENCE INDEX
                  </span>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#0C4A6E' }}>
                    {clusterEvaluation.matchConfidence}% Cross-System Correlation
                  </div>
                </div>

                <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '999px', background: '#0284C7', color: '#FFFFFF' }}>
                  {clusterEvaluation.summonedBoards.length} Boards Summoned
                </span>
              </div>

              <div style={{ fontSize: '12.5px', color: '#0369A1', lineHeight: 1.4 }}>
                {clusterEvaluation.summaryNote}
              </div>

              {/* Summoned Specialist Badges */}
              <div>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Aligned Medical Disciplines:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {clusterEvaluation.summonedBoards.map((b, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        color: '#0284C7',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: '1px solid #BAE6FD',
                      }}
                    >
                      ✓ {b} Board
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  setActiveTab('map');
                }}
                style={{
                  marginTop: '4px',
                  padding: '10px',
                  borderRadius: '12px',
                  background: '#0284C7',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                Trace Connected Nodes on Map <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SPECIALIST BOARD CONSENSUS */}
      {activeTab === 'consensus' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#E11D48', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              6-DISCIPLINE CLINICAL CONSENSUS PANELS
            </span>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 800 }}>
              ● All 6 Medical Panels Aligned
            </span>
          </div>

          {report.consensusDialogue.map((dialogue, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '16px 18px',
                border: '1.5px solid #FCD9C6',
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
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: dialogue.bg,
                      color: dialogue.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      flexShrink: 0,
                    }}
                  >
                    {dialogue.icon}
                  </div>
                  <div>
                    <strong style={{ fontSize: '15px', color: '#0F172A', display: 'block' }}>
                      {dialogue.doctorName}
                    </strong>
                    <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                      {dialogue.credentials}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: '#ECFDF5',
                    color: '#059669',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  Consensus Panel
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

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B' }}>
                <span>Organ Axis: <strong style={{ color: dialogue.color }}>{dialogue.organ}</strong></span>
                <span style={{ color: '#0284C7', fontWeight: 600 }}>Cross-Validated ✓</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* TAB 5: WHAT 15-MINUTE DOCTOR VISITS MISSED */}
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
                Standard 15-minute consultations review single organs in isolation. Here are the specific clinical blind spots HealthChain resolved.
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
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
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

              <div style={{ fontSize: '11.5px', color: '#0284C7', background: '#F0F9FF', padding: '6px 10px', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                🔗 <strong>Hidden Systemic Mechanism:</strong> {item.hiddenConnection}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: DOCTOR DOSSIER (<60s SBAR BRIEF) */}
      {activeTab === 'dossier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
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

