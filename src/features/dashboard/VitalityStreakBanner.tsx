import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import { getDailyStreak, getVitalityState, DailyStreakInfo, VitalityState } from '../../services/VitalityPointsEngine';
import { triggerHapticLight } from '../../services/haptics';

interface VitalityStreakBannerProps {
  completedHabits?: Record<string, boolean>;
}

export const VitalityStreakBanner: React.FC<VitalityStreakBannerProps> = ({ completedHabits = {} }) => {
  const navigate = useNavigate();
  const [streak, setStreak] = useState<DailyStreakInfo>(() => getDailyStreak());
  const [vitality, setVitality] = useState<VitalityState>(() => getVitalityState());

  const refresh = () => {
    setStreak(getDailyStreak());
    setVitality(getVitalityState());
  };

  useEffect(() => {
    refresh();
    window.addEventListener('hc_points_updated', refresh);
    window.addEventListener('hc_profile_updated', refresh);
    window.addEventListener('hc_daily_checkin_completed', refresh);
    return () => {
      window.removeEventListener('hc_points_updated', refresh);
      window.removeEventListener('hc_profile_updated', refresh);
      window.removeEventListener('hc_daily_checkin_completed', refresh);
    };
  }, []);

  useEffect(() => {
    setStreak(getDailyStreak());
    setVitality(getVitalityState());
  }, [completedHabits]);

  const completed = ['hydration', 'vitamins'].filter((key) => completedHabits[key]).length;

  return (
    <section
      aria-label="Today activity"
      style={{
        background: '#FFF7ED',
        border: '1px solid #FED7AA',
        borderRadius: 18,
        padding: '12px 16px',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <strong style={{ color: '#0F172A', fontSize: 15 }}>Today</strong>
          <span style={{ color: '#64748B', fontSize: 13, marginLeft: 8 }}>
            {completed} of 2 activities logged
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHapticLight();
            navigate('/app/progress');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 10px',
            borderRadius: 999,
            border: '1px solid #FDBA74',
            background: '#FFFFFF',
            color: '#9A3412',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {vitality.points} points <ChevronRight size={13} aria-hidden="true" />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10 }}>
        <div aria-label={streak.currentStreak + ' day activity streak'} style={{ display: 'flex', gap: 6 }}>
          {streak.weekActivity.map((day, index) => (
            <span
              key={day.dateStr + '-' + index}
              title={day.dayLabel}
              aria-label={day.dayLabel + ': ' + (day.isCompleted ? 'logged' : 'not logged')}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid ' + (day.isCompleted ? '#FB923C' : '#E2E8F0'),
                background: day.isCompleted ? '#FFEDD5' : '#FFFFFF',
                color: '#C2410C',
              }}
            >
              {day.isCompleted ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : null}
            </span>
          ))}
        </div>
        <span style={{ color: '#64748B', fontSize: 12 }}>
          {streak.currentStreak > 0 ? streak.currentStreak + '-day activity streak' : 'No streak pressure'}
        </span>
      </div>
    </section>
  );
};
