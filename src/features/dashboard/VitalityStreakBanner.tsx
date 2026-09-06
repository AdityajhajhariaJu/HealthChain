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
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFDF7 45%, #FEF9C3 100%)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRadius: isMobile ? '20px' : '26px',
        border: '1.5px solid rgba(245, 158, 11, 0.25)',
        boxShadow: '0 12px 32px rgba(217, 119, 6, 0.08), 0 2px 8px rgba(245, 158, 11, 0.04), inset 0 2px 0 rgba(255, 255, 255, 0.98), inset 0 0 20px rgba(254, 243, 199, 0.5)',
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
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, transparent 70%)',
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
              background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              border: '1.5px solid rgba(217, 119, 6, 0.4)',
              boxShadow: '0 4px 14px rgba(217, 119, 6, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Flame size={isMobile ? 20 : 22} color="#D97706" fill="#F59E0B" />
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
                  color: '#D97706',
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
                    background: '#FEF3C7',
                    color: '#B45309',
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    border: '1px solid rgba(217, 119, 6, 0.3)'
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
                ? 'rgba(240, 253, 250, 0.95)' 
                : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: streak.isMysteryClaimedToday ? '#059669' : '#FFFFFF',
              border: streak.isMysteryClaimedToday 
                ? '1px solid rgba(16, 185, 129, 0.3)' 
                : '1px solid rgba(217, 119, 6, 0.35)',
              boxShadow: streak.isMysteryClaimedToday 
                ? 'none' 
                : '0 4px 14px rgba(217, 119, 6, 0.28), inset 0 1px 0 rgba(255,255,255,0.45)',
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
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              triggerHapticLight();
              navigate('/app/trophies');
            }}
            aria-label={`View trophies and points. Current points: ${vitality.points}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: isMobile ? '5px 10px' : '5px 11px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              background: '#FEF3C7',
              color: '#0F172A',
              border: '1.5px solid #FDE68A',
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.1), inset 0 1px 0 #FFFFFF',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Trophy size={12} color="#D97706" />
            <span className="tabular-nums" style={{ color: '#92400E', fontWeight: 800 }}>{vitality.points} PTS</span>
            <ChevronRight size={11} color="#D97706" />
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
          borderTop: '1px solid rgba(240, 253, 250, 0.85)',
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
                      ? '#FEF3C7'
                      : 'rgba(255, 255, 255, 0.85)',
                    border: day.isToday && !day.isCompleted
                      ? '1.6px dashed #D97706'
                      : day.isCompleted
                      ? '1px solid #B45309'
                      : '1px solid #E2E8F0',
                    boxShadow: day.isCompleted 
                      ? '0 2px 6px rgba(217, 119, 6, 0.28)' 
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
                        background: '#D97706'
                      }}
                    />
                  ) : null}
                </div>
                <span
                  style={{
                    fontSize: '8.5px',
                    fontWeight: day.isToday ? 800 : 600,
                    color: day.isToday ? '#D97706' : '#94A3B8'
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
                stroke={doneHabitsCount === totalHabits ? '#10B981' : '#D97706'}
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
                color: doneHabitsCount === totalHabits ? '#10B981' : '#92400E'
              }}
            >
              {doneHabitsCount}/{totalHabits}
            </span>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
              Daily Quest
            </div>
            <div style={{ fontSize: '8.5px', fontWeight: 700, color: doneHabitsCount === totalHabits ? '#059669' : '#D97706', whiteSpace: 'nowrap' }}>
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
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(15, 118, 110, 0.97) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(20, 184, 166, 0.4)',
              boxShadow: '0 10px 30px rgba(15, 118, 110, 0.25)',
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
            <Sparkles size={20} color="#5EEAD4" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#CCFBF1' }}>
                +3 Vitality Points Claimed! ✨
              </div>
              <div style={{ fontSize: '10.5px', color: '#99F6E4' }}>
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