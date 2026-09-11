/**
 * ClinicalInformationClassifier.ts
 *
 * CANONICAL ARCHITECTURE SPECIFICATION: STEP 3 (Categorise information before reasoning about it)
 *
 * "A source, an interpretation and a conclusion are different objects—even when they use similar words."
 *
 * Pre-Reasoning Epistemic Gateway:
 * Defines the 8 distinct clinical information categories, their required provenance metadata,
 * and their strictly enforced allowed roles.
 */

export type ClinicalInformationCategory =
  | 'user_report'
  | 'recorded_measurement'
  | 'extracted_finding'
  | 'documented_clinician_assessment'
  | 'ai_consideration'
  | 'external_evidence'
  | 'open_question'
  | 'outcome';

export type ExtractionStatus = 'provisional' | 'source_matched' | 'user_corrected' | 'rejected' | 'checked';
export type InterpretationStatus = 'grounded' | 'unsupported_speculation' | 'quarantined';
export type ClaimKind = 'direct_evidence' | 'ai_interpretation' | 'clinical_guidance' | 'patient_report' | 'quotation' | 'observation';

export interface InformationAuditEntry {
  originalText: string;
  correctedText: string;
  correctedAt: string;
  correctedBy: string;
  action?: string;
  field?: string;
}

export interface GroundedClaimRecord {
  id: string;
  text: string;
  category: ClinicalInformationCategory;
  evidenceIds: string[];
  limitations: string[];
  reviewVersion: number;
  claimKind: ClaimKind;
  interpretationStatus: InterpretationStatus;
  isGeneralGuidance: boolean;
  unsupportedReason?: string;
}

export interface BaseInformationItem {
  id: string;
  category: ClinicalInformationCategory;
  text: string;
  createdAt: string;
  originalText?: string;
  auditTrail?: InformationAuditEntry[];
}

export interface UserReportItem extends BaseInformationItem {
  category: 'user_report';
  author: string;
  entryTime: string;
  eventTime?: string;
  allowedRole: 'Evidence of the reported experience';
}

export interface RecordedMeasurementItem extends BaseInformationItem {
  category: 'recorded_measurement';
  value: number | string;
  unit: string;
  time: string;
  method: string; // e.g. "Wearable PPG", "Automated cuff", "Fingerstick Glucometer"
  allowedRole: 'Evidence of that measurement';
}

export interface ExtractedFindingItem extends BaseInformationItem {
  category: 'extracted_finding';
  originalFile: string;
  page?: number;
  units?: string;
  extractionStatus: ExtractionStatus;
  confidence?: number;
  allowedRole: 'Provisional record content until checked';
}

export interface DocumentedClinicianAssessmentItem extends BaseInformationItem {
  category: 'documented_clinician_assessment';
  source: string; // Document or consult title
  date: string;
  attribution: string; // Clinician name / Specialty / Clinic
  allowedRole: 'A dated clinician assessment—not automatically permanent truth';
}

export interface AIConsiderationItem extends BaseInformationItem {
  category: 'ai_consideration';
  supportingEvidenceIds: string[];
  limitations: string[];
  modelVersion: string;
  allowedRole: 'A proposal to examine';
}

export interface ExternalEvidenceItem extends BaseInformationItem {
  category: 'external_evidence';
  identifier: string; // DOI, NCT ID, PubMed ID, or URL
  date: string;
  studyType: string;
  relevantPassage: string;
  allowedRole: 'General evidence with applicability limits';
}

export interface OpenQuestionItem extends BaseInformationItem {
  category: 'open_question';
  reasonForAsking: string;
  missingInformation: string;
  questionText: string;
  allowedRole: 'An unresolved task';
}

export interface OutcomeItem extends BaseInformationItem {
  category: 'outcome';
  sourceDocumentOrUserReport: string;
  date: string;
  decisionText: string;
  statusEffect?: 'addressed' | 'deferred' | 'resolved';
  allowedRole: 'Follow-up that can update the case';
}

export type CategorizedInformationItem =
  | UserReportItem
  | RecordedMeasurementItem
  | ExtractedFindingItem
  | DocumentedClinicianAssessmentItem
  | AIConsiderationItem
  | ExternalEvidenceItem
  | OpenQuestionItem
  | OutcomeItem;

export interface CategorySpec {
  category: ClinicalInformationCategory;
  name: string;
  shortLabel: string;
  icon: string;
  example: string;
  requiredFields: string[];
  allowedRole: string;
  badgeColors: {
    bg: string;
    text: string;
    border: string;
    accent: string;
  };
}

