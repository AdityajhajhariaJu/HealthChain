# Whole-app functional audit

Date: 1 October 2026. Starting source revision: `ce5df937c8d50d24d4232fb07409eaca2363637f`.

## Conclusion

The app has real working connections, including **Razorpay**. This wider pass found additional defects after the earlier Diet, Ava and pillar releases. The fixes below are source changes with regression evidence; they do not establish that every real provider response, physical phone or user journey is flawless.

This report covers the registered routes, the main cards and their subfeatures, the screen-to-service handlers, API destinations, owner isolation, persistence, failure recovery and live Supabase metadata. It extends [the pillar audit](CROSS-FEATURE-PILLAR-AUDIT.md). Earlier baseline findings in that document are historical; its dated continuation sections describe subsequent fixes.

### What the evidence means

- **Source traced:** the actual mounted component and its handler were followed to the reader/writer or API. An unused service is not proof that the live feature is missing.
- **Controlled interaction:** unit or Chromium/WebKit tests exercise synthetic records, provider fixtures, failure paths and assertions on actual screens. Browser fixtures are not live AI or signed-in customer acceptance.
- **Live database verification:** schema/policy metadata and rolled-back synthetic owner tests establish specific database constraints. No private patient record was inspected.
- **External acceptance:** signed phones, provider credentials, real sign-in, background delivery, two-device convergence and medical/nutrition accuracy require separate evidence.

## Registered page inventory

| Pages | Actual purpose and connections | Verification boundary |
|---|---|---|
| `/`, `/login`, `/signup`, `/auth/callback`, `/update-password` | Landing, password login, Google/Apple OAuth, email confirmation, reset and session callback. Supabase Auth feeds owner-scoped repositories and the protected shell. | Browser OAuth request/callback tests; new native callback tests. Real Google/Apple login, email delivery and phone return still need acceptance. |
| `/onboarding`, `/app/onboarding`, `/app/profile` | Shared demographics, country/region, preferences, conditions, allergy and medication inventory. Read by Diet, Ava, clinical intake and daily schedule. | Location, profile, schedule and conflict tests. Caregiver creation remains intentionally unavailable; one active patient profile is supported. |
| `/app`, `/app/today` | Today dashboard, check-ins, hydration, doses, Gut Health, food photo lens, calm audio, records and contextual handoffs. | Existing tracker, Gut, Lens, notification-action and case-handoff suites. Sensor/audio/background journeys retain device/provider boundaries. |
| `/app/consult` | Clinical Review and its quick review, perspective review and document/case investigation tools. Explicit selected case and source records feed saved review snapshots. | Existing grounding, case-selection, quota and failure tests; provider output integrity strengthened here. General model JSON checks do not validate every clinical assertion. |
| `/app/my-cases`, `/app/cases/:id`, `/app/case-prep` | Cases, source documents, timelines, questions, review snapshots, appointment briefs, versions, refinement and user-reported visit outcomes. | Case, archive, source-grounding and handoff suites; additional stale-refinement and screen-refresh fixes. |
| `/app/health-memory`, `/app/ava` | Reviewed health memory, conversational history, case/general context and interactive message cards/actions. | Existing memory, Ava task-completion, ownership, freshness and structured-action tests. Real model evaluation remains a distinct gate. |
| `/app/dietician`, `/app/nutrition-log` | Personalized food planner, eaten diary, actual portions, saved meals, barcode/photo analysis, reactions, grocery controls, reminders, practical preferences, insights and exports. | Existing Diet generation, recovery, shared-diary, everyday, location and Lens suites. Food-photo estimates are not guaranteed measured composition. |
| `/app/trials` | Registry studies and Europe PMC literature; relevance review and owner-scoped saved dossiers. | Retrieval tests and new delayed-case/cache tests. Registry/literature outage is visible, including on cached results. Relevance is not proof of trial eligibility. |
| `/app/progress`, `/app/trophies` | Recorded activity, diary days, private progress photo, milestones and activity points; Ava handoff. | Route checks and owner/persistence fixes. Saved histories now show retryable failure instead of appearing to be empty. Photo is device-scoped with archive support, not an automatic cloud photo gallery. |
| `/app/settings` | Theme, notification preferences, device connections, archive export/review/restore, logout and account deletion. | Existing archive, conflict, erasure and lifecycle journeys. Native erasure/Preferences and signed two-device restore still need acceptance. |
| `/pricing`, top-up modal | Razorpay subscription and feature top-ups, server-owned catalog, payment verification, receipt recovery and interrupted-task resumption. | Existing payment gateway/ledger/refund tests and new shared-checkout failure tests. No new paid transaction was made in this audit. |
| `/help`, `/changelog`, `/privacy`, `/terms`, `/review-demo` | Support, feedback, product updates, legal information and reviewer demo. | Route tests and feedback-rejection journey. A failed feedback write now keeps the draft and exposes email/retry. Demo content is not a live patient case. |
| `/app/admin/content` | Authorized content management and public fitness cover upload. | Ordinary users denied before privileged reads/writes; controlled admin read/upload tests. Real administrator must have server-controlled permission. |
| Unknown paths, `/index.html` | Not-found recovery and landing redirect. | Existing route tests; error boundary remains available. |

