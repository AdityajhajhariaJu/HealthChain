import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Clock, Sparkles, Plus } from 'lucide-react';
import { getProfile, updateNutritionLogReaction } from '../../services/ProfileEngine';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { QuickMealIntakeSheet } from './QuickMealIntakeSheet';

export interface PostMealReaction {
  reactionType: 'none' | 'bloat' | 'heartburn' | 'palpitations' | 'brain_fog' | 'stomach_upset';
  system: 'stomach' | 'bloating' | 'vitals' | 'neuro';
  severity: 0 | 1 | 2 | 3;
  label: string;
  sublabel?: string;
  emoji: string;
  incubationHours: number;
  loggedAt: string;
}

export interface PostMealTimelineItem {
  id: string;
  time: string;
  timestamp: number;
  mealName: string;
  slot: 'morning' | 'noon' | 'evening' | 'night';
  slotLabel: string;
  slotEmoji: string;
  incubationHours: number;
  reaction?: PostMealReaction;
  tags?: string[];
}

const DEFAULT_TIMELINE_ITEMS: PostMealTimelineItem[] = [
  {
    id: 'demo_1',
    time: '9:30 AM',
    timestamp: Date.now() - 5.5 * 3600 * 1000,
    mealName: 'Pancakes with maple syrup',
    slot: 'morning',
    slotLabel: 'Morning',
    slotEmoji: '🌅',
    incubationHours: 2.0,
    reaction: {
      reactionType: 'stomach_upset',
      system: 'stomach',
      severity: 1,
      label: 'Mild discomfort',
      emoji: '😐',
      incubationHours: 2.0,
      loggedAt: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
    },
    tags: ['High Glycemic', 'Fructose'],
  },
  {
    id: 'demo_2',
    time: '2:30 PM',
    timestamp: Date.now() - 3.0 * 3600 * 1000,
    mealName: 'Yogurt with granola and fruit',
    slot: 'noon',
    slotLabel: 'Noon',
    slotEmoji: '☀️',
    incubationHours: 1.5,
    reaction: {
      reactionType: 'none',
      system: 'bloating',
      severity: 0,
      label: 'No bloating',
      emoji: '🙂',
      incubationHours: 1.5,
      loggedAt: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
    },
    tags: ['Probiotic', 'Lactose'],
  },
  {
    id: 'demo_3',
    time: '8:00 PM',
    timestamp: Date.now() - 1.2 * 3600 * 1000,
    mealName: 'Fried chicken with mashed potatoes',
    slot: 'evening',
    slotLabel: 'Evening',
    slotEmoji: '🌆',
    incubationHours: 2.0,
    reaction: {
      reactionType: 'stomach_upset',
      system: 'stomach',
      severity: 2,
      label: 'Stomach upset',
      sublabel: 'burning',
      emoji: '😖',
      incubationHours: 2.0,
      loggedAt: new Date(Date.now() - 0.2 * 3600 * 1000).toISOString(),
    },
    tags: ['Deep Fried', 'Histamine Rich'],
  },
];

const REACTION_OPTIONS: Array<{
  type: PostMealReaction['reactionType'];
  system: PostMealReaction['system'];
  severity: 0 | 1 | 2 | 3;
  label: string;
  sublabel?: string;
  emoji: string;
  bg: string;
  border: string;
  text: string;
}> = [
  {
    type: 'none',
    system: 'bloating',
    severity: 0,
    label: 'No reaction',
    sublabel: 'Comfortable',
    emoji: '🙂',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    text: '#065F46',
  },
  {
    type: 'bloat',
    system: 'bloating',
    severity: 1,
    label: 'Mild bloat',
    sublabel: 'Distension',
    emoji: '💨',
    bg: '#FEF3C7',
    border: '#FDE68A',
    text: '#92400E',
  },
  {
    type: 'heartburn',
    system: 'stomach',
    severity: 2,
    label: 'Heartburn / Acid',
    sublabel: 'Burning',
    emoji: '🔥',
    bg: '#FFF1F2',
    border: '#FECDD3',
    text: '#9F1239',
  },
  {
    type: 'palpitations',
    system: 'vitals',
    severity: 2,
    label: 'Palpitations',
    sublabel: 'Roemheld reflex',
    emoji: '💓',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    text: '#5B21B6',
  },
  {
    type: 'brain_fog',
    system: 'neuro',
    severity: 1,
    label: 'Brain fog',
    sublabel: 'Histamine lag',
    emoji: '🌫️',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    text: '#075985',
  },
  {
    type: 'stomach_upset',
    system: 'stomach',
    severity: 2,
    label: 'Stomach upset',
    sublabel: 'Cramping',
    emoji: '⚡',
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#B45309',
  },
];

interface PostMealReactionTimelineProps {
  onOpenQuickMeal?: () => void;
  className?: string;
}

