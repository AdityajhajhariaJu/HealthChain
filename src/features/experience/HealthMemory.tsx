import { useEffect, useMemo, useState } from 'react';
import { Brain, CalendarDays, CheckCircle2, Cloud, FileText, Heart, Utensils, Users, Pill, FlaskConical, Cpu, BookOpen, Sparkles } from 'lucide-react';
import { getHealthMemory, HealthMemoryItem, syncHealthMemoryFromSupabase } from '../../services/HealthMemory';
import { getProfile } from '../../services/ProfileEngine';

const iconFor = (kind: HealthMemoryItem['kind']) => {
  if (kind === 'lab_report') return FileText;
  if (kind === 'diet') return Utensils;
  if (kind === 'health_buddy') return Heart;
  if (kind === 'deep_collab') return Users;
  if (kind === 'pharmacy') return Pill;
  if (kind === 'research') return FlaskConical;
  if (kind === 'jarvis_analysis') return Cpu;
  if (kind === 'discussion_guide') return BookOpen;
  return Brain;
};

const labelFor = (kind: HealthMemoryItem['kind']) => ({
  case_prep: 'Case preparation',
  quick_consult: 'Quick Consult',
  deep_collab: 'Collaborative brief',
  lab_report: 'Lab report',
  diet: 'Diet',
  health_buddy: 'Ava Health Buddy',
  profile_event: 'Health profile',
  pharmacy: 'Medication & Pharmacy',
  research: 'Clinical Trials & Evidence',
  jarvis_analysis: 'J.A.R.V.I.S. Root-Cause Analysis',
  discussion_guide: 'Clinical Discussion Guide',
}[kind] || kind);

function formatTranscript(value: any[]) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '300px', overflowY: 'auto' }}>
      {value.map((msg: any, i: number) => (
        <div key={i} style={{ 
          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
          background: msg.role === 'user' ? '#0F766E' : '#F1F5F9',
          color: msg.role === 'user' ? '#FFF' : '#334155',
          padding: '8px 12px',
          borderRadius: '12px',
          borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
          borderBottomLeftRadius: msg.role === 'ai' || msg.role === 'system' ? '4px' : '12px',
          maxWidth: '85%',
          fontSize: '13px'
        }}>
          {msg.text || msg.content || JSON.stringify(msg)}
        </div>
      ))}
    </div>
  );
}

function formatGenericObject(obj: any): React.ReactNode {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return String(obj);
  
  if (Array.isArray(obj)) {
    return (
      <ul style={{ margin: '4px 0 0', paddingLeft: '20px', color: '#475569' }}>
        {obj.map((item, i) => (
          <li key={i}>{formatGenericObject(item)}</li>
        ))}
      </ul>
    );
  }

  return (
    <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} style={{ fontSize: '13px' }}>
          <strong style={{ color: '#475569', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1').trim()}: </strong>
          <span style={{ color: '#334155' }}>{typeof v === 'object' ? formatGenericObject(v) : String(v)}</span>
        </div>
      ))}
    </div>
  );
}

