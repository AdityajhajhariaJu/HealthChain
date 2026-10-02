import { Activity } from 'lucide-react';
import React from 'react';
import { SYMPTOM_CATEGORY_THEMES } from './clinicalIntakeCatalog';

// Calm, Luminous Apothecary Symptom Badge matching Meds Aesthetic (no glare, no bevel, soft gradient & glow)
export const ClassySymptomBadge: React.FC<{
  icon?: any;
  category?: string;
  size?: number;
  color1?: string;
  color2?: string;
  shadow?: string;
}> = ({ icon: IconComp = Activity, category = 'systemic', size = 22, color1, color2, shadow }) => {
  const theme = SYMPTOM_CATEGORY_THEMES[category] || SYMPTOM_CATEGORY_THEMES.systemic;
  const c1 = color1 || theme.color1;
  const c2 = color2 || theme.color2;
  const sColor = shadow || `${c1}35`;
  const iconSize = Math.max(11, Math.round(size * 0.56));

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '50%',
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
      <IconComp size={iconSize} color="#FFFFFF" strokeWidth={2.2} />
    </div>
  );
};
