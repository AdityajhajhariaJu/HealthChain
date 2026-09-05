import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Clock, 
  Plus, 
  Trash2, 
  Check, 
  Bell, 
  BellOff, 
  Sparkles, 
  Droplet,
  Wind,
  Syringe,
  Leaf,
  Sun,
  Sunset,
  Moon,
  Info
} from 'lucide-react';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { 
  getVitaminSchedule, 
  saveVitaminSchedule, 
  toggleVitaminTaken, 
  markAllVitaminsTaken,
  triggerPillNotification,
  VitaminItem,
  getTodayDateString
} from '../../services/VitaminScheduleService';
import { requestNotificationPermission } from '../../services/DailyCheckinNotificationService';

interface VitaminSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export type PillCategory = 'All' | 'Daily Essentials' | 'Vitamins & Minerals' | 'Prescriptions (Rx)' | 'Sleep & Recovery';

export type CircadianSlot = 'Morning' | 'Midday' | 'Evening' | 'Bedtime';

export interface EnrichedPillMetadata {
  name: string;
  dosage: string;
  benefit: string;
  rationale: string;
  timeSlot: CircadianSlot;
  defaultTime: string;
  category: PillCategory;
  color1: string;
  color2: string;
  iconKind: 'capsule' | 'tablet' | 'droplet' | 'leaf' | 'syringe' | 'inhaler';
}

// Bespoke, handcrafted Luxury SVG Pill / Capsule with glossy 3D depth and specular highlight
export const ClassyPillIcon: React.FC<{
  color1?: string;
  color2?: string;
  size?: number;
  kind?: 'capsule' | 'tablet' | 'droplet' | 'leaf' | 'syringe' | 'inhaler';
}> = ({
  color1 = '#F43F5E',
  color2 = '#FED7AA',
  size = 28,
  kind = 'capsule'
}) => {
  if (kind === 'droplet') {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        boxShadow: `0 2px 8px ${color1}40`,
        flexShrink: 0
      }}>
        <Droplet size={size * 0.58} fill="currentColor" />
      </div>
    );
  }

  if (kind === 'leaf') {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        boxShadow: `0 2px 8px ${color1}40`,
        flexShrink: 0
      }}>
        <Leaf size={size * 0.58} fill="currentColor" />
      </div>
    );
  }

  if (kind === 'syringe') {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        boxShadow: `0 2px 8px ${color1}40`,
        flexShrink: 0
      }}>
        <Syringe size={size * 0.58} />
      </div>
    );
  }

  if (kind === 'inhaler') {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        boxShadow: `0 2px 8px ${color1}40`,
        flexShrink: 0
      }}>
        <Wind size={size * 0.58} />
      </div>
    );
  }

  // Circular Scored Tablet
  if (kind === 'tablet') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id={`tabG_${color1}_${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor={color2} />
            <stop offset="100%" stopColor={color1} />
          </linearGradient>
          <filter id={`tabSh_${size}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="rgba(0,0,0,0.12)" />
          </filter>
        </defs>
        <circle cx="16" cy="16" r="13" fill={`url(#tabG_${color1}_${size})`} filter={`url(#tabSh_${size})`} stroke="rgba(255,255,255,0.8)" strokeWidth="1" />
        <line x1="16" y1="5" x2="16" y2="27" stroke="rgba(0,0,0,0.14)" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.75" />
      </svg>
    );
  }

  // Default: Cinematic Dual-Tone Capsule with Gloss Specular Highlight
  const gradId1 = `pillG1_${color1.replace(/[^a-zA-Z0-9]/g, '')}_${size}`;
  const gradId2 = `pillG2_${color2.replace(/[^a-zA-Z0-9]/g, '')}_${size}`;

  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId1} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color1} stopOpacity="0.82" />
        </linearGradient>
        <linearGradient id={gradId2} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      <g transform="rotate(-35 18 18)">
        {/* Full Capsule Shell */}
        <rect x="6" y="11" width="24" height="14" rx="7" fill={`url(#${gradId2})`} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
        {/* Left Colored Half */}
        <path d="M6 18C6 14.134 9.134 11 13 11H18V25H13C9.134 25 6 21.866 6 18Z" fill={`url(#${gradId1})`} />
        {/* Seam Band */}
        <line x1="18" y1="11" x2="18" y2="25" stroke="rgba(255,255,255,0.65)" strokeWidth="1" />
        {/* Specular Highlight Glare */}
        <path d="M9 13C9 12.45 11 12 13 12H23C25 12 27 12.45 27 13C27 13.55 25 14 23 14H13C11 14 9 13.55 9 13Z" fill="#FFFFFF" fillOpacity="0.65" />
      </g>
    </svg>
  );
};

