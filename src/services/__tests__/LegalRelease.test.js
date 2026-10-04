import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getLegalDocument, legalIdentityComplete, POLICY_LINKS } from '../../../shared/legal-documents.js';
const approved = { reviewStatus: 'approved', operatorName: 'Example operator', operatorCountry: 'Example country',
  operatorAddress: 'Example business address', privacyEmail: 'privacy@example.test', supportEmail: 'support@example.test',
  governingLaw: 'applicable operator law', minimumAge: 18, launchMarkets: ['Example market'], aiBillingVerified: true,
  retentionDetails: 'Confirmed retention details for active records, logs, backups and payment records.' };
describe('policy publication and regional coverage', () => {
  it('cannot approve an incomplete operator identity or provider verification', () => {
    expect(legalIdentityComplete()).toBe(false);
    expect(legalIdentityComplete(approved)).toBe(true);
    for (const field of ['operatorName', 'operatorAddress', 'operatorCountry', 'governingLaw', 'retentionDetails'])
      expect(legalIdentityComplete({ ...approved, [field]: '' })).toBe(false);
    expect(legalIdentityComplete({ ...approved, aiBillingVerified: false })).toBe(false);
    expect(legalIdentityComplete({ ...approved, launchMarkets: [] })).toBe(false);
    expect(legalIdentityComplete({ ...approved, minimumAge: 12 })).toBe(false);
  });
  it.each(['us', 'international'])('renders all seven original documents for %s with no template tokens', region => {
    expect(POLICY_LINKS).toHaveLength(7);
    for (const link of POLICY_LINKS) {
      const text = getLegalDocument(link.id, region, approved);
      expect(text).not.toMatch(/\[\[[A-Z_]+\]\]/); expect(text.length).toBeGreaterThan(2000);
      expect(text).not.toMatch(/OxeAI|OXE AI|Ada Health|Flo Health/);
    }
    expect(getLegalDocument('privacy', region, approved)).toContain(region === 'us' ? 'United States privacy supplement' : 'International privacy supplement');
  });
  it('keeps the Health Connect privacy notice readable without JavaScript and labels incomplete drafts', () => {
    for (const path of ['public/privacypolicy.html', 'public/privacypolicy-us.html', 'public/delete-account.html']) {
      expect(existsSync(path)).toBe(true); const html = readFileSync(path, 'utf8');
      expect(html).not.toMatch(/<script\b/i); expect(html).toContain('Publication draft');
      expect(html).toContain('HealthChain'); expect(html).toContain('mailto:healthchain360@gmail.com');
    }
  });
});
