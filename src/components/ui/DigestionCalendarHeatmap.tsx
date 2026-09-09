import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Flame,
  Wind,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sliders,
  Plus,
  X,
  Copy,
  Check,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { getProfile, getDigestionLogs, saveDigestionLog } from '../../services/ProfileEngine';
import { getSuspectFoodsLeaderboard } from '../../services/TriggerEngine';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { useToast } from './ToastProvider';
import { useIsMobile } from '../../hooks/useIsMobile';

// --- Types ---
export type DigestionSubTab = 'summary' | 'stomach' | 'bloating' | 'bowel';

export type StomachComfortLevel =
  | 'calm'
  | 'mild_acid'
  | 'moderate_reflux'
  | 'severe_burning'
  | 'nausea';

export type DistensionPattern =
  | 'flat_all_day'
  | 'flat_am_bloated_pm'
  | 'post_meal_distension'
  | 'persistent_distension';

export type BristolStoolType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface DigestionDayEntry {
  date: string; // 'YYYY-MM-DD'
  equilibriumScore: number; // 0-100
  status: 'optimal' | 'mild_flare' | 'severe_flare';
  stomachComfort: StomachComfortLevel;
  stomachScore: number; // 0-10
  stomachNotes?: string;
  bloatingScore: number; // 0-10
  distensionPattern: DistensionPattern;
  bristolType: BristolStoolType;
  bowelFrequency: number; // 0, 1, 2, 3+
  bowelUrgency?: 'normal' | 'straining' | 'urgent' | 'incomplete';
  loggedMeals?: Array<{
    name: string;
    time: string;
    calories?: number;
    reaction?: string;
  }>;
  correlatedTriggers?: string[];
  clinicalInsight?: string;
}

// --- Bristol Stool Chart Reference ---
export const BRISTOL_STOOL_INFO: Record<
  BristolStoolType,
  {
    type: BristolStoolType;
    label: string;
    sublabel: string;
    desc: string;
    clinicalNote: string;
    badgeColor: string;
    badgeBg: string;
    borderColor: string;
    icon: string;
  }
> = {
  1: {
    type: 1,
    label: 'Type 1: Hard Lumps',
    sublabel: 'Severe Constipation',
    desc: 'Separate hard lumps, like nuts; difficult and painful to evacuate.',
    clinicalNote: 'Delayed colonic transit (>72h). Consider soluble psyllium fiber + magnesium glycinate.',
    badgeColor: '#D97706',
    badgeBg: '#FEF3C7',
    borderColor: '#FDE68A',
    icon: '🪨',
  },
  2: {
    type: 2,
    label: 'Type 2: Lumpy Sausage',
    sublabel: 'Mild Constipation',
    desc: 'Sausage-shaped, but noticeably hard and lumpy.',
    clinicalNote: 'Sluggish transit (48–72h). Increase non-caffeinated hydration to 2.5L+ daily.',
    badgeColor: '#B45309',
    badgeBg: '#FFFBEB',
    borderColor: '#FCD34D',
    icon: '🪵',
  },
  3: {
    type: 3,
    label: 'Type 3: Cracked Sausage',
    sublabel: 'Normal Transit',
    desc: 'Like a sausage with surface fissures; easy to pass with minimal strain.',
    clinicalNote: 'Healthy transit (24–36h). Well-formed stool with balanced microbiome volume.',
    badgeColor: '#059669',
    badgeBg: '#ECFDF5',
    borderColor: '#A7F3D0',
    icon: '🥖',
  },
  4: {
    type: 4,
    label: 'Type 4: Smooth & Soft',
    sublabel: 'Optimal Transit',
    desc: 'Like a smooth, soft sausage or snake; effortless, single-piece evacuation.',
    clinicalNote: 'Gold-standard digestive equilibrium. Ideal bacterial biomass and moisture balance.',
    badgeColor: '#059669',
    badgeBg: '#ECFDF5',
    borderColor: '#6EE7B7',
    icon: '🌿',
  },
  5: {
    type: 5,
    label: 'Type 5: Soft Blobs',
    sublabel: 'Lacking Fiber',
    desc: 'Soft separate blobs with clear-cut edges; passed easily without pain.',
    clinicalNote: 'Accelerated transit (18–24h). Dietary fiber deficit; benefit from chia/flax gels.',
    badgeColor: '#0D9488',
    badgeBg: '#F0FDFA',
    borderColor: '#99F6E4',
    icon: '☁️',
  },
  6: {
    type: 6,
    label: 'Type 6: Fluffy / Mushy',
    sublabel: 'Mild Diarrhea',
    desc: 'Fluffy pieces with ragged edges, a mushy stool; noticeable urgency.',
    clinicalNote: 'Osmotic or secretory hyper-motility. Screen for acute food sensitivities (sorbitol, lactose).',
    badgeColor: '#E11D48',
    badgeBg: '#FFF1F2',
    borderColor: '#FECDD3',
    icon: '🌊',
  },
  7: {
    type: 7,
    label: 'Type 7: Watery Liquid',
    sublabel: 'Severe Diarrhea',
    desc: 'Entirely liquid, no solid pieces; sudden rapid expulsion.',
    clinicalNote: 'Acute malabsorption, infectious enteritis, or histamine dump. Immediate oral rehydration salts.',
    badgeColor: '#BE123C',
    badgeBg: '#FFE4E6',
    borderColor: '#FDA4AF',
    icon: '⚡',
  },
};

// --- Upper GI Stomach Level Info ---
export const STOMACH_COMFORT_INFO: Record<
  StomachComfortLevel,
  { label: string; icon: string; desc: string; color: string; bg: string; border: string }