Legacy aliases were traced: `/app/war-room`, `/app/cases`, `/app/multi`, `/app/mdthub`, `/app/mdt`, `/app/collab`, `/app/deep-collab-beta`, `/app/nutrition`, `/app/health-buddy`, `/chat`, `/app/jarvis`, `/app/pricing`, and retired `/app/medicine-lab`, `/app/pharmacy`, `/app/reports`. They redirect to their current destinations; retired medicine/lab screens are not active app pages.

## Main feature connections and user expectations

| Area / subfeatures | Working contract | What a user should observe |
|---|---|---|
| Health profile and memory | Shared baseline is separate from observed events, AI interpretations and reviewed memories. Field-level reconciliation and explicit conflicts protect concurrent edits. | Updating allergies/medicines affects subsequent context; an old answer remains a dated snapshot. Memory edits/deletions do not silently rewrite source documents. |
| Ava chat and cards | Case mode uses selected case evidence; general mode uses scoped baseline and labelled daily/device records. Proposed observations and actions require review/confirmation. | Cards/dropdowns open the relevant workflow, preserve original records, and do not silently log an uneaten meal or claim an action was saved after failure. |
| Clinical review / My Cases | Intake, originals, reviewed evidence and selected daily evidence are connected through the case identity and revisions. | A missing or changed case cannot receive a late result intended for a different case. Exported originals keep their bytes and integrity checks. |
| Hydration | Canonical owner-scoped water events drive dashboard, tracker, projections and context; quantities are exact millilitres. | Quick add, undo, target changes and local midnight agree. Schedule/reminder state never substitutes for recorded drinking. |
| Medications | Shared medication inventory drives reminders; taken/skipped/unknown dose events are separate from the prescription/schedule. | Baseline edits preserve dose IDs/times and history; removing a medicine removes future schedule entries. Closing the scheduler must release the overlay immediately after a dose update. |
| Gut Health | Quick Log keeps its distinct style. Questions, diary/reactions, maps, research, timeline, current concerns, elimination work and case handoffs share scoped records with explicit links. | An unrelated log does not attach to an old question; unknown reports remain unknown; patterns describe observations and do not establish cause. |
| Diet | Location and chosen cuisine personalize food availability; allergies/restrictions and practical preferences constrain generation. Plans, eaten meals and label/reference composition remain distinct. | Generation failures offer recovery. Planned meals enter the shared diary only after actual amount/date confirmation. Packaged food shows the per-100 basis; actual portions scale separately. |
| Daily notifications | Water, medicine, meal and check-in scheduling is serialized and owner-scoped; push tokens belong to an installation. | Stale account actions cannot record a dose/water for the next account. Browser reminders disclose that a closed browser is not a native alarm. |
| Research | Selected case/terms define a request and cache context. Source health is stored with cached results. | Old searches cannot overwrite a new case or add memory to it; a partial source outage remains visible after reopening. |
| Payment/quota | Razorpay checkout uses a single catalog and server-authoritative ownership, verification, provisioning and refund ledger. | Failed verification retains a receipt, blocks another checkout while unresolved, and offers status recovery. A top-up cannot restore subscription status. |
| Activity and photos | Reported quantities are counts/recorded durations, not a health score. History and diary reads are scoped; local photos survive logout and belong to the archive. | No invented mindfulness minutes, wrong UTC-day grouping or previous-owner photo/history. Failed history loads can be retried. |
| Archive/logout/deletion | Logout retains owned durable records and pending payment/task receipts. Confirmed account deletion removes only the selected owner and leaves retry receipts when device cleanup fails. | Credentials are cleared; data is not falsely described as deleted when the server rejects the request. Archive preview/import respects owner and provenance. |

