import React from 'react';
import { motion } from 'framer-motion';

export const VitalityRing = ({ progress = 75 }) => {
  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '16px 0', position: 'relative' }}>
      <div style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.05), 0 8px 32px rgba(16, 185, 129, 0.2)',
        background: '#FFFFFF',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          {/* Ghost Past State Ring */}
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(16, 185, 129, 0.15)" strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={circumference - (65 / 100) * circumference} strokeLinecap="round" style={{ filter: 'blur(4px)', transform: 'translateZ(0)', willChange: 'transform' }} />
          {/* Background Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Foreground Ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#ringGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
            style={{
              strokeDasharray: circumference,
            }}
          />
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
        </svg>

        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.5, delay: 1 }}
            style={{ fontSize: '42px', fontWeight: 800, color: '#0F172A', letterSpacing: '-2px', lineHeight: 1 }}
          >
            {progress}
          </motion.div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>
            Vitality
          </div>
        </div>
      </div>
    </div>
  );
};