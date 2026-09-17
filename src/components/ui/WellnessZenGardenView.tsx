import { useEffect, useState } from 'react';
import { Check, Droplet, Flower2 } from 'lucide-react';
import { getGardenState, recordGardenAction, type GardenState } from '../../services/TriggerEngine';
import { awardGardenBloom, getDailyStreak, getVitalityState } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';

interface WellnessZenGardenViewProps { onOpenMindfulness?: () => void; }

export const WellnessZenGardenView = (_props: WellnessZenGardenViewProps) => {
  const [garden, setGarden] = useState<GardenState>(() => getGardenState());
  const [streak, setStreak] = useState(() => getDailyStreak());
  const [points, setPoints] = useState(() => getVitalityState().points);
  const today = new Date().toLocaleDateString('en-CA');
  const tendedToday = garden.lastWateredDate === today;
  const bloomReady = streak.todayCompleted && !streak.isDailyRewardClaimedToday;

  const refresh = () => {
    setGarden(getGardenState());
    setStreak(getDailyStreak());
    setPoints(getVitalityState().points);
  };

  useEffect(() => {
    window.addEventListener('hc_garden_updated', refresh);
    window.addEventListener('hc_points_updated', refresh);
    window.addEventListener('hc_profile_updated', refresh);
    return () => {
      window.removeEventListener('hc_garden_updated', refresh);
      window.removeEventListener('hc_points_updated', refresh);
      window.removeEventListener('hc_profile_updated', refresh);
    };
  }, []);

  const handlePrimaryAction = () => {
    triggerHapticLight();
    if (!tendedToday) {
      setGarden(recordGardenAction('water'));
      refresh();
      return;
    }
    if (bloomReady && awardGardenBloom(3)) {
      triggerHapticSuccess();
      refresh();
    }
  };

  const actionComplete = tendedToday && !bloomReady;

  return (
    <section
      aria-label="Zen Garden"
      style={{
        position: 'relative',
        minHeight: '310px',
        borderRadius: '28px',
        overflow: 'hidden',
        backgroundImage: 'linear-gradient(180deg, rgba(236,253,245,0.08) 0%, rgba(236,253,245,0.2) 38%, rgba(240,253,244,0.96) 76%, #F0FDF4 100%), url(/images/zen-garden-dashboard.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(167,243,208,0.9)',
        boxShadow: '0 18px 42px rgba(13,148,136,0.14)',
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <div style={{ width: '100%', padding: '22px' }}>
        <div
          style={{
            width: 'fit-content',
            padding: '5px 10px',
            borderRadius: '999px',
            color: '#047857',
            background: 'rgba(255,255,255,0.88)',
            border: '1px solid rgba(167,243,208,0.9)',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.7px',
          }}
        >
          ZEN GARDEN
        </div>

        <h2 style={{ margin: '9px 0 3px', color: '#064E3B', fontSize: '24px', letterSpacing: '-0.7px' }}>
          {tendedToday ? 'Quietly growing.' : 'Tend today’s garden.'}
        </h2>
        <p style={{ margin: 0, color: '#47665D', fontSize: '13px' }}>One small daily ritual. No pressure.</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '15px' }}>
          <span style={metricStyle}><Flower2 size={14} /> {garden.bloomCount} blooms</span>
          <span style={metricStyle}>🌿 {streak.currentStreak} day rhythm</span>
          <span style={metricStyle}>{points} pts</span>
        </div>

        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={actionComplete}
          style={{
            marginTop: '14px',
            minHeight: '42px',
            padding: '9px 16px',
            borderRadius: '14px',
            border: actionComplete ? '1px solid #A7F3D0' : 'none',
            background: actionComplete ? 'rgba(255,255,255,0.8)' : 'linear-gradient(135deg, #059669, #0D9488)',
            color: actionComplete ? '#047857' : '#FFFFFF',
            fontSize: '13px',
            fontWeight: 800,
            cursor: actionComplete ? 'default' : 'pointer',
            boxShadow: actionComplete ? 'none' : '0 8px 18px rgba(5,150,105,0.22)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
          }}
        >
          {actionComplete ? <Check size={16} /> : tendedToday ? <Flower2 size={16} /> : <Droplet size={16} />}
          {actionComplete ? 'Complete for today' : tendedToday ? 'Collect bloom · +3 pts' : 'Tend garden'}
        </button>
      </div>
    </section>
  );
};

const metricStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '6px 9px',
  borderRadius: '999px',
  background: 'rgba(255,255,255,0.84)',
  border: '1px solid rgba(167,243,208,0.9)',
  color: '#065F46',
  fontSize: '11px',
  fontWeight: 750,
} as const;
