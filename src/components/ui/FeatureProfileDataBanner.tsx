import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ShieldCheck, 
  HeartPulse, 
  Pill, 
  Edit3, 
  Plus, 
  X, 
  Check, 
  Activity, 
  Flame, 
  Scale, 
  Ruler, 
  AlertTriangle,
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  getProfile, 
  saveProfile, 
  addCondition, 
  removeCondition, 
  addMedication, 
  removeMedication, 
  addAllergy, 
  removeAllergy 
} from '../../services/ProfileEngine';
import { syncMedicationsFromProfile } from '../../services/VitaminScheduleService';
import { triggerHapticLight, triggerHapticSelection, triggerHapticSuccess } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';

export type CircadianSlot = 'morning' | 'midday' | 'evening' | 'bedtime';
export type AllergySeverity = 'mild' | 'moderate' | 'severe';

const CIRCADIAN_SLOT_META: Record<CircadianSlot, { label: string; icon: string; color: string; bg: string }> = {
  morning: { label: 'Morning', icon: '🌅', color: '#0F766E', bg: '#CCFBF1' },
  midday: { label: 'Midday', icon: '☀️', color: '#0D9488', bg: '#ECFDF5' },
  evening: { label: 'Evening', icon: '🌇', color: '#D97706', bg: '#FEF3C7' },
  bedtime: { label: 'Bedtime', icon: '🌙', color: '#4338CA', bg: '#EEF2FF' },
};

const COMMON_CONDITIONS_META: Record<string, { icon: string; category: string }> = {
  'Hypertension': { icon: '🩺', category: 'Cardiovascular' },
  'Type 2 Diabetes': { icon: '🩸', category: 'Metabolic' },
  'GERD / Reflux': { icon: '🔥', category: 'Gastrointestinal' },
  'Hypothyroidism': { icon: '🦋', category: 'Endocrine' },
  'PCOS / Hormonal': { icon: '🌸', category: 'Endocrine' },
  'Dysautonomia / POTS': { icon: '🫀', category: 'Autonomic' },
  'High Cholesterol': { icon: '🧬', category: 'Cardiovascular' },
  'Migraine / Cephalgia': { icon: '⚡', category: 'Neurological' },
  'Asthma': { icon: '🫁', category: 'Respiratory' },
  'Fatty Liver': { icon: '🥩', category: 'Hepatic' },
  'Celiac Disease': { icon: '🌾', category: 'Immune' },
  'Lower Back Strain': { icon: '🦴', category: 'Kinetic' },
};

const PRESET_MEDS_LIST = [
  { name: 'Metformin', slot: 'midday' as CircadianSlot, hint: 'Glucose' },
  { name: 'Lisinopril', slot: 'morning' as CircadianSlot, hint: 'Blood Pressure' },
  { name: 'Atorvastatin', slot: 'bedtime' as CircadianSlot, hint: 'Lipids' },
  { name: 'Levothyroxine', slot: 'morning' as CircadianSlot, hint: 'Thyroid' },
  { name: 'Sertraline', slot: 'morning' as CircadianSlot, hint: 'Neuro' },
  { name: 'Magnesium Glycinate', slot: 'bedtime' as CircadianSlot, hint: 'Sleep & Muscle' },
  { name: 'Vitamin D3 / K2', slot: 'morning' as CircadianSlot, hint: 'Immunity' },
  { name: 'Ventolin Inhaler', slot: 'morning' as CircadianSlot, hint: 'Respiratory' },
];

const PRESET_ALLERGIES_LIST = [
  { name: 'Penicillin', icon: '💉', defaultSeverity: 'severe' as AllergySeverity },
  { name: 'Sulfa Drugs', icon: '💊', defaultSeverity: 'severe' as AllergySeverity },
  { name: 'Aspirin / NSAIDs', icon: '🩸', defaultSeverity: 'moderate' as AllergySeverity },
  { name: 'Peanuts & Tree Nuts', icon: '🥜', defaultSeverity: 'severe' as AllergySeverity },
  { name: 'Dairy / Lactose', icon: '🥛', defaultSeverity: 'mild' as AllergySeverity },
  { name: 'Gluten / Wheat', icon: '🌾', defaultSeverity: 'moderate' as AllergySeverity },
  { name: 'Shellfish', icon: '🦐', defaultSeverity: 'severe' as AllergySeverity },
  { name: 'Latex', icon: '🧤', defaultSeverity: 'moderate' as AllergySeverity },
];

export interface FeatureProfileDataBannerProps {
  featureName: string;
  contextMessage?: string;
  accentColor?: string;
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
}