// Curated Clinical Knowledgebase — Distinct, Useful, Chronobiologically Timed
export const CLINICAL_CATALOG: EnrichedPillMetadata[] = [
  // 1. Daily Essentials
  {
    name: 'Daily Multivitamin',
    dosage: '1 tablet with breakfast',
    benefit: 'Whole-Body Micronutrient Baseline',
    rationale: 'Best with morning meal to support cellular metabolism throughout the day.',
    timeSlot: 'Morning',
    defaultTime: '08:30',
    category: 'Daily Essentials',
    color1: '#F43F5E',
    color2: '#FFE4E6',
    iconKind: 'capsule'
  },
  {
    name: 'Omega-3 Fish Oil',
    dosage: '1000mg EPA/DHA with meal',
    benefit: 'Cardiovascular & Neural Membrane Health',
    rationale: 'Fat-soluble; best taken with dietary lipids during lunch for 3x absorption.',
    timeSlot: 'Midday',
    defaultTime: '13:00',
    category: 'Daily Essentials',
    color1: '#0284C7',
    color2: '#E0F2FE',
    iconKind: 'droplet'
  },
  {
    name: 'Probiotics (50B CFU)',
    dosage: '1 capsule empty stomach',
    benefit: 'Gut Microbiome & Mucosal Barrier',
    rationale: 'Take 20 mins before first meal to optimize bacterial transit past stomach acid.',
    timeSlot: 'Morning',
    defaultTime: '07:30',
    category: 'Daily Essentials',
    color1: '#10B981',
    color2: '#D1FAE5',
    iconKind: 'leaf'
  },
  {
    name: 'Collagen Peptides',
    dosage: '10g in warm water',
    benefit: 'Skin Elasticity & Joint Cartilage',
    rationale: 'Pairs synergistically with Vitamin C in the morning for collagen synthesis.',
    timeSlot: 'Morning',
    defaultTime: '09:00',
    category: 'Daily Essentials',
    color1: '#FB7185',
    color2: '#FFF1F2',
    iconKind: 'droplet'
  },

  // 2. Vitamins & Minerals
  {
    name: 'Vitamin D3 & K2',
    dosage: '2000 IU + 100mcg MK-7',
    benefit: 'Immune Defense & Bone Mineral Matrix',
    rationale: 'Fat-soluble; supports morning cortisol rhythm. Avoid at night (may disrupt melatonin).',
    timeSlot: 'Morning',
    defaultTime: '09:00',
    category: 'Vitamins & Minerals',
    color1: '#F59E0B',
    color2: '#FEF3C7',
    iconKind: 'droplet'
  },
  {
    name: 'Zinc Picolinate',
    dosage: '15mg with food',
    benefit: 'T-Cell Immune Activation & Protein Synthesis',
    rationale: 'Always take with a substantial meal to avoid gastric irritation.',
    timeSlot: 'Midday',
    defaultTime: '13:30',
    category: 'Vitamins & Minerals',
    color1: '#EA580C',
    color2: '#FFEDD5',
    iconKind: 'tablet'
  },
  {
    name: 'Vitamin B-Complex',
    dosage: '1 active co-enzymated capsule',
    benefit: 'Mitochondrial Cellular Energy & Neurotransmitters',
    rationale: 'Energizing; best taken early morning to prevent nocturnal stimulation.',
    timeSlot: 'Morning',
    defaultTime: '08:00',
    category: 'Vitamins & Minerals',
    color1: '#EAB308',
    color2: '#FEF9C3',
    iconKind: 'capsule'
  },
  {
    name: 'Iron Bisglycinate',
    dosage: '25mg with citrus/water',
    benefit: 'Hemoglobin & Oxygen Transport',
    rationale: 'Take with Vitamin C. Separate from calcium and tea by at least 2 hours.',
    timeSlot: 'Morning',
    defaultTime: '10:00',
    category: 'Vitamins & Minerals',
    color1: '#DC2626',
    color2: '#FEE2E2',
    iconKind: 'tablet'
  },
  {
    name: 'CoQ10 Ubiquinol',
    dosage: '100mg with meal',
    benefit: 'Cellular ATP Synthesis & Myocardial Support',
    rationale: 'Crucial for cellular energy and statin-induced depletion prevention.',
    timeSlot: 'Midday',
    defaultTime: '12:30',
    category: 'Vitamins & Minerals',
    color1: '#F97316',
    color2: '#FFEDD5',
    iconKind: 'capsule'
  },

  // 3. Sleep & Recovery
  {
    name: 'Magnesium Glycinate',
    dosage: '200mg before bed',
    benefit: 'Deep Sleep Architecture & Muscular Relaxation',
    rationale: 'Activates GABA receptors and relaxes striated muscle before sleep.',
    timeSlot: 'Bedtime',
    defaultTime: '21:30',
    category: 'Sleep & Recovery',
    color1: '#818CF8',
    color2: '#EEF2FF',
    iconKind: 'capsule'
  },
  {
    name: 'Ashwagandha KSM-66',
    dosage: '600mg evening',
    benefit: 'Cortisol Modulation & Nervous System Calm',
    rationale: 'Lowers evening salivary cortisol and balances HPA axis stress response.',
    timeSlot: 'Evening',
    defaultTime: '20:00',
    category: 'Sleep & Recovery',
    color1: '#14B8A6',
    color2: '#CCFBF1',
    iconKind: 'leaf'
  },

  // 4. Prescriptions (Rx)
  {
    name: 'Metformin',
    dosage: '500mg with dinner',
    benefit: 'Glycemic Regulation & AMPK Activation',
    rationale: 'Take with evening meal to minimize gastrointestinal discomfort.',
    timeSlot: 'Evening',
    defaultTime: '19:30',
    category: 'Prescriptions (Rx)',
    color1: '#059669',
    color2: '#ECFDF5',
    iconKind: 'tablet'
  },
  {
    name: 'Lisinopril',
    dosage: '10mg morning',
    benefit: 'ACE Inhibition & Blood Pressure Stability',
    rationale: 'Best taken consistently at the same morning hour daily.',
    timeSlot: 'Morning',
    defaultTime: '08:00',
    category: 'Prescriptions (Rx)',
    color1: '#6366F1',
    color2: '#EEF2FF',
    iconKind: 'tablet'
  },
  {
    name: 'Atorvastatin',
    dosage: '20mg bedtime',
    benefit: 'HMG-CoA Reductase Lipid Management',
    rationale: 'Hepatic cholesterol synthesis peaks during sleep; best at bedtime.',
    timeSlot: 'Bedtime',
    defaultTime: '22:00',
    category: 'Prescriptions (Rx)',
    color1: '#0284C7',
    color2: '#F0F9FF',
    iconKind: 'tablet'
  },
  {
    name: 'Levothyroxine',
    dosage: '50mcg on empty stomach',
    benefit: 'Thyroid Hormone Baseline Replacement',
    rationale: 'Must take with water 30-60 mins before breakfast. Do not take with food.',
    timeSlot: 'Morning',
    defaultTime: '07:00',
    category: 'Prescriptions (Rx)',
    color1: '#8B5CF6',
    color2: '#F5F3FF',
    iconKind: 'tablet'
  },
  {
    name: 'Insulin',
    dosage: 'Basal dose as directed',
    benefit: 'Exogenous Basal Glucose Control',
    rationale: 'Monitor continuous glucose levels and follow specialist titration instructions.',
    timeSlot: 'Bedtime',
    defaultTime: '22:00',
    category: 'Prescriptions (Rx)',
    color1: '#3B82F6',
    color2: '#EFF6FF',
    iconKind: 'syringe'
  },
  {
    name: 'Ventolin (Salbutamol)',
    dosage: 'Inhaler as directed',
    benefit: 'Rapid Bronchodilation & Airway Patency',
    rationale: 'Carry for acute symptom relief or exercise-induced bronchospasm.',
    timeSlot: 'Morning',
    defaultTime: '08:00',
    category: 'Prescriptions (Rx)',
    color1: '#06B6D4',
    color2: '#ECFEFF',
    iconKind: 'inhaler'
  },
  {
    name: 'Sertraline (Zoloft)',
    dosage: '50mg morning',
    benefit: 'SSRI Serotonergic Neurotransmitter Support',
    rationale: 'Morning administration prevents insomnia; take consistently with breakfast.',
    timeSlot: 'Morning',
    defaultTime: '08:30',
    category: 'Prescriptions (Rx)',
    color1: '#EC4899',
    color2: '#FDF2F8',
    iconKind: 'capsule'
  },
  {
    name: 'Escitalopram (Lexapro)',
    dosage: '10mg morning',
    benefit: 'High-Selectivity Serotonin Reuptake',
    rationale: 'Consistent morning timing supports steady-state pharmacokinetics.',
    timeSlot: 'Morning',
    defaultTime: '09:00',
    category: 'Prescriptions (Rx)',
    color1: '#A855F7',
    color2: '#FAF5FF',
    iconKind: 'tablet'
  },
  {
    name: 'Spironolactone',
    dosage: '25mg morning',
    benefit: 'Aldosterone Receptor Antagonism',
    rationale: 'Mild diuretic; take in morning to avoid waking at night to urinate.',
    timeSlot: 'Morning',
    defaultTime: '08:30',
    category: 'Prescriptions (Rx)',
    color1: '#10B981',
    color2: '#ECFDF5',
    iconKind: 'tablet'
  },
  {
    name: 'Ondansetron',
    dosage: '4mg oral disintegrating',
    benefit: '5-HT3 Receptor Antiemetic',
    rationale: 'Take 30 mins before triggering event or as directed for nausea.',
    timeSlot: 'Morning',
    defaultTime: '08:00',
    category: 'Prescriptions (Rx)',
    color1: '#F43F5E',
    color2: '#FFF1F2',
    iconKind: 'tablet'
  }
];

