import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardList, FileSearch, GitCompareArrows, ListChecks, Network, ShieldAlert, Sparkles, Stethoscope, Trash2, Download, Printer, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CaseItem, clearCasePrepDraft, getCase, getCases, getCasePrepDraft, saveCasePrepCase, saveCasePrepDraft } from '../../services/CaseEngine';
import { generateAppointmentQuestions } from '../../services/geminiService';
import { getProfile } from '../../services/ProfileEngine';
import { motion, AnimatePresence } from 'framer-motion';

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
  const profile = getProfile();
  
  const [concern, setConcern] = useState('');
  const [timeline, setTimeline] = useState('');
  const [records, setRecords] = useState('');
  const [appointment, setAppointment] = useState('');
  const [goal, setGoal] = useState('');
  const [careSoFar, setCareSoFar] = useState('');
  const [caseItem, setCaseItem] = useState<CaseItem | null>(null);
  const [showBrief, setShowBrief] = useState(false);
  const hydrated = useRef(false);

  const [showImportDropdown, setShowImportDropdown] = useState(false);
  
  // Smart Questions State
  const [smartQuestions, setSmartQuestions] = useState<string[]>([]);
  const [isGeneratingQs, setIsGeneratingQs] = useState(false);

  useEffect(() => {
    const draft = getCasePrepDraft();
    if (draft) {
      setConcern(draft.concern || ''); setTimeline(draft.timeline || ''); setRecords(draft.records || ''); setAppointment(draft.appointment || ''); setGoal(draft.goal || ''); setCareSoFar(draft.careSoFar || '');
      if (draft.caseId) setCaseItem(getCase(draft.caseId) || null);
    }
    window.setTimeout(() => { hydrated.current = true; }, 0);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const timer = window.setTimeout(() => saveCasePrepDraft({ concern, timeline, records, appointment, goal, careSoFar, caseId: caseItem?.id, savedAt: new Date().toISOString() }), 350);
    return () => window.clearTimeout(timer);
  }, [concern, timeline, records, appointment, goal, careSoFar, caseItem?.id]);

  const timelineItems = lines(timeline);
  const recordItems = lines(records);
  const readiness = useMemo(() => Math.round(([concern.trim(), timelineItems.length >= 2, recordItems.length >= 1, appointment].filter(Boolean).length / 4) * 100), [concern, timelineItems.length, recordItems.length, appointment]);
  const lenses = useMemo(() => usefulLenses(`${concern} ${timeline} ${records}`), [concern, timeline, records]);
  
  const displayQuestions = smartQuestions.length > 0 ? smartQuestions : [
    'What findings are confirmed, and what is still only a possibility?',
    'Which symptom or test result matters most for deciding what to investigate next?',
    'What would make this urgent, and what should I do if that happens?'
  ];

  const handleImportCase = (selectedCase: CaseItem) => {
    // Intelligently import data into the fields, not just string dumping
    const intake = selectedCase.intakeData || {};
    
    if (intake.chiefComplaint && !concern) setConcern(intake.chiefComplaint);
    if (intake.history && !timeline) setTimeline(intake.history);
    
    // Convert events to timeline if intake history is empty
    if (!intake.history && selectedCase.events?.length > 0) {
       setTimeline(selectedCase.events.map(e => `${e.date.split('T')[0]}: ${e.label}`).join('\n'));
    }

    // Convert reviews into careSoFar
    let AI_Context = '';
    const snapshot = selectedCase.reviews?.[selectedCase.reviews.length - 1];
    if (snapshot) {
      if (snapshot.report?.executiveSummary) {
         AI_Context += `Previous AI Summary: ${snapshot.report.executiveSummary}\n`;
      }
      if (snapshot.report?.topDiagnoses?.length) {
         AI_Context += `Top AI Possibilities: ${snapshot.report.topDiagnoses.map((d: any) => typeof d === 'string' ? d : d.condition).join(', ')}\n`;
      }
    }
    if (AI_Context && !careSoFar) {
      setCareSoFar(AI_Context);
    } else if (AI_Context) {
      setCareSoFar(prev => prev + '\n\n' + AI_Context);
    }
    
    // Convert medical records to records field
    if (selectedCase.medicalRecords?.length > 0) {
      const recs = selectedCase.medicalRecords.map(r => `${r.filename}: ${r.findings}`).join('\n');
      setRecords(prev => prev ? prev + '\n' + recs : recs);
    }

    setShowImportDropdown(false);
  };

  const createCase = () => {
    if (!concern.trim()) return;
    const item = saveCasePrepCase({ caseId: caseItem?.id, concern, timeline, records, appointment, goal, careSoFar });
    setCaseItem(item);
    setShowBrief(true);
    window.dispatchEvent(new Event('hc_cases_updated'));
  };

  const handleGenerateQuestions = async () => {
    if (!concern) return;
    setIsGeneratingQs(true);
    const qs = await generateAppointmentQuestions({ concern, timeline, records });
    if (qs.length > 0) setSmartQuestions(qs);
    setIsGeneratingQs(false);
  };

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' }}>
      <div className="print-hide" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
        <button className="btn btn-primary" onClick={() => navigate('/app/case-prep')}>Case Prep</button>
        <button className="btn btn-outline" onClick={() => navigate('/app/collab')}>Classic Deep Collab</button>
      </div>
      
      <section className="print-hide" style={{ padding: 28, borderRadius: 24, background: 'linear-gradient(135deg, #ecfeff, #f8fafc)', border: '1px solid #bae6fd', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#0f766e' }}>
          <Sparkles size={22} /><strong>FREE APPOINTMENT PREP</strong>
        </div>
        <h1 style={{ margin: '12px 0 8px', fontSize: 'clamp(30px, 5vw, 48px)', color: '#0f172a' }}>Build the case you want your clinician to see.</h1>
        <p style={{ maxWidth: 760, lineHeight: 1.7, color: '#475569', margin: 0 }}>Turn scattered symptoms, records, and unanswered questions into a clean SBAR handoff. Prepare the conversation; let your clinician make the decisions.</p>
      </section>

      <div className="print-hide" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <section className="card" style={{ padding: 24, flex: '1 1 500px', minWidth: 0 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: '10px' }}>
            <label style={{ fontWeight: 800, margin: 0 }}>What are you trying to understand?</label>
            <div style={{position: 'relative'}}>
              <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12, height: 'auto', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowImportDropdown(!showImportDropdown)}>
                <Download size={14} /> Import past case data
              </button>
              {showImportDropdown && (
                <div style={{position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 250, maxHeight: 300, overflowY: 'auto'}}>
                  {getCases().filter((c: any) => c.reviews?.length > 0 || c.events?.length > 0).map((c: any) => (
                    <div key={c.id} style={{padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 13}} onClick={() => handleImportCase(c)}>
                      <strong>{c.title}</strong>
                      <div style={{color: '#64748b', fontSize: 11, marginTop: 4}}>{new Date(c.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {getCases().length === 0 && <div style={{padding: 14, color: '#64748b', fontSize: 12}}>No past cases found.</div>}
                </div>
              )}
            </div>
          </div>
          
          <textarea value={concern} onChange={(e) => setConcern(e.target.value)} placeholder="Example: fatigue, dizziness, and stomach symptoms that have continued for six months" rows={3} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', font: 'inherit', boxSizing: 'border-box' }} />
          
          <label style={{ fontWeight: 800, display: 'block', margin: '20px 0 8px' }}>Symptom timeline</label>
          <textarea value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder={'One event per line\nJan: fatigue began\nMar: dizziness became more frequent'} rows={5} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', font: 'inherit', boxSizing: 'border-box' }} />
          
          <label style={{ fontWeight: 800, display: 'block', margin: '20px 0 8px' }}>Records or facts to bring</label>
          <textarea value={records} onChange={(e) => setRecords(e.target.value)} placeholder={'One item per line\nCBC on 12 June: ...'} rows={4} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', font: 'inherit', boxSizing: 'border-box' }} />
          
          <label style={{ fontWeight: 800, display: 'block', margin: '20px 0 8px' }}>What has already been tried or ruled out?</label>
          <textarea value={careSoFar} onChange={(e) => setCareSoFar(e.target.value)} placeholder="Example: normal blood tests in June; tried hydration and sleep changes; no improvement" rows={3} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', font: 'inherit', boxSizing: 'border-box' }} />
          
          <label style={{ fontWeight: 800, display: 'block', margin: '20px 0 8px' }}>Best outcome for this appointment</label>
          <textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Example: decide whether I need follow-up testing, a referral, or a review of current medication" rows={2} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', font: 'inherit', boxSizing: 'border-box' }} />
          
          <label style={{ fontWeight: 800, display: 'block', margin: '20px 0 8px' }}>Appointment date (optional)</label>
          <input type="date" value={appointment} onChange={(e) => setAppointment(e.target.value)} style={{ padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', font: 'inherit' }} />
          
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={createCase} disabled={!concern.trim()} style={{ flex: 1, padding: 14, display: 'flex', justifyContent: 'center', gap: 8, minWidth: 200 }}>
                <ClipboardList size={18} /> {caseItem ? 'Update my case brief' : 'Generate SBAR Handoff'} <ArrowRight size={18} />
              </button>
              <button className="btn btn-outline" onClick={() => { clearCasePrepDraft(); setConcern(''); setTimeline(''); setRecords(''); setAppointment(''); setGoal(''); setCareSoFar(''); setCaseItem(null); setShowBrief(false); setSmartQuestions([]); }} title="Clear saved draft" style={{ padding: '0 14px' }}><Trash2 size={18} /></button>
          </div>
        </section>

        <aside style={{ display: 'grid', gap: 16, flex: '1 1 300px', minWidth: 0 }}>
          <section className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Case readiness</strong>
              <strong style={{ color: '#0f8b7e' }}>{readiness}%</strong>
            </div>
            <div style={{ height: 10, borderRadius: 99, background: '#e2e8f0', margin: '14px 0 16px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${readiness}%`, background: '#14b8a6' }} />
            </div>
            {['Clear main concern', 'Timeline with 2+ events', 'At least one record or fact', 'Appointment date'].map((item, index) => 
              <div key={item} style={{ display: 'flex', gap: 8, marginTop: 10, color: '#475569', fontSize: 14 }}>
                <CheckCircle2 size={17} color={[concern.trim(), timelineItems.length >= 2, recordItems.length >= 1, appointment][index] ? '#10b981' : '#cbd5e1'} />{item}
              </div>
            )}
          </section>
          
          <section className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
               <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ListChecks size={19} color="#0f8b7e" /><strong>Smart Questions</strong></div>
               <button onClick={handleGenerateQuestions} disabled={isGeneratingQs || !concern} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10B981', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}>
                 {isGeneratingQs ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} {smartQuestions.length ? 'Regenerate' : 'Auto-Generate'}
               </button>
            </div>
            {isGeneratingQs ? (
              <div style={{ color: '#64748B', fontSize: 13, padding: 12, background: '#F8FAFC', borderRadius: 8 }}>Analyzing case to generate tailored questions...</div>
            ) : (
              <ol style={{ paddingLeft: 20, margin: 0, lineHeight: 1.6, color: '#475569', fontSize: 14 }}>
                {displayQuestions.map((q) => <li key={q} style={{ marginTop: 10 }}>{q}</li>)}
              </ol>
            )}
          </section>
          
          <section style={{ padding: 18, borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', display: 'flex', gap: 10, color: '#9a3412', fontSize: 13, lineHeight: 1.5 }}>
             <ShieldAlert size={20} style={{ flexShrink: 0 }} />If you have severe, sudden, or rapidly worsening symptoms (like chest pain, sudden weakness, or trouble breathing), seek emergency medical care immediately instead of waiting for an appointment.
          </section>
        </aside>
      </div>

      {showBrief && (
        <section className="case-prep-printable-dossier" style={{ marginTop: 40, background: '#FFF' }}>
          <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
             <h2 style={{ margin: 0 }}>SBAR Clinical Handoff</h2>
             <button className="btn btn-primary" onClick={() => window.print()} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
               <Printer size={16} /> Print Handoff
             </button>
          </div>
          
          <div style={{ border: '1px solid #E2E8F0', padding: '40px', borderRadius: '16px', background: '#FFF' }}>
             {/* Header */}
             <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0F172A', paddingBottom: 16, marginBottom: 24 }}>
                <div>
                   <h1 style={{ margin: '0 0 8px 0', fontSize: 24, color: '#0F172A' }}>Patient Case Brief</h1>
                   <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>Prepared via HealthChain on {new Date().toLocaleDateString()}</p>
                </div>
                {appointment && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Appointment Date</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{new Date(appointment).toLocaleDateString()}</div>
                  </div>
                )}
             </div>

             {/* Medical Profile Summary */}
             <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', padding: '16px', background: '#F8FAFC', borderRadius: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#64748B', margin: '0 0 8px 0' }}>Active Medications</h3>
                  {profile.medications && profile.medications.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#0F172A' }}>
                      {profile.medications.map((m: any, i: number) => <li key={i}>{m.name || m}</li>)}
                    </ul>
                  ) : <div style={{ fontSize: 13, color: '#0F172A' }}>None reported</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#64748B', margin: '0 0 8px 0' }}>Known Allergies</h3>
                  {profile.allergies && profile.allergies.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#EF4444' }}>
                      {profile.allergies.map((a: any, i: number) => <li key={i}>{a.allergen || a}</li>)}
                    </ul>
                  ) : <div style={{ fontSize: 13, color: '#0F172A' }}>NKDA</div>}
                </div>
             </div>

             {/* SBAR Content */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h2 style={{ fontSize: 18, color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: 8, margin: '0 0 12px 0' }}>S: Situation</h2>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#1E293B', fontWeight: 600 }}>{concern || 'Not provided'}</p>
                </div>

                <div>
                  <h2 style={{ fontSize: 18, color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: 8, margin: '0 0 12px 0' }}>B: Background (Timeline & Care So Far)</h2>
                  <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
                     <strong style={{ display: 'block', marginBottom: 4 }}>Key Events:</strong>
                     {timelineItems.length > 0 ? (
                       <ul style={{ margin: '0 0 12px 0', paddingLeft: 20 }}>
                         {timelineItems.map((item, i) => <li key={i}>{item}</li>)}
                       </ul>
                     ) : <p style={{ margin: '0 0 12px 0' }}>No timeline provided.</p>}
                     
                     <strong style={{ display: 'block', marginBottom: 4 }}>Care/Investigations To Date:</strong>
                     <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{careSoFar || 'None reported.'}</p>
                  </div>
                </div>

                <div>
                  <h2 style={{ fontSize: 18, color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: 8, margin: '0 0 12px 0' }}>A: Assessment (Records to Review)</h2>
                  <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {recordItems.length > 0 ? records : 'No patient-provided records attached to this brief.'}
                  </div>
                </div>

                <div>
                  <h2 style={{ fontSize: 18, color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: 8, margin: '0 0 12px 0' }}>R: Request (Goal & Questions)</h2>
                  <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
                    <strong style={{ display: 'block', marginBottom: 4 }}>Appointment Goal:</strong>
                    <p style={{ margin: '0 0 16px 0', fontWeight: 600 }}>{goal || 'Discuss next steps.'}</p>
                    
                    <strong style={{ display: 'block', marginBottom: 4 }}>Patient Questions for Clinician:</strong>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {displayQuestions.map((q, i) => <li key={i} style={{ marginBottom: 4 }}>{q}</li>)}
                    </ul>
                  </div>
                </div>
             </div>
             
             <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid #E2E8F0', fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
               This dossier was generated by the patient using HealthChain to assist in clinical communication. It does not replace clinical judgment or official medical records.
             </div>
          </div>
        </section>
      )}
    </main>
  );
}