export const INFORMATION_CATEGORY_REGISTRY: Record<ClinicalInformationCategory, CategorySpec> = {
  user_report: {
    category: 'user_report',
    name: 'User Report',
    shortLabel: 'User Report',
    icon: '👤',
    example: '“I felt dizzy after lunch.”',
    requiredFields: ['author', 'entryTime'],
    allowedRole: 'Evidence of the reported experience',
    badgeColors: {
      bg: '#ECFDF5',
      text: '#065F46',
      border: '#A7F3D0',
      accent: '#10B981',
    },
  },
  recorded_measurement: {
    category: 'recorded_measurement',
    name: 'Recorded Measurement',
    shortLabel: 'Measurement',
    icon: '📐',
    example: 'A heart-rate reading or blood pressure log.',
    requiredFields: ['value', 'unit', 'time', 'method'],
    allowedRole: 'Evidence of that measurement',
    badgeColors: {
      bg: '#EFF6FF',
      text: '#1E40AF',
      border: '#BFDBFE',
      accent: '#3B82F6',
    },
  },
  extracted_finding: {
    category: 'extracted_finding',
    name: 'Extracted Finding',
    shortLabel: 'Extracted Finding',
    icon: '📄',
    example: 'A result read from an attached lab PDF or scan.',
    requiredFields: ['originalFile', 'page', 'extractionStatus'],
    allowedRole: 'Provisional record content until checked',
    badgeColors: {
      bg: '#FFFBEB',
      text: '#92400E',
      border: '#FDE68A',
      accent: '#F59E0B',
    },
  },
  documented_clinician_assessment: {
    category: 'documented_clinician_assessment',
    name: 'Documented Clinician Assessment',
    shortLabel: 'Clinician Note',
    icon: '🩺',
    example: 'An assessment written in a clinic note or discharge summary.',
    requiredFields: ['source', 'date', 'attribution'],
    allowedRole: 'A dated clinician assessment—not automatically permanent truth',
    badgeColors: {
      bg: '#FAF5FF',
      text: '#6B21A8',
      border: '#E9D5FF',
      accent: '#9333EA',
    },
  },
  ai_consideration: {
    category: 'ai_consideration',
    name: 'AI Consideration',
    shortLabel: 'AI Consideration',
    icon: '🤖',
    example: '“These observations may be related.”',
    requiredFields: ['supportingEvidenceIds', 'limitations', 'modelVersion'],
    allowedRole: 'A proposal to examine',
    badgeColors: {
      bg: '#FFF1F2',
      text: '#9F1239',
      border: '#FECDD3',
      accent: '#E11D48',
    },
  },
  external_evidence: {
    category: 'external_evidence',
    name: 'External Evidence',
    shortLabel: 'External Evidence',
    icon: '🔬',
    example: 'A clinical trial paper, registry record, or PubMed study.',
    requiredFields: ['identifier', 'date', 'studyType', 'relevantPassage'],
    allowedRole: 'General evidence with applicability limits',
    badgeColors: {
      bg: '#F0FDFA',
      text: '#115E59',
      border: '#99F6E4',
      accent: '#0D9488',
    },
  },
  open_question: {
    category: 'open_question',
    name: 'Open Question',
    shortLabel: 'Open Question',
    icon: '❓',
    example: '“Did these events overlap?”',
    requiredFields: ['reasonForAsking', 'missingInformation', 'questionText'],
    allowedRole: 'An unresolved task',
    badgeColors: {
      bg: '#FEF2F2',
      text: '#991B1B',
      border: '#FECACA',
      accent: '#DC2626',
    },
  },
  outcome: {
    category: 'outcome',
    name: 'Clinical Outcome',
    shortLabel: 'Outcome',
    icon: '✅',
    example: '“At the visit, we agreed to taper medication.”',
    requiredFields: ['sourceDocumentOrUserReport', 'date', 'decisionText'],
    allowedRole: 'Follow-up that can update the case',
    badgeColors: {
      bg: '#F8FAFC',
      text: '#334155',
      border: '#CBD5E1',
      accent: '#475569',
    },
  },
};


export function validateCategorizedItem(item: CategorizedInformationItem): {isValid:boolean;missingFields:string[]} {
  const spec=item && INFORMATION_CATEGORY_REGISTRY[item.category];
  if(!spec) return {isValid:false,missingFields:['category']};
  const missingFields=['id','text',...spec.requiredFields].filter(field=>{
    const v=(item as any)[field];
    return v===undefined || v===null || (typeof v==='string' && !v.trim()) || (Array.isArray(v) && !v.length);
  });
  if(item.category==='extracted_finding' && item.page!==undefined && (!Number.isInteger(item.page)||item.page<1)) missingFields.push('page');
  return {isValid:!missingFields.length,missingFields};
}
export function validateGroundedClaim(
  claim: Partial<GroundedClaimRecord>,
  knownEvidenceIds: Set<string>
): { isValid: boolean; reason?: string } {
  if (!claim || typeof claim.text !== 'string' || !claim.text.trim()) {
    return { isValid: false, reason: 'Claim text is empty or missing.' };
  }
  if (!claim.evidenceIds || !Array.isArray(claim.evidenceIds) || claim.evidenceIds.length === 0) {
    return { isValid: false, reason: 'Claim cites no supporting evidence identifiers.' };
  }
  const invalidIds = claim.evidenceIds.filter(id => !knownEvidenceIds.has(id));
  if (invalidIds.length > 0) {
    return { isValid: false, reason: `Claim cites unknown or unverified evidence IDs: ${invalidIds.join(', ')}` };
  }
  return { isValid: true };
}

