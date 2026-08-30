import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export const ImmersiveFeatureFeed: React.FC = () => {
  const navigate = useNavigate();

  const categories = [
    { name: 'All', image: '/images/rowing-crew.png', active: true },
    { name: 'High Protein', image: '/images/immersive/personalized-meal.png', active: false },
    { name: 'Low Carb', image: '/images/immersive/midnight-craving.png', active: false },
    { name: 'Keto', image: '/images/immersive/grocery-scanner.png', active: false },
    { name: 'Vegan', image: '/images/immersive/focus-boost.png', active: false },
  ];

  const quickActions = [
    { text: '20-30\ngms', sub: 'Protein', image: '/images/immersive/personalized-meal.png' },
    { text: '30-40\ngms', sub: 'Protein', image: '/images/immersive/grocery-scanner.png' },
    { text: '40+\ngms', sub: 'Protein', image: '/images/immersive/focus-boost.png' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      
      {/* 1. Wide Landscape Hero Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate('/app/nutrition')}
        style={{
          background: 'linear-gradient(135deg, #1C2922 0%, #0F1713 100%)',
          borderRadius: '24px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '160px'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, width: '65%' }}>
          <div style={{ color: '#E2E8F0', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '4px' }}>
            Introducing
          </div>
          <div style={{ color: '#A7F3D0', fontSize: '26px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px', marginBottom: '8px', lineHeight: '1.1' }}>
            HEALTHY SCORE
          </div>
          <div style={{ color: '#94A3B8', fontSize: '13px', lineHeight: '1.4', marginBottom: '20px', paddingRight: '20px' }}>
            Your guide to making healthy food choices
          </div>
          
          <button style={{
            background: '#ECFDF5', color: '#065F46', border: 'none', borderRadius: '20px',
            padding: '8px 16px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px',
            cursor: 'pointer'
          }}>
            Know more <ChevronRight size={14} />
          </button>
        </div>

        {/* Right side image */}
        <div style={{
          position: 'absolute', right: '-20px', top: '-10px', width: '150px', height: '150px',
          backgroundImage: 'url(/images/immersive/personalized-meal.png)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          borderRadius: '50%', border: '4px solid #1C2922', zIndex: 1
        }} />

        {/* Bottom Right Stats Box */}
        <div style={{
          position: 'absolute', right: '16px', bottom: '16px', zIndex: 3,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', borderRadius: '12px',
          padding: '8px 16px', display: 'flex', gap: '16px', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#FFF', fontSize: '13px', fontWeight: 800 }}>15g</span>
            <span style={{ color: '#94A3B8', fontSize: '10px' }}>protein</span>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#FFF', fontSize: '13px', fontWeight: 800 }}>19g</span>
            <span style={{ color: '#94A3B8', fontSize: '10px' }}>fat</span>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#FFF', fontSize: '13px', fontWeight: 800 }}>24g</span>
            <span style={{ color: '#94A3B8', fontSize: '10px' }}>carbs</span>
          </div>
        </div>
      </motion.div>

      {/* 2. Horizontal Category Pills */}
      <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: '16px', paddingBottom: '8px', margin: '0 -24px', padding: '0 24px' }}>
        {categories.map((cat, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '64px', cursor: 'pointer' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              backgroundImage: 'url(' + cat.image + ')', backgroundSize: 'cover', backgroundPosition: 'center',
              boxShadow: cat.active ? '0 0 0 2px #FFF, 0 0 0 4px #10B981' : '0 4px 12px rgba(0,0,0,0.05)',
              border: '2px solid #FFF'
            }} />
            <span style={{ fontSize: '12px', fontWeight: cat.active ? 800 : 600, color: cat.active ? '#0F172A' : '#64748B' }}>
              {cat.name}
            </span>
          </div>
        ))}
      </div>

      {/* 3. Circular Action Targets */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>
          FIND DISHES BY
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <div style={{ padding: '6px 16px', border: '1px solid #E2E8F0', borderRadius: '20px', fontSize: '13px', fontWeight: 600, color: '#0F172A', background: '#F8FAFC' }}>Protein</div>
          <div style={{ padding: '6px 16px', border: '1px solid #E2E8F0', borderRadius: '20px', fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Calories</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          {quickActions.map((action, idx) => (
            <div key={idx} style={{ flex: 1, position: 'relative', aspectRatio: '1/1', cursor: 'pointer' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'url(' + action.image + ')', backgroundSize: 'cover', backgroundPosition: 'center',
                borderRadius: '50%', border: '4px solid #FFF',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
              }} />
              <div style={{
                position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%',
                background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)',
                borderRadius: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                textAlign: 'center', border: '2px solid rgba(255,255,255,0.5)'
              }}>
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#B45309', lineHeight: '1.1', whiteSpace: 'pre-line' }}>{action.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
