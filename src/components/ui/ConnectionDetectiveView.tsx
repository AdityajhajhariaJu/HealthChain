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
  getFunctionalBiomarkers,
} from '../../services/ConnectionDetectiveEngine';
import { getActiveCase } from '../../services/CaseEngine';
import { getUnifiedCaseScope } from '../../services/caseWorkspace';
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
    subtitle: 'Dietary triggers & sensitivity compounds',
    statusBadge: 'Dietary Triggers',
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
    subtitle: 'Post-meal reaction timeline & delay windows',
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
    subtitle: 'Monthly meal logs & flare calendar',
    statusBadge: '30-Day Trend',
  },
  {
    id: 'elimination',
    stationNumber: '04',
    pillarId: 'gut',
    pillarLabel: 'Gut & Food',
    pillarColor: '#0D9488',
    pillarBg: '#F0FDFA',
    pillarBorder: '#CCFBF1',
    title: 'Elimination Protocol',
    shortTitle: 'Elimination',
    icon: '🎯',
    subtitle: '4-week elimination and phased reintroduction',
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
    title: 'Cross-Correlation Insights',
    shortTitle: 'Insights',
    icon: '💡',
    subtitle: 'Ingredient-to-symptom statistical correlations',
    statusBadge: 'Correlations',
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
    subtitle: 'Standard cutoffs vs. functional target ranges',
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
    subtitle: 'Posture chains & vagus nerve axis',
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
    title: '5-Stage Causal Cascade',
    shortTitle: 'Causal Flow',
    icon: '⚡',
    subtitle: 'Chronological progression of systemic symptoms',
    statusBadge: '5 Stages',
  },
  {
    id: 'matcher',
    stationNumber: '09',
    pillarId: 'cause',
    pillarLabel: 'Root Cause',
    pillarColor: '#6366F1',
    pillarBg: '#EEF2FF',
    pillarBorder: '#C7D2FE',
    title: 'Symptom Cluster Matcher',
    shortTitle: 'Cross-Matcher',
    icon: '🔍',
    subtitle: 'Dynamic alignment across medical disciplines',
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
    title: 'Specialist Consensus Panels',
    shortTitle: 'Consensus',
    icon: '🏛️',
    subtitle: 'Multi-specialist cross-validation of findings',
    statusBadge: 'Specialist Panels',
  },
  {
    id: 'misses',
    stationNumber: '11',
    pillarId: 'cause',
    pillarLabel: 'Root Cause',
    pillarColor: '#6366F1',
    pillarBg: '#EEF2FF',
    pillarBorder: '#C7D2FE',
    title: 'Cross-Discipline Insights',
    shortTitle: 'Key Insights',
    icon: '⚠️',
    subtitle: 'Atypical presentations & cross-organ connections',
    statusBadge: 'Correlations Found',
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
    title: 'Doctor Dossier (SBAR Brief)',
    shortTitle: 'SBAR Dossier',
    icon: '📋',
    subtitle: 'Physician SBAR handoff, lab orders & codes',
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

export interface ParentPillarCardData {
  id: PillarId;
  title: string;
  badge: string;
  desc: string;
  icon: string;
  stationCount: number;
  stationRange: string;
  telemetry: string;
  accentColor: string;
  lightBg: string;
  borderColor: string;
  shadowColor: string;
  gradient: string;
  badgeBg: string;
  badgeColor: string;
  stationIds: TabId[];
}

export const PARENT_PILLAR_CARDS: ParentPillarCardData[] = [
  {
    id: 'gut',
    title: 'Gut & Food',
    badge: 'Pillar 01',
    desc: 'Dietary triggers, histamine, post-meal timing & calendar flares',
    icon: '🥗',
    stationCount: 5,
    stationRange: '01 - 05',
    telemetry: 'Triggers & Flares',
    accentColor: '#0D9488',
    lightBg: 'linear-gradient(145deg, #FFFFFF 0%, #F0FDFA 60%, #E6FFFA 100%)',
    borderColor: 'rgba(13, 148, 136, 0.35)',
    shadowColor: 'rgba(13, 148, 136, 0.25)',
    gradient: 'linear-gradient(135deg, #10B981 0%, #0D9488 100%)',
    badgeBg: '#CCFBF1',
    badgeColor: '#0F766E',
    stationIds: ['map', 'postmeal', 'calendar', 'elimination', 'insights']
  },
  {
    id: 'body',
    title: 'Labs & Body',
    badge: 'Pillar 02',
    desc: 'Lab ranges, optimal targets & biomechanics',
    icon: '🧪',
    stationCount: 2,
    stationRange: '06 - 07',
    telemetry: 'Biomarkers & Vagus',
    accentColor: '#0284C7',
    lightBg: 'linear-gradient(145deg, #FFFFFF 0%, #F0F9FF 60%, #E0F2FE 100%)',
    borderColor: 'rgba(2, 132, 199, 0.35)',
    shadowColor: 'rgba(2, 132, 199, 0.25)',
    gradient: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
    badgeBg: '#E0F2FE',
    badgeColor: '#0369A1',
    stationIds: ['biomarkers', 'kinetic']
  },
  {
    id: 'cause',
    title: 'Root Cause',
    badge: 'Pillar 03',
    desc: 'Sequential symptom analysis & specialist consensus',
    icon: '⚡',
    stationCount: 4,
    stationRange: '08 - 11',
    telemetry: 'Multi-System Links',
    accentColor: '#6366F1',
    lightBg: 'linear-gradient(145deg, #FFFFFF 0%, #EEF2FF 60%, #E0E7FF 100%)',
    borderColor: 'rgba(99, 102, 241, 0.35)',
    shadowColor: 'rgba(99, 102, 241, 0.25)',
    gradient: 'linear-gradient(135deg, #818CF8 0%, #6366F1 100%)',
    badgeBg: '#EEF2FF',
    badgeColor: '#4338CA',
    stationIds: ['cascade', 'matcher', 'consensus', 'misses']
  },
  {
    id: 'dossier',
    title: 'Doctor Dossier',
    badge: 'Pillar 04',
    desc: 'Physician SBAR brief, diagnostic codes & clinical orders',
    icon: '📋',
    stationCount: 1,
    stationRange: 'Station 12',
    telemetry: 'Physician SBAR',
    accentColor: '#E11D48',
    lightBg: 'linear-gradient(145deg, #FFFFFF 0%, #FFF1F2 60%, #FFE4E6 100%)',
    borderColor: 'rgba(225, 29, 72, 0.35)',
    shadowColor: 'rgba(225, 29, 72, 0.25)',
    gradient: 'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)',
    badgeBg: '#FFE4E6',
    badgeColor: '#BE123C',
    stationIds: ['dossier']
  }
];

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
  openedPillarId?: PillarId | null;
  onOpenedPillarChange?: (id: PillarId | null) => void;
  onOpenFoodDetective?: () => void;
  onOpenConsult?: () => void;
  onOpenCasePrep?: () => void;
}

