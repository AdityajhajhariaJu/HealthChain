import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Flame, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';

export interface SensitivityItem {
  id: string;
  name: string;
  icon: string;
  daysTracked: number;
  percentage: number;
}

export interface IngredientItem {
  id: string;
  name: string;
  icon: string;
  daysTracked: number;
  percentage: number;
}

export interface SymptomSensitivityCapsuleCardProps {
  symptomName?: string;
  latencyWindow?: string;
  sensitivities?: SensitivityItem[];
  ingredients?: IngredientItem[];
  onOpenDetective?: () => void;
}

const DEFAULT_SENSITIVITIES: SensitivityItem[] = [
  { id: 'histamine', name: 'Histamine', icon: '⚗️', daysTracked: 18, percentage: 42 },
  { id: 'fodmaps', name: 'FODMAPs (Fructans)', icon: '🌾', daysTracked: 14, percentage: 24 },
];

const DEFAULT_INGREDIENTS: IngredientItem[] = [
  { id: 'aged_paneer', name: 'Aged Paneer / Fermented Dairy', icon: '🧀', daysTracked: 12, percentage: 34 },
  { id: 'vinegar_achaar', name: 'Vinegar & Indian Achaar (Pickles)', icon: '🌶️', daysTracked: 9, percentage: 18 },
];

export const SymptomSensitivityCapsuleCard: React.FC<SymptomSensitivityCapsuleCardProps> = ({
  symptomName = 'Bloating & Gastric Distension',
  latencyWindow = 'within 1.5h postprandial',
  sensitivities = DEFAULT_SENSITIVITIES,
  ingredients = DEFAULT_INGREDIENTS,
  onOpenDetective,
}) => {
  return (
    <motion.div
      role="article"
      aria-label={`AI pattern review for ${symptomName}`}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      style={{
        background: '#FFFFFF',
        borderRadius: '22px',
        border: '1.5px solid #CCFBF1',
        boxShadow: '0 8px 24px rgba(13, 148, 136, 0.07)',
        overflow: 'hidden',
        margin: '10px 0',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#0D9488',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={16} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              {symptomName}
            </div>
            <div style={{ fontSize: '11px', color: '#0F766E', fontWeight: 600 }}>
              ⚡ Latency: {latencyWindow}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '7px', alignItems: 'flex-start', padding: '9px 10px', marginBottom: '13px', borderRadius: '11px', background: '#FFF7F2', border: '1px solid #F8D8C6', color: '#9A3412' }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          <span style={{ fontSize: '11px', lineHeight: 1.45 }}><strong>AI pattern review.</strong> Percentages describe overlap in available logs, not probability, sensitivity testing, or cause. Confirm important concerns with a clinician.</span>
        </div>
        {/* Section: Sensitivities */}
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
          POSSIBLE PATTERN GROUPS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {sensitivities.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
                <span style={{ fontSize: '14px' }}>{s.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{s.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, background: '#F1F5F9', padding: '2px 6px', borderRadius: '6px' }}>
                  {s.daysTracked}d
                </span>
                <div role="progressbar" aria-label={`${s.name} overlap in available logs`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.percentage} style={{ width: '60px', height: '6px', borderRadius: '999px', background: '#E2E8F0', overflow: 'hidden' }}>
                  <div style={{ width: `${s.percentage}%`, height: '100%', background: '#0D9488', borderRadius: '999px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F766E', minWidth: '38px', textAlign: 'right' }}>
                  {s.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Section: Ingredients */}
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
          INGREDIENTS OBSERVED ALONGSIDE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
          {ingredients.map((ing) => (
            <div key={ing.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
                <span style={{ fontSize: '14px' }}>{ing.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{ing.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, background: '#F1F5F9', padding: '2px 6px', borderRadius: '6px' }}>
                  {ing.daysTracked}d
                </span>
                <div role="progressbar" aria-label={`${ing.name} overlap in available logs`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={ing.percentage} style={{ width: '60px', height: '6px', borderRadius: '999px', background: '#E2E8F0', overflow: 'hidden' }}>
                  <div style={{ width: `${ing.percentage}%`, height: '100%', background: '#D97706', borderRadius: '999px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#B45309', minWidth: '38px', textAlign: 'right' }}>
                  {ing.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        {onOpenDetective && (
          <button
            type="button"
            onClick={() => {
              triggerHapticSelection();
              onOpenDetective();
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '12px',
              background: '#F0FDFA',
              border: '1.5px solid #99F6E4',
              color: '#0F766E',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <span>Explore in Connection Detective</span>
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
