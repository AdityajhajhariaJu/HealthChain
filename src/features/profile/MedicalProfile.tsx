import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import {
  FolderHeart,
  Activity,
  Clock,
  ShieldCheck,
  Link2,
  User,
  Users,
  HeartPulse,
  Beaker,
  FileText,
  Download,
  Trash2,
  X,
  Plus,
  Edit2,
  Check,
  AlertTriangle,
  Search,
  BriefcaseBusiness,
  Stethoscope,
  ChevronRight,
  ArrowRight,
  Sparkles,
  ClipboardCheck,
  Dna,
  Camera,
  Mail,
  Undo2,
  Redo2,
} from 'lucide-react';
import {
  getProfile,
  updateDemographics,
  removeCondition,
  removeMedication,
  addAllergy,
  removeAllergy,
  addFamilyHistory,
  removeFamilyHistory,
  toggleActionItem,
  removeActionItem,
  clearProfile,
  calculateHealthScore,
  undoProfileEdit,
  redoProfileEdit,
  canUndo,
  canRedo,
  getProfileEngineState,
} from '../../services/ProfileEngine';
import { getActiveCase } from '../../services/CaseEngine';
import { generateProfileSynthesis } from '../../services/geminiService';
import { useIsMobile } from '../../hooks/useIsMobile';

const mockLongitudinalData = [
  { month: 'Jan', eGFR: 88, weight: 82.5, bpSystolic: 125 },
  { month: 'Feb', eGFR: 85, weight: 83.0, bpSystolic: 128 },
  { month: 'Mar', eGFR: 82, weight: 83.9, bpSystolic: 130 },
  { month: 'Apr', eGFR: 85, weight: 82.1, bpSystolic: 124 },
  { month: 'May', eGFR: 88, weight: 81.6, bpSystolic: 122 },
  { month: 'Jun', eGFR: 90, weight: 80.7, bpSystolic: 118 },
];

