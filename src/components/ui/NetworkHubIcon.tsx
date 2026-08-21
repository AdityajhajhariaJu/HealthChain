import React from 'react';
import { LucideProps } from 'lucide-react';

export const NetworkHubIcon = ({ size = 24, color = "currentColor", strokeWidth = 2, ...props }: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Center */}
    <circle cx="12" cy="12" r="2" />
    {/* Outer 6 nodes */}
    <circle cx="12" cy="4" r="2" />
    <circle cx="18.9" cy="8" r="2" />
    <circle cx="18.9" cy="16" r="2" />
    <circle cx="12" cy="20" r="2" />
    <circle cx="5.1" cy="16" r="2" />
    <circle cx="5.1" cy="8" r="2" />
    {/* Connections */}
    <line x1="12" y1="10" x2="12" y2="6" />
    <line x1="13.7" y1="11" x2="17.2" y2="9" />
    <line x1="13.7" y1="13" x2="17.2" y2="15" />
    <line x1="12" y1="14" x2="12" y2="18" />
    <line x1="10.3" y1="13" x2="6.8" y2="15" />
    <line x1="10.3" y1="11" x2="6.8" y2="9" />
  </svg>
);
