import React from 'react';
import { Activity, ArrowRight, BookOpen, Check, GitBranch, LockKeyhole, Sparkles, Utensils } from 'lucide-react';
import type { GutEvidence, GutQuestionThread, GutSynthesis } from '../../services/GutResolutionService';
import { gutResearchTopics, type GutResearchTopic } from '../../services/GutResearchService';
import './GutReasoningBrief.css';

interface Props {
  thread: GutQuestionThread;
  evidence: GutEvidence | null;
  synthesis: GutSynthesis | null;
  stale: boolean;
  papersCount: number;
  contextCount: number;
  topic: GutResearchTopic;
  consent: boolean;
  busy: boolean;
  error: string;
  onTopicChange: (topic: GutResearchTopic) => void;
  onConsentChange: (consent: boolean) => void;
  onGenerate: () => void;
  onOpenSource: (sourceId: string) => void;
  onAction: (action: GutSynthesis['nextAction']) => void;
}

const actionLabels: Record<GutSynthesis['nextAction'], string> = {
  review_records: 'Review my records',
  open_research: 'Inspect the research',
  add_report: 'Add a remembered report',
  prepare_care_question: 'Prepare a care question',
  leave_open: 'Leave this question open',
};

export const GutReasoningBrief: React.FC<Props> = ({ thread, evidence, synthesis, stale, papersCount, contextCount, topic, consent, busy, error, onTopicChange, onConsentChange, onGenerate, onOpenSource, onAction }) => {
  const counts = evidence ? { with: evidence.support, without: evidence.tension, unknown: evidence.unknown } : { with: 0, without: 0, unknown: 0 };
  const hasPersonalSources = !!(evidence?.occasions.length);
  const showSaved = !!synthesis;

  return <section className="gr-reasoning" aria-labelledby="gr-reasoning-title">
    <div className="gr-reasoning-heading">
      <span className="gr-reasoning-mark"><Sparkles size={18} /></span>
      <div><span className="gr-reasoning-kicker">GUT RESEARCH BRIEF</span><h3 id="gr-reasoning-title">See what connects</h3></div>
      <span className="gr-reasoning-badge">Gemini · source-linked</span>
    </div>
    <p className="gr-reasoning-intro">A short reading across your saved reports and published research. The app keeps the source trail visible and leaves uncertain links open.</p>

    <div className="gr-reasoning-map" aria-label="Question connected to personal records, research, and an evidence reading">
      <div className="gr-reason-node gr-reason-question"><span className="gr-reason-node-icon"><Activity size={16} /></span><div><small>YOUR QUESTION</small><strong>{thread.question}</strong></div></div>
      <div className="gr-reason-branches">
        <div className="gr-reason-node gr-reason-records"><span className="gr-reason-node-icon"><Utensils size={16} /></span><div><small>YOUR SAVED REPORTS</small><strong>{counts.with} with · {counts.without} without · {counts.unknown} unknown</strong><span>{hasPersonalSources ? `${evidence?.occasions.length} matching meal record${evidence?.occasions.length === 1 ? '' : 's'}; names do not verify recipe or cause` : 'No symptom-linked meal reports found for this question'}{contextCount > 0 ? ` · ${contextCount} nearby context record${contextCount === 1 ? '' : 's'} shown separately` : ''}</span></div></div>
        <div className="gr-reason-node gr-reason-research"><span className="gr-reason-node-icon"><BookOpen size={16} /></span><div><small>GENERAL RESEARCH</small><strong>{papersCount ? `${papersCount} paper${papersCount === 1 ? '' : 's'} retrieved` : 'No papers attached yet'}</strong><span>{papersCount ? `Topic: ${gutResearchTopics[topic].label}; studies describe groups` : 'Search uses a general symptom and topic, not your personal question'}</span></div></div>
      </div>
      <div className="gr-reason-link"><GitBranch size={16} /><span>Compared with the same question</span></div>
      <div className={`gr-reason-node gr-reason-reading${showSaved && !stale ? ' gr-reason-reading-ready' : ''}`}>
        <span className="gr-reason-node-icon"><Sparkles size={16} /></span>
        <div><small>{showSaved ? stale ? 'EARLIER READING · REFRESH NEEDED' : 'CURRENT READING' : 'THE BRIEF'}</small><strong>{showSaved ? synthesis?.headline : 'Connect records with research'}</strong><span>{showSaved ? stale ? 'Refresh this brief before relying on it.' : synthesis?.connectionReading : 'Generate one concise summary from the sources above.'}</span></div>
      </div>
    </div>

    {showSaved && synthesis && <div className={`gr-reason-result${stale ? ' gr-reason-stale' : ''}`}>
      {stale && <p className="gr-reason-stale-note" role="status">The question or linked records changed since this brief was generated. Refresh it to include the current information.</p>}
      <article className="gr-reason-reading-card"><h4>What your records say</h4><p>{synthesis.personalReading}</p><SourceButtons ids={synthesis.personalSourceIds} type="personal" onOpen={onOpenSource} /></article>
      <article className="gr-reason-reading-card gr-reason-research-card"><h4>What the research adds</h4><p>{synthesis.researchReading}</p><SourceButtons ids={synthesis.researchSourceIds} type="research" onOpen={onOpenSource} /></article>
      {synthesis.uncertainties.length > 0 && <div className="gr-reason-unknown"><strong>Still uncertain</strong><ul>{synthesis.uncertainties.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div>}
      <div className="gr-reason-next"><span><Check size={15} /></span><div><strong>One useful next step</strong><p>{synthesis.nextReason}</p><button type="button" onClick={() => onAction(synthesis.nextAction)}>{actionLabels[synthesis.nextAction]} <ArrowRight size={15} /></button></div></div>
      <small className="gr-reason-generated">Generated {new Date(synthesis.at).toLocaleString()} · AI interpretation, not independent clinical review.</small>
    </div>}

    <details className="gr-reason-controls" open={!showSaved || stale}>
      <summary>{showSaved ? stale ? 'Refresh this reading' : 'Explore a different research lens' : 'Build my evidence brief'}</summary>
      <div className="gr-reason-controls-body">
        <label htmlFor="gr-reason-topic">Research lens<select id="gr-reason-topic" value={topic} onChange={(event) => onTopicChange(event.target.value as GutResearchTopic)} disabled={busy}>{Object.entries(gutResearchTopics).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></label>
        <p className="gr-reason-disclosure"><LockKeyhole size={15} /><span>When you generate this, your question, linked meal and symptom reports, nearby context timing, and retrieved paper abstracts for this lens are sent to HealthChain’s Gemini service. This does not change your records. You can inspect each source.</span></p>
        <label className="gr-reason-consent"><input type="checkbox" checked={consent} onChange={(event) => onConsentChange(event.target.checked)} disabled={busy} /><span>Send these details to Gemini to build my brief.</span></label>
        <button className="gr-reason-generate" type="button" onClick={onGenerate} disabled={!consent || busy}>
          {busy ? <><span className="gr-reason-spinner" />Connecting the sources…</> : <><Sparkles size={16} />{showSaved ? 'Refresh my Gut brief' : 'Build my Gut brief'}<ArrowRight size={16} /></>}
        </button>
        {error && <p role="alert" className="gr-reason-error">{error}</p>}
      </div>
    </details>
    <p className="gr-reason-safety">Personal reports and published research answer different questions. This is not a diagnosis or a finding that a meal caused a symptom.</p>
  </section>;
};

const SourceButtons: React.FC<{ ids: string[]; type: 'personal' | 'research'; onOpen: (id: string) => void }> = ({ ids, type, onOpen }) => ids.length ? <div className="gr-reason-citations" aria-label={type === 'research' ? 'Research sources' : 'Personal record sources'}>{ids.map((id) => <button key={id} type="button" onClick={() => onOpen(id)}>{id.startsWith('paper:') ? `PMID ${id.slice(6)}` : id.startsWith('meal:') ? 'Open meal record' : id.startsWith('report:') ? 'Open symptom report' : 'Open context record'} <ArrowRight size={12} /></button>)}</div> : <small className="gr-reason-no-citation">No exact source could be linked to this statement.</small>;
