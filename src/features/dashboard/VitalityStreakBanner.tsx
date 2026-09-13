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

  const totalHabits = 2;
  const doneHabitsCount = ['hydration', 'vitamins'].filter(k => completedHabits[k]).length;
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
        background: 'linear-gradient(90deg, rgba(255, 245, 246, 0.94) 0%, rgba(255, 235, 238, 0.86) 50%, rgba(254, 215, 222, 0.60) 100%), url(/ava-floral-bg.jpg) center bottom / cover no-repeat',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: isMobile ? '20px' : '26px',
        border: '1.5px solid rgba(244, 63, 94, 0.28)',
        boxShadow: '0 12px 32px rgba(225, 29, 72, 0.08), 0 2px 8px rgba(244, 63, 94, 0.04), inset 0 2px 0 rgba(255, 255, 255, 0.98), inset 0 0 20px rgba(255, 228, 230, 0.6)',
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
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%)',
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
        {/* Left: Fire Flame & Streak Counter */}
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
              border: '1.5px solid rgba(217, 119, 6, 0.45)',
              boxShadow: '0 4px 14px rgba(217, 119, 6, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
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
                    background: '#FCE7F3',
                    color: '#BE185D',
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    border: '1px solid rgba(219, 39, 119, 0.3)'
                  }}
                >
                  <Check size={10} strokeWidth={3} /> Protected
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
                    border: '1px solid rgba(225, 29, 72, 0.3)'
                  }}
                >
                  ✨ Active Today
                </span>
              )}
            </div>

            <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#881337', fontWeight: 500, opacity: 0.8 }}>
              {streak.todayCompleted 
                ? 'Great rhythm! Habit completed for today.'
                : 'Complete 1 habit below to protect & ignite!'}
            </p>
          </div>
        </div>

        {/* Right Action Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: isMobile ? 'auto' : 'unset' }}>
          
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
                ? 'rgba(255, 241, 242, 0.95)' 
                : 'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)',
              color: streak.isMysteryClaimedToday ? '#BE123C' : '#FFFFFF',
              border: streak.isMysteryClaimedToday 
                ? '1px solid rgba(225, 29, 72, 0.3)' 
                : '1px solid rgba(190, 18, 60, 0.35)',
              boxShadow: streak.isMysteryClaimedToday 
                ? 'none' 
                : '0 4px 14px rgba(225, 29, 72, 0.28), inset 0 1px 0 rgba(255,255,255,0.45)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            {streak.isMysteryClaimedToday || claimedJustNow ? (
              <>
                <Sparkles size={12} color="#BE123C" />
                <span>+3 PTS Claimed</span>
              </>
            ) : (
              <>
                <Gift size={12} color="#FFF" />
                <span>Daily Drop</span>
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
              whiteSpace: 'nowrap'
            }}
          >
            <Trophy size={12} color="#E11D48" />
            <span className="tabular-nums" style={{ color: '#9F1239', fontWeight: 800 }}>{vitality.points} PTS</span>
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
          gap: '10px'
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
                      ? 'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)'
                      : day.isToday
                      ? '#FFE4E6'
                      : 'rgba(255, 255, 255, 0.85)',
                    border: day.isToday && !day.isCompleted
                      ? '1.6px dashed #E11D48'
                      : day.isCompleted
                      ? '1px solid #BE123C'
                      : '1px solid #FECDD3',
                    boxShadow: day.isCompleted 
                      ? '0 2px 6px rgba(225, 29, 72, 0.28)' 
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
                        background: '#E11D48'
                      }}
                    />
                  ) : null}
                </div>
                <span
                  style={{
                    fontSize: '8.5px',
                    fontWeight: day.isToday ? 800 : 600,
                    color: day.isToday ? '#E11D48' : '#9F1239',
                    opacity: day.isToday ? 1 : 0.6
                  }}
                >
                  {day.dayLabel}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ position: 'relative', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                color: doneHabitsCount === totalHabits ? '#059669' : '#BE123C'
              }}
            >
              {doneHabitsCount}/{totalHabits}
            </span>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#4C0519', whiteSpace: 'nowrap' }}>
              Daily Quest
            </div>
            <div style={{ fontSize: '8.5px', fontWeight: 700, color: doneHabitsCount === totalHabits ? '#059669' : '#E11D48', whiteSpace: 'nowrap' }}>
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
              background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.96) 0%, rgba(190, 18, 60, 0.97) 100%)',
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
              padding: '12px'
            }}
          >
            <Sparkles size={20} color="#FFE4E6" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                +3 Vitality Points Claimed! ✨
              </div>
              <div style={{ fontSize: '10.5px', color: '#FECDD3' }}>
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