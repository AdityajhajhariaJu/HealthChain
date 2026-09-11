import { getProfile } from './ProfileEngine';
import { getActiveCase, getCases, updateCaseConnectionMap } from './CaseEngine';
import { getUnifiedCaseScope } from './caseWorkspace';
import { getSuspectFoodsLeaderboard, getActiveTrial } from './TriggerEngine';
import { getItemSync, setItemSync } from './storage';

export interface ConnectionStream {
  id: 'labs' | 'notes' | 'vitals' | 'diet';
  title: string;
  icon: string;
  color: string;
  count: number;
  status: string;
  items: string[];
}

export interface SpecialistDialogue {
  role: string;
  doctorName: string;
  specialty: string;
  icon: string;
  color: string;
  bg: string;
  finding: string;
  organ: string;
  credentials: string;
}

export interface ClinicalMissItem {
  overlookedBy: string;
  standardFinding: string;
  whatWasMissed: string;
  clinicalImpact: string;
  hiddenConnection: string;
}

export interface NodeDetail {
  id: string;
  title: string;
  system: 'autonomic' | 'metabolic' | 'gut' | 'neuro' | 'immune' | 'vascular';
  systemName: string;
  systemIcon: string;
  confidence: number;
  biochemicalMechanism: string;
  biomarkers: {
    name: string;
    standardRange: string;
    optimalRange: string;
    userValue: string;
    status: 'depleted' | 'elevated' | 'suboptimal' | 'normal';
    clinicalNote: string;
  }[];
  dietaryTriggers: {
    name: string;
    category: string;
    icon: string;
    impact: string;
  }[];
  specialistQuote: {
    doctor: string;
    role: string;
    quote: string;
  };
  whatDoctorsMissed: string;
  confirmatoryWorkup: string[];
}

export interface CausalCascadeStage {
  stage: number;
  title: string;
  organSystem: string;
  organIcon: string;
  mechanism: string;
  clinicalSigns: string[];
  biochemicalLag: string;
  upstreamCause: string;
  downstreamEffect: string;
}

export interface SymptomClusterItem {
  id: string;
  name: string;
  icon: string;
  commonMisattribution: string;
  rootCauseAxis: string;
  involvedBoards: string[];
}

export interface SystemAxis {
  id: 'all' | 'autonomic' | 'metabolic' | 'gut' | 'neuro' | 'immune';
  label: string;
  icon: string;
  color: string;
  count: number;
}

export interface ConnectionMapGraph {
  centralSymptoms: { id: string; label: string; severity: 'high' | 'medium' | 'low'; system?: string }[];
  conditions: {
    id: string;
    label: string;
    confidence: number;
    specialty: string;
    category: 'metabolic' | 'autonomic' | 'gastrointestinal' | 'inflammatory' | 'vascular' | 'neuro';
    rationale: string;
  }[];
  connections: {
    from: string;
    to: string;
    type: 'shared_symptom' | 'causal_progression' | 'differential_overlap' | 'common_mechanism';
    label: string;
    strength: 'strong' | 'moderate' | 'weak';
    whyItExists?: string;
    supportingEvidenceIds?: string[];
    weakeningFactors?: string[];
  }[];
  precautions: { text: string; severity: 'red_flag' | 'watch' | 'info'; relatedConditions: string[] }[];
  missingEvidence: { test: string; wouldDifferentiate: string[]; urgency: string; recommendedSpecialists: string }[];
  narrative: string;
}

export interface ConnectionDetectiveReport {
  id: string;
  generatedAt: string;
  patientName: string;
  primaryHypothesis: string;
  matchConfidence: number;
  streams: ConnectionStream[];
  consensusDialogue: SpecialistDialogue[];
  clinicalMisses: ClinicalMissItem[];
  mapData: ConnectionMapGraph;
  systemAxes: SystemAxis[];
  cascadeStages: CausalCascadeStage[];
  symptomCluster: SymptomClusterItem[];
  nodeDetails: Record<string, NodeDetail>;
  doctorDossier: {
    sbar: {
      situation: string;
      background: string;
      assessment: string;
      recommendation: string;
    };
    testsToOrder: { test: string; rationale: string; priority: 'High' | 'Routine' }[];
    icdCodes: { code: string; label: string }[];
    citations: string[];
  };
}

const CONNECTION_STORAGE_KEY = 'hc_connection_detective_latest';


export function getConnectionDetectiveReport(customReviewReport?:any,customCaseItem?:any):ConnectionDetectiveReport {
  const caseItem=customCaseItem!==undefined?customCaseItem:getUnifiedCaseScope().caseItem;
  const saved=customReviewReport || caseItem?.reviews?.[0]?.report;
  // Legacy snapshots remain in history, but must be re-reviewed before their
  // template findings can populate a patient-facing clinical map.
  const review=saved?.groundingVersion===1?saved:null;
  const facts=review?.documentedFacts || [];
  const perspectives=review?.meaningfulPerspectives || [];
  const alternatives=review?.reasoningPipeline?.stage5_alternatives || [];
  const assessments=review?.reasoningPipeline?.stage6_balancedAssessments || [];
  const nodeDetails:Record<string,NodeDetail>={};
  for (const alternative of alternatives) nodeDetails[alternative.id]={
    id:alternative.id,title:alternative.title,system:'neuro',systemName:'Case review',systemIcon:'📄',confidence:0,
    biochemicalMechanism:alternative.mechanismSummary || 'No mechanism established.',
    biomarkers:[],dietaryTriggers:[],specialistQuote:{doctor:'AI consideration',role:'Evidence review',quote:alternative.rationale || ''},
    whatDoctorsMissed:'No conclusion about prior clinical care is made.',
    confirmatoryWorkup:(assessments.find((a:any)=>a.alternativeId===alternative.id)?.missingEvidenceWhatWouldChangeIt || []).map((m:any)=>m.testOrObservation),
  };

  const stream=(id:ConnectionStream['id'],title:string,items:string[],color:string):ConnectionStream=>({id,title,icon:'',items,count:items.length,status:items.length?'Recorded observations':'No records linked',color});
  return {
    id:caseItem?.id || 'unassigned',generatedAt:caseItem?.reviews?.[0]?.createdAt || '',
    patientName:getProfile()?.name || '',primaryHypothesis:review?.primaryHypothesis || 'Run a source-linked review to explore this case',
    matchConfidence:0,
    streams:[
      stream('labs','Lab & Blood Tests',facts.filter((f:any)=>f.category==='extracted_finding').map((f:any)=>f.fact),'#0284C7'),
      stream('notes','Doctor & Clinic Notes',facts.filter((f:any)=>f.category==='documented_clinician_assessment').map((f:any)=>f.fact),'#7C3AED'),
      stream('vitals','Wearables & Vitals',facts.filter((f:any)=>f.category==='recorded_measurement').map((f:any)=>f.fact),'#0D9488'),
      stream('diet','Reported Observations',facts.filter((f:any)=>f.category==='user_report').map((f:any)=>f.fact),'#0D9488'),
    ],
    consensusDialogue:perspectives.map((p:any)=>({role:'AI perspective',doctorName:p.doctorName,specialty:p.specialty,icon:'📄',color:'#0D9488',bg:'#F0FDFA',finding:p.interpretation,organ:p.questionAddressed,credentials:'AI-generated; not a clinician consultation'})),
    clinicalMisses:(review?.missingLinks || []).map((question:string)=>({overlookedBy:'Not established',standardFinding:'Open information gap',whatWasMissed:question,clinicalImpact:'Review this question in context.',hiddenConnection:'No hidden connection assumed.'})),
    cascadeStages:[],
    symptomCluster:facts.filter((f:any)=>f.category==='user_report').map((f:any)=>({id:f.id,name:f.fact,icon:'📄',commonMisattribution:'User-reported observation',rootCauseAxis:'Not established',involvedBoards:perspectives.filter((p:any)=>p.evidenceConsidered.includes(f.id)).map((p:any)=>p.specialty)})),
    nodeDetails,systemAxes:[{id:'all',label:'All evidence',icon:'📄',color:'#0D9488',count:facts.length}],
    mapData:{centralSymptoms:facts.filter((f:any)=>f.category==='user_report').map((f:any)=>({id:f.id,label:f.fact,severity:'low' as const})),
      conditions:alternatives.map((a:any)=>({id:a.id,label:a.title,confidence:0,specialty:'AI consideration',category:'neuro' as const,rationale:a.mechanismSummary || ''})),
      connections:assessments.flatMap((a:any)=>(a.supportingEvidence || []).map((e:any)=>({from:a.alternativeId,to:e.factId,type:'differential_overlap' as const,label:'Proposed relationship',strength:'weak' as const,whyItExists:e.description,supportingEvidenceIds:[e.factId],weakeningFactors:(a.conflictingEvidence || []).map((c:any)=>c.description)}))),
      precautions:[],missingEvidence:[],narrative:review?.executiveSummary || 'No grounded review available.'},
    doctorDossier:{sbar:{
      situation:caseItem?.intakeData?.chiefComplaint || '',
      background:facts.slice(0,4).map((f:any)=>f.fact).join('\n'),
      assessment:review?.executiveSummary || '',
      recommendation:(review?.questionsForClinician || []).join('\n'),
    },testsToOrder:[],icdCodes:[],citations:[]},
  };
}

