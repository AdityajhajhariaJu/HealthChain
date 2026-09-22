import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  FileUp, Sparkles, Search, ArrowRight,
  X, HelpCircle, BrainCircuit, Copy, Check,
  AlertTriangle, ShieldCheck, Stethoscope, CalendarClock,
  FileText, Zap, ChevronRight, AlertCircle, Plus,
  Activity, Sliders, MessageCircle, Folder, ChevronDown, Lock,
  UploadCloud, Trash2, Heart, Wind, Droplets, Flower2, Focus, Pill, Moon, Volume2, Globe,
  Thermometer, Flame, Eye, HeartPulse, ShieldAlert,
  BatteryLow, Brain, Bone, Waves
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { runJarvisInvestigation } from '../../services/geminiService';
import { createCaseDraft, saveReviewSnapshot, appendCaseRecords, MedicalRecord, addCaseEvent, getActiveCase, getCase, addCaseQuestion } from '../../services/CaseEngine';
import { getActiveSession } from '../../services/authSession';
import { getProfile, getProfileKey, getProfileEngineState } from '../../services/ProfileEngine';
import { openTrialModal } from '../../services/TrialEngine';
import { useToast } from '../../components/ui/ToastProvider';
import { recordHealthMemory } from '../../services/HealthMemory';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { CompilingAnimation } from '../../components/ui/CompilingAnimation';
import { triggerHapticSelection, triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { buildCaseContext, getUnifiedCaseScope } from '../../services/caseWorkspace';
import { useCaseWorkspace } from '../../hooks/useCaseWorkspace';
import { SourcePassageModal, SourcePassageModalProps } from '../../components/ui/SourcePassageModal';
import { DataSovereigntyModal } from '../../components/ui/DataSovereigntyModal';
import { InformationCategoryBadge } from '../../components/ui/InformationCategoryBadge';
import { ClinicalReasoningPipelineView } from '../../components/ui/ClinicalReasoningPipelineView';
import { MeaningfulMultiPerspectiveView } from '../../components/ui/MeaningfulMultiPerspectiveView';
import { StructuredAnswerView } from '../../components/ui/StructuredAnswerView';
import { buildStructuredClinicalAnswer } from '../../services/StructuredAnswerEngine';
import { runClinicalReasoningPipeline } from '../../services/ClinicalReasoningEngine';
import { Sparkles as SparklesIcon, ExternalLink } from 'lucide-react';
import { normalizeClinicalReview } from '../../services/clinicalReview';
import '../../components/ui/caseWorkspace.css';
import { saveOriginalCaseFile } from '../../services/caseRecordFiles';

const engineScope = () => `${getProfileKey()}_${getProfileEngineState()?.activeId || 'profile_1'}`;
const engineDraftKey = (caseId: string) => `hc_engine_draft_${engineScope()}_${caseId || 'new'}`;

export interface SymptomTheme {
  color1: string;
  color2: string;
  bgStart: string;
  bgEnd: string;
  border: string;
  activeBorder: string;
  activeBgStart: string;
  activeBgEnd: string;
  iconColor: string;
  textColor: string;
  shadow: string;
}

export const SYMPTOM_CATEGORY_THEMES: Record<string, SymptomTheme> = {
  gut: {
    color1: '#34D399',
    color2: '#059669',
    bgStart: '#ECFDF5',
    bgEnd: '#D1FAE5',
    border: '#A7F3D0',
    activeBorder: '#059669',
    activeBgStart: '#ECFDF5',
    activeBgEnd: '#D1FAE5',
    iconColor: '#059669',
    textColor: '#065F46',
    shadow: 'rgba(16, 185, 129, 0.28)',
  },
  neuro: {
    color1: '#A78BFA',
    color2: '#6D28D9',
    bgStart: '#F5F3FF',
    bgEnd: '#EDE9FE',
    border: '#DDD6FE',
    activeBorder: '#7C3AED',
    activeBgStart: '#F5F3FF',
    activeBgEnd: '#EDE9FE',
    iconColor: '#7C3AED',
    textColor: '#5B21B6',
    shadow: 'rgba(124, 58, 237, 0.28)',
  },
  respiratory: {
    color1: '#38BDF8',
    color2: '#0284C7',
    bgStart: '#F0F9FF',
    bgEnd: '#E0F2FE',
    border: '#BAE6FD',
    activeBorder: '#0284C7',
    activeBgStart: '#F0F9FF',
    activeBgEnd: '#E0F2FE',
    iconColor: '#0284C7',
    textColor: '#0369A1',
    shadow: 'rgba(2, 132, 199, 0.28)',
  },
  cardio: {
    color1: '#FB7185',
    color2: '#E11D48',
    bgStart: '#FFF1F2',
    bgEnd: '#FFE4E6',
    border: '#FECDD3',
    activeBorder: '#E11D48',
    activeBgStart: '#FFF1F2',
    activeBgEnd: '#FFE4E6',
    iconColor: '#E11D48',
    textColor: '#9F1239',
    shadow: 'rgba(225, 29, 72, 0.28)',
  },
  pain: {
    color1: '#2DD4BF',
    color2: '#0D9488',
    bgStart: '#F0FDFA',
    bgEnd: '#CCFBF1',
    border: '#99F6E4',
    activeBorder: '#0D9488',
    activeBgStart: '#F0FDFA',
    activeBgEnd: '#CCFBF1',
    iconColor: '#0D9488',
    textColor: '#115E59',
    shadow: 'rgba(13, 148, 136, 0.28)',
  },
  skin: {
    color1: '#F472B6',
    color2: '#DB2777',
    bgStart: '#FDF2F8',
    bgEnd: '#FCE7F3',
    border: '#FBCFE8',
    activeBorder: '#DB2777',
    activeBgStart: '#FDF2F8',
    activeBgEnd: '#FCE7F3',
    iconColor: '#DB2777',
    textColor: '#9D174D',
    shadow: 'rgba(219, 39, 119, 0.28)',
  },
  systemic: {
    color1: '#FBBF24',
    color2: '#D97706',
    bgStart: '#FFFBEB',
    bgEnd: '#FEF3C7',
    border: '#FDE68A',
    activeBorder: '#D97706',
    activeBgStart: '#FFFBEB',
    activeBgEnd: '#FEF3C7',
    iconColor: '#D97706',
    textColor: '#92400E',
    shadow: 'rgba(217, 119, 6, 0.28)',
  },
  sleep_mental: {
    color1: '#818CF8',
    color2: '#4338CA',
    bgStart: '#EEF2FF',
    bgEnd: '#E0E7FF',
    border: '#C7D2FE',
    activeBorder: '#4F46E5',
    activeBgStart: '#EEF2FF',
    activeBgEnd: '#E0E7FF',
    iconColor: '#4F46E5',
    textColor: '#3730A3',
    shadow: 'rgba(79, 70, 229, 0.28)',
  },
};

export const ClassySymptomBadge: React.FC<{
  icon: any;
  category?: string;
  size?: number;
  isSelected?: boolean;
}> = ({
  icon: IconComp = Activity,
  category = 'systemic',
  size = 20,
  isSelected = false
}) => {
  const theme = SYMPTOM_CATEGORY_THEMES[category] || SYMPTOM_CATEGORY_THEMES.systemic;
  const iconSize = Math.max(10, Math.round(size * 0.54));

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '50%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: `0 2px 6px ${theme.shadow}, inset 0 1px 1px rgba(255, 255, 255, 0.75)`,
        background: `linear-gradient(135deg, ${theme.color1} 0%, ${theme.color2} 100%)`,
        transition: 'all 0.18s ease'
      }}
    >
      {/* 3D Specular Gloss Highlight Overlay (Skeuomorphic glass glare matching Meds capsule) */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        <ellipse cx="12" cy="4.5" rx="7" ry="2.2" fill="#FFFFFF" fillOpacity="0.65" />
        <circle cx="12" cy="12" r="11" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1" />
      </svg>

      <IconComp 
        size={iconSize} 
        color="#FFFFFF" 
        strokeWidth={2.8} 
        style={{ 
          position: 'relative',
          zIndex: 1,
          filter: 'drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.35))'
        }}
      />
    </div>
  );
};

export interface SymptomItem {
  id: string;
  name: string;
  subtitle?: string;
  aliases?: string[];
  category: 'gut' | 'neuro' | 'respiratory' | 'cardio' | 'pain' | 'skin' | 'systemic' | 'sleep_mental';
  icon: any;
  isCommon?: boolean;
}

