import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import FocusTrap from '../../../components/ui/FocusTrap';
import { captureAccountScope, isAccountScopeCurrent } from '../../../services/AccountScope';
import {
  flushSyncOutbox,
  getProfileConflicts,
  settleProfileConflict,
} from '../../../services/SyncOutbox';

function valueText(value: any, missing: boolean) {
  return missing
    ? 'Removed'
    : typeof value === 'string'
      ? value || '(empty)'
      : JSON.stringify(value, null, 2);
}
export default function ProfileConflictReview() {
  const [items, setItems] = useState<any[]>([]),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<Record<string, 'local' | 'remote'>>({}),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const scope = captureAccountScope(),
        data = scope.accountId === 'guest' ? [] : await getProfileConflicts(scope.accountId);
      if (active && isAccountScopeCurrent(scope)) setItems(data);
    };
    const reset = () => {
      setItems([]);
      setOpen(false);
      setChoices({});
    };
    const events = [
      'hc_sync_conflict',
      'hc_sync_pending',
      'hc_sync_complete',
      'hc_profile_updated',
    ];
    events.forEach((event) => window.addEventListener(event, refresh));
    window.addEventListener('hc_logout', reset);
    void refresh();
    return () => {
      active = false;
      events.forEach((event) => window.removeEventListener(event, refresh));
      window.removeEventListener('hc_logout', reset);
    };
  }, []);
  useEffect(() => {
    setChoices({});
    setError('');
  }, [items[0]?.id, JSON.stringify(items[0]?.payload)]);
  if (!items.length) return null;
  const reviewed = items[0],
    fields = reviewed.conflictRemote.fields;
  return createPortal(
    <>
      <button
        className="btn btn-outline"
        onClick={() => setOpen(true)}
        style={{ position: 'fixed', bottom: 140, left: 20, zIndex: 70, background: '#fffbeb' }}
      >
        Review profile changes ({items.length})
      </button>
      {open && (
        <div
          data-overlay-viewport="center"
          style={{
            position: 'fixed',
            zIndex: 11001,
            background: '#0f172a88',
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
              aria-label="Review profile changes"
              style={{
                maxWidth: 760,
                maxHeight: 'var(--overlay-available-height)',
                overflowY: 'auto',
                padding: 24,
                borderRadius: 20,
                background: 'white',
                color: '#0f172a',
              }}
            >
              <h2>Two devices changed the same profile fields</h2>
              <p>
                Separate edits have been combined. Choose the correct value for each field below.
              </p>
              {fields.map((field: any) => {
                const key = JSON.stringify(field.path);
                return (
                  <fieldset
                    key={key}
                    style={{
                      marginBlock: 16,
                      border: '1px solid #cbd5e1',
                      padding: 12,
                      borderRadius: 12,
                    }}
                  >
                    <legend>{field.path.join(' › ')}</legend>
                    {(['local', 'remote'] as const).map((choice) => (
                      <label key={choice} style={{ display: 'block', padding: 10 }}>
                        <input
                          type="radio"
                          name={key}
                          disabled={busy}
                          checked={choices[key] === choice}
                          onChange={() => setChoices((old) => ({ ...old, [key]: choice }))}
                        />{' '}
                        {choice === 'local' ? 'This device' : 'Cloud'}
                        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                          {valueText(field[choice], field[choice + 'Missing'])}
                        </pre>
                      </label>
                    ))}
                  </fieldset>
                );
              })}
              {error && <p role="alert">{error}</p>}
              <button className="btn btn-outline" disabled={busy} onClick={() => setOpen(false)}>
                Review later
              </button>{' '}
              <button
                className="btn btn-primary"
                disabled={busy || fields.some((field: any) => !choices[JSON.stringify(field.path)])}
                onClick={async () => {
                  const scope = captureAccountScope();
                  setBusy(true);
                  setError('');
                  try {
                    await settleProfileConflict(scope.accountId, reviewed, choices);
                    await flushSyncOutbox(scope.accountId);
                    if (isAccountScopeCurrent(scope)) {
                      setItems(await getProfileConflicts(scope.accountId));
                      setChoices({});
                    }
                  } catch (err) {
                    if (isAccountScopeCurrent(scope))
                      setError(err instanceof Error ? err.message : 'Profile could not be saved.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Saving…' : 'Save reviewed values'}
              </button>
            </section>
          </FocusTrap>
        </div>
      )}
    </>,
    document.body
  );
}
