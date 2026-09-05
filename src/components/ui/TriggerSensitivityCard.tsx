import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, Sparkles } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';
import { TriggerItem, computeTriggersForSymptom } from '../../services/TriggerEngine';

export interface TriggerSensitivityCardProps {
  symptom?: string;
  reactionWindow?: string;
  sensitivities?: TriggerItem[];
  ingredients?: TriggerItem[];
  onOpenWholeHealth?: () => void;
}

export const TriggerSensitivityCard: React.FC<TriggerSensitivityCardProps> = ({
  symptom = 'Bloating',
  reactionWindow = 'within 1 day',
  sensitivities,
  ingredients,
  onOpenWholeHealth,
}) => {
  // If data wasn't explicitly passed, compute it via TriggerEngine
  const report = React.useMemo(() => {
    if (sensitivities && ingredients) {
      return { symptom, reactionWindow, sensitivities, ingredients };
    }
    return computeTriggersForSymptom(symptom);
  }, [symptom, reactionWindow, sensitivities, ingredients]);

  const renderIcon = (iconName: string) => {
    if (iconName === 'flask') return '⚗️';
    if (iconName === 'grain') return '🌾';
    if (iconName === 'meat') return '🥩';
    if (iconName === 'wine') return '🍷';
    if (iconName === 'flower') return '🌸';
    if (iconName === 'gem') return '💎';
    return iconName || '🔬';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        width: '100%',
        maxWidth: '480px',
        background: '#FFFFFF',
        borderRadius: '24px',
        border: '1.5px solid #F1F5F9',
        boxShadow: '0 14px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.02)',
        overflow: 'hidden',
        margin: '8px 0',
        fontFamily: 'inherit',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '18px 20px 14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#FFF1F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#E11D48',
          }}
        >
          <Activity size={16} strokeWidth={2.5} />
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#1C1917', letterSpacing: '-0.3px' }}>
            {report.symptom}
          </h4>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
            · {report.reactionWindow}
          </span>
        </div>
      </div>

      {/* Sensitivities Section */}
      <div style={{ padding: '16px 20px 10px 20px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.8px',
            color: '#8E9AAF',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          SENSITIVITIES
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {report.sensitivities.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{renderIcon(item.icon)}</span>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#1C1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                  📅 {item.daysTracked}d
                </span>

                {/* Progress Pill Track */}
                <div
                  style={{
                    width: '38px',
                    height: '8px',
                    background: '#F1F5F9',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.min(100, Math.max(15, item.correlationPercent))}%`,
                      background: 'linear-gradient(90deg, #F43F5E 0%, #E11D48 100%)',
                      borderRadius: '999px',
                    }}
                  />
                </div>

                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#E11D48',
                    minWidth: '44px',
                    textAlign: 'right',
                  }}
                >
                  +{item.correlationPercent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ingredients Section */}
      <div style={{ padding: '12px 20px 18px 20px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.8px',
            color: '#8E9AAF',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          INGREDIENTS
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {report.ingredients.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{renderIcon(item.icon)}</span>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#1C1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                  📅 {item.daysTracked}d
                </span>

                {/* Progress Pill Track */}
                <div
                  style={{
                    width: '38px',
                    height: '8px',
                    background: '#F1F5F9',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.min(100, Math.max(15, item.correlationPercent))}%`,
                      background: 'linear-gradient(90deg, #F43F5E 0%, #E11D48 100%)',
                      borderRadius: '999px',
                    }}
                  />
                </div>

                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#E11D48',
                    minWidth: '44px',
                    textAlign: 'right',
                  }}
                >
                  +{item.correlationPercent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card Action Footer */}
      <div
        style={{
          padding: '12px 20px 16px 20px',
          background: 'linear-gradient(180deg, rgba(255, 241, 242, 0.3) 0%, rgba(255, 241, 242, 0.7) 100%)',
          borderTop: '1px solid #FFE4E6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '11.5px', color: '#9F1239', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Sparkles size={13} color="#E11D48" /> Clinical Correlation Model
        </span>

        <button
          type="button"
          onClick={() => {
            triggerHapticLight();
            if (onOpenWholeHealth) {
              onOpenWholeHealth();
            } else {
              window.dispatchEvent(new CustomEvent('hc_open_whole_health_modal'));
            }
          }}
          style={{
            background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
            border: 'none',
            color: '#FFFFFF',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '7px 14px',
            borderRadius: '999px',
            boxShadow: '0 4px 12px rgba(255, 107, 74, 0.25)',
          }}
        >
          Whole Health Picture <ArrowRight size={13} />
        </button>
      </div>
    </motion.div>
  );
};
