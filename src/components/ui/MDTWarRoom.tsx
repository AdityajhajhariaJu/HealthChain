import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function MDTWarRoom() {
  const [agents, setAgents] = useState<{id: string, role: string, x: number, y: number, color: string}[]>([]);
  const [packets, setPackets] = useState<{id: string, from: string, to: string}[]>([]);

  useEffect(() => {
    // Spawn agents
    setAgents([
      { id: 'ava', role: 'Ava (Core)', x: 50, y: 50, color: '#0F9488' },
      { id: 'cardio', role: 'Cardiology', x: 20, y: 25, color: '#E11D48' },
      { id: 'endo', role: 'Endocrinology', x: 80, y: 25, color: '#3B82F6' },
      { id: 'neuro', role: 'Neurology', x: 50, y: 85, color: '#8B5CF6' }
    ]);

    // Simulate packet transfer
    const interval = setInterval(() => {
      const from = agents[Math.floor(Math.random() * agents.length)]?.id;
      let to = agents[Math.floor(Math.random() * agents.length)]?.id;
      while (to === from) to = agents[Math.floor(Math.random() * agents.length)]?.id;
      
      if (from && to) {
        const id = Math.random().toString();
        setPackets(p => [...p, { id, from, to }]);
        setTimeout(() => {
          setPackets(p => p.filter(x => x.id !== id));
        }, 1500); // Packet duration
      }
    }, 800);

    return () => clearInterval(interval);
  }, [agents.length]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '350px', background: '#020617', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Radar Sweep */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: '150%', height: '150%',
          background: 'conic-gradient(from 0deg, transparent 70%, rgba(15, 148, 136, 0.2) 100%)',
          transformOrigin: '0 0',
          marginLeft: 0, marginTop: 0
        }}
      />
      
      {/* Grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)' }} />

      {/* SVG Canvas for Lines */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <AnimatePresence>
          {packets.map(p => {
            const fromAgent = agents.find(a => a.id === p.from);
            const toAgent = agents.find(a => a.id === p.to);
            if (!fromAgent || !toAgent) return null;

            return (
              <motion.line
                key={p.id}
                x1={`${fromAgent.x}%`} y1={`${fromAgent.y}%`}
                x2={`${toAgent.x}%`} y2={`${toAgent.y}%`}
                stroke={fromAgent.color}
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5 }}
              />
            );
          })}
        </AnimatePresence>
      </svg>

      {/* Nodes */}
      {agents.map(a => (
        <motion.div
          key={a.id}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: 'absolute',
            left: `${a.x}%`,
            top: `${a.y}%`,
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <motion.div
            animate={{ boxShadow: [`0 0 0px ${a.color}`, `0 0 20px ${a.color}`, `0 0 0px ${a.color}`] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: '16px', height: '16px',
              borderRadius: '50%',
              background: a.color,
              border: '2px solid #fff'
            }}
          />
          <div style={{ background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', border: `1px solid ${a.color}40`, color: a.color, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {a.role}
          </div>
        </motion.div>
      ))}
    </div>
  );
}