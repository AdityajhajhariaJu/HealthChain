import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Check, 
  FolderHeart, 
  Pill, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Plus,
  Trash2,
  Syringe,
  Wind,
  ShieldAlert,
  Heart,
  AlertTriangle
} from 'lucide-react';
import { getProfile, completeProfileOnboarding } from '../../services/ProfileEngine';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';

interface CompleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

const COMMON_CONDITIONS = [
  'Hypertension',
  'Type 2 Diabetes',
  'Asthma',
  'Hypothyroidism',
  'High Cholesterol',
  'GERD / Acid Reflux',
  'Migraine',
  'PCOS / Hormonal',
  'Fatty Liver',
  'Anxiety / Depression'
];

const PRESET_MEDICATIONS = [
  { name: 'Metformin', dosage: '500mg daily' },
  { name: 'Lisinopril', dosage: '10mg daily' },
  { name: 'Atorvastatin', dosage: '20mg daily' },
  { name: 'Levothyroxine', dosage: '50mcg daily' },
  { name: 'Sertraline', dosage: '50mg daily' },
  { name: 'Escitalopram', dosage: '10mg daily' },
  { name: 'Ventolin', dosage: 'Inhaler as directed' },
  { name: 'Spironolactone', dosage: '25mg daily' },
  { name: 'Prednisone', dosage: '10mg daily' },
  { name: 'Insulin', dosage: 'Basal daily' }
];

