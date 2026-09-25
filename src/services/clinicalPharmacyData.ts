/**
 * Narrow medicine name lookup. Patient-facing instructions require a verified
 * product label and independent clinical review before being added here.
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

const COMMON_DRUG_DATABASE: Record<string, Pick<EnhancedMedicineData, 'name' | 'class'>> = {
  metformin: { name: 'Metformin Hydrochloride', class: 'Biguanide Antidiabetic' },
  omeprazole: { name: 'Omeprazole (Prilosec)', class: 'Proton Pump Inhibitor (PPI)' },
  atorvastatin: { name: 'Atorvastatin Calcium (Lipitor)', class: 'HMG-CoA Reductase Inhibitor (Statin)' },
  levothyroxine: { name: 'Levothyroxine Sodium (Synthroid)', class: 'Synthetic Thyroid Hormone (T4)' },
  lisinopril: { name: 'Lisinopril (Zestril / Prinivil)', class: 'ACE Inhibitor (Angiotensin-Converting Enzyme)' },
  sertraline: { name: 'Sertraline Hydrochloride (Zoloft)', class: 'Selective Serotonin Reuptake Inhibitor (SSRI)' },
  ibuprofen: { name: 'Ibuprofen (Advil / Motrin)', class: 'Non-Steroidal Anti-Inflammatory Drug (NSAID)' },
};

/** Exact generic/brand lookup. Only label-checked tablet timing is shown. */
export function getDeterministicMedicineData(query: string): EnhancedMedicineData | null {
  if (!query || typeof query !== 'string') return null;
  const clean = query.trim().toLowerCase();

  // Only names and classes remain from the old unsourced monographs.
  let match = COMMON_DRUG_DATABASE[clean];

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

  if (!match && aliasMap[clean]) match = COMMON_DRUG_DATABASE[aliasMap[clean]];

  // An unknown formulation must not inherit another product's instructions.
  if (!match) return null;
  const isTabletLevothyroxine = clean === 'levothyroxine';
  return {
    name: isTabletLevothyroxine ? 'Levothyroxine sodium tablet' : match.name,
    class: match.class,
    uses: 'Check the approved indication for your exact product and your clinician’s instructions.',
    sideEffects: 'Review the exact product label and discuss symptoms with your pharmacist or prescriber.',
    nutrientDepletions: [],
    optimalTiming: isTabletLevothyroxine ? {
      bestTimeOfDay: 'The linked tablet label says once daily, preferably 30–60 minutes before breakfast.',
      foodRequirement: 'The linked tablet label specifies an empty stomach. Confirm your own formulation and prescription.',
      criticalSpacingRules: ['The linked tablet label says to separate calcium carbonate and ferrous sulfate by at least 4 hours. Ask a pharmacist before changing your schedule.'],
    } : {
      bestTimeOfDay: 'Follow your own prescription or package label.',
      foodRequirement: 'Food instructions depend on the exact formulation.',
      criticalSpacingRules: [],
    },
    supplementInteractions: [], alternatives: [],
    warnings: 'This lookup has not received independent clinical review. Do not start, stop, or change treatment from this screen.',
    interactions: [],
    sourceLabelUrl: isTabletLevothyroxine ? 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d5f5465f-61bb-7aaa-e053-2a95a90a8c3d' : undefined,
    reviewerStatus: isTabletLevothyroxine ? 'label_checked_not_clinician_reviewed' : 'not_clinically_reviewed',
  };
}