export const PRESET_SYMPTOMS: SymptomItem[] = [
  // --- MOST COMMON & HIGH-YIELD PRESENTING CONCERNS ---
  { id: 'fatigue', name: 'Fatigue', subtitle: 'Chronic Exhaustion & Low Energy', aliases: ['Fatigue / Chronic Exhaustion', 'chronic exhaustion', 'exhaustion', 'tiredness', 'low energy', 'lethargy'], category: 'systemic', icon: BatteryLow, isCommon: true },
  { id: 'brain-fog', name: 'Brain Fog', subtitle: 'Cognitive Lag & Cloudy Focus', aliases: ['Brain Fog / Cognitive Lag', 'cognitive lag', 'cloudy thinking', 'poor focus', 'sluggish mind', 'concentration'], category: 'neuro', icon: Brain, isCommon: true },
  { id: 'headache', name: 'Headache', subtitle: 'Migraine & Cranial Tension', aliases: ['Headache / Migraine', 'migraine', 'head tension', 'cephalalgia', 'temple throbbing', 'cluster headache'], category: 'neuro', icon: Zap, isCommon: true },
  { id: 'bloating', name: 'Bloating', subtitle: 'Abdominal Gas & Distension', aliases: ['Abdominal Bloating & Gas', 'bloating', 'gas', 'distension', 'swollen stomach', 'belly fullness'], category: 'gut', icon: Waves, isCommon: true },
  { id: 'acid-reflux', name: 'Acid Reflux', subtitle: 'Heartburn & Gastric Burning', aliases: ['Acid Reflux / Heartburn', 'heartburn', 'gerd', 'indigestion', 'burning chest', 'sour taste'], category: 'gut', icon: Flame, isCommon: true },
  { id: 'abdominal-pain', name: 'Abdominal Pain', subtitle: 'Cramping & Visceral Spasms', aliases: ['Abdominal Cramping & Pain', 'stomach cramps', 'belly pain', 'cramping', 'gut ache', 'stomach ache'], category: 'gut', icon: AlertCircle, isCommon: true },
  { id: 'joint-pain', name: 'Joint Pain', subtitle: 'Stiffness & Arthralgia', aliases: ['Joint Pain & Stiffness', 'joint stiffness', 'arthralgia', 'stiff joints', 'achy joints', 'arthritis'], category: 'pain', icon: Bone, isCommon: true },
  { id: 'insomnia', name: 'Insomnia', subtitle: 'Sleep Disruption & Restless Nights', aliases: ['Insomnia / Sleep Disruption', 'sleep disruption', 'poor sleep', 'cant sleep', 'trouble sleeping', 'sleeplessness'], category: 'sleep_mental', icon: Moon, isCommon: true },
  { id: 'anxiety', name: 'Anxiety', subtitle: 'Restlessness & High Tension', aliases: ['Anxiety & Restlessness', 'restlessness', 'nervousness', 'worry', 'panic', 'apprehension'], category: 'sleep_mental', icon: Heart, isCommon: true },
  { id: 'shortness-of-breath', name: 'Shortness of Breath', subtitle: 'Air Hunger & Shallow Respiration', aliases: ['dyspnea', 'breathlessness', 'shallow breathing', 'air hunger', 'winded'], category: 'respiratory', icon: Wind, isCommon: true },
  { id: 'chronic-cough', name: 'Chronic Cough', subtitle: 'Dry Cough & Throat Tickle', aliases: ['Chronic or Dry Cough', 'dry cough', 'persistent cough', 'hacking cough', 'throat tickle'], category: 'respiratory', icon: Wind, isCommon: true },
  { id: 'nausea', name: 'Nausea', subtitle: 'Queasiness & Gastric Unrest', aliases: ['Nausea & Queasiness', 'queasiness', 'upset stomach', 'sick to stomach', 'gagging'], category: 'gut', icon: AlertTriangle, isCommon: true },
  { id: 'palpitations', name: 'Palpitations', subtitle: 'Heart Palpitations & Racing Pulse', aliases: ['Heart Palpitations & Racing', 'heart palpitations', 'palpitations', 'racing heart', 'fluttering', 'pounding heart', 'tachycardia'], category: 'cardio', icon: HeartPulse, isCommon: true },
  { id: 'low-back-pain', name: 'Low Back Pain', subtitle: 'Sciatica & Lumbar Stiffness', aliases: ['Low Back Pain / Sciatica', 'sciatica', 'lumbar pain', 'back stiffness', 'pinched nerve', 'sacral pain'], category: 'pain', icon: Bone, isCommon: true },
  { id: 'skin-rash', name: 'Skin Rash', subtitle: 'Itching & Dermatitis Flare', aliases: ['Skin Rash & Itching', 'itching', 'hives', 'urticaria', 'dermatitis', 'red skin'], category: 'skin', icon: Flower2, isCommon: true },

  // --- GASTROINTESTINAL & DIGESTION ---
  { id: 'constipation', name: 'Constipation', subtitle: 'Hard Stools & Straining', aliases: ['Constipation & Hard Stools', 'hard stools', 'irregular bowel', 'straining', 'infrequent stools'], category: 'gut', icon: Activity },
  { id: 'diarrhea', name: 'Diarrhea', subtitle: 'Loose & Watery Stools', aliases: ['Diarrhea / Loose Stools', 'loose stools', 'watery stools', 'frequent bowel movements', 'stomach bug'], category: 'gut', icon: Droplets },
  { id: 'belching', name: 'Belching', subtitle: 'Excessive Gas & Burping', aliases: ['Excessive Belching & Gas', 'burping', 'eructation', 'gas'], category: 'gut', icon: Wind },
  { id: 'indigestion', name: 'Indigestion', subtitle: 'Dyspepsia & Upper Fullness', aliases: ['Indigestion / Dyspepsia', 'dyspepsia', 'sour stomach', 'heavy digestion', 'upper gut fullness'], category: 'gut', icon: Flame },
  { id: 'early-satiety', name: 'Early Satiety', subtitle: 'Quick Gastric Fullness', aliases: ['Early Satiety (Quick Fullness)', 'quick fullness', 'feeling full fast', 'gastric fullness'], category: 'gut', icon: Focus },
  { id: 'loss-of-appetite', name: 'Loss of Appetite', subtitle: 'Food Aversion & Poor Hunger', aliases: ['anorexia', 'poor appetite', 'food aversion', 'not hungry'], category: 'gut', icon: Focus },
  { id: 'food-intolerance', name: 'Food Sensitivity', subtitle: 'Histamine & Dietary Flare', aliases: ['Food Sensitivity Reaction', 'food reaction', 'food allergy', 'histamine', 'diet reaction'], category: 'gut', icon: Flower2 },
  { id: 'difficulty-swallowing', name: 'Difficulty Swallowing', subtitle: 'Dysphagia & Throat Sensation', aliases: ['Difficulty Swallowing (Dysphagia)', 'dysphagia', 'throat lump', 'food sticking', 'globus'], category: 'gut', icon: AlertCircle },
  { id: 'ibs-flare', name: 'IBS / Bowel Spasms', subtitle: 'Spastic Colon & Gut Flares', aliases: ['Irritable Bowel Episodes (IBS)', 'ibs', 'irritable bowel', 'gut flare', 'spastic colon', 'crampy gut'], category: 'gut', icon: Activity },
  { id: 'vomiting', name: 'Vomiting', subtitle: 'Emesis & Sudden Nausea Episodes', aliases: ['Vomiting Episodes', 'throwing up', 'emesis', 'dry heaving'], category: 'gut', icon: AlertTriangle },

  // --- BRAIN & NEUROLOGICAL ---
  { id: 'dizziness-vertigo', name: 'Dizziness', subtitle: 'Vertigo & Room Spinning', aliases: ['Dizziness & Vertigo (Spinning)', 'vertigo', 'spinning', 'unsteadiness', 'room spinning', 'loss of balance'], category: 'neuro', icon: Focus },
  { id: 'lightheadedness', name: 'Lightheadedness', subtitle: 'Presyncope & Faintness', aliases: ['Lightheadedness / Near-Fainting', 'faintness', 'presyncope', 'near fainting', 'wooziness'], category: 'neuro', icon: Activity },
  { id: 'tingling-numbness', name: 'Tingling / Numbness', subtitle: 'Neuropathy & Pins and Needles', aliases: ['Tingling / Numbness (Neuropathy)', 'neuropathy', 'pins and needles', 'paresthesia', 'numb hands', 'numb feet'], category: 'neuro', icon: Zap },
  { id: 'tremors', name: 'Tremors / Twitching', subtitle: 'Involuntary Muscle Fasciculations', aliases: ['Tremors / Involuntary Twitching', 'tremors', 'shaking', 'fasciculations', 'involuntary twitch', 'hand tremor'], category: 'neuro', icon: Activity },
  { id: 'tinnitus', name: 'Tinnitus', subtitle: 'Ear Ringing & Buzzing Sound', aliases: ['Tinnitus (Ear Ringing)', 'ear ringing', 'buzzing in ears', 'ear whooshing', 'pulsatile'], category: 'neuro', icon: Volume2 },
  { id: 'photophobia', name: 'Light Sensitivity', subtitle: 'Photophobia & Sensory Overload', aliases: ['Light or Sound Sensitivity', 'photophobia', 'sound sensitivity', 'hyperacusis', 'sensory overload'], category: 'neuro', icon: Eye },
  { id: 'blurry-vision', name: 'Blurry Vision', subtitle: 'Diplopia & Eye Strain', aliases: ['Blurry or Fluctuating Vision', 'vision fluctuation', 'diplopia', 'double vision', 'eye strain'], category: 'neuro', icon: Eye },
  { id: 'memory-lapses', name: 'Memory Lapses', subtitle: 'Forgetfulness & Absentmindedness', aliases: ['Memory Lapses / Forgetfulness', 'forgetfulness', 'short term memory loss', 'absentminded'], category: 'neuro', icon: Brain },
  { id: 'neck-stiffness', name: 'Neck Stiffness', subtitle: 'Cervical Tension & Limited Motion', aliases: ['Neck Stiffness & Tension', 'cervical tension', 'stiff neck', 'restricted neck movement'], category: 'neuro', icon: Focus },

  // --- RESPIRATORY & ENT ---
  { id: 'sinus-pressure', name: 'Sinus Pressure', subtitle: 'Facial Congestion & Pain', aliases: ['Sinus Pressure & Facial Pain', 'facial pain', 'sinusitis', 'forehead pressure', 'sinus congestion'], category: 'respiratory', icon: Wind },
  { id: 'post-nasal-drip', name: 'Post-Nasal Drip', subtitle: 'Throat Clearing & Catarrh', aliases: ['mucus in throat', 'throat clearing', 'catarrh'], category: 'respiratory', icon: Wind },
  { id: 'nasal-congestion', name: 'Nasal Congestion', subtitle: 'Stuffy Nose & Rhinitis', aliases: ['Nasal Congestion & Sneezing', 'stuffy nose', 'sneezing', 'blocked nose', 'rhinitis'], category: 'respiratory', icon: Wind },
  { id: 'sore-throat', name: 'Sore Throat', subtitle: 'Pharyngitis & Scratchiness', aliases: ['Sore Throat & Scratchiness', 'pharyngitis', 'scratchy throat', 'throat irritation'], category: 'respiratory', icon: Flame },
  { id: 'wheezing', name: 'Wheezing', subtitle: 'Bronchospasm & Asthmatic Rales', aliases: ['Wheezing / Asthmatic Rales', 'asthma', 'asthmatic rales', 'bronchospasm', 'noisy breathing'], category: 'respiratory', icon: Wind },
  { id: 'chest-tightness', name: 'Chest Tightness', subtitle: 'Bronchial & Airway Restriction', aliases: ['constricted chest', 'respiratory tightness', 'bronchial pressure'], category: 'respiratory', icon: Focus },
  { id: 'productive-cough', name: 'Productive Cough', subtitle: 'Mucus & Phlegm Clearance', aliases: ['Productive Cough with Phlegm', 'cough with phlegm', 'mucus cough', 'sputum'], category: 'respiratory', icon: Droplets },
  { id: 'loss-of-smell', name: 'Loss of Smell', subtitle: 'Anosmia & Ageusia (Taste Loss)', aliases: ['Loss of Smell or Taste', 'anosmia', 'loss of taste', 'ageusia', 'taste loss'], category: 'respiratory', icon: Focus },
  { id: 'hoarseness', name: 'Hoarseness', subtitle: 'Voice Strain & Laryngitis', aliases: ['Hoarseness & Voice Strain', 'voice strain', 'raspy voice', 'laryngitis'], category: 'respiratory', icon: Wind },

  // --- HEART & CIRCULATION ---
  { id: 'tachycardia', name: 'Rapid Pulse', subtitle: 'Resting Tachycardia & Bounding', aliases: ['Rapid Pulse (Tachycardia)', 'tachycardia', 'fast heart rate', 'bounding pulse'], category: 'cardio', icon: HeartPulse },
  { id: 'chest-pressure', name: 'Chest Pressure', subtitle: 'Substernal Discomfort & Angina', aliases: ['Chest Pressure or Discomfort', 'angina', 'chest discomfort', 'chest pain', 'substernal pain'], category: 'cardio', icon: ShieldAlert, isCommon: true },
  { id: 'swollen-ankles', name: 'Swollen Ankles', subtitle: 'Peripheral Edema & Fluid Retention', aliases: ['Swollen Ankles or Legs (Edema)', 'edema', 'leg swelling', 'fluid retention', 'puffy ankles'], category: 'cardio', icon: Droplets },
  { id: 'cold-hands-feet', name: 'Cold Extremities', subtitle: 'Raynaud’s & Sluggish Circulation', aliases: ['Cold Hands & Feet (Poor Circulation)', 'cold hands', 'cold feet', 'raynauds', 'poor circulation'], category: 'cardio', icon: Thermometer },
  { id: 'orthostatic-dizzy', name: 'Postural Dizziness', subtitle: 'POTS & Standing Blood Drop', aliases: ['Dizziness When Standing Up', 'orthostatic hypotension', 'standing dizzy', 'pots'], category: 'cardio', icon: Activity },

  // --- MUSCULOSKELETAL & PAIN ---
  { id: 'neck-shoulder-pain', name: 'Neck & Shoulder', subtitle: 'Trapezius Tension & Stiffness', aliases: ['Neck & Upper Shoulder Pain', 'trapezius pain', 'cervical pain', 'shoulder stiffness'], category: 'pain', icon: Bone },
  { id: 'muscle-cramps', name: 'Muscle Cramps', subtitle: 'Nocturnal Spasms & Charley Horse', aliases: ['Muscle Cramps & Spasms', 'spasms', 'charley horse', 'calf cramps', 'twitching'], category: 'pain', icon: Zap },
  { id: 'muscle-weakness', name: 'Muscle Weakness', subtitle: 'Loss of Strength & Heaviness', aliases: ['Muscle Weakness & Heaviness', 'heaviness', 'loss of strength', 'limb weakness'], category: 'pain', icon: Activity },
  { id: 'morning-stiffness', name: 'Morning Stiffness', subtitle: 'Prolonged AM Joint Rigidity', aliases: ['Morning Stiffness (> 30 mins)', 'early morning ache', 'prolonged stiffness', 'stiff joints AM'], category: 'pain', icon: CalendarClock },
  { id: 'joint-swelling', name: 'Joint Swelling', subtitle: 'Synovial Effusion & Warmth', aliases: ['Joint Swelling & Warmth', 'effusion', 'warm joints', 'puffy joints', 'synovitis'], category: 'pain', icon: Droplets },
  { id: 'knee-pain', name: 'Knee Pain', subtitle: 'Patellar & Meniscal Ache', aliases: ['Knee Pain & Discomfort', 'patellar pain', 'meniscus', 'knee ache', 'runner knee'], category: 'pain', icon: Bone },
  { id: 'body-aches', name: 'Body Aches', subtitle: 'Diffuse Myalgia & Flu-like Pain', aliases: ['Generalized Body Aches (Myalgia)', 'myalgia', 'generalized pain', 'fibromyalgia aches', 'flu-like aches'], category: 'pain', icon: Activity },

  // --- SKIN, HAIR & ALLERGIES ---
  { id: 'itching', name: 'Skin Itching', subtitle: 'Intense Pruritus & Scratching', aliases: ['Intense Skin Itching (Pruritus)', 'pruritus', 'severe itch', 'scratching'], category: 'skin', icon: Sparkles },
  { id: 'eczema', name: 'Eczema', subtitle: 'Dry Flaking & Inflamed Patches', aliases: ['Eczema / Dry Inflamed Skin', 'dermatitis', 'dry inflamed skin', 'flaking skin', 'patchy skin'], category: 'skin', icon: Droplets },
  { id: 'acne-breakout', name: 'Acne', subtitle: 'Cystic Spots & Inflammatory Blemishes', aliases: ['Acne Breakouts & Cystic Spots', 'cystic acne', 'breakouts', 'pimples', 'blemishes'], category: 'skin', icon: Droplets },
  { id: 'facial-flushing', name: 'Facial Flushing', subtitle: 'Rosacea & Sudden Burning Heat', aliases: ['Facial Flushing & Burning', 'rosacea', 'red face', 'burning face', 'hot flashes'], category: 'skin', icon: Flame },
  { id: 'hair-loss', name: 'Hair Loss', subtitle: 'Alopecia & Telogen Shedding', aliases: ['Excessive Hair Shedding / Thinning', 'alopecia', 'hair thinning', 'shedding hair', 'telogen effluvium'], category: 'skin', icon: Sparkles },
  { id: 'easy-bruising', name: 'Easy Bruising', subtitle: 'Ecchymosis & Hematoma Susceptibility', aliases: ['Unexplained Easy Bruising', 'unexplained hematoma', 'ecchymosis', 'purpura'], category: 'skin', icon: AlertTriangle },
  { id: 'angioedema', name: 'Facial Swelling', subtitle: 'Angioedema of Lips, Eyes, Face', aliases: ['Swollen Lips, Eyes, or Face', 'swollen lips', 'swollen eyes', 'angioedema', 'puffiness'], category: 'skin', icon: ShieldAlert },

  // --- SYSTEMIC, METABOLIC & IMMUNE ---
  { id: 'fever-chills', name: 'Fever / Chills', subtitle: 'Low-Grade Pyrexia & Shivering', aliases: ['Low-Grade Fever & Chills', 'low-grade fever', 'pyrexia', 'shivering', 'temperature spike'], category: 'systemic', icon: Thermometer },
  { id: 'night-sweats', name: 'Night Sweats', subtitle: 'Drenching Nocturnal Diaphoresis', aliases: ['Night Sweats / Drenching', 'drenching sweats', 'nocturnal diaphoresis', 'waking up sweaty'], category: 'systemic', icon: Droplets },
  { id: 'unexplained-weight-loss', name: 'Weight Loss', subtitle: 'Rapid Involuntary Slimming', aliases: ['Unexplained Weight Loss', 'unexplained weight loss', 'rapid slimming', 'dropping pounds'], category: 'systemic', icon: Activity },
  { id: 'unexplained-weight-gain', name: 'Weight Gain', subtitle: 'Fluid Retention & Rapid Shifts', aliases: ['Unexplained Rapid Weight Gain', 'rapid weight gain', 'water weight', 'sudden gain'], category: 'systemic', icon: Activity },
  { id: 'swollen-lymph-nodes', name: 'Swollen Lymph Nodes', subtitle: 'Neck & Groin Lymphadenopathy', aliases: ['Swollen Lymph Nodes (Neck/Groin)', 'lymphadenopathy', 'neck lumps', 'swollen glands', 'groin nodes'], category: 'systemic', icon: ShieldAlert },
  { id: 'heat-cold-intolerance', name: 'Temp Intolerance', subtitle: 'Thyroid Chill & Heat Overload', aliases: ['Heat or Cold Intolerance', 'heat intolerance', 'cold intolerance', 'thyroid chill'], category: 'systemic', icon: Thermometer },
  { id: 'excessive-thirst', name: 'Excessive Thirst', subtitle: 'Polydipsia & Persistent Dry Mouth', aliases: ['Excessive Thirst & Dry Mouth', 'polydipsia', 'dry mouth', 'constant thirst'], category: 'systemic', icon: Droplets },

  // --- SLEEP & MENTAL WELLBEING ---
  { id: 'frequent-waking', name: 'Night Waking', subtitle: 'Broken Sleep & Nocturia', aliases: ['Frequent Nighttime Waking', 'broken sleep', 'waking up often', 'fragmented sleep', 'nocturia'], category: 'sleep_mental', icon: Moon },
  { id: 'daytime-sleepiness', name: 'Daytime Drowsiness', subtitle: 'Excessive Daytime Somnolence', aliases: ['Daytime Exhaustion & Drowsiness', 'somnolence', 'daytime fatigue', 'dozing off', 'sleepy during day'], category: 'sleep_mental', icon: Moon },
  { id: 'panic-episodes', name: 'Panic Episodes', subtitle: 'Acute Panic & Air Hunger Surges', aliases: ['Panic Attacks / Air Hunger', 'panic attacks', 'hyperventilation', 'acute panic', 'air hunger'], category: 'sleep_mental', icon: HeartPulse },
  { id: 'low-mood', name: 'Low Mood', subtitle: 'Depressed Affect & Low Motivation', aliases: ['Depressed Mood & Low Drive', 'depression', 'low drive', 'sadness', 'anhedonia'], category: 'sleep_mental', icon: Moon },
  { id: 'chronic-stress', name: 'Chronic Stress', subtitle: 'Burnout & Nervous Overwhelm', aliases: ['Chronic Overwhelm & Stress', 'overwhelm', 'burnout', 'high tension', 'stress'], category: 'sleep_mental', icon: BrainCircuit }
];

