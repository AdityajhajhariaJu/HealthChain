import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Search,
  Flame,
  Wind,
  Brain,
  Activity,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Calendar,
  Clock,
  ExternalLink,
  Info,
} from 'lucide-react';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';
import {
  getProfile,
  getDigestionLogs,
} from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';

export type InsightCategory = 'All' | 'Stomach' | 'Bloating' | 'Bowel' | 'Brain/Energy';

export interface SmartInsightItem {
  id: string;
  foodName: string;
  symptomName: string;
  category: 'Stomach' | 'Bloating' | 'Bowel' | 'Brain/Energy';
  iconType: 'flame' | 'wind' | 'bowel' | 'brain';
  matchingDays: number;
  totalDays: number;
  correlationPercent: number;
  nonExposureMatchingDays?: number;
  nonExposureTotalDays?: number;
  nonExposurePercent?: number;
  hasComparativeIncrease?: boolean;
  isUserVerified?: boolean;
  hasReferenceExplanation?: boolean;
  incubationWindow: string;
  biochemicalMechanism: string;
  clinicalCompound: string;
  safeSwap: {
    insteadOf: string;
    swapTo: string;
    culinaryNote: string;
  };
}

interface SmartCorrelationInsightsViewProps {
  onBack?: () => void;
  onOpenElimination?: () => void;
  onOpenTimeline?: () => void;
  onOpenHeatmap?: () => void;
}

