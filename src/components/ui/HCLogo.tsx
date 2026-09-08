import React, { useId } from 'react';

export interface HCLogoProps {
  size?: number | string;
  variant?: 'mark' | 'squircle';
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export const HCLogo: React.FC<HCLogoProps> = ({
  size = 32,
  variant = 'mark',
  className = '',
  style = {},
  title = 'HealthChain360.ai Logo',
}) => {
  const uniqueId = useId();
  const maskId = `hc-mask-${uniqueId.replace(/:/g, '')}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1000"
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      role="img"
      aria-label={title}
    >
      <defs>
        <mask id={maskId}>
          {/* Base white surface that keeps everything visible */}
          <rect x="0" y="0" width="1000" height="1000" fill="#ffffff" />
          {/* Knockout wedge that cuts out the H around the C with an exact separation border */}
          <path
            d="M 597.5 500 L 821 642.38 A 265 265 0 1 1 821 357.62 Z"
            fill="#000000"
          />
        </mask>
      </defs>

      {variant === 'squircle' && (
        <rect
          x="50"
          y="50"
          width="900"
          height="900"
          rx="220"
          fill="#FFFFFF"
          stroke="rgba(15, 23, 42, 0.08)"
          strokeWidth="16"
        />
      )}

      {/* Obsidian Slate "H" letter */}
      <g mask={`url(#${maskId})`}>
        {/* Left vertical bar with rounded pill caps */}
        <rect x="153.5" y="196" width="88" height="608" rx="44" fill="#0F172A" />
        {/* Right vertical bar with rounded pill caps */}
        <rect x="348.5" y="196" width="88" height="608" rx="44" fill="#0F172A" />
        {/* Horizontal crossbar */}
        <rect x="197.5" y="456" width="195" height="88" fill="#0F172A" />
      </g>

      {/* Medical Emerald "C" letter */}
      <path
        d="M 727.75 594.63 L 798.95 646.36 A 249 249 0 1 1 798.95 353.64 L 727.75 405.37 A 161 161 0 1 0 727.75 594.63 Z"
        fill="#3D7D5E"
      />
    </svg>
  );
};

export default HCLogo;
