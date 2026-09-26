import React from 'react';
import { ArrowRight, BookOpen, Check, GitBranch, Sparkles, Utensils } from 'lucide-react';
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
  onRefine: (answer: string) => Promise<boolean>;
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

export const GutReasoningBrief: React.FC<Props> = ({ thread, evidence, synthesis, stale, topic, busy, error, onTopicChange, onGenerate, onRefine, onOpenSource, onAction }) => {
  const [reply, setReply] = React.useState('');
  React.useEffect(() => setReply(''), [thread.id]);
  const ready = !!synthesis && !stale;
  const counts = evidence ? `${evidence.support} explicitly with, ${evidence.tension} explicitly without, ${evidence.unknown} unknown or disputed` : 'No linked meal reports';
  const submitReply = async () => { if (reply.trim() && await onRefine(reply)) setReply(''); };
  return <section className={`gr-reasoning gr-answer-card ${ready ? 'gr-reasoning-ready' : 'gr-reasoning-pending'}`} aria-labelledby="gr-reasoning-title" aria-busy={busy}>
    <div className="gr-reasoning-heading"><span className="gr-reasoning-mark"><Sparkles size={18} /></span><div><span className="gr-reasoning-kicker">{ready ? 'YOUR ANSWER · GEMINI' : 'MAKE SENSE OF THIS'}</span><h3 id="gr-reasoning-title">{busy ? 'Connecting what matters…' : ready ? synthesis.headline : stale ? 'Your answer can be updated' : 'Let’s work through your question'}</h3></div></div>
    {busy ? <p className="gr-reasoning-intro" role="status">Reading your question, checking available sources and finding the most useful next step.</p> : ready ? <p className="gr-reasoning-intro">{synthesis.connectionReading}</p> : <div className="gr-answer-start"><p>Get a short explanation, the connections behind it, and one useful next step. You can start without any logs.</p><button type="button" className="gr-reason-generate" onClick={onGenerate}>{stale ? 'Update my answer' : 'Answer with Gemini'} <ArrowRight size={16} /></button><small>Sends this question, relevant saved records and source passages to HealthChain’s Gemini service.</small><button type="button" className="gr-answer-local" onClick={() => onAction(evidence?.occasions.length ? 'review_records' : 'open_research')}>{evidence?.occasions.length ? 'Inspect my records' : 'Explore research'} <ArrowRight size={14} /></button><small>{counts}. Missing reports stay unknown.</small></div>}
    {error && <p role="alert" className="gr-reason-error">{error}</p>}
    {ready && !busy && <>
      <div className="gr-reason-next"><span><Check size={15} /></span><div><strong>What to do next</strong><p>{synthesis.nextReason}</p>{!synthesis.followUpQuestion && <button type="button" onClick={() => onAction(synthesis.nextAction)}>{actionLabels[synthesis.nextAction]} <ArrowRight size={15} /></button>}</div></div>
      {synthesis.followUpQuestion && (thread.clarifications?.length || 0) < 3 && <form className="gr-answer-refine" onSubmit={event => { event.preventDefault(); void submitReply(); }}><label htmlFor="gr-answer-reply">{synthesis.followUpQuestion}</label><p>{synthesis.followUpWhy}</p><div><input id="gr-answer-reply" value={reply} onChange={event => setReply(event.target.value)} maxLength={500} placeholder="A short reply is enough" /><button type="submit" disabled={!reply.trim()}>Refine answer <ArrowRight size={15} /></button></div><small>Your reply is saved with this question and shared with Gemini when you refine.</small></form>}
      <div className="gr-answer-connections" aria-label="How your information connects to the answer">
        <article><span><Utensils size={17} /> YOUR INFORMATION</span><p>{synthesis.personalReading}</p><SourceButtons ids={synthesis.personalSourceIds} type="personal" onOpen={onOpenSource} /></article>
        <span className="gr-answer-join" aria-hidden="true"><GitBranch size={19} /></span>
        <article><span><BookOpen size={17} /> WHAT THE SOURCE ADDS</span><p>{synthesis.researchReading}</p><SourceButtons ids={synthesis.researchSourceIds} type="research" onOpen={onOpenSource} /></article>
      </div>
      <details className="gr-reason-explanation"><summary>Why this answer? Open the records and research</summary><div><p>{counts}. These are reported outcomes, not proof of cause.</p>{synthesis.uncertainties.length > 0 && <div className="gr-reason-unknown"><strong>What could change this answer</strong><ul>{synthesis.uncertainties.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}{synthesis.supportingQuotes?.map((item, index) => <blockquote key={index}><p>“{item.quote}”</p><SourceButtons ids={[item.sourceId]} type={item.sourceId.startsWith('paper:') || item.sourceId.startsWith('guide:') ? 'research' : 'personal'} onOpen={onOpenSource} /></blockquote>)}{thread.clarifications?.length ? <div><strong>Your added details</strong>{thread.clarifications.map((item, index) => <p key={index}>{item.question} — {item.answer}</p>)}</div> : null}<small>Generated {new Date(synthesis.at).toLocaleString()}. Quotations link to source text; they do not independently validate the interpretation.</small></div></details>
    </>}
    <div className="gr-answer-shortcuts"><button type="button" onClick={() => onAction('review_records')}>YOUR SAVED REPORTS · OPEN <ArrowRight size={13} /></button><button type="button" onClick={() => onAction('open_research')}>Research <ArrowRight size={13} /></button></div>
    {ready && !busy && <details className="gr-reason-controls"><summary>Update or explore another angle</summary><div className="gr-reason-controls-body"><label htmlFor="gr-reason-topic">Research topic<select id="gr-reason-topic" value={topic} onChange={event => onTopicChange(event.target.value as GutResearchTopic)}>{Object.entries(gutResearchTopics).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></label><button type="button" className="gr-reason-generate" onClick={onGenerate}>Update my answer <ArrowRight size={15} /></button><small>Shares this question and its relevant records with Gemini again.</small></div></details>}
    <p className="gr-reason-safety">AI interpretation, not a diagnosis. Personal reports and research remain distinct.</p>
  </section>;
};

const SourceButtons: React.FC<{ ids: string[]; type: 'personal' | 'research'; onOpen: (id: string) => void }> = ({ ids, type, onOpen }) => ids.length ? <div className="gr-reason-citations" aria-label={type === 'research' ? 'Research sources' : 'Personal record sources'}>{ids.map(id => <button key={id} type="button" onClick={() => onOpen(id)}>{id.startsWith('paper:') ? `PMID ${id.slice(6)}` : id.startsWith('guide:topic:') ? 'Topic source' : id.startsWith('guide:') ? 'NIDDK source' : id.startsWith('question:') ? 'Your question' : id.startsWith('clarification:') ? 'Your reply' : id.startsWith('decision:') ? 'Your options' : id.startsWith('reflection:') ? 'Your follow-up' : id.startsWith('meal:') ? 'Meal record' : id.startsWith('report:') ? 'Symptom report' : 'Context record'} <ArrowRight size={12} /></button>)}</div> : null;
