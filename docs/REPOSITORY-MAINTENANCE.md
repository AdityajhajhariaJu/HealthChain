# Repository cleanup and performance work

Started: 1 October 2026, from `fe67f827` on `master`.

## Implementation sequence

| Ticket   | Work                                                                                                                                                                                                                       | Verification                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| CLEAN-01 | Inventory tracked files, module reachability, duplicate assets, package use and deployed content references. Record a production build baseline.                                                                           | Saved inventory and build measurements outside the repository.                                  |
| CLEAN-02 | Remove obsolete patch scripts, scratch files, generated reports/build output and unreachable retired components. Keep migration history, native project sources and working product flows. Organize feature documentation. | Reference scan, TypeScript/build, unit and browser gates.                                       |
| PERF-01  | Split initial routes and defer heavy modal, chart, 3D and export code until used. Keep error and loading recovery.                                                                                                         | Compare initial static JavaScript closure and route bundle sizes; production browser journeys.  |
| PERF-02  | Deduplicate public catalog reads with independent cache expiration and explicit invalidation; prevent stale cache extension and repeated requests.                                                                         | Controlled concurrency, expiration, failure and cancellation cases.                             |
| PERF-03  | Bound native storage startup, preserve write ordering and avoid late reads overwriting newer edits. Reduce unnecessary resize work.                                                                                        | Native-bridge stall and concurrent-write regression cases; normal UI tests.                     |
| CLEAN-03 | Validate public assets against source and live public-content URLs, deduplicate unused variants, optimize source images once and stop repeated build-time recompression.                                                   | Asset reference checks, size/build comparisons and real production headers/rendering.           |
| PERF-04  | Review live query/index and RLS cost; add changes only where actual tables/queries support them. Keep owner authorization and records intact.                                                                              | Database metadata, migration contract, rolled-back checks and advisers.                         |
| CLEAN-04 | Add repository/build guards, update developer docs and release evidence, then commit/push/deploy.                                                                                                                          | Full quality gates on the exact release SHA and production smoke.                               |
| CLEAN-05 | Remove unused local declarations, redundant calculations, obsolete handlers and unused subscriptions; format touched source consistently.                                                                                  | Enforce `noUnusedLocals` in the production TypeScript build; full unit/browser gates.           |
| PERF-05  | Keep initial landing text visible, remove unused recurring updates, improve mobile readability/zoom and defer optional tracking until consent.                                                                             | Mobile Chromium/WebKit checks, consent regressions and compressed-build Lighthouse measurement. |

## Safety and measurement

- Generated local reports are copied to the task's external evidence directory before removing their tracked copies.
- Source removal is based on imports, routes, tests and operational references. Native package registrations and migration prerequisites count as references.
- Public images can be referenced by database content; those URLs are checked before removal. SEO and discovery files remain supported.
- No saved patient records, payments, original medical files or historical database migrations are deleted.
- Smaller downloads, less repeated work and bounded failure handling are measurable. Universal glitch-free operation, medical accuracy and acceptance on every phone are not claims of this cleanup.

## Implemented changes

