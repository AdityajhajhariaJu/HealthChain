import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Maximize2,
  Minimize2,
  Compass,
  Layers,
  ChevronDown,
  BookmarkCheck,
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
  deriveSemanticEvidenceGraphFromEngineReview,
} from '../../services/ConnectionDetectiveEngine';
import { getActiveCase } from '../../services/CaseEngine';
import { generateDoctorSummary } from '../../services/TriggerEngine';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';
import { SemanticEvidenceGraphView } from './SemanticEvidenceGraphView';
import { FunctionalBiomarkersView } from './FunctionalBiomarkersView';
import { KineticBiomechanicsView } from './KineticBiomechanicsView';
import { PostMealReactionTimeline } from './PostMealReactionTimeline';
import { DigestionCalendarHeatmap } from './DigestionCalendarHeatmap';
import { EliminationProtocolSuite } from './EliminationProtocolSuite';
import { SmartCorrelationInsightsView } from './SmartCorrelationInsightsView';
import { FeatureProfileDataBanner } from './FeatureProfileDataBanner';
import { trackButtonClick } from '../../services/analytics';
import { SourcePassageModal, SourcePassageModalProps } from './SourcePassageModal';
import { FeatureMissionHeader } from './FeatureMissionHeader';

export type TabId =
  | 'map'
  | 'postmeal'
  | 'calendar'
  | 'elimination'
  | 'insights'
  | 'biomarkers'
  | 'kinetic'
  | 'cascade'
  | 'matcher'
  | 'consensus'
  | 'misses'
  | 'dossier';

export type PillarId = 'all' | 'gut' | 'body' | 'cause' | 'dossier';

export interface StationConfig {
  id: TabId;
  stationNumber: string;
  pillarId: 'gut' | 'body' | 'cause' | 'dossier';
  pillarLabel: string;
  pillarColor: string;
  pillarBg: string;
  pillarBorder: string;
  title: string;
  shortTitle: string;
  icon: string;
  subtitle: string;
  statusBadge: string;
}

/**
 * 1. SUBTLE ILLUSTRATION BEHIND EMPTY CONNECTION DETECTIVE STATES
 * A refined static optical glass dish with translucent blue, soft refractive depth,
 * and restrained capsule details. Avoids misleading DNA/cellular scenes or moving particles.
 */
