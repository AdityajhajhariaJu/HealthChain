import React, { useState, useMemo, useEffect } from 'react';
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
  LayoutGrid,
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
import { generateDoctorSummary } from '../../services/TriggerEngine';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FunctionalBiomarkersView } from './FunctionalBiomarkersView';
import { KineticBiomechanicsView } from './KineticBiomechanicsView';
import { PostMealReactionTimeline } from './PostMealReactionTimeline';
import { DigestionCalendarHeatmap } from './DigestionCalendarHeatmap';
import { EliminationProtocolSuite } from './EliminationProtocolSuite';
import { SmartCorrelationInsightsView } from './SmartCorrelationInsightsView';
import { FeatureProfileDataBanner } from './FeatureProfileDataBanner';
import { trackButtonClick } from '../../services/analytics';

export type TabId =
  | 'map'
  | 'cascade'
  | 'matcher'
  | 'consensus'
  | 'misses'
  | 'dossier'
  | 'biomarkers'
  | 'kinetic'
  | 'postmeal'
  | 'calendar'
  | 'elimination'
  | 'insights';

export type PillarId = 'gut' | 'body' | 'cause' | 'dossier';

export interface CapsuleTab {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  badge?: string;
}

export interface PillarConfig {
  id: PillarId;
  label: string;
  shortLabel: string;
  icon: string;
  count: number;
  subtitle: string;
  defaultTab: TabId;
  tabs: CapsuleTab[];
}

export const TAB_TO_PILLAR: Record<TabId, PillarId> = {
  map: 'gut',
  postmeal: 'gut',
  calendar: 'gut',
  elimination: 'gut',
  insights: 'gut',
  biomarkers: 'body',
  kinetic: 'body',
  cascade: 'cause',
  matcher: 'cause',
  consensus: 'cause',
  misses: 'cause',
  dossier: 'dossier',
};

export const PILLARS: PillarConfig[] = [
  {
    id: 'gut',
    label: 'Gut & Nutrition',
    shortLabel: 'Gut & Food',
    icon: '🥗',
    count: 5,
    subtitle: 'Food triggers, post-meal inflammatory cascades & elimination patterns',
    defaultTab: 'map',
    tabs: [
      { id: 'map', label: 'Connected Foods', shortLabel: 'Foods', icon: '🔬', description: 'Trigger compounds & sensitivities' },
      { id: 'postmeal', label: 'Post-Meal Sensitivities', shortLabel: 'Post-Meal', icon: '🍽️', description: 'Hour-by-hour reaction timeline' },
      { id: 'calendar', label: 'Digestion Heatmap', shortLabel: 'Heatmap', icon: '📅', description: '30-day symptom-meal calendar' },
      { id: 'elimination', label: 'Symptom Hunt', shortLabel: 'Symptom Hunt', icon: '🎯', description: '4-week structured elimination suite' },
      { id: 'insights', label: 'Smart Insights', shortLabel: 'Insights', icon: '💡', description: 'AI cross-correlations & food swaps' },
    ],
  },
  {
    id: 'body',
    label: 'Labs & Biomechanics',
    shortLabel: 'Labs & Body',
    icon: '🧪',
    count: 2,
    subtitle: 'Functional bloodwork cutoffs and musculoskeletal kinetic chains',
    defaultTab: 'biomarkers',
    tabs: [
      { id: 'biomarkers', label: 'Functional Labs', shortLabel: 'Labs', icon: '🧪', description: 'Optimal functional ranges vs conventional cutoffs' },
      { id: 'kinetic', label: 'Kinetic Biomechanics', shortLabel: 'Biomechanics', icon: '🦴', description: 'Posture chains, cervical spine & vagus nerve' },
    ],
  },
  {
    id: 'cause',
    label: 'Root Cause Engine',
    shortLabel: 'Root Cause',
    icon: '⚡',
    count: 4,
    subtitle: 'Multi-system domino cascade, symptom matching & physician blind spots',
    defaultTab: 'cascade',
    tabs: [
      { id: 'cascade', label: 'Causal Flow', shortLabel: 'Causal Flow', icon: '⚡', description: '5-Stage multi-system domino chain' },
      { id: 'matcher', label: 'Cross-Matcher', shortLabel: 'Cross-Matcher', icon: '🔍', description: 'Multi-symptom cluster probability matrix' },
      { id: 'consensus', label: 'Clinical Panels', shortLabel: 'Panels', icon: '🏛️', description: 'Multi-specialty board consensus dialogue' },
      { id: 'misses', label: 'What Doctors Missed', shortLabel: 'Doctor Misses', icon: '⚠️', description: 'Overlooked atypical presentations & blind spots' },
    ],
  },
  {
    id: 'dossier',
    label: 'Doctor Dossier',
    shortLabel: 'Dossier',
    icon: '📋',
    count: 1,
    subtitle: 'Executive <60-second SBAR brief with ICD-10 codes for physician handoff',
    defaultTab: 'dossier',
    tabs: [
      { id: 'dossier', label: 'Doctor Dossier (<60s)', shortLabel: 'SBAR Brief', icon: '📋', description: 'Physician handoff, ICD-10 codes, lab orders', badge: 'Ready' },
    ],
  },
];

