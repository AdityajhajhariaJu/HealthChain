import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, CheckCircle2, ChevronRight, Zap, Target, RefreshCw } from 'lucide-react';
import { getEmpiricalFrequencyMatches, EmpiricalMatchInsight } from '../../services/TriggerEngine';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';

interface EmpiricalMatchInsightsProps {
  onSelectAction?: (actionText: string) => void;
  onSelectSwap?: (swapText: string) => void;
}

export const EmpiricalMatchInsights: React.FC<EmpiricalMatchInsightsProps> = ({
  onSelectAction,
  onSelectSwap,
}) => {
  const [insights, setInsights] = useState<EmpiricalMatchInsight[]>(getEmpiricalFrequencyMatches());
  const [expandedId, setExpandedId] = useState<string | null>(insights[0]?.id || null);

  React.useEffect(() => {
    const handleUpdate = () => {
      setInsights(getEmpiricalFrequencyMatches());
    };
    window.addEventListener('hc_trigger_recorded', handleUpdate);
    window.addEventListener('hc_profile_updated', handleUpdate);
    return () => {
      window.removeEventListener('hc_trigger_recorded', handleUpdate);
      window.removeEventListener('hc_profile_updated', handleUpdate);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 50%, #F0FDFA 100%)',
          borderRadius: '20px',
          padding: '16px 18px',
          border: '1.5px solid #99F6E4',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(13, 148, 136, 0.08)',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(13, 148, 136, 0.28)',
            flexShrink: 0,
          }}
        >
          <Target size={20} />
        </div>
        <div>
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            EMPIRICAL FREQUENCY CORRELATION
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', lineHeight: 1.2 }}>
            Smart Insights & Recurrence Matches
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Mathematical ratio of days where specific foods precipitated symptom flares.
          </div>
        </div>
      </div>

      {/* Insight Cards Stream */}
      {insights.length === 0 ? (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '28px 20px',
            border: '1.5px dashed #CBD5E1',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>
            No Recurring Triggers Identified Yet
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', maxWidth: '380px', lineHeight: 1.4 }}>
            Log your meals and postprandial reactions to detect mathematical trigger correlations and personalized swaps.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {insights.map((item) => {
          const isExpanded = expandedId === item.id;
          const isHighMatch = item.correlationPercent >= 80;

          return (
            <div
              key={item.id}
              onClick={() => {
                triggerHapticSelection();
                setExpandedId(isExpanded ? null : item.id);
              }}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '16px 18px',
                border: isHighMatch ? '1.5px solid #FCA5A5' : '1.5px solid #F1F5F9',
                boxShadow: isHighMatch
                  ? '0 4px 16px rgba(239, 68, 68, 0.08)'
                  : '0 2px 8px rgba(0,0,0,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Top Row: Food & Empirical Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      fontSize: '22px',
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    {item.foodIcon}
                  </div>
                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#1E293B' }}>
                      {item.foodName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                      {item.category} • Latency: {item.latencyWindow}
                    </div>
                  </div>
                </div>

                {/* Empirical Frequency Match Badge */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: isHighMatch ? '#FEF2F2' : '#FFFBEB',
                      color: isHighMatch ? '#DC2626' : '#D97706',
                      border: isHighMatch ? '1px solid #FECDD3' : '1px solid #FDE68A',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.matchRatioText}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: isHighMatch ? '#E11D48' : '#B45309' }}>
                    {item.correlationPercent}% correlation
                  </span>
                </div>
              </div>

              {/* Symptom Association Banner */}
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  background: '#F8FAFC',
                  border: '1px solid #F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '14px' }}>{item.symptomIcon}</span>
                <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 700 }}>
                  Precipitates: <strong style={{ color: '#0F172A' }}>{item.symptomName}</strong>
                </span>
              </div>

              {/* Expanded Mechanism & Actionable Swaps */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      overflow: 'hidden',
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #F1F5F9',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {/* Pathophysiology */}
                    <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                      <strong style={{ color: '#1E293B' }}>Clinical Mechanism: </strong>
                      {item.pathophysiologicalMechanism}
                    </div>

                    {/* Targeted Swap */}
                    <div
                      style={{
                        background: '#F0FDF4',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        border: '1px solid #BBF7D0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.35 }}>
                        <strong>Safe Clinical Swap: </strong> {item.targetedSwap}
                      </div>
                      {onSelectSwap && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHapticLight();
                            onSelectSwap(item.targetedSwap);
                          }}
                          style={{
                            background: '#15803D',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          Use Swap
                        </button>
                      )}
                    </div>

                    {/* Recommended Trial Action */}
                    <div
                      style={{
                        background: '#EFF6FF',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        border: '1px solid #BFDBFE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#1E40AF', lineHeight: 1.35 }}>
                        <strong>Protocol: </strong> {item.recommendedAction}
                      </div>
                      {onSelectAction && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHapticLight();
                            onSelectAction(item.recommendedAction);
                          }}
                          style={{
                            background: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          Start Hunt →
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};
export default EmpiricalMatchInsights;
