import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, ExternalLink, Activity, Filter, ShieldCheck, ChevronDown, ChevronUp, Search, RotateCcw, X, MessageCircle, Bookmark, Check } from 'lucide-react';
import { getProfile } from '../../services/ProfileEngine';
import { getUnifiedCaseScope } from '../../services/caseWorkspace';
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

export interface TrialCriteriaBreakdown {
  matchStatus: 'differential_match' | 'probable_match' | 'topic_overlap' | 'broad_relevance';
  conditionMatch: {
    matched: boolean;
    differentialOverlap: string[];
    terms: string[];
    note: string;
  };
  ageCriteria: {
    status: 'eligible' | 'potential_mismatch' | 'unspecified';
    patientAge?: number;
    extractedLimit?: string;
    note: string;
  };
  genderCriteria: {
    status: 'eligible' | 'potential_mismatch' | 'unspecified';
    patientGender?: string;
    note: string;
  };
  overallNote: string;
}

export function evaluateTrialCriteria(
  trial: any,
  searchTerms: string[],
  differentials: string[] = [],
  patientProfile?: { age?: string | number; gender?: string }
): { matchScore: number; aiContext: string; matchedTerms: string[]; criteriaBreakdown: TrialCriteriaBreakdown } {
  const condText = (trial.conditions || []).join(' ').toLowerCase();
  const titleText = (trial.title || '').toLowerCase();
  const summaryText = (trial.summary || '').toLowerCase();
  const interText = (trial.interventions || []).join(' ').toLowerCase();
  const combinedText = `${condText} ${titleText} ${summaryText} ${interText}`;

  // 1. Differential matching
  const matchedDifferentials = differentials.filter(diff => {
    const dLower = (diff || '').toLowerCase().trim();
    if (!dLower || dLower.length < 3) return false;
    return combinedText.includes(dLower) || dLower.split(/\s+/).some(w => w.length > 3 && combinedText.includes(w));
  });

  // 2. Keyword matching across searchTerms
  const searchWords = searchTerms.flatMap(c => (c || '').toLowerCase().split(/\s+/)).filter(w => w.length > 2);
  const matchedTerms = searchWords.filter(word => combinedText.includes(word));

  let score = 0;
  for (const word of matchedTerms) {
    if (condText.includes(word)) score += 20;
    if (titleText.includes(word)) score += 14;
    if (summaryText.includes(word)) score += 5;
    if (interText.includes(word)) score += 7;
  }
  if (matchedDifferentials.length > 0) {
    score += 30 * matchedDifferentials.length;
  }


  // Use registry eligibility fields only. Narrative keywords are not criteria.
  const eligibility = trial.eligibility || trial.protocolSection?.eligibilityModule || {};
  let ageStatus: 'eligible' | 'potential_mismatch' | 'unspecified' = 'unspecified';
  let ageNote = 'Age limits were not evaluated: registry bounds or patient age are missing.';
  const rawAge = patientProfile?.age;
  const parsedAge = rawAge !== undefined && rawAge !== '' ? Number(rawAge) : undefined;
  const years = (value: unknown): number | undefined => {
    if(typeof value !== 'string') return undefined;
    const match = value.match(/^(\d+(?:\.\d+)?)\s+(Years|Months|Weeks|Days)$/i);
    if(!match) return undefined;
    const divisor = ({years:1,months:12,weeks:52.1775,days:365.25} as any)[match[2].toLowerCase()];
    return Number(match[1])/divisor;
  };
  const minAge = years(eligibility.minimumAge), maxAge = years(eligibility.maximumAge);
  const openMax = eligibility.maximumAge === 'N/A';
  const extractedLimit = [eligibility.minimumAge, eligibility.maximumAge].filter(Boolean).join(' – ');
  if(parsedAge !== undefined && Number.isFinite(parsedAge) && parsedAge >= 0) {
    if((minAge !== undefined && parsedAge < minAge) || (maxAge !== undefined && parsedAge > maxAge)) {
      ageStatus='potential_mismatch';ageNote='The recorded age is outside at least one stated registry bound: '+extractedLimit;
    } else if(minAge !== undefined && (maxAge !== undefined || openMax)) {
      ageStatus='eligible';ageNote='Recorded age is within the stated age bounds only. Other eligibility criteria remain unevaluated.';
    }
  }
  let genderStatus: 'eligible' | 'potential_mismatch' | 'unspecified' = 'unspecified';
  const pGender = (patientProfile?.gender || '').toLowerCase().trim();
  // A profile gender is not assumed to be the sex field requested by a study.
  let genderNote = 'Confirm the registry sex criterion with the study team; profile gender is not used as a substitute.';
  if(eligibility.sex === 'ALL') {
    genderStatus='eligible';genderNote='Registry lists all sexes. Other cohort and eligibility criteria still apply.';
  } else if(eligibility.sex) genderNote='Registry sex criterion: '+eligibility.sex+'. Not automatically evaluated against profile gender.';

  // Determine matchStatus
  let matchStatus: TrialCriteriaBreakdown['matchStatus'] = 'broad_relevance';
  if (matchedDifferentials.length > 0) {
    matchStatus = 'differential_match';
  } else if (score >= 40) {
    matchStatus = 'probable_match';
  } else if (matchedTerms.length > 0) {
    matchStatus = 'topic_overlap';
  }

  const finalScore = Math.min(100, Math.max(0, score));
  const uniqueTerms = [...new Set([...matchedDifferentials, ...matchedTerms])].slice(0, 6);
  const aiContext = matchedDifferentials.length > 0
    ? `Matches active case differential: ${matchedDifferentials.join(', ')}. Registered protocol investigates related pathology.`
    : uniqueTerms.length > 0
    ? `Topic registry overlap: ${uniqueTerms.join(', ')}. Review detailed criteria on source registry.`
    : 'Retrieved from clinical trials search. Detailed screening criteria required.';

  return {
    matchScore: finalScore,
    matchedTerms: uniqueTerms,
    aiContext,
    criteriaBreakdown: {
      matchStatus,
      conditionMatch: {
        matched: matchedDifferentials.length > 0 || matchedTerms.length > 0,
        differentialOverlap: matchedDifferentials,
        terms: uniqueTerms,
        note: matchedDifferentials.length > 0
          ? `Direct overlap with case differential (${matchedDifferentials.join(', ')}).`
          : `Keyword overlap with search topics (${uniqueTerms.join(', ')}).`
      },
      ageCriteria: {
        status: ageStatus,
        patientAge: parsedAge,
        extractedLimit,
        note: ageNote
      },
      genderCriteria: {
        status: genderStatus,
        patientGender: pGender,
        note: genderNote
      },
      overallNote: `Matched against case data: ${matchedDifferentials.length} active differentials evaluated.`
    }
  };
}

