import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Flame, Trophy, Sparkles, Gift, ChevronRight, Check } from 'lucide-react';
import {
  getVitalityState,
  getDailyStreak,
  awardGardenBloom,
  DailyStreakInfo,
  VitalityState,
} from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getItemSync } from '../../services/storage';
import { getHabitStorageKey } from '../../services/profileScope';

interface VitalityStreakBannerProps {
  completedHabits?: Record<string, boolean>;
  variant?: 'today' | 'garden';
  gardenTendedToday?: boolean;
}

export const VitalityStreakBanner: React.FC<VitalityStreakBannerProps> = ({
  completedHabits,
  variant = 'today',
  gardenTendedToday = false,
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [streak, setStreak] = useState<DailyStreakInfo>(() => getDailyStreak());
  const [vitality, setVitality] = useState<VitalityState>(() => getVitalityState());
  const [claimedJustNow, setClaimedJustNow] = useState(false);
  const [storedHabits, setStoredHabits] = useState<Record<string, boolean>>({});

  const loadStoredHabits = () => {
    const today = new Date().toLocaleDateString('en-CA');
    try {
      const raw = getItemSync(getHabitStorageKey(today));
      setStoredHabits(raw ? JSON.parse(raw) : {});
    } catch {
      setStoredHabits({});
    }
  };

  const refreshData = () => {
    setStreak(getDailyStreak());
    setVitality(getVitalityState());
  };

  useEffect(() => {
    refreshData();
    loadStoredHabits();
    window.addEventListener('hc_points_updated', refreshData);
    window.addEventListener('hc_profile_updated', refreshData);
    window.addEventListener('hc_daily_checkin_completed', refreshData);
    window.addEventListener('hc_garden_updated', refreshData);
    window.addEventListener('hc_hydration_updated', loadStoredHabits);
    window.addEventListener('hc_vitamins_updated', loadStoredHabits);
    window.addEventListener('storage', loadStoredHabits);
    return () => {
      window.removeEventListener('hc_points_updated', refreshData);
      window.removeEventListener('hc_profile_updated', refreshData);
      window.removeEventListener('hc_daily_checkin_completed', refreshData);
      window.removeEventListener('hc_garden_updated', refreshData);
      window.removeEventListener('hc_hydration_updated', loadStoredHabits);
      window.removeEventListener('hc_vitamins_updated', loadStoredHabits);
      window.removeEventListener('storage', loadStoredHabits);
    };
  }, []);

  useEffect(() => {
    refreshData();
  }, [completedHabits]);

  const effectiveHabits = completedHabits ?? storedHabits;
  const totalHabits = variant === 'garden' ? 3 : 2;
  const doneHabitsCount =
    ['hydration', 'vitamins'].filter((k) => effectiveHabits[k]).length +
    (variant === 'garden' && gardenTendedToday ? 1 : 0);
  const habitPercent = Math.round((doneHabitsCount / totalHabits) * 100);

  const handleClaimReward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (streak.isDailyRewardClaimedToday || (variant === 'garden' && !streak.todayCompleted)) return;

    triggerHapticSuccess();
    const success = awardGardenBloom(3);
    if (success) {
      setClaimedJustNow(true);
      refreshData();
      setTimeout(() => setClaimedJustNow(false), 4000);
    }
  };

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (habitPercent / 100) * circumference;
  const rewardLocked = streak.isDailyRewardClaimedToday || (variant === 'garden' && !streak.todayCompleted);

  return (
    <div
      style={{
        background:
          'linear-gradient(90deg, rgba(255, 245, 246, 0.94) 0%, rgba(255, 235, 238, 0.86) 50%, rgba(254, 215, 222, 0.60) 100%), url(/ava-floral-bg.jpg) center bottom / cover no-repeat',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: isMobile ? '20px' : '26px',
        border: '1.5px solid rgba(244, 63, 94, 0.28)',
        boxShadow:
          '0 12px 32px rgba(225, 29, 72, 0.08), 0 2px 8px rgba(244, 63, 94, 0.04), inset 0 2px 0 rgba(255, 255, 255, 0.98), inset 0 0 20px rgba(255, 228, 230, 0.6)',
        padding: isMobile ? '12px 14px' : '14px 20px',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Flame Radial Backlight */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          left: '-20px',
          width: '120px',
          height: '120px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Top Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
          gap: '10px',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}
      >
        {/* Left: Fire Flame & Streak Counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: isMobile ? '40px' : '44px',
              height: isMobile ? '40px' : '44px',
              minWidth: isMobile ? '40px' : '44px',
              minHeight: isMobile ? '40px' : '44px',
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #FFF7ED 0%, #FEF3C7 45%, #FDE68A 100%)',
              border: '1.5px solid rgba(245, 158, 11, 0.5)',
              boxShadow:
                '0 4px 16px rgba(234, 88, 12, 0.28), inset 0 1.5px 0 rgba(255, 255, 255, 0.95), inset 0 -1.5px 3px rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <svg
              width={isMobile ? '22' : '24'}
              height={isMobile ? '22' : '24'}
              viewBox="0 0 32 32"
              fill="none"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(234, 88, 12, 0.45))' }}
            >
              <defs>
                <linearGradient
                  id="realFlameOuter"
                  x1="16"
                  y1="2"
                  x2="16"
                  y2="30"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="30%" stopColor="#F97316" />
                  <stop offset="70%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#FBBF24" />
                </linearGradient>
                <linearGradient
                  id="realFlameCore"
                  x1="16"
                  y1="13"
                  x2="16"
                  y2="28"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="45%" stopColor="#FDE047" />
                  <stop offset="85%" stopColor="#FEF08A" />
                  <stop offset="100%" stopColor="#FFFFFF" />
                </linearGradient>
              </defs>
              {/* Realistic Outer Flame */}
              <path
                d="M16 2.5C14.2 6.2 11.5 8.8 9 12C6.2 15.5 5 19 5 22.5C5 27.8 9.5 30.5 16 30.5C22.5 30.5 27 27.8 27 22.5C27 16.8 22.2 13.2 20 8.5C19 6.5 19 4 18 2.5C17.5 4 17 6.2 15.5 7.2C16.5 5.2 16.5 3.5 16 2.5Z"
                fill="url(#realFlameOuter)"
              />
              {/* Inner Combustion Core */}
              <path
                d="M16 14C14.5 16.5 12.5 18 12.5 21C12.5 24 14 26.5 16 26.5C18 26.5 19.5 24 19.5 21C19.5 18.5 18 17 17 15C16.5 16 16.2 17 15.5 17.5C15.8 16 16 15 16 14Z"
                fill="url(#realFlameCore)"
              />
              {/* White-Hot Ignition Base Spark */}
              <ellipse cx="16" cy="24.5" rx="3" ry="1.8" fill="#FFFFFF" opacity="0.95" />
            </svg>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                className="tabular-nums"
                style={{
                  fontSize: isMobile ? '18px' : '20px',
                  fontWeight: 800,
                  color: '#0F172A',
                  lineHeight: 1,
                  letterSpacing: '-0.5px',
                }}
              >
                {streak.currentStreak}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#D97706',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                }}
              >
                {streak.currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
              </span>

              {streak.todayCompleted ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    background: '#FCE7F3',
                    color: '#BE185D',
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    border: '1px solid rgba(219, 39, 119, 0.3)',
                  }}
                >
                  <Check size={10} strokeWidth={3} /> {variant === 'garden' ? 'Care recorded' : 'Protected'}
                </span>
              ) : (
                <span
                  style={{
                    background: '#FFF1F2',
                    color: '#BE123C',
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    border: '1px solid rgba(225, 29, 72, 0.3)',
                  }}
                >
                  ✨ {variant === 'garden' ? 'Ready Today' : 'Active Today'}
                </span>
              )}
            </div>

            <p
              style={{
                margin: '3px 0 0',
                fontSize: '11px',
                color: '#881337',
                fontWeight: 500,
                opacity: 0.8,
              }}
            >
              {streak.todayCompleted
                ? variant === 'garden'
                  ? 'Today’s care is recorded. Your rhythm continues.'
                  : 'Great rhythm! Habit completed for today.'
                : variant === 'garden'
                  ? 'Tend the garden or complete one daily-care action.'
                  : 'Complete 1 habit below to protect & ignite!'}
            </p>
          </div>
        </div>

        {/* Right Action Group */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: isMobile ? 'auto' : 'unset',
          }}
        >
          <motion.button
            type="button"
            role="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClaimReward}
            disabled={rewardLocked && !claimedJustNow}
            aria-label={
              streak.isDailyRewardClaimedToday
                ? 'Daily Garden Bloom already collected'
                : streak.todayCompleted
                  ? 'Collect today’s Garden Bloom'
                  : 'Complete one care action to unlock today’s Garden Bloom'
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: isMobile ? '6px 10px' : '6px 12px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: rewardLocked ? 'default' : 'pointer',
              background: rewardLocked
                ? 'rgba(255, 241, 242, 0.95)'
                : 'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)',
              color: rewardLocked ? '#BE123C' : '#FFFFFF',
              border: rewardLocked
                ? '1px solid rgba(225, 29, 72, 0.3)'
                : '1px solid rgba(190, 18, 60, 0.35)',
              boxShadow: rewardLocked
                ? 'none'
                : '0 4px 14px rgba(225, 29, 72, 0.28), inset 0 1px 0 rgba(255,255,255,0.45)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {streak.isDailyRewardClaimedToday || claimedJustNow ? (
              <>
                <Sparkles size={12} color="#BE123C" />
                <span>+3 PTS Claimed</span>
              </>
            ) : (
              <>
                <Gift size={12} color="#FFF" />
                <span>{streak.todayCompleted ? 'Daily Bloom' : 'Bloom Locked'}</span>
              </>
            )}
          </motion.button>

          <motion.button
            type="button"
            role="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              triggerHapticLight();
              navigate('/app/trophies');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: isMobile ? '5px 10px' : '5px 11px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              background: '#FFF1F2',
              color: '#4C0519',
              border: '1.5px solid #FECDD3',
              boxShadow: '0 2px 8px rgba(225, 29, 72, 0.1), inset 0 1px 0 #FFFFFF',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Trophy size={12} color="#E11D48" />
            <span className="tabular-nums" style={{ color: '#9F1239', fontWeight: 800 }}>
              {vitality.points} PTS
            </span>
            <ChevronRight size={11} color="#E11D48" />
          </motion.button>
        </div>
      </div>

      {/* Secondary Bottom Row: 7-Day Rhythm Horizon & Habit Quest Progress */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 228, 230, 0.85)',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px' }}>
          {streak.weekActivity.map((day, idx) => {
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <div
                  style={{
                    width: isMobile ? '18px' : '22px',
                    height: isMobile ? '18px' : '22px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: day.isCompleted
                      ? 'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)'
                      : day.isToday
                        ? '#FFE4E6'
                        : 'rgba(255, 255, 255, 0.85)',
                    border:
                      day.isToday && !day.isCompleted
                        ? '1.6px dashed #E11D48'
                        : day.isCompleted
                          ? '1px solid #BE123C'
                          : '1px solid #FECDD3',
                    boxShadow: day.isCompleted ? '0 2px 6px rgba(225, 29, 72, 0.28)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {day.isCompleted ? (
                    <Check size={isMobile ? 10 : 12} color="#FFF" strokeWidth={3} />
                  ) : day.isToday ? (
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: '#E11D48',
                      }}
                    />
                  ) : null}
                </div>
                <span
                  style={{
                    fontSize: '8.5px',
                    fontWeight: day.isToday ? 800 : 600,
                    color: day.isToday ? '#E11D48' : '#9F1239',
                    opacity: day.isToday ? 1 : 0.6,
                  }}
                >
                  {day.dayLabel}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              position: 'relative',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="34" height="34" viewBox="0 0 38 38">
              <circle
                cx="19"
                cy="19"
                r={radius}
                fill="transparent"
                stroke="rgba(244, 63, 94, 0.2)"
                strokeWidth="3"
              />
              <circle
                cx="19"
                cy="19"
                r={radius}
                fill="transparent"
                stroke={doneHabitsCount === totalHabits ? '#059669' : '#E11D48'}
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 19 19)"
                style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
              />
            </svg>
            <span
              className="tabular-nums"
              style={{
                position: 'absolute',
                fontSize: '9.5px',
                fontWeight: 800,
                color: doneHabitsCount === totalHabits ? '#059669' : '#BE123C',
              }}
            >
              {doneHabitsCount}/{totalHabits}
            </span>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div
              style={{ fontSize: '10px', fontWeight: 800, color: '#4C0519', whiteSpace: 'nowrap' }}
            >
              {variant === 'garden' ? 'Daily Care' : 'Daily Quest'}
            </div>
            <div
              style={{
                fontSize: '8.5px',
                fontWeight: 700,
                color: doneHabitsCount === totalHabits ? '#059669' : '#E11D48',
                whiteSpace: 'nowrap',
              }}
            >
              {doneHabitsCount === totalHabits ? '✓ Complete' : `${habitPercent}% Done`}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {claimedJustNow && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, rgba(225, 29, 72, 0.96) 0%, rgba(190, 18, 60, 0.97) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(251, 113, 133, 0.4)',
              boxShadow: '0 10px 30px rgba(225, 29, 72, 0.35)',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              color: '#FFFFFF',
              borderRadius: isMobile ? '20px' : '26px',
              padding: '12px',
            }}
          >
            <Sparkles size={20} color="#FFE4E6" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                +3 Vitality Points Claimed! ✨
              </div>
              <div style={{ fontSize: '10.5px', color: '#FECDD3' }}>
                Daily Bloom added to your Trophy Vault
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VitalityStreakBanner;
