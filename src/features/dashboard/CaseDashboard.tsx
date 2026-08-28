import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  GitMerge,
  Network,
  Plus,
  Sparkles,
  Stethoscope,
  Clock,
  Archive,
  Printer,
  ClipboardList
} from 'lucide-react';
import { getCase, getCases, setActiveCase, toggleCaseAction, resolveCase, CaseItem, ReviewSnapshot, fetchCaseFromCloud } from '../../services/CaseEngine';
import { getProfile, verifyProStatus, isProUser } from '../../services/ProfileEngine';
import SnapshotViewer from './SnapshotViewer';
import DDxBoard from './DDxBoard';
import PathwaySimulator from './PathwaySimulator';
import { useIsMobile } from '../../hooks/useIsMobile';
import { ActiveCaseBar } from '../../components/layout/AppShell';
import { CaseConnectionMap } from '../../components/ui/CaseConnectionMap';
import { AlertTriangle, ShieldAlert, FileQuestion, Users, AlertCircle, Star, Lock, Search, HelpCircle, Loader2 } from 'lucide-react';
import { RichReportTemplate, Accordion, cleanClinicalText } from '../../components/ui/RichReportTemplate';
import { NetworkHubIcon } from '../../components/ui/NetworkHubIcon';
import { parseModelJson } from '../../services/modelJson';
import DailySymptomCheckinWidget from './DailySymptomCheckinWidget';
import MindfulHRVCard from '../../components/ui/MindfulHRVCard';
import VitalityPlayground from '../../components/ui/VitalityPlayground';
import LongevityBioStackCard from '../../components/ui/LongevityBioStackCard';
import UpgradeToProCard from '../../components/ui/UpgradeToProCard';

const formatDate = (value: string) => {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
  } catch {
    return 'N/A';
  }
};

