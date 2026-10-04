# HealthChain verification record — 4 October 2026

**The reviewed preparation is not a store-ready release.** This record distinguishes completed technical checks from unresolved choices and checks requiring signed binaries, developer accounts and real devices.

## Completed checks

| Check | Observed result | Scope and limits |
|---|---|---|
| Unit suite | 944 passed, 2 skipped; 153 files passed and 2 skipped | Full collected suite. Three subsequently added AI-consent dialog tests also passed, giving 947 unique passing tests. Skipped tests are not counted as passing. |
| Focused consent/native/legal suite | 12 initially passed; final 25-test consent/native/legal/transport check passed | Three dialog tests are additional to the full collected suite. The final focused rerun verifies the withdrawal-message correction. |
| TypeScript | `npx tsc --noEmit` passed | Source type checking; also included in the successful build. |
| ESLint | `npm run lint` passed | Final source lint check. |
| Production build | `npm run build` passed | Generated policies, audio manifest, TypeScript, Vite, asset budgets and native asset preparation. |
| Startup JavaScript budget | 312,925 raw / 101,415 gzip bytes across 3 assets | Initial JavaScript assets; not total app or page-download size. |
| Public landing JavaScript budget | 377,384 raw / 123,358 gzip bytes across 7 assets | Landing assets include additional public-page code. |
| Production browser journeys | 112 passed in Chromium/WebKit; 6 privacy journeys passed again after the final rebuild | Full production suite plus a focused recheck of the withdrawal-message correction. The six repeated cases are not counted as additional unique journeys. |
| Development browser regressions | Running: all 116 Chromium tests passed; WebKit in progress | The full 232-test Chromium/WebKit suite checks existing feature and offline flows against the shared consent changes. The completed final result will replace this progress record. |
| Production dependencies | `npm audit --omit=dev --audit-level=moderate`: 0 vulnerabilities | Dependency advisories at the time of this run; not proof of absence of every security issue. |
| All dependencies | 5 high findings remain | Development-only Tailwind 3 watcher/glob chain. The audit proposes a major Tailwind migration; owner decision is pending. Existing CI audits this chain and will fail until resolved. |
| Server/shared JavaScript syntax | 48 files passed | API, server, shared and operational files, including nested endpoints. |
| Migration contract | 43 SQL files / 27 schema checks passed | Generated migration bundle and source contracts. |
| Live production schema | Full `supabase/verify_production.sql` verification passed | Read-only metadata/DO verification. No customer or health rows were inspected. This does not negate the separately identified shared-table exposure. |
| Shared rate counters | Applied; synthetic transactional checks passed | Limit, excess rejection, expiry reset and invalid-key rejection tested; test writes rolled back. Raw table access is service-only. |
| Native web asset copies | 529 files match both platforms by SHA-256; no audio bundled | Prepared web assets total 23,392,748 bytes (22.31 MiB). Signed app/install sizes include additional native binary and SDK overhead. |
| Android source permission comparison | Four health read categories retained; 45 unused SDK permission entries removed | Compared source manifests against the installed SDK. Actual Gradle merged manifest is still required. |
| iOS source configuration | Privacy plist and Xcode resource registration verified | Eleven collection categories, tracking disabled, usage strings and UserDefaults reason checked. An Xcode archive/aggregate SDK privacy report is still required. |
| Repository hygiene and whitespace | Passed | No tracked generated build/report/cache artifacts or root scratch scripts; `git diff --check` passed. |
| Launch gate | Blocked, as expected | Missing facts, owner evidence and signed artifacts are not converted into fictional passing attestations. |

The final browser journeys include explicit AI decline without a provider request, consent-before-AI behavior, regional policy navigation, script-free privacy/deletion pages, narrow layouts, keyboard/focus behavior, account boundaries, offline recovery and saved-data persistence. Browser AI replies are synthetic intercepts; these checks do not claim a paid Gemini account or exercise live personal-health processing.

The five full-audit findings trace to the development dependency `braces` through Tailwind 3's watcher/glob packages. The [reviewed upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) identifies deeply nested pattern recursion and currently lists no patched `braces` version. Registry checks found `braces` 3.0.3 and Tailwind 3.4.19 as the latest in those lines. npm proposes Tailwind 4.3.3, a major change requiring the pending migration decision and visual verification; no advisory was hidden or overridden to produce a clean report.

## Production actions and deployment boundary

The dedicated HealthChain rate-limit migration was applied to the live Supabase project and verified. A production Vercel `CRON_SECRET` was added as a secret; it was not printed or stored in this packet. Its use requires a deployment with the updated environment.

The proposed containment of the shared application's tables has **not** been applied. The exact proposal, captured grants/policies and rollback are in `review/` in the private local launch packet. The evidence is excluded from this public Git repository. Those tables require an ownership/client migration decision before access is changed.

This branch does not deploy the draft policies or change production native billing/login behavior. The original repository's `master` is the review base. The backup repository remains the frozen checkpoint with its disabled push target.

## What still prevents submission

- Real legal operator, market/age scope, governing law and provider/retention facts remain unconfirmed. Fourteen policy editions are clearly marked as drafts.
- Paid Gemini billing and processor/transfer arrangements have not been verified. Sensitive-health consent for the complete selected-market flow needs review.
- Native billing and iOS equivalent-login choices are pending. Apple/store products, credentials and receipt flows cannot be invented.
- The separate shared-application access review remains unresolved; see the private containment packet. Auth breached-password protection remains disabled; enabling the built-in paid-plan feature is an owner decision.
- Five development dependency audit findings remain. No audit check was suppressed.
- Android SDK/signing are unavailable here; Xcode/Apple signing require a Mac. Actual signed AAB/archive, SDK reports, capabilities and device tests remain outstanding.
- Store privacy/health declarations, content rights, reviewer access, identity agreements and any applicable Play-account testing requirement require verified owner evidence.

See `LAUNCH_READINESS.md` for the concrete decisions, publication workflow and primary-source links. These limitations preclude a promise of first-pass approval or publication tomorrow.
