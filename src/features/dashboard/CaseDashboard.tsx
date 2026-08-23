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
          c.actions
            .filter((a) => a.status !== 'completed')
            .slice(0, 2)
            .map((a) => ({ ...a, caseId: c.id, caseTitle: c.title }))
        )
        .slice(0, 4),
    [cases]
  );

  const completed = useMemo(() => cases.reduce(
    (sum, c) => sum + c.actions.filter((a) => a.status === 'completed').length,
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
    <div style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 40 }}>
      <section
        style={{
          borderRadius: 28,
          padding: isMobile ? '26px 24px' : '38px',
          color: '#fff',
          background: 'linear-gradient(135deg,#0f172a,#153d45 65%,#059669)',
          boxShadow: '0 18px 45px rgba(15,23,42,.18)',
          marginBottom: 28,
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
              {profile?.demographics?.name ? `, ${(profile?.demographics?.name || '').split(' ')[0] || 'User'}` : ''}.
            </h1>
            <p style={{ color: '#cbd5e1', lineHeight: 1.5, maxWidth: 620, margin: '12px 0 0', fontSize: isMobile ? 14 : 16 }}>
              Start with parallel AI specialist perspectives, then bring their findings into a Deep
              Collaborative Specialist review for consensus when your case needs deeper correlation.
            </p>
          </div>
          <button
            className="btn"
            onClick={() => navigate('/app/consult?new=true')}
            style={{ background: '#fff', color: '#0f172a', padding: isMobile ? '12px 16px' : '14px 20px', fontWeight: 800, width: isMobile ? '100%' : 'auto', display: 'flex', justifyContent: 'center' }}
          >
            <Stethoscope size={18} /> Start Quick Consult
          </button>
        </div>
      </section>

      <div style={{ marginBottom: 28 }}>
        <ActiveCaseBar navigate={navigate} />
      </div>

      {/* Premium Section */}
      <UpgradeToProCard isPro={isPremium} style={{ marginBottom: '28px' }} />

      <DailySymptomCheckinWidget />
      <MindfulHRVCard />
      <VitalityPlayground />
      <LongevityBioStackCard />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: isMobile ? 12 : 16,
          alignItems: 'stretch',
        }}
      >
        <section className="card" style={{ padding: isMobile ? '16px 14px' : '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: isMobile ? '18px' : '22px' }}>
          <div>
            <div style={{ display: 'flex', gap: isMobile ? 6 : 10, color: '#10B981', alignItems: 'center' }}>
              <Activity size={isMobile ? 16 : 19} />
              <strong style={{ fontSize: isMobile ? '13px' : '15px' }}>Care momentum</strong>
            </div>
            <div style={{ fontSize: isMobile ? 28 : 38, fontWeight: 850, marginTop: isMobile ? 10 : 16, color: '#0F172A' }}>{completed}</div>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: isMobile ? 11 : 13, lineHeight: 1.3 }}>
              case actions completed
            </p>
          </div>
        </section>

        <section className="card" style={{ padding: isMobile ? '16px 14px' : '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: isMobile ? '18px' : '22px' }}>
          <div>
            <div style={{ display: 'flex', gap: isMobile ? 6 : 10, color: '#10B981', alignItems: 'center' }}>
              <FileText size={isMobile ? 16 : 19} />
              <strong style={{ fontSize: isMobile ? '13px' : '15px' }}>Health record</strong>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: isMobile ? 4 : 8,
                margin: isMobile ? '10px 0' : '16px 0',
              }}
            >
              <div
                style={{
                  padding: isMobile ? '6px 2px' : '10px 6px',
                  background: '#F0FDFA',
                  borderRadius: 10,
                  textAlign: 'center',
                }}
              >
                <strong style={{ display: 'block', fontSize: isMobile ? 14 : 18, color: '#0F766E' }}>
                  {profile.conditions.length}
                </strong>
                <small style={{ color: '#64748B', fontSize: isMobile ? 8 : 10, fontWeight: 700 }}>COND</small>
              </div>
              <div
                style={{
                  padding: isMobile ? '6px 2px' : '10px 6px',
                  background: '#F0FDFA',
                  borderRadius: 10,
                  textAlign: 'center',
                }}
              >
                <strong style={{ display: 'block', fontSize: isMobile ? 14 : 18, color: '#0F766E' }}>
                  {profile.medications.length}
                </strong>
                <small style={{ color: '#64748B', fontSize: isMobile ? 8 : 10, fontWeight: 700 }}>MEDS</small>
              </div>
              <div
                style={{
                  padding: isMobile ? '6px 2px' : '10px 6px',
                  background: '#F0FDFA',
                  borderRadius: 10,
                  textAlign: 'center',
                }}
              >
                <strong style={{ display: 'block', fontSize: isMobile ? 14 : 18, color: '#0F766E' }}>
                  {profile.allergies.length}
                </strong>
                <small style={{ color: '#64748B', fontSize: isMobile ? 8 : 10, fontWeight: 700 }}>ALLERGY</small>
              </div>
            </div>
          </div>
          <button
            className="btn btn-outline btn-sm"
            style={{ width: '100%', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? '11px' : '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            onClick={() => navigate('/app/profile')}
          >
            {isMobile ? 'Profile' : 'Open Medical Profile'} <ArrowRight size={13} />
          </button>
        </section>
      </div>

      {isMobile && (
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 12, fontSize: 12, color: '#64748B' }}>
            <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</Link>
            <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</Link>
          </div>
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '16px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              fontSize: '12px',
              lineHeight: '1.5',
              color: '#64748B',
              textAlign: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <strong style={{ color: '#334155' }}>Disclaimer:</strong> HealthChain is an AI Navigational and Researcher tool, not a doctor. It is not a substitute for professional medical advice.
          </div>
        </div>
      )}
    </div>
  );
}