export default function CaseDashboard() {
  const [isPremium, setIsPremium] = useState(isProUser());
  useEffect(() => {
    verifyProStatus().then(setIsPremium).catch(() => {});
    const handleProfile = () => setIsPremium(isProUser());
    window.addEventListener('hc_profile_updated', handleProfile);
    return () => window.removeEventListener('hc_profile_updated', handleProfile);
  }, []);

  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { id } = useParams();
  const [cases, setCases] = useState(getCases().filter((c: any) => c.reviews && c.reviews.length > 0));
  const [cloudCase, setCloudCase] = useState<CaseItem | null>(null);
  const [profile, setProfile] = useState(getProfile());
  const [simulatorAction, setSimulatorAction] = useState<any>(null);

  useEffect(() => {
    const refresh = () => {
      setCases(getCases().filter((c: any) => c.reviews && c.reviews.length > 0));
      setProfile(getProfile());
    };
    window.addEventListener('hc_cases_updated', refresh);
    window.addEventListener('hc_profile_updated', refresh);
    return () => {
      window.removeEventListener('hc_cases_updated', refresh);
      window.removeEventListener('hc_profile_updated', refresh);
    };
  }, []);

  useEffect(() => {
    if (id) {
      if (getCase(id)) setActiveCase(id);
      fetchCaseFromCloud(id).then((remoteCase) => {
        if (remoteCase) {
          setCloudCase(remoteCase);
        }
      }).catch(() => {});
    }
  }, [id]);

  const nextActions = useMemo(
    () =>
      cases
        .flatMap((c) =>
          (c.actions || [])
            .filter((a) => a && a.status !== 'completed')
            .slice(0, 2)
            .map((a) => ({ ...a, caseId: c.id, caseTitle: c.title }))
        )
        .slice(0, 4),
    [cases]
  );

  const completed = useMemo(() => cases.reduce(
    (sum, c) => sum + (c.actions || []).filter((a) => a && a.status === 'completed').length,
    0
  ), [cases]);

  if (id) {
    const activeCase = cloudCase || getCase(id);
    if (!activeCase) {
       return (
         <div className="card" style={{ padding: 36, textAlign: 'center', margin: '40px auto', maxWidth: 600 }}>
           <h2>Case not found</h2>
           <button className="btn btn-primary" onClick={() => navigate('/app/today')}>
             Back to Health Today
           </button>
         </div>
       );
    }
    const isJarvisCase = activeCase.currentStage === 'jarvis_complete' || activeCase.reviews?.[0]?.type === 'jarvis' || activeCase.title?.toLowerCase().includes('j.a.r.v.i.s.');
    if (isJarvisCase) {
      return <JarvisCaseWorkspace item={activeCase} navigate={navigate} refresh={() => setCases(getCases().filter((c: any) => c.reviews && c.reviews.length > 0))} />;
    }
    return <CaseWorkspace item={activeCase} navigate={navigate} refresh={() => setCases(getCases().filter((c: any) => c.reviews && c.reviews.length > 0))} />;
  }

  // General dashboard (Health Today)
  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* 1. Hero Full Width Bento */}
      <section
        style={{
          borderRadius: 28,
          padding: isMobile ? '26px 24px' : '38px',
          color: '#fff',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(21,61,69,0.85) 65%, rgba(5,150,105,0.85))',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 8px 32px rgba(15,23,42,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#99f6e4',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: isMobile ? 12 : 16,
          }}
        >
          <Sparkles size={15} /> Your health command centre
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: isMobile ? 18 : 24,
            flexWrap: 'wrap',
            alignItems: 'end',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 28 : 38, letterSpacing: -1.2, lineHeight: 1.1 }}>
              Good to see you
              {profile?.demographics?.name ? ', ' + (profile.demographics.name.split(' ')[0] || 'User') : ''}.
            </h1>
            <p style={{ color: '#cbd5e1', lineHeight: 1.5, maxWidth: 620, margin: '12px 0 0', fontSize: isMobile ? 14 : 16 }}>
              Start with parallel AI specialist perspectives, then bring their findings into a Deep
              Collaborative Specialist review for consensus when your case needs deeper correlation.
            </p>
          </div>
          <button
            className="btn"
            onClick={() => navigate('/app/consult?new=true')}
            style={{ background: '#fff', color: '#0f172a', padding: isMobile ? '12px 16px' : '14px 20px', fontWeight: 800, width: isMobile ? '100%' : 'auto', display: 'flex', justifyContent: 'center', borderRadius: 99 }}
          >
            <Stethoscope size={18} /> Start Quick Consult
          </button>
        </div>
      </section>

      {/* 2. Active Case Full Width Bento */}
      <div>
        <ActiveCaseBar navigate={navigate} />
      </div>

      {/* 3. The Core Bento Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        {/* Row 1: Daily Checkin (8 cols) + Mindful HRV (4 cols) */}
        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 8', display: 'flex', flexDirection: 'column' }}>
          <DailySymptomCheckinWidget />
        </div>
        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 4', display: 'flex', flexDirection: 'column' }}>
          <MindfulHRVCard />
        </div>

        {/* Row 2: Vitality (8 cols) + Pro Upgrade (4 cols) */}
        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 8', display: 'flex', flexDirection: 'column' }}>
          <VitalityPlayground />
        </div>
        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 4', display: 'flex', flexDirection: 'column' }}>
          <UpgradeToProCard isPro={isPremium} />
        </div>

        {/* Row 3: BioStack Full Width */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
          <LongevityBioStackCard />
        </div>

        {/* Row 4: Momentum & Record */}
        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 6', display: 'flex', flexDirection: 'column' }}>
          <section className="card bento-card" style={{ padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 28, flex: 1, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(15,23,42,0.04)' }}>
            <div>
              <div style={{ display: 'flex', gap: isMobile ? 6 : 10, color: '#0D9488', alignItems: 'center' }}>
                <Activity size={isMobile ? 18 : 20} />
                <strong style={{ fontSize: isMobile ? '14px' : '16px' }}>Care momentum</strong>
              </div>
              <div style={{ fontSize: isMobile ? 32 : 40, fontWeight: 850, marginTop: isMobile ? 10 : 16, color: '#0F172A' }}>{completed}</div>
              <p style={{ color: '#475569', margin: 0, fontSize: isMobile ? 12 : 14, lineHeight: 1.3 }}>
                case actions completed
              </p>
            </div>
          </section>
        </div>

        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 6', display: 'flex', flexDirection: 'column' }}>
          <section className="card bento-card" style={{ padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 28, flex: 1, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(15,23,42,0.04)' }}>
            <div>
              <div style={{ display: 'flex', gap: isMobile ? 6 : 10, color: '#0D9488', alignItems: 'center' }}>
                <FileText size={isMobile ? 16 : 19} />
                <strong style={{ fontSize: isMobile ? '14px' : '16px' }}>Health record</strong>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: isMobile ? 4 : 8,
                  margin: isMobile ? '10px 0' : '16px 0',
                }}
              >
                {[1, 2, 3].map((_, i) => (
                  <div key={i} style={{ height: 4, borderRadius: 2, background: i === 0 ? '#0D9488' : 'rgba(13,148,136,0.2)' }} />
                ))}
              </div>
              <p style={{ color: '#475569', margin: 0, fontSize: isMobile ? 12 : 14, lineHeight: 1.3 }}>
                <strong>33%</strong> mapped this year
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function EmptyAction({ navigate }: { navigate: any }) {
  return (
    <div
      style={{
        padding: 28,
        border: '1px dashed #cbd5e1',
        borderRadius: 14,
        color: '#64748b',
        textAlign: 'center',
      }}
    >
      Your next action will appear after a Quick Consult assessment.{' '}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/consult?new=true')}>
        Start one now
      </button>
    </div>
  );
}

function EmptyCase({ navigate }: { navigate: any }) {
  return (
    <div className="card" style={{ padding: 36, textAlign: 'center' }}>
      <Stethoscope size={28} color="#10B981" />
      <h3 style={{ margin: '12px 0 6px' }}>Start your first health case</h3>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 18px' }}>
        A case is the permanent container for your health journey. Add evidence and invite AI specialists to build a clinical picture.
      </p>
      <button className="btn btn-primary" onClick={() => navigate('/app/consult?new=true')}>
        Start Quick Consult <ArrowRight size={16} />
      </button>
    </div>
  );
}

function PrintableDossier({ item, profile }: { item: CaseItem; profile: any }) {
  const isMobile = window.innerWidth <= 768; // simple fallback for printable component

  const pendingActions = (item.actions || []).filter(a => a.status !== 'completed');
  
  return (
    <div className="print-only" style={{ display: 'none', padding: '20px 40px', maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '3px solid #000', paddingBottom: 20, marginBottom: 30 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: '0 0 8px', fontSize: isMobile ? 22 : 28, letterSpacing: '-0.5px' }}>CLINICAL DOSSIER: {item.title.toUpperCase()}</h1>
            <p style={{ margin: 0, fontSize: 16, color: '#4b5563' }}>
              Generated by HealthChain Navigator on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{profile.demographics.name}</div>
            <div style={{ color: '#4b5563', fontSize: 14 }}>
              DOB: {profile.demographics.dob || 'N/A'} ”¢ {profile.demographics.gender || 'N/A'}
            </div>
            <div style={{ color: '#4b5563', fontSize: 14 }}>
              Blood Group: {profile.demographics.bloodGroup || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div style={{ marginBottom: 24 }} className="print-avoid-break">
        <h2 style={{ fontSize: 20, borderBottom: '1px solid #e5e7eb', paddingBottom: 8, marginBottom: 16 }}>1. CASE OVERVIEW & PATHWAYS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 30 }}>
          <div>
            <h3 style={{ fontSize: 16, color: '#374151', margin: '0 0 8px' }}>Executive Summary</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#1f2937', margin: 0 }}>
              {item.currentSummary?.executiveSummary || 'A comprehensive multi-specialist investigation is ongoing.'}
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: 16, color: '#374151', margin: '0 0 8px' }}>Active Clinical Pathways</h3>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
              {Array.isArray(item.currentSummary?.topDiagnoses) && item.currentSummary.topDiagnoses.length > 0 ? (
                item.currentSummary.topDiagnoses.map((p, i) => (
                  <li key={i}><strong>{p.condition}</strong> {p.confidence ? `(${p.confidence}% Match)` : ''} {p.specialty ? `- ${p.specialty}` : ''}</li>
                ))
              ) : (
                <li>No active discussion pathways</li>
              )}
            </ul>
          </div>
        </div>

        {/* J.A.R.V.I.S. Missing Links & Patterns if present */}
        {Array.isArray(item.currentSummary?.missingLinks) && item.currentSummary.missingLinks.length > 0 && (
          <div style={{ marginTop: 16, background: '#FEFCE8', padding: 14, borderRadius: 8, border: '1px solid #FEF08A' }}>
            <strong style={{ color: '#854D0E', fontSize: 14, display: 'block', marginBottom: 6 }}>The Missing Links:</strong>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#854D0E', fontSize: 13, lineHeight: 1.5 }}>
              {item.currentSummary.missingLinks.map((l: string, i: number) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        )}

        {/* J.A.R.V.I.S. Functional Biomarkers if present */}
        {Array.isArray(item.currentSummary?.functionalBiomarkers) && item.currentSummary.functionalBiomarkers.length > 0 && (
          <div style={{ marginTop: 16, background: '#F0FDF4', padding: 14, borderRadius: 8, border: '1px solid #BBF7D0' }}>
            <strong style={{ color: '#166534', fontSize: 14, display: 'block', marginBottom: 6 }}>Sub-Clinical Biomarkers:</strong>
            <div style={{ display: 'grid', gap: 8 }}>
              {item.currentSummary.functionalBiomarkers.map((b: any, i: number) => (
                <div key={i} style={{ fontSize: 13, color: '#166534' }}>
                  <strong>{b.biomarker}:</strong> {b.value} (Standard: {b.standardRange}, Optimal: {b.optimalRange}) - {b.insight}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Plan & Questions for Clinician */}
      <div style={{ marginBottom: 24 }} className="print-avoid-break">
        <h2 style={{ fontSize: 20, borderBottom: '1px solid #e5e7eb', paddingBottom: 8, marginBottom: 16 }}>2. CLINICAL ACTION PLAN & QUESTIONS</h2>
        <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          {Array.isArray(item.currentSummary?.questionsForClinician) && item.currentSummary.questionsForClinician.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <strong style={{ fontSize: 15, color: '#0F172A', display: 'block', marginBottom: 6 }}>Questions for Your Clinician:</strong>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.5, color: '#334155' }}>
                {item.currentSummary.questionsForClinician.map((q: string, i: number) => (
                  <li key={i} style={{ marginBottom: 4 }}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          <h3 style={{ fontSize: 15, color: '#0f172a', margin: '0 0 8px' }}>Action Items:</h3>
          {pendingActions.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6, color: '#1e293b' }}>
              {pendingActions.map(a => (
                <li key={a.id} style={{ marginBottom: 6 }}>
                  <strong>{a.step}</strong> {a.timeline ? `- ${a.timeline}` : ''}
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Recommended by {a.type || 'Clinical Assessment'}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>No pending clinical actions.</p>
          )}
        </div>
      </div>

      {/* Timeline Section */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, borderBottom: '1px solid #e5e7eb', paddingBottom: 8, marginBottom: 16 }}>3. CLINICAL TIMELINE & CONSENSUS SNAPSHOTS</h2>
        <div style={{ paddingLeft: 10 }}>
          {([...(item.events || []), ...(item.reviews || [])].sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())).map((timelineItem: any, i) => {
            const isReview = !!timelineItem.type && !timelineItem.label;
            const date = timelineItem.date || timelineItem.createdAt;
            return (
              <div key={i} className="print-avoid-break" style={{ marginBottom: 20, borderLeft: '3px solid #cbd5e1', paddingLeft: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -9, top: 0, width: 14, height: 14, borderRadius: '50%', background: isReview ? '#000' : '#94a3b8', border: '2px solid #fff' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <strong style={{ fontSize: 15, color: '#111827' }}>
                    {isReview ? (timelineItem.type === 'mdt' ? 'Deep Collab Snapshot' : 'Quick Consult Snapshot') : timelineItem.label}
                  </strong>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{formatDate(date)}</span>
                </div>
                {isReview ? (
                  <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                    <div><strong>Specialists Involved:</strong> {timelineItem.specialists.join(', ')}</div>
                    <div style={{ marginTop: 8 }}><strong>Synthesized Findings:</strong></div>
                    <p style={{ margin: '4px 0 0 0' }}>This snapshot synthesized findings from {timelineItem.basedOn.evidenceIds.length} pieces of clinical evidence.</p>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 14, color: '#4b5563' }}>{timelineItem.note}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 50, paddingTop: 20, borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
        <strong>HealthChain AI</strong> ”” Not medical advice. This document is intended to facilitate discussion with a qualified healthcare professional.
      </div>
    </div>
  );
}