export default function MedicalProfile() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getProfile());
  const healthScore = calculateHealthScore(profile);
  const [_trigger, setTrigger] = useState(0); // Force re-render for undo/redo state

  const [isEditingDemo, setIsEditingDemo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [demoForm, setDemoForm] = useState(profile.demographics);
  const [newAllergy, setNewAllergy] = useState('');
  const [newFamilyHist, setNewFamilyHist] = useState('');
  const [activeCase, setActiveCase] = useState(getActiveCase());
  const [chartMetric, setChartMetric] = useState<'eGFR' | 'weight' | 'bpSystolic'>('eGFR');
  const [synthesisData, setSynthesisData] = useState<any>(() => {
    const cached = sessionStorage.getItem('hc_profile_synthesis');
    return cached ? JSON.parse(cached) : null;
  });
  const [isGeneratingSynthesis, setIsGeneratingSynthesis] = useState(false);
  const profileRef = useRef<any>(null);

  const account = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('hc_account') || '{}');
    } catch {
      return {};
    }
  }, []);

  const [isLoading, setIsLoading] = useState(true);

  // Compute longitudinal data from actual history
  const computedLongitudinalData = (profile.vitals.historicalLabs || []).map(entry => {
    const dateObj = new Date(entry.date);
    const month = `${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getDate()}`;
    const eGFR = entry.biomarkers?.eGFR?.value || null;
    const weight = entry.biomarkers?.Weight?.value || null;
    const bpSystolic = entry.biomarkers?.['Blood Pressure']?.value 
      ? parseInt(String(entry.biomarkers['Blood Pressure'].value).split('/')[0]) 
      : null;
    return { month, eGFR, weight, bpSystolic };
  }).filter(d => d.eGFR !== null || d.weight !== null || d.bpSystolic !== null);
  
  const displayData = computedLongitudinalData.length > 0 ? computedLongitudinalData : mockLongitudinalData;

  useEffect(() => {
    const handleUpdate = () => {
      const updated = getProfile();
      setProfile(updated);
      setTrigger(t => t + 1);
      if (!isEditingDemo) {
        setDemoForm(updated.demographics);
      }
      setIsLoading(false);
    };
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    
    window.addEventListener('hc_profile_updated', handleUpdate);
    const refreshCase = () => setActiveCase(getActiveCase());
    window.addEventListener('hc_active_case_updated', refreshCase);
    window.addEventListener('hc_cases_updated', refreshCase);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('hc_profile_updated', handleUpdate);
      window.removeEventListener('hc_active_case_updated', refreshCase);
      window.removeEventListener('hc_cases_updated', refreshCase);
    };
  }, [isEditingDemo]);

  const handleSaveDemographics = () => {
    setIsSaving(true);
    setTimeout(() => {
      updateDemographics(demoForm);
      setIsSaving(false);
      setIsEditingDemo(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    }, 500); // Simulate network latency for the saving indicator
  };

  const handleExportPDF = async () => {
    if (!profileRef.current) return;
    const container = profileRef.current as HTMLElement;
    
    // Add print mode class
    container.classList.add('pdf-exporting');
    
    // Temporarily hide all buttons and inputs during PDF generation
    const interactiveElements = container.querySelectorAll('button, input, select');
    const originalDisplays = new Map();
    interactiveElements.forEach((el) => {
      originalDisplays.set(el, (el as HTMLElement).style.display);
      (el as HTMLElement).style.display = 'none';
    });

    const opt = {
      margin: [15, 10, 15, 10] as [number, number, number, number], // top, left, bottom, right
      filename: `HealthChain_Profile_${profile.demographics.name || 'Patient'}.pdf`,
      image: { type: 'jpeg' as const, quality: 1 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 1200 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };
    
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf().set(opt).from(container).save();
    
    // Restore interactive elements
    interactiveElements.forEach((el) => {
      (el as HTMLElement).style.display = originalDisplays.get(el);
    });
    container.classList.remove('pdf-exporting');
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all profile data? This cannot be undone.')) {
      clearProfile();
      localStorage.removeItem('hc_diet_profile');
      localStorage.removeItem('hc_history');
      
      const state = getProfileEngineState();
      localStorage.removeItem(`hc_cases_${state.activeId}`);
      localStorage.removeItem(`hc_active_case_${state.activeId}`);
      localStorage.removeItem('hc_ava_vault');
      localStorage.removeItem('hc_food_logs');
      localStorage.removeItem('hc_hydration');
      
      window.location.reload();
    }
  };

  const handleGenerateSynthesis = async () => {
    setIsGeneratingSynthesis(true);
    const result = await generateProfileSynthesis(profile);
    if (result) {
      setSynthesisData(result);
      sessionStorage.setItem('hc_profile_synthesis', JSON.stringify(result));
    }
    setIsGeneratingSynthesis(false);
  };

  // Always render the dashboard structure so the user can see it empty

  // Helper to group timeline events by date
  const groupedTimeline = profile.timeline.reduce((acc, event) => {
    const dateStr = new Date(event.date).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(event);
    return acc;
  }, {});

  const completedActions = profile.actionItems.filter((i) => i.status === 'completed').length;
  const totalActions = profile.actionItems.length;
  const recordFields = [
    profile.demographics.name,
    profile.demographics.age,
    profile.demographics.gender,
    profile.demographics.bloodGroup,
    profile.demographics.height,
    profile.demographics.weight,
    profile.demographics.emergencyContact,
  ];
  const recordReady = Math.round(
    ((recordFields.filter(Boolean).length +
      (profile.conditions.length ? 1 : 0) +
      (profile.allergies.length ? 1 : 0) +
      (profile.medications.length ? 1 : 0)) /
      10) *
      100
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, staggerChildren: 0.1 }}
      style={{ paddingBottom: '80px' }}
    >
      {/* Header */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '24px', marginBottom: '20px' }}
      >
        <div style={{ flex: '1 1 300px' }}>
          <h1
            style={{
              fontSize: isMobile ? '24px' : '28px',
              color: 'var(--text-main)',
              margin: '0 0 8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontWeight: 800,
              letterSpacing: '-0.5px',
            }}
          >
            <FolderHeart color="var(--teal)" size={32} /> Unified Medical Profile
          </h1>
          <p className="text-gray" style={{ margin: 0, fontSize: '15px' }}>
            Your entire health story on one screen — alive, updating, and ready to share.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', borderRight: '1px solid var(--border)', paddingRight: '12px', marginRight: '4px' }}>
            <button
              className="btn btn-ghost btn-sm"
              disabled={!canUndo()}
              onClick={() => undoProfileEdit()}
              style={{ padding: '6px' }}
              title="Undo Edit"
            >
              <Undo2 size={16} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={!canRedo()}
              onClick={() => redoProfileEdit()}
              style={{ padding: '6px' }}
              title="Redo Edit"
            >
              <Redo2 size={16} />
            </button>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleClearData}
            style={{ color: '#EF4444' }}
          >
            <Trash2 size={16} /> Clear Data
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleExportPDF}
            style={{ display: 'flex', gap: '8px' }}
          >
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div
        style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : 'unset',
          gridTemplateColumns: isMobile ? 'unset' : '1.1fr .9fr',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <section
          style={{
            padding: '22px 24px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg,#F0FDFA,#FFFFFF)',
            border: '1px solid #CCFBF1',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '15px',
              background: '#10B981',
              color: '#FFF',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <ClipboardCheck size={23} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{ color: '#0F766E', fontSize: '11px', fontWeight: 800, letterSpacing: '.8px' }}
            >
              HEALTH RECORD READINESS
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px', marginTop: '3px' }}>
              <strong style={{ fontSize: isMobile ? '20px' : '24px' }}>{recordReady}%</strong>
              <span style={{ color: '#64748B', fontSize: '13px' }}>
                complete for more relevant case reviews
              </span>
            </div>
            <div
              style={{
                height: '7px',
                borderRadius: '9px',
                background: '#CCFBF1',
                marginTop: '10px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${recordReady}%`,
                  height: '100%',
                  borderRadius: '9px',
                  background: 'linear-gradient(90deg,#059669,#10B981)',
                }}
              />
            </div>
          </div>
        </section>
        <section
          style={{
            padding: '22px 24px',
            borderRadius: '18px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#ECFDF5',
              color: '#059669',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <BriefcaseBusiness size={21} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{ color: '#0F766E', fontSize: '11px', fontWeight: 800, letterSpacing: '.8px' }}
            >
              ACTIVE CASE
            </div>
            <strong
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: '4px',
              }}
            >
              {activeCase?.title || 'No active case yet'}
            </strong>
            <span style={{ color: '#64748B', fontSize: '12px' }}>
              {activeCase
                ? `${activeCase.medicalRecords?.length || 0} evidence items · ${activeCase.actions?.filter((a) => a.status !== 'completed').length || 0} actions open`
                : 'Start Multiple-Specialists to create one.'}
            </span>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate(activeCase ? `/app/cases/${activeCase.id}` : '/app/multi')}
          >
            <ArrowRight size={15} />
          </button>
        </section>
      </div>

      {/* GAMIFICATION: HEALTH SCORE */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{
          padding: '20px 24px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg,#0f172a,#153d45 65%,#059669)',
          color: '#F8FAFC',
          borderRadius: '20px',
          border: 'none',
          boxShadow: '0 12px 32px rgba(15,23,42,0.15)'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: '#99f6e4' }}>
              <ShieldCheck size={18} />
              <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Profile Completeness</span>
            </div>
            <h3 style={{ fontSize: '20px', margin: '0 0 6px 0', fontWeight: 700 }}>Health Score: {healthScore.score}%</h3>
            <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.5, margin: 0, maxWidth: '400px' }}>
              A complete profile helps HealthChain's AI provide more accurate insights and clinical correlations.
            </p>

            {healthScore.missing.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Next Steps to 100%</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {healthScore.missing.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc', background: 'rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {healthScore.score === 100 && (
               <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#34D399', background: 'rgba(52,211,153,0.15)', padding: '6px 12px', borderRadius: '6px', width: 'fit-content' }}>
                  <Check size={14} /> Outstanding! Your profile is fully optimized.
               </div>
            )}
          </div>
          
          <div style={{ width: '96px', height: '96px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
              <circle cx="48" cy="48" r="42" fill="none" stroke="#99f6e4" strokeWidth="6" strokeDasharray={`${(healthScore.score / 100) * 264} 264`} strokeDashoffset="0" transform="rotate(-90 48 48)" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-out' }} />
            </svg>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#F8FAFC' }}>{healthScore.score}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* NEW: Holistic Health Synthesis */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card" 
        style={{ 
          display: isMobile ? 'flex' : 'grid', 
          flexDirection: isMobile ? 'column' : 'unset',
          gridTemplateColumns: isMobile ? 'unset' : '250px 1fr', 
          gap: '20px', 
          padding: isMobile ? '24px 16px' : '32px',
          marginBottom: '20px',
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fffd 100%)',
          border: '1px solid var(--teal-light)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: isMobile ? 'none' : '1px solid var(--border)', borderBottom: isMobile ? '1px solid var(--border)' : 'none', paddingRight: isMobile ? '0' : '32px', paddingBottom: isMobile ? '32px' : '0' }}>
          <div style={{ fontSize: isMobile ? '36px' : '48px', fontWeight: 800, color: 'var(--teal)', lineHeight: 1 }}>{synthesisData ? synthesisData.overallScore : '--'}<span style={{ fontSize: '20px', color: 'var(--text-muted)' }}>/100</span></div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginTop: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Overall Health</div>
          
          {synthesisData && (
            <div style={{ width: '100%', height: '180px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={synthesisData.radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Patient" dataKey="A" stroke="var(--teal)" fill="var(--teal)" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8B5CF6' }}>
              <Sparkles size={20} />
              <h3 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>AI Clinical Synthesis</h3>
            </div>
            {synthesisData && (
              <button 
                onClick={handleGenerateSynthesis}
                disabled={isGeneratingSynthesis}
                className="btn btn-outline btn-sm"
              >
                {isGeneratingSynthesis ? 'Regenerating...' : 'Refresh Synthesis'}
              </button>
            )}
          </div>
          
          {synthesisData ? (
             <div style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
              <ReactMarkdown>{synthesisData.synthesisText}</ReactMarkdown>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: 0 }}>
                Generate a holistic health synthesis based on your latest medical data, vitals, and case history.
              </p>
              <button 
                onClick={handleGenerateSynthesis}
                disabled={isGeneratingSynthesis}
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                  color: '#FFF',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: isGeneratingSynthesis ? 'not-allowed' : 'pointer',
                  opacity: isGeneratingSynthesis ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Sparkles size={16} /> {isGeneratingSynthesis ? 'Analyzing Profile...' : 'Generate Synthesis'}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <div
        ref={profileRef}
        style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: '20px' }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px 0' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#F1F5F9' }} className="skeleton" />
              <div style={{ flex: 1 }}>
                <div style={{ width: '40%', height: '32px', background: '#F1F5F9', borderRadius: '8px', marginBottom: '12px' }} className="skeleton" />
                <div style={{ width: '60%', height: '20px', background: '#F1F5F9', borderRadius: '8px' }} className="skeleton" />
              </div>
            </div>
            <div style={{ height: '300px', background: '#F1F5F9', borderRadius: '24px' }} className="skeleton" />
            <div style={{ height: '200px', background: '#F1F5F9', borderRadius: '24px' }} className="skeleton" />
          </div>
        ) : (
          <>
            {/* LEFT COLUMN: Hero, Vitals, Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 1. Patient Identity Header (Clean Layout) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '16px' : '24px',
                  padding: isMobile ? '12px 0' : '24px 0',
                  marginBottom: '16px',
                }}
              >
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: isMobile ? '80px' : '100px',
                  height: isMobile ? '80px' : '100px',
                  borderRadius: '50%',
                  background: 'url(https://images.unsplash.com/photo-1542360663-8f40200049d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80) center/cover, linear-gradient(135deg, #4F46E5, #3B82F6)',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '32px' : '40px',
                  fontWeight: 800,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  border: '3px solid #FFF',
                }}
              >
                {!profile.demographics.name && '👤'}
              </div>
              {!isEditingDemo && (
                <button
                  onClick={() => setIsEditingDemo(true)}
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    background: '#0F172A',
                    color: '#FFF',
                    border: '2px solid #FFF',
                    borderRadius: '12px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    boxShadow: '0 4px 12px rgba(15,23,42,0.2)',
                  }}
                >
                  <Camera size={14} />
                </button>
              )}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 900, color: '#0F172A', margin: '0 0 6px 0', letterSpacing: '-0.5px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {profile.demographics.name || 'Set Patient Name'}
              </h2>
              <div
                style={{
                  color: '#64748B',
                  fontSize: isMobile ? '14px' : '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span>{profile.demographics.age ? `Age ${profile.demographics.age}` : 'Age not set'}</span>
                <span style={{ color: '#E2E8F0', margin: '0 2px' }}>•</span>
                <span>{profile.demographics.gender || 'Other'}</span>
                <span style={{ color: '#E2E8F0', margin: '0 2px' }}>•</span>
                <span>{profile.demographics.height ? `Height ${profile.demographics.height}` : 'Height not set'}</span>
                <span style={{ color: '#E2E8F0', margin: '0 2px' }}>•</span>
                <span>{profile.demographics.weight ? `Weight ${profile.demographics.weight}` : 'Weight not set'}</span>
                <span style={{ color: '#E2E8F0', margin: '0 2px' }}>•</span>
                <span>{profile.demographics.bloodGroup || 'Blood Group not set'}</span>
                <span style={{ color: '#E2E8F0', margin: '0 2px' }}>•</span>
                <span>{profile.demographics.emergencyContact ? `Emergency: ${profile.demographics.emergencyContact}` : 'Emergency not set'}</span>
              </div>
              <div style={{ color: '#94A3B8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                <Mail size={14} /> {account.email || profile.demographics.email || 'Email not set'}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: isEditingDemo ? '24px' : '0' }}
          >
            {isEditingDemo ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '16px',
                  background: 'var(--surface)',
                  padding: '24px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                }}
              >
                <input
                  type="text"
                  placeholder="Full Name"
                  className="input"
                  value={demoForm.name}
                  onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                  style={{ gridColumn: '1 / -1' }}
                />
                <input
                  type="number"
                  placeholder="Age"
                  className="input"
                  value={demoForm.age}
                  onChange={(e) => setDemoForm({ ...demoForm, age: e.target.value })}
                />
                <select
                  className="input"
                  value={demoForm.gender}
                  onChange={(e) => setDemoForm({ ...demoForm, gender: e.target.value })}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="text"
                  placeholder="Blood Group (e.g. O+)"
                  className="input"
                  value={demoForm.bloodGroup}
                  onChange={(e) => setDemoForm({ ...demoForm, bloodGroup: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Height (e.g. 175cm)"
                  className="input"
                  value={demoForm.height}
                  onChange={(e) => setDemoForm({ ...demoForm, height: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Weight (e.g. 70kg)"
                  className="input"
                  value={demoForm.weight}
                  onChange={(e) => setDemoForm({ ...demoForm, weight: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Emergency Contact"
                  className="input"
                  value={demoForm.emergencyContact}
                  onChange={(e) => setDemoForm({ ...demoForm, emergencyContact: e.target.value })}
                />
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                  <button className="btn btn-ghost" onClick={() => setIsEditingDemo(false)} disabled={isSaving}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSaveDemographics} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Details'}
                  </button>
                </div>
              </div>
            ) : showSaved ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-12px', marginBottom: '12px' }}>
                <span className="badge badge-teal" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}><Check size={14} /> Saved</span>
              </div>
            ) : null}
          </motion.div>

          {/* 2. Active Conditions & Allergies (Alert Strip) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', alignItems: 'center' }}>
              <AnimatePresence>
              {profile.allergies.map((allergy) => (
                <motion.div
                  key={`a-${allergy}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="badge badge-red"
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <AlertTriangle size={16} /> Allergy: {allergy}
                  <button
                    onClick={() => removeAllergy(allergy)}
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '4px', opacity: 0.7 }}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
              </AnimatePresence>
              <input
                type="text"
                placeholder="Add allergy..."
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newAllergy) {
                    addAllergy(newAllergy);
                    setNewAllergy('');
                  }
                }}
                style={{ padding: '6px 12px', borderRadius: '99px', border: '1px solid var(--border)', fontSize: '13px', width: '120px' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', alignItems: 'center', borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
              <AnimatePresence>
              {(profile.familyHistory || []).map((fh) => (
                <motion.div
                  key={`fh-${fh}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="badge badge-yellow"
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    whiteSpace: 'nowrap',
                    background: '#FEF3C7',
                    color: '#92400E'
                  }}
                >
                  <Dna size={16} /> Family: {fh}
                  <button
                    onClick={() => removeFamilyHistory(fh)}
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '4px', opacity: 0.7 }}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
              </AnimatePresence>
              <input
                type="text"
                placeholder="Add family history..."
                value={newFamilyHist}
                onChange={(e) => setNewFamilyHist(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFamilyHist) {
                    addFamilyHistory(newFamilyHist);
                    setNewFamilyHist('');
                  }
                }}
                style={{ padding: '6px 12px', borderRadius: '99px', border: '1px solid var(--border)', fontSize: '13px', width: '150px' }}
              />
            </div>
          </div>

          {/* NEW: Smart Auto-Refill Adherence Engine */}
          {profile.medications.some(med => {
            const startDate = new Date(med.lastFilledAt || med.addedAt);
            const daysPassed = (new Date().getTime() - startDate.getTime()) / (1000 * 3600 * 24);
            const supplyDays = med.supplyDays || 30;
            return (supplyDays - daysPassed) <= 7 && (supplyDays - daysPassed) >= 0;
          }) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
              style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.02) 100%)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#FEF2F2', color: '#EF4444', padding: '8px', borderRadius: '50%' }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#991B1B' }}>Refill Action Required</h4>
                  <span style={{ fontSize: '13px', color: '#B91C1C' }}>Ava has detected that you are running low on critical medications.</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profile.medications.map(med => {
                  const startDate = new Date(med.lastFilledAt || med.addedAt);
                  const daysPassed = (new Date().getTime() - startDate.getTime()) / (1000 * 3600 * 24);
                  const supplyDays = med.supplyDays || 30;
                  const daysLeft = Math.floor(supplyDays - daysPassed);
                  
                  if (daysLeft <= 7 && daysLeft >= 0) {
                    return (
                      <div key={`refill-${med.name}`} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <div>
                          <strong style={{ fontSize: '15px' }}>{med.name}</strong>
                          <span style={{ display: 'block', fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>Only {daysLeft} days supply remaining</span>
                        </div>
                        <button className="btn btn-primary btn-sm" style={{ background: '#EF4444' }}>Auto-Refill Now</button>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </motion.div>
          )}

          {/* 2.5 Clinical Treatment Threads (Conditions) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <AnimatePresence>
            {profile.conditions.map((condition) => {
              if (condition.toLowerCase().includes('hypertension') || condition.toLowerCase().includes('blood pressure')) {
                return (
                  <motion.div
                    key={`thread-${condition}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="card"
                    style={{ padding: '24px', borderLeft: '4px solid #8B5CF6' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#8B5CF6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Active Treatment Thread</div>
                        <h3 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Activity size={20} color="#8B5CF6" /> {condition}
                        </h3>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeCondition(condition)}>
                        <X size={16} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', background: 'var(--surface-hover)', padding: '16px', borderRadius: 'var(--radius-lg)' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <HeartPulse size={14} /> Connected Treatment
                        </div>
                        <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <strong style={{ display: 'block', fontSize: '15px' }}>Lisinopril 10mg</strong>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Daily, morning</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Beaker size={14} /> Tracking Metric
                        </div>
                        <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <strong style={{ display: 'block', fontSize: '15px', color: '#3B82F6' }}>Blood Pressure (118/75)</strong>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Stabilized over 30 days</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={`thread-${condition}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="card"
                  style={{ padding: '20px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <h3 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, wordBreak: 'break-word' }}>
                      <Activity size={16} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} /> {condition}
                    </h3>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeCondition(condition)}>
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Add allergy..."
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newAllergy) {
                    addAllergy(newAllergy);
                    setNewAllergy('');
                  }
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '99px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  width: '120px',
                }}
              />
            </div>
          </div>

          {/* 4. Vitals & Biomarkers Dashboard */}
          <div className="card" style={{ padding: '20px' }}>
            <h3
              style={{
                fontSize: '18px',
                color: 'var(--text-main)',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Beaker size={20} color="#3B82F6" /> Vitals & Biomarkers Dashboard
            </h3>

            {/* NEW: Interactive Health Graph */}
            <div style={{ marginBottom: '20px', height: '240px', borderBottom: '1px solid var(--border)', paddingBottom: '32px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', margin: 0, color: 'var(--text-main)', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Longitudinal Trends</h4>
                <select 
                  className="input" 
                  style={{ padding: '4px 8px', fontSize: '12px', minHeight: 'auto', width: 'auto' }}
                  value={chartMetric}
                  onChange={(e) => setChartMetric(e.target.value as any)}
                >
                  <option value="eGFR">eGFR (Kidney)</option>
                  <option value="weight">Weight</option>
                  <option value="bpSystolic">Blood Pressure</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartMetric === 'eGFR' ? '#3B82F6' : chartMetric === 'weight' ? '#10B981' : '#EF4444'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={chartMetric === 'eGFR' ? '#3B82F6' : chartMetric === 'weight' ? '#10B981' : '#EF4444'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={chartMetric === 'eGFR' ? [0, 100] : chartMetric === 'weight' ? [75, 90] : [80, 160]} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)', background: 'var(--surface)' }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey={chartMetric} 
                    stroke={chartMetric === 'eGFR' ? '#3B82F6' : chartMetric === 'weight' ? '#10B981' : '#EF4444'} 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorMetric)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {Object.keys(profile.vitals.latestLabValues).length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  background: 'var(--surface-hover)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border-strong)',
                }}
              >
                <p className="text-gray mb-4">No lab reports parsed yet.</p>
                <button className="btn btn-navy btn-sm" onClick={() => navigate('/app/reports')}>
                  Upload Lab Report
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px',
                }}
              >
                {Object.entries(profile.vitals.latestLabValues).map(([key, data]: [string, any], i) => (
                  <div
                    key={i}
                    style={{
                      padding: '16px',
                      background: 'var(--surface-hover)',
                      borderRadius: 'var(--radius-lg)',
                      borderLeft: `3px solid ${data.status === 'HIGH' || data.status === 'LOW' ? '#EF4444' : '#3B82F6'}`,
                      position: 'relative',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: 'var(--text-main)',
                          fontWeight: 700,
                          fontSize: '15px',
                          marginBottom: '4px',
                        }}
                      >
                        {key}
                      </div>
                      <div
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '13px',
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {data.value} {data.unit !== 'Scan' && data.unit}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(data.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    {data.status !== 'INFO' && data.unit !== 'Scan' && (
                      <span
                        style={{
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '99px',
                          background:
                            data.status === 'HIGH' || data.status === 'LOW'
                              ? 'rgba(239, 68, 68, 0.1)'
                              : 'rgba(59, 130, 246, 0.1)',
                          color:
                            data.status === 'HIGH' || data.status === 'LOW' ? '#EF4444' : '#3B82F6',
                          fontWeight: 700,
                        }}
                      >
                        {data.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. Medical Timeline */}
          <div>
            <h3
              style={{
                fontSize: '18px',
                color: 'var(--text-main)',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Clock size={20} color="var(--teal)" /> Medical Timeline
            </h3>

            <div className="card" style={{ padding: '32px 32px 32px 40px', position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '20px',
                  top: '32px',
                  bottom: '32px',
                  width: '2px',
                  background: 'var(--surface-hover)',
                }}
              />

              {profile.timeline.length === 0 && (
                <p className="text-gray m-0 text-center py-8">No events recorded in timeline.</p>
              )}

              {Object.entries(groupedTimeline).map(([dateStr, events]: [string, any[]], gIdx) => (
                <div
                  key={dateStr}
                  style={{
                    marginBottom: gIdx === Object.keys(groupedTimeline).length - 1 ? 0 : '40px',
                  }}
                >
                  {/* Date Header */}
                  <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '-27px',
                        top: '4px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: 'var(--surface)',
                        border: '4px solid var(--border-strong)',
                        zIndex: 2,
                      }}
                    />
                    <h4
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      {dateStr}
                    </h4>
                  </div>

                  {events.map((event, idx) => {
                    const isRecent = profile.timeline.findIndex((e) => e.id === event.id) < 8;
                    const hasDetails =
                      event.data?.chain_name ||
                      event.data?.abnormalities ||
                      event.data?.topDiagnoses;
                    return (
                      <div
                        key={event.id}
                        style={{
                          position: 'relative',
                          marginLeft: '16px',
                          marginBottom: idx === events.length - 1 ? 0 : '12px',
                          padding: '12px 16px',
                          background: 'var(--surface-hover)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div className="flex-between mb-2">
                          <span
                            className={`badge ${event.type === 'diagnosis' ? 'badge-amber' : event.type === 'lab_report' ? 'badge-teal' : event.type === 'mental_health' ? 'badge-green' : 'badge-navy'}`}
                            style={{ padding: '2px 8px', fontSize: '10px' }}
                          >
                            {event.source.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-gray" style={{ fontSize: '11px' }}>
                            {new Date(event.date).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <h5
                          style={{
                            fontSize: '14px',
                            color: 'var(--text-main)',
                            margin: isRecent && hasDetails ? '0 0 8px 0' : 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          {event.type === 'diagnosis' ? (
                            <Activity size={16} color="var(--teal)" />
                          ) : event.type === 'lab_report' ? (
                            <FileText size={16} color="#3B82F6" />
                          ) : (
                            <Link2 size={16} />
                          )}
                          {event.title}
                        </h5>

                        {isRecent && event.data?.chain_name && (
                          <div
                            style={{
                              padding: '8px 12px',
                              background: 'var(--surface)',
                              borderRadius: '6px',
                              borderLeft: '3px solid var(--teal)',
                              fontSize: '13px',
                              marginBottom: '4px',
                            }}
                          >
                            <strong style={{ color: 'var(--text-muted)' }}>Hypothesis:</strong>{' '}
                            <span style={{ fontWeight: 500 }}>{event.data.chain_name}</span>
                          </div>
                        )}
                        {isRecent && event.data?.abnormalities && (
                          <div
                            style={{
                              padding: '8px 12px',
                              background: 'var(--surface)',
                              borderRadius: '6px',
                              borderLeft: '3px solid #EF4444',
                              fontSize: '13px',
                              marginBottom: '4px',
                            }}
                          >
                            <strong style={{ color: 'var(--text-muted)' }}>Abnormalities:</strong>{' '}
                            <span style={{ fontWeight: 500 }}>
                              {event.data.abnormalities.join(', ')}
                            </span>
                          </div>
                        )}
                        {isRecent && event.data?.topDiagnoses && (
                          <div
                            style={{
                              padding: '8px 12px',
                              background: 'var(--surface)',
                              borderRadius: '6px',
                              borderLeft: '3px solid #8B5CF6',
                              fontSize: '13px',
                              marginBottom: '4px',
                            }}
                          >
                            <strong style={{ color: 'var(--text-muted)' }}>Board Consensus:</strong>{' '}
                            <span style={{ fontWeight: 500 }}>
                              {event.data.topDiagnoses[0]?.condition} (
                              {event.data.topDiagnoses[0]?.confidence}%)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Meds, Actions, Family History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* NEW: Care Team & Document Vault */}
          <div className="card" style={{ padding: isMobile ? '16px' : '24px' }}>
            <h3
              style={{
                fontSize: '16px',
                color: 'var(--text-main)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Users size={18} color="#10B981" /> Active Care Team
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/app/multi')} 
                style={{ padding: '12px', background: 'var(--surface-hover)', borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--border)' }}
              >
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ECFDF5', color: '#10B981', display: 'grid', placeItems: 'center' }}><User size={12}/></div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>Cardiology AI</strong>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned to active case</span>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/app/diet')} 
                style={{ padding: '12px', background: 'var(--surface-hover)', borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--border)' }}
              >
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FEF3C7', color: '#D97706', display: 'grid', placeItems: 'center' }}><User size={12}/></div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>Dietician AI</strong>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nutrition plan active</span>
              </motion.div>
            </div>

            <h3
              style={{
                fontSize: '16px',
                color: 'var(--text-main)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderTop: '1px solid var(--border)',
                paddingTop: '20px'
              }}
            >
              <FileText size={18} color="#64748B" /> Document Vault
            </h3>
            <button 
              className="btn btn-outline btn-sm" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => navigate('/app/reports')}
            >
               View Source Documents
            </button>
          </div>

          {/* 3. Active Medications */}
          <div className="card" style={{ padding: isMobile ? '16px' : '24px' }}>
            <h3
              style={{
                fontSize: '16px',
                color: 'var(--text-main)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <HeartPulse size={18} color="#8B5CF6" /> Active Medications
            </h3>
            {profile.medications.length === 0 ? (
              <p className="text-sm text-gray m-0 mb-4">No active medications.</p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <AnimatePresence>
                {profile.medications.map((m) => (
                  <motion.div
                    key={m.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    style={{
                      padding: '16px',
                      background: 'var(--surface-hover)',
                      borderRadius: 'var(--radius-lg)',
                      borderLeft: '3px solid #8B5CF6',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        color: 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '15px',
                        marginBottom: '4px',
                        paddingRight: '24px',
                      }}
                    >
                      {m.name}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {m.source === 'pharmacy_hub' ? 'Added via PharmacyHub' : 'Manually added'}
                    </div>
                    <button
                      onClick={() => removeMedication(m.name)}
                      style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            )}
            <button
              className="btn btn-outline btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => navigate('/app/pharmacy')}
            >
              <Plus size={16} /> Add via PharmacyHub
            </button>
          </div>

          {/* 5. Action Items */}
          <div className="card" style={{ padding: isMobile ? '16px' : '24px' }}>
            <div className="flex-between mb-4">
              <h3
                style={{
                  fontSize: '16px',
                  color: 'var(--text-main)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={18} color="var(--teal)" /> Action Plan
              </h3>
              {totalActions > 0 && (
                <span className="text-xs font-bold" style={{ color: 'var(--teal)' }}>
                  {completedActions}/{totalActions} Done
                </span>
              )}
            </div>

            {totalActions === 0 ? (
              <p className="text-sm text-gray m-0">No actions required currently.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {profile.actionItems.map((item) => {
                  let extractedDrug = null;
                  const match = item.task.match(/(?:Take|Start|Prescribe)\s+([A-Za-z0-9\-]+)/i);
                  if (match && match[1]) extractedDrug = match[1];

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleActionItem(item.id)}
                      style={{
                        padding: '16px',
                        background:
                          item.status === 'completed' ? 'var(--surface)' : 'var(--surface-hover)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        opacity: item.status === 'completed' ? 0.6 : 1,
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '6px',
                          border: `2px solid ${item.status === 'completed' ? 'var(--teal)' : 'var(--border-strong)'}`,
                          background: item.status === 'completed' ? 'var(--teal)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {item.status === 'completed' && <Check size={14} color="#FFF" />}
                      </div>
                      <div style={{ flex: 1, paddingRight: extractedDrug ? '90px' : '0' }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: item.status === 'completed' ? 500 : 600,
                            color: 'var(--text-main)',
                            textDecoration: item.status === 'completed' ? 'line-through' : 'none',
                            marginBottom: '4px',
                          }}
                        >
                          {item.task}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            gap: '8px',
                          }}
                        >
                          <span>From {item.source}</span>
                          {item.cost && (
                            <span style={{ color: '#F59E0B', fontWeight: 600 }}>
                              • Est. {item.cost}
                            </span>
                          )}
                        </div>
                      </div>
                      {extractedDrug && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/app/pharmacy', { state: { searchQuery: extractedDrug } });
                          }}
                          style={{
                            position: 'absolute',
                            right: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: '#ECFDF5',
                            color: '#10B981',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            zIndex: 2,
                          }}
                        >
                          <Search size={12} /> Lookup
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeActionItem(item.id);
                          setProfile(getProfile()); // Force refresh
                        }}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2,
                        }}
                        title="Remove Action Item"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: isMobile ? '16px' : '24px' }}>
            <h3
              style={{
                fontSize: '16px',
                color: 'var(--text-main)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <User size={18} color="#F59E0B" /> Family History
            </h3>
            <p className="text-xs text-gray mb-4">
              Adding family history improves AI investigative accuracy.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {profile.familyHistory.length === 0 && (
                <div style={{ fontSize: '14px', color: '#64748B' }}>No family history recorded.</div>
              )}
              {profile.familyHistory.map((hist, i) => (
                <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '10px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '14px', color: '#0F172A', fontWeight: 500 }}>{hist}</span>
                  <button onClick={() => removeFamilyHistory(hist)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <input
              type="text"
              placeholder="e.g. Diabetes (Father)"
              value={newFamilyHist}
              onChange={(e) => setNewFamilyHist(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFamilyHist) {
                  addFamilyHistory(newFamilyHist);
                  setNewFamilyHist('');
                }
              }}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '13px',
                background: 'var(--surface)',
              }}
            />
          </div>
          </div>
        </>
        )}
      </div>
    </motion.div>
  );
}
