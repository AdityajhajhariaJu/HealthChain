import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, Activity, Sparkles, Plus, Check, ChevronRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { getItemSync, setItemSync } from '../../services/storage';

export interface SymptomTrialState {
  trialName: string;
  targetSymptom: string;
  dayCount: number;
  totalDays: number;
  baselineSeverity: number;
  currentSeverity: number;
  phase: string;
  avoidedTriggers: string;
  nextMilestone: string;
  history: { day: number; severity: number; date: string }[];
}

const DEFAULT_TRIAL: SymptomTrialState = {
  trialName: 'Monash Low-FODMAP Protocol',
  targetSymptom: 'Gut Bloating & Lethargy',
  dayCount: 5,
  totalDays: 28,
  baselineSeverity: 7.6,
  currentSeverity: 3.8,
  phase: 'Phase 2: Deep Symptom Regression',
  avoidedTriggers: 'Alliums (Garlic, Onion), Polyols & Lactose',
  nextMilestone: 'Day 8 Rechallenge: Single-Food Garlic Provocation Test',
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
  const navigate = useNavigate();
  const [trial, setTrial] = useState<SymptomTrialState>(() => {
    try {
      const stored = getItemSync('healthchain_active_symptom_trial');
      return stored ? { ...DEFAULT_TRIAL, ...JSON.parse(stored) } : DEFAULT_TRIAL;
    } catch {
      return DEFAULT_TRIAL;
    }
  });

  const [isLogging, setIsLogging] = useState(false);
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

  const handleOpenSuite = () => {
    triggerHapticSelection();
    navigate('/app/dietician', { state: { tab: 'elimination' } });
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label="Active Clinical Elimination Protocol - Click to open 4-week suite"
      whileHover={{ y: -2, scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
      onClick={handleOpenSuite}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpenSuite();
        }
      }}
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(240, 253, 250, 0.4) 100%)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(13, 148, 136, 0.25)',
        boxShadow: '0 16px 36px rgba(13, 148, 136, 0.08), inset 0 1px 0 rgba(255,255,255,0.95)',
        borderRadius: isMobile ? '20px' : '28px',
        padding: isMobile ? '14px 16px' : '18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        gridColumn: 'span 2',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top Row: Protocol Title, Phase, and Flare Delta Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: isMobile ? '36px' : '40px',
              height: isMobile ? '36px' : '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0
            }}
          >
            <TrendingDown size={isMobile ? 18 : 20} strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ fontSize: isMobile ? '15px' : '16px', fontWeight: 800, margin: 0, color: '#0F172A', letterSpacing: '-0.3px' }}>
                {trial.trialName}
              </h4>
              <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: 800, background: 'rgba(13, 148, 136, 0.1)', padding: '2px 7px', borderRadius: '999px' }}>
                Day {trial.dayCount}/{trial.totalDays}
              </span>
            </div>
            <p style={{ fontSize: '11.5px', color: '#64748B', margin: '2px 0 0', fontWeight: 600 }}>
              {trial.phase}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            className="micro-badge tabular-nums"
            style={{
              background: 'linear-gradient(135deg, #DCFCE7 0%, #D1FAE5 100%)',
              color: '#065F46',
              border: '1px solid #A7F3D0',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.3px'
            }}
          >
            -{reductionPercent}% FLARE DELTA ({trial.baselineSeverity} ➔ <strong style={{ color: '#059669' }}>{trial.currentSeverity}/10</strong>)
          </div>
        </div>
      </div>

      {/* Middle Row: Active Guardrails & Provocation Countdown */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          borderRadius: '12px',
          padding: '8px 12px',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ fontSize: '12px', color: '#334155' }}>
          <strong style={{ color: '#DC2626' }}>Strict Avoidance:</strong> {trial.avoidedTriggers}
        </div>
        <div style={{ fontSize: '11px', color: '#0D9488', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={12} />
          <span>{trial.nextMilestone}</span>
        </div>
      </div>

      {/* Bottom Row: Quick Log Check-In + Open Suite Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div onClick={(e) => e.stopPropagation()}>
          {!isLogging && !justLogged && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHapticLight();
                setIsLogging(true);
              }}
              aria-label="Log today symptom severity"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(13, 148, 136, 0.1)',
                border: '1px solid rgba(13, 148, 136, 0.3)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#0F766E',
                cursor: 'pointer'
              }}
            >
              <Activity size={12} />
              <span>Log Today's Symptom Score</span>
            </button>
          )}

          {justLogged && (
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Check size={13} /> Severity updated & outcome recalculated
            </span>
          )}

          {isLogging && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FFFFFF',
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Score:</span>
              {[2, 4, 6, 8].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickLog(val)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
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
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '11px', cursor: 'pointer', padding: '0 4px' }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#0D9488' }}>
          <span>View 4-Week Protocol & Rechallenge Timeline</span>
          <ChevronRight size={14} />
        </div>
      </div>
    </motion.div>
  );
};

