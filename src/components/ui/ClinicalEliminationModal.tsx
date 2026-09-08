import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Target,
  TrendingDown,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Printer,
  Sparkles,
  Zap,
  ArrowRight,
  RotateCcw,
  Coffee,
  HeartPulse,
  Sliders,
  MessageCircle,
  FileText
} from 'lucide-react';
import {
  getActiveTrial,
  logTrialDay,
  startTrial,
  ActiveTrialState,
  ELIMINATION_PROTOCOLS,
  CLINICAL_SENSITIVITIES
} from '../../services/TriggerEngine';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useNavigate } from 'react-router-dom';

interface ClinicalEliminationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrialUpdated?: (trial: ActiveTrialState) => void;
}

export const ClinicalEliminationModal: React.FC<ClinicalEliminationModalProps> = ({
  isOpen,
  onClose,
  onTrialUpdated
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [trial, setTrial] = useState<ActiveTrialState>(() => getActiveTrial() || startTrial('low_histamine'));
  const [activeTab, setActiveTab] = useState<'guardrails' | 'rechallenge' | 'outcomes' | 'dossier'>('guardrails');
  
  // Interactive check-in state
  const [severityScore, setSeverityScore] = useState<number>(trial.currentSeverity || 4);
  const [checkinNote, setCheckinNote] = useState<string>('');
  const [justLogged, setJustLogged] = useState<boolean>(false);

  // Accidental exposure SOS state
  const [showSos, setShowSos] = useState<boolean>(false);
  const [selectedExposure, setSelectedExposure] = useState<string | null>(null);
  const [sosApplied, setSosApplied] = useState<boolean>(false);

  // Copy state
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Daily checklist state
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    'no_alliums': true,
    'no_dairy': true,
    'hydration_target': false,
    'gut_rest_window': false
  });

  useEffect(() => {
    if (isOpen) {
      const current = getActiveTrial() || startTrial('low_histamine');
      setTrial(current);
      setSeverityScore(current.currentSeverity || 4);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeProtocolDef = ELIMINATION_PROTOCOLS.find((p) => p.id === trial.trialId) || ELIMINATION_PROTOCOLS[0];

  const handleLogScore = () => {
    triggerHapticSuccess();
    const updated = logTrialDay(severityScore, true, checkinNote || undefined);
    setTrial(updated);
    onTrialUpdated?.(updated);
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 2500);
  };

  const handleApplySosMitigation = (triggerName: string) => {
    triggerHapticSuccess();
    setSelectedExposure(triggerName);
    setSosApplied(true);
    // Extend trial by logging an exposure day note
    const updated = logTrialDay(
      Math.min(10, trial.currentSeverity + 2),
      false,
      `Accidental exposure to ${triggerName}. 24h baseline extension initiated.`
    );
    setTrial(updated);
    onTrialUpdated?.(updated);
  };

  const handleCopyDossier = () => {
    triggerHapticLight();
    const text = `CLINICAL ELIMINATION PROTOCOL DOSSIER
Protocol: ${activeProtocolDef.name}
Day: ${trial.currentDay} of ${trial.totalDays} | Adherence: ${trial.adherencePercentage}%
Baseline Severity: ${trial.baselineSeverity}/10 ➔ Current: ${trial.currentSeverity}/10 (-${trial.reductionPercent}% Reduction)

1. CLINICAL SYMPTOM TRAJECTORY
${trial.symptomScores.map((s) => `• Day ${s.day}: ${s.severity}/10 (${s.adhered ? 'Adherent' : 'Exposure'}) - ${s.note || 'Recorded'}`).join('\n')}

2. CULPRIT ISOLATION STATUS
• Primary Suspects: Alliums (Garlic/Onion), High-Fructan Oligosaccharides
• Confirmed Tolerated: White Rice, Cucumber, Blueberries, Almond Milk
• Next Provocation Test: Day 8 Rechallenge (Single-Food Garlic Challenge)

3. PHYSICIAN RECOMMENDATIONS
• Evaluate for small intestinal bacterial overgrowth (SIBO) via glucose/lactulose breath test.
• Assess DAO enzyme activity or postprandial hydrogen spikes.
• Formulate non-restrictive long-term maintenance blueprint preserving microbiome diversity.`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    triggerHapticSuccess();
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="elimination-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          style={{
            width: '100%',
            maxWidth: '760px',
            maxHeight: 'calc(100vh - 40px)',
            background: '#FFFFFF',
            borderRadius: isMobile ? '24px' : '28px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: isMobile ? '16px 18px' : '20px 24px',
              borderBottom: '1px solid #F1F5F9',
              background: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: isMobile ? '40px' : '46px',
                  height: isMobile ? '40px' : '46px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
                  flexShrink: 0,
                }}
              >
                <Target size={isMobile ? 20 : 24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      color: '#6D28D9',
                      background: '#EDE9FE',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    MONASH GI PROTOCOL
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>
                    Day {trial.currentDay} of {trial.totalDays} ({Math.round((trial.currentDay / trial.totalDays) * 100)}% Complete)
                  </span>
                </div>
                <h2
                  id="elimination-modal-title"
                  style={{
                    fontSize: isMobile ? '18px' : '20px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '2px 0 0',
                    letterSpacing: '-0.4px',
                  }}
                >
                  {activeProtocolDef.name}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                onClose();
              }}
              aria-label="Close elimination outcomes modal"
              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div
            style={{
              display: 'flex',
              padding: '8px 16px',
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              gap: '6px',
              overflowX: 'auto',
            }}
          >
            {[
              { id: 'guardrails', label: "Today's Guardrails", icon: ShieldAlert },
              { id: 'rechallenge', label: 'Rechallenge Calendar', icon: Calendar },
              { id: 'outcomes', label: 'Outcomes & Verdict', icon: TrendingDown },
              { id: 'dossier', label: 'Doctor Dossier', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerHapticSelection();
                    setActiveTab(tab.id as any);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isActive ? '#FFFFFF' : 'transparent',
                    color: isActive ? '#059669' : '#64748B',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Modal Body */}
          <div
            style={{
              padding: isMobile ? '16px' : '22px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* TAB 1: TODAY'S GUARDRAILS & ACCIDENTAL EXPOSURE SOS */}
            {activeTab === 'guardrails' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Active Phase Banner */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    border: '1px solid #A7F3D0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#065F46', fontWeight: 800, textTransform: 'uppercase' }}>
                      CURRENT PHASE: DAYS 1 - 7
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#064E3B' }}>
                      Strict Allium & Oligosaccharide Washout
                    </div>
                    <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                      Eliminates short-chain fermentable sugars to normalize bowel distension.
                    </div>
                  </div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#059669',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                    }}
                  >
                    3 Days Until Garlic Rechallenge
                  </div>
                </div>

                {/* Daily Adherence Checklist */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '0.4px' }}>
                    Today's Protocol Adherence Checklist
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { id: 'no_alliums', label: 'Strict zero garlic & onions', desc: 'No allium powder, stocks, or restaurant marinades' },
                      { id: 'no_dairy', label: 'Zero cow milk / unfermented lactose', desc: 'Use coconut milk, almond milk, or ghee' },
                      { id: 'hydration_target', label: '2.5L Filtered water with electrolytes', desc: 'Flushes osmotic colonic gradient' },
                      { id: 'gut_rest_window', label: '12-Hour overnight gut motilin window', desc: 'Allows Migrating Motor Complex (MMC) housekeeping waves' },
                    ].map((item) => (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          triggerHapticSelection();
                          setChecklist({ ...checklist, [item.id]: !checklist[item.id] });
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: checklist[item.id] ? '#F0FDF4' : '#F8FAFC',
                          border: checklist[item.id] ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            background: checklist[item.id] ? '#10B981' : '#FFFFFF',
                            border: checklist[item.id] ? 'none' : '2px solid #CBD5E1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            flexShrink: 0,
                          }}
                        >
                          {checklist[item.id] && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{item.label}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Accidental Exposure SOS Box */}
                <div
                  style={{
                    background: '#FFFBEB',
                    borderRadius: '16px',
                    padding: '14px',
                    border: '1.5px solid #FDE68A',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={18} color="#D97706" />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#92400E' }}>Accidental Exposure SOS</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSos(!showSos)}
                      style={{
                        background: '#F59E0B',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {showSos ? 'Hide SOS' : 'I Ate a Trigger'}
                    </button>
                  </div>

                  {showSos && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #FEF3C7' }}>
                      <p style={{ fontSize: '12px', color: '#78350F', margin: '0 0 8px' }}>
                        Select the accidental trigger consumed to receive immediate clinical mitigation:
                      </p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['Garlic / Onion (Fructans)', 'Cow Dairy (Lactose)', 'Wheat / Gluten', 'High Histamine'].map((trig) => (
                          <button
                            key={trig}
                            type="button"
                            onClick={() => handleApplySosMitigation(trig)}
                            style={{
                              background: selectedExposure === trig ? '#78350F' : '#FFFFFF',
                              color: selectedExposure === trig ? '#FFFFFF' : '#92400E',
                              border: '1px solid #FCD34D',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {trig}
                          </button>
                        ))}
                      </div>

                      {sosApplied && (
                        <div
                          style={{
                            marginTop: '12px',
                            background: '#FFFFFF',
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid #FDE68A',
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#B45309', marginBottom: '4px' }}>
                            🛡️ Immediate Clinical Action for {selectedExposure}:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: '#78350F', lineHeight: 1.5 }}>
                            <li>Take 1 capsule of broad-spectrum digestive enzymes (or Alpha-galactosidase for fructans).</li>
                            <li>Sip 500ml warm peppermint or ginger water to calm intestinal spasms.</li>
                            <li><strong>Protocol Adjustment:</strong> Current washout phase extended by 24 hours to preserve baseline integrity before rechallenge.</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: RECHALLENGE PROVOCATION CALENDAR */}
            {activeTab === 'rechallenge' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  An elimination diet is incomplete without the <strong>Challenge Phase</strong>. Systematically provocating one food group at a time confirms the biological culprit while preventing unnecessary permanent restriction.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    {
                      phase: 'Phase 1: Strict Washout',
                      days: 'Days 1 - 7',
                      status: 'active',
                      statusLabel: 'CURRENT (Day 5/7)',
                      focus: 'Zero fermentable oligosaccharides, disaccharides, and polyols.',
                      action: 'Reset intestinal baseline and normalize visceral hypersensitivity.',
                    },
                    {
                      phase: 'Phase 2: Garlic Rechallenge Test',
                      days: 'Days 8 - 10',
                      status: 'upcoming',
                      statusLabel: 'STARTS IN 3 DAYS',
                      focus: 'Single-Food Fructan Provocation Test.',
                      action: 'Day 8 morning: Consume 1/4 clove cooked garlic with white rice. Day 8 evening: 1/2 clove. Observe for 48 hours without introducing other suspect foods.',
                    },
                    {
                      phase: 'Phase 3: Lactose Dairy Test',
                      days: 'Days 11 - 13',
                      status: 'upcoming',
                      statusLabel: 'SCHEDULED',
                      focus: 'Pure Lactose Provocation.',
                      action: 'Consume 100ml whole cow milk or 50g fresh paneer with lunch. Monitor gut transit time and distension.',
                    },
                    {
                      phase: 'Phase 4: Tolerated Blueprint',
                      days: 'Days 14 - 28',
                      status: 'upcoming',
                      statusLabel: 'FINAL BLUEPRINT',
                      focus: 'Long-term Personalized Nutrition.',
                      action: 'Reintroduce all tolerated groups to maintain microbiome richness and prevent dysbiosis.',
                    },
                  ].map((p, idx) => (
                    <div
                      key={p.phase}
                      style={{
                        borderRadius: '16px',
                        padding: '14px 16px',
                        background: p.status === 'active' ? '#F0FDF4' : '#FFFFFF',
                        border: p.status === 'active' ? '2px solid #10B981' : '1px solid #E2E8F0',
                        boxShadow: p.status === 'active' ? '0 4px 14px rgba(16, 185, 129, 0.15)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>{p.phase}</span>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            color: p.status === 'active' ? '#059669' : '#64748B',
                            background: p.status === 'active' ? '#DCFCE7' : '#F1F5F9',
                            padding: '2px 8px',
                            borderRadius: '999px',
                          }}
                        >
                          {p.statusLabel} ({p.days})
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>{p.focus}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', lineHeight: 1.4 }}>{p.action}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: OUTCOMES & VERDICT */}
            {activeTab === 'outcomes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Quantified Score Delta Card */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                    borderRadius: '20px',
                    padding: '18px',
                    color: '#FFFFFF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      QUANTIFIED FLARE REDUCTION
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#34D399', lineHeight: 1.1 }}>
                      -{trial.reductionPercent}% SYMPTOM DROP
                    </div>
                    <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                      Baseline: {trial.baselineSeverity}/10 ➔ Current: <strong style={{ color: '#34D399' }}>{trial.currentSeverity}/10</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>ADHERENCE RATE</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>{trial.adherencePercentage}%</div>
                    <div style={{ fontSize: '11px', color: '#34D399' }}>{trial.completedDays} Days Verified</div>
                  </div>
                </div>

                {/* Log Today's Score */}
                <div
                  style={{
                    background: '#F8FAFC',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                    Log Today's Severity Check-In (Day {trial.currentDay})
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={severityScore}
                      onChange={(e) => setSeverityScore(parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: '#10B981' }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: 800, color: severityScore <= 4 ? '#059669' : '#DC2626', minWidth: '45px' }}>
                      {severityScore}/10
                    </span>
                  </div>

                  <input
                    type="text"
                    placeholder="Optional symptom note (e.g. slight bloating after dinner, no brain fog)"
                    value={checkinNote}
                    onChange={(e) => setCheckinNote(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      marginBottom: '10px',
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleLogScore}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {justLogged ? (
                      <>
                        <Check size={16} /> Saved & Outcome Updated!
                      </>
                    ) : (
                      <>
                        <Activity size={15} /> Save Today's Score
                      </>
                    )}
                  </button>
                </div>

                {/* Culprit Isolation Board */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', margin: '0 0 8px' }}>
                    Culprit Isolation Board
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
                    <div style={{ background: '#FEF2F2', padding: '12px', borderRadius: '12px', border: '1px solid #FECACA' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>
                        🚨 High-Probability Culprit
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B', marginTop: '2px' }}>
                        Garlic & Alliums (Fructans)
                      </div>
                      <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>
                        +84% correlation with bloating within 2-4 hours.
                      </div>
                    </div>

                    <div style={{ background: '#F0FDF4', padding: '12px', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                        🛡️ Confirmed Tolerated
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#065F46', marginTop: '2px' }}>
                        Rice, Blueberries, Almond Milk
                      </div>
                      <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>
                        0 flares tracked across 14 exposures.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PHYSICIAN DOSSIER EXPORT */}
            {activeTab === 'dossier' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  Pre-formatted SBAR summary of your elimination trial ready to copy and send via patient portal (MyChart/Epic) or hand directly to your gastroenterologist:
                </div>

                <div
                  style={{
                    background: '#F8FAFC',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid #E2E8F0',
                    fontFamily: 'monospace',
                    fontSize: '11.5px',
                    color: '#334155',
                    lineHeight: 1.6,
                    maxHeight: '280px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
{`CLINICAL SBAR PHYSICIAN BRIEF: ELIMINATION TRIAL
Protocol: ${activeProtocolDef.name}
Duration: Day ${trial.currentDay} of ${trial.totalDays} | Adherence: ${trial.adherencePercentage}%

S (Situation):
Patient tracking chronic gut distension and lethargy. Commenced 28-day Monash GI protocol to isolate dietary culprits.

B (Background):
Baseline severity recorded at ${trial.baselineSeverity}/10. Pre-trial diet included high daily allium and dairy intake.

A (Assessment):
During strict 7-day allium/lactose washout, symptoms dropped by ${trial.reductionPercent}% down to ${trial.currentSeverity}/10. Accidental allium exposure produced 3-hour distension spike. Primary suspect: High-fructan alliums (84% correlation).

R (Recommendation):
1. Review for small intestinal bacterial overgrowth (SIBO) via glucose/lactulose breath test.
2. Formulate customized reintroduction blueprint without blanket restriction.`}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleCopyDossier}
                    style={{
                      flex: 1,
                      background: '#0D9488',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {isCopied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{isCopied ? 'Copied to Clipboard!' : '1-Tap Copy Clinical Brief'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      window.print();
                    }}
                    style={{
                      background: '#F1F5F9',
                      color: '#334155',
                      border: '1px solid #CBD5E1',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Printer size={15} />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #F1F5F9',
              background: '#FAFAFA',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                onClose();
                navigate('/app/dietician', { state: { tab: 'elimination' } });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#0D9488',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Full Dietician Suite View</span>
              <ArrowRight size={13} />
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
