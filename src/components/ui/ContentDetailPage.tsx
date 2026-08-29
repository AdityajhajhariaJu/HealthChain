import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Share, Play, Lock, Clock, Flame, Dumbbell } from 'lucide-react';
import { FitnessContent } from '../../services/FitnessService';
import { triggerHapticLight } from '../../services/haptics';

interface Props {
  content: FitnessContent | null;
  onClose: () => void;
  onStart: (content: FitnessContent) => void;
}

export const ContentDetailPage: React.FC<Props> = ({ content, onClose, onStart }) => {
  // Prevent body scroll when open
  useEffect(() => {
    if (content) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [content]);

  if (!content) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          backgroundColor: '#fff',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {/* Hero Section with Parallax Feel */}
        <div style={{ position: 'relative', height: '55vh', width: '100%' }}>
          <div 
            style={{ 
              position: 'absolute', 
              inset: 0, 
              backgroundImage: `url(${content.cover_image_url || 'https://images.unsplash.com/photo-1518085250985-78e7bbdf6a62?auto=format&fit=crop&q=80'})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }} 
          />
          {/* Gradient overlay to fade into content */}
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,1) 100%)'
            }}
          />

          {/* Floating Actions */}
          <div style={{ position: 'absolute', top: 'env(safe-area-inset-top, 24px)', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <button 
              onClick={() => { triggerHapticLight(); onClose(); }}
              style={{
                width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer'
              }}
            >
              <ChevronLeft size={24} color="#000" />
            </button>
            <button 
              style={{
                width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer'
              }}
            >
              <Share size={20} color="#000" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '0 24px 100px', backgroundColor: '#fff', position: 'relative', zIndex: 10 }}>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {content.difficulty && (
              <span style={{ backgroundColor: '#F1F5F9', color: '#475569', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase' }}>
                {content.difficulty}
              </span>
            )}
            <span style={{ backgroundColor: '#ECFDF5', color: '#059669', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase' }}>
              {content.type}
            </span>
          </div>

          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', lineHeight: 1.1 }}>
            {content.title}
          </h1>
          
          {content.subtitle && (
            <p style={{ fontSize: '18px', color: '#64748B', fontWeight: 500, marginBottom: '24px' }}>
              {content.subtitle}
            </p>
          )}

          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={18} color="#94A3B8" />
              <span style={{ fontSize: '15px', color: '#334155', fontWeight: 500 }}>{content.duration_minutes || '--'} min</span>
            </div>
            {content.calories_estimate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={18} color="#94A3B8" />
                <span style={{ fontSize: '15px', color: '#334155', fontWeight: 500 }}>{content.calories_estimate} kcal</span>
              </div>
            )}
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>Overview</h3>
          <p style={{ fontSize: '16px', lineHeight: 1.6, color: '#475569', marginBottom: '32px' }}>
            {content.description || 'Join this session to build strength, improve flexibility, and connect with your breath. Perfect for all levels looking for a refreshing reset.'}
          </p>

          {content.equipment && content.equipment.length > 0 && (
            <>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Dumbbell size={20} color="#0F172A" /> Equipment Needed
              </h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
                {content.equipment.map((eq, i) => (
                  <span key={i} style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155', fontSize: '14px', fontWeight: 500, padding: '6px 12px', borderRadius: '8px' }}>
                    {eq}
                  </span>
                ))}
              </div>
            </>
          )}

        </div>

        {/* Fixed Bottom CTA */}
        <div 
          style={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            padding: '16px 24px calc(16px + env(safe-area-inset-bottom, 16px))', 
            background: 'linear-gradient(to top, rgba(255,255,255,1) 80%, rgba(255,255,255,0) 100%)',
            zIndex: 20
          }}
        >
          <button
            onClick={() => {
              triggerHapticLight();
              onStart(content);
            }}
            style={{
              width: '100%',
              backgroundColor: content.is_premium ? '#0F172A' : '#10B981',
              color: 'white',
              fontSize: '18px',
              fontWeight: 700,
              padding: '18px',
              borderRadius: '24px',
              border: 'none',
              boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            {content.is_premium ? (
              <><Lock size={20} /> Subscribe to Unlock</>
            ) : (
              <><Play size={20} fill="white" /> Start Session</>
            )}
          </button>
        </div>

      </motion.div>
    </AnimatePresence>
  );
};
