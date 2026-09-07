import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, Activity, Sparkles, Plus, Check, ChevronRight, ShieldCheck, Target, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import {
  getActiveTrial,
  logTrialDay,
  startTrial,
  ActiveTrialState,
  ELIMINATION_PROTOCOLS
} from '../../services/TriggerEngine';
import { ClinicalEliminationModal } from './ClinicalEliminationModal';

export const TherapeuticOutcomeCard: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [trial, setTrial] = useState<ActiveTrialState>(() => getActiveTrial() || startTrial('low_histamine'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      const current = getActiveTrial();
      if (current) setTrial(current);
    };
    window.addEventListener('hc_trial_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('hc_trial_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const activeProtocolDef = ELIMINATION_PROTOCOLS.find((p) => p.id === trial.trialId) || ELIMINATION_PROTOCOLS[0];

  const handleQuickLog = (score: number) => {
    triggerHapticSuccess();
    const updated = logTrialDay(score, true, 'Quick score check-in from dashboard');
    setTrial(updated);
    setJustLogged(true);
    setIsLogging(false);
    setTimeout(() => setJustLogged(false), 2500);
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticSelection();
    setIsModalOpen(true);
  };

  return (
    <>
      <motion.div
        role="button"
        tabIndex={0}
        aria-label="Active Clinical Elimination Protocol - Click to manage protocol, rechallenges and outcomes"
        whileHover={{ y: -2, scale: 1.005 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        onClick={handleOpenModal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenModal(e as any);
          }
        }}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(240, 253, 250, 0.45) 100%)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(13, 148, 136, 0.28)',
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
              <Target size={isMobile ? 18 : 20} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ fontSize: isMobile ? '15px' : '16px', fontWeight: 800, margin: 0, color: '#0F172A', letterSpacing: '-0.3px' }}>
                  {activeProtocolDef.name}
                </h4>
                <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: 800, background: 'rgba(13, 148, 136, 0.1)', padding: '2px 7px', borderRadius: '999px' }}>
                  Day {trial.currentDay}/{trial.totalDays}
                </span>
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748B', margin: '2px 0 0', fontWeight: 600 }}>
                Phase 1: Strict Allium Washout ({trial.adherencePercentage}% Adherence)
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
              -{trial.reductionPercent}% SYMPTOM DELTA ({trial.baselineSeverity} ➔ <strong style={{ color: '#059669' }}>{trial.currentSeverity}/10</strong>)
            </div>
          </div>
        </div>

        {/* Middle Row: Active Guardrail & Rechallenge Countdown */}
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
            <strong style={{ color: '#DC2626' }}>Strict Avoidance:</strong> {activeProtocolDef.eliminatedFoods.slice(0, 3).join(', ')}
          </div>
          <div style={{ fontSize: '11px', color: '#0D9488', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} />
            <span>Day 8 Rechallenge: Single-Food Garlic Provocation Test</span>
          </div>
        </div>

        {/* Bottom Row: Quick Log Action + Open Modal Prompt */}
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
                <span>Quick Check-In Today</span>
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

          <div
            onClick={handleOpenModal}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#0D9488', cursor: 'pointer' }}
          >
            <span>Open Protocol Suite, Rechallenges & Doctor Dossier</span>
            <ChevronRight size={14} />
          </div>
        </div>
      </motion.div>

      {/* Fully Workable Clinical Outcomes Modal */}
      <ClinicalEliminationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTrialUpdated={(updated) => setTrial(updated)}
      />
    </>
  );
};
