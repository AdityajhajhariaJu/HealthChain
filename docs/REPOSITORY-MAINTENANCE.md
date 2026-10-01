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
- Reused the 36 optimized image files from the prior production build in source, saving **14,582,869 bytes** without introducing another recompression generation. Removed the automatic image optimizer and its unused development dependencies. Bundle visualization runs only when requested and is outside `dist`.
- Refreshed generated Capacitor configuration from the current source and fixed Windows-only Swift package path separators. CI builds and generates both platform copies before the native configuration regression checks, which also cover portable package paths. Generated assets/configuration remain ignored. Signed builds are still a separate gate.
- Added repository hygiene and emitted-manifest startup-size gates to CI/build. Rewrote the inaccurate placeholder README/architecture guide and ignored CLI/build caches.
- Updated vulnerable build/test dependencies within their supported release ranges. The native Xcode helper uses a scoped `uuid` 11.1.1 override: it preserves CommonJS support and the helper's `v4` API while including the [upstream security fix](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq). A regression check parses the real iOS project, generates an identifier and serializes it without modifying the file. CI now audits development dependencies as well as application dependencies.
- Removed unused locals, stale Ava prompt builders, redundant meal reductions, unused hashes and a background case-history subscription whose results were never rendered. Required model requests, payment handling, storage writes and API idempotency keys remain covered by their existing tests. The TypeScript build now rejects unused local declarations, and touched source is formatted consistently.
- Landing text renders without an entrance delay. Removed an unused recurring update and limited an offscreen SVG animation to its visible period. Improved text contrast, heading order, minimum label size, mobile tag wrapping and browser zoom. Reduced-motion preferences stop decorative looping animations. A trial rendering shortcut was removed after it interfered with scrolling.
- Analytics and Ads share one SDK loaded after optional consent; purchase conversion dispatch also requires consent. Accepted conversions retain their existing destination and values. Browser tests check both acceptance and decline paths. See [Google tag configuration](https://developers.google.com/tag-platform/gtagjs/configure).
- Lighthouse now serves the built application with text compression using a small local audit server. Measurements from this harness must not be presented as a direct speed comparison with the old uncompressed static-server results. Accessibility, best-practices and SEO now require scores of at least 90; mobile performance's 90 target remains a warning.
- After repeated Ubuntu mirror delays during browser installation, the quality job uses the official Playwright image matching the locked version, pinned by digest. A preflight verifies both Chromium/WebKit executables, so a future package/image mismatch fails before the full suite. This removes the separate system-package installation step. Guidance: [Playwright container CI](https://playwright.dev/docs/ci#via-containers).

## Measured results

| Measurement | Before | After |
|---|---:|---:|
| Initial static JavaScript | 2,173,698 bytes | 854,100 bytes |
| Initial static JavaScript, gzip comparison | 628,631 bytes | 253,707 bytes |
| Dashboard screen JavaScript chunk | 500,023 bytes | 92,939 bytes |
| Built deployment files | 273,725,683 bytes | 252,905,288 bytes |
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

Final local unit suite: **801 passed, 1 skipped**. The skip is the opt-in live-model suite. The browser sweeps exposed frozen-clock initialization and short journey deadlines, then a closing-dialog focus race; the corrected Ava and daily-tracker suites passed all 38 Chromium/WebKit checks. The case/Ava/clinical journey waits for the saved screen before its next navigation and passed six repeated Chromium/WebKit runs without retries. Four new mobile Chromium/WebKit checks verify visible initial text, zoom, rendered cards/fallback images, deep scrolling, no horizontal overflow and optional tracking consent. Exact-release full browser, build, migration/repository, lint, dependency and production results are recorded in the task's external release evidence and [GitHub Actions](https://github.com/AdityajhajhariaJu/HealthChain/actions). The complete application/development dependency audit reports zero vulnerabilities after a clean install.

Device restore fallback retains native data for later recovery if the bridge misses the deadline; signed phone recovery still needs acceptance. Native sign-in/provider setup, physical notification delivery, two-device convergence, remaining legacy AI semantic contracts and clinical/nutrition review remain as described in the [functional audit](WHOLE-APP-FUNCTIONAL-AUDIT.md). Cleanup does not turn those into completed acceptance claims.
