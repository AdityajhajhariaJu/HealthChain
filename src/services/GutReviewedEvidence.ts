import type { GutSymptom } from './GutResolutionService';
import type { GutResearchTopic } from './GutResearchService';

/** A user-facing general finding is publishable only with a traceable, independent review. */
export interface GutReviewedEvidenceClaim {
  id: string;
  version: number;
  symptom: Exclude<GutSymptom, 'unspecified'>;
  topic: GutResearchTopic;
  claim: string;
  population: string;
  exposure: string;
  comparator: string;
  outcome: string;
  setting: string;
  limitations: string[];
  source: { title: string; url: string; identifier: string; locator: string; supportingPassage: string };
  reviewer: { name: string; qualification: string; independent: boolean };
  reviewedAt: string;
}

/**
 * Intentionally empty until a qualified independent reviewer approves specific claims.
 * Search results are not promoted into this registry automatically.
 */
export const gutReviewedEvidenceRegistry: readonly GutReviewedEvidenceClaim[] = [];

export function getGutReviewedEvidence(symptom: GutSymptom, topic?: GutResearchTopic | null): GutReviewedEvidenceClaim[] {
  if (symptom === 'unspecified') return [];
  return gutReviewedEvidenceRegistry.filter((claim) => claim.symptom === symptom && (!topic || claim.topic === topic));
}

/** Validate registry completeness before a reviewed finding can ship. */
export function validateGutReviewedEvidenceClaim(claim: GutReviewedEvidenceClaim): string[] {
  const errors: string[] = [];
  if (!claim.id.trim() || !Number.isInteger(claim.version) || claim.version < 1) errors.push('A stable claim ID and positive version are required.');
  for (const [field, value] of Object.entries({ claim: claim.claim, population: claim.population, exposure: claim.exposure, comparator: claim.comparator, outcome: claim.outcome, setting: claim.setting, sourceTitle: claim.source?.title, sourceId: claim.source?.identifier, sourceLocator: claim.source?.locator, passage: claim.source?.supportingPassage, reviewer: claim.reviewer?.name, qualification: claim.reviewer?.qualification })) {
    if (!value?.trim()) errors.push(`${field} is required.`);
  }
  try {
    const url = new URL(claim.source.url);
    if (url.protocol !== 'https:') errors.push('The original source must use HTTPS.');
  } catch { errors.push('A valid original source URL is required.'); }
  if (!claim.reviewer?.independent) errors.push('An independent reviewer must approve the claim.');
  if (!claim.reviewedAt || Number.isNaN(Date.parse(claim.reviewedAt))) errors.push('A valid review date is required.');
  if (!Array.isArray(claim.limitations) || claim.limitations.length === 0 || claim.limitations.some((item) => !item.trim())) errors.push('At least one explicit limitation is required.');
  const passageWords = claim.source?.supportingPassage.trim().split(/\s+/).filter(Boolean).length || 0;
  if (passageWords > 25) errors.push('Keep the source passage to 25 words or fewer; identify longer material by its locator.');
  return errors;
}