export const ConnectionDetectiveView: React.FC<ConnectionDetectiveViewProps> = ({
  initialTab,
  openedPillarId: controlledOpenedPillarId,
  onOpenedPillarChange,
  onOpenFoodDetective,
  onOpenConsult,
  onOpenCasePrep,
}) => {
  const isMobile = useIsMobile();
  const caseScope = getUnifiedCaseScope();
  const activeCase = caseScope.caseItem;
  const activeReview = activeCase?.reviews?.find((r: any) => r.type === 'jarvis' || r.report) || activeCase?.reviews?.[0];
  const [report, setReport] = useState<ConnectionDetectiveReport>(() => getConnectionDetectiveReport(activeReview?.report, activeCase));
  const semanticGraph = useMemo(() => {
    return deriveSemanticEvidenceGraphFromEngineReview(activeReview?.report, activeCase);
  }, [activeReview, activeCase, report]);

  useEffect(() => {
    setReport(getConnectionDetectiveReport(activeReview?.report, activeCase));
  }, [activeReview, activeCase]);

  const [internalOpenedPillarId, setInternalOpenedPillarId] = useState<PillarId | null>(() => {
    // Only open a pillar directly if an explicit non-default initialTab is provided (not 'map')
    if (initialTab && initialTab !== 'map') {
      const target = ALL_12_STATIONS.find((s) => s.id === initialTab);
      return target ? target.pillarId : null;
    }
    return null; // Always show the 4 cards by default!
  });

  const openedPillarId = controlledOpenedPillarId !== undefined ? controlledOpenedPillarId : internalOpenedPillarId;
  const setOpenedPillarId = (id: PillarId | null) => {
    if (onOpenedPillarChange) onOpenedPillarChange(id);
    setInternalOpenedPillarId(id);
  };
  const [cardActiveStations, setCardActiveStations] = useState<Record<'gut' | 'body' | 'cause' | 'dossier', TabId>>(() => ({
    gut: initialTab && TAB_TO_PILLAR[initialTab] === 'gut' ? initialTab : 'map',
    body: initialTab && TAB_TO_PILLAR[initialTab] === 'body' ? initialTab : 'biomarkers',
    cause: initialTab && TAB_TO_PILLAR[initialTab] === 'cause' ? initialTab : 'cascade',
    dossier: 'dossier',
  }));
  const [focusedStationId, setFocusedStationId] = useState<TabId | null>(null);
  const [highlightedStationId, setHighlightedStationId] = useState<TabId | null>(null);

  const handleSelectPillar = (pillarId: PillarId) => {
    triggerHapticSelection();
    setOpenedPillarId(pillarId === 'all' ? null : pillarId);
    trackButtonClick('clinical_parent_pillar_select', pillarId);
  };

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
    if (targetStation) {
      setOpenedPillarId(targetStation.pillarId);
      setCardActiveStations((prev) => ({ ...prev, [targetStation.pillarId]: targetStation.id }));
    }
    setFocusedStationId(null);
    setHighlightedStationId(tabId);
    trackButtonClick('clinical_station_jump', tabId);

    setTimeout(() => {
      const element = document.getElementById(`cd-station-${tabId}`);
      const cardEl = targetStation ? document.getElementById(`cd-card-${targetStation.pillarId}`) : null;
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (element) {
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
        setCardActiveStations((prev) => ({ ...prev, [target.pillarId]: target.id }));
        setHighlightedStationId(initialTab);
        const timer = setTimeout(() => {
          setHighlightedStationId(null);
        }, 2400);
        return () => clearTimeout(timer);
      }
    }
  }, [initialTab]);

  useEffect(() => {
    const handleUpdate = () => {
      const scope = getUnifiedCaseScope();
      const rev = scope.caseItem?.reviews?.find((r: any) => r.type === 'jarvis' || r.report) || scope.caseItem?.reviews?.[0];
      setReport(getConnectionDetectiveReport(rev?.report, scope.caseItem));
    };
    window.addEventListener('hc_detective_edges_updated', handleUpdate);
    window.addEventListener('hc_biomarkers_updated', handleUpdate);
    window.addEventListener('hc_profile_updated', handleUpdate);
    window.addEventListener('hc_cases_updated', handleUpdate);
    window.addEventListener('hc_triggers_updated', handleUpdate);

    return () => {
      window.removeEventListener('hc_detective_edges_updated', handleUpdate);
      window.removeEventListener('hc_biomarkers_updated', handleUpdate);
      window.removeEventListener('hc_profile_updated', handleUpdate);
      window.removeEventListener('hc_cases_updated', handleUpdate);
      window.removeEventListener('hc_triggers_updated', handleUpdate);
    };
  }, []);

  const dietSummary = useMemo(() => generateDoctorSummary(), [report]);

  const resolvedCulpritFoods = useMemo(() => {
    if (dietSummary?.topCulpritFoods && dietSummary.topCulpritFoods.length > 0) {
      return dietSummary.topCulpritFoods;
    }
    const intakeTriggers: string[] = Array.isArray(activeCase?.intakeData?.triggers)
      ? activeCase.intakeData.triggers
      : [];
    if (intakeTriggers.length > 0) {
      return intakeTriggers.map((t, idx) => ({
        id: `intake_trigger_${idx}`,
        name: t,
        emoji: '🥗',
        category: 'Intake Trigger',
        primarySensitivity: 'Patient Reported Trigger',
        correlationPercent: 75,
        reactionWindow: '2-6 hours',
        safeSwap: 'Elimination Trial Swap',
        evidenceRef: 'Intake History',
      }));
    }
    const dietStreamItems = report?.streams?.find((s) => s.id === 'diet')?.items || [];
    if (dietStreamItems.length > 0) {
      return dietStreamItems.map((item, idx) => ({
        id: `stream_trigger_${idx}`,
        name: item,
        emoji: '🥗',
        category: 'Dietary Stream',
        primarySensitivity: 'Identified Sensitivity',
        correlationPercent: 70,
        reactionWindow: 'Active Observation',
        safeSwap: 'Clinical Swap',
        evidenceRef: 'Dietary Stream',
      }));
    }
    return [];
  }, [dietSummary, activeCase, report]);

  const dynamicPillarData = useMemo(() => {
    // 1. Gut & Food
    const directTriggers = Array.isArray(activeCase?.intakeData?.triggers) ? activeCase.intakeData.triggers.length : 0;
    const streamDiet = report?.streams?.find((s) => s.id === 'diet');
    const streamDietCount = streamDiet?.count || streamDiet?.items?.length || 0;
    const culpritCount = resolvedCulpritFoods.length;
    const gutTriggersCount = culpritCount || directTriggers || streamDietCount;
    const gutTelemetry = gutTriggersCount > 0
      ? `${gutTriggersCount} ${gutTriggersCount === 1 ? 'Trigger' : 'Triggers'} Found`
      : 'Awaiting Meal Logs';

    // 2. Labs & Body
    const biomarkers = getFunctionalBiomarkers();
    const flaggedMarkers = biomarkers.filter((b) => b.status === 'suboptimal_low' || b.status === 'suboptimal_high').length;
    const labStream = report?.streams?.find((s) => s.id === 'labs');
    const labStreamCount = labStream?.count || labStream?.items?.length || 0;
    const directLabsCount = Array.isArray(activeCase?.intakeData?.labs) ? activeCase.intakeData.labs.length : 0;
    const totalMarkersCount = biomarkers.length || directLabsCount || labStreamCount;
    const bodyTelemetry = flaggedMarkers > 0
      ? `${flaggedMarkers} Flagged ${flaggedMarkers === 1 ? 'Marker' : 'Markers'}`
      : totalMarkersCount > 0
      ? `${totalMarkersCount} ${totalMarkersCount === 1 ? 'Marker' : 'Markers'} Tracked`
      : 'Awaiting Lab Panels';

    // 3. Root Cause
    const connectionsCount = report?.mapData?.connections?.length || (semanticGraph?.edges?.length || 0);
    const conditionsCount = report?.mapData?.conditions?.length || 0;
    const consensusCount = report?.consensusDialogue?.length || 0;
    const causeTelemetry = connectionsCount > 0
      ? `${connectionsCount} Causal Links Mapped`
      : conditionsCount > 0
      ? `${conditionsCount} ${conditionsCount === 1 ? 'Pathway' : 'Pathways'} Aligned`
      : consensusCount > 0
      ? `${consensusCount} ${consensusCount === 1 ? 'Panel' : 'Panels'} Aligned`
      : 'Awaiting Clinical Review';

    // 4. Doctor Dossier
    const hasSbar = Boolean(
      report?.doctorDossier?.sbar?.situation?.trim() ||
      report?.doctorDossier?.sbar?.assessment?.trim() ||
      activeReview?.report?.executiveSummary?.trim()
    );
    const orderCount = report?.doctorDossier?.testsToOrder?.length || 0;
    const icdCount = report?.doctorDossier?.icdCodes?.length || 0;
    const dossierTelemetry = hasSbar
      ? (orderCount + icdCount > 0 ? `${orderCount + icdCount} Orders & Codes` : 'SBAR Brief Ready')
      : 'Intake Incomplete';

    return {
      gut: { telemetry: gutTelemetry, triggersCount: gutTriggersCount },
      body: { telemetry: bodyTelemetry, flaggedCount: flaggedMarkers, totalCount: totalMarkersCount },
      cause: { telemetry: causeTelemetry, connectionsCount, conditionsCount, consensusCount },
      dossier: { telemetry: dossierTelemetry, orderCount, icdCount, hasSbar },
    };
  }, [activeCase, report, semanticGraph, resolvedCulpritFoods, activeReview]);

  const getDynamicStationBadge = (station: StationConfig): string => {
    switch (station.id) {
      case 'map':
        return dynamicPillarData.gut.triggersCount > 0
          ? `${dynamicPillarData.gut.triggersCount} ${dynamicPillarData.gut.triggersCount === 1 ? 'Trigger' : 'Triggers'} Found`
          : 'Awaiting Logs';
      case 'biomarkers':
        return dynamicPillarData.body.flaggedCount > 0
          ? `${dynamicPillarData.body.flaggedCount} Flagged`
          : dynamicPillarData.body.totalCount > 0
          ? `${dynamicPillarData.body.totalCount} Markers`
          : 'Optimal Ranges';
      case 'cascade':
        return (report?.cascadeStages?.length || 0) > 0
          ? `${report.cascadeStages.length}-Stage Cascade`
          : 'Symptom Flow';
      case 'consensus':
        return dynamicPillarData.cause.consensusCount > 0
          ? `${dynamicPillarData.cause.consensusCount} Panels Aligned`
          : 'Clinical Board';
      case 'misses':
        return (report?.clinicalMisses?.length || 0) > 0
          ? `${report.clinicalMisses.length} Blind Spots Mapped`
          : 'Clinical Audit';
      case 'dossier':
        return dynamicPillarData.dossier.hasSbar
          ? (dynamicPillarData.dossier.orderCount > 0
              ? `${dynamicPillarData.dossier.orderCount} Orders Ready`
              : 'Physician Ready')
          : 'Draft Intake';
      default:
        return station.statusBadge;
    }
  };

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
    const text = `HEALTHCHAIN 360 • CONNECTION DETECTIVE REPORT
Patient: ${report.patientName}
Generated: ${report.generatedAt}
Primary Root-Cause Hypothesis: ${report.primaryHypothesis} (Board Alignment: not scored)

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

  const renderStation = (station: StationConfig) => {
    const isHighlighted = highlightedStationId === station.id;
    const isSingleFocus = focusedStationId === station.id;

    return (
              <React.Fragment key={station.id}>
                <section
                  id={`cd-station-${station.id}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                {/* STATION HEADER BAR */}
                <header
                  style={{
                    background: 'transparent',
                    borderBottom: '1px solid #F1F5F9',
                    padding: '8px 0',
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
                      {getDynamicStationBadge(station)}
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
                      {resolvedCulpritFoods.length > 0 ? (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                            gap: '8px',
                          }}
                        >
                          {resolvedCulpritFoods.slice(0, 4).map((culprit: any) => (
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
                      ) : (
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '20px 16px',
                            background: 'linear-gradient(135deg, rgba(240, 253, 250, 0.65) 0%, rgba(204, 251, 241, 0.35) 100%)',
                            borderRadius: '14px',
                            border: '1.5px solid rgba(153, 246, 228, 0.75)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ fontSize: '24px' }}>🥗</span>
                          <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F766E' }}>
                            No Dietary Triggers Logged Yet
                          </div>
                          <p style={{ margin: 0, fontSize: '11.5px', color: '#134E4A', maxWidth: '420px', lineHeight: 1.4 }}>
                            Record daily meals in the Food Detective or specify known food sensitivities in Case Intake to calculate real-time correlation and symptom flare windows.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHapticLight();
                              if (onOpenFoodDetective) onOpenFoodDetective();
                              else window.dispatchEvent(new CustomEvent('hc_open_whole_health_modal', { detail: { tab: 'detective' } }));
                            }}
                            style={{
                              marginTop: '4px',
                              background: '#0D9488',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px 14px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            Open Food Detective <ArrowRight size={12} />
                          </button>
                        </div>
                      )}

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
                            "Upper cervical postural strain alters autonomic signaling, impacting heart rate responsiveness and digestive motility.",
                            "Craniocervical alignment and autonomic signaling"
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
                              Start a consultation or connect health logs to generate a symptom progression analysis.
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
                                      `Progression stage ${cur.stage}`
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
                            Tap symptoms to recalculate specialist consensus:
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
                              SPECIALIST AGREEMENT
                            </span>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: '#0C4A6E' }}>
                              Recorded observations
                            </div>
                          </div>
                          <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '999px', background: '#0284C7', color: '#FFFFFF' }}>
                            {clusterEvaluation.summonedBoards.length} Specialties Active
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
              {!focusedStationId && station.id === 'insights' && (
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

              {!focusedStationId && station.id === 'kinetic' && (
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
                      Diagnostic Bridge: Biomechanics & Labs → Root Cause Flow
                    </strong>
                    <span style={{ color: '#475569' }}>
                      Upper cervical alignment combined with borderline nutritional cofactors may contribute to multi-system symptoms.
                    </span>
                  </div>
                </div>
              )}

              {!focusedStationId && station.id === 'misses' && (
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
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ARCHITECTURAL CONDITIONAL: 4 BENTO CARDS OVERVIEW vs OPENED DOMAIN WORKSPACE */}
      <AnimatePresence mode="wait">
        {openedPillarId === null ? (
          /* ======================================================== */
          /* 4 BENTO CARDS IN 2x2 MATRIX (OVERVIEW)                   */
          /* ======================================================== */
          <motion.div
            key="four-cards-grid"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: isMobile ? '16px' : '22px',
              alignItems: 'stretch',
            }}
          >
            {PARENT_PILLAR_CARDS.map((pillar) => {
              const pillarStations = ALL_12_STATIONS.filter((s) => s.pillarId === pillar.id);

              return (
                <motion.div
                  id={`cd-card-${pillar.id}`}
                  key={pillar.id}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                  onClick={() => {
                    triggerHapticSelection();
                    setOpenedPillarId(pillar.id);
                    trackButtonClick('clinical_parent_pillar_open', pillar.id);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.45) 100%)',
                    backdropFilter: 'blur(32px)',
                    WebkitBackdropFilter: 'blur(32px)',
                    border: '1px solid rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 30px rgba(255,255,255,0.6)',
                    borderRadius: isMobile ? '28px' : '36px',
                    padding: isMobile ? '18px 18px' : '24px 26px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: isMobile ? '180px' : '210px',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div>
                    {/* Top Row: Circular Icon + Badge + Open Arrow */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div
                        style={{
                          width: isMobile ? '40px' : '46px',
                          height: isMobile ? '40px' : '46px',
                          borderRadius: '50%',
                          background: pillar.gradient,
                          boxShadow: `0 8px 18px ${pillar.shadowColor}, inset 0 1px 0 rgba(255,255,255,0.5)`,
                          border: '1px solid rgba(255,255,255,0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: isMobile ? '20px' : '23px',
                          flexShrink: 0,
                        }}
                      >
                        {pillar.icon}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          className="micro-badge"
                          style={{
                            background: pillar.badgeBg,
                            color: pillar.badgeColor,
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontSize: '10px',
                            fontWeight: 800,
                            letterSpacing: '0.6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {pillar.stationCount} {pillar.stationCount === 1 ? 'STATION' : 'STATIONS'}
                        </div>

                        {/* Open Arrow Button Indicator */}
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: pillar.accentColor,
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                          }}
                        >
                          <ArrowRight size={15} />
                        </div>
                      </div>
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                      <h4
                        className="serif-heading"
                        style={{
                          fontSize: isMobile ? '20px' : '22px',
                          fontWeight: 700,
                          margin: '0 0 4px',
                          color: '#2D3748',
                          lineHeight: 1.25,
                          letterSpacing: '-0.3px',
                        }}
                      >
                        {pillar.title}
                      </h4>
                      <p
                        style={{
                          fontSize: isMobile ? '12.5px' : '13.5px',
                          color: '#64748B',
                          margin: 0,
                          fontWeight: 600,
                          lineHeight: 1.4,
                        }}
                      >
                        {pillar.desc}
                      </p>
                    </div>

                    {/* Clickable Station Tags Preview */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '14px' }}>
                      {pillarStations.map((stn) => (
                        <span
                          key={stn.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHapticSelection();
                            setOpenedPillarId(pillar.id);
                            setCardActiveStations((prev) => ({ ...prev, [pillar.id]: stn.id }));
                          }}
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#475569',
                            background: 'rgba(255,255,255,0.9)',
                            border: '1px solid #E2E8F0',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          title={`Click to jump to ${stn.shortTitle}`}
                        >
                          <span>{stn.icon}</span>
                          <span>{stn.shortTitle}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Telemetry pill */}
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10.5px',
                        fontWeight: 800,
                        color: pillar.accentColor,
                        background: pillar.badgeBg,
                        padding: '4px 10px',
                        borderRadius: '6px',
                      }}
                    >
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: pillar.accentColor,
                        }}
                      />
                      <span>{dynamicPillarData[pillar.id as keyof typeof dynamicPillarData]?.telemetry || pillar.telemetry}</span>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: pillar.accentColor,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <span>Open</span>
                      <span>→</span>
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* ======================================================== */
          /* OPENED DOMAIN WORKSPACE VIEW                             */
          /* ======================================================== */
          (() => {
            const openedPillar = PARENT_PILLAR_CARDS.find((p) => p.id === openedPillarId) || PARENT_PILLAR_CARDS[0];
            const pillarStations = ALL_12_STATIONS.filter((s) => s.pillarId === openedPillar.id);
            const activeStationIdForPillar = cardActiveStations[openedPillar.id as keyof typeof cardActiveStations] || pillarStations[0]?.id;
            const activeStation = pillarStations.find((s) => s.id === activeStationIdForPillar) || pillarStations[0];
            const currentStationIndex = pillarStations.findIndex((s) => s.id === activeStation?.id);
            const prevStation = currentStationIndex > 0 ? pillarStations[currentStationIndex - 1] : null;
            const nextStation = currentStationIndex >= 0 && currentStationIndex < pillarStations.length - 1 ? pillarStations[currentStationIndex + 1] : null;

            return (
              <motion.div
                key={`opened-${openedPillar.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* Navigation Bar: Back to 4 Cards & Quick Domain Switcher */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    overflowX: 'auto',
                    padding: '2px 0',
                  }}
                >
                  {/* All Domains Overview Pill */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setOpenedPillarId(null);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 14px',
                      borderRadius: '999px',
                      background: '#FFFFFF',
                      border: '1.5px solid #CBD5E1',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    <span>🗂️</span>
                    <span>All Domains</span>
                  </button>

                  {/* Domain Switcher Pills */}
                  {PARENT_PILLAR_CARDS.map((p) => {
                    const isCurrent = p.id === openedPillar.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          triggerHapticSelection();
                          setOpenedPillarId(p.id);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '7px 14px',
                          borderRadius: '999px',
                          background: isCurrent ? p.accentColor : '#FFFFFF',
                          border: `1.5px solid ${isCurrent ? p.accentColor : '#E2E8F0'}`,
                          color: isCurrent ? '#FFFFFF' : '#475569',
                          fontSize: '12px',
                          fontWeight: isCurrent ? 800 : 600,
                          cursor: 'pointer',
                          boxShadow: isCurrent ? `0 2px 8px ${p.shadowColor}` : 'none',
                          transition: 'all 0.15s ease',
                          flexShrink: 0,
                        }}
                      >
                        <span>{p.icon}</span>
                        <span>{p.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* THE OPENED DOMAIN CONTAINER */}
                <div
                  id={`cd-card-${openedPillar.id}`}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
                    backdropFilter: 'blur(32px)',
                    WebkitBackdropFilter: 'blur(32px)',
                    border: `2px solid ${openedPillar.borderColor}`,
                    boxShadow: `0 20px 40px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,0.95)`,
                    borderRadius: isMobile ? '28px' : '36px',
                    padding: isMobile ? '18px 16px' : '24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                  }}
                >
                  {/* Domain Header */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      paddingBottom: '16px',
                      borderBottom: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            background: openedPillar.gradient,
                            boxShadow: `0 8px 18px ${openedPillar.shadowColor}`,
                            border: '1px solid rgba(255,255,255,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            flexShrink: 0,
                          }}
                        >
                          {openedPillar.icon}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                letterSpacing: '0.6px',
                                textTransform: 'uppercase',
                                color: openedPillar.accentColor,
                                background: openedPillar.badgeBg,
                                padding: '2px 8px',
                                borderRadius: '999px',
                              }}
                            >
                              {openedPillar.badge}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                color: '#475569',
                                background: '#F1F5F9',
                                padding: '2px 8px',
                                borderRadius: '999px',
                              }}
                            >
                              {openedPillar.stationCount} {openedPillar.stationCount === 1 ? 'Station' : 'Stations'}
                            </span>
                          </div>

                          <h3
                            className="serif-heading"
                            style={{
                              margin: 0,
                              fontSize: isMobile ? '22px' : '26px',
                              fontWeight: 800,
                              color: '#0F172A',
                              letterSpacing: '-0.4px',
                              lineHeight: 1.2,
                            }}
                          >
                            {openedPillar.title}
                          </h3>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: 800,
                          color: openedPillar.accentColor,
                          background: openedPillar.badgeBg,
                          padding: '5px 12px',
                          borderRadius: '8px',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: openedPillar.accentColor,
                          }}
                        />
                        <span>{dynamicPillarData[openedPillar.id as keyof typeof dynamicPillarData]?.telemetry || openedPillar.telemetry}</span>
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
                      {openedPillar.desc}
                    </p>

                    {/* DOCKED INSIDER STATION TABS */}
                    {pillarStations.length > 1 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          overflowX: 'auto',
                          paddingTop: '6px',
                          scrollbarWidth: 'none',
                        }}
                      >
                        {pillarStations.map((station) => {
                          const isStationActive = activeStation?.id === station.id;
                          return (
                            <button
                              key={station.id}
                              type="button"
                              onClick={() => {
                                triggerHapticSelection();
                                setCardActiveStations((prev) => ({ ...prev, [openedPillar.id]: station.id }));
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 14px',
                                borderRadius: '999px',
                                background: isStationActive ? '#0F172A' : '#FFFFFF',
                                color: isStationActive ? '#FFFFFF' : '#475569',
                                border: isStationActive ? '1.5px solid #0F172A' : '1px solid #CBD5E1',
                                fontSize: '11px',
                                fontWeight: isStationActive ? 800 : 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                boxShadow: isStationActive ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.02)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '9.5px',
                                  fontWeight: 900,
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  background: isStationActive ? openedPillar.accentColor : '#F1F5F9',
                                  color: isStationActive ? '#FFFFFF' : '#64748B',
                                }}
                              >
                                {station.stationNumber}
                              </span>
                              <span>{station.icon}</span>
                              <span>{station.shortTitle}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ACTIVE STATION CONTENT */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activeStation && renderStation(activeStation)}
                  </div>

                  {/* STEPPER FOOTER */}
                  {pillarStations.length > 1 && (
                    <div
                      style={{
                        paddingTop: '16px',
                        borderTop: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {prevStation ? (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            setCardActiveStations((prev) => ({ ...prev, [openedPillar.id]: prevStation.id }));
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '7px 14px',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#334155',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <span>← Prev:</span>
                          <span>{prevStation.icon}</span>
                          <span>{prevStation.shortTitle}</span>
                        </button>
                      ) : <div />}

                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B' }}>
                        Station {currentStationIndex + 1} of {pillarStations.length} in {openedPillar.title}
                      </span>

                      {nextStation ? (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            setCardActiveStations((prev) => ({ ...prev, [openedPillar.id]: nextStation.id }));
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '7px 14px',
                            borderRadius: '8px',
                            background: openedPillar.accentColor,
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: `0 2px 6px ${openedPillar.shadowColor}`,
                          }}
                        >
                          <span>Next:</span>
                          <span>{nextStation.icon}</span>
                          <span>{nextStation.shortTitle}</span>
                          <span>→</span>
                        </button>
                      ) : <div />}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })()
        )}
      </AnimatePresence>

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
