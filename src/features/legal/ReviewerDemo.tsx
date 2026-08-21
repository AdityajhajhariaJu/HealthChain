import { ArrowLeft, CheckCircle2, FileText, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/** Synthetic, read-only review surface. It never calls Supabase or the AI proxy. */
export default function ReviewerDemo() {
  const navigate = useNavigate();
  const cards = [
    { icon: FileText, title: 'Structured case', text: 'Symptoms, dates, record highlights, and the patient goal are separated clearly.' },
    { icon: CheckCircle2, title: 'Questions to discuss', text: 'The brief turns uncertainty into practical questions for a qualified clinician.' },
    { icon: ShieldCheck, title: 'Safety boundary', text: 'The product does not present a diagnosis, prescription, or emergency decision.' },
  ];
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '28px 20px', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, border: 0, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 28 }}><ArrowLeft size={18} /> Back to HealthChain</button>
        <section style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 24, padding: 28, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--teal)', fontWeight: 700, letterSpacing: '.06em', fontSize: 12 }}><Sparkles size={18} /> REVIEW DEMO · SYNTHETIC DATA</div>
          <h1 style={{ fontSize: 'clamp(30px, 5vw, 52px)', lineHeight: 1.05, margin: '14px 0' }}>A clearer case for a better clinician conversation.</h1>
          <p style={{ maxWidth: 720, color: 'var(--text-secondary)', fontSize: 17, lineHeight: 1.6 }}>This read-only demonstration shows how HealthChain organizes patient-provided information, evidence gaps, uncertainty, and appointment questions. It uses fictional data only and does not call the database or AI services.</p>
        </section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>{cards.map(({ icon: Icon, title, text }) => <article key={title} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 18, padding: 20 }}><Icon color="var(--teal)" size={22} /><h2 style={{ fontSize: 18, margin: '12px 0 8px' }}>{title}</h2><p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{text}</p></article>)}</div>
        <section style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><div><div style={{ color: 'var(--teal)', fontSize: 12, fontWeight: 700 }}>SAMPLE CASE · NOT A REAL PERSON</div><h2 style={{ margin: '8px 0 4px' }}>Recurring fatigue and appointment preparation</h2><p style={{ color: 'var(--text-secondary)', margin: 0 }}>Patient-reported concern · timeline and records organized for discussion</p></div><div style={{ alignSelf: 'center', color: 'var(--teal)', fontWeight: 700 }}>Case readiness 75%</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 22 }}><div><h3 style={{ fontSize: 15 }}>What is known</h3><p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>Symptoms began several months ago; a prior report was described as within its stated reference range.</p></div><div><h3 style={{ fontSize: 15 }}>What is uncertain</h3><p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>The timeline, medication context, and clinician-confirmed findings need review.</p></div><div><h3 style={{ fontSize: 15 }}>Questions to discuss</h3><p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>Which findings matter most, what information is missing, and what would make symptoms urgent?</p></div></div>
          <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: 'rgba(245, 158, 11, .1)', color: 'var(--text-secondary)' }}><strong>Safety:</strong> This demonstration is organizational information only. It is not medical advice and should not be used for emergencies.</div>
        </section>
      </div>
    </main>
  );
}
