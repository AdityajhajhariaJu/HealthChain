import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Compass,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
  RotateCcw,
  Layers,
  HeartHandshake,
  Clock,
  Apple,
  Info,
  ChevronRight,
  Stethoscope,
  BookOpen
} from 'lucide-react';
import {
  ELIMINATION_PROTOCOLS,
  EliminationTrialProtocol,
  startTrial
} from '../../services/TriggerEngine';
import { startNewTrialV2 } from '../../services/TrialWorkflowService';
import { TrialIntakeAssessment } from '../../domain/trials/types';
import { getProfile } from '../../services/ProfileEngine';
import {
  triggerHapticLight,
  triggerHapticMedium,
  triggerHapticSuccess,
  triggerHapticSelection
} from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';

export interface EliminationOnboardingWizardProps {
  onComplete: (protocolId: string, initialSeverity?: number | null, assessment?: TrialIntakeAssessment) => void;
  onBrowseCatalog?: () => void;
  onBrowseProtocols?: () => void;
  onProtocolSelect?: (protocolId: string) => void;
  onCancel?: () => void;
  isRetake?: boolean;
  initialSymptoms?: string[];
}

interface SafetyFlags {
  eatingDisorder: boolean;
  unintendedWeightLoss: boolean;
  uninvestigatedRedFlags: boolean;
  pregnancyOrLactation: boolean;
}

const COMMON_SYMPTOMS = [
  { id: 'bloating', label: 'Bloating & Abdominal Distension', icon: '💨', protocol: 'hunt_bloat', alt: 'low_fodmap', desc: 'Gas, tight lower abdomen, post-meal swelling' },
  { id: 'heartburn', label: 'Heartburn, Reflux & Throat Burning', icon: '🔥', protocol: 'hunt_heartburn', alt: 'hunt_vagal', desc: 'Acid rising, chest tightness, evening burn' },
  { id: 'histamine', label: 'Flushing, Hives & Sudden Warmth', icon: '⚡', protocol: 'hunt_histamine', alt: 'low_histamine', desc: 'Red cheeks, nasal congestion, itching post-wine/aged foods' },
  { id: 'headache', label: 'Postural Headache & Occipital Tension', icon: '💆', protocol: 'hunt_kinetic_headache', alt: 'hunt_vagal', desc: 'Neck ache, temporal throbbing, mealtime pressure' },
  { id: 'pots', label: 'Post-Meal Heart Racing & Dizziness', icon: '❤️', protocol: 'hunt_pots_splanchnic', alt: 'hunt_vagal', desc: 'Splanchnic pooling, tachycardia after large carb meals' },
  { id: 'motility', label: 'Sluggish Transit & Hard Stools', icon: '⏱️', protocol: 'hunt_transit', alt: 'hunt_bloat', desc: 'Infrequent bowel movements, incomplete evacuation' },
  { id: 'vagal', label: 'Rushed Eating, Gut Spasms & Stress Cramps', icon: '🌿', protocol: 'hunt_vagal', alt: 'hunt_heartburn', desc: 'Tight stomach, sympathetic nervous cramping' },
  { id: 'dairy', label: 'Congestion & Mucus Following Dairy', icon: '🥛', protocol: 'dairy_free', alt: 'hunt_histamine', desc: 'Post-milk throat clearing, bloating, facial breakouts' },
  { id: 'gluten', label: 'Post-Wheat Fatigue & Joint Stiffness', icon: '🌾', protocol: 'gluten_gut_rest', alt: 'hunt_bloat', desc: 'Brain fog, heavy joints, lethargy after commercial bread' },
];

const TIMING_OPTIONS = [
  { id: 'immediate', label: 'Immediate (<30 mins)', desc: 'Rapid upper GI or histamine reactivity' },
  { id: 'delayed', label: '1 to 4 Hours Post-Meal', desc: 'Small bowel fermentation & motility delay' },
  { id: 'next_morning', label: 'Next Morning / Overnight', desc: 'Colonic fermentation & metabolic transit' },
  { id: 'variable', label: 'Unpredictable / Variable', desc: 'Shifting flares influenced by stress & sleep' },
];

