import { ArrowRight, Copy, Sparkles } from 'lucide-react';
import React from 'react';
import {
  gutResearchTopics,
  type GutResearchPaper,
  type GutResearchTopic,
} from '../../../services/GutResearchService';
import type {
  GutEvidence,
  GutQuestionThread,
  GutSynthesis,
} from '../../../services/GutResolutionService';
import '../../../components/ui/OutcomeLayout.css';
import './GutReasoningBrief.css';

interface Props {
  thread: GutQuestionThread;
  evidence: GutEvidence | null;
  synthesis: GutSynthesis | null;
  stale: boolean;
  papers: GutResearchPaper[];
  topic: GutResearchTopic;
  busy: boolean;
  error: string;
  onGenerate: (topic?: GutResearchTopic) => void;
  onRefine: (answer: string) => Promise<boolean>;
  onOpenSource: (sourceId: string) => void;
  onMap: () => void;
  onAction: (action: GutSynthesis['nextAction']) => void;
}

const actionLabels: Record<GutSynthesis['nextAction'], string> = {
  review_records: 'Review my records',
  open_research: 'Inspect the research',
  add_report: 'Add a remembered report',
  prepare_care_question: 'Prepare a care question',
  leave_open: 'Leave this question open',
};
const sourceLabel = (
  id: string,
  evidence: GutEvidence | null,
  papers: Array<Pick<GutResearchPaper, 'id' | 'title'>>
) => {
  if (id.startsWith('paper:'))
    return papers.find((paper) => `paper:${paper.id}` === id)?.title || `PMID ${id.slice(6)}`;
  if (id.startsWith('meal:')) {
    const meal = evidence?.occasions.find((occasion) => `meal:${occasion.meal.id}` === id)?.meal;
    return meal ? `${meal.name} · ${meal.date}` : 'Meal record';
  }
  return id.startsWith('guide:topic:')
    ? 'Topic guidance source'
    : id.startsWith('guide:')
      ? 'NIDDK guidance'
      : id.startsWith('question:')
        ? 'Your question'
        : id.startsWith('clarification:')
          ? 'Your reply'
          : id.startsWith('decision:')
            ? 'Your options'
            : id.startsWith('reflection:')
              ? 'Your follow-up'
              : id.startsWith('report:')
                ? 'Symptom report'
                : 'Context record';
};