function JarvisCaseWorkspace({ item, navigate, refresh }: { item: CaseItem, navigate: any, refresh: any }) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'report' | 'intake' | 'timeline'>('report');
  const report = item.currentSummary || item.reviews?.[0]?.report || {};
  const records = item.medicalRecords || [];
  const profile = getProfile();

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/my-cases')}>
          <ArrowLeft size={16} /> Back to My Cases
        </button>
        <button 
          className="btn btn-outline btn-sm"
          onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Printer size={14} /> Print Dossier
        </button>
      </div>

      <PrintableDossier item={item} profile={profile} />

      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: 24,
          padding: isMobile ? '24px 20px' : '32px',
          color: '#FFF',
          marginBottom: 24,
          boxShadow: '0 12px 32px rgba(15,23,42,0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EA580C', flexShrink: 0 }}>
            <NetworkHubIcon size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#FB923C', letterSpacing: '0.8px', textTransform: 'uppercase' }}>J.A.R.V.I.S. Investigation</span>
              <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 999 }}>{item.status.toUpperCase()}</span>
            </div>
            <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>{item.title}</h1>
            <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: 13 }}>
              Updated {formatDate(item.updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid #E2E8F0', paddingBottom: 10, marginBottom: 24, overflowX: 'auto' }}>
        {[
          { id: 'report', label: 'Investigation Report' },
          { id: 'intake', label: 'Intake & Records' },
          { id: 'timeline', label: 'Timeline' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? '#EA580C' : '#64748B',
              borderBottom: activeTab === tab.id ? '2px solid #EA580C' : 'none',
              paddingBottom: 6,
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {report.executiveSummary && (
            <div style={{ background: '#F8FAFC', padding: isMobile ? '20px' : '24px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
              <strong style={{ color: '#0F172A', display: 'block', marginBottom: '8px', fontSize: '16px' }}>Executive Summary</strong>
              <p style={{ margin: 0, color: '#334155', lineHeight: 1.6, fontSize: '15px' }}>{report.executiveSummary}</p>
            </div>
          )}

          {report.missingLinks && report.missingLinks.length > 0 && (
            <Accordion title="The Missing Links" icon={Search} iconColor="#EAB308" bgColor="#FEFCE8" borderColor="#FEF08A" textColor="#854D0E" isMobile={isMobile} defaultOpen={true}>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {report.missingLinks.map((link: string, i: number) => (
                  <li key={i} style={{ color: '#854D0E', lineHeight: 1.6, fontSize: '14.5px' }}>{link}</li>
                ))}
              </ul>
            </Accordion>
          )}

          {report.functionalBiomarkers && report.functionalBiomarkers.length > 0 && (
            <div style={{ background: '#F0FDF4', borderRadius: '20px', padding: isMobile ? '20px' : '24px', border: '1px solid #BBF7D0' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
                <Activity size={20} color="#15803D" /> Sub-clinical Biomarker Insights
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {report.functionalBiomarkers.map((bio: any, i: number) => (
                  <div key={i} style={{ background: '#FFF', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: '#0F172A', fontSize: '15px' }}>{bio.biomarker}</strong>
                      <span style={{ background: '#FEF2F2', color: '#991B1B', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>Value: {bio.value}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', fontSize: '13px', color: '#64748B' }}>
                      <span>Standard Range: {bio.standardRange}</span>
                      <span>Optimal Range: <strong>{bio.optimalRange}</strong></span>
                    </div>
                    <p style={{ margin: 0, color: '#334155', fontSize: '14px', lineHeight: 1.5, padding: '12px', background: '#F8FAFC', borderRadius: '8px' }}>
                      {bio.insight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.systemicPatterns && report.systemicPatterns.length > 0 && (
            <Accordion title="Systemic Patterns Detected" icon={Sparkles} iconColor="#8B5CF6" bgColor="#F5F3FF" borderColor="#DDD6FE" textColor="#5B21B6" isMobile={isMobile} defaultOpen={true}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {report.systemicPatterns.map((pat: any, i: number) => (
                  <div key={i}>
                    <strong style={{ color: '#4C1D95', display: 'block', marginBottom: '4px', fontSize: '15px' }}>{pat.pattern}</strong>
                    <p style={{ margin: 0, color: '#5B21B6', lineHeight: 1.5, fontSize: '14px' }}>{pat.evidence}</p>
                  </div>
                ))}
              </div>
            </Accordion>
          )}

          {report.topDiagnoses && report.topDiagnoses.length > 0 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>Possible Underlying Conditions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                {report.topDiagnoses.map((dx: any, i: number) => (
                  <div key={i} style={{ background: '#FFF', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <strong style={{ fontSize: '16px', color: '#0F172A' }}>{dx.condition}</strong>
                      {dx.confidence ? <span style={{ background: '#F0F9FF', color: '#0369A1', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>{dx.confidence}% Match</span> : null}
                    </div>
                    <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>{dx.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.questionsForClinician && report.questionsForClinician.length > 0 && (
            <Accordion title="Questions for Your Clinician" icon={HelpCircle} iconColor="#0F172A" bgColor="#F1F5F9" borderColor="#E2E8F0" textColor="#0F172A" isMobile={isMobile} defaultOpen={true}>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {report.questionsForClinician.map((q: string, i: number) => (
                  <li key={i} style={{ color: '#334155', lineHeight: 1.6, fontSize: '14.5px' }}>{q}</li>
                ))}
              </ul>
            </Accordion>
          )}
        </div>
      )}

      {activeTab === 'intake' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>Submitted Clinical Timeline & Notes</h3>
            <p style={{ margin: 0, color: '#334155', lineHeight: 1.6, fontSize: '14.5px', whiteSpace: 'pre-wrap' }}>
              {item.intakeData?.chiefComplaint || 'No raw notes provided.'}
            </p>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>Uploaded Records & Evidence</h3>
            {records.length > 0 ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {records.map((r: any) => (
                  <div key={r.id} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                    <strong>{r.filename}</strong>
                    <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '13px' }}>{r.findings}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>No files attached to this investigation.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>Investigation History</h3>
          <div style={{ display: 'grid', gap: '14px' }}>
            {([...(item.events || []), ...(item.reviews || [])].sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())).map((ev: any, idx: number) => (
              <div key={idx} style={{ padding: '12px 16px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: '#0F172A', display: 'block' }}>{ev.label || 'Investigation Event'}</strong>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>{ev.note || 'Snapshot recorded'}</span>
                </div>
                <small style={{ color: '#94A3B8', fontSize: '12px' }}>{formatDate(ev.date || ev.createdAt)}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getQuickConsultDetails(item: CaseItem) {
  let root = '';
  let mechanism = '';
  let trigger = '';
  let questions: string[] = [];

  const summary = item.currentSummary || {};
  if (summary.flowchart) {
    root = summary.flowchart.root || summary.flowchart.root_sub || '';
    mechanism = summary.flowchart.mechanism || summary.flowchart.mechanism_sub || '';
    if (Array.isArray(summary.flowchart.symptoms) && summary.flowchart.symptoms.length > 0) {
      trigger = summary.flowchart.symptoms[0].name || summary.flowchart.symptoms[0].sub || '';
    }
  }
  if (summary.this_week_tasks && Array.isArray(summary.this_week_tasks)) {
    questions = summary.this_week_tasks;
  } else if (summary.questionsForClinician && Array.isArray(summary.questionsForClinician)) {
    questions = summary.questionsForClinician;
  }

  if (!root || questions.length === 0) {
    try {
      const transcripts = item.reviews?.[0]?.transcripts;
      if (transcripts) {
        const msgs = Object.values(transcripts).flat();
        for (const m of msgs as any[]) {
          if (m?.text && m.text.includes('{')) {
            const parsed = parseModelJson<any>(m.text);
            if (parsed) {
              if (!root && parsed.flowchart) {
                root = parsed.flowchart.root || parsed.flowchart.root_sub || '';
                mechanism = parsed.flowchart.mechanism || parsed.flowchart.mechanism_sub || '';
                if (Array.isArray(parsed.flowchart.symptoms) && parsed.flowchart.symptoms.length > 0) {
                  trigger = parsed.flowchart.symptoms[0].name || parsed.flowchart.symptoms[0].sub || '';
                }
              }
              if (!root && parsed.whats_driving_it) {
                root = parsed.whats_driving_it;
                mechanism = parsed.what_it_is || 'Clinical Mechanism';
                trigger = parsed.chain_name || item.intakeData?.chiefComplaint || 'Symptoms';
              }
              if (questions.length === 0 && Array.isArray(parsed.this_week_tasks)) {
                questions = parsed.this_week_tasks;
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  if (!root && summary.interpretation) {
    root = summary.interpretation.slice(0, 75);
    mechanism = summary.keyFindings ? summary.keyFindings.slice(0, 75) : 'Systemic Interaction';
    trigger = item.title.replace('Quick Consult:', '').trim() || 'Reported Symptoms';
  }

  return { root, mechanism, trigger, questions };
}

function cleanActionItem(action: any): { title: string; subtitle?: string; type: string; timeline: string } {
  let rawStep = (typeof action === 'string' ? action : action?.step || action?.action || 'Recommended Next Step').trim();
  
  rawStep = cleanClinicalText(rawStep);

  let title = rawStep;
  let subtitle = '';

  if (rawStep.includes('·') || rawStep.includes(' - ') || rawStep.includes(':') || rawStep.length > 70) {
    const parts = rawStep.split(/[·\n:\.]/);
    if (parts.length > 0 && parts[0].trim().length > 3 && parts[0].trim().length < 75) {
      title = parts[0].trim();
    } else {
      const firstPeriod = rawStep.indexOf('.');
      if (firstPeriod > 5 && firstPeriod < 75) {
        title = rawStep.slice(0, firstPeriod).trim();
      } else {
        title = rawStep.slice(0, 65).trim() + '...';
      }
    }
  }

  // Strip trailing category/timeline labels or leaked words from the title
  title = title
    .replace(/\s*(Immediately|Investigation|Consultation|Routine|Urgent)[\s\S]*/i, '')
    .replace(/["'{}]/g, '')
    .trim();
    
  if (!title || title.length < 3) {
    title = 'Clinical Follow-up & Evaluation';
  }

  const sentences = rawStep.split('.').map(s => s.trim()).filter(Boolean);
  for (const s of sentences) {
    const sLower = s.toLowerCase();
    if (
      s.length > 15 &&
      s.length < 140 &&
      !sLower.includes('costestimate') &&
      !sLower.includes('successrate') &&
      !sLower.includes('simulation') &&
      !sLower.includes('i will') &&
      !sLower.includes('let\'s make') &&
      !sLower.includes('i need to be careful') &&
      !sLower.includes('timelinedescription') &&
      !sLower.includes('timelinedays') &&
      !sLower.includes(title.toLowerCase())
    ) {
      subtitle = s + '.';
      break;
    }
  }

  const type = action?.type && typeof action.type === 'string' && !action.type.includes('{') && action.type.length < 25 ? action.type : 'Consultation';
  const timeline = action?.timeline && typeof action.timeline === 'string' && !action.timeline.includes('{') && action.timeline.length < 25 ? action.timeline : 'Upcoming';

  return { title, subtitle, type, timeline };
}

function VisualRootChain({ root, mechanism, trigger, isMobile }: { root: string; mechanism: string; trigger: string; isMobile: boolean }) {
  if (!root && !mechanism && !trigger) return null;

  const items = [
    { label: 'Root Factor', value: root || 'Primary Trigger Factor', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', icon: '🔍' },
    { label: 'Biological Mechanism', value: mechanism || 'Systemic Mechanism', color: '#4338CA', bg: '#EEF2FF', border: '#C7D2FE', icon: '⚙️' },
    { label: 'Symptom Trigger', value: trigger || 'Target Symptoms', color: '#047857', bg: '#ECFDF5', border: '#A7F3D0', icon: '⚡' }
  ];

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 20, padding: isMobile ? '20px 16px' : '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(15,23,42,0.03)', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          Visual Root-Cause Chain
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 12 }}>
        {items.map((step, idx) => (
          <React.Fragment key={idx}>
            <div style={{ flex: 1, padding: '16px', borderRadius: 16, background: step.bg, border: `1px solid ${step.border}`, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{step.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: step.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {step.label}
                </span>
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>
                {step.value}
              </div>
            </div>

            {idx < items.length - 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94A3B8', padding: isMobile ? '2px 0' : '0 4px' }}>
                <ArrowRight size={isMobile ? 18 : 22} style={{ transform: isMobile ? 'rotate(90deg)' : 'none' }} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function ClinicianCheatSheet({ questions, isMobile }: { questions: string[]; isMobile: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!questions || questions.length === 0) return null;

  const handleCopy = () => {
    const text = "Questions for My Doctor:\n" + questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)', borderRadius: 20, padding: isMobile ? '20px 16px' : '24px', border: '1px solid #CBD5E1', marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#0F172A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Stethoscope size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>Bring to Your Next Doctor Visit</h3>
            <span style={{ fontSize: 12, color: '#64748B' }}>Targeted clinical questions generated from your consult</span>
          </div>
        </div>
        <button
          onClick={handleCopy}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid #CBD5E1',
            background: copied ? '#DCFCE7' : '#FFFFFF',
            color: copied ? '#15803D' : '#0F172A',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s'
          }}
        >
          {copied ? <CheckCircle2 size={14} color="#15803D" /> : <ClipboardList size={14} />}
          {copied ? 'Copied to Clipboard!' : 'Copy Questions'}
        </button>
      </div>

      <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {questions.map((q, idx) => (
          <li key={idx} style={{ color: '#334155', fontSize: '14.5px', lineHeight: 1.5, fontWeight: 500 }}>
            {q}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ElevateToBoardCard({ item, navigate, isMobile }: { item: CaseItem; navigate: any; isMobile: boolean }) {
  const handleElevate = () => {
    navigate(`/app/collab?caseId=${item.id}&elevate=true`);
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        borderRadius: 20,
        padding: isMobile ? '20px' : '24px',
        color: '#FFF',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: 16,
        marginBottom: 24,
        boxShadow: '0 10px 25px rgba(79,70,229,0.2)'
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 999, letterSpacing: '0.5px' }}>NEXT LEVEL REVIEW</span>
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 800, margin: '4px 0', color: '#FFF' }}>
          Need deeper correlation across multiple organs?
        </h3>
        <p style={{ margin: 0, fontSize: 13.5, color: '#E0E7FF', lineHeight: 1.4 }}>
          Elevate this consult into a 16-Specialist Collaborative Board to uncover cross-system consensus.
        </p>
      </div>

      <button
        onClick={handleElevate}
        style={{
          padding: '12px 20px',
          borderRadius: 12,
          background: '#FFF',
          color: '#4F46E5',
          border: 'none',
          fontWeight: 800,
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        Elevate to Board <ArrowRight size={16} />
      </button>
    </div>
  );
}

function resolveCaseReport(item: CaseItem): any {
  let rep = { ...(item.currentSummary || {}) };
  
  // Check if topDiagnoses is missing, empty, or only contains dummy "Pending Further Review"
  const isDummyDiagnoses = !rep.topDiagnoses || rep.topDiagnoses.length === 0 || 
    (rep.topDiagnoses.length === 1 && (rep.topDiagnoses[0].condition === 'Pending Further Review' || !rep.topDiagnoses[0].condition));

  // If report lacks rich findings or has dummy diagnoses, harvest from transcripts
  if (isDummyDiagnoses || !rep.keyFindings || !rep.interpretation) {
    const reviews = item.reviews || [];
    for (const rev of reviews) {
      if (rev.transcripts) {
        Object.values(rev.transcripts).forEach((msgs: any) => {
          if (Array.isArray(msgs)) {
            msgs.forEach((m: any) => {
              if (m.text && typeof m.text === 'string' && m.text.includes('{')) {
                try {
                  const cleaned = m.text.replace(/```json/g, '').replace(/```/g, '').trim();
                  const parsed = JSON.parse(cleaned);
                  if (parsed.currentHypotheses && Array.isArray(parsed.currentHypotheses) && parsed.currentHypotheses.length > 0) {
                    if (isDummyDiagnoses) {
                      rep.topDiagnoses = parsed.currentHypotheses;
                    }
                  }
                  if (parsed.interpretation && !rep.interpretation) {
                    rep.interpretation = parsed.interpretation;
                    if (!rep.executiveSummary || rep.executiveSummary.includes('identified discussion pathways') || rep.executiveSummary.includes('Pending Further Review')) {
                      rep.executiveSummary = parsed.interpretation;
                    }
                  }
                  if (parsed.keyFindings && !rep.keyFindings) {
                    rep.keyFindings = parsed.keyFindings;
                  }
                  if (parsed.abnormalitiesNoted && (!rep.abnormalitiesNoted || rep.abnormalitiesNoted.length === 0)) {
                    rep.abnormalitiesNoted = parsed.abnormalitiesNoted;
                  }
                  if (parsed.medicalTerms && (!rep.medicalTerms || rep.medicalTerms.length === 0)) {
                    rep.medicalTerms = parsed.medicalTerms;
                  }
                } catch(e) {}
              }
            });
          }
        });
      }
    }
  }

  return rep;
}

function CaseWorkspace({ item, navigate, refresh }: { item: CaseItem, navigate: any, refresh: any }) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview');
  const [simulatorAction, setSimulatorAction] = useState<any>(null);
  const report = resolveCaseReport(item);
  const records = item.medicalRecords || [];
  const profile = getProfile();
  const isQuickConsult = item.title?.toLowerCase().includes('quick consult') || item.reviews?.[0]?.type === 'parallel' || item.currentStage === 'parallel_complete';
  const quickDetails = isQuickConsult ? getQuickConsultDetails(item) : null;

  const totalActions = item.actions.length;
  const completedActions = item.actions.filter(a => a.status === 'completed').length;
  const progressPercent = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  return (
    <div style={{ maxWidth: 1020, margin: '0 auto', paddingBottom: 40 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/my-cases')}>
        <ArrowLeft size={16} /> Back to My Cases
      </button>

      <PrintableDossier item={item} profile={profile} />

      <div style={{ display: 'flex', gap: 20, marginTop: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 10, overflowX: 'auto' }}>
        {[
          { id: 'overview', label: 'Case Overview & Findings' },
          { id: 'timeline', label: 'Clinical Timeline' }
        ].map(tab => (
          <button 
             key={tab.id} 
             onClick={() => setActiveTab(tab.id as any)}
             style={{ 
               background: 'transparent', 
               border: 'none', 
               cursor: 'pointer', 
               fontSize: 16, 
               fontWeight: activeTab === tab.id ? 700 : 500,
               color: activeTab === tab.id ? '#10B981' : '#64748b',
               borderBottom: activeTab === tab.id ? '2px solid #10B981' : 'none',
               paddingBottom: 6,
               whiteSpace: 'nowrap',
               flexShrink: 0
             }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        {activeTab === 'overview' && (
          <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'unset', gridTemplateColumns: isMobile ? 'unset' : '1.25fr .75fr', gap: 22, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 22 }}>
              {isQuickConsult && quickDetails && (
                <>
                  <VisualRootChain root={quickDetails.root} mechanism={quickDetails.mechanism} trigger={quickDetails.trigger} isMobile={isMobile} />
                  <ClinicianCheatSheet questions={quickDetails.questions} isMobile={isMobile} />
                  <ElevateToBoardCard item={item} navigate={navigate} isMobile={isMobile} />
                </>
              )}
              {!isQuickConsult && report.questionsForClinician && report.questionsForClinician.length > 0 && (
                <ClinicianCheatSheet questions={report.questionsForClinician} isMobile={isMobile} />
              )}
              
              {/* 🌟 Pinned #1 Immediate Priority Step For Today */}
              {(() => {
                const pendingActions = (item.actions || []).filter(a => a.status !== 'completed');
                if (!pendingActions.length) return null;
                const topAction = pendingActions.find(a => {
                  const l = JSON.stringify(a).toLowerCase();
                  return l.includes('immediately') || l.includes('today') || l.includes('this week') || l.includes('urgent');
                }) || pendingActions[0];
                const { title, subtitle, timeline, type } = cleanActionItem(topAction);

                return (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                      borderRadius: 20,
                      padding: isMobile ? '18px' : '22px 26px',
                      color: '#FFF',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                      flexWrap: 'wrap',
                      boxShadow: '0 10px 25px rgba(15,23,42,0.15)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.2)', color: '#34D399', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 2 }}>
                        <Sparkles size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#34D399', letterSpacing: '0.8px', textTransform: 'uppercase' }}>🌟 Priority Step For Today</span>
                          <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 999 }}>📅 {timeline}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.12)', padding: '2px 8px', borderRadius: 999 }}>📋 {type}</span>
                        </div>
                        <strong style={{ fontSize: isMobile ? 15.5 : 17, color: '#F8FAFC', display: 'block', lineHeight: 1.35 }}>{title}</strong>
                        {subtitle && <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: 13.5, lineHeight: 1.4 }}>{subtitle}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        toggleCaseAction(item.id, topAction.id);
                        refresh();
                      }}
                      style={{
                        background: '#10B981',
                        color: '#FFF',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: 12,
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.2s',
                        flexShrink: 0,
                        alignSelf: isMobile ? 'flex-end' : 'center',
                        boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                      }}
                    >
                      <CheckCircle2 size={16} /> Mark Completed
                    </button>
                  </div>
                );
              })()}

              {/* 1. Synthesis & Executive Summary */}
              <section className="card" style={{ padding: 24, background: 'transparent', border: 'none', boxShadow: 'none' }}>
                <h2 style={{ fontSize: 20, margin: '0 0 16px' }}>Current Case Synthesis</h2>
                <RichReportTemplate report={report} isMobile={isMobile} />
              </section>

              {/* 2. Differential Diagnoses & Clinical Evidence */}
              <section className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h2 style={{ fontSize: 20, margin: '0 0 4px', color: '#0F172A' }}>Possible Pathways to Discuss</h2>
                    <p style={{ margin: 0, color: '#64748B', fontSize: 13.5 }}>
                      Ranked differential diagnoses based on clinical presentation & guidelines.
                    </p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, background: '#ECFDF5', color: '#059669', padding: '4px 10px', borderRadius: 999, border: '1px solid #A7F3D0' }}>
                    {(Array.isArray(report.topDiagnoses) ? report.topDiagnoses : []).length} Pathways Identified
                  </span>
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  {(Array.isArray(report.topDiagnoses) ? report.topDiagnoses : []).map((d: any, i: number) => {
                    const rawCondition = d.condition || 'Clinical Condition';
                    const pctMatch = d.confidence || (rawCondition.match(/\((\d+)%\)/)?.[1]);
                    const cleanCondition = rawCondition.replace(/\s*\(\d+%\)\s*/, '').trim();
                    const numPct = pctMatch ? parseInt(pctMatch) : 0;
                    
                    const tierLabel = numPct >= 50 ? 'Tier 1 • High Clinical Corroboration (Primary Pathway)' : numPct >= 25 ? 'Tier 2 • Moderate Consideration (Secondary Differential)' : 'Tier 3 • Low Probability / For Clinician Ruling-Out Only';
                    const badgeBg = numPct >= 50 ? '#ECFDF5' : numPct >= 25 ? '#EFF6FF' : '#F8FAFC';
                    const badgeColor = numPct >= 50 ? '#059669' : numPct >= 25 ? '#2563EB' : '#64748B';
                    const badgeBorder = numPct >= 50 ? '#A7F3D0' : numPct >= 25 ? '#BFDBFE' : '#E2E8F0';

                    return (
                      <div
                        key={i}
                        style={{
                          padding: 18,
                          borderRadius: 16,
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderLeft: `5px solid ${numPct >= 50 ? '#10B981' : numPct >= 25 ? '#3B82F6' : '#94A3B8'}`,
                          boxShadow: '0 2px 10px rgba(15,23,42,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                          <strong style={{ fontSize: 16, color: '#0F172A' }}>{cleanCondition}</strong>
                          {pctMatch && (
                            <span style={{ background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}`, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                              {pctMatch}% Match
                            </span>
                          )}
                        </div>

                        <div style={{ marginBottom: 10 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: badgeColor }}>
                            {tierLabel}
                          </span>
                        </div>

                        <p style={{ margin: '0 0 10px', color: '#475569', fontSize: 14, lineHeight: 1.55 }}>
                          {d.rationale}
                        </p>

                        {d.citations && d.citations.length > 0 && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
                            <strong style={{ fontSize: 11.5, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              📚 Medical Evidence & Literature
                            </strong>
                            <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 13, color: '#475569' }}>
                              {d.citations.map((cit: any, citIdx: number) => {
                                const isSafeUrl = /^https?:\/\//i.test(cit.link);
                                return (
                                  <li key={citIdx} style={{ marginBottom: 4 }}>
                                    <a href={isSafeUrl ? cit.link : '#'} target="_blank" rel="noreferrer" style={{ color: '#059669', fontWeight: 600, textDecoration: 'none' }}>
                                      {cit.title}
                                    </a>
                                    {cit.journal ? ` – ${cit.journal} (${cit.year || 'Recent'})` : ''}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  }) || <p style={{ color: '#64748B', margin: 0 }}>No differential pathways recorded.</p>}
                </div>
              </section>

              {/* 3. Interactive Biomarker & Differential Connections Map */}
              <section className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 20, margin: '0 0 4px', color: '#0F172A' }}>Differential & Biomarker Connections</h2>
                    <p style={{ margin: 0, color: '#64748B', fontSize: 13.5 }}>
                      Interactive visual network linking symptoms, organ systems, and clinical mechanisms.
                    </p>
                  </div>
                </div>
                <DDxBoard item={item} profile={profile} />
              </section>

              {/* 4. Evidence & Supporting Records */}
              <section className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h2 style={{ fontSize: 20, margin: '0 0 4px', color: '#0F172A' }}>Evidence & Supporting Records</h2>
                    <p style={{ margin: 0, color: '#64748B', fontSize: 13.5 }}>
                      Uploaded lab reports, biomarkers, and diagnostic extracts.
                    </p>
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate(`/app/reports?returnTo=/app/cases/${item.id}`)}
                    style={{ borderRadius: 10, fontSize: 13, fontWeight: 700 }}
                  >
                    <FileText size={14} /> Add new evidence
                  </button>
                </div>
                {records.length ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {records.map((record) => (
                      <div
                        key={record.id}
                        style={{ padding: 16, borderRadius: 14, border: '1px solid #E2E8F0', background: '#F8FAFC' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <FileText size={16} color="#059669" />
                          <strong style={{ fontSize: 14.5, color: '#0F172A' }}>{record.filename}</strong>
                        </div>
                        <p style={{ color: '#475569', fontSize: 13.5, margin: 0, lineHeight: 1.45 }}>
                          {record.findings}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#F8FAFC', borderRadius: 14, border: '1px dashed #CBD5E1' }}>
                    <p style={{ color: '#64748B', margin: 0, fontSize: 13.5 }}>
                      No supporting lab reports or records were attached to this case yet.
                    </p>
                  </div>
                )}
              </section>

              {/* 5. Recommended Next Steps & Clinical Actions */}
              <section className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h2 style={{ fontSize: 20, margin: '0 0 4px', color: '#0F172A' }}>Recommended Next Steps</h2>
                    <p style={{ margin: 0, color: '#64748B', fontSize: 13.5 }}>
                      Clear, practical action items prioritized from your consultations.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8FAFC', padding: '6px 14px', borderRadius: 999, border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: progressPercent === 100 ? '#10B981' : '#0F172A' }}>
                      {completedActions} of {totalActions} Completed
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: 6, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
                  <div 
                    style={{ 
                      width: `${progressPercent}%`, 
                      height: '100%', 
                      background: progressPercent === 100 ? '#10B981' : 'linear-gradient(90deg, #3B82F6, #10B981)',
                      transition: 'width 0.3s ease'
                    }} 
                  />
                </div>

                {item.actions.length ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {item.actions.map((action) => {
                      const isDone = action.status === 'completed';
                      const { title, subtitle, type, timeline } = cleanActionItem(action);

                      return (
                        <div
                          key={action.id}
                          style={{
                            width: '100%',
                            border: `1px solid ${isDone ? '#BBF7D0' : '#E2E8F0'}`,
                            borderRadius: 16,
                            background: isDone ? '#F0FDF4' : '#FFFFFF',
                            boxShadow: '0 2px 8px rgba(15,23,42,0.02)',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: 'space-between',
                            alignItems: isMobile ? 'stretch' : 'center',
                            padding: isMobile ? '16px' : '18px 20px',
                            gap: 14,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div 
                            style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', flex: 1 }}
                            onClick={() => {
                              toggleCaseAction(item.id, action.id);
                              refresh();
                            }}
                          >
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                flexShrink: 0,
                                marginTop: 2,
                                border: `2px solid ${isDone ? '#16A34A' : '#CBD5E1'}`,
                                background: isDone ? '#16A34A' : '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFFFFF',
                                transition: 'all 0.2s'
                              }}
                            >
                              {isDone && <CheckCircle2 size={16} />}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                <span
                                  style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    textDecoration: isDone ? 'line-through' : 'none',
                                    color: isDone ? '#15803D' : '#0F172A',
                                    lineHeight: 1.3
                                  }}
                                >
                                  {title}
                                </span>
                              </div>

                              {subtitle && (
                                <p style={{ margin: '0 0 8px 0', fontSize: 13.5, color: isDone ? '#166534' : '#64748B', lineHeight: 1.4 }}>
                                  {subtitle}
                                </p>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: 999 }}>
                                  📋 {type}
                                </span>
                                <span style={{ fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 999 }}>
                                  📅 {timeline}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button 
                            onClick={() => setSimulatorAction(action)}
                            style={{
                              background: '#F8FAFC',
                              color: '#475569',
                              border: '1px solid #E2E8F0',
                              padding: '8px 14px',
                              borderRadius: 10,
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              flexShrink: 0,
                              alignSelf: isMobile ? 'flex-end' : 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                          >
                            <GitMerge size={14} />
                            Simulate Path
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: '#64748b', margin: 0 }}>No pending action items.</p>
                )}
              </section>
            </div>

            {/* Right Side Rail */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              <section className="card" style={{ padding: 22, borderRadius: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px', color: '#0F172A' }}>Case Overview</h3>
                
                <div style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Consultation Type</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: isQuickConsult ? '#EFF6FF' : '#ECFDF5', color: isQuickConsult ? '#1D4ED8' : '#059669', fontSize: 12.5, fontWeight: 700, border: `1px solid ${isQuickConsult ? '#BFDBFE' : '#A7F3D0'}` }}>
                    {isQuickConsult ? '⚡ Quick Consult' : '🧠 Deep Collab Board'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                   <Archive size={16} color="#64748B"/> 
                   <span style={{ fontSize: 13.5, color: '#334155', textTransform: 'capitalize', fontWeight: 600 }}>Status: {item.status}</span>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                   <Clock size={16} color="#64748B"/> 
                   <span style={{ fontSize: 13.5, color: '#64748B' }}>Updated: {formatDate(item.updatedAt)}</span>
                </div>

                {item.reviews?.[0]?.specialists && item.reviews[0].specialists.length > 0 && (
                  <div style={{ paddingTop: 14, borderTop: '1px solid #F1F5F9', marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
                      Specialists Involved
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {item.reviews[0].specialists.map((spec: string, sIdx: number) => (
                        <span key={sIdx} style={{ fontSize: 11.5, fontWeight: 600, background: '#F1F5F9', color: '#334155', padding: '3px 8px', borderRadius: 6 }}>
                          🩺 {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
                  <button
                    onClick={() => window.print()}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 12,
                      fontWeight: 800,
                      fontSize: 13.5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Printer size={15} /> Print / Export Doctor Dossier
                  </button>
                </div>
              </section>
            </aside>
          </div>
        )}

        {activeTab === 'timeline' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ padding: 32 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 22, margin: '0 0 6px', color: 'var(--text-main)' }}>Clinical Timeline</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
                  The progression of evidence, actions, and specialist consensus.
                </p>
              </div>
            </div>
            
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              {/* Vertical connecting line */}
              <div style={{ position: 'absolute', top: 12, bottom: 12, left: 2, width: 2, background: 'linear-gradient(to bottom, #10B981 0%, #3B82F6 100%)', opacity: 0.2, borderRadius: 2 }} />
              
              <div style={{ display: 'grid', gap: 16 }}>
                <AnimatePresence>
                  {([...(item.events || []), ...(item.reviews || [])].sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())).map((timelineItem: any, index: number) => {
                     const isReview = !!timelineItem.type && !timelineItem.label;
                     const isMDT = timelineItem.type === 'mdt';
                     const date = timelineItem.date || timelineItem.createdAt;
                     const Icon = isReview ? (isMDT ? Network : GitMerge) : CheckCircle2;
                     
                     return (
                       <motion.div 
                          key={timelineItem.id} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          style={{ position: 'relative' }}
                       >
                          <div style={{
                             position: 'absolute',
                             left: -33,
                             top: 4,
                             background: isReview ? (isMDT ? '#ECFDF5' : '#EEF2FF') : '#F8FAFC',
                             color: isReview ? (isMDT ? '#059669' : '#4F46E5') : '#64748B',
                             borderRadius: '50%',
                             width: 24,
                             height: 24,
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'center',
                             boxShadow: '0 0 0 4px #FFF, 0 4px 12px rgba(0,0,0,0.08)'
                          }}>
                             <Icon size={14} strokeWidth={2.5} />
                          </div>
                          
                          <div
                             style={{ 
                               background: isReview ? (isMDT ? 'linear-gradient(to right, rgba(16,185,129,0.05), transparent)' : 'linear-gradient(to right, rgba(79,70,229,0.05), transparent)') : 'transparent',
                               padding: '16px 20px', 
                               borderRadius: 16,
                               border: `1px solid ${isReview ? (isMDT ? 'rgba(16,185,129,0.2)' : 'rgba(79,70,229,0.2)') : '#F1F5F9'}`,
                               transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                               cursor: 'default'
                             }}
                             onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.04)'; }}
                             onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                          >
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <div>
                                   <strong style={{ fontSize: 15, color: isReview ? (isMDT ? '#065F46' : '#3730A3') : '#334155', display: 'block', marginBottom: 2 }}>
                                      {isReview ? `${isMDT ? 'Deep Collab' : 'Quick Consult'} Snapshot` : timelineItem.label}
                                   </strong>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                                      <Clock size={12} /> {formatDate(date)}
                                   </div>
                                </div>
                                {isReview && (
                                   <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 99, background: isMDT ? '#D1FAE5' : '#E0E7FF', color: isMDT ? '#065F46' : '#3730A3', fontWeight: 600 }}>
                                      {timelineItem.specialists?.length || 0} Specialists
                                   </span>
                                )}
                             </div>
                             
                             <p style={{ margin: 0, fontSize: 14, color: 'var(--text-main)', lineHeight: 1.6 }}>
                                {isReview ? (
                                   <>
                                      This snapshot synthesized findings from <b>{timelineItem.basedOn.evidenceIds.length} evidence items</b>.
                                      <br/>
                                      <span style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, display: 'inline-block' }}>
                                        Involved: {timelineItem.specialists.join(', ')}
                                      </span>
                                   </>
                                ) : timelineItem.note}
                             </p>
                          </div>
                       </motion.div>
                     )
                  })}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {simulatorAction && (
            <PathwaySimulator 
              actionItem={simulatorAction} 
              onClose={() => setSimulatorAction(null)} 
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

function CaseCard({ item, navigate }: { item: CaseItem, navigate: any }) {
  const pending = item.actions.filter((a) => a.status !== 'completed').length;
  const primary = item.currentSummary?.topDiagnoses?.[0];
  const isMobile = useIsMobile();
  return (
    <article
      className="card"
      style={{
        padding: 20,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 16,
        alignItems: isMobile ? 'stretch' : 'center',
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            display: 'grid',
            placeItems: 'center',
            background: '#ecfdf5',
            color: '#059669',
            flexShrink: 0,
          }}
        >
          <Archive size={21} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <strong style={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.title}</strong>
            <span className="badge badge-navy" style={{ flexShrink: 0 }}>
               {item.currentStage.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <p style={{ margin: '5px 0', color: '#64748b', fontSize: 13, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {primary?.condition
              ? <>Leading pathway: <strong>{primary.condition}</strong> {primary.definition && <span style={{ opacity: 0.8 }}>”” {primary.definition}</span>}</>
              : 'Awaiting evidence synthesis'}
          </p>
          <small style={{ color: '#94a3b8', display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            <CalendarClock size={12} style={{ verticalAlign: 'middle' }} /> Updated{' '}
            {formatDate(item.updatedAt)} · {pending} actions open
          </small>
        </div>
      </div>
      <button
        className="btn btn-primary btn-sm"
        style={{ width: 'auto', flexShrink: 0, marginTop: isMobile ? '8px' : '0', alignSelf: isMobile ? 'flex-start' : 'auto' }}
        onClick={() => {
          setActiveCase(item.id);
          navigate(`/app/cases/${item.id}`);
        }}
      >
        Open case
      </button>
    </article>
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



