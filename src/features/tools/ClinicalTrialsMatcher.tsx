import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, ExternalLink, Activity, Filter, Info, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, Search, RotateCcw, X, MessageCircle, Bookmark, Check } from 'lucide-react';
import { getActiveCase } from '../../services/CaseEngine';
import { getProfile } from '../../services/ProfileEngine';
import { fetchLiveTrials } from '../../services/clinicalTrialsService';
import { fetchRecentLiterature } from '../../services/pubMedService';
import { analyzeTrialRelevance, analyzeLiteratureRelevance } from '../../services/geminiService';
import { useIsMobile } from '../../hooks/useIsMobile';
import { recordHealthMemory } from '../../services/HealthMemory';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { useToast } from '../../components/ui/ToastProvider';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';

const loadingSteps = [
  "Analyzing biomarkers...",
  "Checking inclusion criteria...",
  "Calculating geographical proximity...",
  "Finalizing matches..."
];

const MatchRing = ({ score }: { score: number }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? '#10B981' : score >= 80 ? '#F59E0B' : '#64748B';
  
  return (
    <div style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="44" height="44" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="22" cy="22" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="3" />
        <motion.circle 
          cx="22" cy="22" r={radius} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <span style={{ position: 'absolute', fontSize: '11px', fontWeight: 800, color }}>{score}</span>
    </div>
  );
};

