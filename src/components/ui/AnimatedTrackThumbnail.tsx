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

  // Helper for clean, soft tinted tiles tailored to each track on light theme
  const getTileStyle = (bg: string, borderColor: string): React.CSSProperties => ({
    width: '100%',
    height: '100%',
    background: bg,
    border: `1px solid ${borderColor}`,
    borderRadius: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden'
  });

  // 1. MEDITATE: Vibrant Orange Circle on Soft Peach Tint
  if (id === 'm1' || id.includes('meditate')) {
    return (
      <div style={getTileStyle('#FFF7ED', '#FFEDD5')}>
        <motion.div
          animate={{
            scale: isHovered ? [1.1, 1.24, 1.1] : [1, 1.15, 1]
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            width: size * 0.44,
            height: size * 0.44,
            borderRadius: '50%',
            background: '#FF6400'
          }}
        />
      </div>
    );
  }

  // 2. SLEEP: Rich Purple Crescent Moon & Twinkle Star on Soft Lavender Tint
  if (id === 'mood-0' || id.includes('sleep')) {
    return (
      <div style={getTileStyle('#FAF5FF', '#F3E8FF')}>
        <motion.div
          animate={{
            y: [0, -1.8, 0],
            rotate: isHovered ? [-3, 3, -3] : [0, 0, 0]
          }}
          transition={{
            duration: 3.5,
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
          {/* Crescent Moon */}
          <svg
            width={size * 0.46}
            height={size * 0.46}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              fill="#9333EA"
            />
          </svg>
          {/* Twinkle Star */}
          <motion.div
            animate={{
              scale: [0.75, 1.25, 0.75],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-4px',
              width: size * 0.16,
              height: size * 0.16
            }}
          >
            <svg viewBox="0 0 10 10" width="100%" height="100%">
              <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill="#A855F7" />
            </svg>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // 3. ENERGY / MOVE: Crisp Emerald Double Chevrons on Soft Mint Tint
  if (id === 'mood-2' || id.includes('energy') || id.includes('move')) {
    return (
      <div style={getTileStyle('#ECFDF5', '#D1FAE5')}>
        <motion.div
          animate={{
            x: [0, 2.5, 0]
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width={size * 0.46}
            height={size * 0.46}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
              stroke="#059669"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </div>
    );
  }

  // 4. FOCUS: Bold Sapphire Musical Note on Soft Ice Blue Tint
  if (id === 'mood-1' || (id.includes('focus') && !id.includes('freq'))) {
    return (
      <div style={getTileStyle('#EFF6FF', '#DBEAFE')}>
        <motion.div
          animate={{
            y: [0, -2, 0],
            scale: isHovered ? [1.05, 1.12, 1.05] : [1, 1.05, 1]
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width={size * 0.46}
            height={size * 0.46}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
              fill="#2563EB"
            />
          </svg>
        </motion.div>
      </div>
    );
  }

  // 5. RAIN: Cyan Water Droplet on Soft Mist Tint
  if (id === 'soundscape-0' || id.includes('rain')) {
    return (
      <div style={getTileStyle('#ECFEFF', '#CFFAFE')}>
        <motion.div
          animate={{
            y: [0, 2, 0],
            scale: [1, 1.06, 1]
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width={size * 0.44}
            height={size * 0.44}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
              fill="#0891B2"
            />
          </svg>
        </motion.div>
      </div>
    );
  }

  // 6. FOCUS FREQS: Golden Audio Equalizer Bars on Soft Amber Tint
  if (id === 'soundscape-1' || id.includes('freq')) {
    return (
      <div style={getTileStyle('#FFFBEB', '#FEF3C7')}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            height: size * 0.42
          }}
        >
          <motion.div
            animate={{ scaleY: [0.35, 0.9, 0.35] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '3px', height: '100%', background: '#D97706', borderRadius: '2px', originY: 0.5 }}
          />
          <motion.div
            animate={{ scaleY: [0.85, 0.35, 0.85] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            style={{ width: '3px', height: '100%', background: '#D97706', borderRadius: '2px', originY: 0.5 }}
          />
          <motion.div
            animate={{ scaleY: [0.45, 1, 0.45] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            style={{ width: '3px', height: '100%', background: '#D97706', borderRadius: '2px', originY: 0.5 }}
          />
          <motion.div
            animate={{ scaleY: [0.75, 0.4, 0.75] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
            style={{ width: '3px', height: '100%', background: '#D97706', borderRadius: '2px', originY: 0.5 }}
          />
        </div>
      </div>
    );
  }

  // 7. FOREST AURA: Emerald Botanical Leaf on Soft Sage Tint
  if (id === 'soundscape-2' || id.includes('forest')) {
    return (
      <div style={getTileStyle('#F0FDF4', '#DCFCE7')}>
        <motion.div
          animate={{
            rotate: [-6, 6, -6]
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width={size * 0.46}
            height={size * 0.46}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"
              fill="#059669"
            />
          </svg>
        </motion.div>
      </div>
    );
  }

  // 8. OCEAN WAVES: Azure Ocean Wave on Soft Sky Tint
  return (
    <div style={getTileStyle('#F0F9FF', '#E0F2FE')}>
      <motion.div
        animate={{
          x: [-2.5, 2.5, -2.5]
        }}
        transition={{
          duration: 2.8,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg
          width={size * 0.5}
          height={size * 0.36}
          viewBox="0 0 24 16"
          fill="none"
        >
          <path
            d="M2 6c3-4 6-4 9 0s6 4 9 0M2 12c3-4 6-4 9 0s6 4 9 0"
            stroke="#0284C7"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </div>
  );
};