export function getConnectionStreams(): ConnectionStream[] {
  return getConnectionDetectiveReport().streams;
}

export function getSpecialistDialogue(): SpecialistDialogue[] {
  return getConnectionDetectiveReport().consensusDialogue;
}

export function getClinicalMisses(): ClinicalMissItem[] {
  return getConnectionDetectiveReport().clinicalMisses;
}

export function getConnectionMapGraph(): ConnectionMapGraph {
  return getConnectionDetectiveReport().mapData;
}

export function getDoctorDossier() {
  return getConnectionDetectiveReport().doctorDossier;
}

export function getCausalCascadeStages(): CausalCascadeStage[] {
  return getConnectionDetectiveReport().cascadeStages;
}

export function getSymptomCluster(): SymptomClusterItem[] {
  return getConnectionDetectiveReport().symptomCluster;
}

export function getNodeDetail(nodeId: string): NodeDetail | undefined {
  return getConnectionDetectiveReport().nodeDetails[nodeId];
}

export function evaluateSymptomCluster(selectedIds: string[]): {
  matchConfidence: number;
  summonedBoards: string[];
  primaryAxes: string[];
  summaryNote: string;
} {
  const cluster = getSymptomCluster().filter(item => selectedIds.includes(item.id));
  return { matchConfidence: 0, summonedBoards: [], primaryAxes: [],
    summaryNote: cluster.length + ' recorded observations selected. Selection alone does not establish a shared cause.' };

}

// ─────────────────────────────────────────────────────────────
// 5. DUAL-BAND OPTIMAL FUNCTIONAL LAB BIOMARKERS ENGINE
// ─────────────────────────────────────────────────────────────
export interface FunctionalBiomarker {
  id: string;
  name: string;
  category: 'metabolic' | 'endocrine' | 'immune' | 'enteric' | 'neuromuscular';
  categoryLabel: string;
  categoryIcon: string;
  standardRange: { min: number; max: number; unit: string; label: string };
  optimalRange: { min: number; max: number; unit: string; label: string };
  userValue: number;
  userUnit: string;
  status: 'critical_low' | 'suboptimal_low' | 'optimal' | 'suboptimal_high' | 'critical_high';
  clinicalSummary: string;
  whyDoctorsMissIt: string;
  actionableDietaryCofactors: string[];
  retestTimeline: string;
}

