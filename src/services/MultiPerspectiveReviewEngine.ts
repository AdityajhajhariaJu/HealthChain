import { SourceLinkedEvidence } from './ClinicalReasoningEngine';

// ==========================================
// MEANINGFUL MULTI-PERSPECTIVE DATA CONTRACTS
// ==========================================

export interface VersionedEvidenceSet {
  snapshotId: string;
  createdAt: string;
  facts: SourceLinkedEvidence[];
  recordsCount: number;
  hash: string;
}

export interface CrossPerspectiveQuestion {
  targetSpecialty: string;
  question: string;
  clinicalRationale: string;
}

export interface MeaningfulPerspective {
  id: string;
  specialty: string;
  doctorName: string;
  selectionReason: string;
  questionAddressed: string;                        // 1. Prevent repetitive reviews
  evidenceConsidered: string[];                     // 2. Make coverage inspectable
  interpretation: string;                           // 3. Explain unique contribution
  evidenceAgainst: string[];                        // 4. Prevent one-sided reasoning
  missingInformation: string[];                     // 5. Identify limits
  questionForAnotherPerspective: CrossPerspectiveQuestion; // 6. Enable actual integration
  whatWouldChangeInterpretation: string;            // 7. Make future updates meaningful
  dissentingView?: string;
}

export interface BoardDisagreement {
  disputePoint: string;
  perspectivesInvolved: string[];
  evidenceNeededToResolve: string;                  // Disagreement remains visible with evidence needed to resolve
}

export type BoundedOutcomeType = 'unifying_explanation' | 'multiple_unrelated_issues' | 'insufficient_evidence';

export interface BoundedComparisonSummary {
  outcomeType: BoundedOutcomeType;
  outcomeSummary: string;
  sharedModelAssumptions: string[];                // Agreement described, but shared model assumptions recognized
  disagreements: BoardDisagreement[];              // Disagreement remains visible with evidence needed to resolve
  clearDecisionOrQuestion: string;                  // Bounded comparison produces a clearer decision or question
}

export interface SubstantiveDebateResult {
  specialistId: string;
  specialistLabel: string;
  substantiveCritique: string;
  crossPerspectiveResponse: string;
  evidenceNeededToResolve: string;
  revisedHypothesis: string;
  confidenceAssessment: 'elevated' | 'demoted' | 'unchanged_awaiting_testing';
  confidenceRationale: string;
  revisingEvidenceBasis: string[];
}

// ==========================================
// ENGINE ALGORITHMS
// ==========================================


const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter(v => typeof v === 'string' && v.trim()) : [];

export function buildVersionedEvidenceSet(facts: SourceLinkedEvidence[], medicalRecords: any[] = [], snapshotIdOverride?: string): VersionedEvidenceSet {
  // Content identity includes provenance, dates and verification state, not just prose.
  const content = JSON.stringify({facts:[...facts].sort((a,b)=>a.id.localeCompare(b.id)),records:medicalRecords});
  let hash=2166136261;
  for(const c of content) hash=Math.imul(hash^c.charCodeAt(0),16777619);
  const digest='content_'+(hash>>>0).toString(16);
  return {snapshotId:snapshotIdOverride || digest,createdAt:new Date().toISOString(),facts,recordsCount:medicalRecords.length,hash:digest};
}

export function generateMeaningfulPerspectives(evidence:VersionedEvidenceSet, unansweredQuestions:string[]=[], raw:Partial<MeaningfulPerspective>[]=[]):MeaningfulPerspective[] {
  const known=new Set(evidence.facts.filter(f=>!(f as any).isUnverifiedSource).map(f=>f.id));
  if(!known.size) return [];
  const seen=new Set<string>();
  return raw.filter(p=>{
    const key=(p.questionAddressed || '').trim().toLowerCase();
    if(!p.specialty || !key || !p.interpretation || seen.has(key)) return false;
    seen.add(key); return true;
  }).map((p,i)=>({
    id:p.id || 'perspective_'+i,specialty:p.specialty!,doctorName:'AI '+p.specialty+' perspective',
    selectionReason:p.selectionReason || '',questionAddressed:p.questionAddressed!,
    evidenceConsidered:strings(p.evidenceConsidered).filter(id=>known.has(id)),
    interpretation:p.interpretation!,evidenceAgainst:strings(p.evidenceAgainst).filter(id=>known.has(id)),
    missingInformation:strings(p.missingInformation),
    questionForAnotherPerspective:{
      targetSpecialty:p.questionForAnotherPerspective?.targetSpecialty || '',
      question:p.questionForAnotherPerspective?.question || '',
      clinicalRationale:p.questionForAnotherPerspective?.clinicalRationale || '',
    },
    whatWouldChangeInterpretation:p.whatWouldChangeInterpretation || '',
    dissentingView:p.dissentingView,
  })).filter(p=>p.evidenceConsidered.length>0);
}

export function executeBoundedComparison(perspectives:MeaningfulPerspective[], evidence:VersionedEvidenceSet, comparison?:any):BoundedComparisonSummary {
  const allowedOutcomes=['unifying_explanation','multiple_unrelated_issues','insufficient_evidence'];
  const ids=new Set(evidence.facts.map(f=>f.id));
  const grounded=comparison && allowedOutcomes.includes(comparison.outcomeType) && typeof comparison.outcomeSummary==='string' &&
    Array.isArray(comparison.evidenceIds) && comparison.evidenceIds.length && comparison.evidenceIds.every((id:string)=>ids.has(id));
  const disagreements:BoardDisagreement[]=perspectives.filter(p=>p.dissentingView?.trim()).map(p=>({
    disputePoint:p.dissentingView!,perspectivesInvolved:[p.specialty],
    evidenceNeededToResolve:p.whatWouldChangeInterpretation || 'Not specified by this review.',
  }));
  return {
    outcomeType:grounded?comparison.outcomeType:'insufficient_evidence',
    outcomeSummary:grounded?comparison.outcomeSummary:perspectives.length
      ? 'These AI perspectives address different questions using the supplied evidence. Agreement alone does not establish a shared cause; review their individual evidence and limitations.'
      : 'No grounded specialty perspectives were supplied for this evidence set.',
    sharedModelAssumptions:['These are AI-generated perspectives, not independent clinician consultations.'],
    disagreements,
    clearDecisionOrQuestion:perspectives.find(p=>p.questionForAnotherPerspective.question)?.questionForAnotherPerspective.question || '',
  };
}

export async function runSubstantiveDebateRound(specialistId:string,specialistLabel:string,ownTranscript:any[]=[],otherTranscripts:Record<string,any[]>={},evidence:VersionedEvidenceSet):Promise<SubstantiveDebateResult> {
  // This local adapter cannot claim to have conducted a new model comparison.
  // Preserve the transcripts for the orchestrator rather than invent a critique.
  return {
    specialistId,specialistLabel,
    substantiveCritique:'No additional evidence-based comparison has been generated for these transcripts.',
    crossPerspectiveResponse:'Use the saved transcript and evidence references in the next review.',
    evidenceNeededToResolve:'Not established in this comparison.',
    revisedHypothesis:'Unchanged: no new clinical assessment performed.',
    confidenceAssessment:'unchanged_awaiting_testing',
    confidenceRationale:'No change inferred from the number of perspectives or their agreement.',
    revisingEvidenceBasis:[],
  };
}
