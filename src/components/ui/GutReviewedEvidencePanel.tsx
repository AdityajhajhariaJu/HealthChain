import React from 'react';
import { ArrowUpRight, BookOpen, ShieldCheck } from 'lucide-react';
import { getGutReviewedEvidence } from '../../services/GutReviewedEvidence';
import type { GutSymptom } from '../../services/GutResolutionService';
import type { GutResearchTopic } from '../../services/GutResearchService';

export const GutReviewedEvidencePanel: React.FC<{ symptom: GutSymptom; topic?: GutResearchTopic | null }> = ({ symptom, topic }) => {
  const claims = getGutReviewedEvidence(symptom, topic);
  return <section className="gr-reviewed-evidence" aria-label="Independently reviewed research summary">
    <div className="gr-reviewed-evidence-heading"><span aria-hidden="true"><BookOpen size={18} /></span><div><small>RESEARCH SUMMARY</small><h4>What reviewed evidence can say</h4></div></div>
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
