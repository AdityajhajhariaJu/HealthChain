import React from 'react';

interface LiveOrbitIconProps {
  size?: number;
}

export const LiveOrbitIcon: React.FC<LiveOrbitIconProps> = ({ size = 24 }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0F172A', // Dark background for the icon
        borderRadius: '50%',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        overflow: 'hidden' // clip the orbit if it goes outside
      }}
    >
      {/* Inline styles for the orbit animation */}
      <style>
        {`
          @keyframes orbitSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulseCore {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
            70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(255, 255, 255, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
          }
          .orbit-container {
            width: 100%;
            height: 100%;
            position: absolute;
            animation: orbitSpin 8s linear infinite;
          }
          .orbit-dot {
            position: absolute;
            width: ${size * 0.15}px;
            height: ${size * 0.15}px;
            background: #38bdf8; /* bright cyan blue */
            border-radius: 50%;
            box-shadow: 0 0 4px #38bdf8, 0 0 8px #38bdf8;
            top: 5px;
            left: 50%;
            transform: translateX(-50%);
          }
          .orbit-dot:nth-child(2) {
            top: auto;
            bottom: 5px;
          }
          .orbit-dot:nth-child(3) {
            top: 50%;
            left: 5px;
            transform: translateY(-50%);
          }
          .orbit-dot:nth-child(4) {
            top: 50%;
            left: auto;
            right: 5px;
            transform: translateY(-50%);
          }
        `}
      </style>

      {/* Orbiting track */}
      <div
        style={{
          position: 'absolute',
          width: size * 0.7,
          height: size * 0.7,
          border: '1px dashed rgba(255,255,255,0.2)',
          borderRadius: '50%',
        }}
      />

      {/* Orbiting dots */}
      <div className="orbit-container">
        <div className="orbit-dot"></div>
        <div className="orbit-dot"></div>
        <div className="orbit-dot"></div>
        <div className="orbit-dot"></div>
      </div>

      {/* Central Core */}
      <div
        style={{
          width: size * 0.25,
          height: size * 0.25,
          background: '#ffffff',
          borderRadius: '50%',
          position: 'relative',
          zIndex: 10,
          animation: 'pulseCore 2s infinite ease-in-out',
          boxShadow: '0 0 10px rgba(255,255,255,0.8)'
        }}
      />
    </div>
  );
};
