import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, CheckCircle2, Play, Activity, Sparkles, Calendar, Award, ChevronRight, XCircle } from 'lucide-react';
import {
  ELIMINATION_PROTOCOLS,
  getActiveTrial,
  startTrial,
  logTrialDay,
  ActiveTrialState,
  EliminationTrialProtocol,
} from '../../services/TriggerEngine';
import { triggerHapticLight } from '../../services/haptics';

export const EliminationTrialsView: React.FC = () => {
  const [activeTrialState, setActiveTrialState] = useState<ActiveTrialState | null>(getActiveTrial());
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [checkinScore, setCheckinScore] = useState(3);
  const [checkinAdhered, setCheckinAdhered] = useState(true);

  const activeProtocol = ELIMINATION_PROTOCOLS.find((p) => p.id === activeTrialState?.trialId);

  const handleStartTrial = (protocolId: string) => {
    triggerHapticLight();
    const updated = startTrial(protocolId);
    setActiveTrialState(updated);
  };

  const handleSaveCheckin = () => {
    triggerHapticLight();
    const updated = logTrialDay(checkinScore, checkinAdhered);
    setActiveTrialState(updated);
    setIsCheckinOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Header Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
          borderRadius: '20px',
          padding: '16px 18px',
          border: '1.5px solid #BBF7D0',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            flexShrink: 0,
          }}
        >
          <Activity size={20} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            CLINICAL DIETARY TRIALS
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>
            A/B Test Your Body
          </div>
          <div style={{ fontSize: '12.5px', color: '#78716C', marginTop: '2px' }}>
            Isolate specific compound families to measure concrete drops in symptom severity before reintroducing.
          </div>
        </div>
      </div>

      {/* Active Trial Live Card */}
      {activeTrialState && activeProtocol && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '22px',
            padding: '20px',
            border: '2px solid #34D399',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#059669', padding: '3px 8px', borderRadius: '999px', background: '#ECFDF5', border: '1px solid #A7F3D0', textTransform: 'uppercase' }}>
                ACTIVE TRIAL IN PROGRESS
              </span>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                Day {activeTrialState.currentDay} of {activeTrialState.totalDays}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                setIsCheckinOpen(true);
              }}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              }}
            >
              + Daily Checkin
            </button>
          </div>

          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#1C1917' }}>
              {activeProtocol.name}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
              {activeProtocol.description}
            </p>
          </div>

          {/* Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', marginBottom: '6px', fontWeight: 600 }}>
              <span>Protocol Progress</span>
              <span>{Math.round((activeTrialState.completedDays / activeTrialState.totalDays) * 100)}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (activeTrialState.completedDays / activeTrialState.totalDays) * 100)}%` }}
                style={{ height: '100%', background: 'linear-gradient(90deg, #34D399 0%, #059669 100%)', borderRadius: '999px' }}
              />
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
              <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Adherence</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                {activeTrialState.adherencePercentage}%
              </div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
              <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Flare Severity</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                {activeTrialState.currentSeverity} <span style={{ fontSize: '11px', color: '#94A3B8' }}>/ 10</span>
              </div>
            </div>

            <div style={{ background: '#ECFDF5', padding: '10px 12px', borderRadius: '14px', border: '1px solid #A7F3D0', textAlign: 'center' }}>
              <div style={{ fontSize: '10.5px', color: '#047857', fontWeight: 600 }}>Symptom Drop</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                -{activeTrialState.reductionPercent}%
              </div>
            </div>
          </div>

          {/* Eliminated Foods Tags */}
          <div style={{ background: '#FFF1F2', padding: '10px 14px', borderRadius: '14px', border: '1px solid #FECDD3' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#BE123C', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '6px' }}>
              Currently Restricted in Trial:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {activeProtocol.eliminatedFoods.map((f, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: '#FFFFFF',
                    color: '#E11D48',
                    border: '1px solid #FDA4AF',
                  }}
                >
                  ✕ {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Daily Checkin Modal Modal / Expand */}
      <AnimatePresence>
        {isCheckinOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '18px 20px',
              border: '1.5px solid #10B981',
              boxShadow: '0 8px 28px rgba(16, 185, 129, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '15px', color: '#1C1917' }}>Record Day Checkin</strong>
              <button
                type="button"
                onClick={() => setIsCheckinOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>

            {/* Adherence Radio */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Did you stick to the elimination protocol today?
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCheckinAdhered(true)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '10px',
                    border: checkinAdhered ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                    background: checkinAdhered ? '#ECFDF5' : '#FFFFFF',
                    color: checkinAdhered ? '#059669' : '#64748B',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ✓ 100% Adhered
                </button>
                <button
                  type="button"
                  onClick={() => setCheckinAdhered(false)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '10px',
                    border: !checkinAdhered ? '1.5px solid #EF4444' : '1px solid #E2E8F0',
                    background: !checkinAdhered ? '#FEF2F2' : '#FFFFFF',
                    color: !checkinAdhered ? '#DC2626' : '#64748B',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ✕ Had Slip / Exposure
                </button>
              </div>
            </div>

            {/* Severity Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  Today's Symptom Severity:
                </label>
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: checkinScore > 5 ? '#E11D48' : '#10B981' }}>
                  {checkinScore} / 10 ({checkinScore <= 2 ? 'Calm' : checkinScore <= 5 ? 'Mild' : 'Severe'})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={checkinScore}
                onChange={(e) => setCheckinScore(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#10B981' }}
              />
            </div>

            <button
              type="button"
              onClick={handleSaveCheckin}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '10px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              Save Checkin & Recalculate Reduction
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available Protocols Library */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#8E9AAF', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          AVAILABLE CLINICAL PROTOCOLS
        </span>

        {ELIMINATION_PROTOCOLS.map((proto) => {
          const isCurrent = activeTrialState?.trialId === proto.id;

          return (
            <div
              key={proto.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                padding: '16px',
                border: isCurrent ? '1.5px solid #10B981' : '1.5px solid #F1F5F9',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917' }}>{proto.name}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: '#F1F5F9',
                        color: '#475569',
                      }}
                    >
                      {proto.durationDays} Days
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 700, marginTop: '2px' }}>
                    Target: {proto.targetSensitivity}
                  </div>
                </div>

                {!isCurrent ? (
                  <button
                    type="button"
                    onClick={() => handleStartTrial(proto.id)}
                    style={{
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      color: '#15803D',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Play size={13} fill="#15803D" /> Start
                  </button>
                ) : (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#059669',
                      background: '#ECFDF5',
                      padding: '4px 10px',
                      borderRadius: '999px',
                    }}
                  >
                    Active
                  </span>
                )}
              </div>

              <p style={{ margin: 0, fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>
                {proto.expectedBiomarkerImpact}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
