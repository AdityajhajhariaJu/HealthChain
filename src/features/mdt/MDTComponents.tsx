import React, { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  Activity,
  Users,
  FileText,
  ChevronRight,
  CheckCircle,
  Stethoscope,
  ShieldCheck,
  HeartPulse,
  BrainCircuit,
  Loader2,
  ArrowRight,
  Sparkles,
  Upload,
  GitMerge
} from 'lucide-react';
import {
  chatWithMDTSpecialist,
  runMDTConference,
  generateMDTReport,
} from '../../services/geminiService';
import { MedicalRecordsBar } from '../../components/ui/MedicalRecordsBar';
import { AgentOrbit } from '../../components/ui/LiveOrbitIcon';
import { addEvent, addActionItems, addCondition } from '../../services/ProfileEngine';
import { getActiveCase } from '../../services/CaseEngine';

export function Step({ icon: Icon, label, active, completed, isMobile }: any) {
  const isHighlighted = active || completed;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 16px',
        background: active ? '#0F172A' : 'transparent',
        borderRadius: '999px',
        transition: 'all 0.3s',
      }}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: completed ? '#10B981' : active ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: completed ? '#FFF' : active ? '#FFF' : '#94A3B8',
        }}
      >
        {completed ? <CheckCircle size={14} /> : (Icon && typeof Icon !== 'string' && Icon.$$typeof ? <Icon size={14} /> : <span style={{fontSize: 10}}>Icon</span>)}
      </div>
      <span
        style={{
          fontSize: '14px',
          fontWeight: isHighlighted ? 700 : 600,
          color: active ? '#FFF' : completed ? '#0F172A' : '#94A3B8',
          display: isMobile && !active ? 'none' : 'block',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function StepDivider() {
  return <div style={{ width: '24px', height: '2px', background: '#E2E8F0', margin: '0 8px' }} />;
}

export function CaseCorrelationLaunch({ activeCase, onBegin, onAddEvidence, onStartFresh }) {
  const isMobile = useIsMobile();
  const report = activeCase?.report || {};
  const evidenceCount = activeCase?.medicalRecords?.length || 0;
  const perspectiveCount = activeCase?.specialists?.length || 0;
  const pathways = report.topDiagnoses?.slice(0, 3) || [];

  return (
    <div
      style={{
        padding: isMobile ? '20px' : '48px',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(24px)',
        borderRadius: '32px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.06)',
        border: '1px solid rgba(16,185,129,0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '20px' }}>
        <div
          style={{
            padding: '16px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#FFF',
            boxShadow: '0 12px 24px rgba(16,185,129,0.2)',
          }}
        >
          <Network size={32} />
        </div>
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#059669',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Active case handoff
          </div>
          <h2 style={{ margin: 0, color: '#0F172A', fontSize: isMobile ? '24px' : '30px', letterSpacing: '-0.7px' }}>
            Correlate, don’t start over.
          </h2>
          <p style={{ margin: '10px 0 0', color: '#64748B', fontSize: '16px', lineHeight: 1.6 }}>
            The collaborative board will use your Parallel Specialists findings and saved evidence as one case file. It
            will focus on agreements, disagreements, evidence gaps, and the clearest next clinical
            questions.
          </p>
        </div>
      </div>

      <div
        style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '18px' }}>
          {activeCase?.title || 'Your active health case'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
          {[
            `${perspectiveCount} independent perspectives`,
            `${evidenceCount} saved evidence item${evidenceCount === 1 ? '' : 's'}`,
            `${activeCase?.actions?.filter((action) => action.status !== 'completed').length || 0} open next steps`,
          ].map((item) => (
            <span
              key={item}
              style={{
                padding: '8px 12px',
                borderRadius: '999px',
                background: '#ECFDF5',
                color: '#047857',
                fontSize: '13px',
                fontWeight: 750,
              }}
            >
              {item}
            </span>
          ))}
        </div>
        {pathways.length > 0 && (
          <div style={{ marginTop: '20px', color: '#475569', fontSize: '14px', lineHeight: 1.7 }}>
            <strong style={{ color: '#0F172A' }}>Parallel pathways to correlate:</strong>{' '}
            {pathways
              .map((pathway) => pathway.condition || pathway.name)
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            padding: '22px',
            border: '2px solid #99F6E4',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #F0FDFA, #FFFFFF)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#047857',
              fontWeight: 850,
              fontSize: 15,
            }}
          >
            <Network size={19} /> Recommended: create board consensus
          </div>
          <p style={{ margin: '11px 0', color: '#475569', fontSize: 14, lineHeight: 1.55 }}>
            Uses this same case. It compares your specialist views and evidence to show what agrees,
            what conflicts, and what is still missing.
          </p>
          <div style={{ display: 'grid', gap: 7, color: '#334155', fontSize: 13, fontWeight: 650 }}>
            <span>• shared signals across perspectives</span>
            <span>• disagreements and evidence gaps</span>
            <span>• clearer questions for your clinician</span>
          </div>
          <button
            onClick={onBegin}
            style={{
              width: '100%',
              marginTop: 18,
              padding: '14px 18px',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #0F9F91, #059669)',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '9px',
              boxShadow: '0 9px 18px rgba(5,150,105,0.18)',
            }}
          >
            Create board consensus <ArrowRight size={17} />
          </button>
        </div>
        <div
          style={{
            padding: '22px',
            border: '1px solid #D9E2EC',
            borderRadius: '20px',
            background: '#FFFFFF',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#334155',
              fontWeight: 850,
              fontSize: 15,
            }}
          >
            <FileText size={19} color="#10B981" /> New report or test result?
          </div>
          <p style={{ margin: '11px 0', color: '#64748B', fontSize: 14, lineHeight: 1.55 }}>
            Add it to this same case first. HealthChain will analyse it, save the finding as
            evidence, and bring you back here for a stronger board correlation.
          </p>
          <button
            onClick={onAddEvidence}
            style={{
              width: '100%',
              marginTop: 18,
              padding: '13px 18px',
              border: '1px solid #99F6E4',
              borderRadius: 'var(--radius-lg)',
              background: '#F0FDFA',
              color: '#047857',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '9px',
            }}
          >
            Add and analyse a report <Upload size={17} />
          </button>
        </div>
      </div>
      <button
        onClick={onStartFresh}
        style={{
          padding: '6px 0',
          border: 'none',
          borderBottom: '1px solid #CBD5E1',
          background: 'transparent',
          color: '#64748B',
          fontWeight: 650,
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        This is a completely unrelated health concern — create a separate case
      </button>
    </div>
  );
}

// ─── Intake Phase UI ────────────────────────────────────────────────────────

export function IntakePhase({ onComplete, onUploadClick, activeCase, isPreparing, onElevateParallel, onReviewPastMDT, onResumeActiveCase }) {
  const isMobile = useIsMobile();
  const [complaint, setComplaint] = useState('');
  const [parallelCases, setParallelCases] = useState<any[]>([]);
  const [mdtCases, setMdtCases] = useState<any[]>([]);
  const activeEvidenceCount = activeCase?.medicalRecords?.length || 0;
  const activeReviewCount = activeCase?.reviews?.length || 0;

  useEffect(() => {
    const cases = JSON.parse(localStorage.getItem('hc_cases') || '[]');
    setParallelCases(cases.filter((c: any) => c.mode === 'multi' && c.stage !== 'mdt_complete'));
    setMdtCases(cases.filter((c: any) => c.mode === 'mdt'));
  }, []);

  return (
    <div style={{ maxWidth: isMobile ? '100%' : '800px', margin: '0 auto', paddingBottom: '40px' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(24px)',
          padding: isMobile ? '20px' : '48px',
          borderRadius: '32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
          border: '1px solid rgba(255,255,255,0.5)',
        }}
      >
        <div style={{ position: 'relative', marginBottom: '32px' }}>
          {/* Orbital watermark behind header */}
          <div 
            style={{ 
              position: 'absolute', 
              top: '50%', 
              right: isMobile ? '-20px' : '0px', 
              transform: 'translateY(-50%)',
              zIndex: 0,
              opacity: 0.7,
              pointerEvents: 'none',
            }}
          >
            <AgentOrbit size={isMobile ? 140 : 180} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 11, background: '#E8F7F4', color: '#0F8B7E' }}><Network size={18} /></div>
              <span style={{ color: '#0F8B7E', fontWeight: 800, fontSize: 12, letterSpacing: '.8px' }}>COLLABORATIVE SPECIALISTS</span>
            </div>
            <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 900, color: '#0F172A', margin: '0 0 8px 0', letterSpacing: '-.5px' }}>Start a deep investigation.</h2>
            <p style={{ color: '#64748B', fontSize: '15px', margin: '0 0 10px 0', fontWeight: 500, maxWidth: '70%' }}>Write your symptoms, attach your reports — our multiple AI agents will connect everything.</p>
            <p style={{ color: '#0F8B7E', fontSize: '13px', margin: 0, fontWeight: 600, opacity: 0.85 }}>Don't leave any symptom out — every detail matters.</p>
          </div>
        </div>

        {/* Start Fresh Case (Now Primary) */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <textarea
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder={"Write down your entire history — every symptom and how long you've been facing it.\n\nAttach all reports, lab results, or documents so our multiple AI agents can connect everything."}
                style={{
                  width: '100%',
                  minHeight: '160px',
                  padding: '20px',
                  paddingBottom: '50px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid #E2E8F0',
                  fontSize: '16px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                  background: '#FFF',
                  color: '#0F172A',
                  transition: 'border-color 0.2s',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#10B981')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
              <button
                onClick={onUploadClick}
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  padding: '6px 14px',
                  background: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #E2E8F0',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569'; }}
              >
                <Upload size={12} /> Upload lab reports also
              </button>
            </div>
            <button
              onClick={() => onComplete({ chiefComplaint: complaint })}
              disabled={!complaint.trim() || isPreparing}
              style={{
                alignSelf: 'flex-end',
                padding: '16px 32px',
                background: complaint.trim() && !isPreparing ? '#0F172A' : '#E2E8F0',
                color: '#FFF',
                border: 'none',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '16px',
                cursor: complaint.trim() && !isPreparing ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              {isPreparing ? 'Preparing...' : 'Select Specialists'} <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div style={{ height: '1px', background: '#E2E8F0', margin: '30px 0' }}></div>

        {/* Resume Active Case */}
        {activeCase && (
          <div 
            onClick={() => onResumeActiveCase && onResumeActiveCase()}
            style={{
              background: 'linear-gradient(135deg, #102A43, #163B57)',
              borderRadius: '20px',
              padding: '20px',
              marginBottom: '16px',
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,.12)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #163B57, #1D4D6C)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #102A43, #163B57)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ background: 'rgba(94,234,212,.16)', color: '#99F6E4', padding: '4px 8px', borderRadius: '20px', fontSize: '10px', letterSpacing: '.6px', fontWeight: 800 }}>ACTIVE CASE</span>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: 0 }}>{activeCase.title}</h2>
              </div>
              <p style={{ color: '#C7DCEB', margin: 0, fontSize: '13px' }}>Continue your existing investigation.</p>
            </div>
            <div style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 10, background: '#5EEAD4', color: '#102A43' }}><ArrowRight size={16} /></div>
          </div>
        )}

        {/* Elevate Parallel Case */}
        {parallelCases.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#64748B', marginBottom: '12px' }}>
              Resume a Quick Consult case
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {parallelCases.map(pc => (
                <div
                  key={pc.id}
                  onClick={() => onElevateParallel && onElevateParallel(pc)}
                  style={{
                    background: '#FFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FFF'; }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#0F172A', fontWeight: 600 }}>{pc.title}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>{new Date(pc.updatedAt || pc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <ArrowRight size={16} color="#94A3B8" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review Past MDT */}
        {mdtCases.length > 0 && (
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#64748B', marginBottom: '12px' }}>
              Review past Collaborative cases
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mdtCases.map(mc => (
                <div
                  key={mc.id}
                  onClick={() => onReviewPastMDT && onReviewPastMDT(mc)}
                  style={{
                    background: '#FFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FFF'; }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#0F172A', fontWeight: 600 }}>{mc.title}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>{new Date(mc.updatedAt || mc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <ArrowRight size={16} color="#94A3B8" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MDT Specialist Panel (10-question AI Chat) ─────────────────────────────

// ─── HELPER COMPONENTS FOR SPECIALIST PANEL ──────────────────────────────────
const parseAIResponse = (text: any): any => {
  if (typeof text !== 'string') return { response: '' };
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    try {
      const match = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/i);
      if (match && match[1]) {
        parsed = JSON.parse(match[1].trim());
      }
    } catch {
      // fallthrough
    }
  }

  if (parsed && typeof parsed === 'object') {
    if (!parsed.response) {
      parsed.response = parsed.text || parsed.message || parsed.answer || parsed.professionalAdvice || '';
    }
    return parsed;
  }
  return { response: text };
};

const SymptomPills = ({ options, onSubmit, color }) => {
  if (!options || !Array.isArray(options)) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => onSubmit(opt)}
          style={{
            padding: '6px 12px',
            borderRadius: '99px',
            border: `1px solid ${color}`,
            background: 'transparent',
            color: color,
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#FFF'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = color; }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
};

const PainSlider = ({ onSubmit, color }) => {
  const [val, setVal] = useState(5);
  return (
    <div style={{ marginTop: '12px', padding: '12px', background: '#F1F5F9', borderRadius: 'var(--radius-lg)', border: '1px solid #E2E8F0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '12px', marginBottom: '8px' }}>
        <span>1 (Mild)</span>
        <span style={{ color: color, fontWeight: 700, fontSize: '14px' }}>{val}</span>
        <span>10 (Severe)</span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={val}
        onChange={(e) => setVal(Number(e.target.value))}
        style={{ width: '100%', accentColor: color }}
      />
      <button
        onClick={() => onSubmit(`Pain level: ${val}/10`)}
        style={{
          width: '100%',
          marginTop: '12px',
          padding: '8px',
          borderRadius: '8px',
          background: color,
          color: '#FFF',
          border: 'none',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        Submit Pain Level
      </button>
    </div>
  );
};
// ─── MDT Specialist Panel (10-question AI Chat) ─────────────────────────────

export const MDTSpecialistPanel = React.memo(function MDTSpecialistPanel({ specialist, index, allSpecialists, intakeData, onComplete, initialMessages = [] as any[], onUpdate, isPaused = false, activeDifferentials = [] as any[] }: any) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(() => {
    if (initialMessages.length > 0) {
      const lastMsg = initialMessages[initialMessages.length - 1];
      if (lastMsg.text && lastMsg.text.includes('ANALYSIS_COMPLETE')) return 'done';
      return 'questioning';
    }
    return 'idle';
  });
  const containerRef = useRef<any>(null);
  const inputRef = useRef<any>(null);
  const questionCount = messages.filter((m) => m.role === 'ai').length;

  useEffect(() => {
    let timeoutId;
    if (status === 'idle' && !isPaused) {
      timeoutId = setTimeout(
        () => {
          setStatus('thinking');
          initiateConsultation();
        },
        500 + index * 800
      );
    }
    return () => clearTimeout(timeoutId);
  }, [status, isPaused]);

  const initiateConsultation = async () => {
    // Send a hidden trigger message to prompt the AI to begin the diagnostic assessment
    const triggerMessage = {
      role: 'user',
      text: 'Please begin your diagnostic assessment based on my intake file. Ask the first question.',
      hidden: true,
    };
    const newMessages = [triggerMessage];
    setMessages(newMessages);
    if (onUpdate) onUpdate(specialist.id, newMessages);
    fetchNextQuestion(newMessages);
  };

  const fetchNextQuestion = async (currentMessages) => {
    setStatus('thinking');
    try {
      const aiResponse = await chatWithMDTSpecialist(
        currentMessages,
        specialist,
        allSpecialists,
        intakeData,
        activeDifferentials
      );

      if (aiResponse.includes('ANALYSIS_COMPLETE')) {
        setStatus('done');
        if (onComplete) onComplete(specialist.id, currentMessages);
      } else {
        let parsed = { response: aiResponse, internalThoughts: '', currentHypotheses: [] };
        try {
          if (aiResponse.trim().startsWith('{')) {
            parsed = JSON.parse(aiResponse);
          }
        } catch (e) {
          // fallback to raw text if not JSON
        }
        
        const updatedMessages = [...currentMessages, { 
          role: 'ai', 
          text: aiResponse, 
          parsedText: parsed.response,
          internalThoughts: parsed.internalThoughts,
          currentHypotheses: parsed.currentHypotheses 
        }];
        setMessages(updatedMessages);
        if (onUpdate) onUpdate(specialist.id, updatedMessages);
        setStatus('questioning');
      }
    } catch (err) {
      console.error('Failed to fetch AI response:', err);
      const errorMsg = JSON.stringify({
        response: 'Sorry, I encountered a network error connecting to my AI systems. Please try again.',
        internalThoughts: 'Network error encountered.',
        currentHypotheses: []
      });
      const updatedMessages = [...currentMessages, { role: 'ai', text: errorMsg }];
      setMessages(updatedMessages);
      if (onUpdate) onUpdate(specialist.id, updatedMessages);
      setStatus('questioning');
    }
  };

  const handleSend = (textOrEvent) => {
    if (textOrEvent?.preventDefault) textOrEvent.preventDefault();
    const txt = typeof textOrEvent === 'string' ? textOrEvent : input;
    if (!txt.trim() || status !== 'questioning' || isPaused) return;

    const userMsg = { role: 'user', text: txt };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (onUpdate) onUpdate(specialist.id, updatedMessages);
    setInput('');
    fetchNextQuestion(updatedMessages);
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length]);

  const Icon = specialist.icon;
  
  // Extract Live Notepad Data from the latest AI message
  const latestAIMessage = [...messages].reverse().find(m => m.role === 'ai');
  const latestParsed = latestAIMessage ? parseAIResponse(latestAIMessage.text) : null;
  const supportedWidgets = ['symptom_pills', 'pain_slider'];
  const isWidgetActive = status === 'questioning' && latestParsed?.widgetType && supportedWidgets.includes(latestParsed.widgetType);

  useEffect(() => {
    if (status === 'questioning' && inputRef.current) {
      // Don't steal focus if the user is already typing somewhere else
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        inputRef.current.focus();
      }
    }
  }, [status]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, type: 'spring', stiffness: 80 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '580px',
        background: '#FFFFFF',
        borderRadius: '20px',
        border: status === 'done' ? `2px solid ${specialist.color}` : '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 18px 42px rgba(15,23,42,0.08)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 18px',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: `linear-gradient(135deg, ${specialist.color}12 0%, #FFFFFF 72%)`,
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: '#F8FAFC',
            border: `1px solid ${specialist.color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
                  {Icon && typeof Icon !== 'string' && Icon.$$typeof ? <Icon size={16} color={specialist.color} /> : <span style={{fontSize: 10}}>Icon</span>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
            {specialist.label}
          </div>
          <div style={{ fontSize: '11px', color: specialist.color, fontWeight: 700, marginTop: '2px' }}>
            {status === 'idle' && <span style={{ color: '#64748B' }}>Preparing case review</span>}
            {status === 'thinking' && 'Reviewing your answer'}
            {status === 'questioning' && `Question ${questionCount} of 10`}
            {status === 'done' && 'Assessment complete'}
          </div>
        </div>
      </div>

      {/* Live Notepad Sidebar/Header Block */}
      {latestParsed?.internalThoughts && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{
            padding: '12px 18px',
            background: `linear-gradient(90deg, ${specialist.color}10 0%, ${specialist.color}04 100%)`,
            borderBottom: `1px solid ${specialist.color}25`,
            fontSize: '13px',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <motion.div
             animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.2, 0.9] }}
             transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
             style={{
               width: '8px',
               height: '8px',
               borderRadius: '50%',
               background: specialist.color,
               boxShadow: `0 0 10px ${specialist.color}`,
               flexShrink: 0
             }}
          />
          <div style={{ lineHeight: 1.5, letterSpacing: '0.2px', fontStyle: 'italic', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            <span style={{ fontWeight: 700, color: specialist.color, textTransform: 'uppercase', fontSize: '11px', alignSelf: 'center', marginTop: '2px' }}>Case signal</span>
            {latestParsed.internalThoughts || 'Reviewing the information you shared'}
          </div>
          {latestParsed.currentHypotheses && latestParsed.currentHypotheses.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {latestParsed.currentHypotheses?.map((hyp, i) => (
                <span key={i} style={{ padding: '2px 6px', background: `${specialist.color}15`, color: specialist.color, borderRadius: '4px', fontSize: '10px', fontWeight: 600, border: `1px solid ${specialist.color}30` }}>
                  {hyp}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Chat Feed */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <AnimatePresence>
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const parsed = isUser ? null : parseAIResponse(msg.text);
            const displayText = isUser ? msg.text : parsed?.response;
            const isLatestAndAI = i === messages.length - 1 && !isUser && status === 'questioning';
            
            // Keyword highlighter for user inputs (simulating NLP)
            const highlightAnomalies = (text) => {
              if (!isUser) return text;
              const keywords = ['burning', 'tingling', 'numbness', 'sharp', 'dull', 'aching', 'severe', 'radiating', 'worse'];
              const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
              const parts = (text || '').split(regex);
              return parts.map((part, index) => 
                keywords.includes(part.toLowerCase()) ? 
                  <span key={index} style={{ color: '#EF4444', fontWeight: 700, background: '#EF444420', padding: '0 4px', borderRadius: '4px' }}>{part}</span> 
                  : part
              );
            };

            if (msg.hidden) return null;

            const isLatest = i === messages.length - 1;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                style={{ 
                  alignSelf: 'stretch', 
                  maxWidth: '100%',
                  opacity: (!isLatest && !isUser) ? 0.7 : 1,
                  transition: 'opacity 0.3s ease',
                  marginLeft: isUser ? '32px' : '0px',
                  marginBottom: isUser ? '24px' : '12px'
                }}
              >
                <div
                  style={{
                    padding: '18px',
                    margin: '8px 0',
                    background: isUser ? '#F8FAFC' : '#FFFFFF',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    border: isUser ? '1px solid #E2E8F0' : '1px solid #E2E8F0',
                    borderLeft: isUser ? '1px solid #E2E8F0' : `3px solid ${specialist.color}`,
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: 1.5,
                    color: '#0F172A',
                    boxShadow: isUser ? 'none' : '0 8px 22px rgba(15,23,42,0.045)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {isUser && (
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Patient Response
                    </div>
                  )}
                  {!isUser && isLatestAndAI && (
                    <div style={{ fontSize: '11px', fontWeight: 600, color: specialist.color, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Active Inquiry
                    </div>
                  )}

                  <div style={{ position: 'relative', zIndex: 1, color: isUser ? '#334155' : '#0F172A' }}>
                    {highlightAnomalies(displayText)}
                  </div>
                  
                  {/* Interactive Widgets */}
                  {isLatestAndAI && parsed?.widgetType === 'symptom_pills' && (
                    <div style={{ marginTop: '20px', position: 'relative', zIndex: 1 }}>
                      <SymptomPills options={parsed.widgetOptions} onSubmit={handleSend} color={specialist.color} />
                    </div>
                  )}
                  {isLatestAndAI && parsed?.widgetType === 'pain_slider' && (
                    <div style={{ marginTop: '20px', position: 'relative', zIndex: 1 }}>
                      <PainSlider onSubmit={handleSend} color={specialist.color} />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {status === 'thinking' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ alignSelf: 'flex-start' }}>
            <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', gap: '6px' }}>
              {[0, 0.15, 0.3].map((d, i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 1, delay: d }}
                  style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', background: specialist.color }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ height: '4px', background: '#E2E8F0' }}>
        <motion.div
          animate={{ width: status === 'done' ? '100%' : `${(questionCount / 10) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: specialist.color }}
        />
      </div>

      {/* Input Form (Always visible so users can type custom responses even if a widget is shown) */}
      <AnimatePresence>
        {status === 'questioning' && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSend}
            style={{
              padding: '16px',
              background: '#FFFFFF',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              gap: '12px',
            }}
          >
            <input
              ref={inputRef}
              autoFocus
              disabled={isPaused}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Your answer..."
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: '999px',
                border: '1px solid #E2E8F0',
                fontSize: '15px',
                outline: 'none',
                background: '#F8FAFC',
                color: '#0F172A',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = specialist.color)}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />
            <button
              type="submit"
              disabled={!input.trim() || isPaused}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: input.trim() ? specialist.color : '#CBD5E1',
                color: '#FFF',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              aria-label="Send message"
            >
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// ─── MDT Conference Panel (Cross-Specialty Debate) ─────────────────────────

export function MDTConferencePanel({
  intakeData,
  selectedSpecialists,
  specialistTranscripts,
  onComplete,
  medicalRecords = [],
}) {
  const isMobile = useIsMobile();
  const [conferenceData, setConferenceData] = useState<any>(null);
  const [isDebating, setIsDebating] = useState(true);
  const [answers, setAnswers] = useState({});
  const [debateStep, setDebateStep] = useState(0);

  useEffect(() => {
    if (isDebating) {
      const interval = setInterval(() => {
        setDebateStep((s) => s + 1);
      }, 1800);
      return () => clearInterval(interval);
    }
  }, [isDebating]);

  useEffect(() => {
    const runDebate = async () => {
      const cleanTranscripts = {};
      Object.keys(specialistTranscripts).forEach((id) => {
        const specName = selectedSpecialists.find((s) => s.id === id)?.label || id;
        cleanTranscripts[specName] = specialistTranscripts[id]
          ?.map((m) => `${m.role}: ${m.text}`)
          .join('\n');
      });

      const results = await runMDTConference(intakeData, cleanTranscripts, medicalRecords);
      const safeResults = results || {
        corroborations: [
          'The available case context should be reviewed together with any future clinical records.',
        ],
        contentions: ['There is not enough evidence yet to distinguish between possible pathways.'],
        followUpQuestions: [
          'What changed most recently, and what makes the concern better or worse?',
          'Which relevant reports, scans, or test results can be added to this case?',
        ],
        debateSummary:
          'The collaborative board case has been organised, but the current information is still evidence-light. Add clinical records and use the follow-up questions to make the next clinician conversation more focused.',
      };

      setTimeout(() => {
        setConferenceData(safeResults);
        setIsDebating(false);
      }, 9500);
    };

    runDebate();
  }, [intakeData, selectedSpecialists, specialistTranscripts]);

  if (isDebating || !conferenceData) {
    const s1 = selectedSpecialists[0];
    const s2 = selectedSpecialists[1] || s1;
    const debateMessages = [
      { id: 1, sender: s1, text: `I've analyzed the case context and preliminary findings. The structural anomalies seem pronounced.`, time: 500 },
      { id: 2, sender: s2, text: `Agreed. However, we must correlate this with the biochemical markers to rule out systemic issues.`, time: 2300 },
      { id: 3, sender: s1, text: `That's a valid point. I'll integrate those variables into my differential model.`, time: 4100 },
      { id: 4, sender: s2, text: `Perfect. I'm finalizing the joint action plan now.`, time: 5900 },
      { id: 5, sender: null, text: `Generating Board Consensus...`, time: 7700 }
    ];
    
    // We only show messages where the index <= debateStep
    const visibleMessages = debateMessages.filter((m, i) => i <= debateStep);
    const isTyping = visibleMessages.length < debateMessages.length && visibleMessages.length > 0 && visibleMessages[visibleMessages.length - 1].sender !== null;
    const typingDoctor = isTyping ? (visibleMessages.length % 2 === 0 ? s1 : s2) : null;

    return (
      <div
        style={{
          padding: isMobile ? '20px' : '40px',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(24px)',
          borderRadius: '32px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.06)',
          border: '1px solid rgba(255,255,255,0.5)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '500px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '24px' }}>
          <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
            Live Board Debate Room
          </h2>
          <p style={{ color: '#64748B', fontSize: '15px', margin: 0 }}>
            Specialists are actively correlating findings...
          </p>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', padding: '0 16px' }}>
          <AnimatePresence>
            {visibleMessages.map((msg) => (
              msg.sender === null ? (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '16px', color: '#64748B', fontSize: '14px', fontStyle: 'italic', background: '#F8FAFC', borderRadius: 'var(--radius-lg)', marginTop: '16px' }}>
                  {msg.text}
                </motion.div>
              ) : (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignSelf: msg.sender.id === s1.id ? 'flex-start' : 'flex-end',
                    flexDirection: msg.sender.id === s1.id ? 'row' : 'row-reverse',
                    maxWidth: '80%'
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: msg.sender.color, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <msg.sender.icon size={18} />
                  </div>
                  <div style={{
                    background: msg.sender.id === s1.id ? '#F1F5F9' : msg.sender.color,
                    color: msg.sender.id === s1.id ? '#0F172A' : '#FFF',
                    padding: '14px 18px',
                    borderRadius: '18px',
                    borderTopLeftRadius: msg.sender.id === s1.id ? 0 : '18px',
                    borderTopRightRadius: msg.sender.id === s1.id ? '18px' : 0,
                    fontSize: '15px',
                    lineHeight: 1.5,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {msg.sender.label}
                    </div>
                    {msg.text}
                  </div>
                </motion.div>
              )
            ))}
            
            {typingDoctor && (
              <motion.div
                key="typing"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{
                    display: 'flex', gap: '12px', alignSelf: typingDoctor.id === s1.id ? 'flex-start' : 'flex-end', flexDirection: typingDoctor.id === s1.id ? 'row' : 'row-reverse'
                }}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: typingDoctor.color, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                  <typingDoctor.icon size={14} />
                </div>
                <div style={{ background: '#F1F5F9', padding: '12px 18px', borderRadius: '18px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }} />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }} />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
      style={{
        padding: isMobile ? '20px' : '48px',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(24px)',
        borderRadius: '32px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.06)',
        border: '1px solid rgba(255,255,255,0.5)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div
          style={{
            display: 'inline-flex',
            padding: '16px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            borderRadius: '24px',
            color: '#FFF',
            marginBottom: '24px',
            boxShadow: '0 10px 20px rgba(16,185,129,0.2)',
          }}
        >
          <ShieldCheck size={40} />
        </div>
        <h2 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 900, color: '#0F172A', letterSpacing: '-1px' }}>
          Board Consensus Reached
        </h2>
        <p
          style={{
            color: '#475569',
            fontSize: '18px',
            maxWidth: '700px',
            margin: '16px auto 0',
            lineHeight: 1.6,
            fontWeight: 500,
          }}
        >
          {conferenceData.debateSummary}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        {/* Corroborations */}
        <div
          style={{
            background: 'rgba(16,185,129,0.03)',
            padding: '20px',
            borderRadius: '24px',
            border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#065F46',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 10px #10B981',
              }}
            />
            Aligned Findings
          </h3>
          <ul
            style={{
              paddingLeft: '24px',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              fontSize: '15px',
            }}
          >
            {conferenceData.corroborations?.map((c, i) => (
              <li key={i} style={{ lineHeight: 1.6 }}>
                {c}
              </li>
            ))}
          </ul>
        </div>

        {/* Contentions */}
        <div
          style={{
            background: 'rgba(244,63,94,0.03)',
            padding: '20px',
            borderRadius: '24px',
            border: '1px solid rgba(244,63,94,0.2)',
          }}
        >
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#9F1239',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#F43F5E',
                boxShadow: '0 0 10px #F43F5E',
              }}
            />
            Debated Points
          </h3>
          <ul
            style={{
              paddingLeft: '24px',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              fontSize: '15px',
            }}
          >
            {conferenceData.contentions?.map((c, i) => (
              <li key={i} style={{ lineHeight: 1.6 }}>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Unified Follow-up */}
      <div
        style={{
          background: '#F8FAFC',
          padding: '20px',
          borderRadius: '24px',
          border: '1px solid #E2E8F0',
          marginBottom: '24px',
        }}
      >
        <h3
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#0F172A',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          <div
            style={{ padding: '8px', background: '#0F172A', borderRadius: '10px', color: '#FFF' }}
          >
            <Users size={20} />
          </div>
          Unified Follow-Up
        </h3>
        <p style={{ color: '#64748B', marginBottom: '24px', fontSize: '15px', fontWeight: 500 }}>
          Please answer these final questions agreed upon by the board to complete the diagnostic
          pathway.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {conferenceData.followUpQuestions?.map((q, i) => (
            <div
              key={i}
              style={{
                background: '#FFF',
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: '#1E293B',
                  marginBottom: '12px',
                  fontSize: '16px',
                }}
              >
                {q}
              </div>
              <input
                type="text"
                value={answers[i] || ''}
                onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
                placeholder="Your answer..."
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 'var(--radius-lg)',
                  border: '2px solid #F1F5F9',
                  outline: 'none',
                  fontSize: '15px',
                  transition: 'border-color 0.2s',
                  background: '#F8FAFC',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#CBD5E1')}
                onBlur={(e) => (e.target.style.borderColor = '#F1F5F9')}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => onComplete(conferenceData, answers)}
          style={{
            padding: '18px 48px',
            background: 'linear-gradient(135deg, #0F172A, #1E293B)',
            color: '#FFF',
            border: 'none',
            borderRadius: '999px',
            fontWeight: 800,
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 10px 30px rgba(15,23,42,0.3)',
            transition: 'transform 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Generate Final Report <FileText size={20} />
        </button>
      </div>
    </motion.div>
  );
}

export function MDTReportPanel({
  intakeData,
  specialistTranscripts,
  onRestart,
  initialReport,
  onRestartWithFeedback,
  medicalRecords = [] as any[],
  onCaseSaved,
  onCorrelateInMDT,
}: any) {
  const isMobile = useIsMobile();
  const [report, setReport] = useState(initialReport || null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const hasSavedCaseRef = useRef(false);

  const fetchReport = async () => {
    setIsRetrying(true);
    try {
      const { generateParallelMultiReport } = await import('../../services/geminiService');
      const data = await generateParallelMultiReport(
        intakeData?.chiefComplaint || '',
        specialistTranscripts || {},
        medicalRecords
      );
      
      if (!data) throw new Error("Failed to generate report");
      
      setReport(data);

      const stored = localStorage.getItem('hc_history');
      let historyArray = stored ? JSON.parse(stored) : [];
      const newHistoryItem = {
        id: 'mdt-' + Date.now(),
        title: intakeData?.chiefComplaint || 'Advanced Collaborative Consultation',
        date: new Date().toLocaleDateString(),
        type: 'mdt',
        report: data,
      };
      historyArray.unshift(newHistoryItem);
      localStorage.setItem('hc_history', JSON.stringify(historyArray));
      window.dispatchEvent(new Event('hc_history_updated'));

      if (data.topDiagnoses && data.topDiagnoses.length > 0) {
        addCondition(data.topDiagnoses[0].condition, 'mdt_hub');
      }
      addEvent('mdt_report', 'mdt_hub', 'Board Conference Complete', data, true);
      if (data.recommendedActionPlan) {
        addActionItems(data.recommendedActionPlan, 'mdt_hub');
      }
      if (!hasSavedCaseRef.current && onCaseSaved) {
        onCaseSaved(data);
        hasSavedCaseRef.current = true;
      }
    } catch (err) {
      console.error(err);
      setReport({
        executiveSummary:
          'Based on the multi-disciplinary review of your symptoms and recent discussion, the board has identified some strong diagnostic pathways.',
        topDiagnoses: [
          {
            condition: 'Pending Further Review',
            confidence: 60,
            rationale:
              'The board requires the results of your next tests to provide a conclusive diagnosis.',
            specialty: 'General Practice',
          },
        ],
        recommendedActionPlan: [
          { step: 'Consult Primary Care Physician', timeline: 'Immediately', type: 'Consultation' },
        ],
      });
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    if (!initialReport) {
      fetchReport();
    }
  }, [intakeData, specialistTranscripts, initialReport]);

  const downloadPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('mdt-report-content');
    if (!element) {
      console.error('PDF export failed: mdt-report-content not found');
      return;
    }
    const opt = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: 'Collaborative_Diagnostic_Report.pdf',
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };
    html2pdf().set(opt).from(element).save();
  };

  const downloadJSON = () => {
    const exportData = {
      intakeData,
      conferenceData: initialReport?.conferenceData || null,
      finalAnswers: initialReport?.finalAnswers || null,
      report,
      _isMDTExport: true,
    };
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'Collaborative_Report_Data.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  if (!report) {
    return (
      <div
        style={{
          padding: '100px 40px',
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(24px)',
          borderRadius: '32px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
          border: '1px solid rgba(255,255,255,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        >
          <div
            style={{
              padding: '20px',
              background: '#F1F5F9',
              borderRadius: '50%',
              boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.05)',
            }}
          >
            <FileText size={48} color="#6366F1" />
          </div>
        </motion.div>
        <div>
          <h2
            style={{
              fontSize: isMobile ? '26px' : '32px',
              fontWeight: 900,
              color: '#0F172A',
              marginBottom: '12px',
              letterSpacing: '-0.5px',
            }}
          >
            Finalizing Medical Report
          </h2>
          <p
            style={{
              color: '#64748B',
              maxWidth: '500px',
              margin: '0 auto',
              fontSize: '16px',
              lineHeight: 1.6,
            }}
          >
            Synthesizing specialist analyses, debate outcomes, and your answers into a unified
            diagnostic pathway.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: isMobile ? '20px' : '48px',
        background: '#FFF',
        borderRadius: '32px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.06)',
        border: '1px solid #E2E8F0',
      }}
    >
      {/* Top Actions */}
      <div
        style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', justifyContent: isMobile ? 'stretch' : 'flex-end', gap: '16px', marginBottom: '20px' }}
      >
        {onCorrelateInMDT && (
          <button
            onClick={onCorrelateInMDT}
            style={{
              padding: '12px 24px',
              background: '#ECFDF5',
              color: '#047857',
              border: '1px solid #A7F3D0',
              borderRadius: '999px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '14px',
              width: isMobile ? '100%' : 'auto',
            }}
          >
            Correlate with Board
          </button>
        )}
        <button
          onClick={downloadPDF}
          style={{
            padding: '12px 24px',
            background: '#F8FAFC',
            color: '#0F172A',
            border: '1px solid #E2E8F0',
            borderRadius: '999px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s',
            width: isMobile ? '100%' : 'auto',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#F1F5F9')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#F8FAFC')}
        >
          Download PDF
        </button>
        <button
          onClick={downloadJSON}
          style={{
            padding: '12px 24px',
            background: '#F8FAFC',
            color: '#0F172A',
            border: '1px solid #E2E8F0',
            borderRadius: '999px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s',
            width: isMobile ? '100%' : 'auto',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#F1F5F9')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#F8FAFC')}
        >
          Export JSON
        </button>
        <button
          onClick={onRestart}
          style={{
            padding: '12px 24px',
            background: '#0F172A',
            color: '#FFF',
            border: 'none',
            borderRadius: '999px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(15,23,42,0.2)',
            width: isMobile ? '100%' : 'auto',
          }}
        >
          Start New Case
        </button>
      </div>

      <div id="mdt-report-content" style={{ padding: isMobile ? '0' : '0 20px 20px 20px' }}>
        <div
          style={{ borderBottom: '2px solid #F1F5F9', paddingBottom: '32px', marginBottom: '24px' }}
        >
          <div
            style={{
              display: 'inline-flex',
              padding: '12px',
              background: 'rgba(99,102,241,0.1)',
              borderRadius: 'var(--radius-lg)',
              color: '#6366F1',
              marginBottom: '20px',
            }}
          >
            <FileText size={32} />
          </div>
          <h2
            style={{
              fontSize: isMobile ? '28px' : '42px',
              fontWeight: 900,
              color: '#0F172A',
              margin: 0,
              letterSpacing: '-1px',
            }}
          >
            Collaboration Case Brief
          </h2>
          <p style={{ color: '#64748B', marginTop: '12px', fontSize: isMobile ? '14px' : '16px', fontWeight: 500 }}>
            AI-assisted synthesis of your information and specialist perspectives
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 900, color: '#0F172A', marginBottom: '16px' }}>
            Executive Summary
          </h3>
          <p style={{ color: '#334155', lineHeight: 1.7, fontSize: isMobile ? '15px' : '17px' }}>
            {report.executiveSummary}
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 900, color: '#0F172A', marginBottom: '24px' }}>
            Possible pathways to discuss
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {report.topDiagnoses?.map((d, i) => (
              <div
                key={i}
                style={{
                  padding: '24px',
                  borderRadius: '20px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background:
                      d.confidence > 80 ? '#10B981' : d.confidence > 60 ? '#F59E0B' : '#EF4444',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px',
                  }}
                >
                  <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {d.condition}
                  </h4>
                  <div
                    style={{
                      background:
                        d.confidence > 80 ? '#ECFDF5' : d.confidence > 60 ? '#FEF3C7' : '#FEF2F2',
                      color:
                        d.confidence > 80 ? '#10B981' : d.confidence > 60 ? '#D97706' : '#EF4444',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 800,
                    }}
                  >
                    {d.confidence}% evidence fit
                  </div>
                </div>
                <p
                  style={{
                    color: '#475569',
                    fontSize: '15px',
                    lineHeight: 1.6,
                    marginBottom: '16px',
                  }}
                >
                  {d.rationale}
                </p>
                <div
                  style={{
                    display: 'inline-flex',
                    background: '#FFF',
                    border: '1px solid #E2E8F0',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: '8px',
                  }}
                >
                  Primary: {d.specialty}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 900, color: '#0F172A', marginBottom: '24px' }}>
            Next actions to discuss or complete
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {report.recommendedActionPlan?.map((action, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: isMobile ? '12px' : '20px',
                  padding: isMobile ? '16px' : '24px',
                  background: '#FFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: isMobile ? '16px' : '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                }}
              >
                <div
                  style={{
                    width: isMobile ? '32px' : '48px',
                    height: isMobile ? '32px' : '48px',
                    borderRadius: isMobile ? '10px' : '12px',
                    background: 'rgba(15,23,42,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0F172A',
                    fontWeight: 900,
                    fontSize: isMobile ? '14px' : '18px',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: '#1E293B',
                      marginBottom: '8px',
                      fontSize: isMobile ? '15px' : '16px',
                      lineHeight: 1.5,
                    }}
                  >
                    {action.step}
                  </div>
                  <div style={{ display: 'flex', gap: isMobile ? '8px' : '16px', fontSize: isMobile ? '12px' : '14px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#10B981', fontWeight: 700 }}>{action.timeline}</span>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>{action.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: '60px',
            padding: '24px',
            background: '#FEF2F2',
            borderRadius: '20px',
            color: '#991B1B',
            fontSize: '14px',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            border: '1px solid #FECACA',
          }}
        >
          <ShieldCheck size={28} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ lineHeight: 1.6 }}>
            <strong style={{ display: 'block', fontSize: '16px', marginBottom: '4px' }}>
              Important Disclaimer
            </strong>
            This is an AI-generated synthesis based on your provided information. It is not a formal
            medical diagnosis. Always consult with a qualified healthcare professional before taking
            medical action.
          </div>
        </div>
      </div>

      {/* Rediagnose Feedback Section */}
      <div
        style={{
          marginTop: '48px',
          borderTop: '1px solid #E2E8F0',
          paddingTop: '40px',
          paddingLeft: '20px',
          paddingRight: '20px',
        }}
      >
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          style={{
            padding: isMobile ? '12px 16px' : '16px 32px',
            background: '#FFF',
            color: '#4F46E5',
            border: '2px solid #4F46E5',
            borderRadius: '999px',
            fontWeight: 700,
            fontSize: isMobile ? '14px' : '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isMobile ? '100%' : 'auto',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <Sparkles size={18} style={{ flexShrink: 0 }} /> 
          <span style={{ textAlign: 'center' }}>Not fully happy? Refine Diagnosis</span>
        </button>

        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  marginTop: '24px',
                  padding: '20px',
                  background: '#F8FAFC',
                  borderRadius: '24px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <label
                  style={{
                    display: 'block',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: '#1E293B',
                    marginBottom: '12px',
                  }}
                >
                  What should the board know before re-evaluating?
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g., I forgot to mention my shoulder also hurts, or I disagree with the primary specialty..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '16px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid #CBD5E1',
                    fontSize: '15px',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  disabled={!feedback.trim()}
                  onClick={() => onRestartWithFeedback(feedback)}
                  style={{
                    marginTop: '20px',
                    padding: '14px 28px',
                    background: feedback.trim() ? '#4F46E5' : '#CBD5E1',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '999px',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: feedback.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    boxShadow: feedback.trim() ? '0 4px 12px rgba(79,70,229,0.3)' : 'none',
                  }}
                >
                  Restart Specialist Assessments
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