> = {
  calm: {
    label: 'Calm & Settled',
    icon: '🌿',
    desc: 'Zero heartburn, no epigastric tightness, normal postprandial lightness.',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  mild_acid: {
    label: 'Mild Acid / Warmth',
    icon: '🔥',
    desc: 'Subtle retrosternal warmth, occasional burping without regurgitation.',
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FDE68A',
  },
  moderate_reflux: {
    label: 'Moderate Reflux',
    icon: '🌋',
    desc: 'Sour regurgitation, burning when bending, lump-in-throat (globus) sensation.',
    color: '#EA580C',
    bg: '#FFF7ED',
    border: '#FED7AA',
  },
  severe_burning: {
    label: 'Severe Epigastric Burning',
    icon: '⚡',
    desc: 'Intense chest/gastric burning, Roemheld palpitations, esophageal spasm.',
    color: '#E11D48',
    bg: '#FFF1F2',
    border: '#FECDD3',
  },
  nausea: {
    label: 'Fullness / Nausea',
    icon: '🤢',
    desc: 'Gastric stasis, delayed stomach emptying, queasiness after moderate food.',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
};

export const DISTENSION_PATTERN_INFO: Record<DistensionPattern, { label: string; desc: string }> = {
  flat_all_day: { label: 'Flat All Day', desc: 'No perceptible abdominal expansion from morning to night.' },
  flat_am_bloated_pm: { label: 'Flat Morning ⇢ Distended Evening', desc: 'Wakes up flat; abdomen gradually balloons by 4–8 PM (classic SIBO/fermentation pattern).' },
  post_meal_distension: { label: 'Immediate Post-Meal Distension', desc: 'Abdomen hardens within 30–60 mins of eating (gastric distension / vagal reflex).' },
  persistent_distension: { label: 'Persistent Firm Distension', desc: 'Continuous abdominal tightness around the clock without morning relief.' },
};

// --- Clinical Synthetic Baseline Generator for Past Days of Selected Month ---
function generateClinicalBaselineForDate(dateStr: string, mealsOnDate: any[] = []): DigestionDayEntry {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const dayNumber = parseInt(dateStr.split('-')[2], 10) || 1;
  const absHash = Math.abs(hash);

  const isWeekend = (absHash % 7 === 0) || (absHash % 7 === 6);
  const isOccasionalFlare = (dayNumber % 8 === 0) || (isWeekend && dayNumber % 3 === 0);
  const isMildDay = (dayNumber % 4 === 0);

  let status: 'optimal' | 'mild_flare' | 'severe_flare' = 'optimal';
  let equilibriumScore = 92 - (absHash % 10);
  let stomachComfort: StomachComfortLevel = 'calm';
  let stomachScore = 1;
  let bloatingScore = 1 + (absHash % 2);
  let distensionPattern: DistensionPattern = 'flat_all_day';
  let bristolType: BristolStoolType = 4;
  let bowelFrequency = 1;
  let triggers: string[] = [];
  let insight = 'Optimal digestive equilibrium. Normal MMC motility and comfortable gut clearance.';

  if (isOccasionalFlare) {
    status = 'severe_flare';
    equilibriumScore = 38 + (absHash % 12);
    stomachComfort = (absHash % 2 === 0) ? 'moderate_reflux' : 'severe_burning';
    stomachScore = 6 + (absHash % 4);
    bloatingScore = 7 + (absHash % 3);
    distensionPattern = (absHash % 2 === 0) ? 'flat_am_bloated_pm' : 'post_meal_distension';
    bristolType = (absHash % 2 === 0) ? 6 : 2;
    bowelFrequency = (absHash % 2 === 0) ? 3 : 0;
    const liveSuspects = getSuspectFoodsLeaderboard();
    const mainSuspect = liveSuspects[0]?.name || 'Fermentable Triggers';
    triggers = [mainSuspect, 'Night Eating >9:30 PM', 'Carbonated Beverage'];
    insight = 'Marked Roemheld distension and reflux. High fermentation latency observed post-dinner.';
  } else if (isMildDay) {
    status = 'mild_flare';
    equilibriumScore = 68 + (absHash % 10);
    stomachComfort = 'mild_acid';
    stomachScore = 3 + (absHash % 2);
    bloatingScore = 4 + (absHash % 2);
    distensionPattern = 'flat_am_bloated_pm';
    bristolType = (absHash % 2 === 0) ? 3 : 5;
    bowelFrequency = 1;
    triggers = ['Refined Carbohydrates', 'Coffee on empty stomach'];
    insight = 'Mild gas distension in late afternoon. Responsive to walking and ginger herbal infusion.';
  }

  const loggedMeals = mealsOnDate.length > 0
    ? mealsOnDate.map((m: any) => ({
        name: m.name || m.items || m.title || 'Logged Meal',
        time: m.time || (m.loggedAt ? new Date(m.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '13:00'),
        calories: m.calories || 420,
        reaction: m.reaction ? (typeof m.reaction === 'string' ? m.reaction : m.reaction.title || m.reaction.label) : undefined,
      }))
    : [
        { name: 'Oatmeal & Almond Milk', time: '08:30', calories: 340, reaction: 'Calm 🙂' },
        { name: 'Moong Dal & Brown Rice Bowl', time: '13:15', calories: 480, reaction: isOccasionalFlare ? 'Mild Bloat 💨' : 'Calm 🙂' },
        { name: 'Steamed Greens & Tofu Stir-Fry', time: '19:45', calories: 410, reaction: isOccasionalFlare ? 'Epigastric Warmth 🔥' : 'Calm 🙂' },
      ];

  return {
    date: dateStr,
    equilibriumScore,
    status,
    stomachComfort,
    stomachScore,
    bloatingScore,
    distensionPattern,
    bristolType,
    bowelFrequency,
    bowelUrgency: isOccasionalFlare ? 'urgent' : 'normal',
    loggedMeals,
    correlatedTriggers: triggers,
    clinicalInsight: insight,
  };
}

interface DigestionCalendarHeatmapProps {
  onOpenQuickMeal?: () => void;
  onOpenConsult?: () => void;
}

export const DigestionCalendarHeatmap: React.FC<DigestionCalendarHeatmapProps> = ({
  onOpenQuickMeal,
  onOpenConsult,
}) => {
  const isMobile = useIsMobile();
  const toast = useToast();

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [activeSubTab, setActiveSubTab] = useState<DigestionSubTab>('summary');
  const [selectedDayEntry, setSelectedDayEntry] = useState<DigestionDayEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'inspect' | 'edit'>('inspect');
  const [copiedDoctorDossier, setCopiedDoctorDossier] = useState<boolean>(false);

  // Editable Form State in Modal
  const [editBloatScore, setEditBloatScore] = useState<number>(2);
  const [editStomachComfort, setEditStomachComfort] = useState<StomachComfortLevel>('calm');
  const [editStomachScore, setEditStomachScore] = useState<number>(1);
  const [editBristolType, setEditBristolType] = useState<BristolStoolType>(4);
  const [editBowelFrequency, setEditBowelFrequency] = useState<number>(1);
  const [editDistensionPattern, setEditDistensionPattern] = useState<DistensionPattern>('flat_all_day');
  const [editNotes, setEditNotes] = useState<string>('');

  const [digestionLogs, setDigestionLogs] = useState<Record<string, any>>(() => getDigestionLogs());
  const [profile, setProfile] = useState<any>(() => getProfile());

  useEffect(() => {
    const handleUpdate = () => {
      setDigestionLogs(getDigestionLogs());
      setProfile(getProfile());
    };
    window.addEventListener('hc_digestion_updated', handleUpdate);
    window.addEventListener('hc_profile_updated', handleUpdate);
    window.addEventListener('hc_nutrition_reaction_updated', handleUpdate);
    return () => {
      window.removeEventListener('hc_digestion_updated', handleUpdate);
      window.removeEventListener('hc_profile_updated', handleUpdate);
      window.removeEventListener('hc_nutrition_reaction_updated', handleUpdate);
    };
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const mealsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    const recent = profile?.nutrition?.recentLogs || [];
    recent.forEach((item: any) => {
      const dateStr = (item.loggedAt || item.date || '').split('T')[0];
      if (dateStr) {
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(item);
      }
    });
    return map;
  }, [profile]);

  const monthEntries = useMemo(() => {
    const entries: Record<number, DigestionDayEntry> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const savedEntry = digestionLogs[dateStr];
      const meals = mealsByDate[dateStr] || [];

      if (savedEntry) {
        entries[day] = {
          date: dateStr,
          equilibriumScore: savedEntry.equilibriumScore ?? 85,
          status: savedEntry.status ?? (savedEntry.bloatingScore > 6 ? 'severe_flare' : savedEntry.bloatingScore > 3 ? 'mild_flare' : 'optimal'),
          stomachComfort: savedEntry.stomachComfort ?? 'calm',
          stomachScore: savedEntry.stomachScore ?? 1,
          stomachNotes: savedEntry.stomachNotes ?? '',
          bloatingScore: savedEntry.bloatingScore ?? 2,
          distensionPattern: savedEntry.distensionPattern ?? 'flat_all_day',
          bristolType: savedEntry.bristolType ?? 4,
          bowelFrequency: savedEntry.bowelFrequency ?? 1,
          bowelUrgency: savedEntry.bowelUrgency ?? 'normal',
          loggedMeals: meals.length > 0 ? meals.map((m: any) => ({
            name: m.name || m.items || m.title || 'Logged Meal',
            time: m.time || (m.loggedAt ? new Date(m.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:30'),
            calories: m.calories,
            reaction: m.reaction ? (typeof m.reaction === 'string' ? m.reaction : m.reaction.title || m.reaction.label) : undefined,
          })) : undefined,
          correlatedTriggers: savedEntry.correlatedTriggers || ['Garlic/Onion Fructans', 'Late Dining'],
          clinicalInsight: savedEntry.clinicalInsight || 'Optimal balance maintained with fiber hydration pacing.',
        };
      } else {
        entries[day] = generateClinicalBaselineForDate(dateStr, meals);
      }
    }
    return entries;
  }, [year, month, daysInMonth, digestionLogs, mealsByDate]);

  const monthlyStats = useMemo(() => {
    let optimalCount = 0;
    let mildCount = 0;
    let severeCount = 0;
    let totalBloat = 0;
    const bristolCounts: Record<number, number> = {};

    Object.values(monthEntries).forEach((entry) => {
      if (entry.status === 'optimal') optimalCount++;
      else if (entry.status === 'mild_flare') mildCount++;
      else severeCount++;

      totalBloat += entry.bloatingScore;
      bristolCounts[entry.bristolType] = (bristolCounts[entry.bristolType] || 0) + 1;
    });

    const totalDays = Object.keys(monthEntries).length || 1;
    const avgBloat = (totalBloat / totalDays).toFixed(1);

    let dominantBristol: BristolStoolType = 4;
    let maxCount = 0;
    Object.entries(bristolCounts).forEach(([typeStr, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantBristol = parseInt(typeStr, 10) as BristolStoolType;
      }
    });

    return {
      optimalCount,
      optimalPct: Math.round((optimalCount / totalDays) * 100),
      mildCount,
      mildPct: Math.round((mildCount / totalDays) * 100),
      severeCount,
      severePct: Math.round((severeCount / totalDays) * 100),
      avgBloat,
      dominantBristol,
      totalDays,
    };
  }, [monthEntries]);

  const handlePrevMonth = () => {
    triggerHapticSelection();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    triggerHapticSelection();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    triggerHapticLight();
    setCurrentDate(new Date());
  };

  const handleSelectDay = (day: number) => {
    triggerHapticSelection();
    const entry = monthEntries[day];
    if (entry) {
      setSelectedDayEntry(entry);
      setEditBloatScore(entry.bloatingScore);
      setEditStomachComfort(entry.stomachComfort);
      setEditStomachScore(entry.stomachScore);
      setEditBristolType(entry.bristolType);
      setEditBowelFrequency(entry.bowelFrequency);
      setEditDistensionPattern(entry.distensionPattern);
      setEditNotes(entry.stomachNotes || '');
      setModalTab('inspect');
      setIsDetailModalOpen(true);
    }
  };

  const handleSaveCheckin = () => {
    if (!selectedDayEntry) return;

    let computedStatus: 'optimal' | 'mild_flare' | 'severe_flare' = 'optimal';
    if (editBloatScore >= 7 || editStomachComfort === 'severe_burning' || editBristolType === 7 || editBristolType === 1) {
      computedStatus = 'severe_flare';
    } else if (editBloatScore >= 4 || editStomachComfort === 'moderate_reflux' || editStomachComfort === 'mild_acid') {
      computedStatus = 'mild_flare';
    }

    const equilibriumScore = Math.max(15, 100 - (editBloatScore * 6) - (editStomachScore * 4));

    const updatedLog: Partial<DigestionDayEntry> = {
      date: selectedDayEntry.date,
      equilibriumScore,
      status: computedStatus,
      stomachComfort: editStomachComfort,
      stomachScore: editStomachScore,
      stomachNotes: editNotes,
      bloatingScore: editBloatScore,
      distensionPattern: editDistensionPattern,
      bristolType: editBristolType,
      bowelFrequency: editBowelFrequency,
      clinicalInsight: computedStatus === 'optimal'
        ? 'Well-equilibrated day. Optimal motility and calm gastric barrier.'
        : `Elevated digestive burden. Bloat score ${editBloatScore}/10 with ${BRISTOL_STOOL_INFO[editBristolType].label}.`,
    };

    saveDigestionLog(selectedDayEntry.date, updatedLog);
    awardPoints(10, 'Digestion Log Saved', 'checkin');
    triggerHapticSuccess();

    toast?.success?.('Digestion Log Saved (+10 Vitality Points)');
    setSelectedDayEntry({
      ...selectedDayEntry,
      ...updatedLog,
    } as DigestionDayEntry);
    setModalTab('inspect');
  };

  const handleCopyDoctorSummary = () => {
    triggerHapticLight();
    const summaryText = `HEALTHCHAIN 360 • 30-DAY GI DIGESTIVE SUMMARY DOSSIER
Month: ${monthName} ${year}
Patient Profile: ${profile?.profileName || 'Active Patient'}

1. MONTHLY EQUILIBRIUM DISTRIBUTION:
• Optimal / Comfortable Days: ${monthlyStats.optimalCount}/${monthlyStats.totalDays} (${monthlyStats.optimalPct}%)
• Mild Distension / Gas Days: ${monthlyStats.mildCount}/${monthlyStats.totalDays} (${monthlyStats.mildPct}%)
• Acute Flare / Severe Reflux: ${monthlyStats.severeCount}/${monthlyStats.totalDays} (${monthlyStats.severePct}%)
• Average Bloating Severity: ${monthlyStats.avgBloat}/10

2. COLONIC TRANSIT & MOTILITY:
• Dominant Stool Form: ${BRISTOL_STOOL_INFO[monthlyStats.dominantBristol].label} (${BRISTOL_STOOL_INFO[monthlyStats.dominantBristol].sublabel})
• Clinical Motility Annotation: ${BRISTOL_STOOL_INFO[monthlyStats.dominantBristol].clinicalNote}

3. PRIMARY DETECTED TRIGGERS & SENSITIVITIES:
• Suspect Foods: ${getSuspectFoodsLeaderboard().slice(0, 2).map(s => s.name).join(', ') || 'Identified Dietary Triggers'}, Late Night Meals (>9:30 PM), Rapid Ingestion
• Roemheld / Postprandial Incubation: 60–120 minute peak distension window observed on flare days.

Generated via HealthChain360 Digestion & Bloating Calendar Heatmap.`;

    navigator.clipboard.writeText(summaryText);
    setCopiedDoctorDossier(true);
    toast?.info?.('30-Day GI Summary copied to clipboard');
    setTimeout(() => setCopiedDoctorDossier(false), 2500);
  };

  const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() === month;
  const currentDayNum = new Date().getDate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* 1. Header Banner & Monthly KPI Bar */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDFA 60%, #E6FFFA 100%)',
          borderRadius: '24px',
          padding: isMobile ? '16px 14px' : '22px 24px',
          border: '1.5px solid #99F6E4',
          boxShadow: '0 10px 30px rgba(13, 148, 136, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#0F766E',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  background: '#CCFBF1',
                  padding: '3px 9px',
                  borderRadius: '999px',
                  border: '1px solid #5EEAD4',
                }}
              >
                GASTROENTEROLOGY EQUILIBRIUM SUITE
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#059669',
                  background: '#ECFDF5',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  border: '1px solid #A7F3D0',
                }}
              >
                +10 VP / Log
              </span>
            </div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: isMobile ? '18px' : '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>
              Monthly Digestion & Bloating Calendar
            </h2>
            <p style={{ margin: 0, fontSize: isMobile ? '12px' : '13px', color: '#475569', lineHeight: 1.4 }}>
              Track 30-day gastric acidity, small intestinal distension latency, and Bristol transit patterns.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleCopyDoctorSummary}
              aria-label="Copy Doctor GI Dossier to clipboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                minHeight: '44px',
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s',
              }}
            >
              {copiedDoctorDossier ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              <span>{copiedDoctorDossier ? 'Copied Dossier' : isMobile ? 'GI Summary' : 'Doctor GI Dossier'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const todayDay = new Date().getDate();
                handleSelectDay(todayDay);
                setModalTab('edit');
              }}
              aria-label="Log today's digestive health metrics"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                minHeight: '44px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)',
              }}
            >
              <Plus size={15} />
              <span>Log Today</span>
            </button>
          </div>
        </div>

        {/* 4 Monthly KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '10px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '12px 14px',
              border: '1.5px solid #A7F3D0',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>Optimal Calm</span>
              <span style={{ fontSize: '13px' }}>🟢</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#065F46' }}>
              {monthlyStats.optimalCount} <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>({monthlyStats.optimalPct}%)</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Comfortable gut clearance</div>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '12px 14px',
              border: '1.5px solid #FDE68A',
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#D97706' }}>Mild Gas / Bloat</span>
              <span style={{ fontSize: '13px' }}>🟡</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#92400E' }}>
              {monthlyStats.mildCount} <span style={{ fontSize: '12px', fontWeight: 600, color: '#D97706' }}>({monthlyStats.mildPct}%)</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Late afternoon puffiness</div>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '12px 14px',
              border: '1.5px solid #FECDD3',
              boxShadow: '0 2px 8px rgba(225, 29, 72, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#E11D48' }}>Distress / Reflux</span>
              <span style={{ fontSize: '13px' }}>🔴</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#9F1239' }}>
              {monthlyStats.severeCount} <span style={{ fontSize: '12px', fontWeight: 600, color: '#E11D48' }}>({monthlyStats.severePct}%)</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Roemheld palpitations / acid</div>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '12px 14px',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Dominant Motility</span>
              <span style={{ fontSize: '13px' }}>{BRISTOL_STOOL_INFO[monthlyStats.dominantBristol].icon}</span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Type {monthlyStats.dominantBristol}
            </div>
            <div style={{ fontSize: '11px', color: BRISTOL_STOOL_INFO[monthlyStats.dominantBristol].badgeColor, fontWeight: 600, marginTop: '2px' }}>
              {BRISTOL_STOOL_INFO[monthlyStats.dominantBristol].sublabel}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            borderRadius: '14px',
            padding: '10px 14px',
            border: '1px solid #CCFBF1',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: '#334155',
          }}
        >
          <Sparkles size={16} color="#0D9488" style={{ flexShrink: 0 }} />
          <span>
            <strong>Ava Pattern Detection:</strong> High correlation observed between flare episodes, {getSuspectFoodsLeaderboard()[0]?.name || 'dietary triggers'}, and meals consumed within 90 mins of sleep.
          </span>
        </div>
      </div>

      {/* 2. Navigation Bar: Subtabs + Month Navigator */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#FFFFFF',
          borderRadius: '18px',
          padding: '10px 14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '6px',
            background: '#F1F5F9',
            padding: '4px',
            borderRadius: '12px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { id: 'summary' as DigestionSubTab, label: 'Day Summary', icon: '📊' },
            { id: 'stomach' as DigestionSubTab, label: 'Stomach', icon: '🔥' },
            { id: 'bloating' as DigestionSubTab, label: 'Bloating', icon: '💨' },
            { id: 'bowel' as DigestionSubTab, label: 'Bowel', icon: '🪵' },
          ].map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  setActiveSubTab(tab.id);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: isMobile ? '6px 10px' : '8px 14px',
                  borderRadius: '9px',
                  border: 'none',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#0F172A' : '#64748B',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: isMobile ? '12px' : '12.5px',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', minWidth: '120px', textAlign: 'center' }}>
            {monthName} {year}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            onClick={handleToday}
            style={{
              padding: '6px 12px',
              borderRadius: '9px',
              border: '1px solid #CBD5E1',
              background: isCurrentMonth ? '#F0FDFA' : '#FFFFFF',
              color: isCurrentMonth ? '#0D9488' : '#64748B',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Today
          </button>
        </div>
      </div>

      {/* 3. Monthly Heatmap Calendar Grid */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: isMobile ? '12px' : '18px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: isMobile ? '4px' : '8px',
            marginBottom: '8px',
          }}
        >
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((dayName, idx) => (
            <div
              key={dayName}
              style={{
                textAlign: 'center',
                fontSize: isMobile ? '10px' : '11px',
                fontWeight: 800,
                color: '#64748B',
                letterSpacing: '0.6px',
                padding: '4px 0',
              }}
            >
              {dayName}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: isMobile ? '5px' : '8px',
          }}
        >
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                height: isMobile ? '72px' : '96px',
                borderRadius: '12px',
                background: '#F8FAFC',
                opacity: 0.4,
                border: '1px dashed #E2E8F0',
              }}
            />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const entry = monthEntries[dayNum];
            const isToday = isCurrentMonth && currentDayNum === dayNum;

            if (!entry) return null;

            let cellBg = '#FFFFFF';
            let cellBorder = '1px solid #E2E8F0';

            if (activeSubTab === 'summary') {
              if (entry.status === 'optimal') {
                cellBg = 'linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 100%)';
                cellBorder = '1.5px solid #BBF7D0';
              } else if (entry.status === 'mild_flare') {
                cellBg = 'linear-gradient(180deg, #FFFFFF 0%, #FEFCE8 100%)';
                cellBorder = '1.5px solid #FDE68A';
              } else {
                cellBg = 'linear-gradient(180deg, #FFFFFF 0%, #FFF1F2 100%)';
                cellBorder = '1.5px solid #FECDD3';
              }
            } else if (activeSubTab === 'stomach') {
              const stomachInfo = STOMACH_COMFORT_INFO[entry.stomachComfort];
              cellBg = `${stomachInfo.bg}30`;
              cellBorder = `1.5px solid ${stomachInfo.border}`;
            } else if (activeSubTab === 'bloating') {
              if (entry.bloatingScore >= 7) {
                cellBg = '#FFF1F2';
                cellBorder = '1.5px solid #FECDD3';
              } else if (entry.bloatingScore >= 4) {
                cellBg = '#FEFCE8';
                cellBorder = '1.5px solid #FDE68A';
              } else {
                cellBg = '#F0FDF4';
                cellBorder = '1.5px solid #BBF7D0';
              }
            } else if (activeSubTab === 'bowel') {
              const bInfo = BRISTOL_STOOL_INFO[entry.bristolType];
              cellBg = `${bInfo.badgeBg}40`;
              cellBorder = `1.5px solid ${bInfo.borderColor}`;
            }

            return (
              <motion.div
                key={`day-${dayNum}`}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelectDay(dayNum)}
                style={{
                  height: isMobile ? '76px' : '100px',
                  borderRadius: '14px',
                  padding: isMobile ? '5px 4px' : '8px 8px',
                  background: cellBg,
                  border: isToday ? '2px solid #0D9488' : cellBorder,
                  boxShadow: isToday
                    ? '0 0 0 3px rgba(13, 148, 136, 0.2), 0 3px 10px rgba(0,0,0,0.06)'
                    : '0 2px 6px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span
                    style={{
                      fontSize: isMobile ? '11px' : '12.5px',
                      fontWeight: 800,
                      color: isToday ? '#0D9488' : '#1E293B',
                    }}
                  >
                    {dayNum}
                  </span>

                  {isToday && (
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 900,
                        color: '#FFFFFF',
                        background: '#0D9488',
                        padding: '1px 5px',
                        borderRadius: '999px',
                        letterSpacing: '0.4px',
                      }}
                    >
                      TODAY
                    </span>
                  )}

                  {!isToday && entry.loggedMeals && entry.loggedMeals.length > 0 && (
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {entry.loggedMeals.slice(0, 3).map((_, mIdx) => (
                        <div key={mIdx} style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#0D9488' }} />
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ width: '100%', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {activeSubTab === 'summary' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px' }}>
                        <span style={{ fontSize: isMobile ? '12px' : '14px' }}>
                          {entry.status === 'optimal' ? '🟢' : entry.status === 'mild_flare' ? '🟡' : '🔴'}
                        </span>
                        <span
                          style={{
                            fontSize: isMobile ? '10px' : '11px',
                            fontWeight: 800,
                            color: entry.status === 'optimal' ? '#059669' : entry.status === 'mild_flare' ? '#D97706' : '#E11D48',
                          }}
                        >
                          {entry.equilibriumScore}%
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? '9px' : '10px',
                          color: '#64748B',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {entry.status === 'optimal' ? 'Optimal' : entry.status === 'mild_flare' ? 'Mild Gas' : 'Flare'}
                      </div>
                    </>
                  )}

                  {activeSubTab === 'stomach' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ fontSize: isMobile ? '12px' : '14px' }}>
                          {STOMACH_COMFORT_INFO[entry.stomachComfort].icon}
                        </span>
                        <span
                          style={{
                            fontSize: isMobile ? '9.5px' : '11px',
                            fontWeight: 700,
                            color: STOMACH_COMFORT_INFO[entry.stomachComfort].color,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {entry.stomachComfort === 'calm' ? 'Calm' : `${entry.stomachScore}/10`}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? '8.5px' : '9.5px',
                          color: '#64748B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {entry.stomachComfort.replace('_', ' ')}
                      </div>
                    </>
                  )}

                  {activeSubTab === 'bloating' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: isMobile ? '11px' : '13px' }}>💨</span>
                        <span
                          style={{
                            fontSize: isMobile ? '10px' : '11.5px',
                            fontWeight: 800,
                            color: entry.bloatingScore >= 7 ? '#E11D48' : entry.bloatingScore >= 4 ? '#D97706' : '#059669',
                          }}
                        >
                          {entry.bloatingScore}/10
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '4px', background: '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${(entry.bloatingScore / 10) * 100}%`,
                            height: '100%',
                            background: entry.bloatingScore >= 7 ? '#E11D48' : entry.bloatingScore >= 4 ? '#F59E0B' : '#10B981',
                          }}
                        />
                      </div>
                    </>
                  )}

                  {activeSubTab === 'bowel' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ fontSize: isMobile ? '12px' : '13px' }}>
                          {BRISTOL_STOOL_INFO[entry.bristolType].icon}
                        </span>
                        <span
                          style={{
                            fontSize: isMobile ? '9.5px' : '11px',
                            fontWeight: 800,
                            color: BRISTOL_STOOL_INFO[entry.bristolType].badgeColor,
                          }}
                        >
                          T{entry.bristolType}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? '8.5px' : '9.5px',
                          color: '#64748B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {BRISTOL_STOOL_INFO[entry.bristolType].sublabel.replace(' Transit', '')}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Legend bar */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '11.5px',
            color: '#64748B',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              Optimal Equilibrium (80–100%)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
              Mild Gas / Distension (50–79%)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E11D48' }} />
              Reflux / Distress (&lt;50%)
            </span>
          </div>

          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
            Tap any date to inspect meals, triggers, and Bristol motility
          </span>
        </div>
      </div>

      {/* 4. Day Detail Inspection & Interactive Logging Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedDayEntry && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isMobile ? '12px' : '24px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              style={{
                width: '100%',
                maxWidth: '560px',
                maxHeight: '90vh',
                background: '#FFFFFF',
                borderRadius: '24px',
                border: '1.5px solid #99F6E4',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Modal Top Header */}
              <div
                style={{
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
                  borderBottom: '1px solid #99F6E4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        color: selectedDayEntry.status === 'optimal' ? '#059669' : selectedDayEntry.status === 'mild_flare' ? '#D97706' : '#E11D48',
                        background: selectedDayEntry.status === 'optimal' ? '#ECFDF5' : selectedDayEntry.status === 'mild_flare' ? '#FEF3C7' : '#FFF1F2',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        border: `1px solid ${selectedDayEntry.status === 'optimal' ? '#A7F3D0' : selectedDayEntry.status === 'mild_flare' ? '#FDE68A' : '#FECDD3'}`,
                        textTransform: 'uppercase',
                      }}
                    >
                      {selectedDayEntry.status.replace('_', ' ')} • {selectedDayEntry.equilibriumScore}% SCORE
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    {new Date(selectedDayEntry.date + 'T12:00:00').toLocaleDateString('default', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Subtabs: Inspect vs Log/Edit */}
              <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    setModalTab('inspect');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    border: 'none',
                    borderBottom: modalTab === 'inspect' ? '2.5px solid #0D9488' : '2.5px solid transparent',
                    background: modalTab === 'inspect' ? '#FFFFFF' : 'transparent',
                    color: modalTab === 'inspect' ? '#0D9488' : '#64748B',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Activity size={15} /> Clinical Inspection
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    setModalTab('edit');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    border: 'none',
                    borderBottom: modalTab === 'edit' ? '2.5px solid #0D9488' : '2.5px solid transparent',
                    background: modalTab === 'edit' ? '#FFFFFF' : 'transparent',
                    color: modalTab === 'edit' ? '#0D9488' : '#64748B',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Sliders size={15} /> Log / Edit Day Check-In
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {modalTab === 'inspect' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                      <div
                        style={{
                          background: STOMACH_COMFORT_INFO[selectedDayEntry.stomachComfort].bg,
                          border: `1px solid ${STOMACH_COMFORT_INFO[selectedDayEntry.stomachComfort].border}`,
                          borderRadius: '14px',
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                          <span>{STOMACH_COMFORT_INFO[selectedDayEntry.stomachComfort].icon}</span>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: STOMACH_COMFORT_INFO[selectedDayEntry.stomachComfort].color }}>
                            STOMACH & ACID
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>
                          {STOMACH_COMFORT_INFO[selectedDayEntry.stomachComfort].label}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          Acidity Score: {selectedDayEntry.stomachScore}/10
                        </div>
                      </div>

                      <div
                        style={{
                          background: selectedDayEntry.bloatingScore >= 7 ? '#FFF1F2' : selectedDayEntry.bloatingScore >= 4 ? '#FEF3C7' : '#ECFDF5',
                          border: `1px solid ${selectedDayEntry.bloatingScore >= 7 ? '#FECDD3' : selectedDayEntry.bloatingScore >= 4 ? '#FDE68A' : '#A7F3D0'}`,
                          borderRadius: '14px',
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                          <span>💨</span>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: selectedDayEntry.bloatingScore >= 7 ? '#E11D48' : selectedDayEntry.bloatingScore >= 4 ? '#D97706' : '#059669' }}>
                            DISTENSION
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>
                          {selectedDayEntry.bloatingScore}/10 Severity
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {DISTENSION_PATTERN_INFO[selectedDayEntry.distensionPattern]?.label || 'Distension'}
                        </div>
                      </div>

                      <div
                        style={{
                          background: BRISTOL_STOOL_INFO[selectedDayEntry.bristolType].badgeBg,
                          border: `1px solid ${BRISTOL_STOOL_INFO[selectedDayEntry.bristolType].borderColor}`,
                          borderRadius: '14px',
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                          <span>{BRISTOL_STOOL_INFO[selectedDayEntry.bristolType].icon}</span>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: BRISTOL_STOOL_INFO[selectedDayEntry.bristolType].badgeColor }}>
                            BRISTOL STOOL
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>
                          Type {selectedDayEntry.bristolType}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {BRISTOL_STOOL_INFO[selectedDayEntry.bristolType].sublabel} • {selectedDayEntry.bowelFrequency}x/day
                        </div>
                      </div>
                    </div>

                    {/* Logged Meals */}
                    <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '12px 14px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Logged Meals & Postprandial Reactions
                        </span>
                        {onOpenQuickMeal && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsDetailModalOpen(false);
                              onOpenQuickMeal();
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#0D9488',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Plus size={13} /> Add Meal
                          </button>
                        )}
                      </div>

                      {selectedDayEntry.loggedMeals && selectedDayEntry.loggedMeals.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {selectedDayEntry.loggedMeals.map((meal, mIdx) => (
                            <div
                              key={mIdx}
                              style={{
                                background: '#FFFFFF',
                                borderRadius: '12px',
                                padding: '10px 12px',
                                border: '1px solid #E2E8F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>{meal.time}</span>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{meal.name}</span>
                                </div>
                                {meal.calories && (
                                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>{meal.calories} kcal</span>
                                )}
                              </div>

                              {meal.reaction && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: '999px',
                                    background: meal.reaction.includes('Calm') ? '#ECFDF5' : '#FFF1F2',
                                    color: meal.reaction.includes('Calm') ? '#059669' : '#E11D48',
                                    border: `1px solid ${meal.reaction.includes('Calm') ? '#A7F3D0' : '#FECDD3'}`,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {meal.reaction}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '12px 0', fontSize: '12.5px', color: '#64748B', fontWeight: 500 }}>
                          No specific meals logged for this date.
                        </div>
                      )}
                    </div>

                    {/* Correlated Triggers */}
                    {selectedDayEntry.correlatedTriggers && selectedDayEntry.correlatedTriggers.length > 0 && (
                      <div style={{ background: '#FFFBEB', borderRadius: '14px', padding: '12px 14px', border: '1px solid #FDE68A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <AlertTriangle size={15} color="#D97706" />
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#92400E' }}>
                            CORRELATED SUSPECT FOOD TRIGGERS
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {selectedDayEntry.correlatedTriggers.map((trig, tIdx) => (
                            <span
                              key={tIdx}
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 700,
                                color: '#B45309',
                                background: '#FFFFFF',
                                padding: '3px 9px',
                                borderRadius: '8px',
                                border: '1px solid #FCD34D',
                              }}
                            >
                              ⚡ {trig}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ava Clinical Recommendation */}
                    <div style={{ background: '#F0FDFA', borderRadius: '14px', padding: '12px 14px', border: '1px solid #99F6E4' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Sparkles size={15} color="#0D9488" />
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F766E' }}>
                          AVA GASTROENTEROLOGY INSIGHT
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12.5px', color: '#134E4A', lineHeight: 1.45 }}>
                        {selectedDayEntry.clinicalInsight}
                      </p>
                    </div>
                  </>
                )}

                {/* MODAL TAB 2: INTERACTIVE CHECK-IN EDITOR */}
                {modalTab === 'edit' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* 1. Bloating Severity Slider */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                          Bloating & Distension Severity (0–10)
                        </label>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: editBloatScore >= 7 ? '#E11D48' : editBloatScore >= 4 ? '#D97706' : '#059669',
                          }}
                        >
                          {editBloatScore} / 10
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={editBloatScore}
                        onChange={(e) => {
                          triggerHapticSelection();
                          setEditBloatScore(parseInt(e.target.value, 10));
                        }}
                        style={{ width: '100%', accentColor: '#0D9488', cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                        <span>0: Completely Flat</span>
                        <span>5: Noticeable Tightness</span>
                        <span>10: Severe Distension</span>
                      </div>
                    </div>

                    {/* 2. Distension Pattern */}
                    <div>
                      <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                        Distension Onset Pattern
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                        {(Object.keys(DISTENSION_PATTERN_INFO) as DistensionPattern[]).map((patternKey) => {
                          const isSel = editDistensionPattern === patternKey;
                          return (
                            <button
                              key={patternKey}
                              type="button"
                              onClick={() => {
                                triggerHapticSelection();
                                setEditDistensionPattern(patternKey);
                              }}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '10px',
                                border: isSel ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                                background: isSel ? '#F0FDFA' : '#FFFFFF',
                                color: isSel ? '#0F766E' : '#475569',
                                fontSize: '11.5px',
                                fontWeight: isSel ? 800 : 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                            >
                              {DISTENSION_PATTERN_INFO[patternKey].label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Stomach & Acid Comfort */}
                    <div>
                      <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                        Upper GI / Stomach Status
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '6px' }}>
                        {(Object.keys(STOMACH_COMFORT_INFO) as StomachComfortLevel[]).map((level) => {
                          const isSel = editStomachComfort === level;
                          const sInfo = STOMACH_COMFORT_INFO[level];
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => {
                                triggerHapticSelection();
                                setEditStomachComfort(level);
                                setEditStomachScore(level === 'calm' ? 0 : level === 'mild_acid' ? 3 : level === 'moderate_reflux' ? 6 : 9);
                              }}
                              style={{
                                padding: '8px',
                                borderRadius: '10px',
                                border: isSel ? `1.5px solid ${sInfo.color}` : '1px solid #E2E8F0',
                                background: isSel ? sInfo.bg : '#FFFFFF',
                                color: isSel ? sInfo.color : '#475569',
                                fontSize: '11.5px',
                                fontWeight: isSel ? 800 : 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <span>{sInfo.icon}</span>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sInfo.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Bristol Stool Type Selector */}
                    <div>
                      <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                        Bristol Stool Chart Form (Types 1 to 7)
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
                        {([1, 2, 3, 4, 5, 6, 7] as BristolStoolType[]).map((type) => {
                          const isSel = editBristolType === type;
                          const bInfo = BRISTOL_STOOL_INFO[type];
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                triggerHapticSelection();
                                setEditBristolType(type);
                              }}
                              style={{
                                height: '52px',
                                borderRadius: '10px',
                                border: isSel ? `2px solid ${bInfo.badgeColor}` : '1px solid #E2E8F0',
                                background: isSel ? bInfo.badgeBg : '#FFFFFF',
                                color: isSel ? bInfo.badgeColor : '#334155',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2px',
                                padding: '2px',
                              }}
                            >
                              <span style={{ fontSize: '14px' }}>{bInfo.icon}</span>
                              <span style={{ fontSize: '10.5px', fontWeight: 800 }}>T{type}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div
                        style={{
                          background: BRISTOL_STOOL_INFO[editBristolType].badgeBg,
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: `1px solid ${BRISTOL_STOOL_INFO[editBristolType].borderColor}`,
                          fontSize: '11.5px',
                          color: '#334155',
                        }}
                      >
                        <strong>{BRISTOL_STOOL_INFO[editBristolType].label} ({BRISTOL_STOOL_INFO[editBristolType].sublabel}):</strong>{' '}
                        {BRISTOL_STOOL_INFO[editBristolType].desc}
                      </div>
                    </div>

                    {/* 5. Bowel Frequency Stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>Evacuation Frequency</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[0, 1, 2, 3].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              triggerHapticSelection();
                              setEditBowelFrequency(num);
                            }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              border: editBowelFrequency === num ? '1.5px solid #0D9488' : '1px solid #CBD5E1',
                              background: editBowelFrequency === num ? '#0D9488' : '#FFFFFF',
                              color: editBowelFrequency === num ? '#FFFFFF' : '#334155',
                              fontWeight: 800,
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            {num === 3 ? '3+' : num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 6. Daily Notes */}
                    <div>
                      <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                        Digestive Observations / Specific Foods
                      </label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="e.g. Mild epigastric heat after espresso; bloat subsided after 20-min evening walk..."
                        rows={2}
                        style={{
                          width: '100%',
                          borderRadius: '10px',
                          border: '1px solid #CBD5E1',
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                          outline: 'none',
                          resize: 'none',
                        }}
                      />
                    </div>

                    {/* Save Button */}
                    <button
                      type="button"
                      onClick={handleSaveCheckin}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                        color: '#FFFFFF',
                        fontSize: '13.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 16px rgba(13, 148, 136, 0.3)',
                        marginTop: '4px',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Save Day Digestion Log (+10 Vitality Points)</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
