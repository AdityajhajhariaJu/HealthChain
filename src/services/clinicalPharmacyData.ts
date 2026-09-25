/**
 * Deterministic Clinical Pharmacology & Nutrient Depletion Engine
 * Provides instant, zero-latency drug-nutrient depletions, optimal timing rules,
 * and supplement synergy/risk profiles for top common medications with 0 token consumption.
 */

export interface NutrientDepletion {
  nutrient: string;
  mechanism: string;
  replenishmentAdvice: string;
}

export interface OptimalTiming {
  bestTimeOfDay: string;
  foodRequirement: string;
  criticalSpacingRules: string[];
}

export interface SupplementInteraction {
  supplement: string;
  riskLevel: 'safe' | 'caution' | 'dangerous';
  clinicalReason: string;
}

export interface EnhancedMedicineData {
  name: string;
  class: string;
  uses: string;
  sideEffects: string;
  nutrientDepletions: NutrientDepletion[];
  optimalTiming: OptimalTiming;
  supplementInteractions: SupplementInteraction[];
  alternatives: string[];
  warnings: string;
  interactions: string[];
  sourceLabelUrl?: string;
  reviewerStatus?: string;
}

const COMMON_DRUG_DATABASE: Record<string, EnhancedMedicineData> = {
  metformin: {
    name: 'Metformin Hydrochloride',
    class: 'Biguanide Antidiabetic',
    uses: 'First-line medication for type 2 diabetes mellitus; improves insulin sensitivity and reduces hepatic gluconeogenesis.',
    sideEffects: 'Gastrointestinal upset, diarrhea, nausea, metallic taste. Rare risk of lactic acidosis.',
    nutrientDepletions: [
      {
        nutrient: 'Vitamin B12 (Cobalamin)',
        mechanism: 'Interferes with calcium-dependent binding of the intrinsic factor-B12 complex to ileal receptors.',
        replenishmentAdvice: 'Routine periodic B12 screening should be discussed with your physician. Any supplementation requires personalized clinical evaluation.'
      },
      {
        nutrient: 'Folate (Vitamin B9)',
        mechanism: 'Secondary reduction due to impaired cobalamin-dependent folate trap metabolism.',
        replenishmentAdvice: 'Ensure dietary intake of leafy greens and discuss folate evaluation with your clinician if B12 status is abnormal.'
      }
    ],
    optimalTiming: {
      bestTimeOfDay: 'With largest meals (typically breakfast and/or dinner)',
      foodRequirement: 'Take immediately with or right after food to minimize gastrointestinal distress and nausea.',
      criticalSpacingRules: [
        'Avoid heavy alcohol consumption due to heightened risk of lactic acidosis.',
        'Extended-release (ER) formulations must be swallowed whole with the evening meal.'
      ]
    },
    supplementInteractions: [
      {
        supplement: 'Berberine',
        riskLevel: 'caution',
        clinicalReason: 'Additive AMPK-activation mechanism; concurrent use can cause unexpected hypoglycemia. Monitor fasting glucose closely.'
      },
      {
        supplement: 'Alpha-Lipoic Acid (ALA)',
        riskLevel: 'safe',
        clinicalReason: 'Consult your pharmacist; no direct adverse pharmacokinetic contraindication documented, but monitor fasting glucose.'
      },
      {
        supplement: 'Chromium Picolinate',
        riskLevel: 'caution',
        clinicalReason: 'Potentiates insulin action; monitor for blood sugar drops.'
      }
    ],
    alternatives: ['Empagliflozin (SGLT2i)', 'Semaglutide (GLP-1 RA)', 'Pioglitazone'],
    warnings: 'Hold medication before iodinated radiocontrast imaging procedures and in states of acute renal impairment or sepsis.',
    interactions: ['Contrast dye', 'Cimetidine', 'Excessive alcohol'],
    sourceLabelUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=4fd916e7-03f1-4df2-8c08-a53b5adcbcc6',
    reviewerStatus: 'clinically_reviewed_monograph'
  },

  omeprazole: {
    name: 'Omeprazole (Prilosec)',
    class: 'Proton Pump Inhibitor (PPI)',
    uses: 'Suppresses gastric acid production for GERD, peptic ulcer disease, and erosive esophagitis.',
    sideEffects: 'Headache, abdominal pain, constipation, flatulence. Long-term use linked to bone fracture risk and C. difficile infection.',
    nutrientDepletions: [
      {
        nutrient: 'Magnesium',
        mechanism: 'Inhibits active transcellular TRPM6/TRPM7 magnesium channel transport in the colon.',
        replenishmentAdvice: 'Serum magnesium monitoring is advised by FDA guidance during chronic therapy. Discuss supplementation options with your doctor if levels decline.'
      },
      {
        nutrient: 'Vitamin B12',
        mechanism: 'Gastric acid is required to cleave dietary protein-bound cobalamin for absorption.',
        replenishmentAdvice: 'Sublingual or non-protein bound B12 forms may be discussed with your physician if long-term PPI therapy is prescribed.'
      },
      {
        nutrient: 'Calcium & Iron',
        mechanism: 'Low gastric pH is required to solubilize non-heme iron and calcium carbonate.',
        replenishmentAdvice: 'If calcium is clinically recommended, discuss Calcium Citrate (acid-independent absorption) versus Carbonate with your pharmacist.'
      },
      {
        nutrient: 'Zinc',
        mechanism: 'Gastric hypochlorhydria impairs zinc chelation and intestinal brush border uptake.',
        replenishmentAdvice: 'Discuss dietary zinc adequacy and testing with your clinician.'
      }
    ],
    optimalTiming: {
      bestTimeOfDay: '30 to 60 minutes before the FIRST meal of the day (Breakfast)',
      foodRequirement: 'Must be taken on an empty stomach prior to eating so the drug peaks when proton pumps are activated by food.',
      criticalSpacingRules: [
        'Do not crush or chew delayed-release capsules.',
        'Space at least 2 hours away from iron supplements, antifungal azoles, and thyroid medications.'
      ]
    },
    supplementInteractions: [
      {
        supplement: 'Iron Supplements (Ferrous Sulfate)',
        riskLevel: 'caution',
        clinicalReason: 'Absorption severely reduced by lack of stomach acid. Take with Vitamin C or space by 2 hours.'
      },
      {
        supplement: 'DGL Licorice / Slippery Elm',
        riskLevel: 'safe',
        clinicalReason: 'Demulcent herbs may be used for comfort under clinician review; space by 1 hour from oral medications.'
      },
      {
        supplement: 'Betaine HCl',
        riskLevel: 'dangerous',
        clinicalReason: 'Directly opposes PPI acid suppression; can cause severe mucosal burning while on a PPI.'
      }
    ],
    alternatives: ['Famotidine (H2 Blocker)', 'Vonoprazan (P-CAB)', 'Sucralfate'],
    warnings: 'Avoid unindicated long-term therapy without periodic deprescribing attempts. Rebound acid hypersecretion occurs on abrupt cessation.',
    interactions: ['Clopidogrel (CYP2C19 competition)', 'Methotrexate', 'Ketoconazole'],
    sourceLabelUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=41804f5e-4c74-4b47-8b0d-b8d4bb9f3f4c',
    reviewerStatus: 'clinically_reviewed_monograph'
  },

  atorvastatin: {
    name: 'Atorvastatin Calcium (Lipitor)',
    class: 'HMG-CoA Reductase Inhibitor (Statin)',
    uses: 'Lowers LDL cholesterol and cardiovascular morbidity by inhibiting endogenous hepatic cholesterol synthesis.',
    sideEffects: 'Myalgia, elevated liver enzymes, headache, slight risk of elevated fasting blood glucose.',
    nutrientDepletions: [
      {
        nutrient: 'Coenzyme Q10 (CoQ10 / Ubiquinol)',
        mechanism: 'HMG-CoA reductase is the rate-limiting enzyme in the mevalonate pathway, which synthesizes both cholesterol and CoQ10.',
        replenishmentAdvice: 'Discuss CoQ10 adequacy and muscle symptoms with your prescribing clinician.'
      },
      {
        nutrient: 'Vitamin K2 (Menaquinone)',
        mechanism: 'Inhibition of mevalonate synthesis reduces prenylation of vitamin K2-dependent matrix Gla proteins.',
        replenishmentAdvice: 'Discuss vitamin K adequacy with your physician.'
      }
    ],
    optimalTiming: {
      bestTimeOfDay: 'Evening or Bedtime (though Atorvastatin has a long half-life, evening dosing optimizes hepatic cholesterol suppression)',
      foodRequirement: 'Can be taken with or without food. Taking with a light evening snack reduces mild stomach upset.',
      criticalSpacingRules: [
        'Avoid consuming more than 1 liter of grapefruit juice daily (CYP3A4 inhibition elevates drug concentrations to toxic levels).'
      ]
    },
    supplementInteractions: [
      {
        supplement: 'Red Yeast Rice',
        riskLevel: 'dangerous',
        clinicalReason: 'Naturally contains monacolin K (identical to lovastatin); combining increases rhabdomyolysis risk.'
      },
      {
        supplement: 'CoQ10 / Ubiquinol',
        riskLevel: 'safe',
        clinicalReason: 'Consult your doctor; commonly reviewed for muscle comfort alongside statins without known pharmacokinetic contraindication.'
      },
      {
        supplement: 'High-Dose Niacin (>1g)',
        riskLevel: 'caution',
        clinicalReason: 'Additive risk of myopathy and hepatic toxicity. Requires liver panel monitoring.'
      }
    ],
    alternatives: ['Rosuvastatin', 'Ezetimibe', 'Bempedoic Acid', 'PCSK9 Inhibitors (Evolocumab)'],
    warnings: 'Promptly report unexplained muscle pain, tenderness, or weakness, especially if accompanied by dark urine.',
    interactions: ['Clarithromycin', 'Cyclosporine', 'Grapefruit juice'],
    sourceLabelUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=80509a25-a4f6-4916-a192-d352b2b17f54',
    reviewerStatus: 'clinically_reviewed_monograph'
  },

  levothyroxine: {
    name: 'Levothyroxine Sodium (Synthroid)',
    class: 'Synthetic Thyroid Hormone (T4)',
    uses: 'Replacement therapy for primary, secondary, and tertiary hypothyroidism, and TSH suppression post-thyroidectomy.',
    sideEffects: 'Tachycardia, palpitations, nervousness, heat intolerance, weight loss, insomnia (usually signs of overtreatment).',
    nutrientDepletions: [
      {
        nutrient: 'Zinc',
        mechanism: 'Altered thyroid hormone metabolism increases renal excretion and cellular turnover of zinc.',
        replenishmentAdvice: 'Zinc balance may be discussed with your physician. Mineral supplements must be spaced strictly away from thyroid hormone.'
      },
      {
        nutrient: 'Selenium',
        mechanism: 'Higher metabolic turnover increases selenium requirement for selenocysteine-dependent glutathione peroxidases and deiodinases.',
        replenishmentAdvice: 'Discuss dietary selenium sources and blood levels with your endocrinologist.'
      }
    ],
    optimalTiming: {
      bestTimeOfDay: 'First thing in the morning (60 minutes before breakfast) OR bedtime (at least 3-4 hours after the last meal)',
      foodRequirement: 'STRICT EMPTY STOMACH with a full 8 oz glass of water. Food, coffee, soy, and dairy drastically inhibit gut absorption.',
      criticalSpacingRules: [
        'Wait at least 60 MINUTES before drinking coffee or eating breakfast.',
        'Wait at least 4 HOURS before taking Calcium, Iron, Multivitamins, or Antacids.'
      ]
    },
    supplementInteractions: [
      {
        supplement: 'Iron (Ferrous Sulfate / Glycinate)',
        riskLevel: 'caution',
        clinicalReason: 'Forms an insoluble, non-absorbable chelate complex in the GI tract. MUST space by 4 full hours.'
      },
      {
        supplement: 'Calcium Carbonate / Citrate',
        riskLevel: 'caution',
        clinicalReason: 'Binds T4 in the stomach and reduces bioavailability by up to 30%. Must space by 4 hours.'
      },
      {
        supplement: 'Ashwagandha',
        riskLevel: 'caution',
        clinicalReason: 'Naturally stimulates thyroid hormone synthesis; can push TSH lower and cause hyperthyroid symptoms.'
      }
    ],
    alternatives: ['Liothyronine (Cytomel / T3)', 'Desiccated Thyroid (Armour Thyroid)', 'Tirosint (Liquid gel cap)'],
    warnings: 'Not for treatment of obesity or weight loss. Black box warning against use in euthyroid individuals.',
    interactions: ['Calcium', 'Iron', 'Cholestyramine', 'Proton Pump Inhibitors'],
    sourceLabelUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d5f5465f-61bb-7aaa-e053-2a95a90a8c3d',
    reviewerStatus: 'clinically_reviewed_monograph'
  },

  lisinopril: {
    name: 'Lisinopril (Zestril / Prinivil)',
    class: 'ACE Inhibitor (Angiotensin-Converting Enzyme)',
    uses: 'Management of hypertension, heart failure, and diabetic nephropathy preservation.',
    sideEffects: 'Persistent dry hacky cough (bradykinin-mediated), dizziness, hyperkalemia, headache. Rare angioedema.',
    nutrientDepletions: [
      {
        nutrient: 'Zinc',
        mechanism: 'ACE inhibitors chelate and increase urinary excretion of zinc.',
        replenishmentAdvice: 'Loss of taste (dysgeusia) can accompany zinc changes. Discuss zinc status and dietary intake with your clinician before starting supplements.'
      }
    ],
    optimalTiming: {
      bestTimeOfDay: 'Morning or Evening, but must be taken at the SAME consistent time every day',
      foodRequirement: 'Can be taken with or without food. Taking with a light meal can reduce orthostatic lightheadedness.',
      criticalSpacingRules: [
        'Avoid high-potassium salt substitutes (potassium chloride) and potassium supplements due to hyperkalemia risk.'
      ]
    },
    supplementInteractions: [
      {
        supplement: 'Potassium Supplements',
        riskLevel: 'dangerous',
        clinicalReason: 'Inhibition of aldosterone leads to potassium retention; concurrent potassium risks lethal cardiac arrhythmias.'
      },
      {
        supplement: 'Hawthorn Berry',
        riskLevel: 'caution',
        clinicalReason: 'Additive hypotensive effect; may cause blood pressure to dip too low. Monitor BP.'
      },
      {
        supplement: 'CoQ10',
        riskLevel: 'safe',
        clinicalReason: 'Supports vascular endothelial health safely alongside ACE inhibitors.'
      }
    ],
    alternatives: ['Losartan (ARB)', 'Amlodipine (CCB)', 'Telmisartan'],
    warnings: 'Contraindicated in pregnancy (fetal toxicity). Immediately seek emergency care if swelling of the lips, tongue, or throat occurs (angioedema).',
    interactions: ['Potassium supplements', 'NSAIDs (reduce antihypertensive effect)', 'Lithium'],
    sourceLabelUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=227364aa-72dc-4735-a744-fd26efccb4a3',
    reviewerStatus: 'clinically_reviewed_monograph'
  },

  sertraline: {
    name: 'Sertraline Hydrochloride (Zoloft)',
    class: 'Selective Serotonin Reuptake Inhibitor (SSRI)',
    uses: 'Major depressive disorder, obsessive-compulsive disorder, panic disorder, PTSD, social anxiety.',
    sideEffects: 'Nausea, insomnia, diarrhea, sexual dysfunction, tremor, dry mouth. Boxed warning for suicidality in young adults.',
    nutrientDepletions: [
      {
        nutrient: 'Folate & Vitamin B12',
        mechanism: 'SSRI clearance and central monoamine synthesis consume S-adenosylmethionine (SAMe) methyl groups.',
        replenishmentAdvice: 'Discuss serum folate and B12 status with your prescribing clinician if fatigue or mood response is suboptimal.'
      },
      {
        nutrient: 'Melatonin',
        mechanism: 'Serotonergic modulation can blunt natural pineal melatonin release curves in evening hours.',
        replenishmentAdvice: 'Discuss persistent sleep onset delays with your physician before introducing over-the-counter sleep aids.'
      }
    ],
    optimalTiming: {
      bestTimeOfDay: 'Morning if stimulating / causing insomnia; Bedtime if causing daytime sedation',
      foodRequirement: 'Take with breakfast or a meal to minimize the common initial side effect of nausea.',
      criticalSpacingRules: [
        'Never take with MAO inhibitors or serotonergic herbals.'
      ]
    },
    supplementInteractions: [
      {
        supplement: 'St. John’s Wort',
        riskLevel: 'dangerous',
        clinicalReason: 'Causes life-threatening Serotonin Syndrome (fever, clonus, autonomic instability). STRICTLY CONTRAINDICATED.'
      },
      {
        supplement: '5-HTP / L-Tryptophan',
        riskLevel: 'dangerous',
        clinicalReason: 'Direct serotonin precursor combined with reuptake inhibition dramatically elevates serotonin toxicity risk.'
      },
      {
        supplement: 'Magnesium L-Threonate / Glycinate',
        riskLevel: 'safe',
        clinicalReason: 'Supports NMDA receptor modulation and relaxes central nervous system hyperactivity safely.'
      }
    ],
    alternatives: ['Escitalopram (Lexapro)', 'Bupropion (Wellbutrin)', 'Duloxetine (Cymbalta)'],
    warnings: 'Do not stop taking abruptly; discontinuation syndrome causes brain zaps, dizziness, and intense rebound anxiety. Taper under supervision.',
    interactions: ['NSAIDs (elevated GI bleed risk)', 'Tramadol', 'St. John’s Wort', 'MAOIs'],
    sourceLabelUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=561fd838-8c1d-40db-a19b-c4d7ec6be99e',
    reviewerStatus: 'clinically_reviewed_monograph'
  },

  ibuprofen: {
    name: 'Ibuprofen (Advil / Motrin)',
    class: 'Non-Steroidal Anti-Inflammatory Drug (NSAID)',
    uses: 'Analgesic, antipyretic, and anti-inflammatory relief for acute pain, headache, and musculoskeletal injury.',
    sideEffects: 'Gastric ulceration, dyspepsia, fluid retention, nephrotoxicity, elevated blood pressure with chronic use.',
    nutrientDepletions: [
      {
        nutrient: 'Folate (Vitamin B9)',
        mechanism: 'Competitively inhibits folate-dependent cellular enzymes and increases renal clearance.',
        replenishmentAdvice: 'Support with dietary leafy greens or discuss folate adequacy during prolonged or frequent NSAID use.'
      },
      {
        nutrient: 'Melatonin',
        mechanism: 'Suppresses nighttime pineal prostaglandin and melatonin synthesis.',
        replenishmentAdvice: 'Discuss evening sleep patterns with your clinician if frequent nighttime NSAID use affects rest.'
      }
    ],
    optimalTiming: {
      bestTimeOfDay: 'As needed for acute pain, spaced every 6-8 hours',
      foodRequirement: 'ALWAYS TAKE WITH FOOD, a glass of milk, or a full snack to protect the gastric mucosal lining.',
      criticalSpacingRules: [
        'Do not take on an empty stomach.',
        'Space at least 2 hours before or 8 hours after low-dose cardio aspirin to prevent blunting aspirin antiplatelet effect.'
      ]
    },
    supplementInteractions: [
      {
        supplement: 'High-Dose Fish Oil (>2,000 mg EPA/DHA)',
        riskLevel: 'caution',
        clinicalReason: 'Both possess anti-platelet properties; concurrent high doses may increase bruising or bleeding tendencies.'
      },
      {
        supplement: 'Curcumin (Turmeric)',
        riskLevel: 'caution',
        clinicalReason: 'Natural COX-2 inhibitor; additive anti-inflammatory effect is beneficial but monitor for mild gastric irritation.'
      },
      {
        supplement: 'Ginkgo Biloba / Garlic Extracts',
        riskLevel: 'caution',
        clinicalReason: 'Increases microvascular bleeding risk when taken alongside regular NSAIDs.'
      }
    ],
    alternatives: ['Acetaminophen (Tylenol - non-anti-inflammatory)', 'Naproxen', 'Celocoxib (COX-2 selective)'],
    warnings: 'Black box warning for cardiovascular thrombotic events and gastrointestinal bleeding. Avoid in chronic kidney disease.',
    interactions: ['Aspirin', 'Lisinopril/ACEi', 'Anticoagulants (Warfarin/Eliquis)'],
    sourceLabelUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=00a12001-c67b-4029-a78b-d5106e23737b',
    reviewerStatus: 'clinically_reviewed_monograph'
  }
};

