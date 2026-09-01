import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { triggerHapticLight } from '../../services/haptics';

export function FitnessNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'today', label: 'For You', path: '/app/today' },
    // { id: 'sports', label: 'Sports', path: '/app/sports' },
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
                padding: '8px 20px',
                borderRadius: '24px',
                fontSize: '15px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isActive ? 'rgba(15, 23, 42, 0.85)' : 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 100%)',
                color: isActive ? 'white' : '#475569',
                boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.2)' : '0 8px 24px rgba(31, 38, 135, 0.1), inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -1px 2px rgba(255, 255, 255, 0.3)',
                border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', transform: 'translateZ(0)'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