export const FeatureProfileDataBanner: React.FC<FeatureProfileDataBannerProps> = ({
  featureName,
  contextMessage = 'Actively factored into clinical calculations, differential diagnosis & contraindication checks.',
  accentColor = '#0D9488',
  className = '',
  style = {},
  compact = false,
}) => {
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState(() => getProfile());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Sync profile reactively
  useEffect(() => {
    const handleUpdate = () => {
      setProfile(getProfile());
    };
    window.addEventListener('hc_profile_updated', handleUpdate);
    return () => window.removeEventListener('hc_profile_updated', handleUpdate);
  }, []);

  const demographics = profile?.demographics || {};
  const conditions = useMemo(() => {
    return (profile?.conditions || []).map((c: any) => (typeof c === 'string' ? c : c?.name || '')).filter(Boolean);
  }, [profile?.conditions]);

  const medications = useMemo(() => {
    return (profile?.medications || []).map((m: any) => {
      if (typeof m === 'string') return { name: m, circadianSlot: 'morning' as CircadianSlot, dosage: '' };
      return {
        name: m.name || '',
        dosage: m.dosage || '',
        circadianSlot: (m.circadianSlot || 'morning') as CircadianSlot
      };
    }).filter((m: any) => Boolean(m.name));
  }, [profile?.medications]);

  const allergies = useMemo(() => {
    return (profile?.allergies || []).map((a: any) => {
      if (typeof a === 'string') return { name: a, severity: 'moderate' as AllergySeverity };
      return {
        name: a.name || '',
        severity: (a.severity || 'moderate') as AllergySeverity
      };
    }).filter((a: any) => Boolean(a.name));
  }, [profile?.allergies]);

  // Quick remove handlers
  const handleRemoveCondition = (condName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticLight();
    removeCondition(condName);
  };

  const handleRemoveMedication = (medName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticLight();
    removeMedication(medName);
  };

  const handleRemoveAllergy = (allName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticLight();
    removeAllergy(allName);
  };

  const hasData = Boolean(
    demographics.age || demographics.height || demographics.weight ||
    conditions.length > 0 || medications.length > 0 || allergies.length > 0
  );

  // Edit Modal Form State
  const [editAge, setEditAge] = useState<number>(demographics.age ? Number(demographics.age) : 28);
  const [editGender, setEditGender] = useState<'Male' | 'Female' | 'Other'>(demographics.gender || 'Male');
  const [editHeight, setEditHeight] = useState<number>(demographics.height ? Number(demographics.height) : 175);
  const [editWeight, setEditWeight] = useState<number>(demographics.weight ? Number(demographics.weight) : 72);
  const [editConditions, setEditConditions] = useState<string[]>([]);
  const [editCustomCond, setEditCustomCond] = useState<string>('');
  const [editMeds, setEditMeds] = useState<{ name: string; slot: CircadianSlot; dosage?: string }[]>([]);
  const [editAllergies, setEditAllergies] = useState<{ name: string; severity: AllergySeverity }[]>([]);

  const openModal = () => {
    triggerHapticSelection();
    setEditAge(demographics.age ? Number(demographics.age) : 28);
    setEditGender(demographics.gender || 'Male');
    setEditHeight(demographics.height ? Number(demographics.height) : 175);
    setEditWeight(demographics.weight ? Number(demographics.weight) : 72);
    setEditConditions([...conditions]);
    setEditMeds(medications.map(m => ({ name: m.name, slot: m.circadianSlot, dosage: m.dosage })));
    setEditAllergies(allergies.map(a => ({ name: a.name, severity: a.severity })));
    setIsEditModalOpen(true);
  };

  const handleSaveModal = async () => {
    triggerHapticSuccess();
    const updated = { ...profile };
    
    // Compute BMI
    const hM = editHeight / 100;
    const computedBmi = Math.round((editWeight / (hM * hM)) * 10) / 10;
    let bmiCategory = 'Normal';
    if (computedBmi < 18.5) bmiCategory = 'Underweight';
    else if (computedBmi <= 24.9) bmiCategory = 'Normal';
    else if (computedBmi <= 29.9) bmiCategory = 'Overweight';
    else bmiCategory = 'Obese';

    updated.demographics = {
      ...updated.demographics,
      age: editAge,
      gender: editGender,
      height: String(editHeight),
      weight: String(editWeight),
      bmi: computedBmi,
      bmiCategory
    };

    updated.conditions = editConditions;
    updated.medications = editMeds.map(m => ({
      name: m.name,
      dosage: m.dosage || 'As prescribed',
      circadianSlot: m.slot,
      time: m.slot === 'morning' ? '08:30' : m.slot === 'midday' ? '13:00' : m.slot === 'evening' ? '18:30' : '21:30'
    }));
    updated.allergies = editAllergies;

    await saveProfile(updated);
    if (editMeds.length > 0) {
      await syncMedicationsFromProfile(editMeds.map(m => ({ name: m.name, timing: m.slot })));
    }
    setIsEditModalOpen(false);
  };

  return (
    <>
      <div
        className={`feature-profile-data-banner ${className}`}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(240, 253, 250, 0.9) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '18px',
          border: '1.5px solid rgba(153, 246, 228, 0.8)',
          boxShadow: '0 8px 24px rgba(13, 148, 136, 0.08)',
          padding: compact ? '12px 16px' : '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          position: 'relative',
          ...style
        }}
      >
        {/* Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                background: '#ECFDF5',
                border: '1px solid #6EE7B7',
                borderRadius: '8px',
                padding: '4px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: accentColor
              }}
            >
              <ShieldCheck size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Calibrated Health Profile • {featureName}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '999px', background: '#DCFCE7', color: '#15803D' }}>
                  Active
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.3 }}>
                {contextMessage}
              </p>
            </div>
          </div>

          {/* Quick Edit CTA */}
          <button
            type="button"
            onClick={openModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#0F766E',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease'
            }}
          >
            <Edit3 size={13} /> Edit Baseline
          </button>
        </div>

        {/* Dynamic Pills Flow */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '7px', paddingTop: '2px' }}>
          {/* 1. Demographics Pill */}
          {(demographics.age || demographics.height || demographics.weight) && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#1E293B'
              }}
            >
              <span>🧬</span>
              <span>
                {demographics.age ? `${demographics.age}yo ` : ''}
                {demographics.gender ? `${demographics.gender} ` : ''}
                {demographics.height ? `• ${demographics.height}cm ` : ''}
                {demographics.weight ? `/ ${demographics.weight}kg ` : ''}
                {demographics.bmi ? `• BMI ${demographics.bmi}` : ''}
              </span>
            </span>
          )}

          {/* 2. Condition Pills */}
          {conditions.map((cName) => {
            const meta = COMMON_CONDITIONS_META[cName] || { icon: '🩺', category: 'Clinical' };
            return (
              <span
                key={cName}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#ECFDF5',
                  border: '1px solid #6EE7B7',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#047857',
                  boxShadow: '0 1px 3px rgba(5, 150, 105, 0.08)'
                }}
              >
                <span>{meta.icon}</span>
                <span>{cName}</span>
                <button
                  type="button"
                  aria-label={`Remove condition ${cName}`}
                  onClick={(e) => handleRemoveCondition(cName, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0 1px',
                    color: '#059669',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}

          {/* 3. Chrono-Medications Pills */}
          {medications.map((m) => {
            const slotMeta = CIRCADIAN_SLOT_META[m.circadianSlot] || CIRCADIAN_SLOT_META.morning;
            return (
              <span
                key={m.name}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: slotMeta.bg,
                  border: `1px solid ${slotMeta.color}40`,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: slotMeta.color,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <span>{slotMeta.icon}</span>
                <span>{m.name}</span>
                {m.dosage && <span style={{ fontSize: '10.5px', opacity: 0.75 }}>({m.dosage})</span>}
                <button
                  type="button"
                  aria-label={`Remove medication ${m.name}`}
                  onClick={(e) => handleRemoveMedication(m.name, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0 1px',
                    color: slotMeta.color,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}

          {/* 4. Allergies Badges */}
          {allergies.map((a) => (
            <span
              key={a.name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#FFF1F2',
                border: '1px solid #FECDD3',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#BE123C'
              }}
            >
              <span>💉</span>
              <span>{a.name}</span>
              <span style={{ fontSize: '10px', opacity: 0.7 }}>({a.severity})</span>
              <button
                type="button"
                aria-label={`Remove allergy ${a.name}`}
                onClick={(e) => handleRemoveAllergy(a.name, e)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0 1px',
                  color: '#BE123C',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {/* Empty fallback prompt */}
          {!hasData && (
            <span style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
              No baseline calibrated yet. Tap "Edit Baseline" to pre-fill your biometrics and conditions.
            </span>
          )}

          {/* Inline Add Quick Button */}
          <button
            type="button"
            onClick={openModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#F8FAFC',
              border: '1px dashed #94A3B8',
              padding: '3px 9px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            <Plus size={12} /> Add Pill
          </button>
        </div>
      </div>

      {/* In-Place Baseline Editing Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit Calibrated Health Baseline"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
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
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                maxWidth: '560px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '18px 22px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color="#0D9488" />
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    Edit Calibrated Baseline
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 1. Biometrics */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    1. Biometrics & Demographics
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Age</label>
                      <input
                        type="number"
                        value={editAge}
                        onChange={(e) => setEditAge(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Sex</label>
                      <select
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value as any)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700 }}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Height (cm)</label>
                      <input
                        type="number"
                        value={editHeight}
                        onChange={(e) => setEditHeight(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Weight (kg)</label>
                      <input
                        type="number"
                        value={editWeight}
                        onChange={(e) => setEditWeight(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Conditions */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    2. Diagnosed Conditions ({editConditions.length})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    {Object.entries(COMMON_CONDITIONS_META).map(([name, meta]) => {
                      const isSelected = editConditions.includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            triggerHapticSelection();
                            setEditConditions(prev => 
                              prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
                            );
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '999px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                            background: isSelected ? '#CCFBF1' : '#F8FAFC',
                            color: isSelected ? '#0F766E' : '#475569',
                          }}
                        >
                          <span>{meta.icon}</span> {name}
                          {isSelected && <Check size={12} />}
                        </button>
                      );
                    })}
                  </div>
                  {/* Custom Adder */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Add custom condition..."
                      value={editCustomCond}
                      onChange={(e) => setEditCustomCond(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (editCustomCond.trim() && !editConditions.includes(editCustomCond.trim())) {
                            setEditConditions(prev => [...prev, editCustomCond.trim()]);
                            setEditCustomCond('');
                          }
                        }
                      }}
                      style={{ flex: 1, padding: '7px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (editCustomCond.trim() && !editConditions.includes(editCustomCond.trim())) {
                          setEditConditions(prev => [...prev, editCustomCond.trim()]);
                          setEditCustomCond('');
                        }
                      }}
                      style={{ background: '#0F766E', color: '#FFF', border: 'none', borderRadius: '10px', padding: '0 12px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* 3. Chrono-Medications */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    3. Regular Medications & Timing ({editMeds.length})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {PRESET_MEDS_LIST.map((m) => {
                      const active = editMeds.find(item => item.name === m.name);
                      const isSelected = Boolean(active);
                      return (
                        <div key={m.name} style={{ display: 'inline-flex', flexDirection: 'column', gap: 3 }}>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHapticSelection();
                              setEditMeds(prev => {
                                const exists = prev.find(item => item.name === m.name);
                                if (exists) return prev.filter(item => item.name !== m.name);
                                return [...prev, { name: m.name, slot: m.slot, dosage: 'Standard' }];
                              });
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 10px',
                              borderRadius: '999px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                              background: isSelected ? '#CCFBF1' : '#F8FAFC',
                              color: isSelected ? '#0F766E' : '#475569',
                            }}
                          >
                            <Pill size={12} /> {m.name}
                            {isSelected && <Check size={12} />}
                          </button>
                          {isSelected && active && (
                            <div style={{ display: 'flex', gap: 2 }}>
                              {(['morning', 'midday', 'evening', 'bedtime'] as CircadianSlot[]).map((slot) => {
                                const isCurrent = active.slot === slot;
                                const meta = CIRCADIAN_SLOT_META[slot];
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    onClick={() => {
                                      triggerHapticLight();
                                      setEditMeds(prev => prev.map(item => item.name === m.name ? { ...item, slot } : item));
                                    }}
                                    style={{
                                      fontSize: '9.5px',
                                      padding: '2px 5px',
                                      borderRadius: '4px',
                                      border: isCurrent ? `1px solid ${meta.color}` : '1px solid #E2E8F0',
                                      background: isCurrent ? meta.bg : '#FFF',
                                      color: isCurrent ? meta.color : '#64748B',
                                      fontWeight: isCurrent ? 800 : 500,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {meta.icon}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Allergies */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    4. Known Allergies ({editAllergies.length})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {PRESET_ALLERGIES_LIST.map((a) => {
                      const isSelected = editAllergies.some(item => item.name === a.name);
                      return (
                        <button
                          key={a.name}
                          type="button"
                          onClick={() => {
                            triggerHapticSelection();
                            setEditAllergies(prev => {
                              const exists = prev.find(item => item.name === a.name);
                              if (exists) return prev.filter(item => item.name !== a.name);
                              return [...prev, { name: a.name, severity: a.defaultSeverity }];
                            });
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '999px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isSelected ? '1.5px solid #E11D48' : '1px solid #E2E8F0',
                            background: isSelected ? '#FFF1F2' : '#F8FAFC',
                            color: isSelected ? '#BE123C' : '#475569',
                          }}
                        >
                          <span>{a.icon}</span> {a.name}
                          {isSelected && <Check size={12} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '16px 22px',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  background: '#F8FAFC',
                  borderBottomLeftRadius: '24px',
                  borderBottomRightRadius: '24px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)'
                  }}
                >
                  Save Baseline & Sync Across Features
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