const STEP_META: Record<number, { title: string; subtitle: string; label: string; badge: string }> = {
  1: {
    title: "Which symptoms bother you?",
    subtitle: "Start with a few that matter most. You can search or pick from common clinical concerns below.",
    label: "1. Symptoms",
    badge: "Symptom Cloud ✨"
  },
  2: {
    title: "When did you first notice this?",
    subtitle: "Knowing when this began helps distinguish acute episodes from chronic conditions.",
    label: "2. Timeline",
    badge: "Onset Chronology ⏱️"
  },
  3: {
    title: "How is the symptom behaving?",
    subtitle: "Trajectory helps clinicians evaluate urgency and inflammatory or mechanical patterns.",
    label: "3. Pattern",
    badge: "Dynamics & Trend ↗️"
  },
  4: {
    title: "Describe what you are experiencing",
    subtitle: "Your timeline narrative, symptom sensations, triggers, and questions in your own voice.",
    label: "4. Story",
    badge: "Clinical Narrative 📝"
  },
  5: {
    title: "Lab Reports & Medical Evidence",
    subtitle: "Upload PDFs, lab panels, or discharge summaries. Files remain encrypted on your device.",
    label: "5. Evidence",
    badge: "Evidence Vault 📄"
  },
  6: {
    title: "Review Scope & Launchpad",
    subtitle: "Confirm evidence readiness, set your clinical objective, and launch your clinical review.",
    label: "6. Launch",
    badge: "Review & Run 🚀"
  }
};

