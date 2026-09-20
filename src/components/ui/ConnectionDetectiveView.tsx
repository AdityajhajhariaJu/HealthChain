import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitMerge,
  Network,
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
  SymptomClusterItem,
  SystemAxis,
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
import { PostMealReactionTimeline } from './PostMealReactionTimeline';
import { DigestionCalendarHeatmap } from './DigestionCalendarHeatmap';
import { EliminationProtocolSuite } from './EliminationProtocolSuite';
import { SmartCorrelationInsightsView } from './SmartCorrelationInsightsView';
import { FeatureProfileDataBanner } from './FeatureProfileDataBanner';
import { trackButtonClick } from '../../services/analytics';
import { SourcePassageModal, SourcePassageModalProps } from './SourcePassageModal';
import { TherapeuticOutcomeCard } from './TherapeuticOutcomeCard';

export type TabId =
  | 'overview'
  | 'map'
  | 'postmeal'
  | 'calendar'
  | 'elimination'
  | 'insights'
  | 'biomarkers'
  | 'kinetic';

export type PillarId = 'all' | 'gut' | 'body';

export interface StationConfig {
  id: TabId;
  stationNumber: string;
  pillarId: 'gut' | 'body';
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

// Minimalist Clean Empty State Icon
export const SubtleAqueousLensIllustration: React.FC<{ size?: number; label?: string }> = ({ size = 48 }) => (
  <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: '#F0F9FF', border: '1px solid #BAE6FD', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#0284C7' }}>
    <Activity size={Math.round(size * 0.45)} />
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
    title: 'Track Food Triggers',
    shortTitle: 'Food Triggers',
    icon: '🥗',
    subtitle: 'Dietary triggers, sensitivities & culprit compounds',
    statusBadge: 'Food Triggers',
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
    title: 'Trigger Elimination & Reintroduction',
    shortTitle: 'Elimination',
    icon: '🎯',
    subtitle: 'Structured 4-week elimination trial & reintroduction challenges',
    statusBadge: 'Elimination Trial',
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



];

export const TAB_TO_PILLAR: Partial<Record<TabId, 'gut' | 'body'>> = {
  map: 'gut',
  postmeal: 'gut',
  calendar: 'gut',
  elimination: 'gut',
  insights: 'gut',
  biomarkers: 'body',
  kinetic: 'body',
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
];

export interface PillarFilterOption {
  id: PillarId;
  label: string;
  shortLabel: string;
  icon: string;
  count: number;
}

export const PILLAR_FILTERS: PillarFilterOption[] = [
  { id: 'all', label: 'All Domains', shortLabel: 'All', icon: '✨', count: 7 },
  { id: 'gut', label: 'Gut & Food', shortLabel: '🥗 Gut', icon: '🥗', count: 5 },
  { id: 'body', label: 'Labs & Body', shortLabel: '🧪 Labs', icon: '🧪', count: 2 },
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
  const movementObservations = useMemo(() => {
    const movementTerms = /\b(posture|postural|movement|walking|walk|standing|stand|sitting|sit|bending|lifting|exercise|neck|shoulder|back|spine|hip|knee|ankle|joint|muscle|muscular|mobility|balance|gait|position|positional|range of motion|physio|physical therapy)\b/i;
    return (activeCase?.events || [])
      .filter((event) => movementTerms.test(`${event.label || ''} ${event.note || ''}`))
      .sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 8);
  }, [activeCase]);

  useEffect(() => {
    setReport(getConnectionDetectiveReport(activeReview?.report, activeCase));
  }, [activeReview, activeCase]);

  const [internalOpenedPillarId, setInternalOpenedPillarId] = useState<PillarId | null>(() => {
    if (initialTab && initialTab !== 'overview' && initialTab !== 'map') {
      const target = ALL_12_STATIONS.find((s) => s.id === initialTab);
      if (target) return target.pillarId;
    }
    return null; // Always show the main overview screen by default!
  });

