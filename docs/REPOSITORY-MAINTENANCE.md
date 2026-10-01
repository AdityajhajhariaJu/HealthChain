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

## Measured results

| Measurement | Before | After |
|---|---:|---:|
| Initial static JavaScript | 2,173,698 bytes | 854,106 bytes |
| Initial static JavaScript, gzip comparison | 628,631 bytes | 253,694 bytes |
| Dashboard screen JavaScript chunk | 500,023 bytes | 92,973 bytes |
| Built deployment files | 273,725,683 bytes | 252,923,348 bytes |
| Repository working files | 1,565 | 765 |

The initial JavaScript graph is **60.7% smaller** (59.6% for the gzip comparison). The dashboard chunk is **81.4% smaller**. These measure emitted bytes; route-specific requests, network/device conditions and provider response time also affect what users experience. The used audio library remains the largest part of the deployed/native asset footprint and was retained.

### Database efficiency

Migration `20261001173602_app_query_efficiency.sql` was applied to project `cikikocfvfshloqwnyfe` as live version `20261001175331`.

- Thirteen existing owner policies now calculate request identity once per statement, with their operations/roles/ownership meaning preserved.
- Nine missing indexes cover health/content foreign-key joins and the owner/photo-date read. No existing index or record was dropped.
- The live schema verifier and new rolled-back owner/foreign case-event checks passed. Follow-up confirmed zero remaining synthetic users.
- Fresh performance advisers show **zero Auth initPlan warnings**, down from 13, and 13 unindexed foreign keys, down from 22. The remaining unindexed relations belong to the unrelated `growth_*` subsystem. Low-use index warnings remain; recent low activity is insufficient evidence to delete protective indexes.
- No measured production latency improvement is claimed for tables with little current traffic. Guidance: [Supabase RLS performance](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations), [foreign-key index adviser](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

## Verification and acceptance limits

Final local unit suite: **797 passed, 1 skipped**. The skip is the opt-in live-model suite. The browser sweeps exposed frozen-clock initialization and short journey deadlines, then a closing-dialog focus race; the corrected Ava and daily-tracker suites passed all 38 Chromium/WebKit checks. Exact-release full browser, build, migration/repository, lint, dependency and production results are recorded in the task's external release evidence and [GitHub Actions](https://github.com/AdityajhajhariaJu/HealthChain/actions). Runtime dependency audit reports zero vulnerabilities.

Device restore fallback retains native data for later recovery if the bridge misses the deadline; signed phone recovery still needs acceptance. Native sign-in/provider setup, physical notification delivery, two-device convergence, remaining legacy AI semantic contracts and clinical/nutrition review remain as described in the [functional audit](WHOLE-APP-FUNCTIONAL-AUDIT.md). Cleanup does not turn those into completed acceptance claims.