export const BASE_FUNCTIONAL_BIOMARKERS: FunctionalBiomarker[] = [
    {
      id: 'ferritin',
      name: 'Serum Ferritin (Storage Iron)',
      category: 'metabolic',
      categoryLabel: 'Cellular Energetics',
      categoryIcon: '⚡',
      standardRange: { min: 12, max: 150, unit: 'ng/mL', label: '12 – 150 ng/mL' },
      optimalRange: { min: 50, max: 90, unit: 'ng/mL', label: '50 – 90 ng/mL' },
      userValue: 14,
      userUnit: 'ng/mL',
      status: 'suboptimal_low',
      clinicalSummary:
        'While hemoglobin (13.8 g/dL) is normal, bone marrow iron stores are critically depleted. Mitochondrial electron transport chain complexes I and IV starve for heme iron, causing relentless midday fatigue and cognitive latency.',
      whyDoctorsMissIt:
        'Standard primary care orders Hemoglobin or Serum Iron only. Ferritin between 12-49 ng/mL is marked "Normal" by automated hospital software despite profound intracellular mitochondrial starvation.',
      actionableDietaryCofactors: [
        'Heme Iron (Pasture-Raised Liver/Poultry) or Iron Bisglycinate with 200mg Vitamin C',
        'Avoid calcium supplements, tea, and coffee within 2 hours of iron-rich meals (tannin chelation)',
        'Lactoferrin 100mg to improve iron absorption across duodenal enterocytes',
      ],
      retestTimeline: 'Retest Ferritin & Total Iron Binding Capacity in 8 weeks.',
    },
    {
      id: 'tsh',
      name: 'Thyroid Stimulating Hormone (TSH)',
      category: 'endocrine',
      categoryLabel: 'Thyroid Axis',
      categoryIcon: '🦋',
      standardRange: { min: 0.45, max: 4.5, unit: 'mIU/L', label: '0.45 – 4.5 mIU/L' },
      optimalRange: { min: 1.0, max: 2.0, unit: 'mIU/L', label: '1.0 – 2.0 mIU/L' },
      userValue: 3.2,
      userUnit: 'mIU/L',
      status: 'suboptimal_high',
      clinicalSummary:
        'TSH of 3.2 mIU/L indicates the pituitary is shouting at the thyroid gland. Early compensatory stress slows colonic peristalsis, reduces stomach acid secretion (hypochlorhydria), and induces peripheral cold sensitivity.',
      whyDoctorsMissIt:
        'Labs use a wide statistical reference range up to 4.5 mIU/L that includes individuals with early asymptomatic Hashimoto thyroiditis. Symptoms frequently emerge above 2.5 mIU/L.',
      actionableDietaryCofactors: [
        'Selenium (200 mcg from 2 Brazil nuts daily) to facilitate deiodinase T4 to T3 conversion',
        'Zinc Glycinate 25mg and Tyrosine 500mg',
        'Check Anti-TPO and Anti-Thyroglobulin antibodies to rule out early autoimmune thyroiditis',
      ],
      retestTimeline: 'Retest Full Thyroid Panel (TSH, Free T3, Free T4, Anti-TPO) in 12 weeks.',
    },
    {
      id: 'free_t3',
      name: 'Free Triiodothyronine (Free T3)',
      category: 'endocrine',
      categoryLabel: 'Metabolic Active Hormone',
      categoryIcon: '🔥',
      standardRange: { min: 2.0, max: 4.4, unit: 'pg/mL', label: '2.0 – 4.4 pg/mL' },
      optimalRange: { min: 3.2, max: 4.2, unit: 'pg/mL', label: '3.2 – 4.2 pg/mL' },
      userValue: 2.4,
      userUnit: 'pg/mL',
      status: 'suboptimal_low',
      clinicalSummary:
        'Free T3 is the active nuclear transcription driver for basal metabolic rate. Low-normal levels represent impaired peripheral conversion in the liver and gut mucosa, often suppressed by low ferritin or chronic gut endotoxemia.',
      whyDoctorsMissIt:
        '90% of routine clinical visits order TSH only. Free T3 is omitted, leaving cellular hypothyroidism entirely undetected.',
      actionableDietaryCofactors: [
        'Heal gut mucosal lining to restore enteric 5′-deiodinase enzyme activity',
        'Ensure adequate carbohydrate intake (>120g/day) to prevent cortisol-driven reverse T3 pooling',
        'Ashwagandha KSM-66 (300mg) for hypothalamic-pituitary-thyroid axis sensitization',
      ],
      retestTimeline: 'Retest alongside TSH and Reverse T3 in 8 weeks.',
    },
    {
      id: 'vitamin_d3',
      name: '25-Hydroxy Vitamin D3',
      category: 'immune',
      categoryLabel: 'Immunomodulation & Barrier',
      categoryIcon: '☀️',
      standardRange: { min: 20, max: 100, unit: 'ng/mL', label: '20 – 100 ng/mL' },
      optimalRange: { min: 50, max: 80, unit: 'ng/mL', label: '50 – 80 ng/mL' },
      userValue: 26,
      userUnit: 'ng/mL',
      status: 'suboptimal_low',
      clinicalSummary:
        'At 26 ng/mL, the nuclear vitamin D receptor (VDR) is insufficiently activated. Intestinal epithelial claudin tight junctions become hyperpermeable, and regulatory T-cell (Treg) induction drops, fostering histamine hypersensitivity.',
      whyDoctorsMissIt:
        'Standard lab cutoff is set at 20 or 30 ng/mL purely to prevent bone rickets. Optimal immune tolerance and gut barrier integrity require > 50 ng/mL.',
      actionableDietaryCofactors: [
        'Vitamin D3 (5,000 IU) emulsified with Vitamin K2 (MK-7 100 mcg) taken with fat-containing breakfast',
        'Magnesium Glycinate 300mg at night (Magnesium is mandatory cofactor for hepatic 25-hydroxylase)',
      ],
      retestTimeline: 'Retest 25-OH Vitamin D3 in 10 weeks.',
    },
    {
      id: 'vitamin_b12',
      name: 'Active Vitamin B12 (Cobalamin)',
      category: 'neuromuscular',
      categoryLabel: 'Myelin & Neurological Axis',
      categoryIcon: '🧠',
      standardRange: { min: 200, max: 900, unit: 'pg/mL', label: '200 – 900 pg/mL' },
      optimalRange: { min: 500, max: 1000, unit: 'pg/mL', label: '500 – 1000 pg/mL' },
      userValue: 280,
      userUnit: 'pg/mL',
      status: 'suboptimal_low',
      clinicalSummary:
        'Values between 200-400 pg/mL fall into the neurological "grey-zone". Axonal myelin sheath maintenance is compromised, provoking autonomic orthostatic dizziness, paresthesias, and slower neural conduction.',
      whyDoctorsMissIt:
        'Labs flag deficiency only under 200 pg/mL. Japanese neurological guidelines mandate treatment below 500 pg/mL to prevent irreversible peripheral neuropathy.',
      actionableDietaryCofactors: [
        'Sublingual Methylcobalamin + Adenosylcobalamin 1000 mcg',
        'Avoid concurrent antacids/PPIs that inhibit gastric parietal intrinsic factor secretion',
      ],
      retestTimeline: 'Retest B12 + Methylmalonic Acid (MMA) in 8 weeks.',
    },
    {
      id: 'fasting_insulin',
      name: 'Fasting Serum Insulin',
      category: 'metabolic',
      categoryLabel: 'Glycemic & Vascular Axis',
      categoryIcon: '🩸',
      standardRange: { min: 2.6, max: 24.9, unit: 'µIU/mL', label: '2.6 – 24.9 µIU/mL' },
      optimalRange: { min: 2.0, max: 5.5, unit: 'µIU/mL', label: '2.0 – 5.5 µIU/mL' },
      userValue: 12.4,
      userUnit: 'µIU/mL',
      status: 'suboptimal_high',
      clinicalSummary:
        'Fasting insulin of 12.4 µIU/mL signals moderate hyperinsulinemia. The pancreas must oversecrete insulin to maintain a "normal" fasting glucose (92 mg/dL), driving postprandial reactive hypoglycemic brain fog.',
      whyDoctorsMissIt:
        'Standard lab cutoff allows up to 24.9 µIU/mL. Elevated fasting insulin precedes abnormal fasting glucose or HbA1c by 7 to 10 years.',
      actionableDietaryCofactors: [
        'Chromium Picolinate (200 mcg) + Berberine HCL 500mg prior to carbohydrate meals',
        '10-minute post-meal brisk walking to activate GLUT4 non-insulin glucose translocation in skeletal muscle',
      ],
      retestTimeline: 'Retest Fasting Insulin & Glucose (HOMA-IR calculation) in 12 weeks.',
    },
    {
      id: 'hs_crp',
      name: 'High-Sensitivity C-Reactive Protein',
      category: 'immune',
      categoryLabel: 'Systemic Endothelial Health',
      categoryIcon: '🛡️',
      standardRange: { min: 0.1, max: 3.0, unit: 'mg/L', label: '< 3.0 mg/L' },
      optimalRange: { min: 0.05, max: 0.5, unit: 'mg/L', label: '< 0.5 mg/L' },
      userValue: 1.8,
      userUnit: 'mg/L',
      status: 'suboptimal_high',
      clinicalSummary:
        'hs-CRP of 1.8 mg/L represents low-grade smoldering vascular inflammation. It correlates with endothelial shear sensitivity, cerebral microvascular reactivity, and amplified histamine response.',
      whyDoctorsMissIt:
        'Clinics view <3.0 mg/L as "average cardiovascular risk" and ignore values between 1.0-3.0 mg/L as clinically insignificant.',
      actionableDietaryCofactors: [
        'Omega-3 EPA/DHA (2,000 mg pure triglyceride form)',
        'Curcumin phytosome (Meriva 500mg) with black pepper piperine',
        'Elimination of pro-inflammatory refined seed oils (soybean, cottonseed, corn oil)',
      ],
      retestTimeline: 'Retest hs-CRP alongside Lipid Panel in 8 weeks.',
    },
    {
      id: 'homocysteine',
      name: 'Serum Homocysteine',
      category: 'metabolic',
      categoryLabel: 'Methylation & Vascular Shear',
      categoryIcon: '🧬',
      standardRange: { min: 4.0, max: 15.0, unit: 'µmol/L', label: '< 15.0 µmol/L' },
      optimalRange: { min: 6.0, max: 8.0, unit: 'µmol/L', label: '6.0 – 8.0 µmol/L' },
      userValue: 11.8,
      userUnit: 'µmol/L',
      status: 'suboptimal_high',
      clinicalSummary:
        'Homocysteine > 10 µmol/L indicates impaired methylation cycle (often heterozygous MTHFR C677T variant). Free homocysteine causes endothelial nitric oxide uncoupling and cranial arteriolar irritability.',
      whyDoctorsMissIt:
        'Hospital labs only flag hyperhomocysteinemia at > 15 µmol/L, ignoring neurovascular risk and migraine susceptibility between 9-14 µmol/L.',
      actionableDietaryCofactors: [
        'Active L-Methylfolate (5-MTHF 800 mcg) + Pyridoxal-5-Phosphate (Active B6 25mg)',
        'Trimethylglycine (TMG / Betaine anhydrous 500mg) to support alternate BHMT remethylation',
      ],
      retestTimeline: 'Retest Homocysteine in 8 weeks.',
    },
    {
      id: 'dao_activity',
      name: 'Diamine Oxidase (DAO) Activity',
      category: 'enteric',
      categoryLabel: 'Biogenic Amine Clearance',
      categoryIcon: '🧪',
      standardRange: { min: 10.0, max: 30.0, unit: 'U/mL', label: '> 10.0 U/mL' },
      optimalRange: { min: 15.0, max: 30.0, unit: 'U/mL', label: '> 15.0 U/mL' },
      userValue: 6.8,
      userUnit: 'U/mL',
      status: 'critical_low',
      clinicalSummary:
        'Severe DAO deficiency (<10 U/mL). Intestinal mucosal enterocytes cannot degrade dietary histamine, causing biogenic amines from achaar, curd, and aged foods to enter portal circulation and provoke palpitations, flushing, and migraines.',
      whyDoctorsMissIt:
        'Conventional gastroenterology rarely runs serum DAO assays, frequently misdiagnosing amine intolerance as irritable bowel syndrome (IBS) or anxiety neurosis.',
      actionableDietaryCofactors: [
        'Supplemental Diamine Oxidase enzyme capsules taken 15 minutes prior to histamine-containing meals',
        'Vitamin B6 (P5P), Vitamin C, and Copper (essential enzyme cofactors for endogenous DAO synthesis)',
        '28-Day Histamine & Mast Cell Hunt protocol',
      ],
      retestTimeline: 'Retest Serum DAO Activity after 6 weeks on low-amine protocol.',
    },
    {
      id: 'rbc_magnesium',
      name: 'RBC (Red Blood Cell) Magnesium',
      category: 'neuromuscular',
      categoryLabel: 'Cellular Neuromuscular Tone',
      categoryIcon: '💎',
      standardRange: { min: 1.7, max: 2.4, unit: 'mg/dL', label: '1.7 – 2.4 (Serum)' },
      optimalRange: { min: 6.0, max: 6.8, unit: 'mg/dL', label: '6.0 – 6.8 mg/dL (RBC)' },
      userValue: 4.4,
      userUnit: 'mg/dL',
      status: 'suboptimal_low',
      clinicalSummary:
        'Only 1% of total body magnesium resides in serum. RBC magnesium reflects true intracellular reserves. Low intracellular magnesium promotes suboccipital myofascial trigger bands, calf cramps, and cardiac ventricular hyper-excitability.',
      whyDoctorsMissIt:
        'Standard chemistry panels measure Serum Magnesium only. The body aggressively mobilizes magnesium from bones and red cells to keep serum levels constant until end-stage exhaustion.',
      actionableDietaryCofactors: [
        'Magnesium Malate (200mg morning for cellular Krebs cycle) + Magnesium Glycinate (200mg night)',
        'Epsom salt (Magnesium sulfate) transdermal foot soaks twice weekly',
        'Pumpkin seeds (pepitas) and leafy green moringa leaves',
      ],
      retestTimeline: 'Retest RBC Magnesium in 10 weeks.',
    },
    {
      id: 'tsat',
      name: 'Transferrin Saturation (TSAT)',
      category: 'metabolic',
      categoryLabel: 'Cellular Energetics',
      categoryIcon: '⚡',
      standardRange: { min: 15, max: 50, unit: '%', label: '15 – 50%' },
      optimalRange: { min: 25, max: 38, unit: '%', label: '25 – 38%' },
      userValue: 18,
      userUnit: '%',
      status: 'suboptimal_low',
      clinicalSummary:
        'TSAT measures the percentage of transferrin protein bound with iron. At 18%, circulating iron delivery to bone marrow and cardiac mitochondria is sub-therapeutic.',
      whyDoctorsMissIt:
        'Clinics look only at Serum Iron; without calculating TSAT and Ferritin simultaneously, tissue-level iron delivery deficits remain invisible.',
      actionableDietaryCofactors: [
        'Pair iron foods with ascorbic acid (amla / lemon juice) to enhance luminal transferrin binding',
        'Avoid polyphenol teas within 90 minutes of protein meals',
      ],
      retestTimeline: 'Retest with Complete Iron Binding Panel in 8 weeks.',
    },
    {
      id: 'tibc',
      name: 'Total Iron Binding Capacity (TIBC)',
      category: 'metabolic',
      categoryLabel: 'Cellular Energetics',
      categoryIcon: '⚡',
      standardRange: { min: 250, max: 450, unit: 'µg/dL', label: '250 – 450 µg/dL' },
      optimalRange: { min: 280, max: 350, unit: 'µg/dL', label: '280 – 350 µg/dL' },
      userValue: 410,
      userUnit: 'µg/dL',
      status: 'suboptimal_high',
      clinicalSummary:
        'Elevated TIBC (410 µg/dL) indicates liver is synthesizing excess transferrin carrier proteins because intracellular iron stores are starved.',
      whyDoctorsMissIt:
        'Marked normal because 410 is below the 450 cutoff, despite signalling acute marrow hunger.',
      actionableDietaryCofactors: [
        'Iron Bisglycinate 25mg with 500mg Vitamin C',
        'Beetroot and pomegranate fresh cold-pressed juice with ginger',
      ],
      retestTimeline: 'Retest in 8 weeks.',
    },
    {
      id: 'mma',
      name: 'Methylmalonic Acid (MMA)',
      category: 'metabolic',
      categoryLabel: 'Cellular Energetics',
      categoryIcon: '⚡',
      standardRange: { min: 0.0, max: 0.40, unit: 'µmol/L', label: '< 0.40 µmol/L' },
      optimalRange: { min: 0.0, max: 0.20, unit: 'µmol/L', label: '< 0.20 µmol/L' },
      userValue: 0.28,
      userUnit: 'µmol/L',
      status: 'suboptimal_high',
      clinicalSummary:
        'MMA accumulates when mitochondrial methylmalonyl-CoA mutase lacks cobalamin cofactor. Elevated MMA is the gold standard proof of cellular B12 starvation even if serum B12 appears normal.',
      whyDoctorsMissIt:
        'Serum B12 tests measure inactive B12 analogues. MMA testing is omitted in 95% of routine checkups.',
      actionableDietaryCofactors: [
        'Sublingual Methylcobalamin + Adenosylcobalamin (1,000 mcg daily)',
        'Nutritional yeast fortified with active bioavailable B-complex',
      ],
      retestTimeline: 'Retest MMA in 12 weeks.',
    },
    {
      id: 'free_t4',
      name: 'Free Thyroxine (Free T4)',
      category: 'endocrine',
      categoryLabel: 'Thyroid Axis',
      categoryIcon: '🦋',
      standardRange: { min: 0.8, max: 1.8, unit: 'ng/dL', label: '0.8 – 1.8 ng/dL' },
      optimalRange: { min: 1.1, max: 1.5, unit: 'ng/dL', label: '1.1 – 1.5 ng/dL' },
      userValue: 1.0,
      userUnit: 'ng/dL',
      status: 'suboptimal_low',
      clinicalSummary:
        'Low-optimal Free T4 provides an inadequate reservoir for conversion to active T3, frequently driving morning brain fog and cold extremities.',
      whyDoctorsMissIt:
        'Falls inside 0.8-1.8 laboratory range, leading doctors to dismiss persistent hypothyroid symptoms.',
      actionableDietaryCofactors: [
        'Iodine from Himalayan pink salt and kelp (in moderation)',
        'Zinc glycinate and L-Tyrosine 500mg morning on empty stomach',
      ],
      retestTimeline: 'Retest in 12 weeks alongside TSH and fT3.',
    },
    {
      id: 'reverse_t3',
      name: 'Reverse T3 (rT3)',
      category: 'endocrine',
      categoryLabel: 'Thyroid Axis',
      categoryIcon: '🦋',
      standardRange: { min: 9.0, max: 24.0, unit: 'ng/dL', label: '9.0 – 24.0 ng/dL' },
      optimalRange: { min: 8.0, max: 14.0, unit: 'ng/dL', label: '< 14.0 ng/dL' },
      userValue: 21.5,
      userUnit: 'ng/dL',
      status: 'suboptimal_high',
      clinicalSummary:
        'Reverse T3 acts as a competitive antagonist at T3 receptors. High rT3 puts cells into metabolic hibernation, slowing digestion and energy expenditure under stress.',
      whyDoctorsMissIt:
        'Rarely ordered in standard hospital panels; patients are told their thyroid is fine despite receptor-level blockage.',
      actionableDietaryCofactors: [
        'Ashwagandha KSM-66 and Holy Basil (Tulsi) to lower cortisol-driven deiodinase III activity',
        'Address occult gut inflammation and iron depletion',
      ],
      retestTimeline: 'Retest Free T3 / Reverse T3 ratio in 10 weeks.',
    },
    {
      id: 'cortisol_am',
      name: 'Morning Serum Cortisol (8:00 AM)',
      category: 'endocrine',
      categoryLabel: 'Thyroid Axis',
      categoryIcon: '🦋',
      standardRange: { min: 4.0, max: 22.0, unit: 'µg/dL', label: '4.0 – 22.0 µg/dL' },
      optimalRange: { min: 14.0, max: 18.0, unit: 'µg/dL', label: '14.0 – 18.0 µg/dL' },
      userValue: 9.2,
      userUnit: 'µg/dL',
      status: 'suboptimal_low',
      clinicalSummary:
        'Blunted morning cortisol awakening response (CAR). Low 8 AM cortisol explains difficulty waking, morning hypotension, and reliance on caffeine.',
      whyDoctorsMissIt:
        'Anything above 4.0 µg/dL rules out Addison disease in hospitals, missing functional adrenal fatigue.',
      actionableDietaryCofactors: [
        'Electrolyte water with pinch of rock salt and lemon juice within 15 min of waking',
        'Morning sunlight exposure (10-15 min) to anchor suprachiasmatic circadian rhythm',
      ],
      retestTimeline: 'Retest AM Cortisol & DHEA-S in 8 weeks.',
    },
    {
      id: 'apob',
      name: 'Apolipoprotein B (ApoB)',
      category: 'metabolic',
      categoryLabel: 'Cardiometabolic Axis',
      categoryIcon: '🫀',
      standardRange: { min: 50, max: 130, unit: 'mg/dL', label: '50 – 130 mg/dL' },
      optimalRange: { min: 40, max: 70, unit: 'mg/dL', label: '< 70 mg/dL' },
      userValue: 88,
      userUnit: 'mg/dL',
      status: 'suboptimal_high',
      clinicalSummary:
        'ApoB counts the exact number of atherogenic particles (LDL, VLDL, IDL). At 88 mg/dL, particle burden creates low-grade vascular friction.',
      whyDoctorsMissIt:
        'Standard lipid panels measure LDL cholesterol mass, not particle count. Small dense particles are overlooked.',
      actionableDietaryCofactors: [
        'Soluble fiber (Isabgol / Psyllium husk 5g daily) to bind bile acids',
        'Ample cold-pressed extra virgin olive oil and mustard seed oil',
      ],
      retestTimeline: 'Retest Lipid & ApoB profile in 12 weeks.',
    },
    {
      id: 'fasting_glucose',
      name: 'Fasting Blood Glucose',
      category: 'metabolic',
      categoryLabel: 'Cardiometabolic Axis',
      categoryIcon: '🫀',
      standardRange: { min: 70, max: 99, unit: 'mg/dL', label: '70 – 99 mg/dL' },
      optimalRange: { min: 75, max: 86, unit: 'mg/dL', label: '75 – 86 mg/dL' },
      userValue: 94,
      userUnit: 'mg/dL',
      status: 'suboptimal_high',
      clinicalSummary:
        'At 94 mg/dL, hepatic gluconeogenesis is unsuppressed overnight. Indicates early hepatic insulin resistance before clinical prediabetes.',
      whyDoctorsMissIt:
        'Marked completely normal because standard prediabetes threshold is 100 mg/dL.',
      actionableDietaryCofactors: [
        'Ceylon cinnamon powder (1g) in warm water or morning chai',
        '10-minute gentle postprandial walking after dinner to activate GLUT4 transporters',
      ],
      retestTimeline: 'Retest fasting glucose and insulin in 8 weeks.',
    },
    {
      id: 'hba1c',
      name: 'Hemoglobin A1c (90-Day Glycemic Load)',
      category: 'metabolic',
      categoryLabel: 'Cardiometabolic Axis',
      categoryIcon: '🫀',
      standardRange: { min: 4.0, max: 5.6, unit: '%', label: '< 5.7%' },
      optimalRange: { min: 4.8, max: 5.2, unit: '%', label: '4.8 – 5.2%' },
      userValue: 5.5,
      userUnit: '%',
      status: 'suboptimal_high',
      clinicalSummary:
        'HbA1c of 5.5% reflects persistent postprandial glycemic excursions that accelerate advanced glycation end-products (AGEs) in microvasculature.',
      whyDoctorsMissIt:
        'Hospital classification ignores values under 5.7%, delaying lifestyle interventions by years.',
      actionableDietaryCofactors: [
        'Incorporate bitter melon (Karela) and Fenugreek (Methi) seeds soaked overnight',
        'Always consume vegetables and protein prior to refined grains',
      ],
      retestTimeline: 'Retest HbA1c in 90 days.',
    },
    {
      id: 'zinc_copper_ratio',
      name: 'Serum Zinc to Copper Ratio',
      category: 'immune',
      categoryLabel: 'Immune & Mucosal Barrier',
      categoryIcon: '🛡️',
      standardRange: { min: 0.7, max: 1.6, unit: 'ratio', label: '0.7 – 1.6' },
      optimalRange: { min: 1.0, max: 1.3, unit: 'ratio', label: '1.0 – 1.3' },
      userValue: 0.78,
      userUnit: 'ratio',
      status: 'suboptimal_low',
      clinicalSummary:
        'Low Zinc:Copper ratio impairs diamine oxidase (DAO) enzyme assembly and weakens mucosal superoxide dismutase (SOD) antioxidant defense.',
      whyDoctorsMissIt:
        'Zinc and Copper are tested in isolation, if at all, missing the functional ratio that controls histamine metabolism.',
      actionableDietaryCofactors: [
        'Zinc Carnosine 37.5mg (heals gastric mucosal tight junctions)',
        'Pumpkin seeds (pepitas) and organic lentils (Dal)',
      ],
      retestTimeline: 'Retest Zinc and Copper profile in 10 weeks.',
    },
  ];

