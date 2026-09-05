import React, { useState, useEffect, useMemo } from 'react';
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
  AlertTriangle,
  Scale,
  Activity,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Clock,
  ShieldCheck,
  Zap,
  Info,
  User,
  Calendar,
  Ruler,
  Phone,
  Heart
} from 'lucide-react';
import { getProfile, completeProfileOnboarding } from '../../services/ProfileEngine';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';
import { syncMedicationsFromProfile } from '../../services/VitaminScheduleService';

export type CircadianSlot = 'morning' | 'midday' | 'evening' | 'bedtime';
export type AllergySeverity = 'mild' | 'moderate' | 'severe';

export interface ProfileMedicationItem {
  name: string;
  dosage: string;
  circadianSlot: CircadianSlot;
  time?: string;
}

export interface ProfileAllergyItem {
  name: string;
  severity: AllergySeverity;
}

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

const PRESET_MEDICATIONS: { name: string; dosage: string; defaultSlot: CircadianSlot }[] = [
  { name: 'Metformin', dosage: '500mg with meal', defaultSlot: 'midday' },
  { name: 'Lisinopril', dosage: '10mg daily', defaultSlot: 'morning' },
  { name: 'Atorvastatin', dosage: '20mg at night', defaultSlot: 'bedtime' },
  { name: 'Levothyroxine', dosage: '50mcg fasting', defaultSlot: 'morning' },
  { name: 'Sertraline', dosage: '50mg daily', defaultSlot: 'morning' },
  { name: 'Escitalopram', dosage: '10mg daily', defaultSlot: 'morning' },
  { name: 'Ventolin', dosage: 'Inhaler as directed', defaultSlot: 'morning' },
  { name: 'Spironolactone', dosage: '25mg daily', defaultSlot: 'morning' },
  { name: 'Prednisone', dosage: '10mg with breakfast', defaultSlot: 'morning' },
  { name: 'Magnesium', dosage: '200mg before sleep', defaultSlot: 'bedtime' }
];