export const EliminationOnboardingWizard: React.FC<EliminationOnboardingWizardProps> = ({
  onComplete,
  onBrowseCatalog,
  onBrowseProtocols,
  onProtocolSelect,
  onCancel,
  isRetake = false,
  initialSymptoms = []
}) => {
  const isMobile = useIsMobile();
  const handleBrowseCatalog = onBrowseProtocols || onBrowseCatalog;
  
  // Step sequence: 0 = orientation, 1 = symptoms, 2 = safety, 3 = clinician_stop, 4 = recommendations, 5 = baseline
  const [step, setStep] = useState<number>(isRetake ? 1 : 0);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(initialSymptoms);
  const [isUnsure, setIsUnsure] = useState<boolean>(false);
  const [timing, setTiming] = useState<string>('delayed');
  const [initialSeverity, setInitialSeverity] = useState<number>(6);
  const [acknowledgedConsent, setAcknowledgedConsent] = useState<boolean>(false);

  const [safetyFlags, setSafetyFlags] = useState<SafetyFlags>({
    eatingDisorder: false,
    unintendedWeightLoss: false,
    uninvestigatedRedFlags: false,
    pregnancyOrLactation: false,
  });

  const [chosenProtocolId, setChosenProtocolId] = useState<string>('hunt_bloat');

  // Auto-prefill candidate symptoms from profile if present
  useEffect(() => {
    try {
      const profile = getProfile();
      if (selectedSymptoms.length === 0 && profile?.symptoms && Array.isArray(profile.symptoms) && profile.symptoms.length > 0) {
        const matchedIds: string[] = [];
        const profileSyms = profile.symptoms.map((s: string) => s.toLowerCase());
        if (profileSyms.some((s) => s.includes('bloat') || s.includes('gas'))) matchedIds.push('bloating');
        if (profileSyms.some((s) => s.includes('heartburn') || s.includes('acid') || s.includes('reflux'))) matchedIds.push('heartburn');
        if (profileSyms.some((s) => s.includes('flush') || s.includes('hive') || s.includes('histamine'))) matchedIds.push('histamine');
        if (profileSyms.some((s) => s.includes('headache') || s.includes('migraine') || s.includes('neck'))) matchedIds.push('headache');
        if (profileSyms.some((s) => s.includes('pot') || s.includes('tachycardia') || s.includes('palpitation'))) matchedIds.push('pots');
        if (profileSyms.some((s) => s.includes('constipat') || s.includes('transit') || s.includes('bowel'))) matchedIds.push('motility');
        if (profileSyms.some((s) => s.includes('dairy') || s.includes('milk') || s.includes('casein'))) matchedIds.push('dairy');
        if (profileSyms.some((s) => s.includes('gluten') || s.includes('wheat'))) matchedIds.push('gluten');
        if (matchedIds.length > 0) {
          setSelectedSymptoms(matchedIds);
        }
      }
    } catch {}
  }, []);

  const toggleSymptom = (id: string) => {
    triggerHapticSelection();
    setIsUnsure(false);
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleUnsure = () => {
    triggerHapticSelection();
    setIsUnsure(true);
    setSelectedSymptoms([]);
  };

  const hasSafetyExclusion = Object.values(safetyFlags).some(Boolean);

  // Algorithmic Protocol Matching
  const matched = useMemo((): { primary: EliminationTrialProtocol; alternatives: EliminationTrialProtocol[]; confidence: number } => {
    if (isUnsure || selectedSymptoms.length === 0) {
      const primary = ELIMINATION_PROTOCOLS.find((p) => p.id === 'hunt_bloat') || ELIMINATION_PROTOCOLS[0];
      const alt1 = ELIMINATION_PROTOCOLS.find((p) => p.id === 'low_fodmap') || ELIMINATION_PROTOCOLS[1];
      const alt2 = ELIMINATION_PROTOCOLS.find((p) => p.id === 'hunt_vagal') || ELIMINATION_PROTOCOLS[2];
      return { primary, alternatives: [alt1, alt2], confidence: 85 };
    }

    const firstSymptom = COMMON_SYMPTOMS.find((s) => selectedSymptoms.includes(s.id));
    const primaryId = firstSymptom?.protocol || 'hunt_bloat';
    const altId1 = firstSymptom?.alt || 'low_fodmap';
    const secondSymptom = COMMON_SYMPTOMS.find((s) => selectedSymptoms.includes(s.id) && s.protocol !== primaryId);
    const altId2 = secondSymptom?.protocol || (primaryId === 'hunt_bloat' ? 'hunt_vagal' : 'hunt_bloat');

    const primary = ELIMINATION_PROTOCOLS.find((p) => p.id === primaryId) || ELIMINATION_PROTOCOLS[0];
    const alt1 = ELIMINATION_PROTOCOLS.find((p) => p.id === altId1 && p.id !== primary.id);
    const alt2 = ELIMINATION_PROTOCOLS.find((p) => p.id === altId2 && p.id !== primary.id && p.id !== alt1?.id);

    const alts: EliminationTrialProtocol[] = [];
    if (alt1) alts.push(alt1);
    if (alt2) alts.push(alt2);

    const confidence = selectedSymptoms.length === 1 ? 96 : selectedSymptoms.length === 2 ? 92 : 88;
    return { primary, alternatives: alts.slice(0, 2), confidence };
  }, [selectedSymptoms, isUnsure]);

  // Sync chosen protocol to primary matched when matcher updates
  useEffect(() => {
    if (matched.primary) {
      setChosenProtocolId(matched.primary.id);
    }
  }, [matched.primary.id]);

  const activeChosenProtocol = useMemo(() => {
    return ELIMINATION_PROTOCOLS.find((p) => p.id === chosenProtocolId) || matched.primary;
  }, [chosenProtocolId, matched.primary]);

  const handleNextFromSafety = () => {
    triggerHapticMedium();
    if (hasSafetyExclusion) {
      setStep(3); // Clinician Stop
    } else {
      setStep(4); // Recommendations
    }
  };

  const handleActivateTrial = () => {
    triggerHapticSuccess();
    const assessment: TrialIntakeAssessment = {
      symptoms: isUnsure ? ['multiple_unspecified'] : selectedSymptoms,
      timing,
      baselineSeverity: initialSeverity,
      safetyAcknowledged: true,
      completedAt: new Date().toISOString(),
      matchedProtocolId: chosenProtocolId,
    };

    // 1. Dual-sync to TriggerEngine
    startTrial(chosenProtocolId, initialSeverity);

    // 2. Dual-sync to TrialV2 canonical store
    const duration = activeChosenProtocol?.durationDays || 28;
    startNewTrialV2({
      protocolId: chosenProtocolId,
      durationDays: duration,
      baselineSeverity: initialSeverity,
      acknowledgedLimitations: true,
      intakeAssessment: assessment,
    });

    onComplete(chosenProtocolId, initialSeverity, assessment);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: isMobile ? '520px' : '580px',
        background: '#FFFFFF',
        position: 'relative',
      }}
    >
      {/* Top Progress Tracker */}
      <div
        style={{
          padding: isMobile ? '14px 16px' : '16px 24px',
          borderBottom: '1px solid #E2E8F0',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            <Compass size={17} strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Elimination Suite Onboarding
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.2px' }}>
              {step === 0 && 'Clinical Orientation'}
              {step === 1 && 'Step 1 of 4: Symptoms & Timing'}
              {step === 2 && 'Step 2 of 4: Safety & Exclusions'}
              {step === 3 && 'Clinical Safety Notice'}
              {step === 4 && 'Step 3 of 4: Matched Protocol'}
              {step === 5 && 'Step 4 of 4: Baseline & Activation'}
            </div>
          </div>
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[0, 1, 2, 4, 5].map((sIndex, idx) => {
            const isCompleted = step > sIndex;
            const isCurrent = step === sIndex || (step === 3 && sIndex === 2);
            return (
              <div
                key={sIndex}
                style={{
                  width: isCurrent ? '22px' : '7px',
                  height: '7px',
                  borderRadius: '999px',
                  background: isCurrent ? '#0D9488' : isCompleted ? '#5EEAD4' : '#E2E8F0',
                  boxShadow: isCurrent ? '0 1px 4px rgba(13, 148, 136, 0.3)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Main Form Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '16px' : '24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AnimatePresence mode="wait">
          {/* STEP 0: ORIENTATION & PHILOSOPHY */}
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, #F0FDFA 0%, #ECFDF5 100%)',
                  borderRadius: '22px',
                  padding: isMobile ? '18px' : '24px',
                  border: '1.5px solid #99F6E4',
                  boxShadow: '0 8px 24px -6px rgba(13, 148, 136, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', width: 'fit-content', background: '#FFFFFF', padding: '3.5px 10px', borderRadius: '999px', border: '1px solid #5EEAD4' }}>
                  <Sparkles size={13} color="#0D9488" />
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    Evidence-Based Clinical Science
                  </span>
                </div>
                <h3 style={{ fontSize: isMobile ? '18px' : '21px', fontWeight: 800, color: '#064E3B', margin: 0, letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                  A Scientific Investigation, Not a Permanent Diet
                </h3>
                <p style={{ fontSize: '13px', color: '#065F46', margin: 0, lineHeight: 1.55 }}>
                  Food intolerances are often temporary responses to gut mucosal inflammation or dysbiosis. An elimination reset temporarily removes suspected irritants to calm your gut, then systematically challenges single foods to pinpoint your true triggers.
                </p>
              </div>

              {/* 3-Phase Roadmap */}
              <div>
                <h4 style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 12px' }}>
                  The 3-Phase Clinical Journey
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '16px', border: '1.5px solid #CCFBF1', boxShadow: '0 4px 14px rgba(13, 148, 136, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#F0FDFA', color: '#0D9488', border: '1px solid #99F6E4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11.5px', fontWeight: 800 }}>1</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Washout Reset</span>
                    </div>
                    <p style={{ fontSize: '11.5px', color: '#64748B', margin: 0, lineHeight: 1.45 }}>
                      Days 1–7: Strictly eliminate suspected culprits. Mucosal inflammation calms down.
                    </p>
                  </div>

                  <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#F8FAFC', color: '#475569', border: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11.5px', fontWeight: 800 }}>2</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Food Challenge</span>
                    </div>
                    <p style={{ fontSize: '11.5px', color: '#64748B', margin: 0, lineHeight: 1.45 }}>
                      Days 8–14: Test single items 1-by-1 in isolation. Quantify latency and flare response.
                    </p>
                  </div>

                  <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#F8FAFC', color: '#475569', border: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11.5px', fontWeight: 800 }}>3</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Food Freedom</span>
                    </div>
                    <p style={{ fontSize: '11.5px', color: '#64748B', margin: 0, lineHeight: 1.45 }}>
                      Days 15–28: Safely reintroduce tolerated foods. Preserve microbiome diversity for life.
                    </p>
                  </div>
                </div>
              </div>

              {/* Monash safe staples guarantee & abundance framing */}
              <div style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)', borderRadius: '16px', padding: '14px 16px', border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.06)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Apple size={20} color="#059669" />
                </div>
                <span style={{ fontSize: '12px', color: '#14532D', lineHeight: 1.45 }}>
                  <strong>Abundance Guarantee (Zero Starvation):</strong> You will receive a verified <strong>Safe Staples List</strong> tailored to your cuisine (e.g. moong dal khichdi, sourdough, garlic-infused oils, cumin-tempered rice, lactose-free chaas) so every meal is deeply satisfying.
                </span>
              </div>

              {/* Optional browse catalog shortcut */}
              {handleBrowseCatalog && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    handleBrowseCatalog();
                  }}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0D9488',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    width: 'fit-content',
                    alignSelf: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Layers size={14} />
                  <span>Browse All 11 Protocols Instead</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </motion.div>
          )}

          {/* STEP 1: SYMPTOM & LATENCY TRIAGE */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 3px', letterSpacing: '-0.2px' }}>
                  What symptoms are you experiencing most frequently?
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  Select all that apply. Your choices match you to the highest-yield clinical protocol.
                </p>
              </div>

              {/* Symptom Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
                {COMMON_SYMPTOMS.map((item) => {
                  const isSelected = selectedSymptoms.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleSymptom(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '13px 15px',
                        borderRadius: '16px',
                        border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                        background: isSelected ? 'linear-gradient(135deg, #F0FDFA 0%, #ECFDF5 100%)' : '#FFFFFF',
                        boxShadow: isSelected ? '0 4px 14px rgba(13, 148, 136, 0.08)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        minHeight: '64px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '22px', lineHeight: 1 }}>{item.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#0F766E' : '#0F172A' }}>
                            {item.label}
                          </span>
                          {isSelected && <Check size={15} color="#0D9488" strokeWidth={2.8} />}
                        </div>
                        <span style={{ fontSize: '11px', color: isSelected ? '#065F46' : '#64748B', lineHeight: 1.35, marginTop: '3px', display: 'block' }}>
                          {item.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Unsure option */}
              <button
                type="button"
                onClick={handleUnsure}
                style={{
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: isUnsure ? '1.5px solid #D97706' : '1.5px dashed #CBD5E1',
                  background: isUnsure ? '#FEF3C7' : '#F8FAFC',
                  color: isUnsure ? '#92400E' : '#475569',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                  minHeight: '44px',
                  transition: 'all 0.15s ease',
                }}
              >
                I'm not sure / multiple shifting symptoms without an obvious pattern
              </button>

              {/* Latency selection */}
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.2px' }}>
                  When does discomfort usually peak?
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px', marginTop: '8px' }}>
                  {TIMING_OPTIONS.map((opt) => {
                    const isSelected = timing === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          triggerHapticSelection();
                          setTiming(opt.id);
                        }}
                        style={{
                          padding: '11px 14px',
                          borderRadius: '14px',
                          border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                          background: isSelected ? '#F0FDFA' : '#FFFFFF',
                          boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.08)' : 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          minHeight: '52px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 800, color: isSelected ? '#0F766E' : '#0F172A' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: CLINICAL SAFETY SCREEN */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div
                style={{
                  background: '#FFFBEB',
                  borderRadius: '18px',
                  padding: '16px 18px',
                  border: '1.5px solid #FDE68A',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldAlert size={20} color="#D97706" />
                </div>
                <div>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#92400E', margin: 0 }}>
                    Clinical Safety & Contraindications Check
                  </h4>
                  <p style={{ fontSize: '12px', color: '#B45309', margin: '3px 0 0', lineHeight: 1.45 }}>
                    Elimination diets restrict certain food groups temporarily. Please confirm if any of the following clinical exclusions apply to you right now:
                  </p>
                </div>
              </div>

              {/* Safety Exclusion Checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  {
                    key: 'eatingDisorder' as const,
                    title: 'Active eating disorder or severe food-related anxiety',
                    desc: 'Restricting foods can worsen psychological distress or obsessive orthorexia.',
                  },
                  {
                    key: 'unintendedWeightLoss' as const,
                    title: 'Unexplained rapid weight loss (>5% body weight in past 6 months)',
                    desc: 'Requires physician workup to rule out malabsorption, celiac, or organic disease first.',
                  },
                  {
                    key: 'pregnancyOrLactation' as const,
                    title: 'Active pregnancy or breastfeeding',
                    desc: 'Fetal and infant micronutrient needs take precedence over dietary restriction.',
                  },
                  {
                    key: 'uninvestigatedRedFlags' as const,
                    title: 'Uninvestigated red flags (blood in stool, persistent vomiting, fever)',
                    desc: 'Red flags demand prompt medical evaluation, not self-directed dietary trials.',
                  },
                ].map((item) => {
                  const isChecked = safetyFlags[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        triggerHapticSelection();
                        setSafetyFlags((prev) => ({ ...prev, [item.key]: !prev[item.key] }));
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        padding: '14px 16px',
                        borderRadius: '16px',
                        border: isChecked ? '1.5px solid #DC2626' : '1px solid #E2E8F0',
                        background: isChecked ? '#FEF2F2' : '#FFFFFF',
                        cursor: 'pointer',
                        textAlign: 'left',
                        minHeight: '52px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '6px',
                          border: isChecked ? 'none' : '1.5px solid #94A3B8',
                          background: isChecked ? '#DC2626' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: '2px',
                          flexShrink: 0,
                        }}
                      >
                        {isChecked && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: isChecked ? '#991B1B' : '#0F172A' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '11px', color: isChecked ? '#B91C1C' : '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {!hasSafetyExclusion && (
                <div style={{ background: '#ECFDF5', borderRadius: '14px', padding: '12px 16px', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={18} color="#059669" />
                  <span style={{ fontSize: '11.5px', color: '#065F46', fontWeight: 700 }}>
                    None of the exclusions apply. You qualify for structured dietary exploration.
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 3: CLINICIAN SAFETY STOP SCREEN */}
          {step === 3 && (
            <motion.div
              key="step-3-stop"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '18px', alignItems: 'center', textAlign: 'center', padding: '16px 8px' }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#FEF2F2',
                  border: '2px solid #FECACA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.15)',
                }}
              >
                <Stethoscope size={30} />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                Clinical Consultation Recommended First
              </h3>

              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.55, maxWidth: '460px', margin: 0 }}>
                Based on your safety check answers, starting an unsupervised elimination protocol may carry clinical or psychological risk. We strongly recommend speaking with a gastroenterologist or licensed dietitian before removing food groups.
              </p>

              <div
                style={{
                  width: '100%',
                  maxWidth: '480px',
                  background: '#F8FAFC',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  border: '1px solid #E2E8F0',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  What you can safely do right now:
                </div>
                <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                  • <strong>Maintain regular meal times:</strong> Consistent circadian meal pacing calms digestive motility without cutting foods.<br />
                  • <strong>Hydrate with warm fluids:</strong> Warm water or fresh ginger tea supports digestive enzymes.<br />
                  • <strong>Track symptoms gently:</strong> Log your baseline meals in the food diary without imposing restrictions.
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  setSafetyFlags({
                    eatingDisorder: false,
                    unintendedWeightLoss: false,
                    uninvestigatedRedFlags: false,
                    pregnancyOrLactation: false,
                  });
                  setStep(2);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#64748B',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                Go back and review safety screening answers
              </button>
            </motion.div>
          )}

          {/* STEP 4: ALGORITHMIC PROTOCOL RECOMMENDATION */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <Sparkles size={14} color="#0D9488" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Personalized Clinical Match ({matched.confidence}% Fit)
                  </span>
                </div>
                <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.2px' }}>
                  Recommended Protocol For Your Profile
                </h3>
              </div>

              {/* Primary Recommended Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #F0FDFA 0%, #ECFDF5 100%)',
                  borderRadius: '20px',
                  padding: isMobile ? '18px' : '22px',
                  border: '2px solid #0D9488',
                  boxShadow: '0 8px 24px -6px rgba(13, 148, 136, 0.16)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase' }}>
                        PRIMARY MATCH • {matched.primary.durationDays} DAYS
                      </span>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, background: '#0D9488', color: '#FFFFFF', padding: '2px 7px', borderRadius: '999px' }}>
                        {matched.confidence}% FIT
                      </span>
                    </div>
                    <div style={{ fontSize: isMobile ? '17px' : '19px', fontWeight: 800, color: '#064E3B', marginTop: '2px', letterSpacing: '-0.2px' }}>
                      {matched.primary.name}
                    </div>
                  </div>

                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F766E', background: '#FFFFFF', padding: '4px 10px', borderRadius: '8px', border: '1px solid #99F6E4' }}>
                    {matched.primary.evidenceLevel || 'Clinical Grade'}
                  </span>
                </div>

                <p style={{ fontSize: '12.5px', color: '#14532D', margin: 0, lineHeight: 1.5 }}>
                  {matched.primary.description}
                </p>

                {/* Target Culprits & Safe Staples Preview */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', borderTop: '1px solid #A7F3D0', paddingTop: '12px' }}>
                  <div>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Temporarily Aside (Phase 1):
                    </span>
                    <div style={{ fontSize: '11.5px', color: '#7F1D1D', fontWeight: 600, marginTop: '3px' }}>
                      {matched.primary.eliminatedFoods.slice(0, 3).join(', ')}...
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Abundantly Allowed:
                    </span>
                    <div style={{ fontSize: '11.5px', color: '#065F46', fontWeight: 600, marginTop: '3px' }}>
                      {(matched.primary.allowedStaples || matched.primary.allowedAlternatives || []).slice(0, 3).join(', ')}...
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #A7F3D0', paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#065F46', fontWeight: 600 }}>
                    Target Irritant: <strong>{matched.primary.targetSensitivity}</strong>
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#0D9488', fontWeight: 800 }}>
                    Selected ✓
                  </span>
                </div>
              </div>

              {/* Alternative Options */}
              {matched.alternatives.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>
                    Or Choose an Evidence-Based Alternative
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {matched.alternatives.map((alt) => {
                      const isChosen = chosenProtocolId === alt.id;
                      return (
                        <button
                          key={alt.id}
                          type="button"
                          onClick={() => {
                            triggerHapticSelection();
                            setChosenProtocolId(alt.id);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '13px 16px',
                            borderRadius: '16px',
                            border: isChosen ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                            background: isChosen ? '#F0FDFA' : '#FFFFFF',
                            boxShadow: isChosen ? '0 2px 8px rgba(13, 148, 136, 0.08)' : 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            minHeight: '52px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: isChosen ? '#0F766E' : '#0F172A' }}>
                              {alt.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              {alt.durationDays} Days • Focus: {alt.targetSensitivity}
                            </div>
                          </div>
                          <span style={{ fontSize: '11.5px', fontWeight: 800, color: isChosen ? '#0D9488' : '#64748B' }}>
                            {isChosen ? 'Selected ✓' : 'Select'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Link to browse all 11 */}
              {handleBrowseCatalog && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    handleBrowseCatalog();
                  }}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0D9488',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    width: 'fit-content',
                    marginTop: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Layers size={14} />
                  <span>Explore all 11 protocols in the medical directory →</span>
                </button>
              )}
            </motion.div>
          )}

          {/* STEP 5: BASELINE CALIBRATION & COMMITMENT */}
          {step === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Final Calibration
                  </span>
                </div>
                <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.2px' }}>
                  Calibrate Baseline Severity & Confirm Reset
                </h3>
              </div>

              {/* Protocol summary chip */}
              <div style={{ background: '#F0FDFA', borderRadius: '16px', padding: '14px 16px', border: '1.5px solid #CCFBF1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Enrolling In
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>
                    {activeChosenProtocol.name}
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0D9488', background: '#FFFFFF', padding: '4px 9px', borderRadius: '8px', border: '1px solid #99F6E4' }}>
                  {activeChosenProtocol.durationDays} Days Total
                </span>
              </div>

              {/* Baseline Severity Rating (1-10) with Qualitative Anchor */}
              <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label htmlFor="onboarding-baseline-slider" style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                    How would you rate your typical flare severity right now?
                  </label>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0D9488' }}>
                    {initialSeverity}/10
                  </span>
                </div>

                <div
                  style={{
                    background: initialSeverity <= 3 ? '#ECFDF5' : initialSeverity <= 6 ? '#FEF3C7' : '#FEF2F2',
                    border: initialSeverity <= 3 ? '1px solid #A7F3D0' : initialSeverity <= 6 ? '1px solid #FDE68A' : '1px solid #FECACA',
                    color: initialSeverity <= 3 ? '#047857' : initialSeverity <= 6 ? '#92400E' : '#991B1B',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    marginBottom: '12px',
                    display: 'inline-block',
                  }}
                >
                  {initialSeverity <= 3 && '🟢 Mild discomfort / intermittent rumble — does not impede daily work'}
                  {initialSeverity > 3 && initialSeverity <= 6 && '🟡 Noticeable flare — distension, acid or discomfort requiring clothing adjustment'}
                  {initialSeverity > 6 && '🔴 Severe distress — sharp cramping, fatigue or significant routine disruption'}
                </div>

                <p style={{ fontSize: '11.5px', color: '#64748B', margin: '0 0 12px', lineHeight: 1.45 }}>
                  This establishes your baseline. As you log daily check-ins, HealthChain visualizes your symptom delta against this score.
                </p>

                <input
                  id="onboarding-baseline-slider"
                  type="range"
                  min="1"
                  max="10"
                  value={initialSeverity}
                  onChange={(e) => setInitialSeverity(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#0D9488',
                    height: '7px',
                    borderRadius: '999px',
                    cursor: 'pointer',
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748B', fontWeight: 600, marginTop: '8px' }}>
                  <span>1 (Mild / Manageable)</span>
                  <span>5 (Noticeable disruption)</span>
                  <span>10 (Severe / Debilitating)</span>
                </div>
              </div>

              {/* Phase 1 Preview (Immediate Safe Staples) */}
              <div style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)', borderRadius: '18px', padding: '16px 18px', border: '1.5px solid #BBF7D0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Apple size={16} color="#0D9488" />
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Phase 1 Safe Staples Ready For Day 1
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {(activeChosenProtocol.allowedStaples || activeChosenProtocol.allowedAlternatives || []).slice(0, 4).map((staple) => (
                    <span
                      key={staple}
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: '#065F46',
                        background: '#FFFFFF',
                        border: '1px solid #86EFAC',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      ✓ {staple}
                    </span>
                  ))}
                </div>
              </div>

              {/* Informed Consent Checkbox */}
              <button
                type="button"
                onClick={() => {
                  triggerHapticSelection();
                  setAcknowledgedConsent(!acknowledgedConsent);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '16px',
                  border: acknowledgedConsent ? '1.5px solid #0D9488' : '1px solid #CBD5E1',
                  background: acknowledgedConsent ? '#F0FDFA' : '#F8FAFC',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minHeight: '52px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    border: acknowledgedConsent ? 'none' : '1.5px solid #94A3B8',
                    background: acknowledgedConsent ? '#0D9488' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '2px',
                    flexShrink: 0,
                  }}
                >
                  {acknowledgedConsent && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                </div>
                <div style={{ fontSize: '12px', color: acknowledgedConsent ? '#0F766E' : '#475569', lineHeight: 1.45 }}>
                  I understand this protocol is a structured <strong>temporary investigation</strong> (Phase 1 reset followed by food challenges), not a permanent restriction.
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Bottom Action Zone */}
      <div
        style={{
          padding: isMobile ? '14px 16px' : '16px 24px',
          borderTop: '1px solid #E2E8F0',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        {/* Back Button */}
        {step > 0 ? (
          <button
            type="button"
            onClick={() => {
              triggerHapticLight();
              if (step === 3) setStep(2);
              else if (step === 4) setStep(2);
              else setStep((prev) => Math.max(0, prev - 1));
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '11px 16px',
              borderRadius: '12px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '44px',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>
        ) : onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '11px 16px',
              borderRadius: '12px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#64748B',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Close
          </button>
        ) : <div />}

        {/* Primary Action Button */}
        {step === 0 && (
          <button
            type="button"
            onClick={() => {
              triggerHapticMedium();
              setStep(1);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: 'pointer',
              minHeight: '46px',
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Begin Symptom Triage</span>
            <ArrowRight size={16} />
          </button>
        )}

        {step === 1 && (
          <button
            type="button"
            onClick={() => {
              triggerHapticMedium();
              setStep(2);
            }}
            disabled={selectedSymptoms.length === 0 && !isUnsure}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '14px',
              background: (selectedSymptoms.length > 0 || isUnsure) ? 'linear-gradient(135deg, #0D9488 0%, #059669 100%)' : '#CBD5E1',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: (selectedSymptoms.length > 0 || isUnsure) ? 'pointer' : 'not-allowed',
              minHeight: '46px',
              boxShadow: (selectedSymptoms.length > 0 || isUnsure) ? '0 4px 14px rgba(13, 148, 136, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Continue to Safety Check</span>
            <ArrowRight size={16} />
          </button>
        )}

        {step === 2 && (
          <button
            type="button"
            onClick={handleNextFromSafety}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '14px',
              background: hasSafetyExclusion ? 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' : 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: 'pointer',
              minHeight: '46px',
              boxShadow: hasSafetyExclusion ? '0 4px 14px rgba(220, 38, 38, 0.25)' : '0 4px 14px rgba(13, 148, 136, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{hasSafetyExclusion ? 'Review Safety Guidance' : 'View Matched Protocols'}</span>
            <ArrowRight size={16} />
          </button>
        )}

        {step === 3 && (
          <button
            type="button"
            onClick={onCancel || (() => setStep(0))}
            style={{
              padding: '12px 22px',
              borderRadius: '14px',
              background: '#F1F5F9',
              color: '#334155',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Close to Dashboard
          </button>
        )}

        {step === 4 && (
          <button
            type="button"
            onClick={() => {
              triggerHapticMedium();
              setStep(5);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: 'pointer',
              minHeight: '46px',
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Calibrate & Commit</span>
            <ArrowRight size={16} />
          </button>
        )}

        {step === 5 && (
          <button
            type="button"
            onClick={handleActivateTrial}
            disabled={!acknowledgedConsent}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '13px 26px',
              borderRadius: '14px',
              background: acknowledgedConsent ? 'linear-gradient(135deg, #0D9488 0%, #059669 100%)' : '#CBD5E1',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '14px',
              fontWeight: 800,
              cursor: acknowledgedConsent ? 'pointer' : 'not-allowed',
              minHeight: '48px',
              boxShadow: acknowledgedConsent ? '0 4px 16px rgba(13, 148, 136, 0.35)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Activate 28-Day Reset (Enter Day 1)</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default EliminationOnboardingWizard;
