import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, FileText, ListChecks, ShieldAlert, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { addEvidenceToActiveCase, createCaseDraft } from '../../services/CaseEngine';

const cleanLines = (value: string) => value.split('\n').map((line) => line.trim()).filter(Boolean);

export default function CasePrep() {
  const navigate = useNavigate();
  const [concern, setConcern] = useState('');
  const [timeline, setTimeline] = useState('');
  const [records, setRecords] = useState('');
  const [appointment, setAppointment] = useState('');
  const [saved, setSaved] = useState(false);

  const readiness = useMemo(() => {
    const checks = [concern.trim(), cleanLines(timeline).length >= 2, cleanLines(records).length >= 1, appointment];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [concern, timeline, records, appointment]);

  const questions = useMemo(() => {
    const base = [
      'What findings are confirmed, and what is still only a possibility?',
      'Which symptom or test result matters most for deciding what to investigate next?',
      'What would make this urgent, and what should I do if that happens?',
    ];
    if (cleanLines(records).length) base.splice(1, 0, 'Could we review which of my existing records are relevant and what is missing?');
    if (cleanLines(timeline).length >= 2) base.push('Does the timing of these changes suggest a useful next test, referral, or follow-up?');
    return base;
  }, [records, timeline]);

  const saveCase = () => {
    if (!concern.trim()) return;
    const item = createCaseDraft({
      title: concern.trim().slice(0, 58),
      intakeData: { chiefComplaint: concern.trim(), history: timeline.trim(), appointmentDate: appointment || null },
    });
    cleanLines(records).forEach((record, index) => {
      addEvidenceToActiveCase({ filename: `Appointment note ${index + 1}`, findings: record, source: 'case_prep', type: 'patient_note' });
    });
    setSaved(true);
    window.dispatchEvent(new Event('hc_cases_updated'));
    setTimeout(() => navigate(`/app/deep-collab-beta?caseId=${item.id}`), 450);
  };

  return (
    <main style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 20px 80px' }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
        <button className="btn btn-primary" onClick={() => navigate('/app/case-prep')}>Case Prep</button>
        <button className="btn btn-outline" onClick={() => navigate('/app/deep-collab-beta')}>Deep Collab Beta</button>
        <button className="btn btn-outline" onClick={() => navigate('/app/collab')}>Classic Deep Collab</button>
      </div>

      <section style={{ padding: 28, borderRadius: 24, background: 'linear-gradient(135deg, #ecfeff, #f8fafc)', border: '1px solid #bae6fd', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#0f766e' }}><Sparkles size={22} /><strong>FREE APPOINTMENT PREP</strong></div>
        <h1 style={{ margin: '12px 0 8px', fontSize: 'clamp(30px, 5vw, 48px)', color: '#0f172a' }}>Turn scattered health details into a clear next conversation.</h1>
        <p style={{ maxWidth: 720, lineHeight: 1.7, color: '#475569', margin: 0 }}>Build a private timeline, organize the facts you want to discuss, and take focused questions to your clinician. This tool does not diagnose or replace medical advice.</p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, .8fr)', gap: 20, alignItems: 'start' }}>
        <section className="card" style={{ padding: 24 }}>
          <label style={{ fontWeight: 800, display: 'block', marginBottom: 8 }}>What are you trying to understand?</label>
          <textarea value={concern} onChange={(e) => setConcern(e.target.value)} placeholder="Example: fatigue, dizziness, and stomach symptoms that have continued for six months" rows={3} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', font: 'inherit', boxSizing: 'border-box' }} />
          <label style={{ fontWeight: 800, display: 'block', margin: '20px 0 8px' }}>Symptom timeline</label>
          <textarea value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder={'One event per line\nJan: fatigue began\nMar: dizziness became more frequent'} rows={5} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', font: 'inherit', boxSizing: 'border-box' }} />
          <label style={{ fontWeight: 800, display: 'block', margin: '20px 0 8px' }}>Records or facts to bring</label>
          <textarea value={records} onChange={(e) => setRecords(e.target.value)} placeholder={'One item per line\nCBC on 12 June: ...\nCurrent medication: ...'} rows={5} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', font: 'inherit', boxSizing: 'border-box' }} />
          <label style={{ fontWeight: 800, display: 'block', margin: '20px 0 8px' }}>Appointment date (optional)</label>
          <input type="date" value={appointment} onChange={(e) => setAppointment(e.target.value)} style={{ padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', font: 'inherit' }} />
          <button className="btn btn-primary" onClick={saveCase} disabled={!concern.trim()} style={{ width: '100%', marginTop: 24, padding: 14, display: 'flex', justifyContent: 'center', gap: 8 }}><ClipboardList size={18} /> {saved ? 'Opening your evidence map…' : 'Create my private case'} <ArrowRight size={18} /></button>
        </section>

        <aside style={{ display: 'grid', gap: 16 }}>
          <section className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong>Case readiness</strong><strong style={{ color: '#0f8b7e' }}>{readiness}%</strong></div>
            <div style={{ height: 10, borderRadius: 99, background: '#e2e8f0', margin: '14px 0 16px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${readiness}%`, background: '#14b8a6' }} /></div>
            {['Clear main concern', 'Timeline with 2+ events', 'At least one record or fact', 'Appointment date'].map((item, index) => <div key={item} style={{ display: 'flex', gap: 8, marginTop: 10, color: '#475569', fontSize: 14 }}><CheckCircle2 size={17} color={[concern.trim(), cleanLines(timeline).length >= 2, cleanLines(records).length >= 1, appointment][index] ? '#10b981' : '#cbd5e1'} />{item}</div>)}
          </section>
          <section className="card" style={{ padding: 20 }}><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ListChecks size={19} color="#0f8b7e" /><strong>Questions to ask</strong></div><ol style={{ paddingLeft: 20, lineHeight: 1.6, color: '#475569', fontSize: 14 }}>{questions.map((question) => <li key={question} style={{ marginTop: 10 }}>{question}</li>)}</ol></section>
          <section style={{ padding: 18, borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', display: 'flex', gap: 10, color: '#9a3412', fontSize: 13, lineHeight: 1.5 }}><ShieldAlert size={20} style={{ flexShrink: 0 }} />If you have severe or sudden symptoms, seek urgent medical care instead of waiting for an AI review.</section>
        </aside>
      </div>
    </main>
  );
}
