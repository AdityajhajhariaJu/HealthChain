import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Flame, Trophy, Sparkles, Gift, ChevronRight, Check } from 'lucide-react';
import { 
  getVitalityState, 
  getDailyStreak, 
  awardMysteryDrop, 
  DailyStreakInfo, 
  VitalityState 
} from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';

interface VitalityStreakBannerProps {
  completedHabits?: Record<string, boolean>;
}

export const VitalityStreakBanner: React.FC<VitalityStreakBannerProps> = ({
  completedHabits = {}
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [streak, setStreak] = useState<DailyStreakInfo>(() => getDailyStreak());
  const [vitality, setVitality] = useState<VitalityState>(() => getVitalityState());
  const [claimedJustNow, setClaimedJustNow] = useState(false);

  const refreshData = () => {
    setStreak(getDailyStreak());
    setVitality(getVitalityState());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('hc_points_updated', refreshData);
    window.addEventListener('hc_profile_updated', refreshData);
    window.addEventListener('hc_daily_checkin_completed', refreshData);
    return () => {
      window.removeEventListener('hc_points_updated', refreshData);
      window.removeEventListener('hc_profile_updated', refreshData);
      window.removeEventListener('hc_daily_checkin_completed', refreshData);
    };
  }, []);

  useEffect(() => {
    refreshData();
  }, [completedHabits]);

  const totalHabits = 3;
  const doneHabitsCount = ['hydration', 'calm_reset', 'vitamins'].filter(k => completedHabits[k]).length;
  const habitPercent = Math.round((doneHabitsCount / totalHabits) * 100);

  const handleClaimMystery = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (streak.isMysteryClaimedToday) return;

    triggerHapticSuccess();
    const success = awardMysteryDrop(3);
    if (success) {
      setClaimedJustNow(true);
      refreshData();
      setTimeout(() => setClaimedJustNow(false), 4000);
    }
  };

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (habitPercent / 100) * circumference;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(254, 243, 199, 0.45) 50%, rgba(255, 255, 255, 0.82) 100%)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRadius: isMobile ? '20px' : '26px',
        border: '1.5px solid rgba(245, 158, 11, 0.35)',
        boxShadow: '0 12px 30px rgba(180, 83, 9, 0.08), inset 0 2px 0 rgba(255, 255, 255, 0.95), inset 0 0 20px rgba(254, 243, 199, 0.4)',
        padding: isMobile ? '12px 14px' : '14px 20px',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        position: 'relative',
        overflow: 'hidden'
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
          background: 'radial-gradient(circle, rgba(249, 115, 22, 0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
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
          flexWrap: isMobile ? 'wrap' : 'nowrap'
        }}
      >
        {/* Left: Flame & Streak Counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <motion.div
            animate={{ 
              scale: [1, 1.08, 1],
              rotate: [-2, 2, -2]
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: isMobile ? '38px' : '42px',
              height: isMobile ? '38px' : '42px',
              minWidth: isMobile ? '38px' : '42px',
              minHeight: isMobile ? '38px' : '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%)',
              border: '1.5px solid rgba(249, 115, 22, 0.4)',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Flame size={isMobile ? 20 : 22} color="#EA580C" fill="#F97316" />
          </motion.div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span 
                className="tabular-nums"
                style={{
                  fontSize: isMobile ? '18px' : '20px',
                  fontWeight: 800,
                  color: '#0F172A',
                  lineHeight: 1,
                  letterSpacing: '-0.5px'
                }}
              >
                {streak.currentStreak}
              </span>
              <span 
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#EA580C',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase'
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
                    background: '#DCFCE7',
                    color: '#15803D',
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                  }}
                >
                  <Check size={10} strokeWidth={3} /> Protected
                </span>
              ) : (
                <span 
                  style={{
                    background: '#FFF7ED',
                    color: '#C2410C',
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    border: '1px solid rgba(234, 88, 12, 0.3)'
                  }}
                >
                  ⚡ Active Today
                </span>
              )}
            </div>

            <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
              {streak.todayCompleted 
                ? 'Great rhythm! Habit completed for today.'
                : 'Complete 1 habit below to protect & ignite!'}
            </p>
          </div>
        </div>

        {/* Right Action Group: Trophy Vault & Mystery Drop */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: isMobile ? 'auto' : 'unset' }}>
          
          {/* Daily Mystery Drop Pill */}
          <motion.button
            type="button"
            role="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClaimMystery}
            disabled={streak.isMysteryClaimedToday && !claimedJustNow}
            aria-label={streak.isMysteryClaimedToday ? 'Daily Mystery Drop already claimed' : 'Claim Daily Mystery Drop sparks'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: isMobile ? '6px 10px' : '6px 12px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: streak.isMysteryClaimedToday ? 'default' : 'pointer',
              background: streak.isMysteryClaimedToday 
                ? 'rgba(241, 245, 249, 0.85)' 
                : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: streak.isMysteryClaimedToday ? '#059669' : '#FFFFFF',
              border: streak.isMysteryClaimedToday 
                ? '1px solid rgba(16, 185, 129, 0.3)' 
                : '1px solid rgba(217, 119, 6, 0.5)',
              boxShadow: streak.isMysteryClaimedToday 
                ? 'none' 
                : '0 4px 12px rgba(245, 158, 11, 0.3), inset 0 1px 0 rgba(255,255,255,0.4)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            {streak.isMysteryClaimedToday || claimedJustNow ? (
              <>
                <Sparkles size={12} color="#059669" />
                <span>+3 PTS Claimed</span>
              </>
            ) : (
              <>
                <Gift size={12} color="#FFF" />
                <span>Daily Drop</span>
              </>
            )}
          </motion.button>

          {/* Trophy Cabinet Shortcut Pill */}
          <motion.button
            type="button"
            role="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              triggerHapticLight();
              navigate('/app/trophies');
            }}
            aria-label="Open Trophy Cabinet and view achievements"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: isMobile ? '6px 10px' : '6px 12px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 41, 59, 0.95) 100%)',
              color: '#FFFFFF',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Trophy size={12} color="#F59E0B" />
            <span className="tabular-nums" style={{ color: '#FDE68A' }}>{vitality.points} PTS</span>
            <ChevronRight size={11} color="#94A3B8" />
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
          borderTop: '1px solid rgba(245, 158, 11, 0.15)',
          gap: '10px'
        }}
      >
        {/* 7-Day Horizon Dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px' }}>
          {streak.weekActivity.map((day, idx) => {
            return (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '3px' 
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
                      ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                      : day.isToday
                      ? 'rgba(254, 243, 199, 0.9)'
                      : 'rgba(226, 232, 240, 0.7)',
                    border: day.isToday && !day.isCompleted
                      ? '1.6px dashed #F59E0B'
                      : day.isCompleted
                      ? '1px solid #B45309'
                      : '1px solid rgba(203, 213, 225, 0.6)',
                    boxShadow: day.isCompleted 
                      ? '0 2px 5px rgba(245, 158, 11, 0.3)' 
                      : 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {day.isCompleted ? (
                    <Check size={isMobile ? 10 : 12} color="#FFF" strokeWidth={3} />
                  ) : day.isToday ? (
                    <motion.div
                      animate={{ scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: '#EA580C'
                      }}
                    />
                  ) : null}
                </div>
                <span
                  style={{
                    fontSize: '8.5px',
                    fontWeight: day.isToday ? 800 : 600,
                    color: day.isToday ? '#EA580C' : '#64748B'
                  }}
                >
                  {day.dayLabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* Habit Completion Mini Ring / Stat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ position: 'relative', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="34" height="34" viewBox="0 0 38 38">
              <circle
                cx="19"
                cy="19"
                r={radius}
                fill="transparent"
                stroke="rgba(245, 158, 11, 0.2)"
                strokeWidth="3"
              />
              <circle
                cx="19"
                cy="19"
                r={radius}
                fill="transparent"
                stroke={doneHabitsCount === totalHabits ? '#10B981' : '#F59E0B'}
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
                color: doneHabitsCount === totalHabits ? '#10B981' : '#0F172A'
              }}
            >
              {doneHabitsCount}/{totalHabits}
            </span>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
              Daily Quest
            </div>
            <div style={{ fontSize: '8.5px', fontWeight: 700, color: doneHabitsCount === totalHabits ? '#059669' : '#B45309', whiteSpace: 'nowrap' }}>
              {doneHabitsCount === totalHabits ? '✓ Complete' : `${habitPercent}% Done`}
            </div>
          </div>
        </div>

      </div>

      {/* Claimed Pop Notification */}
      <AnimatePresence>
        {claimedJustNow && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
              backdropFilter: 'blur(20px)',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              color: '#FFFFFF',
              borderRadius: isMobile ? '20px' : '26px',
              padding: '12px'
            }}
          >
            <Sparkles size={20} color="#FBBF24" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#FDE68A' }}>
                +3 Vitality Points Claimed! ✨
              </div>
              <div style={{ fontSize: '10.5px', color: '#CBD5E1' }}>
                Daily Drop added to your Trophy Vault
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VitalityStreakBanner;