export const FUNCTIONAL_BIOMARKERS_STORAGE_KEY = 'hc_functional_biomarkers';

export function computeBiomarkerStatus(b: FunctionalBiomarker, val: number): FunctionalBiomarker['status'] {
  if (val < b.standardRange.min) return 'critical_low';
  if (val < b.optimalRange.min) return 'suboptimal_low';
  if (val > b.standardRange.max) return 'critical_high';
  if (val > b.optimalRange.max) return 'suboptimal_high';
  return 'optimal';
}


export function getFunctionalBiomarkers():FunctionalBiomarker[] {
  const saved=getUnifiedCaseScope().caseItem?.reviews?.[0]?.report as any;
  if(saved?.groundingVersion!==1)return [];
  return (saved.functionalBiomarkers || []).flatMap((b:any)=>{
    const valueMatch=String(b.value || '').match(/^(-?\d+(?:\.\d+)?)\s+(.+)$/);
    const rangeMatch=String(b.standardRange || '').match(/^(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
    if(!valueMatch || !rangeMatch)return [];
    const value=Number(valueMatch[1]),min=Number(rangeMatch[1]),max=Number(rangeMatch[2]),unit=valueMatch[2];
    const range={min,max,unit,label:b.standardRange};
    return [{id:b.factId,name:b.biomarker,category:'metabolic',categoryLabel:'Recorded laboratory value',categoryIcon:'🧪',
      userValue:value,userUnit:unit,standardRange:range,optimalRange:{...range,label:'No separate optimal range established'},
      status:value<min?'suboptimal_low':value>max?'suboptimal_high':'optimal',
      clinicalSummary:'Provisional extraction. Compare with the original report and its printed interval.',
      whyDoctorsMissIt:'No inference about previous care is made.',actionableDietaryCofactors:[],retestTimeline:'Discuss follow-up if appropriate.'}];
  });
}

export function saveFunctionalBiomarkers(values: Record<string, number>): void {
  try {
    setItemSync(FUNCTIONAL_BIOMARKERS_STORAGE_KEY + ':' + getUnifiedCaseScope().scopeKey, JSON.stringify(values));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hc_biomarkers_updated', { detail: values }));
    }
  } catch (e) {
    console.error('Failed to save functional biomarkers:', e);
  }
}

export function resetFunctionalBiomarkers(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(FUNCTIONAL_BIOMARKERS_STORAGE_KEY + ':' + getUnifiedCaseScope().scopeKey);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hc_biomarkers_updated', { detail: {} }));
    }
  } catch (e) {
    console.error('Failed to reset functional biomarkers:', e);
  }
}