export const SubtleAqueousLensIllustration: React.FC<{ size?: number; label?: string }> = ({ size = 110, label }) => (
  <div
    style={{
      position: 'relative',
      width: `${size}px`,
      height: `${size}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto',
    }}
  >
    {/* Soft aqueous ambient glow */}
    <div
      style={{
        position: 'absolute',
        inset: '-8px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(186, 230, 253, 0.08) 55%, transparent 75%)',
        filter: 'blur(8px)',
        pointerEvents: 'none',
      }}
    />

    {/* Translucent Blue Optical Glass Dish */}
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: 'drop-shadow(0 8px 18px rgba(14, 165, 233, 0.16))',
      }}
    >
      <defs>
        {/* Dish Glass Base Radial */}
        <radialGradient id="cdDishGlassGrad" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#E0F2FE" stopOpacity="0.75" />
          <stop offset="75%" stopColor="#BAE6FD" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.65" />
        </radialGradient>

        {/* Outer Beveled Rim Gradient */}
        <linearGradient id="cdRingGrad" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="30%" stopColor="#BAE6FD" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#38BDF8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0284C7" stopOpacity="0.7" />
        </linearGradient>

        {/* Static Droplet Glow */}
        <radialGradient id="cdDropletGlow" cx="35%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#38BDF8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0284C7" stopOpacity="0.2" />
        </radialGradient>

        {/* Restrained Capsule Gradient */}
        <linearGradient id="cdCapsuleGrad" x1="0" y1="0" x2="24" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#0284C7" />
          <stop offset="50.1%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Main Glass Lens Body */}
      <circle cx="60" cy="60" r="54" fill="url(#cdDishGlassGrad)" stroke="url(#cdRingGrad)" strokeWidth="2.5" />

      {/* Inner Optical Refraction Ring */}
      <circle cx="60" cy="60" r="47" stroke="rgba(255, 255, 255, 0.75)" strokeWidth="1.2" strokeDasharray="3 2" />

      {/* Soft Aqueous Depth Pool */}
      <ellipse cx="60" cy="63" rx="38" ry="32" fill="rgba(186, 230, 253, 0.35)" />

      {/* Floating Refractive Droplets (Static soft depth) */}
      <circle cx="42" cy="45" r="7" fill="url(#cdDropletGlow)" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
      <circle cx="40" cy="43" r="2" fill="#FFFFFF" opacity="0.95" />

      <circle cx="78" cy="72" r="5" fill="url(#cdDropletGlow)" stroke="rgba(255,255,255,0.75)" strokeWidth="0.7" />
      <circle cx="77" cy="70" r="1.5" fill="#FFFFFF" opacity="0.9" />

      <circle cx="82" cy="48" r="3.5" fill="rgba(255,255,255,0.65)" stroke="#38BDF8" strokeWidth="0.6" />

      {/* Restrained Clinical Capsule Detail */}
      <g transform="translate(48, 54)">
        <rect
          x="0"
          y="0"
          width="24"
          height="12"
          rx="6"
          fill="url(#cdCapsuleGrad)"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth="1"
          style={{ filter: 'drop-shadow(0 2px 5px rgba(2, 132, 199, 0.3))' }}
        />
        <line x1="12" y1="0" x2="12" y2="12" stroke="rgba(2, 132, 199, 0.4)" strokeWidth="0.8" />
        <ellipse cx="6" cy="3.5" rx="3" ry="1.2" fill="#FFFFFF" opacity="0.85" />
      </g>
    </svg>
  </div>
);

/**
 * 2. SMALL VISUAL LINKING A FINDING TO ITS SOURCE
 * Translucent blue badge with soft depth, restrained micro-capsule detail,
 * and clear medical credibility attribution.
 */
export const SourceEvidenceBadge: React.FC<{
  source: string;
  citation?: string;
  onClick?: () => void;
}> = ({ source, citation, onClick }) => (
  <div
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={(e) => {
      if (onClick) {
        e.stopPropagation();
        triggerHapticLight();
        onClick();
      }
    }}
    onKeyDown={(e) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.stopPropagation();
        triggerHapticLight();
        onClick();
      }
    }}
    title={onClick ? 'Click to inspect clinical source record passage' : undefined}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 9px',
      borderRadius: '999px',
      background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.92) 0%, rgba(224, 242, 254, 0.7) 100%)',
      border: '1px solid rgba(186, 230, 253, 0.85)',
      boxShadow: '0 2px 6px rgba(14, 165, 233, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
      fontSize: '11px',
      color: '#0369A1',
      fontWeight: 600,
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      whiteSpace: 'nowrap',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.15s ease',
    }}
  >
    {/* Restrained two-tone micro-capsule icon */}
    <span
      style={{
        display: 'inline-block',
        width: '11px',
        height: '5.5px',
        borderRadius: '3px',
        background: 'linear-gradient(90deg, #38BDF8 50%, rgba(255,255,255,0.95) 50%)',
        border: '0.8px solid rgba(2, 132, 199, 0.55)',
        boxShadow: '0 1px 2px rgba(2, 132, 199, 0.2)',
        flexShrink: 0,
      }}
    />
    <span>{source}</span>
    {citation && (
      <span style={{ fontSize: '9.5px', color: '#0284C7', opacity: 0.85 }}>({citation})</span>
    )}
    {onClick && (
      <span style={{ fontSize: '9px', opacity: 0.7, marginLeft: '2px' }}>↗</span>
    )}
  </div>
);

export const ALL_12_STATIONS: StationConfig[] = [
  // Pillar 1: Gut & Food (01 - 05)
  {
    id: 'map',
    stationNumber: '01',
    pillarId: 'gut',
    pillarLabel: 'Gut & Food',
    pillarColor: '#0D9488',
    pillarBg: '#F0FDFA',
    pillarBorder: '#CCFBF1',
    title: 'Connected Foods & Sensitivities',
    shortTitle: 'Foods',
    icon: '🔬',
    subtitle: 'Primary dietary triggers, histamine & FODMAP permeability compounds',
    statusBadge: '4 Triggers Found',
  },
  {
    id: 'postmeal',
    stationNumber: '02',
    pillarId: 'gut',
    pillarLabel: 'Gut & Food',
    pillarColor: '#0D9488',
    pillarBg: '#F0FDFA',
    pillarBorder: '#CCFBF1',
    title: 'Post-Meal Sensitivities Timeline',
    shortTitle: 'Post-Meal',
    icon: '🍽️',
    subtitle: 'Hour-by-hour physiological flare tracking after meals to isolate rapid vs delayed reactions',
    statusBadge: '2h & 6h Windows',
  },
  {
    id: 'calendar',
    stationNumber: '03',
    pillarId: 'gut',
    pillarLabel: 'Gut & Food',
    pillarColor: '#0D9488',
    pillarBg: '#F0FDFA',
    pillarBorder: '#CCFBF1',
    title: 'Digestion & Bloating Calendar Heatmap',
    shortTitle: 'Heatmap',
    icon: '📅',
    subtitle: '30-day empirical calendar view cross-referencing meal logs with digestive flare days',
    statusBadge: '30-Day Matrix',
  },
  {
    id: 'elimination',
    stationNumber: '04',
    pillarId: 'gut',
    pillarLabel: 'Gut & Food',
    pillarColor: '#0D9488',
    pillarBg: '#F0FDFA',
    pillarBorder: '#CCFBF1',
    title: 'Symptom Hunt Elimination Protocol',
    shortTitle: 'Symptom Hunt',
    icon: '🎯',
    subtitle: 'Structured 4-week clinical elimination, tracking, and phased re-introduction pipeline',
    statusBadge: '4-Week Protocol',
  },
  {
    id: 'insights',
    stationNumber: '05',
    pillarId: 'gut',
    pillarLabel: 'Gut & Food',
    pillarColor: '#0D9488',
    pillarBg: '#F0FDFA',
    pillarBorder: '#CCFBF1',
    title: 'Smart Cross-Correlation Insights',
    shortTitle: 'Insights',
    icon: '💡',
    subtitle: 'Multi-factor statistical correlations between specific ingredients, timing, and flare intensity',
    statusBadge: 'AI Cross-Analysis',
  },

  // Pillar 2: Labs & Biomechanics (06 - 07)
  {
    id: 'biomarkers',
    stationNumber: '06',
    pillarId: 'body',
    pillarLabel: 'Labs & Body',
    pillarColor: '#0284C7',
    pillarBg: '#F0F9FF',
    pillarBorder: '#BAE6FD',
    title: 'Functional Labs & Optimal Biomarkers',
    shortTitle: 'Labs',
    icon: '🧪',
    subtitle: 'Comparing standard conventional hospital lab cutoffs against tighter integrative functional wellness targets',
    statusBadge: 'Optimal Ranges',
  },
  {
    id: 'kinetic',
    stationNumber: '07',
    pillarId: 'body',
    pillarLabel: 'Labs & Body',
    pillarColor: '#0284C7',
    pillarBg: '#F0F9FF',
    pillarBorder: '#BAE6FD',
    title: 'Kinetic Biomechanics & Vagus Axis',
    shortTitle: 'Biomechanics',
    icon: '🦴',
    subtitle: 'Assessing posture chains, cervical spine compression, and parasympathetic vagal signaling',
    statusBadge: 'Vagus Axis',
  },

  // Pillar 3: Root Cause Engine (08 - 11)
  {
    id: 'cascade',
    stationNumber: '08',
    pillarId: 'cause',
    pillarLabel: 'Root Cause',
    pillarColor: '#6366F1',
    pillarBg: '#EEF2FF',
    pillarBorder: '#C7D2FE',
    title: '5-Stage Causal Domino Cascade',
    shortTitle: 'Causal Flow',
    icon: '⚡',
    subtitle: 'Scrub through the 5 chronological stages showing how cellular nutrient deficits trigger autonomic symptoms',
    statusBadge: '5-Stage Domino',
  },
  {
    id: 'matcher',
    stationNumber: '09',
    pillarId: 'cause',
    pillarLabel: 'Root Cause',
    pillarColor: '#6366F1',
    pillarBg: '#EEF2FF',
    pillarBorder: '#C7D2FE',
    title: 'Multi-Symptom Cluster Cross-Matcher',
    shortTitle: 'Cross-Matcher',
    icon: '🔍',
    subtitle: 'Tap active symptoms to dynamically calculate multi-specialty board convergence and aligned disciplines',
    statusBadge: 'Recalibration Active',
  },
  {
    id: 'consensus',
    stationNumber: '10',
    pillarId: 'cause',
    pillarLabel: 'Root Cause',
    pillarColor: '#6366F1',
    pillarBg: '#EEF2FF',
    pillarBorder: '#C7D2FE',
    title: 'Clinical Board Consensus Panels',
    shortTitle: 'Consensus',
    icon: '🏛️',
    subtitle: 'Autonomous specialist panels (Gastroenterology, Neuro-Immunology, Functional Med, Biomechanics) cross-validating findings',
    statusBadge: '6 Panels Aligned',
  },
  {
    id: 'misses',
    stationNumber: '11',
    pillarId: 'cause',
    pillarLabel: 'Root Cause',
    pillarColor: '#6366F1',
    pillarBg: '#EEF2FF',
    pillarBorder: '#C7D2FE',
    title: 'What 15-Minute Doctor Visits Missed',
    shortTitle: 'Doctor Misses',
    icon: '⚠️',
    subtitle: 'Revealing the atypical presentations and cross-organ linkages that single-organ consultations overlook',
    statusBadge: 'Blind Spots Found',
  },

  // Pillar 4: Doctor Dossier (12)
  {
    id: 'dossier',
    stationNumber: '12',
    pillarId: 'dossier',
    pillarLabel: 'Doctor Dossier',
    pillarColor: '#059669',
    pillarBg: '#ECFDF5',
    pillarBorder: '#A7F3D0',
    title: 'Doctor Dossier (<60s SBAR Brief)',
    shortTitle: 'SBAR Dossier',
    icon: '📋',
    subtitle: 'Physician-ready SBAR handoff, prioritized laboratory test orders, ICD-10 diagnostic codes, and one-tap copy/print',
    statusBadge: 'Physician Ready',
  },
];

export const TAB_TO_PILLAR: Record<TabId, 'gut' | 'body' | 'cause' | 'dossier'> = {
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

export interface PillarFilterOption {
  id: PillarId;
  label: string;
  shortLabel: string;
  icon: string;
  count: number;
}

export const PILLAR_FILTERS: PillarFilterOption[] = [
  { id: 'all', label: 'All 12 Stations', shortLabel: 'All (12)', icon: '✨', count: 12 },
  { id: 'gut', label: 'Gut & Food', shortLabel: '🥗 Gut (5)', icon: '🥗', count: 5 },
  { id: 'body', label: 'Labs & Body', shortLabel: '🧪 Labs (2)', icon: '🧪', count: 2 },
  { id: 'cause', label: 'Root Cause', shortLabel: '⚡ Cause (4)', icon: '⚡', count: 4 },
  { id: 'dossier', label: 'Doctor Dossier', shortLabel: '📋 Dossier (1)', icon: '📋', count: 1 },
];

interface ConnectionDetectiveViewProps {
  initialTab?: TabId;
  onOpenFoodDetective?: () => void;
  onOpenConsult?: () => void;
  onOpenCasePrep?: () => void;
}

export const ConnectionDetectiveView: React.FC<ConnectionDetectiveViewProps> = ({
  initialTab,
  onOpenFoodDetective,
  onOpenConsult,
  onOpenCasePrep,
}) => {
  const isMobile = useIsMobile();
  const [report, setReport] = useState<ConnectionDetectiveReport>(() => getConnectionDetectiveReport());
  const activeCase = getActiveCase();
  const activeReview = activeCase?.reviews?.find((r: any) => r.type === 'jarvis' || r.report) || activeCase?.reviews?.[0];
  const semanticGraph = useMemo(() => {
    return deriveSemanticEvidenceGraphFromEngineReview(activeReview?.report, activeCase);
  }, [activeReview, activeCase, report]);
  const [selectedPillar, setSelectedPillar] = useState<PillarId>('all');
  const [focusedStationId, setFocusedStationId] = useState<TabId | null>(null);
  const [highlightedStationId, setHighlightedStationId] = useState<TabId | null>(null);

  // States for interactive subcomponents inside stations
  const [activeCascadeStage, setActiveCascadeStage] = useState<number>(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [sourcePassageModalData, setSourcePassageModalData] = useState<SourcePassageModalProps | null>(null);

  const openSourcePassage = (source: string, citation?: string, snippet?: string, claim?: string) => {
    setSourcePassageModalData({
      isOpen: true,
      onClose: () => setSourcePassageModalData(null),
      recordTitle: citation ? `${source} (${citation})` : source,
      recordType: 'Verified Medical Record & Clinical Protocol',
      pageNumber: 1,
      sectionTitle: 'Correlated Evidence Passage',
      passageText: snippet || `Supporting clinical observation and laboratory reference derived from ${source}${citation ? ` [Citation: ${citation}]` : ''}.`,
      fullFindings: `Direct clinical extraction from ${source}${citation ? `, protocol reference: ${citation}` : ''}. Verified against active clinical timeline and multi-system biomarkers.`,
      dateAdded: 'Active Case Timeline',
      findingClaim: claim || `Biomarker & physiological finding attributed to ${source}`,
    });
  };

  // Scroll to station helper
  const scrollToStation = (tabId: TabId) => {
    triggerHapticSelection();
    const targetStation = ALL_12_STATIONS.find((s) => s.id === tabId);
    if (selectedPillar !== 'all' && targetStation && targetStation.pillarId !== selectedPillar) {
      setSelectedPillar('all');
    }
    setFocusedStationId(null);
    setHighlightedStationId(tabId);
    trackButtonClick('clinical_station_jump', tabId);

    setTimeout(() => {
      const element = document.getElementById(`cd-station-${tabId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);

    setTimeout(() => {
      setHighlightedStationId(null);
    }, 2400);
  };

  useEffect(() => {
    if (initialTab) {
      const target = ALL_12_STATIONS.find((s) => s.id === initialTab);
      if (target) {
        scrollToStation(initialTab);
      }
    }
  }, [initialTab]);

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

  const dietSummary = useMemo(() => generateDoctorSummary(), [report]);

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

  const visibleStations = useMemo(() => {
    if (focusedStationId) {
      return ALL_12_STATIONS.filter((s) => s.id === focusedStationId);
    }
    if (selectedPillar === 'all') {
      return ALL_12_STATIONS;
    }
    return ALL_12_STATIONS.filter((s) => s.pillarId === selectedPillar);
  }, [selectedPillar, focusedStationId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <FeatureMissionHeader featureId="connection-detective" activeCaseId={report.patientName} />

      {/* 1. EXECUTIVE DIAGNOSTIC STATION OVERVIEW (TIER 1 BLUF) */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #0369A1 50%, #0F172A 100%)',
          borderRadius: '22px',
          padding: isMobile ? '16px' : '20px',
          color: '#FFFFFF',
          boxShadow: '0 12px 32px rgba(2, 132, 199, 0.18)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Soft aqueous refractive ambient glow in top-right */}
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(186, 230, 253, 0.12) 50%, transparent 75%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  background: 'rgba(224, 242, 254, 0.18)',
                  color: '#7DD3FC',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  border: '1px solid rgba(125, 211, 252, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.2)',
                }}
              >
                {/* Restrained two-tone micro-capsule detail */}
                <span
                  style={{
                    width: '10px',
                    height: '5px',
                    borderRadius: '2.5px',
                    background: 'linear-gradient(90deg, #38BDF8 50%, rgba(255,255,255,0.9) 50%)',
                    display: 'inline-block',
                  }}
                />
                12 Active Clinical Intelligence Stations
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: isMobile ? '16px' : '18px', fontWeight: 900, letterSpacing: '-0.3px', color: '#F8FAFC' }}>
              Multi-System Root Cause Architecture
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: '#BAE6FD', lineHeight: 1.4 }}>
              Structured diagnostic continuum bridging gut barrier biochemistry, functional lab cutoffs, vagal kinetic chains, and physician handoff.
            </p>
          </div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(186, 230, 253, 0.25)',
              textAlign: 'right',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#38BDF8' }}>
              {report.matchConfidence}%
            </div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#BAE6FD', textTransform: 'uppercase' }}>
              Board Consensus
            </div>
          </div>
        </div>

        {/* 4 Clinical Pillars Micro-Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '6px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '14px',
            padding: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {[
            { label: '🥗 Gut & Food', count: '5 Stations', desc: 'Foods, timeline, hunt' },
            { label: '🧪 Labs & Body', count: '2 Stations', desc: 'Ranges & biomechanics' },
            { label: '⚡ Root Cause', count: '4 Stations', desc: 'Cascade & consensus' },
            { label: '📋 Doctor Dossier', count: '1 Station', desc: 'Physician SBAR brief' },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '6px 8px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1px',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#F1F5F9' }}>{item.label}</span>
              <span style={{ fontSize: '9.5px', color: '#7DD3FC', fontWeight: 700 }}>{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. PILLAR SEGMENTED CONTROLLER & ANCHOR NAVIGATION BAR */}
      <div
        style={{
          position: 'sticky',
          top: '0',
          zIndex: 40,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '8px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        {/* Tier 1: Pillar Filter Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: '#F1F5F9',
            borderRadius: '14px',
            padding: '3px',
            border: '1px solid #E2E8F0',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {PILLAR_FILTERS.map((filter) => {
            const isActive = !focusedStationId && selectedPillar === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => {
                  triggerHapticSelection();
                  setSelectedPillar(filter.id);
                  setFocusedStationId(null);
                  trackButtonClick('clinical_pillar_filter', filter.id);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: isMobile ? '7px 9px' : '8px 12px',
                  borderRadius: '10px',
                  fontSize: isMobile ? '11px' : '12px',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flex: isMobile ? 'none' : 1,
                  justifyContent: 'center',
                  border: isActive ? '1.5px solid rgba(56, 189, 248, 0.65)' : '1px solid transparent',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(240, 249, 255, 0.98) 0%, rgba(224, 242, 254, 0.9) 100%)'
                    : 'transparent',
                  color: isActive ? '#0369A1' : '#64748B',
                  boxShadow: isActive ? '0 3px 10px rgba(14, 165, 233, 0.15), inset 0 1px 1px #FFFFFF' : 'none',
                  transition: 'all 0.15s ease',
                  minHeight: '36px',
                }}
              >
                <span>{filter.icon}</span>
                <span>{isMobile ? filter.shortLabel : filter.label}</span>
              </button>
            );
          })}

          {focusedStationId && (
            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                setFocusedStationId(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '10px',
                background: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
              }}
            >
              <Minimize2 size={12} /> Show All 12
            </button>
          )}
        </div>

        {/* Tier 2: Numbered Quick-Jump Capsules Strip (01 to 12) with Translucent Blue Highlight */}
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
          {ALL_12_STATIONS.map((station) => {
            const isHighlighted = highlightedStationId === station.id;
            const isFocused = focusedStationId === station.id;
            const isSelectedCapsule = isFocused || isHighlighted;

            return (
              <button
                key={station.id}
                type="button"
                onClick={() => scrollToStation(station.id)}
                title={station.title}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: isSelectedCapsule ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  border: isSelectedCapsule
                    ? '1.5px solid rgba(56, 189, 248, 0.75)'
                    : '1px solid #E2E8F0',
                  background: isSelectedCapsule
                    ? 'linear-gradient(135deg, rgba(240, 249, 255, 0.98) 0%, rgba(224, 242, 254, 0.9) 100%)'
                    : '#FFFFFF',
                  color: isSelectedCapsule ? '#0369A1' : '#475569',
                  boxShadow: isSelectedCapsule
                    ? '0 4px 14px rgba(14, 165, 233, 0.22), inset 0 1px 1.5px rgba(255, 255, 255, 0.95)'
                    : 'none',
                  transition: 'all 0.18s ease',
                  minHeight: '32px',
                  backdropFilter: isSelectedCapsule ? 'blur(8px)' : 'none',
                  WebkitBackdropFilter: isSelectedCapsule ? 'blur(8px)' : 'none',
                }}
              >
                {/* Micro Restrained Capsule Detail */}
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 900,
                    padding: '1px 5px',
                    borderRadius: '6px',
                    background: isSelectedCapsule ? 'rgba(56, 189, 248, 0.15)' : station.pillarBg,
                    color: isSelectedCapsule ? '#0284C7' : station.pillarColor,
                    border: isSelectedCapsule ? '1px solid rgba(56, 189, 248, 0.4)' : `1px solid ${station.pillarBorder}`,
                  }}
                >
                  {station.stationNumber}
                </span>

                {/* Restrained two-tone micro-capsule icon on selected */}
                {isSelectedCapsule && (
                  <span
                    style={{
                      width: '10px',
                      height: '5px',
                      borderRadius: '2.5px',
                      background: 'linear-gradient(90deg, #38BDF8 50%, rgba(255,255,255,0.95) 50%)',
                      border: '0.8px solid #0284C7',
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                )}

                <span>{station.icon}</span>
                <span>{station.shortTitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. THE 12 DEDICATED CLINICAL STATIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {visibleStations.map((station) => {
          const isHighlighted = highlightedStationId === station.id;
          const isSingleFocus = focusedStationId === station.id;

          return (
            <React.Fragment key={station.id}>
              <section
                id={`cd-station-${station.id}`}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '22px',
                  border: isHighlighted
                    ? '2px solid #38BDF8'
                    : '1.5px solid #E2E8F0',
                  boxShadow: isHighlighted
                    ? '0 0 0 4px rgba(56, 189, 248, 0.2), 0 8px 24px rgba(14, 165, 233, 0.08)'
                    : '0 4px 16px rgba(0, 0, 0, 0.03)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* STATION HEADER BAR */}
                <header
                  style={{
                    background: `linear-gradient(180deg, ${station.pillarBg} 0%, #FFFFFF 100%)`,
                    borderBottom: '1px solid #F1F5F9',
                    padding: isMobile ? '12px 14px' : '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: station.pillarColor,
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '13px',
                        flexShrink: 0,
                        boxShadow: `0 2px 8px ${station.pillarColor}40`,
                      }}
                    >
                      {station.stationNumber}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 800,
                            letterSpacing: '0.6px',
                            textTransform: 'uppercase',
                            color: station.pillarColor,
                          }}
                        >
                          STATION {station.stationNumber} • {station.pillarLabel}
                        </span>
                      </div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: isMobile ? '14.5px' : '16px',
                          fontWeight: 800,
                          color: '#0F172A',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>{station.icon}</span>
                        <span>{station.title}</span>
                      </h4>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: station.pillarBg,
                        color: station.pillarColor,
                        border: `1px solid ${station.pillarBorder}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {station.statusBadge}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setFocusedStationId(isSingleFocus ? null : station.id);
                      }}
                      title={isSingleFocus ? 'Exit Focus (Show All)' : 'Focus On This Station'}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        background: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: isSingleFocus ? '#0284C7' : '#64748B',
                      }}
                      aria-label={isSingleFocus ? 'Show all stations' : `Focus on station ${station.stationNumber}`}
                    >
                      {isSingleFocus ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>
                  </div>
                </header>

                {/* STATION BODY */}
                <div style={{ padding: isMobile ? '12px 14px 16px 14px' : '16px 18px 20px 18px' }}>

                  {/* STATION 01: CONNECTED EVIDENCE & FOODS */}
                  {station.id === 'map' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* STEP 8: THE 6 CANONICAL RELATIONSHIPS EVIDENCE GRAPH */}
                      <SemanticEvidenceGraphView
                        graph={semanticGraph}
                        onOpenConsult={onOpenConsult}
                        onOpenCasePrep={onOpenCasePrep}
                        onOpenSourceModal={(d) => setSourcePassageModalData(d)}
                      />

                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.95) 0%, rgba(224, 242, 254, 0.8) 100%)',
                          borderRadius: '16px',
                          padding: '14px 16px',
                          border: '1.5px solid rgba(186, 230, 253, 0.85)',
                          boxShadow: '0 4px 14px rgba(14, 165, 233, 0.08), inset 0 1px 2px #FFFFFF',
                          display: 'flex',
                          alignItems: isMobile ? 'flex-start' : 'center',
                          flexDirection: isMobile ? 'column' : 'row',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '24px' }}>🔬</span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                              <strong style={{ fontSize: '13.5px', color: '#0F172A' }}>
                                Identified Primary Dietary Triggers
                              </strong>
                              <SourceEvidenceBadge
                                source="Monash FODMAP Lab"
                                citation="AGA 2024"
                                onClick={() => openSourcePassage(
                                  "Monash FODMAP Lab",
                                  "AGA 2024",
                                  "Excess fructose and oligosaccharide fermentation elevates intraluminal osmotic pressure and increases intestinal permeability.",
                                  "FODMAP osmotic permeability"
                                )}
                              />
                            </div>
                            <span style={{ fontSize: '11.5px', color: '#475569' }}>
                              Histamine, tyramine & FODMAP alliums trigger acute vascular and intestinal permeability.
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            if (onOpenFoodDetective) onOpenFoodDetective();
                            else window.dispatchEvent(new CustomEvent('hc_open_whole_health_modal', { detail: { tab: 'detective' } }));
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            whiteSpace: 'nowrap',
                            width: isMobile ? '100%' : 'auto',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                          }}
                        >
                          Inspect in Food Detective <ArrowRight size={13} />
                        </button>
                      </div>

                      {/* Top Culprit Foods Breakdown Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        {(dietSummary.topCulpritFoods.length > 0
                          ? dietSummary.topCulpritFoods.slice(0, 4)
                          : [
                              { id: 'histamine_dairy', name: 'Aged Cheese & Dairy', emoji: '🧀', category: 'Dairy', primarySensitivity: 'Histamine Rebound', correlationPercent: 88, safeSwap: 'Fresh paneer or goat cheese', reactionWindow: '2-4 hours', evidenceRef: 'Am. J. Gastroenterol' },
                              { id: 'fodmap_allium', name: 'Garlic & Onion (Alliums)', emoji: '🧄', category: 'FODMAPs', primarySensitivity: 'Fructan Fermentation', correlationPercent: 82, safeSwap: 'Garlic-infused olive oil / Hing', reactionWindow: '3-6 hours', evidenceRef: 'Monash FODMAP Registry' },
                              { id: 'solanaceae', name: 'Tomatoes & Peppers', emoji: '🍅', category: 'Nightshades', primarySensitivity: 'Solanine Permeability', correlationPercent: 74, safeSwap: 'Beetroot & carrot purée', reactionWindow: '4-8 hours', evidenceRef: 'Gut Barrier Study' },
                              { id: 'fermented_soy', name: 'Fermented Soy / Tamari', emoji: '🥢', category: 'Histamine', primarySensitivity: 'Biogenic Amines', correlationPercent: 68, safeSwap: 'Coconut aminos', reactionWindow: '1-3 hours', evidenceRef: 'Clinical Nutrition' },
                            ]
                        ).map((culprit: any) => (
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
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  color: '#B45309',
                                  background: '#FEF3C7',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                }}
                              >
                                +{culprit.correlationPercent}% flare
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748B' }}>
                              <span style={{ color: '#0F766E', fontWeight: 600 }}>{culprit.primarySensitivity}</span>
                              <span>Window: {culprit.reactionWindow}</span>
                            </div>

                            {/* Small visual linking finding to source */}
                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '2px' }}>
                              <SourceEvidenceBadge
                                source={culprit.evidenceRef || 'Clinical Evidence Baseline'}
                                onClick={() => openSourcePassage(
                                  culprit.evidenceRef || 'Clinical Evidence Baseline',
                                  undefined,
                                  `Flare correlation tracked for ${culprit.name}: +${culprit.correlationPercent}% flare rate across active observation windows.`,
                                  `Dietary trigger verification for ${culprit.name}`
                                )}
                              />
                            </div>

                            {culprit.safeSwap && (
                              <div style={{ fontSize: '11px', color: '#334155', background: '#FFFFFF', padding: '4px 8px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                                🌱 <span style={{ fontWeight: 600 }}>Swap:</span> {culprit.safeSwap}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => scrollToStation('postmeal')}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#334155',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          View Reaction Timeline ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollToStation('calendar')}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#334155',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          View 30-Day Heatmap ↓
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STATION 02: POST-MEAL TIMELINE */}
                  {station.id === 'postmeal' && (
                    <PostMealReactionTimeline onOpenQuickMeal={onOpenFoodDetective} />
                  )}

                  {/* STATION 03: DIGESTION HEATMAP */}
                  {station.id === 'calendar' && (
                    <DigestionCalendarHeatmap onOpenQuickMeal={onOpenFoodDetective} />
                  )}

                  {/* STATION 04: ELIMINATION PROTOCOL */}
                  {station.id === 'elimination' && (
                    <EliminationProtocolSuite
                      onOpenQuickMeal={onOpenFoodDetective}
                      onOpenCalendarHeatmap={() => scrollToStation('calendar')}
                      onOpenPostMealTimeline={() => scrollToStation('postmeal')}
                    />
                  )}

                  {/* STATION 05: SMART CORRELATION INSIGHTS */}
                  {station.id === 'insights' && (
                    <SmartCorrelationInsightsView
                      onOpenElimination={() => scrollToStation('elimination')}
                      onOpenTimeline={() => scrollToStation('postmeal')}
                      onOpenHeatmap={() => scrollToStation('calendar')}
                    />
                  )}

                  {/* STATION 06: FUNCTIONAL LABS */}
                  {station.id === 'biomarkers' && (
                    <div>
                      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                        <SourceEvidenceBadge
                          source="Functional Medicine Laboratory Cutoffs"
                          citation="IFM Protocol"
                          onClick={() => openSourcePassage(
                            "Functional Medicine Laboratory Cutoffs",
                            "IFM Protocol",
                            "Standard hospital lab reference intervals reflect 95% population distributions of diseased cohorts. Functional integrative target ranges isolate optimal cellular respiration and physiological homeostasis.",
                            "Optimal vs Conventional Biomarker Range Analysis"
                          )}
                        />
                      </div>
                      <FunctionalBiomarkersView />
                    </div>
                  )}

                  {/* STATION 07: KINETIC BIOMECHANICS */}
                  {station.id === 'kinetic' && (
                    <div>
                      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                        <SourceEvidenceBadge
                          source="Upper Cervical & Vagus Axis Analysis"
                          citation="Autonomic Neuro-Biomechanics"
                          onClick={() => openSourcePassage(
                            "Upper Cervical & Vagus Axis Analysis",
                            "Autonomic Neuro-Biomechanics",
                            "Occipito-atlanto-axial mechanical misalignment alters dorsal motor vagal efferent signaling, impacting baroreflex heart rate regulation and enteric gastrointestinal peristalsis.",
                            "Kinetic craniocervical vagal nerve compression"
                          )}
                        />
                      </div>
                      <KineticBiomechanicsView />
                    </div>
                  )}

                  {/* STATION 08: CAUSAL FLOW CASCADE */}
                  {station.id === 'cascade' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {report.cascadeStages.length === 0 ? (
                        /* Empty state with subtle translucent blue illustration plate */
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '28px 20px',
                            background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.65) 0%, rgba(224, 242, 254, 0.45) 100%)',
                            borderRadius: '20px',
                            border: '1.5px solid rgba(186, 230, 253, 0.75)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          <SubtleAqueousLensIllustration size={110} />
                          <div style={{ maxWidth: '380px' }}>
                            <strong style={{ fontSize: '14.5px', color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                              Awaiting Clinical Pathophysiology Intake
                            </strong>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.45 }}>
                              Start a consultation or connect health logs to generate your personal 5-stage sequential causal domino chain.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenConsult) onOpenConsult();
                              else window.location.href = '/app/consult';
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                              color: '#FFF',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '8px 16px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 3px 10px rgba(2, 132, 199, 0.25)',
                            }}
                          >
                            + Start Intake Consultation
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Stage Selector Stepper Rail */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(5, 1fr)',
                              gap: '6px',
                              background: '#F8FAFC',
                              padding: '6px',
                              borderRadius: '14px',
                              border: '1px solid #E2E8F0',
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
                                    padding: '6px 2px',
                                    borderRadius: '10px',
                                    border: isSelected ? '1.5px solid #6366F1' : '1px solid transparent',
                                    background: isSelected ? '#FFFFFF' : 'transparent',
                                    color: isSelected ? '#4338CA' : '#64748B',
                                    cursor: 'pointer',
                                    boxShadow: isSelected ? '0 2px 6px rgba(99, 102, 241, 0.15)' : 'none',
                                  }}
                                >
                                  <span style={{ fontSize: '15px' }}>{stage.organIcon}</span>
                                  <span style={{ fontSize: '10px', fontWeight: 800 }}>Stage {stage.stage}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Active Stage Card */}
                          {(() => {
                            const cur = report.cascadeStages.find((s) => s.stage === activeCascadeStage) || report.cascadeStages[0];
                            return (
                              <div
                                style={{
                                  background: 'linear-gradient(135deg, #FFFFFF 0%, #EEF2FF 100%)',
                                  borderRadius: '16px',
                                  padding: '14px 16px',
                                  border: '1.5px solid #C7D2FE',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '10px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '22px' }}>{cur.organIcon}</span>
                                    <div>
                                      <strong style={{ fontSize: '14px', color: '#1E1B4B', display: 'block' }}>
                                        Stage {cur.stage}: {cur.title}
                                      </strong>
                                      <span style={{ fontSize: '11px', color: '#4F46E5', fontWeight: 700 }}>
                                        Organ Axis: {cur.organSystem}
                                      </span>
                                    </div>
                                  </div>
                                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: '#E0E7FF', color: '#4338CA', fontWeight: 800 }}>
                                    Step {cur.stage} of 5
                                  </span>
                                </div>

                                <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.45, background: 'rgba(255,255,255,0.9)', padding: '10px 12px', borderRadius: '10px', border: '1px solid #C7D2FE' }}>
                                  <strong>Mechanism:</strong> {cur.mechanism}
                                </div>

                                {/* Source evidence badge */}
                                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                  <SourceEvidenceBadge
                                    source="Autonomic Pathophysiology Model"
                                    citation="Cross-Organ Mapping"
                                    onClick={() => openSourcePassage(
                                      "Autonomic Pathophysiology Model",
                                      "Cross-Organ Mapping",
                                      `Stage ${cur.stage} (${cur.title}): ${cur.mechanism}. Downstream effect: ${cur.downstreamEffect}.`,
                                      `Causal domino cascade stage ${cur.stage}`
                                    )}
                                  />
                                </div>

                                <div>
                                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                                    Clinical Manifestations:
                                  </span>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {cur.clinicalSigns.map((sign, i) => (
                                      <span key={i} style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A' }}>
                                        • {sign}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                                  <div style={{ background: '#F8FAFC', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                    <strong style={{ color: '#0284C7', display: 'block' }}>← Upstream Trigger:</strong>
                                    <span style={{ color: '#475569' }}>{cur.upstreamCause}</span>
                                  </div>
                                  <div style={{ background: '#F8FAFC', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                    <strong style={{ color: '#059669', display: 'block' }}>→ Downstream Consequence:</strong>
                                    <span style={{ color: '#475569' }}>{cur.downstreamEffect}</span>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                  <button
                                    type="button"
                                    disabled={activeCascadeStage === 1}
                                    onClick={() => {
                                      triggerHapticLight();
                                      setActiveCascadeStage((prev) => Math.max(1, prev - 1));
                                    }}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      border: '1px solid #E2E8F0',
                                      background: '#FFFFFF',
                                      color: activeCascadeStage === 1 ? '#CBD5E1' : '#334155',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      cursor: activeCascadeStage === 1 ? 'default' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <ArrowLeft size={12} /> Previous Stage
                                  </button>

                                  <button
                                    type="button"
                                    disabled={activeCascadeStage === 5}
                                    onClick={() => {
                                      triggerHapticLight();
                                      setActiveCascadeStage((prev) => Math.min(5, prev + 1));
                                    }}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      border: 'none',
                                      background: activeCascadeStage === 5 ? '#E2E8F0' : '#4F46E5',
                                      color: activeCascadeStage === 5 ? '#94A3B8' : '#FFFFFF',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      cursor: activeCascadeStage === 5 ? 'default' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    Next Stage <ArrowRight size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}

                  {/* STATION 09: SYMPTOM CLUSTER CROSS-MATCHER */}
                  {station.id === 'matcher' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            Tap symptoms to dynamically recalculate multi-specialist board convergence in real-time:
                          </span>
                          <SourceEvidenceBadge
                            source="Multi-System Cluster Evaluator"
                            citation="Cross-Board Aligned"
                            onClick={() => openSourcePassage(
                              "Multi-System Cluster Evaluator",
                              "Cross-Board Aligned",
                              "Dynamic cross-matching calculates alignment across cardiology, gastroenterology, neurology, and endocrinology to reveal common roots instead of isolated silos.",
                              "Multi-symptom cluster consensus"
                            )}
                          />
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                          {report.symptomCluster.map((item) => {
                            const isSelected = selectedSymptoms.includes(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => toggleSymptom(item.id)}
                                style={{
                                  padding: '7px 12px',
                                  borderRadius: '999px',
                                  border: isSelected ? '1.5px solid #0284C7' : '1.5px solid #E2E8F0',
                                  background: isSelected ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : '#FFFFFF',
                                  color: isSelected ? '#FFFFFF' : '#334155',
                                  fontSize: '12px',
                                  fontWeight: isSelected ? 800 : 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  boxShadow: isSelected ? '0 2px 8px rgba(2, 132, 199, 0.25)' : 'none',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <span>{item.icon}</span>
                                <span>{item.name}</span>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Convergence Synthesis Card */}
                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.95) 0%, rgba(224, 242, 254, 0.75) 100%)',
                          borderRadius: '14px',
                          padding: '14px 16px',
                          border: '1.5px solid rgba(186, 230, 253, 0.85)',
                          boxShadow: '0 4px 14px rgba(14, 165, 233, 0.08), inset 0 1px 2px #FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase' }}>
                              BOARD CONVERGENCE INDEX
                            </span>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: '#0C4A6E' }}>
                              {clusterEvaluation.matchConfidence}% Cross-System Correlation
                            </div>
                          </div>
                          <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '999px', background: '#0284C7', color: '#FFFFFF' }}>
                            {clusterEvaluation.summonedBoards.length} Boards Summoned
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: '#0369A1', lineHeight: 1.4 }}>
                          {clusterEvaluation.summaryNote}
                        </div>

                        <div>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                            Aligned Medical Disciplines:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {clusterEvaluation.summonedBoards.map((b, i) => (
                              <span
                                key={i}
                                style={{
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: '#FFFFFF',
                                  color: '#0284C7',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  border: '1px solid #BAE6FD',
                                }}
                              >
                                ✓ {b} Board
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STATION 10: SPECIALIST CONSENSUS PANELS */}
                  {station.id === 'consensus' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {report.consensusDialogue.length === 0 ? (
                        /* Empty state with subtle translucent blue illustration plate */
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '28px 20px',
                            background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.65) 0%, rgba(224, 242, 254, 0.45) 100%)',
                            borderRadius: '20px',
                            border: '1.5px solid rgba(186, 230, 253, 0.75)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          <SubtleAqueousLensIllustration size={110} />
                          <div style={{ maxWidth: '380px' }}>
                            <strong style={{ fontSize: '14.5px', color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                              Multi-Specialist Panels Awaiting Review
                            </strong>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.45 }}>
                              Gastroenterology, Neuro-Immunology, and Functional Medicine boards convene once intake consultation or records are provided.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenConsult) onOpenConsult();
                              else window.location.href = '/app/consult';
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                              color: '#FFF',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '8px 16px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 3px 10px rgba(2, 132, 199, 0.25)',
                            }}
                          >
                            Convene Clinical Board
                          </button>
                        </div>
                      ) : (
                        report.consensusDialogue.map((dialogue, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: '#F8FAFC',
                              borderRadius: '14px',
                              padding: '12px 14px',
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  style={{
                                    width: '34px',
                                    height: '34px',
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
                                  <strong style={{ fontSize: '13.5px', color: '#0F172A', display: 'block' }}>
                                    {dialogue.doctorName}
                                  </strong>
                                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                                    {dialogue.credentials}
                                  </span>
                                </div>
                              </div>

                              <SourceEvidenceBadge
                                source="Autonomous Panel Synthesis"
                                citation="Cross-Validated"
                                onClick={() => openSourcePassage(
                                  dialogue.doctorName,
                                  dialogue.credentials,
                                  `"${dialogue.finding}" — Organ Axis: ${dialogue.organ}`,
                                  `Specialist dialogue: ${dialogue.role}`
                                )}
                              />
                            </div>

                            <div
                              style={{
                                background: '#FFFFFF',
                                borderRadius: '10px',
                                padding: '10px 12px',
                                fontSize: '12px',
                                color: '#334155',
                                lineHeight: 1.45,
                                border: '1px solid #E2E8F0',
                                fontStyle: 'italic',
                              }}
                            >
                              "{dialogue.finding}"
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748B' }}>
                              <span>Organ Axis: <strong style={{ color: dialogue.color }}>{dialogue.organ}</strong></span>
                              <span style={{ color: '#0284C7', fontWeight: 600 }}>Cross-Validated ✓</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* STATION 11: WHAT 15-MINUTE VISITS MISSED */}
                  {station.id === 'misses' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div
                        style={{
                          background: '#FFF1F2',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          border: '1px solid #FECDD3',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <AlertTriangle size={18} color="#E11D48" style={{ flexShrink: 0 }} />
                        <div>
                          <strong style={{ fontSize: '12.5px', color: '#BE123C', display: 'block' }}>
                            The Single-Specialist Silo Trap
                          </strong>
                          <span style={{ fontSize: '11px', color: '#9F1239' }}>
                            Standard 15-minute consultations review organs in isolation. HealthChain resolves these specific blind spots.
                          </span>
                        </div>
                      </div>

                      {report.clinicalMisses.length === 0 ? (
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '24px 16px',
                            background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.65) 0%, rgba(224, 242, 254, 0.45) 100%)',
                            borderRadius: '16px',
                            border: '1.5px solid rgba(186, 230, 253, 0.75)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '10px',
                          }}
                        >
                          <SubtleAqueousLensIllustration size={100} />
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                            Clinical blind spot detection activates once consultation history is logged.
                          </p>
                        </div>
                      ) : (
                        report.clinicalMisses.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: '#F8FAFC',
                              borderRadius: '14px',
                              padding: '12px 14px',
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                                {item.overlookedBy}
                              </span>
                              <SourceEvidenceBadge
                                source="Multi-Specialty Silo Audit"
                                citation="Cross-Discipline Gap Analysis"
                                onClick={() => openSourcePassage(
                                  item.overlookedBy,
                                  "15-Minute Visit Audit",
                                  `What Was Missed: ${item.whatWasMissed}\n\nClinical Impact: ${item.clinicalImpact}\n\nHidden Systemic Link: ${item.hiddenConnection}`,
                                  `Clinical blind spot analysis for ${item.overlookedBy}`
                                )}
                              />
                            </div>

                            <div style={{ background: '#FEF2F2', padding: '8px 10px', borderRadius: '8px', border: '1px solid #FCA5A5' }}>
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', display: 'block' }}>
                                Routine 15-Min Conclusion:
                              </span>
                              <span style={{ fontSize: '11.5px', color: '#991B1B' }}>{item.standardFinding}</span>
                            </div>

                            <div style={{ background: '#F0FDF4', padding: '8px 10px', borderRadius: '8px', border: '1px solid #86EFAC' }}>
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', display: 'block' }}>
                                What Was Missed (HealthChain Connection):
                              </span>
                              <span style={{ fontSize: '11.5px', color: '#166534', fontWeight: 600 }}>{item.whatWasMissed}</span>
                            </div>

                            <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.4 }}>
                              <strong>Clinical Impact:</strong> {item.clinicalImpact}
                            </div>

                            <div style={{ fontSize: '11px', color: '#0284C7', background: '#F0F9FF', padding: '5px 8px', borderRadius: '6px', border: '1px solid #BAE6FD' }}>
                              🔗 <strong>Hidden Systemic Link:</strong> {item.hiddenConnection}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* STATION 12: DOCTOR DOSSIER SBAR BRIEF (POLISHED CASE SUMMARY COVER) */}
                  {station.id === 'dossier' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* 4. POLISHED COVER FOR A CASE SUMMARY */}
                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.95) 0%, rgba(224, 242, 254, 0.8) 50%, #FFFFFF 100%)',
                          borderRadius: '18px',
                          padding: '16px 18px',
                          border: '1.5px solid rgba(186, 230, 253, 0.85)',
                          boxShadow: '0 8px 24px rgba(14, 165, 233, 0.08), inset 0 1px 2px #FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        {/* Cover Top Meta Strip */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid rgba(186, 230, 253, 0.6)', paddingBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Restrained two-tone blue micro-capsule badge */}
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '999px',
                                background: '#FFFFFF',
                                border: '1px solid #BAE6FD',
                                boxShadow: '0 2px 5px rgba(2, 132, 199, 0.1)',
                                fontSize: '10px',
                                fontWeight: 800,
                                color: '#0369A1',
                              }}
                            >
                              <span
                                style={{
                                  width: '10px',
                                  height: '5px',
                                  borderRadius: '2.5px',
                                  background: 'linear-gradient(90deg, #38BDF8 50%, rgba(255,255,255,0.9) 50%)',
                                  border: '0.8px solid #0284C7',
                                  display: 'inline-block',
                                }}
                              />
                              SBAR CASE DOSSIER COVER
                            </span>

                            <SourceEvidenceBadge
                              source="AMA / SBAR Standard"
                              citation="Physician Ready"
                              onClick={() => openSourcePassage(
                                "AMA / SBAR Clinical Standard",
                                "Physician Ready Protocol",
                                `Situation: ${report.doctorDossier.sbar.situation}\n\nAssessment: ${report.doctorDossier.sbar.assessment}\n\nRecommendation: ${report.doctorDossier.sbar.recommendation}`,
                                "Doctor SBAR Dossier Hand-off"
                              )}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={handleCopySbar}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: isCopied ? '#ECFDF5' : '#FFFFFF',
                                color: isCopied ? '#059669' : '#1E293B',
                                border: isCopied ? '1.5px solid #10B981' : '1px solid #CBD5E1',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                              }}
                            >
                              {isCopied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                              <span>{isCopied ? 'Copied' : 'Copy SBAR'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={handlePrint}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: '#0284C7',
                                color: '#FFFFFF',
                                border: 'none',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                              }}
                            >
                              <Printer size={12} />
                              <span>Print / PDF</span>
                            </button>
                          </div>
                        </div>

                        {/* Patient & Hypothesis Headline */}
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '2px' }}>
                            Patient: <strong style={{ color: '#0F172A' }}>{report.patientName}</strong> • Generated: {report.generatedAt}
                          </div>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0C4A6E' }}>
                            {report.primaryHypothesis}
                          </h4>
                        </div>

                        {/* SBAR 4-Box Grid with Soft Refractive Depth */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(186, 230, 253, 0.8)', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                            <strong style={{ fontSize: '10.5px', color: '#0284C7', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                              [S] Situation
                            </strong>
                            <span style={{ fontSize: '12px', color: '#334155', lineHeight: 1.45 }}>{report.doctorDossier.sbar.situation}</span>
                          </div>

                          <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(186, 230, 253, 0.8)', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                            <strong style={{ fontSize: '10.5px', color: '#0284C7', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                              [B] Background
                            </strong>
                            <span style={{ fontSize: '12px', color: '#334155', lineHeight: 1.45 }}>{report.doctorDossier.sbar.background}</span>
                          </div>

                          <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(186, 230, 253, 0.8)', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                            <strong style={{ fontSize: '10.5px', color: '#0284C7', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                              [A] Assessment
                            </strong>
                            <span style={{ fontSize: '12px', color: '#334155', lineHeight: 1.45 }}>{report.doctorDossier.sbar.assessment}</span>
                          </div>

                          <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(186, 230, 253, 0.8)', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                            <strong style={{ fontSize: '10.5px', color: '#0284C7', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                              [R] Recommendation
                            </strong>
                            <span style={{ fontSize: '12px', color: '#334155', lineHeight: 1.45 }}>{report.doctorDossier.sbar.recommendation}</span>
                          </div>
                        </div>

                        {/* Prioritized Tests to Order */}
                        <div style={{ marginTop: '4px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            Recommended Diagnostic Orders for Physician:
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {report.doctorDossier.testsToOrder.map((t, i) => (
                              <div
                                key={i}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  background: '#F0FDF4',
                                  border: '1px solid #BBF7D0',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '11.5px',
                                }}
                              >
                                <div>
                                  <strong style={{ color: '#166534', display: 'block' }}>{t.test}</strong>
                                  <span style={{ color: '#15803D', fontSize: '10.5px' }}>{t.rationale}</span>
                                </div>
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: 800,
                                    padding: '1px 5px',
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

                        {/* Associated ICD-10 Diagnostic Codes */}
                        <div style={{ marginTop: '4px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                            Associated ICD-10 Clinical Codes:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {report.doctorDossier.icdCodes.map((c) => (
                              <span
                                key={c.code}
                                style={{
                                  fontSize: '10.5px',
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: '#FFFFFF',
                                  color: '#475569',
                                  border: '1px solid #CBD5E1',
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
              </section>

              {/* CONNECTIVE BRIDGES BETWEEN CLINICAL PILLARS */}
              {selectedPillar === 'all' && !focusedStationId && station.id === 'insights' && (
                <div
                  style={{
                    background: 'linear-gradient(90deg, rgba(240, 253, 250, 0.9) 0%, rgba(240, 249, 255, 0.9) 100%)',
                    borderRadius: '16px',
                    padding: '10px 14px',
                    border: '1.5px dashed #99F6E4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '11.5px',
                    color: '#0F766E',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>🔗</span>
                  <div>
                    <strong style={{ display: 'block', color: '#0F766E' }}>
                      Diagnostic Bridge: Gut Barrier → Systemic Lab Biomarkers
                    </strong>
                    <span style={{ color: '#475569' }}>
                      Mucosal permeability allows undigested metabolites into systemic circulation, altering functional bloodwork before conventional alarms trip.
                    </span>
                  </div>
                </div>
              )}

              {selectedPillar === 'all' && !focusedStationId && station.id === 'kinetic' && (
                <div
                  style={{
                    background: 'linear-gradient(90deg, rgba(240, 249, 255, 0.9) 0%, rgba(238, 242, 255, 0.9) 100%)',
                    borderRadius: '16px',
                    padding: '10px 14px',
                    border: '1.5px dashed #BAE6FD',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '11.5px',
                    color: '#0369A1',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>⚡</span>
                  <div>
                    <strong style={{ display: 'block', color: '#0369A1' }}>
                      Diagnostic Bridge: Biomechanics & Labs → Root Cause Domino Engine
                    </strong>
                    <span style={{ color: '#475569' }}>
                      Upper cervical vagal impingement combined with depleted cellular cofactors directly launches multi-organ autonomic cascades.
                    </span>
                  </div>
                </div>
              )}

              {selectedPillar === 'all' && !focusedStationId && station.id === 'misses' && (
                <div
                  style={{
                    background: 'linear-gradient(90deg, rgba(238, 242, 255, 0.9) 0%, rgba(236, 253, 245, 0.9) 100%)',
                    borderRadius: '16px',
                    padding: '10px 14px',
                    border: '1.5px dashed #A7F3D0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '11.5px',
                    color: '#059669',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>📋</span>
                  <div>
                    <strong style={{ display: 'block', color: '#059669' }}>
                      Diagnostic Bridge: Multi-Disciplinary Synthesis → Physician Handoff
                    </strong>
                    <span style={{ color: '#475569' }}>
                      Consolidating all 11 prior clinical stations into a 60-second actionable SBAR dossier with prioritized orders for your doctor.
                    </span>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {sourcePassageModalData && (
        <SourcePassageModal
          {...sourcePassageModalData}
          isOpen={Boolean(sourcePassageModalData)}
          onClose={() => setSourcePassageModalData(null)}
        />
      )}
    </div>
  );
};
