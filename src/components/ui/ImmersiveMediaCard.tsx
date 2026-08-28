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
  aspectRatio = 'square',
  onClick,
  children
}: ImmersiveMediaCardProps) {
  
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    wide: 'aspect-[21/9]'
  };

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      onClick={() => {
        triggerHapticLight();
        if (onClick) onClick();
      }}
      className={`relative overflow-hidden rounded-3xl cursor-pointer shadow-lg ${aspectClasses[aspectRatio]} flex-shrink-0`}
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minWidth: aspectRatio === 'wide' ? '300px' : aspectRatio === 'video' ? '280px' : '180px',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
      
      <div className="absolute top-3 right-3 flex gap-2">
        {isPremium && (
          <div className="bg-black/40 backdrop-blur-md text-white p-1.5 rounded-full">
            <Lock size={14} />
          </div>
        )}
      </div>

      <div className="absolute top-3 left-3 flex gap-2">
        {tags.map(tag => (
          <span key={tag} className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
            {tag}
          </span>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 z-10 flex flex-col justify-end">
        {subtitle && <p className="text-white/80 text-xs font-medium mb-1 uppercase tracking-wide">{subtitle}</p>}
        <h3 className="text-white font-bold text-lg leading-tight mb-1">{title}</h3>
        {duration && (
          <p className="text-white/60 text-xs flex items-center gap-1">
            {duration}
          </p>
        )}
        {children}
      </div>
    </motion.div>
  );
}