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
  SymptomClusterItem,
  SystemAxis,
  deriveSemanticEvidenceGraphFromEngineReview,
} from '../../services/ConnectionDetectiveEngine';
import { getActiveCase } from '../../services/CaseEngine';
import { getUnifiedCaseScope } from '../../services/caseWorkspace';
import { generateDoctorSummary } from '../../services/TriggerEngine';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';
import { SemanticEvidenceGraphView } from './SemanticEvidenceGraphView';
import { PostMealReactionTimeline } from './PostMealReactionTimeline';
import { DigestionCalendarHeatmap } from './DigestionCalendarHeatmap';
import { SmartCorrelationInsightsView } from './SmartCorrelationInsightsView';
import { FeatureProfileDataBanner } from './FeatureProfileDataBanner';
import { trackButtonClick } from '../../services/analytics';
import { SourcePassageModal, SourcePassageModalProps } from './SourcePassageModal';
import { TherapeuticOutcomeCard, openEliminationSuiteModal } from './TherapeuticOutcomeCard';

export type TabId =
  | 'overview'
  | 'map'
  | 'postmeal'
  | 'calendar'
  | 'elimination'
  | 'insights';

export type PillarId = 'all' | 'gut';

export interface StationConfig {
  id: TabId;
  stationNumber: string;
  pillarId: 'gut';
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
  // Pillar 1: Gut & Food (01 - 02)
  {
    id: 'postmeal',
    stationNumber: '01',
    pillarId: 'gut',
    pillarLabel: 'Gut & Food',
    pillarColor: '#0D9488',
    pillarBg: '#F0FDFA',
    pillarBorder: '#CCFBF1',
    title: 'Post-Meal Timeline & Flare Calendar',
    shortTitle: 'Timeline & Calendar',
    icon: '🍽️',
    subtitle: 'Post-meal reaction delay windows & 30-day digestion heatmap',
    statusBadge: '2h/6h & Heatmap',
  },
  {
    id: 'insights',
    stationNumber: '02',
    pillarId: 'gut',
    pillarLabel: 'Gut & Food',
    pillarColor: '#0D9488',
    pillarBg: '#F0FDFA',
    pillarBorder: '#CCFBF1',
    title: 'Food Triggers & Insights',
    shortTitle: 'Triggers & Insights',
    icon: '🥗',
    subtitle: 'Culprit foods, evidence graph & statistical correlations',
    statusBadge: 'Correlations',
  },
];

export const ALL_CLINICAL_STATIONS: StationConfig[] = ALL_12_STATIONS;

export const resolveStationTab = (tab?: TabId): TabId => {
  if (!tab || tab === 'overview') return 'overview';
  if (tab === 'calendar') return 'postmeal';
  if (tab === 'map') return 'insights';
  return tab;
};

