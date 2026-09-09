import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Sparkles,
  GitMerge,
  ChevronRight,
  Copy,
  Check,
  Play,
  RotateCcw,
  X,
  Share2,
  Stethoscope,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';

export interface SuspectVector {
  id: string;
  category: 'biomechanical' | 'biochemical' | 'circadian' | 'vascular';
  name: string;
  icon: string;
  correlationPercent: number;
  instancesTracked: number;
  mechanism: string;
}

export interface ConnectionTriggerCardProps {
  symptom?: string;
  reactionWindow?: string;
  confidencePercent?: number;
  upstreamRootCause?: string;
  kineticPathway?: string[];
  suspectVectors?: SuspectVector[];
  onOpenKineticMap?: () => void;
  onOpenResetProtocol?: () => void;
}

const DEFAULT_PATHWAY = [
  'L4-S1 Pelvic Compression',
  'Thoracolumbar Fascial Pull',
  'C1-C2 Suboccipital Tension',
  'Greater Occipital Nerve',
  'Temporal / Ocular Cephalgia'
];

const DEFAULT_VECTORS: SuspectVector[] = [
  {
    id: 'kinetic_pelvic',
    category: 'biomechanical',
    name: 'Sacral Torsion & Dural Pull',
    icon: '🦴',
    correlationPercent: 86,
    instancesTracked: 14,
    mechanism: 'Prolonged seated lumbar slouch pulls continuous spinal dural sleeve to occiput.'
  },
  {
    id: 'vascular_adenosine',
    category: 'vascular',
    name: 'Caffeine Rebound & Dehydration',
    icon: '☕',
    correlationPercent: 44,
    instancesTracked: 9,
    mechanism: 'Adenosine receptor upregulation post-espresso triggers reactive cerebral vasodilation.'
  },
  {
    id: 'circadian_sleep',
    category: 'circadian',
    name: 'Delta Slow-Wave Sleep Deficit',
    icon: '🌙',
    correlationPercent: 32,
    instancesTracked: 6,
    mechanism: 'Low parasympathetic tone lowers pain modulation threshold at trigeminal nucleus.'
  }
];