// ─────────────────────────────────────────────────────────────
// 6. MULTI-SYSTEM KINETIC CHAIN BIOMECHANICS ENGINE
// ─────────────────────────────────────────────────────────────
export interface KineticChainPathway {
  id: string;
  title: string;
  axisName: string;
  icon: string;
  color: string;
  primarySymptom: string;
  hiddenOrigin: string;
  pathwaySteps: {
    order: number;
    structure: string;
    anatomicalLocation: string;
    biomechanicalTension: string;
    sensoryReferral: string;
  }[];
  palpationSign: string;
  correctiveProtocol: {
    title: string;
    durationSeconds: number;
    steps: string[];
    clinicalOutcome: string;
  };
}

export function getKineticChainPathways(): KineticChainPathway[] {
  return [
    {
      id: 'chain_craniosacral',
      title: 'Craniosacral Dural Traction Axis',
      axisName: 'Lumbosacral Pelvic-to-Cranial Sleeve',
      icon: '🦴',
      color: '#0D9488',
      primarySymptom: 'Occipital & Temple Throbbing Headaches',
      hiddenOrigin: 'Sacroiliac Joint Torsion & L5-S1 Pelvic Unleveling',
      pathwaySteps: [
        {
          order: 1,
          structure: 'Sacral Dural Anchor (S2)',
          anatomicalLocation: 'Second sacral vertebra anterior sleeve',
          biomechanicalTension: 'Seated pelvic tilt or habitual leg-crossing causes upward mechanical tug.',
          sensoryReferral: 'Aching in sacrococcygeal and lower lumbar junction.',
        },
        {
          order: 2,
          structure: 'Thoracolumbar Fascial Bridge',
          anatomicalLocation: 'Spanning T12 to L5 spinous processes',
          biomechanicalTension: 'Fascial sheet tightens diagonally, transmitting tension upward along the spinal column.',
          sensoryReferral: 'Mid-back tightness after 2+ hours of desk sitting.',
        },
        {
          order: 3,
          structure: 'Suboccipital Myodural Bridge (C1-C2)',
          anatomicalLocation: 'Rectus capitis posterior minor at foramen magnum',
          biomechanicalTension: 'Compensatory spasm locks the skull base onto the atlas and axis.',
          sensoryReferral: 'Deep suboccipital tension and resistance to neck flexion.',
        },
        {
          order: 4,
          structure: 'Greater Occipital Nerve (C2)',
          anatomicalLocation: 'Pierces semispinalis capitis and trapezius aponeurosis',
          biomechanicalTension: 'Entrapped between hypertonic muscle bands and taut dural sleeve.',
          sensoryReferral: 'Radiating unilateral/bilateral ram’s horn throbbing behind eyes and temples.',
        },
      ],
      palpationSign: 'Positive Suboccipital Trigger Band palpation directly reproduces retro-orbital temple pressure.',
      correctiveProtocol: {
        title: '3-Minute Craniosacral Dural Release',
        durationSeconds: 180,
        steps: [
          'Step 1 (0-60s): Supine with knees bent. Place fingertips at the base of skull. Apply gentle cephalad traction while tucking chin.',
          'Step 2 (60-120s): Deep diaphragmatic exhale while allowing pelvis to flatten against the floor, neutralizing lumbosacral tug.',
          'Step 3 (120-180s): Slowly rotate chin 15 degrees right, hold 15s; 15 degrees left, hold 15s to decompress the myodural bridge.',
        ],
        clinicalOutcome: 'Immediate reduction in suboccipital dural drag and 60% alleviation of temple cephalgia.',
      },
    },
    {
      id: 'chain_techneck_vagus',
      title: 'Postural-Vagal Axis (Tech Neck)',
      axisName: 'Cervical Kyphosis to Enteric Vagus Nerve',
      icon: '📱',
      color: '#7C3AED',
      primarySymptom: 'Postprandial Palpitations, Gastric Delay & Acid Reflux',
      hiddenOrigin: 'Forward Head Posture (>25° cervical flexion)',
      pathwaySteps: [
        {
          order: 1,
          structure: 'Lower Cervical Spine (C5-C7)',
          anatomicalLocation: 'Cervicothoracic junction',
          biomechanicalTension: 'Forward head posture multiplies gravitational head weight by 300% (from 12 lbs to 42 lbs).',
          sensoryReferral: 'Burning ache in upper trapezius and levator scapulae.',
        },
        {
          order: 2,
          structure: 'Carotid Sheath & Jugular Foramen',
          anatomicalLocation: 'Base of skull anterior to transverse process of C1',
          biomechanicalTension: 'Hypertonic anterior scalene and sternocleidomastoid muscles compress the carotid sheath.',
          sensoryReferral: 'Cranial Nerve X (Vagus Nerve) efferent firing frequency drops by up to 35%.',
        },
        {
          order: 3,
          structure: 'Gastric Enteric Plexus (Roemheld)',
          anatomicalLocation: 'Lower esophageal sphincter and gastric antrum',
          biomechanicalTension: 'Low vagal motor tone slows gastric emptying; food ferments in stomach, generating upward splenic gas.',
          sensoryReferral: 'Stomach pushes against left hemidiaphragm, mechanically irritating the pericardium.',
        },
        {
          order: 4,
          structure: 'Cardiac Sinus Node & AV Conduction',
          anatomicalLocation: 'Right atrium cardiac conduction system',
          biomechanicalTension: 'Mechanical diaphragmatic lift triggers compensatory premature ventricular contractions (PVCs).',
          sensoryReferral: 'Sudden heart racing (100+ bpm) or skipped beats 45-90 minutes post-meal.',
        },
      ],
      palpationSign: 'Tenderness at the anterior border of SCM near angle of mandible with simultaneous epigastric flutter.',
      correctiveProtocol: {
        title: '3-Minute Vagal Decompression & Reset',
        durationSeconds: 180,
        steps: [
          'Step 1 (0-60s): Sit upright. Place two fingers behind earlobe at mastoid process. Gently massage downward along SCM with warm breaths.',
          'Step 2 (60-120s): "Eye-Vagus Reset": Look with eyes only all the way to the right for 30s until a spontaneous swallow or sigh occurs.',
          'Step 3 (120-180s): Deep diaphragmatic belly breathing (4s in, 7s hold, 8s out) to signal parasympathetic enteric outflow.',
        ],
        clinicalOutcome: 'Re-activates vagal efferent motor tone, restores gastric peristalsis, and terminates gastrocardiac flutter.',
      },
    },
    {
      id: 'chain_diaphragmatic_pots',
      title: 'Diaphragmatic-Splanchnic Pump Axis',
      axisName: 'Respiratory Thoracic-Abdominal Venous Return',
      icon: '🫁',
      color: '#0284C7',
      primarySymptom: 'Orthostatic Tachycardia (POTS) & Brain Fog Upon Standing',
      hiddenOrigin: 'Shallow Chest Breathing & Splanchnic Blood Pooling',
      pathwaySteps: [
        {
          order: 1,
          structure: 'Thoracic Diaphragm Dome',
          anatomicalLocation: 'Attaches to xiphoid, lower 6 costal cartilages, and L1-L3',
          biomechanicalTension: 'Chronic apical chest breathing locks the diaphragm into high flat excursion.',
          sensoryReferral: 'Tightness around lower ribcage and inability to take a full satisfying breath.',
        },
        {
          order: 2,
          structure: 'Inferior Vena Cava & Celiac Plexus',
          anatomicalLocation: 'Caval opening at T8 vertebra',
          biomechanicalTension: 'Loss of the diaphragmatic suction pump leaves venous blood stagnant in mesenteric capacitance beds.',
          sensoryReferral: 'Fullness and heavy distension in the gut after meals or prolonged upright standing.',
        },
        {
          order: 3,
          structure: 'Cerebral Microvascular Perfusion',
          anatomicalLocation: 'Circle of Willis cerebral arteries',
          biomechanicalTension: 'Upon standing, 500-800 mL of blood fails to return to the heart, dropping cerebral perfusion by 20%.',
          sensoryReferral: 'Immediate lightheadedness, tunnel vision, and cognitive latency ("brain fog").',
        },
        {
          order: 4,
          structure: 'Sympathetic Adrenergic Surge',
          anatomicalLocation: 'Adrenal medulla and cardiac beta-1 receptors',
          biomechanicalTension: 'Aortic arch baroreceptors signal emergency catecholamine surge to prevent fainting.',
          sensoryReferral: 'Heart rate spikes by +35-50 bpm with shaking hands and internal vibration.',
        },
      ],
      palpationSign: 'Paradoxical inward rib draw on inhalation and cold extremities during active upright stand.',
      correctiveProtocol: {
        title: '3-Minute Splanchnic Venous Pump Reset',
        durationSeconds: 180,
        steps: [
          'Step 1 (0-60s): Lie supine with calves resting elevated on a chair (90-degree hips and knees).',
          'Step 2 (60-120s): Place hands on lower ribs. Inhale deeply through nose directing breath into hands (360-degree rib expansion).',
          'Step 3 (120-180s): Contract calf muscles 10 times rhythmically to pump lower-limb venous pool back to right atrium.',
        ],
        clinicalOutcome: 'Returns 600mL of pooled splanchnic blood into central circulation, stabilizing standing heart rate.',
      },
    },
    {
      id: 'chain_tmj_trigeminal',
      title: 'Temporomandibular-Trigeminal Caudalis Axis',
      axisName: 'Craniofacial Mandibular to Suboccipital Axis',
      icon: '😬',
      color: '#D97706',
      primarySymptom: 'Retro-Orbital Eye Pressure, Ear Fullness & Temple Migraine',
      hiddenOrigin: 'Nocturnal Masseter Bruxism & Pterygoid Spasm',
      pathwaySteps: [
        {
          order: 1,
          structure: 'Masseter & Lateral Pterygoid',
          anatomicalLocation: 'Zygomatic arch and mandibular ramus',
          biomechanicalTension: 'Unconscious jaw clenching exerts up to 250 lbs of nocturnal bite pressure.',
          sensoryReferral: 'Morning jaw soreness and clicking at the temporomandibular joint.',
        },
        {
          order: 2,
          structure: 'Trigeminal Nerve Mandibular Branch (V3)',
          anatomicalLocation: 'Foramen ovale into infratemporal fossa',
          biomechanicalTension: 'Mechanical compression irritates the auriculotemporal nerve branch.',
          sensoryReferral: 'Sensation of ear fullness, clicking in eustachian tube, and temporal throbbing.',
        },
        {
          order: 3,
          structure: 'Trigeminocervical Complex (TCC)',
          anatomicalLocation: 'Spinal dorsal horns of C1, C2, and C3 segments',
          biomechanicalTension: 'Sensory afferents from the jaw converge with upper cervical spinal nerves in a shared nucleus.',
          sensoryReferral: 'Pain refers bidirectionally: jaw tension triggers neck spasms; neck strain triggers migraine.',
        },
      ],
      palpationSign: 'Tender nodule at the anterior belly of masseter reproduces sharp radiating retro-orbital eye pain.',
      correctiveProtocol: {
        title: '3-Minute TMJ & Trigeminal Decompression',
        durationSeconds: 180,
        steps: [
          'Step 1 (0-60s): Place tongue tip gently on the roof of mouth behind front teeth. Open jaw slowly without letting tongue leave palate.',
          'Step 2 (60-120s): Use knuckle to gently stroke downward along masseter from cheekbone to jawline 10 times each side.',
          'Step 3 (120-180s): Gentle suboccipital chin tuck to neutralize the C1-C3 trigeminocervical convergence reflex.',
        ],
        clinicalOutcome: 'Interrupts trigeminal nociceptive loop and relieves ocular/temple headache within minutes.',
      },
    },
    {
      id: 'chain_pelvic_visceral',
      title: 'Pelvic-Visceral Transit Axis',
      axisName: 'Lumbopelvic Psoas to Enteric Colonic Motility',
      icon: '🚶',
      color: '#059669',
      primarySymptom: 'Lower Quadrant Bloating, Sluggish Transit & Pelvic Pressure',
      hiddenOrigin: 'Anterior Pelvic Tilt & Psoas Contracture',
      pathwaySteps: [
        {
          order: 1,
          structure: 'Psoas Major Muscle Belly',
          anatomicalLocation: 'T12-L4 transverse processes to lesser trochanter',
          biomechanicalTension: 'Prolonged sitting shortens psoas fibers, pulling pelvis into excessive anterior tilt.',
          sensoryReferral: 'Aching deep in the groin and tight hip flexors.',
        },
        {
          order: 2,
          structure: 'Pelvic Splanchnic Nerves (S2-S4)',
          anatomicalLocation: 'Anterior sacral foramina into inferior hypogastric plexus',
          biomechanicalTension: 'Pelvic shear and hypertonic pelvic floor muscles compress parasympathetic colonic innervations.',
          sensoryReferral: 'Blunted rectosigmoid motility, incomplete bowel evacuation, and localized gas traps.',
        },
        {
          order: 3,
          structure: 'Ileocecal Valve & Cecum',
          anatomicalLocation: 'Right lower abdominal quadrant',
          biomechanicalTension: 'Mechanical torsion at iliopsoas fascial junction restricts ileocecal valve opening.',
          sensoryReferral: 'Reflux of colonic bacteria into the small intestine, accelerating postprandial gas formation (SIBO).',
        },
      ],
      palpationSign: 'Deep tenderness in right lower quadrant medial to ASIS (ileocecal valve spasm).',
      correctiveProtocol: {
        title: '3-Minute Psoas & Ileocecal Motility Reset',
        durationSeconds: 180,
        steps: [
          'Step 1 (0-60s): Half-kneeling lunge position. Tuck tailbone under (posterior pelvic tilt) to feel deep stretch in front of hip.',
          'Step 2 (60-120s): Lie supine. Place fingers 2 inches medial and superior to right hip bone. Gently massage upward and inward.',
          'Step 3 (120-180s): Gentle knee-to-opposite-shoulder hug to decompress sacral parasympathetic nerve roots.',
        ],
        clinicalOutcome: 'Relieves mechanical compression on pelvic parasympathetics and restores smooth colonic transit.',
      },
    },
    {
      id: 'chain_thoracic_outlet',
      title: 'Thoracic Outlet Neuro-Vascular Axis',
      axisName: 'Scalene & Costoclavicular Neuro-Vascular Space',
      icon: '🫱',
      color: '#0284C7',
      primarySymptom: 'Cold Hands, Ring Finger Tingling & Pectoral Heaviness',
      hiddenOrigin: 'Anterior Scalene Spasm & Depressed First Rib',
      pathwaySteps: [
        {
          order: 1,
          structure: 'Anterior & Middle Scalene Muscles',
          anatomicalLocation: 'Originating C3-C6 transverse processes to 1st rib',
          biomechanicalTension: 'Accessory breathing elevates 1st rib into the brachial plexus cords.',
          sensoryReferral: 'Deep neck tightness and pain radiating into clavicle and chest.',
        },
        {
          order: 2,
          structure: 'Subclavian Artery & Lower Trunk (C8-T1)',
          anatomicalLocation: 'Interscalene triangle',
          biomechanicalTension: 'Mechanical pinching dampens arterial inflow during keyboard mouse reaching.',
          sensoryReferral: 'Coldness, pale nailbeds, and numbness in the 4th and 5th digits.',
        },
        {
          order: 3,
          structure: 'Pectoralis Minor Fascial Bridge',
          anatomicalLocation: 'Coracoid process to ribs 3-5',
          biomechanicalTension: 'Protracted shoulders compress secondary neurovascular tunnel.',
          sensoryReferral: 'Aching shoulder tightness mistaken for cardiac angina.',
        },
      ],
      palpationSign: 'Positive Roos / Elevated Arm Stress Test (tingling in fingers within 30s of overhead arm abduction).',
      correctiveProtocol: {
        title: '3-Minute Thoracic Outlet Decompression',
        durationSeconds: 180,
        steps: [
          'Step 1 (0-60s): Place hand on collarbone. Tilt head 30 degrees to opposite side and gently look up to stretch anterior scalene.',
          'Step 2 (60-120s): Doorway pectoralis minor stretch with elbow bent at 90 degrees, breathing into upper ribcage.',
          'Step 3 (120-180s): First-rib mobilization using a strap or towel around the base of neck, pulling down while exhaling.',
        ],
        clinicalOutcome: 'Restores brachial arterial blood flow, warms extremities, and relieves ulnar nerve entrapment.',
      },
    },
    {
      id: 'chain_psoas_splanchnic',
      title: 'Lumbar Psoas-Splanchnic Visceral Axis',
      axisName: 'Retroperitoneal Myofascial-Enteric Loop',
      icon: '⚡',
      color: '#D97706',
      primarySymptom: 'Visceral Lower Abdominal Hypersensitivity & IBS Spasms',
      hiddenOrigin: 'Hypertonic Psoas Major & L1-L2 Lumbar Shear',
      pathwaySteps: [
        {
          order: 1,
          structure: 'Psoas Major Retroperitoneal Sheath',
          anatomicalLocation: 'L1-L5 vertebral bodies passing through pelvic brim',
          biomechanicalTension: 'Sustained seated hip flexion shortens the psoas, compressing the lumbar plexus.',
          sensoryReferral: 'Deep groin tightness and inability to extend hip fully upon standing.',
        },
        {
          order: 2,
          structure: 'Genitofemoral & Iliohypogastric Nerves',
          anatomicalLocation: 'Piercing anterior surface of psoas fascia',
          biomechanicalTension: 'Tension across the psoas fascia entraps visceral sensory afferents.',
          sensoryReferral: 'Radiating flank, lower belly, and testicular/labial hyperalgesia.',
        },
        {
          order: 3,
          structure: 'Mesenteric Splanchnic Blood Flow',
          anatomicalLocation: 'Superior mesenteric vascular root',
          biomechanicalTension: 'Chronic posterior pelvic tuck restricts mesenteric microcirculation post-meals.',
          sensoryReferral: 'Dull, cramping lower abdominal pressure 1-2 hours after digestion starts.',
        },
      ],
      palpationSign: 'Positive Thomas test with sharp resistance in deep lower quadrant psoas palpation.',
      correctiveProtocol: {
        title: '3-Minute Psoas & Splanchnic Unwind',
        durationSeconds: 180,
        steps: [
          'Step 1 (0-60s): Low runner lunge with back knee down. Reach overhead and side-bend away from trailing leg.',
          'Step 2 (60-120s): Lie over a rolled towel placed horizontally across upper sacrum, letting hips hang into gentle traction.',
          'Step 3 (120-180s): Vagal humming exhale (4s inhale, 8s humming exhale) to downregulate splanchnic sympathetic tone.',
        ],
        clinicalOutcome: 'Relieves mechanical pressure on enteric nerves and normalizes colon motility.',
      },
    },
    {
      id: 'chain_cervicothoracic_sympathetic',
      title: 'C7-T1 Stellate Ganglion Adrenergic Axis',
      axisName: 'Cervicothoracic Sympathetic Chain',
      icon: '💓',
      color: '#059669',
      primarySymptom: 'Unprovoked Adrenaline Surges, Cold Sweats & Palpitations',
      hiddenOrigin: 'C7-T1 Cervicothoracic Subluxation & Rib Flare',
      pathwaySteps: [
        {
          order: 1,
          structure: 'Cervicothoracic Junction (C7-T1)',
          anatomicalLocation: 'Transition between flexible cervical spine and rigid ribcage',
          biomechanicalTension: 'Slouching forward creates a severe hinge angle at C7-T1.',
          sensoryReferral: 'Prominent, tender "Dowager bump" or knot between the shoulder blades.',
        },
        {
          order: 2,
          structure: 'Stellate (Cervicothoracic) Ganglion',
          anatomicalLocation: 'Anterior to neck of 1st rib and transverse process of C7',
          biomechanicalTension: 'Mechanical bone spurring or ligamentous traction directly fires sympathetic cell bodies.',
          sensoryReferral: 'Sudden, unprovoked surge of tachycardia (110+ bpm), dilated pupils, and cold extremities.',
        },
        {
          order: 3,
          structure: 'Cardiac Sympathetic Accelerator Nerves',
          anatomicalLocation: 'Superficial cardiac plexus',
          biomechanicalTension: 'Constant adrenergic bombardment lowers threshold for premature atrial beats (PACs).',
          sensoryReferral: 'Heart flutters during quiet resting or lying on left side.',
        },
      ],
      palpationSign: 'Exquisite tenderness over C7-T1 transverse process directly provoking transient tachycardia.',
      correctiveProtocol: {
        title: '3-Minute Stellate Ganglion Downregulation',
        durationSeconds: 180,
        steps: [
          'Step 1 (0-60s): Foam roller or towel placed horizontally across T1-T4. Support head with hands and perform gentle thoracic extensions.',
          'Step 2 (60-120s): Chin retractions (double-chin tuck) against resistance, holding 5s for 10 repetitions.',
          'Step 3 (120-180s): Deep physiological sigh (double nasal inhale, prolonged mouth exhale) to trigger baroreflex slowing.',
        ],
        clinicalOutcome: 'Dampens hyperactive stellate sympathetic outflow and stabilizes resting cardiac rhythm.',
      },
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// 7. CLINICAL PRESET PROFILES FOR DUAL-BAND LAB SIMULATION
// ─────────────────────────────────────────────────────────────
export interface ClinicalProfilePreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  biomarkerValues: Record<string, number>;
}

export function getClinicalProfilePresets(): ClinicalProfilePreset[] {
  return [
    {
      id: 'profile_baseline',
      name: 'Clinical Reference Benchmark',
      badge: 'Reference Baseline',
      description: 'Occult iron depletion without anemia, compensatory TSH rise, low DAO activity, and blunted RBC magnesium.',
      biomarkerValues: {
        ferritin: 14,
        tsh: 3.2,
        free_t3: 2.4,
        free_t4: 1.0,
        reverse_t3: 21.5,
        cortisol_am: 9.2,
        vitamin_d3: 26,
        vitamin_b12: 310,
        mma: 0.28,
        fasting_insulin: 11.4,
        fasting_glucose: 94,
        hba1c: 5.5,
        hs_crp: 1.8,
        apob: 88,
        homocysteine: 11.2,
        dao_activity: 6.8,
        rbc_magnesium: 4.4,
        tsat: 18,
        tibc: 410,
        zinc_copper_ratio: 0.78,
      },
    },
    {
      id: 'profile_pots',
      name: 'Refractory POTS & Dysautonomia',
      badge: 'Autonomic Surge',
      description: 'Profound hypovolemia, high reverse T3 metabolic brake, depleted intracellular magnesium, and orthostatic tachycardia.',
      biomarkerValues: {
        ferritin: 22,
        tsh: 2.8,
        free_t3: 2.6,
        free_t4: 1.1,
        reverse_t3: 24.0,
        cortisol_am: 7.5,
        vitamin_d3: 32,
        vitamin_b12: 420,
        mma: 0.22,
        fasting_insulin: 6.8,
        fasting_glucose: 86,
        hba1c: 5.1,
        hs_crp: 0.8,
        apob: 68,
        homocysteine: 9.8,
        dao_activity: 12.0,
        rbc_magnesium: 4.0,
        tsat: 20,
        tibc: 390,
        zinc_copper_ratio: 0.95,
      },
    },
    {
      id: 'profile_histamine',
      name: 'Histamine Intolerance & Gut SIBO',
      badge: 'Enteric Flare',
      description: 'Severe DAO enzyme deficiency, elevated systemic hs-CRP inflammation, depleted zinc/copper ratio, and mucosal permeability.',
      biomarkerValues: {
        ferritin: 38,
        tsh: 2.1,
        free_t3: 2.9,
        free_t4: 1.2,
        reverse_t3: 13.5,
        cortisol_am: 15.0,
        vitamin_d3: 24,
        vitamin_b12: 380,
        mma: 0.19,
        fasting_insulin: 8.2,
        fasting_glucose: 88,
        hba1c: 5.2,
        hs_crp: 2.9,
        apob: 74,
        homocysteine: 8.4,
        dao_activity: 4.2,
        rbc_magnesium: 5.1,
        tsat: 27,
        tibc: 330,
        zinc_copper_ratio: 0.65,
      },
    },
  ];
}




// =========================================================================
// STEP 8: CONNECTION DETECTIVE SEMANTIC EVIDENCE GRAPH CONTRACTS & ENGINE
// Reference: media_1789069049736.png
// =========================================================================

export type CanonicalDetectiveRelation =
  | 'recorded_in'              // 1. A finding appears in a source -> Solid source link
  | 'occurred_before_after'    // 2. Dates establish order -> Directional timeline link
  | 'repeated_together'        // 3. Logged observations meet an explicit comparison rule -> Labelled association with counts
  | 'may_help_explain'         // 4. AI proposes a relationship -> Dashed line, "Possible relationship"
  | 'conflicts_with'           // 5. Two items disagree -> Labelled contradiction (weakens)
  | 'documented_by_clinician'; // 6. A clinician's source explicitly states a relationship -> Source-attributed link

export interface SemanticDetectiveNode {
  id: string;
  label: string;
  category: 
    | 'user_report' 
    | 'recorded_measurement' 
    | 'extracted_finding' 
    | 'documented_clinician_assessment' 
    | 'ai_consideration' 
    | 'open_question' 
    | 'appointment_brief' 
    | 'source_document';
  sublabel?: string;
  sourceDocName?: string;
  date?: string;
  value?: string;
  status?: 'supported' | 'proposed' | 'contradicted' | 'unknown';
}

export interface SemanticDetectiveEdge {
  id: string;
  from: string;
  to: string;
  relation: CanonicalDetectiveRelation;
  displayType: 'solid_source' | 'directional_timeline' | 'labelled_association' | 'dashed_proposal' | 'labelled_contradiction' | 'source_attributed';
  label: string;
  sublabel?: string;
  count?: number;
  timeDelta?: string;
  evidenceBasis?: string[];
  isUserDecoupled?: boolean; // Step 9 "Keep these separate"
}

export interface SemanticEvidenceGraph {
  nodes: SemanticDetectiveNode[];
  edges: SemanticDetectiveEdge[];
  downstreamPipeline: {
    consideration: SemanticDetectiveNode | null;
    questionStillOpen: SemanticDetectiveNode | null;
    appointmentBrief: SemanticDetectiveNode | null;
  };
  generatedFromReviewId?: string;
  decoupledEdgeIds: string[];
}

const decoupledKey = () => 'hc_detective_decoupled_edges:' + getUnifiedCaseScope().scopeKey;
let inMemoryDecoupledEdges = new Set<string>();

export function getDecoupledEdgeIds(): string[] {
  try {
    const raw = getItemSync(decoupledKey());
    if (raw) return JSON.parse(raw);
  } catch {}
  return getUnifiedCaseScope().caseItem?.connectionMap?.decoupledEdgeIds || [];
}

export function toggleDecoupleEdge(edgeId: string): string[] {
  const current = getDecoupledEdgeIds();
  const updated = current.includes(edgeId)
    ? current.filter(id => id !== edgeId)
    : [...current, edgeId];
  inMemoryDecoupledEdges = new Set(updated);
  const scope = getUnifiedCaseScope();
  if (scope.caseItem) updateCaseConnectionMap(scope.caseItem.id, { ...scope.caseItem.connectionMap, decoupledEdgeIds: updated });
  try {
    setItemSync(decoupledKey(), JSON.stringify(updated));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_detective_edges_updated'));
  }
  return updated;
}

export function resetDecoupledEdges(): void {
  inMemoryDecoupledEdges.clear();
  const scope = getUnifiedCaseScope();
  if (scope.caseItem) updateCaseConnectionMap(scope.caseItem.id, { ...scope.caseItem.connectionMap, decoupledEdgeIds: [] });
  try {
    setItemSync(decoupledKey(), '[]');
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_detective_edges_updated'));
  }
}

/**
 * Derives the authentic, source-grounded Semantic Evidence Graph from the Engine's saved review.
 * Permanently closes Point 10 Gap #6 and satisfies Point 11 Acceptance Criterion #5:
 * "Map and report cannot silently produce different findings."
 */

export function deriveSemanticEvidenceGraphFromEngineReview(report:any,caseItem?:any):SemanticEvidenceGraph {
  const nodes:SemanticDetectiveNode[]=[],edges:SemanticDetectiveEdge[]=[];
  const decoupled=new Set(getDecoupledEdgeIds());
  const empty={nodes,edges,downstreamPipeline:{consideration:null,questionStillOpen:null,appointmentBrief:null},decoupledEdgeIds:[...decoupled]};
  if(report?.groundingVersion!==1) return empty;
  const facts=(report.documentedFacts || []).filter((f:any)=>f.id && !f.isUnverifiedSource);
  const ids=new Set<string>();
  for(const f of facts){
    const sourceId='source_'+(f.recordId || f.source);
    if(!ids.has(sourceId)){
      ids.add(sourceId);nodes.push({id:sourceId,label:f.source,category:'source_document',sublabel:f.category==='user_report'?'User report':'Source text; extraction may require checking'});
    }
    ids.add(f.id);nodes.push({id:f.id,label:f.fact,category:f.category || 'user_report',sourceDocName:f.source,date:f.eventDate || f.reportDate});
    edges.push({id:'record_'+f.id,from:f.id,to:sourceId,relation:'recorded_in',displayType:'solid_source',label:'recorded in'});
  }
  // Render only explicit evidence references from the saved review.
  for(const a of report.reasoningPipeline?.stage5_alternatives || []){
    nodes.push({id:a.id,label:a.title,category:'ai_consideration',status:'proposed',sublabel:'AI consideration'});ids.add(a.id);
    const assessment=report.reasoningPipeline.stage6_balancedAssessments.find((r:any)=>r.alternativeId===a.id);
    for(const [kind,list] of [['support',assessment?.supportingEvidence || []],['conflict',assessment?.conflictingEvidence || []]] as const){
      for(const r of list as any[]){
        if(!ids.has(r.factId))continue;
        const edgeId=kind+'_'+r.factId+'_'+a.id;
        edges.push({id:edgeId,from:r.factId,to:a.id,relation:kind==='support'?'may_help_explain':'conflicts_with',
          displayType:kind==='support'?'dashed_proposal':'labelled_contradiction',
          label:kind==='support'?'possible relationship':'proposed counter-evidence',sublabel:r.description,isUserDecoupled:decoupled.has(edgeId)});
      }
    }
  }
  // Timing is shown only when full timestamps are supplied for both events.
  const dated=facts.filter((f:any)=>typeof f.eventDate==='string' && /T\d{2}:\d{2}/.test(f.eventDate) && Number.isFinite(Date.parse(f.eventDate))).sort((a:any,b:any)=>Date.parse(a.eventDate)-Date.parse(b.eventDate));
  for(let i=1;i<dated.length;i++){
    const a=dated[i-1],b=dated[i],minutes=(Date.parse(b.eventDate)-Date.parse(a.eventDate))/60000;
    if(minutes<=0)continue;
    edges.push({id:'time_'+a.id+'_'+b.id,from:a.id,to:b.id,relation:'occurred_before_after',displayType:'directional_timeline',label:'recorded before',timeDelta:minutes+' min'});
  }
  const question=report.focusedQuestion?.question?{id:report.focusedQuestion.id,label:report.focusedQuestion.question,category:'open_question' as const}:null;
  if(question)nodes.push(question);
  return {nodes,edges,downstreamPipeline:{consideration:nodes.find(n=>n.category==='ai_consideration') || null,questionStillOpen:question,appointmentBrief:null},
    generatedFromReviewId:report.versionedEvidence?.snapshotId,decoupledEdgeIds:[...decoupled]};
}