export function classifyClinicalInformation(raw: {
  id?:string;text:string;category?:ClinicalInformationCategory;source?:string;date?:string;author?:string;file?:string;page?:number;
  value?:number|string;unit?:string;method?:string;extractionStatus?:ExtractionStatus;attribution?:string;
  supportingEvidenceIds?:string[];limitations?:string[];modelVersion?:string;identifier?:string;studyType?:string;relevantPassage?:string;
  reasonForAsking?:string;missingInformation?:string;decisionText?:string;originalText?:string;auditTrail?:InformationAuditEntry[];
}):CategorizedInformationItem {
  let hash=2166136261;for(const c of JSON.stringify([raw.text,raw.source,raw.date])) hash=Math.imul(hash^c.charCodeAt(0),16777619);
  const base={id:raw.id || 'item_'+(hash>>>0).toString(16),text:(raw.text || '').trim(),createdAt:raw.date || '',originalText:raw.originalText,auditTrail:raw.auditTrail};
  // Provenance overrides words in the content. A number or "doctor" in prose
  // does not establish measurement or clinician provenance.
  const source=(raw.source || '').toLowerCase();
  const category:ClinicalInformationCategory=raw.category && INFORMATION_CATEGORY_REGISTRY[raw.category]?raw.category:
    /\b(ai|engine|jarvis)\b/.test(source)?'ai_consideration':
    raw.file?'extracted_finding':raw.attribution?'documented_clinician_assessment':
    raw.identifier?'external_evidence':raw.value!==undefined && raw.unit && raw.method?'recorded_measurement':
    raw.decisionText?'outcome':raw.reasonForAsking?'open_question':'user_report';
  const allowedRole=INFORMATION_CATEGORY_REGISTRY[category].allowedRole;
  return ({
    ...base,category,allowedRole,
    ...(category==='user_report'?{author:raw.author || 'User',entryTime:raw.date || ''}:{}),
    ...(category==='recorded_measurement'?{value:raw.value,unit:raw.unit || '',time:raw.date || '',method:raw.method || ''}:{}),
    ...(category==='extracted_finding'?{originalFile:raw.file || '',page:raw.page,units:raw.unit,extractionStatus:raw.extractionStatus || 'provisional'}:{}),
    ...(category==='documented_clinician_assessment'?{source:raw.source || '',date:raw.date || '',attribution:raw.attribution || ''}:{}),
    ...(category==='ai_consideration'?{supportingEvidenceIds:raw.supportingEvidenceIds || [],limitations:raw.limitations || [],modelVersion:raw.modelVersion || ''}:{}),
    ...(category==='external_evidence'?{identifier:raw.identifier || '',date:raw.date || '',studyType:raw.studyType || '',relevantPassage:raw.relevantPassage || ''}:{}),
    ...(category==='open_question'?{questionText:base.text,reasonForAsking:raw.reasonForAsking || '',missingInformation:raw.missingInformation || ''}:{}),
    ...(category==='outcome'?{sourceDocumentOrUserReport:raw.source || '',date:raw.date || '',decisionText:raw.decisionText || ''}:{}),
  }) as CategorizedInformationItem;
}
export function partitionBeforeReasoning(rawItems:any[]) {
  const result={userReports:[] as UserReportItem[],measurements:[] as RecordedMeasurementItem[],extractedFindings:[] as ExtractedFindingItem[],
    clinicianAssessments:[] as DocumentedClinicianAssessmentItem[],aiConsiderations:[] as AIConsiderationItem[],
    externalEvidence:[] as ExternalEvidenceItem[],openQuestions:[] as OpenQuestionItem[],outcomes:[] as OutcomeItem[],
    invalidItems:[] as CategorizedInformationItem[],allValid:true,
    summary:Object.fromEntries(Object.keys(INFORMATION_CATEGORY_REGISTRY).map(k=>[k,0])) as Record<ClinicalInformationCategory,number>};
  const buckets={user_report:'userReports',recorded_measurement:'measurements',extracted_finding:'extractedFindings',documented_clinician_assessment:'clinicianAssessments',
    ai_consideration:'aiConsiderations',external_evidence:'externalEvidence',open_question:'openQuestions',outcome:'outcomes'};
  for(const raw of rawItems || []){
    if(raw==null) {result.allValid=false;continue;}
    const item=raw.classifiedItem || (raw.category && raw.allowedRole && raw.text?raw:classifyClinicalInformation(typeof raw==='string'?{text:raw}:{...raw,text:raw.fact || raw.text || ''}));
    if(!validateCategorizedItem(item).isValid){result.allValid=false;result.invalidItems.push(item);continue;}
    (result as any)[buckets[item.category]].push(item);result.summary[item.category as ClinicalInformationCategory]++;
  }
  return result;
}
