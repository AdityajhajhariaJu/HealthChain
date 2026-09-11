import { CategorizedInformationItem, classifyClinicalInformation } from './ClinicalInformationClassifier';

// ==========================================
// 10 REASONING STAGES DATA CONTRACTS
// ==========================================

/** Stage 1: Establish Facts — Source-linked evidence */
export interface SourceLinkedEvidence {
  id: string;
  fact: string;
  source: string;
  page?: number;
  file?: string;
  category: string;
  allowedRole: string;
  confidence?: 'verified' | 'provisional' | 'self_reported';
  timestamp?: string;
}

/** Stage 2: Align Time — A coherent timeline */
export interface TemporalTimelineEntry {
  id: string;
  description: string;
  eventDate?: string;
  reportDate?: string;
  entryDate: string;
  temporalConfidence: 'exact' | 'approximate' | 'relative' | 'undated';
  relatedFactIds: string[];
}

export interface TemporalGap {
  period: string;
  durationDescription: string;
  clinicalSignificance: string;
}

export interface TemporalOverlap {
  phenomena: string[];
  timeframe: string;
  implication: string;
}

export interface CoherentTimeline {
  entries: TemporalTimelineEntry[];
  overlaps: TemporalOverlap[];
  gaps: TemporalGap[];
  summaryChronology: string;
}

/** Stage 3: Reconcile Records — A correction queue */
export type DiscrepancyType = 'duplicate' | 'unit_change' | 'conflicting_values' | 'differing_accounts';

export interface CorrectionQueueItem {
  id: string;
  type: DiscrepancyType;
  title: string;
  itemsInvolved: string[];
  discrepancyDescription: string;
  suggestedAction: string;
  status: 'pending' | 'resolved' | 'acknowledged';
  resolutionNote?: string;
}

/** Stage 4: Identify Relevant Perspectives — Small, justified perspective set */
export interface JustifiedPerspective {
  id: string;
  specialty: string;
  doctorName: string;
  unansweredQuestionAddressed: string;
  justification: string;
  uniqueContribution: string;
  supportingEvidenceIds: string[];
}

/** Stage 5: Generate Alternatives — Competing interpretations */
export type AlternativeType = 'connected_explanation' | 'separate_explanations' | 'insufficient_evidence';

export interface AlternativeInterpretation {
  id: string;
  type: AlternativeType;
  title: string;
  mechanismSummary: string;
  likelihoodAssessment: 'leading' | 'competing' | 'unlikely_but_critical_to_rule_out' | 'uncertain';
  rationale: string;
}

/** Stage 6: Challenge Each Alternative — Balanced assessment (Tri-prong) */
export interface BalancedAssessment {
  alternativeId: string;
  alternativeTitle: string;
  supportingEvidence: {
    factId?: string;
    description: string;
    weight: 'strong' | 'moderate' | 'circumstantial';
  }[];
  conflictingEvidence: {
    factId?: string;
    description: string;
    weight: 'direct_contradiction' | 'incongruent_timing' | 'normal_control_test';
  }[];
  missingEvidenceWhatWouldChangeIt: {
    testOrObservation: string;
    potentialImpact: string;
  }[];
}

/** Stage 7: Choose Useful Clarification — One focused user question */
export interface FocusedUserQuestion {
  id: string;
  question: string;
  whyThisQuestion: string;
  decisionImpact: string;
  targetAlternativeIds: string[];
  status: 'pending' | 'answered';
  userAnswer?: string;
  answeredAt?: string;
}

/** Stage 8: Synthesize — A useful answer */
export interface ClinicalSynthesis {
  mainFinding: string;
  empiricalBasis: string[];
  limitations: string[];
  practicalImplication: string;
  urgencyLevel: 'routine' | 'prompt_clinical_review' | 'urgent_emergency_care' | 'not_assessed';
}

/** Stage 9: Carry Forward — Continuity */
export interface ContinuityRecord {
  openQuestions: string[];
  chosenNextAction: string;
  preservedHypotheses: string[];
  savedAt: string;
  caseCheckpointId?: string;
}

/** Stage 10: Update Selectively — "What changed and why" */
export interface SelectiveUpdateDiff {
  previousRunDate?: string;
  currentRunDate: string;
  triggerEvent: string;
  whatChangedAndWhy: string;
  affectedConclusions: {
    hypothesis: string;
    shift: 'strengthened' | 'weakened' | 'unaffected' | 'new' | 'retired';
    rationale: string;
  }[];
  resolvedQuestions: string[];
  newQuestions: string[];
}

