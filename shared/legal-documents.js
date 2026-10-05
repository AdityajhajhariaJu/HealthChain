import config from './legal-config.json' with { type: 'json' };
import { LEGAL_DOCUMENTS, POLICY_DATE, PRIVACY_SUPPLEMENTS } from './legal-content.js';
export { POLICY_DATE };
export const LEGAL_CONFIG = config;
export const POLICY_LINKS = [
  { id: 'terms', title: 'Terms of Service', path: '/terms' },
  { id: 'acceptableUse', title: 'Acceptable Use', path: '/acceptable-use' },
  { id: 'appLicense', title: 'App Licence', path: '/app-license' },
  { id: 'privacy', title: 'Privacy Policy', path: '/privacy' },
  { id: 'consumerHealth', title: 'Consumer Health Privacy', path: '/consumer-health-privacy' },
  { id: 'security', title: 'Privacy and Security', path: '/privacy-security' },
  { id: 'deletion', title: 'Account Deletion', path: '/delete-account' },
];
export function legalIdentityComplete(settings = config) {
  return settings.reviewStatus === 'approved' &&
    ['operatorName', 'operatorCountry', 'operatorAddress', 'supportPhone', 'privacyEmail', 'supportEmail', 'governingLaw']
      .every(field => typeof settings[field] === 'string' && settings[field].trim()) &&
    Number.isInteger(settings.minimumAge) && settings.minimumAge >= 18 &&
    Array.isArray(settings.launchMarkets) && settings.launchMarkets.length > 0 &&
    settings.launchMarkets.every(market => typeof market === 'string' && market.trim()) &&
    typeof settings.retentionDetails === 'string' && settings.retentionDetails.trim().length > 20 &&
    settings.aiBillingVerified === true && !/must be confirmed|awaiting|\[\[/i.test(settings.retentionDetails);
}
export function policyHeadingId(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export function getLegalDocument(documentId = 'privacy', region = 'international', settings = config) {
  const id = Object.hasOwn(LEGAL_DOCUMENTS, documentId) ? documentId : 'privacy';
  const values = {
    OPERATOR_NAME: settings.operatorName || '[Operator name awaiting confirmation]',
    OPERATOR_COUNTRY: settings.operatorCountry || '[Operator country awaiting confirmation]',
    OPERATOR_ADDRESS: settings.operatorAddress || '[Correspondence address awaiting confirmation]',
    PRIVACY_EMAIL: settings.privacyEmail, SUPPORT_EMAIL: settings.supportEmail,
    SUPPORT_PHONE: settings.supportPhone || '[Support telephone awaiting confirmation]',
    RETENTION_DETAILS: settings.retentionDetails,
    ELIGIBILITY_DETAILS: settings.minimumAge
      ? 'The service is for adults aged ' + settings.minimumAge + ' and above. Availability depends on applicable local law and the availability of our app stores and service providers. AI features are available only in regions supported by the AI provider.'
      : '[Launch eligibility must be confirmed by the operator before distribution.]',
    GOVERNING_LAW_DETAILS: settings.governingLaw
      ? 'Subject to mandatory local consumer protections, the agreement is governed by ' + settings.governingLaw + '.'
      : '[The operator must confirm the governing-law provision before publication.]',
  };
  let text = LEGAL_DOCUMENTS[id];
  if (id === 'privacy') text += '\n\n' + PRIVACY_SUPPLEMENTS[region === 'us' ? 'us' : 'international'];
  if (id === 'terms') text += region === 'us'
    ? '\n\n## United States consumer supplement\nApplicable federal/state privacy and consumer rights remain available. This agreement does not select a US legal entity, impose mandatory arbitration, or remove statutory remedies. Consumer health rights are described in the separate consumer health notice. The same operator identified above supplies the service.'
    : '\n\n## International consumer supplement\nMandatory local consumer guarantees, lawful cancellation/withdrawal rights and access to competent courts or regulators remain available where applicable. Immediate use of a digital service does not by itself waive a statutory withdrawal right. The operator must obtain any legally required express request/acknowledgment before relying on a withdrawal exception. A country-specific condition that conflicts with a mandatory right cannot remove that right.';
  return text.replace(/\[\[([A-Z_]+)\]\]/g, (_match, key) => values[key] || '[Contact detail awaiting confirmation]');
}
