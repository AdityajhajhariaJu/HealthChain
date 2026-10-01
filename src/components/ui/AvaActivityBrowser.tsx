import { useEffect, useRef, useState } from 'react';
import { FitnessService, type FitnessContent } from '../../services/FitnessService';
import { captureHealthMemoryScope, isHealthMemoryScopeCurrent } from '../../services/HealthMemory';
import FocusTrap from './FocusTrap';

export function AvaActivityBrowser({ onClose }: { onClose: () => void }) {
  const scope = useRef(captureHealthMemoryScope()).current;
  const [items, setItems] = useState<FitnessContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FitnessContent | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const accumulated = useRef(0);
  const safeUrl = (url?: string) => {
    try {
      return url && new URL(url).protocol === 'https:' ? url : undefined;
    } catch {
      return undefined;
    }
  };
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    void FitnessService.getAllActiveContent(controller.signal)
      .then((content) => {
        if (active && isHealthMemoryScopeCurrent(scope))
          setItems(
            content.filter(
              (item) =>
                item.type === 'workout' &&
                item.is_active &&
                (!item.publish_at || Date.parse(item.publish_at) <= Date.now())
            )
          );
      })
      .catch(() => {
        if (active) setStatus('Activity catalog is unavailable. Please retry later.');
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  useEffect(() => {
    if (!running) return;
    const started = performance.now();
    const timer = window.setInterval(
      () => setSeconds(Math.floor(accumulated.current + (performance.now() - started) / 1000)),
      250
    );
    return () => {
      accumulated.current += (performance.now() - started) / 1000;
      window.clearInterval(timer);
    };
  }, [running]);
  const start = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setStatus('');
    try {
      if (!isHealthMemoryScopeCurrent(scope)) throw new Error('Account changed.');
      const result = await FitnessService.startSession(selected.id);
      if (!isHealthMemoryScopeCurrent(scope)) return;
      setSessionId(result.session_id);
      setRunning(true);
    } catch (error: any) {
      setStatus(error.message || 'Could not start. Sign in and retry.');
    } finally {
      setBusy(false);
    }
  };
  const complete = async () => {
    if (!sessionId || busy || !seconds) return;
    setRunning(false);
    setBusy(true);
    try {
      if (!isHealthMemoryScopeCurrent(scope)) throw new Error('Account changed.');
      await FitnessService.completeSession(sessionId, seconds);
      if (isHealthMemoryScopeCurrent(scope))
        setStatus('Participation saved to your activity history.');
    } catch (error: any) {
      setStatus(error.message || 'Could not save. Retry this session.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <FocusTrap onEscape={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Movement activities"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(15,23,42,.6)',
          display: 'grid',
          placeItems: 'center',
          padding: 20,
        }}
      >
        <section
          style={{
            background: 'white',
            borderRadius: 24,
            padding: 24,
            maxWidth: 580,
            width: '100%',
            maxHeight: '88vh',
            overflowY: 'auto',
          }}
        >
          <button
            type="button"
            aria-label="Close activities"
            onClick={onClose}
            style={{ float: 'right', minHeight: 44, minWidth: 44 }}
          >
            ✕
          </button>
          <h2>Movement activities</h2>
          <p>
            Choose an activity suitable for you. Stop if you feel unwell; this is not a prescribed
            treatment.
          </p>
          {loading ? (
            <p role="status">Loading available activities…</p>
          ) : !items.length ? (
            <p>No published movement activities are currently available.</p>
          ) : !selected ? (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                style={{ display: 'block', minHeight: 44, width: '100%', marginBottom: 12 }}
                onClick={() => setSelected(item)}
              >
                {item.title} · {item.difficulty}
              </button>
            ))
          ) : (
            <>
              <h3>{selected.title}</h3>
              <p>{selected.description}</p>
              <p>
                Planned duration: {selected.duration_minutes} minutes · {selected.difficulty}
              </p>
              {safeUrl(selected.video_url) ? (
                <video
                  controls
                  src={safeUrl(selected.video_url)}
                  style={{ width: '100%' }}
                  onError={() =>
                    setStatus(
                      'The activity video could not load. Review the written instructions or choose another activity.'
                    )
                  }
                />
              ) : safeUrl(selected.audio_url) ? (
                <audio controls src={safeUrl(selected.audio_url)} />
              ) : (
                <p>No media is provided for this activity. Review its written instructions.</p>
              )}
              <p>{seconds} seconds of participation recorded</p>
              {!sessionId ? (
                <button type="button" disabled={busy} onClick={start} style={{ minHeight: 44 }}>
                  Start participation timer
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy || status.startsWith('Participation saved')}
                    style={{ minHeight: 44 }}
                    onClick={() => setRunning(!running)}
                  >
                    {running ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    disabled={busy || !seconds || status.startsWith('Participation saved')}
                    style={{ minHeight: 44, marginLeft: 8 }}
                    onClick={complete}
                  >
                    {busy ? 'Saving…' : 'Finish and save actual participation'}
                  </button>
                </>
              )}
            </>
          )}
          {status && <p role="status">{status}</p>}
        </section>
      </div>
    </FocusTrap>
  );
}
