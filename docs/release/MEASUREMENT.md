# Optional product measurement

This implementation uses HealthChain's own API and Supabase to count general product events after a versioned affirmative choice. It does not install an advertising or session-replay SDK. Consent is optional, can be withdrawn in Settings, and Global Privacy Control overrides acceptance. Earlier accepted measurement disclosures do not silently authorize this version.

| Available count | What is recorded | What is excluded |
|---|---|---|
| Visits | Fixed public page category or combined workspace category | URL queries/fragments, private routes, record IDs and search text |
| Workspace actions | One general workspace category | Symptoms, scores, clinical sections and selected conditions |
| Onboarding | Started/completed counts | Age, demographics, goals, answers and profile values |
| Audio | Playback, offline playback, downloads and general failure counts | Track names/IDs, categories, selected frequencies and listening histories |
| AI | Started/completed/failed request counts | Operation-specific health topic, prompt, response, photos, documents and case context |
| Checkout | Started/reported-completed counts | Amount, plan, transaction/account IDs and card/payment information |
| App errors | Screen/asset-load failure category | Exception message, stack trace, filenames and health content |

The database stores only UTC day, fixed event, fixed category, platform (web/Android/iOS) and count. It has no account, session, persistent device, cookie or IP column. The transport uses no account authorization header or cookies and omits the referrer. Hosting still receives ordinary connection information; aggregate storage is not a guarantee that every provider log is anonymous.

Browser normalization and the server both enforce the shared allowlist. The database independently checks the categories. Unknown fields/categories, missing or stale measurement permission, unrelated origins and excess requests are rejected. A request header signals this client choice; it is not a cryptographic proof of a human's consent. Counts can be affected by bots or forged client events and are not accounting records.

There is no identifier used to count unique people, follow an individual across devices, calculate individual retention or construct an advertising audience. Checkout completion counts are client-reported, not verified revenue. Denied measurement means those interactions are absent, so the report is not a complete census of all app use.

## Reports and access

The Content Studio administrator page includes a Product analytics panel with 7/30/90-day filters and aggregate CSV export. `/api/product-metrics` GET verifies the account token and requires server-controlled `app_metadata.healthchain_admin`, a server-controlled admin role or an explicitly configured `CONTENT_ADMIN_USER_IDS` entry. User-editable metadata and a hidden route do not grant access. Do not grant administrator access to ordinary users just to make the panel work.

The private table and the counting/report/cleanup RPCs are not accessible to `anon` or `authenticated` database roles. Only the server's service role may use them. The new private migration has been applied, role grants verified and count/rejection/report-window/prune behavior tested with synthetic writes rolled back.

## Retention, withdrawal and deployment

Reports cover up to 90 UTC calendar days. The scheduled cleanup prunes older aggregate counts; the report excludes expired days even if cleanup is delayed. Monitor cleanup failures. Permission withdrawal discards undispatched events and aborts pending fetches; it does not recall a count already received. Contributions cannot be found by person after combining counts without an identifier.

Older app versions can still write legacy account-linked `analytics_events` until the new application is deployed. The existing account-deletion transaction removes supported legacy rows; no bulk legacy-data deletion or shared-app access change was performed. Provider log/backup retention remains an operator verification item.

The branch still needs production deployment before real visitors receive these controls. Preview builds need the correct server environment and administrator configuration. Synthetic tests do not establish that those credentials or the operator's provider contracts are finalized.

## Rules reviewed

Apple requires permission, minimization, withdrawal and accurate disclosures; health data has restrictions on advertising and data mining. These limits are why this implementation uses generic product counts rather than a health-linked advertising profile. [Apple App Review Guidelines, sections 5.1.1–5.1.3](https://developer.apple.com/app-store/review/guidelines/)

Google requires accurate user-data disclosures and affirmative consent before unexpected sensitive-data handling; permission must not be inferred from leaving a prompt. [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)

The selected markets, legal operator, age scope and final store questionnaires remain necessary for the complete release review. This implementation does not certify compliance for every country or make consent override health-data restrictions.
