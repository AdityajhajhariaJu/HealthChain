/** A cache freshness marker, not a cryptographic or medical verification. */
export function clinicalSourceFingerprint(sourceCase: any): string {
  const intake = sourceCase?.intakeData || {};
  const sources = JSON.stringify({
    intake: [
      'chiefComplaint',
      'concern',
      'timeline',
      'currentMedications',
      'allergies',
      'symptoms',
      'onset',
      'progression',
    ].map((key) => [key, intake[key] ?? null]),
    records: (sourceCase?.medicalRecords || [])
      .map((record: any) => ({
        id: record.id,
        filename: record.filename,
        findings: record.findings,
        reportDate: record.reportDate || null,
        extractionStatus: record.extractionStatus || null,
        evidenceManifest: record.evidenceManifest || null,
        passages: (record.passages || []).map((passage: any) => ({
          id: passage.id,
          text: passage.text,
          page: passage.page ?? null,
          extractionStatus: passage.extractionStatus || null,
        })),
      }))
      .sort((a: any, b: any) => String(a.id).localeCompare(String(b.id))),
    observations: (sourceCase?.events || [])
      .filter((event: any) =>
        /^(User clarification|User observation|Evidence update|Observation|Measurement|Question|Appointment outcome|Ava update|Case update)$/i.test(
          event.label || ''
        )
      )
      .map((event: any) => ({
        id: event.id,
        label: event.label,
        note: event.note,
        date: event.date,
      }))
      .sort((a: any, b: any) => String(a.id).localeCompare(String(b.id))),
  });
  let first = 2166136261;
  let second = 5381;
  for (const character of sources) {
    first = Math.imul(first ^ character.charCodeAt(0), 16777619);
    second = Math.imul(second, 33) ^ character.charCodeAt(0);
  }
  return `clinical-source-v1:${(first >>> 0).toString(16)}:${(second >>> 0).toString(16)}`;
}
