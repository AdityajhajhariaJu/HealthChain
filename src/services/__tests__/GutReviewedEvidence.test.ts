import { describe, expect, it } from 'vitest';
import { getGutReviewedEvidence, gutReviewedEvidenceRegistry, validateGutReviewedEvidenceClaim, type GutReviewedEvidenceClaim } from '../GutReviewedEvidence';

const approvedExample: GutReviewedEvidenceClaim = {
  id: 'reviewed-claim-fixture', version: 1, symptom: 'bloating', topic: 'food',
  claim: 'A bounded, reviewer-written general finding.', population: 'Adults represented by the cited studies',
  exposure: 'As defined by the source', comparator: 'The source comparator', outcome: 'The measured source outcome',
  setting: 'The study setting', limitations: ['This group-level result does not explain an individual person’s symptoms.'],
  source: { title: 'Example source', url: 'https://pubmed.ncbi.nlm.nih.gov/12345678/', identifier: 'PMID 12345678', locator: 'Results, paragraph 2', supportingPassage: 'A short supporting passage from the source.' },
  reviewer: { name: 'Reviewer fixture', qualification: 'Registered dietitian', independent: true }, reviewedAt: '2026-09-26T00:00:00Z',
};

describe('Gut reviewed-evidence publication gate', () => {
  it('ships no unreviewed health claims and never derives findings from search results', () => {
    expect(gutReviewedEvidenceRegistry).toEqual([]);
    expect(getGutReviewedEvidence('bloating', 'food')).toEqual([]);
    expect(getGutReviewedEvidence('unspecified')).toEqual([]);
  });

  it('requires exact source, applicability fields, short source passage, limitations and independent reviewer sign-off', () => {
    expect(validateGutReviewedEvidenceClaim(approvedExample)).toEqual([]);
    const invalid = validateGutReviewedEvidenceClaim({
      ...approvedExample,
      source: { ...approvedExample.source, url: 'http://example.com', supportingPassage: Array(28).fill('quoted').join(' ') },
      reviewer: { ...approvedExample.reviewer, independent: false },
      limitations: [],
    });
    expect(invalid).toContain('The original source must use HTTPS.');
    expect(invalid).toContain('An independent reviewer must approve the claim.');
    expect(invalid).toContain('At least one explicit limitation is required.');
    expect(invalid).toContain('Keep the source passage to 25 words or fewer; identify longer material by its locator.');
  });
});
