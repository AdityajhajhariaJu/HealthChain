/**
 * StructuredAnswerEngine.ts
 * 
 * HealthChain Core Architectural Blueprint — Step 7: "How the actual answer should look"
 * Reference: media_1789068538297.png
 * 
 * 5 Progressive-Disclosure Layers:
 * 1. Main answer: 2-3 sentences answering their question -> Expandable: Full synthesis
 * 2. Why this matters in my case: Strongest relevant observations -> Expandable: Source passages and dates
 * 3. Other explanations: Plausible alternatives or reasons not to connect events -> Expandable: Supporting & conflicting evidence
 * 4. What we still need: 1-2 important gaps -> Expandable: Complete missing-information list
 * 5. Next step: 1 useful action chosen for this situation -> Expandable: Other available actions
 * 
 * 5 Avoid vs Replace With Mandates:
 * - AVOID: "Ask your doctor" as the entire answer
 *   REPLACE WITH: A specific question, why it matters, and the relevant records
 * - AVOID: A long biological mechanism with no case evidence
 *   REPLACE WITH: A clearly labelled possible explanation tied to actual observations
 * - AVOID: "Everything is connected"
 *   REPLACE WITH: Which relationships are supported, proposed, contradicted or unknown
 * - AVOID: A percentage without a validated basis
 *   REPLACE WITH: The evidence supporting the interpretation and its limitations
 * - AVOID: Repeating the entire case history
 *   REPLACE WITH: Only the information relevant to this question
 */

import { ClinicalInformationCategory } from './ClinicalInformationClassifier';

export type EpistemicRelationshipStatus = 'supported' | 'proposed' | 'contradicted' | 'unknown';

export interface EvidenceOriginSource {
  passage: string;
  source: string;
  date?: string;
  category?: ClinicalInformationCategory;
  confidenceBasis?: string;
}

export interface BalancedAlternativeEvidence {
  title: string;
  mechanism: string;
  supportingEvidence: string[];
  conflictingEvidence: string[];
  whatWouldChangeThis?: string;
  likelihoodAssessment?: 'leading' | 'competing' | 'uncertain';
}

export interface StructuredRelationshipItem {
  connection: string;
  status: EpistemicRelationshipStatus;
  rationale: string;
  evidenceBasis: string[];
  isGeneralGuidance?: boolean;
}

export interface DoctorVisitBrief {
  specificQuestion: string;
  whyItMatters: string;
  relevantRecords: string[];
}

export interface StructuredClinicalAnswer {
  // Layer 1: Main answer
  layer1_mainAnswer: {
    conciseAnswer: string;
    fullSynthesis: string;
  };

  // Layer 2: Why this matters in my case
  layer2_whyThisMatters: {
    strongestObservations: string[];
    sourcePassages: EvidenceOriginSource[];
  };

  // Layer 3: Other explanations
  layer3_otherExplanations: {
    plausibleAlternatives: string[];
    balancedEvidence: BalancedAlternativeEvidence[];
    relationshipStatuses: StructuredRelationshipItem[];
    contradictionQueue?: Array<{
      id: string;
      topic: string;
      itemA: { finding: string; source: string; date?: string };
      itemB: { finding: string; source: string; date?: string };
      clinicalSignificance: string;
      resolutionNeed: string;
    }>;
  };

  // Layer 4: What we still need
  layer4_whatWeStillNeed: {
    criticalGaps: string[];
    completeMissingList: string[];
  };

  // Layer 5: Next step
  layer5_nextStep: {
    chosenAction: string;
    otherActions: string[];
    doctorVisitBrief: DoctorVisitBrief;
  };

  avoidDisclaimersEnforced: boolean;
  generatedAt: string;
}

export interface BuildStructuredAnswerInput {
  question?: string;
  executiveSummary?: string;
  primaryHypothesis?: string;
  documentedFacts?: Array<{
    id?: string;
    fact?: string;
    source?: string;
    date?: string;
    category?: string;
    extractionStatus?: string;
    allowedRole?: string;
    isUnverifiedSource?: boolean;
  }>;
  quarantinedFacts?: any[];
  quarantinedClaims?: any[];
  uncertainties?: string[];
  missingLinks?: string[];
  questionsForClinician?: string[];
  contradictions?: Array<{
    id?: string;
    topic?: string;
    itemA?: { finding?: string; source?: string; date?: string };
    itemB?: { finding?: string; source?: string; date?: string };
    clinicalSignificance?: string;
    resolutionNeed?: string;
  }>;
  alternatives?: Array<{
    id?: string;
    title?: string;
    mechanismSummary?: string;
    type?: string;
    likelihoodAssessment?: string;
    supportingFacts?: string[];
    contradictoryFacts?: string[];
    whatWouldChangeThis?: string;
  }>;
  perspectives?: Array<any>;
  boundedComparison?: any;
  reasoningPipeline?: any;
  userPriority?: string;
}


