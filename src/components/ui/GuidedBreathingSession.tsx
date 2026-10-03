import OverlayPortal from './OverlayPortal';
import { useEffect, useRef, useState } from 'react';
import type { FitnessContent } from '../../services/FitnessService';
import {
  captureHealthMemoryScope,
  flushHealthMemory,
  isHealthMemoryScopeCurrent,
  recordHealthMemory,
} from '../../services/HealthMemory';
import FocusTrap from './FocusTrap';

export function GuidedBreathingSession({
  onClose,
}: {
  content?: FitnessContent;
  onClose: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(120);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const scope = useRef(captureHealthMemoryScope()).current;
  const sessionId = useRef(crypto.randomUUID()).current;
  const accumulated = useRef(0);
  useEffect(() => {
    if (!running) return;
    const started = performance.now();
    const timer = window.setInterval(() => {
      const seconds = Math.min(
        duration,
        Math.floor(accumulated.current + (performance.now() - started) / 1000)
      );
      setElapsed(seconds);
      if (seconds >= duration) setRunning(false);
    }, 250);
    return () => {
      accumulated.current = Math.min(
        duration,
        accumulated.current + (performance.now() - started) / 1000
      );
      window.clearInterval(timer);
    };
  }, [running, duration]);
  const finish = async () => {
    if (saving || !elapsed) return;
    setRunning(false);
    setSaving(true);
    try {
      if (!isHealthMemoryScopeCurrent(scope))
        throw new Error('Account changed. This session was not saved.');
      recordHealthMemory({
        id: sessionId,
        kind: 'health_buddy',
        source: 'ava_guided_breathing',
        title: 'Comfortable breathing participation',
        occurredAt: new Date().toISOString(),
        payload: {
          sessionId,
          actualSeconds: elapsed,
          targetSeconds: duration,
          userConfirmed: true,
        },
        dedupeKey: 'breathing:' + sessionId,
      });
      await flushHealthMemory(scope);
      setStatus('Saved on this device; account sync will retry if offline.');
    } catch (error: any) {
      setStatus(error.message || 'Could not save. Please retry.');
    } finally {
      setSaving(false);
    }
  };
  const phase = elapsed % 9 < 4 ? 'Breathe in gently' : 'Breathe out gently';
  return (
    <OverlayPortal><FocusTrap onEscape={onClose}>
      <div
        data-overlay-viewport="center"
        role="dialog"
        aria-modal="true"
        aria-label="Comfortable breathing guide"
        style={{
          position: 'fixed',
          zIndex: 10000,
          background: 'rgba(15,23,42,.65)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <section
          data-overlay-panel=""
          style={{
            background: '#F0FDFA',
            borderRadius: 24,
            padding: 24,
            maxWidth: 440,
            width: '100%',
            color: '#115E59',
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <button
            type="button"
            aria-label="Close breathing guide"
            onClick={onClose}
            style={{ float: 'right', minHeight: 44, minWidth: 44 }}
          >
            ✕
          </button>
          <h2>Comfortable breathing</h2>
          <p>
            This is an optional visual pace. Breathe normally whenever you prefer. Stop if you feel
            dizzy or uncomfortable.
          </p>
          <label>
            Session length{' '}
            <select
              aria-label="Session length"
              value={duration}
              disabled={elapsed > 0}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={120}>2 minutes</option>
              <option value={300}>5 minutes</option>
            </select>
          </label>
          <div
            style={{
              margin: '24px auto',
              borderRadius: '50%',
              width: 160,
              height: 160,
              display: 'grid',
              placeItems: 'center',
              background: '#CCFBF1',
              textAlign: 'center',
            }}
          >
            <strong>
              {running
                ? phase
                : elapsed >= duration
                  ? 'Guide finished'
                  : elapsed
                    ? 'Paused'
                    : 'Ready when you are'}
            </strong>
          </div>
          <p aria-live="off">
            {elapsed} seconds participated · {Math.max(0, duration - elapsed)} seconds remaining
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={{ minHeight: 44 }}
              disabled={elapsed >= duration || saving}
              onClick={() => setRunning(!running)}
            >
              {running ? 'Pause' : elapsed ? 'Resume' : 'Start'}
            </button>
            <button
              type="button"
              style={{ minHeight: 44 }}
              disabled={!elapsed || saving || status.startsWith('Saved')}
              onClick={finish}
            >
              {saving ? 'Saving…' : 'Finish and save participation'}
            </button>
          </div>
          {status && <p role="status">{status}</p>}
        </section>
      </div>
    </FocusTrap></OverlayPortal>
  );
}
