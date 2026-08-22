import { getProfile } from './ProfileEngine';
import { getActiveCase } from './CaseEngine';

let cachedContext = null;
let lastProfileHash = null;

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
    profileStr += `- Meds: ${profile.medications.map((m) => m.name).join(', ')}\n`;
  }
  if (profile?.familyHistory && profile.familyHistory.length > 0) {
    profileStr += `- Family Hx: ${profile.familyHistory.join(', ')}\n`;
  }

  if (profileStr !== `PATIENT PROFILE:\n`) {
    contextParts.push(profileStr);
  }

  // 2. Vitals / Labs (compact - top 6 only)
  const labEntries = Object.entries(profile?.vitals?.latestLabValues || {});
  if (labEntries.length > 0) {
    let vitalsStr = `LABS:\n`;
    labEntries.slice(0, 6).forEach(([key, data]) => {
      vitalsStr += `- ${key}: ${data.value} ${data.unit} (${data.status})\n`;
    });
    contextParts.push(vitalsStr);
  }

  // 3. Active case context (ONLY if explicitly requested e.g. for follow-ups)
  if (includeActiveCase && activeCase) {
    let caseStr = `ACTIVE CASE CONTEXT:\n`;
    caseStr += `- ${activeCase.title}\n`;
    if (activeCase.intakeData?.chiefComplaint)
      caseStr += `- Concern: ${activeCase.intakeData.chiefComplaint.substring(0, 150)}\n`;
    contextParts.push(caseStr);
  }

  // 4. Daily Checkins (ONLY if requested e.g. for Ava)
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
  if (fullText.length > 1500) {
    return fullText.substring(0, 1500) + `\n[Context truncated]...\n========================\n`;
  }
  return fullText;
}

if (typeof window !== 'undefined') {
  window.addEventListener('hc_logout', () => {
    cachedContext = null;
    lastProfileHash = null;
  });
}