const COMMON_ALLERGIES: { name: string; defaultSeverity: AllergySeverity }[] = [
  { name: 'Penicillin', defaultSeverity: 'severe' },
  { name: 'Sulfa Drugs', defaultSeverity: 'severe' },
  { name: 'Aspirin / NSAIDs', defaultSeverity: 'moderate' },
  { name: 'Peanuts & Tree Nuts', defaultSeverity: 'severe' },
  { name: 'Latex', defaultSeverity: 'moderate' },
  { name: 'Shellfish', defaultSeverity: 'severe' },
  { name: 'Pollen / Seasonal', defaultSeverity: 'mild' },
  { name: 'Dairy / Lactose', defaultSeverity: 'mild' }
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

const STEPS = [
  { id: 0, label: 'Demographics & BMI' },
  { id: 1, label: 'Conditions' },
  { id: 2, label: 'Medications & Clock' },
  { id: 3, label: 'Allergy Guard' }
];

const CIRCADIAN_SLOT_META: Record<CircadianSlot, { label: string; icon: string; time: string; color: string; bg: string }> = {
  morning: { label: 'Morning', icon: '🌅', time: '08:30', color: '#B45309', bg: '#FEF3C7' },
  midday: { label: 'Midday', icon: '☀️', time: '13:00', color: '#D97706', bg: '#FFFBEB' },
  evening: { label: 'Evening', icon: '🌇', time: '18:30', color: '#C2410C', bg: '#FFEDD5' },
  bedtime: { label: 'Bedtime', icon: '🌙', time: '21:30', color: '#4338CA', bg: '#EEF2FF' },
};

const ALLERGY_SEVERITY_META: Record<AllergySeverity, { label: string; chipLabel: string; color: string; bg: string; border: string }> = {
  mild: { label: 'Mild', chipLabel: 'Mild / Rash', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  moderate: { label: 'Moderate', chipLabel: 'Moderate', color: '#C2410C', bg: '#FFEDD5', border: '#FED7AA' },
  severe: { label: 'Severe ⚠️', chipLabel: 'Severe / Anaphylaxis ⚠️', color: '#BE123C', bg: '#FFE4E6', border: '#FDA4AF' },
};

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({ isOpen, onClose, onCompleted }) => {
  const isMobile = useIsMobile();
  const [activeStep, setActiveStep] = useState<0 | 1 | 2 | 3>(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Demographics state pre-filled from existing profile
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('Unknown');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Dual-Unit conversion state (cm <-> ft/in, kg <-> lbs)
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [feetValue, setFeetValue] = useState('');
  const [inchesValue, setInchesValue] = useState('');

  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [lbsValue, setLbsValue] = useState('');

  const handleCmChange = (val: string) => {
    setHeight(val);
    const h = parseFloat(val);
    if (!isNaN(h) && h > 0) {
      const totIn = h / 2.54;
      setFeetValue(String(Math.floor(totIn / 12)));
      setInchesValue(String(Math.round(totIn % 12)));
    } else {
      setFeetValue('');
      setInchesValue('');
    }
  };

  const handleFtInChange = (newFt: string, newIn: string) => {
    setFeetValue(newFt);
    setInchesValue(newIn);
    const f = parseFloat(newFt) || 0;
    const i = parseFloat(newIn) || 0;
    if (f > 0 || i > 0) {
      const totalCm = Math.round((f * 12 + i) * 2.54);
      setHeight(String(totalCm));
    } else {
      setHeight('');
    }
  };

  const handleKgChange = (val: string) => {
    setWeight(val);
    const w = parseFloat(val);
    if (!isNaN(w) && w > 0) {
      setLbsValue(String(Math.round(w * 2.20462)));
    } else {
      setLbsValue('');
    }
  };

  const handleLbsChange = (val: string) => {
    setLbsValue(val);
    const l = parseFloat(val);
    if (!isNaN(l) && l > 0) {
      const kg = Math.round((l / 2.20462) * 10) / 10;
      setWeight(String(kg));
    } else {
      setWeight('');
    }
  };

  // Conditions state
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [hasNoConditions, setHasNoConditions] = useState(false);

  // Structured Medications state
  const [medicationsList, setMedicationsList] = useState<ProfileMedicationItem[]>([]);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medSlot, setMedSlot] = useState<CircadianSlot>('morning');
  const [hasNoMedications, setHasNoMedications] = useState(false);

  // Structured Allergies state
  const [selectedAllergies, setSelectedAllergies] = useState<ProfileAllergyItem[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [customSeverity, setCustomSeverity] = useState<AllergySeverity>('moderate');
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
        const initH = p.demographics.height ? String(p.demographics.height) : '';
        const initW = p.demographics.weight ? String(p.demographics.weight) : '';
        setHeight(initH);
        setWeight(initW);
        setEmergencyContact(p.demographics.emergencyContact || '');

        if (initH) {
          const hVal = parseFloat(initH);
          if (!isNaN(hVal) && hVal > 0) {
            const totIn = hVal / 2.54;
            setFeetValue(String(Math.floor(totIn / 12)));
            setInchesValue(String(Math.round(totIn % 12)));
          }
        }
        if (initW) {
          const wVal = parseFloat(initW);
          if (!isNaN(wVal) && wVal > 0) {
            setLbsValue(String(Math.round(wVal * 2.20462)));
          }
        }
      }
      if (Array.isArray(p?.conditions)) {
        setSelectedConditions([...p.conditions]);
      }
      if (Array.isArray(p?.medications)) {
        const parsedMeds: ProfileMedicationItem[] = p.medications.map((m: any) => {
          if (typeof m === 'string') {
            const match = m.match(/^([^(]+)(?:\(([^)]+)\))?/);
            return {
              name: match ? match[1].trim() : m.trim(),
              dosage: match && match[2] ? match[2].trim() : 'As prescribed',
              circadianSlot: 'morning' as CircadianSlot,
              time: '08:30'
            };
          }
          return {
            name: m.name || '',
            dosage: m.dosage || 'As prescribed',
            circadianSlot: (m.circadianSlot || 'morning') as CircadianSlot,
            time: m.time || (m.circadianSlot === 'bedtime' ? '21:30' : m.circadianSlot === 'evening' ? '18:30' : m.circadianSlot === 'midday' ? '13:00' : '08:30')
          };
        }).filter(m => m.name);
        setMedicationsList(parsedMeds);
      }
      if (Array.isArray(p?.allergies)) {
        const parsedAllergies: ProfileAllergyItem[] = p.allergies.map((a: any) => {
          if (typeof a === 'string') {
            return { name: a, severity: 'moderate' as AllergySeverity };
          }
          return { name: a.name || '', severity: (a.severity || 'moderate') as AllergySeverity };
        }).filter(a => a.name);
        setSelectedAllergies(parsedAllergies);
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

  // LIVE DYNAMIC BMI & METABOLIC GAUGE COMPUTATION
  const bmiData = useMemo(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (isNaN(h) || isNaN(w) || h < 50 || h > 260 || w < 20 || w > 350) {
      return null;
    }

    const heightM = h / 100;
    const bmi = Math.round((w / (heightM * heightM)) * 10) / 10;
    const minIdealKg = Math.round(18.5 * heightM * heightM);
    const maxIdealKg = Math.round(24.9 * heightM * heightM);

    let category = 'Normal';
    let color = '#059669';
    let bg = '#ECFDF5';
    let border = '#A7F3D0';
    let needlePercent = 38;
    let takeaway = 'Optimal metabolic equilibrium. Cardiovascular, glycemic, and longevity baselines are calibrated.';

    if (bmi < 18.5) {
      category = 'Underweight';
      color = '#D97706';
      bg = '#FEF3C7';
      border = '#FDE68A';
      needlePercent = Math.max(6, Math.min(22, (bmi / 18.5) * 25));
      takeaway = 'Resting caloric and nutrient baseline is below standard clinical reference points.';
    } else if (bmi <= 24.9) {
      category = 'Normal Weight';
      color = '#059669';
      bg = '#ECFDF5';
      border = '#A7F3D0';
      needlePercent = 25 + ((bmi - 18.5) / (24.9 - 18.5)) * 25;
      takeaway = 'Optimal metabolic equilibrium. Caloric and vascular load are well balanced.';
    } else if (bmi <= 29.9) {
      category = 'Overweight';
      color = '#EA580C';
      bg = '#FFEDD5';
      border = '#FED7AA';
      needlePercent = 50 + ((bmi - 25.0) / (29.9 - 25.0)) * 25;
      takeaway = 'Modest metabolic elevation. Resistance training and glycemic moderation recommended.';
    } else {
      category = 'Elevated BMI';
      color = '#DC2626';
      bg = '#FEE2E2';
      border = '#FECDD3';
      needlePercent = Math.min(94, 75 + ((bmi - 30.0) / 15) * 25);
      takeaway = 'Elevated metabolic strain. Clinical collaboration on diet and insulin sensitivity recommended.';
    }

    // Basal Metabolic Rate (Mifflin-St Jeor formula)
    let bmr: number | null = null;
    const a = parseFloat(age);
    if (!isNaN(a) && a > 5 && a < 110) {
      if (gender === 'Female') {
        bmr = Math.round(10 * w + 6.25 * h - 5 * a - 161);
      } else if (gender === 'Male') {
        bmr = Math.round(10 * w + 6.25 * h - 5 * a + 5);
      } else {
        bmr = Math.round(10 * w + 6.25 * h - 5 * a - 78);
      }
    }

    const idealRangeStr = weightUnit === 'lbs'
      ? `${Math.round(minIdealKg * 2.20462)} - ${Math.round(maxIdealKg * 2.20462)} lbs`
      : `${minIdealKg} - ${maxIdealKg} kg`;

    return {
      bmi,
      category,
      color,
      bg,
      border,
      needlePercent,
      takeaway,
      idealRange: idealRangeStr,
      bmr
    };
  }, [height, weight, age, gender, weightUnit]);

  if (!isOpen) return null;

  // Step 1: Conditions Handlers
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

  // Step 2: Medications Handlers
  const handleTogglePresetMedication = (preset: { name: string; dosage: string; defaultSlot: CircadianSlot }) => {
    triggerHapticSelection();
    setHasNoMedications(false);
    const existingIndex = medicationsList.findIndex(m => m.name.toLowerCase() === preset.name.toLowerCase());
    if (existingIndex >= 0) {
      setMedicationsList(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      const defaultTime = CIRCADIAN_SLOT_META[preset.defaultSlot].time;
      setMedicationsList(prev => [...prev, {
        name: preset.name,
        dosage: preset.dosage,
        circadianSlot: preset.defaultSlot,
        time: defaultTime
      }]);
    }
  };

  const handleAddCustomMedication = () => {
    const trimmedName = medName.trim();
    if (trimmedName) {
      triggerHapticLight();
      const defaultTime = CIRCADIAN_SLOT_META[medSlot].time;
      const existingIndex = medicationsList.findIndex(m => m.name.toLowerCase() === trimmedName.toLowerCase());
      const newEntry: ProfileMedicationItem = {
        name: trimmedName,
        dosage: medDosage.trim() || 'As prescribed',
        circadianSlot: medSlot,
        time: defaultTime
      };

      if (existingIndex >= 0) {
        setMedicationsList(prev => {
          const updated = [...prev];
          updated[existingIndex] = newEntry;
          return updated;
        });
      } else {
        setMedicationsList(prev => [...prev, newEntry]);
      }

      setMedName('');
      setMedDosage('');
      setHasNoMedications(false);
    }
  };

  const updateMedicationSlot = (index: number, newSlot: CircadianSlot) => {
    triggerHapticSelection();
    setMedicationsList(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = {
          ...copy[index],
          circadianSlot: newSlot,
          time: CIRCADIAN_SLOT_META[newSlot].time
        };
      }
      return copy;
    });
  };

  const removeMedication = (index: number) => {
    triggerHapticLight();
    setMedicationsList(prev => prev.filter((_, i) => i !== index));
  };

  // Step 3: Allergies Handlers
  const togglePresetAllergy = (preset: { name: string; defaultSeverity: AllergySeverity }) => {
    triggerHapticSelection();
    setHasNoAllergies(false);
    const existingIndex = selectedAllergies.findIndex(a => a.name.toLowerCase() === preset.name.toLowerCase());
    if (existingIndex >= 0) {
      setSelectedAllergies(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      setSelectedAllergies(prev => [...prev, {
        name: preset.name,
        severity: preset.defaultSeverity
      }]);
    }
  };

  const handleAddCustomAllergy = () => {
    const trimmed = customAllergy.trim();
    if (trimmed) {
      triggerHapticLight();
      const existingIndex = selectedAllergies.findIndex(a => a.name.toLowerCase() === trimmed.toLowerCase());
      if (existingIndex >= 0) {
        setSelectedAllergies(prev => {
          const copy = [...prev];
          copy[existingIndex].severity = customSeverity;
          return copy;
        });
      } else {
        setSelectedAllergies(prev => [...prev, { name: trimmed, severity: customSeverity }]);
      }
      setCustomAllergy('');
      setHasNoAllergies(false);
    }
  };

  const updateAllergySeverity = (index: number, newSeverity: AllergySeverity) => {
    triggerHapticSelection();
    setSelectedAllergies(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], severity: newSeverity };
      }
      return copy;
    });
  };

  const removeAllergy = (index: number) => {
    triggerHapticLight();
    setSelectedAllergies(prev => prev.filter((_, i) => i !== index));
  };

  // COMPLETE PROFILE & CROSS-SYSTEM SYNCHRONIZATION
  const handleSave = async () => {
    setIsSaving(true);
    triggerHapticSuccess();

    const formattedMeds = hasNoMedications ? [] : medicationsList.map(m => ({
      name: m.name,
      dosage: m.dosage || 'As prescribed',
      circadianSlot: m.circadianSlot,
      time: m.time || CIRCADIAN_SLOT_META[m.circadianSlot].time
    }));

    const formattedAllergies = hasNoAllergies ? [] : selectedAllergies.map(a => ({
      name: a.name,
      severity: a.severity
    }));

    // 1. Save to ProfileEngine
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
      allergies: formattedAllergies,
      medications: formattedMeds,
      healthFocus: selectedConditions.length > 0 ? selectedConditions[0] : 'General Wellness'
    });

    // 2. Synchronize medications with daily VitaminScheduleService & push notifications
    try {
      if (formattedMeds.length > 0) {
        await syncMedicationsFromProfile(formattedMeds);
      }
    } catch (err) {
      console.warn('Failed to sync medications to vitamin schedule:', err);
    }

    // 3. Award milestone points
    awardPoints(50, 'Medical Dossier Initialized ✨', 'milestone', 'profile_completion_action');

    setIsSaving(false);
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
            borderBottom: '1px solid rgba(254, 215, 195, 0.85)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                boxShadow: '0 6px 18px rgba(255, 107, 74, 0.32), inset 0 1px 0 rgba(255,255,255,0.4)'
              }}>
                <FolderHeart size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#1C1917', letterSpacing: '-0.3px' }}>
                    Clinical Health Profile
                  </h3>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: '#ECFDF5',
                    color: '#059669',
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
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(254, 215, 195, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#78716C',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>

          {/* Segmented Glass Stepper Control */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(254, 215, 195, 0.7)',
            padding: '10px 18px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '6px',
              background: 'rgba(254, 243, 235, 0.75)',
              borderRadius: '16px',
              padding: '4px',
              border: '1px solid rgba(254, 215, 195, 0.6)'
            }}>
              {[
                { id: 0, label: 'Profile', icon: '👤' },
                { id: 1, label: 'Conditions', icon: '🩺' },
                { id: 2, label: 'Meds', icon: '💊' },
                { id: 3, label: 'Allergies', icon: '🛡️' }
              ].map((s) => {
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
                      padding: '8px 4px',
                      borderRadius: '12px',
                      border: isCurrent ? '1.5px solid #FF6B4A' : 'none',
                      background: isCurrent 
                        ? 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)' 
                        : isDone 
                          ? '#ECFDF5' 
                          : 'transparent',
                      color: isCurrent 
                        ? '#FFFFFF' 
                        : isDone 
                          ? '#059669' 
                          : '#78716C',
                      fontSize: '11.5px',
                      fontWeight: isCurrent ? 800 : isDone ? 700 : 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      boxShadow: isCurrent ? '0 4px 14px rgba(255, 107, 74, 0.28)' : 'none',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    {isDone ? (
                      <Check size={11} strokeWidth={3} />
                    ) : (
                      <span style={{ fontSize: '11px' }}>{s.icon}</span>
                    )}
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Form Body with Generous Bottom Clearance */}
          <div style={{
            padding: '16px 20px 100px 20px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flex: 1
          }}>
            {/* STEP 0: Demographics */}
            {activeStep === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Clinical Context Banner */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 247, 242, 0.9) 100%)',
                  borderRadius: '18px',
                  padding: '12px 14px',
                  border: '1.5px solid rgba(254, 215, 195, 0.85)',
                  boxShadow: '0 4px 16px rgba(251, 146, 60, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '11px',
                    background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0,
                    boxShadow: '0 3px 10px rgba(255, 107, 74, 0.25)'
                  }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      CLINICAL BIO-CALIBRATION
                    </div>
                    <div style={{ fontSize: '12px', color: '#44403C', lineHeight: 1.35, fontWeight: 500 }}>
                      Biological sex, age, and biometric ratios determine reference baselines for all AI specialist differential analyses.
                    </div>
                  </div>
                </div>

                {/* Name & Age */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#1C1917', marginBottom: '6px' }}>
                      <User size={13} color="#EA580C" />
                      <span>Full Name</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Alex Taylor"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: '1.5px solid #F3D9C9',
                        background: '#FFFFFF',
                        fontSize: '14px',
                        color: '#1C1917',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border 0.2s ease, box-shadow 0.2s ease',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#FF6B4A';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 74, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#F3D9C9';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#1C1917', marginBottom: '6px' }}>
                      <Calendar size={13} color="#EA580C" />
                      <span>Age</span>
                      <span style={{ color: '#EA580C' }}>*</span>
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
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: '1.5px solid #F3D9C9',
                        background: '#FFFFFF',
                        fontSize: '14px',
                        color: '#1C1917',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border 0.2s ease, box-shadow 0.2s ease',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#FF6B4A';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 74, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#F3D9C9';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
                      }}
                    />
                  </div>
                </div>

                {/* Biological Sex (Tactile Luxury Segmented Cards) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#1C1917' }}>
                      Biological Sex <span style={{ color: '#EA580C' }}>*</span>
                    </label>
                    <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>Determines endocrine & lab ranges</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { id: 'Male', label: 'Male', symbol: '♂', hint: 'XY baselines' },
                      { id: 'Female', label: 'Female', symbol: '♀', hint: 'XX baselines' },
                      { id: 'Other', label: 'Other', symbol: '⚧', hint: 'Custom ranges' }
                    ].map(s => {
                      const isSelected = gender === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            triggerHapticSelection();
                            setGender(s.id);
                          }}
                          style={{
                            padding: '12px 6px',
                            borderRadius: '16px',
                            border: isSelected ? '1.5px solid #FF6B4A' : '1.5px solid #F3D9C9',
                            background: isSelected ? 'linear-gradient(135deg, #FFF7F2 0%, #FFEFE6 100%)' : '#FFFFFF',
                            color: isSelected ? '#EA580C' : '#334155',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '3px',
                            boxShadow: isSelected ? '0 4px 14px rgba(255, 107, 74, 0.22)' : '0 2px 6px rgba(0,0,0,0.02)',
                            transition: 'all 0.18s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 800 }}>{s.symbol}</span>
                            <span style={{ fontSize: '13px', fontWeight: isSelected ? 800 : 700 }}>{s.label}</span>
                          </div>
                          <span style={{ fontSize: '10px', color: isSelected ? '#C2410C' : '#94A3B8', fontWeight: 500 }}>
                            {s.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Blood Group (Refined 8-Pill Matrix + Subtle Test Later Option) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#1C1917' }}>
                      Blood Group
                    </label>
                    <span style={{ fontSize: '11px', color: '#8C7A70' }}>ABO & Rh factor</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
                    {['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-'].map(bg => {
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
                            padding: '10px 4px',
                            borderRadius: '13px',
                            border: isSelected ? '1.5px solid #FF6B4A' : '1.5px solid #F3D9C9',
                            background: isSelected ? 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)' : '#FFFFFF',
                            color: isSelected ? '#FFFFFF' : '#334155',
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: isSelected ? '0 4px 12px rgba(255, 107, 74, 0.28)' : '0 1px 3px rgba(0,0,0,0.02)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSelected && <Check size={11} strokeWidth={3} />}
                          <span>{bg}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Elegant Subtle Secondary Option (Replaces the ugly giant orange button!) */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticSelection();
                      setBloodGroup('Unknown');
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      border: bloodGroup === 'Unknown' ? '1.5px solid #0EA5E9' : '1px dashed #CBD5E1',
                      background: bloodGroup === 'Unknown' ? '#F0F9FF' : 'rgba(255, 255, 255, 0.7)',
                      color: bloodGroup === 'Unknown' ? '#0369A1' : '#64748B',
                      fontWeight: bloodGroup === 'Unknown' ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{bloodGroup === 'Unknown' ? '✓' : '⚪'}</span>
                    <span>Not tested yet / I'll add this later</span>
                  </button>
                </div>

                {/* Height & Weight with Real-Time Unit Toggles */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Height Column */}
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    border: '1.5px solid #F3D9C9',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#1C1917' }}>
                        <Ruler size={13} color="#EA580C" />
                        <span>Height</span>
                        <span style={{ color: '#EA580C' }}>*</span>
                      </label>
                      {/* Unit Toggle Pill */}
                      <div style={{
                        display: 'flex',
                        background: '#F1F5F9',
                        borderRadius: '999px',
                        padding: '2px',
                        border: '1px solid #E2E8F0'
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            setHeightUnit('cm');
                          }}
                          style={{
                            padding: '2px 7px',
                            borderRadius: '999px',
                            border: 'none',
                            background: heightUnit === 'cm' ? '#FFFFFF' : 'transparent',
                            color: heightUnit === 'cm' ? '#0F172A' : '#64748B',
                            fontWeight: heightUnit === 'cm' ? 800 : 600,
                            fontSize: '10px',
                            cursor: 'pointer',
                            boxShadow: heightUnit === 'cm' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                          }}
                        >
                          cm
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            setHeightUnit('ft');
                          }}
                          style={{
                            padding: '2px 7px',
                            borderRadius: '999px',
                            border: 'none',
                            background: heightUnit === 'ft' ? '#FFFFFF' : 'transparent',
                            color: heightUnit === 'ft' ? '#0F172A' : '#64748B',
                            fontWeight: heightUnit === 'ft' ? 800 : 600,
                            fontSize: '10px',
                            cursor: 'pointer',
                            boxShadow: heightUnit === 'ft' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                          }}
                        >
                          ft+in
                        </button>
                      </div>
                    </div>

                    {heightUnit === 'cm' ? (
                      <div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            value={height}
                            onChange={e => handleCmChange(e.target.value)}
                            placeholder="e.g. 175"
                            min="50"
                            max="250"
                            style={{
                              width: '100%',
                              padding: '10px 42px 10px 12px',
                              borderRadius: '12px',
                              border: '1px solid #E2E8F0',
                              fontSize: '15px',
                              fontWeight: 700,
                              color: '#0F172A',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#94A3B8'
                          }}>
                            cm
                          </span>
                        </div>
                        {/* Quick adjust stepper chips */}
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                          {[165, 170, 175, 180].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                triggerHapticSelection();
                                handleCmChange(String(val));
                              }}
                              style={{
                                flex: 1,
                                padding: '3px 0',
                                borderRadius: '6px',
                                border: height === String(val) ? '1px solid #FF6B4A' : '1px solid #F1F5F9',
                                background: height === String(val) ? '#FFF2EB' : '#F8FAFC',
                                color: height === String(val) ? '#EA580C' : '#64748B',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="number"
                              value={feetValue}
                              onChange={e => handleFtInChange(e.target.value, inchesValue)}
                              placeholder="5"
                              min="2"
                              max="8"
                              style={{
                                width: '100%',
                                padding: '10px 30px 10px 10px',
                                borderRadius: '12px',
                                border: '1px solid #E2E8F0',
                                fontSize: '15px',
                                fontWeight: 700,
                                color: '#0F172A',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                              ft
                            </span>
                          </div>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="number"
                              value={inchesValue}
                              onChange={e => handleFtInChange(feetValue, e.target.value)}
                              placeholder="10"
                              min="0"
                              max="11"
                              style={{
                                width: '100%',
                                padding: '10px 30px 10px 10px',
                                borderRadius: '12px',
                                border: '1px solid #E2E8F0',
                                fontSize: '15px',
                                fontWeight: 700,
                                color: '#0F172A',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                              in
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '6px', textAlign: 'center' }}>
                          {height ? `≈ ${height} cm` : 'Enter feet & inches'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Weight Column */}
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    border: '1.5px solid #F3D9C9',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#1C1917' }}>
                        <Scale size={13} color="#EA580C" />
                        <span>Weight</span>
                        <span style={{ color: '#EA580C' }}>*</span>
                      </label>
                      {/* Unit Toggle Pill */}
                      <div style={{
                        display: 'flex',
                        background: '#F1F5F9',
                        borderRadius: '999px',
                        padding: '2px',
                        border: '1px solid #E2E8F0'
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            setWeightUnit('kg');
                          }}
                          style={{
                            padding: '2px 7px',
                            borderRadius: '999px',
                            border: 'none',
                            background: weightUnit === 'kg' ? '#FFFFFF' : 'transparent',
                            color: weightUnit === 'kg' ? '#0F172A' : '#64748B',
                            fontWeight: weightUnit === 'kg' ? 800 : 600,
                            fontSize: '10px',
                            cursor: 'pointer',
                            boxShadow: weightUnit === 'kg' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                          }}
                        >
                          kg
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            setWeightUnit('lbs');
                          }}
                          style={{
                            padding: '2px 7px',
                            borderRadius: '999px',
                            border: 'none',
                            background: weightUnit === 'lbs' ? '#FFFFFF' : 'transparent',
                            color: weightUnit === 'lbs' ? '#0F172A' : '#64748B',
                            fontWeight: weightUnit === 'lbs' ? 800 : 600,
                            fontSize: '10px',
                            cursor: 'pointer',
                            boxShadow: weightUnit === 'lbs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                          }}
                        >
                          lbs
                        </button>
                      </div>
                    </div>

                    {weightUnit === 'kg' ? (
                      <div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            value={weight}
                            onChange={e => handleKgChange(e.target.value)}
                            placeholder="e.g. 72"
                            min="20"
                            max="300"
                            style={{
                              width: '100%',
                              padding: '10px 42px 10px 12px',
                              borderRadius: '12px',
                              border: '1px solid #E2E8F0',
                              fontSize: '15px',
                              fontWeight: 700,
                              color: '#0F172A',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#94A3B8'
                          }}>
                            kg
                          </span>
                        </div>
                        {/* Quick adjust stepper chips */}
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                          {[60, 68, 75, 82].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                triggerHapticSelection();
                                handleKgChange(String(val));
                              }}
                              style={{
                                flex: 1,
                                padding: '3px 0',
                                borderRadius: '6px',
                                border: weight === String(val) ? '1px solid #FF6B4A' : '1px solid #F1F5F9',
                                background: weight === String(val) ? '#FFF2EB' : '#F8FAFC',
                                color: weight === String(val) ? '#EA580C' : '#64748B',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            value={lbsValue}
                            onChange={e => handleLbsChange(e.target.value)}
                            placeholder="e.g. 160"
                            min="45"
                            max="700"
                            style={{
                              width: '100%',
                              padding: '10px 45px 10px 12px',
                              borderRadius: '12px',
                              border: '1px solid #E2E8F0',
                              fontSize: '15px',
                              fontWeight: 700,
                              color: '#0F172A',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#94A3B8'
                          }}>
                            lbs
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '6px', textAlign: 'center' }}>
                          {weight ? `≈ ${weight} kg` : 'Enter pounds'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* DYNAMIC LIVE METABOLIC BMI & BMR GAUGE (Never Clipped!) */}
                {bmiData ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F3 50%, #FEEDE2 100%)',
                      borderRadius: '20px',
                      padding: '16px 18px',
                      border: '1.5px solid rgba(251, 146, 60, 0.35)',
                      boxShadow: '0 10px 28px rgba(234, 88, 12, 0.1), inset 0 1px 0 rgba(255,255,255,0.9)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF'
                        }}>
                          <Scale size={16} />
                        </div>
                        <div>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#9A3412', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block' }}>
                            LIVE METABOLIC PROFILE
                          </span>
                          <span style={{ fontSize: '11px', color: '#78716C', fontWeight: 600 }}>
                            Biometric Calibration
                          </span>
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        background: bmiData.bg,
                        color: bmiData.color,
                        border: `1px solid ${bmiData.border}`,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                      }}>
                        ● {bmiData.category}
                      </span>
                    </div>

                    {/* Key Metrics Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: bmiData.bmr ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                      gap: '8px',
                      marginBottom: '12px',
                      padding: '10px 12px',
                      background: 'rgba(255, 255, 255, 0.85)',
                      borderRadius: '14px',
                      border: '1px solid rgba(254, 215, 195, 0.7)'
                    }}>
                      <div>
                        <span style={{ fontSize: '10px', color: '#78716C', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>BMI Index</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                          <span style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
                            {bmiData.bmi}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>kg/m²</span>
                        </div>
                      </div>

                      {bmiData.bmr && (
                        <div>
                          <span style={{ fontSize: '10px', color: '#78716C', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Est. BMR</span>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                            <span style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
                              {bmiData.bmr}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>kcal</span>
                          </div>
                        </div>
                      )}

                      <div>
                        <span style={{ fontSize: '10px', color: '#78716C', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Healthy Target</span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginTop: '4px', display: 'block' }}>
                          {bmiData.idealRange}
                        </span>
                      </div>
                    </div>

                    {/* Continuous Multi-Color Spectrum Gauge */}
                    <div style={{ position: 'relative', marginBottom: '8px', paddingTop: '10px' }}>
                      {/* Needle Indicator */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '0px',
                          left: `${bmiData.needlePercent}%`,
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          transition: 'left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                      >
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: '#0F172A',
                          border: '2.5px solid #FFFFFF',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.35)'
                        }} />
                      </div>

                      {/* Spectrum Bar */}
                      <div style={{
                        height: '8px',
                        borderRadius: '999px',
                        background: 'linear-gradient(90deg, #FBBF24 0%, #34D399 25%, #10B981 50%, #FB923C 75%, #F87171 100%)',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                      }} />

                      {/* Spectrum Labels */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '9.5px', color: '#94A3B8', fontWeight: 700 }}>
                        <span>&lt;18.5 Under</span>
                        <span>18.5 - 24.9 Normal</span>
                        <span>25 - 29.9 Over</span>
                        <span>30+ Obese</span>
                      </div>
                    </div>

                    <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: '#78716C', lineHeight: 1.4 }}>
                      ⚡ <strong style={{ color: '#431407' }}>Clinical Takeaway:</strong> {bmiData.takeaway}
                    </p>
                  </motion.div>
                ) : (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 248, 243, 0.9) 100%)',
                    borderRadius: '18px',
                    padding: '16px',
                    border: '1.5px dashed #F3D9C9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #FFEDD5 0%, #FEE2E2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#EA580C',
                      flexShrink: 0
                    }}>
                      <Scale size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#1C1917', marginBottom: '2px' }}>
                        Metabolic BMI & BMR Preview
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#78716C', lineHeight: 1.4 }}>
                        Enter your <strong style={{ color: '#0F172A' }}>height</strong> and <strong style={{ color: '#0F172A' }}>weight</strong> above to preview your metabolic BMI score, daily BMR calories, and healthy target range.
                      </div>
                    </div>
                  </div>
                )}

                {/* Emergency Contact (Optional) */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    <Phone size={13} color="#94A3B8" />
                    <span>Emergency Contact (Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={e => setEmergencyContact(e.target.value)}
                    placeholder="e.g. Jane Doe (+1 555-0199)"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: '1.5px solid #F3D9C9',
                      background: '#FFFFFF',
                      fontSize: '13.5px',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#FF6B4A';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 74, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#F3D9C9';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Generous Bottom Clearance Spacer so nothing is ever clipped */}
                <div style={{ height: '40px' }} />
              </div>
            )}

            {/* STEP 1: Conditions */}
            {activeStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #FFF7F2 0%, #FFEFE6 100%)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  border: '1.5px solid #FCD9C6',
                  boxShadow: '0 4px 12px rgba(251, 146, 60, 0.08)',
                  fontSize: '12px',
                  color: '#57534E',
                  lineHeight: 1.4
                }}>
                  💡 <strong style={{ color: '#1C1917' }}>Medical Context:</strong> Chronic conditions help your AI specialist board tailor differential diagnoses, care protocols, and drug interactions.
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
                    border: hasNoConditions ? '1.5px solid #10B981' : '1.5px solid #F3D9C9',
                    background: hasNoConditions ? '#ECFDF5' : 'rgba(255, 255, 255, 0.9)',
                    color: hasNoConditions ? '#059669' : '#334155',
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
                    border: hasNoConditions ? '2px solid #059669' : '2px solid #CBD5E1',
                    background: hasNoConditions ? '#059669' : 'transparent',
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
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
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
                                padding: '9px 15px',
                                borderRadius: '999px',
                                border: isSelected ? '1.5px solid #FF7043' : '1.5px solid #F3D9C9',
                                background: isSelected ? 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)' : 'rgba(255, 255, 255, 0.9)',
                                color: isSelected ? '#FFFFFF' : '#1E293B',
                                fontWeight: isSelected ? 800 : 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: isSelected ? '0 4px 12px rgba(255, 107, 74, 0.28)' : '0 1px 3px rgba(0,0,0,0.02)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>{cond}</span>
                              {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Write Custom Condition */}
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
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
                            padding: '11px 14px',
                            borderRadius: '14px',
                            border: '1.5px solid #F3D9C9',
                            background: 'rgba(255, 255, 255, 0.95)',
                            fontSize: '13.5px',
                            color: '#1C1917',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomCondition}
                          style={{
                            padding: '11px 18px',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '13px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 4px 12px rgba(255, 107, 74, 0.28)'
                          }}
                        >
                          <Plus size={16} /> Add
                        </button>
                      </div>
                    </div>

                    {/* Selected Summary */}
                    {selectedConditions.length > 0 && (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '16px',
                        padding: '14px',
                        border: '1.5px solid rgba(254, 215, 195, 0.95)',
                        boxShadow: '0 4px 12px rgba(251, 146, 60, 0.08)'
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Selected Conditions ({selectedConditions.length})
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                          {selectedConditions.map(c => (
                            <span
                              key={c}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '999px',
                                background: '#FFF2EB',
                                border: '1px solid #FED7AA',
                                color: '#EA580C',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <span>{c}</span>
                              <button
                                type="button"
                                onClick={() => toggleCondition(c)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#EA580C', display: 'flex' }}
                              >
                                <X size={12} strokeWidth={2.5} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Bottom Clearance Spacer */}
                <div style={{ height: '20px' }} />
              </div>
            )}

            {/* STEP 2: Medications & Circadian Chronotherapy */}
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
                  💊 <strong style={{ color: '#0F172A' }}>Circadian Chronotherapy:</strong> Tag medications with their biological circadian slot (🌅 Morning, ☀️ Midday, 🌇 Evening, 🌙 Bedtime). They automatically sync to your daily medication alarms!
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
                    border: hasNoMedications ? '1.5px solid #0F766E' : '1.5px solid #F3E5D8',
                    background: hasNoMedications ? '#FEF3EB' : 'rgba(255, 255, 255, 0.9)',
                    color: hasNoMedications ? '#0F766E' : '#334155',
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
                    border: hasNoMedications ? '2px solid #059669' : '2px solid #CBD5E1',
                    background: hasNoMedications ? '#059669' : 'transparent',
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
                    {/* Quick Add Prescriptions */}
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                        Quick-Add Common Prescriptions
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {PRESET_MEDICATIONS.map(med => {
                          const isSelected = medicationsList.some(m => m.name.toLowerCase() === med.name.toLowerCase());
                          const slotMeta = CIRCADIAN_SLOT_META[med.defaultSlot];
                          return (
                            <button
                              key={med.name}
                              type="button"
                              onClick={() => handleTogglePresetMedication(med)}
                              style={{
                                padding: '9px 14px',
                                borderRadius: '999px',
                                border: isSelected ? '1.5px solid #FF7043' : '1.5px solid #F3D9C9',
                                background: isSelected ? 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)' : 'rgba(255, 255, 255, 0.9)',
                                color: isSelected ? '#FFFFFF' : '#1E293B',
                                fontWeight: isSelected ? 800 : 600,
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: isSelected ? '0 4px 12px rgba(255, 107, 74, 0.28)' : '0 1px 3px rgba(0,0,0,0.02)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>{slotMeta.icon}</span>
                              <span>{med.name}</span>
                              {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Medication & Circadian Slot Input */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '16px',
                      padding: '14px',
                      border: '1.5px solid rgba(254, 215, 195, 0.95)',
                      boxShadow: '0 4px 12px rgba(251, 146, 60, 0.08)'
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                        Custom Medication Entry
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="text"
                          value={medName}
                          onChange={e => setMedName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomMedication(); } }}
                          placeholder="Medication name (e.g. Metformin, Lisinopril)..."
                          style={{
                            padding: '11px 13px',
                            borderRadius: '12px',
                            border: '1.5px solid #F3D9C9',
                            fontSize: '13.5px',
                            outline: 'none',
                            background: '#FFFFFF',
                            color: '#1C1917'
                          }}
                        />
                        <input
                          type="text"
                          value={medDosage}
                          onChange={e => setMedDosage(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomMedication(); } }}
                          placeholder="Dosage instruction (e.g. 500mg with breakfast)..."
                          style={{
                            padding: '11px 13px',
                            borderRadius: '12px',
                            border: '1.5px solid #F3D9C9',
                            fontSize: '13.5px',
                            outline: 'none',
                            background: '#FFFFFF',
                            color: '#1C1917'
                          }}
                        />

                        {/* Circadian Slot Picker */}
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '4px' }}>
                            Circadian Timing Slot:
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                            {(['morning', 'midday', 'evening', 'bedtime'] as CircadianSlot[]).map(slot => {
                              const meta = CIRCADIAN_SLOT_META[slot];
                              const isCur = medSlot === slot;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => {
                                    triggerHapticSelection();
                                    setMedSlot(slot);
                                  }}
                                  style={{
                                    padding: '8px 4px',
                                    borderRadius: '12px',
                                    border: isCur ? '1.5px solid #FF7043' : '1.5px solid #F3D9C9',
                                    background: isCur ? '#FFF2EB' : '#FFFFFF',
                                    color: isCur ? '#EA580C' : '#78716C',
                                    fontSize: '11px',
                                    fontWeight: isCur ? 800 : 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '2px',
                                    boxShadow: isCur ? '0 2px 6px rgba(255, 112, 67, 0.15)' : 'none'
                                  }}
                                >
                                  <span>{meta.icon}</span>
                                  <span>{meta.label}</span>
                                  <span style={{ fontSize: '9px', opacity: 0.75 }}>{meta.time}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddCustomMedication}
                          disabled={!medName.trim()}
                          style={{
                            marginTop: '4px',
                            padding: '11px',
                            borderRadius: '14px',
                            background: medName.trim() ? 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)' : '#E2E8F0',
                            color: medName.trim() ? '#FFF' : '#94A3B8',
                            fontWeight: 700,
                            fontSize: '13px',
                            border: 'none',
                            cursor: medName.trim() ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: medName.trim() ? '0 4px 12px rgba(255, 107, 74, 0.28)' : 'none'
                          }}
                        >
                          <Plus size={16} /> Add to Chronotherapy Schedule
                        </button>
                      </div>
                    </div>

                    {/* Active Scheduled Medications with Live Circadian Slot Adjuster */}
                    {medicationsList.length > 0 && (
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                          Scheduled Medications ({medicationsList.length})
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {medicationsList.map((m, idx) => {
                            return (
                              <div
                                key={idx}
                                style={{
                                  padding: '12px 14px',
                                  background: 'rgba(255, 255, 255, 0.95)',
                                  border: '1.5px solid rgba(254, 215, 195, 0.95)',
                                  borderRadius: '16px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Pill size={16} color="#EA580C" />
                                    <div>
                                      <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1C1917' }}>{m.name}</span>
                                      <span style={{ fontSize: '12px', color: '#78716C', marginLeft: '6px' }}>({m.dosage})</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeMedication(idx)}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
                                    aria-label="Remove medication"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>

                                {/* Circadian Slot Chips on Item */}
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  {(['morning', 'midday', 'evening', 'bedtime'] as CircadianSlot[]).map(slot => {
                                    const meta = CIRCADIAN_SLOT_META[slot];
                                    const isActive = m.circadianSlot === slot;
                                    return (
                                      <button
                                        key={slot}
                                        type="button"
                                        onClick={() => updateMedicationSlot(idx, slot)}
                                        style={{
                                          flex: 1,
                                          padding: '6px 4px',
                                          borderRadius: '10px',
                                          border: isActive ? `1.5px solid #FF7043` : '1px solid #F3D9C9',
                                          background: isActive ? '#FFF2EB' : '#FFFFFF',
                                          color: isActive ? '#EA580C' : '#78716C',
                                          fontSize: '10.5px',
                                          fontWeight: isActive ? 800 : 600,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '3px'
                                        }}
                                      >
                                        <span>{meta.icon}</span>
                                        <span>{meta.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Bottom Clearance Spacer */}
                <div style={{ height: '20px' }} />
              </div>
            )}

            {/* STEP 3: Allergies & Severity Tagging */}
            {activeStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #FFF7F2 0%, #FFEFE6 100%)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  border: '1.5px solid #FCD9C6',
                  boxShadow: '0 4px 12px rgba(251, 146, 60, 0.08)',
                  fontSize: '12px',
                  color: '#57534E',
                  lineHeight: 1.4
                }}>
                  ⚠️ <strong style={{ color: '#1C1917' }}>Clinical Allergy Guard:</strong> Tag allergens with severity ratings (Mild, Moderate, Severe / Anaphylaxis ⚠️). Ava Health Buddy cross-checks this against all medical and pharmaceutical advice to prevent fatal contraindications!
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
                    border: hasNoAllergies ? '1.5px solid #10B981' : '1.5px solid #F3D9C9',
                    background: hasNoAllergies ? '#ECFDF5' : 'rgba(255, 255, 255, 0.9)',
                    color: hasNoAllergies ? '#059669' : '#334155',
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
                    border: hasNoAllergies ? '2px solid #059669' : '2px solid #CBD5E1',
                    background: hasNoAllergies ? '#059669' : 'transparent',
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
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                        Common Allergens (Tap to Add)
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {COMMON_ALLERGIES.map(all => {
                          const isSelected = selectedAllergies.some(a => a.name.toLowerCase() === all.name.toLowerCase());
                          return (
                            <button
                              key={all.name}
                              type="button"
                              onClick={() => togglePresetAllergy(all)}
                              style={{
                                padding: '9px 14px',
                                borderRadius: '999px',
                                border: isSelected ? '1.5px solid #E11D48' : '1.5px solid #F3D9C9',
                                background: isSelected ? '#FFF1F2' : 'rgba(255, 255, 255, 0.9)',
                                color: isSelected ? '#E11D48' : '#1E293B',
                                fontWeight: isSelected ? 800 : 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: isSelected ? '0 3px 10px rgba(225, 29, 72, 0.2)' : '0 1px 3px rgba(0,0,0,0.02)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>{all.name}</span>
                              {isSelected ? <X size={13} color="#E11D48" strokeWidth={3} /> : <Plus size={13} color="#94A3B8" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Allergy Input & Severity Picker */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '16px',
                      padding: '14px',
                      border: '1.5px solid rgba(254, 215, 195, 0.95)',
                      boxShadow: '0 4px 12px rgba(251, 146, 60, 0.08)'
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                        Custom Allergen Entry
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="text"
                          value={customAllergy}
                          onChange={e => setCustomAllergy(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomAllergy(); } }}
                          placeholder="Allergen name (e.g. Iodine dye, Ciprofloxacin)..."
                          style={{
                            padding: '11px 13px',
                            borderRadius: '12px',
                            border: '1.5px solid #F3D9C9',
                            fontSize: '13.5px',
                            outline: 'none',
                            background: '#FFFFFF',
                            color: '#1C1917'
                          }}
                        />

                        {/* Severity Selector */}
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '4px' }}>
                            Severity Level:
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                            {(['mild', 'moderate', 'severe'] as AllergySeverity[]).map(sev => {
                              const meta = ALLERGY_SEVERITY_META[sev];
                              const isCur = customSeverity === sev;
                              return (
                                <button
                                  key={sev}
                                  type="button"
                                  onClick={() => {
                                    triggerHapticSelection();
                                    setCustomSeverity(sev);
                                  }}
                                  style={{
                                    padding: '8px 4px',
                                    borderRadius: '12px',
                                    border: isCur ? `1.5px solid ${meta.color}` : '1px solid #F3D9C9',
                                    background: isCur ? meta.bg : '#FFFFFF',
                                    color: isCur ? meta.color : '#64748B',
                                    fontSize: '11px',
                                    fontWeight: isCur ? 800 : 600,
                                    cursor: 'pointer',
                                    boxShadow: isCur ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
                                  }}
                                >
                                  {meta.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddCustomAllergy}
                          disabled={!customAllergy.trim()}
                          style={{
                            marginTop: '4px',
                            padding: '11px',
                            borderRadius: '14px',
                            background: customAllergy.trim() ? 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)' : '#E2E8F0',
                            color: customAllergy.trim() ? '#FFF' : '#94A3B8',
                            fontWeight: 700,
                            fontSize: '13px',
                            border: 'none',
                            cursor: customAllergy.trim() ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: customAllergy.trim() ? '0 4px 12px rgba(255, 107, 74, 0.28)' : 'none'
                          }}
                        >
                          <Plus size={16} /> Add to Allergy Guard
                        </button>
                      </div>
                    </div>

                    {/* Identified Allergens with Live Severity Adjuster */}
                    {selectedAllergies.length > 0 && (
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#E11D48', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                          Identified Allergens ({selectedAllergies.length})
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {selectedAllergies.map((a, idx) => {
                            const curMeta = ALLERGY_SEVERITY_META[a.severity];
                            return (
                              <div
                                key={idx}
                                style={{
                                  padding: '12px 14px',
                                  background: 'rgba(255, 255, 255, 0.95)',
                                  border: `1.5px solid ${curMeta.border}`,
                                  borderRadius: '16px',
                                  boxShadow: '0 2px 8px rgba(244, 63, 94, 0.06)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertTriangle size={16} color={curMeta.color} />
                                    <div>
                                      <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1C1917' }}>{a.name}</span>
                                      <span style={{
                                        fontSize: '10.5px',
                                        fontWeight: 800,
                                        marginLeft: '8px',
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        background: curMeta.bg,
                                        color: curMeta.color,
                                        border: `1px solid ${curMeta.border}`
                                      }}>
                                        {curMeta.chipLabel}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeAllergy(idx)}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
                                    aria-label="Remove allergen"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>

                                {/* Live Severity Segmented Adjuster */}
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  {(['mild', 'moderate', 'severe'] as AllergySeverity[]).map(sev => {
                                    const meta = ALLERGY_SEVERITY_META[sev];
                                    const isActive = a.severity === sev;
                                    return (
                                      <button
                                        key={sev}
                                        type="button"
                                        onClick={() => updateAllergySeverity(idx, sev)}
                                        style={{
                                          flex: 1,
                                          padding: '6px 4px',
                                          borderRadius: '10px',
                                          border: isActive ? `1.5px solid ${meta.color}` : '1px solid #F3D9C9',
                                          background: isActive ? meta.bg : '#FFFFFF',
                                          color: isActive ? meta.color : '#64748B',
                                          fontSize: '11px',
                                          fontWeight: isActive ? 800 : 600,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {meta.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Bottom Clearance Spacer */}
                <div style={{ height: '20px' }} />
              </div>
            )}
          </div>

          {/* Fixed Footer Actions (Zero Clipping with Bottom Tab Bar) */}
          <div style={{
            padding: '12px 20px calc(14px + env(safe-area-inset-bottom, 16px))',
            borderTop: '1px solid rgba(254, 215, 195, 0.85)',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, #FFF8F3 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 -4px 20px rgba(251, 146, 60, 0.06)'
          }}>
            {activeStep > 0 ? (
              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  setActiveStep(prev => (prev - 1) as any);
                }}
                style={{
                  padding: '13px 18px',
                  borderRadius: '14px',
                  border: '1.5px solid #F3D9C9',
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#57534E',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                <ArrowLeft size={15} /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  onClose();
                }}
                style={{
                  padding: '13px 18px',
                  borderRadius: '14px',
                  border: '1.5px solid #F3D9C9',
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#78716C',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                Cancel
              </button>
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
                    flex: 1,
                    padding: '13px 20px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '14px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(255, 107, 74, 0.35), inset 0 1px 0 rgba(255,255,255,0.3)'
                  }}
                >
                  {activeStep === 0 && 'Next: Conditions'}
                  {activeStep === 1 && 'Next: Medications'}
                  {activeStep === 2 && 'Next: Allergies'}
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '14.5px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: isSaving ? 'default' : 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                    boxShadow: '0 8px 24px rgba(255, 107, 74, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                  }}
                >
                  <Sparkles size={16} /> {isSaving ? 'Saving Profile...' : 'Save & Activate (+50 PTS)'}
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