export const SmartCorrelationInsightsView: React.FC<SmartCorrelationInsightsViewProps> = ({
  onBack,
  onOpenElimination,
  onOpenTimeline,
  onOpenHeatmap,
}) => {
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InsightCategory>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dataRevision, setDataRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setDataRevision((value) => value + 1);
    window.addEventListener('hc_profile_updated', refresh);
    window.addEventListener('hc_triggers_updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('hc_profile_updated', refresh);
      window.removeEventListener('hc_triggers_updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // Real-time empirical match computation from user logs
  const dynamicInsights = useMemo(() => {
    const profile = getProfile();
    const digestionLogs = getDigestionLogs();
    const recentNutrition = profile?.nutrition?.recentLogs || [];
    const dietFoodLogs = profile?.dietFoodLogs || {};

    // Group meals by date
    const mealsByDate: Record<string, string[]> = {};
    recentNutrition.forEach((log: any) => {
      if (log.date && log.name) {
        if (!mealsByDate[log.date]) mealsByDate[log.date] = [];
        mealsByDate[log.date].push(log.name.toLowerCase());
      }
    });
    Object.entries(dietFoodLogs).forEach(([dateStr, items]: [string, any]) => {
      if (Array.isArray(items)) {
        if (!mealsByDate[dateStr]) mealsByDate[dateStr] = [];
        items.forEach((it: any) => {
          if (it.name) mealsByDate[dateStr].push(it.name.toLowerCase());
        });
      }
    });

    // Check days where digestion symptoms occurred
    const symptomDays: Record<string, { bloating: boolean; stomach: boolean; bowel: boolean }> = {};
    Object.entries(digestionLogs).forEach(([dateStr, log]: [string, any]) => {
      const bloat = (log.bloatingScore || 0) >= 4;
      const stomach = (log.stomachScore || 0) >= 4 || log.acidReflux;
      const bowel = log.bristolType && (log.bristolType <= 2 || log.bristolType >= 6);
      if (bloat || stomach || bowel) {
        symptomDays[dateStr] = { bloating: bloat, stomach, bowel };
      }
    });

    const observedDates = Object.keys(digestionLogs);
    const symptomMatches = (item: Pick<SmartInsightItem, 'category'>, dateStr: string) => {
      const symptom = symptomDays[dateStr];
      if (!symptom) return false;
      if (item.category === 'Bloating') return symptom.bloating;
      if (item.category === 'Stomach') return symptom.stomach;
      if (item.category === 'Bowel') return symptom.bowel;
      return false;
    };
    const buildObserved = (item: SmartInsightItem, foodMatcher: (food: string) => boolean): SmartInsightItem[] => {
      const foodWords = item.foodName.toLowerCase().split(/[\s/]+/);
      const isExposure = (food: string) => foodMatcher(food) || foodWords.some((word) => word.length > 3 && food.includes(word));
      let userExposures = 0;
      let userMatches = 0;

      // Only days with an actual symptom/digestion check-in belong in either
      // denominator. A meal-only day is unknown, not a symptom-free day.
      observedDates.forEach((dateStr) => {
        const foods = mealsByDate[dateStr] || [];
        const ateFood = foods.some(isExposure);
        if (ateFood) {
          userExposures++;
          if (symptomMatches(item, dateStr)) userMatches++;
        }
      });

      if (userExposures < 2) return [];
      const nonExposureDates = observedDates.filter((dateStr) => !(mealsByDate[dateStr] || []).some(isExposure));
      const nonExposureMatches = nonExposureDates.filter((dateStr) => symptomMatches(item, dateStr)).length;
      const exposurePercent = Math.round((userMatches / userExposures) * 100);
      const nonExposurePercent = nonExposureDates.length > 0 ? Math.round((nonExposureMatches / nonExposureDates.length) * 100) : undefined;
      return [{
        ...item,
        matchingDays: userMatches,
        totalDays: userExposures,
        correlationPercent: exposurePercent,
        nonExposureMatchingDays: nonExposureMatches,
        nonExposureTotalDays: nonExposureDates.length,
        nonExposurePercent,
        hasComparativeIncrease: nonExposurePercent !== undefined ? exposurePercent > nonExposurePercent : undefined,
        isUserVerified: true,
      }];
    };

    const loggedFoods = Array.from(new Set(Object.values(mealsByDate).flat().map((food) => food.trim()).filter(Boolean)));
    const observedResults = loggedFoods.flatMap((foodName, foodIndex) => {
      return (['Bloating', 'Stomach', 'Bowel'] as const).flatMap((category, categoryIndex) => {
        const generic: SmartInsightItem = {
          id: `observed_${foodIndex}_${categoryIndex}_${foodName.replace(/[^a-z0-9]+/g, '_')}`,
          foodName,
          symptomName: category === 'Stomach' ? 'Stomach discomfort' : category,
          category,
          iconType: category === 'Bloating' ? 'wind' : category === 'Bowel' ? 'bowel' : 'flame',
          matchingDays: 0,
          totalDays: 0,
          correlationPercent: 0,
          incubationWindow: 'Timing not established',
          biochemicalMechanism: '',
          clinicalCompound: 'Recorded food',
          safeSwap: { insteadOf: foodName, swapTo: 'No substitute suggested', culinaryNote: '' },
          hasReferenceExplanation: false,
        };
        return buildObserved(generic, (food) => food === foodName).filter((result) => result.matchingDays > 0);
      });
    });
    return observedResults;
  }, [dataRevision]);

  // Filter insights based on category and search
  const filteredInsights = useMemo(() => {
    return dynamicInsights.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.foodName.toLowerCase().includes(q) ||
        item.symptomName.toLowerCase().includes(q) ||
        item.clinicalCompound.toLowerCase().includes(q) ||
        item.biochemicalMechanism.toLowerCase().includes(q)
      );
    });
  }, [dynamicInsights, selectedCategory, searchQuery]);

  // Review the source record without turning a comparison into a forbidden food.
  const handleOpenRecord = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticSelection();
    onOpenElimination?.();
  };

  const categories: InsightCategory[] = ['All', 'Stomach', 'Bloating', 'Bowel', 'Brain/Energy'];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxWidth: '560px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header Bar (Matching media_1788703634311.png) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          padding: '4px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#0F172A',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
              }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
            Recorded patterns
          </h2>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#7E22CE',
            background: '#F3E8FF',
            padding: '4px 10px',
            borderRadius: '999px',
            border: '1px solid #E9D5FF',
          }}
        >
          {filteredInsights.length} recorded patterns
        </span>
      </div>

      {/* Step 7 Guardrail: Chronological Association vs. Biological Causality */}
      <div
        style={{
          background: 'rgba(248, 250, 252, 0.95)',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '10px 14px',
          fontSize: '12px',
          color: '#475569',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          lineHeight: 1.45,
        }}
      >
        <Info size={16} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: '#0F172A' }}>Observational Timeline Associations:</strong> Timing patterns show foods eaten before symptoms occurred. They indicate possible triggers to explore with your clinician, not definitive proof of causality. Stress, sleep, hydration, and medications also influence digestive comfort.
        </div>
      </div>

      {/* 2. Search Bar (Matching media_1788703634311.png) */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Search
          size={18}
          color="#94A3B8"
          style={{
            position: 'absolute',
            left: '14px',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          aria-label="Search food and symptom insights"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '12px 16px 12px 42px',
            borderRadius: '16px',
            border: '1.5px solid #E2E8F0',
            background: '#F8FAFC',
            fontSize: '14.5px',
            outline: 'none',
            color: '#0F172A',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.02)',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#A855F7')}
          onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '12px',
              background: '#E2E8F0',
              border: 'none',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* 3. Category Filter Pills */}
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '2px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                triggerHapticLight();
                setSelectedCategory(cat);
              }}
              style={{
                flexShrink: 0,
                padding: '7px 14px',
                borderRadius: '999px',
                border: isSelected ? '1.5px solid #A855F7' : '1px solid #E2E8F0',
                background: isSelected ? '#FAF5FF' : '#FFFFFF',
                color: isSelected ? '#7E22CE' : '#64748B',
                fontWeight: isSelected ? 800 : 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 4. Insight Cards List (Matching media_1788703634311.png) */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '12px 10px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {filteredInsights.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94A3B8' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#475569' }}>
              {dynamicInsights.length === 0 ? 'No repeated patterns yet' : 'No patterns match this filter'}
            </div>
            <p style={{ fontSize: '12.5px', margin: '4px 0 0 0' }}>
              {dynamicInsights.length === 0 ? 'Log a food on at least two dated days before HealthChain compares it with symptom entries.' : 'Try a different search or choose “All”.'}
            </p>
          </div>
        ) : (
          filteredInsights.map((item) => {
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                style={{
                  borderBottom: '1px solid #F1F5F9',
                  padding: '12px 8px',
                }}
              >
                {/* Main Card Row */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    triggerHapticSelection();
                    setExpandedId(isExpanded ? null : item.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {/* Purple Rounded Square Icon Badge (Exact match to media_1788703634311.png) */}
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 12px rgba(147, 51, 234, 0.28)',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {item.iconType === 'flame' && <Flame size={22} fill="currentColor" />}
                    {item.iconType === 'wind' && <Wind size={22} />}
                    {item.iconType === 'brain' && <Brain size={22} />}
                    {item.iconType === 'bowel' && <Activity size={22} />}
                  </div>

                  {/* Text Content Block (Exact match to media_1788703634311.png) */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#1E293B',
                        lineHeight: 1.35,
                        marginBottom: '6px',
                      }}
                    >
                      {item.hasComparativeIncrease === true
                        ? `${item.symptomName} was recorded more often on logged days with `
                        : typeof item.hasComparativeIncrease === 'boolean'
                          ? `${item.symptomName} was not recorded more often on logged days with `
                          : `${item.symptomName} was recorded on ${item.matchingDays} of ${item.totalDays} logged days with `}
                      <strong style={{ color: '#0F172A', fontWeight: 800 }}>{item.foodName}</strong>
                      {typeof item.hasComparativeIncrease === 'boolean' ? '.' : '; more comparison days are needed.'}
                    </div>

                    {/* Day Match Ratio Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {item.isUserVerified ? (
                        <>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#64748B',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <span>📊</span> {item.matchingDays}/{item.totalDays} day match ({item.correlationPercent}%)
                          </span>
                          {typeof item.nonExposurePercent === 'number' && (
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                              compared with {item.nonExposureMatchingDays}/{item.nonExposureTotalDays} other logged days ({item.nonExposurePercent}%)
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              color: '#059669',
                              background: '#ECFDF5',
                              padding: '1px 7px',
                              borderRadius: '999px',
                              border: '1px solid #A7F3D0',
                            }}
                          >
                            ✓ From Your Diary
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#64748B',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <span>🔬</span> Reference Clinical Pattern
                          </span>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              color: '#7E22CE',
                              background: '#F3E8FF',
                              padding: '1px 7px',
                              borderRadius: '999px',
                            }}
                          >
                            Evidence Benchmark
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Chevron Indicator */}
                  <div
                    style={{
                      color: isExpanded ? '#9333EA' : '#CBD5E1',
                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s',
                      marginTop: '10px',
                    }}
                  >
                    <ChevronRight size={18} />
                  </div>
                </div>

                {/* Expanded Drilldown */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        marginTop: '14px',
                        paddingTop: '12px',
                        borderTop: '1px dashed #E2E8F0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Clinical Culprit Badge & Incubation Latency */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <div
                          style={{
                            fontSize: '11.5px',
                            background: '#FEF2F2',
                            color: '#991B1B',
                            border: '1px solid #FCA5A5',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <ShieldAlert size={12} />
                          <span>{item.hasReferenceExplanation ? `Food component: ${item.clinicalCompound}` : 'Pattern: recorded food and symptom dates'}</span>
                        </div>
                        <div
                          style={{
                            fontSize: '11.5px',
                            background: '#F8FAFC',
                            color: '#475569',
                            border: '1px solid #E2E8F0',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={12} />
                          <span>{item.hasReferenceExplanation ? 'Reference window' : 'Timing'}: {item.incubationWindow}</span>
                        </div>
                      </div>

                      {/* Educational explanation, never presented as a personal mechanism */}
                      {item.hasReferenceExplanation && <div
                        style={{
                          fontSize: '12.5px',
                          color: '#334155',
                          lineHeight: 1.45,
                          background: '#F8FAFC',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <strong style={{ color: '#0F172A', display: 'block', marginBottom: '2px' }}>
                          Possible explanation to discuss:
                        </strong>
                        {item.biochemicalMechanism}
                      </div>}

                      {/* Optional food substitution */}
                      {item.hasReferenceExplanation && <div
                        style={{
                          fontSize: '12px',
                          color: '#065F46',
                          background: '#ECFDF5',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: '1px solid #A7F3D0',
                          lineHeight: 1.4,
                        }}
                      >
                        <strong style={{ color: '#047857', display: 'block', marginBottom: '2px' }}>
                          🌱 Optional substitute idea:
                        </strong>
                        Replace with <strong>{item.safeSwap.swapTo}</strong>.
                        <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>
                          {item.safeSwap.culinaryNote}
                        </div>
                      </div>}

                      {/* Action Buttons Row */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleOpenRecord}
                          style={{
                            flex: 1,
                            minWidth: '160px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '9px 14px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #9B675B 0%, #805348 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 3px 10px rgba(122, 78, 63, 0.2)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <ShieldAlert size={14} />
                          <span>Review observation record</span>
                        </button>

                        {onOpenHeatmap && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHapticLight();
                              onOpenHeatmap();
                            }}
                            style={{
                              padding: '9px 12px',
                              borderRadius: '12px',
                              background: '#F8FAFC',
                              color: '#334155',
                              border: '1px solid #CBD5E1',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <Calendar size={13} />
                            <span>View Calendar</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