export function scoreClinicalTrial(trial: any, conditions: string[], differentials: string[] = [], patientProfile?: { age?: string | number; gender?: string }): { matchScore: number; aiContext: string; matchedTerms: string[]; criteriaBreakdown?: TrialCriteriaBreakdown } {
  return evaluateTrialCriteria(trial, conditions, differentials, patientProfile);
}

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
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
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
            <a
              href={item.url || (isPaper ? `https://europepmc.org/article/MED/${item.id}` : `https://clinicaltrials.gov/study/${item.id}`)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', background: '#F1F5F9', color: '#475569', textDecoration: 'none', fontWeight: 600 }}
              title="View direct registry record"
            >
              <span>{item.sourceName || (isPaper ? 'Europe PMC / PubMed' : 'ClinicalTrials.gov')}</span>
              <ExternalLink size={10} />
            </a>
            {item.retrievedAt && (
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                • Retrieved {new Date(item.retrievedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {!isPaper && item.criteriaBreakdown?.matchStatus === 'differential_match' && (
              <span className="badge" style={{ padding: '2px 8px', fontSize: '11px', background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', fontWeight: 700 }}>
                🎯 Matches Case Differential
              </span>
            )}
            {!isPaper && item.criteriaBreakdown?.ageCriteria?.status === 'eligible' && (
              <span className="badge" style={{ padding: '2px 8px', fontSize: '11px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 600 }}>
                Within registry age bounds ({item.criteriaBreakdown.ageCriteria.patientAge}y)
              </span>
            )}
            {!isPaper && item.criteriaBreakdown?.ageCriteria?.status === 'potential_mismatch' && (
              <span className="badge" style={{ padding: '2px 8px', fontSize: '11px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', fontWeight: 600 }}>
                Age outside registry bounds
              </span>
            )}
            {!isPaper && item.criteriaBreakdown?.genderCriteria?.status === 'eligible' && (
              <span className="badge" style={{ padding: '2px 8px', fontSize: '11px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 600 }}>
                Registry: All sexes accepted
              </span>
            )}
            {!isPaper && item.criteriaBreakdown?.genderCriteria?.status === 'potential_mismatch' && (
              <span className="badge" style={{ padding: '2px 8px', fontSize: '11px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', fontWeight: 600 }}>
                Sex-restricted cohort
              </span>
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

              {/* 3. REAL CRITERIA SCREENING EVALUATION (Promise 7 & Point 9/10) */}
              {!isPaper && item.criteriaBreakdown && (
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔬</span> Case Criteria Screening Analysis
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
                    <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '10px', fontWeight: 700 }}>DIFFERENTIAL OVERLAP</span>
                      <strong style={{ color: item.criteriaBreakdown.conditionMatch.matched ? '#15803D' : '#334155' }}>
                        {item.criteriaBreakdown.conditionMatch.matched ? 'Correlated' : 'None Detected'}
                      </strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748B', lineHeight: 1.3 }}>
                        {item.criteriaBreakdown.conditionMatch.note}
                      </p>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '10px', fontWeight: 700 }}>AGE SCREENING</span>
                      <strong style={{ color: item.criteriaBreakdown.ageCriteria.status === 'eligible' ? '#15803D' : item.criteriaBreakdown.ageCriteria.status === 'potential_mismatch' ? '#B45309' : '#64748B' }}>
                        {item.criteriaBreakdown.ageCriteria.status === 'eligible' ? 'Within Bounds' : item.criteriaBreakdown.ageCriteria.status === 'potential_mismatch' ? 'Outside Bounds' : 'Unspecified'}
                      </strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748B', lineHeight: 1.3 }}>
                        {item.criteriaBreakdown.ageCriteria.note}
                      </p>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '10px', fontWeight: 700 }}>SEX / COHORT</span>
                      <strong style={{ color: item.criteriaBreakdown.genderCriteria.status === 'eligible' ? '#15803D' : item.criteriaBreakdown.genderCriteria.status === 'potential_mismatch' ? '#B45309' : '#64748B' }}>
                        {item.criteriaBreakdown.genderCriteria.status === 'eligible' ? 'All Sexes Accepted' : item.criteriaBreakdown.genderCriteria.status === 'potential_mismatch' ? 'Restricted Cohort' : 'Unspecified'}
                      </strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748B', lineHeight: 1.3 }}>
                        {item.criteriaBreakdown.genderCriteria.note}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. MISSING ELIGIBILITY CRITERIA SEPARATION (Promise 7) */}
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
              const sourceStudy = {
                caseId: getUnifiedCaseScope().caseId,
                nctId: item.id,
                title: displayTitle,
                abstract: displayAbstract,
                url: item.url || (item.id ? 'https://clinicaltrials.gov/study/' + item.id : ''),
                matchStatus: item.criteriaBreakdown?.matchStatus || 'broad_relevance',
                criteriaBreakdown: item.criteriaBreakdown,
                sourceName: item.sourceName || (isPaper ? 'Europe PMC / PubMed' : 'ClinicalTrials.gov'),
                retrievedAt: item.retrievedAt,
              };
              try {
                sessionStorage.setItem('hc_active_source_study', JSON.stringify(sourceStudy));
                if (item.id) {
                  sessionStorage.setItem(`hc_study_${item.id}`, JSON.stringify(sourceStudy));
                }
              } catch {}
              navigate('/app/ava?caseId=' + encodeURIComponent(getUnifiedCaseScope().caseId || '') + (item.id ? '&studyId=' + encodeURIComponent(item.id) : ''), {
                state: {
                  initialPrompt: `I am reviewing this clinical research source: "${displayTitle}" (ID: ${item.id || 'N/A'}). Status: ${item.criteriaBreakdown?.matchStatus || 'General Relevance'}. Help me summarize what it actually says, evaluate whether its eligibility criteria align with my case, and outline specific questions I should ask my clinician or the study team.`,
                  sourceStudy
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
  const [retrievalError, setRetrievalError] = useState('');
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { caseItem: activeCase } = getUnifiedCaseScope();
  const profile = getProfile();
  const [loading, setLoading] = useState(true);
  const [researchItems, setResearchItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [sourceHealth, setSourceHealth] = useState<{
    trials: 'idle' | 'loading' | 'success' | 'failed';
    literature: 'idle' | 'loading' | 'success' | 'failed';
  }>({ trials: 'idle', literature: 'idle' });

  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    const next = new URLSearchParams(searchParams);
    if (item?.id) {
      next.set('study', item.id);
    } else {
      next.delete('study');
      next.delete('studyId');
    }
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const studyParam = searchParams.get('study') || searchParams.get('studyId');
    if (studyParam && researchItems.length > 0) {
      const matched = researchItems.find(item => item.id === studyParam);
      if (matched && (!selectedItem || selectedItem.id !== studyParam)) {
        setSelectedItem(matched);
      }
    }
  }, [researchItems, searchParams]);

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

  const caseDifferentials: string[] = [
    ...(activeCase?.differentials?.map(d => typeof d === 'string' ? d : d.condition) || []),
    ...(Array.isArray(activeCase?.reviews) ? activeCase.reviews.flatMap((r: any) => r?.report?.topDiagnoses || r?.report?.differentials || []) : [])
  ].map(s => typeof s === 'string' ? s.trim() : (s?.condition || s?.name || '')).filter(Boolean);

  const profileConditions: string[] = Array.isArray(profile?.conditions)
    ? profile.conditions.map((c: any) => typeof c === 'string' ? c.trim() : c?.name || '').filter(Boolean)
    : [];

  const caseTopics = [
    ...caseDifferentials,
    ...profileConditions,
    activeCase?.title,
    activeCase?.intakeData?.chiefComplaint
  ]
    .map(value => typeof value === 'string' ? value.trim().slice(0, 120) : '')
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 4);

  const effectiveTerms = customSearchTerms && customSearchTerms.length > 0
    ? customSearchTerms
    : caseTopics;

  const patientAge = profile?.demographics?.age !== undefined ? String(profile.demographics.age) : '';
  const patientGender = profile?.demographics?.gender || '';
  const chiefComplaint = activeCase?.intakeData?.chiefComplaint || '';
  const differentialsKey = caseDifferentials.slice().sort().join('|');
  const termsKey = effectiveTerms.slice().sort().join('|');
  const cacheKey = `researchHub_v8_${activeCase?.id || 'manual'}_${termsKey}_${differentialsKey}_${patientAge}_${patientGender}_${chiefComplaint}`;

  const loadResearch = async (sourceToReload: 'trials' | 'literature' | 'all' = 'all') => {
    setLoading(true);
    const searchTerms = effectiveTerms;

    // Cache check only if full reload
    if (sourceToReload === 'all') {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          if (Array.isArray(parsedCache)) {
            const sanitizedCache = parsedCache.map((item: any) => {
              const base = {
                ...item,
                title: cleanMedicalText(item.title),
                journal: item.journal
                  ? (item.journal.toLowerCase() === 'unknown journal' ? 'Peer-Reviewed Clinical Journal' : cleanMedicalText(item.journal))
                  : item.location,
                abstract: cleanMedicalText(item.abstract || item.summary || '')
              };
              if (!base.journal && !base.criteriaBreakdown) {
                const evaluated = evaluateTrialCriteria(
                  base,
                  searchTerms,
                  caseDifferentials,
                  { age: profile?.demographics?.age, gender: profile?.demographics?.gender }
                );
                return { ...base, ...evaluated };
              }
              return base;
            });
            setResearchItems(sanitizedCache);
            setSourceHealth({ trials: 'success', literature: 'success' });
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Cache parsing error", e);
        }
      }
    }

    try {
      setRetrievalError('');
      const targetCase = activeCase || { id: 'manual_search', title: searchTerms.join(', ') };
      let newTrials: any[] = [];
      let newPapers: any[] = [];

      if (sourceToReload === 'trials' || sourceToReload === 'all') {
        setSourceHealth(prev => ({ ...prev, trials: 'loading' }));
      }
      if (sourceToReload === 'literature' || sourceToReload === 'all') {
        setSourceHealth(prev => ({ ...prev, literature: 'loading' }));
      }

      if (sourceToReload === 'all') {
        const results = await Promise.allSettled([
          fetchLiveTrials(searchTerms),
          fetchRecentLiterature(searchTerms)
        ]);
        const trialsOk = results[0].status === 'fulfilled';
        const papersOk = results[1].status === 'fulfilled';
        newTrials = trialsOk ? results[0].value : [];
        newPapers = papersOk ? results[1].value : [];
        setSourceHealth({
          trials: trialsOk ? 'success' : 'failed',
          literature: papersOk ? 'success' : 'failed',
        });
        if (!trialsOk || !papersOk) {
          setRetrievalError('One or more research sources could not be reached. These results may be incomplete.');
        }
      } else if (sourceToReload === 'trials') {
        try {
          newTrials = await fetchLiveTrials(searchTerms);
          setSourceHealth(prev => ({ ...prev, trials: 'success' }));
        } catch {
          setSourceHealth(prev => ({ ...prev, trials: 'failed' }));
          setRetrievalError('ClinicalTrials.gov could not be reached.');
        }
        newPapers = researchItems.filter(i => !!i.journal);
      } else if (sourceToReload === 'literature') {
        try {
          newPapers = await fetchRecentLiterature(searchTerms);
          setSourceHealth(prev => ({ ...prev, literature: 'success' }));
        } catch {
          setSourceHealth(prev => ({ ...prev, literature: 'failed' }));
          setRetrievalError('Europe PMC / PubMed literature could not be reached.');
        }
        newTrials = researchItems.filter(i => !i.journal);
      }

      const trialsWithScore = newTrials.map((t: any) => {
        const evaluated = evaluateTrialCriteria(
          t,
          searchTerms,
          caseDifferentials,
          { age: profile?.demographics?.age, gender: profile?.demographics?.gender }
        );
        return { ...t, ...evaluated };
      });

      const papersWithScore = newPapers.map((p: any) => {
        const { matchScore, aiContext } = scoreLiteraturePaper(p, searchTerms);
        return { ...p, matchScore, aiContext };
      });

      const allItems = [...trialsWithScore, ...papersWithScore];
      const filteredItems = allItems.filter((t: any) => (t.matchScore || 0) > 0);
      const sortedItems = filteredItems.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));

      setResearchItems(sortedItems);
      recordHealthMemory({
        kind: 'research',
        source: 'clinical_trials',
        title: `Research search: ${targetCase.title || 'Clinical Research'}`,
        occurredAt: new Date().toISOString(),
        caseId: targetCase.id,
        payload: { searchTerms, results: sortedItems },
        dedupeKey: `research:${targetCase.id}:${searchTerms.join(',')}`
      });

      if (sortedItems.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        awardPoints(2, `Clinical Research: ${searchTerms[0] || 'Topics'}`, 'research', `research_${todayStr}`);
      }
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(sortedItems));
      } catch {}
    } catch (err) {
      console.error('Failed to load research items', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResearch('all');
  }, [activeCase?.id, termsKey, differentialsKey, patientAge, patientGender, chiefComplaint]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <FeatureMissionHeader featureId="clinical-trials" activeCaseId={activeCase?.id} />

      {/* Partial / Full Source Failure Recovery Banners */}
      {sourceHealth.trials === 'failed' && sourceHealth.literature === 'success' && (
        <div role="alert" style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '12px', padding: '12px 16px', margin: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '13px', color: '#92400E' }}>
            ⚠️ <strong>Partial Source Failure:</strong> ClinicalTrials.gov registry could not be reached or timed out, but Europe PMC literature was successfully retrieved.
          </div>
          <button 
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => loadResearch('trials')}
            disabled={sourceHealth.trials === 'loading'}
            style={{ borderColor: '#F59E0B', color: '#B45309', whiteSpace: 'nowrap' }}
          >
            {sourceHealth.trials === 'loading' ? 'Retrying...' : 'Retry ClinicalTrials.gov'}
          </button>
        </div>
      )}

      {sourceHealth.literature === 'failed' && sourceHealth.trials === 'success' && (
        <div role="alert" style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '12px', padding: '12px 16px', margin: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '13px', color: '#92400E' }}>
            ⚠️ <strong>Partial Source Failure:</strong> Europe PMC literature could not be reached, but ClinicalTrials.gov registry studies were successfully retrieved.
          </div>
          <button 
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => loadResearch('literature')}
            disabled={sourceHealth.literature === 'loading'}
            style={{ borderColor: '#F59E0B', color: '#B45309', whiteSpace: 'nowrap' }}
          >
            {sourceHealth.literature === 'loading' ? 'Retrying...' : 'Retry Europe PMC'}
          </button>
        </div>
      )}

      {sourceHealth.trials === 'failed' && sourceHealth.literature === 'failed' && (
        <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '12px 16px', margin: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '13px', color: '#991B1B' }}>
            ⚠️ <strong>Research Registries Unavailable:</strong> Neither ClinicalTrials.gov nor Europe PMC could be reached. Please check your network connection and retry.
          </div>
          <button 
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => loadResearch('all')}
            style={{ borderColor: '#EF4444', color: '#B91C1C', whiteSpace: 'nowrap' }}
          >
            Retry Both Sources
          </button>
        </div>
      )}

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
                      handleSelectItem(item);
                    }} 
                  />
                ))
              ) : (
                <div style={{ padding: '28px 20px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
                  <h3 style={{ fontSize: '16px', color: '#0F172A', margin: '0 0 6px 0', fontWeight: 700 }}>
                    No direct registry records found for "{effectiveTerms.join(', ')}"
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '480px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
                    Clinical registries use standardized medical terminology. Rare conditions, specific phenotypes, or composite search terms may return zero direct matches.
                  </p>
                  {caseDifferentials.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                        Try related topics from your case:
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {caseDifferentials.map((diff, i) => (
                          <button
                            key={i}
                            type="button"
                            className="badge badge-purple"
                            onClick={() => {
                              setCustomSearchTerms([diff]);
                              setCustomQuery(diff);
                            }}
                            style={{ cursor: 'pointer', border: '1px solid #C4B5FD', padding: '4px 10px', fontSize: '12px', background: '#F5F3FF', color: '#6D28D9' }}
                          >
                            + {diff}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a
                      href={`https://clinicaltrials.gov/search?term=${encodeURIComponent(effectiveTerms[0] || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                    >
                      Search ClinicalTrials.gov directly <ExternalLink size={12} />
                    </a>
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(effectiveTerms[0] || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                    >
                      Search PubMed directly <ExternalLink size={12} />
                    </a>
                  </div>
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
            onClick={() => handleSelectItem(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Research Detail Modal"
            tabIndex={-1}
            onKeyDown={(e) => { if (e.key === 'Escape') handleSelectItem(null); }}
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
                    <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F8FAFC', borderRadius: 'var(--radius-lg)' }}>
                        <span style={{ color: '#64748B', fontSize: '13px' }}>{selectedItem.journal ? 'Journal' : 'Phase'}</span>
                        <strong style={{ fontSize: '13px' }}>{selectedItem.journal ? modalJournal : (selectedItem.phase || 'Phase Unknown')}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F8FAFC', borderRadius: 'var(--radius-lg)' }}>
                        <span style={{ color: '#64748B', fontSize: '13px' }}>{selectedItem.journal ? 'Authors' : 'Location'}</span>
                        <strong style={{ fontSize: '13px', textAlign: 'right', maxWidth: '200px' }}>{modalAuthors}</strong>
                      </div>
                    </div>

                    {!selectedItem.journal && (
                      <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '14px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                            Official Registry Eligibility Criteria
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            {selectedItem.eligibility?.eligibilityCriteria ? 'Protocol Module' : 'Summary Module'}
                          </span>
                        </div>
                        {selectedItem.eligibility?.eligibilityCriteria ? (
                          <div style={{ maxHeight: '160px', overflowY: 'auto', fontSize: '12px', color: '#334155', lineHeight: 1.5, background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', whiteSpace: 'pre-line' }}>
                            {selectedItem.eligibility.eligibilityCriteria}
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.4 }}>
                            Exclusion and inclusion criteria are established by the protocol sponsor. Age bounds: {selectedItem.criteriaBreakdown?.ageCriteria?.extractedLimit || 'Age unspecified'}; Sex: {selectedItem.eligibility?.sex || 'All sexes'}.
                          </p>
                        )}
                        <div style={{ marginTop: '8px', fontSize: '11px', color: '#92400E', background: '#FEF3C7', padding: '6px 10px', borderRadius: '6px' }}>
                          ⚠️ Meeting age or sex criteria does not determine clinical eligibility. In-person clinical screening and investigator evaluation are required.
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: isMobile ? '12px 16px' : '16px 24px', background: '#F8FAFC', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '10px', flexShrink: 0, borderTop: '1px solid #E2E8F0' }}>
                    <button className="btn btn-outline" onClick={() => handleSelectItem(null)}>Close</button>
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
                        const sourceStudy = {
                          caseId: getUnifiedCaseScope().caseId,
                          nctId: selectedItem.id,
                          title: modalTitle,
                          abstract: modalAbstract,
                          url: selectedItem.url || '',
                          matchStatus: selectedItem.criteriaBreakdown?.matchStatus || 'broad_relevance',
                          criteriaBreakdown: selectedItem.criteriaBreakdown,
                          sourceName: selectedItem.sourceName || (selectedItem.journal ? 'Europe PMC / PubMed' : 'ClinicalTrials.gov'),
                          retrievedAt: selectedItem.retrievedAt,
                        };
                        try {
                          sessionStorage.setItem('hc_active_source_study', JSON.stringify(sourceStudy));
                          if (selectedItem.id) {
                            sessionStorage.setItem(`hc_study_${selectedItem.id}`, JSON.stringify(sourceStudy));
                          }
                        } catch {}
                        navigate('/app/ava?caseId=' + encodeURIComponent(getUnifiedCaseScope().caseId || '') + (selectedItem.id ? '&studyId=' + encodeURIComponent(selectedItem.id) : ''), {
                          state: {
                            initialPrompt: `I am reviewing this ${selectedItem.journal ? 'clinical literature paper' : 'clinical trial'}: "${modalTitle}" (ID: ${selectedItem.id || 'N/A'}). Status: ${selectedItem.criteriaBreakdown?.matchStatus || 'General Relevance'}. Summarize the source cautiously, evaluate whether its eligibility criteria align with my case, and help me prepare questions for my clinician or the study team.`,
                            sourceStudy
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