interface ConnectionDetectiveViewProps {
  initialTab?: TabId;
  onOpenFoodDetective?: () => void;
  onOpenConsult?: () => void;
  onOpenCasePrep?: () => void;
}

export const ConnectionDetectiveView: React.FC<ConnectionDetectiveViewProps> = ({
  initialTab = 'map',
  onOpenFoodDetective,
  onOpenConsult,
  onOpenCasePrep,
}) => {
  const isMobile = useIsMobile();
  const [report, setReport] = useState<ConnectionDetectiveReport>(() => getConnectionDetectiveReport());
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [activePillar, setActivePillar] = useState<PillarId>(() => TAB_TO_PILLAR[initialTab] || 'gut');
  const [isHubView, setIsHubView] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      setActivePillar(TAB_TO_PILLAR[initialTab] || 'gut');
    }
  }, [initialTab]);

  const handleSelectTab = (tabId: TabId) => {
    triggerHapticLight();
    setActiveTab(tabId);
    setActivePillar(TAB_TO_PILLAR[tabId]);
    setIsHubView(false);
    trackButtonClick('clinical_engine_tab_switched', tabId);
  };

  const handleSelectPillar = (pillarId: PillarId) => {
    triggerHapticSelection();
    setActivePillar(pillarId);
    setIsHubView(false);
    const targetPillar = PILLARS.find((p) => p.id === pillarId);
    if (targetPillar) {
      const isCurrentTabInPillar = targetPillar.tabs.some((t) => t.id === activeTab);
      if (!isCurrentTabInPillar) {
        setActiveTab(targetPillar.defaultTab);
        trackButtonClick('clinical_engine_tab_switched', targetPillar.defaultTab);
      }
    }
  };

  const currentPillar = useMemo(() => PILLARS.find((p) => p.id === activePillar) || PILLARS[0], [activePillar]);

  useEffect(() => {
    const handleUpdate = () => {
      setReport(getConnectionDetectiveReport());
    };
    window.addEventListener('hc_biomarkers_updated', handleUpdate);
    window.addEventListener('hc_profile_updated', handleUpdate);
    window.addEventListener('hc_cases_updated', handleUpdate);
    window.addEventListener('hc_triggers_updated', handleUpdate);

    return () => {
      window.removeEventListener('hc_biomarkers_updated', handleUpdate);
      window.removeEventListener('hc_profile_updated', handleUpdate);
      window.removeEventListener('hc_cases_updated', handleUpdate);
      window.removeEventListener('hc_triggers_updated', handleUpdate);
    };
  }, []);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeCascadeStage, setActiveCascadeStage] = useState<number>(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  // Active selected node detail
  const activeNodeDetail = selectedNodeId ? report.nodeDetails[selectedNodeId] : null;

  const dietSummary = useMemo(() => generateDoctorSummary(), [report]);

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
    trackButtonClick('sbar_dossier_copied', report.patientName);
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
    trackButtonClick('sbar_dossier_printed', report.patientName);
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* 1. Master Clinical Architecture Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Tier 1: Pillar Segmented Controller + Hub Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: '#F1F5F9',
            borderRadius: '16px',
            padding: '4px',
            border: '1px solid #E2E8F0',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {PILLARS.map((p) => {
            const isPillarActive = !isHubView && activePillar === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPillar(p.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: isMobile ? '8px 10px' : '9px 14px',
                  borderRadius: '12px',
                  fontSize: isMobile ? '11.5px' : '12.5px',
                  fontWeight: isPillarActive ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flex: isMobile ? 'none' : 1,
                  justifyContent: 'center',
                  border: isPillarActive ? '1px solid #CCFBF1' : '1px solid transparent',
                  background: isPillarActive ? '#FFFFFF' : 'transparent',
                  color: isPillarActive ? '#0F766E' : '#64748B',
                  boxShadow: isPillarActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                  minHeight: '40px',
                }}
              >
                <span style={{ fontSize: '14px' }}>{p.icon}</span>
                <span>{isMobile ? p.shortLabel : p.label}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '999px',
                    background: isPillarActive ? '#F0FDFA' : '#E2E8F0',
                    color: isPillarActive ? '#0F766E' : '#64748B',
                    border: isPillarActive ? '1px solid #CCFBF1' : 'none',
                  }}
                >
                  {p.id === 'dossier' ? 'Ready' : p.count}
                </span>
              </button>
            );
          })}

          {/* Hub / All Modules Toggle */}
          <button
            type="button"
            onClick={() => {
              triggerHapticLight();
              setIsHubView((prev) => !prev);
            }}
            title="All 12 Modules Hub Overview"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: isMobile ? '8px 10px' : '9px 12px',
              borderRadius: '12px',
              fontSize: '11.5px',
              fontWeight: isHubView ? 800 : 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: isHubView ? '1px solid #CBD5E1' : '1px solid transparent',
              background: isHubView ? '#FFFFFF' : 'transparent',
              color: isHubView ? '#1E293B' : '#64748B',
              boxShadow: isHubView ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
              minHeight: '40px',
            }}
          >
            <LayoutGrid size={13} />
            <span>{isMobile ? 'Hub' : 'All Hub'}</span>
          </button>
        </div>

        {/* Tier 2: Curated Sub-Capsules (When Hub view is off) */}
        {!isHubView && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                padding: '2px 0',
                alignItems: 'center',
              }}
            >
              {currentPillar.tabs.map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTab(t.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: isActive ? 800 : 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      border: isActive ? '1.5px solid #0F766E' : '1.5px solid #E2E8F0',
                      background: isActive
                        ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)'
                        : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#475569',
                      boxShadow: isActive
                        ? '0 4px 14px rgba(13, 148, 136, 0.28)'
                        : '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s ease',
                      minHeight: '38px',
                    }}
                  >
                    <span style={{ fontSize: '13px' }}>{t.icon}</span>
                    <span>{t.label}</span>
                    {t.badge && (
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '999px',
                          background: isActive ? 'rgba(255,255,255,0.25)' : '#DCFCE7',
                          color: isActive ? '#FFFFFF' : '#15803D',
                        }}
                      >
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Subtle Clinical Context Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8FAFC',
                borderRadius: '10px',
                padding: '6px 12px',
                border: '1px solid #F1F5F9',
                fontSize: '11px',
                color: '#64748B',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '12px' }}>{currentPillar.icon}</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>{currentPillar.subtitle}</span>
              </div>
              <span style={{ flexShrink: 0, fontWeight: 700, color: '#0F766E' }}>
                {currentPillar.tabs.findIndex((t) => t.id === activeTab) + 1} of {currentPillar.tabs.length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Hub Matrix View (Rendered when Hub is active) */}
      {isHubView && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '12px',
            margin: '4px 0 10px 0',
          }}
        >
          {PILLARS.map((pillar) => (
            <div
              key={pillar.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '14px 16px',
                border: activePillar === pillar.id ? '1.5px solid #0D9488' : '1.5px solid #E2E8F0',
                boxShadow: activePillar === pillar.id ? '0 4px 14px rgba(13, 148, 136, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{pillar.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#1E293B' }}>
                      {pillar.label}
                    </h3>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                      {pillar.subtitle}
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: '#F0FDFA',
                    color: '#0F766E',
                    border: '1px solid #CCFBF1',
                  }}
                >
                  {pillar.count} {pillar.count === 1 ? 'Module' : 'Modules'}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {pillar.tabs.map((tab) => {
                  const isCurrent = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectTab(tab.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        fontSize: '11.5px',
                        fontWeight: isCurrent ? 800 : 600,
                        cursor: 'pointer',
                        border: isCurrent ? '1.5px solid #0F766E' : '1px solid #E2E8F0',
                        background: isCurrent
                          ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)'
                          : '#F8FAFC',
                        color: isCurrent ? '#FFFFFF' : '#334155',
                        boxShadow: isCurrent ? '0 2px 8px rgba(13, 148, 136, 0.22)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

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
                        background: '#F0FDFA',
                        borderRadius: '8px',
                        border: '1px solid #CCFBF1',
                        fontSize: '11.5px',
                        color: '#0F766E',
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
                    background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 3px 10px rgba(13, 148, 136, 0.25)',
                  }}
                >
                  <Sparkles size={14} /> Inspect in Food Detective
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSelectTab('dossier')}
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

      {/* TAB 1: CONNECTED FOODS & DIETARY TRIGGER HUB */}
      {activeTab === 'map' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 1. Primary Clinical Sensitivity Verdict */}
          <div
            style={{
              background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
              borderRadius: '18px',
              padding: '16px 18px',
              border: '1.5px solid #99F6E4',
              display: 'flex',
              alignItems: isMobile ? 'flex-start' : 'center',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  flexShrink: 0,
                }}
              >
                🔬
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <strong style={{ fontSize: '14px', color: '#0F172A' }}>
                    Connected Food Sensitivities Detected
                  </strong>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      background: '#CCFBF1',
                      color: '#0F766E',
                      padding: '1px 6px',
                      borderRadius: '6px',
                    }}
                  >
                    High Correlation
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  Histamine & FODMAPs identified as upstream vascular and gut barrier triggers.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                if (onOpenFoodDetective) onOpenFoodDetective();
                else window.location.href = '/app/dietician';
              }}
              style={{
                background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: '0 3px 10px rgba(13, 148, 136, 0.28)',
                width: isMobile ? '100%' : 'auto',
                justifyContent: 'center',
              }}
            >
              Inspect in Food Detective <ArrowRight size={14} />
            </button>
          </div>

          {/* 2. Top Culprit Foods Breakdown */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '16px 18px',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Suspected Dietary Triggers & Sensitivities
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748B' }}>
                  Cross-referenced against symptom check-ins and meal flare correlations
                </p>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F766E', background: '#F0FDFA', padding: '3px 8px', borderRadius: '8px', border: '1px solid #CCFBF1' }}>
                {dietSummary.topCulpritFoods.length > 0 ? `${dietSummary.topCulpritFoods.length} Identified` : 'Clinical Baseline'}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '8px',
              }}
            >
              {(dietSummary.topCulpritFoods.length > 0 ? dietSummary.topCulpritFoods.slice(0, 4) : [
                { id: 'histamine_dairy', name: 'Aged Cheese & Dairy', emoji: '🧀', category: 'Dairy', primarySensitivity: 'Histamine Rebound', correlationPercent: 88, safeSwap: 'Fresh paneer or goat cheese', reactionWindow: '2-4 hours' },
                { id: 'fodmap_allium', name: 'Garlic & Onion (Alliums)', emoji: '🧄', category: 'FODMAPs', primarySensitivity: 'Fructan Fermentation', correlationPercent: 82, safeSwap: 'Garlic-infused olive oil / Hing', reactionWindow: '3-6 hours' },
                { id: 'solanaceae', name: 'Tomatoes & Peppers', emoji: '🍅', category: 'Nightshades', primarySensitivity: 'Solanine Permeability', correlationPercent: 74, safeSwap: 'Beetroot & roasted carrot purée', reactionWindow: '4-8 hours' },
                { id: 'fermented_soy', name: 'Fermented Soy / Tamari', emoji: '🥢', category: 'Histamine', primarySensitivity: 'Biogenic Amines', correlationPercent: 68, safeSwap: 'Coconut aminos', reactionWindow: '1-3 hours' },
              ]).map((culprit) => (
                <div
                  key={culprit.id}
                  style={{
                    background: '#F8FAFC',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '18px' }}>{culprit.emoji}</span>
                      <strong style={{ fontSize: '12.5px', color: '#0F172A' }}>{culprit.name}</strong>
                    </div>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        color: '#B45309',
                        background: '#FEF3C7',
                        padding: '2px 7px',
                        borderRadius: '999px',
                        border: '1px solid #FDE68A',
                      }}
                    >
                      +{culprit.correlationPercent}% flare
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748B' }}>
                    <span style={{ color: '#0F766E', fontWeight: 600 }}>{culprit.primarySensitivity}</span>
                    <span>Window: {culprit.reactionWindow}</span>
                  </div>

                  {culprit.safeSwap && (
                    <div style={{ fontSize: '11px', color: '#334155', background: '#FFFFFF', padding: '4px 8px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                      🌱 <span style={{ fontWeight: 600 }}>Swap:</span> {culprit.safeSwap}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Connected Gut Diagnostic Navigation Suite */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '16px 18px',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Connected Gut Diagnostic Tools
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748B' }}>
                  Jump directly into any specific dietary tracking and correlation module
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '8px',
              }}
            >
              {[
                {
                  id: 'postmeal' as TabId,
                  icon: '🍽️',
                  title: 'Post-Meal Timeline',
                  desc: 'Track 2hr & 6hr delayed inflammatory cascades',
                  color: '#0F766E',
                },
                {
                  id: 'calendar' as TabId,
                  icon: '📅',
                  title: 'Digestion Heatmap',
                  desc: 'Review 30-day symptom vs meal correlation calendar',
                  color: '#2563EB',
                },
                {
                  id: 'elimination' as TabId,
                  icon: '🎯',
                  title: 'Symptom Hunt Suite',
                  desc: 'Structured 4-week clinical elimination & reintroduction',
                  color: '#7C3AED',
                },
                {
                  id: 'insights' as TabId,
                  icon: '💡',
                  title: 'Smart Insights',
                  desc: 'AI cross-correlations & clinically validated food swaps',
                  color: '#D97706',
                },
              ].map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleSelectTab(tool.id)}
                  style={{
                    background: '#F8FAFC',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    border: '1.5px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{tool.icon}</span>
                    <div>
                      <strong style={{ fontSize: '12.5px', color: '#1E293B', display: 'block' }}>
                        {tool.title}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>
                        {tool.desc}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#94A3B8" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAUSAL FLOW CASCADE */}
      {activeTab === 'cascade' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {report.cascadeStages.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: isMobile ? '28px 20px' : '40px 32px',
                border: '1.5px dashed #CBD5E1',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  border: '1px solid #99F6E4',
                }}
              >
                ⚡
              </div>
              <div style={{ maxWidth: '420px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: '#1E293B' }}>
                  Awaiting Clinical Intake
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                  Multi-stage physiological causal cascades map upstream triggers to downstream symptoms once your profile or consultation is active.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    if (onOpenConsult) onOpenConsult();
                    else window.location.href = '/app/consult';
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(13, 148, 136, 0.25)',
                  }}
                >
                  + Start Consultation
                </button>
              </div>
            </div>
          ) : (
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
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
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
                      border: isSelected ? '1.5px solid #0D9488' : '1px solid transparent',
                      background: isSelected ? '#FFFFFF' : 'transparent',
                      color: isSelected ? '#0F766E' : '#64748B',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.15)' : 'none',
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
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDFA 100%)',
                    borderRadius: '18px',
                    padding: '16px 18px',
                    border: '1.5px solid #CCFBF1',
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
                        <span style={{ fontSize: '11.5px', color: '#0F766E', fontWeight: 700 }}>
                          Organ Axis: {cur.organSystem}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '999px', background: '#CCFBF1', color: '#0F766E', fontWeight: 800 }}>
                      Step {cur.stage} of 5
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, background: 'rgba(255,255,255,0.85)', padding: '10px 12px', borderRadius: '12px', border: '1px solid #99F6E4' }}>
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
                        background: activeCascadeStage === 5 ? '#E2E8F0' : 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                        color: activeCascadeStage === 5 ? '#94A3B8' : '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: activeCascadeStage === 5 ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: activeCascadeStage === 5 ? 'none' : '0 3px 10px rgba(13, 148, 136, 0.28)',
                      }}
                    >
                      Next Stage <ArrowRight size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })()}
          </div>
          )}
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
                onClick={() => handleSelectTab('map')}
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
          {report.consensusDialogue.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: isMobile ? '28px 20px' : '40px 32px',
                border: '1.5px dashed #CBD5E1',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  border: '1px solid #BFDBFE',
                }}
              >
                🏛️
              </div>
              <div style={{ maxWidth: '420px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: '#1E293B' }}>
                  Awaiting Multi-Disciplinary Intake
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                  Autonomous specialist boards (Cardiology, Gastroenterology, Endocrinology, Neurology, Biomechanics) assemble and synthesize diagnostic findings once clinical records or symptoms are provided.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    if (onOpenConsult) onOpenConsult();
                    else window.location.href = '/app/consult';
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  + Start Consultation
                </button>
              </div>
            </div>
          ) : (
            <>
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
                border: '1.5px solid #E2E8F0',
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
            </>
          )}
        </div>
      )}

      {/* TAB 5: WHAT 15-MINUTE DOCTOR VISITS MISSED */}
      {activeTab === 'misses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {report.clinicalMisses.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: isMobile ? '28px 20px' : '40px 32px',
                border: '1.5px dashed #CBD5E1',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  border: '1px solid #FECDD3',
                }}
              >
                ⚠️
              </div>
              <div style={{ maxWidth: '420px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: '#1E293B' }}>
                  Awaiting Clinical Records
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                  Discrepancy and blind-spot detection compares standard 15-minute visits against multi-disciplinary functional targets once your clinical history is logged.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    if (onOpenConsult) onOpenConsult();
                    else window.location.href = '/app/consult';
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(225, 29, 72, 0.25)',
                  }}
                >
                  + Start Consultation
                </button>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {/* TAB 6: DOCTOR DOSSIER (<60s SBAR BRIEF) */}
      {activeTab === 'dossier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {report.doctorDossier.testsToOrder.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: isMobile ? '28px 20px' : '40px 32px',
                border: '1.5px dashed #CBD5E1',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  border: '1px solid #E2E8F0',
                }}
              >
                📋
              </div>
              <div style={{ maxWidth: '420px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: '#1E293B' }}>
                  Clinical Dossier Pending Intake
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                  A physician-ready SBAR brief and prioritized diagnostic workup orders will generate once an intake consultation is complete or lab panels are analyzed.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    if (onOpenConsult) onOpenConsult();
                    else window.location.href = '/app/consult';
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  + Start Consultation
                </button>
              </div>
            </div>
          ) : (
            <>
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
            {/* Dietary Trigger Summary (From TriggerEngine) */}
            <div style={{ marginTop: '8px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                Dietary & Biochemical Triggers:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <div style={{ background: '#FFFBEB', padding: '10px', borderRadius: '8px', border: '1px solid #FEF3C7', fontSize: '12px' }}>
                  <strong style={{ color: '#B45309' }}>Primary Culprits: </strong>
                  <span style={{ color: '#92400E' }}>
                    {dietSummary.topCulpritFoods.slice(0, 3).map(c => `${c.name} (+${c.correlationPercent}%)`).join(', ')}
                  </span>
                </div>
                
                <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                  <strong style={{ color: '#475569' }}>Active Elimination Phase: </strong>
                  <span style={{ color: '#334155' }}>{dietSummary.activeTrials}</span>
                </div>
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
            </>
          )}
        </div>
      )}

      {/* 5. FUNCTIONAL LAB BIOMARKERS SUBTAB */}
      {activeTab === 'biomarkers' && <FunctionalBiomarkersView />}

      {/* 6. KINETIC CHAIN BIOMECHANICS SUBTAB */}
      {activeTab === 'kinetic' && <KineticBiomechanicsView />}

      {/* 7. POST-MEAL SENSITIVITIES TIMELINE SUBTAB */}
      {activeTab === 'postmeal' && <PostMealReactionTimeline onOpenQuickMeal={onOpenFoodDetective} />}

      {/* 8. DIGESTION & BLOATING CALENDAR HEATMAP SUBTAB */}
      {activeTab === 'calendar' && <DigestionCalendarHeatmap onOpenQuickMeal={onOpenFoodDetective} />}

      {/* 9. 4-WEEK CLINICAL ELIMINATION PROTOCOL SUITE SUBTAB */}
      {activeTab === 'elimination' && (
        <EliminationProtocolSuite
          onOpenQuickMeal={onOpenFoodDetective}
          onOpenCalendarHeatmap={() => handleSelectTab('calendar')}
          onOpenPostMealTimeline={() => handleSelectTab('postmeal')}
        />
      )}

      {/* 10. SMART CORRELATION INSIGHTS SUBTAB */}
      {activeTab === 'insights' && (
        <SmartCorrelationInsightsView
          onOpenElimination={() => handleSelectTab('elimination')}
          onOpenTimeline={() => handleSelectTab('postmeal')}
          onOpenHeatmap={() => handleSelectTab('calendar')}
        />
      )}
    </div>
  );
};


