import { useRef, useState } from 'react';
import FocusTrap from '../../../components/ui/FocusTrap';
import {
  captureHealthMemoryScope,
  isHealthMemoryScopeCurrent,
} from '../../../services/HealthMemory';
import {
  captureObservationScope,
  createObservation,
} from '../../../services/HealthObservationService';

export function AvaDayCheckin({ onClose }: { onClose: () => void }) {
  const [note, setNote] = useState('');
  const [answers, setAnswers] = useState<Record<string, 'yes' | 'no' | 'unanswered'>>({
    sleep: 'unanswered',
    energy: 'unanswered',
    symptoms: 'unanswered',
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const owner = useRef(captureHealthMemoryScope()).current;
  const id = useRef(crypto.randomUUID()).current;
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const scope = await captureObservationScope();
      if (!scope || !isHealthMemoryScopeCurrent(owner))
        throw new Error('Account changed. Your check-in was not saved.');
      const now = new Date();
      const localDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-');
      const result = await createObservation({
        ...scope,
        payload: { kind: 'daily_checkin', localDate, answers, note: note.trim() || undefined },
        occurredAt: null,
        localDate,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timePrecision: 'date_only',
        source: 'ava',
        evidenceType: 'user_report',
        idempotencyKey: 'ava-day:' + id,
      });
      if (!isHealthMemoryScopeCurrent(owner)) return;
      if (!result.ok)
        throw new Error(result.details?.join(' ') || 'Could not save. Retry your check-in.');
      setStatus(
        result.sync === 'queue_failed'
          ? 'Saved on this device; account sync needs retry.'
          : 'Check-in saved. You can review it in your observations.'
      );
    } catch (error: any) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <FocusTrap onEscape={onClose}>
      <div
        data-overlay-viewport="center"
        role="dialog"
        aria-modal="true"
        aria-label="Log your day"
        style={{
          position: 'fixed',
          zIndex: 10000,
          background: 'rgba(15,23,42,.6)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <section
          data-overlay-panel=""
          style={{
            background: 'white',
            borderRadius: 24,
            padding: 24,
            maxWidth: 480,
            width: '100%',
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <button
            type="button"
            aria-label="Close day check-in"
            onClick={onClose}
            style={{ float: 'right', minWidth: 44, minHeight: 44 }}
          >
            ✕
          </button>
          <h2>Log your day</h2>
          {Object.entries({
            sleep: 'Did sleep feel restful?',
            energy: 'Did you have enough energy?',
            symptoms: 'Did you notice symptoms today?',
          }).map(([key, label]) => (
            <label key={key} style={{ display: 'block', marginBottom: 16 }}>
              {label}
              <select
                aria-label={label}
                value={answers[key]}
                disabled={busy || status.startsWith('Check-in saved')}
                onChange={(event) => setAnswers({ ...answers, [key]: event.target.value as any })}
                style={{ display: 'block', minHeight: 44, width: '100%' }}
              >
                <option value="unanswered">Not answered</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
          ))}
          <label>
            Optional notes
            <textarea
              aria-label="Day check-in notes"
              value={note}
              maxLength={3000}
              onChange={(event) => setNote(event.target.value)}
              style={{ width: '100%', minHeight: 80 }}
            />
          </label>
          <button
            type="button"
            style={{ minHeight: 44 }}
            disabled={
              busy ||
              (Object.values(answers).every((answer) => answer === 'unanswered') && !note.trim()) ||
              status.startsWith('Check-in saved')
            }
            onClick={save}
          >
            {busy ? 'Saving…' : 'Save today’s check-in'}
          </button>
          {status && <p role="status">{status}</p>}
        </section>
      </div>
    </FocusTrap>
  );
}
