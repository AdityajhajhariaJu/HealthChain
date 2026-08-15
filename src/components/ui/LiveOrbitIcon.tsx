import React from 'react';

/**
 * AgentOrbit — A minimalist, light-themed orbital visualization
 * representing connected specialist agents working synchronously.
 * Designed to sit as a subtle background element on light surfaces.
 */

interface AgentOrbitProps {
  /** Diameter in px. The component is always a square. */
  size?: number;
}

export const AgentOrbit: React.FC<AgentOrbitProps> = ({ size = 200 }) => {
  const id = React.useId().replace(/:/g, '');

  // Derive proportions from size
  const outerR  = size * 0.46; // outer ring radius
  const innerR  = size * 0.28; // inner ring radius
  const coreR   = size * 0.06; // central core radius
  const dotR    = size * 0.028; // agent dot radius
  const center  = size / 2;

  // Dot positions on the outer ring (6 dots, evenly spaced)
  const outerDots = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60) * (Math.PI / 180);
    return { cx: center + outerR * Math.cos(angle), cy: center + outerR * Math.sin(angle) };
  });

  // Dot positions on the inner ring (3 dots, offset by 30°)
  const innerDots = Array.from({ length: 3 }, (_, i) => {
    const angle = (i * 120 + 30) * (Math.PI / 180);
    return { cx: center + innerR * Math.cos(angle), cy: center + innerR * Math.sin(angle) };
  });

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-block',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Soft radial glow for center */}
          <radialGradient id={`coreGlow-${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>

          {/* Pulse animation */}
          <style>{`
            @keyframes orbit-spin-outer-${id} {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            @keyframes orbit-spin-inner-${id} {
              from { transform: rotate(0deg); }
              to   { transform: rotate(-360deg); }
            }
            @keyframes core-pulse-${id} {
              0%, 100% { r: ${coreR}px; opacity: 0.9; }
              50%      { r: ${coreR * 1.15}px; opacity: 1; }
            }
            .orbit-outer-${id} {
              transform-origin: ${center}px ${center}px;
              animation: orbit-spin-outer-${id} 30s linear infinite;
            }
            .orbit-inner-${id} {
              transform-origin: ${center}px ${center}px;
              animation: orbit-spin-inner-${id} 20s linear infinite;
            }
            .core-dot-${id} {
              animation: core-pulse-${id} 3s ease-in-out infinite;
            }
          `}</style>
        </defs>

        {/* Ambient glow behind everything */}
        <circle cx={center} cy={center} r={size * 0.35} fill={`url(#coreGlow-${id})`} />

        {/* Outer ring track */}
        <circle
          cx={center} cy={center} r={outerR}
          stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 6"
          fill="none" opacity="0.5"
        />

        {/* Inner ring track */}
        <circle
          cx={center} cy={center} r={innerR}
          stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 5"
          fill="none" opacity="0.4"
        />

        {/* Outer orbiting dots group */}
        <g className={`orbit-outer-${id}`}>
          {outerDots.map((dot, i) => (
            <g key={`outer-${i}`}>
              {/* Soft glow behind dot */}
              <circle cx={dot.cx} cy={dot.cy} r={dotR * 2.5} fill="#10B981" opacity="0.12" />
              {/* The dot */}
              <circle cx={dot.cx} cy={dot.cy} r={dotR} fill="#10B981" opacity="0.7" />
            </g>
          ))}
        </g>

        {/* Inner orbiting dots group */}
        <g className={`orbit-inner-${id}`}>
          {innerDots.map((dot, i) => (
            <g key={`inner-${i}`}>
              <circle cx={dot.cx} cy={dot.cy} r={dotR * 2.5} fill="#0EA5E9" opacity="0.12" />
              <circle cx={dot.cx} cy={dot.cy} r={dotR} fill="#0EA5E9" opacity="0.6" />
            </g>
          ))}
        </g>

        {/* Thin connecting lines from center to a few dots (static, decorative) */}
        {outerDots.filter((_, i) => i % 2 === 0).map((dot, i) => (
          <line
            key={`line-${i}`}
            x1={center} y1={center} x2={dot.cx} y2={dot.cy}
            stroke="#CBD5E1" strokeWidth="0.5" opacity="0.2"
          />
        ))}

        {/* Central core */}
        <circle
          className={`core-dot-${id}`}
          cx={center} cy={center} r={coreR}
          fill="#10B981" opacity="0.9"
        />
        {/* Core inner highlight */}
        <circle
          cx={center} cy={center} r={coreR * 0.5}
          fill="#ffffff" opacity="0.6"
        />
      </svg>
    </div>
  );
};
