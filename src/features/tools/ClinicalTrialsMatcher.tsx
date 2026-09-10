import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, ExternalLink, Activity, Filter, ShieldCheck, ChevronDown, ChevronUp, Search, RotateCcw, X, MessageCircle, Bookmark, Check } from 'lucide-react';
import { getActiveCase } from '../../services/CaseEngine';
import { fetchLiveTrials } from '../../services/clinicalTrialsService';
import { fetchRecentLiterature, cleanMedicalText } from '../../services/pubMedService';
import { useIsMobile } from '../../hooks/useIsMobile';

import { recordHealthMemory } from '../../services/HealthMemory';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { useToast } from '../../components/ui/ToastProvider';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { getItemSync, setItemSync } from '../../services/storage';
import { FeatureMissionHeader } from '../../components/ui/FeatureMissionHeader';

const loadingSteps = [
  "Retrieving registry studies...",
  "Retrieving recent literature...",
  "Comparing titles and topics...",
  "Preparing source links..."
];

const MatchRing = ({ score }: { score: number }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? '#10B981' : score >= 80 ? '#F59E0B' : '#64748B';
  
  return (
    <div role="img" aria-label={`Topic relevance ${score} out of 100`} style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

function scoreClinicalTrial(trial: any, conditions: string[]): { matchScore: number; aiContext: string; matchedTerms: string[] } {
  let score = 0;
  const condText = (trial.conditions || []).join(' ').toLowerCase();
  const titleText = (trial.title || '').toLowerCase();
  const summaryText = (trial.summary || '').toLowerCase();
  const interText = (trial.interventions || []).join(' ').toLowerCase();

  const searchWords = conditions.flatMap(c => c.toLowerCase().split(/\s+/)).filter(w => w.length > 2);
  
  const matchedTerms = searchWords.filter(word => condText.includes(word) || titleText.includes(word) || summaryText.includes(word) || interText.includes(word));
  for (const word of matchedTerms) {
    if (condText.includes(word)) score += 20;
    if (titleText.includes(word)) score += 14;
    if (summaryText.includes(word)) score += 5;
    if (interText.includes(word)) score += 7;
  }

  const finalScore = Math.min(100, score);

  return {
    matchScore: finalScore,
    matchedTerms: [...new Set(matchedTerms)].slice(0, 6),
    aiContext: matchedTerms.length
      ? `Shown because its registry text overlaps with: ${[...new Set(matchedTerms)].slice(0, 6).join(', ')}. This is topic relevance, not an eligibility assessment.`
      : 'Shown from the registry search. Review the official eligibility criteria and locations on the source page.'
  };
}

function scoreLiteraturePaper(paper: any, conditions: string[]): { matchScore: number; aiContext: string; matchedTerms: string[] } {
  let score = 0;
  const titleText = (paper.title || '').toLowerCase();
  const abstractText = (paper.abstract || '').toLowerCase();
  const searchWords = conditions.flatMap(c => c.toLowerCase().split(/\s+/)).filter(w => w.length > 2);

  const matchedTerms = searchWords.filter(word => titleText.includes(word) || abstractText.includes(word));
  for (const word of matchedTerms) {
    if (titleText.includes(word)) score += 22;
    if (abstractText.includes(word)) score += 7;
  }

  const finalScore = Math.min(100, score);
  return {
    matchScore: finalScore,
    matchedTerms: [...new Set(matchedTerms)].slice(0, 6),
    aiContext: matchedTerms.length
      ? `Shown because its title or abstract overlaps with: ${[...new Set(matchedTerms)].slice(0, 6).join(', ')}. Read the source to assess quality and applicability.`
      : `Retrieved from the literature search for ${conditions[0] || 'the selected topic'}.`
  };
}

function ResearchCard({ item, onClick }: { item: any, onClick: () => void }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();
  const isPaper = !!item.journal;
  const displayTitle = cleanMedicalText(item.title) || (isPaper ? 'Clinical Literature Paper' : 'Clinical Trial');
  const rawJournal = isPaper ? (item.journal || 'Peer-Reviewed Clinical Journal') : (item.location || 'Multiple Locations / Unknown');
  const displayJournal = isPaper
    ? (rawJournal.toLowerCase() === 'unknown journal' ? 'Peer-Reviewed Clinical Journal' : cleanMedicalText(rawJournal))
    : rawJournal;
  const displayAbstract = cleanMedicalText(isPaper ? item.abstract : item.summary) || 'No abstract or clinical summary available.';
  
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
            {displayTitle}
          </h2>
          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={12} /> {displayJournal}
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
            <div style={{ padding: '16px 0', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', margin: '4px 0 12px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Summary / Abstract */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
                  {isPaper ? 'Study Abstract' : 'Clinical Protocol Summary'}
                </div>
                <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.55 }}>
                  {displayAbstract}
                </p>
              </div>

              {/* 1. WHY SHOWN & TOPIC RELEVANCE PROOF (Promise 7) */}
              <div style={{ background: '#F0FDF4', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #BBF7D0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px' }}>🎯</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Why This Was Retrieved • Topic Relevance Proof
                  </span>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '12.5px', color: '#14532D', lineHeight: 1.45 }}>
                  {item.aiContext}
                </p>
                {item.matchedTerms && item.matchedTerms.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>Correlated Terms:</span>
                    {item.matchedTerms.map((term: string, i: number) => (
                      <span key={i} style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' }}>
                        {term}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. STUDY CHARACTERISTICS (Promise 7) */}
              <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                  Study Characteristics & Parameters
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px' }}>CATEGORY</span>
                    <strong style={{ color: '#0F172A' }}>{isPaper ? 'Peer-Reviewed Journal' : (item.phase || 'Clinical Trial')}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px' }}>STATUS / YEAR</span>
                    <strong style={{ color: '#0F172A' }}>{isPaper ? (item.pubYear || 'Recent') : (item.status || 'Active')}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px' }}>LOCATION / SOURCE</span>
                    <strong style={{ color: '#0F172A' }}>{displayJournal}</strong>
                  </div>
                </div>
                {!isPaper && item.interventions && item.interventions.length > 0 && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #CBD5E1', fontSize: '12px' }}>
                    <span style={{ color: '#64748B', fontSize: '10.5px', display: 'block' }}>INVESTIGATED INTERVENTIONS</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>{item.interventions.join(' • ')}</span>
                  </div>
                )}
              </div>

              {/* 3. MISSING ELIGIBILITY CRITERIA SEPARATION (Promise 7) */}
              {!isPaper && (
                <div style={{ background: '#FFFBEB', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #FDE68A' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px' }}>⚠️</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Eligibility Not Evaluated • Missing Screening Criteria
                    </span>
                  </div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#92400E', lineHeight: 1.45 }}>
                    HealthChain matches topic relevance only. A patient cannot be deemed eligible without verifying:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#78350F', fontSize: '11.5px', lineHeight: 1.5 }}>
                    <li>Histopathologic & sub-phenotype verification</li>
                    <li>Baseline organ function & lab exclusionary limits (eGFR, LFTs, ANC)</li>
                    <li>Prior therapeutic lines & required pharmaceutical washout intervals</li>
                    <li>Site enrollment capacity and investigator in-person intake</li>
                  </ul>
                </div>
              )}

              <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8', lineHeight: 1.4 }}>
                Always discuss potential clinical trials or published protocols with your licensed physician before taking any action.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          type="button"
          onClick={() => setExpanded(!expanded)} 
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse match details for ${displayTitle}` : `Expand match details for ${displayTitle}`}
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
                  initialPrompt: `I am reviewing this clinical research source: "${displayTitle}". Help me summarize what it actually says, what it does not establish, and which questions I should ask my clinician or the study team.`
                }
              });
            }} 
            aria-label={`Discuss "${displayTitle}" with Ava`}
            style={{ padding: '4px 10px', fontSize: '12px', height: '28px', display: 'flex', alignItems: 'center', gap: '4px', color: '#4F46E5', borderColor: '#C7D2FE' }}
            title="Discuss with Ava"
          >
            <MessageCircle size={13} /> Discuss with Ava
          </button>
          <button 
            type="button"
            className="btn btn-primary btn-sm" 
            onClick={onClick} 
            aria-label={`View clinical trial details for ${displayTitle}`}
            style={{ padding: '4px 10px', fontSize: '12px', height: '28px' }}
          >
             Details <ExternalLink size={12} />
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
  const [loading, setLoading] = useState(true);
  const [researchItems, setResearchItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [customQuery, setCustomQuery] = useState('');
  const [customSearchTerms, setCustomSearchTerms] = useState<string[] | null>(null);
  const [savedItems, setSavedItems] = useState<Record<string, boolean>>(() => {
    try {
      const stored = getItemSync('hc_saved_trials');
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
    setItemSync('hc_saved_trials', JSON.stringify(newSaved));

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

  const caseTopics = [activeCase?.title, activeCase?.intakeData?.chiefComplaint]
    .map(value => typeof value === 'string' ? value.trim().slice(0, 120) : '')
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 2);
  const effectiveTerms = customSearchTerms && customSearchTerms.length > 0
    ? customSearchTerms
    : caseTopics;

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadResearch() {
      setLoading(true);
      
      const searchTerms = effectiveTerms;
      const cacheKey = `researchHub_v5_${activeCase?.id || 'manual'}_${searchTerms.join(',')}`;
      
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          if (Array.isArray(parsedCache)) {
            const sanitizedCache = parsedCache.map((item: any) => ({
              ...item,
              title: cleanMedicalText(item.title),
              journal: item.journal
                ? (item.journal.toLowerCase() === 'unknown journal' ? 'Peer-Reviewed Clinical Journal' : cleanMedicalText(item.journal))
                : item.location,
              abstract: cleanMedicalText(item.abstract || item.summary || '')
            }));
            if (isMounted) {
              setResearchItems(sanitizedCache);
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

        const trialsWithScore = rawTrials.map((t: any) => {
          const { matchScore, aiContext } = scoreClinicalTrial(t, searchTerms);
          return { ...t, matchScore, aiContext };
        });

        const papersWithScore = rawPapers.map((p: any) => {
          const { matchScore, aiContext } = scoreLiteraturePaper(p, searchTerms);
          return { ...p, matchScore, aiContext };
        });

        const allItems = [...trialsWithScore, ...papersWithScore];
        const filteredItems = allItems.filter((t: any) => (t.matchScore || 0) > 0);
        const sortedItems = filteredItems.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
        
        if (isMounted) {
          setResearchItems(sortedItems);
          recordHealthMemory({ kind: 'research', source: 'clinical_trials', title: `Research search: ${targetCase.title || 'Clinical Research'}`, occurredAt: new Date().toISOString(), caseId: targetCase.id, payload: { searchTerms, results: sortedItems }, dedupeKey: `research:${targetCase.id}:${searchTerms.join(',')}` });
          
          if (sortedItems.length > 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            awardPoints(2, `Clinical Research: ${searchTerms[0] || 'Topics'}`, 'research', `research_${todayStr}`);
          }
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(sortedItems));
            localStorage.setItem(`hc_res_cache_${searchTerms.join('_')}`, JSON.stringify({ ts: Date.now(), data: sortedItems }));
          } catch {}
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
      <FeatureMissionHeader featureId="clinical-trials" activeCaseId={activeCase?.id} />

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
            Search live registry studies and recent literature using a topic from your selected case or your own search. Results are ranked by text overlap, not medical eligibility.
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
                Case topics used for search
              </label>
              {caseTopics.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {caseTopics.map((d: any, i) => (
                    <span key={i} style={{ padding: '4px 8px', background: '#EEF2FF', color: '#4F46E5', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                      {d}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#64748B' }}>No case topic selected. Enter a topic above to search.</div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                Eligibility boundary
              </label>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>Age, sex, location, medications, test results, and other criteria are not automatically verified here. Confirm them on the official study page.</p>
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
                {researchItems.length} source{researchItems.length === 1 ? '' : 's'} ranked by topic relevance
              </div>
              
              {researchItems.length > 0 ? (
                researchItems.map((item: any, idx: number) => (
                  <ResearchCard 
                    key={item.id} 
                    item={item} 
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? '12px' : '20px' }} 
            onClick={() => setSelectedItem(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Research Detail Modal"
            tabIndex={-1}
            onKeyDown={(e) => { if (e.key === 'Escape') setSelectedItem(null); }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              style={{ 
                background: 'white', 
                borderRadius: '24px', 
                width: '100%', 
                maxWidth: '640px', 
                maxHeight: 'calc(100vh - 48px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
              }} 
              onClick={e => e.stopPropagation()}
            >
            {(() => {
              const modalTitle = cleanMedicalText(selectedItem.title) || (selectedItem.journal ? 'Clinical Literature Paper' : 'Clinical Trial');
              const rawModalJournal = selectedItem.journal ? (selectedItem.journal || 'Peer-Reviewed Clinical Journal') : (selectedItem.location || 'Multiple Locations / Unknown');
              const modalJournal = selectedItem.journal
                ? (rawModalJournal.toLowerCase() === 'unknown journal' ? 'Peer-Reviewed Clinical Journal' : cleanMedicalText(rawModalJournal))
                : rawModalJournal;
              const modalAbstract = cleanMedicalText(selectedItem.journal ? selectedItem.abstract : selectedItem.summary) || 'No abstract or clinical summary available.';
              const modalAuthors = selectedItem.authors ? cleanMedicalText(selectedItem.authors) : (selectedItem.location || 'Multiple Locations / Unknown');

              return (
                <>
                  <div style={{ padding: isMobile ? '16px' : '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck color="#10B981" /> {selectedItem.journal ? 'Literature Detail' : 'Trial Detail'}
                    </h2>
                    <span className="badge badge-teal">Topic relevance: {selectedItem.matchScore}/100</span>
                  </div>
                  <div style={{ padding: isMobile ? '16px' : '24px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    <h3 style={{ fontSize: isMobile ? '18px' : '20px', margin: '0 0 12px 0', lineHeight: 1.4 }}>{modalTitle}</h3>
                    <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                      {modalAbstract}
                    </p>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F8FAFC', borderRadius: 'var(--radius-lg)' }}>
                        <span style={{ color: '#64748B', fontSize: '13px' }}>{selectedItem.journal ? 'Journal' : 'Phase'}</span>
                        <strong style={{ fontSize: '13px' }}>{selectedItem.journal ? modalJournal : (selectedItem.phase || 'Phase Unknown')}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F8FAFC', borderRadius: 'var(--radius-lg)' }}>
                        <span style={{ color: '#64748B', fontSize: '13px' }}>{selectedItem.journal ? 'Authors' : 'Location'}</span>
                        <strong style={{ fontSize: '13px', textAlign: 'right', maxWidth: '200px' }}>{modalAuthors}</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: isMobile ? '12px 16px' : '16px 24px', background: '#F8FAFC', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '10px', flexShrink: 0, borderTop: '1px solid #E2E8F0' }}>
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
                            initialPrompt: `I am reviewing this ${selectedItem.journal ? 'clinical literature paper' : 'clinical trial'}: "${modalTitle}". Summarize the source cautiously, separate what it reports from what remains unknown, and help me prepare questions for my clinician or the study team.`
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
                          ? (selectedItem.url || `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(modalTitle)}`)
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
                </>
              );
            })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
