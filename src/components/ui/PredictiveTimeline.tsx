import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Clock, Coffee } from 'lucide-react';
import { useMemo, useState } from 'react';
import { triggerHapticLight } from '../../services/haptics';
import { getProfile } from '../../services/ProfileEngine';

export const PredictiveTimeline = () => {
  const [timeIndex, setTimeIndex] = useState(1); // 0 = Past, 1 = Now, 2 = Future

  const profile = getProfile();
  const recentLogs = profile?.nutrition?.recentLogs || [];
  const checkins = profile?.dailyCheckins || [];
  const hasActivity = recentLogs.length > 0 || checkins.length > 0;

  const timelineData = useMemo(() => {
    const latestLog = recentLogs.length > 0 ? recentLogs[recentLogs.length - 1] : null;
    const latestCheckin = checkins.length > 0 ? checkins[0] : null;

    return [
      {
        time: latestLog ? (latestLog.slot || 'Saved meal') : 'Earlier',
        title: latestLog ? `Intake: ${latestLog.name || 'Meal'}` : 'No meal recorded',
        type: 'past',
        desc: latestLog ? `Your saved meal entry: ${latestLog.name || 'meal'}.` : 'Add a meal entry to see it here.',
        icon: Activity,
        color: '#F59E0B',
      },
      {
        time: 'Latest check-in',
        title: latestCheckin && latestCheckin.severity !== 'None' ? `Recorded: ${latestCheckin.symptom}` : 'Symptom check-in',
        type: 'now',
        desc: latestCheckin && latestCheckin.severity !== 'None'
          ? `You recorded ${latestCheckin.symptom} (${latestCheckin.severity}). This entry does not show your current health status.`
          : latestCheckin ? 'No symptoms were marked in this saved entry.' : 'No symptom check-in recorded yet.',
        icon: Activity,
        color: '#10B981',
      },
      {
        time: 'Next check-in',
        title: 'Record how you feel',
        type: 'future',
        desc: 'Add another entry when useful. Future symptoms and recovery cannot be predicted from this timeline.',
        icon: Coffee,
        color: '#3B82F6',
      },
    ];
  }, [recentLogs, checkins]);

  const current = timelineData[timeIndex];
  const Icon = current.icon;

  return (
    <div style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  padding: '0 24px', marginBottom: '16px' }}>
      <div style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  fontSize: '20px', fontWeight: 700, margin: 0, color: '#0F172A', letterSpacing: '-0.5px' }}>Your Timeline</h2>
      </div>

      <div style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  background: '#FFF', borderRadius: '24px', padding: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9' }}>
        {!hasActivity ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3B82F6',
                marginBottom: '4px',
              }}
            >
              <Clock size={20} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
              Your Timeline
            </span>
            <span style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '320px', lineHeight: 1.5 }}>
              Log a meal or symptom check-in to see your saved entries here.
            </span>
          </div>
        ) : (
          <>
            {/* The Scrubber */}
            <div style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  position: 'relative', height: '4px', background: '#E2E8F0', borderRadius: '2px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {[0, 1, 2].map(idx => (
            <div 
              key={idx}
              role="slider"
              tabIndex={0}
              aria-label={`Timeline horizon: ${timelineData[idx].type} - ${timelineData[idx].time}`}
              aria-valuemin={0}
              aria-valuemax={2}
              aria-valuenow={timeIndex}
              aria-valuetext={timelineData[idx].title}
              onClick={() => { triggerHapticLight(); setTimeIndex(idx); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  triggerHapticLight();
                  setTimeIndex(prev => Math.min(2, prev + 1));
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  triggerHapticLight();
                  setTimeIndex(prev => Math.max(0, prev - 1));
                } else if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  triggerHapticLight();
                  setTimeIndex(idx);
                }
              }}
              style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y', 
                width: '16px', height: '16px', borderRadius: '50%',
                background: timeIndex === idx ? current.color : '#CBD5E1',
                border: '3px solid #FFF',
                cursor: 'pointer',
                boxShadow: timeIndex === idx ? `0 0 0 4px ${current.color}33` : 'none',
                transition: 'all 0.3s ease',
                zIndex: 2,
                outline: 'none',
              }}
            />
          ))}
          {/* Progress fill */}
          <motion.div 
            animate={{ scaleX: timeIndex / 2, backgroundColor: current.color }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y', position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, transformOrigin: 'left', borderRadius: '2px', zIndex: 1 }}
          />
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={timeIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  display: 'flex', gap: '16px' }}
          >
            <div style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  width: '48px', height: '48px', borderRadius: '16px', background: `${current.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={24} color={current.color} />
            </div>
            <div style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  display: 'flex', flexDirection: 'column' }}>
              <span style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  fontSize: '13px', fontWeight: 600, color: current.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {current.type === 'now' ? 'Right Now' : current.time}
              </span>
              <span style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  fontSize: '16px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>{current.title}</span>
              <span style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  fontSize: '14px', color: '#64748B', marginTop: '4px', lineHeight: 1.4 }}>{current.desc}</span>
            </div>
          </motion.div>
        </AnimatePresence>
          </>
        )}

      </div>
    </div>
  );
};