export const ConnectionTriggerCard: React.FC<ConnectionTriggerCardProps> = ({
  symptom = 'Occipital & Temple Headache',
  reactionWindow = 'within 2h of desk immobility',
  confidencePercent = 86,
  upstreamRootCause = 'Lumbar Facet & Sacral Torsion (Pelvic Torque)',
  kineticPathway = DEFAULT_PATHWAY,
  suspectVectors = DEFAULT_VECTORS,
  onOpenKineticMap,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'biomechanical' | 'vascular' | 'circadian'>('all');
  const [copied, setCopied] = useState(false);
  const [showProtocolModal, setShowProtocolModal] = useState(false);

  const filteredVectors = suspectVectors.filter(v => activeTab === 'all' || v.category === activeTab);

  const handleCopySbar = () => {
    triggerHapticLight();
    const sbarText = `HEALTHCHAIN 360 • CLINIC USP CAUSAL CONNECTION BRIEF
[SITUATION]: Patient reports ${symptom} appearing ${reactionWindow}.
[BACKGROUND]: Identified upstream causality linked to ${upstreamRootCause}.
[ASSESSMENT]: Kinetic chain evaluation demonstrates myofascial/dural pull along: ${kineticPathway.join(' -> ')}.
[RECOMMENDATION]: Prioritize targeted pelvic and suboccipital release; evaluate workstation posture ergonomics.`;

    navigator.clipboard.writeText(sbarText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#FFFFFF',
          borderRadius: '24px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 12px 36px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.02)',
          overflow: 'hidden',
          margin: '10px 0',
          fontFamily: 'inherit',
        }}
      >
        {/* Header Ribbon: Clinical Teal */}
        <div
          style={{
            padding: '16px 18px',
            background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GitMerge size={18} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#CCFBF1' }}>
                  USP Clinic Connection Detective
                </span>
              </div>
              <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.2px' }}>
                {symptom}
              </h4>
            </div>
          </div>

          <div
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.22)',
              fontSize: '11.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Sparkles size={12} />
            <span>{confidencePercent}% Match</span>
          </div>
        </div>

        {/* Primary Root-Cause Upstream Banner */}
        <div
          style={{
            padding: '14px 18px',
            background: '#F0FDFA',
            borderBottom: '1px solid #CCFBF1',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0F766E' }}>
              Primary Upstream Root Cause
            </span>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={11} /> {reactionWindow}
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#134E4A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔗</span>
            <span>{upstreamRootCause}</span>
          </div>
        </div>

        {/* Kinetic Anatomical Referral Chain (Visual Breadcrumb Stream) */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: '8px' }}>
            Kinetic Anatomical Pathway
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
            {kineticPathway.map((step, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === kineticPathway.length - 1;
              return (
                <React.Fragment key={idx}>
                  <div
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: isFirst ? '#CCFBF1' : isLast ? '#FFE4E6' : '#F8FAFC',
                      color: isFirst ? '#0F766E' : isLast ? '#E11D48' : '#334155',
                      border: isFirst ? '1px solid #99F6E4' : isLast ? '1px solid #FECDD3' : '1px solid #E2E8F0',
                    }}
                  >
                    {step}
                  </div>
                  {!isLast && (
                    <ArrowRight size={12} color="#94A3B8" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Suspect Root-Cause Vectors (TriggerBites Tabs & Pills) */}
        <div style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>
              Suspect Root-Cause Vectors
            </span>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'biomechanical', label: '🦴 Kinetic' },
                { key: 'vascular', label: '☕ Vascular' },
                { key: 'circadian', label: '🌙 Sleep' }
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    triggerHapticSelection();
                    setActiveTab(tab.key as any);
                  }}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '10px',
                    fontWeight: activeTab === tab.key ? 800 : 600,
                    background: activeTab === tab.key ? '#0D9488' : '#F1F5F9',
                    color: activeTab === tab.key ? '#FFFFFF' : '#64748B',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredVectors.map(vec => (
              <div
                key={vec.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '14px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontSize: '15px' }}>{vec.icon}</span>
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1E293B' }}>{vec.name}</span>
                    <span style={{ fontSize: '10.5px', color: '#64748B' }}>({vec.instancesTracked}x tracked)</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F766E' }}>
                    +{vec.correlationPercent}%
                  </span>
                </div>

                {/* Progress bar indicator */}
                <div style={{ width: '100%', height: '5px', borderRadius: '999px', background: '#E2E8F0', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${vec.correlationPercent}%`,
                      height: '100%',
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, #14B8A6 0%, #0F766E 100%)',
                    }}
                  />
                </div>

                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.35 }}>
                  {vec.mechanism}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Footer: View Kinetic Map + 3-Min Protocol + Share */}
        <div
          style={{
            padding: '12px 18px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                setShowProtocolModal(true);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '12px',
                border: '1px solid #0D9488',
                background: '#FFFFFF',
                color: '#0F766E',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
            >
              <Play size={12} fill="#0F766E" /> 3-Min Reset
            </button>

            <button
              type="button"
              onClick={handleCopySbar}
              style={{
                padding: '8px 10px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: copied ? '#059669' : '#64748B',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
              title="Copy SBAR Brief for Doctor / Physiatrist"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'SBAR'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHapticLight();
              if (onOpenKineticMap) {
                onOpenKineticMap();
              } else {
                window.dispatchEvent(new CustomEvent('hc_open_connection_detective_modal', { detail: { tab: 'map' } }));
                if (!window.location.pathname.includes('/consult') && !window.location.pathname.includes('/ava')) {
                  window.location.assign('/app/consult');
                }
              }
            }}
            style={{
              padding: '9px 14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
            }}
          >
            <span>Kinetic Map</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </motion.div>

      {/* 3-Minute Kinetic Decompression Modal */}
      <AnimatePresence>
        {showProtocolModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: '460px',
                background: '#FFFFFF',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
                border: '1px solid #E2E8F0',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                    3-Min Pelvic & Suboccipital Reset
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProtocolModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#FFF', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  This sequence breaks the myofascial tension loop between your lower back (sacroiliac joint) and your suboccipital headache.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '12px', borderRadius: '14px', background: '#F0FDFA', border: '1px solid #CCFBF1' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F766E', marginBottom: '4px' }}>
                      Step 1: Psoas & Lumbar Decompression (60s)
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155' }}>
                      Step forward into a gentle half-kneeling lunge. Tuck your pelvis under (posterior pelvic tilt) until you feel the front hip release.
                    </div>
                  </div>

                  <div style={{ padding: '12px', borderRadius: '14px', background: '#F0FDFA', border: '1px solid #CCFBF1' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F766E', marginBottom: '4px' }}>
                      Step 2: Suboccipital Traction & Chin Tucks (60s)
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155' }}>
                      Interlace your fingers behind the base of your skull. Gently glide your chin back while pulling upward towards the ceiling. Breathe slowly into the diaphragm.
                    </div>
                  </div>

                  <div style={{ padding: '12px', borderRadius: '14px', background: '#F0FDFA', border: '1px solid #CCFBF1' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F766E', marginBottom: '4px' }}>
                      Step 3: Diaphragmatic Vagal Grounding (60s)
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155' }}>
                      4 seconds inhale through the nose, 7 seconds hold, 8 seconds slow mouth exhale to reset sympathetic tone.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    setShowProtocolModal(false);
                  }}
                  style={{
                    padding: '13px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                    color: '#FFF',
                    fontWeight: 800,
                    fontSize: '13.5px',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '6px',
                  }}
                >
                  Completed Reset Protocol
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
