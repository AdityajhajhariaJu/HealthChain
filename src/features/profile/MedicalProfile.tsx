import { awardPoints } from '../../services/VitalityPointsEngine';
import { VitalityRing } from '../../components/ui/VitalityRing';
import { SensualLineChart } from '../../components/ui/SensualLineChart';
import { PredictiveTimeline } from '../../components/ui/PredictiveTimeline';
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
  ChevronDown,
  ArrowRight,
  Sparkles,
  ClipboardCheck,
  Dna,
  Camera,
  Mail,

  Lock,
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

  getProfileEngineState,
  getProfileKey,
} from '../../services/ProfileEngine';
import { getActiveCase } from '../../services/CaseEngine';
import { generateProfileSynthesis } from '../../services/geminiService';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getRunScope } from '../../services/RunContext';
import { cleanClinicalText } from '../../components/ui/RichReportTemplate';


export default function MedicalProfile() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'timeline' | 'insights'>('overview');
  const navigate = useNavigate();
  const synthesisKey = getRunScope('profile', 'draft', 'synthesis');
  const [profile, setProfile] = useState(getProfile());
  const healthScore = calculateHealthScore(profile);
  const [_trigger, setTrigger] = useState(0); // Force re-render for undo/redo state

  const [isEditingDemo, setIsEditingDemo] = useState(() => {
    return sessionStorage.getItem('hc_profile_demo_editing') === 'true';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [demoForm, setDemoForm] = useState(() => {
    try {
      const saved = sessionStorage.getItem('hc_profile_demo_form');
      return saved ? JSON.parse(saved) : profile.demographics;
    } catch {
      return profile.demographics;
    }
  });

  useEffect(() => {
    try { sessionStorage.setItem('hc_profile_demo_editing', String(isEditingDemo)); } catch(e) {}
    if (isEditingDemo) {
      try { sessionStorage.setItem('hc_profile_demo_form', JSON.stringify(demoForm)); } catch(e) {}
    } else {
      try { sessionStorage.removeItem('hc_profile_demo_form'); } catch(e) {}
    }
  }, [isEditingDemo, demoForm]);
  const [newAllergy, setNewAllergy] = useState('');
  const [newFamilyHist, setNewFamilyHist] = useState('');
  const [activeCase, setActiveCase] = useState(getActiveCase());
  const [chartMetric, setChartMetric] = useState<'eGFR' | 'weight' | 'bpSystolic'>('eGFR');
  const [synthesisData, setSynthesisData] = useState<any>(() => {
    try {
      const cached = sessionStorage.getItem(synthesisKey);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isGeneratingSynthesis, setIsGeneratingSynthesis] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
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
  const computedLongitudinalData = (profile?.vitals?.historicalLabs || []).map(entry => {
    const dateObj = new Date(entry?.date || Date.now());
    const month = isNaN(dateObj.getTime())
      ? 'Lab'
      : `${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getDate()}`;
    const eGFR = entry?.biomarkers?.eGFR?.value || null;
    const weight = entry?.biomarkers?.Weight?.value || null;
    const bpRaw = entry?.biomarkers?.['Blood Pressure']?.value;
    const bpSystolic = bpRaw
      ? parseInt(String(bpRaw).split('/')[0], 10) || null
      : null;
    return { month, eGFR, weight, bpSystolic };
  }).filter(d => d.eGFR !== null || d.weight !== null || d.bpSystolic !== null);
  
  const displayData = computedLongitudinalData;

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
      
      const isComplete = demoForm.dob && demoForm.gender && demoForm.bloodGroup;
      if (isComplete) {
        awardPoints(10, 'Health Profile Completed', 'platform', 'profile_completion');
      }

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

    try {
      const opt = {
        margin: [15, 10, 15, 10] as [number, number, number, number], // top, left, bottom, right
        filename: `HealthChain_Profile_${profile?.demographics?.name || 'Patient'}.pdf`,
        image: { type: 'jpeg' as const, quality: 1 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 1200 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      };
      
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set(opt).from(container).save();
    } catch (e) {
      console.warn('PDF export failed:', e);
    } finally {
      // Restore interactive elements
      interactiveElements.forEach((el) => {
        (el as HTMLElement).style.display = originalDisplays.get(el);
      });
      container.classList.remove('pdf-exporting');
    }
  };

  const executeClearData = () => {
    clearProfile();
    localStorage.removeItem(getProfileKey().replace('hc_unified_profile', 'hc_diet_profile'));
    localStorage.removeItem('hc_history');
    
    const state = getProfileEngineState();
    const profileKey = getProfileKey();
    localStorage.removeItem(profileKey.replace('hc_unified_profile', 'hc_cases') + '_' + state.activeId);
    localStorage.removeItem(profileKey.replace('hc_unified_profile', 'hc_active_case') + '_' + state.activeId);
    localStorage.removeItem(profileKey.replace('hc_unified_profile', 'hc_ava_vault'));
    localStorage.removeItem(profileKey.replace('hc_unified_profile', 'hc_food_logs'));
    localStorage.removeItem(profileKey.replace('hc_unified_profile', 'hc_hydration'));
    localStorage.removeItem(profileKey.replace('hc_unified_profile', 'hc_meal_plan'));
    localStorage.removeItem(profileKey.replace('hc_unified_profile', 'hc_diet_advice'));
    
    window.location.reload();
  };

  const handleGenerateSynthesis = async () => {
    setIsGeneratingSynthesis(true);
    try {
      const result = await generateProfileSynthesis(profile);
      if (result) {
        setSynthesisData(result);
        try { sessionStorage.setItem(synthesisKey, JSON.stringify(result)); } catch(e) {}
      }
    } catch (error) {
      console.error('Profile synthesis failed:', error);
    } finally {
      setIsGeneratingSynthesis(false);
    }
  };

  const significantHash = JSON.stringify([
    profile.conditions, // was medicalConditions
    profile.medications,
    profile.allergies,
    profile.familyHistory,
    profile.demographics
  ]);
  const prevHashRef = useRef(significantHash);

  useEffect(() => {
    const hasSignificantData = profile.conditions?.length > 0 || profile.medications?.length > 0 || profile.allergies?.length > 0;
    const isNewLoadWithoutSynthesis = hasSignificantData && !synthesisData && !isGeneratingSynthesis && !sessionStorage.getItem(synthesisKey);
    
    if (significantHash !== prevHashRef.current || isNewLoadWithoutSynthesis) {
      prevHashRef.current = significantHash;
      if (hasSignificantData) {
        // Debounce to prevent multiple rapid triggers during load
        const timeoutId = setTimeout(() => {
          handleGenerateSynthesis();
        }, 1000);
        return () => clearTimeout(timeoutId);
      } else {
        setSynthesisData(null);
        sessionStorage.removeItem(synthesisKey);
      }
    }
  }, [significantHash, synthesisKey]);

  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const [expandedAggregates, setExpandedAggregates] = useState<Record<string, boolean>>({});

  // Helper to group and intelligently compress timeline events by date
  const groupedTimeline = useMemo(() => {
    const rawGrouped: Record<string, any[]> = {};
    
    (profile.timeline || []).forEach((event) => {
      const dateStr = new Date(event.date).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      if (!rawGrouped[dateStr]) rawGrouped[dateStr] = [];
      rawGrouped[dateStr].push(event);
    });

    const compressedGrouped: Record<string, any[]> = {};

    Object.entries(rawGrouped).forEach(([dateStr, events]) => {
      const regularEvents: any[] = [];
      const healthBuddySessions: any[] = [];

      events.forEach((ev) => {
        const titleLower = (ev.title || '').toLowerCase();
        const sourceLower = (ev.source || '').toLowerCase();
        if (sourceLower === 'health_buddy' || titleLower.includes('ava health buddy')) {
          healthBuddySessions.push(ev);
        } else {
          regularEvents.push(ev);
        }
      });

      const finalEvents: any[] = [...regularEvents];

      if (healthBuddySessions.length > 0) {
        if (healthBuddySessions.length === 1) {
          finalEvents.unshift(healthBuddySessions[0]);
        } else {
          healthBuddySessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const latest = healthBuddySessions[0];
          finalEvents.unshift({
            id: `hb-agg-${dateStr}`,
            date: latest.date,
            source: 'health_buddy',
            type: 'mental_health',
            title: 'Ava Health Buddy Session',
            isAggregated: true,
            sessionCount: healthBuddySessions.length,
            latestTime: new Date(latest.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            allSessions: healthBuddySessions,
          });
        }
      }

      finalEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      compressedGrouped[dateStr] = finalEvents;
    });

    return compressedGrouped;
  }, [profile.timeline]);

  const uniqueActionItems = useMemo(() => {
    const seen = new Set<string>();
    return (profile.actionItems || []).filter((item: any) => {
      let rawText = item?.task || item?.step || item?.action || item?.title || '';
      rawText = cleanClinicalText(rawText);
      const key = rawText.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [profile.actionItems]);

  const completedActions = uniqueActionItems.filter((i) => i.status === 'completed').length;
  const totalActions = uniqueActionItems.length;
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
      {/* Premium Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #f1f5f9',
          padding: isMobile ? '24px' : '32px',
          marginBottom: '32px',
          boxShadow: '0 10px 40px -10px rgba(15, 23, 42, 0.05)'
        }}
      >
        {/* Background glowing orbs for depth */}
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '200px', height: '200px', background: 'var(--teal)', filter: 'blur(80px)', opacity: 0.1, borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '10%', width: '200px', height: '200px', background: '#3b82f6', filter: 'blur(100px)', opacity: 0.05, borderRadius: '50%' }} />

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', alignItems: isMobile ? 'flex-start' : 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px', background: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.15), inset 0 0 0 1px rgba(16, 185, 129, 0.1)',
            color: 'var(--teal)', flexShrink: 0
          }}>
            <FolderHeart size={32} strokeWidth={2.5} />
          </div>
          
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: isMobile ? '26px' : '32px',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 6px 0',
              letterSpacing: '-0.03em',
            }}>
              Unified Medical Profile
            </h1>
            <p style={{ margin: 0, fontSize: '15px', color: '#64748B', fontWeight: 500, lineHeight: 1.5, maxWidth: '600px' }}>
              Your entire health story on one screen — alive, updating, and ready to share.
            </p>
          </div>
        </div>
      </motion.div>

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
          padding: isMobile ? '18px 20px' : '22px 32px',
          margin: isMobile ? '0 0 20px 0' : '0 32px 24px 32px',
          background: 'linear-gradient(135deg,#0f172a,#153d45 65%,#059669)',
          color: '#F8FAFC',
          borderRadius: '20px',
          border: 'none',
          boxShadow: '0 12px 32px rgba(15,23,42,0.15)'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: '#99f6e4' }}>
              <ShieldCheck size={18} />
              <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Profile Completeness</span>
            </div>
            <h3 style={{ fontSize: '20px', margin: '0 0 6px 0', fontWeight: 700 }}>Health Score: {healthScore.score}%</h3>
            <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.5, margin: 0, maxWidth: '480px' }}>
              A complete profile helps HealthChain's AI provide more accurate insights and clinical correlations.
            </p>

            {healthScore.missing.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Next Steps to 100%</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {healthScore.missing.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc', background: 'rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                      <span>{item}</span>
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
          
          <div style={{ width: '96px', height: '96px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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


      {/* TABS NAVIGATION */}
      <div className="profile-tabs-nav" style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {[
          { id: 'overview', label: 'Overview', icon: <User size={16} /> },
          { id: 'records', label: 'Records & Vitals', icon: <Activity size={16} /> },
          { id: 'timeline', label: 'Timeline', icon: <Clock size={16} /> },
          { id: 'insights', label: 'Insights', icon: <Sparkles size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '12px',
              background: activeTab === tab.id ? 'var(--teal)' : '#FFFFFF',
              color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-main)',
              border: activeTab === tab.id ? '1px solid var(--teal)' : '1px solid var(--border)',
              fontWeight: 650,
              fontSize: '14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(15, 139, 126, 0.2)' : '0 2px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
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
<div className={(activeTab !== "overview" && activeTab !== "insights") ? "tab-content-hidden" : ""} style={{ display: (activeTab === "overview" || activeTab === "insights") ? "flex" : "none", flexDirection: "column", gap: "24px", gridColumn: "1 / -1" }}>

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
            {!profile?.isPro && (
              <button 
                onClick={() => navigate('/pricing')}
                className="btn btn-primary btn-sm"
                style={{ 
                  background: 'linear-gradient(135deg, #4F46E5, #3B82F6)', 
                  border: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                }}
              >
                <Lock size={14} /> Upgrade to Premium
              </button>
            )}
            {isGeneratingSynthesis && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8B5CF6', fontSize: '13px', fontWeight: 600 }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ width: '14px', height: '14px', border: '2px solid rgba(139,92,246,0.3)', borderTopColor: '#8B5CF6', borderRadius: '50%' }} />
                Analyzing Profile...
              </div>
            )}
          </div>
          
          {synthesisData ? (
             <motion.div 
               animate={{ opacity: isGeneratingSynthesis ? 0.5 : 1 }}
               style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}
             >
              <ReactMarkdown>{synthesisData.synthesisText}</ReactMarkdown>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: 0 }}>
                {isGeneratingSynthesis ? 'Your AI Clinical Synthesis is being automatically generated based on your profile...' : 'Add medical conditions, medications, or allergies to unlock your automated AI Clinical Synthesis.'}
              </p>
            </div>
          )}
        </div>
      </motion.div>

          </div>
<div className={activeTab !== "overview" ? "tab-content-hidden" : ""} style={{ display: activeTab === "overview" ? "flex" : "none", flexDirection: "column", gap: "24px", gridColumn: "1 / -1" }}>
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

          {/* 2.5 Active Health Conditions */}
          {profile.conditions && profile.conditions.length > 0 && (
            <div className="card" style={{ padding: '16px 20px', borderRadius: '16px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(15,23,42,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={15} color="var(--teal)" /> Active Health Conditions ({profile.conditions.length})
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <AnimatePresence>
                  {profile.conditions.map((condition) => (
                    <motion.div
                      key={`c-${condition}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        padding: '6px 12px',
                        borderRadius: 999,
                        fontSize: '13px',
                        fontWeight: 650,
                        color: '#0F172A',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Activity size={13} color="var(--teal)" style={{ flexShrink: 0 }} />
                      <span>{cleanClinicalText(condition)}</span>
                      <button
                        onClick={() => removeCondition(condition)}
                        aria-label={`Remove condition ${condition}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px',
                          borderRadius: '50%',
                          marginLeft: '2px'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; }}
                      >
                        <X size={13} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {uniqueActionItems.map((item) => {
                  let extractedDrug: string | null = null;
                  const rawText = typeof item?.task === 'string' && item.task.length > 0 
                    ? item.task 
                    : (typeof item?.step === 'string' && item.step.length > 0 
                      ? item.step 
                      : (typeof item?.action === 'string' && item.action.length > 0 
                        ? item.action 
                        : (typeof item?.title === 'string' ? item.title : 'Review clinical assessment')));
                  
                  const cleanTitle = cleanClinicalText(rawText)
                    .replace(/\s*·\s*(Immediately|Investigation|Consultation|Routine|Urgent)[\s\S]*/i, '')
                    .replace(/["'{}]/g, '')
                    .trim() || 'Review clinical finding';

                  const match = cleanTitle.match(/(?:Take|Start|Prescribe)\s+([A-Za-z0-9\-]+)/i);
                  if (match && match[1]) extractedDrug = match[1];

                  const isCompleted = item.status === 'completed';

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleActionItem(item.id)}
                      style={{
                        padding: '10px 12px',
                        background: isCompleted ? '#F0FDF4' : 'var(--surface-hover)',
                        borderRadius: '12px',
                        border: `1px solid ${isCompleted ? '#BBF7D0' : 'var(--border)'}`,
                        display: 'flex',
                        gap: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        alignItems: 'center',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '5px',
                          border: `2px solid ${isCompleted ? '#16A34A' : 'var(--border-strong)'}`,
                          background: isCompleted ? '#16A34A' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isCompleted && <Check size={12} color="#FFF" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: extractedDrug ? '70px' : '8px' }}>
                        <div
                          style={{
                            fontSize: '13.5px',
                            fontWeight: isCompleted ? 500 : 650,
                            color: isCompleted ? '#15803D' : 'var(--text-main)',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={cleanTitle}
                        >
                          {cleanTitle}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            gap: '6px',
                            marginTop: '2px',
                            alignItems: 'center'
                          }}
                        >
                          <span style={{ textTransform: 'capitalize' }}>
                            {item.source ? item.source.replace('_', ' ') : 'MDT Hub'}
                          </span>
                          {item.timeline && (
                            <span>• {item.timeline}</span>
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
                            background: '#ECFDF5',
                            color: '#10B981',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          <Search size={11} /> Lookup
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeActionItem(item.id);
                          setProfile(getProfile());
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          flexShrink: 0
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; }}
                        title="Remove Action Item"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

</div>
<div className={activeTab !== "records" ? "tab-content-hidden" : ""} style={{ display: activeTab === "records" ? "flex" : "none", flexDirection: "column", gap: "24px", gridColumn: "1 / -1" }}>
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
            <div style={{ position: 'relative', marginBottom: '20px', height: '240px', borderBottom: '1px solid var(--border)', paddingBottom: '32px' }}>
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
                  {displayData.length > 0 ? (
                    <Area 
                      type="monotone" 
                      dataKey={chartMetric} 
                      stroke={chartMetric === 'eGFR' ? '#3B82F6' : chartMetric === 'weight' ? '#10B981' : '#EF4444'} 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorMetric)" 
                    />
                  ) : null}
                </AreaChart>
              </ResponsiveContainer>
              {displayData.length === 0 && (
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, textAlign: 'center', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No historical data available. Upload lab reports to track your metrics.
                </div>
              )}
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

          
      {/* Advanced Clinical Engines Section */}
      <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Vitality Score */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ padding: '24px' }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0', color: '#0F172A', letterSpacing: '-0.5px' }}>Vitality Score</h2>
          <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: '13px' }}>Your 7-day health momentum.</p>
          <VitalityRing progress={82} />
          <SensualLineChart />
          
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '13px', color: '#64748B', lineHeight: '1.6' }}>
            <strong style={{ color: '#0F172A' }}>How it's calculated:</strong> The Vitality Score aggregates your rolling 7-day momentum across three pillars:<br/>
            &bull; <strong>Clinical Adherence (40%):</strong> Staying within your AI Dietician's medical guardrails (e.g., sodium/calorie targets).<br/>
            &bull; <strong>Biometric Recovery (40%):</strong> Apple Health / Google Fit passive data (Resting HR, HRV, Sleep Duration).<br/>
            &bull; <strong>App Engagement (20%):</strong> Consistency in logging meals, check-ins, and symptom tracking.
          </div>
        </motion.div>

        {/* Predictive Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
          style={{ padding: '24px 0' }}
        >
          <PredictiveTimeline />
          <div style={{ padding: '0 24px', marginTop: '8px' }}>
            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '13px', color: '#64748B', lineHeight: '1.6' }}>
              <strong style={{ color: '#0F172A' }}>How it works:</strong> The Predictive Timeline is a proactive biological forecast.<br/>
              &bull; It pulls your passive biometric stream (Heart Rate, Glucose, Activity) from wearables.<br/>
              &bull; It runs the data through the clinical engine to predict upcoming biological states (like a glucose crash or peak metabolic rate).<br/>
              &bull; It allows you to anticipate your body's needs before you actually feel symptoms like fatigue or cravings.
            </div>
          </div>
        </motion.div>

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
<div className={activeTab !== "timeline" ? "tab-content-hidden" : ""} style={{ display: activeTab === "timeline" ? "flex" : "none", flexDirection: "column", gap: "24px", gridColumn: "1 / -1" }}>
          {/* 6. Medical Timeline */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Clock size={18} color="var(--teal)" /> Medical Timeline
              </h3>
              {Object.keys(groupedTimeline).length > 2 && (
                <button
                  onClick={() => setShowAllTimeline(prev => !prev)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--teal)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px'
                  }}
                >
                  {showAllTimeline ? 'Show Recent Only' : `View All (${Object.keys(groupedTimeline).length} days)`}
                  <ChevronDown size={14} style={{ transform: showAllTimeline ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
              )}
            </div>

            <div className="card" style={{ padding: isMobile ? '16px' : '20px 24px', position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: isMobile ? '24px' : '32px',
                  top: '24px',
                  bottom: '24px',
                  width: '2px',
                  background: 'var(--surface-hover)',
                }}
              />

              {profile.timeline.length === 0 && (
                <p className="text-gray m-0 text-center py-6" style={{ fontSize: '14px' }}>No events recorded in timeline yet.</p>
              )}

              {(() => {
                const allEntries = Object.entries(groupedTimeline);
                const visibleEntries = showAllTimeline ? allEntries : allEntries.slice(0, 2);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {visibleEntries.map(([dateStr, events]: [string, any[]]) => (
                      <div key={dateStr} style={{ position: 'relative' }}>
                        {/* Date Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', marginLeft: isMobile ? '28px' : '36px' }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: isMobile ? '21px' : '29px',
                              top: '4px',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: 'var(--teal)',
                              zIndex: 2,
                            }}
                          />
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              color: 'var(--text-muted)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.8px',
                            }}
                          >
                            {dateStr}
                          </span>
                        </div>

                        {/* Events on this date */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: isMobile ? '28px' : '36px' }}>
                          {events.map((event) => {
                            const isAggregated = !!event.isAggregated;
                            const isExpanded = !!expandedAggregates[event.id];

                            let badgeBg = '#F1F5F9';
                            let badgeColor = '#475569';
                            if (event.type === 'diagnosis' || event.source === 'mdt_hub') {
                              badgeBg = '#FEF3C7';
                              badgeColor = '#B45309';
                            } else if (event.type === 'lab_report') {
                              badgeBg = '#EFF6FF';
                              badgeColor = '#1D4ED8';
                            } else if (event.source === 'health_buddy') {
                              badgeBg = '#F0FDF4';
                              badgeColor = '#15803D';
                            }

                            return (
                              <div
                                key={event.id}
                                style={{
                                  padding: '8px 12px',
                                  background: 'var(--surface-hover)',
                                  borderRadius: '10px',
                                  border: '1px solid var(--border)',
                                  fontSize: '13px',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                    <span
                                      style={{
                                        background: badgeBg,
                                        color: badgeColor,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        flexShrink: 0
                                      }}
                                    >
                                      {event.source.replace('_', ' ')}
                                    </span>
                                    <span style={{ fontWeight: 650, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {isAggregated ? `Ava Health Buddy (${event.sessionCount} sessions)` : event.title}
                                    </span>
                                    {isAggregated && (
                                      <button
                                        onClick={() => setExpandedAggregates(prev => ({ ...prev, [event.id]: !prev[event.id] }))}
                                        style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', padding: 0 }}
                                      >
                                        {isExpanded ? 'Hide' : 'Details'}
                                        <ChevronDown size={12} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
                                      </button>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>
                                    {isAggregated ? `Latest ${event.latestTime}` : new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                {isAggregated && isExpanded && (
                                  <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {event.allSessions.map((s: any, sIdx: number) => (
                                      <span key={sIdx} style={{ fontSize: '11px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                        {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {event.data?.chain_name && (
                                  <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    <strong>Hypothesis:</strong> {event.data.chain_name}
                                  </div>
                                )}
                                {event.data?.topDiagnoses && event.data.topDiagnoses[0]?.condition && (
                                  <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    <strong>Consensus:</strong> {event.data.topDiagnoses[0].condition} ({event.data.topDiagnoses[0].confidence || event.data.topDiagnoses[0].probability || 0}%)
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {!showAllTimeline && allEntries.length > 2 && (
                      <button
                        onClick={() => setShowAllTimeline(true)}
                        className="btn btn-outline btn-sm"
                        style={{ alignSelf: 'center', marginTop: '6px', fontSize: '12px' }}
                      >
                        Show Earlier History (+{allEntries.length - 2} more days)
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
</div>
<div className={activeTab !== "insights" ? "tab-content-hidden" : ""} style={{ display: activeTab === "insights" ? "flex" : "none", flexDirection: "column", gap: "24px", gridColumn: "1 / -1" }}>
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
            
            {activeCase ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate('/app/collab')} 
                  style={{ padding: '12px', background: 'var(--surface-hover)', borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--border)' }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ECFDF5', color: '#10B981', display: 'grid', placeItems: 'center' }}><User size={12}/></div>
                    <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>AI Discussion Board</strong>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned to active case</span>
                </motion.div>
              </div>
            ) : (
              <div style={{ padding: '24px', background: 'var(--surface-hover)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginBottom: '24px', border: '1px dashed var(--border)' }}>
                Start an investigation to assemble your active AI Care Team.
              </div>
            )}

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

</div>
        </>
        )}
      </div>

      {/* Data Export & Management */}
        <div style={{ marginTop: '32px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '20px', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: 700 }}>
                <Lock size={20} color="#64748B" /> Data Management
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: 1.5 }}>
                Download a complete PDF report of your unified profile, or permanently delete your local clinical data and records.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowClearConfirm(true)}
                style={{ color: '#EF4444', borderColor: '#FEE2E2', background: '#FEF2F2', padding: '10px 16px' }}
              >
                <Trash2 size={16} /> Clear Data
              </button>
              <button
                className="btn btn-primary"
                onClick={handleExportPDF}
                style={{ display: 'flex', gap: '8px', background: 'var(--teal)', border: 'none', color: '#FFF', padding: '10px 16px' }}
              >
                <Download size={16} /> Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Custom Clear Data Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: isMobile ? '24px 20px' : '32px 28px',
                maxWidth: '440px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                border: '1px solid #F1F5F9'
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Trash2 size={24} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#0F172A', fontWeight: 700 }}>
                Reset Medical Profile?
              </h3>
              <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#64748B', lineHeight: 1.5 }}>
                Are you sure you want to clear all profile data, conditions, medications, and clinical logs? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setShowClearConfirm(false)}
                  style={{ flex: 1, padding: '10px 16px', borderRadius: '12px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={executeClearData}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '12px',
                    background: '#EF4444',
                    color: '#FFF',
                    border: 'none',
                    fontWeight: 650,
                    cursor: 'pointer'
                  }}
                >
                  Clear All Data
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
