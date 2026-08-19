import { CaseItem, AppointmentBrief, BriefTimelineItem, BriefFact, BriefGap, BriefQuestion, BriefPerspective } from './CaseEngine';

// Basic hashing function to generate a fingerprint from strings
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function computeFingerprint(caseItem: CaseItem, profile: any): string {
  const dataString = 
    (caseItem.updatedAt || '') + 
    (caseItem.reviews?.length || 0) + 
    (caseItem.medicalRecords?.length || 0) + 
    (caseItem.intakeData?.chiefComplaint || '') +
    (profile?.updatedAt || '');
  return hashString(dataString);
}

export function generateDeterministicBrief(caseItem: CaseItem, profile: any): AppointmentBrief {
  const generatedAt = new Date().toISOString();
  const sourceFingerprint = computeFingerprint(caseItem, profile);
  
  // 1. Main concern
  const intakeConcern = caseItem.intakeData?.chiefComplaint || 'No concern explicitly reported.';
  
  // 2. Timeline
  const timeline: BriefTimelineItem[] = [];
  if (caseItem.createdAt) {
    timeline.push({ date: new Date(caseItem.createdAt).toLocaleDateString(), event: 'Case opened', sourceIds: ['system'] });
  }
  if (caseItem.events && caseItem.events.length > 0) {
    caseItem.events.slice(0, 5).forEach(e => {
      timeline.push({ date: new Date(e.date).toLocaleDateString(), event: e.label, sourceIds: [e.id || 'event'] });
    });
  }

  // 3. Known Facts
  const knownFacts: BriefFact[] = [];
  if (profile) {
    if (profile.medications && profile.medications.length > 0) {
      knownFacts.push({ text: `Current medications: ${profile.medications.map(m => m.name).join(', ')}`, sourceIds: ['profile-meds'] });
    }
    if (profile.conditions && profile.conditions.length > 0) {
      knownFacts.push({ text: `Pre-existing conditions: ${profile.conditions.join(', ')}`, sourceIds: ['profile-conditions'] });
    }
  }
  if (caseItem.medicalRecords) {
    caseItem.medicalRecords.forEach(r => {
      knownFacts.push({ text: `Record attached: ${r.type.toUpperCase()} (${new Date(r.addedAt).toLocaleDateString()})`, sourceIds: [r.id] });
    });
  }
  
  // 4. Missing Information
  const missingInformation: BriefGap[] = [];
  if (!caseItem.medicalRecords || caseItem.medicalRecords.length === 0) {
    missingInformation.push({ missingText: 'No lab or imaging records provided.', reason: 'Could help clarify diagnosis' });
  }

  // 5. Questions for Clinician
  const questionsForClinician: BriefQuestion[] = [
    { question: 'Which findings do you consider confirmed, and which still need assessment?', sourceIds: ['standard'], isAI: false },
    { question: 'What information would help decide the appropriate next step?', sourceIds: ['standard'], isAI: false },
    { question: 'What changes would mean I should seek urgent care?', sourceIds: ['standard'], isAI: false }
  ];

  // 6. Perspectives
  const priorPerspectives: BriefPerspective[] = [];
  if (caseItem.intakeData?.chiefComplaint) {
    priorPerspectives.push({ title: 'What you reported', summary: caseItem.intakeData.chiefComplaint, sourceId: 'intake' });
  }
  if (caseItem.reviews) {
    caseItem.reviews.forEach((r, i) => {
      if (r.type === 'parallel') {
        priorPerspectives.push({ title: 'Questions previously prepared', summary: 'Quick Consult completed.', sourceId: `qc-${i}` });
      } else if (r.type === 'mdt') {
        priorPerspectives.push({ title: 'Areas previously flagged for clinician discussion', summary: 'Deep Collab completed.', sourceId: `mdt-${i}` });
      }
    });
  }

  return {
    schemaVersion: 1,
    caseId: caseItem.id,
    sourceFingerprint,
    generatedAt,
    purpose: 'Prepare the conversation; let your clinician make the decisions.',
    mainConcern: { text: intakeConcern, sourceIds: ['intake'] },
    timeline: timeline.slice(0, 6),
    knownFacts: knownFacts.slice(0, 8),
    missingInformation,
    questionsForClinician,
    priorPerspectives,
    safetyNotice: 'If you have severe, sudden, or rapidly worsening symptoms (like chest pain, sudden weakness, or trouble breathing), seek emergency medical care immediately instead of waiting for an appointment.',
    isRefinedByAI: false
  };
}

export function isBriefUpToDate(brief: AppointmentBrief, caseItem: CaseItem, profile: any): boolean {
  return brief.sourceFingerprint === computeFingerprint(caseItem, profile);
}