const COMMON_ALLERGIES = [
  'Penicillin',
  'Sulfa Drugs',
  'Aspirin / NSAIDs',
  'Peanuts & Tree Nuts',
  'Latex',
  'Shellfish',
  'Pollen / Seasonal',
  'Dairy / Lactose'
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

const STEPS = [
  { id: 0, label: 'Demographics' },
  { id: 1, label: 'Conditions' },
  { id: 2, label: 'Medications' },
  { id: 3, label: 'Allergies' }
];

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({ isOpen, onClose, onCompleted }) => {
  const isMobile = useIsMobile();
  const [activeStep, setActiveStep] = useState<0 | 1 | 2 | 3>(0);
  
  // Profile form state pre-filled from existing profile
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('Unknown');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [hasNoConditions, setHasNoConditions] = useState(false);

  const [medicationsList, setMedicationsList] = useState<string[]>([]);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [hasNoMedications, setHasNoMedications] = useState(false);

  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [hasNoAllergies, setHasNoAllergies] = useState(false);

  // Initialize from storage on open & lock background scroll
  useEffect(() => {
    if (isOpen) {
      const p = getProfile();
      if (p?.demographics) {
        setName(p.demographics.name || '');
        setAge(p.demographics.age ? String(p.demographics.age) : '');
        setGender(p.demographics.gender || '');
        setBloodGroup(p.demographics.bloodGroup || 'Unknown');
        setHeight(p.demographics.height ? String(p.demographics.height) : '');
        setWeight(p.demographics.weight ? String(p.demographics.weight) : '');
        setEmergencyContact(p.demographics.emergencyContact || '');
      }
      if (Array.isArray(p?.conditions)) {
        setSelectedConditions([...p.conditions]);
      }
      if (Array.isArray(p?.medications)) {
        setMedicationsList(p.medications.map((m: any) => typeof m === 'string' ? m : `${m.name || ''}${m.dosage ? ' ' + m.dosage : ''}`).filter(Boolean));
      }
      if (Array.isArray(p?.allergies)) {
        setSelectedAllergies([...p.allergies]);
      }
      setActiveStep(0);
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleCondition = (cond: string) => {
    triggerHapticSelection();
    setHasNoConditions(false);
    setSelectedConditions(prev => 
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  };

  const handleAddCustomCondition = () => {
    const trimmed = customCondition.trim();
    if (trimmed && !selectedConditions.includes(trimmed)) {
      triggerHapticLight();
      setSelectedConditions(prev => [...prev, trimmed]);
      setCustomCondition('');
      setHasNoConditions(false);
    }
  };

  const toggleAllergy = (all: string) => {
    triggerHapticSelection();
    setHasNoAllergies(false);
    setSelectedAllergies(prev => 
      prev.includes(all) ? prev.filter(a => a !== all) : [...prev, all]
    );
  };

  const handleAddCustomAllergy = () => {
    const trimmed = customAllergy.trim();
    if (trimmed && !selectedAllergies.includes(trimmed)) {
      triggerHapticLight();
      setSelectedAllergies(prev => [...prev, trimmed]);
      setCustomAllergy('');
      setHasNoAllergies(false);
    }
  };

  const handleTogglePresetMedication = (preset: { name: string; dosage: string }) => {
    triggerHapticSelection();
    setHasNoMedications(false);
    const label = `${preset.name} (${preset.dosage})`;
    const exists = medicationsList.some(m => m.toLowerCase().includes(preset.name.toLowerCase()));
    if (exists) {
      setMedicationsList(prev => prev.filter(m => !m.toLowerCase().includes(preset.name.toLowerCase())));
    } else {
      setMedicationsList(prev => [...prev, label]);
    }
  };

  const handleAddMedication = () => {
    const trimmed = medName.trim();
    if (trimmed) {
      triggerHapticLight();
      const entry = medDosage.trim() ? `${trimmed} (${medDosage.trim()})` : trimmed;
      if (!medicationsList.includes(entry)) {
        setMedicationsList(prev => [...prev, entry]);
      }
      setMedName('');
      setMedDosage('');
      setHasNoMedications(false);
    }
  };

  const removeMedication = (index: number) => {
    triggerHapticLight();
    setMedicationsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    triggerHapticSuccess();
    
    // Save to ProfileEngine
    completeProfileOnboarding({
      demographics: {
        name: name.trim() || 'Patient',
        age: age.trim(),
        gender: gender || 'Not Specified',
        bloodGroup: bloodGroup,
        height: height.trim(),
        weight: weight.trim(),
        emergencyContact: emergencyContact.trim(),
      },
      conditions: hasNoConditions ? [] : selectedConditions,
      allergies: hasNoAllergies ? [] : selectedAllergies,
      medications: hasNoMedications ? [] : medicationsList,
      healthFocus: selectedConditions.length > 0 ? selectedConditions[0] : 'General Wellness'
    });

    // Award completion points
    awardPoints(50, 'Medical Dossier Initialized ✨', 'milestone', 'profile_completion_action');

    if (onCompleted) {
      onCompleted();
    }
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.52)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Complete Health Profile"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: 'calc(100vh - max(36px, env(safe-area-inset-top, 36px)))',
            background: 'linear-gradient(180deg, #FFFDFB 0%, #FFF8F4 45%, #FEF2E8 100%)',
            borderTopLeftRadius: '32px',
            borderTopRightRadius: '32px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -20px 60px rgba(251, 146, 60, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.95)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Pull Notch Indicator */}
          <div 
            style={{ 
              width: '100%', 
              height: '18px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              paddingTop: '6px'
            }}
            onClick={onClose}
          >
            <div style={{ width: '38px', height: '4px', backgroundColor: '#E2D9D2', borderRadius: '999px' }} />
          </div>

          {/* Modal Header (Zero Status Bar Clipping) */}
          <div style={{
            padding: '4px 20px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(243, 232, 225, 0.85)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25), inset 0 1px 0 rgba(255,255,255,0.4)'
              }}>
                <FolderHeart size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                    Clinical Health Profile
                  </h3>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: '#DCFCE7',
                    color: '#15803D',
                    border: '1px solid #A7F3D0'
                  }}>
                    +50 PTS
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#78716C', fontWeight: 500 }}>
                  Essential clinical baseline for safety & protocols
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                onClose();
              }}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(243, 232, 225, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer'
              }}
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>

          {/* Stepper Progress Bar & Horizontal Pill Tabs (Zero Text Collision) */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 248, 244, 0.9) 100%)',
            borderBottom: '1px solid rgba(243, 232, 225, 0.85)',
            padding: '8px 16px 6px'
          }}>
            {/* 4-Segment Progress Bar */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              {STEPS.map((s) => {
                const isPassed = activeStep >= s.id;
                return (
                  <div
                    key={s.id}
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '999px',
                      background: isPassed 
                        ? 'linear-gradient(90deg, #34D399 0%, #059669 100%)' 
                        : '#E2D9D2',
                      transition: 'background 0.25s ease'
                    }}
                  />
                );
              })}
            </div>

            {/* Non-Colliding Pill Step Chips */}
            <div style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: '4px'
            }}>
              {STEPS.map((s) => {
                const isCurrent = activeStep === s.id;
                const isDone = activeStep > s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setActiveStep(s.id as any);
                    }}
                    style={{
                      flexShrink: 0,
                      padding: '6px 12px',
                      borderRadius: '999px',
                      border: isCurrent 
                        ? '1.5px solid #10B981' 
                        : isDone 
                          ? '1px solid #A7F3D0' 
                          : '1px solid rgba(243, 232, 225, 0.9)',
                      background: isCurrent 
                        ? '#ECFDF5' 
                        : isDone 
                          ? '#F0FDF4' 
                          : '#FFFFFF',
                      color: isCurrent 
                        ? '#065F46' 
                        : isDone 
                          ? '#15803D' 
                          : '#78716C',
                      fontSize: '12px',
                      fontWeight: isCurrent ? 800 : 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      boxShadow: isCurrent ? '0 2px 6px rgba(16, 185, 129, 0.12)' : 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isDone ? <Check size={11} strokeWidth={3} /> : null}
                    <span>{s.id + 1}. {s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flex: 1
          }}>
            {/* STEP 0: Demographics */}
            {activeStep === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Clinical Context Banner */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(254, 247, 242, 0.88) 100%)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  border: '1.5px solid rgba(243, 232, 225, 0.9)',
                  fontSize: '12px',
                  color: '#57534E',
                  lineHeight: 1.4
                }}>
                  💡 <strong style={{ color: '#0F172A' }}>Why this matters:</strong> Age and biological sex determine accurate clinical reference ranges for biomarkers, metabolic rates, and drug dosing.
                </div>

                {/* Name & Age */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Alex Taylor"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid #E2D9D2',
                        background: '#FFFFFF',
                        fontSize: '13.5px',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                      Age <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      placeholder="e.g. 34"
                      min="1"
                      max="120"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid #E2D9D2',
                        background: '#FFFFFF',
                        fontSize: '13.5px',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Biological Sex (Tactile Reference Capsule Chips) */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Biological Sex <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['Male', 'Female', 'Other'].map(s => {
                      const isSelected = gender === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            triggerHapticSelection();
                            setGender(s);
                          }}
                          style={{
                            flex: 1,
                            padding: '10px 8px',
                            borderRadius: '999px',
                            border: isSelected ? '1.5px solid #10B981' : '1.5px solid #E8E2DC',
                            background: isSelected ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' : '#FFFFFF',
                            color: isSelected ? '#065F46' : '#1E293B',
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: isSelected ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSelected && <Check size={13} color="#10B981" strokeWidth={3} />}
                          <span>{s}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Blood Group (Tactile Capsule Chips) */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Blood Group
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {BLOOD_GROUPS.map(bg => {
                      const isSelected = bloodGroup === bg;
                      return (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => {
                            triggerHapticSelection();
                            setBloodGroup(bg);
                          }}
                          style={{
                            padding: '7px 13px',
                            borderRadius: '999px',
                            border: isSelected ? '1.5px solid #10B981' : '1px solid #E8E2DC',
                            background: isSelected ? '#ECFDF5' : '#FFFFFF',
                            color: isSelected ? '#065F46' : '#64748B',
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                            boxShadow: isSelected ? '0 2px 6px rgba(16, 185, 129, 0.12)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {bg}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Height & Weight */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      placeholder="e.g. 175"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid #E2D9D2',
                        background: '#FFFFFF',
                        fontSize: '13.5px',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      placeholder="e.g. 72"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid #E2D9D2',
                        background: '#FFFFFF',
                        fontSize: '13.5px',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Emergency Contact (Optional)
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={e => setEmergencyContact(e.target.value)}
                    placeholder="e.g. Jane Doe (+1 555-0199)"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid #E2D9D2',
                      background: '#FFFFFF',
                      fontSize: '13.5px',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}

            {/* STEP 1: Conditions */}
            {activeStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(254, 247, 242, 0.88) 100%)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  border: '1.5px solid rgba(243, 232, 225, 0.9)',
                  fontSize: '12px',
                  color: '#57534E',
                  lineHeight: 1.4
                }}>
                  💡 <strong style={{ color: '#0F172A' }}>Medical Context:</strong> Chronic conditions help your AI specialist board tailor differential diagnoses, care protocols, and drug interactions.
                </div>

                {/* Healthy Toggle Pill Card */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    setHasNoConditions(prev => !prev);
                    if (!hasNoConditions) {
                      setSelectedConditions([]);
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '16px',
                    border: hasNoConditions ? '1.5px solid #10B981' : '1px solid rgba(243, 232, 225, 0.9)',
                    background: hasNoConditions ? '#ECFDF5' : '#FFFFFF',
                    color: hasNoConditions ? '#065F46' : '#334155',
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '7px',
                    border: hasNoConditions ? '2px solid #10B981' : '2px solid #CBD5E1',
                    background: hasNoConditions ? '#10B981' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF'
                  }}>
                    {hasNoConditions && <Check size={14} strokeWidth={3} />}
                  </div>
                  <span>I have no known chronic medical conditions (Healthy)</span>
                </button>

                {!hasNoConditions && (
                  <>
                    {/* Common Conditions Capsule Chips */}
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                        Common Conditions (Tap to Select)
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {COMMON_CONDITIONS.map(cond => {
                          const isSelected = selectedConditions.includes(cond);
                          return (
                            <button
                              key={cond}
                              type="button"
                              onClick={() => toggleCondition(cond)}
                              style={{
                                padding: '8px 15px',
                                borderRadius: '999px',
                                border: isSelected ? '1.5px solid #10B981' : '1.5px solid #E8E2DC',
                                background: isSelected ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' : '#FFFFFF',
                                color: isSelected ? '#065F46' : '#1E293B',
                                fontWeight: isSelected ? 800 : 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: isSelected ? '0 3px 10px rgba(16, 185, 129, 0.15)' : '0 1px 4px rgba(0,0,0,0.02)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>{cond}</span>
                              {isSelected && <Check size={13} color="#10B981" strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Write Custom Condition */}
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                        Other Condition
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={customCondition}
                          onChange={e => setCustomCondition(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomCondition(); } }}
                          placeholder="e.g. Celiac disease, Gout..."
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: '1px solid #E2D9D2',
                            background: '#FFFFFF',
                            fontSize: '13.5px',
                            color: '#0F172A',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomCondition}
                          style={{
                            padding: '10px 16px',
                            borderRadius: '12px',
                            background: '#10B981',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '13px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={16} /> Add
                        </button>
                      </div>
                    </div>

                    {/* Selected Summary */}
                    {selectedConditions.length > 0 && (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '14px',
                        padding: '12px',
                        border: '1px solid rgba(243, 232, 225, 0.9)'
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                          Selected ({selectedConditions.length})
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {selectedConditions.map(c => (
                            <span
                              key={c}
                              style={{
                                padding: '5px 11px',
                                borderRadius: '999px',
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#065F46',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              {c}
                              <button
                                type="button"
                                onClick={() => toggleCondition(c)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#059669', padding: 0 }}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* STEP 2: Medications */}
            {activeStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(254, 247, 242, 0.88) 100%)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  border: '1.5px solid rgba(243, 232, 225, 0.9)',
                  fontSize: '12px',
                  color: '#57534E',
                  lineHeight: 1.4
                }}>
                  💊 <strong style={{ color: '#0F172A' }}>Medications & Protocols:</strong> Medications listed here sync directly with your daily medication schedule and signature pill reminders!
                </div>

                {/* No Medications Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    setHasNoMedications(prev => !prev);
                    if (!hasNoMedications) {
                      setMedicationsList([]);
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '16px',
                    border: hasNoMedications ? '1.5px solid #10B981' : '1px solid rgba(243, 232, 225, 0.9)',
                    background: hasNoMedications ? '#ECFDF5' : '#FFFFFF',
                    color: hasNoMedications ? '#065F46' : '#334155',
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '7px',
                    border: hasNoMedications ? '2px solid #10B981' : '2px solid #CBD5E1',
                    background: hasNoMedications ? '#10B981' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF'
                  }}>
                    {hasNoMedications && <Check size={14} strokeWidth={3} />}
                  </div>
                  <span>I am not taking any daily prescription medications</span>
                </button>

                {!hasNoMedications && (
                  <>
                    {/* Quick Add Prescriptions (Matching Reference Screenshot) */}
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                        Quick-Add Popular Prescriptions
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {PRESET_MEDICATIONS.map(med => {
                          const isSelected = medicationsList.some(m => m.toLowerCase().includes(med.name.toLowerCase()));
                          return (
                            <button
                              key={med.name}
                              type="button"
                              onClick={() => handleTogglePresetMedication(med)}
                              style={{
                                padding: '8px 14px',
                                borderRadius: '999px',
                                border: isSelected ? '1.5px solid #10B981' : '1.5px solid #E8E2DC',
                                background: isSelected ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' : '#FFFFFF',
                                color: isSelected ? '#065F46' : '#1E293B',
                                fontWeight: isSelected ? 800 : 600,
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: isSelected ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>💊</span>
                              <span>{med.name}</span>
                              {isSelected && <Check size={13} color="#10B981" strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Write Custom Medication */}
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      padding: '12px 14px',
                      border: '1px solid rgba(243, 232, 225, 0.9)'
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                        Write Medication & Dosage
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="text"
                          value={medName}
                          onChange={e => setMedName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMedication(); } }}
                          placeholder="e.g. Metformin, Lisinopril..."
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid #E2D9D2',
                            fontSize: '13.5px',
                            outline: 'none'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            value={medDosage}
                            onChange={e => setMedDosage(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMedication(); } }}
                            placeholder="Dosage (e.g. 500mg with meal)..."
                            style={{
                              flex: 1,
                              padding: '10px 12px',
                              borderRadius: '10px',
                              border: '1px solid #E2D9D2',
                              fontSize: '13.5px',
                              outline: 'none'
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddMedication}
                            disabled={!medName.trim()}
                            style={{
                              padding: '10px 18px',
                              borderRadius: '10px',
                              background: medName.trim() ? '#10B981' : '#E2E8F0',
                              color: medName.trim() ? '#FFF' : '#94A3B8',
                              fontWeight: 700,
                              fontSize: '13px',
                              border: 'none',
                              cursor: medName.trim() ? 'pointer' : 'default'
                            }}
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Active Medications List */}
                    {medicationsList.length > 0 && (
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                          Scheduled Medications ({medicationsList.length})
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {medicationsList.map((m, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                background: '#FFFFFF',
                                border: '1px solid rgba(243, 232, 225, 0.9)',
                                borderRadius: '12px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Pill size={16} color="#059669" />
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{m}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeMedication(idx)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* STEP 3: Allergies */}
            {activeStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(254, 247, 242, 0.88) 100%)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  border: '1.5px solid rgba(243, 232, 225, 0.9)',
                  fontSize: '12px',
                  color: '#57534E',
                  lineHeight: 1.4
                }}>
                  ⚠️ <strong style={{ color: '#0F172A' }}>Allergy Guard:</strong> HealthChain cross-checks these against any suggested pharmaceuticals or nutritional plans to prevent adverse events.
                </div>

                {/* NKDA Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    setHasNoAllergies(prev => !prev);
                    if (!hasNoAllergies) {
                      setSelectedAllergies([]);
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '16px',
                    border: hasNoAllergies ? '1.5px solid #10B981' : '1px solid rgba(243, 232, 225, 0.9)',
                    background: hasNoAllergies ? '#ECFDF5' : '#FFFFFF',
                    color: hasNoAllergies ? '#065F46' : '#334155',
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '7px',
                    border: hasNoAllergies ? '2px solid #10B981' : '2px solid #CBD5E1',
                    background: hasNoAllergies ? '#10B981' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF'
                  }}>
                    {hasNoAllergies && <Check size={14} strokeWidth={3} />}
                  </div>
                  <span>No Known Drug or Food Allergies (NKDA)</span>
                </button>

                {!hasNoAllergies && (
                  <>
                    {/* Common Allergens Capsule Chips */}
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                        Common Allergens (Tap to Select)
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {COMMON_ALLERGIES.map(all => {
                          const isSelected = selectedAllergies.includes(all);
                          return (
                            <button
                              key={all}
                              type="button"
                              onClick={() => toggleAllergy(all)}
                              style={{
                                padding: '8px 15px',
                                borderRadius: '999px',
                                border: isSelected ? '1.5px solid #F43F5E' : '1.5px solid #E8E2DC',
                                background: isSelected ? '#FEF2F2' : '#FFFFFF',
                                color: isSelected ? '#E11D48' : '#1E293B',
                                fontWeight: isSelected ? 800 : 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: isSelected ? '0 2px 8px rgba(244, 63, 94, 0.15)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>{all}</span>
                              {isSelected && <X size={13} color="#E11D48" strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Write Custom Allergy */}
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                        Other Allergy
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={customAllergy}
                          onChange={e => setCustomAllergy(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomAllergy(); } }}
                          placeholder="e.g. Iodine dye, Ciprofloxacin..."
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: '1px solid #E2D9D2',
                            background: '#FFFFFF',
                            fontSize: '13.5px',
                            color: '#0F172A',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomAllergy}
                          style={{
                            padding: '10px 16px',
                            borderRadius: '12px',
                            background: '#F43F5E',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '13px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={16} /> Add
                        </button>
                      </div>
                    </div>

                    {/* Selected Allergies Summary */}
                    {selectedAllergies.length > 0 && (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '14px',
                        padding: '12px',
                        border: '1px solid rgba(243, 232, 225, 0.9)'
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#E11D48', textTransform: 'uppercase' }}>
                          Identified Allergens ({selectedAllergies.length})
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {selectedAllergies.map(a => (
                            <span
                              key={a}
                              style={{
                                padding: '5px 11px',
                                borderRadius: '999px',
                                background: '#FEF2F2',
                                border: '1px solid #FECDD3',
                                color: '#9F1239',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              {a}
                              <button
                                type="button"
                                onClick={() => toggleAllergy(a)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#E11D48', padding: 0 }}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Fixed Footer Actions (Zero Clipping with Bottom Tab Bar) */}
          <div style={{
            padding: '12px 20px calc(14px + env(safe-area-inset-bottom, 16px))',
            borderTop: '1px solid rgba(243, 232, 225, 0.85)',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            {activeStep > 0 ? (
              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  setActiveStep(prev => (prev - 1) as any);
                }}
                style={{
                  padding: '12px 18px',
                  borderRadius: '16px',
                  border: '1.5px solid #E2D9D2',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={15} /> Back
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end' }}>
              {activeStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    setActiveStep(prev => (prev + 1) as any);
                  }}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '14px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)'
                  }}
                >
                  Next Step <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '15px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(225, 29, 72, 0.28), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }}
                >
                  <Sparkles size={16} /> Save & Activate (+50 PTS)
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