export const TAB_TO_PILLAR: Partial<Record<TabId, 'gut'>> = {
  map: 'gut',
  postmeal: 'gut',
  calendar: 'gut',
  elimination: 'gut',
  insights: 'gut',
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
    get stationCount() {
      return ALL_12_STATIONS.filter((s) => s.pillarId === 'gut').length;
    },
    get stationRange() {
      const stations = ALL_12_STATIONS.filter((s) => s.pillarId === 'gut');
      return stations.length > 0 ? `${stations[0].stationNumber} - ${stations[stations.length - 1].stationNumber}` : '01 - 02';
    },
    telemetry: 'Triggers & Flares',
    accentColor: '#0D9488',
    lightBg: 'linear-gradient(145deg, #FFFFFF 0%, #F0FDFA 60%, #E6FFFA 100%)',
    borderColor: 'rgba(13, 148, 136, 0.35)',
    shadowColor: 'rgba(13, 148, 136, 0.25)',
    gradient: 'linear-gradient(135deg, #10B981 0%, #0D9488 100%)',
    badgeBg: '#CCFBF1',
    badgeColor: '#0F766E',
    get stationIds() {
      return ALL_12_STATIONS.filter((s) => s.pillarId === 'gut').map((s) => s.id);
    },
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
  {
    id: 'all',
    label: 'All Domains',
    shortLabel: 'All',
    icon: '✨',
    get count() {
      return ALL_12_STATIONS.length;
    },
  },
  {
    id: 'gut',
    label: 'Gut & Food',
    shortLabel: '🥗 Gut',
    icon: '🥗',
    get count() {
      return ALL_12_STATIONS.filter((s) => s.pillarId === 'gut').length;
    },
  },
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
    if (initialTab && initialTab !== 'overview') {
      const resolved = resolveStationTab(initialTab);
      const target = ALL_12_STATIONS.find((s) => s.id === resolved);
      if (target) return target.pillarId;
    }
    return null; // Always show the main overview screen by default!
  });

  const openedPillarId = controlledOpenedPillarId !== undefined ? controlledOpenedPillarId : internalOpenedPillarId;
  const setOpenedPillarId = (id: PillarId | null) => {
    if (onOpenedPillarChange) onOpenedPillarChange(id);
    setInternalOpenedPillarId(id);
  };

  const [timelineViewMode, setTimelineViewMode] = useState<'timeline' | 'heatmap'>(() =>
    initialTab === 'calendar' ? 'heatmap' : 'timeline'
  );

  const [cardActiveStations, setCardActiveStations] = useState<Record<'gut', TabId>>(() => {
    const resolved = resolveStationTab(initialTab);
    return {
      gut: resolved && resolved !== 'overview' && TAB_TO_PILLAR[resolved] === 'gut' ? resolved : 'overview',
    };
  });
  const [focusedStationId, setFocusedStationId] = useState<TabId | null>(null);
  const [highlightedStationId, setHighlightedStationId] = useState<TabId | null>(null);

  const handleSelectPillar = (pillarId: PillarId) => {
    triggerHapticSelection();
    if (pillarId !== 'all') {
      setCardActiveStations((prev) => ({ ...prev, [pillarId]: 'overview' }));
    }
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

    if (tabId === 'elimination') {
      openEliminationSuiteModal();
      return;
    }

    if (tabId === 'calendar') {
      setTimelineViewMode('heatmap');
      scrollToStation('postmeal');
      return;
    }

    const resolvedId = resolveStationTab(tabId);
    const targetStation = ALL_12_STATIONS.find((s) => s.id === resolvedId);
    if (targetStation) {
      setOpenedPillarId(targetStation.pillarId);
      setCardActiveStations((prev) => ({ ...prev, [targetStation.pillarId]: targetStation.id }));
    }
    setFocusedStationId(null);
    setHighlightedStationId(resolvedId);
    trackButtonClick('clinical_station_jump', resolvedId);

    setTimeout(() => {
      const element = document.getElementById(`cd-station-${resolvedId}`);
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
    if (initialTab && initialTab !== 'overview') {
      if (initialTab === 'calendar') {
        setTimelineViewMode('heatmap');
      }
      const resolved = resolveStationTab(initialTab);
      const target = ALL_12_STATIONS.find((s) => s.id === resolved);
      if (target) {
        setCardActiveStations((prev) => ({ ...prev, [target.pillarId]: target.id }));
        setHighlightedStationId(resolved);
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

    return {
      gut: { telemetry: gutTelemetry, triggersCount: gutTriggersCount },
    };
  }, [activeCase, report, semanticGraph, resolvedCulpritFoods, activeReview]);






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

                  {/* STATION: FOOD TRIGGERS & INSIGHTS */}
                  {(station.id === 'insights' || station.id === 'map') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

                      <div style={{ marginTop: '14px' }}>
                        <SmartCorrelationInsightsView
                          onOpenElimination={() => openEliminationSuiteModal()}
                          onOpenTimeline={() => scrollToStation('postmeal')}
                          onOpenHeatmap={() => {
                            setTimelineViewMode('heatmap');
                            scrollToStation('postmeal');
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* STATION: POST-MEAL TIMELINE & FLARE CALENDAR */}
                  {(station.id === 'postmeal' || station.id === 'calendar') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* Sub-tab switcher */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#F1F5F9',
                          padding: '4px',
                          borderRadius: '12px',
                          width: 'fit-content',
                          maxWidth: '100%',
                          overflowX: 'auto',
                          WebkitOverflowScrolling: 'touch',
                          scrollbarWidth: 'none',
                          msOverflowStyle: 'none',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <button
                          type="button"
                          data-compact="true"
                          onClick={() => {
                            triggerHapticLight();
                            setTimelineViewMode('timeline');
                          }}
                          style={{
                            background: timelineViewMode === 'timeline' ? '#FFFFFF' : 'transparent',
                            color: timelineViewMode === 'timeline' ? '#0F172A' : '#64748B',
                            fontWeight: timelineViewMode === 'timeline' ? 700 : 600,
                            border: timelineViewMode === 'timeline' ? '1px solid #CBD5E1' : '1px solid transparent',
                            boxShadow: timelineViewMode === 'timeline' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            padding: isMobile ? '6px 10px' : '6px 12px',
                            borderRadius: '8px',
                            fontSize: isMobile ? '11px' : '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ flexShrink: 0 }}>⏱️</span>
                          <span style={{ whiteSpace: 'nowrap' }}>{isMobile ? '2h & 6h Windows' : '2h & 6h Reaction Windows'}</span>
                        </button>

                        <button
                          type="button"
                          data-compact="true"
                          onClick={() => {
                            triggerHapticLight();
                            setTimelineViewMode('heatmap');
                          }}
                          style={{
                            background: timelineViewMode === 'heatmap' ? '#FFFFFF' : 'transparent',
                            color: timelineViewMode === 'heatmap' ? '#0F172A' : '#64748B',
                            fontWeight: timelineViewMode === 'heatmap' ? 700 : 600,
                            border: timelineViewMode === 'heatmap' ? '1px solid #CBD5E1' : '1px solid transparent',
                            boxShadow: timelineViewMode === 'heatmap' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            padding: isMobile ? '6px 10px' : '6px 12px',
                            borderRadius: '8px',
                            fontSize: isMobile ? '11px' : '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ flexShrink: 0 }}>📅</span>
                          <span style={{ whiteSpace: 'nowrap' }}>{isMobile ? '30-Day Calendar' : '30-Day Digestion Calendar'}</span>
                        </button>
                      </div>

                      {timelineViewMode === 'timeline' ? (
                        <PostMealReactionTimeline onOpenQuickMeal={onOpenFoodDetective} />
                      ) : (
                        <DigestionCalendarHeatmap onOpenQuickMeal={onOpenFoodDetective} />
                      )}
                    </div>
                  )}
                </div>
              </section>

              {!focusedStationId && station.id === 'insights' && (
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

            {/* DOMAIN CARDS GRID */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: isMobile ? '12px' : '16px',
                alignItems: 'stretch',
              }}
            >
              {PARENT_PILLAR_CARDS.map((pillar) => {
                const pillarStations = ALL_12_STATIONS.filter((s) => s.pillarId === pillar.id);
                const isGut = pillar.id === 'gut';

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
                      setCardActiveStations((prev) => ({ ...prev, [pillar.id]: 'overview' }));
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
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDFA 60%, #E6FFFA 100%)',
                      border: '1px solid #99F6E4',
                      boxShadow: '0 4px 16px rgba(13, 148, 136, 0.06), 0 1px 2px rgba(0, 0, 0, 0.02)',
                      borderRadius: isMobile ? '24px' : '28px',
                      padding: isMobile ? '14px 16px' : '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: isMobile ? '135px' : '148px',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <div>
                      {/* Top Row: Circular Icon + Micro Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div
                          style={{
                            width: isMobile ? '34px' : '38px',
                            height: isMobile ? '34px' : '38px',
                            minWidth: isMobile ? '34px' : '38px',
                            minHeight: isMobile ? '34px' : '38px',
                            flexShrink: 0,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10B981 0%, #0D9488 100%)',
                            boxShadow: '0 2px 6px rgba(13, 148, 136, 0.24), 0 1px 2px rgba(0, 0, 0, 0.06)',
                            border: '1px solid rgba(255,255,255,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: isMobile ? '17px' : '19px',
                          }}
                        >
                          {pillar.icon}
                        </div>

                        <div
                          className="micro-badge"
                          style={{
                            background: '#ECFDF5',
                            color: '#047857',
                            border: '1px solid #A7F3D0',
                            padding: isMobile ? '3px 8px' : '3.5px 10px',
                            borderRadius: '999px',
                            fontSize: isMobile ? '9.5px' : '10.5px',
                            fontWeight: 800,
                            letterSpacing: '0.4px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Sparkles size={11} color="#059669" />
                          <span>{`${pillarStations.length} CLINICAL TOOLS`}</span>
                        </div>
                      </div>

                      {/* Title & Subtitle */}
                      <div>
                        <h4
                          className="serif-heading"
                          style={{
                            fontSize: isMobile ? '16.5px' : '18px',
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
                            fontSize: isMobile ? '12px' : '12.5px',
                            color: '#475569',
                            margin: 0,
                            fontWeight: 500,
                            lineHeight: 1.4,
                          }}
                        >
                          {pillar.desc}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Row: Telemetry Pill & Compact Action Button */}
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: isMobile ? '10px' : '10.5px',
                          fontWeight: 700,
                          color: '#047857',
                          background: '#ECFDF5',
                          border: '1px solid #A7F3D0',
                          padding: '3px 9px',
                          borderRadius: '999px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: '#10B981',
                          }}
                        />
                        <span>{dynamicPillarData[pillar.id as keyof typeof dynamicPillarData]?.telemetry || pillar.telemetry}</span>
                      </div>

                      <button
                        type="button"
                        data-compact="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHapticSelection();
                          setOpenedPillarId(pillar.id);
                          setCardActiveStations((prev) => ({ ...prev, [pillar.id]: 'overview' }));
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '999px',
                          height: isMobile ? '24px' : '26px',
                          padding: isMobile ? '0 12px' : '0 14px',
                          fontSize: isMobile ? '10.5px' : '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)',
                          whiteSpace: 'nowrap',
                          lineHeight: 1,
                        }}
                      >
                        <span>Open</span>
                        <ArrowRight size={11} strokeWidth={2.6} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
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
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            setOpenedPillarId(null);
                          }}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#334155',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <ArrowLeft size={13} /> Back
                        </button>
                        <div
                          style={{
                            width: isMobile ? '40px' : '46px',
                            height: isMobile ? '40px' : '46px',
                            borderRadius: '50%',
                            background: openedPillar.gradient,
                            boxShadow: `0 8px 18px ${openedPillar.shadowColor}`,
                            border: '1px solid rgba(255,255,255,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: isMobile ? '20px' : '24px',
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
                              fontSize: isMobile ? '20px' : '24px',
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

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#0D9488',
                          background: '#CCFBF1',
                          border: '1px solid #99F6E4',
                          padding: '3px 10px',
                          borderRadius: '999px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {`${pillarStations.length} Clinical Tools`}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: isMobile ? '12.5px' : '13px', color: '#64748B', lineHeight: 1.4 }}>
                      {openedPillar.desc}
                    </p>
                  </div>

                  {/* ACTIVE STATION CONTENT OR OVERVIEW HUB */}
                  {activeStationIdForPillar === 'overview' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Grid of Domain Clinical Tools */}
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
                                <span style={{ fontSize: '20px' }}>{station.icon}</span>
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
                          <ArrowLeft size={13} /> Back to {openedPillar.title}
                        </button>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                          Station {activeStation?.stationNumber} of {String(ALL_12_STATIONS.length).padStart(2, '0')}
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
