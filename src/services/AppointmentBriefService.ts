import {
  CaseItem,
  AppointmentBrief,
  BriefTimelineItem,
  BriefFact,
  BriefGap,
  BriefQuestion,
  BriefPerspective,
  BriefChangeItem,
  BriefPreviousOutcome,
  generateStableQuestionId,
} from './CaseEngine';

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
    (profile?.updatedAt || '') +
    (caseItem.questions?.map(q => `${q.id}:${q.status}:${q.outcomeNote || ''}`).join('|') || '');
  return hashString(dataString + '_v6');
}

export function generateDeterministicBrief(
  caseItem: CaseItem,
  profile: any,
  options?: { selectedQuestionIds?: string[] }
): AppointmentBrief {
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
      const d = new Date(e?.date || Date.now());
      const dateStr = isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString();
      timeline.push({ date: dateStr, event: e.label || 'Health event', sourceIds: [e.id || 'event'] });
    });
  }

  // 3. Known Facts
  const knownFacts: BriefFact[] = [];
  if (profile) {
    if (profile.medications && profile.medications.length > 0) {
      const medList = profile.medications.map((m: any) => m?.name || (typeof m === 'string' ? m : '')).filter(Boolean);
      if (medList.length > 0) {
        knownFacts.push({ text: `Current medications: ${medList.join(', ')}`, sourceIds: ['profile-meds'] });
      }
    }
    if (profile.conditions && profile.conditions.length > 0) {
      const condList = profile.conditions.filter(Boolean);
      if (condList.length > 0) {
        knownFacts.push({ text: `Pre-existing conditions: ${condList.join(', ')}`, sourceIds: ['profile-conditions'] });
      }
    }
  }
  if (caseItem.medicalRecords) {
    caseItem.medicalRecords.forEach(r => {
      const recDate = new Date(r?.addedAt || Date.now());
      const recDateStr = isNaN(recDate.getTime()) ? 'Recent' : recDate.toLocaleDateString();
      knownFacts.push({ text: `Record attached: ${(r?.type || 'Record').toUpperCase()} (${recDateStr})`, sourceIds: [r.id || 'record'] });
    });
  }
  
  // 4. Missing Information
  const missingInformation: BriefGap[] = [];
  if (!caseItem.medicalRecords || caseItem.medicalRecords.length === 0) {
      missingInformation.push({ missingText: 'No lab or imaging records provided.', reason: 'Could help clarify the clinical picture' });
  }

  // 5. Questions for Clinician
  const questionsForClinician: BriefQuestion[] = [];
  const addedQuestions = new Set<string>();

  // A. Harvest existing questions on caseItem
  (caseItem.questions || []).forEach(q => {
    const norm = q.questionText.trim().toLowerCase();
    if (!addedQuestions.has(norm)) {
      addedQuestions.add(norm);
      questionsForClinician.push({
        id: q.id,
        question: q.questionText,
        sourceIds: q.supportingEvidenceIds || ['case_questions'],
        isAI: false,
        status: q.status,
        outcomeNote: q.outcomeNote,
      });
    }
  });
  
  const addQuestion = (q: string, source: string) => {
    const norm = q.trim().toLowerCase();
    if (!addedQuestions.has(norm)) {
      addedQuestions.add(norm);
      const stableId = generateStableQuestionId(caseItem.id, q);
      questionsForClinician.push({
        id: stableId,
        question: q,
        sourceIds: [source],
        isAI: true,
        status: 'open',
      });
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
      
      if (r.type === 'jarvis') {
        priorPerspectives.push({ title: 'Clinical Data Engine Dossier', summary, sourceId: `jarvis-${i}` });
        if (report.primaryHypothesis) {
          addQuestion(`Could my presentation be explained by ${report.primaryHypothesis}?`, `jarvis-${i}`);
        }
        if (report.doctorActionPlan?.confirmatoryTests && Array.isArray(report.doctorActionPlan.confirmatoryTests)) {
          report.doctorActionPlan.confirmatoryTests.slice(0, 3).forEach((ct: any) => {
            const testName = typeof ct === 'string' ? ct : ct.test;
            const rationale = typeof ct === 'string' ? '' : ct.rationale;
            if (testName) {
              addQuestion(`Should we consider evaluating: ${testName}${rationale ? ` (${rationale})` : ''}?`, `jarvis-${i}`);
            }
          });
        }
        if (report.missingLinks && Array.isArray(report.missingLinks)) {
          report.missingLinks.slice(0, 2).forEach((link: string) => {
            missingInformation.push({ missingText: link, reason: 'Identified as potential diagnostic blindspot' });
          });
        }
      } else if (r.type === 'parallel') {
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
        report.recommendedActionPlan.slice(0, 3).forEach((a: any) => {
          const action = typeof a === 'string' ? a : a.action || a.step || a;
          if (typeof action === 'string' && action.length > 5) {
            const lowerAction = action.toLowerCase();
            if (lowerAction.includes('refer') || lowerAction.includes('specialist')) {
               addQuestion(`Would a specialist referral be appropriate? (${action})`, `review-${i}`);
            } else if (lowerAction.includes('test') || lowerAction.includes('scan') || lowerAction.includes('mri') || lowerAction.includes('blood') || lowerAction.includes('lab')) {
               addQuestion(`Should we consider any specific tests or reports? (${action})`, `review-${i}`);
            } else if (lowerAction.includes('medication') || lowerAction.includes('treat')) {
               addQuestion(`Are there specific medications or treatments we should discuss? (${action})`, `review-${i}`);
            } else {
               addQuestion(`Should we consider: ${action}?`, `review-${i}`);
            }
          }
        });
      }
      
      if (r.specialists && Array.isArray(r.specialists) && r.specialists.length > 0) {
        const specs = r.specialists.join(', ');
        addQuestion(`Would a referral to ${specs} be appropriate for my case?`, `review-${i}`);
      }
    });
  }

  // Fallback generic questions if we don't have enough specific ones
  if (questionsForClinician.length < 3) {
    addQuestion('Which findings do you consider confirmed, and which still need assessment?', 'standard');
    addQuestion('What information would help decide the appropriate next step?', 'standard');
    addQuestion('What changes would mean I should seek urgent care?', 'standard');
  }

  // Prioritize selected questions if provided
  let finalQuestions = questionsForClinician;
  if (options?.selectedQuestionIds && options.selectedQuestionIds.length > 0) {
    const selectedSet = new Set(options.selectedQuestionIds);
    const selected = questionsForClinician.filter(q => q.id && selectedSet.has(q.id));
    const remaining = questionsForClinician.filter(q => !q.id || !selectedSet.has(q.id));
    finalQuestions = [...selected, ...remaining];
  }

  // 7. Previous Outcomes Reviewed
  const previousOutcomesReviewed: BriefPreviousOutcome[] = (caseItem.questions || [])
    .filter(q => q.status === 'discussed' || q.status === 'deferred' || q.status === 'resolved' || q.status === 'addressed' || Boolean(q.outcomeNote))
    .map(q => ({
      questionId: q.id,
      questionText: q.questionText,
      status: q.status,
      note: q.outcomeNote,
      outcomeDate: q.outcomeDate || q.resolvedAt || q.discussedAt || q.deferredAt,
      provenance: q.outcomeProvenance || 'user_reported_clinician_statement',
    }));

  // 8. "What Changed Since Last Visit" Generator
  const previousBrief = caseItem.appointmentBriefs?.current || caseItem.appointmentBriefs?.history?.[0];
  const changesSinceLastVisit: BriefChangeItem[] = [];
  if (previousBrief) {
    const prevTime = new Date(previousBrief.generatedAt).getTime();

    // Questions with outcomes recorded after or during previous brief
    (caseItem.questions || []).forEach(q => {
      const outcomeTime = new Date(q.outcomeDate || q.resolvedAt || q.discussedAt || q.deferredAt || 0).getTime();
      if ((outcomeTime >= prevTime || !previousBrief.questionIdsIncluded?.includes(q.id)) &&
          (q.status === 'discussed' || q.status === 'deferred' || q.status === 'resolved')) {
        changesSinceLastVisit.push({
          type: 'outcome_recorded',
          description: `Outcome recorded: "${q.questionText}" marked ${q.status}${q.outcomeNote ? ` — "${q.outcomeNote}"` : ''}`,
          date: q.outcomeDate || q.resolvedAt || q.discussedAt || 'Recent',
        });
      }
    });

    // Records added after previous brief
    (caseItem.medicalRecords || []).forEach(r => {
      const recTime = new Date(r.addedAt || 0).getTime();
      if (recTime >= prevTime || !previousBrief.recordIdsIncluded?.includes(r.id)) {
        changesSinceLastVisit.push({
          type: 'record_added',
          description: `New clinical record attached: ${r.filename || r.type || 'Lab Record'}`,
          date: r.addedAt ? new Date(r.addedAt).toLocaleDateString() : 'Recent',
        });
      }
    });

    // Events logged after previous brief
    (caseItem.events || []).forEach(e => {
      const eventTime = new Date(e.date || 0).getTime();
      if (eventTime >= prevTime && !systemKeywords.some(kw => (e.label || '').toLowerCase().includes(kw))) {
        changesSinceLastVisit.push({
          type: 'symptom_update',
          description: e.note ? `${e.label}: ${e.note}` : e.label,
          date: e.date ? new Date(e.date).toLocaleDateString() : 'Recent',
        });
      }
    });
  }

  // Version calculation
  const priorHistory = caseItem.appointmentBriefs?.history || [];
  const currentBrief = caseItem.appointmentBriefs?.current;
  const currentVersion = currentBrief?.version || (priorHistory.length > 0 ? Math.max(...priorHistory.map(h => h.version || 1)) : 0);
  const nextVersion = currentVersion + 1;

  return {
    briefId: `brief_${caseItem.id.slice(-6)}_${Date.now().toString(36)}`,
    version: nextVersion,
    parentBriefId: currentBrief?.briefId,
    schemaVersion: 1,
    caseId: caseItem.id,
    sourceFingerprint,
    generatedAt,
    purpose: 'Prepare the conversation; let your clinician make the decisions.',
    mainConcern: { text: intakeConcern, sourceIds: ['intake'] },
    timeline: timeline.slice(0, 6),
    knownFacts: knownFacts.slice(0, 8),
    missingInformation,
    questionsForClinician: finalQuestions,
    priorPerspectives,
    previousOutcomesReviewed,
    changesSinceLastVisit,
    questionIdsIncluded: finalQuestions.map(q => q.id).filter(Boolean) as string[],
    recordIdsIncluded: (caseItem.medicalRecords || []).map(r => r.id),
    safetyNotice: 'If you have severe, sudden, or rapidly worsening symptoms (like chest pain, sudden weakness, or trouble breathing), seek emergency medical care immediately instead of waiting for an appointment.',
    isRefinedByAI: false,
  };
}

export function isBriefUpToDate(brief: AppointmentBrief, caseItem: CaseItem, profile: any): boolean {
  return brief.sourceFingerprint === computeFingerprint(caseItem, profile);
}
