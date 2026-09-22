import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Activity } from 'lucide-react';

export type CalmCategoryKey = 
  | 'cardio'
  | 'metabolic'
  | 'gastro'
  | 'neuro'
  | 'respiratory'
  | 'endocrine'
  | 'kinetic'
  | 'immune_allergy'
  | 'medication'
  | 'vitality'
  | 'sleep'
  | 'systemic';

export interface CalmThemeColors {
  color1: string; // Vibrant pigment
  color2: string; // Light pastel tint for tranquil, calm luminous gradient
  bg: string;     // Soft pastel background for selected state
  border: string; // Refined active border
  text: string;   // High-contrast legible text
  shadow: string; // Soft ambient colored glow
}

export const CALM_CLINICAL_THEMES: Record<CalmCategoryKey, CalmThemeColors> = {
  cardio: {
    color1: '#FB7185',
    color2: '#FFE4E6',
    bg: '#FFF1F2',
    border: '#FDA4AF',
    text: '#9F1239',
    shadow: 'rgba(251, 113, 133, 0.28)',
  },
  metabolic: {
    color1: '#0D9488',
    color2: '#CCFBF1',
    bg: '#F0FDFA',
    border: '#99F6E4',
    text: '#115E59',
    shadow: 'rgba(13, 148, 136, 0.28)',
  },
  gastro: {
    color1: '#10B981',
    color2: '#D1FAE5',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    text: '#065F46',
    shadow: 'rgba(16, 185, 129, 0.28)',
  },
  neuro: {
    color1: '#8B5CF6',
    color2: '#EDE9FE',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    text: '#5B21B6',
    shadow: 'rgba(139, 92, 246, 0.28)',
  },
  respiratory: {
    color1: '#0284C7',
    color2: '#E0F2FE',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    text: '#0369A1',
    shadow: 'rgba(2, 132, 199, 0.28)',
  },
  endocrine: {
    color1: '#EC4899',
    color2: '#FCE7F3',
    bg: '#FDF2F8',
    border: '#FBCFE8',
    text: '#9D174D',
    shadow: 'rgba(236, 72, 153, 0.28)',
  },
  kinetic: {
    color1: '#F59E0B',
    color2: '#FEF3C7',
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#92400E',
    shadow: 'rgba(245, 158, 11, 0.28)',
  },
  immune_allergy: {
    color1: '#E11D48',
    color2: '#FFE4E6',
    bg: '#FFF1F2',
    border: '#FECDD3',
    text: '#BE123C',
    shadow: 'rgba(225, 29, 72, 0.28)',
  },
  medication: {
    color1: '#7C3AED',
    color2: '#EDE9FE',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    text: '#5B21B6',
    shadow: 'rgba(124, 58, 237, 0.28)',
  },
  vitality: {
    color1: '#0284C7',
    color2: '#E0F2FE',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    text: '#0369A1',
    shadow: 'rgba(2, 132, 199, 0.28)',
  },
  sleep: {
    color1: '#6366F1',
    color2: '#E0E7FF',
    bg: '#EEF2FF',
    border: '#C7D2FE',
    text: '#3730A3',
    shadow: 'rgba(99, 102, 241, 0.28)',
  },
  systemic: {
    color1: '#F59E0B',
    color2: '#FEF3C7',
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#92400E',
    shadow: 'rgba(245, 158, 11, 0.28)',
  }
};

/**
 * CalmBadge: A 50% circle or rounded squircle icon container with a soft luminous gradient
 * and ambient colored shadow (no specular glare, no bevel, no drop-shadow).
 */
export const CalmBadge: React.FC<{
  icon?: any;
  category?: CalmCategoryKey;
  size?: number;
  shape?: 'circle' | 'squircle';
  color1?: string;
  color2?: string;
  shadow?: string;
}> = ({
  icon: IconComp = Activity,
  category = 'systemic',
  size = 20,
  shape = 'circle',
  color1,
  color2,
  shadow,
}) => {
  const theme = CALM_CLINICAL_THEMES[category] || CALM_CLINICAL_THEMES.systemic;
  const c1 = color1 || theme.color1;
  const c2 = color2 || theme.color2;
  const sColor = shadow || `${c1}35`;
  const iconSize = Math.max(11, Math.round(size * 0.58));
  const borderRadius = shape === 'circle' ? '50%' : `${Math.round(size * 0.35)}px`;

  // If icon is a string (e.g. emoji or text symbol)
  const isStringIcon = typeof IconComp === 'string';

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
        boxShadow: `0 2px 8px ${sColor}`,
        color: '#FFFFFF',
        transition: 'all 0.18s ease',
      }}
    >
      {isStringIcon ? (
        <span style={{ fontSize: `${Math.round(size * 0.55)}px`, lineHeight: 1 }}>{IconComp}</span>
      ) : (
        <IconComp size={iconSize} color="#FFFFFF" strokeWidth={2.2} />
      )}
    </div>
  );
};

