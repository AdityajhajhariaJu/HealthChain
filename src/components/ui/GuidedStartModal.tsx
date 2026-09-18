import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HeartHandshake,
  Sparkles,
  Compass,
  FileText,
  Layers,
  Info,
  Check,
  ChevronRight,
  Clock,
  Apple
} from 'lucide-react';
import FocusTrap from './FocusTrap';
import { ELIMINATION_PROTOCOLS, EliminationTrialProtocol, startTrial } from '../../services/TriggerEngine';
import { startNewTrialV2 } from '../../services/TrialWorkflowService';
import { getProfile } from '../../services/ProfileEngine';
import { triggerHapticSelection, triggerHapticSuccess } from '../../services/haptics';

export interface GuidedStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProtocol: (protocolId: string, initialSeverity?: number | null) => void;
  onBrowseAll: () => void;
}

interface SafetyFlags {
  eatingDisorder: boolean;
  unintendedWeightLoss: boolean;
  uninvestigatedRedFlags: boolean;
  pregnancyOrLactation: boolean;
}

const COMMON_SYMPTOMS = [
  { id: 'bloating', label: 'Bloating & Distension', icon: '💨', protocol: 'hunt_bloat', alt: 'low_fodmap' },
  { id: 'heartburn', label: 'Heartburn & Acid Reflux', icon: '🔥', protocol: 'hunt_heartburn', alt: 'hunt_vagal' },
  { id: 'histamine', label: 'Flushing, Hives & Warmth', icon: '⚡', protocol: 'hunt_histamine', alt: 'low_histamine' },
  { id: 'headache', label: 'Postural Headache / Neck Tension', icon: '💆', protocol: 'hunt_kinetic_headache', alt: 'hunt_vagal' },
  { id: 'pots', label: 'Post-Meal Heart Racing / Dizziness', icon: '❤️', protocol: 'hunt_pots_splanchnic', alt: 'hunt_vagal' },
  { id: 'motility', label: 'Sluggish Transit / Irregular Bowels', icon: '⏱️', protocol: 'hunt_transit', alt: 'hunt_bloat' },
  { id: 'vagal', label: 'Rushed Meals & Stress Cramping', icon: '🌿', protocol: 'hunt_vagal', alt: 'hunt_heartburn' },
  { id: 'dairy', label: 'Mucus / Congestion After Dairy', icon: '🥛', protocol: 'dairy_free', alt: 'hunt_histamine' },
  { id: 'gluten', label: 'Post-Wheat Fatigue & Joint Aches', icon: '🌾', protocol: 'gluten_gut_rest', alt: 'hunt_bloat' },
];

const TIMING_OPTIONS = [
  { id: 'immediate', label: 'Within 30 mins after eating' },
  { id: 'delayed', label: '1 to 4 hours post-meal' },
  { id: 'next_morning', label: 'Next morning or overnight' },
  { id: 'variable', label: 'Unpredictable / variable' },
];

