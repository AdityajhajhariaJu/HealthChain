/**
 * Deterministic Clinical Dietary Swap Engine
 * Maps common digestive and inflammatory food triggers to 1-to-1 delicious,
 * gut-soothing replacements with biological rationale and expected time-to-relief.
 * Operates with 0 token consumption.
 */

export interface DietarySwap {
  triggerName: string;
  category: 'FODMAP' | 'HISTAMINE' | 'DAIRY' | 'ACID_REFLUX' | 'GLUTEN_GRAIN' | 'NIGHTSHADE' | 'ADDITIVE';
  offendingCompound: string;
  biologicalMechanism: string;
  smartReplacement: string;
  replacementDetails: string;
  expectedReliefTimeline: string;
}

const DIETARY_SWAPS_DATABASE: Record<string, DietarySwap> = {
  oats: {
    triggerName: 'Oats & Oatmeal',
    category: 'GLUTEN_GRAIN',
    offendingCompound: 'Beta-Glucan & Insoluble Fiber Fermentation (or Avenin cross-reactivity)',
    biologicalMechanism: 'Rapid colonic fermentation of resistant starches produces excess hydrogen and methane gas in sensitive microbiomes.',
    smartReplacement: 'Organic Cream of Rice or Soaked Chia Pudding',
    replacementDetails: 'Cook smooth cream of rice with almond milk and ceylon cinnamon, or soak 2 tbsp chia seeds in coconut milk overnight.',
    expectedReliefTimeline: 'Post-meal distension and gas reduction within 24 to 48 hours.'
  },
  oatmeal: {
    triggerName: 'Oatmeal',
    category: 'GLUTEN_GRAIN',
    offendingCompound: 'Beta-Glucan & Insoluble Fiber Fermentation',
    biologicalMechanism: 'Rapid colonic fermentation of resistant starches produces excess hydrogen and methane gas in sensitive microbiomes.',
    smartReplacement: 'Organic Cream of Rice or Soaked Chia Pudding',
    replacementDetails: 'Cook smooth cream of rice with almond milk and ceylon cinnamon, or soak 2 tbsp chia seeds in coconut milk overnight.',
    expectedReliefTimeline: 'Post-meal distension and gas reduction within 24 to 48 hours.'
  },
  garlic: {
    triggerName: 'Garlic',
    category: 'FODMAP',
    offendingCompound: 'Fructo-oligosaccharides (Fructans)',
    biologicalMechanism: 'Fructans cannot be broken down in the human small intestine; they draw water into the bowel and are rapidly fermented by colonic bacteria.',
    smartReplacement: 'Garlic-Infused Extra Virgin Olive Oil',
    replacementDetails: 'Fructans are water-soluble but lipid-insoluble; garlic-infused oil delivers 100% of authentic garlic flavor with 0% fructan triggers.',
    expectedReliefTimeline: 'Sharp reduction in abdominal cramping and bloating within 12 to 24 hours.'
  },
  onion: {
    triggerName: 'Onions',
    category: 'FODMAP',
    offendingCompound: 'Fructans & Volatile Organic Sulfur Compounds',
    biologicalMechanism: 'High osmotic draw and gaseous distension in the ileum and proximal colon.',
    smartReplacement: 'Green Tops of Scallions / Spring Onions or Fresh Chives',
    replacementDetails: 'The green leafy tops of green onions are low-FODMAP certified and provide crisp savory flavor without the fermentable bulb.',
    expectedReliefTimeline: 'Significant gut comfort within 24 hours.'
  },
  milk: {
    triggerName: 'Cow’s Milk & Dairy',
    category: 'DAIRY',
    offendingCompound: 'Lactose & Bovine A1 Beta-Casein',
    biologicalMechanism: 'Lactase deficiency leads to osmotic diarrhea; A1 beta-casein breaks down into BCM-7 (beta-casomorphin-7), inducing mucosal inflammation.',
    smartReplacement: 'Unsweetened Coconut Milk, Almond Milk, or A2/Goat Milk',
    replacementDetails: 'Switch to creamy unsweetened coconut milk for coffee/cooking, or 100% A2 pasture-raised milk which lacks inflammatory BCM-7 peptide.',
    expectedReliefTimeline: 'Clear improvement in mucus production, skin breakouts, and gut transit within 3 to 5 days.'
  },
  whey: {
    triggerName: 'Whey Protein',
    category: 'DAIRY',
    offendingCompound: 'Beta-Lactoglobulin & Concentrated Dairy Peptides',
    biologicalMechanism: 'High-speed gastric transit of concentrated dairy peptides can irritate inflamed gut linings and trigger rapid histamine release.',
    smartReplacement: 'Sprouted Pea & Brown Rice Protein Isolate or Pure Egg White Powder',
    replacementDetails: 'Provides an identical 25g complete amino acid profile without dairy-induced bloating or acne flare-ups.',
    expectedReliefTimeline: 'Digestive lightness immediately with next shake.'
  },
  coffee: {
    triggerName: 'Coffee & Espresso',
    category: 'ACID_REFLUX',
    offendingCompound: 'Chlorogenic Acids & Lower Esophageal Sphincter (LES) Relaxants',
    biologicalMechanism: 'Stimulates gastrin secretion and transiently relaxes the lower esophageal sphincter, permitting acid backflow.',
    smartReplacement: 'Cold-Brew Chicory Root Latte or Ceremonial Grade Matcha',
    replacementDetails: 'Cold brewing removes 70% of acidic oils; prebiotic chicory supports Bifidobacteria; matcha provides calm sustained L-theanine energy.',
    expectedReliefTimeline: 'Heartburn and mid-afternoon energy crashes abate within 48 hours.'
  },
  tomato: {
    triggerName: 'Tomatoes & Tomato Paste',
    category: 'NIGHTSHADE',
    offendingCompound: 'Solanine, High Histamine & Citric/Malic Acid',
    biologicalMechanism: 'High acidity triggers gastric reflux, while naturally high histamine levels provoke systemic flushing and joint stiffness in sensitive individuals.',
    smartReplacement: 'Roasted Butternut Squash & Beet "Nomato" Sauce',
    replacementDetails: 'Puree roasted carrots, golden beets, and butternut squash with Italian herbs and garlic-infused oil for a rich, zero-acid marinara alternative.',
    expectedReliefTimeline: 'Reflux resolves overnight; joint ache decreases within 72 hours.'
  },
  bread: {
    triggerName: 'Commercial Wheat Bread',
    category: 'GLUTEN_GRAIN',
    offendingCompound: 'Industrial Gliadin, Amylase-Trypsin Inhibitors (ATIs) & Dough Conditioners',
    biologicalMechanism: 'Triggers zonulin upregulation causing transient intestinal hyperpermeability; ATIs stimulate toll-like receptor 4 (TLR4) immune signaling.',
    smartReplacement: '100% Authentic Long-Fermentation Sourdough or Sprouted Buckwheat Bread',
    replacementDetails: '24-hour traditional sourdough fermentation digests 90%+ of phytic acid and fructans, making it remarkably digestible for non-celiac sensitivities.',
    expectedReliefTimeline: 'Reduction in post-meal lethargy and brain fog within 3 days.'
  },
  roti: {
    triggerName: 'Wheat Roti & Chapati',
    category: 'GLUTEN_GRAIN',
    offendingCompound: 'Wheat Gluten & Fructo-oligosaccharides (FODMAPs)',
    biologicalMechanism: 'Concentrated wheat proteins and fructan oligosaccharides trigger osmotic gut distension, abdominal heaviness, and mucosal irritation in gluten/FODMAP sensitivity.',
    smartReplacement: 'Jowar (Sorghum) / Bajra (Pearl Millet) Bhakri or Besan Chilla',
    replacementDetails: 'Naturally gluten-free millets provide high soluble fiber, zinc, and slow-burning energy without gut wall inflammation or postprandial sleepiness.',
    expectedReliefTimeline: 'Abdominal distension and post-lunch lethargy resolve within 48 hours.'
  },
  rajma: {
    triggerName: 'Rajma (Kidney Beans) & Chana',
    category: 'FODMAP',
    offendingCompound: 'Galacto-oligosaccharides (GOS) & Alpha-Galactosides',
    biologicalMechanism: 'Human small intestine lacks alpha-galactosidase enzyme to cleave GOS bonds; bacterial fermentation in the colon produces massive hydrogen and methane gas.',
    smartReplacement: 'Yellow Moong Dal Khichdi or 24hr Soaked Sprouted Moong',
    replacementDetails: 'Split yellow moong dal has the tough outer husk removed, giving it the lowest fermentable sugar load of any legume and maximum digestive tolerability.',
    expectedReliefTimeline: 'Severe gas cramping and bloating reduced within 12 to 24 hours.'
  },
  chickpeas: {
    triggerName: 'Chickpeas / Chana',
    category: 'FODMAP',
    offendingCompound: 'Galacto-oligosaccharides (GOS)',
    biologicalMechanism: 'High osmotic draw and colonic bacterial fermentation trigger rapid gas distension.',
    smartReplacement: 'Moong Dal Chilla or Pressure-Cooked Red Lentil Soup',
    replacementDetails: 'Pressure cooking soaked yellow or red lentils breaks down oligosaccharide bonds for effortless nutrient absorption.',
    expectedReliefTimeline: 'Digestive lightness immediately with the next meal.'
  },
  chai: {
    triggerName: 'Masala Chai / Milk Tea',
    category: 'ACID_REFLUX',
    offendingCompound: 'Boiled Tannins, Excess Caffeine & Casein Curdling',
    biologicalMechanism: 'Boiling black tea leaves with dairy milk releases heavy astringent tannins that stimulate hyperchlorhydria (excess stomach acid) and weaken the lower esophageal sphincter.',
    smartReplacement: 'CCF Tea (Cumin-Coriander-Fennel Infusion) or Cardamom Tulsi Green Tea',
    replacementDetails: 'Simmering 1/2 tsp each of cumin, coriander, and fennel seeds relaxes GI smooth muscle, soothes gastric mucosa, and dispels heartburn without caffeine spikes.',
    expectedReliefTimeline: 'Acid reflux, sour burps, and stomach burning subside within 24 hours.'
  },
  paneer: {
    triggerName: 'Paneer (Cottage Cheese)',
    category: 'DAIRY',
    offendingCompound: 'Dense Bovine A1 Casein & Saturated Dairy Fats',
    biologicalMechanism: 'Dense dairy protein curds delay gastric motility and trigger delayed immunological IgG sensitivity, mucus formation, or sluggish digestion.',
    smartReplacement: 'Pan-Seared Organic Tofu or Sprouted Tempeh Tikka',
    replacementDetails: 'Delivers an identical 18g/100g complete protein punch with 0% dairy caseins, easily absorbing garam masala and rich curry marinades.',
    expectedReliefTimeline: 'Gut heaviness and digestive sluggishness improve within 3 to 4 days.'
  },
  dahi: {
    triggerName: 'Aged A1 Curd / Dahi',
    category: 'HISTAMINE',
    offendingCompound: 'High Biogenic Amines (Histamine) & Bovine Casein',
    biologicalMechanism: 'Over-fermented or sour dahi contains elevated histamine concentrations that overwhelm DAO enzyme clearance, causing facial flushing, headaches, or runny nose.',
    smartReplacement: 'Fresh Homemade Chaas with Roasted Jeera & Mint, or Coconut Dahi',
    replacementDetails: 'Thinning fresh day-one curd into chaas (1:3 water ratio) separates heavy milk fats, while carminative roasted cumin (jeera) accelerates digestive enzyme secretion.',
    expectedReliefTimeline: 'Histamine flushing, sinus heaviness, and bloating clear within 24 hours.'
  },
  rice: {
    triggerName: 'Polished White Rice',
    category: 'ADDITIVE',
    offendingCompound: 'High Glycemic Index Amylopectin & Stripped Fiber',
    biologicalMechanism: 'Rapid enzymatic hydrolysis into blood glucose triggers sharp insulin spikes followed by reactive hypoglycemia, gut dysmotility, and energy crashes.',
    smartReplacement: 'Samak Rice (Barnyard Millet), Foxtail Millet, or Hand-Pounded Red Rice',
    replacementDetails: 'Traditional millets have a low GI (<50), rich polyphenol antioxidants, and prebiotic resistant starch that feeds beneficial Bifidobacteria.',
    expectedReliefTimeline: 'Post-meal food comas and afternoon energy crashes resolve immediately on day one.'
  }
};

/**
 * Look up a clinical dietary swap for a suspected food.
 */
export function getClinicalDietarySwap(foodName: string): DietarySwap | null {
  if (!foodName || typeof foodName !== 'string') return null;
  const clean = foodName.trim().toLowerCase();

  if (DIETARY_SWAPS_DATABASE[clean]) {
    return DIETARY_SWAPS_DATABASE[clean];
  }

  for (const [key, data] of Object.entries(DIETARY_SWAPS_DATABASE)) {
    if (clean.includes(key) || data.triggerName.toLowerCase().includes(clean)) {
      return data;
    }
  }

  return null;
}

export function getAllClinicalDietarySwaps(): DietarySwap[] {
  return Object.values(DIETARY_SWAPS_DATABASE);
}

/**
 * Retrieves swaps filtered by category.
 */
export function getClinicalDietarySwapsByCategory(category: DietarySwap['category']): DietarySwap[] {
  return Object.values(DIETARY_SWAPS_DATABASE).filter((s) => s.category === category);
}
