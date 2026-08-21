import React from 'react';

export const JarvisCore: React.FC<{ size?: number }> = ({ size = 200 }) => {
  const id = React.useId().replace(/:/g, '');
  const center = size / 2;
  const maxR = size * 0.45;
  const midR = size * 0.3;
  const coreR = size * 0.1;

  const ticks = Array.from({ length: 36 }, (_, i) => {
    const angle = (i * 10) * (Math.PI / 180);
    const isMajor = i % 3 === 0;
    const r1 = isMajor ? maxR * 0.9 : maxR * 0.95;
    return {
      x1: center + r1 * Math.cos(angle),
      y1: center + r1 * Math.sin(angle),
      x2: center + maxR * Math.cos(angle),
      y2: center + maxR * Math.sin(angle),
      isMajor
    };
  });

  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'inline-block' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        <defs>
          <radialGradient id={`jarvisGlow-${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.2" />
            <stop offset="70%" stopColor="#8B5CF6" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </radialGradient>
          <style>{`
            @keyframes spin-cw-${id} { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes spin-ccw-${id} { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
            @keyframes pulse-${id} { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
            .ring-outer-${id} { transform-origin: ${center}px ${center}px; animation: spin-cw-${id} 20s linear infinite; }
            .ring-mid-${id} { transform-origin: ${center}px ${center}px; animation: spin-ccw-${id} 15s linear infinite; }
            .core-${id} { transform-origin: ${center}px ${center}px; animation: pulse-${id} 2s ease-in-out infinite; }
          `}</style>
        </defs>
        <circle cx={center} cy={center} r={size * 0.4} fill={`url(#jarvisGlow-${id})`} />
        <g className={`ring-outer-${id}`}>
          <circle cx={center} cy={center} r={maxR} stroke="#0F172A" strokeWidth="1" strokeDasharray="1 4" opacity="0.4" />
          {ticks.map((t, i) => (
            <line key={`tick-${i}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.isMajor ? '#38BDF8' : '#0F172A'} strokeWidth={t.isMajor ? 2 : 1} opacity={t.isMajor ? 0.8 : 0.3} />
          ))}
          <path d={`M ${center} ${center} L ${center + maxR} ${center} A ${maxR} ${maxR} 0 0 1 ${center + maxR * Math.cos(Math.PI/4)} ${center + maxR * Math.sin(Math.PI/4)} Z`} fill="#38BDF8" opacity="0.05" />
        </g>
        <g className={`ring-mid-${id}`}>
          <circle cx={center} cy={center} r={midR} stroke="#8B5CF6" strokeWidth="2" strokeDasharray="15 30 5 10 40 20" opacity="0.7" />
          <circle cx={center} cy={center} r={midR * 0.85} stroke="#0F172A" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        </g>
        <g className={`core-${id}`}>
          <circle cx={center} cy={center} r={coreR * 1.5} fill="#0F172A" opacity="0.1" />
          <circle cx={center} cy={center} r={coreR} fill="#0F172A" stroke="#38BDF8" strokeWidth="2" />
          <circle cx={center} cy={center} r={coreR * 0.4} fill="#38BDF8" />
        </g>
      </svg>
    </div>
  );
};
