import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, FileSearch, GitCompareArrows, Network, ShieldAlert, Stethoscope } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CaseItem, getActiveCase, getCase } from '../../services/CaseEngine';

const chooseLenses = (text: string) => {
  const value = text.toLowerCase();
  const lenses = ['General medicine'];
  if (/head|dizz|numb|migraine|memory/.test(value)) lenses.push('Neurology');
  if (/heart|chest|palpitation|blood pressure/.test(value)) lenses.push('Cardiology');
  if (/stomach|gut|bowel|nausea/.test(value)) lenses.push('Gastroenterology');
  if (/joint|rash|inflammation|autoimmune/.test(value)) lenses.push('Rheumatology');
  if (/fatigue|weight|thyroid|glucose|hormone/.test(value)) lenses.push('Endocrinology');
  return [...new Set(lenses)].slice(0, 4);
};

export default function DeepCollabBeta() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [caseItem, setCaseItem] = useState<CaseItem | null>(null);
  const [showBrief, setShowBrief] = useState(false);

  useEffect(() => {
    const load = () => setCaseItem((params.get('caseId') ? getCase(params.get('caseId')!) : getActiveCase()) || null);
    load();
    window.addEventListener('hc_cases_updated', load);
    return () => window.removeEventListener('hc_cases_updated', load);
  }, [params]);

  const caseText = `${caseItem?.intakeData?.chiefComplaint || caseItem?.title || ''} ${caseItem?.intakeData?.history || ''} ${(caseItem?.medicalRecords || []).map((record) => record.findings).join(' ')}`;
  const lenses = useMemo(() => chooseLenses(caseText), [caseText]);
  const facts = caseItem?.medicalRecords || [];
  const timeline = (caseItem?.intakeData?.history || '').split('\n').filter(Boolean);

  if (!caseItem) return <main style={{ maxWidth: 820, margin: '0 auto', padding: '48px 20px' }}><h1>Start with Case Prep</h1><p>Create a private case first, then Deep Collab Beta will organize its evidence.</p><button className="btn btn-primary" onClick={() => navigate('/app/case-prep')}>Open Case Prep <ArrowRight size={16} /></button></main>;

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 80px' }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}><button className="btn btn-outline" onClick={() => navigate('/app/case-prep')}>Case Prep</button><button className="btn btn-primary">Deep Collab Beta</button><button className="btn btn-outline" onClick={() => navigate('/app/collab')}>Classic Deep Collab</button></div>
      <section style={{ padding: 28, borderRadius: 24, background: 'linear-gradient(135deg, #eff6ff, #f0fdfa)', border: '1px solid #bfdbfe' }}><div style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#0f766e' }}><Network size={22} /><strong>DEEP COLLAB BETA</strong></div><h1 style={{ margin: '12px 0 8px', color: '#0f172a', fontSize: 'clamp(28px, 5vw, 44px)' }}>Evidence correlation before conclusions.</h1><p style={{ color: '#475569', lineHeight: 1.7, margin: 0 }}>This beta makes the case file visible: what is known, what is reported, what is missing, and which clinical perspectives may be useful to discuss. It does not diagnose.</p></section>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginTop: 22 }}>
        <section className="card" style={{ padding: 22 }}><div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><FileSearch size={19} color="#2563eb" /><strong>Known case facts</strong></div><p style={{ color: '#475569', lineHeight: 1.6, fontSize: 14 }}>{caseItem.intakeData?.chiefComplaint || caseItem.title}</p>{facts.length ? facts.map((fact) => <div key={fact.id} style={{ background: '#f8fafc', padding: 10, borderRadius: 10, marginTop: 8, fontSize: 13 }}><strong>{fact.filename}</strong><br />{fact.findings}</div>) : <p style={{ color: '#64748b', fontSize: 14 }}>No records added yet. Add only facts you would be comfortable discussing with a clinician.</p>}</section>
        <section className="card" style={{ padding: 22 }}><div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><GitCompareArrows size={19} color="#7c3aed" /><strong>Evidence gaps</strong></div><ul style={{ color: '#475569', paddingLeft: 18, lineHeight: 1.65, fontSize: 14 }}><li>{timeline.length >= 2 ? 'Timeline is present; confirm exact dates and sequence.' : 'Add a dated timeline to show what changed first.'}</li><li>{facts.length ? 'Ask which existing results are relevant and which are incomplete.' : 'Add medication, test, or clinician-note facts before escalation.'}</li><li>Separate clinician-confirmed findings from symptoms you experienced.</li></ul></section>
        <section className="card" style={{ padding: 22 }}><div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><Stethoscope size={19} color="#0f8b7e" /><strong>Suggested lenses</strong></div><p style={{ color: '#64748b', fontSize: 13 }}>Selected from the language in this case—not a referral or diagnosis.</p>{lenses.map((lens) => <div key={lens} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, fontSize: 14 }}><CheckCircle2 size={16} color="#10b981" />{lens}</div>)}</section>
      </div>
      <section className="card" style={{ padding: 24, marginTop: 20 }}><h2 style={{ marginTop: 0 }}>Clinician-ready brief</h2><p style={{ color: '#475569', lineHeight: 1.7 }}>Generate a focused, dated summary of your case, evidence gaps, and questions to discuss. This is the paid-value workflow to validate alongside Classic Deep Collab.</p><button className="btn btn-primary" onClick={() => setShowBrief(true)}>Generate preview brief <ArrowRight size={17} /></button>{showBrief && <div style={{ marginTop: 20, padding: 20, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}><h3 style={{ marginTop: 0 }}>{caseItem.title}</h3><p><strong>Patient-reported concern:</strong> {caseItem.intakeData?.chiefComplaint || 'Not yet provided'}</p><p><strong>Timeline:</strong> {timeline.length ? timeline.join(' → ') : 'Needs dated events.'}</p><p><strong>Discussion goals:</strong> clarify confirmed facts, reconcile potentially related symptoms, and agree on the most useful next step.</p><p><strong>Questions:</strong></p><ol><li>Which facts in this brief change the next clinical decision?</li><li>What relevant evidence is absent or needs repeating?</li><li>What should prompt urgent care rather than routine follow-up?</li></ol></div>}</section>
      <section style={{ marginTop: 20, padding: 16, borderRadius: 14, background: '#fff7ed', border: '1px solid #fed7aa', display: 'flex', gap: 10, color: '#9a3412', fontSize: 13 }}><ShieldAlert size={20} style={{ flexShrink: 0 }} />For severe, sudden, or worsening symptoms, contact emergency services or a qualified clinician now. This beta is an organizational tool, not medical advice.</section>
    </main>
  );
}
