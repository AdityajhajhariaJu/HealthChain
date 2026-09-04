import React from 'react';
import { motion } from 'framer-motion';
import { Play, Lock } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

interface ImmersiveMediaCardProps {
  title: string;
  subtitle?: string;
  bgImage: string;
  tags?: string[];
  duration?: string;
  isPremium?: boolean;
  layoutId?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'wide';
  onClick?: () => void;
  children?: React.ReactNode;
}

export function ImmersiveMediaCard({
  title,
  subtitle,
  bgImage,
  tags = [],
  duration,
  isPremium,
  layoutId,
  aspectRatio = 'square',
  onClick,
  children
}: ImmersiveMediaCardProps) {
  
  const aspectStyles: Record<string, React.CSSProperties> = {
    square: { aspectRatio: '1 / 1' },
    video: { aspectRatio: '16 / 9' },
    portrait: { aspectRatio: '3 / 4' },
    wide: { aspectRatio: '21 / 9' }
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={title || 'Media card'}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerHapticLight();
          if (onClick) onClick();
        }
      }}
      layoutId={layoutId}
      whileTap={{ scale: 0.96 }}
      onClick={() => {
        triggerHapticLight();
        if (onClick) onClick();
      }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '24px',
        cursor: 'pointer',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        flexShrink: 0,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minWidth: aspectRatio === 'wide' ? '300px' : aspectRatio === 'video' ? '280px' : '180px',
        ...aspectStyles[aspectRatio]
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.2), transparent)',
        pointerEvents: 'none'
      }} />
      
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
        {isPremium && (
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(12px)',
            color: 'white',
            padding: '6px',
            borderRadius: '9999px'
          }}>
            <Lock size={14} />
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 8 }}>
        {tags.map(tag => (
          <span key={tag} style={{
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(12px)',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '4px 8px',
            borderRadius: '9999px'
          }}>
            {tag}
          </span>
        ))}
      </div>

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}>
        {subtitle && <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 500, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{subtitle}</p>}
        <h3 style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', lineHeight: 1.2, margin: '0 0 4px' }}>{title}</h3>
        {duration && (
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            {duration}
          </p>
        )}
        {children}
      </div>
    </motion.div>
  );
}