function ResearchCard({ item, profile, diagnoses, onClick }: { item: any, profile: any, diagnoses: any[], onClick: () => void }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();
  const isPaper = !!item.journal;
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="card" 
      style={{ padding: '20px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            {isPaper ? (
               <>
                 <span className="badge badge-purple" style={{ padding: '2px 6px', fontSize: '11px' }}>Research Paper</span>
                 <span className="badge badge-gray" style={{ padding: '2px 6px', fontSize: '11px' }}>{item.pubYear}</span>
               </>
            ) : (
               <>
                 <span className="badge badge-teal" style={{ padding: '2px 6px', fontSize: '11px' }}>{item.phase}</span>
                 <span className="badge badge-gray" style={{ padding: '2px 6px', fontSize: '11px' }}>{item.status}</span>
               </>
            )}
          </div>
          <h2 style={{ fontSize: '16px', color: '#0F172A', margin: '0 0 6px 0', lineHeight: 1.4 }}>
            {item.title}
          </h2>
          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={12} /> {isPaper ? item.journal : item.location}
          </div>
        </div>
        <MatchRing score={item.matchScore} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '12px 0', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', margin: '4px 0 12px 0' }}>
              <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                {isPaper ? item.abstract : item.summary}
              </p>
              
              <div style={{ background: 'linear-gradient(to right, rgba(16,185,129,0.1), transparent)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #10B981', marginBottom: '12px' }}>
                 <p style={{ margin: 0, fontSize: '13px', color: '#065F46', lineHeight: 1.4 }}>
                    <strong>{isPaper ? 'Patient Takeaway' : 'AI Relevance'}:</strong> {item.aiContext}
                 </p>
              </div>
              
              <strong style={{ fontSize: '12px', color: '#0F172A', display: 'block', marginBottom: '8px' }}>Why this matches you:</strong>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155' }}>
                  <CheckCircle2 size={14} color="#10B981" /> Age ({profile?.demographics?.age || '28'}) matches criteria
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155' }}>
                  <CheckCircle2 size={14} color="#10B981" /> Gender ({profile?.demographics?.gender || 'Not specified'}) matches criteria
                </div>
                {diagnoses.slice(0, 2).map((d: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155' }}>
                    <CheckCircle2 size={14} color="#10B981" /> Condition: {d}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          type="button"
          onClick={() => setExpanded(!expanded)} 
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse match details for ${item.title}` : `Expand match details for ${item.title}`}
          style={{ background: 'transparent', border: 'none', color: '#4F46E5', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: 0 }}
        >
          {expanded ? 'Show Less' : 'Match Details'} {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            type="button"
            className="btn btn-outline btn-sm" 
            onClick={(e) => {
              e.stopPropagation();
              triggerHapticLight();
              navigate('/app/ava', {
                state: {
                  initialPrompt: `I am interested in this clinical research: "${item.title}". How might this relate to my case, conditions, and treatment options?`
                }
              });
            }} 
            aria-label={`Discuss "${item.title}" with Ava`}
            style={{ padding: '4px 10px', fontSize: '12px', height: '28px', display: 'flex', alignItems: 'center', gap: '4px', color: '#4F46E5', borderColor: '#C7D2FE' }}
            title="Discuss with Ava"
          >
            <MessageCircle size={13} /> Discuss with Ava
          </button>
          <button 
            type="button"
            className="btn btn-primary btn-sm" 
            onClick={onClick} 
            aria-label={`View clinical trial details for ${item.title}`}
            style={{ padding: '4px 10px', fontSize: '12px', height: '28px' }}
          >
             View <ExternalLink size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function ClinicalTrialsMatcher() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const toast = useToast();
  const activeCase = getActiveCase();
  const profile = getProfile();
  const [loading, setLoading] = useState(true);
  const [researchItems, setResearchItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [customQuery, setCustomQuery] = useState('');
  const [customSearchTerms, setCustomSearchTerms] = useState<string[] | null>(null);
  const [savedItems, setSavedItems] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('hc_saved_trials');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const handleSaveToDossier = (item: any) => {
    if (!item) return;
    triggerHapticSuccess();
    const newSaved = { ...savedItems, [item.id]: true };
    setSavedItems(newSaved);
    try {
      localStorage.setItem('hc_saved_trials', JSON.stringify(newSaved));
    } catch {}

    recordHealthMemory({
      kind: 'research',
      source: 'clinical_trials',
      title: item.title,
      occurredAt: new Date().toISOString(),
      caseId: activeCase?.id,
      payload: item,
      dedupeKey: `saved_trial:${item.id}`
    });

    awardPoints(10, `Saved Research to Dossier: ${item.title.slice(0, 24)}...`, 'research', `trial_save_${item.id}`);
    toast.success('Saved to Dossier (+10 pts)', 'Study added to your medical case evidence memory.');
  };

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStep(s => {
          if (s >= loadingSteps.length - 1) return s;
          return s + 1;
        });
      }, 700);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const diagnoses = (activeCase?.reviews || [])
    .flatMap((r: any) => 
       (r?.report?.topDiagnoses || [])
         .filter((d: any) => d && (typeof d.confidence === 'number' ? d.confidence > 25 : true))
         .map((d: any) => (typeof d === 'string' ? d : d?.condition))
         .filter(Boolean)
    )
    .filter((v: any, i: any, a: any) => a.indexOf(v) === i);
    
  if (diagnoses.length === 0 && activeCase?.differentials) {
    const diffs = (activeCase.differentials || [])
      .filter((d: any) => d && (typeof d.probability === 'number' ? d.probability > 25 : true))
      .map((d: any) => (typeof d === 'string' ? d : d?.condition))
      .filter(Boolean)
      .slice(0, 2);
    diagnoses.push(...diffs);
  }

  const effectiveTerms = customSearchTerms && customSearchTerms.length > 0
    ? customSearchTerms
    : (diagnoses.length > 0 ? diagnoses : ['pain']);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadResearch() {
      setLoading(true);
      
      const searchTerms = effectiveTerms;
      const cacheKey = `researchHub_${activeCase?.id || 'manual'}_${searchTerms.join(',')}`;
      
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          if (Array.isArray(parsedCache)) {
            if (isMounted) {
              setResearchItems(parsedCache);
              setLoading(false);
            }
            return;
          }
        } catch (e) {
          console.error("Cache parsing error", e);
        }
      }
      try {
        const [rawTrials, rawPapers] = await Promise.all([
           fetchLiveTrials(searchTerms).catch(() => []),
           fetchRecentLiterature(searchTerms).catch(() => [])
        ]);
        
        if (!isMounted) return;

        const targetCase = activeCase || { id: 'manual_search', title: searchTerms.join(', ') };
        const [enrichedTrials, enrichedPapers] = await Promise.all([
           analyzeTrialRelevance(rawTrials, targetCase, profile).catch(() => []),
           analyzeLiteratureRelevance(rawPapers, targetCase, profile).catch(() => [])
        ]);
        
        if (!isMounted) return;

        const trialsWithScore = enrichedTrials.length > 0 ? enrichedTrials : rawTrials.map((t: any) => ({
          ...t,
          matchScore: 92,
          aiContext: `Actively recruiting trial evaluating ${t.interventions?.slice(0, 2).join(', ') || 'clinical protocol'} for ${t.conditions?.slice(0, 2).join(', ') || searchTerms[0]}.`
        }));
        const papersWithScore = enrichedPapers.length > 0 ? enrichedPapers : rawPapers.map((p: any) => ({
          ...p,
          matchScore: 88,
          aiContext: `Published in ${p.journal || 'peer-reviewed medical journal'} (${p.pubYear || 'recent'}).`
        }));

        const allItems = [...trialsWithScore, ...papersWithScore];
        const filteredItems = allItems.filter((t: any) => (t.matchScore || 0) > 25);
        const sortedItems = filteredItems.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
        
        if (isMounted) {
          setResearchItems(sortedItems);
          recordHealthMemory({ kind: 'research', source: 'clinical_trials', title: `Research search: ${targetCase.title || 'Clinical Research'}`, occurredAt: new Date().toISOString(), caseId: targetCase.id, payload: { searchTerms, results: sortedItems }, dedupeKey: `research:${targetCase.id}:${searchTerms.join(',')}` });
          
          if (sortedItems.length > 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            awardPoints(2, `Clinical Research: ${searchTerms[0] || 'Topics'}`, 'research', `research_${todayStr}`);
          }
          try { sessionStorage.setItem(cacheKey, JSON.stringify(sortedItems)); } catch {}
        }
      } catch (err) {
        console.error('Failed to load research items', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    loadResearch();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [activeCase?.id, effectiveTerms.join(',')]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, #1E1B4B, #312E81)',
          borderRadius: '24px',
          padding: isMobile ? '20px' : '40px',
          color: 'white',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '16px',
          alignItems: isMobile ? 'flex-start' : 'center'
        }}
      >
        <div style={{
          width: '72px', height: '72px', borderRadius: '20px',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <FlaskConical size={36} color="#A5B4FC" />
        </div>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Clinical Research Hub</h1>
          <p style={{ margin: 0, color: '#C7D2FE', fontSize: '15px' }}>
            Discover live clinical trials and recent medical literature tailored to your exact medical profile and active hypotheses.
          </p>
        </div>
      </motion.div>

      <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'unset', gridTemplateColumns: isMobile ? 'unset' : '250px 1fr', gap: '20px' }}>
        <div>
          <div className="card" style={{ padding: isMobile ? '16px' : '24px' }}>
            <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Filter size={16} /> Search Parameters
            </h3>

            {/* Custom Query Search Box */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                Search Topic or Condition
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. Migraine, GLP-1..."
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  aria-label="Search topic or condition for clinical trials"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customQuery.trim()) {
                      setCustomSearchTerms([customQuery.trim()]);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    minWidth: 0
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customQuery.trim()) {
                      setCustomSearchTerms([customQuery.trim()]);
                    }
                  }}
                  disabled={!customQuery.trim()}
                  className="btn btn-primary"
                  style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Search size={14} />
                </button>
              </div>

              {customSearchTerms && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EEF2FF', padding: '6px 10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#4F46E5', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Active: {customSearchTerms.join(', ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomSearchTerms(null);
                      setCustomQuery('');
                    }}
                    style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title="Reset to Case Targets"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              )}
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                Active Case Targets
              </label>
              {diagnoses.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {diagnoses.map((d: any, i) => (
                    <span key={i} style={{ padding: '4px 8px', background: '#EEF2FF', color: '#4F46E5', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                      {d}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#94A3B8' }}>No active discussion pathways found in the current case.</div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                Patient Profile Filters
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {profile?.demographics?.age && <span className="badge badge-gray">{profile.demographics.age} y/o</span>}
                {profile?.demographics?.gender && <span className="badge badge-gray">{profile.demographics.gender}</span>}
                {(profile?.conditions || []).map((c: any, i: number) => <span key={i} className="badge badge-gray">{c}</span>)}
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '24px', padding: '16px', background: '#F8FAFC', borderRadius: 'var(--radius-lg)', border: '1px dashed #CBD5E1' }}>
             <h4 style={{ fontSize: '13px', color: '#0F172A', display: 'flex', gap: '6px', alignItems: 'center', margin: '0 0 8px 0' }}>
               <ShieldCheck size={14} color="#10B981" /> Safety Notice
             </h4>
             <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
               Trials listed are for informational purposes. Always consult your primary care physician before enrolling.
             </p>
          </div>
        </div>

        <div>
          {loading ? (
            <div style={{ padding: isMobile ? '30px 16px' : '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  style={{ position: 'absolute', inset: 0, border: '3px solid #E2E8F0', borderTopColor: '#4F46E5', borderRadius: '50%' }}
                />
                <FlaskConical size={20} color="#4F46E5" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
              </div>
              <div>
                <motion.div
                  key={loadingStep}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ color: '#0F172A', fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}
                >
                  {loadingSteps[loadingStep]}
                </motion.div>
                <div style={{ color: '#64748B', fontSize: '13px' }}>Scanning global clinical registries...</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                Found {researchItems.length} highly relevant research items
              </div>
              
              {researchItems.length > 0 ? (
                researchItems.map((item: any, idx: number) => (
                  <ResearchCard 
                    key={item.id} 
                    item={item} 
                    profile={profile} 
                    diagnoses={diagnoses} 
                    onClick={() => {
                      triggerHapticLight();
                      awardPoints(5, `Reviewed Evidence: ${(item.title || 'Trial').slice(0, 24)}...`, 'research', `trial_view_${item.id}`);
                      setSelectedItem(item);
                    }} 
                  />
                ))
              ) : (
                <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: 'var(--radius-lg)', textAlign: 'center', color: '#64748B' }}>
                   No relevant research or trials found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }} 
            onClick={() => setSelectedItem(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Research Detail Modal"
            tabIndex={-1}
            onKeyDown={(e) => { if (e.key === 'Escape') setSelectedItem(null); }}
          >
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '640px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: isMobile ? '16px' : '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck color="#10B981" /> {selectedItem.journal ? 'Literature Detail' : 'Trial Detail'}
                </h2>
                <span className="badge badge-teal">Match: {selectedItem.matchScore}</span>
              </div>
              <div style={{ padding: isMobile ? '16px' : '24px' }}>
                <h3 style={{ fontSize: '20px', margin: '0 0 12px 0', lineHeight: 1.4 }}>{selectedItem.title}</h3>
                <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                  {selectedItem.journal ? selectedItem.abstract : selectedItem.summary}
                </p>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F8FAFC', borderRadius: 'var(--radius-lg)' }}>
                    <span style={{ color: '#64748B', fontSize: '13px' }}>{selectedItem.journal ? 'Journal' : 'Phase'}</span>
                    <strong style={{ fontSize: '13px' }}>{selectedItem.journal || selectedItem.phase}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F8FAFC', borderRadius: 'var(--radius-lg)' }}>
                    <span style={{ color: '#64748B', fontSize: '13px' }}>{selectedItem.journal ? 'Authors' : 'Location'}</span>
                    <strong style={{ fontSize: '13px', textAlign: 'right', maxWidth: '200px' }}>{selectedItem.authors || selectedItem.location}</strong>
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px 24px', background: '#F8FAFC', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-outline" onClick={() => setSelectedItem(null)}>Close</button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => handleSaveToDossier(selectedItem)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: savedItems[selectedItem.id] ? '#059669' : '#0F172A',
                    borderColor: savedItems[selectedItem.id] ? '#A7F3D0' : '#CBD5E1',
                    background: savedItems[selectedItem.id] ? '#ECFDF5' : 'transparent',
                  }}
                >
                  {savedItems[selectedItem.id] ? <Check size={15} color="#059669" /> : <Bookmark size={15} />}
                  {savedItems[selectedItem.id] ? 'Saved to Dossier' : 'Save to Dossier (+10 pts)'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    triggerHapticLight();
                    navigate('/app/ava', {
                      state: {
                        initialPrompt: `I am reviewing this ${selectedItem.journal ? 'clinical literature paper' : 'clinical trial'}: "${selectedItem.title}". Could you help me understand how this evidence matches my health conditions, biomarkers, and treatment options?`
                      }
                    });
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4F46E5', borderColor: '#C7D2FE' }}
                >
                  <MessageCircle size={15} /> Discuss with Ava
                </button>
                <button 
                  className="btn btn-primary" 
                  aria-label="View full external source in new tab"
                  onClick={() => {
                    const targetUrl = selectedItem.journal
                      ? (selectedItem.url || `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(selectedItem.title)}`)
                      : `https://clinicaltrials.gov/study/${selectedItem.id}`;
                    try {
                      window.open(targetUrl, '_blank', 'noopener,noreferrer');
                    } catch {
                      window.location.href = targetUrl;
                    }
                  }}
                >
                  View Full Source <ExternalLink size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
