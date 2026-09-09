import { useState } from 'react';
import { createCaseDraft } from '../../services/CaseEngine';

export function NewCaseForm({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [concern, setConcern] = useState('');
  const [error, setError] = useState('');
  return <form className="case-workspace connected-experience" aria-label="Create a health case" onSubmit={event => {
    event.preventDefault();
    if (!title.trim() || !concern.trim()) { setError('Add a title and your main concern to save this case.'); return; }
    try {
      const item = createCaseDraft({ title: title.trim(), intakeData: { chiefComplaint: concern.trim() } });
      onCreated(item.id);
    } catch { setError('This case could not be saved. Your text is still here; please try again.'); }
  }}>
    <h2>Start with your story</h2><p>Save a draft now. Add documents, a review, or appointment questions whenever you’re ready.</p>
    <label htmlFor="new-case-title">Case title</label>
    <input autoFocus id="new-case-title" className="case-context-select" maxLength={120} value={title} onChange={event => setTitle(event.target.value)} placeholder="For example, changes in my energy" required />
    <label htmlFor="new-case-concern">What would you like help with?</label>
    <textarea id="new-case-concern" className="case-context-select" rows={4} maxLength={6000} value={concern} onChange={event => setConcern(event.target.value)} placeholder="Describe what you’ve noticed and what matters most to you." required />
    {error && <p role="alert">{error}</p>}
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><button className="btn btn-primary" type="submit">Save case draft</button><button className="btn btn-outline" type="button" onClick={onCancel}>Cancel</button></div>
  </form>;
}
