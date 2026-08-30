import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, BrainCircuit, Activity } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

export const InfiniteHealthCanvas = ({ cases }: { cases: any[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Sort cases oldest to newest for timeline
  const timelineCases = [...cases].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (timelineCases.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>No cases to map on your journey yet.</div>;
  }

  // Calculate layout widths
  const itemWidth = 240;
  const gap = 100;
  const totalWidth = Math.max(window.innerWidth, timelineCases.length * (itemWidth + gap) + 400);

  // SVG Line Path
  const generatePath = () => {
    let d = 'M 0 150 ';
    timelineCases.forEach((_, i) => {
      const x = 200 + i * (itemWidth + gap);
      const y = i % 2 === 0 ? 120 : 180;
      d += `S ${x - 100} ${y}, ${x} ${y} `;
    });
    d += `L ${totalWidth} 150`;
    return d;
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '400px', 
        background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)', 
        borderRadius: '24px', 
        overflow: 'hidden', 
        position: 'relative',
        boxShadow: 'inset 0 4px 24px rgba(0,0,0,0.02)'
      }}
    >
      <motion.div
        drag="x"
        dragConstraints={containerRef}
        dragElastic={0.1}
        onDrag={() => triggerHapticLight()}
        style={{
          width: totalWidth,
          height: '100%',
          position: 'absolute',
          left: 0,
          top: 0,
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab'
        }}
        whileTap={{ cursor: 'grabbing' }}
      >
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <defs>
            <linearGradient id="timelineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            d={generatePath()}
            fill="none"
            stroke="url(#timelineGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>

        {timelineCases.map((c, i) => {
          const isJarvis = c.title?.toLowerCase().includes('j.a.r.v.i.s.') || c.currentStage === 'jarvis_complete';
          const yOffset = i % 2 === 0 ? -80 : 80;

          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: yOffset + 20 }}
              animate={{ opacity: 1, y: yOffset }}
              transition={{ delay: 0.2 + (i * 0.1) }}
              onClick={() => {
                triggerHapticLight();
                navigate(`/app/cases/${c.id}`);
              }}
              style={{
                position: 'absolute',
                left: 200 + i * (itemWidth + gap) - (itemWidth / 2),
                width: itemWidth,
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                border: `1px solid ${isJarvis ? '#E0E7FF' : '#DCFCE7'}`,
                cursor: 'pointer'
              }}
              whileHover={{ scale: 1.05, y: yOffset - 5 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {isJarvis ? <BrainCircuit size={16} color="#6366F1" /> : <Activity size={16} color="#10B981" />}
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: isJarvis ? '#6366F1' : '#10B981' }}>
                  {isJarvis ? 'J.A.R.V.I.S. Investigation' : 'Case Review'}
                </span>
              </div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {c.chiefComplaint || c.title || 'Health Report'}
              </h4>
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                {new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(new Date(c.createdAt))}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Constraints container for Framer Motion */}
      <div ref={containerRef} style={{ position: 'absolute', top: 0, left: -(totalWidth - window.innerWidth + 400), right: 400, bottom: 0, pointerEvents: 'none' }} />
    </div>
  );
};