## Confirmed defects fixed in this release

1. **Privileged CMS authorization:** any signed-in caller could previously choose a table and use the server's privileged database client. Now fresh Supabase `app_metadata` or server-only `CONTENT_ADMIN_USER_IDS` authorizes CMS access; user-editable metadata is ignored; mutations are confined to `fitness_content`. Missing updates/deletes and outages are explicit. The Vite development adapter now calls the same handler.
2. **CMS cover upload:** the referenced bucket did not exist in live metadata and direct browser upload lacked a matching policy. Authorized server upload validates JPEG/PNG/WebP signatures and size, creates the public content bucket when first needed, uses random filenames and returns the confirmed URL. Patient originals do not use this public bucket.
3. **Native API destination:** bundled apps defaulted to relative APIs at the phone's local origin. A shared resolver now chooses the configured secure backend or `https://healthchain360.com` on native, and same-origin on web. AI, checkout/verification, deletion, barcode, research, CMS and push-test callers use it. Hosted origin is included in shipped CSP and native origins in affected CORS lists.
4. **Native auth return:** native OAuth used WebView navigation without a browser return listener or registered URL scheme. The app now opens the system browser, uses native PKCE, registers `com.healthchain.app://auth/...`, handles warm/cold callbacks, deduplicates exchanges, and rejects arbitrary schemes/paths and incoming bearer-token callbacks. Signup/reset use the same redirect resolver.
5. **Native configuration:** unsupported iOS HTTPS scheme changed to `capacitor`; root privacy descriptions and HealthKit entitlement added; misplaced nested HealthKit descriptions removed. These source corrections still require signed-device validation.
6. **Checkout/recovery:** the actual top-up modal now uses the same Razorpay recovery service as Pricing, releases a missing-session button, and derives price/quantity from the catalog. Shared checkout prevents concurrent openings, bounds SDK/API response reading, validates orders, retains failed-verification receipts and refreshes recovery state. Verification recovery re-reads the current session.
7. **Entitlement repair:** the private operator endpoint previously selected an arbitrary valid receipt, used a future profile timestamp and counted unchecked writes. It now pages candidates and calls a service-only transactional database function. Payment rows are locked before the profile; current valid subscription receipts, including partial refunds, determine recovery. Longer existing expiry is retained; top-ups/full refunds do not restore Pro; repeated repairs are not counted twice.
8. **Support feedback:** failed Supabase writes previously showed success and awarded points. Failures now preserve the draft with retry/email; only confirmed writes show success. The live INSERT policy now prevents another-owner attribution, while preserving anonymous guest feedback and owned reads.
9. **Research request ownership:** old case searches could overwrite later results and write memory in the current scope. Request/context/owner guards and live case/profile refresh stop this; caches retain source health and failure state. Gut Health observation reads now check both the active owner and the latest read, so a previous account's delayed response cannot replace current records.
10. **Appointment prep:** late refinement is rejected when owner, case or source fingerprint changes. The page refreshes changed/deleted cases and profile context; unsaved question/visit-note operations no longer announce success. New question selection builds from the freshly saved case.
11. **Activity/data durability:** the fitness category reader queried a nonexistent `name` field instead of `label`; this is corrected. Missing mindfulness duration no longer invents five minutes. Progress groups completion dates locally, passes actual activity minutes to Ava, guards stale readers/uploads, validates saved photo writes and retains scoped photos/receipts through logout. Milestones refresh points and clear old owner state.
12. **Shared AI response integrity:** non-Diet/non-Ava operations now reject blank, thought-only, truncated and malformed structured provider responses, mark the request failed and release reserved quota. Answer parts are joined without exposing thought parts. Diet/Ava retain their operation-specific validators.
13. **Legacy database helpers:** the timestamp trigger and optional vector matcher had mutable schema lookup. Their search paths are now fixed; the matcher qualifies its table and vector operator. Invoker permissions and existing grants are preserved. A temporary-row timestamp test and a zero-result matcher call passed in a rolled-back transaction.
14. **Medication dialog dismissal:** Escape could leave the medication overlay open after schedule edits, blocking the baseline button below it. The listener is now stable, uses the current dismiss action and respects an overlaid dialog. The reproduced browser regression explicitly checks that the medication dialog has closed before editing the baseline.
15. **Startup font dependency:** a production diagnostic held Google Fonts requests and the dashboard did not render until they were released. The HTML font sheet now loads without blocking startup, and a duplicate Inter import was removed from the main CSS. The regression keeps the font service pending while requiring the dashboard to render, with the same fonts applied when available.

