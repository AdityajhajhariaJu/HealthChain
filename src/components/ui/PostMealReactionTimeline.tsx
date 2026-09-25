import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Clock, Sparkles, Plus } from 'lucide-react';
import { getProfile, updateNutritionLogReaction } from '../../services/ProfileEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { QuickMealIntakeSheet } from './QuickMealIntakeSheet';

export interface PostMealReaction {
  reactionType: 'none' | 'bloat' | 'heartburn' | 'palpitations' | 'brain_fog' | 'stomach_upset';
  system: 'stomach' | 'bloating' | 'vitals' | 'neuro';
  severity: 0 | 1 | 2 | 3 | null;
  label: string;
  sublabel?: string;
  emoji: string;
  incubationHours: number | null;
  loggedAt: string;
}

export interface PostMealTimelineItem {
  id: string;
  time: string;
  timestamp: number | null;
  mealName: string;
  slot: 'morning' | 'noon' | 'evening' | 'night' | 'unknown';
  slotLabel: string;
  slotEmoji: string;
  incubationHours: number | null;
  reaction?: PostMealReaction;
  tags?: string[];
}


const REACTION_OPTIONS: Array<{
  type: PostMealReaction['reactionType'];
  system: PostMealReaction['system'];
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
    label: 'Bloating',
    sublabel: 'Distension',
    emoji: '💨',
    bg: '#FEF3C7',
    border: '#FDE68A',
    text: '#92400E',
  },
  {
    type: 'heartburn',
    system: 'stomach',
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
    label: 'Palpitations',
    sublabel: 'Reported sensation',
    emoji: '💓',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    text: '#5B21B6',
  },
  {
    type: 'brain_fog',
    system: 'neuro',
    label: 'Brain fog',
    sublabel: 'Reported sensation',
    emoji: '🌫️',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    text: '#075985',
  },
  {
    type: 'stomach_upset',
    system: 'stomach',
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
  const [reactionIntensity, setReactionIntensity] = useState<1 | 2 | 3 | null>(null);
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
      return [];
    }

    const todayKey = new Date().toLocaleDateString('en-CA');
    return recentLogs.filter((log: any) => {
      const date = log.loggedAt ? new Date(log.loggedAt).toLocaleDateString('en-CA') : String(log.date || '').slice(0, 10);
      return date === todayKey;
    }).slice(-6).reverse().map((log: any, idx: number) => {
      const logDate = log.loggedAt && !Number.isNaN(new Date(log.loggedAt).getTime()) ? new Date(log.loggedAt) : null;
      const hours = logDate?.getHours() ?? null;
      const minutes = logDate ? String(logDate.getMinutes()).padStart(2, '0') : '';
      const ampm = hours !== null && hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours === null ? null : hours % 12 || 12;
      const timeStr = formattedHours === null ? 'Time not recorded' : `${formattedHours}:${minutes} ${ampm}`;

      let slot: PostMealTimelineItem['slot'] = 'unknown';
      let slotLabel = 'Time unknown';
      let slotEmoji = '○';

      if (hours !== null && hours < 12) {
        slot = 'morning';
        slotLabel = 'Morning';
        slotEmoji = '🌅';
      } else if (hours !== null && hours < 17) {
        slot = 'noon';
        slotLabel = 'Noon';
        slotEmoji = '☀️';
      } else if (hours !== null && hours < 21) {
        slot = 'evening';
        slotLabel = 'Evening';
        slotEmoji = '🌆';
      } else if (hours !== null) {
        slot = 'night';
        slotLabel = 'Night';
        slotEmoji = '🌙';
      }

      return {
        id: log.id || `log_${idx}`,
        time: log.time || timeStr,
        timestamp: logDate?.getTime() ?? null,
        mealName: log.meal || log.name || 'Meal recorded',
        slot,
        slotLabel,
        slotEmoji,
        incubationHours: log.reaction?.incubationHours ?? null,
        reaction: log.reaction,
        tags: log.tags || [],
      };
    });
  }, [profileVersion]);


  const handleSelectReaction = (item: PostMealTimelineItem, reactionOption: typeof REACTION_OPTIONS[0]) => {
    const reactionPayload: PostMealReaction = {
      reactionType: reactionOption.type,
      system: reactionOption.system,
      severity: reactionOption.type === 'none' ? 0 : reactionIntensity,
      label: reactionOption.label,
      sublabel: reactionOption.sublabel,
      emoji: reactionOption.emoji,
      incubationHours: item.timestamp === null ? null : Math.max(0, Math.round((Date.now() - item.timestamp) / 360000) / 10),
      loggedAt: new Date().toISOString(),
    };

    const saved = updateNutritionLogReaction(item.id, reactionPayload);
    if (!saved.success) {
      setToastMessage('Could not save this reaction. Please try again.');
      return;
    }
    triggerHapticSuccess();
    setToastMessage(`Recorded: ${reactionOption.label}`);
    setTimeout(() => setToastMessage(null), 2800);
    setSelectedMealForReaction(null);
    setReactionIntensity(null);
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
          Post-meal digestive & autonomic reaction timeline.
        </p>
        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px', background: 'rgba(248, 250, 252, 0.9)', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>💡</span>
          <span><strong>Clinical Note:</strong> Post-meal reaction timelines track chronological patterns to discuss with your doctor, not definitive biological proof of food causation.</span>
        </div>
      </div>

      {timelineItems.length === 0 ? (
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
            borderRadius: '24px',
            border: '1.5px dashed #CBD5E1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            🍽️
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
              No Meals Logged Today
            </div>
            <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', maxWidth: '320px', lineHeight: 1.4 }}>
              Log meals to track post-meal digestive and autonomic reactions.
            </div>
          </div>
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
              marginTop: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.25)',
              border: 'none',
            }}
          >
            <Plus size={15} />
            <span>Log Your First Meal</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {timelineItems.map((item) => {
          const isSelected = selectedMealForReaction === item.id;
          const latencyPillColor =
            item.reaction?.reactionType === 'none'
              ? { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' }
              : item.reaction
              ? { bg: '#FFF4EF', text: '#9B675B', border: '#EAD5CA' }
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
                  {item.incubationHours === null ? 'Timing not recorded' : `${item.incubationHours.toFixed(1)}h elapsed to report`}
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
                        item.reaction.reactionType === 'none'
                          ? '#ECFDF5'
                          : '#FFF4EF',
                      borderRadius: '16px',
                      padding: '12px 14px',
                      border: `1px solid ${
                        item.reaction.reactionType === 'none'
                          ? '#A7F3D0'
                          : '#EAD5CA'
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
                      background: isSelected ? 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%)' : '#FFFFFF',
                      borderRadius: '16px',
                      padding: '12px 14px',
                      border: isSelected ? '1.5px solid #0D9488' : '1.5px dashed #CBD5E1',
                      minHeight: '82px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      textAlign: 'center',
                      gap: '5px',
                      boxShadow: isSelected ? '0 4px 12px rgba(13, 148, 136, 0.12)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isSelected ? '#CCFBF1' : '#F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? '#0D9488' : '#94A3B8'
                    }}>
                      <Clock size={14} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isSelected ? '#0F766E' : '#64748B' }}>
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
                      What did you notice after {item.mealName}? You can report this later if timing is uncertain.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10, color: '#604D45', fontSize: 12 }}>
                      <span>Intensity (optional):</span>
                      {([['mild', 1], ['moderate', 2], ['strong', 3]] as const).map(([label, value]) => <button key={value} type="button" aria-pressed={reactionIntensity === value} onClick={() => setReactionIntensity(reactionIntensity === value ? null : value)} style={{ borderRadius: 9, padding: '5px 9px', border: '1px solid #EAD5CA', background: reactionIntensity === value ? '#F7DED4' : '#FFFDFC', color: '#604D45', cursor: 'pointer' }}>{label}</button>)}
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
    )}

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
