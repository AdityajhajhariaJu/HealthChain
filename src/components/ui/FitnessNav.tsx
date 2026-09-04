import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { triggerHapticLight } from '../../services/haptics';

export function FitnessNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'today', label: 'For You', path: '/app/today' },
    { id: 'progress', label: 'Progress', path: '/app/progress' },
    { id: 'trophies', label: 'Trophies', path: '/app/trophies' }
  ];

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'nowrap',
      gap: '8px',
      overflowX: 'auto',
      padding: '0 24px 16px',
      margin: '0 -24px 8px -24px',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      WebkitOverflowScrolling: 'touch',
      touchAction: 'pan-x pan-y',
      overscrollBehaviorX: 'contain'
    }}>
      <style>{`
        .fitness-nav::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="fitness-nav" style={{ display: 'flex', flexWrap: 'nowrap', gap: '8px', minWidth: 'min-content', padding: '0 24px' }}>
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerHapticLight();
                navigate(tab.path);
              }}
              style={{
                backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', padding: '8px 20px',
                borderRadius: '24px',
                fontSize: '15px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isActive ? 'rgba(15, 23, 42, 0.85)' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',
                color: isActive ? 'white' : '#475569',
                boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.2)' : '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)',
                border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.8)'}}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