export const GutReasoningBrief: React.FC<Props> = ({
  thread,
  evidence,
  synthesis,
  stale,
  papers,
  topic,
  busy,
  error,
  onGenerate,
  onRefine,
  onOpenSource,
  onAction,
  onMap,
}) => {
  const [reply, setReply] = React.useState('');
  const [topicDraft, setTopicDraft] = React.useState(topic);
  const [copyStatus, setCopyStatus] = React.useState('');
  React.useEffect(() => {
    setReply('');
    setCopyStatus('');
  }, [thread.id]);
  React.useEffect(() => setTopicDraft(topic), [topic]);
  const ready = !!synthesis && !stale;
  const paperSources = papers.length ? papers : synthesis?.researchSources || [];
  const counts = evidence
    ? `${evidence.support} explicitly with, ${evidence.tension} explicitly without, ${evidence.unknown} unknown or disputed`
    : 'No linked meal reports';
  const sourceButtons = (ids: string[], label: string) =>
    ids.length > 0 && (
      <div className="hc-outcome-actions" aria-label={label}>
        {ids.map((id) => (
          <button key={id} type="button" onClick={() => onOpenSource(id)}>
            {sourceLabel(id, evidence, paperSources)} <ArrowRight size={15} />
          </button>
        ))}
      </div>
    );
  const copyAnswer = async () => {
    if (!ready) return;
    const text = [
      `HealthChain Gut question: ${thread.question}`,
      synthesis.headline,
      synthesis.connectionReading,
      `Your information: ${synthesis.personalReading}`,
      `Reported outcomes: ${counts}`,
      `Research context: ${synthesis.researchReading || 'No research interpretation is available.'}`,
      `Uncertain: ${synthesis.uncertainties.join('; ') || 'No specific gap was listed; a personal cause is not established.'}`,
      `Next step: ${synthesis.nextReason}`,
      ...(synthesis.supportingQuotes?.map(
        (quote) =>
          `Source excerpt (${sourceLabel(quote.sourceId, evidence, paperSources)}; ${quote.sourceId.startsWith('paper:') ? `https://pubmed.ncbi.nlm.nih.gov/${quote.sourceId.slice(6)}/` : quote.sourceId}): ${quote.quote}`
      ) || []),
      `Generated: ${synthesis.at}. AI interpretation, not a diagnosis.`,
    ].join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Answer copied.');
    } catch {
      setCopyStatus('Copy is unavailable. You can select and copy the visible answer.');
    }
  };
  const submitReply = async () => {
    if (!busy && reply.trim() && (await onRefine(reply))) setReply('');
  };

  return (
    <section
      className={`hc-outcome gr-reasoning gr-answer-card ${ready ? 'gr-reasoning-ready' : 'gr-reasoning-pending'}`}
      aria-labelledby="gr-reasoning-title"
      aria-busy={busy}
    >
      <header className="gr-reasoning-heading">
        <Sparkles size={22} aria-hidden="true" />
        <div>
          <span className="hc-outcome-kicker">
            {ready ? 'YOUR ANSWER · GEMINI' : 'MAKE SENSE OF THIS'}
          </span>
          <h3 id="gr-reasoning-title">
            {ready
              ? synthesis.headline
              : stale
                ? 'Your answer needs updating'
                : 'Let’s work through your question'}
          </h3>
        </div>
      </header>
      {busy && (
        <p role="status" className="hc-outcome-meta">
          Reading your question and checking the available sources.{' '}
          {ready
            ? 'Your previous answer remains below while the update runs.'
            : 'Your saved question and reports remain available.'}
        </p>
      )}
      {error && (
        <p role="alert" className="hc-outcome-error">
          {error}
        </p>
      )}
      {!ready && (
        <div className="hc-outcome-section">
          <p>
            {stale
              ? 'Records, added details, research or the reading version have changed, or this reading is over a day old. Refresh before relying on its interpretation.'
              : 'Get an explanation, the evidence behind it, and one useful next step. You can start without any logs.'}
          </p>
          <div className="hc-outcome-actions">
            <button
              type="button"
              className="hc-outcome-primary"
              disabled={busy}
              onClick={() => onGenerate()}
            >
              {stale ? 'Update my answer' : 'Answer with Gemini'} <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() =>
                onAction(evidence?.occasions.length ? 'review_records' : 'open_research')
              }
            >
              {evidence?.occasions.length ? 'Inspect my records' : 'Explore research'}
            </button>
          </div>
          <span className="hc-outcome-meta">
            Sends this question, relevant saved records and source passages to HealthChain’s Gemini
            service.
          </span>
          <span className="hc-outcome-meta">{counts}. Missing reports stay unknown.</span>
        </div>
      )}
      {ready && (
        <>
          <section className="hc-outcome-section hc-outcome-summary">
            <h4>What this means for your question</h4>
            <p className="gr-reasoning-intro">
              {synthesis.connectionReading ||
                'The available information does not yet establish a connection.'}
            </p>
            <span className="hc-outcome-meta">
              Generated{' '}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(synthesis.at))}{' '}
              · AI interpretation, not a diagnosis.
            </span>
          </section>
          <section className="hc-outcome-section">
            <h4>Your information</h4>
            <p>{synthesis.personalReading || 'No personal interpretation is available.'}</p>
            <p className="hc-outcome-meta">
              {counts}. Reported outcomes are not proof of cause.{' '}
              {evidence && evidence.occasions.length > 12
                ? 'The reading samples up to 12 occasion groups; the totals cover all linked occasions.'
                : ''}
            </p>
            {evidence && evidence.conflicts > 0 && (
              <p className="hc-outcome-error">
                {evidence.conflicts} occasion{evidence.conflicts === 1 ? '' : 's'} with conflicting
                reports. Inspect both reports before using them as a comparison.
              </p>
            )}
            {sourceButtons(synthesis.personalSourceIds, 'Personal record sources')}
          </section>
          <section className="hc-outcome-section">
            <h4>Research and how it applies</h4>
            <p>
              {synthesis.researchReading ||
                'No research interpretation was available for this answer. A missing study result does not confirm or rule out a personal cause.'}
            </p>
            <span className="hc-outcome-meta">
              Studies describe groups. General guidance and abstract passages cannot establish your
              personal trigger. Study design, population, comparator and measured outcome affect
              applicability.
            </span>
            {sourceButtons(synthesis.researchSourceIds, 'Research sources')}
            {paperSources
              .filter((paper) => synthesis.researchSourceIds.includes(`paper:${paper.id}`))
              .map((paper) => (
                <article key={paper.id} className="hc-outcome-inset">
                  <strong>{paper.title}</strong>
                  <span className="hc-outcome-meta">
                    {paper.publicationDate || 'Publication date unavailable'} ·{' '}
                    {paper.publicationTypes.join(', ') || 'Publication type unavailable'}
                  </span>
                  <p className="hc-outcome-meta">
                    {paper.titlePopulationCue
                      ? `Title population cue: ${paper.titlePopulationCue}. Applicability still needs checking.`
                      : 'Population applicability is not verified from index metadata.'}{' '}
                    An index label is not a quality grade.
                  </p>
                  {paper.correctionNotice && (
                    <p className="hc-outcome-error">
                      Publication notice: {paper.correctionNotice}. Check the original notice before
                      relying on this source.
                    </p>
                  )}
                </article>
              ))}
          </section>
          <section className="hc-outcome-section">
            <h4>What could change this answer</h4>
            {synthesis.uncertainties.length ? (
              <ul>
                {synthesis.uncertainties.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>
                No specific gap was listed. This does not establish a cause or mean the information
                is complete.
              </p>
            )}
          </section>
          <section className="hc-outcome-section hc-outcome-next gr-reason-next">
            <h4>What to do next</h4>
            <p>{synthesis.nextReason}</p>
            <div className="hc-outcome-actions">
              <button
                type="button"
                className="hc-outcome-primary"
                onClick={() => onAction(synthesis.nextAction)}
              >
                {actionLabels[synthesis.nextAction]} <ArrowRight size={15} />
              </button>
              <button type="button" onClick={() => void copyAnswer()}>
                <Copy size={16} /> Copy answer
              </button>
              <span role="status" className="hc-outcome-meta">
                {copyStatus}
              </span>
            </div>
            {synthesis.followUpQuestion && (thread.clarifications?.length || 0) < 3 && (
              <form
                className="hc-outcome-form gr-answer-refine"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitReply();
                }}
              >
                <label htmlFor="gr-answer-reply">{synthesis.followUpQuestion}</label>
                <p>{synthesis.followUpWhy}</p>
                <textarea
                  id="gr-answer-reply"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  maxLength={500}
                  placeholder="A short reply is enough; unknown is okay"
                  disabled={busy}
                />
                <button type="submit" disabled={busy || !reply.trim()}>
                  Refine answer <ArrowRight size={15} />
                </button>
                <span className="hc-outcome-meta">
                  Optional · {3 - (thread.clarifications?.length || 0)} clarifications remaining.
                  Your reply is saved with this question and shared with Gemini when you refine.
                </span>
              </form>
            )}
          </section>
          <section className="hc-outcome-section gr-reason-explanation">
            <h4>Sources & what could change this</h4>
            <p className="hc-outcome-meta">
              The source excerpts below explain what was cited. Matching an excerpt does not
              independently validate the AI interpretation.
            </p>
            {synthesis.supportingQuotes?.length ? (
              synthesis.supportingQuotes.map((item, index) => (
                <blockquote key={index}>
                  <p>“{item.quote}”</p>
                  {sourceButtons([item.sourceId], 'Source for excerpt')}
                </blockquote>
              ))
            ) : (
              <p className="hc-outcome-meta">
                No quoted passages were saved with this answer. Use the source links above to
                inspect the inputs.
              </p>
            )}
            {thread.clarifications?.length ? (
              <div>
                <h4>Your added details</h4>
                {thread.clarifications.map((item, index) => (
                  <p key={index}>
                    <strong>{item.question}</strong>
                    <br />
                    {item.answer}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
          <details>
            <summary>Update or explore another angle</summary>
            <div className="hc-outcome-details-body hc-outcome-form">
              <label htmlFor="gr-reason-topic">
                Research topic
                <select
                  id="gr-reason-topic"
                  value={topicDraft}
                  onChange={(event) => setTopicDraft(event.target.value as GutResearchTopic)}
                >
                  {Object.entries(gutResearchTopics).map(([id, item]) => (
                    <option key={id} value={id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" disabled={busy} onClick={() => onGenerate(topicDraft)}>
                Update my answer <ArrowRight size={15} />
              </button>
              <span className="hc-outcome-meta">
                Shares this question and its relevant records with Gemini again.
              </span>
              <button type="button" onClick={onMap}>
                See how this connects <ArrowRight size={16} />
              </button>
            </div>
          </details>
        </>
      )}
      <p className="hc-outcome-meta gr-reason-safety">
        Personal reports, research context and possible explanations remain distinct. You can leave
        the question open without adding more data.
      </p>
    </section>
  );
};
