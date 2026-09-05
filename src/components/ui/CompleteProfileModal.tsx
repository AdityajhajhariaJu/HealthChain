import React, { useState, useEffect } from 'react';
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
  Trash2
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
  'Anxiety / Depression'
];

const COMMON_ALLERGIES = [
  'Penicillin',
  'Sulfa Drugs',
  'Aspirin / NSAIDs',
  'Peanuts & Tree Nuts',
  'Latex',
  'Shellfish',
  'Pollen / Seasonal'
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

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

  // Initialize from storage on open
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
    }
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

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '16px 12px' : '24px',
          zIndex: 1000,
          overflowY: 'auto'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #F1F5F9',
            background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FolderHeart size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                    Complete Health Profile
                  </h3>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 7px',
                    borderRadius: '6px',
                    background: '#DCFCE7',
                    color: '#15803D'
                  }}>
                    +50 PTS
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                  Essential clinical baseline for contraindication safety & protocols
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Stepper Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #F1F5F9',
            background: '#F8FAFC',
            overflowX: 'auto',
            padding: '4px 8px',
            gap: '4px'
          }}>
            {[
              { id: 0, label: '1. Demographics' },
              { id: 1, label: '2. Conditions' },
              { id: 2, label: '3. Medications' },
              { id: 3, label: '4. Allergies' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  setActiveStep(tab.id as any);
                }}
                style={{
                  flex: 1,
                  whiteSpace: 'nowrap',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: activeStep === tab.id ? 700 : 500,
                  color: activeStep === tab.id ? '#0F766E' : '#64748B',
                  background: activeStep === tab.id ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  boxShadow: activeStep === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            {/* STEP 0: Demographics */}
            {activeStep === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', fontSize: '12px', color: '#475569' }}>
                  💡 <strong>Why this matters:</strong> Age and biological sex determine accurate reference ranges for biomarkers, metabolic calculations, and drug dosing.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
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
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
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
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Biological Sex <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['Male', 'Female', 'Other'].map(s => (
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
                          borderRadius: '10px',
                          border: gender === s ? '1.5px solid #0F766E' : '1px solid #CBD5E1',
                          background: gender === s ? '#ECFDF5' : '#FFFFFF',
                          color: gender === s ? '#065F46' : '#334155',
                          fontWeight: gender === s ? 700 : 500,
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Blood Group
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {BLOOD_GROUPS.map(bg => (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => {
                          triggerHapticSelection();
                          setBloodGroup(bg);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: bloodGroup === bg ? '1.5px solid #0F766E' : '1px solid #E2E8F0',
                          background: bloodGroup === bg ? '#ECFDF5' : '#FFFFFF',
                          color: bloodGroup === bg ? '#065F46' : '#64748B',
                          fontWeight: bloodGroup === bg ? 700 : 500,
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
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
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
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
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
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
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}

            {/* STEP 1: Conditions */}
            {activeStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', fontSize: '12px', color: '#475569' }}>
                  💡 <strong>Medical Context:</strong> Chronic conditions help your AI specialist board tailor DDx differential diagnoses, care plans, and drug warnings.
                </div>

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
                    borderRadius: '12px',
                    border: hasNoConditions ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                    background: hasNoConditions ? '#ECFDF5' : '#FFFFFF',
                    color: hasNoConditions ? '#065F46' : '#334155',
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
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    border: hasNoConditions ? '2px solid #10B981' : '2px solid #CBD5E1',
                    background: hasNoConditions ? '#10B981' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF'
                  }}>
                    {hasNoConditions && <Check size={14} />}
                  </div>
                  <span>I have no known chronic medical conditions (Healthy)</span>
                </button>

                {!hasNoConditions && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                        Common Conditions (Tap to select)
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {COMMON_CONDITIONS.map(cond => {
                          const isSelected = selectedConditions.includes(cond);
                          return (
                            <button
                              key={cond}
                              type="button"
                              onClick={() => toggleCondition(cond)}
                              style={{
                                padding: '8px 14px',
                                borderRadius: '999px',
                                border: isSelected ? '1.5px solid #0F766E' : '1px solid #E2E8F0',
                                background: isSelected ? '#ECFDF5' : '#FFFFFF',
                                color: isSelected ? '#065F46' : '#334155',
                                fontWeight: isSelected ? 700 : 500,
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {cond} {isSelected && '✓'}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Other Condition
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={customCondition}
                          onChange={e => setCustomCondition(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomCondition(); } }}
                          placeholder="e.g. Celiac disease"
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomCondition}
                          style={{
                            padding: '10px 16px',
                            borderRadius: '10px',
                            background: '#0F766E',
                            color: 'white',
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

                    {selectedConditions.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                          Selected Conditions ({selectedConditions.length})
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {selectedConditions.map(c => (
                            <span
                              key={c}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: '#F1F5F9',
                                color: '#0F172A',
                                fontSize: '12px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              {c}
                              <button
                                type="button"
                                onClick={() => toggleCondition(c)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', padding: 0 }}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', fontSize: '12px', color: '#475569' }}>
                  💊 <strong>Medications & Protocols:</strong> Medications listed here will automatically appear on your daily dashboard so you can log your doses daily!
                </div>

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
                    borderRadius: '12px',
                    border: hasNoMedications ? '1.5px solid #10B981' : '1px solid #E2E8F0',
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
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    border: hasNoMedications ? '2px solid #10B981' : '2px solid #CBD5E1',
                    background: hasNoMedications ? '#10B981' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF'
                  }}>
                    {hasNoMedications && <Check size={14} />}
                  </div>
                  <span>I am not taking any daily prescription medications</span>
                </button>

                {!hasNoMedications && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                          Medication Name
                        </label>
                        <input
                          type="text"
                          value={medName}
                          onChange={e => setMedName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMedication(); } }}
                          placeholder="e.g. Metformin"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                          Dosage / Timing
                        </label>
                        <input
                          type="text"
                          value={medDosage}
                          onChange={e => setMedDosage(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMedication(); } }}
                          placeholder="e.g. 500mg daily"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddMedication}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '10px',
                          background: '#0F766E',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '13px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          height: '42px'
                        }}
                      >
                        <Plus size={16} /> Add
                      </button>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                        Active Medications ({medicationsList.length})
                      </span>
                      {medicationsList.length === 0 ? (
                        <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>
                          No medications added yet. Type medication name above or select "No daily medications".
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                          {medicationsList.map((m, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '10px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Pill size={16} color="#0F766E" />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{m}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeMedication(idx)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 3: Allergies */}
            {activeStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', fontSize: '12px', color: '#475569' }}>
                  ⚠️ <strong>Allergy Guard:</strong> HealthChain cross-checks these against any suggested pharmaceuticals or nutritional plans to prevent adverse events.
                </div>

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
                    borderRadius: '12px',
                    border: hasNoAllergies ? '1.5px solid #10B981' : '1px solid #E2E8F0',
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
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    border: hasNoAllergies ? '2px solid #10B981' : '2px solid #CBD5E1',
                    background: hasNoAllergies ? '#10B981' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF'
                  }}>
                    {hasNoAllergies && <Check size={14} />}
                  </div>
                  <span>No Known Drug or Food Allergies (NKDA)</span>
                </button>

                {!hasNoAllergies && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                        Common Allergens (Tap to select)
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {COMMON_ALLERGIES.map(all => {
                          const isSelected = selectedAllergies.includes(all);
                          return (
                            <button
                              key={all}
                              type="button"
                              onClick={() => toggleAllergy(all)}
                              style={{
                                padding: '8px 14px',
                                borderRadius: '999px',
                                border: isSelected ? '1.5px solid #EF4444' : '1px solid #E2E8F0',
                                background: isSelected ? '#FEF2F2' : '#FFFFFF',
                                color: isSelected ? '#B91C1C' : '#334155',
                                fontWeight: isSelected ? 700 : 500,
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {all} {isSelected && '✕'}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Other Allergy
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={customAllergy}
                          onChange={e => setCustomAllergy(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomAllergy(); } }}
                          placeholder="e.g. Iodine contrast dye"
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomAllergy}
                          style={{
                            padding: '10px 16px',
                            borderRadius: '10px',
                            background: '#0F766E',
                            color: 'white',
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

                    {selectedAllergies.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                          Selected Allergies ({selectedAllergies.length})
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {selectedAllergies.map(a => (
                            <span
                              key={a}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: '#FEF2F2',
                                color: '#991B1B',
                                fontSize: '12px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              {a}
                              <button
                                type="button"
                                onClick={() => toggleAllergy(a)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#991B1B', padding: 0 }}
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

          {/* Footer Actions */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #F1F5F9',
            background: '#F8FAFC',
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
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 600,
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

            <div style={{ display: 'flex', gap: '10px' }}>
              {activeStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    setActiveStep(prev => (prev + 1) as any);
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    background: '#0F766E',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(15, 118, 110, 0.2)'
                  }}
                >
                  Next Step <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                  }}
                >
                  <Sparkles size={16} /> Save & Activate (+50 PTS)
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