The public bucket is created lazily on a genuine authorized upload; no production cover image was uploaded by this audit. No real account received new CMS privileges.

## API and backend map

| Endpoint | Authority and principal caller |
|---|---|
| `/api/gemini` | Authentication/trial controls, operation registry, bounded provider call, request ledger, quota reservation/recovery; Ava, Diet, clinical and Gut callers. |
| `/api/food-product` | Validated barcode/catalog lookup; packaged-food composition and source/basis display. |
| `/api/trials` | Registry proxy with bounded request/fallback; Clinical Research. |
| `/api/create-order` | Authenticated owner and server product catalog; shared Razorpay checkout. |
| `/api/verify-payment` | Owner/order/signature/capture validation and authoritative fulfillment/status; checkout and recovery. |
| `/api/razorpay-webhook` | Provider signature and idempotent payment/refund reconciliation; provider-originated events. |
| `/api/recover` | Private operator credential; service-only atomic subscription repair. Not a public user upgrade endpoint. |
| `/api/cron/revoke-expired` | Private cron credential; expiry revocation and interrupted AI request recovery. |
| `/api/delete-account` | Authenticated owner, erasure tombstone, session revocation, owned rows/Storage bytes/identity deletion. |
| `/api/push-test` | Authenticated current installation and configured FCM/APNs transport test. A test sender is not a complete remote reminder scheduler. |
| `/api/admin-content` | Fresh server-controlled content-admin permission, table confinement, rate limit, content upload. |

Supabase changes are additive migrations in this release: feedback/payment owner policies and indexes, `recover_subscription_entitlement(uuid)` with client EXECUTE revoked, and fixed legacy function search paths. The main SQL verifier asserts these boundaries. Synthetic feedback, subscription recovery and search-path scripts always end in `ROLLBACK`; follow-up checks confirmed zero remaining synthetic users.

Efficiency changes include one payment read policy instead of two identical permissive policies, cached `auth.uid()` policy evaluation, owner/date indexes for payments/feedback, owner changes triggering activity reloads while ordinary baseline edits avoid repeated history fetches, and shared checkout/SDK deduplication.

## Verification record

The task's `cross-feature-review/deeper-audit` directory contains command logs and browser artifacts. The final source passed **784 tests**, with one live-model suite skipped. Production build, lint and server syntax checks passed. The migration contract includes the final function hardening; live SQL verification is recorded separately.

The first 190-case browser sweep passed 185 cases and reported five timeouts. A focused rerun reproduced the medication overlay failure; its handler is fixed with an explicit closed-dialog assertion. Startup and WebKit stability failures were rechecked instead of being treated as successful coverage. The final serial browser sweep passed **190/190 Chromium/WebKit cases** (25.2 minutes) without forced clicks or test retries. GitHub/production results are recorded with the release outcome; the initial failed run remains evidence.

Three live rolled-back suites establish guest/owner feedback isolation, subscription recovery behavior (latest expiry, longer existing expiry, idempotence, full refunds/top-ups excluded and client execution denied), and unchanged behavior under fixed legacy function lookup. The full live SQL verifier passed. Build, lint, runtime dependency audit, server syntax and the **41-migration** contract passed; none establishes native delivery or clinical accuracy. Fresh security adviser output contains no mutable-function-search-path warning.

The live public Auth settings endpoint returned HTTP 200: Google and email signup are enabled, signup is allowed, and Apple is disabled. The current login screen exposes Google; the unused Apple handler type does not establish an available Apple sign-in flow. These settings do not verify email delivery or the native redirect allowlist.

