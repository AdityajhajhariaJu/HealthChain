import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import FocusTrap from '../../../components/ui/FocusTrap';
import { captureAccountScope, isAccountScopeCurrent } from '../../../services/AccountScope';
import { hydrateDailyTrackerProjections } from '../../../services/DailyTrackerLedger';
import { resolveObservationConflict } from '../../../services/HealthObservationService';
import { flushSyncOutbox, getObservationConflicts } from '../../../services/SyncOutbox';

function Summary({ row }: { row: any }) {
  const p = row.payload || {};
  return (
    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 12 }}>
      <strong>
        {row.deleted_at
          ? 'Deleted record'
          : p.kind === 'meal'
            ? p.description
            : p.kind === 'hydration'
              ? `${p.amountMl} ml ${p.drinkType}`
              : p.kind === 'medication_dose'
                ? `${p.name}: ${p.status}`
                : p.kind === 'symptom'
                  ? p.symptom
                  : p.kind}
      </strong>
      <p>
        Revision {row.revision} · {row.local_date || 'Date unrecorded'} · {row.time_precision}
      </p>
      <details>
        <summary>View recorded details and linked sources</summary>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>
          {JSON.stringify(
            { payload: p, references: row.record_references || [], source: row.source },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
}
export default function ObservationConflictReview() {
  const [conflicts, setConflicts] = useState<any[]>([]),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const scope = captureAccountScope();
      const data =
        scope.accountId === 'guest' ? [] : await getObservationConflicts(scope.accountId);
      if (active && isAccountScopeCurrent(scope)) setConflicts(data);
    };
    const reset = () => {
      setConflicts([]);
      setOpen(false);
    };
    void refresh();
    for (const event of [
      'hc_sync_conflict',
      'hc_sync_pending',
      'hc_sync_complete',
      'hc_profile_updated',
    ])
      window.addEventListener(event, refresh);
    window.addEventListener('hc_logout', reset);
    return () => {
      active = false;
      for (const event of [
        'hc_sync_conflict',
        'hc_sync_pending',
        'hc_sync_complete',
        'hc_profile_updated',
      ])
        window.removeEventListener(event, refresh);
      window.removeEventListener('hc_logout', reset);
    };
  }, []);
  const decide = async (choice: 'local' | 'remote') => {
    const scope = captureAccountScope();
    setBusy(true);
    setError('');
    try {
      await resolveObservationConflict(conflicts[0].entryId, choice);
      if (!isAccountScopeCurrent(scope)) return;
      await hydrateDailyTrackerProjections();
      await flushSyncOutbox(scope.accountId);
      if (isAccountScopeCurrent(scope))
        setConflicts(await getObservationConflicts(scope.accountId));
    } catch (error) {
      if (isAccountScopeCurrent(scope))
        setError(error instanceof Error ? error.message : 'Review could not be saved.');
    } finally {
      setBusy(false);
    }
  };
  if (!conflicts.length) return null;
  return createPortal(
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 86,
          left: 20,
          zIndex: 70,
          border: '1px solid #c4b5fd',
          borderRadius: 12,
          padding: 12,
          background: '#faf5ff',
          color: '#6b21a8',
          fontWeight: 700,
        }}
      >
        Review {conflicts.length} record conflict{conflicts.length === 1 ? '' : 's'}
      </button>
      {open && (
        <div
          data-overlay-viewport="center"
          style={{
            position: 'fixed',
            background: '#0f172a88',
            zIndex: 11000,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <FocusTrap
            onEscape={() => {
              if (!busy) setOpen(false);
            }}
          >
            <section
              data-overlay-panel=""
              role="dialog"
              aria-modal="true"
              aria-label="Review conflicting health record"
              style={{
                maxWidth: 720,
                maxHeight: 'var(--overlay-available-height)',
                overflowY: 'auto',
                padding: 24,
                borderRadius: 20,
                background: 'white',
                color: '#0f172a',
              }}
            >
              <h2>Two devices edited this record</h2>
              <p>
                Choose the version to keep after checking the facts and links. The decision is saved
                in your record history.
              </p>
              <h3>This device</h3>
              <Summary row={conflicts[0].local} />
              <h3>Cloud</h3>
              <Summary row={conflicts[0].remote} />
              {error && <p role="alert">{error}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
                <button
                  className="btn btn-primary"
                  disabled={
                    busy ||
                    Boolean(conflicts[0].remote.deleted_at && !conflicts[0].local.deleted_at)
                  }
                  onClick={() => void decide('local')}
                >
                  Keep this device version
                </button>
                <button
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={() => void decide('remote')}
                >
                  Keep cloud version
                </button>
                <button className="btn btn-outline" disabled={busy} onClick={() => setOpen(false)}>
                  Review later
                </button>
              </div>
            </section>
          </FocusTrap>
        </div>
      )}
    </>,
    document.body
  );
}
