# Repository cleanup and performance work

Started: 1 October 2026, from `fe67f827` on `master`.

## Implementation sequence

| Ticket | Work | Verification |
|---|---|---|
| CLEAN-01 | Inventory tracked files, module reachability, duplicate assets, package use and deployed content references. Record a production build baseline. | Saved inventory and build measurements outside the repository. |
| CLEAN-02 | Remove obsolete patch scripts, scratch files, generated reports/build output and unreachable retired components. Keep migration history, native project sources and working product flows. Organize feature documentation. | Reference scan, TypeScript/build, unit and browser gates. |
| PERF-01 | Split initial routes and defer heavy modal, chart, 3D and export code until used. Keep error and loading recovery. | Compare initial static JavaScript closure and route bundle sizes; production browser journeys. |
| PERF-02 | Deduplicate public catalog reads with independent cache expiration and explicit invalidation; prevent stale cache extension and repeated requests. | Controlled concurrency, expiration, failure and cancellation cases. |
| PERF-03 | Bound native storage startup, preserve write ordering and avoid late reads overwriting newer edits. Reduce unnecessary resize work. | Native-bridge stall and concurrent-write regression cases; normal UI tests. |
| CLEAN-03 | Validate public assets against source and live public-content URLs, deduplicate unused variants, optimize source images once and stop repeated build-time recompression. | Asset reference checks, size/build comparisons and real production headers/rendering. |
| PERF-04 | Review live query/index and RLS cost; add changes only where actual tables/queries support them. Keep owner authorization and records intact. | Database metadata, migration contract, rolled-back checks and advisers. |
| CLEAN-04 | Add repository/build guards, update developer docs and release evidence, then commit/push/deploy. | Full quality gates on the exact release SHA and production smoke. |
| CLEAN-05 | Remove unused local declarations, redundant calculations, obsolete handlers and unused subscriptions; format touched source consistently. | Enforce `noUnusedLocals` in the production TypeScript build; full unit/browser gates. |
| PERF-05 | Keep initial landing text visible, remove unused recurring updates, improve mobile readability/zoom and defer optional tracking until consent. | Mobile Chromium/WebKit checks, consent regressions and compressed-build Lighthouse measurement. |

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

| Measurement | Before | After |
|---|---:|---:|
| Initial static JavaScript | 2,173,698 bytes | 854,127 bytes |
| Initial static JavaScript, gzip comparison | 628,631 bytes | 253,708 bytes |
| Dashboard screen JavaScript chunk | 500,023 bytes | 92,939 bytes |
| Built deployment files | 273,725,683 bytes | 252,905,607 bytes |
| Repository working files | 1,565 | 767 |

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

| Measurement | Start of this pass | After |
|---|---:|---:|
| Startup JavaScript | 854,127 bytes | 662,225 bytes |
| Startup JavaScript, gzip | 253,708 bytes | 196,256 bytes |
| Public landing including shared startup, gzip | — | 222,110 bytes |

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
