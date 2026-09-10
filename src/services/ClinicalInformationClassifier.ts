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

export interface BaseInformationItem {
  id: string;
  category: ClinicalInformationCategory;
  text: string;
  createdAt: string;
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
  page: number;
  units?: string;
  extractionStatus: 'provisional' | 'checked' | 'rejected';
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

/**
 * Validates whether an information item contains all required fields for its category.
 */
export function validateCategorizedItem(item: CategorizedInformationItem): {
  isValid: boolean;
  missingFields: string[];
} {
  const spec = INFORMATION_CATEGORY_REGISTRY[item.category];
  if (!spec) {
    return { isValid: false, missingFields: ['category'] };
  }

  const missingFields: string[] = [];
  for (const field of spec.requiredFields) {
    const val = (item as any)[field];
    if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
      missingFields.push(field);
    } else if (Array.isArray(val) && val.length === 0 && (field === 'supportingEvidenceIds' || field === 'limitations')) {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Heuristic classifier that inspects a raw clinical fact or text entry
 * and converts it into a typed CategorizedInformationItem.
 */
export function classifyClinicalInformation(raw: {
  id?: string;
  text: string;
  source?: string;
  date?: string;
  author?: string;
  file?: string;
  page?: number;
  value?: number | string;
  unit?: string;
  method?: string;
  extractionStatus?: 'provisional' | 'checked' | 'rejected';
  attribution?: string;
  supportingEvidenceIds?: string[];
  limitations?: string[];
  modelVersion?: string;
  identifier?: string;
  studyType?: string;
  relevantPassage?: string;
  reasonForAsking?: string;
  missingInformation?: string;
  decisionText?: string;
}): CategorizedInformationItem {
  const id = raw.id || `item_${Math.random().toString(36).substring(2, 9)}`;
  const text = raw.text.trim();
  const sourceLower = (raw.source || '').toLowerCase();
  const textLower = text.toLowerCase();
  const nowStr = new Date().toISOString();

  // 1. Check for Outcome
  if (
    textLower.startsWith('outcome:') ||
    textLower.includes('at the visit, we agreed') ||
    textLower.includes('doctor decided') ||
    raw.decisionText
  ) {
    return {
      id,
      category: 'outcome',
      text,
      createdAt: nowStr,
      sourceDocumentOrUserReport: raw.source || raw.author || 'Clinical Appointment Brief',
      date: raw.date || nowStr.slice(0, 10),
      decisionText: raw.decisionText || text,
      allowedRole: 'Follow-up that can update the case',
    };
  }

  // 2. Check for Open Question
  if (
    text.endsWith('?') ||
    textLower.startsWith('question:') ||
    textLower.includes('did these events overlap') ||
    raw.reasonForAsking
  ) {
    return {
      id,
      category: 'open_question',
      text,
      createdAt: nowStr,
      questionText: text,
      reasonForAsking: raw.reasonForAsking || 'Unresolved correlation or timeline overlap in case evidence',
      missingInformation: raw.missingInformation || 'Symptom timing or missing lab confirmation',
      allowedRole: 'An unresolved task',
    };
  }

  // 3. Check for External Evidence
  if (
    raw.identifier ||
    sourceLower.includes('pubmed') ||
    sourceLower.includes('trial') ||
    sourceLower.includes('nct') ||
    sourceLower.includes('doi') ||
    textLower.includes('clinical trial')
  ) {
    return {
      id,
      category: 'external_evidence',
      text,
      createdAt: nowStr,
      identifier: raw.identifier || raw.source || 'External Clinical Literature',
      date: raw.date || nowStr.slice(0, 10),
      studyType: raw.studyType || 'Peer-reviewed clinical publication / registry trial',
      relevantPassage: raw.relevantPassage || text,
      allowedRole: 'General evidence with applicability limits',
    };
  }

  // 4. Check for Documented Clinician Assessment
  if (
    sourceLower.includes('clinic note') ||
    sourceLower.includes('dr.') ||
    sourceLower.includes('doctor') ||
    sourceLower.includes('physician') ||
    sourceLower.includes('discharge') ||
    raw.attribution
  ) {
    return {
      id,
      category: 'documented_clinician_assessment',
      text,
      createdAt: nowStr,
      source: raw.source || 'Clinical Encounter Note',
      date: raw.date || nowStr.slice(0, 10),
      attribution: raw.attribution || raw.source || 'Treating Clinician',
      allowedRole: 'A dated clinician assessment—not automatically permanent truth',
    };
  }

  // 5. Check for Extracted Finding (from an attached PDF / file / lab report)
  if (
    raw.file ||
    raw.page !== undefined ||
    sourceLower.includes('.pdf') ||
    sourceLower.includes('lab report') ||
    sourceLower.includes('panel') ||
    sourceLower.includes('blood test') ||
    sourceLower.includes('scan')
  ) {
    return {
      id,
      category: 'extracted_finding',
      text,
      createdAt: nowStr,
      originalFile: raw.file || raw.source || 'Attached Laboratory Document',
      page: raw.page || 1,
      units: raw.unit,
      extractionStatus: raw.extractionStatus || 'provisional',
      allowedRole: 'Provisional record content until checked',
    };
  }

  // 6. Check for Recorded Measurement (e.g. vital sign or wearable reading)
  const measurementMatch = text.match(/(\d+(?:\.\d+)?)\s*(bpm|mg\/dl|mmhg|mmol\/l|g\/dl|pg\/ml|ng\/ml|%|kg|lbs|mcg\/l)/i);
  if (measurementMatch || (raw.value !== undefined && raw.unit)) {
    return {
      id,
      category: 'recorded_measurement',
      text,
      createdAt: nowStr,
      value: raw.value ?? measurementMatch?.[1] ?? 'Recorded value',
      unit: raw.unit ?? measurementMatch?.[2] ?? 'units',
      time: raw.date || nowStr,
      method: raw.method || raw.source || 'Recorded measurement instrument',
      allowedRole: 'Evidence of that measurement',
    };
  }

  // 7. Check for AI Consideration
  if (
    textLower.includes('may be related') ||
    textLower.includes('consider') ||
    textLower.includes('ai proposal') ||
    textLower.includes('differential') ||
    sourceLower.includes('ai') ||
    sourceLower.includes('jarvis') ||
    sourceLower.includes('engine')
  ) {
    return {
      id,
      category: 'ai_consideration',
      text,
      createdAt: nowStr,
      supportingEvidenceIds: raw.supportingEvidenceIds || ['input_context_01'],
      limitations: raw.limitations || [
        'Model-generated working hypothesis; requires clinical confirmation',
        'Not calibrated diagnostic probability',
      ],
      modelVersion: raw.modelVersion || 'Clinical Data Engine v2.4',
      allowedRole: 'A proposal to examine',
    };
  }

  // 8. Default: User Report (Patient's subjective experience)
  return {
    id,
    category: 'user_report',
    text,
    createdAt: nowStr,
    author: raw.author || 'Patient',
    entryTime: raw.date || nowStr,
    allowedRole: 'Evidence of the reported experience',
  };
}

/**
 * Pre-Reasoning Gateway:
 * Strictly sorts, validates, and partitions raw information items
 * before any synthesis, differential weighting, or clinical reasoning is permitted.
 */
export function partitionBeforeReasoning(rawItems: any[]): {
  userReports: UserReportItem[];
  measurements: RecordedMeasurementItem[];
  extractedFindings: ExtractedFindingItem[];
  clinicianAssessments: DocumentedClinicianAssessmentItem[];
  aiConsiderations: AIConsiderationItem[];
  externalEvidence: ExternalEvidenceItem[];
  openQuestions: OpenQuestionItem[];
  outcomes: OutcomeItem[];
  allValid: boolean;
  summary: Record<ClinicalInformationCategory, number>;
} {
  const userReports: UserReportItem[] = [];
  const measurements: RecordedMeasurementItem[] = [];
  const extractedFindings: ExtractedFindingItem[] = [];
  const clinicianAssessments: DocumentedClinicianAssessmentItem[] = [];
  const aiConsiderations: AIConsiderationItem[] = [];
  const externalEvidence: ExternalEvidenceItem[] = [];
  const openQuestions: OpenQuestionItem[] = [];
  const outcomes: OutcomeItem[] = [];

  let allValid = true;

  for (const raw of rawItems) {
    let item: CategorizedInformationItem;
    if (raw && typeof raw === 'object' && raw.category && INFORMATION_CATEGORY_REGISTRY[raw.category as ClinicalInformationCategory]) {
      item = raw as CategorizedInformationItem;
    } else {
      item = classifyClinicalInformation(
        typeof raw === 'string'
          ? { text: raw }
          : {
              text: raw.fact || raw.text || raw.claim || JSON.stringify(raw),
              source: raw.source,
              date: raw.date,
              page: raw.page,
              file: raw.file,
              attribution: raw.attribution,
            }
      );
    }

    const { isValid } = validateCategorizedItem(item);
    if (!isValid) allValid = false;

    switch (item.category) {
      case 'user_report':
        userReports.push(item);
        break;
      case 'recorded_measurement':
        measurements.push(item);
        break;
      case 'extracted_finding':
        extractedFindings.push(item);
        break;
      case 'documented_clinician_assessment':
        clinicianAssessments.push(item);
        break;
      case 'ai_consideration':
        aiConsiderations.push(item);
        break;
      case 'external_evidence':
        externalEvidence.push(item);
        break;
      case 'open_question':
        openQuestions.push(item);
        break;
      case 'outcome':
        outcomes.push(item);
        break;
    }
  }

  const summary: Record<ClinicalInformationCategory, number> = {
    user_report: userReports.length,
    recorded_measurement: measurements.length,
    extracted_finding: extractedFindings.length,
    documented_clinician_assessment: clinicianAssessments.length,
    ai_consideration: aiConsiderations.length,
    external_evidence: externalEvidence.length,
    open_question: openQuestions.length,
    outcome: outcomes.length,
  };

  return {
    userReports,
    measurements,
    extractedFindings,
    clinicianAssessments,
    aiConsiderations,
    externalEvidence,
    openQuestions,
    outcomes,
    allValid,
    summary,
  };
}