export const GuidedStartModal: React.FC<GuidedStartModalProps> = ({
  isOpen,
  onClose,
  onSelectProtocol,
  onBrowseAll,
}) => {
  const [step, setStep] = useState<'symptoms' | 'safety' | 'clinician_stop' | 'recommendations' | 'consent'>('symptoms');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isUnsure, setIsUnsure] = useState<boolean>(false);
  const [timing, setTiming] = useState<string>('delayed');
  const [initialSeverity, setInitialSeverity] = useState<number | null>(null);

  const [safetyFlags, setSafetyFlags] = useState<SafetyFlags>({
    eatingDisorder: false,
    unintendedWeightLoss: false,
    uninvestigatedRedFlags: false,
    pregnancyOrLactation: false,
  });

  const [chosenProtocolId, setChosenProtocolId] = useState<string>('hunt_bloat');
  const [acknowledgedLimitations, setAcknowledgedLimitations] = useState<boolean>(false);

  // Auto-prefill candidate symptoms from user profile if available
  useEffect(() => {
    if (isOpen) {
      setStep('symptoms');
      setAcknowledgedLimitations(false);
      try {
        const profile = getProfile();
        if (profile?.symptoms && Array.isArray(profile.symptoms) && profile.symptoms.length > 0) {
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  // Derive matched primary and alternatives
  const getMatchedProtocols = (): { primary: EliminationTrialProtocol; alternatives: EliminationTrialProtocol[] } => {
    if (isUnsure || selectedSymptoms.length === 0) {
      const primary = ELIMINATION_PROTOCOLS.find((p) => p.id === 'hunt_bloat') || ELIMINATION_PROTOCOLS[0];
      const alt1 = ELIMINATION_PROTOCOLS.find((p) => p.id === 'low_fodmap') || ELIMINATION_PROTOCOLS[1];
      const alt2 = ELIMINATION_PROTOCOLS.find((p) => p.id === 'hunt_vagal') || ELIMINATION_PROTOCOLS[2];
      return { primary, alternatives: [alt1, alt2] };
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

    return { primary, alternatives: alts.slice(0, 2) };
  };

  const matched = getMatchedProtocols();

  const handleConfirmStart = () => {
    triggerHapticSuccess();
    // Start in TriggerEngine
    const state = startTrial(chosenProtocolId, initialSeverity ?? undefined);
    // Start in TrialV2
    const targetProto = ELIMINATION_PROTOCOLS.find((p) => p.id === chosenProtocolId);
    startNewTrialV2({
      protocolId: chosenProtocolId,
      durationDays: targetProto?.durationDays || 28,
      baselineSeverity: initialSeverity,
      acknowledgedLimitations: true,
    });
    onSelectProtocol(chosenProtocolId, initialSeverity);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-start-title"
    >
      <FocusTrap isActive={isOpen} onEscape={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h2 id="guided-start-title" className="text-base font-bold text-slate-900">
                  Guided Trial Start
                </h2>
                <p className="text-xs text-slate-500">
                  {step === 'symptoms' && 'Step 1 of 3: Symptoms & Timing (~30s)'}
                  {step === 'safety' && 'Step 2 of 3: Clinical Safety Check'}
                  {step === 'clinician_stop' && 'Safety Guidance'}
                  {step === 'recommendations' && 'Step 3 of 3: Matched Protocols'}
                  {step === 'consent' && 'Confirm & Start Observation'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-colors"
              aria-label="Close guided start"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <AnimatePresence mode="wait">
              {/* STEP 1: SYMPTOMS & TIMING */}
              {step === 'symptoms' && (
                <motion.div
                  key="step-symptoms"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
                      What are you experiencing most often?
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">
                      Select all that apply. Your choices help filter out protocols that don't match your symptoms.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {COMMON_SYMPTOMS.map((item) => {
                        const isSelected = selectedSymptoms.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleSymptom(item.id)}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-semibold transition-all min-h-[44px] ${
                              isSelected
                                ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-base">{item.icon}</span>
                            <span className="flex-1 leading-snug">{item.label}</span>
                            {isSelected && <Check className="w-4 h-4 text-teal-600" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2.5">
                      <button
                        type="button"
                        onClick={handleUnsure}
                        className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition-all min-h-[44px] ${
                          isUnsure
                            ? 'bg-amber-50 border-amber-500 text-amber-900'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        I'm not sure / multiple shifting symptoms
                      </button>
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="pt-2 border-t border-slate-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
                      When does it usually appear?
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TIMING_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            triggerHapticSelection();
                            setTiming(opt.id);
                          }}
                          className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all min-h-[44px] ${
                            timing === opt.id
                              ? 'bg-teal-50 border-teal-500 text-teal-900'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Baseline Severity */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="guided-severity-range" className="text-sm font-bold uppercase tracking-wider text-slate-500">
                        Typical Severity (1–10)
                      </label>
                      <span className="text-xs font-semibold text-teal-700">
                        {initialSeverity === null ? 'Not specified yet' : `${initialSeverity}/10`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      Optional: establish a starting baseline score to compare against during the trial.
                    </p>
                    <input
                      id="guided-severity-range"
                      type="range"
                      min="1"
                      max="10"
                      value={initialSeverity ?? 5}
                      onChange={(e) => setInitialSeverity(Number(e.target.value))}
                      className="w-full accent-teal-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1 mt-1">
                      <span>1 (Mild)</span>
                      <span>5 (Moderate)</span>
                      <span>10 (Severe)</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: SAFETY SCREEN */}
              {step === 'safety' && (
                <motion.div
                  key="step-safety"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-amber-900">Safety & Exclusions Check</h3>
                      <p className="text-xs text-amber-800/90 leading-relaxed mt-1">
                        Dietary elimination should be a safe, calm exploration. Please verify if any of the following apply to you right now:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        key: 'eatingDisorder',
                        title: 'History of active eating disorder or food anxiety',
                        desc: 'Strict elimination can trigger adverse psychological distress.',
                      },
                      {
                        key: 'unintendedWeightLoss',
                        title: 'Unintended weight loss (>5% in the last 3 months)',
                        desc: 'Requires physician evaluation before any dietary restriction.',
                      },
                      {
                        key: 'uninvestigatedRedFlags',
                        title: 'Red flags: blood in stool, difficulty swallowing, or high fever',
                        desc: 'These symptoms require prompt clinical investigation, not diet changes.',
                      },
                      {
                        key: 'pregnancyOrLactation',
                        title: 'Pregnancy or breastfeeding without maternal dietitian care',
                        desc: 'Nutrient restriction during pregnancy or lactation must be professionally supervised.',
                      },
                    ].map((item) => {
                      const isChecked = safetyFlags[item.key as keyof SafetyFlags];
                      return (
                        <label
                          key={item.key}
                          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all min-h-[44px] ${
                            isChecked
                              ? 'bg-amber-50 border-amber-400 text-slate-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              triggerHapticSelection();
                              setSafetyFlags((prev) => ({
                                ...prev,
                                [item.key]: e.target.checked,
                              }));
                            }}
                            className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 shrink-0"
                          />
                          <div>
                            <div className="text-xs font-bold leading-tight text-slate-900">{item.title}</div>
                            <div className="text-[11px] text-slate-500 leading-normal mt-0.5">{item.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {!hasSafetyExclusion && (
                    <div className="flex items-center gap-2 p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-xs">
                      <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>No exclusion criteria checked. Safe to proceed to protocol recommendations.</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 2B: CLINICIAN STOP SCREEN (IF EXCLUSION CHECKED) */}
              {step === 'clinician_stop' && (
                <motion.div
                  key="step-clinician-stop"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-4"
                >
                  <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                      <HeartHandshake className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-rose-900">
                        An elimination diet is not recommended right now
                      </h3>
                      <p className="text-xs text-rose-800 leading-relaxed mt-1.5 max-w-md mx-auto">
                        Based on the clinical exclusions you selected, restricting foods without direct physician supervision can lead to nutritional deficits, delay important diagnostic testing, or cause undue stress.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Safe Alternative Next Step:
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Instead of eliminating food groups, we recommend using HealthChain's <strong>observational symptom tracker</strong> without restricting any foods. You can bring your meal-and-symptom log to your next clinical appointment for review.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors min-h-[44px]"
                    >
                      Return to Workspace
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('safety')}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors min-h-[44px]"
                    >
                      Back to Safety Check
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: MATCHED PROTOCOLS */}
              {step === 'recommendations' && (
                <motion.div
                  key="step-recommendations"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Matched Clinical Protocols
                    </h3>
                    <p className="text-xs text-slate-500">
                      Based on your observed symptoms and timing profile. We highlight 1 primary recommendation and up to 2 alternatives.
                    </p>
                  </div>

                  {/* Primary Card */}
                  <div className="p-4 rounded-2xl border-2 border-teal-500 bg-teal-50/40 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-teal-600 text-white">
                        <Sparkles className="w-3 h-3" /> Recommended Primary
                      </span>
                      <span className="text-xs font-semibold text-teal-800">
                        {matched.primary.durationDays} Days
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 leading-tight">
                        {matched.primary.name}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        {matched.primary.description}
                      </p>
                    </div>

                    {/* Abundance preview */}
                    <div className="p-2.5 bg-white/80 rounded-xl border border-teal-200/80 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-teal-900 text-[11px] mb-1">
                        <Apple className="w-3.5 h-3.5 text-teal-600" />
                        Abundance: Delicious foods you continue eating:
                      </div>
                      <div className="text-[11px] text-slate-600 flex flex-wrap gap-1">
                        {matched.primary.allowedAlternatives.slice(0, 4).map((alt, i) => (
                          <span key={i} className="px-2 py-0.5 bg-teal-100/60 rounded-md text-teal-950 font-medium">
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticSelection();
                        setChosenProtocolId(matched.primary.id);
                        setStep('consent');
                      }}
                      className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all min-h-[44px]"
                    >
                      <span>Choose This Protocol</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Alternatives */}
                  {matched.alternatives.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Available Alternatives:
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {matched.alternatives.map((alt) => (
                          <div
                            key={alt.id}
                            className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-900">{alt.name}</div>
                              <div className="text-[11px] text-slate-500 line-clamp-1">{alt.description}</div>
                              <div className="text-[10px] text-teal-700 font-semibold mt-0.5">
                                {alt.durationDays} Days • {alt.targetSensitivity}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                triggerHapticSelection();
                                setChosenProtocolId(alt.id);
                                setStep('consent');
                              }}
                              className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs min-h-[44px] flex items-center"
                            >
                              Select
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Browse all fallback */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onBrowseAll();
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline transition-colors"
                    >
                      Or browse all 11 protocols in the complete directory
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: INFORMED CONSENT & CONFIRMATION */}
              {step === 'consent' && (
                <motion.div
                  key="step-consent"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl">
                    <h3 className="text-sm font-bold text-teal-950">
                      Selected: {ELIMINATION_PROTOCOLS.find((p) => p.id === chosenProtocolId)?.name}
                    </h3>
                    <p className="text-xs text-teal-800 mt-1 leading-relaxed">
                      Duration: {ELIMINATION_PROTOCOLS.find((p) => p.id === chosenProtocolId)?.durationDays} Days • Structured observational trial
                    </p>
                  </div>

                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Patient Agency & Informed Understanding:
                    </h4>

                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={acknowledgedLimitations}
                        onChange={(e) => {
                          triggerHapticSelection();
                          setAcknowledgedLimitations(e.target.checked);
                        }}
                        className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 shrink-0"
                      />
                      <span>
                        I understand this is a temporary, structured self-observation to identify personal patterns, <strong>not a medical cure or permanent diet</strong>.
                      </span>
                    </label>

                    <div className="text-[11px] text-slate-500 space-y-1.5 pt-1 border-t border-slate-200">
                      <div>• <strong>Pause or stop anytime:</strong> You can pause or stop without guilt or penalties.</div>
                      <div>• <strong>Abundance focus:</strong> Keep meals varied and satisfying with recommended alternatives.</div>
                      <div>• <strong>Clinician review:</strong> At any point, export an SBAR dossier to review with your healthcare provider.</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!acknowledgedLimitations}
                    onClick={handleConfirmStart}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all min-h-[44px] ${
                      acknowledgedLimitations
                        ? 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Begin Day 1 Observation</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Controls */}
          {step !== 'clinician_stop' && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <div>
                {step === 'symptoms' && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Save & Exit
                  </button>
                )}
                {step === 'safety' && (
                  <button
                    type="button"
                    onClick={() => setStep('symptoms')}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors min-h-[44px] px-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}
                {step === 'recommendations' && (
                  <button
                    type="button"
                    onClick={() => setStep('safety')}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors min-h-[44px] px-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}
                {step === 'consent' && (
                  <button
                    type="button"
                    onClick={() => setStep('recommendations')}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors min-h-[44px] px-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}
              </div>

              <div>
                {step === 'symptoms' && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticSelection();
                      setStep('safety');
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all min-h-[44px]"
                  >
                    <span>Next: Safety Check</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                {step === 'safety' && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticSelection();
                      if (hasSafetyExclusion) {
                        setStep('clinician_stop');
                      } else {
                        setStep('recommendations');
                      }
                    }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all min-h-[44px] ${
                      hasSafetyExclusion
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                    }`}
                  >
                    <span>{hasSafetyExclusion ? 'Review Safety Guidance' : 'View Recommended Protocols'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </FocusTrap>
    </div>
  );
};
