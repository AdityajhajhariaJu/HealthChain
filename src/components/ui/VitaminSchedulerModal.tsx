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
  Info,
  AlertTriangle,
  ShieldAlert,
  Search
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
  getTodayDateString,
  detectDrugNutrientInteractions,
  DrugInteractionAlert
} from '../../services/VitaminScheduleService';
import { requestNotificationPermission } from '../../services/DailyCheckinNotificationService';
import { FeatureProfileDataBanner } from './FeatureProfileDataBanner';

interface VitaminSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export type PillCategory = 
  | 'All' 
  | 'Daily Essentials' 
  | 'Vitamins & Minerals' 
  | 'Longevity & Energy' 
  | 'Sleep & Calm' 
  | 'Gut & Digestion' 
  | 'Prescriptions (Rx)';

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
  color2 = '#FECDD3',
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
    benefit: 'Heart & Brain Health',
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
  {
    name: 'Vitamin C (Liposomal)',
    dosage: '1000mg with breakfast',
    benefit: 'Collagen Synthesis & Immune Defense',
    rationale: 'Water-soluble antioxidant; enhances non-heme iron absorption and collagen stability.',
    timeSlot: 'Morning',
    defaultTime: '08:30',
    category: 'Daily Essentials',
    color1: '#F59E0B',
    color2: '#FEF3C7',
    iconKind: 'capsule'
  },
  {
    name: 'Electrolytes Complete',
    dosage: '1 scoop in 500ml water',
    benefit: 'Cellular Hydration & Nerve Conduction',
    rationale: 'Maintains osmotic balance and athletic stamina; best taken early or intra-workout.',
    timeSlot: 'Morning',
    defaultTime: '09:00',
    category: 'Daily Essentials',
    color1: '#06B6D4',
    color2: '#ECFEFF',
    iconKind: 'droplet'
  },

  // 2. Vitamins & Minerals
  {
    name: 'Vitamin D3 & K2',
    dosage: '2000 IU + 100mcg MK-7',
    benefit: 'Immune Defense & Bone Mineralization',
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
    rationale: 'Always take with a substantial meal to avoid gastric irritation; separate from iron.',
    timeSlot: 'Midday',
    defaultTime: '13:30',
    category: 'Vitamins & Minerals',
    color1: '#D97706',
    color2: '#FEF3C7',
    iconKind: 'tablet'
  },
  {
    name: 'Vitamin B-Complex',
    dosage: '1 active co-enzymated capsule',
    benefit: 'Energy Metabolism & Nerve Function',
    rationale: 'Energizing; best taken early morning to prevent nocturnal stimulation.',
    timeSlot: 'Morning',
    defaultTime: '08:00',
    category: 'Vitamins & Minerals',
    color1: '#EAB308',
    color2: '#FEF9C3',
    iconKind: 'capsule'
  },
  {
    name: 'Methylcobalamin (B12)',
    dosage: '1000mcg sublingual',
    benefit: 'Homocysteine Clearance & Myelin Sheath',
    rationale: 'Bioactive methylated form; supports neural transmission and red blood cell formation.',
    timeSlot: 'Morning',
    defaultTime: '08:30',
    category: 'Vitamins & Minerals',
    color1: '#E11D48',
    color2: '#FFE4E6',
    iconKind: 'tablet'
  },
  {
    name: 'Iron Bisglycinate',
    dosage: '25mg with citrus/water',
    benefit: 'Hemoglobin & Oxygen Transport',
    rationale: 'Gentle chelated iron. Take with Vitamin C; separate from calcium, eggs, and tea by 2 hours.',
    timeSlot: 'Morning',
    defaultTime: '10:00',
    category: 'Vitamins & Minerals',
    color1: '#DC2626',
    color2: '#FEE2E2',
    iconKind: 'tablet'
  },
  {
    name: 'Magnesium Glycinate',
    dosage: '200mg before bed',
    benefit: 'Deep Sleep Architecture & Muscular Relaxation',
    rationale: 'Activates GABA receptors and relaxes striated muscle before sleep without laxative effect.',
    timeSlot: 'Bedtime',
    defaultTime: '21:30',
    category: 'Vitamins & Minerals',
    color1: '#818CF8',
    color2: '#EEF2FF',
    iconKind: 'capsule'
  },
  {
    name: 'L-Methylfolate (5-MTHF)',
    dosage: '400mcg morning',
    benefit: 'Methylation Cycle & DNA Biosynthesis',
    rationale: 'Crucial for MTHFR variant carriers; bypasses synthetic folic acid enzymatic bottleneck.',
    timeSlot: 'Morning',
    defaultTime: '08:30',
    category: 'Vitamins & Minerals',
    color1: '#10B981',
    color2: '#D1FAE5',
    iconKind: 'capsule'
  },

  // 3. Longevity & Energy
  {
    name: 'CoQ10 Ubiquinol',
    dosage: '100mg with meal',
    benefit: 'Mitochondrial ATP & Statin Defense',
    rationale: 'Active reduced form; crucial for cardiac energetics and statin-induced depletion defense.',
    timeSlot: 'Midday',
    defaultTime: '12:30',
    category: 'Longevity & Energy',
    color1: '#D97706',
    color2: '#FEF3C7',
    iconKind: 'capsule'
  },
  {
    name: 'Creatine Monohydrate',
    dosage: '5g daily in water',
    benefit: 'Phosphocreatine Cellular ATP & Cognitive Reserve',
    rationale: 'Saturates muscle and neuronal phosphocreatine stores for acute energy reserve.',
    timeSlot: 'Morning',
    defaultTime: '09:30',
    category: 'Longevity & Energy',
    color1: '#3B82F6',
    color2: '#EFF6FF',
    iconKind: 'droplet'
  },
  {
    name: 'NAC (N-Acetyl Cysteine)',
    dosage: '600mg on empty stomach',
    benefit: 'Master Glutathione Biosynthesis & Detox',
    rationale: 'Rate-limiting precursor to glutathione; protects hepatocyte and cellular membranes.',
    timeSlot: 'Morning',
    defaultTime: '08:00',
    category: 'Longevity & Energy',
    color1: '#6366F1',
    color2: '#EEF2FF',
    iconKind: 'capsule'
  },
  {
    name: 'Berberine HCl',
    dosage: '500mg before main meal',
    benefit: 'AMPK Activation & Glycemic Sensitivity',
    rationale: 'Activates cellular metabolic master switch AMPK; take 15-20 min before highest carb meal.',
    timeSlot: 'Midday',
    defaultTime: '12:45',
    category: 'Longevity & Energy',
    color1: '#EAB308',
    color2: '#FEF9C3',
    iconKind: 'capsule'
  },
  {
    name: 'Curcumin / Turmeric (95%)',
    dosage: '500mg with Piperine',
    benefit: 'Systemic Cytokine & Joint Inflammation Calm',
    rationale: 'Black pepper piperine boosts systemic absorption by up to 2000%; best taken with food.',
    timeSlot: 'Midday',
    defaultTime: '13:30',
    category: 'Longevity & Energy',
    color1: '#F97316',
    color2: '#FFEDD5',
    iconKind: 'capsule'
  },
  {
    name: 'NMN (Nicotinamide Mononucleotide)',
    dosage: '250mg sublingual morning',
    benefit: 'Cellular NAD+ Salvage & Sirtuin Activation',
    rationale: 'Direct NAD+ intermediate supporting cellular longevity enzymes and DNA repair mechanisms.',
    timeSlot: 'Morning',
    defaultTime: '07:30',
    category: 'Longevity & Energy',
    color1: '#EC4899',
    color2: '#FDF2F8',
    iconKind: 'tablet'
  },
  {
    name: 'Alpha Lipoic Acid (ALA)',
    dosage: '300mg before meal',
    benefit: 'Mitochondrial Antioxidant & Nerve Health',
    rationale: 'Both water and lipid soluble; recycles Vitamins C and E and supports insulin signaling.',
    timeSlot: 'Morning',
    defaultTime: '08:00',
    category: 'Longevity & Energy',
    color1: '#8B5CF6',
    color2: '#F5F3FF',
    iconKind: 'capsule'
  },
  {
    name: 'Acetyl-L-Carnitine (ALCAR)',
    dosage: '500mg morning',
    benefit: 'Mitochondrial Beta-Oxidation & Neuro-Focus',
    rationale: 'Crosses blood-brain barrier to shuttle long-chain fatty acids into mitochondria for cerebral ATP.',
    timeSlot: 'Morning',
    defaultTime: '08:15',
    category: 'Longevity & Energy',
    color1: '#06B6D4',
    color2: '#ECFEFF',
    iconKind: 'capsule'
  },

  // 4. Sleep & Calm
  {
    name: 'Ashwagandha KSM-66',
    dosage: '600mg evening',
    benefit: 'Cortisol Modulation & Nervous System Calm',
    rationale: 'Lowers evening salivary cortisol and balances HPA axis hyperarousal.',
    timeSlot: 'Evening',
    defaultTime: '20:00',
    category: 'Sleep & Calm',
    color1: '#14B8A6',
    color2: '#CCFBF1',
    iconKind: 'leaf'
  },
  {
    name: 'Melatonin (Micro-dose)',
    dosage: '1mg 30m before bed',
    benefit: 'Circadian Phase Shift & Sleep Onset',
    rationale: 'Physiological micro-dose mimics endogenous pineal surge without morning grogginess.',
    timeSlot: 'Bedtime',
    defaultTime: '22:00',
    category: 'Sleep & Calm',
    color1: '#6366F1',
    color2: '#EEF2FF',
    iconKind: 'tablet'
  },
  {
    name: 'L-Theanine',
    dosage: '200mg as needed',
    benefit: 'Alpha Brain Waves & Jitter-Free Relaxation',
    rationale: 'Crosses blood-brain barrier; enhances GABA and glycine without daytime sedation.',
    timeSlot: 'Evening',
    defaultTime: '19:00',
    category: 'Sleep & Calm',
    color1: '#10B981',
    color2: '#D1FAE5',
    iconKind: 'capsule'
  },
  {
    name: 'Magnesium L-Threonate',
    dosage: '144mg elemental before bed',
    benefit: 'Blood-Brain Barrier Synaptic Plasticity',
    rationale: 'Unique chelate designed to elevate cerebrospinal fluid magnesium concentrations.',
    timeSlot: 'Bedtime',
    defaultTime: '21:45',
    category: 'Sleep & Calm',
    color1: '#8B5CF6',
    color2: '#F5F3FF',
    iconKind: 'capsule'
  },
  {
    name: 'GABA (PharmaGABA)',
    dosage: '100mg bedtime',
    benefit: 'Central Nervous System Parasympathetic Tone',
    rationale: 'Promotes parasympathetic vagal tone and attenuates racing nocturnal thoughts.',
    timeSlot: 'Bedtime',
    defaultTime: '22:15',
    category: 'Sleep & Calm',
    color1: '#A855F7',
    color2: '#FAF5FF',
    iconKind: 'capsule'
  },
  {
    name: 'Tart Cherry Extract',
    dosage: '500mg evening',
    benefit: 'Phytomelatonin & Muscle Recovery',
    rationale: 'Natural source of exogenous phytomelatonin and anthocyanins that accelerate nocturnal tissue recovery.',
    timeSlot: 'Evening',
    defaultTime: '20:30',
    category: 'Sleep & Calm',
    color1: '#BE123C',
    color2: '#FFF1F2',
    iconKind: 'capsule'
  },
  {
    name: 'Apigenin',
    dosage: '50mg bedtime',
    benefit: 'GABA-A Receptor Modulation & Sleep Architecture',
    rationale: 'Chamomile flavonoid that binds benzodiazepine receptors gently, deepening slow-wave delta sleep.',
    timeSlot: 'Bedtime',
    defaultTime: '21:30',
    category: 'Sleep & Calm',
    color1: '#6366F1',
    color2: '#EEF2FF',
    iconKind: 'capsule'
  },

  // 5. Gut & Digestion
  {
    name: 'Digestive Enzymes Complex',
    dosage: '1-2 capsules with meals',
    benefit: 'Macronutrient Cleavage & Postprandial Comfort',
    rationale: 'Broad-spectrum protease, lipase, and amylase reduce upper GI fullness and gas.',
    timeSlot: 'Midday',
    defaultTime: '13:00',
    category: 'Gut & Digestion',
    color1: '#0D9488',
    color2: '#F0FDFA',
    iconKind: 'capsule'
  },
  {
    name: 'Probiotics (Spore & Bifido)',
    dosage: '1 capsule morning on empty stomach',
    benefit: 'Microbiome Diversity & Mucosal Immune Shield',
    rationale: 'Colonizes mucosal brush border, competitive exclusion of pathobionts, and secretory IgA support.',
    timeSlot: 'Morning',
    defaultTime: '07:30',
    category: 'Gut & Digestion',
    color1: '#059669',
    color2: '#ECFDF5',
    iconKind: 'capsule'
  },
  {
    name: 'Zinc Carnosine',
    dosage: '75mg between meals',
    benefit: 'Gastric Mucosal Healing & Tight Junction Repair',
    rationale: 'Chelated zinc-carnosine adheres specifically to ulcerated mucosal areas, accelerating gastric tissue repair.',
    timeSlot: 'Morning',
    defaultTime: '08:30',
    category: 'Gut & Digestion',
    color1: '#D97706',
    color2: '#FEF3C7',
    iconKind: 'tablet'
  },
  {
    name: 'Psyllium Husk Prebiotic',
    dosage: '5g in tall glass of water',
    benefit: 'Soluble Fiber & Short-Chain Fatty Acids',
    rationale: 'Normalizes stool consistency and nourishes butyrate-producing colonic bacteria.',
    timeSlot: 'Morning',
    defaultTime: '08:00',
    category: 'Gut & Digestion',
    color1: '#84CC16',
    color2: '#F7FEE7',
    iconKind: 'leaf'
  },
  {
    name: 'L-Glutamine',
    dosage: '5g empty stomach in water',
    benefit: 'Enterocyte Fuel & Intestinal Mucosal Barrier',
    rationale: 'Primary metabolic fuel for small intestinal enterocytes; reinforces tight junctions.',
    timeSlot: 'Morning',
    defaultTime: '07:15',
    category: 'Gut & Digestion',
    color1: '#06B6D4',
    color2: '#ECFEFF',
    iconKind: 'droplet'
  },
  {
    name: 'DGL Deglycyrrhizinated Licorice',
    dosage: '400mg chewable before meals',
    benefit: 'Gastric Mucosal Coating & Acid Defense',
    rationale: 'Stimulates gastric mucosal prostaglandins without glycyrrhizin blood pressure elevation.',
    timeSlot: 'Midday',
    defaultTime: '12:45',
    category: 'Gut & Digestion',
    color1: '#D97706',
    color2: '#FEF3C7',
    iconKind: 'tablet'
  },

  // 6. Prescriptions (Rx)
  {
    name: 'Metformin',
    dosage: '500mg with dinner',
    benefit: 'Glycemic Regulation & Hepatic AMPK Activation',
    rationale: 'Take with evening meal to minimize gastrointestinal discomfort and morning dawn phenomenon.',
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
    rationale: 'Best taken consistently at the same morning hour daily; monitor serum potassium.',
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
    rationale: 'Hepatic cholesterol synthesis peaks during sleep; best taken with evening water.',
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
    rationale: 'Must take with water 30-60 mins before breakfast. Strict separation from iron & calcium.',
    timeSlot: 'Morning',
    defaultTime: '07:00',
    category: 'Prescriptions (Rx)',
    color1: '#8B5CF6',
    color2: '#F5F3FF',
    iconKind: 'tablet'
  },
  {
    name: 'Amlodipine',
    dosage: '5mg morning',
    benefit: 'Dihydropyridine Calcium Channel Blockade',
    rationale: 'Relaxes peripheral arterial smooth muscle; long 30-50h half-life maintains all-day control.',
    timeSlot: 'Morning',
    defaultTime: '08:30',
    category: 'Prescriptions (Rx)',
    color1: '#3B82F6',
    color2: '#EFF6FF',
    iconKind: 'tablet'
  },
  {
    name: 'Pantoprazole',
    dosage: '40mg 30m before breakfast',
    benefit: 'Proton Pump H+/K+ ATPase Acid Inhibition',
    rationale: 'Irreversibly inhibits active proton pumps; requires food stimulation shortly after.',
    timeSlot: 'Morning',
    defaultTime: '07:30',
    category: 'Prescriptions (Rx)',
    color1: '#D97706',
    color2: '#FEF3C7',
    iconKind: 'tablet'
  },
  {
    name: 'Losartan',
    dosage: '50mg morning',
    benefit: 'Angiotensin II Type 1 Receptor Blocker (ARB)',
    rationale: 'Cardiorenal protective; well-tolerated alternative for patients with ACE-inhibitor cough.',
    timeSlot: 'Morning',
    defaultTime: '08:15',
    category: 'Prescriptions (Rx)',
    color1: '#059669',
    color2: '#ECFDF5',
    iconKind: 'tablet'
  },
  {
    name: 'Rosuvastatin',
    dosage: '10mg bedtime',
    benefit: 'High-Potency Hydrophilic Statin Therapy',
    rationale: 'Potent hepatic LDL receptor upregulation; hydrophilic with low systemic muscle penetrance.',
    timeSlot: 'Bedtime',
    defaultTime: '21:30',
    category: 'Prescriptions (Rx)',
    color1: '#0284C7',
    color2: '#F0F9FF',
    iconKind: 'tablet'
  },
  {
    name: 'Insulin (Basal)',
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
    rationale: 'Mild potassium-sparing diuretic; take in morning to prevent nocturia.',
    timeSlot: 'Morning',
    defaultTime: '08:30',
    category: 'Prescriptions (Rx)',
    color1: '#10B981',
    color2: '#ECFDF5',
    iconKind: 'tablet'
  },
  {
    name: 'Cetirizine',
    dosage: '10mg evening',
    benefit: 'Selective H1 Receptor Antihistamine',
    rationale: 'Controls chronic rhinitis, urticaria, and histaminergic flares with minimal sedation.',
    timeSlot: 'Evening',
    defaultTime: '20:30',
    category: 'Prescriptions (Rx)',
    color1: '#0284C7',
    color2: '#F0F9FF',
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

export const CATEGORIES: PillCategory[] = [
  'All',
  'Daily Essentials',
  'Vitamins & Minerals',
  'Longevity & Energy',
  'Sleep & Calm',
  'Gut & Digestion',
  'Prescriptions (Rx)'
];

export const CATEGORY_CONFIG: Record<PillCategory, { label: string; icon: string }> = {
  'All': { label: 'All', icon: '✨' },
  'Daily Essentials': { label: 'Daily Essentials', icon: '☀️' },
  'Vitamins & Minerals': { label: 'Vitamins & Minerals', icon: '🧪' },
  'Longevity & Energy': { label: 'Longevity & Energy', icon: '⚡' },
  'Sleep & Calm': { label: 'Sleep & Calm', icon: '🌙' },
  'Gut & Digestion': { label: 'Gut & Digestion', icon: '🥗' },
  'Prescriptions (Rx)': { label: 'Prescriptions (Rx)', icon: '🩺' },
};

const CIRCADIAN_ICONS: Record<CircadianSlot, React.ReactNode> = {
  Morning: <Sun size={13} color="#D97706" />,
  Midday: <Sun size={13} color="#D97706" />,
  Evening: <Sunset size={13} color="#E11D48" />,
  Bedtime: <Moon size={13} color="#6366F1" />
};

export const VitaminSchedulerModal: React.FC<VitaminSchedulerModalProps> = ({ isOpen, onClose, onUpdated }) => {
  const [vitamins, setVitamins] = useState<VitaminItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PillCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newBenefit, setNewBenefit] = useState('');
  const [newTime, setNewTime] = useState('08:30');
  const [hasNotificationPermission, setHasNotificationPermission] = useState(true);

  const interactionAlerts = React.useMemo(() => detectDrugNutrientInteractions(vitamins), [vitamins]);

  const query = searchQuery.trim().toLowerCase();
  const searchFilteredCatalog = React.useMemo(() => {
    if (!query) return CLINICAL_CATALOG;
    return CLINICAL_CATALOG.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.benefit.toLowerCase().includes(query) ||
      p.dosage.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
  }, [query]);

  const filteredCatalog = React.useMemo(() => {
    if (selectedCategory === 'All') return searchFilteredCatalog;
    return searchFilteredCatalog.filter(p => p.category === selectedCategory);
  }, [selectedCategory, searchFilteredCatalog]);

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

  useEffect(() => {
    const handleUpdate = () => {
      setVitamins(getVitaminSchedule());
    };
    window.addEventListener('hc_profile_updated', handleUpdate);
    window.addEventListener('hc_vitamins_updated', handleUpdate);
    return () => {
      window.removeEventListener('hc_profile_updated', handleUpdate);
      window.removeEventListener('hc_vitamins_updated', handleUpdate);
    };
  }, []);

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

  const persistSchedule = async (updated: VitaminItem[]) => {
    setVitamins(updated);
    try {
      await saveVitaminSchedule(updated);
    } catch (e) {
      console.error('Failed to save vitamins:', e);
    }
    if (onUpdated) onUpdated();
  };

  const handleTimeChange = (id: string, newTimeStr: string) => {
    const next = vitamins.map(v => v.id === id ? { ...v, time: newTimeStr } : v);
    persistSchedule(next);
  };

  const handleToggleEnabled = (id: string) => {
    triggerHapticLight();
    const next = vitamins.map(v => v.id === id ? { ...v, enabled: !v.enabled } : v);
    persistSchedule(next);
  };

  const handleRemove = (id: string) => {
    triggerHapticLight();
    const next = vitamins.filter(v => v.id !== id);
    persistSchedule(next);
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

    const next = [...vitamins, newItem];
    persistSchedule(next);
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

    const next = [...vitamins, newItem];
    persistSchedule(next);
    setNewName('');
    setNewDosage('');
    setNewBenefit('');
  };

  const handleDismiss = async () => {
    try {
      await saveVitaminSchedule(vitamins);
    } catch {}
    if (onUpdated) onUpdated();
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, vitamins]);

  const handleSaveAndClose = async () => {
    triggerHapticSuccess();
    try {
      await saveVitaminSchedule(vitamins);
    } catch {}
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

  // Helper to render an individual pill chip with Bespoke Dynamic Pill Color Theme
  const renderPillChip = (pill: EnrichedPillMetadata) => {
    const isScheduled = vitamins.some(v => v.name.toLowerCase() === pill.name.toLowerCase());
    const isWarmAmber = pill.color1 === '#EAB308' || pill.color1 === '#F59E0B' || pill.color1 === '#D97706';

    return (
      <motion.button
        key={pill.name}
        whileTap={{ scale: 0.95 }}
        type="button"
        onClick={() => handleTogglePill(pill)}
        style={{
          padding: '8px 14px',
          borderRadius: '999px',
          border: isScheduled ? `1.5px solid ${pill.color1}` : '1px solid #E2E8F0',
          background: isScheduled 
            ? `linear-gradient(135deg, ${pill.color2} 0%, #FFFFFF 100%)` 
            : '#FFFFFF',
          color: isScheduled ? (isWarmAmber ? '#92400E' : '#0F172A') : '#1C1917',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: isScheduled 
            ? `0 3px 12px ${pill.color1}30` 
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
          <span style={{ 
            fontSize: '10.5px', 
            color: isScheduled ? (isWarmAmber ? '#B45309' : pill.color1) : '#78716C', 
            fontWeight: isScheduled ? 700 : 500 
          }}>
            {pill.benefit}
          </span>
        </div>

        {isScheduled && (
          <div style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: pill.color1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            marginLeft: '2px',
            boxShadow: `0 2px 6px ${pill.color1}40`,
            flexShrink: 0
          }}>
            <Check size={11} strokeWidth={3.5} />
          </div>
        )}
      </motion.button>
    );
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
        onClick={handleDismiss}
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
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFAFA 40%, #FFF7F8 100%)',
            borderTopLeftRadius: '32px',
            borderTopRightRadius: '32px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -20px 60px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
            borderTop: '1px solid #F1E5E7'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Pull Notch */}
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
            onClick={handleDismiss}
          >
            <div style={{ width: '38px', height: '4px', backgroundColor: '#CBD5E1', borderRadius: '999px' }} />
          </div>

          {/* Cinematic Header (Classy Seal Badge & Clear Typography) */}
          <div style={{
            padding: '4px 20px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #F1E5E7'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: '#FFFAFA',
                border: '1px solid #F1E5E7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
              }}>
                <ClassyPillIcon size={30} color1="#E11D48" color2="#FECDD3" />
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
                handleDismiss();
              }}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #F1E5E7',
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


            {/* Frosted Clinical Regimen Card */}
            <div style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F9 100%)',
              borderRadius: '20px',
              padding: '14px 16px',
              border: '1px solid #F1E5E7',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
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
                    color: allTaken ? '#065F46' : '#BE123C',
                    background: allTaken ? '#DCFCE7' : '#FFFAFA',
                    padding: '2px 9px',
                    borderRadius: '999px',
                    border: allTaken ? '1px solid #A7F3D0' : '1px solid #F1E5E7'
                  }}>
                    {takenCount} of {vitamins.length} taken
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#78716C' }}>
                  {allTaken 
                    ? 'All daily circadian doses completed! 🎉' 
                    : 'Choose items below to customize your schedule'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestPillNotification}
                style={{
                  background: '#FFFAFA',
                  border: '1px solid #F1E5E7',
                  borderRadius: '999px',
                  padding: '7px 13px',
                  color: '#BE123C',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
                }}
              >
                <Sparkles size={13} color="#E11D48" /> Test Alert
              </button>
            </div>

            {/* Notification Permission Pill Banner */}
            {!hasNotificationPermission && (
              <div style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F9 100%)',
                border: '1px solid #F1E5E7',
                borderRadius: '16px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={15} color="#BE123C" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#9F1239' }}>
                    Enable device notifications for alarms
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    background: '#BE123C',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(190, 18, 60, 0.2)'
                  }}
                >
                  Enable
                </button>
              </div>
            )}


            {/* SECTION 1: Curated Clinical Medicine & Vitamin Selector (Zero Overlap) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Clinical Formulations & Supplements
                  </span>
                  <div style={{ fontSize: '11px', color: '#78716C', marginTop: '1px' }}>
                    {CLINICAL_CATALOG.length} evidence-based formulations divided by category
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    setShowCustomForm(prev => !prev);
                  }}
                  style={{
                    background: showCustomForm ? '#BE123C' : '#FFFAFA',
                    border: '1px solid #F1E5E7',
                    borderRadius: '999px',
                    padding: '4px 10px',
                    color: showCustomForm ? '#FFFFFF' : '#BE123C',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    boxShadow: showCustomForm ? '0 2px 6px rgba(190, 18, 60, 0.25)' : '0 1px 2px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {showCustomForm ? <X size={12} strokeWidth={2.5} /> : <Plus size={12} strokeWidth={2.5} />}
                  <span>{showCustomForm ? 'Hide Form' : 'Write Custom'}</span>
                </button>
              </div>

              {/* Quick Search Bar */}
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} />
                </div>
                <input
                  type="text"
                  placeholder={`Search ${CLINICAL_CATALOG.length}+ medications, vitamins & supplements...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 34px 9px 34px',
                    borderRadius: '14px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    fontSize: '12.5px',
                    color: '#1C1917',
                    outline: 'none',
                    boxSizing: 'border-box',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setSearchQuery('');
                    }}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: '#F1F5F9',
                      border: 'none',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      color: '#64748B'
                    }}
                    aria-label="Clear search"
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {/* Category Filter Pills (Guaranteed flexShrink: 0 — ZERO Text Overlap!) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '8px',
                marginBottom: '12px',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch'
              }}>
                {CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat;
                  const cfg = CATEGORY_CONFIG[cat];
                  const count = cat === 'All' 
                    ? CLINICAL_CATALOG.length 
                    : CLINICAL_CATALOG.filter(p => p.category === cat).length;

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
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: isActive ? '1.5px solid #BE123C' : '1px solid #F1E5E7',
                        background: isActive ? '#FFFAFA' : '#FFFFFF',
                        color: isActive ? '#BE123C' : '#57534E',
                        fontSize: '11.5px',
                        fontWeight: isActive ? 800 : 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: isActive ? '0 1px 4px rgba(190, 18, 60, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{cfg?.icon}</span>
                      <span>{cat}</span>
                      <span style={{ 
                        fontSize: '10px', 
                        opacity: isActive ? 0.95 : 0.6,
                        fontWeight: 700 
                      }}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Write-In Form (Collapsible/Quick Expand) */}
              {(showCustomForm || newName.trim()) && (
                <form
                  onSubmit={handleAddCustom}
                  style={{
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F9 100%)',
                    borderRadius: '20px',
                    padding: '14px',
                    border: '1px solid #F1E5E7',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                    marginBottom: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px' }}>💊</span>
                      <strong style={{ fontSize: '12.5px', color: '#9F1239' }}>Write Custom Tablet / Prescription</strong>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#BE123C', background: '#FFFAFA', border: '1px solid #F1E5E7', padding: '1px 6px', borderRadius: '6px' }}>
                      Quick Add
                    </span>
                  </div>

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
                      fontSize: '13px',
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
                        fontSize: '13px',
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
                      padding: '10px',
                      borderRadius: '12px',
                      background: newName.trim() ? 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)' : '#E2E8F0',
                      color: newName.trim() ? '#FFF' : '#94A3B8',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '12.5px',
                      cursor: newName.trim() ? 'pointer' : 'default',
                      boxShadow: newName.trim() ? '0 4px 12px rgba(225, 29, 72, 0.25)' : 'none'
                    }}
                  >
                    + Add to Daily Regimen
                  </button>
                </form>
              )}

              {/* Categorized Pills Rendering */}
              {searchFilteredCatalog.length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  border: '1px dashed #E2E8F0',
                  marginBottom: '10px'
                }}>
                  <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#78716C' }}>
                    No supplements found matching &ldquo;{searchQuery}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewName(searchQuery);
                      setShowCustomForm(true);
                    }}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '999px',
                      padding: '6px 14px',
                      color: '#BE123C',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    + Add &ldquo;{searchQuery}&rdquo; as Custom Tablet
                  </button>
                </div>
              ) : selectedCategory === 'All' ? (
                /* Divided According to Category (Exact User Request) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {CATEGORIES.filter(c => c !== 'All').map((cat) => {
                    const catPills = searchFilteredCatalog.filter(p => p.category === cat);
                    if (catPills.length === 0) return null;
                    const catCfg = CATEGORY_CONFIG[cat];
                    const scheduledInCat = catPills.filter(p => 
                      vitamins.some(v => v.name.toLowerCase() === p.name.toLowerCase())
                    ).length;

                    return (
                      <div key={cat}>
                        {/* Category Sub-header */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                          paddingBottom: '4px',
                          borderBottom: '1px solid #F1F5F9'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px' }}>{catCfg?.icon}</span>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', letterSpacing: '-0.1px' }}>
                              {cat}
                            </span>
                            <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8' }}>
                              ({catPills.length})
                            </span>
                          </div>
                          {scheduledInCat > 0 && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              color: '#BE123C',
                              background: '#FFFAFA',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              border: '1px solid #F1E5E7'
                            }}>
                              {scheduledInCat} active
                            </span>
                          )}
                        </div>

                        {/* Pills in Category */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {catPills.map((pill) => renderPillChip(pill))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Specific Category Active */
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {filteredCatalog.map((pill) => renderPillChip(pill))}
                </div>
              )}
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
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F9 100%)',
                  borderRadius: '24px',
                  border: '1.5px dashed #F1E5E7',
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
                          border: item.takenToday ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,0.95)',
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
                              background: item.takenToday ? '#DCFCE7' : '#F8FAFC',
                              border: item.takenToday ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <ClassyPillIcon 
                                size={26}
                                color1={meta?.color1 || '#FB7185'}
                                color2={meta?.color2 || '#FFF1F2'}
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
                                  background: item.takenToday ? '#DCFCE7' : '#FFF1EB',
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
                              <Clock size={12} color="#E11D48" />
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
                                background: item.enabled ? '#FFFAFA' : '#F5F5F4',
                                color: item.enabled ? '#BE123C' : '#A8A29E',
                                border: item.enabled ? '1px solid #F1E5E7' : 'none',
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

          {/* Reference Execution Button: Harmonized to Clinical Vibrant Rose */}
          <div style={{
            padding: '12px 20px calc(14px + env(safe-area-inset-bottom, 16px))',
            borderTop: '1px solid #E2E8F0',
            background: '#FFFFFF'
          }}>
            <button
              type="button"
              onClick={handleSaveAndClose}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '12px',
                background: '#E84A6C',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '15px',
                boxShadow: '0 4px 14px rgba(232, 74, 108, 0.22)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
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
