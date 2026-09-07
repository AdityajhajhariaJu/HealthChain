/**
 * Functional & Optimal Biomarker Intelligence Engine
 * Bridges the gap between conventional disease pathology cutoffs and functional vitality optimization.
 * Prevents clinical gaslighting where patients feel exhausted despite "normal" labs.
 */

export interface FunctionalBiomarkerRule {
  key: string;
  name: string;
  aliases: string[];
  unit: string;
  standardRange: string;
  optimalRange: string;
  standardMin: number;
  standardMax: number;
  optimalMin: number;
  optimalMax: number;
  subclinicalLowInsight: string;
  subclinicalHighInsight: string;
}

export interface FunctionalEvaluationResult {
  biomarkerName: string;
  value: number;
  unit: string;
  status: 'OPTIMAL' | 'SUBCLINICAL_LOW' | 'SUBCLINICAL_HIGH' | 'PATHOLOGICAL_LOW' | 'PATHOLOGICAL_HIGH' | 'NORMAL';
  standardRange: string;
  optimalRange: string;
  clinicalInsight?: string;
}

export const FUNCTIONAL_BIOMARKER_RULES: FunctionalBiomarkerRule[] = [
  {
    key: 'ferritin',
    name: 'Serum Ferritin',
    aliases: ['ferritin', 'serum ferritin', 'iron stores'],
    unit: 'ng/mL',
    standardRange: '15 - 200 ng/mL',
    optimalRange: '50 - 100 ng/mL',
    standardMin: 15,
    standardMax: 200,
    optimalMin: 50,
    optimalMax: 100,
    subclinicalLowInsight: 'Levels < 30-50 ng/mL deplete bone marrow iron stores and mitochondrial cytochrome function, causing profound unrefreshing fatigue, brain fog, and hair thinning even with a "normal" CBC Hemoglobin.',
    subclinicalHighInsight: 'Levels > 100-150 ng/mL may act as an acute phase reactant signaling systemic inflammation, metabolic syndrome, or fatty liver stress.'
  },
  {
    key: 'vitamind',
    name: 'Vitamin D (25-OH)',
    aliases: ['vitamin d', '25-hydroxyvitamin d', '25-oh vitamin d', 'calcidiol'],
    unit: 'ng/mL',
    standardRange: '20 - 100 ng/mL',
    optimalRange: '50 - 80 ng/mL',
    standardMin: 20,
    standardMax: 100,
    optimalMin: 50,
    optimalMax: 80,
    subclinicalLowInsight: 'Levels between 20-40 ng/mL are technically "not deficient" by hospital cutoffs, but significantly impair innate immunity, deep sleep architecture, and musculoskeletal recovery.',
    subclinicalHighInsight: 'Levels > 90 ng/mL require monitoring of serum calcium to prevent hypercalcemia.'
  },
  {
    key: 'vitaminb12',
    name: 'Vitamin B12 (Cobalamin)',
    aliases: ['vitamin b12', 'b12', 'cobalamin', 'serum b12'],
    unit: 'pg/mL',
    standardRange: '200 - 900 pg/mL',
    optimalRange: '500 - 1000 pg/mL',
    standardMin: 200,
    standardMax: 900,
    optimalMin: 500,
    optimalMax: 1000,
    subclinicalLowInsight: 'Levels between 200-400 pg/mL can cause subclinical peripheral neuropathy, mood alterations, and impaired cellular methylation before anemia manifests.',
    subclinicalHighInsight: 'Unsupplemented elevated B12 (>1000 pg/mL) warrants checking liver enzymes and renal function.'
  },
  {
    key: 'tsh',
    name: 'Thyroid Stimulating Hormone (TSH)',
    aliases: ['tsh', 'thyrotropin', 'thyroid stimulating hormone'],
    unit: 'mIU/L',
    standardRange: '0.45 - 4.5 mIU/L',
    optimalRange: '1.0 - 2.2 mIU/L',
    standardMin: 0.45,
    standardMax: 4.5,
    optimalMin: 1.0,
    optimalMax: 2.2,
    subclinicalLowInsight: 'Low TSH (<1.0 mIU/L) may reflect subclinical hyperthyroidism or pituitary dampening from prolonged chronic stress.',
    subclinicalHighInsight: 'TSH between 2.5-4.5 mIU/L frequently correlates with subclinical hypothyroidism, sluggish gut transit/constipation, cold intolerance, and afternoon sluggishness.'
  },
  {
    key: 'fasting_glucose',
    name: 'Fasting Blood Glucose',
    aliases: ['fasting glucose', 'glucose fasting', 'blood sugar fasting', 'fbs'],
    unit: 'mg/dL',
    standardRange: '70 - 99 mg/dL',
    optimalRange: '72 - 88 mg/dL',
    standardMin: 70,
    standardMax: 99,
    optimalMin: 72,
    optimalMax: 88,
    subclinicalLowInsight: 'Fasting levels < 72 mg/dL may trigger compensatory adrenaline spikes and reactive morning shakiness.',
    subclinicalHighInsight: 'Levels between 90-99 mg/dL, while technically "normal," frequently indicate early hepatic insulin resistance and postprandial glucose volatility.'
  },
  {
    key: 'hscrp',
    name: 'High-Sensitivity C-Reactive Protein (hs-CRP)',
    aliases: ['hs-crp', 'hscrp', 'c-reactive protein hs', 'cardio crp'],
    unit: 'mg/L',
    standardRange: '< 3.0 mg/L',
    optimalRange: '< 0.8 mg/L',
    standardMin: 0,
    standardMax: 3.0,
    optimalMin: 0,
    optimalMax: 0.8,
    subclinicalLowInsight: 'Ideal minimal baseline inflammatory tone.',
    subclinicalHighInsight: 'Levels between 0.9-3.0 mg/L suggest low-grade systemic vascular, gut, or metabolic inflammation, even without an acute infection.'
  }
];

export function evaluateBiomarkerFunctionally(rawName: string, numericVal: number): FunctionalEvaluationResult | null {
  if (!rawName || isNaN(numericVal)) return null;

  const normalized = rawName.toLowerCase().trim();
  const rule = FUNCTIONAL_BIOMARKER_RULES.find(r => 
    r.key === normalized || 
    r.name.toLowerCase() === normalized || 
    r.aliases.some(a => normalized.includes(a))
  );

  if (!rule) return null;

  let status: FunctionalEvaluationResult['status'] = 'NORMAL';
  let clinicalInsight = '';

  if (numericVal < rule.standardMin) {
    status = 'PATHOLOGICAL_LOW';
    clinicalInsight = `Critically below standard clinical threshold (${rule.standardRange}). Physician review indicated.`;
  } else if (numericVal > rule.standardMax) {
    status = 'PATHOLOGICAL_HIGH';
    clinicalInsight = `Above standard reference limit (${rule.standardRange}). Requires clinical correlation.`;
  } else if (numericVal >= rule.optimalMin && numericVal <= rule.optimalMax) {
    status = 'OPTIMAL';
    clinicalInsight = `Within evidence-based functional optimal zone (${rule.optimalRange}). Cellular homeostasis maintained.`;
  } else if (numericVal < rule.optimalMin) {
    status = 'SUBCLINICAL_LOW';
    clinicalInsight = rule.subclinicalLowInsight;
  } else {
    status = 'SUBCLINICAL_HIGH';
    clinicalInsight = rule.subclinicalHighInsight;
  }

  return {
    biomarkerName: rule.name,
    value: numericVal,
    unit: rule.unit,
    status,
    standardRange: rule.standardRange,
    optimalRange: rule.optimalRange,
    clinicalInsight
  };
}
