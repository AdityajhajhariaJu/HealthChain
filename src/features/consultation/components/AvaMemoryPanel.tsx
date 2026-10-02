import { useEffect, useRef, useState } from 'react';
import FocusTrap from '../../../components/ui/FocusTrap';
import {
  captureHealthMemoryScope,
  flushHealthMemory,
  getHealthMemory,
  isHealthMemoryScopeCurrent,
  recordHealthMemory,
  reviseHealthMemory,
} from '../../../services/HealthMemory';
import { extractClinicalMemory } from '../../../services/geminiService';

export function AvaMemoryPanel({
  caseId,
  messages,
  onClose,
}: {
  caseId: string;
  messages: any[];
  onClose: () => void;
}) {
  const scope = useRef(captureHealthMemoryScope()).current;
  const [memories, setMemories] = useState(() =>
    getHealthMemory().filter(
      (item) => item.kind === 'health_buddy' && (item.caseId || '') === caseId
    )
  );
  const [proposals, setProposals] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const refresh = () =>
    setMemories(
      getHealthMemory().filter(
        (item) => item.kind === 'health_buddy' && (item.caseId || '') === caseId
      )
    );
  useEffect(() => {
    window.addEventListener('hc_health_memory_updated', refresh);
    return () => window.removeEventListener('hc_health_memory_updated', refresh);
  }, [caseId]);
  const save = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    try {
      if (!isHealthMemoryScopeCurrent(scope)) throw new Error('Account changed.');
      if (editing) await reviseHealthMemory(editing, text, scope);
      else {
        recordHealthMemory({
          kind: 'health_buddy',
          source: 'ava_confirmed_memory',
          title: text.trim(),
          caseId: caseId || undefined,
          occurredAt: new Date().toISOString(),
          payload: {
            userConfirmed: true,
            sourceMessageIds: messages
              .filter((item) => item.role === 'user')
              .slice(-12)
              .map((item) => item.id),
          },
          dedupeKey: 'ava:' + caseId + ':' + text.trim().toLowerCase(),
        });
        await flushHealthMemory(scope);
      }
      setText('');
      setEditing(null);
      setStatus('Saved on this device; account sync retries when needed.');
      refresh();
    } catch (error: any) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  };
  const suggest = async () => {
    setBusy(true);
    setStatus('');
    try {
      const facts = await extractClinicalMemory(
        messages.filter((item) => item.caseId === caseId && item.role === 'user')
      );
      if (!isHealthMemoryScopeCurrent(scope)) return;
      setProposals(facts);
      setStatus(
        facts.length
          ? 'Review and edit each proposal before saving.'
          : 'No clear persistent facts were found. You can enter one yourself.'
      );
    } catch {
      setStatus('Suggestions unavailable. You can enter a memory yourself.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <FocusTrap onEscape={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review Ava memories"
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
            maxWidth: 540,
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}
        >
          <button
            type="button"
            aria-label="Close memories"
            onClick={onClose}
            style={{ float: 'right', minHeight: 44, minWidth: 44 }}
          >
            ✕
          </button>
          <h2>Ava memories</h2>
          <p>
            Only memories you confirm are used as personal facts. Review whose information this is
            and whether it is still current.
          </p>
          <label>
            {editing ? 'Correct memory' : 'Something you want Ava to remember'}
            <textarea
              aria-label="Memory text"
              value={text}
              maxLength={2000}
              onChange={(event) => setText(event.target.value)}
              style={{ width: '100%', minHeight: 80 }}
            />
          </label>
          <button
            type="button"
            disabled={busy || !text.trim()}
            style={{ minHeight: 44 }}
            onClick={save}
          >
            {busy ? 'Working…' : 'Confirm and save'}
          </button>
          <button
            type="button"
            disabled={busy}
            style={{ minHeight: 44, marginLeft: 8 }}
            onClick={suggest}
          >
            Suggest from this conversation
          </button>
          {proposals.map((proposal, index) => (
            <div
              key={index}
              style={{ padding: 12, border: '1px solid #CCFBF1', borderRadius: 12, marginTop: 12 }}
            >
              <p>{proposal}</p>
              <button
                type="button"
                style={{ minHeight: 44 }}
                onClick={() => {
                  setText(proposal);
                  setEditing(null);
                  setProposals((current) => current.filter((_, i) => i !== index));
                }}
              >
                Review this proposal
              </button>
            </div>
          ))}
          {memories.map((item) => (
            <details key={item.id} style={{ marginTop: 12 }}>
              <summary style={{ minHeight: 44, cursor: 'pointer' }}>{item.title}</summary>
              <p>
                Source: {item.source} · {new Date(item.occurredAt).toLocaleDateString()} ·{' '}
                {item.payload.userConfirmed
                  ? 'Confirmed by you'
                  : 'Older unconfirmed memory; review before use'}
              </p>
              <button
                type="button"
                style={{ minHeight: 44 }}
                disabled={busy}
                onClick={() => {
                  setText(item.title);
                  setEditing(item.id);
                }}
              >
                Correct
              </button>
              <button
                type="button"
                style={{ minHeight: 44, marginLeft: 8 }}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await reviseHealthMemory(item.id, null, scope);
                    refresh();
                    setStatus('Forgotten. It will no longer be used in Ava context.');
                  } catch (error: any) {
                    setStatus(error.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Forget
              </button>
            </details>
          ))}
          {status && <p role="status">{status}</p>}
        </section>
      </div>
    </FocusTrap>
  );
}
