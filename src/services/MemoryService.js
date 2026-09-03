import { getProfile } from './ProfileEngine';
import { getActiveCase } from './CaseEngine';


/* eslint-disable no-unused-vars */
let cachedContext = null;
let lastProfileHash = null;
/* eslint-enable no-unused-vars */

export function compilePatientContext(options = {}) {
  const { includeActiveCase = false, includeDailyCheckins = false } = options;
  let contextParts = [];
  const profile = getProfile();
  const activeCase = includeActiveCase ? getActiveCase() : null;

  // 1. Profile Context (compact & sanitized)
  let profileStr = `PATIENT PROFILE:\n`;
  if (profile?.demographics?.age || profile?.demographics?.gender) {
    profileStr += `- ${profile.demographics.age || '?'} yr ${profile.demographics.gender || ''}\n`;
  }
  
  const cleanConditions = (profile?.conditions || []).filter((c) => {
    const l = (c || '').toLowerCase();
    return !l.includes('diagnostic ambig') && !l.includes('undifferentiated') && !l.includes('unknown') && !l.includes('review');
  });

  if (cleanConditions.length > 0) {
    profileStr += `- Known Conditions: ${cleanConditions.join(', ')}\n`;
  }
  if (profile?.medications && profile.medications.length > 0) {
    const medNames = profile.medications
      .map((m) => (typeof m === 'string' ? m : m?.name || ''))
      .filter(Boolean);
    if (medNames.length > 0) {
      profileStr += `- Meds: ${medNames.join(', ')}\n`;
    }
  }
  if (profile?.familyHistory && profile.familyHistory.length > 0) {
    const famHistory = profile.familyHistory
      .map((f) => (typeof f === 'string' ? f : f?.relation ? `${f.relation}: ${f.condition}` : ''))
      .filter(Boolean);
    if (famHistory.length > 0) {
      profileStr += `- Family Hx: ${famHistory.join(', ')}\n`;
    }
  }

  if (profileStr !== `PATIENT PROFILE:\n`) {
    contextParts.push(profileStr);
  }

  // 2. Vitals / Labs (compact - top 6 only)
  const labEntries = Object.entries(profile?.vitals?.latestLabValues || {});
  if (labEntries.length > 0) {
    let vitalsStr = `LABS:\n`;
    labEntries.slice(0, 6).forEach(([key, data]) => {
      if (data && typeof data === 'object') {
        vitalsStr += `- ${key}: ${data.value || ''} ${data.unit || ''} ${data.status ? `(${data.status})` : ''}\n`.replace(/\s+/g, ' ');
      } else if (data !== undefined && data !== null) {
        vitalsStr += `- ${key}: ${data}\n`;
      }
    });
    contextParts.push(vitalsStr);
  }

  // 3. Imported Case Brief (when user clicks "Recheck / Correlate with Ava")
  if (typeof window !== 'undefined') {
    try {
      const importedCaseJson = sessionStorage.getItem('hc_imported_case_brief');
      if (importedCaseJson) {
        const c = JSON.parse(importedCaseJson);
        let impStr = `IMPORTED CASE BRIEF (${c.type || 'Consultation'}):\n`;
        impStr += `- Title: ${c.title || 'Case'}\n`;
        if (c.topConditions) impStr += `- Differentials: ${c.topConditions}\n`;
        if (c.summary) impStr += `- Findings: ${c.summary.slice(0, 200)}\n`;
        if (c.actions) impStr += `- Actions: ${c.actions.slice(0, 150)}\n`;
        contextParts.push(impStr);
      }
    } catch (e) { console.error(e); }
  }

  // 4. Active case context
  if (includeActiveCase && activeCase) {
    let caseStr = `ACTIVE CASE CONTEXT:\n`;
    caseStr += `- ${activeCase.title}\n`;
    if (activeCase.intakeData?.chiefComplaint)
      caseStr += `- Concern: ${activeCase.intakeData.chiefComplaint.substring(0, 150)}\n`;
    contextParts.push(caseStr);
  }

  // 5. Daily Checkins (ONLY if requested e.g. for Ava)
  if (includeDailyCheckins) {
    const recentCheckins = (profile?.dailyCheckins || []).slice(0, 3);
    if (recentCheckins.length > 0) {
      let checkinStr = `RECENT DAILY CHECK-INS:\n`;
      recentCheckins.forEach((c) => {
        const d = c.date ? new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent';
        checkinStr += `- ${d}: ${c.symptom} (${c.severity})\n`;
      });
      contextParts.push(checkinStr);
    }
  }

  if (contextParts.length === 0) {
    return `\n\n=== PATIENT CONTEXT ===\nNo pre-existing conditions logged. Evaluate presenting symptoms on their own merits.\n========================\n`;
  }

  // Hard cap to prevent runaway context growth
  const fullText = `\n\n=== PATIENT CONTEXT ===\n${contextParts.join('\n')}\n========================\n`;
  if (fullText.length > 1800) {
    return fullText.substring(0, 1800) + `\n[Context truncated]...\n========================\n`;
  }
  return fullText;
}

if (typeof window !== 'undefined') {
  window.addEventListener('hc_logout', () => {
    cachedContext = null;
    lastProfileHash = null;
  });
}
