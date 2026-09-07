import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, Activity, Sparkles, Plus, Check } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { getItemSync, setItemSync } from '../../services/storage';

export interface SymptomTrialState {
  trialName: string;
  targetSymptom: string;
  dayCount: number;
  totalDays: number;
  baselineSeverity: number;
  currentSeverity: number;
  history: { day: number; severity: number; date: string }[];
}

const DEFAULT_TRIAL: SymptomTrialState = {
  trialName: 'Targeted Elimination',
  targetSymptom: 'Gut Bloating & Lethargy',
  dayCount: 5,
  totalDays: 7,
  baselineSeverity: 7.6,
  currentSeverity: 3.8,
  history: [
    { day: 1, severity: 7.6, date: '2026-09-03' },
    { day: 2, severity: 6.8, date: '2026-09-04' },
    { day: 3, severity: 5.2, date: '2026-09-05' },
    { day: 4, severity: 4.4, date: '2026-09-06' },
    { day: 5, severity: 3.8, date: '2026-09-07' }
  ]
};

export const TherapeuticOutcomeCard: React.FC = () => {
  const isMobile = useIsMobile();
  const [trial, setTrial] = useState<SymptomTrialState>(() => {
    try {
      const stored = getItemSync('healthchain_active_symptom_trial');
      return stored ? JSON.parse(stored) : DEFAULT_TRIAL;
    } catch {
      return DEFAULT_TRIAL;
    }
  });

  const [isLogging, setIsLogging] = useState(false);
  const [logScore, setLogScore] = useState(trial.currentSeverity);
  const [justLogged, setJustLogged] = useState(false);

  const reductionPercent = Math.max(
    0,
    Math.round(((trial.baselineSeverity - trial.currentSeverity) / trial.baselineSeverity) * 100)
  );

  const handleQuickLog = (score: number) => {
    triggerHapticSuccess();
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedHistory = [...trial.history, { day: trial.dayCount, severity: score, date: todayStr }];
    const updated: SymptomTrialState = {
      ...trial,
      currentSeverity: score,
      history: updatedHistory
    };
    setTrial(updated);
    setItemSync('healthchain_active_symptom_trial', JSON.stringify(updated));
    setJustLogged(true);
    setIsLogging(false);
    setTimeout(() => setJustLogged(false), 2500);
  };

  return (
    <motion.div
      role="region"
      aria-label="Active Symptom Protocol and Outcome Delta"
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.15) 100%)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(255, 255, 255, 0.85)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.07), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 30px rgba(255,255,255,0.4)',
        borderRadius: isMobile ? '24px' : '32px',
        padding: isMobile ? '14px 14px' : '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: isMobile ? '125px' : '140px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top Row: Icon & Outcome Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div
          style={{
            width: isMobile ? '38px' : '44px',
            height: isMobile ? '38px' : '44px',
            minWidth: isMobile ? '38px' : '44px',
            minHeight: isMobile ? '38px' : '44px',
            flexShrink: 0,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF'
          }}
        >
          <TrendingDown size={isMobile ? 18 : 20} strokeWidth={2.4} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            className="micro-badge tabular-nums"
            style={{
              background: 'linear-gradient(135deg, #DCFCE7 0%, #D1FAE5 100%)',
              color: '#065F46',
              border: '1px solid #A7F3D0',
              padding: '3px 8px',
              borderRadius: '999px',
              fontSize: '10.5px',
              fontWeight: 800,
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            -{reductionPercent}% FLARE DELTA
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
          <h4
            style={{
              fontSize: isMobile ? '14px' : '15px',
              fontWeight: 800,
              margin: '0 0 2px',
              color: '#0F172A',
              lineHeight: 1.25,
              letterSpacing: '-0.3px'
            }}
          >
            {trial.trialName}
          </h4>
          <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
            Day {trial.dayCount}/{trial.totalDays}
          </span>
        </div>

        <p
          style={{
            fontSize: isMobile ? '11px' : '12px',
            color: '#64748B',
            margin: '0 0 6px',
            fontWeight: 500,
            lineHeight: 1.3
          }}
        >
          {trial.targetSymptom}: {trial.baselineSeverity}/10 ➔ <strong style={{ color: '#059669' }}>{trial.currentSeverity}/10</strong>
        </p>

        {/* Quick Log Affordance */}
        {!isLogging && !justLogged && (
          <button
            type="button"
            data-compact="true"
            onClick={(e) => {
              e.stopPropagation();
              triggerHapticLight();
              setIsLogging(true);
            }}
            aria-label="Log today symptom severity"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.28)',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '10.5px',
              fontWeight: 700,
              color: '#065F46',
              cursor: 'pointer',
              height: 'auto',
              width: 'fit-content'
            }}
          >
            <Activity size={11} />
            <span>Check-in Today</span>
          </button>
        )}

        {justLogged && (
          <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Check size={12} /> Logged & Delta Updated
          </span>
        )}

        {isLogging && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '4px',
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '4px 8px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>Severity:</span>
            {[2, 4, 6, 8].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickLog(val)}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  border: '1px solid #CBD5E1',
                  background: val <= 4 ? '#ECFDF5' : '#FEF2F2',
                  color: val <= 4 ? '#059669' : '#DC2626',
                  cursor: 'pointer'
                }}
              >
                {val}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsLogging(false)}
              style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '10px', cursor: 'pointer', padding: '0 2px' }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
