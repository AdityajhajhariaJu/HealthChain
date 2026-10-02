import { Copy, FileText } from 'lucide-react';
import React, { useEffect, useId, useState } from 'react';
import type { StructuredClinicalAnswer } from '../../services/StructuredAnswerEngine';
import { ClinicalUrgencyNotice } from './ClinicalUrgencyNotice';
import { InformationCategoryBadge } from './InformationCategoryBadge';
import './OutcomeLayout.css';

interface Props {
  answer: StructuredClinicalAnswer;
  onOpenSourceModal?: (source: any) => void;
  className?: string;
  showUrgency?: boolean;
}

const List = ({ items, empty }: { items: string[]; empty: string }) =>
  items.length ? (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="hc-outcome-meta">{empty}</p>
  );

/** Essential evidence is always visible; only optional extra actions collapse. */
export const StructuredAnswerView: React.FC<Props> = ({
  answer,
  onOpenSourceModal,
  className = '',
  showUrgency = true,
}) => {
  const id = useId();
  const [copyStatus, setCopyStatus] = useState('');
  const {
    layer1_mainAnswer: summary,
    layer2_whyThisMatters: facts,
    layer3_otherExplanations: alternatives,
    layer4_whatWeStillNeed: gaps,
    layer5_nextStep: next,
  } = answer;
  const conflicts = alternatives.contradictionQueue || [];
  const brief = next.doctorVisitBrief;
  useEffect(() => setCopyStatus(''), [answer]);
  const copyBrief = async () => {
    const text = [
      'HealthChain — AI record review, for clinician discussion',
      answer.interpretationUpdatePending &&
        'A clarification was saved after this interpretation. The AI interpretation has not been rerun with it.',
      answer.interpretationsWithheld &&
        'Some AI interpretations were rejected by the evidence checks and are withheld. Check the supplied observations against their original sources.',
      summary.fullSynthesis || summary.conciseAnswer,
      `Next step: ${next.chosenAction}`,
      brief.specificQuestion && `Question: ${brief.specificQuestion}`,
      `Why: ${brief.whyItMatters}`,
      ...facts.sourcePassages.map(
        (source) =>
          `${source.passage}\nSource: ${source.source}; recorded date: ${source.date || 'not provided'}`
      ),
      ...conflicts.map(
        (conflict) =>
          `Source conflict: ${conflict.topic}\n${conflict.itemA.finding} — ${conflict.itemA.source}\n${conflict.itemB.finding} — ${conflict.itemB.source}\n${conflict.resolutionNeed}`
      ),
      gaps.completeMissingList.length && `Unresolved: ${gaps.completeMissingList.join('; ')}`,
      next.otherActions.length && `Other questions: ${next.otherActions.join('; ')}`,
      'These observations do not establish a diagnosis. Check extracted passages against originals.',
    ]
      .filter(Boolean)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Visit brief copied.');
    } catch {
      setCopyStatus('Copy is unavailable. You can select and copy the visible text below.');
    }
  };

  return (
    <section className={`hc-outcome ${className}`} aria-labelledby={`${id}-title`}>
      {showUrgency && <ClinicalUrgencyNotice urgency={answer.urgency} />}
      {answer.interpretationUpdatePending && (
        <p role="status" className="hc-outcome-section hc-outcome-warning">
          Your clarification was saved as a reported observation. The AI interpretation has not been
          rerun with it. Review updated information to reassess the answer.
        </p>
      )}
      {answer.interpretationsWithheld && (
        <p role="status" className="hc-outcome-section hc-outcome-warning">
          Some AI interpretations were rejected by the evidence checks and are withheld. The
          supplied observations remain below. Check them against their original sources; a cause has
          not been established.
        </p>
      )}
      <div className="hc-outcome-section hc-outcome-summary">
        <span className="hc-outcome-kicker">AI RECORD REVIEW · FOR CLINICIAN DISCUSSION</span>
        <h3 id={`${id}-title`}>Review summary</h3>
        <p>{summary.fullSynthesis || summary.conciseAnswer}</p>
        <span className="hc-outcome-meta">
          This review uses supplied records and reports. It is not a diagnosis or a separately
          retrieved research review. Missing information stays unknown.
        </span>
      </div>

      {conflicts.length > 0 && (
        <section
          className="hc-outcome-section hc-outcome-warning"
          aria-labelledby={`${id}-conflicts`}
        >
          <h3 id={`${id}-conflicts`}>Records that need checking</h3>
          <p>
            These entries cannot be treated as one confirmed result. Check their dates, sampling
            times and original text.
          </p>
          {conflicts.map((conflict) => (
            <article className="hc-outcome-inset" key={conflict.id}>
              <h4>{conflict.topic}</h4>
              <div className="hc-outcome-grid">
                {[conflict.itemA, conflict.itemB].map((item, index) => (
                  <div key={index}>
                    <p>{item.finding}</p>
                    <span className="hc-outcome-meta">
                      {item.source || 'Source not provided'} · {item.date || 'Date not provided'}
                    </span>
                  </div>
                ))}
              </div>
              {conflict.clinicalSignificance && <p>{conflict.clinicalSignificance}</p>}
              <p>
                <strong>What would resolve this:</strong>{' '}
                {conflict.resolutionNeed || 'Confirm which source entry and collection time apply.'}
              </p>
            </article>
          ))}
        </section>
      )}

      <section className="hc-outcome-section" aria-labelledby={`${id}-evidence`}>
        <h3 id={`${id}-evidence`}>What the records show</h3>
        <p className="hc-outcome-meta">
          {facts.sourcePassages.length} source-linked observation
          {facts.sourcePassages.length === 1 ? '' : 's'}. Recorded dates are distinct from the time
          this review was generated. Extracted text still needs checking.
        </p>
        {facts.sourcePassages.length ? (
          facts.sourcePassages.map((source, index) => (
            <article className="hc-outcome-inset" key={index}>
              <p>{source.passage}</p>
              <div className="hc-outcome-actions">
                {source.category && (
                  <InformationCategoryBadge category={source.category} size="sm" />
                )}
                <span className="hc-outcome-meta">
                  {source.source} · {source.date || 'Date not provided'}
                  {source.pageNumber ? ` · Page ${source.pageNumber}` : ''}
                </span>
                {onOpenSourceModal && source.category === 'extracted_finding' && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenSourceModal({
                        recordId: source.recordId,
                        findingId: source.findingId,
                        recordTitle: source.source,
                        passageText: source.passage,
                        findingClaim: source.passage,
                        pageNumber: source.pageNumber,
                        dateAdded: source.date,
                      })
                    }
                  >
                    <FileText size={16} /> Inspect source passage
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <List
            items={facts.strongestObservations}
            empty="No usable source passages were supplied. Add or confirm your observations before drawing a conclusion."
          />
        )}
      </section>

      <section className="hc-outcome-section" aria-labelledby={`${id}-alternatives`}>
        <h3 id={`${id}-alternatives`}>Possible explanations and their limits</h3>
        {alternatives.balancedEvidence.length ? (
          alternatives.balancedEvidence.map((item, index) => (
            <article className="hc-outcome-inset" key={index}>
              <h4>{item.title}</h4>
              <span className="hc-outcome-status">
                A consideration to discuss · {item.likelihoodAssessment || 'uncertain'}
              </span>
              {item.mechanism && <p>{item.mechanism}</p>}
              <div className="hc-outcome-grid">
                <div>
                  <strong>What supports it</strong>
                  <List
                    items={item.supportingEvidence}
                    empty="No supporting relationship was supplied for this possibility."
                  />
                </div>
                <div>
                  <strong>What weakens it</strong>
                  <List
                    items={item.conflictingEvidence}
                    empty="No counterevidence was supplied. This does not confirm the possibility."
                  />
                </div>
              </div>
              {item.whatWouldChangeThis && (
                <p>
                  <strong>What could change this:</strong> {item.whatWouldChangeThis}
                </p>
              )}
            </article>
          ))
        ) : (
          <List
            items={alternatives.plausibleAlternatives}
            empty="No grounded alternative explanation is available in this review. A cause has not been established."
          />
        )}
        {alternatives.relationshipStatuses.length > 0 && (
          <div className="hc-outcome-actions">
            {alternatives.relationshipStatuses.map((relationship, index) => (
              <div key={index} className="hc-outcome-inset">
                <strong>{relationship.connection}</strong>
                <span className="hc-outcome-meta">
                  Connection: {relationship.status} · {relationship.rationale}
                </span>
                {relationship.evidenceBasis.length > 0 && (
                  <List items={relationship.evidenceBasis} empty="" />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="hc-outcome-section" aria-labelledby={`${id}-gaps`}>
        <h3 id={`${id}-gaps`}>What remains uncertain</h3>
        <List
          items={gaps.completeMissingList.length ? gaps.completeMissingList : gaps.criticalGaps}
          empty="No specific information gap was listed. That does not mean the record is complete or the cause is confirmed."
        />
      </section>

      <section className="hc-outcome-section hc-outcome-next" aria-labelledby={`${id}-next`}>
        <h3 id={`${id}-next`}>Your next step</h3>
        <p>
          <strong>{next.chosenAction}</strong>
        </p>
        <h4>Bring to your clinician</h4>
        {brief.specificQuestion && (
          <p>
            <strong>Question:</strong> {brief.specificQuestion}
          </p>
        )}
        <p>
          <strong>Why this matters:</strong> {brief.whyItMatters}
        </p>
        <strong>Relevant sources</strong>
        <List
          items={brief.relevantRecords}
          empty="No named records were supplied. Bring your symptom notes or original documents if available."
        />
        <div className="hc-outcome-actions">
          <button type="button" onClick={copyBrief}>
            <Copy size={16} /> Copy visit brief
          </button>
          <span role="status" className="hc-outcome-meta">
            {copyStatus}
          </span>
        </div>
        {next.otherActions.length > 0 && (
          <details>
            <summary>Other questions for the visit ({next.otherActions.length})</summary>
            <div className="hc-outcome-details-body">
              <List items={next.otherActions} empty="" />
            </div>
          </details>
        )}
      </section>
      <p className="hc-outcome-meta">
        Review generated{' '}
        {Number.isNaN(Date.parse(answer.generatedAt))
          ? 'at an unavailable time'
          : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
              new Date(answer.generatedAt)
            )}
        . New symptoms, corrected records or additional information may change this interpretation.
      </p>
    </section>
  );
};