- Removed **814 obsolete files**, including 559 root patch scripts, 135 archived patch/debug scripts, scratch copies/payloads/logs/PDF audits, tracked `dist`/test reports, unreachable retired screens/services and unused asset variants. Historical content remains recoverable from Git; local reports were backed up externally.
- Moved 30 Gut component/style files into `src/features/gut-health/components`, consolidated the action-island store under `src/stores`, moved the tested legacy migration preview into `scripts/lib`, and organized Gut/release documents under `docs`.
- Cleaned imports in 230 frontend files, removed two retired local components and an unused functional-range helper/test block. Active source-grounded clinical tests remain.
- Deferred public/auth/admin/shell/onboarding screen entry points and heavy dashboard dialogs; deferred the progress archive's 3D module. Removed the PDF manual chunk that made export dependencies part of startup.
- Tools that previously stayed mounted now initialize on first opening and retain their draft state while closed. A closing focus trap preserves focus if the person has already selected another field; a regression test failed before the fix. Ava's context preview now has an explicit accessible dialog identity.
- Added a bounded public catalog cache with independent expiration, shared requests, retry after failure, consumer cancellation and invalidation after confirmed CMS writes. It stores no account health records.
- Catalog request deadlines use `AbortController` and clear their timers after completion, including in environments without `AbortSignal.timeout`.
- Bounded the entire native Preferences restore, including value reads, to two seconds with at most eight concurrent reads. Late reads cannot overwrite newer edits or revive cleared values. Native clear/set/remove operations now share one ordered queue. Apply the saved theme after restoration.
- Responsive hooks observe breakpoint changes instead of every browser resize; older environments retain a resize fallback.
- The medication panel renders directly at its final position. Three hosted WebKit runs exposed dose-button instability in the translated, scrolling panel; shortening its entrance animation and adding a native-editor Tab step did not eliminate the retry. A retained first-failure trace narrowed the investigation to the animated container, so that translation and its unused exit wrapper were removed, and the Tab workaround was reverted. Controlled-midnight fixtures now toggle individual doses while animation timers are paused. All 24 local Chromium/WebKit daily-tracker checks pass. CI preserves first-failure traces and browser reports for seven days outside Git. See [Playwright traces](https://playwright.dev/docs/trace-viewer) and [workflow artifacts](https://docs.github.com/actions/configuring-and-managing-workflows/persisting-workflow-data-using-artifacts). Exact-release hosted results are recorded externally.
- Reused the 36 optimized image files from the prior production build in source, saving **14,582,869 bytes** without introducing another recompression generation. Removed the automatic image optimizer and its unused development dependencies. Bundle visualization runs only when requested and is outside `dist`.
- Refreshed generated Capacitor configuration from the current source and fixed Windows-only Swift package path separators. CI builds and generates both platform copies before the native configuration regression checks, which also cover portable package paths. Generated assets/configuration remain ignored. Signed builds are still a separate gate.
- Added repository hygiene and emitted-manifest startup-size gates to CI/build. Rewrote the inaccurate placeholder README/architecture guide and ignored CLI/build caches.
- Updated vulnerable build/test dependencies within their supported release ranges. The native Xcode helper uses a scoped `uuid` 11.1.1 override: it preserves CommonJS support and the helper's `v4` API while including the [upstream security fix](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq). A regression check parses the real iOS project, generates an identifier and serializes it without modifying the file. CI now audits development dependencies as well as application dependencies.
- Removed unused locals, stale Ava prompt builders, redundant meal reductions, unused hashes and a background case-history subscription whose results were never rendered. Required model requests, payment handling, storage writes and API idempotency keys remain covered by their existing tests. The TypeScript build now rejects unused local declarations, and touched source is formatted consistently.
- Landing text renders without an entrance delay. Removed an unused recurring update and limited an offscreen SVG animation to its visible period. Improved text contrast, heading order, minimum label size, mobile tag wrapping and browser zoom. Reduced-motion overrides follow the default animation rules; the regression failed before that ordering correction. The stopped showcase remains keyboard-focusable and manually scrollable, with duplicate loop cards hidden. Both browser engines verify that later cards remain reachable. A trial rendering shortcut was removed after it interfered with scrolling.
- Analytics and Ads share one SDK loaded after optional consent; purchase conversion dispatch also requires consent. Accepted conversions retain their existing destination and values. Browser tests check both acceptance and decline paths. See [Google tag configuration](https://developers.google.com/tag-platform/gtagjs/configure).
- Lighthouse now serves the built application with text compression using a small local audit server. Measurements from this harness must not be presented as a direct speed comparison with the old uncompressed static-server results. Accessibility, best-practices and SEO now require scores of at least 90; mobile performance's 90 target remains a warning.
- After repeated Ubuntu mirror delays during browser installation, the quality job uses the official Playwright image matching the locked version, pinned by digest. A preflight verifies both Chromium/WebKit executables, so a future package/image mismatch fails before the full suite. This removes the separate system-package installation step. Guidance: [Playwright container CI](https://playwright.dev/docs/ci#via-containers).

## Measured results

| Measurement                                |            Before |             After |
| ------------------------------------------ | ----------------: | ----------------: |
| Initial static JavaScript                  |   2,173,698 bytes |     854,127 bytes |
| Initial static JavaScript, gzip comparison |     628,631 bytes |     253,708 bytes |
| Dashboard screen JavaScript chunk          |     500,023 bytes |      92,939 bytes |
| Built deployment files                     | 273,725,683 bytes | 252,905,607 bytes |
| Repository working files                   |             1,565 |               767 |

The initial JavaScript graph is **60.7% smaller** (59.6% for the gzip comparison). The dashboard chunk is **81.4% smaller**. These measure emitted bytes; route-specific requests, network/device conditions and provider response time also affect what users experience. The used audio library remains the largest part of the deployed/native asset footprint and was retained.

The final local compressed-build Lighthouse run scored **65 performance, 100 accessibility, 100 best-practices and 100 SEO**. Simulated mobile LCP was 5.8 seconds and total blocking time 430 ms. These identify remaining loading work, particularly render delay and style/layout cost; smaller bundles do not establish instant loading on a slow phone. The hosted exact-release report remains the CI measurement.

### Database efficiency

Migration `20261001173602_app_query_efficiency.sql` was applied to project `cikikocfvfshloqwnyfe` as live version `20261001175331`.

- Thirteen existing owner policies now calculate request identity once per statement, with their operations/roles/ownership meaning preserved.
- Nine missing indexes cover health/content foreign-key joins and the owner/photo-date read. No existing index or record was dropped.
- The live schema verifier and new rolled-back owner/foreign case-event checks passed. Follow-up confirmed zero remaining synthetic users.
- Fresh performance advisers show **zero Auth initPlan warnings**, down from 13, and 13 unindexed foreign keys, down from 22. The remaining unindexed relations belong to the unrelated `growth_*` subsystem. Low-use index warnings remain; recent low activity is insufficient evidence to delete protective indexes.
- No measured production latency improvement is claimed for tables with little current traffic. Guidance: [Supabase RLS performance](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations), [foreign-key index adviser](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

## Verification and acceptance limits

Final local unit suite: **801 passed, 1 skipped**. The skip is the opt-in live-model suite. The browser sweeps exposed frozen-clock initialization and short journey deadlines, then a closing-dialog focus race; the corrected Ava and daily-tracker suites passed all 38 Chromium/WebKit checks. The case/Ava/clinical journey waits for the saved screen before its next navigation and passed six repeated Chromium/WebKit runs without retries. A hosted archive/export journey exposed the same premature-navigation pattern in another fixture; it now waits for the saved case screen and uses the app's navigation links. All six repeated Chromium/WebKit archive journeys passed without retries, preserving export, hydration, original-file and logout assertions. Four new mobile Chromium/WebKit checks verify visible initial text, zoom, rendered cards/fallback images, deep scrolling, no horizontal overflow and optional tracking consent. Exact-release full browser, build, migration/repository, lint, dependency and production results are recorded in the task's external release evidence and [GitHub Actions](https://github.com/AdityajhajhariaJu/HealthChain/actions). The complete application/development dependency audit reports zero vulnerabilities after a clean install.

Device restore fallback retains native data for later recovery if the bridge misses the deadline; signed phone recovery still needs acceptance. Native sign-in/provider setup, physical notification delivery, two-device convergence, remaining legacy AI semantic contracts and clinical/nutrition review remain as described in the [functional audit](WHOLE-APP-FUNCTIONAL-AUDIT.md). Cleanup does not turn those into completed acceptance claims.

## Second cleanup pass — 2 October 2026

This pass starts from commit `3e6b84f5`, after the earlier cleanup above. Its measurements and removals are separate from the 814 files removed in that earlier release.

### Structure and dependency cleanup

- Split the model service into transport, consultation, collaboration, investigation, diet, vision, Gut and shared safety/cache modules under `src/services/ai`. The small `geminiService.ts` compatibility API preserves existing callers, operation identifiers, prompts and payment/request contracts.
- Moved account bootstrap, recovery and conflict UI out of the route root into `features/account`. The public route loads only auth detection until an account, guest workspace or pending erasure receipt needs recovery.
- Separated public landing scenario data from case construction and clinical comparison. Workspace code loads on launch; fixed 900/600 ms navigation delays are removed, duplicate launch clicks are guarded, and failed loads expose a retry message.
- Extracted shared diet workspace initialization into `dietWorkspace.ts`, removing the components-to-page import cycle and unused presets. Moved meditation rendering into `features/calm` and garden state into a focused service, retaining compatibility exports.
- Removed the unused analytics provider and six unused dependencies: five Capacitor plugins (camera, filesystem, share, status bar and toast) and `eslint-plugin-prettier`. Refreshed native plugin registrations and kept portable Swift paths. Ava loads its React Query provider with its route.
- Rechecked the tracked source import graph. All production implementation modules remain reachable; the standalone Vite declaration file is expected. Referenced media, original health records and all 42 migration files are retained.

### Runtime efficiency and glitches

- Added TypeScript/TSX Hook-order linting. Fixed conditional Hooks in the connection map, conflict dialog and report template, with data/open-state transition regressions.
- Auth events bootstrap once per account/profile generation. Deferred network work stays outside Supabase's serialized auth callback, hidden-page wake events skip session work, and switching accounts cannot inherit the prior account's display name.
- Browser reconnect, Capacitor network and native resume requests share a coalesced recovery worker. Native recovery does not depend on a WebView emitting the browser's `online` event. Tracker projection events also coalesce rather than queue repeated full-history scans. Changed observations still trigger a fresh pass, and failed work can retry.
- Daily tracker projections group history by date in one pass and write/emit only actual changes. Hydration synchronization and case revision comparison use indexed lookups. Tombstones, exact quantities and recorded occurrence times remain covered by the existing ledger tests.
- Model result caches retain at most 16 entries per operation and isolate account/profile generations. Logout clears temporary results; durable review history stays in its repositories.
- The shared model deadline and caller cancellation stay active through the entire response body, and account ownership is rechecked after body delivery. Successful headers alone cannot end the deadline. Stream regressions verify stalled bodies, caller cancellation and account changes; the existing request/recovery tests retain idempotency and terminal-failure behavior.
- Explicit guest requests skip account-session lookup, including automatic refresh after a 401 response. An account lookup cannot contribute an authorization token to these requests and could stall scans while WebKit restores account storage. Fresh request identifiers use synchronous random generation instead of hashing entire photo payloads; caller-provided recovery/idempotency identifiers still survive retries unchanged. Stalled-session/crypto and unauthorized-response regressions, plus 15 repeated WebKit scanner checks, verify this path.
- Decorative meditation loops stop when paused, hidden or reduced motion is requested. Crossfade timers are cancelled on close, pause, mute and content changes; Media Session seeking accepts zero. Reconnection UI cancels old timers and avoids claiming a completed sync before recovery finishes.
- Shared sensitive API CORS keeps its exact-origin policy. Trial searches reject deceptive host suffixes, unsupported methods and oversized conditions, cap provider results at 50, and retain the deadline through response-body reading.
- Recursive syntax validation now covers nested endpoints and operational JavaScript. Build guards protect startup and the entire public landing static import graph.

### Measurements for this pass

| Measurement                                   | Start of this pass |         After |
| --------------------------------------------- | -----------------: | ------------: |
| Startup JavaScript                            |      854,127 bytes | 662,225 bytes |
| Startup JavaScript, gzip                      |      253,708 bytes | 196,256 bytes |
| Public landing including shared startup, gzip |                  — | 222,110 bytes |

Startup JavaScript fell by **22.5%**, or **22.6%** using gzip. Landing's complete static graph is 734,689 raw bytes across 16 assets; account workers, clinical repositories, charts, 3D and PDF code remain deferred. Budget limits leave modest room for routine additions and reject their return to public startup.

The current local Lighthouse 11.4 compressed-build audit scores **53 performance and 100 each for accessibility, best practices and SEO**, with simulated mobile LCP 10.2 seconds and blocking time 210 ms. It remains below the mobile performance target. Smaller emitted bundles and fewer background scans establish less download/work; they do not establish instant paint on a slow phone. Optional font display keeps system text when a font arrives late, following [Chrome's font loading guidance](https://web.dev/learn/performance/optimize-web-fonts). Signed devices, live model quality, physical notifications and payment-provider acceptance retain their separate gates.

### Verification for this pass

- Production TypeScript/build and both JavaScript budget gates pass. ESLint, repository hygiene, recursive JavaScript syntax and all 42 migration files/27 schema checks pass.
- The complete unit suite passes **827 tests**, with the existing opt-in live-model suite skipped. New regressions cover Hook transitions, coalesced recovery, native reconnect events, public account-runtime deferral, scoped model caches, stalled response bodies and unauthorized guest responses.
- The complete Chromium/WebKit browser sweep passes **198 checks without retries**, including daily boundaries, deletion, owner isolation, clinical review, diet/Gut records and archive/export workflows.
- Both browser engines pass **14 built-asset journeys**, including the public landing, authentication boundary, guest assessment, case save and Ava reply/reload. Fifteen repeated WebKit scanner checks pass without retries after the guest transport correction.
- After the guest 401 correction, the fresh build and complete unit suite pass again, followed by all 14 production journeys and **24 affected Ava/scanner browser checks**. Guest success, error, cancellation and account-change behavior remain covered.
- The read-only Supabase smoke check passes for 18 required relations and confirms protected account tables reject anonymous access. This pass adds no migrations and deletes no database records.
- The full application/development dependency audit reports **zero vulnerabilities**. Capacitor synchronization and refreshed Android/iOS web copies pass with the ten used native plugins; signed builds and physical-device acceptance are separate checks.

## Whole-app source cleanup — 2 October 2026

This pass starts from `fa3c77a5`, after the six-screen Clinical intake and visible Clinical/Gut outcome work. It audits the whole source tree, including server/shared code, tests, scripts, import paths and dynamic identifiers. The figures below describe this pass only.

### Removals and ownership

- Removed **91 unreferenced exported declarations**, covering **2,751 declaration lines** before formatting, plus their orphaned local helpers and unused argument/prop plumbing. These include unmounted illustrative biomarker/food catalogs, duplicate case/preparation adapters, dead profile operations and unused analytics/haptic/storage wrappers. They had no callers in source, tests, API/server code, scripts, configuration or documentation. Referenced health records, native source, provider handlers, assets and migrations remain.
- Removed **121 unreachable landing CSS rules** (13,649 source bytes before formatting). The CSS module is used only by the landing page; selectors were checked against its static class accesses and its state classes, including print/reduced-motion rules.
- Moved profile completion/banner components to `features/profile/components`, the meditation player to `features/calm`, and a test-only architecture fixture to `services/testFixtures`. Imports point to their owners without duplicate compatibility implementations.
- Extracted Clinical symptom/theme/step data to `clinicalIntakeCatalog.ts` and the symptom badge to its own component. Alias lookup is indexed, normalized and reused; symptom search computes one filtered list per query/category change.
- Extracted Ava's cancellable typewriter, shared the mounted-state lifecycle hook, and lifted the diet progress renderer out of its parent. Formatted changed modules and organized imports. TypeScript now rejects unused parameters as well as unused locals.

### Runtime corrections

- Strict Mode effect replay no longer leaves Diet, differential review or appointment-guide requests permanently unable to clear their busy state. Replacement Ava messages cancel the previous typing loop; toast timers are bounded, dismissed and cancelled on unmount.
- The appointment discussion guide no longer reuses an unscoped session-storage answer. Its bounded model cache includes the full action, profile and account generation. The prompt reads the actual demographic/condition/medicine/allergy schema and treats empty lists as missing supplied entries.
- Semantic evidence nodes open the exact original case/record/finding/page/passage through an accessible source action. Decoupling an edge affects the displayed case even if another case is active. Decorative cards no longer trigger state changes with no visible result.
- Auth detection, analytics session lookup and native auth exchange load the auth singleton asynchronously. Public rendering and consent controls are usable while that chunk is delayed; cleanup prevents orphan subscriptions. Durable initial-session recovery and consent rechecks are retained.
- Simple shell animations use CSS; the landing uses [Motion's slim elements and LazyMotion](https://motion.dev/docs/react-reduce-bundle-size), with the optional animation renderer loaded asynchronously. Content starts visible; consent and launch controls remain usable if animation features cannot load. Fifteen public-screen icons share one chunk, reducing tiny parallel requests while feature libraries remain deferred. This uses the installed Vite 6/Rollup output API; no dependency upgrade is part of this pass.

### Emitted JavaScript measurements

| Static import graph                    |        Before |         After | Reduction |
| -------------------------------------- | ------------: | ------------: | --------: |
| Startup, raw                           | 662,322 bytes | 301,976 bytes |     54.4% |
| Startup, gzip                          | 196,294 bytes |  97,493 bytes |     50.3% |
| Public landing including startup, raw  | 734,786 bytes | 415,794 bytes |     43.4% |
| Public landing including startup, gzip | 222,147 bytes | 137,117 bytes |     38.3% |

Startup uses three assets and the complete static public graph nine, down from sixteen for the public graph before icon grouping. These are emitted JavaScript bytes, not all eventual downloads: session detection still loads auth after mount and optional animation features load separately. Budget gates cap startup at 350,000 raw/110,000 gzip and the public graph at 450,000 raw/149,000 gzip bytes, and reject an eager auth client, animation renderer or feature engine.

Runtime import resolution reports no missing local imports. Seven modules outside the browser runtime are deliberately retained: three type/test-contract modules and four server-only shared validators. Browser graph exclusion alone is not grounds to delete server or test code.

### Verification and limits

- Production TypeScript/build, both tightened JavaScript budgets, ESLint, repository hygiene, recursive syntax and import resolution pass. The runtime graph contains 319 implementation candidates, with 312 browser-reachable modules and no missing local imports. All 42 migration files and 27 schema checks pass; this pass changes no migrations or database records.
- The complete unit run passes **876 tests**, with two existing opt-in live-model tests skipped. After the final optional-animation loading change, all seven affected landing/account-runtime regressions pass again. Added cases exercise Strict Mode request completion, typing cancellation, bounded toast timers, exact source navigation, cross-case edge changes and profile/account-scoped appointment guides.
- The complete source browser run finishes with **209 of 214 checks passing**. Five Windows WebKit scenarios exceed their original deadlines; their saved page states show the expected controls/results. Their deadlines were adjusted, and all **ten targeted Chromium/WebKit checks pass without retries**. Instrumented WebKit durations range from 4.7 to 42.5 seconds; assertions, controls and persistence checks remain intact. This is a full run plus a targeted follow-up, not a claim of one all-green 214-check run.
- All **28 built-asset Chromium/WebKit journeys pass without retries**, including the six-screen intake with original-document/draft persistence, complete Gut answers, auth boundaries and consent. The first production run exposed an outdated manifest-key fixture and a premature navigation during the legacy Cases redirect; both fixtures now wait for the actual emitted dependency/destination. After strengthening the optional-animation check to await a real failed request, all **six affected production checks pass again without retries**. Controlled provider responses validate runtime behavior; live clinical quality remains a separate gate.
- The full application/development dependency audit reports **zero vulnerabilities**. The latest built web assets copy successfully to both Android and iOS; copying assets does not verify a signed physical-device build.

The same compressed-build Lighthouse 11.4 harness scores **57 performance, 100 accessibility, 100 best practices and 100 SEO**, compared with 53 performance at the start of this pass. Simulated mobile FCP changes from 7.73 to 6.84 seconds, LCP from 10.06 to **9.01 seconds**, and total blocking time from 206.5 to **26.5 ms**; cumulative layout shift is zero. The headline remains the largest contentful paint element. These local measurements show smaller downloads and less blocking, while mobile paint still falls short of the performance target. Large deferred PDF/3D chunks still produce the existing build warnings.

Signed phones, real payment/provider flows, multi-device convergence and qualified clinical/nutrition validation retain their separate acceptance gates in the functional audit; source cleanup cannot establish universal correctness or universally satisfactory clinical answers.

## Re-audit and feature ownership — 2–3 October 2026

This pass starts from `cdeea99d`, after the whole-app source cleanup above. These figures describe this additional pass only.

### Source organization and user-facing corrections

- Moved 21 feature components and one test from shared UI to their owners under account, auth, consultation, dashboard, Clinical, diet and profile. Updated imports, dynamic loads, mocks and browser module paths. The 21 moved files other than the intentionally revised example dialog, plus nine existing pages/tests with updated imports, retain equivalent emitted program structure after normalizing imports, parentheses and adjacent JSX text: 30 checked, 30 equivalent.
- Split the roughly 1,500-line landing page into a 244-line controller, focused sections, pure content and callback types. The controller retains session restoration, owner/guest launch checks, duplicate-launch protection and load failures; sections own input/disclosure state. Changed source is formatted and its imports organized.
- Removed public JavaScript animation wrappers and the obsolete optional renderer loader. Public rendering uses CSS; an actual Rollup static-module graph guard rejects animation runtimes. Feature/dialog animation code remains deferred.
- The six overview cards render once in a responsive grid with normal page scrolling. Images have dimensions, deferred decoding/loading and bounded fallback. The FAQ has connected accessible names and state. Mobile title/body text is readable without horizontal overflow.
- The example dialog has a name, focus containment, Escape, return focus, a named 44-pixel close button and responsive evidence columns. Launching an illustrative case closes the dialog so the loading indicator and failures stay visible. Example cases remain explicitly labelled. Evidence, uncertainty, visit-question and launch wording now describes the action/data more directly, and an unmeasured completion-time claim is removed.
- Demo media uses native playback controls and a retryable error state. Removed the timer and unused input ref. The landing CSS audit checks all nine consumers and finds 172 referenced classes with zero unreachable rules.
- The full browser sweep exposes a Gut save/navigation race. Capture controls and page/history navigation now stay disabled until saving settles, with a visible saving status. Failed writes preserve entry text and reenable controls. Shared focus handling skips controls disabled by a fieldset; save/failure and keyboard regressions cover these boundaries. The scanner fixture preserves its incomplete-output rejection and waits up to 15 seconds for asynchronous analysis. Formatting the Gut stylesheet preserves all 171 original rules/declarations and adds two busy-control rules.

### Measurements

| Static import graph                    |        Before |   Final build |
| -------------------------------------- | ------------: | ------------: |
| Startup, raw                           | 301,976 bytes | 301,757 bytes |
| Startup, gzip                          |  97,493 bytes |  97,451 bytes |
| Public landing including startup, raw  | 415,794 bytes | 366,298 bytes |
| Public landing including startup, gzip | 137,117 bytes | 119,442 bytes |

Public JavaScript decreases **11.9% raw / 12.9% gzip** and uses seven static assets instead of nine. Startup is essentially unchanged. The public budget is tightened to 390,000 raw/129,000 gzip bytes; startup retains its 350,000/110,000 limits. Auth detection and feature loads still occur after public rendering.

The last landing audit on the compressed server with Lighthouse 11.4 scores **55 performance, 100 accessibility, 100 best practices and 100 SEO**, versus 60 performance in the baseline sample. FCP is 5.95 seconds versus 5.50, LCP 8.14 seconds versus 9.07, blocking time 244 ms versus 6, and layout shift zero. Earlier post-restructuring samples score 58 and 57, with LCP 7.87–8.00 seconds and blocking 211–232 ms. The download reduction is established; a uniform speed improvement is not. Mobile rendering/blocking performance remains below target and the final performance score regresses. Existing deferred PDF/3D warnings remain.

An offscreen CSS rendering experiment following [Chrome's content-visibility guidance](https://web.dev/articles/content-visibility) reduces blocking to 140.5 ms but exposes three WebKit deep-scroll/example-navigation failures. It is removed before the final build; its retained measurements are not delivered-source results. Correct navigation takes precedence over the isolated lab gain.

### Verification and limits

- Complete final unit suite: **880 passed**, with two existing opt-in live-model tests skipped, across 145 files. All **19 affected landing/media/workflow tests pass** after the final dialog change, and the new save/focus regressions pass.
- Final built-asset Chromium/WebKit journeys: **32 passed without retries**. They cover the six-screen Clinical draft/original attachment/reload, complete Gut answers and offline recovery, consent, protected routes, guest scope, dialog keyboard operation and visible launch feedback, case saving and Ava reply/reload.
- Complete source browser sweep: **212 of 214 passed**. The corrected Gut save transition passes in the affected follow-up, which finishes **57 of 58**; the remaining WebKit scanner test still fails its 15-second completion deadline in that long run. Subsequent scanner diagnostics pass three times, the original incomplete-output test passes five consecutive times, and the complete scanner suite passes **20 of 20** across Chromium/WebKit without retries. No scanner runtime change is made: the cause of the intermittent long-run failure is not established. The original failure evidence is retained. These results are a broad sweep plus affected follow-ups, not one all-green 214-check run.
- TypeScript/build, tightened budgets, static animation boundary, ESLint, repository hygiene and recursive syntax checks pass. Syntax covers 39 API/server/shared/operational files. Runtime import resolution reports 329 implementation candidates, 321 browser-reachable modules and no missing local imports; eight type/test/server contract modules are deliberately retained.
- All 42 migration files/27 schema checks pass. This pass changes no database schema or health records. The fresh application/development dependency audit reports **zero vulnerabilities** after a transient registry DNS failure is retried successfully.
- Final assets copy successfully to Android and iOS. Layout checks at 320, 390 and 1280 pixels report no horizontal overflow or uncaught page errors, and both dialog views fit their width.

The external re-audit report retains logs, measurements, moved-file inventory and screenshots. Signed devices, real providers/payments, multi-device convergence and qualified clinical/nutrition review keep their existing acceptance gates. Browser fixtures verify application behavior with controlled responses; they do not establish universal medical correctness.

## Cozy island and unified rewards — 3 October 2026

Zen Garden now uses a procedural floating island, with a live SVG dashboard preview and a deferred 3D scene. Meadow, Blossom and Golden dusk are persisted across both views. Flower beds, pond/bridge/bench, pavilion/greenhouse/lanterns and orchard/windmill unlock across participation days. The [island architecture and policy](GAMIFICATION-ISLAND.md) describe the modules, migration, tracking coverage and pacing examples.

The authoritative `profile.gamification` receipt ledger supplies points, trophies and growth. The first three distinct categories give 3/2/1 growth and 5 points each: at most 6 growth and 15 points/day. Raw frontend API traffic is tracked as bounded operational metadata and earns nothing. Canonical record saves, Gut actions and explicit Ava saves connect to the hub. Legacy reward amounts no longer control awards; outdated point promises are removed. Existing balances, legitimate stages and imported trophies migrate without converting points into garden growth. Game writes retain demographic timestamps and avoid clinical-memory/undo entries; undoing a profile edit keeps earned progress.

Unchanged projections and trophies are cached until the ledger or calendar day changes. Reward receipts merge by immutable IDs before daily caps are calculated; generic clinical-field merging excludes that specialized ledger. Named timezone/DST, simultaneous/offline events, storage failure, owner switches, older-source duplicate replay and midnight refresh have focused regressions.

Final release verification:

- **902 unit tests passed**, two existing opt-in live-model tests skipped, across 149 files.
- **44 built-asset browser journeys passed** across Chromium and WebKit without retries. These include 12 island checks for lazy loading, theme/receipt persistence, connected points/trophies, 320px controls/focus, WebGL fallback, API traffic and real water → Gut question → tending progression. The existing six-screen Clinical, Gut reasoning, consent/auth and case/Ava production flows also pass.
- **44 affected source browser journeys passed** across Chromium and WebKit without retries: Ava transcripts/reviewed saves, Gut linked records, profile conflict handling and daily tracker/reminder/account/midnight behavior. Together with the built suite, 88 browser checks pass on the final application source.
- TypeScript/build, ESLint, repository hygiene, recursive JavaScript syntax and all 42 migration files/27 schema checks pass. No database schema or dependency change is required. The final generated assets copy to Android and iOS.
- Startup JavaScript is **305,120 raw / 98,780 gzip bytes**; the public landing is **369,661 / 120,768** across seven assets. The telemetry module adds approximately 3.4 KB raw/1.3 KB gzip to the prior public graph. Budget guards pass; the 3D renderer is absent before the garden is opened. Existing large deferred Three.js/PDF chunk warnings remain.
- Visual inspection covers starter/pond/haven stages at 1280 and 390 pixels; the 320px browser journey checks overflow and keyboard behavior. No uncaught page errors or garden overflow appear in the visual captures. Instrumented WebGL captures for all three stages report zero draw calls during one-second reduced-motion and offscreen windows; this is a rendering-behavior check, not a universal device FPS benchmark.

The external report retains release logs and preview/full-garden images. Actual account synchronization on two signed devices, native GPU/battery behavior and longer-term user pacing remain acceptance work. Controlled browser fixtures do not establish clinical correctness or actual live-provider behavior.

## Restore the original garden presentation — 3 October 2026

The island release changed surrounding screens beyond the requested scope. This correction restores the pre-island pink/white garden card, Water Garden/How It Grows controls, soundscape button, Sanctuary Metrics, vitality bar, blooms, days tended and streak card. The dashboard keeps the original arch, Zen Sanctuary pill and Grow your own garden subtitle. The added growth summary, unlock card, recent-contribution panel and shortcut list are removed. The points modal and eight-card Trophy Cabinet recover their earlier presentation and vocabulary; award amounts still follow the shared capped engine.

The hub now retains the original garden counter baseline and repairs the first island release's missing baseline from the owner/profile legacy key. Watering and calm counters derive from distinct receipt dates, preventing simultaneous devices from duplicating a daily bloom. Existing points history and streak evidence remain visible. Three consecutive record dates earn the original check-in milestone permanently; nonconsecutive island participation continues to unlock scenery without decay.

Island-only visual work adds warmer lighting, varied foliage, instanced planting, a detailed cottage, pond/duck, bridge, greenhouse, pavilion, windmill and ambient life. Animation stops offscreen, in hidden tabs and for reduced motion. The renderer schedules completed frames instead of accumulating interval-driven work, and measures presentation delay as well as GPU submission. Sustained slow frames select the lightweight island illustration for the remainder of the page session. The garden entrance and points modal keep stable control positions.

Executed verification:

- Complete unit suite: **907 passed**, two existing opt-in live-model tests skipped, across 149 files. An initial unrestricted worker run hit a timeout and was stopped; the complete final run uses two workers.
- Final built garden suite: **18 Chromium/WebKit checks passed without retries**. It covers the original labels/layout, lazy 3D, tending, reload/theme/history persistence, mature trophies, 320px controls and focus, missing WebGL, deliberately slow graphics, legacy counters/streaks, soundscape navigation, unrewarded API traffic and connected water/Gut/garden rewards.
- Earlier WebKit attempts exceeded overall deadlines in long reopen/history journeys. Presentation-delay detection and stable modal geometry address the rendering/input issue. The two long multi-feature journeys and deliberately stalled-driver journey have a 60-second overall budget; the slow-driver fallback remains bounded to 15 seconds. Failure snapshots/traces are retained in the external work folder. The fallback assertion now selects the actual visible SVG rather than Canvas's embedded fallback content.
- TypeScript/build, ESLint, repository hygiene, recursive JavaScript syntax and build budgets pass. Startup is **305,094 raw / 98,780 gzip bytes**; the public graph is **369,635 / 120,766** across seven assets. Existing deferred Three.js/PDF size warnings remain. No dependency or database-schema change is made. Incidental formatting in the shared modal is removed after browser verification; its emitted program structure remains equivalent after normalizing parentheses and adjacent JSX text. The final source is rebuilt and its assets recopied.
- Final static 3D captures cover starter, pond and haven stages at 1280/390px. Each retains an actual canvas, has no horizontal overflow or uncaught page errors, and records zero draw calls in independent one-second reduced-motion and offscreen windows. These are behavior checks, not a universal FPS claim. Final assets copy successfully to Android and iOS.

Changes to the island or reward engine must preserve the surrounding layout, wording, metrics and streaks unless the user explicitly requests another redesign. Signed-device performance and real multi-device synchronization remain outside these local fixture checks.
