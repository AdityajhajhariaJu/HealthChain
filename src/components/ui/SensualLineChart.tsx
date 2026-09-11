import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { triggerHapticLight } from '../../services/haptics';
import { getProfile } from '../../services/ProfileEngine';

export interface SensualLineChartProps {
  data?: number[];
}

export const SensualLineChart: React.FC<SensualLineChartProps> = React.memo(({ data: propData }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  const chartData = useMemo(() => {
    if (propData && propData.length >= 2) return propData;
    const profile = getProfile();
    const checkins = profile?.dailyCheckins || [];
    if (checkins.length >= 2) {
      return checkins.slice(-7).map((c: any) => {
        if (typeof c.score === 'number') return Math.min(100, c.score * 10);
        if (c.severity === 'Severe') return 35;
        if (c.severity === 'Mild') return 70;
        return 90;
      });
    }
    return [];
  }, [propData]);

  if (chartData.length < 2) {
    return (
      <div
        style={{
          padding: '16px',
          textAlign: 'center',
          background: '#F8FAFC',
          borderRadius: '14px',
          border: '1.5px dashed #CBD5E1',
          marginTop: '12px',
          fontSize: '12px',
          color: '#64748B',
        }}
      >
        <span style={{ fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '3px' }}>
          Continuous 7-Day Curve Inactive
        </span>
        Complete 2 or more daily check-ins to unlock your personalized health momentum trajectory.
      </div>
    );
  }

  const data = chartData;
  const max = 100;
  const width = 300;
  const height = 140;
  const padding = 20;

  // Memoize path generation to avoid expensive calculations on activeIndex changes (scrubbing)
  // Expected impact: smoother scrubbing interactions and reduced CPU cycles during re-renders
  const { points, pathData, areaData } = useMemo(() => {
    const calculatedPoints = data.map((val, i) => ({
      x: padding + (i * (width - padding * 2)) / (data.length - 1),
      y: height - padding - (val / max) * (height - padding * 2)
    }));

    // Create smooth bezier curve path
    const calculatedPathData = calculatedPoints.reduce((acc, point, i, a) => {
      if (i === 0) return `M ${point.x},${point.y}`;
      const prev = a[i - 1];
      const cp1x = prev.x + (point.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = point.x - (point.x - prev.x) / 2;
      const cp2y = point.y;
      return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`;
    }, '');

    const calculatedAreaData = `${calculatedPathData} L ${calculatedPoints[calculatedPoints.length - 1].x},${height} L ${calculatedPoints[0].x},${height} Z`;

    return {
      points: calculatedPoints,
      pathData: calculatedPathData,
      areaData: calculatedAreaData
    };
  }, [data, width, height, padding, max]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100px', marginTop: '8px' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Fill Area */}
        <motion.path
          d={areaData}
          fill="url(#chartGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />

        {/* Line */}
        <motion.path
          d={pathData}
          fill="none"
          stroke="#10B981"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Interactive Scrub Areas */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - ((width / data.length) / 2)}
            y={0}
            width={width / data.length}
            height={height}
            fill="transparent"
            onPointerEnter={() => {
              setActiveIndex(i);
              triggerHapticLight();
            }}
            onPointerLeave={() => setActiveIndex(null)}
            style={{ cursor: 'pointer', touchAction: 'none' }}
          />
        ))}

        {/* Scrubber Line & Dot */}
        {activeIndex !== null && (
          <g>
            <line x1={points[activeIndex].x} y1={padding} x2={points[activeIndex].x} y2={height - padding} stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx={points[activeIndex].x} cy={points[activeIndex].y} r="5" fill="white" stroke="#10B981" strokeWidth="2" />
            <text x={points[activeIndex].x} y={points[activeIndex].y - 12} textAnchor="middle" fill="#0F172A" fontSize="12" fontWeight="700">
              {data[activeIndex]}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
});