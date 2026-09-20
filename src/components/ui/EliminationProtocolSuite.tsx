import React from 'react';
import { ClinicalEliminationModal } from './ClinicalEliminationModal';

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
    badge: 'FOOD TRIGGER ELIMINATION PROTOCOL',
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
      { id: 'posture_calm', label: '15-Minute Upright Postprandial Walk', sublabel: 'Supports healthy digestion and motility' },
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
    name: 'Acid Watcher 21-Day GERD & LPR Plan',
    tagline: 'Mucosal healing protocol eliminating pepsin activators & night reflux triggers',
    badge: 'GERD ELIMINATION PROTOCOL',
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
    name: 'Bristol Motility & Colonic Transit Plan',
    tagline: 'Soluble prebiotic gel modulation to normalize Bristol Stool to Type 3–4',
    badge: 'COLONIC MOTILITY & MICROBIOME',
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
    name: 'Gut-Brain Sensitivity Protocol',
    tagline: 'Relaxation and mindful eating techniques to ease digestive discomfort',
    badge: 'GUT-BRAIN SENSITIVITY PROTOCOL',
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
      { insteadOf: 'Post-Meal Slouch on Sofa', swapTo: 'Upright Chest Opening & 10-Min Slow Stroll', culinaryNote: 'Relieves mechanical tension in the diaphragm area.' },
    ],
    dailyChecklist: [
      { id: 'pre_meal_breath', label: '5-Minute Mindful Breathing Before Meals', sublabel: '4-7-8 calming rhythm' },
      { id: 'screen_free_meal', label: '100% Screen-Free Mealtime', sublabel: 'Zero phone or laptop use while eating lunch & dinner' },
      { id: 'chew_pacing', label: 'Fork Resting Between Every Bite', sublabel: 'Paced total meal duration to 20+ minutes' },
      { id: 'hrv_reset', label: 'Evening Calming Routine', sublabel: 'Completed 60s heart-rate variability reset' },
    ],
    symptomDrop: {
      metric: 'Visceral Gut Cramping Index',
      startScore: 7.5,
      currentScore: 2.4,
      reductionPct: 68,
    },
  },
};

export interface EliminationProtocolSuiteProps {
  onOpenQuickMeal?: () => void;
  onOpenCalendarHeatmap?: () => void;
  onOpenPostMealTimeline?: () => void;
  onBack?: () => void;
  backLabel?: string;
  initialProtocolId?: string | null;
}

export const EliminationProtocolSuite: React.FC<EliminationProtocolSuiteProps> = ({
  onBack,
  initialProtocolId,
}) => {
  return (
    <ClinicalEliminationModal
      inline={true}
      initialProtocolId={initialProtocolId}
      onClose={onBack}
    />
  );
};

export default EliminationProtocolSuite;
