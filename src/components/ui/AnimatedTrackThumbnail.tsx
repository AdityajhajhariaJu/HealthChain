import React from 'react';
import { motion } from 'framer-motion';

export interface AnimatedTrackThumbnailProps {
  trackId: string;
  size?: number;
  isHovered?: boolean;
}

export const AnimatedTrackThumbnail: React.FC<AnimatedTrackThumbnailProps> = ({
  trackId,
  size = 44,
  isHovered = false
}) => {
  const id = trackId.toLowerCase();

  // 1. MEDITATE (Headspace-Inspired Iconic Warm Breathing Sun Orb)
  if (id === 'm1' || id.includes('meditate')) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #18110D 0%, #29150B 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Soft Ambient Radiance Aura */}
        <motion.div
          animate={{
            scale: [0.9, 1.3, 0.9],
            opacity: [0.35, 0.75, 0.35]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            position: 'absolute',
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 107, 0, 0.7) 0%, rgba(255, 140, 0, 0) 70%)',
            filter: 'blur(5px)'
          }}
        />

        {/* Delicate Concentric Zen Breathing Ring */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.25, 0.6, 0.25]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            position: 'absolute',
            width: size * 0.62,
            height: size * 0.62,
            borderRadius: '50%',
            border: '1.5px solid rgba(255, 140, 0, 0.65)'
          }}
        />

        {/* Core Iconic Zen Sun Orb */}
        <motion.div
          animate={{
            scale: isHovered ? [1.08, 1.2, 1.08] : [1, 1.14, 1]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            width: size * 0.44,
            height: size * 0.44,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #FFA834 0%, #FF6000 65%, #DD3800 100%)',
            boxShadow: '0 4px 12px rgba(255, 96, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.65)',
            position: 'relative'
          }}
        >
          {/* Specular Glint */}
          <div
            style={{
              position: 'absolute',
              top: '18%',
              left: '22%',
              width: '28%',
              height: '24%',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.75)',
              filter: 'blur(0.4px)'
            }}
          />
        </motion.div>
      </div>
    );
  }

  // 2. SLEEP (Floating Crescent Moon & Shimmering Celestial Stars)
  if (id === 'mood-0' || id.includes('sleep')) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #09091A 0%, #150E2E 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Soft Violet Nebula Glow */}
        <motion.div
          animate={{
            opacity: [0.35, 0.65, 0.35]
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            position: 'absolute',
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%)',
            filter: 'blur(6px)'
          }}
        />

        {/* Floating Crescent Moon */}
        <motion.div
          animate={{
            y: [0, -2.5, 0],
            rotate: [-2, 2, -2]
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width={size * 0.48}
            height={size * 0.48}
            viewBox="0 0 24 24"
            fill="none"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(192, 132, 252, 0.5))' }}
          >
            <defs>
              <linearGradient id="sleepMoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F3E8FF" />
                <stop offset="60%" stopColor="#C084FC" />
                <stop offset="100%" stopColor="#9333EA" />
              </linearGradient>
            </defs>
            <path
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              fill="url(#sleepMoonGrad)"
            />
          </svg>
        </motion.div>

        {/* Twinkling Star 1 (Top Right) */}
        <motion.div
          animate={{
            scale: [0.65, 1.25, 0.65],
            opacity: [0.3, 1, 0.3]
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.2
          }}
          style={{
            position: 'absolute',
            top: '20%',
            right: '22%',
            width: size * 0.16,
            height: size * 0.16
          }}
        >
          <svg viewBox="0 0 10 10" width="100%" height="100%">
            <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill="#E9D5FF" />
          </svg>
        </motion.div>

        {/* Twinkling Star 2 (Bottom Left, Subtle) */}
        <motion.div
          animate={{
            scale: [0.5, 1.15, 0.5],
            opacity: [0.2, 0.85, 0.2]
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1.1
          }}
          style={{
            position: 'absolute',
            bottom: '24%',
            left: '20%',
            width: size * 0.12,
            height: size * 0.12
          }}
        >
          <svg viewBox="0 0 10 10" width="100%" height="100%">
            <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill="#DDD6FE" />
          </svg>
        </motion.div>
      </div>
    );
  }

  // 3. FOCUS (Electric Cobalt Musical Note & Rhythmic Soundwave Pulse)
  if (id === 'mood-1' || id.includes('focus') && !id.includes('freq')) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #070E22 0%, #0E1D45 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Ambient Azure Backlight */}
        <motion.div
          animate={{
            opacity: [0.35, 0.7, 0.35],
            scale: [0.95, 1.25, 0.95]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            position: 'absolute',
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.45) 0%, transparent 70%)',
            filter: 'blur(5px)'
          }}
        />

        {/* Rhythmic Musical Note */}
        <motion.div
          animate={{
            y: [0, -1.8, 0],
            scale: isHovered ? [1.08, 1.16, 1.08] : [1, 1.06, 1]
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1
          }}
        >
          <svg
            width={size * 0.46}
            height={size * 0.46}
            viewBox="0 0 24 24"
            fill="none"
            style={{ filter: 'drop-shadow(0 2px 10px rgba(59, 130, 246, 0.65))' }}
          >
            <defs>
              <linearGradient id="focusNoteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="50%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
            </defs>
            <path
              d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
              fill="url(#focusNoteGrad)"
            />
          </svg>
        </motion.div>

        {/* Acoustic Clarity Equalizer Bars (Floating on left edge) */}
        <div style={{ position: 'absolute', right: '16%', bottom: '26%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: '14px' }}>
          <motion.div
            animate={{ scaleY: [0.35, 0.95, 0.35] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '2px', height: '100%', background: '#60A5FA', borderRadius: '1px', originY: 1 }}
          />
          <motion.div
            animate={{ scaleY: [0.8, 0.3, 0.8] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
            style={{ width: '2px', height: '100%', background: '#93C5FD', borderRadius: '1px', originY: 1 }}
          />
          <motion.div
            animate={{ scaleY: [0.45, 1, 0.45] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            style={{ width: '2px', height: '100%', background: '#3B82F6', borderRadius: '1px', originY: 1 }}
          />
        </div>
      </div>
    );
  }

  // 4. ENERGY (Energetic Emerald Forward Momentum Chevrons & Vitality Pulse)
  if (id === 'mood-2' || id.includes('energy')) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #041B12 0%, #082E20 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Ambient Emerald Radiance */}
        <motion.div
          animate={{
            scale: [0.9, 1.3, 0.9],
            opacity: [0.35, 0.7, 0.35]
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            position: 'absolute',
            width: size * 0.75,
            height: size * 0.75,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, transparent 70%)',
            filter: 'blur(5px)'
          }}
        />

        {/* Headspace-Inspired Dual Forward Chevrons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <motion.svg
            animate={{
              x: [0, 2.5, 0],
              scale: isHovered ? [1.06, 1.15, 1.06] : [1, 1.08, 1]
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            width={size * 0.46}
            height={size * 0.46}
            viewBox="0 0 24 24"
            fill="none"
            style={{ filter: 'drop-shadow(0 3px 10px rgba(16, 185, 129, 0.55))' }}
          >
            <defs>
              <linearGradient id="energyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6EE7B7" />
                <stop offset="60%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            {/* Primary Fast Forward Arrow */}
            <path
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
              stroke="url(#energyGrad)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </div>
      </div>
    );
  }

  // 5. RAIN (Ambient Mist • Animated Falling Raindrops & Ripples)
  if (id === 'soundscape-0' || id.includes('rain')) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #071926 0%, #0E283C 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Soft Cyan Mist Backlight */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at 50% 30%, rgba(6, 182, 212, 0.25) 0%, transparent 70%)'
          }}
        />

        {/* Rain Cloud Header */}
        <motion.div
          animate={{ y: [0, -1, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '16%' }}
        >
          <svg width={size * 0.44} height={size * 0.3} viewBox="0 0 24 24" fill="none">
            <path
              d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
              fill="rgba(165, 243, 252, 0.75)"
            />
          </svg>
        </motion.div>

        {/* Cascading Raindrop Streaks */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {/* Drop 1 */}
          <motion.div
            animate={{ y: [size * 0.35, size * 0.85], opacity: [0, 1, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              left: '32%',
              width: '1.5px',
              height: '6px',
              background: '#22D3EE',
              borderRadius: '1px'
            }}
          />
          {/* Drop 2 */}
          <motion.div
            animate={{ y: [size * 0.35, size * 0.85], opacity: [0, 1, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear', delay: 0.35 }}
            style={{
              position: 'absolute',
              left: '50%',
              width: '1.5px',
              height: '7px',
              background: '#67E8F9',
              borderRadius: '1px'
            }}
          />
          {/* Drop 3 */}
          <motion.div
            animate={{ y: [size * 0.35, size * 0.85], opacity: [0, 1, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear', delay: 0.7 }}
            style={{
              position: 'absolute',
              left: '68%',
              width: '1.5px',
              height: '6px',
              background: '#22D3EE',
              borderRadius: '1px'
            }}
          />
        </div>

        {/* Ambient Ground Ripple */}
        <motion.div
          animate={{ scaleX: [0.75, 1.25, 0.75], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            bottom: '12%',
            width: size * 0.42,
            height: '2px',
            borderRadius: '999px',
            background: 'rgba(34, 211, 238, 0.7)',
            filter: 'blur(0.5px)'
          }}
        />
      </div>
    );
  }

  // 6. FOCUS FREQS (432 Hz Binaural • Concentric Cymatics Rings & Harmonic Waveform)
  if (id === 'soundscape-1' || id.includes('freq')) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0E1017 0%, #1A1D27 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Ambient Amber Cymatics Glow */}
        <motion.div
          animate={{
            scale: [0.85, 1.3, 0.85],
            opacity: [0.3, 0.65, 0.3]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            position: 'absolute',
            width: size * 0.75,
            height: size * 0.75,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, transparent 70%)',
            filter: 'blur(6px)'
          }}
        />

        {/* Outer Cymatics Acoustic Ring */}
        <motion.div
          animate={{
            scale: [1, 1.35, 1],
            opacity: [0.5, 0.15, 0.5]
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.3
          }}
          style={{
            position: 'absolute',
            width: size * 0.64,
            height: size * 0.64,
            borderRadius: '50%',
            border: '1.2px solid rgba(251, 191, 36, 0.45)'
          }}
        />

        {/* Inner Cymatics Frequency Ring */}
        <motion.div
          animate={{
            scale: [0.85, 1.18, 0.85],
            opacity: [0.4, 0.85, 0.4]
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            position: 'absolute',
            width: size * 0.46,
            height: size * 0.46,
            borderRadius: '50%',
            border: '1.5px solid rgba(245, 158, 11, 0.75)'
          }}
        />

        {/* Central 432 Hz Radiant Core Node */}
        <motion.div
          animate={{
            scale: [0.9, 1.15, 0.9]
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            width: size * 0.22,
            height: size * 0.22,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #FDE68A 0%, #F59E0B 70%, #D97706 100%)',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.65)'
          }}
        />
      </div>
    );
  }

  // 7. FOREST AURA (Biophilic Swaying Leaf & Drifting Firefly Spores)
  if (id === 'soundscape-2' || id.includes('forest')) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #051A10 0%, #0A2E1D 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Soft Forest Emerald Backlight */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.28) 0%, transparent 70%)'
          }}
        />

        {/* Gentle Swaying Biophilic Leaf */}
        <motion.div
          animate={{
            rotate: [-6, 6, -6],
            y: [0, -1.5, 0]
          }}
          transition={{
            duration: 3.8,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1
          }}
        >
          <svg
            width={size * 0.44}
            height={size * 0.44}
            viewBox="0 0 24 24"
            fill="none"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(16, 185, 129, 0.5))' }}
          >
            <defs>
              <linearGradient id="forestLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A7F3D0" />
                <stop offset="50%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            <path
              d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"
              fill="url(#forestLeafGrad)"
            />
          </svg>
        </motion.div>

        {/* Drifting Firefly Spore 1 */}
        <motion.div
          animate={{
            y: [size * 0.25, -size * 0.2],
            x: [0, 3, 0],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeOut',
            delay: 0.3
          }}
          style={{
            position: 'absolute',
            bottom: '25%',
            left: '28%',
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: '#FDE047',
            boxShadow: '0 0 6px #FDE047'
          }}
        />

        {/* Drifting Firefly Spore 2 */}
        <motion.div
          animate={{
            y: [size * 0.25, -size * 0.2],
            x: [0, -3, 0],
            opacity: [0, 0.85, 0]
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeOut',
            delay: 1.2
          }}
          style={{
            position: 'absolute',
            bottom: '22%',
            right: '25%',
            width: '2.5px',
            height: '2.5px',
            borderRadius: '50%',
            background: '#A7F3D0',
            boxShadow: '0 0 5px #A7F3D0'
          }}
        />
      </div>
    );
  }

  // 8. OCEAN WAVES (Deep Delta Tide • Undulating Oceanic Surf Crests)
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #031427 0%, #082645 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Deep Marine Backlight */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 50% 30%, rgba(14, 165, 233, 0.3) 0%, transparent 70%)'
        }}
      />

      {/* Distant Lunar Crest */}
      <motion.div
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '16%', right: '22%', width: '6px', height: '6px', borderRadius: '50%', background: '#BAE6FD', boxShadow: '0 0 8px #38BDF8' }}
      />

      {/* Layer 1 (Background Wave) */}
      <motion.div
        animate={{
          x: [3, -3, 3],
          scaleY: [1.06, 0.94, 1.06]
        }}
        transition={{
          duration: 4.2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{ position: 'absolute', bottom: '26%', width: '120%' }}
      >
        <svg width="100%" height={size * 0.28} viewBox="0 0 100 24" preserveAspectRatio="none">
          <path
            d="M0 12 Q 25 4 50 12 T 100 12 L 100 24 L 0 24 Z"
            fill="rgba(2, 132, 199, 0.55)"
          />
        </svg>
      </motion.div>

      {/* Layer 2 (Foreground Wave) */}
      <motion.div
        animate={{
          x: [-3, 3, -3],
          scaleY: [0.94, 1.08, 0.94]
        }}
        transition={{
          duration: 3.6,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{ position: 'absolute', bottom: '16%', width: '120%' }}
      >
        <svg width="100%" height={size * 0.32} viewBox="0 0 100 24" preserveAspectRatio="none">
          <path
            d="M0 12 Q 25 18 50 12 T 100 12 L 100 24 L 0 24 Z"
            fill="rgba(56, 189, 248, 0.85)"
          />
        </svg>
      </motion.div>
    </div>
  );
};