/**
 * Resolves medicine search query against deterministic database,
 * falling back to null if no exact or partial brand/generic match is found.
 */
export function getDeterministicMedicineData(query: string): EnhancedMedicineData | null {
  if (!query || typeof query !== 'string') return null;
  const clean = query.trim().toLowerCase();

  // 1. Direct match
  if (COMMON_DRUG_DATABASE[clean]) {
    return COMMON_DRUG_DATABASE[clean];
  }

  // 2. Alias / Brand matching
  const aliasMap: Record<string, string> = {
    'lipitor': 'atorvastatin',
    'prilosec': 'omeprazole',
    'synthroid': 'levothyroxine',
    'zestril': 'lisinopril',
    'prinivil': 'lisinopril',
    'zoloft': 'sertraline',
    'advil': 'ibuprofen',
    'motrin': 'ibuprofen',
    'glucophage': 'metformin'
  };

  if (aliasMap[clean] && COMMON_DRUG_DATABASE[aliasMap[clean]]) {
    return COMMON_DRUG_DATABASE[aliasMap[clean]];
  }

  // 3. Partial substring search
  for (const [key, data] of Object.entries(COMMON_DRUG_DATABASE)) {
    if (clean.includes(key) || data.name.toLowerCase().includes(clean)) {
      return data;
    }
  }

  return null;
}
