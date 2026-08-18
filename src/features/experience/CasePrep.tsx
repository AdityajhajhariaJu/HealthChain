import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardList, FileSearch, GitCompareArrows, ListChecks, Network, ShieldAlert, Sparkles, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { addEvidenceToActiveCase, CaseItem, createCaseDraft } from '../../services/CaseEngine';

const lines = (value: string) => value.split('\n').map((line) => line.trim()).filter(Boolean);

function usefulLenses(text: string) {
  const value = text.toLowerCase();
  const lenses = ['General medicine'];
  if (/head|dizz|numb|migraine|memory/.test(value)) lenses.push('Neurology');
  if (/heart|chest|palpitation|blood pressure/.test(value)) lenses.push('Cardiology');
  if (/stomach|gut|bowel|nausea/.test(value)) lenses.push('Gastroenterology');
  if (/joint|rash|inflammation|autoimmune/.test(value)) lenses.push('Rheumatology');
  if (/fatigue|weight|thyroid|glucose|hormone/.test(value)) lenses.push('Endocrinology');
  return [...new Set(lenses)].slice(0, 4);
}

export default function CasePrep() {
  const navigate = useNavigate();
  const [concern, setConcern] = useState('');
  const [timeline, setTimeline] = useState('');
  const [records, setRecords] = useState('');
  const [appointment, setAppointment] = useState('');
  const [caseItem, setCaseItem] = useState<CaseItem | null>(null);
  const [showBrief, setShowBrief] = useState(false);

  const timelineItems = lines(timeline);
  const recordItems = lines(records);
  const readiness = useMemo(() => Math.round(([concern.trim(), timelineItems.length >= 2, recordItems.length >= 1, appointment].filter(Boolean).length / 4) * 100), [concern, timelineItems.length, recordItems.length, appointment]);
  const lenses = useMemo(() => usefulLenses(`${concern} ${timeline} ${records}`), [concern, timeline, records]);
  const questions = useMemo(() => {
    const base = ['What findings are confirmed, and what is still only a possibility?', 'Which symptom or test result matters most for deciding what to investigate next?', 'What would make this urgent, and what should I do if that happens?'];
    if (recordItems.length) base.splice(1, 0, 'Could we review which of my existing records are relevant and what is missing?');
    if (timelineItems.length >= 2) base.push('Does the timing suggest a useful next test, referral, or follow-up?');
    return base;
  }, [recordItems.length, timelineItems.length]);
  const gaps = [
    timelineItems.length >= 2 ? 'Timeline is present; confirm exact dates and sequence.' : 'Add a dated timeline to show what changed first.',
    recordItems.length ? 'Ask which existing results are relevant and which are incomplete.' : 'Add medication, test, or clinician-note facts before your appointment.',
    'Separate clinician-confirmed findings from symptoms you experienced.',
  ];

  const createCase = () => {
    if (!concern.trim()) return;
    const item = createCaseDraft({ title: concern.trim().slice(0, 58), intakeData: { chiefComplaint: concern.trim(), history: timeline.trim(), appointmentDate: appointment || null } });
    const previewRecords = recordItems.map((findings, index) => ({ id: `preview-${index}`, filename: `Appointment note ${index + 1}`, findings, source: 'case_prep', type: 'patient_note', addedAt: new Date().toISOString() }));
    recordItems.forEach((record, index) => addEvidenceToActiveCase({ filename: `Appointment note ${index + 1}`, findings: record, source: 'case_prep', type: 'patient_note' }));
    setCaseItem({ ...item, medicalRecords: previewRecords });
    setShowBrief(true);
    window.dispatchEvent(new Event('hc_cases_updated'));
  };

  return <main style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' }}>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}><button className="btn btn-primary" onClick={() => navigate('/app/case-prep')}>Case Prep</button><button className="btn btn-outline" onClick={() => navigate('/app/collab')}>Classic Deep Collab</button></div>
    <section style={{ padding: 28, borderRadius: 24, background: 'linear-gradient(135deg, #ecfeff, #f8fafc)', border: '1px solid #bae6fd', marginBottom: 24 }}><div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#0f766e' }}><Sparkles size={22} /><strong>FREE APPOINTMENT PREP</strong></div><h1 style={{ margin: '12px 0 8px', fontSize: 'clamp(30px, 5vw, 48px)', color: '#0f172a' }}>Build the case you want your clinician to see.</h1><p style={{ maxWidth: 760, lineHeight: 1.7, color: '#475569', margin: 0 }}>Turn scattered symptoms, records, and unanswered questions into a dated case brief. HealthChain helps you prepare the conversation; your clinician makes medical decisions.</p></section>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, .8fr)', gap: 20, alignItems: 'start' }}>
      <section className="card" style={{ padding: 24 }}>
        <label style={{ fontWeight: 800, display: 'block', marginBottom: 8 }}>What are you trying to understand?</label><textarea value={concern} onChange={(e) => setConcern(e.target.value)} placeholder="Example: fatigue, dizziness, and stomach symptoms that have continued for six months" rows={3} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', font: 'inherit', boxSizing: 'border-box' }} />
        <label style={{ fontWeight: 800, display: 'block', margin: '20px 0 8px' }}>Symptom timeline</label><textarea value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder={'One event per line\nJan: fatigue began\nMar: dizziness became more frequent'} rows={5} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', font: 'inherit', boxSizing: 'border-box' }} />
        <label style={{ fontWeight: 800, display: 'block', margin: '20px 0 8px' }}>Records or facts to bring</label><textarea value={records} onChange={(e) => setRecords(e.target.value)} placeholder={'One item per line\nCBC on 12 June: ...\nCurrent medication: ...'} rows={5} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', font: 'inherit', boxSizing: 'border-box' }} />
        <label style={{ fontWeight: 800, display: 'block', margin: '20px 0 8px' }}>Appointment date (optional)</label><input type="date" value={appointment} onChange={(e) => setAppointment(e.target.value)} style={{ padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', font: 'inherit' }} />
        <button className="btn btn-primary" onClick={createCase} disabled={!concern.trim()} style={{ width: '100%', marginTop: 24, padding: 14, display: 'flex', justifyContent: 'center', gap: 8 }}><ClipboardList size={18} /> Create my case brief <ArrowRight size={18} /></button>
      </section>
      <aside style={{ display: 'grid', gap: 16 }}>
        <section className="card" style={{ padding: 20 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong>Case readiness</strong><strong style={{ color: '#0f8b7e' }}>{readiness}%</strong></div><div style={{ height: 10, borderRadius: 99, background: '#e2e8f0', margin: '14px 0 16px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${readiness}%`, background: '#14b8a6' }} /></div>{['Clear main concern', 'Timeline with 2+ events', 'At least one record or fact', 'Appointment date'].map((item, index) => <div key={item} style={{ display: 'flex', gap: 8, marginTop: 10, color: '#475569', fontSize: 14 }}><CheckCircle2 size={17} color={[concern.trim(), timelineItems.length >= 2, recordItems.length >= 1, appointment][index] ? '#10b981' : '#cbd5e1'} />{item}</div>)}</section>
        <section className="card" style={{ padding: 20 }}><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ListChecks size={19} color="#0f8b7e" /><strong>Questions to ask</strong></div><ol style={{ paddingLeft: 20, lineHeight: 1.6, color: '#475569', fontSize: 14 }}>{questions.map((question) => <li key={question} style={{ marginTop: 10 }}>{question}</li>)}</ol></section>
        <section style={{ padding: 18, borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', display: 'flex', gap: 10, color: '#9a3412', fontSize: 13, lineHeight: 1.5 }}><ShieldAlert size={20} style={{ flexShrink: 0 }} />If you have severe, sudden, or rapidly worsening symptoms, seek urgent medical care instead of waiting for an AI review.</section>
      </aside>
    </div>
    {caseItem && <section style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#0f766e', marginBottom: 12 }}><Network size={20} /><strong>YOUR CASE MAP</strong></div><h2 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: 28 }}>More context, clearly separated.</h2><p style={{ margin: '0 0 18px', color: '#475569', lineHeight: 1.6 }}>These are organization prompts—not medical conclusions or referrals.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
        <section className="card" style={{ padding: 22 }}><div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><FileSearch size={19} color="#2563eb" /><strong>Known case facts</strong></div><p style={{ color: '#475569', lineHeight: 1.6, fontSize: 14 }}>{caseItem.intakeData?.chiefComplaint}</p>{caseItem.medicalRecords.length ? caseItem.medicalRecords.map((fact) => <div key={fact.id} style={{ background: '#f8fafc', padding: 10, borderRadius: 10, marginTop: 8, fontSize: 13 }}><strong>{fact.filename}</strong><br />{fact.findings}<div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>Source: patient-added case note · Verify against the original record with your clinician.</div></div>) : <p style={{ color: '#64748b', fontSize: 14 }}>No records added yet.</p>}</section>
        <section className="card" style={{ padding: 22 }}><div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><GitCompareArrows size={19} color="#7c3aed" /><strong>Evidence gaps</strong></div><ul style={{ color: '#475569', paddingLeft: 18, lineHeight: 1.65, fontSize: 14 }}>{gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul></section>
        <section className="card" style={{ padding: 22 }}><div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><Stethoscope size={19} color="#0f8b7e" /><strong>Useful perspectives</strong></div><p style={{ color: '#64748b', fontSize: 13 }}>Selected from your wording—not a diagnosis or referral.</p>{lenses.map((lens) => <div key={lens} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, fontSize: 14 }}><CheckCircle2 size={16} color="#10b981" />{lens}</div>)}</section>
      </div>
      <section className="card" style={{ padding: 24, marginTop: 20 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}><div><h2 style={{ margin: '0 0 8px' }}>Clinician-ready brief</h2><p style={{ color: '#475569', lineHeight: 1.7, margin: 0 }}>A focused summary of your timeline, evidence gaps, and questions that matter at the appointment.</p></div><button className="btn btn-primary" onClick={() => setShowBrief((value) => !value)}>{showBrief ? 'Hide brief' : 'View brief'} <ArrowRight size={17} /></button></div>{showBrief && <div style={{ marginTop: 20, padding: 20, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}><h3 style={{ marginTop: 0 }}>{caseItem.title}</h3><p><strong>Patient-reported concern:</strong> {caseItem.intakeData?.chiefComplaint || 'Not yet provided'}</p><p><strong>Timeline:</strong> {timelineItems.length ? timelineItems.join(' → ') : 'Needs dated events.'}</p><p><strong>What is known:</strong> {recordItems.length ? 'Patient-added records and notes are listed above.' : 'No record highlights were added yet.'}</p><p><strong>What is uncertain:</strong> which facts are clinically relevant, what requires confirmation, and what the appropriate next step is.</p><p style={{ fontSize: 13, color: '#64748b' }}><strong>Evidence note:</strong> No external citation is verified in this brief. Bring original reports and discuss them with your clinician.</p><p><strong>Questions to discuss:</strong></p><ol>{questions.map((question) => <li key={question}>{question}</li>)}</ol></div>}</section>
    </section>}
  </main>;
}