export const PostMealReactionTimeline: React.FC<PostMealReactionTimelineProps> = ({
  onOpenQuickMeal,
  className = '',
}) => {
  const [profileVersion, setProfileVersion] = useState(0);
  const [selectedMealForReaction, setSelectedMealForReaction] = useState<string | null>(null);
  const [isQuickMealSheetOpen, setIsQuickMealSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleProfileUpdate = () => setProfileVersion((v) => v + 1);
    window.addEventListener('hc_profile_updated', handleProfileUpdate);
    window.addEventListener('hc_nutrition_reaction_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('hc_profile_updated', handleProfileUpdate);
      window.removeEventListener('hc_nutrition_reaction_updated', handleProfileUpdate);
    };
  }, []);

  const formattedDate = useMemo(() => {
    const d = new Date();
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const monthDayYear = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return { weekday, monthDayYear };
  }, []);

  const timelineItems = useMemo<PostMealTimelineItem[]>(() => {
    const profile = getProfile();
    const recentLogs: any[] = profile?.nutrition?.recentLogs || [];

    if (recentLogs.length === 0) {
      return DEFAULT_TIMELINE_ITEMS;
    }

    return recentLogs.slice(-6).reverse().map((log: any, idx: number) => {
      const logDate = log.loggedAt ? new Date(log.loggedAt) : new Date();
      const hours = logDate.getHours();
      const minutes = String(logDate.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const timeStr = `${formattedHours}:${minutes} ${ampm}`;

      let slot: 'morning' | 'noon' | 'evening' | 'night' = 'noon';
      let slotLabel = 'Noon';
      let slotEmoji = '☀️';

      if (hours < 12) {
        slot = 'morning';
        slotLabel = 'Morning';
        slotEmoji = '🌅';
      } else if (hours < 17) {
        slot = 'noon';
        slotLabel = 'Noon';
        slotEmoji = '☀️';
      } else if (hours < 21) {
        slot = 'evening';
        slotLabel = 'Evening';
        slotEmoji = '🌆';
      } else {
        slot = 'night';
        slotLabel = 'Night';
        slotEmoji = '🌙';
      }

      return {
        id: log.id || `log_${idx}`,
        time: log.time || timeStr,
        timestamp: logDate.getTime(),
        mealName: log.meal || log.name || 'Balanced Meal',
        slot,
        slotLabel,
        slotEmoji,
        incubationHours: log.reaction?.incubationHours || 1.5,
        reaction: log.reaction,
        tags: log.tags || [],
      };
    });
  }, [profileVersion]);

  const activeIncubationMeal = useMemo(() => {
    const now = Date.now();
    return timelineItems.find((item) => {
      const elapsedHours = (now - item.timestamp) / (1000 * 3600);
      return elapsedHours >= 1.0 && elapsedHours <= 3.5 && !item.reaction;
    });
  }, [timelineItems]);

  const handleSelectReaction = (item: PostMealTimelineItem, reactionOption: typeof REACTION_OPTIONS[0]) => {
    triggerHapticSuccess();
    const reactionPayload: PostMealReaction = {
      reactionType: reactionOption.type,
      system: reactionOption.system,
      severity: reactionOption.severity,
      label: reactionOption.label,
      sublabel: reactionOption.sublabel,
      emoji: reactionOption.emoji,
      incubationHours: item.incubationHours,
      loggedAt: new Date().toISOString(),
    };

    updateNutritionLogReaction(item.id, reactionPayload);
    awardPoints(10, `Recorded Post-Meal Sensitivity: ${reactionOption.label}`, 'lifestyle');

    setToastMessage(`✓ Recorded: ${reactionOption.emoji} ${reactionOption.label} (+10 VP)`);
    setTimeout(() => setToastMessage(null), 2800);
    setSelectedMealForReaction(null);
  };

  return (
    <div
      className={className}
      style={{
        width: '100%',
        maxWidth: '680px',
        margin: '0 auto',
        background: '#FFFFFF',
        borderRadius: '28px',
        border: '1.5px solid #E2E8F0',
        boxShadow: '0 12px 36px rgba(15, 23, 42, 0.06)',
        padding: '24px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 30,
              background: '#0D9488',
              color: '#FFFFFF',
              padding: '8px 18px',
              borderRadius: '999px',
              fontSize: '12.5px',
              fontWeight: 700,
              boxShadow: '0 8px 24px rgba(13, 148, 136, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              pointerEvents: 'none',
            }}
          >
            <Sparkles size={14} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: '#94A3B8', textTransform: 'uppercase' }}>
          {formattedDate.weekday}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
            {formattedDate.monthDayYear}
          </h2>
          <button
            type="button"
            onClick={() => {
              triggerHapticLight();
              if (onOpenQuickMeal) {
                onOpenQuickMeal();
              } else {
                setIsQuickMealSheetOpen(true);
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #ECFDF5 0%, #CCFBF1 100%)',
              border: '1px solid #5EEAD4',
              color: '#0F766E',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(13, 148, 136, 0.12)',
            }}
          >
            <Plus size={14} />
            <span>Log Meal</span>
          </button>
        </div>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0', lineHeight: 1.4 }}>
          Discover post-meal digestive and autonomic sensitivities across the 1.5h – 2.0h incubation latency window.
        </p>
      </div>

      {activeIncubationMeal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            border: '1.5px solid #FDE68A',
            borderRadius: '18px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 4px 14px rgba(217, 119, 6, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#F59E0B',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#92400E' }}>
                Incubation Window Open ({activeIncubationMeal.time})
              </div>
              <div style={{ fontSize: '11.5px', color: '#B45309' }}>
                Ready to check in on <strong style={{ color: '#78350F' }}>{activeIncubationMeal.mealName}</strong>?
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHapticLight();
              setSelectedMealForReaction(activeIncubationMeal.id);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              background: '#D97706',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)',
            }}
          >
            Check in
          </button>
        </motion.div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {timelineItems.map((item) => {
          const isSelected = selectedMealForReaction === item.id;
          const latencyPillColor =
            item.reaction?.severity === 0
              ? { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' }
              : item.reaction?.severity === 1
              ? { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' }
              : item.reaction?.severity === 2
              ? { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' }
              : { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' };

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#FAFAFA',
                borderRadius: '20px',
                border: '1px solid #F1F5F9',
                padding: '14px 16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748B' }}>
                    {item.time}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 9px',
                      borderRadius: '999px',
                      background: '#F3E8FF',
                      color: '#7E22CE',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    <span>{item.slotEmoji}</span>
                    <span>{item.slotLabel}</span>
                  </span>
                </div>

                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: latencyPillColor.bg,
                    color: latencyPillColor.text,
                    border: `1px solid ${latencyPillColor.border}`,
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  {item.incubationHours.toFixed(1)}h later
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    background: '#F3F4F6',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    border: '1px solid #E5E7EB',
                    minHeight: '82px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', opacity: 0.75 }}>
                    <Utensils size={14} color="#64748B" />
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Logged Meal
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', lineHeight: 1.3 }}>
                    {item.mealName}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: latencyPillColor.text,
                    fontWeight: 900,
                    fontSize: '14px',
                    letterSpacing: '-1px',
                    opacity: 0.85,
                  }}
                >
                  ⇢
                </div>

                {item.reaction ? (
                  <div
                    onClick={() => {
                      triggerHapticLight();
                      setSelectedMealForReaction(isSelected ? null : item.id);
                    }}
                    title="Tap to update reaction"
                    style={{
                      background:
                        item.reaction.severity === 0
                          ? '#ECFDF5'
                          : item.reaction.severity === 1
                          ? '#FEF3C7'
                          : '#FFF1F2',
                      borderRadius: '16px',
                      padding: '12px 14px',
                      border: `1px solid ${
                        item.reaction.severity === 0
                          ? '#A7F3D0'
                          : item.reaction.severity === 1
                          ? '#FDE68A'
                          : '#FECDD3'
                      }`,
                      minHeight: '82px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px' }}>{item.reaction.emoji}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '1px 7px',
                          borderRadius: '999px',
                          background:
                            item.reaction.system === 'bloating'
                              ? '#059669'
                              : item.reaction.system === 'stomach'
                              ? '#D97706'
                              : item.reaction.system === 'vitals'
                              ? '#7C3AED'
                              : '#0284C7',
                          color: '#FFFFFF',
                        }}
                      >
                        {item.reaction.system}
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1E293B', lineHeight: 1.25 }}>
                      {item.reaction.label}
                    </div>
                    {item.reaction.sublabel && (
                      <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
                        {item.reaction.sublabel}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setSelectedMealForReaction(isSelected ? null : item.id);
                    }}
                    style={{
                      background: isSelected ? '#EFF6FF' : '#FFFFFF',
                      borderRadius: '16px',
                      padding: '12px 14px',
                      border: isSelected ? '1.5px solid #3B82F6' : '1.5px dashed #CBD5E1',
                      minHeight: '82px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      textAlign: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>🤔</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E' }}>
                      {isSelected ? 'Select reaction below' : 'Tap to log reaction'}
                    </span>
                  </button>
                )}
              </div>

              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      marginTop: '14px',
                      paddingTop: '12px',
                      borderTop: '1px solid #E2E8F0',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>
                      How did you feel 1.5 – 2h after {item.mealName}?
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '8px' }}>
                      {REACTION_OPTIONS.map((opt) => (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => handleSelectReaction(item, opt)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 10px',
                            borderRadius: '12px',
                            background: opt.bg,
                            border: `1px solid ${opt.border}`,
                            color: opt.text,
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '11px',
                            fontWeight: 700,
                            transition: 'transform 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                        >
                          <span style={{ fontSize: '14px' }}>{opt.emoji}</span>
                          <div>
                            <div>{opt.label}</div>
                            {opt.sublabel && (
                              <div style={{ fontSize: '9.5px', opacity: 0.8, fontWeight: 500 }}>{opt.sublabel}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <QuickMealIntakeSheet
        isOpen={isQuickMealSheetOpen}
        onClose={() => setIsQuickMealSheetOpen(false)}
        onMealLogged={() => {
          setIsQuickMealSheetOpen(false);
          setProfileVersion((v) => v + 1);
        }}
      />
    </div>
  );
};

export default PostMealReactionTimeline;
