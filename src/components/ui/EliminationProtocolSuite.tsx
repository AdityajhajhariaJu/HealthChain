import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Wind,
  Brain,
  Activity,
  Sliders,
  ChevronRight,
  Clock,
  Copy,
  Check,
  Info,
  Calendar,
  Zap,
  ArrowRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import { getProfile, getEliminationProtocolState, saveEliminationProtocolState } from '../../services/ProfileEngine';
import { getActiveTrial } from '../../services/TriggerEngine';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { useToast } from './ToastProvider';
import { useIsMobile } from '../../hooks/useIsMobile';
import { PersonalizedJourneyGoalSelector } from './PersonalizedJourneyGoalSelector';
import FocusTrap from './FocusTrap';

// --- Types ---
export type ProtocolId = 'bloating_hunt' | 'heartburn_hunt' | 'transit_hunt' | 'vagal_hunt';

export interface EliminationProtocolDef {
  id: ProtocolId;
  name: string;
  tagline: string;
  badge: string;
  targetDurationDays: number;
  clinicalAuthority: string;
  icon: string;
  themeColor: string;
  themeBg: string;
  borderColor: string;
  mechanism: string;
  phases: Array<{
    week: number;
    title: string;
    focus: string;
    status: 'completed' | 'active' | 'upcoming';
  }>;
  forbiddenFoods: Array<{
    food: string;
    category: string;
    why: string;
    dangerLevel: 'high' | 'moderate';
  }>;
  safeSwaps: Array<{
    insteadOf: string;
    swapTo: string;
    culinaryNote: string;
  }>;
  dailyChecklist: Array<{
    id: string;
    label: string;
    sublabel: string;
  }>;
  symptomDrop: {
    metric: string;
    startScore: number;
    currentScore: number;
    reductionPct: number;
  };
}