/** Complete 10-Stage Clinical Reasoning Payload */
export interface ClinicalReasoningPayload {
  stage1_facts: SourceLinkedEvidence[];
  stage2_timeline: CoherentTimeline;
  stage3_correctionQueue: CorrectionQueueItem[];
  stage4_perspectives: JustifiedPerspective[];
  stage5_alternatives: AlternativeInterpretation[];
  stage6_balancedAssessments: BalancedAssessment[];
  stage7_focusedQuestion: FocusedUserQuestion;
  stage8_synthesis: ClinicalSynthesis;
  stage9_continuity: ContinuityRecord;
  stage10_selectiveUpdate?: SelectiveUpdateDiff;
}

// ==========================================
// PURE REASONING ALGORITHMS & HELPERS
// ==========================================


export function stableEvidenceId(text: string): string {
  let hash = 2166136261;
  for (const c of text) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
}
export function extractDateString(text: string): string | null {
  const iso = text?.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  const dmy = text?.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  const date = iso ? iso[0] : dmy ? dmy[3]+'-'+dmy[2]+'-'+dmy[1] : null;
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date ? date : null;
}
export function alignChronology(facts: SourceLinkedEvidence[], entryDateOverride?: string): CoherentTimeline {
  const entries: TemporalTimelineEntry[] = facts.map((f: any) => {
    const eventDate = extractDateString(f.eventDate || '') || undefined;
    const reportDate = extractDateString(f.reportDate || '') || undefined;
    return {id:'time_'+f.id, description:f.fact, eventDate, reportDate,
      entryDate:f.timestamp || entryDateOverride || '', temporalConfidence:eventDate || reportDate ? 'exact' : 'undated', relatedFactIds:[f.id]};
  });
  entries.sort((a,b)=>(a.eventDate || a.reportDate || '9999').localeCompare(b.eventDate || b.reportDate || '9999'));
  const overlaps: TemporalOverlap[] = [];
  for (const date of new Set(entries.map(e=>e.eventDate).filter(Boolean))) {
    const same = entries.filter(e=>e.eventDate===date);
    if(same.length>1) overlaps.push({phenomena:same.map(e=>e.description),timeframe:date!,
      implication:'These events share a recorded date. This does not establish simultaneous occurrence or a shared cause.'});
  }
  return {entries,overlaps,gaps:[],summaryChronology:entries.length+' observations. Only explicit event and report dates determine chronology.'};
}
export function detectCorrectionQueue(facts: SourceLinkedEvidence[]): CorrectionQueueItem[] {
  const queue: CorrectionQueueItem[] = [], seen = new Map<string, SourceLinkedEvidence>();
  for(const f of facts as any[]) {
    const key=JSON.stringify([f.fact.trim().toLowerCase(), f.eventDate || null]);
    const prior=seen.get(key);
    if(prior && prior.id!==f.id) queue.push({id:'duplicate_'+prior.id+'_'+f.id,type:'duplicate',title:'Possible repeated entry',
      itemsInvolved:[prior.id,f.id],discrepancyDescription:'The same text appears more than once. Check dates and sources before consolidating.',
      suggestedAction:'Review both original entries.',status:'pending'});
    else seen.set(key,f);
  }
  // Same analyte and date required; shared units alone do not identify a measurement.
  const groups=new Map<string,any[]>();
  for(const f of facts as any[]) {
    if(!f.analyte || !f.eventDate || f.value===undefined || !f.unit) continue;
    const key=JSON.stringify([String(f.analyte).toLowerCase(),f.eventDate]);
    groups.set(key,[...(groups.get(key)||[]),f]);
  }
  for(const group of groups.values()) for(let i=1;i<group.length;i++) {
    const a=group[0],b=group[i];
    if(a.unit===b.unit && String(a.value)===String(b.value)) continue;
    queue.push({id:'measurement_'+a.id+'_'+b.id,type:a.unit===b.unit?'conflicting_values':'unit_change',
      title:'Review '+a.analyte+' entries',itemsInvolved:[a.id,b.id],
      discrepancyDescription:a.value+' '+a.unit+' and '+b.value+' '+b.unit+' are recorded for the same date. Sampling times and methods may differ.',
      suggestedAction:'Check original values, sampling times and units; do not automatically overwrite.',status:'pending'});
  }
  return queue;
}
export function justifyPerspectives(questions:string[],raw:Partial<JustifiedPerspective>[]=[]):JustifiedPerspective[] {
  return raw.filter(p=>p.specialty && (p.unansweredQuestionAddressed || (p as any).questionAddressed)).map((p,i)=>({
    id:p.id || 'perspective_'+i,specialty:p.specialty!,doctorName:p.doctorName || 'AI perspective',
    unansweredQuestionAddressed:p.unansweredQuestionAddressed || (p as any).questionAddressed,
    justification:p.justification || (p as any).selectionReason || '',
    uniqueContribution:p.uniqueContribution || (p as any).interpretation || '',
    supportingEvidenceIds:p.supportingEvidenceIds || (p as any).evidenceConsidered || [],
  }));
}
export function buildTriProngChallenges(alternatives:AlternativeInterpretation[],facts:SourceLinkedEvidence[],missing:string[],corrections?:CorrectionQueueItem[]):BalancedAssessment[] {
  const ids=new Set(facts.filter(f=>!(f as any).isUnverifiedSource).map(f=>f.id));
  const valid=(items:any):any[]=>Array.isArray(items)?items.filter(x=>ids.has(x.factId) && typeof x.description==='string' && x.description.trim()):[];
  return alternatives.map((a:any)=>({
    alternativeId:a.id,alternativeTitle:a.title,
    supportingEvidence:valid(a.supportingEvidence).map(x=>({...x,weight:'circumstantial' as const})),
    conflictingEvidence:valid(a.conflictingEvidence).map(x=>({...x,weight:'direct_contradiction' as const})),
    missingEvidenceWhatWouldChangeIt:Array.isArray(a.missingEvidenceWhatWouldChangeIt)?a.missingEvidenceWhatWouldChangeIt.filter((x:any)=>typeof x.testOrObservation==='string' && typeof x.potentialImpact==='string'):[],
  }));
}
export function selectFocusedClarification(questions:string[],missing:string[],alternatives:AlternativeInterpretation[]):FocusedUserQuestion {
  const question=questions.find(q=>q.trim()) || '';
  return {id:question?'question_'+stableEvidenceId(question):'no_open_question',question,
    whyThisQuestion:question?'An open question from this review. You can choose another priority.':'No additional question was identified.',
    decisionImpact:'Your answer will be saved as a reported observation for the next review.',targetAlternativeIds:[],status:'pending'};
}
export function synthesizeFindings(facts:SourceLinkedEvidence[],alternatives:AlternativeInterpretation[],assessments:BalancedAssessment[],uncertainties:string[],corrections?:CorrectionQueueItem[]):ClinicalSynthesis {
  return {mainFinding:facts.length?'Review the documented observations and proposed interpretations below.':'There is not enough case evidence to form an interpretation.',
    empiricalBasis:facts.slice(0,4).map(f=>f.fact+' ('+f.source+')'),limitations:[...uncertainties,...(corrections||[]).map(c=>c.discrepancyDescription)],
    practicalImplication:corrections?.length?'Check flagged source entries before relying on an interpretation.':'Choose a question or record to review next.',urgencyLevel:'not_assessed'};
}
export function computeSelectiveUpdateDiff(previous?:ClinicalReasoningPayload|null,current?:ClinicalReasoningPayload|null,newFact?:SourceLinkedEvidence):SelectiveUpdateDiff {
  const before=previous?.stage5_alternatives || [],after=current?.stage5_alternatives || [];
  return {previousRunDate:previous?.stage9_continuity.savedAt,currentRunDate:new Date().toISOString(),
    triggerEvent:newFact?'New user-reported clarification saved':previous?'Review compared with previous version':'Initial evidence review',
    whatChangedAndWhy:newFact?'An observation was added. Interpretations have not been re-evaluated; run a new review to assess its impact.':'Only explicit differences between saved versions are shown.',
    affectedConclusions:[...after.map(a=>({hypothesis:a.title,shift:(before.some(b=>b.id===a.id)?'unaffected':'new') as 'unaffected'|'new',
      rationale:newFact?'Awaiting a new evidence review; no clinical weight inferred.':'Present in this saved version.'})),
      ...before.filter(b=>!after.some(a=>a.id===b.id)).map(b=>({hypothesis:b.title,shift:'retired' as const,rationale:'Not present in this review; this is not a clinical exclusion.'}))],
    resolvedQuestions:[],newQuestions:(current?.stage9_continuity.openQuestions || []).filter(q=>!previous?.stage9_continuity.openQuestions.includes(q))};
}
export function runClinicalReasoningPipeline(rawInput:{documentedFacts?:any[];primaryHypothesis?:string;executiveSummary?:string;uncertainties?:string[];missingLinks?:string[];questionsForClinician?:string[];perspectives?:any[];alternatives?:any[]},
previousPayload?:ClinicalReasoningPayload|null,newFactAnswer?:{questionId:string;answerText:string}):ClinicalReasoningPayload {
  const facts:SourceLinkedEvidence[]=(rawInput.documentedFacts || []).filter(f=>f && typeof(f.fact || f.text)==='string').map(f=>({
    ...f,id:f.id || 'fact_'+stableEvidenceId(JSON.stringify([f.source,f.fact || f.text,f.eventDate])),
    fact:f.fact || f.text,source:f.source || 'User report',category:f.category || 'user_report',
    allowedRole:f.allowedRole || 'Evidence of the reported experience',confidence:f.category==='user_report'?'self_reported':'provisional',timestamp:f.timestamp,
  }));
  for(const f of previousPayload?.stage1_facts || []) if(f.id.startsWith('feedback_') && !facts.some(x=>x.id===f.id)) facts.push(f);
  let injected:SourceLinkedEvidence|undefined;
  if(newFactAnswer?.answerText?.trim()){
    const question=previousPayload?.stage7_focusedQuestion;
    if(!question?.question || question.id!==newFactAnswer.questionId) throw new Error('This question is no longer current. Reload the review before answering.');
    injected={id:'feedback_'+stableEvidenceId(question.id+newFactAnswer.answerText.trim()),fact:newFactAnswer.answerText.trim(),
      source:'User clarification response',category:'user_report',allowedRole:'Evidence of the reported experience',confidence:'self_reported',timestamp:new Date().toISOString()};
    if(!facts.some(f=>f.id===injected!.id)) facts.push(injected);
  }
  const alternatives=facts.length?(rawInput.alternatives || []).filter(a=>a?.title && ['connected_explanation','separate_explanations','insufficient_evidence'].includes(a.type)).map(a=>({
    ...a,id:a.id || 'alternative_'+stableEvidenceId(a.title),
    likelihoodAssessment:['leading','competing','uncertain'].includes(a.likelihoodAssessment)?a.likelihoodAssessment:'uncertain',
    mechanismSummary:a.mechanismSummary || '',rationale:a.rationale || '',
  })):[];
  const corrections=detectCorrectionQueue(facts),assessments=buildTriProngChallenges(alternatives,facts,rawInput.missingLinks || [],corrections);
  const focused=selectFocusedClarification(rawInput.questionsForClinician || [],[],alternatives);
  if(injected && previousPayload?.stage7_focusedQuestion.id===focused.id) Object.assign(focused,{status:'answered',userAnswer:injected.fact,answeredAt:injected.timestamp});
  else if(previousPayload?.stage7_focusedQuestion.id===focused.id && previousPayload.stage7_focusedQuestion.status==='answered') Object.assign(focused,previousPayload.stage7_focusedQuestion);
  const payload:ClinicalReasoningPayload={
    stage1_facts:facts,stage2_timeline:alignChronology(facts),stage3_correctionQueue:corrections,
    stage4_perspectives:facts.length?justifyPerspectives(rawInput.uncertainties || [],rawInput.perspectives):[],
    stage5_alternatives:alternatives,stage6_balancedAssessments:assessments,stage7_focusedQuestion:focused,
    stage8_synthesis:synthesizeFindings(facts,alternatives,assessments,rawInput.uncertainties || [],corrections),
    stage9_continuity:{openQuestions:[...new Set(rawInput.questionsForClinician || [])],chosenNextAction:previousPayload?.stage9_continuity.chosenNextAction || '',preservedHypotheses:alternatives.map(a=>a.title),savedAt:new Date().toISOString()},
  };
  payload.stage10_selectiveUpdate=computeSelectiveUpdateDiff(previousPayload,payload,injected);
  return payload;
}