/** Remove unsupported confidence claims without replacing them with evidence claims. */
export function sanitizeArbitraryPercentages(text:string):string {
  return (text || '').replace(/\b(?:with\s*)?\d{1,3}%\s*(?:match|probability|likelihood|certainty|confidence)\b/gi,'uncertain').trim();
}
export function buildStructuredClinicalAnswer(input:BuildStructuredAnswerInput):StructuredClinicalAnswer {
  const quarantinedFactIds = new Set((input.quarantinedFacts || []).map((f: any) => f?.id).filter(Boolean));
  const quarantinedSources = new Set((input.quarantinedFacts || []).map((f: any) => f?.source).filter(Boolean));

  const facts = (input.documentedFacts || []).filter(
    f => f?.fact && !f.isUnverifiedSource && f.extractionStatus !== 'rejected' && (!f.id || !quarantinedFactIds.has(f.id))
  );
  const hasQuarantine = Boolean((input.quarantinedFacts && input.quarantinedFacts.length > 0) || (input.quarantinedClaims && input.quarantinedClaims.length > 0));
  const summary = facts.length
    ? sanitizeArbitraryPercentages(input.executiveSummary || '')
    : 'Add your observations or records to begin a case review.';
  const assessments = input.reasoningPipeline?.stage6_balancedAssessments || [];
  const alternatives = (input.alternatives || []).filter(a => a?.title && a.title !== 'Rejected claim');
  const gaps = [...new Set([...(input.uncertainties || []), ...(input.missingLinks || [])])];
  if (hasQuarantine) {
    gaps.unshift('Some generated claims could not be verified against original documents and have been withheld.');
  }
  const questions = input.questionsForClinician || [];
  const records = facts
    .map(f => f.source)
    .filter((s): s is string => Boolean(s && !quarantinedSources.has(s)));

  return {
    layer1_mainAnswer:{conciseAnswer:summary.split(/(?<=[.?!])\s+/).slice(0,3).join(' '),fullSynthesis:summary},
    layer2_whyThisMatters:{
      strongestObservations:facts.slice(0,3).map(f=>f.fact!),
      sourcePassages:facts.map(f=>({passage:f.fact!,source:f.source || 'Source not provided',date:f.date,category:(f.category as ClinicalInformationCategory) || 'user_report',confidenceBasis:f.allowedRole || 'Not verified'})),
    },
    layer3_otherExplanations:{
      plausibleAlternatives:alternatives.map(a=>a.title || '').filter(Boolean),
      balancedEvidence:alternatives.map((a:any)=>{
        const review=assessments.find((r:any)=>r.alternativeId===a.id);
        return {title:a.title || '',mechanism:sanitizeArbitraryPercentages(a.mechanismSummary || ''),
          supportingEvidence:(review?.supportingEvidence || []).map((x:any)=>x.description),
          conflictingEvidence:(review?.conflictingEvidence || []).map((x:any)=>x.description),
          whatWouldChangeThis:(review?.missingEvidenceWhatWouldChangeIt || []).map((x:any)=>x.testOrObservation+': '+x.potentialImpact).join('\n'),
          likelihoodAssessment:a.likelihoodAssessment || 'uncertain'};
      }),
      relationshipStatuses:alternatives.map(a=>({
        connection:a.title || '',
        status:'proposed' as const,
        rationale:'AI consideration; inspect supporting and conflicting evidence. Not an established causal relationship.',
        evidenceBasis:[],
        isGeneralGuidance: false,
      })),
      contradictionQueue:(input.contradictions || []).map((c,i)=>({
        id:c.id || 'contradiction_'+i,topic:c.topic || 'Review source entries',
        itemA:{finding:c.itemA?.finding || '',source:c.itemA?.source || '',date:c.itemA?.date},
        itemB:{finding:c.itemB?.finding || '',source:c.itemB?.source || '',date:c.itemB?.date},
        clinicalSignificance:c.clinicalSignificance || '',resolutionNeed:c.resolutionNeed || '',
      })),
    },
    layer4_whatWeStillNeed:{criticalGaps:gaps.slice(0,2),completeMissingList:gaps},
    layer5_nextStep:{
      chosenAction:input.userPriority || (questions[0]?'Review this question: '+questions[0]:facts.length?'Review the saved observations and choose what to discuss next.':'Add a record or describe your concern.'),
      otherActions:questions.slice(1),
      doctorVisitBrief:{specificQuestion:questions[0] || '',whyItMatters:'An open question from your case review.',relevantRecords:[...new Set(records)]},
    },
    avoidDisclaimersEnforced:false,generatedAt:new Date().toISOString(),
  };
}