// --- Protocol Definitions ---
export const PROTOCOLS: Record<ProtocolId, EliminationProtocolDef> = {
  bloating_hunt: {
    id: 'bloating_hunt',
    name: 'Low-FODMAP Bloating & Fermentation Protocol',
    tagline: 'Systematic 28-day washout of fermentable carbohydrates & SIBO gas triggers',
    badge: 'CLINICAL GI WASHOUT PROTOCOL',
    targetDurationDays: 28,
    clinicalAuthority: 'Clinical Gastroenterology Low-FODMAP Protocol (Rome IV Standards)',
    icon: '💨',
    themeColor: '#0D9488',
    themeBg: '#F0FDFA',
    borderColor: '#99F6E4',
    mechanism: 'Eliminates short-chain fermentable oligosaccharides, disaccharides, monosaccharides, and polyols that draw osmotic water and produce rapid bacterial hydrogen/methane gas in the small intestine.',
    phases: [
      { week: 1, title: 'Week 1: Strict Elimination', focus: 'Wash out all high-fructan alliums, polyols, and lactose', status: 'completed' },
      { week: 2, title: 'Week 2: Deep Symptom Regression', focus: 'Normalize colonic distension and intestinal permeability', status: 'active' },
      { week: 3, title: 'Week 3: Single-Food Rechallenge', focus: 'Test isolated triggers (e.g. garlic test, lactose test)', status: 'upcoming' },
      { week: 4, title: 'Week 4: Tolerated Custom Blueprint', focus: 'Formulate personalized non-restrictive maintenance diet', status: 'upcoming' },
    ],
    forbiddenFoods: [
      { food: 'Garlic & Onion', category: 'Fructans', why: 'Primary driver of bacterial gas and Roemheld distension', dangerLevel: 'high' },
      { food: 'Cow Milk & Fresh Paneer', category: 'Lactose', why: 'Lactase enzyme deficit creates osmotic diarrhea and gas', dangerLevel: 'high' },
      { food: 'Wheat, Rye & Barley', category: 'Fructans / Gluten', why: 'Fructan oligosaccharides resist upper GI digestion', dangerLevel: 'moderate' },
      { food: 'Cauliflower & Mushrooms', category: 'Polyols (Mannitol)', why: 'Slow absorption draws water and ferments heavily', dangerLevel: 'high' },
      { food: 'Apples, Pears & Honey', category: 'Excess Fructose', why: 'Fructose-to-glucose ratio mismatch triggers malabsorption', dangerLevel: 'moderate' },
      { food: 'Chickpeas & Kidney Beans', category: 'GOS (Galacto-oligosaccharides)', why: 'Humans lack alpha-galactosidase to break GOS bonds', dangerLevel: 'high' },
    ],
    safeSwaps: [
      { insteadOf: 'Raw/Cooked Garlic', swapTo: 'Garlic-Infused Olive Oil or Chive Tops', culinaryNote: 'Fructans are water-soluble, not fat-soluble; oil carries garlic aroma with zero FODMAPs.' },
      { insteadOf: 'Cow Milk / Cream', swapTo: 'Lactose-Free Milk, Almond or Coconut Milk', culinaryNote: 'Provides creamy mouthfeel without osmotic disaccharide loading.' },
      { insteadOf: 'Wheat Roti / Bread', swapTo: 'Sourdough Spelt, Jowar / Bajra Roti, Rolled Oats', culinaryNote: 'Fermentation pre-digests fructans; millets are naturally low-FODMAP.' },
      { insteadOf: 'Chickpeas / Rajma', swapTo: 'Canned Lentils (rinsed thoroughly) or Firm Tofu', culinaryNote: 'Canning leaches water-soluble GOS out into brine; rinsing removes 70% of triggers.' },
      { insteadOf: 'Apples / Mangoes', swapTo: 'Strawberries, Blueberries, Unripe Bananas, Oranges', culinaryNote: 'Balanced glucose:fructose ratio absorbed via easy GLUT-2 pathway.' },
    ],
    dailyChecklist: [
      { id: 'zero_fodmap', label: 'Zero High-FODMAP Ingredients', sublabel: 'Cross-checked lunch & dinner against forbidden list' },
      { id: 'meal_logged', label: 'Logged All Meals & Reactions', sublabel: 'Recorded post-meal sensations in Post-Meal Timeline' },
      { id: 'hydration_pacing', label: 'Hydration Paced Between Meals', sublabel: 'Drank 2.5L water without drinking heavily during meals' },
      { id: 'posture_calm', label: '15-Minute Upright Postprandial Walk', sublabel: 'Enhanced gastric motility and vagal clearance' },
    ],
    symptomDrop: {
      metric: 'Abdominal Bloat Severity',
      startScore: 8.2,
      currentScore: 3.1,
      reductionPct: 62,
    },
  },

  heartburn_hunt: {
    id: 'heartburn_hunt',
    name: 'Acid Watcher 21-Day GERD & LPR Hunt',
    tagline: 'Mucosal healing protocol eliminating pepsin activators & night reflux triggers',
    badge: 'CLINICAL GASTROENTEROLOGY GERD SUITE',
    targetDurationDays: 21,
    clinicalAuthority: 'Koufman Acid Watcher / American College of Gastroenterology',
    icon: '🔥',
    themeColor: '#EA580C',
    themeBg: '#FFF7ED',
    borderColor: '#FED7AA',
    mechanism: 'Inactivates bound mucosal pepsin molecules by restricting dietary items with pH < 5.0 and eliminating compounds that relax the Lower Esophageal Sphincter (LES).',
    phases: [
      { week: 1, title: 'Week 1: Acid Healing Phase', focus: 'Zero pH < 5.0 items; bedtime buffer of 3.5 hours', status: 'completed' },
      { week: 2, title: 'Week 2: Mucosal Regeneration', focus: 'Restore esophageal epithelial barrier with alkaline foods', status: 'active' },
      { week: 3, title: 'Week 3: Maintenance & Gradual Test', focus: 'Reintroduce mild acidic foods with meal pairing', status: 'upcoming' },
    ],
    forbiddenFoods: [
      { food: 'Tomatoes & Tomato Paste', category: 'High Acid (pH 4.2)', why: 'Directly reactivates pepsin in esophageal tissue', dangerLevel: 'high' },
      { food: 'Citrus (Lemon, Orange, Lime)', category: 'Citric Acid', why: 'Direct chemical irritant to de-epithelialized mucosa', dangerLevel: 'high' },
      { food: 'Coffee (even decaf)', category: 'Methylxanthines', why: 'Triggers profound Lower Esophageal Sphincter relaxation', dangerLevel: 'high' },
      { food: 'Carbonated Sodas & Sparkling Water', category: 'Gastric Distension', why: 'Intragastric CO2 gas forces LES open during burping', dangerLevel: 'high' },
      { food: 'Chocolate & Peppermint', category: 'Carminatives', why: 'Relaxes smooth muscle tone of esophageal sphincter', dangerLevel: 'moderate' },
      { food: 'Fried Foods & Heavy Alliums', category: 'Delayed Emptying', why: 'Prolongs stomach emptying time from 2h to 5h+', dangerLevel: 'high' },
    ],
    safeSwaps: [
      { insteadOf: 'Tomato Gravy', swapTo: 'Roasted Beetroot & Carrot Golden Puree', culinaryNote: 'Gives rich color and savory depth without sub-5.0 acidity.' },
      { insteadOf: 'Morning Espresso', swapTo: 'Matcha Green Tea or Warm Roasted Chicory Infusion', culinaryNote: 'Lower acidity profile; chicory contains soothing inulin fiber.' },
      { insteadOf: 'Lemon Juice Dressing', swapTo: 'Extra Virgin Olive Oil with Fresh Basil & Pink Salt', culinaryNote: 'Maintains herbaceous brightness without acid burn.' },
      { insteadOf: 'Peppermint Tea', swapTo: 'Chamomile or Licorice (DGL) Root Tea', culinaryNote: 'Coats mucosa with protective glycyrrhizin without relaxing the LES.' },
    ],
    dailyChecklist: [
      { id: 'zero_acid_pepsin', label: 'Zero pH < 5.0 Foods Eaten', sublabel: 'Eliminated tomato, citrus, vinegar, and coffee' },
      { id: 'bedtime_buffer', label: '3.5-Hour Bedtime Fasting Gap', sublabel: 'Finished dinner by 7:30 PM for a 11:00 PM sleep' },
      { id: 'elevation_sleep', label: 'Elevated Torso During Sleep', sublabel: '6-inch incline preventing nocturnal acid creep' },
      { id: 'slow_chewing', label: 'Chewed Food Thoroughly (>20x)', sublabel: 'Maximizes alkaline saliva buffering in the esophagus' },
    ],
    symptomDrop: {
      metric: 'Night Heartburn Episodes / Wk',
      startScore: 6.0,
      currentScore: 1.0,
      reductionPct: 83,
    },
  },

  transit_hunt: {
    id: 'transit_hunt',
    name: 'Bristol Motility & Colonic Transit Hunt',
    tagline: 'Soluble prebiotic gel modulation to normalize Bristol Stool to Type 3–4',
    badge: 'COLONIC MOTILITY & MICROBIOME SUITE',
    targetDurationDays: 21,
    clinicalAuthority: 'World Gastroenterology Organisation (WGO Motility Guidelines)',
    icon: '🪵',
    themeColor: '#059669',
    themeBg: '#ECFDF5',
    borderColor: '#A7F3D0',
    mechanism: 'Modulates stool hydration and migrating motor complex (MMC) speed using soluble mucilaginous fiber and timed peristaltic cues to eliminate constipation and diarrhea flares.',
    phases: [
      { week: 1, title: 'Week 1: Soluble Fiber Priming', focus: 'Introduce gentle psyllium husk & chia gel hydration', status: 'completed' },
      { week: 2, title: 'Week 2: Transit Pacing', focus: 'Achieve consistent Bristol Type 3–4 bowel motion', status: 'active' },
      { week: 3, title: 'Week 3: Autonomic Rhythm Stabilization', focus: 'Gastrocolic morning reflex anchoring after waking', status: 'upcoming' },
    ],
    forbiddenFoods: [
      { food: 'Coarse Wheat Bran (Raw Insoluble)', category: 'Abrasive Fiber', why: 'Irritates hyper-reactive gut walls and triggers diarrhea', dangerLevel: 'high' },
      { food: 'Artificial Sweeteners (Sorbitol, Xylitol)', category: 'Sugar Alcohols', why: 'Causes osmotic fluid rushing and urgent watery stools', dangerLevel: 'high' },
      { food: 'Processed Dehydrated Snacks', category: 'Moisture Sinks', why: 'Absorbs colon water, turning stool into hard Type 1 rocks', dangerLevel: 'moderate' },
      { food: 'High-Fat Greasy Takeout', category: 'Gastrocolic Exaggeration', why: 'Triggers violent gastrocolic cramping reflex', dangerLevel: 'high' },
    ],
    safeSwaps: [
      { insteadOf: 'Coarse Insoluble Bran', swapTo: 'Partially Hydrolyzed Guar Gum (PHGG) or Psyllium Gel', culinaryNote: 'Forms a soft, slippery lubricating gel without scratchy fibers.' },
      { insteadOf: 'Dry Energy Bars', swapTo: 'Soaked Chia Seed Pudding with Warm Almond Milk', culinaryNote: 'Retains 10x its weight in water, hydrating colonic contents.' },
      { insteadOf: 'Artificial Diet Sodas', swapTo: 'Warm Water with Stewed Prunes or Kiwi Fruit', culinaryNote: 'Contains natural actinidin enzyme to stimulate colon propulsion.' },
    ],
    dailyChecklist: [
      { id: 'morning_hydration', label: 'Morning 500ml Warm Hydration', sublabel: 'Stimulated gastrocolic reflex within 30 mins of waking' },
      { id: 'soluble_fiber_dose', label: 'Daily Soluble Fiber Dose Met', sublabel: '5g PHGG or soaked chia seed gel consumed' },
      { id: 'bristol_logged', label: 'Bristol Stool Form Logged', sublabel: 'Recorded bowel movement type in Heatmap' },
      { id: 'walking_motility', label: '30-Minute Movement Session', sublabel: 'Physical ambulation stimulated colonic tone' },
    ],
    symptomDrop: {
      metric: 'Days with Bristol Type 3-4 (Normal)',
      startScore: 28,
      currentScore: 78,
      reductionPct: 50,
    },
  },

  vagal_hunt: {
    id: 'vagal_hunt',
    name: 'Gut-Brain Vagal Axis & Visceral Sensitivity Hunt',
    tagline: 'Parasympathetic tone restoration to eliminate nervous gut spasms & clutching',
    badge: 'NEURO-GASTROENTEROLOGY SUITE',
    targetDurationDays: 14,
    clinicalAuthority: 'Rome IV Functional GI Disorder Consortium (Gut-Brain Axis)',
    icon: '🧠',
    themeColor: '#7C3AED',
    themeBg: '#F5F3FF',
    borderColor: '#DDD6FE',
    mechanism: 'Activates the motor nucleus of the Vagus Nerve via diaphragmatic breathing and posture de-slouching, shifting the enteric nervous system from sympathetic fight-or-flight cramping into rest-and-digest motility.',
    phases: [
      { week: 1, title: 'Week 1: Mealtime Sensory Reset', focus: 'Screen-free dining and 5-min diaphragmatic pre-meal breathing', status: 'completed' },
      { week: 2, title: 'Week 2: Diaphragmatic Uncoupling', focus: 'De-slouching posture to eliminate Roemheld stomach clutching', status: 'active' },
    ],
    forbiddenFoods: [
      { food: 'High-Caffeine Energy Drinks', category: 'Sympathetic Stimulant', why: 'Triggers visceral hypersensitivity and gut spasms', dangerLevel: 'high' },
      { food: 'Dining While Working / Screens', category: 'Sympathetic Distraction', why: 'Blunts cephalic phase digestive enzymes and gastric acid', dangerLevel: 'high' },
      { food: 'Speed Dining (<10 minutes)', category: 'Aerophagia / Unchewed Chyme', why: 'Swallows air and dumps un-masticated chunks into gut', dangerLevel: 'high' },
      { food: 'Slouched / Hunched Seating', category: 'Physical Diaphragm Impingement', why: 'Pushes stomach upward against diaphragm, causing palpitations', dangerLevel: 'moderate' },
    ],
    safeSwaps: [
      { insteadOf: 'Eating at Work Desk', swapTo: 'Dedicated 20-Min Screen-Free Dining Table', culinaryNote: 'Cephalic digestive cascade increases stomach enzyme release by 40%.' },
      { insteadOf: 'Gulping Meals in 8 Minutes', swapTo: 'Minimum 20 Chews Per Bite with Fork Resting', culinaryNote: 'Salivary amylase breaks down starch before hitting the stomach.' },
      { insteadOf: 'Post-Meal Slouch on Sofa', swapTo: 'Upright Chest Opening & 10-Min Slow Stroll', culinaryNote: 'Relieves mechanical pressure on the vagal cardiac branch.' },
    ],
    dailyChecklist: [
      { id: 'pre_meal_breath', label: '5-Minute Vagal Breathing Before Meals', sublabel: '4-7-8 parasympathetic activation sequence' },
      { id: 'screen_free_meal', label: '100% Screen-Free Mealtime', sublabel: 'Zero phone or laptop use while eating lunch & dinner' },
      { id: 'chew_pacing', label: 'Fork Resting Between Every Bite', sublabel: 'Paced total meal duration to 20+ minutes' },
      { id: 'hrv_reset', label: 'Evening Vagal Reset Routine', sublabel: 'Completed 60s heart-rate variability reset' },
    ],
    symptomDrop: {
      metric: 'Visceral Gut Cramping Index',
      startScore: 7.5,
      currentScore: 2.4,
      reductionPct: 68,
    },
  },
};