export default function JarvisInvestigator() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const toast = useToast();
  const [profile, setProfile] = useState(() => getProfile());

  useEffect(() => {
    const handleProfileUpdate = () => setProfile(getProfile());
    window.addEventListener('hc_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('hc_profile_updated', handleProfileUpdate);
  }, []);
  
  const [phase, setPhase] = useState<'input' | 'analyzing' | 'done'>('input');
  const [history, setHistory] = useState(() => {
    try { return sessionStorage.getItem(engineDraftKey(searchParams.get('caseId') || location.state?.caseId || '')) || ''; } catch { return ''; }
  });
  const [files, setFiles] = useState<{ file: File; base64: string; size: number }[]>([]);
  const [report, setReport] = useState<any>(null);
  const [isIsolated, setIsIsolated] = useState(false);
  const [copiedSbar, setCopiedSbar] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [missingCaseId, setMissingCaseId] = useState<string | null>(null);
  const [addedQuestionIndexes, setAddedQuestionIndexes] = useState<Record<number, boolean>>({});
  const [intakeStep, setIntakeStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(() => {
    const s = searchParams.get('step');
    const parsed = s ? parseInt(s, 10) : 1;
    return (parsed >= 1 && parsed <= 6) ? (parsed as any) : 1;
  });
  const [reviewFocus, setReviewFocus] = useState<'differential' | 'doctor_prep' | 'lab_second_opinion'>('differential');
  const [selectedOnset, setSelectedOnset] = useState<string | null>(() => {
    try {
      const match = history.match(/^Onset:\s*([^.]+)\./i);
      return match ? match[1].trim() : null;
    } catch { return null; }
  });
  const [selectedProgression, setSelectedProgression] = useState<string | null>(() => {
    try {
      const match = history.match(/Progression:\s*([^.]+)\./i);
      return match ? match[1].trim() : null;
    } catch { return null; }
  });
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(() => {
    try {
      const match = history.match(/Primary symptoms:\s*([^.\n]+)/i);
      if (match && match[1]) {
        return match[1].split(',').map(s => s.trim()).filter(Boolean);
      }
    } catch {}
    return [];
  });
  const [symptomSearch, setSymptomSearch] = useState('');
  const [symptomCategoryFilter, setSymptomCategoryFilter] = useState<string>('all');
  const [customSymptoms, setCustomSymptoms] = useState<string[]>([]);

  const handleToggleSymptom = (symptomName: string) => {
    triggerHapticSelection();
    setSelectedSymptoms(prev => {
      const preset = PRESET_SYMPTOMS.find(p => 
        p.name.toLowerCase() === symptomName.toLowerCase() || 
        Boolean(p.aliases?.some(a => a.toLowerCase() === symptomName.toLowerCase()))
      );
      
      const canonicalName = preset ? preset.name : symptomName;
      
      const isSelected = prev.some(s => {
        if (s.toLowerCase() === canonicalName.toLowerCase()) return true;
        if (preset && preset.aliases?.some(a => a.toLowerCase() === s.toLowerCase())) return true;
        return false;
      });

      const updated = isSelected 
        ? prev.filter(s => {
            if (s.toLowerCase() === canonicalName.toLowerCase()) return false;
            if (preset && preset.aliases?.some(a => a.toLowerCase() === s.toLowerCase())) return false;
            return true;
          })
        : [...prev, canonicalName];
      
      setHistory(currentHistory => {
        const symptomPrefix = updated.length > 0 ? `Primary symptoms: ${updated.join(', ')}. ` : '';
        if (!currentHistory.trim()) {
          return symptomPrefix;
        }
        if (currentHistory.includes('Primary symptoms:')) {
          const cleaned = currentHistory.replace(/Primary symptoms:\s*[^.\n]*\.\s*/i, '');
          return symptomPrefix ? `${symptomPrefix}${cleaned}`.trim() : cleaned.trim();
        }
        return `${symptomPrefix}${currentHistory}`.trim();
      });

      return updated;
    });
  };

  const handleRemoveSymptom = (symptomName: string) => {
    handleToggleSymptom(symptomName);
  };

  const handleAddCustomSymptom = () => {
    const raw = symptomSearch.trim();
    if (!raw) return;
    
    // Check if matches an existing preset case-insensitively or via aliases
    const existingPreset = PRESET_SYMPTOMS.find(
      p => p.name.toLowerCase() === raw.toLowerCase() || 
      Boolean(p.aliases?.some(a => a.toLowerCase() === raw.toLowerCase()))
    );

    const symptomNameToUse = existingPreset 
      ? existingPreset.name 
      : raw.charAt(0).toUpperCase() + raw.slice(1);

    if (!existingPreset && !customSymptoms.some(c => c.toLowerCase() === symptomNameToUse.toLowerCase())) {
      setCustomSymptoms(prev => [symptomNameToUse, ...prev]);
    }

    const isAlreadySelected = selectedSymptoms.some(s => 
      s.toLowerCase() === symptomNameToUse.toLowerCase() || 
      Boolean(existingPreset?.aliases?.some(a => a.toLowerCase() === s.toLowerCase()))
    );

    if (!isAlreadySelected) {
      handleToggleSymptom(symptomNameToUse);
      triggerHapticSuccess();
      toast.success('Symptom Added', `"${symptomNameToUse}" has been added to your clinical intake.`);
    } else {
      toast.info('Already Selected', `"${symptomNameToUse}" is already in your selected symptoms.`);
    }

    setSymptomSearch('');
  };

  const handleSelectOnset = (onsetText: string) => {
    triggerHapticSelection();

    setSelectedOnset(prev => prev === onsetText ? null : onsetText);
    setHistory(prev => {
      if (selectedOnset === onsetText) {
        // Toggle off if already selected
        return prev.replace(/^Onset:\s*[^.]*\.\s*/i, '').trim();
      }
      const prefix = `Onset: ${onsetText}. `;
      if (!prev.trim()) return prefix;
      if (prev.startsWith('Onset: ')) {
        const rest = prev.replace(/^Onset:\s*[^.]*\.\s*/i, '');
        return `${prefix}${rest}`.trim();
      }
      return `${prefix}${prev}`.trim();
    });
  };

  const handleSelectProgression = (progText: string) => {
    triggerHapticSelection();
    setSelectedProgression(prev => prev === progText ? null : progText);
    setHistory(prev => {
      if (selectedProgression === progText) {
        // Toggle off if already selected
        return prev.replace(/Progression:\s*[^.]*\.\s*/i, '').trim();
      }
      const progLine = `Progression: ${progText}. `;
      if (!prev.trim()) return progLine;
      if (prev.includes('Progression: ')) {
        return prev.replace(/Progression:\s*[^.]*\.\s*/i, progLine).trim();
      }
      return `${prev}\n${progLine}`.trim();
    });
  };

  const handleAddQuestionToCasePrep = (qText: string, idx: number) => {
    const caseId = createdCaseId || selectedCaseId;
    if (!caseId) {
      toast.error('No Active Case', 'Please select or create a case before saving visit questions.');
      return;
    }
    try {
      addCaseQuestion(caseId, {
        questionText: qText,
        status: 'open',
        raisedBySpecialty: 'Clinical Review',
        supportingEvidenceIds: [],
      });
      setAddedQuestionIndexes(prev => ({ ...prev, [idx]: true }));
      triggerHapticSuccess();
      toast.success('Question Added to Case Prep', 'This question is now recorded in your clinical appointment brief.');
    } catch {
      toast.error('Save Failed', 'Unable to save question to Case Prep. Please try again.');
    }
  };
  const availableCases = useCaseWorkspace();
  const reviewHydrationKey = availableCases.map(item => `${item.id}:${item.reviews?.[0]?.id || ''}`).join('|');
  const [selectedCaseId, setSelectedCaseId] = useState(() => {
    const preferred = searchParams.get('caseId') || location.state?.caseId || '';
    if (preferred) return preferred;
    const scope = getUnifiedCaseScope();
    return scope.caseId || '';
  });
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const selectedCaseRef = useRef(selectedCaseId);
  selectedCaseRef.current = selectedCaseId;
  const [sourceModalData, setSourceModalData] = useState<SourcePassageModalProps | null>(null);
  const [showSovereigntyModal, setShowSovereigntyModal] = useState(false);
  const runningRef = useRef(false);
  const readingRef = useRef(false);
  const scopeRef = useRef(engineScope());
  useEffect(() => {
    const changeScope = () => {
      if (scopeRef.current === engineScope()) return;
      scopeRef.current = engineScope();
      setHistory(''); setFiles([]); setReport(null); setPhase('input'); setSelectedCaseId(''); setCreatedCaseId(null); setMissingCaseId(null);
    };
    window.addEventListener('hc_profile_updated', changeScope);
    window.addEventListener('hc_logout', changeScope);
    return () => { window.removeEventListener('hc_profile_updated', changeScope); window.removeEventListener('hc_logout', changeScope); };
  }, []);
  useEffect(() => {
    try {
      const key = engineDraftKey(selectedCaseId);
      if (phase === 'done') sessionStorage.removeItem(key);
      else if (history.trim()) sessionStorage.setItem(key, history);
      else sessionStorage.removeItem(key);
    } catch { /* Keep editing available when browser storage is disabled. */ }
  }, [history, selectedCaseId, phase]);

  // Rehydrate existing case if caseId is passed in URL query or navigation state
  useEffect(() => {
    const caseId = searchParams.get('caseId') || (location.state as any)?.caseId;
    if (caseId) {
      const existing = getCase(caseId);
      if (existing) {
        setMissingCaseId(null);
        if (phase === 'input') {
          setSelectedCaseId(existing.id);
          setHistory(previous => previous || existing.intakeData?.chiefComplaint || existing.intakeData?.concern || '');
          const jarvisReview = existing.reviews?.find((r: any) => r.type === 'jarvis');
          if (jarvisReview?.report?.groundingVersion === 1 && searchParams.get('review') !== 'new') {
            setReport(jarvisReview.report);
            setCreatedCaseId(existing.id);
            setHistory(existing.intakeData?.chiefComplaint || '');
            setPhase('done');
          }
        }
      } else {
        setMissingCaseId(caseId);
        setSelectedCaseId(caseId);
      }
    } else {
      setMissingCaseId(null);
    }
  }, [searchParams, location.state, reviewHydrationKey, phase]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || readingRef.current) return;
    const selected = Array.from(e.target.files);
    e.target.value = '';
    if (selected.some(file => !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 3 * 1024 * 1024)) {
      toast.error('Unsupported document', 'Choose non-empty PDF, JPG, PNG, or WebP files, each under 3 MB.');
      return;
    }
    
    // Limits: Max 10 files total
    if (files.length + selected.length > 10) {
      toast.error("Document Limit", "Clinical Review is currently limited to processing 10 documents at a time.");
      return;
    }

    readingRef.current = true;
    setIsReadingFiles(true);
    const processed = await Promise.all(selected.map(async (f) => {
      return new Promise<{file: File, base64: string, size: number}>((resolve) => {
        if (f.type.startsWith('image/')) {
          const img = new Image();
          const objectUrl = URL.createObjectURL(f);
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height && width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            } else if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            const base64 = (dataUrl && dataUrl.includes(',')) ? dataUrl.split(',')[1] : (dataUrl || '');
            const estimatedBytes = Math.round((base64.length * 3) / 4);
            resolve({ file: new File([f], f.name, { type: 'image/jpeg' }), base64, size: estimatedBytes });
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            const reader = new FileReader();
            reader.onerror = () => {
              resolve({ file: f, base64: '', size: 0 });
            };
            reader.onload = (ev) => {
              const base64 = (ev.target?.result as string)?.split(',')[1] || '';
              resolve({ file: f, base64, size: f.size });
            };
            reader.readAsDataURL(f);
          };
          img.src = objectUrl;
        } else {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const base64 = (ev.target?.result as string).split(',')[1];
            resolve({ file: f, base64, size: f.size });
          };
          reader.onerror = () => {
            resolve({ file: f, base64: '', size: 0 });
          };
          reader.readAsDataURL(f);
        }
      });
    }));

    readingRef.current = false;
    if (!isMounted.current) return;
    setIsReadingFiles(false);
    if (processed.some(file => !file.base64)) {
      toast.error('Could not read a document', 'Please select the file again or use a clearer copy.');
      return;
    }
    if ([...files, ...processed].reduce((sum, file) => sum + file.base64.length, 0) > 3_500_000) {
      toast.error('Upload too large', 'Use fewer documents or smaller scans. The combined upload must fit within 3.5 MB after processing.');
      return;
    }
    setFiles(prev => [...prev, ...processed]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    triggerHapticSelection();
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetInvestigation = () => {
    triggerHapticLight();
    setPhase('input');
    setHistory('');
    setSelectedOnset(null);
    setSelectedProgression(null);
    setSelectedSymptoms([]);
    setSymptomSearch('');
    setIntakeStep(1);
    setFiles([]);
    setReport(null);
    setCreatedCaseId(null);
    setSelectedCaseId('');
    navigate('/app/consult', { replace: true, state: null });
    setCopiedSbar(false);
  };

  const handleCopySbar = async () => {
    if (!report) return;
    triggerHapticSuccess();
    const primary = report.primaryHypothesis || report.topDiagnoses?.[0]?.condition || 'Clinical Finding';
    const sbar = report.doctorActionPlan?.sbar || {
      situation: report.executiveSummary || history,
      background: 'See the attached case history; no additional history inferred.',
      assessment: primary,
      recommendation: (report.questionsForClinician || []).join('\n') || 'Review the concerns and records with the treating clinician.'
    };

    const text = `CLINICAL REVIEW • DOCTOR SBAR BRIEF
AI consideration for clinician review: ${primary}
Generated: ${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}

[S] SITUATION:
${sbar.situation}

[B] BACKGROUND:
${sbar.background}

[A] ASSESSMENT:
${sbar.assessment}

[R] RECOMMENDATION:
${sbar.recommendation}

QUESTIONS FOR THE VISIT:
${(report.questionsForClinician || []).map((question: string, i: number) => `${i + 1}. ${question}`).join('\n') || 'What additional information would help you assess these concerns?'}

AI-generated preparation material. Verify against original records; this is not a diagnosis or a treatment plan.`;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      toast.error('Copy unavailable', 'Your browser could not access the clipboard. You can select and copy the report text.');
      return;
    }
    setCopiedSbar(true);
    toast.success("SBAR Brief Copied", "Formatted for MyChart/doctor portal notes.");
    setTimeout(() => setCopiedSbar(false), 3000);
  };

  const [isUpdatingReasoning, setIsUpdatingReasoning] = useState(false);

  const handleClarificationFeedback = async (answer: string) => {
    if (!report || isUpdatingReasoning) return false;
    setIsUpdatingReasoning(true);
    try {
      const updatedReport = normalizeClinicalReview(
        report,
        report.reasoningPipeline || null,
        {
          questionId: report.reasoningPipeline?.stage7_focusedQuestion?.id || 'clarification_1',
          answerText: answer,
        }
      );
      const targetCaseId = createdCaseId || selectedCaseId;
      if (!targetCaseId || !getCase(targetCaseId)) throw new Error('Select an available case before saving.');
      addCaseEvent(targetCaseId, answer.trim(), 'User clarification');
      if (targetCaseId) {
        saveReviewSnapshot({
          caseId: targetCaseId,
          type: 'jarvis' as any,
          report: updatedReport,
          specialists: ['Clinical Review'],
        });
      }
      setReport(updatedReport);
      toast.success('Clarification saved', 'Saved as your reported observation. Run a new review to assess how it changes the interpretation.');
      return true;
    } catch (err) {
      console.error('Failed to update reasoning pipeline:', err);
      toast.error('Update Failed', 'Could not update the reasoning pipeline.');
      return false;
    } finally {
      setIsUpdatingReasoning(false);
    }
  };

  const handleRunInvestigation = async () => {
    if (runningRef.current || readingRef.current) return;
    const requestScope = engineScope();
    const effectiveCaseId = selectedCaseId || missingCaseId;
    const requestCaseId = effectiveCaseId;
    const linkedCase = effectiveCaseId ? getCase(effectiveCaseId) : undefined;
    if (effectiveCaseId && (!linkedCase || linkedCase.intakeData?.scenarioId)) {
      toast.error('Case unavailable', 'Select an available case or start a new case.');
      return;
    }
    if (!history.trim() && files.length === 0) {
      toast.error("Input Required", "Please enter your symptoms, clinical timeline, or attach lab reports to run the engine.");
      return;
    }

    runningRef.current = true;
    const session = await getActiveSession();
    if (!isMounted.current || (requestScope !== engineScope() || selectedCaseRef.current !== requestCaseId)) { runningRef.current = false; return; }
    if (!session) {
      runningRef.current = false;
      window.dispatchEvent(new CustomEvent('hc_require_auth', {
        detail: {
          title: 'Authentication Required',
          message: 'You need to log in or sign up to run a Clinical Review investigation.'
        }
      }));
      return;
    }

    const isVip = typeof localStorage !== 'undefined' && (localStorage.getItem('hc_vp_sig') === 'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a');
    if (!profile?.isPro && !isVip) {
      runningRef.current = false;
      openTrialModal('Clinical Review');
      return;
    }

    runningRef.current = true;
    setPhase('analyzing');
    
    const mappedFiles = files.map(f => ({
      mimeType: f.file.type || 'application/pdf',
      data: f.base64,
      name: f.file.name
    }));

    try {
      const contextProfile = isIsolated ? null : profile;
      const caseHistory = linkedCase ? `${history}\n\nSelected case evidence (prior AI interpretations are unverified):\n${buildCaseContext(linkedCase)}` : history;
      const result = await runJarvisInvestigation(history, mappedFiles, contextProfile, linkedCase);
      
      if (!isMounted.current || (requestScope !== engineScope() || selectedCaseRef.current !== requestCaseId)) return;
      
      if (result) {
        setReport(result);
        
        const primaryTitle = result.primaryHypothesis || result.topDiagnoses?.[0]?.condition || history.slice(0, 32);
        if (linkedCase && linkedCase.intakeData) {
          if (selectedSymptoms.length > 0) linkedCase.intakeData.symptoms = selectedSymptoms;
          if (selectedOnset) linkedCase.intakeData.onset = selectedOnset;
          if (selectedProgression) linkedCase.intakeData.progression = selectedProgression;
        }
        const newCase = linkedCase || createCaseDraft({
          title: `Clinical Review: ${primaryTitle.slice(0, 36)}`,
          mode: 'jarvis',
          intakeData: { 
            chiefComplaint: history || "Clinical Review investigation",
            symptoms: selectedSymptoms,
            onset: selectedOnset,
            progression: selectedProgression,
            filesCount: mappedFiles.length,
            analyzedAt: new Date().toISOString()
          }
        });
        const records: MedicalRecord[] = [];
        for (const attachment of files) {
          const recordId = crypto.randomUUID();
          const passages = (result.documentedFacts || []).filter((fact: any) => fact.source === attachment.file.name);
          await saveOriginalCaseFile(newCase.id, recordId, attachment.file);
          if (!isMounted.current || (requestScope !== engineScope() || selectedCaseRef.current !== requestCaseId)) return;
          records.push({
            id: recordId, filename: attachment.file.name, source: 'uploaded_document',
            type: attachment.file.type, addedAt: new Date().toISOString(),
            findings: passages.map((p: any) => p.fact).join('\n'),
            passages: passages.map((p: any) => ({
              id: p.id,
              text: p.fact,
              originalText: p.fact,
              extractionStatus: 'provisional' as const,
              auditTrail: [],
              page: p.page,
              section: 'Provisional extraction; check original',
            })),
          });
          passages.forEach((p: any) => { p.recordId = recordId; p.passageId = p.id; });
        }
        if (records.length) appendCaseRecords(newCase.id, records);
        setCreatedCaseId(newCase.id);
        
        saveReviewSnapshot({
          caseId: newCase.id,
          type: 'jarvis' as any,
          report: result,
          specialists: ['Clinical Review']
        });

        recordHealthMemory({
          kind: 'research',
          source: 'jarvis',
          title: `Clinical Review: ${primaryTitle.slice(0, 36)}`,
          occurredAt: new Date().toISOString(),
          caseId: newCase.id,
          payload: {
            primaryHypothesis: result.primaryHypothesis || result.topDiagnoses?.[0]?.condition,
            dominoChain: result.dominoChain,
            topDiagnoses: result.topDiagnoses || [],
            missingLinks: result.missingLinks || [],
            symptoms: selectedSymptoms,
            onset: selectedOnset,
            progression: selectedProgression,
            documentCount: mappedFiles.length
          },
          dedupeKey: `jarvis:${newCase.id}`
        });

        awardPoints(25, 'Clinical Review Investigation', 'checkin');
        setPhase('done');
      } else {
        if (!isMounted.current) return;
        toast.error("Analysis Disrupted", "Clinical Review encountered a network disruption. Please try again.");
        setIntakeStep(4);
        setPhase('input');
      }
    } catch (e) {
      console.error(e);
      if (isMounted.current) {
        toast.error("Analysis Error", "An error occurred during analysis. Please try again.");
        setIntakeStep(4);
        setPhase('input');
      }
    } finally {
      runningRef.current = false;
    }
  };

  if (phase === 'analyzing') {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CompilingAnimation isMobile={isMobile} />
      </div>
    );
  }

  if (phase === 'done' && report) {
    const caseId = createdCaseId || selectedCaseId;
    const primaryCondition = report.primaryHypothesis || report.topDiagnoses?.[0]?.condition || 'Case review';
    const reasoningPayload = report.reasoningPipeline || runClinicalReasoningPipeline(report);
    const perspectives = report.meaningfulPerspectives || report.perspectives || [];

    return (
      <div
        className="connected-experience"
        style={{
          padding: isMobile ? '12px 0 80px' : '24px 0 100px',
          maxWidth: '960px',
          margin: '0 auto',
        }}
      >
        <section className="case-workspace" aria-labelledby="review-ready-title">
          <header style={{ marginBottom: 18 }}>
            <span className="case-workspace-eyebrow">Saved to My Cases</span>
            <h2 id="review-ready-title" style={{ marginBottom: 6 }}>Your record review is ready</h2>
            <p style={{ margin: 0 }}>Check extracted details against the original records.</p>
          </header>

          <div className="case-workspace-grid" style={{ marginBottom: 20 }}>
            <button className="btn btn-primary" onClick={() => navigate(`/app/cases/${caseId}`)}>
              Open case
            </button>
            <button className="btn btn-outline" onClick={() => navigate(`/app/case-prep?caseId=${encodeURIComponent(caseId || '')}`)}>
              Prepare for visit
            </button>
            <button className="btn btn-outline" onClick={() => navigate(`/app/ava?caseId=${encodeURIComponent(caseId || '')}`, {
              state: { initialPrompt: 'Help me understand my latest record review and prepare questions for my clinician.' }
            })}>
              Ask Ava
            </button>
          </div>

          <details style={{ marginBottom: 20 }}>
            <summary style={{ cursor: 'pointer', color: '#475569', fontSize: 13, fontWeight: 700 }}>
              More actions
            </summary>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 10 }}>
              <button className="btn btn-outline btn-sm" onClick={handleCopySbar}>{copiedSbar ? 'Copied' : 'Copy summary'}</button>
              <button className="btn btn-outline btn-sm" onClick={() => { setPhase('input'); setReport(null); }}>Review updated information</button>
              <button className="btn btn-outline btn-sm" onClick={resetInvestigation}>Start another review</button>
            </div>
          </details>

          <StructuredAnswerView
            answer={report.structuredAnswer || buildStructuredClinicalAnswer({
              primaryHypothesis: primaryCondition,
              executiveSummary: report.executiveSummary,
              documentedFacts: report.documentedFacts,
              uncertainties: report.uncertainties,
              missingLinks: report.missingLinks,
              questionsForClinician: report.questionsForClinician,
              contradictions: report.contradictions || report.contradictionQueue,
              alternatives: report.alternatives,
              perspectives,
              boundedComparison: report.boundedComparison,
            })}
            onOpenSourceModal={(src) => setSourceModalData(src)}
          />

          <details style={{ marginTop: 18, borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
            <summary style={{ cursor: 'pointer', color: '#0F766E', fontSize: 14, fontWeight: 800 }}>
              Review reasoning
            </summary>
            <ClinicalReasoningPipelineView
              payload={reasoningPayload}
              onClarificationSubmit={handleClarificationFeedback}
              onChooseNextAction={(action) => {
                if (!caseId) return;
                const updated = {
                  ...report,
                  reasoningPipeline: {
                    ...reasoningPayload,
                    stage9_continuity: { ...reasoningPayload.stage9_continuity, chosenNextAction: action },
                  },
                };
                saveReviewSnapshot({ caseId, type: 'jarvis', report: updated, specialists: ['Clinical Review'] });
                setReport(updated);
              }}
              onCorrectionAcknowledge={(id) => {
                if (!caseId) return;
                const updated = {
                  ...report,
                  reasoningPipeline: {
                    ...reasoningPayload,
                    stage3_correctionQueue: reasoningPayload.stage3_correctionQueue.map((item: any) =>
                      item.id === id ? { ...item, status: 'acknowledged' } : item
                    ),
                  },
                };
                saveReviewSnapshot({ caseId, type: 'jarvis', report: updated, specialists: ['Clinical Review'] });
                setReport(updated);
              }}
              isUpdating={isUpdatingReasoning}
            />
          </details>

          {perspectives.length > 0 && (
            <details style={{ marginTop: 14, borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
              <summary style={{ cursor: 'pointer', color: '#0F766E', fontSize: 14, fontWeight: 800 }}>
                Perspectives ({perspectives.length})
              </summary>
              <MeaningfulMultiPerspectiveView
                perspectives={perspectives}
                boundedComparison={report.boundedComparison}
                versionedEvidence={report.versionedEvidence}
              />
            </details>
          )}
        </section>

        {sourceModalData && (
          <SourcePassageModal
            caseId={caseId}
            {...sourceModalData}
            isOpen={Boolean(sourceModalData)}
            onClose={() => setSourceModalData(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        background: 'transparent', 
        padding: isMobile ? '12px 8px 100px' : '32px 20px 100px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Workspace Header / Session Status matching Reference Layout */}
      <div 
        style={{ 
          width: '100%', 
          maxWidth: '920px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: isMobile ? '8px' : '12px',
          marginBottom: '16px',
          padding: '0 4px'
        }}
      >
        {/* Back navigation button */}
        <button
          type="button"
          onClick={() => {
            if (intakeStep > 1) {
              triggerHapticLight();
              setIntakeStep((prev) => (prev - 1) as any);
            } else {
              navigate(-1);
            }
          }}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            color: '#18181B',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#E11D48';
            e.currentTarget.style.borderColor = '#FDA4AF';
            e.currentTarget.style.background = '#FFF1F2';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#18181B';
            e.currentTarget.style.borderColor = '#E4E4E7';
            e.currentTarget.style.background = '#FFFFFF';
          }}
          title="Back to Workspace"
          aria-label="Back to Workspace"
        >
          ←
        </button>

        {/* 6-segment minimal progress bar */}
        <div style={{ flex: '1 1 auto', maxWidth: '360px', display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px' }}>
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div 
              key={s}
              style={{ 
                flex: 1, 
                height: '4px', 
                borderRadius: '999px', 
                background: intakeStep >= s ? '#E11D48' : '#E4E4E7',
                transition: 'background 0.2s ease' 
              }} 
            />
          ))}
        </div>

        {/* Right utility: Step badge and Save & Exit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px', flexShrink: 0 }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '5px', 
            background: '#FFFFFF', 
            border: '1px solid #E4E4E7', 
            padding: isMobile ? '4px 8px' : '5px 12px', 
            borderRadius: '9999px', 
            fontSize: isMobile ? '11px' : '12px', 
            fontWeight: 700, 
            color: '#BE123C', 
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)' 
          }}>
            <span>{isMobile ? `Step ${intakeStep}/6` : `Step ${intakeStep} of 6`}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHapticLight();
              toast.success("Draft Preserved", "Your clinical review progress is saved on this device.");
              navigate('/app/cases');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#71717A',
              fontSize: isMobile ? '11.5px' : '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: isMobile ? '4px 6px' : '5px 8px',
              borderRadius: '6px',
              transition: 'color 0.15s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#18181B')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#71717A')}
          >
            {isMobile ? 'Exit' : 'Save & Exit'}
          </button>
        </div>
      </div>

      <div 
        style={{ 
          width: '100%', 
          maxWidth: '920px', 
          background: 'rgba(255, 255, 255, 0.98)', 
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '24px', 
          boxShadow: '0 20px 60px -15px rgba(225, 29, 72, 0.05), 0 1px 3px rgba(0,0,0,0.02)', 
          border: '1.5px solid rgba(228, 228, 231, 0.9)', 
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Background Glowing Ambient Orbs in Raspberry/Rose & Warm Peach */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '280px', height: '280px', background: '#E11D48', filter: 'blur(90px)', opacity: 0.09, borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '35%', left: '-50px', width: '240px', height: '240px', background: '#FB7185', filter: 'blur(100px)', opacity: 0.07, borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', right: '15%', width: '260px', height: '260px', background: '#FB923C', filter: 'blur(90px)', opacity: 0.08, borderRadius: '50%', pointerEvents: 'none' }} />

        {/* Editorial Header Banner with Reference Typography */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #FFF5F6 0%, #FFFFFF 60%, #F8F9FB 100%)', 
            padding: isMobile ? '24px 18px 20px' : '32px 36px 24px', 
            borderBottom: '1px solid #F4F4F5',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: isMobile ? 'nowrap' : 'wrap', gap: isMobile ? '8px' : '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px', minWidth: 0 }}>
              <div 
                style={{ 
                  width: isMobile ? '32px' : '38px', 
                  height: isMobile ? '32px' : '38px', 
                  borderRadius: isMobile ? '10px' : '12px', 
                  background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
                  flexShrink: 0
                }}
              >
                <BrainCircuit size={isMobile ? 16 : 20} color="#FFFFFF" />
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FFF1F2', border: '1px solid #FECDD3', padding: isMobile ? '3px 8px' : '3px 10px', borderRadius: '9999px', minWidth: 0 }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#E11D48', flexShrink: 0 }} />
                <span style={{ color: '#BE123C', fontWeight: 800, fontSize: isMobile ? '10px' : '11px', letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isMobile ? 'Clinical Review' : 'Clinical Review Workstation'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                setShowSovereigntyModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: isMobile ? '4px 10px' : '5px 12px',
                borderRadius: '9999px',
                background: '#FFF1F2',
                border: '1px solid #FECDD3',
                color: '#BE123C',
                fontSize: isMobile ? '11px' : '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
              title="Review how data is stored and processed"
            >
              <ShieldCheck size={isMobile ? 12 : 13} />
              <span>{isMobile ? 'Private & Encrypted' : 'Zero-Knowledge Privacy'}</span>
            </button>
          </div>

          <h1 
            style={{ 
              fontFamily: '"Newsreader", "Playfair Display", "Merriweather", "Georgia", serif',
              fontSize: isMobile ? '23px' : '29px', 
              fontWeight: 800, 
              color: '#18181B', 
              margin: '0 0 6px 0', 
              letterSpacing: '-0.5px', 
              lineHeight: 1.25 
            }}
          >
            {STEP_META[intakeStep]?.title || "Clinical Review Workstation"}
          </h1>

          <p 
            style={{ 
              color: '#64748B', 
              fontSize: isMobile ? '13.5px' : '15px', 
              margin: 0, 
              lineHeight: 1.5, 
              maxWidth: '720px' 
            }}
          >
            {STEP_META[intakeStep]?.subtitle || ""}
          </p>
        </div>

        {/* 6-Step Guided Progress Track */}
        <div 
          style={{ 
            padding: '16px 24px 14px', 
            background: '#FAFAFA', 
            borderBottom: '1px solid #F4F4F5',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* 6 Gradient Progress Capsules in Raspberry Rose */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div 
                  key={s}
                  onClick={() => { triggerHapticSelection(); setIntakeStep(s as any); }}
                  style={{ 
                    flex: 1, 
                    height: '6px', 
                    borderRadius: '999px', 
                    background: intakeStep >= s ? 'linear-gradient(90deg, #E11D48, #FB7185)' : '#E4E4E7',
                    boxShadow: intakeStep === s ? '0 0 8px rgba(225, 29, 72, 0.45)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease'
                  }} 
                />
              ))}
            </div>

            {/* Step Sub-label & Status Indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', paddingTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 850, color: '#BE123C', letterSpacing: '0.3px' }}>
                  Step {intakeStep} of 6
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#BE123C', background: '#FFF1F2', padding: '2px 9px', borderRadius: '999px', border: '1px solid #FECDD3' }}>
                  {STEP_META[intakeStep]?.badge}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step Body Content with Card-Based Rhythm */}
        <div style={{ padding: isMobile ? '20px 16px' : '28px 36px', position: 'relative', zIndex: 1 }}>
          {missingCaseId && (
            <div
              role="alert"
              style={{
                marginBottom: 20,
                padding: '12px 16px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: '#991B1B',
                fontSize: 14,
              }}
            >
              <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
              <div>
                <strong>Case Not Found:</strong> Case &quot;{missingCaseId}&quot; could not be found in your local records. You can choose another case below or start a new case.
              </div>
            </div>
          )}

            {/* ========================================================================= */}
            {/* STEP 1: CLINICAL TIMELINE & SYMPTOMS (EDITORIAL CLOUD WORKSTATION)        */}
            {/* ========================================================================= */}
            {intakeStep === 1 && (
              <div key="step1" style={{ paddingBottom: isMobile ? '90px' : '90px' }}>
                {/* 1. TOP SELECTED SHELF & COUNTER (from Reference Image) */}
                {selectedSymptoms.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '8px', marginBottom: isMobile ? '12px' : '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span 
                        style={{ 
                          fontSize: '11px', 
                          fontWeight: 850, 
                          color: '#71717A', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.08em' 
                        }}
                      >
                        {selectedSymptoms.length} SELECTED
                      </span>
                      {selectedSymptoms.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticSelection();
                            setSelectedSymptoms([]);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#BE123C',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '4px'
                          }}
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <div 
                      style={{ 
                        display: 'flex', 
                        flexWrap: isMobile ? 'nowrap' : 'wrap', 
                        overflowX: isMobile ? 'auto' : 'visible',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        gap: isMobile ? '6px' : '8px',
                        paddingBottom: isMobile ? '4px' : '0',
                        alignItems: 'center'
                      }}
                    >
                      {selectedSymptoms.map((sym) => {
                        const found = PRESET_SYMPTOMS.find(p => p.name.toLowerCase() === sym.toLowerCase() || Boolean(p.aliases?.some(a => a.toLowerCase() === sym.toLowerCase())));
                        const IconComponent = found?.icon || Heart;
                        const category = found?.category || 'systemic';
                        const theme = SYMPTOM_CATEGORY_THEMES[category] || SYMPTOM_CATEGORY_THEMES.systemic;
                        return (
                          <motion.div
                            key={sym}
                            layout
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              flexShrink: 0,
                              width: 'fit-content',
                              gap: isMobile ? '6px' : '8px',
                              padding: isMobile ? '4px 10px 4px 6px' : '5px 12px 5px 7px',
                              borderRadius: '9999px',
                              border: `1.5px solid ${theme.activeBorder}`,
                              background: theme.bgStart,
                              color: theme.textColor,
                              fontSize: isMobile ? '12px' : '13px',
                              fontWeight: 700,
                              boxShadow: `0 2px 8px ${theme.shadow}`,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <ClassySymptomBadge 
                              icon={IconComponent} 
                              category={category} 
                              size={isMobile ? 18 : 20} 
                              isSelected 
                            />
                            <span style={{ whiteSpace: 'nowrap' }}>{sym}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSymptom(sym)}
                              aria-label={`Remove ${sym}`}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: theme.textColor,
                                marginLeft: '2px',
                                flexShrink: 0,
                                opacity: 0.75,
                                borderRadius: '50%',
                                transition: 'opacity 0.15s ease'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.75'; }}
                            >
                              <X size={isMobile ? 12 : 13} strokeWidth={2.5} />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. CAPSULE SEARCH BAR */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#FFFFFF',
                    border: '1.5px solid #E4E4E7',
                    borderRadius: '9999px',
                    padding: '10px 16px',
                    gap: '10px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    marginBottom: '12px',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  <Search size={17} color="#71717A" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    value={symptomSearch}
                    onChange={(e) => setSymptomSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSymptom();
                      }
                    }}
                    placeholder="Search 70+ symptoms or type a custom symptom…"
                    aria-label="Search or add symptom"
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      width: '100%',
                      fontSize: '14px',
                      color: '#18181B'
                    }}
                  />
                  {symptomSearch.trim() && (
                    <button
                      type="button"
                      onClick={handleAddCustomSymptom}
                      style={{
                        background: '#FFE4E6',
                        color: '#E11D48',
                        border: '1px solid #FDA4AF',
                        borderRadius: '9999px',
                        padding: '5px 12px',
                        fontSize: isMobile ? '11px' : '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Plus size={13} strokeWidth={3} />
                      <span>Add &quot;{symptomSearch.trim().slice(0, 16)}{symptomSearch.trim().length > 16 ? '…' : ''}&quot;</span>
                    </button>
                  )}
                </div>

                {/* 3. ORGAN SYSTEM CATEGORY FILTER TABS */}
                <div 
                  style={{ 
                    display: 'flex', 
                    gap: '6px', 
                    overflowX: 'auto', 
                    paddingBottom: '8px', 
                    marginBottom: '14px', 
                    scrollbarWidth: 'none', 
                    WebkitOverflowScrolling: 'touch' 
                  }}
                >
                  {[
                    { id: 'all', label: 'All (70+)' },
                    { id: 'common', label: '⭐ Most Common' },
                    { id: 'gut', label: '🥗 Gut & Digestion' },
                    { id: 'neuro', label: '🧠 Head & Neuro' },
                    { id: 'respiratory', label: '🫁 Lungs & ENT' },
                    { id: 'cardio', label: '🫀 Heart & Chest' },
                    { id: 'pain', label: '🦴 Pain & Joints' },
                    { id: 'skin', label: '🧴 Skin & Allergies' },
                    { id: 'systemic', label: '⚡ Energy & Fever' },
                    { id: 'sleep_mental', label: '🌙 Sleep & Mood' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setSymptomCategoryFilter(cat.id);
                      }}
                      style={{
                        flexShrink: 0,
                        padding: isMobile ? '5px 11px' : '6px 13px',
                        borderRadius: '999px',
                        border: symptomCategoryFilter === cat.id ? '1.5px solid #E11D48' : '1px solid #E4E4E7',
                        background: symptomCategoryFilter === cat.id ? '#FFF1F2' : '#FFFFFF',
                        color: symptomCategoryFilter === cat.id ? '#BE123C' : '#64748B',
                        fontSize: isMobile ? '11px' : '12px',
                        fontWeight: symptomCategoryFilter === cat.id ? 800 : 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                        boxShadow: symptomCategoryFilter === cat.id ? '0 1px 4px rgba(225, 29, 72, 0.1)' : 'none'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* 4. CLINICAL SYMPTOM CLOUD */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '7px 8px' : '9px 10px', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%', marginBottom: '22px' }}>
                  {/* User-added Custom Symptoms */}
                  {customSymptoms.filter(cs => !symptomSearch.trim() || cs.toLowerCase().includes(symptomSearch.trim().toLowerCase())).map((cs) => {
                    const isSelected = selectedSymptoms.some(s => s.toLowerCase() === cs.toLowerCase());
                    return (
                      <motion.button
                        key={`custom-${cs}`}
                        type="button"
                        aria-label={cs}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleToggleSymptom(cs)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: isMobile ? '7px 13px' : '8px 14px',
                          borderRadius: '999px',
                          border: isSelected ? '1.5px solid #E11D48' : '1px solid #E2E8F0',
                          background: isSelected 
                            ? 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)' 
                            : '#FFFFFF',
                          color: isSelected ? '#9F1239' : '#1C1917',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 3px 12px rgba(225, 29, 72, 0.18)' : '0 2px 6px rgba(0, 0, 0, 0.03)',
                          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                          textAlign: 'left',
                          flexShrink: 0,
                          maxWidth: '100%'
                        }}
                      >
                        <ClassySymptomBadge 
                          icon={Sparkles} 
                          category="cardio" 
                          size={isMobile ? 20 : 22} 
                          isSelected={isSelected} 
                        />
                        <div style={{ textAlign: 'left', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                          <span style={{ 
                            fontSize: isMobile ? '13px' : '13.5px', 
                            fontWeight: isSelected ? 800 : 700, 
                            color: isSelected ? '#9F1239' : '#1C1917',
                            display: 'block',
                            letterSpacing: '-0.1px'
                          }}>
                            {cs}
                          </span>
                          <span style={{ 
                            fontSize: isMobile ? '10.5px' : '11px', 
                            fontWeight: 500, 
                            color: isSelected ? '#BE123C' : '#78716C',
                            display: 'block'
                          }}>
                            Custom Symptom Note
                          </span>
                        </div>
                        {isSelected && (
                          <div style={{
                            width: '17px',
                            height: '17px',
                            borderRadius: '50%',
                            background: '#E11D48',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            marginLeft: '2px',
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(225, 29, 72, 0.3)'
                          }}>
                            <Check size={11} strokeWidth={3.5} />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}

                  {/* Preset Symptoms filtered by search and category */}
                  {PRESET_SYMPTOMS.filter(sym => {
                    const q = symptomSearch.trim().toLowerCase();
                    const matchesSearch = !q || 
                       sym.name.toLowerCase().includes(q) || 
                       Boolean(sym.aliases?.some(a => a.toLowerCase().includes(q)));
                    const matchesCat = symptomCategoryFilter === 'all' 
                      ? true 
                      : symptomCategoryFilter === 'common' 
                      ? Boolean(sym.isCommon)
                      : sym.category === symptomCategoryFilter;
                    return matchesSearch && matchesCat;
                  }).map((sym) => {
                    const isSelected = selectedSymptoms.some(s => 
                      s.toLowerCase() === sym.name.toLowerCase() || 
                      Boolean(sym.aliases?.some(a => a.toLowerCase() === s.toLowerCase()))
                    );
                    const IconComp = sym.icon || Activity;
                    return (
                      <motion.button
                        key={sym.id}
                        type="button"
                        aria-label={sym.name}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleToggleSymptom(sym.name)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: isMobile ? '7px 13px' : '8px 14px',
                          borderRadius: '999px',
                          border: isSelected ? '1.5px solid #E11D48' : '1px solid #E2E8F0',
                          background: isSelected 
                            ? 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)' 
                            : '#FFFFFF',
                          color: isSelected ? '#9F1239' : '#1C1917',
                          cursor: 'pointer',
                          boxShadow: isSelected 
                            ? `0 3px 12px rgba(225, 29, 72, 0.18)` 
                            : '0 2px 6px rgba(0, 0, 0, 0.03)',
                          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                          textAlign: 'left',
                          flexShrink: 0,
                          maxWidth: '100%'
                        }}
                      >
                        <ClassySymptomBadge 
                          icon={IconComp} 
                          category={sym.category} 
                          size={isMobile ? 20 : 22} 
                          isSelected={isSelected} 
                        />
                        <div style={{ textAlign: 'left', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                          <span style={{ 
                            fontSize: isMobile ? '13px' : '13.5px', 
                            fontWeight: isSelected ? 800 : 700, 
                            color: isSelected ? '#9F1239' : '#1C1917',
                            display: 'block',
                            letterSpacing: '-0.1px'
                          }}>
                            {sym.name}
                          </span>
                          {sym.subtitle && (
                            <span style={{ 
                              fontSize: isMobile ? '10.5px' : '11px', 
                              fontWeight: 500,
                              color: isSelected ? '#BE123C' : '#78716C',
                              display: 'block'
                            }}>
                              {sym.subtitle}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <div style={{
                            width: '17px',
                            height: '17px',
                            borderRadius: '50%',
                            background: '#E11D48',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            marginLeft: '2px',
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(225, 29, 72, 0.3)'
                          }}>
                            <Check size={11} strokeWidth={3.5} />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Empty State when Search has no matches */}
                {symptomSearch.trim() && 
                  PRESET_SYMPTOMS.filter(sym => {
                    const q = symptomSearch.trim().toLowerCase();
                    return sym.name.toLowerCase().includes(q) || Boolean(sym.aliases?.some(a => a.toLowerCase().includes(q)));
                  }).length === 0 && 
                  customSymptoms.filter(cs => cs.toLowerCase().includes(symptomSearch.trim().toLowerCase())).length === 0 && (
                  <div style={{ padding: '18px 20px', background: '#FFF1F2', border: '1.5px dashed #FDA4AF', borderRadius: '16px', textAlign: 'center', marginBottom: '22px' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13.5px', color: '#9F1239', fontWeight: 600 }}>
                      No preset symptom matched &quot;{symptomSearch.trim()}&quot;
                    </p>
                    <button
                      type="button"
                      onClick={handleAddCustomSymptom}
                      style={{
                        background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '9px 20px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Plus size={15} strokeWidth={3} />
                      <span>Add &quot;{symptomSearch.trim()}&quot; to My Symptoms</span>
                    </button>
                  </div>
                )}

                {/* Step 1 Action Bar - Permanently Docked at Bottom */}
                <div 
                  style={{ 
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    background: 'rgba(255, 255, 255, 0.96)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderTop: '1px solid rgba(228, 228, 231, 0.9)',
                    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.07)',
                    padding: isMobile ? '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))' : '14px 24px',
                    display: 'flex',
                    justifyContent: 'center'
                  }}
                >
                  <div 
                    style={{ 
                      width: '100%', 
                      maxWidth: '920px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: isMobile ? 'center' : 'space-between', 
                      gap: '16px' 
                    }}
                  >
                    {!isMobile && (
                      <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                        Step 1 of 6 · Choose symptoms to personalize your clinical review
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setIntakeStep(2);
                      }}
                      style={{
                        width: isMobile ? '100%' : 'auto',
                        minWidth: isMobile ? '100%' : '260px',
                        padding: isMobile ? '14px 24px' : '13px 28px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #E11D48 0%, #DE3558 50%, #BE123C 100%)',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: isMobile ? '15px' : '15px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        boxShadow: '0 6px 20px rgba(225, 29, 72, 0.35)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>
                        {selectedSymptoms.length > 0 
                          ? `Continue with ${selectedSymptoms.length} symptom${selectedSymptoms.length === 1 ? '' : 's'}`
                          : 'Next: Timeline (Step 2)'}
                      </span>
                      <ArrowRight size={17} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 2: ONSET & TIMELINE (DEDICATED ONBOARDING SCREEN)                    */}
            {/* ========================================================================= */}
            {intakeStep === 2 && (
              <div key="step2">
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.96)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: isMobile ? '20px 16px' : '28px 28px',
                    border: '1.5px solid #F4F4F5',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      style={{ 
                        width: '42px', 
                        height: '42px', 
                        borderRadius: '14px', 
                        background: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)', 
                        border: '1px solid #FDA4AF',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#E11D48',
                        flexShrink: 0
                      }}
                    >
                      <CalendarClock size={22} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#18181B', margin: 0 }}>
                        Onset Timing & Chronology
                      </h2>
                      <p style={{ fontSize: '13px', color: '#64748B', margin: 0, marginTop: '2px' }}>
                        Tap an onset timeframe to anchor your clinical chronology
                      </p>
                    </div>
                  </div>

                  {/* 6 Tactile Onboarding Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
                    {[
                      { name: 'Today (< 24h)', emoji: '🌅', label: 'Today (< 24h)', desc: 'Acute symptom onset within the last 24 hours' },
                      { name: 'Past few days', emoji: '⏱️', label: 'Past few days', desc: 'Started 2 to 6 days ago' },
                      { name: '1–2 weeks', emoji: '🗓️', label: '1–2 weeks', desc: 'Developing over the past couple weeks' },
                      { name: '1–3 months', emoji: '⏳', label: '1–3 months', desc: 'Subacute condition present for several weeks' },
                      { name: '6+ months (chronic)', emoji: '🌊', label: '6+ months (chronic)', desc: 'Long-standing or recurring chronic concern' },
                      { name: 'Several years', emoji: '📅', label: 'Several years', desc: 'Multi-year chronic medical history' },
                    ].map((opt) => {
                      const isSelected = selectedOnset === opt.name || history.includes(`Onset: ${opt.name}`);
                      return (
                        <motion.button
                          key={opt.name}
                          type="button"
                          aria-label={opt.name}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectOnset(opt.name)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 18px',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            border: isSelected ? '1.5px solid #E11D48' : '1px solid #E4E4E7',
                            background: isSelected ? '#FFF1F2' : '#FFFFFF',
                            boxShadow: isSelected ? '0 2px 10px rgba(225, 29, 72, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '20px' }}>{opt.emoji}</span>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: isSelected ? '#BE123C' : '#18181B' }}>
                                {opt.name}
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                                {opt.desc}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check size={16} color="#E11D48" strokeWidth={2.5} />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2 Action Bar */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap', 
                    gap: '12px', 
                    paddingTop: '16px', 
                    borderTop: '1px solid #F4F4F5' 
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(1);
                    }}
                    style={{
                      padding: '11px 18px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      border: '1px solid #E4E4E7',
                      cursor: 'pointer'
                    }}
                  >
                    ← Back to Symptoms
                  </button>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setIntakeStep(3);
                      }}
                      style={{
                        padding: '11px 22px',
                        borderRadius: '12px',
                        background: '#FFF1F2',
                        color: '#BE123C',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        border: '1.5px solid #FECDD3',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>Next: Pattern (Step 3)</span>
                      <ArrowRight size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={handleRunInvestigation}
                      disabled={isReadingFiles || (!history.trim() && !files.length)}
                      style={{
                        padding: '11px 22px',
                        borderRadius: '12px',
                        background: (isReadingFiles || (!history.trim() && !files.length)) ? '#E4E4E7' : 'linear-gradient(135deg, #E11D48 0%, #DE3558 50%, #BE123C 100%)',
                        color: (isReadingFiles || (!history.trim() && !files.length)) ? '#A1A1AA' : '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        border: 'none',
                        cursor: (isReadingFiles || (!history.trim() && !files.length)) ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: (isReadingFiles || (!history.trim() && !files.length)) ? 'none' : '0 6px 18px rgba(225, 29, 72, 0.3)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Sparkles size={15} />
                      <span>{isReadingFiles ? 'Preparing documents…' : 'Review and save to My Cases'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 3: SYMPTOM PROGRESSION & DYNAMICS (DEDICATED ONBOARDING SCREEN)      */}
            {/* ========================================================================= */}
            {intakeStep === 3 && (
              <div key="step3">
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.96)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: isMobile ? '20px 16px' : '28px 28px',
                    border: '1.5px solid #F4F4F5',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      style={{ 
                        width: '42px', 
                        height: '42px', 
                        borderRadius: '14px', 
                        background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', 
                        border: '1px solid #FCD34D',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#D97706',
                        flexShrink: 0
                      }}
                    >
                      <Activity size={22} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#18181B', margin: 0 }}>
                        Symptom Dynamics & Trajectory
                      </h2>
                      <p style={{ fontSize: '13px', color: '#64748B', margin: 0, marginTop: '2px' }}>
                        Progression pattern helps clinicians evaluate trajectory and urgency
                      </p>
                    </div>
                  </div>

                  {/* 4 Distinct Trend Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
                    {[
                      { name: 'Getting worse ↗', label: 'Getting worse', emoji: '↗️', desc: 'Intensity or frequency is steadily increasing over time', activeBg: '#FFF1F2', activeBorder: '#FDA4AF', activeColor: '#BE123C' },
                      { name: 'Fluctuating / Comes & Goes ∿', label: 'Fluctuating', emoji: '∿', desc: 'Flares up intermittently with quiet symptom-free periods', activeBg: '#F5F3FF', activeBorder: '#DDD6FE', activeColor: '#7E22CE' },
                      { name: 'Constant / Unchanged →', label: 'Constant', emoji: '→', desc: 'Stays at the same steady level without clear change', activeBg: '#F8FAFC', activeBorder: '#CBD5E1', activeColor: '#334155' },
                      { name: 'Gradually improving ↘', label: 'Gradually improving', emoji: '↘️', desc: 'Severity is subsiding or symptoms are resolving', activeBg: '#ECFDF5', activeBorder: '#A7F3D0', activeColor: '#047857' },
                    ].map((opt) => {
                      const isSelected = selectedProgression === opt.name || history.includes(`Progression: ${opt.name}`);
                      return (
                        <motion.button
                          key={opt.name}
                          type="button"
                          aria-label={opt.name}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectProgression(opt.name)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 18px',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            border: isSelected ? `1.5px solid ${opt.activeBorder}` : '1px solid #E4E4E7',
                            background: isSelected ? opt.activeBg : '#FFFFFF',
                            boxShadow: isSelected ? '0 2px 10px rgba(0, 0, 0, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '20px' }}>{opt.emoji}</span>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: isSelected ? opt.activeColor : '#18181B' }}>
                                {opt.name}
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                                {opt.desc}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check size={16} color={opt.activeColor} strokeWidth={2.5} />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3 Action Bar */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap', 
                    gap: '12px', 
                    paddingTop: '16px', 
                    borderTop: '1px solid #F4F4F5' 
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(2);
                    }}
                    style={{
                      padding: '11px 18px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      border: '1px solid #E4E4E7',
                      cursor: 'pointer'
                    }}
                  >
                    ← Back to Timeline
                  </button>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setIntakeStep(4);
                      }}
                      style={{
                        padding: '11px 22px',
                        borderRadius: '12px',
                        background: '#FFF1F2',
                        color: '#BE123C',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        border: '1.5px solid #FECDD3',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>Next: Tell Your Story (Step 4)</span>
                      <ArrowRight size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={handleRunInvestigation}
                      disabled={isReadingFiles || (!history.trim() && !files.length)}
                      style={{
                        padding: '11px 22px',
                        borderRadius: '12px',
                        background: (isReadingFiles || (!history.trim() && !files.length)) ? '#E4E4E7' : 'linear-gradient(135deg, #E11D48 0%, #DE3558 50%, #BE123C 100%)',
                        color: (isReadingFiles || (!history.trim() && !files.length)) ? '#A1A1AA' : '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        border: 'none',
                        cursor: (isReadingFiles || (!history.trim() && !files.length)) ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: (isReadingFiles || (!history.trim() && !files.length)) ? 'none' : '0 6px 18px rgba(225, 29, 72, 0.3)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Sparkles size={15} />
                      <span>{isReadingFiles ? 'Preparing documents…' : 'Review and save to My Cases'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 4: CLINICAL STORY & NARRATIVE CANVAS (DEDICATED ONBOARDING SCREEN)  */}
            {/* ========================================================================= */}
            {intakeStep === 4 && (
              <div key="step4">
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.96)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: isMobile ? '20px 16px' : '26px 28px',
                    border: '1.5px solid #F4F4F5',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div 
                        style={{ 
                          width: '42px', 
                          height: '42px', 
                          borderRadius: '14px', 
                          background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)', 
                          border: '1px solid #FECDD3',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: '#E11D48',
                          flexShrink: 0
                        }}
                      >
                        <FileText size={22} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#18181B', margin: 0 }}>
                          Clinical Story & Timeline Notes
                        </h2>
                        <p style={{ fontSize: '13px', color: '#64748B', margin: 0, marginTop: '2px' }}>
                          Your timeline narrative, symptom sensations, and questions in your own voice
                        </p>
                      </div>
                    </div>

                    <span 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        color: (history.trim().split(/\s+/).filter(w => w.length > 0).length >= 800) 
                          ? '#EF4444' 
                          : (history.trim().split(/\s+/).filter(w => w.length > 0).length > 650)
                          ? '#D97706'
                          : '#BE123C',
                        background: '#FFF1F2',
                        border: '1px solid #FECDD3',
                        padding: '4px 10px',
                        borderRadius: '999px'
                      }}
                    >
                      {history.trim().split(/\s+/).filter(w => w.length > 0).length} / 800 words
                    </span>
                  </div>

                  {/* Magic Prompt Pills */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#BE123C', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={12} color="#E11D48" />
                      <span>Tap to insert structured clinical prompts:</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                      {[
                        { label: 'Onset & Duration', emoji: '⏱️', text: 'When this started and how it has changed: ' },
                        { label: 'Symptoms & Frequency', emoji: '🩺', text: 'Symptoms I have noticed, how often they happen, and daily impact: ' },
                        { label: 'Triggers & Relief', emoji: '⚡', text: 'Things that seem to improve or worsen symptoms: ' },
                        { label: 'Prior Tests & Care', emoji: '📋', text: 'Appointments, tests, treatments, and prior doctor opinions: ' },
                        { label: 'Questions for Doctor', emoji: '❓', text: 'What I most want help understanding from my clinician: ' }
                      ].map((cluster, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => {
                            triggerHapticSelection();
                            setHistory(prev => prev ? `${prev}\n\n${cluster.text}` : cluster.text);
                          }}
                          style={{
                            flexShrink: 0,
                            padding: '7px 13px',
                            borderRadius: '999px',
                            background: '#FFFFFF',
                            border: '1px solid #E4E4E7',
                            color: '#27272A',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#FFF1F2';
                            e.currentTarget.style.borderColor = '#FDA4AF';
                            e.currentTarget.style.color = '#BE123C';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = '#FFFFFF';
                            e.currentTarget.style.borderColor = '#E4E4E7';
                            e.currentTarget.style.color = '#27272A';
                          }}
                        >
                          <span>{cluster.emoji}</span>
                          <span>{cluster.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frosted Textarea with Raspberry Focus */}
                  <textarea 
                    id="clinical-timeline"
                    value={history}
                    onChange={(e) => {
                      const text = e.target.value;
                      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
                      if (words.length <= 800 || text.length < history.length) {
                        setHistory(text);
                      }
                    }}
                    placeholder="Describe when this started, how symptoms feel, what makes them better or worse, or prior doctor opinions (Max 800 words)..."
                    aria-label="Clinical timeline and symptom notes"
                    style={{ 
                      width: '100%', 
                      height: '210px', 
                      padding: '18px', 
                      borderRadius: '16px', 
                      border: '1.5px solid #E4E4E7', 
                      resize: 'vertical', 
                      fontSize: '14px', 
                      fontFamily: 'inherit', 
                      background: '#FFFFFF', 
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease', 
                      outline: 'none',
                      lineHeight: 1.6,
                      color: '#18181B'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#E11D48';
                      e.target.style.boxShadow = '0 0 0 3px rgba(225, 29, 72, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E4E4E7';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Step 4 Action Bar */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap', 
                    gap: '12px', 
                    paddingTop: '16px', 
                    borderTop: '1px solid #F4F4F5' 
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(3);
                    }}
                    style={{
                      padding: '11px 18px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      border: '1px solid #E4E4E7',
                      cursor: 'pointer'
                    }}
                  >
                    ← Back to Pattern
                  </button>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setIntakeStep(5);
                      }}
                      style={{
                        padding: '11px 22px',
                        borderRadius: '12px',
                        background: '#FFF1F2',
                        color: '#BE123C',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        border: '1.5px solid #FECDD3',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>Next: Add Evidence (Step 5)</span>
                      <ArrowRight size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={handleRunInvestigation}
                      disabled={isReadingFiles || (!history.trim() && !files.length)}
                      style={{
                        padding: '11px 22px',
                        borderRadius: '12px',
                        background: (isReadingFiles || (!history.trim() && !files.length)) ? '#E4E4E7' : 'linear-gradient(135deg, #E11D48 0%, #DE3558 50%, #BE123C 100%)',
                        color: (isReadingFiles || (!history.trim() && !files.length)) ? '#A1A1AA' : '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        border: 'none',
                        cursor: (isReadingFiles || (!history.trim() && !files.length)) ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: (isReadingFiles || (!history.trim() && !files.length)) ? 'none' : '0 6px 18px rgba(225, 29, 72, 0.3)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Sparkles size={15} />
                      <span>{isReadingFiles ? 'Preparing documents…' : 'Review and save to My Cases'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}


            {/* ========================================================================= */}
            {/* STEP 5: LAB & EVIDENCE VAULT                                              */}
            {/* ========================================================================= */}
            {intakeStep === 5 && (
              <div key="step5">
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.96)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: isMobile ? '18px 16px' : '24px 28px',
                    border: '1.5px solid #F4F4F5',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div 
                      style={{ 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '12px', 
                        background: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)', 
                        border: '1px solid #FDA4AF',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#E11D48',
                        flexShrink: 0
                      }}
                    >
                      <UploadCloud size={20} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#18181B', margin: 0 }}>
                        Uploaded Evidence & Panels
                      </h2>
                      <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                        Upload PDFs, lab panels, or discharge summaries. The engine extracts documented facts and audits contradictions.
                      </p>
                    </div>
                  </div>

                  {/* Upload Dropzone */}
                  <div style={{ marginBottom: '18px' }}>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileSelect} 
                      multiple 
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      aria-label="Upload medical records, lab reports, or health documents"
                      style={{ display: 'none' }} 
                    />

                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Upload PDFs or photos of medical records"
                      style={{ 
                        width: '100%', 
                        padding: '28px 20px', 
                        background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF5F6 100%)', 
                        border: '2px dashed #FDA4AF', 
                        borderRadius: '18px', 
                        color: '#BE123C', 
                        fontWeight: 700, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '12px', 
                        cursor: 'pointer', 
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(225, 29, 72, 0.04)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = '#E11D48';
                        e.currentTarget.style.background = '#FFF1F2';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = '#FDA4AF';
                        e.currentTarget.style.background = 'linear-gradient(135deg, #FFFFFF 0%, #FFF5F6 100%)';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#FFE4E6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.2)' }}>
                        <UploadCloud size={25} color="#E11D48" />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '15px', color: '#18181B', display: 'block', fontWeight: 800 }}>
                          Drop Lab Reports, Discharge Summaries, or Imaging
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '3px', display: 'block' }}>
                          PDF, JPG, PNG or WebP · up to 10 files · 3 MB per file
                        </span>
                      </div>
                      <div style={{ display: 'inline-flex', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#BE123C', background: '#FFF1F2', border: '1px solid #FECDD3', padding: '3px 9px', borderRadius: '999px' }}>📄 PDF Lab Panels</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#BE123C', background: '#FFF1F2', border: '1px solid #FECDD3', padding: '3px 9px', borderRadius: '999px' }}>📸 Photos & Scans</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#BE123C', background: '#FFF1F2', border: '1px solid #FECDD3', padding: '3px 9px', borderRadius: '999px' }}>🔬 Imaging Reports</span>
                      </div>
                    </button>
                  </div>

                  {/* Uploaded Staged File List */}
                  {files.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                      <div style={{
                        padding: '8px 14px',
                        background: '#FFF1F2',
                        border: '1px solid #FECDD3',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#9F1239',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <ShieldCheck size={16} color="#E11D48" />
                        <span><strong>{files.length} document(s) staged.</strong> Original files are encrypted on your local device.</span>
                      </div>
                      {files.map((f, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            padding: '10px 14px', 
                            background: '#FFFFFF', 
                            border: '1px solid #E4E4E7', 
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#FFF1F2', border: '1px solid #FECDD3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <FileText size={15} color="#E11D48" />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#18181B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {f.file.name}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748B', flexShrink: 0 }}>
                              ({Math.round(f.size / 1024)} KB)
                            </span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeFile(idx)} 
                            aria-label={`Remove uploaded file ${f.file.name}`} 
                            style={{ 
                              background: '#F8FAFC', 
                              border: '1px solid #E4E4E7', 
                              borderRadius: '8px', 
                              color: '#64748B', 
                              cursor: 'pointer', 
                              padding: '6px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              transition: 'all 0.15s ease' 
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.color = '#E11D48';
                              e.currentTarget.style.borderColor = '#FDA4AF';
                              e.currentTarget.style.background = '#FFF1F2';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.color = '#64748B';
                              e.currentTarget.style.borderColor = '#E4E4E7';
                              e.currentTarget.style.background = '#F8FAFC';
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '12px 16px', background: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '12px', fontSize: '12px', color: '#64748B', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A1A1AA', display: 'inline-block' }} />
                      <span>No documents attached yet. If you have lab panels or scans, upload them above for extraction.</span>
                    </div>
                  )}

                  {/* Existing Connected Case Documents */}
                  {(() => {
                    const activeCase = selectedCaseId ? getCase(selectedCaseId) : null;
                    if (!activeCase?.medicalRecords || activeCase.medicalRecords.length === 0) return null;
                    return (
                      <div style={{ borderTop: '1px solid #F4F4F5', paddingTop: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#BE123C', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Connected Case Records ({activeCase.medicalRecords.length})
                          </span>
                          <span style={{ fontSize: '11px', color: '#BE123C', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldCheck size={12} color="#E11D48" /> Stored on device
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {activeCase.medicalRecords.map((rec) => (
                            <div
                              key={rec.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '9px 12px',
                                background: '#FFFFFF',
                                border: '1px solid #E4E4E7',
                                borderRadius: '10px',
                                fontSize: '12px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                <FileText size={14} color="#E11D48" />
                                <span style={{ fontWeight: 600, color: '#18181B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                                  {rec.filename}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHapticLight();
                                  setSourceModalData({
                                    isOpen: true,
                                    onClose: () => setSourceModalData(null),
                                    caseId: activeCase.id,
                                    recordId: rec.id,
                                    findingId: rec.passages?.[0]?.id,
                                    recordTitle: rec.filename,
                                    recordType: rec.type,
                                    pageNumber: rec.passages?.[0]?.page,
                                    passageText: rec.passages?.[0]?.text || rec.findings || 'No passage text available',
                                    fullFindings: rec.findings,
                                    dateAdded: rec.addedAt,
                                    findingClaim: rec.findings,
                                    onCorrectionSaved: () => {
                                      toast.success('Document Extraction Updated', 'Non-destructive correction recorded in case.');
                                    }
                                  });
                                }}
                                style={{
                                  background: '#FFF1F2',
                                  border: '1px solid #FECDD3',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  color: '#BE123C',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Review Extractions ↗
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Step 2 Action Bar */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap', 
                    gap: '12px', 
                    paddingTop: '16px', 
                    borderTop: '1px solid #F4F4F5' 
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(4);
                    }}
                    style={{
                      padding: '11px 18px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      border: '1px solid #E4E4E7',
                      cursor: 'pointer'
                    }}
                  >
                    ← Back to Story
                  </button>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setIntakeStep(6);
                      }}
                      style={{
                        padding: '11px 22px',
                        borderRadius: '12px',
                        background: '#FFF1F2',
                        color: '#BE123C',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        border: '1.5px solid #FECDD3',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>Next: Scope & Run (Step 6)</span>
                      <ArrowRight size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={handleRunInvestigation}
                      disabled={isReadingFiles || (!history.trim() && !files.length)}
                      style={{
                        padding: '11px 22px',
                        borderRadius: '12px',
                        background: (isReadingFiles || (!history.trim() && !files.length)) ? '#E4E4E7' : 'linear-gradient(135deg, #E11D48 0%, #DE3558 50%, #BE123C 100%)',
                        color: (isReadingFiles || (!history.trim() && !files.length)) ? '#A1A1AA' : '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        border: 'none',
                        cursor: (isReadingFiles || (!history.trim() && !files.length)) ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: (isReadingFiles || (!history.trim() && !files.length)) ? 'none' : '0 6px 18px rgba(225, 29, 72, 0.3)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Sparkles size={15} />
                      <span>{isReadingFiles ? 'Preparing documents…' : 'Review and save to My Cases'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 6: REVIEW SCOPE, CASE ROUTING & LAUNCHPAD                            */}
            {/* ========================================================================= */}
            {intakeStep === 6 && (
              <div key="step6">
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.96)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: isMobile ? '18px 16px' : '24px 28px',
                    border: '1.5px solid #F4F4F5',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div 
                      style={{ 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '12px', 
                        background: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)', 
                        border: '1px solid #FDA4AF',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#E11D48',
                        flexShrink: 0
                      }}
                    >
                      <Sliders size={20} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#18181B', margin: 0 }}>
                        Review Scope & Destination
                      </h2>
                      <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                        Confirm evidence readiness, case routing, and launch your multisystem clinical review.
                      </p>
                    </div>
                  </div>

                  {/* Evidence Readiness Checklist Card */}
                  <div 
                    style={{ 
                      marginBottom: '18px', 
                      padding: '16px 18px', 
                      background: '#FAFAFA', 
                      border: '1px solid #E4E4E7', 
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#BE123C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Evidence Readiness Checklist
                    </span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                      <div style={{ padding: '10px 12px', background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Clinical Timeline</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: (selectedSymptoms.length > 0 || history.trim()) ? '#E11D48' : '#64748B', marginTop: '2px' }}>
                          {(selectedSymptoms.length > 0 || history.trim()) ? `✓ ${selectedSymptoms.length > 0 ? `${selectedSymptoms.length} symptom(s)` : `${history.trim().split(/\s+/).filter(w => w.length > 0).length} words`}` : '○ No notes (records only)'}
                        </div>
                      </div>

                      <div style={{ padding: '10px 12px', background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Attached Evidence</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: files.length > 0 ? '#E11D48' : '#64748B', marginTop: '2px' }}>
                          {files.length > 0 ? `✓ ${files.length} document(s) staged` : '○ No files (timeline only)'}
                        </div>
                      </div>

                      <div style={{ padding: '10px 12px', background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Destination Case</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: selectedCaseId ? '#BE123C' : '#18181B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {selectedCaseId ? '✓ Existing Timeline' : '✓ New Case Draft'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Case Destination Workspace Dock */}
                  <div 
                    style={{ 
                      marginBottom: '18px',
                      padding: '16px 18px',
                      background: '#FFFFFF',
                      border: '1.5px solid #E4E4E7',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#FFF1F2', border: '1px solid #FECDD3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Folder size={15} color="#E11D48" />
                        </div>
                        <div>
                          <label htmlFor="engine-case-context" style={{ fontWeight: 800, fontSize: '13.5px', color: '#18181B', display: 'block' }}>
                            Save to
                          </label>
                        </div>
                      </div>
                      <span style={{ fontSize: '11.5px', color: selectedCaseId ? '#BE123C' : '#64748B', fontWeight: 700 }}>
                        {selectedCaseId ? 'Connected to Case Timeline' : 'New Longitudinal Case'}
                      </span>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <select 
                        id="engine-case-context" 
                        aria-label="Where should this review be saved?" 
                        value={selectedCaseId} 
                        onChange={e => setSelectedCaseId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 36px 10px 14px',
                          borderRadius: '12px',
                          border: '1.5px solid #E4E4E7',
                          background: '#FFFFFF',
                          color: '#18181B',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          appearance: 'none',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#E11D48';
                          e.target.style.boxShadow = '0 0 0 3px rgba(225, 29, 72, 0.12)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#E4E4E7';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">Start a new case</option>
                        {availableCases.filter(item => item.status !== 'archived').map(item => (
                          <option key={item.id} value={item.id}>
                            {item.title}
                          </option>
                        ))}
                      </select>
                      <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }}>
                        <ChevronDown size={16} />
                      </div>
                    </div>

                    <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                      {selectedCaseId ? 'Uses this case’s saved context.' : 'Creates a new case.'} Starting a review sends the included information to the AI service.
                    </p>
                    {isReadingFiles && (
                      <p role="status" style={{ fontSize: 12, color: '#E11D48', fontWeight: 700, margin: 0 }}>
                        Preparing your documents… Please wait before starting the review.
                      </p>
                    )}
                  </div>

                  {/* Review Objective Focus */}
                  <div style={{ marginBottom: '18px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#BE123C', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                      Clinical Objective Focus
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'differential', label: 'Differential Diagnosis', desc: 'Multisystem scan for primary & alternative hypotheses' },
                        { id: 'doctor_prep', label: 'Doctor Visit Prep (SBAR)', desc: 'Prioritize questions and appointment briefing notes' },
                        { id: 'lab_second_opinion', label: 'Biomarker Synthesis', desc: 'Cross-reference lab ranges and contradictory findings' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            triggerHapticSelection();
                            setReviewFocus(opt.id as any);
                          }}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '14px',
                            textAlign: 'left',
                            border: reviewFocus === opt.id ? '1.5px solid #E11D48' : '1px solid #E4E4E7',
                            background: reviewFocus === opt.id ? '#FFF5F6' : '#FFFFFF',
                            boxShadow: reviewFocus === opt.id ? '0 2px 8px rgba(225, 29, 72, 0.12)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ fontSize: '12.5px', fontWeight: 800, color: reviewFocus === opt.id ? '#BE123C' : '#18181B' }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', lineHeight: 1.35 }}>
                            {opt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Isolated Investigation Toggle */}
                  {profile?.conditions && profile.conditions.length > 0 ? (
                    <div 
                      style={{ 
                        padding: '14px 18px', 
                        background: '#FAFAFA', 
                        border: '1px solid #E4E4E7', 
                        borderRadius: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        flexWrap: 'wrap', 
                        gap: '12px' 
                      }}
                    >
                      <div style={{ flex: '1 1 240px' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#18181B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sliders size={14} color="#E11D48" />
                          <span>Isolated Investigation Mode</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                          {isIsolated 
                            ? 'Analyzes strictly what you typed and uploaded above (ignores background profile conditions).' 
                            : 'Correlates your input with your known medical profile conditions.'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHapticSelection();
                          setIsIsolated(!isIsolated);
                        }}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '10px',
                          border: isIsolated ? '1.5px solid #E11D48' : '1px solid #E4E4E7',
                          background: isIsolated ? '#FFF1F2' : '#FFFFFF',
                          color: isIsolated ? '#BE123C' : '#475569',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isIsolated ? '✓ Isolated (On)' : 'Correlate Profile (Default)'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '12px', fontSize: '12px', color: '#64748B' }}>
                      <span>No background profile conditions recorded. The review will analyze direct case inputs.</span>
                    </div>
                  )}
                </div>

                {/* Step 3 Action Bar & Primary Launch CTA */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap', 
                    gap: '14px', 
                    paddingTop: '16px', 
                    borderTop: '1px solid #F4F4F5' 
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(5);
                    }}
                    style={{
                      padding: '14px 20px',
                      borderRadius: '14px',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '14px',
                      border: '1px solid #E4E4E7',
                      cursor: 'pointer'
                    }}
                  >
                    ← Back to Evidence
                  </button>

                  <button
                    type="button"
                    onClick={handleRunInvestigation}
                    disabled={isReadingFiles || (!history.trim() && !files.length)}
                    style={{
                      flex: '1 1 280px',
                      padding: '16px 28px',
                      borderRadius: '16px',
                      border: 'none',
                      background: (isReadingFiles || (!history.trim() && !files.length))
                        ? '#E4E4E7'
                        : 'linear-gradient(135deg, #E11D48 0%, #DE3558 50%, #BE123C 100%)',
                      color: (isReadingFiles || (!history.trim() && !files.length))
                        ? '#A1A1AA'
                        : '#FFFFFF',
                      fontSize: '15.5px',
                      fontWeight: 800,
                      cursor: (isReadingFiles || (!history.trim() && !files.length)) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: (isReadingFiles || (!history.trim() && !files.length))
                        ? 'none'
                        : '0 10px 30px -4px rgba(225, 29, 72, 0.4)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseDown={(e) => {
                      if (!isReadingFiles && (history.trim() || files.length)) {
                        e.currentTarget.style.transform = 'scale(0.99)';
                      }
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <Sparkles size={18} />
                    <span>{isReadingFiles ? 'Preparing documents…' : 'Review and save to My Cases'}</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

        </div>
      </div>

      {sourceModalData && (
        <SourcePassageModal
          caseId={createdCaseId || selectedCaseId}
          {...sourceModalData}
          isOpen={Boolean(sourceModalData)}
          onClose={() => setSourceModalData(null)}
        />
      )}
    </div>
  );
}










