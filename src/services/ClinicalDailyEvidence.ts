import { captureAccountScope, isAccountScopeCurrent } from './AccountScope';
import { listObservationHistory } from './HealthObservationService';
import { appendCaseRecords, getCase, type MedicalRecord } from './CaseEngine';
import type { Observation } from '../domain/observations/types';
import { sourceFreshness } from '../../shared/health-source-freshness';

export interface DailyEvidenceManifest {
  version: 1; ownerId: string; profileId: string; reviewedAt: string;
  reviewState: 'user_reviewed'; admissibility: 'user_report'; sources: Observation[];
}
export async function attachReviewedDailyEvidence(caseId: string, selected: Array<{ id: string; revision: number }>) {
  const account = captureAccountScope(), target = getCase(caseId);
  if (!target || target.intakeData?.scenarioId || !selected.length || selected.length > 30) throw new Error('Choose an available case and 1–30 observations.');
  const history = await listObservationHistory();
  if (!isAccountScopeCurrent(account) || getCase(caseId)?.updatedAt !== target.updatedAt) throw new Error('Account or case changed. Review the selection again.');
  const records = selected.map(reference => history.find(item => item.id === reference.id && item.revision === reference.revision && !item.deletedAt));
  if (records.some(item => !item)) throw new Error('A selected record changed or was deleted. Review the current facts.');
  const manifest: DailyEvidenceManifest = { version: 1, ownerId: account.accountId, profileId: account.profileId, reviewedAt: new Date().toISOString(), reviewState: 'user_reviewed', admissibility: 'user_report', sources: JSON.parse(JSON.stringify(records)) };
  if (JSON.stringify(manifest).length > 20000) throw new Error('This selection is too large for one clinical request. Choose fewer observations.');
  const record: MedicalRecord = { id: crypto.randomUUID(), filename: 'Reviewed daily observations', source: 'patient_daily_evidence', type: 'daily_observation_manifest',
    findings: `${records.length} user-reported observations selected and reviewed on ${new Date(manifest.reviewedAt).toLocaleDateString()}. Open Clinical Review to discuss these facts.`, originalText: JSON.stringify(manifest), addedAt: manifest.reviewedAt, extractionStatus: 'checked', evidenceManifest: manifest };
  appendCaseRecords(caseId, [record]);
  if (!getCase(caseId)?.medicalRecords.some(item => item.id === record.id)) throw new Error('The reviewed selection could not be saved.');
  window.dispatchEvent(new Event('hc_cases_updated'));
  return record;
}
export async function reviewedCaseWithCurrentSources(caseId: string) {
  const account = captureAccountScope(), target = getCase(caseId);
  if (!target) throw new Error('Selected case is unavailable.');
  const current = await listObservationHistory();
  if (!isAccountScopeCurrent(account) || getCase(caseId)?.updatedAt !== target.updatedAt) throw new Error('Selected case changed. Retry with the current case.');
  return { ...target, medicalRecords: target.medicalRecords.map(record => {
    if (!record.evidenceManifest) return record;
    const manifest = record.evidenceManifest;
    if (manifest.ownerId !== account.accountId || manifest.profileId !== account.profileId) return { ...record, findings: 'Evidence manifest unavailable for this owner.', passages: [], originalText: '' };
    const freshness = sourceFreshness(manifest.sources, current);
    const currentIds = new Set(freshness.filter(source => source.status === 'current').map(source => source.id));
    const usable = manifest.sources.filter(source => currentIds.has(source.id));
    return { ...record, findings: JSON.stringify({ notice: 'User-reviewed self-reports, not clinician verification. Changed/deleted sources are excluded; select them again for a new review.', freshness, ...manifest, sources: usable }), passages: [], originalText: '', evidenceManifest: { ...manifest, sources: usable } };
  }) };
}
export function dailyEvidenceSummary(records: Observation[], localDate: string) {
  const day = records.filter(item => item.localDate === localDate && !item.deletedAt);
  const drinks = day.filter(item => item.payload.kind === 'hydration');
  return { localDate, role: 'user_report', hydration: { loggedMl: drinks.length ? drinks.reduce((sum, item) => sum + (item.payload.kind === 'hydration' ? item.payload.amountMl : 0), 0) : null, actualTotalIntake: 'unknown', sources: drinks.map(item => ({ id: item.id, revision: item.revision, timePrecision: item.timePrecision })) },
    doses: day.filter(item => item.payload.kind === 'medication_dose').map(item => ({ id: item.id, revision: item.revision, payload: item.payload, occurredAt: item.occurredAt, timePrecision: item.timePrecision })), notice: 'A schedule is not ingestion. Missing records are unknown, not zero or missed doses.' };
}