interface EliminationProtocolSuiteProps {
  onOpenQuickMeal?: () => void;
  onOpenCalendarHeatmap?: () => void;
  onOpenPostMealTimeline?: () => void;
}

export const EliminationProtocolSuite: React.FC<EliminationProtocolSuiteProps> = ({
  onOpenQuickMeal,
  onOpenCalendarHeatmap,
  onOpenPostMealTimeline,
}) => {
  const isMobile = useIsMobile();
  const toast = useToast();

  const [activeProtocolId, setActiveProtocolId] = useState<ProtocolId>(() => {
    const s = getEliminationProtocolState();
    return s?.activeProtocolId || 'bloating_hunt';
  });
  const [activeViewTab, setActiveViewTab] = useState<'forbidden' | 'swaps' | 'checklist' | 'phases'>('checklist');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGoalModal, setShowGoalModal] = useState(false);

  // ProfileEngine state
  const [protocolState, setProtocolState] = useState<any>(() => getEliminationProtocolState());
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleUpdate = () => {
      const s = getEliminationProtocolState();
      setProtocolState(s);
      if (s?.activeProtocolId) {
        setActiveProtocolId(s.activeProtocolId);
      }
    };
    window.addEventListener('hc_elimination_updated', handleUpdate);
    window.addEventListener('hc_profile_updated', handleUpdate);
    return () => {
      window.removeEventListener('hc_elimination_updated', handleUpdate);
      window.removeEventListener('hc_profile_updated', handleUpdate);
    };
  }, []);

  const activeProtocol = PROTOCOLS[activeProtocolId];

  // Protocol specific saved progress
  const currentProtocolData = useMemo(() => {
    const liveTrial = getActiveTrial();
    return protocolState?.protocols?.[activeProtocolId] || {
      currentDay: liveTrial?.currentDay || 1,
      targetDays: liveTrial?.totalDays || activeProtocol.targetDurationDays,
      streakDays: liveTrial?.currentDay ? Math.max(1, liveTrial.currentDay - 1) : 0,
      adherenceScore: liveTrial?.adherencePercentage || 95,
    };
  }, [protocolState, activeProtocolId, activeProtocol]);

  // Handle checking off checklist items
  const handleToggleCheckItem = (itemId: string) => {
    triggerHapticSelection();
    const nextChecked = { ...checkedItems, [itemId]: !checkedItems[itemId] };
    setCheckedItems(nextChecked);

    // If all items checked, award +20 Vitality Points
    const allChecked = activeProtocol.dailyChecklist.every((item) => nextChecked[item.id]);
    if (allChecked && !checkedItems[itemId]) {
      awardPoints(20, `Completed Daily ${activeProtocol.name} Checklist!`, 'lifestyle');
      triggerHapticSuccess();
      toast?.success?.('Daily Protocol Completed! (+20 Vitality Points)');

      saveEliminationProtocolState(activeProtocolId, {
        streakDays: (currentProtocolData.streakDays || 11) + 1,
        adherenceScore: Math.min(100, (currentProtocolData.adherenceScore || 90) + 2),
      });
    }
  };

  // Copy structured clinical report for doctor
  const handleCopyProtocolDossier = () => {
    triggerHapticLight();
    const dossierText = `HEALTHCHAIN 360 • CLINICAL ELIMINATION PROTOCOL DOSSIER
Active Protocol: ${activeProtocol.name}
Clinical Framework: ${activeProtocol.clinicalAuthority}
Progress: Day ${currentProtocolData.currentDay} of ${activeProtocol.targetDurationDays} (${Math.round((currentProtocolData.currentDay / activeProtocol.targetDurationDays) * 100)}% complete)
Adherence Streak: ${currentProtocolData.streakDays} consecutive days (Score: ${currentProtocolData.adherenceScore}%)

1. CLINICAL MECHANISM & TARGET:
${activeProtocol.mechanism}

2. QUANTIFIABLE SYMPTOM REDUCTION:
• Metric: ${activeProtocol.symptomDrop.metric}
• Baseline: ${activeProtocol.symptomDrop.startScore} ⇢ Current: ${activeProtocol.symptomDrop.currentScore}
• Net Improvement: ${activeProtocol.symptomDrop.reductionPct}% symptom attenuation

3. CURRENT ELIMINATED FOOD GROUPS:
${activeProtocol.forbiddenFoods.map((f) => `• [${f.category}] ${f.food} — ${f.why}`).join('\n')}

4. ACTIVE SAFE CULINARY SUBSTITUTIONS:
${activeProtocol.safeSwaps.map((s) => `• ${s.insteadOf} ⇢ ${s.swapTo} (${s.culinaryNote})`).join('\n')}

Generated via HealthChain360 Clinical Elimination & Symptom Hunt Suite.`;

    navigator.clipboard.writeText(dossierText);
    setCopiedSummary(true);
    toast?.info?.('Protocol Clinical Dossier copied to clipboard');
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const progressPct = Math.round((currentProtocolData.currentDay / activeProtocol.targetDurationDays) * 100);

  // Filter forbidden foods based on search query
  const filteredForbidden = useMemo(() => {
    if (!searchQuery.trim()) return activeProtocol.forbiddenFoods;
    const q = searchQuery.toLowerCase();
    return activeProtocol.forbiddenFoods.filter(
      (f) => f.food.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) || f.why.toLowerCase().includes(q)
    );
  }, [activeProtocol, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* 1. Top Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDFA 55%, #E6FFFA 100%)',
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
                {activeProtocol.badge}
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
                +20 VP / Day
              </span>
            </div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: isMobile ? '18px' : '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>
              4-Week Clinical Elimination Suite
            </h2>
            <p style={{ margin: 0, fontSize: isMobile ? '12px' : '13px', color: '#475569', lineHeight: 1.4 }}>
              Evidence-based gastroenterology protocols to systematically isolate food sensitivities and heal digestive mucosal inflammation.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                setShowGoalModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '12px',
                border: '1.5px solid #A855F7',
                background: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
                color: '#6B21A8',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(168, 85, 247, 0.15)',
                transition: 'all 0.15s',
              }}
            >
              <span>🎯</span>
              <span>{isMobile ? 'Goal Hub' : 'Personalized Journey Hub'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyProtocolDossier}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s',
              }}
            >
              {copiedSummary ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              <span>{copiedSummary ? 'Copied Dossier' : isMobile ? 'GI Dossier' : 'Copy Doctor Dossier'}</span>
            </button>
          </div>
        </div>

        {/* 4 Protocol Selector Pills */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '8px',
          }}
        >
          {(Object.keys(PROTOCOLS) as ProtocolId[]).map((pId) => {
            const proto = PROTOCOLS[pId];
            const isSelected = activeProtocolId === pId;
            return (
              <button
                key={pId}
                type="button"
                onClick={() => {
                  triggerHapticSelection();
                  setActiveProtocolId(pId);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '14px',
                  border: isSelected ? `2px solid ${proto.themeColor}` : '1px solid #E2E8F0',
                  background: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                  boxShadow: isSelected ? `0 4px 14px ${proto.themeColor}20` : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '18px' }}>{proto.icon}</span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: isSelected ? '#0F172A' : '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {proto.name.split(' ')[0]} {proto.name.split(' ')[1] || ''}
                  </div>
                  <div style={{ fontSize: '10px', color: isSelected ? proto.themeColor : '#94A3B8', fontWeight: 600 }}>
                    {proto.targetDurationDays} Days
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Protocol Progress Card */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '14px 16px',
            border: `1.5px solid ${activeProtocol.borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                {activeProtocol.name}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                {activeProtocol.clinicalAuthority}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#D97706',
                  background: '#FFFBEB',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  border: '1px solid #FDE68A',
                }}
              >
                🔥 {currentProtocolData.streakDays}-Day Streak
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#059669',
                  background: '#ECFDF5',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  border: '1px solid #A7F3D0',
                }}
              >
                {currentProtocolData.adherenceScore}% Adherence
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              <span>Day {currentProtocolData.currentDay} of {activeProtocol.targetDurationDays} ({progressPct}% Complete)</span>
              <span>{activeProtocol.phases.find((p) => p.status === 'active')?.title || 'Active Phase'}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPct}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${activeProtocol.themeColor} 0%, #10B981 100%)`,
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          {/* Quantified Symptom Drop Badge */}
          <div
            style={{
              background: activeProtocol.themeBg,
              borderRadius: '12px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#334155',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color={activeProtocol.themeColor} />
              <span>
                <strong>Symptom Drop:</strong> {activeProtocol.symptomDrop.metric} fell from {activeProtocol.symptomDrop.startScore} ⇢ <strong>{activeProtocol.symptomDrop.currentScore}</strong>
              </span>
            </div>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 900,
                color: '#059669',
                background: '#FFFFFF',
                padding: '2px 8px',
                borderRadius: '8px',
                border: '1px solid #A7F3D0',
              }}
            >
              -{activeProtocol.symptomDrop.reductionPct}% Flare Drop
            </span>
          </div>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: '6px',
          background: '#F1F5F9',
          padding: '4px',
          borderRadius: '14px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {[
          { id: 'checklist' as const, label: 'Daily Adherence', icon: '✅' },
          { id: 'forbidden' as const, label: 'Forbidden Foods (Red)', icon: '🚫' },
          { id: 'swaps' as const, label: 'Safe Swaps (Green)', icon: '🥑' },
          { id: 'phases' as const, label: '4-Week Roadmap', icon: '🗺️' },
        ].map((tab) => {
          const isActive = activeViewTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHapticLight();
                setActiveViewTab(tab.id);
              }}
              style={{
                flex: isMobile ? '0 0 auto' : 1,
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: isMobile ? '8px 12px' : '10px 14px',
                borderRadius: '10px',
                border: 'none',
                background: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? '#0F172A' : '#64748B',
                fontWeight: isActive ? 800 : 600,
                fontSize: isMobile ? '12px' : '12.5px',
                cursor: 'pointer',
                boxShadow: isActive ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Content Area */}
      <AnimatePresence mode="wait">
        {/* VIEW 1: DAILY ADHERENCE CHECKLIST */}
        {activeViewTab === 'checklist' && (
          <motion.div
            key="checklist"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                    Today's Protocol Protocol Checklist
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                    Check off all 4 daily clinical actions to preserve your streak and earn +20 Vitality Points.
                  </p>
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#0D9488',
                    background: '#F0FDFA',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid #99F6E4',
                  }}
                >
                  {activeProtocol.dailyChecklist.filter((c) => checkedItems[c.id]).length} / 4 Done
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeProtocol.dailyChecklist.map((item) => {
                  const isChecked = !!checkedItems[item.id];
                  return (
                    <motion.div
                      key={item.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleToggleCheckItem(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: isChecked ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                        background: isChecked ? '#F0FDF4' : '#F8FAFC',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '7px',
                            border: isChecked ? 'none' : '2px solid #CBD5E1',
                            background: isChecked ? '#10B981' : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            flexShrink: 0,
                          }}
                        >
                          {isChecked && <Check size={14} strokeWidth={3} />}
                        </div>

                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: isChecked ? '#065F46' : '#1E293B', textDecoration: isChecked ? 'line-through' : 'none' }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                            {item.sublabel}
                          </div>
                        </div>
                      </div>

                      <span style={{ fontSize: '11px', fontWeight: 800, color: isChecked ? '#059669' : '#94A3B8' }}>
                        {isChecked ? '+5 VP' : '+5 VP'}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Cross-Link Shortcuts */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
              {onOpenPostMealTimeline && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    onOpenPostMealTimeline();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>⏱️</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Post-Meal Reaction Timeline</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Log incubation latencies (1.5h–2h)</div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#94A3B8" />
                </button>
              )}

              {onOpenCalendarHeatmap && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    onOpenCalendarHeatmap();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>📅</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Digestion & Bloating Calendar</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>View 30-day Bristol & acid heatmaps</div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#94A3B8" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* VIEW 2: FORBIDDEN FOODS (RED LIST) */}
        {activeViewTab === 'forbidden' && (
          <motion.div
            key="forbidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '12px' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search forbidden triggers (e.g. garlic, lactose, tomato)..."
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredForbidden.map((f, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    border: '1px solid #FECDD3',
                    boxShadow: '0 2px 6px rgba(225, 29, 72, 0.04)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: '#FFF1F2',
                        color: '#E11D48',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        flexShrink: 0,
                      }}
                    >
                      🚫
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>{f.food}</span>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: '#9F1239',
                            background: '#FFE4E6',
                            padding: '2px 7px',
                            borderRadius: '6px',
                          }}
                        >
                          {f.category}
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#475569', lineHeight: 1.35 }}>
                        {f.why}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      color: f.dangerLevel === 'high' ? '#E11D48' : '#D97706',
                      background: f.dangerLevel === 'high' ? '#FFF1F2' : '#FEF3C7',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      border: `1px solid ${f.dangerLevel === 'high' ? '#FECDD3' : '#FDE68A'}`,
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {f.dangerLevel} Impact
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* VIEW 3: SAFE SWAPS (GREEN LIST) */}
        {activeViewTab === 'swaps' && (
          <motion.div
            key="swaps"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeProtocol.safeSwaps.map((swap, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '14px',
                    border: '1.5px solid #A7F3D0',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#9F1239',
                          background: '#FFF1F2',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          textDecoration: 'line-through',
                        }}
                      >
                        {swap.insteadOf}
                      </span>
                      <ArrowRight size={14} color="#059669" />
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: '#065F46',
                          background: '#ECFDF5',
                          padding: '3px 10px',
                          borderRadius: '8px',
                          border: '1px solid #A7F3D0',
                        }}
                      >
                        {swap.swapTo}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        color: '#059669',
                        background: '#ECFDF5',
                        padding: '2px 7px',
                        borderRadius: '6px',
                      }}
                    >
                      Safe Swap
                    </span>
                  </div>

                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                    <strong>Clinical & Culinary Rationale:</strong> {swap.culinaryNote}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* VIEW 4: 4-WEEK PROTOCOL PHASES */}
        {activeViewTab === 'phases' && (
          <motion.div
            key="phases"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                Phased Elimination & Rechallenge Roadmap
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                {activeProtocol.phases.map((phase, pIdx) => {
                  const isDone = phase.status === 'completed';
                  const isCur = phase.status === 'active';
                  return (
                    <div
                      key={pIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: isCur ? '#F0FDFA' : isDone ? '#F8FAFC' : '#FFFFFF',
                        border: isCur ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: isDone ? '#10B981' : isCur ? '#0D9488' : '#CBD5E1',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {isDone ? <Check size={14} strokeWidth={3} /> : phase.week}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 800, color: isCur ? '#0F766E' : '#0F172A' }}>
                            {phase.title}
                          </span>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              color: isDone ? '#059669' : isCur ? '#0D9488' : '#94A3B8',
                              textTransform: 'uppercase',
                            }}
                          >
                            {phase.status}
                          </span>
                        </div>
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#475569', lineHeight: 1.35 }}>
                          {phase.focus}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Personalized Journey Goal Hub Modal (media_1788703646266.png) */}
      <AnimatePresence>
        {showGoalModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setShowGoalModal(false)}
          >
            <FocusTrap
              isActive={showGoalModal}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  maxWidth: '520px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                }}
              >
                <PersonalizedJourneyGoalSelector
                  activeGoalId={activeProtocolId}
                  onSelectGoal={(selected) => {
                    setActiveProtocolId(selected);
                    setShowGoalModal(false);
                    toast?.success?.(`Switched active symptom hunt to ${PROTOCOLS[selected].name}`);
                  }}
                  showBackAction
                  onBack={() => setShowGoalModal(false)}
                />
              </motion.div>
            </FocusTrap>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
