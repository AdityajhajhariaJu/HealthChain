import React from 'react';
import { ArrowUpRight, BookOpen, ShieldCheck } from 'lucide-react';
import { getGutReviewedEvidence } from '../../services/GutReviewedEvidence';
import { getGutPublicSourceGuide, getGutTopicSourceGuide } from '../../services/GutPublicSourceGuide';
import type { GutSymptom } from '../../services/GutResolutionService';
import type { GutResearchTopic } from '../../services/GutResearchService';

export const GutReviewedEvidencePanel: React.FC<{ symptom: GutSymptom; topic?: GutResearchTopic | null }> = ({ symptom, topic }) => {
  const claims = getGutReviewedEvidence(symptom, topic);
  const guide = getGutPublicSourceGuide(symptom);
  const topicGuide = getGutTopicSourceGuide(symptom, topic || null);
  return <section className="gr-reviewed-evidence" aria-label="Source-backed general context and review status">
    <div className="gr-reviewed-evidence-heading"><span aria-hidden="true"><BookOpen size={18} /></span><div><small>SOURCE-BACKED CONTEXT</small><h4>What we can learn from a trusted source</h4></div></div>
    {guide && <article className="gr-public-guide"><h5>{guide.title}</h5><p>{guide.sentence}</p><div><strong>For your question</strong><span>{guide.relevance}</span></div><div><strong>What it cannot tell us</strong><span>{guide.limit}</span></div><a href={guide.url} target="_blank" rel="noopener noreferrer">Read the NIDDK source · {guide.locator} <ArrowUpRight size={14} aria-hidden="true" /></a><small>Public source: {guide.sourceReviewed}. HealthChain’s adaptation is pending independent clinical review.</small></article>}
    {topicGuide && <article className="gr-public-guide gr-topic-guide"><h5>{topicGuide.title}</h5><p>{topicGuide.sourceSays}</p><div><strong>Who or what was discussed</strong><span>{topicGuide.population}</span></div><div><strong>Fit for your question</strong><span>{topicGuide.fit}</span></div><a href={topicGuide.url} target="_blank" rel="noopener noreferrer">Inspect the original · {topicGuide.locator} <ArrowUpRight size={14} aria-hidden="true" /></a><small>Source-navigation note; no personal cause or treatment is inferred. Independent app review pending.</small></article>}
    <h5 className="gr-reviewed-subhead">Independently reviewed findings for this exact topic</h5>
    {claims.length === 0 ? <div className="gr-reviewed-evidence-empty"><ShieldCheck size={17} aria-hidden="true" /><p><strong>No independently reviewed finding is published for this topic yet.</strong> The study search below is for source inspection; search results are not a reviewed answer or a personal explanation.</p></div> : claims.map((claim) => <article className="gr-reviewed-claim" key={`${claim.id}:${claim.version}`}>
      <p className="gr-reviewed-claim-text">{claim.claim}</p>
      <dl>{[['Population', claim.population], ['Exposure', claim.exposure], ['Comparison', claim.comparator], ['Outcome', claim.outcome], ['Setting', claim.setting]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="gr-reviewed-limits"><strong>Limits:</strong> {claim.limitations.join(' ')}</p>
      <blockquote>{claim.source.supportingPassage} <small>({claim.source.locator})</small></blockquote>
      <a href={claim.source.url} target="_blank" rel="noopener noreferrer">{claim.source.title} · {claim.source.identifier} <ArrowUpRight size={14} aria-hidden="true" /></a>
      <small className="gr-reviewed-meta">Independently reviewed by {claim.reviewer.name} ({claim.reviewer.qualification}) · {new Date(claim.reviewedAt).toLocaleDateString()} · claim version {claim.version}</small>
    </article>)}
  </section>;
};