  const openedPillarId = controlledOpenedPillarId !== undefined ? controlledOpenedPillarId : internalOpenedPillarId;
  const setOpenedPillarId = (id: PillarId | null) => {
    if (onOpenedPillarChange) onOpenedPillarChange(id);
    setInternalOpenedPillarId(id);
  };
  const [cardActiveStations, setCardActiveStations] = useState<Record<'gut' | 'body', TabId>>(() => ({
    gut: initialTab && initialTab !== 'map' && TAB_TO_PILLAR[initialTab] === 'gut' ? initialTab : 'overview',
    body: initialTab && TAB_TO_PILLAR[initialTab] === 'body' ? initialTab : 'biomarkers',
  }));
  const [focusedStationId, setFocusedStationId] = useState<TabId | null>(null);
  const [highlightedStationId, setHighlightedStationId] = useState<TabId | null>(null);

  const handleSelectPillar = (pillarId: PillarId) => {
    triggerHapticSelection();
    setOpenedPillarId(pillarId === 'all' ? null : pillarId);
    trackButtonClick('clinical_parent_pillar_select', pillarId);
  };



  const [sourcePassageModalData, setSourcePassageModalData] = useState<SourcePassageModalProps | null>(null);

  const openSourcePassage = (source: string, citation?: string, snippet?: string, claim?: string) => {
    setSourcePassageModalData({
      isOpen: true,
      onClose: () => setSourcePassageModalData(null),
      recordTitle: citation ? `${source} (${citation})` : source,
      recordType: 'Verified Medical Record & Clinical Protocol',
      pageNumber: 1,
      sectionTitle: 'Correlated Evidence Passage',
      passageText: snippet || 'Source details are unavailable in this view.',
      fullFindings: 'Open the case record to review the original source.',
      dateAdded: 'Active Case Timeline',
      findingClaim: claim || 'Source-linked item',
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
    if (initialTab && initialTab !== 'overview' && initialTab !== 'map') {
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
        primarySensitivity: 'Patient-reported observation',
        correlationPercent: 0,
        reactionWindow: 'Timing not established',
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
        primarySensitivity: 'Recorded dietary observation',
        correlationPercent: 0,
        reactionWindow: 'Timing not established',
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

    return {
      gut: { telemetry: gutTelemetry, triggersCount: gutTriggersCount },
      body: { telemetry: bodyTelemetry, flaggedCount: flaggedMarkers, totalCount: totalMarkersCount },
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


      default:
        return station.statusBadge;
    }
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: isMobile ? '15px' : '16px',
                        fontWeight: 700,
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setFocusedStationId(isSingleFocus ? null : station.id);
                      }}
                      title={isSingleFocus ? 'Exit Focus' : 'Focus On Section'}
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
                      aria-label={isSingleFocus ? 'Show all' : `Focus on ${station.title}`}
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
                      {/* Active Food Triggers Protocol Tracker */}
                      <TherapeuticOutcomeCard />

                      {/* STEP 8: THE 6 CANONICAL RELATIONSHIPS EVIDENCE GRAPH */}
                      {semanticGraph.nodes.length > 0 && (
                        <SemanticEvidenceGraphView
                          graph={semanticGraph}
                          onOpenConsult={onOpenConsult}
                          onOpenCasePrep={onOpenCasePrep}
                          onOpenSourceModal={(d) => setSourcePassageModalData(d)}
                        />
                      )}

                      {resolvedCulpritFoods.length > 0 && (
                        <div
                          style={{
                            background: '#F8FAFC',
                            borderRadius: '16px',
                            padding: '14px 16px',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: isMobile ? 'flex-start' : 'center',
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>🔬</span>
                            <div>
                              <strong style={{ fontSize: '13.5px', color: '#0F172A', display: 'block' }}>
                                Recorded food observations
                              </strong>
                              <span style={{ fontSize: '12px', color: '#64748B' }}>
                                Review foods captured in this case. Timing alone does not establish a trigger.
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
                              background: '#0F766E',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '7px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Food Detective <ArrowRight size={12} />
                          </button>
                        </div>
                      )}

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
                                  {culprit.correlationPercent > 0 ? `${culprit.correlationPercent}% co-recorded` : 'Reported'}
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
                                    culprit.correlationPercent > 0
                                      ? `A symptom entry was also recorded on ${culprit.correlationPercent}% of dates when ${culprit.name} was logged. This is an association, not proof of causation.`
                                      : `${culprit.name} was reported in the case history. No repeated association has been calculated.`,
                                    `Recorded food observation for ${culprit.name}`
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
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F766E' }}>
                            No Dietary Triggers Logged Yet
                          </div>
                          <p style={{ margin: 0, fontSize: '12px', color: '#475569', maxWidth: '420px', lineHeight: 1.4 }}>
                            Record daily meals in Food Detective or specify sensitivities in Case Intake to view correlation windows.
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
                    <FunctionalBiomarkersView />
                  )}

                  {/* STATION 07: KINETIC BIOMECHANICS */}
                  {station.id === 'kinetic' && (
                    movementObservations.length > 0 ? (
                      <div style={{ display: 'grid', gap: '9px' }}>
                        <div style={{ color: '#64748B', fontSize: '12.5px', lineHeight: 1.5 }}>
                          Movement-related notes from this case. These are observations, not a biomechanical diagnosis.
                        </div>
                        {movementObservations.map((observation) => {
                          const observedAt = observation.date && !Number.isNaN(new Date(observation.date).getTime())
                            ? new Date(observation.date).toLocaleDateString()
                            : 'Date not recorded';
                          return (
                            <div key={observation.id} style={{ padding: '12px 14px', border: '1px solid #BAE6FD', borderRadius: '12px', background: '#F8FAFC', textAlign: 'left' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <strong style={{ color: '#0F172A', fontSize: '13px' }}>{observation.label || 'Movement observation'}</strong>
                                <span style={{ color: '#64748B', fontSize: '11px', whiteSpace: 'nowrap' }}>{observedAt}</span>
                              </div>
                              {observation.note && <div style={{ marginTop: '4px', color: '#475569', fontSize: '12px', lineHeight: 1.45 }}>{observation.note}</div>}
                              <div style={{ marginTop: '7px', color: '#0369A1', fontSize: '10.5px', fontWeight: 700 }}>Source: case observation</div>
                            </div>
                          );
                        })}
                        <button type="button" onClick={() => onOpenConsult ? onOpenConsult() : (window.location.href = '/app/consult')} style={{ justifySelf: 'start', border: '1px solid #99F6E4', borderRadius: '9px', background: '#F0FDFA', color: '#0F766E', padding: '7px 11px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>
                          Add another observation
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: '28px 20px', textAlign: 'center', border: '1px dashed #CBD5E1', borderRadius: '18px', background: '#F8FAFC' }}>
                        <Activity size={24} color="#0D9488" style={{ marginBottom: '8px' }} />
                        <h4 style={{ margin: '0 0 5px', color: '#0F172A', fontSize: '15px' }}>No movement observations connected yet</h4>
                        <p style={{ margin: '0 auto 14px', color: '#64748B', fontSize: '12.5px', maxWidth: '460px', lineHeight: 1.5 }}>
                          Add posture, movement, pain-location, and timing notes to the active case. HealthChain will not invent a biomechanical cause from symptoms alone.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            if (onOpenConsult) onOpenConsult();
                            else window.location.href = '/app/consult';
                          }}
                          style={{ border: 0, borderRadius: '10px', background: '#0F766E', color: '#FFFFFF', padding: '9px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Add an observation
                        </button>
                      </div>
                    )
                  )}





                </div>
              </section>

              {!focusedStationId && station.id === 'kinetic' && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #F0FDFA 0%, #ECFDF5 100%)',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    border: '1.5px solid #A7F3D0',
                    display: 'flex',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginTop: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>📋</span>
                    <div>
                      <strong style={{ display: 'block', color: '#065F46', fontSize: '13px' }}>
                        Ready for your doctor visit?
                      </strong>
                      <span style={{ color: '#047857', fontSize: '12px' }}>
                        Prepare your clinical appointment brief, choose visit questions, and print or export in Case Prep.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      if (onOpenCasePrep) onOpenCasePrep();
                      else window.location.href = '/app/case-prep';
                    }}
                    style={{
                      background: '#0D9488',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)',
                    }}
                  >
                    Prepare Visit Brief <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </React.Fragment>

    );
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* DOMAIN CARDS OVERVIEW vs OPENED DOMAIN WORKSPACE */}
      <AnimatePresence mode="wait">
        {openedPillarId === null ? (
          /* ======================================================== */
          /* 2 DOMAIN CARDS (OVERVIEW)                                */
          /* ======================================================== */
          <motion.div
            key="main-overview-hub"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Active Protocol / Track Food Triggers Hero Card */}
            <TherapeuticOutcomeCard />

            {/* Section Header: Clinical Health Domains */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', marginBottom: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: '#F0FDFA',
                    border: '1px solid #CCFBF1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0D9488',
                    flexShrink: 0
                  }}
                >
                  <Network size={15} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: isMobile ? '16px' : '17px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                    Health Domains & Diagnostics
                  </h4>
                  <p style={{ margin: '1px 0 0', fontSize: '12px', color: '#64748B' }}>
                    Connected clinical intelligence across digestive and systemic health
                  </p>
                </div>
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0F766E',
                  background: '#F0FDFA',
                  border: '1px solid #CCFBF1',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap'
                }}
              >
                2 Workspaces · 7 Tools
              </span>
            </div>

            {/* 2 DOMAIN CARDS GRID */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: isMobile ? '14px' : '18px',
                alignItems: 'stretch',
              }}
            >
              {PARENT_PILLAR_CARDS.map((pillar) => {
                const pillarStations = ALL_12_STATIONS.filter((s) => s.pillarId === pillar.id);

                return (
                  <motion.div
                    id={`cd-card-${pillar.id}`}
                    key={pillar.id}
                    whileHover={{ y: -3, scale: 1.005 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                    onClick={() => {
                      triggerHapticSelection();
                      setOpenedPillarId(pillar.id);
                      trackButtonClick('clinical_parent_pillar_open', pillar.id);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${pillar.title}`}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectPillar(pillar.id);
                      }
                    }}
                    style={{
                      background: pillar.id === 'gut'
                        ? 'linear-gradient(155deg, #FFFFFF 0%, #FAFEFD 50%, #F0FDFA 100%)'
                        : 'linear-gradient(155deg, #FFFFFF 0%, #FAFCFF 50%, #F0F9FF 100%)',
                      border: pillar.id === 'gut'
                        ? '1px solid rgba(13, 148, 136, 0.25)'
                        : '1px solid rgba(2, 132, 199, 0.25)',
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
                      borderRadius: '22px',
                      padding: isMobile ? '16px' : '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: isMobile ? '170px' : '190px',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      {/* Top Row: Circular Icon + Pill Count Badge + Open Arrow */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: isMobile ? '40px' : '44px',
                              height: isMobile ? '40px' : '44px',
                              borderRadius: '50%',
                              background: pillar.gradient,
                              boxShadow: `0 6px 16px ${pillar.shadowColor}, inset 0 1px 0 rgba(255,255,255,0.6)`,
                              border: '1px solid rgba(255,255,255,0.7)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: isMobile ? '20px' : '22px',
                              flexShrink: 0,
                            }}
                          >
                            {pillar.icon}
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              color: pillar.accentColor,
                              background: pillar.badgeBg,
                              border: `1px solid ${pillar.borderColor}`,
                              padding: '2.5px 9px',
                              borderRadius: '999px',
                              letterSpacing: '0.2px',
                            }}
                          >
                            {pillar.stationCount} Tools Available
                          </span>
                        </div>

                        {/* Open Arrow Button Indicator */}
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#FFFFFF',
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: pillar.accentColor,
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <ArrowRight size={15} />
                        </div>
                      </div>

                      {/* Title & Subtitle */}
                      <div>
                        <h4
                          className="serif-heading"
                          style={{
                            fontSize: isMobile ? '19px' : '21px',
                            fontWeight: 800,
                            margin: '0 0 3px',
                            color: '#0F172A',
                            lineHeight: 1.25,
                            letterSpacing: '-0.3px',
                          }}
                        >
                          {pillar.title}
                        </h4>
                        <p
                          style={{
                            fontSize: isMobile ? '12.5px' : '13px',
                            color: '#475569',
                            margin: 0,
                            fontWeight: 500,
                            lineHeight: 1.4,
                          }}
                        >
                          {pillar.desc}
                        </p>
                      </div>

                      {/* Interactive Station Tool Chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '14px 0 16px' }}>
                        {pillarStations.map((station) => (
                          <span
                            key={station.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHapticSelection();
                              setOpenedPillarId(pillar.id);
                              setCardActiveStations((prev) => ({ ...prev, [pillar.id]: station.id }));
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3.5px 8.5px',
                              borderRadius: '8px',
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#334155',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span>{station.icon}</span>
                            <span>{station.shortTitle}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Telemetry pill & Workspace CTA */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(226, 232, 240, 0.6)', paddingTop: '12px' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: pillar.accentColor,
                          background: pillar.badgeBg,
                          border: `1px solid ${pillar.borderColor}`,
                          padding: '3px 9px',
                          borderRadius: '999px',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: pillar.accentColor,
                            boxShadow: `0 0 5px ${pillar.accentColor}`,
                          }}
                        />
                        <span>{dynamicPillarData[pillar.id as keyof typeof dynamicPillarData]?.telemetry || pillar.telemetry}</span>
                      </div>

                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: pillar.accentColor,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>Explore Workspace</span>
                        <span>→</span>
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              {/* Doctor Appointment Prep Action Card */}
              <div
                style={{
                  gridColumn: isMobile ? '1' : '1 / -1',
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 50%, #F1F5F9 100%)',
                  borderRadius: '20px',
                  padding: isMobile ? '16px' : '18px 22px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: '#F0FDFA',
                      border: '1px solid #CCFBF1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(13, 148, 136, 0.12)'
                    }}
                  >
                    📋
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <strong style={{ fontSize: isMobile ? '13.5px' : '14px', color: '#0F172A' }}>
                        Preparing for a Gastroenterologist or Doctor Visit?
                      </strong>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#0D9488', background: '#CCFBF1', padding: '1.5px 7px', borderRadius: '999px' }}>
                        PRE-VISIT BRIEF
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.4 }}>
                      Generate a clinical appointment summary synthesizing suspected food triggers, reaction delays, and symptom flares for your physician.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    if (onOpenCasePrep) onOpenCasePrep();
                    else window.location.href = '/app/case-prep';
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '9px 18px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(13, 148, 136, 0.28)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                >
                  <span>Generate Visit Brief</span> <ArrowRight size={13} />
                </button>
              </div>
            </div>
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
                {/* THE OPENED DOMAIN CONTAINER */}
                <div
                  id={`cd-card-${openedPillar.id}`}
                  style={{
                    background: '#FFFFFF',
                    border: 'none',
                    boxShadow: 'none',
                    borderRadius: 0,
                    padding: isMobile ? '10px 2px' : '14px 8px',
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
                      paddingBottom: '12px',
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
                        {openedPillar.id === 'gut' && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerHapticSelection();
                              setCardActiveStations((prev) => ({ ...prev, [openedPillar.id]: 'overview' }));
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '6px 14px',
                              borderRadius: '999px',
                              background: activeStationIdForPillar === 'overview' ? '#0F172A' : '#FFFFFF',
                              color: activeStationIdForPillar === 'overview' ? '#FFFFFF' : '#475569',
                              border: activeStationIdForPillar === 'overview' ? '1.5px solid #0F172A' : '1px solid #CBD5E1',
                              fontSize: '11px',
                              fontWeight: activeStationIdForPillar === 'overview' ? 800 : 600,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              boxShadow: activeStationIdForPillar === 'overview' ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.02)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span>✨</span>
                            <span>All Features</span>
                          </button>
                        )}

                        {pillarStations.map((station) => {
                          const isStationActive = activeStationIdForPillar === station.id;
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
                              <span>{station.icon}</span>
                              <span>{station.shortTitle}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ACTIVE STATION CONTENT OR OVERVIEW HUB */}
                  {activeStationIdForPillar === 'overview' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Active Protocol / Track Food Triggers Hero Card */}
                      <TherapeuticOutcomeCard />

                      {/* Section Title */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: isMobile ? '16px' : '17px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                            Gut Health Features & Tools
                          </h4>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                            Tap any tool to investigate symptoms, reaction delays, and flare calendars
                          </p>
                        </div>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0D9488', background: '#CCFBF1', padding: '3px 9px', borderRadius: '999px' }}>
                          5 Core Tools
                        </span>
                      </div>

                      {/* Grid of All 5 Gut Features */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                          gap: '12px',
                        }}
                      >
                        {pillarStations.map((station) => (
                          <motion.div
                            key={station.id}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                            onClick={() => {
                              triggerHapticSelection();
                              setCardActiveStations((prev) => ({ ...prev, [openedPillar.id]: station.id }));
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label={`Open ${station.title}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                triggerHapticSelection();
                                setCardActiveStations((prev) => ({ ...prev, [openedPillar.id]: station.id }));
                              }
                            }}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                              borderRadius: '16px',
                              padding: '14px 16px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              minHeight: '120px',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '20px' }}>{station.icon}</span>
                                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#0D9488', background: '#F0FDFA', border: '1px solid #CCFBF1', padding: '2px 7px', borderRadius: '6px' }}>
                                    {station.statusBadge}
                                  </span>
                                </div>
                                <span style={{ fontSize: '12px', color: '#94A3B8' }}>→</span>
                              </div>
                              <h5 style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.2px' }}>
                                {station.title}
                              </h5>
                              <p style={{ margin: 0, fontSize: '11.5px', color: '#64748B', lineHeight: 1.35 }}>
                                {station.subtitle}
                              </p>
                            </div>
                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9488', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                Open Tool →
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Multi-System Labs & Body Section */}
                      <div
                        style={{
                          marginTop: '8px',
                          background: 'linear-gradient(135deg, #F8FAFC 0%, #F0F9FF 100%)',
                          borderRadius: '16px',
                          border: '1px solid #BAE6FD',
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: isMobile ? 'flex-start' : 'center',
                          flexDirection: isMobile ? 'column' : 'row',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '22px' }}>🧪</span>
                          <div>
                            <strong style={{ fontSize: '13.5px', color: '#0369A1', display: 'block' }}>
                              Multi-System Body Connections
                            </strong>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                              Inspect optimal functional lab biomarkers and posture-vagus nerve biomechanics.
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticSelection();
                            setOpenedPillarId('body');
                          }}
                          style={{
                            background: '#0284C7',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '7px 13px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                          }}
                        >
                          View Labs & Body <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Breadcrumb Back Button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            setCardActiveStations((prev) => ({ ...prev, [openedPillar.id]: 'overview' }));
                          }}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            padding: '5px 11px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#334155',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <ArrowLeft size={13} /> Back to All Features
                        </button>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                          Station {activeStation?.stationNumber} of 05
                        </span>
                      </div>

                      {activeStation && renderStation(activeStation)}
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
