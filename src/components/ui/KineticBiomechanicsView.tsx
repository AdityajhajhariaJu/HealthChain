import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  Target,
  ArrowRight,
} from 'lucide-react';
import { getKineticChainPathways, KineticChainPathway } from '../../services/ConnectionDetectiveEngine';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';

export const KineticBiomechanicsView: React.FC = () => {
  const [pathways] = useState<KineticChainPathway[]>(getKineticChainPathways());
  const [selectedPathwayId, setSelectedPathwayId] = useState<string>(pathways[0]?.id || 'chain_craniosacral');
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(180);

  const currentPathway = pathways.find((p) => p.id === selectedPathwayId) || pathways[0];

  // Timer interval
  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isTimerActive) {
      setIsTimerActive(false);
      triggerHapticSuccess();
    }
    return () => clearInterval(interval);
  }, [isTimerActive, secondsRemaining]);

  const handleToggleTimer = () => {
    triggerHapticLight();
    setIsTimerActive((prev) => !prev);
  };

  const handleResetTimer = () => {
    triggerHapticLight();
    setIsTimerActive(false);
    setSecondsRemaining(180);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 50%, #F0FDFA 100%)',
          borderRadius: '22px',
          padding: '18px 20px',
          border: '1.5px solid #99F6E4',
          boxShadow: '0 4px 16px rgba(13, 148, 136, 0.08)',
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
            background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(13, 148, 136, 0.28)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '20px' }}>🦴</span>
        </div>
        <div>
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            MYOFASCIAL & DURAL TENSEGRITY
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', lineHeight: 1.2 }}>
            Kinetic Chain Biomechanics Visualizer
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Uncovers distant musculoskeletal origins pulling on cranial nerves and internal viscera.
          </div>
        </div>
      </div>

      {/* Kinetic Pathway Horizontal Selector */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: '2px',
        }}
      >
        {pathways.map((p) => {
          const isSelected = selectedPathwayId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                triggerHapticSelection();
                setSelectedPathwayId(p.id);
                setSecondsRemaining(180);
                setIsTimerActive(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: isSelected ? `1.5px solid ${p.color}` : '1px solid #E2E8F0',
                background: isSelected ? p.color : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#475569',
                boxShadow: isSelected ? `0 4px 12px ${p.color}35` : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <span>{p.icon}</span>
              <span>{p.title.split('(')[0].trim()}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Kinetic Chain Active Dossier Card */}
      {currentPathway && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '20px',
            border: `1.5px solid ${currentPathway.color}30`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Header & Origin Banner */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: currentPathway.color,
                  padding: '3px 9px',
                  borderRadius: '999px',
                  background: `${currentPathway.color}15`,
                  border: `1px solid ${currentPathway.color}30`,
                  textTransform: 'uppercase',
                }}
              >
                {currentPathway.axisName}
              </span>
            </div>
            <h3 style={{ margin: '2px 0 6px 0', fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>
              {currentPathway.title}
            </h3>
            <div style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>
              <strong style={{ color: '#0F172A' }}>Surface Symptom:</strong> {currentPathway.primarySymptom}
              <br />
              <strong style={{ color: '#0D9488' }}>Hidden Origin:</strong> {currentPathway.hiddenOrigin}
            </div>
          </div>

          {/* Anatomical Step-by-Step Referral Lineage */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.4px' }}>
              Anatomical Referral Chain (Tensegrity Highway):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentPathway.pathwaySteps.map((step, idx) => {
                const isLast = idx === currentPathway.pathwaySteps.length - 1;
                return (
                  <div
                    key={step.order}
                    style={{
                      background: isLast ? '#FFF1F2' : '#F8FAFC',
                      borderRadius: '16px',
                      padding: '12px 14px',
                      border: isLast ? '1.5px solid #FECDD3' : '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: isLast ? '#BE123C' : '#1E293B' }}>
                        Step {step.order}: {step.structure}
                      </span>
                      <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>
                        {step.anatomicalLocation}
                      </span>
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.35 }}>
                      <strong>Tension Vector:</strong> {step.biomechanicalTension}
                    </div>

                    <div style={{ fontSize: '11.5px', color: isLast ? '#E11D48' : '#0D9488', fontWeight: 600 }}>
                      ⚡ <strong>Sensory Signal:</strong> {step.sensoryReferral}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clinical Palpation Examination Sign */}
          <div
            style={{
              background: '#FFFBEB',
              borderRadius: '16px',
              padding: '12px 14px',
              border: '1.5px solid #FDE68A',
            }}
          >
            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
              🩺 Clinical Palpation Sign:
            </div>
            <div style={{ fontSize: '12px', color: '#78350F', lineHeight: 1.35 }}>
              {currentPathway.palpationSign}
            </div>
          </div>

          {/* 3-Minute Guided Corrective Protocol with Live Timer */}
          <div
            style={{
              background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
              borderRadius: '20px',
              padding: '16px 18px',
              border: '1.5px solid #99F6E4',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  TARGETED NEURO-KINETIC CORRECTION
                </span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: 800, color: '#134E4A' }}>
                  {currentPathway.correctiveProtocol.title}
                </h4>
              </div>

              {/* Countdown Timer Display */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#0F766E', fontVariantNumeric: 'tabular-nums' }}>
                  {formatTime(secondsRemaining)}
                </span>
                <button
                  type="button"
                  onClick={handleToggleTimer}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {isTimerActive ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  type="button"
                  onClick={handleResetTimer}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#FFFFFF',
                    color: '#0F766E',
                    border: '1px solid #99F6E4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>

            {/* Protocol Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {currentPathway.correctiveProtocol.steps.map((st, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#134E4A', lineHeight: 1.35 }}>
                  <CheckCircle2 size={15} color="#0D9488" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{st}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '11.5px', color: '#047857', fontWeight: 700, borderTop: '1px solid #A7F3D0', paddingTop: '8px' }}>
              ✓ <strong>Expected Outcome:</strong> {currentPathway.correctiveProtocol.clinicalOutcome}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default KineticBiomechanicsView;