export interface CalmApothecaryCapsuleProps {
  label: string;
  subtitle?: string;
  category?: CalmCategoryKey;
  icon?: any;
  isSelected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  size?: 'sm' | 'md';
  shape?: 'pill' | 'squircle';
  badgeShape?: 'circle' | 'squircle';
  color1?: string;
  color2?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * CalmApothecaryCapsule: The standardized clinical item capsule button used for picking
 * symptoms, medications, conditions, allergies, and health triggers.
 */
export const CalmApothecaryCapsule: React.FC<CalmApothecaryCapsuleProps> = ({
  label,
  subtitle,
  category = 'systemic',
  icon,
  isSelected = false,
  onClick,
  onRemove,
  size = 'md',
  shape = 'pill',
  badgeShape = 'circle',
  color1,
  color2,
  disabled = false,
  className = '',
  style = {},
}) => {
  const theme = CALM_CLINICAL_THEMES[category] || CALM_CLINICAL_THEMES.systemic;
  const c1 = color1 || theme.color1;
  const c2 = color2 || theme.color2;

  const isSmall = size === 'sm';
  const badgeSize = isSmall ? 18 : 22;
  const borderRadius = shape === 'pill' ? '999px' : '14px';

  const isRemovable = Boolean(onRemove);
  const Component = isRemovable ? motion.div : motion.button;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick && !disabled) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Component
      type={isRemovable ? undefined : 'button'}
      role={isRemovable ? (onClick ? 'button' : 'group') : undefined}
      tabIndex={isRemovable && onClick ? 0 : undefined}
      onKeyDown={isRemovable && onClick ? handleKeyDown : undefined}
      whileHover={disabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      onClick={disabled ? undefined : onClick}
      aria-pressed={isSelected}
      aria-label={subtitle ? `${label} (${subtitle})` : label}
      disabled={isRemovable ? undefined : disabled}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '6px' : '8px',
        padding: isSmall ? '6px 11px' : '7px 14px',
        borderRadius,
        border: isSelected ? `1.5px solid ${theme.border}` : '1px solid #E2E8F0',
        background: isSelected 
          ? `linear-gradient(135deg, ${theme.bg} 0%, #FFFFFF 100%)` 
          : '#FFFFFF',
        color: isSelected ? theme.text : '#1C1917',
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: isSelected 
          ? `0 3px 12px ${theme.shadow}` 
          : '0 2px 6px rgba(0, 0, 0, 0.03)',
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        textAlign: 'left',
        flexShrink: 0,
        maxWidth: '100%',
        ...style,
      }}
    >
      {icon && (
        <CalmBadge 
          icon={icon} 
          category={category} 
          size={badgeSize} 
          shape={badgeShape}
          color1={c1} 
          color2={c2} 
        />
      )}

      <div style={{ textAlign: 'left', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontSize: isSmall ? '12px' : '13px',
            fontWeight: isSelected ? 800 : 700,
            color: isSelected ? theme.text : '#1C1917',
            display: 'block',
            letterSpacing: '-0.1px',
          }}
        >
          {label}
        </span>
        {subtitle && (
          <span
            style={{
              fontSize: isSmall ? '10px' : '10.5px',
              fontWeight: 500,
              color: isSelected ? theme.color1 : '#78716C',
              display: 'block',
            }}
          >
            {subtitle}
          </span>
        )}
      </div>

      {isSelected && !onRemove && (
        <div
          style={{
            width: isSmall ? '15px' : '17px',
            height: isSmall ? '15px' : '17px',
            borderRadius: '50%',
            background: c1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            marginLeft: '2px',
            flexShrink: 0,
            boxShadow: `0 2px 6px ${theme.shadow}`,
          }}
        >
          <Check size={isSmall ? 9 : 11} strokeWidth={3.5} />
        </div>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label}`}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '2px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isSelected ? theme.text : '#94A3B8',
            marginLeft: '2px',
            flexShrink: 0,
            opacity: 0.75,
            borderRadius: '50%',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.75'; }}
        >
          <X size={isSmall ? 11 : 13} strokeWidth={2.5} />
        </button>
      )}
    </Component>
  );
};
