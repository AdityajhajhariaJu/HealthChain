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
  return hashString(dataString + '_v4');
}

export function generateDeterministicBrief(caseItem: CaseItem, profile: any): AppointmentBrief {
  const generatedAt = new Date().toISOString();
  const sourceFingerprint = computeFingerprint(caseItem, profile);
  
  // 1. Main concern
  let intakeConcern = caseItem.intakeData?.chiefComplaint || 'No concern explicitly reported.';
  
  // If the concern is a system-generated placeholder, try to find the patient's actual first message.
  if (intakeConcern.toLowerCase().includes('user initiated quick consult') || intakeConcern.toLowerCase().includes('user initiated')) {
    intakeConcern = 'No concern explicitly reported.';
    if (caseItem.reviews && caseItem.reviews.length > 0) {
      // Find the first user message in any transcript
      for (const review of caseItem.reviews) {
        if (review.transcripts) {
          const messages = Array.isArray(review.transcripts) ? review.transcripts : Object.values(review.transcripts).flat();
          const firstUserMsg = messages.find((t: any) => t.role === 'user' && (t.content || t.text));
          if (firstUserMsg) {
            intakeConcern = firstUserMsg.content || firstUserMsg.text;
            break;
          }
        }
      }
    }
  }
  
  // 2. Timeline
  const timeline: BriefTimelineItem[] = [];
  const systemKeywords = ['ddx updated', 'parallel review complete', 'case created', 'appointment brief prepared', 'review complete', 'case opened', 'system'];
  
  if (caseItem.events && caseItem.events.length > 0) {
    const userEvents = caseItem.events.filter(e => {
      const lower = (e.label || '').toLowerCase();
      return !systemKeywords.some(kw => lower.includes(kw));
    });
    
    userEvents.slice(0, 5).forEach(e => {
      timeline.push({ date: new Date(e.date).toLocaleDateString(), event: e.label, sourceIds: [e.id || 'event'] });
    });
  }

  // 3. Known Facts
  const knownFacts: BriefFact[] = [];
  if (profile) {
    if (profile.medications && profile.medications.length > 0) {
      knownFacts.push({ text: `Current medications: ${profile.medications.map((m: any) => m.name).join(', ')}`, sourceIds: ['profile-meds'] });
    }
    if (profile.conditions && profile.conditions.length > 0) {
      knownFacts.push({ text: `Pre-existing conditions: ${profile.conditions.join(', ')}`, sourceIds: ['profile-conditions'] });
    }
  }
  if (caseItem.medicalRecords) {
    caseItem.medicalRecords.forEach(r => {
      knownFacts.push({ text: `Record attached: ${r.type.toUpperCase()} (${new Date(r.addedAt || r.addedAt || new Date()).toLocaleDateString()})`, sourceIds: [r.id] });
    });
  }
  
  // 4. Missing Information
  const missingInformation: BriefGap[] = [];
  if (!caseItem.medicalRecords || caseItem.medicalRecords.length === 0) {
    missingInformation.push({ missingText: 'No lab or imaging records provided.', reason: 'Could help clarify diagnosis' });
  }

  // 5. Questions for Clinician
  const questionsForClinician: BriefQuestion[] = [];
  const addedQuestions = new Set<string>();
  
  const addQuestion = (q: string, source: string) => {
    if (!addedQuestions.has(q)) {
      addedQuestions.add(q);
      questionsForClinician.push({ question: q, sourceIds: [source], isAI: true });
    }
  };

  // 6. Perspectives
  const priorPerspectives: BriefPerspective[] = [];
  if (intakeConcern !== 'No concern explicitly reported.') {
    priorPerspectives.push({ title: 'What you reported', summary: intakeConcern, sourceId: 'intake' });
  }
  
  if (caseItem.reviews) {
    caseItem.reviews.forEach((r, i) => {
      const report = r.report || {};
      
      let summary = 'Review completed.';
      if (report.executiveSummary) summary = report.executiveSummary;
      else if (report.patientFriendlySummary) summary = report.patientFriendlySummary;
      
      if (r.type === 'parallel') {
        priorPerspectives.push({ title: 'Quick Consult Overview', summary, sourceId: `qc-${i}` });
      } else if (r.type === 'mdt') {
        priorPerspectives.push({ title: 'Collaborative Review', summary, sourceId: `mdt-${i}` });
      }
      
      // Extract specific questions from the report
      if (report.topDiagnoses && Array.isArray(report.topDiagnoses)) {
        report.topDiagnoses.slice(0, 2).forEach((d: any) => {
          const condition = typeof d === 'string' ? d : d.condition;
          if (condition) addQuestion(`Could my symptoms be related to ${condition}?`, `review-${i}`);
        });
      }
      if (report.recommendedActionPlan && Array.isArray(report.recommendedActionPlan)) {
        report.recommendedActionPlan.slice(0, 2).forEach((a: any) => {
          const action = typeof a === 'string' ? a : a.action || a.step || a;
          if (typeof action === 'string' && action.length > 5) {
            addQuestion(`Should we consider: ${action}?`, `review-${i}`);
          }
        });
      }
    });
  }

  // Fallback generic questions if we don't have enough specific ones
  if (questionsForClinician.length < 3) {
    addQuestion('Which findings do you consider confirmed, and which still need assessment?', 'standard');
    addQuestion('What information would help decide the appropriate next step?', 'standard');
    addQuestion('What changes would mean I should seek urgent care?', 'standard');
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