const CATEGORIES: PillCategory[] = [
  'All',
  'Daily Essentials',
  'Vitamins & Minerals',
  'Sleep & Recovery',
  'Prescriptions (Rx)'
];

const CIRCADIAN_ICONS: Record<CircadianSlot, React.ReactNode> = {
  Morning: <Sun size={13} color="#EA580C" />,
  Midday: <Sun size={13} color="#D97706" />,
  Evening: <Sunset size={13} color="#E11D48" />,
  Bedtime: <Moon size={13} color="#6366F1" />
};

export const VitaminSchedulerModal: React.FC<VitaminSchedulerModalProps> = ({ isOpen, onClose, onUpdated }) => {
  const [vitamins, setVitamins] = useState<VitaminItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PillCategory>('All');
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newBenefit, setNewBenefit] = useState('');
  const [newTime, setNewTime] = useState('08:30');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setVitamins(getVitaminSchedule());
      checkPermission();
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

  const checkPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasNotificationPermission(Notification.permission === 'granted');
    }
  };

  const handleRequestPermission = async () => {
    triggerHapticLight();
    const granted = await requestNotificationPermission();
    setHasNotificationPermission(granted);
  };

  const handleTimeChange = (id: string, newTimeStr: string) => {
    setVitamins(prev => prev.map(v => v.id === id ? { ...v, time: newTimeStr } : v));
  };

  const handleToggleEnabled = (id: string) => {
    triggerHapticLight();
    setVitamins(prev => prev.map(v => v.id === id ? { ...v, enabled: !v.enabled } : v));
  };

  const handleRemove = (id: string) => {
    triggerHapticLight();
    setVitamins(prev => prev.filter(v => v.id !== id));
  };

  const handleToggleTaken = (id: string, name: string) => {
    const isNowTaken = toggleVitaminTaken(id);
    if (isNowTaken) {
      triggerHapticSuccess();
      awardPoints(2, `Taken: ${name}`, 'lifestyle', `pill_${id}_${getTodayDateString()}`);
    } else {
      triggerHapticLight();
    }
    setVitamins(getVitaminSchedule());
    if (onUpdated) onUpdated();
  };

  const handleTogglePill = (pill: EnrichedPillMetadata) => {
    triggerHapticSelection();
    const existing = vitamins.find(v => v.name.toLowerCase() === pill.name.toLowerCase());
    if (existing) {
      handleRemove(existing.id);
      return;
    }

    const newItem: VitaminItem = {
      id: 'vit_' + Date.now() + Math.random().toString(36).substring(2, 5),
      name: pill.name,
      dosage: pill.dosage,
      time: pill.defaultTime,
      enabled: true,
      takenToday: false
    };

    setVitamins(prev => [...prev, newItem]);
  };

  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newName.trim()) return;

    triggerHapticSuccess();
    const newItem: VitaminItem = {
      id: 'vit_' + Date.now(),
      name: newName.trim(),
      dosage: newDosage.trim() || (newBenefit.trim() ? newBenefit.trim() : '1 dose daily'),
      time: newTime || '08:30',
      enabled: true,
      takenToday: false
    };

    setVitamins(prev => [...prev, newItem]);
    setNewName('');
    setNewDosage('');
    setNewBenefit('');
    setShowCustomForm(false);
  };

  const handleSaveAndClose = async () => {
    triggerHapticSuccess();
    await saveVitaminSchedule(vitamins);
    if (onUpdated) onUpdated();
    onClose();
  };

  const handleMarkAllTaken = () => {
    triggerHapticSuccess();
    markAllVitaminsTaken();
    awardPoints(5, 'All Daily Tablets & Vitamins Taken 💊', 'lifestyle', `all_pills_${getTodayDateString()}`);
    setVitamins(getVitaminSchedule());
    if (onUpdated) onUpdated();
  };

  const handleTestPillNotification = () => {
    triggerHapticLight();
    triggerPillNotification(vitamins.length > 0 ? vitamins[0] : undefined);
  };

  if (!isOpen) return null;

  const takenCount = vitamins.filter(v => v.takenToday).length;
  const allTaken = vitamins.length > 0 && takenCount === vitamins.length;

  const filteredCatalog = selectedCategory === 'All'
    ? CLINICAL_CATALOG
    : CLINICAL_CATALOG.filter(p => p.category === selectedCategory);

  // Helper to match catalog metadata for any vitamin
  const getPillMeta = (vName: string): EnrichedPillMetadata | undefined => {
    return CLINICAL_CATALOG.find(p => p.name.toLowerCase() === vName.toLowerCase());
  };

  // Group scheduled vitamins by circadian slot
  const getTimeSlot = (timeStr: string): CircadianSlot => {
    const hour = parseInt(timeStr.split(':')[0] || '9', 10);
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Midday';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Bedtime';
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
          backgroundColor: 'rgba(28, 25, 23, 0.58)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Medication & Chrono-Schedule"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: 'calc(100vh - max(36px, env(safe-area-inset-top, 36px)))',
            background: 'linear-gradient(180deg, #FFF7F2 0%, #FFF1E8 35%, #FEEBE0 70%, #FCE7DB 100%)',
            borderTopLeftRadius: '32px',
            borderTopRightRadius: '32px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -20px 60px rgba(234, 88, 12, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.95)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Peach Pull Notch */}
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
            <div style={{ width: '38px', height: '4px', backgroundColor: '#E8D5CA', borderRadius: '999px' }} />
          </div>

          {/* Cinematic Header (Classy Seal Badge & Clear Typography) */}
          <div style={{
            padding: '4px 20px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(254, 215, 195, 0.85)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #FFEFE6 0%, #FED7AA 100%)',
                border: '1.5px solid rgba(251, 146, 60, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(251, 146, 60, 0.18), inset 0 1px 0 rgba(255,255,255,0.8)'
              }}>
                <ClassyPillIcon size={30} color1="#F43F5E" color2="#FED7AA" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1C1917', letterSpacing: '-0.3px' }}>
                    Medication & Chrono-Schedule
                  </h3>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#78716C', fontWeight: 500 }}>
                  Circadian dosing, cellular absorption & alerts
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

          {/* Scrollable Body */}
          <div style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            {/* Frosted Peach Regimen Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 246, 240, 0.9) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '22px',
              padding: '14px 16px',
              border: '1.5px solid rgba(254, 215, 195, 0.95)',
              boxShadow: '0 8px 24px rgba(251, 146, 60, 0.08), inset 0 1px 0 rgba(255,255,255,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1C1917' }}>
                    Today's Chrono-Regimen:
                  </span>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    color: allTaken ? '#065F46' : '#C2410C',
                    background: allTaken ? '#DCFCE7' : '#FFEDD5',
                    padding: '2px 9px',
                    borderRadius: '999px',
                    border: allTaken ? '1px solid #A7F3D0' : '1px solid #FED7AA'
                  }}>
                    {takenCount} of {vitamins.length} taken
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#78716C' }}>
                  {allTaken 
                    ? 'All daily circadian doses completed! 🎉' 
                    : 'Tap capsules below to optimize and customize'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestPillNotification}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1.5px solid #10B981',
                  borderRadius: '999px',
                  padding: '7px 13px',
                  color: '#059669',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)'
                }}
              >
                <Sparkles size={13} color="#10B981" /> Test Alert
              </button>
            </div>

            {/* Notification Permission Pill Banner */}
            {!hasNotificationPermission && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.92)',
                border: '1.5px solid #FED7AA',
                borderRadius: '16px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={15} color="#EA580C" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#9A3412' }}>
                    Enable device notifications for alarms
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    background: '#EA580C',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Enable
                </button>
              </div>
            )}

            {/* SECTION 1: Curated Clinical Medicine & Vitamin Selector (Zero Overlap) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Clinical Formulations & Supplements
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomForm(!showCustomForm)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#EA580C',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0
                  }}
                >
                  <Plus size={13} /> {showCustomForm ? 'Close' : 'Write Tablet'}
                </button>
              </div>

              {/* Category Filter Pills (Guaranteed flexShrink: 0 — ZERO Text Overlap!) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '8px',
                marginBottom: '10px',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch'
              }}>
                {CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setSelectedCategory(cat);
                      }}
                      style={{
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        padding: '7px 14px',
                        borderRadius: '999px',
                        border: isActive ? '1.5px solid #10B981' : '1px solid rgba(254, 215, 195, 0.95)',
                        background: isActive ? '#ECFDF5' : '#FFFFFF',
                        color: isActive ? '#065F46' : '#57534E',
                        fontSize: '12px',
                        fontWeight: isActive ? 800 : 600,
                        cursor: 'pointer',
                        boxShadow: isActive ? '0 2px 8px rgba(16, 185, 129, 0.16)' : '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Custom Write-In Form (Expandable) */}
              <AnimatePresence>
                {showCustomForm && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                    onSubmit={handleAddCustom}
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '20px',
                      padding: '14px',
                      border: '1.5px solid rgba(251, 146, 60, 0.35)',
                      boxShadow: '0 6px 20px rgba(251, 146, 60, 0.08)',
                      marginBottom: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Medication or supplement name (e.g. Lisinopril, B12, Creatine)..."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid #E2D9D2',
                        background: '#FFFDFB',
                        fontSize: '13.5px',
                        color: '#1C1917',
                        outline: 'none'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Dosage or benefit (e.g. 500mg with breakfast)..."
                        value={newDosage}
                        onChange={(e) => setNewDosage(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: '1px solid #E2D9D2',
                          background: '#FFFDFB',
                          fontSize: '13.5px',
                          color: '#1C1917',
                          outline: 'none'
                        }}
                      />
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: '1px solid #E2D9D2',
                          background: '#FFFDFB',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#1C1917'
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newName.trim()}
                      style={{
                        padding: '11px',
                        borderRadius: '12px',
                        background: newName.trim() ? 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)' : '#E2E8F0',
                        color: newName.trim() ? '#FFF' : '#94A3B8',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: newName.trim() ? 'pointer' : 'default',
                        boxShadow: newName.trim() ? '0 4px 12px rgba(234, 88, 12, 0.25)' : 'none'
                      }}
                    >
                      + Add to Daily Regimen
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Informative, Cinematic Capsule Chips Grid */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {filteredCatalog.map((pill) => {
                  const isScheduled = vitamins.some(v => v.name.toLowerCase() === pill.name.toLowerCase());
                  return (
                    <motion.button
                      key={pill.name}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => handleTogglePill(pill)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '999px',
                        border: isScheduled ? '1.5px solid #10B981' : '1px solid rgba(254, 215, 195, 0.95)',
                        background: isScheduled 
                          ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' 
                          : '#FFFFFF',
                        color: isScheduled ? '#065F46' : '#1C1917',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        boxShadow: isScheduled 
                          ? '0 3px 12px rgba(16, 185, 129, 0.2)' 
                          : '0 2px 6px rgba(0, 0, 0, 0.03)',
                        transition: 'all 0.18s ease'
                      }}
                    >
                      {/* Bespoke Classy Pill SVG Artwork */}
                      <ClassyPillIcon 
                        size={20} 
                        color1={pill.color1} 
                        color2={pill.color2} 
                        kind={pill.iconKind} 
                      />

                      <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                        <span style={{ fontSize: '13px', fontWeight: isScheduled ? 800 : 700, display: 'block' }}>
                          {pill.name}
                        </span>
                        <span style={{ fontSize: '10.5px', color: isScheduled ? '#047857' : '#78716C', fontWeight: 500 }}>
                          {pill.benefit}
                        </span>
                      </div>

                      {isScheduled && (
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#10B981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          marginLeft: '2px',
                          flexShrink: 0
                        }}>
                          <Check size={11} strokeWidth={3.5} />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: Active Scheduled Chrono-Doses (Cinematic, Classy Cards) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Scheduled Regimen & Alarms ({vitamins.length})
                </span>
                {vitamins.length > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllTaken}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#10B981',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    <Check size={14} strokeWidth={2.8} /> Mark all done (+5)
                  </button>
                )}
              </div>

              {vitamins.length === 0 ? (
                <div style={{
                  padding: '28px 20px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '24px',
                  border: '1.5px dashed rgba(254, 215, 195, 0.95)',
                  color: '#78716C',
                  fontSize: '13px'
                }}>
                  No supplements scheduled yet. Tap any formulation above to build your daily chrono-routine!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {vitamins.map((item) => {
                    const meta = getPillMeta(item.name);
                    const slot = getTimeSlot(item.time);

                    return (
                      <div
                        key={item.id}
                        style={{
                          background: item.takenToday 
                            ? 'linear-gradient(135deg, rgba(240, 253, 244, 0.98) 0%, rgba(220, 252, 231, 0.88) 100%)' 
                            : 'rgba(255, 255, 255, 0.94)',
                          borderRadius: '22px',
                          padding: '14px 16px',
                          border: item.takenToday ? '1.5px solid #86EFAC' : '1px solid rgba(254, 215, 195, 0.9)',
                          boxShadow: '0 4px 18px rgba(251, 146, 60, 0.05), inset 0 1px 0 rgba(255,255,255,0.95)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        {/* Top Row: Classy SVG Pill, Name, Dosage & Clinical Rationale */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '12px',
                              background: item.takenToday ? '#DCFCE7' : '#FFF5EE',
                              border: item.takenToday ? '1px solid #A7F3D0' : '1px solid rgba(254, 215, 195, 0.7)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <ClassyPillIcon 
                                size={26}
                                color1={meta?.color1 || '#FB923C'}
                                color2={meta?.color2 || '#FFF7ED'}
                                kind={meta?.iconKind || 'capsule'}
                              />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: '15px',
                                  fontWeight: 800,
                                  color: item.takenToday ? '#065F46' : '#1C1917',
                                  textDecoration: item.takenToday ? 'line-through' : 'none',
                                  lineHeight: 1.2
                                }}>
                                  {item.name}
                                </span>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: item.takenToday ? '#DCFCE7' : '#FFF7ED',
                                  color: item.takenToday ? '#15803D' : '#C2410C',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}>
                                  {CIRCADIAN_ICONS[slot]} {slot}
                                </span>
                              </div>
                              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#78716C', fontWeight: 500, lineHeight: 1.3 }}>
                                {item.dosage || meta?.dosage || '1 dose daily'}
                                {meta?.rationale ? ` • ${meta.rationale}` : ''}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#A8A29E',
                              cursor: 'pointer',
                              padding: '4px',
                              marginLeft: '6px'
                            }}
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Bottom Row: Time Picker, Alarm Toggle, Take Dose Pill */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(0, 0, 0, 0.04)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Time Picker Capsule */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#FFFFFF',
                              border: '1px solid #E8D5CA',
                              borderRadius: '10px',
                              padding: '4px 8px'
                            }}>
                              <Clock size={12} color="#EA580C" />
                              <input
                                type="time"
                                value={item.time}
                                onChange={(e) => handleTimeChange(item.id, e.target.value)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  fontSize: '12.5px',
                                  fontWeight: 800,
                                  color: '#1C1917',
                                  outline: 'none',
                                  cursor: 'pointer'
                                }}
                              />
                            </div>

                            {/* Alarm Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleEnabled(item.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: item.enabled ? '#FFEDD5' : '#F5F5F4',
                                color: item.enabled ? '#C2410C' : '#A8A29E',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '5px 9px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {item.enabled ? <Bell size={12} /> : <BellOff size={12} />}
                              {item.enabled ? 'Alarm' : 'Muted'}
                            </button>
                          </div>

                          {/* Take Dose Action Pill */}
                          <button
                            type="button"
                            onClick={() => handleToggleTaken(item.id, item.name)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: item.takenToday ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : '#FFFFFF',
                              color: item.takenToday ? '#FFFFFF' : '#059669',
                              border: item.takenToday ? 'none' : '1.5px solid #10B981',
                              borderRadius: '999px',
                              padding: '6px 14px',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              boxShadow: item.takenToday ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
                            }}
                          >
                            <Check size={13} strokeWidth={2.6} />
                            {item.takenToday ? 'Taken' : 'Take Dose'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Reference Strawberry Rose-Coral Bottom Action Button */}
          <div style={{
            padding: '12px 20px calc(14px + env(safe-area-inset-bottom, 16px))',
            borderTop: '1px solid rgba(254, 215, 195, 0.85)',
            background: '#FFFFFF'
          }}>
            <button
              type="button"
              onClick={handleSaveAndClose}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: '15px',
                boxShadow: '0 8px 24px rgba(225, 29, 72, 0.28), inset 0 1px 0 rgba(255,255,255,0.25)',
                cursor: 'pointer'
              }}
            >
              {vitamins.length > 0 
                ? `Save Schedule (${vitamins.length} Medications)` 
                : 'Save Schedule'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
