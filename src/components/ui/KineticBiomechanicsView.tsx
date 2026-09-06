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
  HelpCircle,
} from 'lucide-react';
import { getKineticChainPathways, KineticChainPathway } from '../../services/ConnectionDetectiveEngine';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';

export const KineticBiomechanicsView: React.FC = () => {
  const [pathways] = useState<KineticChainPathway[]>(getKineticChainPathways());
  const [selectedPathwayId, setSelectedPathwayId] = useState<string>(pathways[0]?.id || 'chain_craniosacral');
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(180);

  const currentPathway = pathways.find((p) => p.id === selectedPathwayId) || pathways[0];

  // Timer countdown
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

  // Determine active phase based on countdown (180s total: Phase 1: 180-120, Phase 2: 120-60, Phase 3: 60-0)
  const currentPhaseIndex = secondsRemaining > 120 ? 0 : secondsRemaining > 60 ? 1 : 2;

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
            MULTI-SYSTEM TENSEGRITY & FASCIAL VECTORS • 8 PATHWAYS
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', lineHeight: 1.2 }}>
            Kinetic Chain Referral & Viscerosomatic Loops
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Biomechanical entrapments and spinal dural tension mimicking autonomic and visceral pathology.
          </div>
        </div>
      </div>

      {/* Pathway Selector Pills Ribbon (8 pathways) */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: '2px',
        }}
      >
        {pathways.map((p) => {
          const isCurrent = selectedPathwayId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                triggerHapticSelection();
                setSelectedPathwayId(p.id);
                setIsTimerActive(false);
                setSecondsRemaining(180);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 13px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: isCurrent ? `1.5px solid ${p.color}` : '1px solid #E2E8F0',
                background: isCurrent ? p.color : '#FFFFFF',
                color: isCurrent ? '#FFFFFF' : '#64748B',
                boxShadow: isCurrent ? `0 2px 8px ${p.color}35` : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{p.icon}</span>
              <span>{p.title.split(' ')[0]} {p.title.split(' ')[1]}</span>
            </button>
          );
        })}
      </div>

      {/* Active Pathway Deep-Dive Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '22px',
          border: '1.5px solid #CCFBF1',
          padding: '20px',
          boxShadow: '0 8px 24px rgba(13, 148, 136, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '20px' }}>{currentPathway.icon}</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                {currentPathway.title}
              </h3>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: currentPathway.color }}>
              Vector Axis: {currentPathway.axisName}
            </div>
          </div>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              background: '#F1F5F9',
              fontSize: '11px',
              fontWeight: 800,
              color: '#475569',
            }}
          >
            {currentPathway.pathwaySteps.length} Links in Chain
          </div>
        </div>

        {/* Primary Symptom vs Hidden Mechanical Origin */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div style={{ background: '#FFF1F2', borderRadius: '14px', padding: '12px 14px', border: '1px solid #FECDD3' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#BE123C', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '4px' }}>
              🔴 WHAT PATIENT FEELS (SYMPTOM)
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#881337', lineHeight: 1.3 }}>
              {currentPathway.primarySymptom}
            </div>
          </div>

          <div style={{ background: '#F0FDFA', borderRadius: '14px', padding: '12px 14px', border: '1px solid #99F6E4' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '4px' }}>
              🟢 HIDDEN MECHANICAL ROOT CAUSE
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#134E4A', lineHeight: 1.3 }}>
              {currentPathway.hiddenOrigin}
            </div>
          </div>
        </div>

        {/* Interactive SVG Anatomical Vector Map */}
        <div
          style={{
            background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
            borderRadius: '16px',
            padding: '16px',
            color: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.8px', color: '#38BDF8', textTransform: 'uppercase' }}>
              ANATOMICAL VECTOR TRAJECTORY
            </span>
            <span style={{ fontSize: '10px', color: '#94A3B8' }}>Dynamic Load Vectors</span>
          </div>

          <svg viewBox="0 0 400 100" style={{ width: '100%', height: '80px' }}>
            {/* Base Vector Line */}
            <motion.path
              d="M 40 50 Q 140 15, 200 50 T 360 50"
              fill="none"
              stroke="#0D9488"
              strokeWidth="3"
              strokeDasharray="6 6"
              animate={{ strokeDashoffset: [24, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            />
            {/* Origin Node */}
            <circle cx="40" cy="50" r="8" fill="#10B981" />
            <circle cx="40" cy="50" r="14" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.5" />
            <text x="40" y="80" fill="#94A3B8" fontSize="10" textAnchor="middle" fontWeight="700">Origin</text>

            {/* Intermediate Vector 1 */}
            <circle cx="150" cy="30" r="6" fill="#38BDF8" />
            <text x="150" y="20" fill="#CBD5E1" fontSize="9" textAnchor="middle">Fascia</text>

            {/* Intermediate Vector 2 */}
            <circle cx="260" cy="70" r="6" fill="#F59E0B" />
            <text x="260" y="90" fill="#CBD5E1" fontSize="9" textAnchor="middle">Nerve Trunk</text>

            {/* Target Node */}
            <circle cx="360" cy="50" r="8" fill="#EF4444" />
            <circle cx="360" cy="50" r="14" fill="none" stroke="#EF4444" strokeWidth="1.5" opacity="0.5" />
            <text x="360" y="80" fill="#FCA5A5" fontSize="10" textAnchor="middle" fontWeight="700">Flare</text>
          </svg>
        </div>

        {/* Step-by-Step Biomechanical Pathway Flow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            Biomechanical Tension Cascade ({currentPathway.pathwaySteps.length} Anatomical Links):
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentPathway.pathwaySteps.map((step) => (
              <div
                key={step.order}
                style={{
                  background: '#F8FAFC',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#0D9488',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {step.order}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      {step.structure}
                    </div>
                    <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>
                      {step.anatomicalLocation}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4, marginBottom: '4px' }}>
                    {step.biomechanicalTension}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#0F766E', fontWeight: 700 }}>
                    ⚡ Referral: {step.sensoryReferral}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Palpation Diagnostic Test */}
        <div
          style={{
            background: '#F0FDFA',
            borderRadius: '16px',
            padding: '14px 16px',
            border: '1.5px solid #99F6E4',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0F766E', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            <Target size={15} />
            <span>Self-Palpation Diagnostic Check</span>
          </div>
          <div style={{ fontSize: '12.5px', color: '#134E4A', lineHeight: 1.45, fontWeight: 600 }}>
            {currentPathway.palpationSign}
          </div>
        </div>

        {/* Guided 3-Minute Corrective Protocol with Multi-Phase Timer */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            borderRadius: '20px',
            padding: '20px',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                CORRECTIVE PROTOCOL
              </span>
              <h4 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                {currentPathway.correctiveProtocol.title}
              </h4>
            </div>

            {/* Timer Clock Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'monospace', color: '#38BDF8' }}>
                {formatTime(secondsRemaining)}
              </div>
              <button
                type="button"
                onClick={handleToggleTimer}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: isTimerActive ? '#F59E0B' : '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {isTimerActive ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
              </button>
              <button
                type="button"
                onClick={handleResetTimer}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#CBD5E1',
                  border: 'none',
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

          {/* Step-by-Step Multi-Phase Guidance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentPathway.correctiveProtocol.steps.map((stepText, idx) => {
              const isCurrentPhase = isTimerActive && currentPhaseIndex === idx;
              return (
                <div
                  key={idx}
                  style={{
                    background: isCurrentPhase ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: isCurrentPhase ? '1px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '12.5px',
                    color: isCurrentPhase ? '#F8FAFC' : '#CBD5E1',
                    lineHeight: 1.45,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {stepText}
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>
            ✓ Expected Outcome: {currentPathway.correctiveProtocol.clinicalOutcome}
          </div>
        </div>
      </div>
    </div>
  );
};
