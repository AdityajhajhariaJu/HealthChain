import { useEffect, useState } from 'react';
import { listObservations } from '../../services/HealthObservationService';
import { attachReviewedDailyEvidence } from '../../services/ClinicalDailyEvidence';
import type { Observation } from '../../domain/observations/types';
import { captureAccountScope, isAccountScopeCurrent } from '../../services/AccountScope';

export default function ClinicalDailyEvidencePicker({ caseId, onSaved }: { caseId: string; onSaved?: () => void }) {
  const [records, setRecords] = useState<Observation[]>([]), [selected, setSelected] = useState<string[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => {
    let active = true; const scope = captureAccountScope();
    void listObservations().then(records => { if (active && isAccountScopeCurrent(scope)) setRecords(records); });
    return () => { active = false; };
  }, [caseId]);
  return <details style={{ border: '1px solid #dbeafe', borderRadius: 14, padding: 14, background: '#fff', marginBottom: 16 }}>
    <summary style={{ fontWeight: 700, cursor: 'pointer' }}>Add reviewed daily observations to this case</summary>
    <p>Select the meals, symptoms, drinks or reported doses you want reviewed. These remain your reports; selecting them does not confirm a diagnosis or cause.</p>
    <div style={{ maxHeight: 320, overflowY: 'auto' }}>{records.map(record => {
      const p = record.payload;
      const label = p.kind === 'meal' ? p.description : p.kind === 'hydration' ? `${p.amountMl} ml ${p.drinkType}` : p.kind === 'medication_dose' ? `${p.name} · ${p.status}` : p.kind === 'symptom' ? p.symptom : p.kind === 'context' ? p.description : p.kind.replace('_', ' ');
      return <label key={record.id} style={{ display: 'flex', alignItems: 'start', gap: 10, padding: 10, borderBottom: '1px solid #f1f5f9' }}>
        <input type="checkbox" checked={selected.includes(record.id)} onChange={event => setSelected(before => event.target.checked ? [...before, record.id] : before.filter(id => id !== record.id))} />
        <span><strong>{label}</strong><br /><small>{record.localDate || 'Date not recorded'} · {record.timePrecision === 'exact' ? record.occurredAt : 'Exact time not recorded'} · revision {record.revision} · {record.evidenceType.replace(/_/g, ' ')}</small></span>
      </label>;
    })}</div>
    {!records.length && <p>No daily observations are available yet.</p>}
    {message && <p role="status">{message}</p>}
    <button className="btn btn-outline" disabled={!selected.length || busy} onClick={async () => {
      setBusy(true); setMessage(''); const scope = captureAccountScope();
      try { await attachReviewedDailyEvidence(caseId, records.filter(record => selected.includes(record.id)).map(record => ({ id: record.id, revision: record.revision }))); if (isAccountScopeCurrent(scope)) { setMessage('Reviewed selection saved to this case.'); setSelected([]); onSaved?.(); } }
      catch (error) { if (isAccountScopeCurrent(scope)) setMessage(error instanceof Error ? error.message : 'The selection could not be saved.'); }
      finally { setBusy(false); }
    }}>{busy ? 'Saving…' : `Review and attach ${selected.length} selected record${selected.length === 1 ? '' : 's'}`}</button>
  </details>;
}
