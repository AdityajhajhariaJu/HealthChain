import { getActiveCase } from './CaseEngine';
import { getProfile } from './ProfileEngine';


export function compilePatientContext(options = {}) {
  const {
    includeActiveCase = false,
    includeDailyCheckins = false,
    includeProfile = true,
    includeLabs = true,
  } = options;
  let contextParts = [];
  const profile = getProfile();
  const activeCase = includeActiveCase ? getActiveCase() : null;

  // Required safety facts precede optional context and are never cut mid-item.
  const textFact=value=>typeof value==='string'?value:JSON.stringify(value);
  const safety=[];
  if (includeProfile) {
    safety.push('ALLERGIES (user reported): '+(Array.isArray(profile?.allergies) && profile.allergies.length ? profile.allergies.map(textFact).join('; ') : 'Not recorded; do not assume none.'));
    safety.push('MEDICATIONS (user reported; preserve doses, schedule and status): '+(Array.isArray(profile?.medications) && profile.medications.length ? profile.medications.map(textFact).join('; ') : 'Not recorded.'));
  }

  // 1. Profile Context (compact & sanitized)
  let profileStr = `PATIENT PROFILE:\n`;
  if (profile?.demographics?.age || profile?.demographics?.gender) {
    profileStr += `- ${profile.demographics.age || '?'} yr ${profile.demographics.gender || ''}\n`;
  }
  
  const cleanConditions = (Array.isArray(profile?.conditions) ? profile.conditions : []).filter(Boolean);

  if (cleanConditions.length > 0) {
    profileStr += `- User-reported Conditions: ${cleanConditions.map(textFact).join(', ')}\n`;
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

  if (includeProfile && profileStr !== `PATIENT PROFILE:\n`) {
    contextParts.push(profileStr);
  }

  // 2. Vitals / Labs (compact - top 10 with functional status)
  const labEntries = Object.entries(profile?.vitals?.latestLabValues || {});
  if (includeLabs && labEntries.length > 0) {
    let vitalsStr = `LABS — preserve printed units/ranges; unreviewed or legacy extracts are not independently verified:\n`;
    labEntries.slice(0, 10).forEach(([key, data]) => {
      if (data && typeof data === 'object') {
        if (data.extractionStatus === 'rejected' || data.reviewStatus === 'rejected') return;
        vitalsStr += `- ${key}: ${data.value ?? 'value not recorded'} ${data.unit || 'unit not recorded'}; printed range: ${data.referenceRange || data.reference_range || 'not recorded'}; review: ${data.extractionStatus || data.reviewStatus || 'unknown'}; source: ${data.sourceRecordId || data.source || 'not recorded'}\n`;
      } else if (data !== undefined && data !== null) {
        vitalsStr += `- ${key}: ${data}\n`;
      }
    });
    contextParts.push(vitalsStr);
  }

  // Legacy sessionStorage briefs have no owner/case provenance. Only the
  // explicitly selected case below can supply case context.

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

  if (contextParts.length === 0 && safety.length === 0) {
    return `\n\n=== SAVED CONTEXT ===\nNo additional saved context was included for this conversation.\n=====================\n`;
  }

  const safetyText=safety.join('\n');
  if(safetyText.length>12000)throw new Error('Safety history is too large for this reply. Review the medical profile before continuing.');
  const optional=[];
  let budget=3000;
  for(const part of contextParts){if(part.length<=budget){optional.push(part);budget-=part.length;}}
  return '\n=== PATIENT CONTEXT (user reported) ===\n'+safetyText+'\n'+optional.join('\n')+'\n========================\n';
}