Production follow-up: nine guest pages rendered with zero uncaught runtime errors; 17 read-only page/API/CORS checks passed. One real synthetic guest Ava request returned a complete HTTP 200 response. Real-provider meal-plan evaluations passed for India/Maharashtra (seven days, four meals/day) and Japan/Tokyo (seven days, five meals/day), using the shipped payload and validators. These samples establish operational generation and structure, not measured nutrient accuracy, universal clinical correctness or an authenticated user's complete generation/recovery path.

Hosted CI on the first release commit passed unit/build gates and 189/190 browser cases. The failing case waited for `load` while analytics/font requests remained live in an otherwise mocked AI/research-failure fixture. That fixture now isolates external requests and waits for DOM readiness; its full interaction, research-outage and reload assertions remain in place. The follow-up hosted run passed with one similar Gut daily-home navigation retry; that mocked suite now also isolates external requests while retaining explicit provider stubs. Final hosted results are recorded in the release evidence.

## Remaining acceptance and implementation boundaries

| Priority | Remaining work / acceptance | Completion evidence needed |
|---|---|---|
| P0 native | Supabase Auth redirect allowlist must include `com.healthchain.app://auth/callback` and `com.healthchain.app://auth/update-password`. The connected tools did not expose Auth configuration management. | Verify dashboard configuration, signed Android/iOS Google return, cancelled browser flow, email confirmation and same-device password reset. PKCE reset opened on another device may require a fresh reset/sign-in flow. |
| P0 delivery | FCM/APNs credentials, registration and real delivery; remote scheduled reminder sender is separate from the installed local alarm services and push-test endpoint. | Permission-denied/granted, foreground/background/terminated phone tests, timezone changes, logout/switch and duplicate-installation tests. No real notification was sent in this audit. |
| P0 trust | Real model quality and measured food composition. Generic JSON validation only verifies transport/structure; several legacy clinical operations still accept client-shaped prompts and lack a complete operation-specific semantic contract. | Curated adversarial/regression evaluations, live configured model tests and qualified clinical/nutrition review. No claim that every answer or photo estimate is always correct. |
| P1 sync | Signed-in two-device concurrent edits, offline queue, source deletion, archive recovery and native Preferences. | Two-owner/two-device acceptance with loss/retry/account-switch journeys; controlled browser/SQL tests alone do not establish end-user convergence. |
| P1 content | Real authorized CMS asset/media playback, production email support, and provider integration acceptance. | Genuine admin happy path, bad uploads/outage, content playback and feedback submission under real session, using synthetic app records. |
| P1 scale | Existing Supabase adviser debt: other FK indexes, per-row Auth checks and disabled leaked-password protection. Server-only RLS-with-no-policy tables intentionally remain closed. | Review measured active queries and change the exact policies/settings; do not bulk grant server-only tables or remove rarely-used protective indexes. |
| P2 product | Caregiver/multi-patient creation is unavailable. Native Live Activities remains an unused stub. Apple sign-in is not enabled/exposed. The unused `MonetizationService` adapter is not the active payment path. | Implement only if brought into the supported product surface; do not advertise those adapters as finished integrations. |

These are explicit gaps and acceptance gates, not proof that the main browser features are disconnected. The app must not be described as universally perfect or fully phone-accepted while these remain open.

## Implementation source anchors

`src/App.tsx`, `src/services/ApiEndpoint.ts`, `NativeAuth.ts`, `supabaseClient.ts`, `razorpay.ts`, `DurableHealthStorage.ts`, `FitnessService.ts`, `clinicalTrialsService.ts`, `shared/model-output-validation.js`, `server/content-image.js`, the modified feature screens, API handlers, `vite.config.js` and the three migrations are the primary anchors. New tests: `WholeAppBoundaryAudit.test.ts`, `WholeAppScreenFlows.test.tsx`, `NativeAuth.test.ts`, `PaymentCheckoutRecovery.test.ts`, `EntitlementRecovery.test.ts`, `GutOwnerRefresh.test.tsx`, `whole-app-working-audit.spec.ts` and the three rolled-back SQL scripts.

The native return implementation follows [Supabase mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [Capacitor App callbacks](https://capacitorjs.com/docs/apis/app) and [Capacitor Browser](https://capacitorjs.com/docs/apis/browser). CMS authority uses server-controlled metadata as documented in [Supabase users](https://supabase.com/docs/guides/auth/users).
