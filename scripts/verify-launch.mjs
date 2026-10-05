import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { legalIdentityComplete } from '../shared/legal-documents.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const argument = process.argv.slice(2);
if (argument.length > 1) throw new Error('Usage: npm run verify:launch -- path/to/completed-attestation.json');
const attestationPath = resolve(root, argument[0] || 'docs/release/launch-attestation.json');
const attestation = existsSync(attestationPath) ? JSON.parse(readFileSync(attestationPath, 'utf8')) : {};
const checks = [];
const check = (name, passed, evidence) => checks.push({ name, passed: Boolean(passed), evidence });
check('Original policies approved with real operator, eligibility, markets, provider and retention facts', legalIdentityComplete(), 'shared/legal-config.json');
const privacy = readFileSync(resolve(root, 'public/privacypolicy.html'), 'utf8');
check('Public privacy HTML is final and readable without scripts', !/<script\b|Publication draft|awaiting confirmation/i.test(privacy), 'public/privacypolicy.html');
check('Native billing strategy implemented and reviewed', ['free-native', 'store-purchases'].includes(attestation.nativeBilling) && attestation.nativeBillingReviewReference?.trim(), 'Owner decision plus implementation/review reference; a decision alone is insufficient.');
for (const [field, name] of Object.entries({
  iosLoginResolved: 'iOS sign-in option meets the applicable store rule',
  sharedTableExposureResolved: 'Shared database tables no longer expose unrestricted client access',
  providerContractsAndTransfersReviewed: 'AI/hosting processor terms and international transfer safeguards reviewed',
  hostingSensitiveDataProcessingApproved: 'Actual hosting arrangement and applicable commercial/data-processing terms reviewed',
  aiFeatureUseRestrictionsReviewed: 'AI feature behavior meets provider medical-use, age and available-region restrictions',
  sensitiveHealthConsentReviewed: 'Core cloud health processing has a valid consent/legal basis for each launch market',
  providerLogAndBackupRetentionVerified: 'Provider log, backup and statutory payment retention verified',
  storePrivacyFormsReviewed: 'Apple App Privacy and Google Data Safety/Health declarations match the final binary',
  androidRealDeviceReviewPassed: 'Real Android device permission, offline, login, deletion and recovery review passed',
  iosRealDeviceReviewPassed: 'Real iOS device permission, offline, login, deletion and recovery review passed',
  storeAccountAndTestingRequirementsMet: 'Developer identities, agreements and applicable Play testing requirements met',
  reviewerAccessPrepared: 'Reviewer account, access instructions and functioning backend prepared'
})) check(name, attestation[field] === true, 'External/owner verification required; not inferred from a web build.');
for (const [field, label] of [['androidSignedBundlePath', 'Signed Android AAB'], ['iosSignedArchivePath', 'Signed iOS archive']]) {
  const path = typeof attestation[field] === 'string' && attestation[field] ? resolve(root, attestation[field]) : '';
  check(label + ' supplied for independent store validation', path && existsSync(path), 'Binary existence is only one gate; signing and store validation must also pass.');
}
for (const result of checks) console.log((result.passed ? 'PASS ' : 'BLOCKED ') + result.name);
console.log((attestation.breachedPasswordProtectionResolved === true ? 'PASS ' : 'RECOMMENDED ') +
  'Server-enforced breached-password screening. Supabase\'s paid switch is optional; it is not a blanket store requirement and does not alone block this gate.');
console.log('\nThis gate combines local checks and clearly identified owner attestations. It does not predict store approval.');
if (checks.some(result => !result.passed)) process.exitCode = 1;