function PayloadFormatter({ payload }: { payload: any }) {
  if (!payload || typeof payload !== 'object') return null;
  const keys = Object.keys(payload);
  if (keys.length === 0) return <div style={{ padding: 12, fontSize: 13, color: '#64748b' }}>No additional details saved.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10, padding: '14px 16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 13, color: '#334155' }}>
      {keys.map((key) => {
        const value = payload[key];
        if (value === null || value === undefined || value === '') return null;
        
        let displayValue: React.ReactNode = String(value);
        
        if (key.toLowerCase().includes('transcript') || key === 'messages') {
           displayValue = Array.isArray(value) ? formatTranscript(value) : formatGenericObject(value);
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          displayValue = (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {value.map((d: any, i) => {
                if (d.condition && d.confidence) {
                  return (
                    <span key={i} style={{ background: '#e0e7ff', color: '#3730a3', padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {d.condition} <span style={{ opacity: 0.7, fontSize: '11px' }}>{d.confidence}%</span>
                    </span>
                  );
                }
                const label = d.condition || d.name || d.title || d.label || d.action || d.step || (typeof d === 'string' ? d : 'Item');
                return (
                  <span key={i} style={{ background: '#e0e7ff', color: '#3730a3', padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    {label}
                  </span>
                );
              })}
            </div>
          );
        } else if (typeof value === 'object') {
           displayValue = formatGenericObject(value);
        } else {
           displayValue = <div style={{ marginTop: 2 }}>{String(value)}</div>;
        }

        const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
        return (
          <div key={key}>
            <div style={{ fontWeight: 700, color: '#475569', textTransform: 'capitalize' }}>{formattedKey}</div>
            {displayValue}
          </div>
        );
      })}
    </div>
  );
}

export default function HealthMemory() {
  const [items, setItems] = useState<HealthMemoryItem[]>(getHealthMemory());
  const [filter, setFilter] = useState<'all' | HealthMemoryItem['kind']>('all');
  const profile = getProfile();

  useEffect(() => {
    const refresh = () => setItems(getHealthMemory());
    window.addEventListener('hc_health_memory_updated', refresh);
    syncHealthMemoryFromSupabase().catch(console.error);
    return () => window.removeEventListener('hc_health_memory_updated', refresh);
  }, []);

  const visible = useMemo(() => items.filter(item => filter === 'all' || item.kind === filter), [items, filter]);
  const facts = [
    profile.conditions?.length ? `${profile.conditions.length} condition${profile.conditions.length === 1 ? '' : 's'} recorded` : null,
    profile.medications?.length ? `${profile.medications.length} medication${profile.medications.length === 1 ? '' : 's'} recorded` : null,
    profile.allergies?.length ? `${profile.allergies.length} allerg${profile.allergies.length === 1 ? 'y' : 'ies'} recorded` : null,
  ].filter(Boolean);

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '8px 0 48px' }}>
      <section style={{ padding: '32px', borderRadius: 28, color: '#fff', background: 'linear-gradient(135deg, #0f766e, #115e59 56%, #0f172a)', boxShadow: '0 18px 44px rgba(15, 118, 110, .18)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#ccfbf1', fontWeight: 800, fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase' }}><Brain size={18}/> Private Health Memory</div>
        <h1 style={{ margin: '14px 0 10px', fontSize: 'clamp(30px, 5vw, 46px)', lineHeight: 1.05 }}>Your health story, kept connected.</h1>
        <p style={{ maxWidth: 720, color: '#d1fae5', fontSize: 17, lineHeight: 1.6, margin: 0 }}>HealthChain automatically preserves the useful knowledge created across Case Prep, Quick Consult, collaborative reviews, lab analysis, diet, and Ava—without retaining original uploaded files.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
          <span style={{ padding: '8px 12px', borderRadius: 99, background: 'rgba(255,255,255,.12)', fontSize: 13 }}><Cloud size={14} style={{ verticalAlign: -2, marginRight: 6 }}/>Syncs to your signed-in account</span>
          <span style={{ padding: '8px 12px', borderRadius: 99, background: 'rgba(255,255,255,.12)', fontSize: 13 }}><CheckCircle2 size={14} style={{ verticalAlign: -2, marginRight: 6 }}/>Structured knowledge, not raw files</span>
        </div>
      </section>

      <section style={{ marginTop: 22, padding: 24, borderRadius: 22, background: '#fff', border: '1px solid #e2e8f0' }}>
        <h2 style={{ margin: 0, fontSize: 19 }}>What your profile currently contains</h2>
        <p style={{ color: '#64748b', margin: '7px 0 14px' }}>User-reported and clinician-confirmed information stays clearly separate from AI-organised material.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{facts.length ? facts.map(fact => <span key={fact} style={{ padding: '9px 12px', background: '#f0fdfa', borderRadius: 10, color: '#115e59', fontWeight: 650, fontSize: 13 }}>{fact}</span>) : <span style={{ color: '#64748b' }}>Complete your medical profile to add enduring facts here.</span>}</div>
      </section>

      <section style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end', flexWrap: 'wrap' }}>
          <div><h2 style={{ margin: 0, fontSize: 24 }}>Your timeline</h2><p style={{ margin: '6px 0 0', color: '#64748b' }}>{items.length} saved health memory item{items.length === 1 ? '' : 's'}</p></div>
          <select
            aria-label="Filter health memory by category"
            value={filter}
            onChange={(event) => setFilter(event.target.value as any)}
            style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff' }}
          >
            <option value="all">Everything</option>
            <option value="case_prep">Case Prep</option>
            <option value="quick_consult">Quick Consult</option>
            <option value="deep_collab">Collaborative</option>
            <option value="lab_report">Lab reports</option>
            <option value="diet">Diet</option>
            <option value="health_buddy">Ava</option>
            <option value="pharmacy">Medication & Pharmacy</option>
            <option value="research">Clinical Trials & Evidence</option>
            <option value="jarvis_analysis">J.A.R.V.I.S. Analysis</option>
            <option value="discussion_guide">Discussion Guides</option>
          </select>
        </div>
        <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          {visible.map(item => {
            const Icon = iconFor(item.kind);
            return <article key={item.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: 18, borderRadius: 18, background: '#fff', border: '1px solid #e2e8f0' }}>
              <div style={{ padding: 10, borderRadius: 12, background: '#ecfeff', color: '#0f766e' }}><Icon size={20}/></div>
              <div style={{ minWidth: 0, flex: 1 }}><div style={{ color: '#0f766e', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em' }}>{labelFor(item.kind)}</div><h3 style={{ margin: '4px 0 5px', fontSize: 16 }}>{item.title}</h3><div style={{ color: '#64748b', fontSize: 13 }}><CalendarDays size={14} style={{ verticalAlign: -2, marginRight: 5 }}/>{new Date(item.occurredAt).toLocaleString()}</div><details style={{ marginTop: 12 }}><summary style={{ cursor: 'pointer', color: '#0f766e', fontSize: 13, fontWeight: 700 }}>View saved detail</summary><PayloadFormatter payload={item.payload} /></details></div>
            </article>;
          })}
          {!visible.length && <div style={{ padding: 32, textAlign: 'center', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 18, color: '#64748b' }}>Use HealthChain tools and their meaningful results will appear here automatically.</div>}
        </div>
      </section>
    </div>
  );
}
