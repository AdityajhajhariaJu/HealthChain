import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { triggerHapticLight } from '../../services/haptics';

export function FitnessNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'today', label: 'For You', path: '/app/today' },
    { id: 'sports', label: 'Sports', path: '/app/sports' },
    { id: 'progress', label: 'Progress', path: '/app/progress' },
    { id: 'trophies', label: 'Trophies', path: '/app/trophies' }
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      overflowX: 'auto',
      padding: '0 24px 16px',
      margin: '0 -24px 8px -24px',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      <style>{`
        .fitness-nav::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="fitness-nav" style={{ display: 'flex', gap: '8px', minWidth: 'min-content', padding: '0 24px' }}>
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
                border: 'none',
                fontSize: '15px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: isActive ? '#0F172A' : 'rgba(15, 23, 42, 0.04)',
                color: isActive ? 'white' : '#475569',
                boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.15)' : 'none',
                border: isActive ? '1px solid #0F172A' : '1px solid rgba(15, 23, 42, 0.05)',
                backdropFilter: 'blur(8px)'
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
