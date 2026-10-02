import { useId, useState } from 'react';
import '../../../components/ui/OutcomeLayout.css';

export function ClinicalClarificationForm({
  question,
  why,
  busy,
  onSave,
}: {
  question: string;
  why: string;
  busy: boolean;
  onSave: (answer: string) => Promise<boolean>;
}) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('');
  const submit = async () => {
    if (busy || !draft.trim()) return;
    setStatus('');
    try {
      if (await onSave(draft.trim())) {
        setDraft('');
        setStatus(
          'Clarification saved as your reported observation. Run a fresh review to assess its effect.'
        );
      } else setStatus('Could not save. Your reply is still here; try again.');
    } catch {
      setStatus('Could not save. Your reply is still here; try again.');
    }
  };
  return (
    <section className="hc-outcome">
      <form
        className="hc-outcome-section hc-outcome-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h3>Add a detail, if you know it</h3>
        <label htmlFor={id}>{question}</label>
        <p>{why}</p>
        <textarea
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          disabled={busy}
          placeholder="Unknown is okay. You can leave this unanswered."
        />
        <div className="hc-outcome-actions">
          <button type="submit" disabled={busy || !draft.trim()}>
            {busy ? 'Saving…' : 'Save clarification'}
          </button>
        </div>
        <span className="hc-outcome-meta">
          Optional. Saving records your answer; it does not rerun the AI interpretation.
        </span>
        <span role="status" className="hc-outcome-meta">
          {status}
        </span>
      </form>
    </section>
  );
}
