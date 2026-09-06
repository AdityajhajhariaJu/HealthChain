import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, CheckCircle2, Play, Activity, Sparkles, Calendar, Award, ChevronRight, XCircle, Target, ArrowRight } from 'lucide-react';
import {
  ELIMINATION_PROTOCOLS,
  getActiveTrial,
  startTrial,
  logTrialDay,
  ActiveTrialState,
  EliminationTrialProtocol,
} from '../../services/TriggerEngine';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';

export const EliminationTrialsView: React.FC = () => {
  const [activeTrialState, setActiveTrialState] = useState<ActiveTrialState | null>(getActiveTrial());
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [checkinScore, setCheckinScore] = useState(3);
  const [checkinAdhered, setCheckinAdhered] = useState(true);
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState(0);

  const activeProtocol = ELIMINATION_PROTOCOLS.find((p) => p.id === activeTrialState?.trialId) || ELIMINATION_PROTOCOLS[0];

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

  // Determine current active phase based on current day
  const currentDay = activeTrialState?.currentDay || 1;
  const currentPhaseIndex = currentDay <= 7 ? 0 : currentDay <= 14 ? 1 : currentDay <= 21 ? 2 : 3;

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
          <Target size={22} />
        </div>
        <div>
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#059669', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            4-WEEK CLINICAL ROOT-CAUSE HUNTS
          </div>
          <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>
            Diagnostic Elimination Protocols
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
            Structured 28-day phased trials with systematic challenge reintroductions.
          </div>
        </div>
      </div>

      {/* Active Trial Live Card */}
      {activeTrialState && activeProtocol && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '20px',
            border: '2px solid #34D399',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Top Row: Tag & Checkin CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669', padding: '3px 9px', borderRadius: '999px', background: '#ECFDF5', border: '1px solid #A7F3D0', textTransform: 'uppercase' }}>
                ACTIVE 4-WEEK HUNT
              </span>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>
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
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.4px' }}>
              {activeProtocol.huntTitle || 'TARGETED CLINICAL HUNT'}
            </div>
            <h3 style={{ margin: '2px 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#1C1917' }}>
              {activeProtocol.name}
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>
              {activeProtocol.description}
            </p>
          </div>

          {/* Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', marginBottom: '6px', fontWeight: 600 }}>
              <span>28-Day Protocol Completion</span>
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

          {/* 4-Phase Carousel Tabs */}
          {activeProtocol.phases && activeProtocol.phases.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
                4-Phase Structured Protocol
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {activeProtocol.phases.map((ph, idx) => {
                  const isCurrentPhase = currentPhaseIndex === idx;
                  const isViewed = selectedPhaseIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        triggerHapticSelection();
                        setSelectedPhaseIdx(idx);
                      }}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '12px',
                        border: isViewed ? '1.5px solid #059669' : '1px solid #E2E8F0',
                        background: isViewed ? '#ECFDF5' : '#F8FAFC',
                        color: isViewed ? '#065F46' : '#64748B',
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <span style={{ fontSize: '10px', fontWeight: 800 }}>P{ph.phase}</span>
                      <span style={{ fontSize: '9px', opacity: 0.8 }}>{ph.daysRange.replace('Days ', 'D')}</span>
                      {isCurrentPhase && (
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#059669', marginTop: '2px' }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Phase Details Card */}
              {activeProtocol.phases[selectedPhaseIdx] && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '12px 14px',
                    borderRadius: '16px',
                    background: '#F0FDFA',
                    border: '1px solid #CCFBF1',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F766E' }}>
                      {activeProtocol.phases[selectedPhaseIdx].title}
                    </span>
                    <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: 700 }}>
                      {activeProtocol.phases[selectedPhaseIdx].daysRange}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px', lineHeight: 1.35 }}>
                    {activeProtocol.phases[selectedPhaseIdx].focus}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {activeProtocol.phases[selectedPhaseIdx].clinicalInstructions.map((inst, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11.5px', color: '#334155' }}>
                        <span style={{ color: '#059669', fontWeight: 800 }}>•</span>
                        <span>{inst}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
              <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Protocol Adherence</div>
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

          {/* Daily Protocol Checklist */}
          {activeProtocol.dailyChecklist && activeProtocol.dailyChecklist.length > 0 && (
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
                Today's Protocol Actions:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeProtocol.dailyChecklist.map((task, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155' }}>
                    <CheckCircle2 size={14} color="#10B981" />
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daily Checkin Modal Sheet */}
      <AnimatePresence>
        {isCheckinOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              background: '#FFFFFF',
              borderRadius: '22px',
              padding: '18px',
              border: '2px solid #10B981',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#1C1917' }}>
                Day {activeTrialState?.currentDay || 1} Protocol Checkin
              </span>
              <button
                type="button"
                onClick={() => setIsCheckinOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '18px' }}
              >
                ×
              </button>
            </div>

            {/* Adherence Toggle */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Did you adhere 100% to the restriction list today?
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCheckinAdhered(true)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '10px',
                    border: checkinAdhered ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                    background: checkinAdhered ? '#ECFDF5' : '#FFFFFF',
                    color: checkinAdhered ? '#065F46' : '#64748B',
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
                  ✕ Had Exposure / Slip
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
              Save Checkin & Recalculate Reduction Delta
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available Protocols Library */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#8E9AAF', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          AVAILABLE 4-WEEK SYMPTOM HUNTS
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
                    <Play size={13} fill="#15803D" /> Start Hunt
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
export default EliminationTrialsView;
