import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Activity, Coffee, AlertCircle } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

export const PredictiveTimeline = () => {
  const [timeIndex, setTimeIndex] = useState(1); // 0 = Past, 1 = Now, 2 = Future

  const timelineData = [
    { time: '11:30 AM', title: 'Post-Meal Glucose Peak', type: 'past', desc: 'Spiked to 142 mg/dL after lunch.', icon: Activity, color: '#F59E0B' },
    { time: '2:15 PM', title: 'Current Baseline', type: 'now', desc: 'Glucose stabilized. Heart rate 68 bpm.', icon: Activity, color: '#10B981' },
    { time: '5:00 PM', title: 'Optimal Circadian Window', type: 'future', desc: 'Predicted peak cognitive & metabolic alignment. Ideal for deep focus or a brisk walk.', icon: Coffee, color: '#3B82F6' },
  ];

  const current = timelineData[timeIndex];
  const Icon = current.icon;

  return (
    <div style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  padding: '0 24px', marginBottom: '16px' }}>
      <div style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  fontSize: '20px', fontWeight: 700, margin: 0, color: '#0F172A', letterSpacing: '-0.5px' }}>Predictive Timeline</h2>
      </div>

      <div style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  background: '#FFF', borderRadius: '24px', padding: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9' }}>
        
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

      </div>
    </div>
  );
};
