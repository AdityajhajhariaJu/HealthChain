import { getProfile } from './ProfileEngine';
import { getCases } from './CaseEngine';

export function generateDistilledBiometricContext(): string {
  const profile = getProfile();
  const cases = getCases() || [];
  
  // Format Demographics
  const demo = profile?.demographics || {};
  let demoStr: string[] = [];
  if (demo.age) demoStr.push(`Age: ${demo.age}`);
  if (demo.gender) demoStr.push(`Sex: ${demo.gender}`);
  if (demo.weight) demoStr.push(`Weight: ${demo.weight}`);
  if (demo.height) demoStr.push(`Height: ${demo.height}`);
  if (demo.bloodGroup) demoStr.push(`Blood Type: ${demo.bloodGroup}`);
  if (demo.bmi) demoStr.push(`BMI: ${demo.bmi} (${demo.bmiCategory || 'Calculated'})`);
  const demoLine = demoStr.length > 0 ? `- Demographics: ${demoStr.join(', ')}` : '- Demographics: Unknown';

  // Format Conditions & Meds
  const conditions = Array.isArray(profile?.conditions) && profile.conditions.length > 0 
    ? profile.conditions.map((c: any) => typeof c === 'string' ? c : c.name).join(', ') 
    : 'None reported';
  
  const meds = Array.isArray(profile?.medications) && profile.medications.length > 0
    ? profile.medications.map((m: any) => {
        if (typeof m === 'string') return m;
        const slot = m.circadianSlot ? ` [${m.circadianSlot.toUpperCase()}]` : '';
        return `${m.name}${m.dosage ? ` (${m.dosage})` : ''}${slot}`;
      }).join(', ')
    : 'None';

  // Format Allergies (CRITICAL for Ava's clinical contraindication guards)
  const allergies = Array.isArray(profile?.allergies) && profile.allergies.length > 0
    ? profile.allergies.map((a: any) => {
        if (typeof a === 'string') return a;
        return `${a.name}${a.severity ? ` (${a.severity.toUpperCase()} ALERT)` : ''}`;
      }).join(', ')
    : 'No known allergies';

  // Format Diet
  const diet = profile?.dietProfile;
  let dietLine = '';
  if (diet) {
    dietLine = `- Diet Goal: ${diet.goal || 'Maintain'} (${diet.cuisine || 'Any'} cuisine), Target: ${diet.targetWeight || '?'}kg`;
  }

  // Format Active Cases
  const activeCases = cases.filter((c: any) => c.status !== 'Resolved' && c.status !== 'Archived');
  let casesBlock = '';
  if (activeCases.length > 0) {
    casesBlock = '- Active Medical Cases:\n' + activeCases.map((c: any) => {
      const title = c.title || c.concern || 'Unnamed Case';
      const status = c.status || 'Open';
      const diffs = Array.isArray(c.differentials) && c.differentials.length > 0 
        ? `Top Diff: ${c.differentials[0].name}` 
        : '';
      return `  * "${title}" (${status}${diffs ? ', ' + diffs : ''})`;
    }).join('\n');
  } else {
    casesBlock = '- Active Medical Cases: None';
  }

  // To preserve the pitch/demo feel, we'll keep the HRV/Sleep mock since we don't have a real Apple Health hook yet
  const distilled = `
[SYSTEM: DISTILLED_USER_STATE_V1]
${demoLine}
- Conditions: ${conditions}
- Allergies: ${allergies}
- Meds: ${meds}
${dietLine}
${casesBlock}
- HRV & Sleep: Low HRV (32ms), Sleep 4h 12m (from Apple Health mock)
[END_DISTILLATION]
  `.trim();
  
  return distilled;
}
