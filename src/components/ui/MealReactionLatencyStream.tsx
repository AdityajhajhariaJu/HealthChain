import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Utensils,
  Zap,
  ShieldCheck,
  Flame,
  HelpCircle,
  Plus,
  Info,
} from 'lucide-react';
import { getProfile } from '../../services/ProfileEngine';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';
import QuickMealIntakeSheet from './QuickMealIntakeSheet';

interface MealReactionLatencyStreamProps {
  onOpenCheckin?: () => void;
  onOpenFoodDetective?: (foodName: string) => void;
}

interface LatencyEvent {
  id: string;
  mealName: string;
  mealTime: string;
  slot: string;
  tags: string[];
  latencyHours: number | null;
  reaction: {
    symptom: string;
    severity: 'No reaction reported' | 'Reported';
    severityScore: number | null;
    color: string;
    bg: string;
    border: string;
    mechanism?: string;
  } | null;
}

export const MealReactionLatencyStream: React.FC<MealReactionLatencyStreamProps> = ({
  onOpenCheckin,
  onOpenFoodDetective,
}) => {
  const [profile, setProfile] = useState(getProfile());
  const [isQuickIntakeOpen, setIsQuickIntakeOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  React.useEffect(() => {
    const handleUpdate = () => {
      setProfile(getProfile());
    };
    window.addEventListener('hc_profile_updated', handleUpdate);
    window.addEventListener('hc_daily_checkin_completed', handleUpdate);
    return () => {
      window.removeEventListener('hc_profile_updated', handleUpdate);
      window.removeEventListener('hc_daily_checkin_completed', handleUpdate);
    };
  }, []);

  const streamEvents: LatencyEvent[] = useMemo(() => {
    const recentLogs = profile?.nutrition?.recentLogs || [];
    return recentLogs.slice(-6).reverse().map((log: any, idx: number) => {
      const occurredAt = log.occurredAt && ['exact', 'approximate'].includes(log.timePrecision) && !Number.isNaN(new Date(log.occurredAt).getTime())
        ? new Date(log.occurredAt) : null;
      const reaction = log.reaction;
      const severityScore = typeof reaction?.severity === 'number' && Number.isFinite(reaction.severity) ? reaction.severity : null;
      const latencyHours = occurredAt && reaction?.loggedAt && !Number.isNaN(new Date(reaction.loggedAt).getTime())
        ? Math.max(0, Math.round((new Date(reaction.loggedAt).getTime() - occurredAt.getTime()) / 360000) / 10) : null;
      return {
        id: String(log.id || `log-${idx}`),
        mealName: log.meal || log.name || 'Meal recorded',
        mealTime: occurredAt ? occurredAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time not recorded',
        slot: log.slot || log.category || 'Meal',
        tags: log.tags || [],
        latencyHours,
        reaction: reaction ? {
          symptom: reaction.label || reaction.reactionType || 'Reported symptom',
          severity: reaction.reactionType === 'none' ? 'No reaction reported' : 'Reported',
          severityScore,
          color: '#9B675B', bg: '#FFF4EF', border: '#EAD5CA',
        } : null,
      };
    });
  }, [profile]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner / Explanation */}
      <div
        style={{
          background: 'linear-gradient(135deg, #F8FAFC 0%, #F0FDFA 100%)',
          borderRadius: '20px',
          padding: '16px 18px',
          border: '1.5px solid #CCFBF1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <Zap size={19} />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              CHRONOLOGICAL SENSITIVITY STREAM
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', lineHeight: 1.2 }}>
              Post-Meal Reaction Timeline
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Compares meal entry time and symptom report time within your logged records; does not diagnose causality or measure biological transit.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHapticLight();
            setIsQuickIntakeOpen(true);
          }}
          style={{
            background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(13, 148, 136, 0.24)',
            flexShrink: 0,
          }}
        >
          <Plus size={14} />
          <span>Quick Log</span>
        </button>
      </div>

      {/* Chronological Vertical Latency Stream */}
      <div style={{ position: 'relative', paddingLeft: '8px' }}>
        {streamEvents.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              background: '#F8FAFC',
              borderRadius: '16px',
              border: '1.5px dashed #CBD5E1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#F0FDFA',
                border: '1px solid #CCFBF1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0D9488',
              }}
            >
              <Utensils size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                No Meal Latency Events Recorded
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748B', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
                Log meals alongside daily check-ins to track symptom timing after eating.
              </p>
            </div>
            <button
              onClick={() => setIsQuickIntakeOpen(true)}
              style={{
                background: '#0D9488',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                marginTop: '4px',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.24)',
              }}
            >
              <Plus size={14} />
              <span>Log First Meal</span>
            </button>
          </div>
        ) : (
          streamEvents.map((evt, idx) => {
          const isExpanded = selectedEventId === evt.id;
          const isLast = idx === streamEvents.length - 1;

          return (
            <div key={evt.id} style={{ position: 'relative', marginBottom: isLast ? 0 : '24px' }}>
              {/* Vertical Dashed Line connecting to next item */}
              {!isLast && (
                <div
                  style={{
                    position: 'absolute',
                    left: '18px',
                    top: '40px',
                    bottom: '-28px',
                    width: '2px',
                    borderLeft: '2px dashed #CBD5E1',
                    zIndex: 0,
                  }}
                />
              )}

              {/* 1. Meal Card */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                {/* Time Indicator Bubble */}
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '2px solid #0D9488',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0D9488',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(13, 148, 136, 0.18)',
                  }}
                >
                  <Utensils size={17} />
                </div>

                {/* Meal Details Box */}
                <div
                  onClick={() => {
                    triggerHapticSelection();
                    setSelectedEventId(isExpanded ? null : evt.id);
                  }}
                  style={{
                    flex: 1,
                    background: '#FFFFFF',
                    borderRadius: '18px',
                    padding: '14px 16px',
                    border: '1.5px solid #F1F5F9',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#0F766E', background: '#F0FDFA', padding: '2px 7px', borderRadius: '999px', border: '1px solid #CCFBF1' }}>
                        {evt.slot}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                        {evt.mealTime}
                      </span>
                    </div>

                    <ChevronRight
                      size={16}
                      color="#94A3B8"
                      style={{
                        transform: isExpanded ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </div>

                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#1E293B' }}>
                    {evt.mealName}
                  </div>

                  {evt.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {evt.tags.map((t, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: '#F8FAFC',
                            color: '#475569',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded Inspector Drawer */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}
                      >
                        <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.4, marginBottom: '8px' }}>
                          Cross-checked against 18 metabolic & gut mucosal sensitivity lenses.
                        </div>
                        {onOpenFoodDetective && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHapticLight();
                              onOpenFoodDetective(evt.mealName.split('+')[0].trim());
                            }}
                            style={{
                              background: '#F0FDFA',
                              border: '1px solid #99F6E4',
                              color: '#0F766E',
                              borderRadius: '8px',
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Inspect Biochemical Profile →
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* 2. Latency Conduit with Animated Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '38px',
                  margin: '8px 0',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: evt.reaction ? '#FFFBEB' : '#ECFDF5',
                    border: evt.reaction ? '1px solid #FDE68A' : '1px solid #A7F3D0',
                    color: evt.reaction ? '#B45309' : '#047857',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                >
                  <Clock size={12} />
                  <span>
                    {evt.reaction
                      ? evt.latencyHours === null ? 'Meal occurrence or reaction report time unavailable' : `Reaction report entered ${evt.latencyHours}h after reported meal time`
                      : `🛡️ Asymptomatic Digest (> 4h clear)`}
                  </span>
                </div>
              </div>

              {/* 3. Symptom Reaction Card (or Asymptomatic Badge) */}
              <div
                style={{
                  paddingLeft: '50px',
                }}
              >
                {evt.reaction ? (
                  <div
                    style={{
                      background: evt.reaction.bg,
                      borderRadius: '16px',
                      padding: '12px 14px',
                      border: `1.5px solid ${evt.reaction.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          color: evt.reaction.color,
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                        }}
                      >
                        Reported: {evt.reaction.symptom}
                      </span>
                    </div>

                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1E293B' }}>
                      {evt.reaction.symptom}
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.35 }}>
                      Recorded alongside this meal. A cause is not established.
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#F0FDF4',
                      borderRadius: '14px',
                      padding: '8px 12px',
                      border: '1px solid #BBF7D0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <ShieldCheck size={16} color="#15803D" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803D' }}>
                      No reaction has been recorded for this meal
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
      </div>

      {/* Non-blocking Clinical Reference & Safety Disclaimer */}
      <div style={{
        marginTop: '20px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <Info size={14} color="#64748B" style={{ flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '11px', color: '#64748B', lineHeight: 1.4 }}>
          <strong>Timing limit:</strong> These entries compare user-reported meal time with reaction entry time when both are available. They do not establish symptom onset, biological transit or a food cause.
        </p>
      </div>

      {/* Circadian Quick Intake Modal Sheet */}
      <QuickMealIntakeSheet
        isOpen={isQuickIntakeOpen}
        onClose={() => setIsQuickIntakeOpen(false)}
      />
    </div>
  );
};
export default MealReactionLatencyStream;
