import { getProfile } from './ProfileEngine';
import { getActiveCase } from './CaseEngine';

let cachedContext = null;
let lastProfileHash = null;

export function compilePatientContext() {
  let contextParts = [];
  const profile = getProfile();
  const activeCase = getActiveCase();

  const currentHash = `${profile?.id}-${profile?.updatedAt}-${activeCase?.id}-${activeCase?.updatedAt}`;
  if (cachedContext && lastProfileHash === currentHash) {
    return cachedContext;
  }

  // 1. Profile Context (compact)
  let profileStr = `PATIENT PROFILE:\n`;
  if (profile.demographics.age || profile.demographics.gender) {
    profileStr += `- ${profile.demographics.age || '?'} yr ${profile.demographics.gender || ''}\n`;
  }
  if (profile.conditions && profile.conditions.length > 0) {
    profileStr += `- Conditions: ${profile.conditions.join(', ')}\n`;
  }
  if (profile.medications && profile.medications.length > 0) {
    profileStr += `- Meds: ${profile.medications.map((m) => m.name).join(', ')}\n`;
  }
  if (profile.familyHistory && profile.familyHistory.length > 0) {
    profileStr += `- Family Hx: ${profile.familyHistory.join(', ')}\n`;
  }

  if (profileStr !== `PATIENT PROFILE:\n`) {
    contextParts.push(profileStr);
  }

  // 2. Vitals / Labs (compact - top 8 only)
  const labEntries = Object.entries(profile.vitals.latestLabValues);
  if (labEntries.length > 0) {
    let vitalsStr = `LABS:\n`;
    labEntries.slice(0, 8).forEach(([key, data]) => {
      vitalsStr += `- ${key}: ${data.value} ${data.unit} (${data.status})\n`;
    });
    contextParts.push(vitalsStr);
  }

  // 3. Active case context (compact - keyFindings only, no raw findings)
  if (activeCase) {
    let caseStr = `ACTIVE CASE:\n`;
    caseStr += `- ${activeCase.title}\n`;
    if (activeCase.intakeData?.chiefComplaint)
      caseStr += `- Concern: ${activeCase.intakeData.chiefComplaint.substring(0, 200)}\n`;
    if (activeCase.currentSummary?.executiveSummary)
      caseStr += `- Synthesis: ${activeCase.currentSummary.executiveSummary.substring(0, 200)}\n`;
    const evidence = (activeCase.medicalRecords || []).slice(0, 3);
    if (evidence.length)
      caseStr += `- Evidence: ${evidence.map((r) => `${r.filename} (${r.keyFindings || 'On file'})`).join('; ')}\n`;
    contextParts.push(caseStr);
  }

  // 4. History Context (compact - title + date only, max 3 events)
  const diagnosticEvents = (profile.timeline || []).filter((t) =>
    ['diagnosis', 'mdt_report', 'lab_report'].includes(t.type)
  );
  if (diagnosticEvents.length > 0) {
    let historyStr = `HISTORY:\n`;
    diagnosticEvents.slice(0, 3).forEach((h) => {
      historyStr += `- ${new Date(h.date).toLocaleDateString()}: ${h.title}\n`;
    });
    contextParts.push(historyStr);
  }

  // 5. Daily Symptom Check-in Trends (Longitudinal tracking)
  const recentCheckins = (profile.dailyCheckins || []).slice(0, 4);
  if (recentCheckins.length > 0) {
    let checkinStr = `RECENT DAILY SYMPTOM TRACKING:\n`;
    recentCheckins.forEach((c) => {
      const d = c.date ? new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent';
      checkinStr += `- ${d}: ${c.symptom} (${c.severity})${c.note ? ` - "${c.note.slice(0, 40)}"` : ''}\n`;
    });
    contextParts.push(checkinStr);
  }

  if (contextParts.length === 0) {
    const emptyContext = `\n\n=== PATIENT CONTEXT ===\nNo medical history, conditions, or vitals have been logged yet. Do not assume any pre-existing conditions.\n========================\n`;
    cachedContext = emptyContext;
    lastProfileHash = currentHash;
    return emptyContext;
  }
  
  // Hard cap to prevent runaway context growth
  let result = `\n\n=== PATIENT CONTEXT ===\n${contextParts.join('\n')}========================\n`;
  if (result.length > 1500) {
    result = result.substring(0, 1497) + '...\n';
  }
  
  cachedContext = result;
  lastProfileHash = currentHash;
  return result;
}

if (typeof window !== 'undefined') {
  window.addEventListener('hc_logout', () => {
    cachedContext = null;
    lastProfileHash = null;
  });
}
