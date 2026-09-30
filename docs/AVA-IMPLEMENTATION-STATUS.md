# Ava implementation and release checks

1 October 2026. Implements the reliability work in [the baseline audit](AVA-BASELINE-AUDIT.md), [the deeper recheck](AVA-DEEP-RECHECK.md), and the subsequent lifecycle review. The floral theme and optional cards/disclosures are retained.

## Delivered workflows

| Tickets | Implementation | Verification |
| --- | --- | --- |
| AVA-01/02/22, F-01 | Explicit General mode; case-filtered transcripts and requests; mobile picker; captured account/case guards for async responses, uploads, actions and memory | Mounted A/B/General/reload journeys; owner-switch and delayed-write unit fixtures |
| AVA-03/04/13, F-02/03/04 | Dedicated message repository with immutable IDs and merged receipts; local IndexedDB fallback; owner-scoped cloud queue; reviewed memory proposals, correction and deletion tombstones; validated export/import with restore preview | Offline hydration, concurrent snapshots, forgotten-memory suppression, malformed history, archive round trip and storage-failure fixtures |
| AVA-05/07/19/20, F-06 | Exact attachment values/units/dates/zeroes; separate food-photo entry; stable study handoff; captured evidence per reply; removed word-match evidence badge and broad JSON cleanup | Attachment/service fixtures, study-route browser checks, quoted-source/parser tests; diary render remains read-only |
| AVA-08/09/12 | Typed Ava and memory requests; server-owned prompts; patient material in data turns; request hash and private durable reply replay; bounded deadline; reject empty/truncated output; request-bound reserve/refund; interrupted-request recovery through existing cron | Eleven Ava gateway tests including replay, owner/body mismatch, empty/truncated output, deadline, refund and accounting outage; shared gateway regressions |
| AVA-06/10/11, F-05 | Negation/urgency guards and country override; canonical River observations with honest occurrence precision; explicit daily check-in save; next General reply includes exact saved answers; canonical meal intake | Triage fixtures; daily check-in → one canonical record → next reply → reload journey in Chromium/WebKit |
| AVA-15/16 | Distinct comfortable breathing and published movement catalog; actual participation; exact owned session start/completion; no invented calories or success celebration after failed writes | Mounted breathing/card journey; rolled-back two-account live SQL checks for ownership, duration validation and idempotent counters |
| AVA-17/18/21/23/24/25 | Ordered supported cards; ordinary/negated words cannot create a recommendation; reviewed case writes with stable receipts; disclosures retained after reload; scoped drafts/reading position; focus/Escape and completed-answer status; retry versus allowance states | Mixed cards, negation, reviewed save/reload, 320px layout, keyboard/focus and retry browser journeys |

Saved check-ins are user reports. Unanswered is preserved, and the save timestamp is not presented as the occurrence time. A case reply includes only observations explicitly linked to that case. A General reply excludes observations linked to another case. Oversized optional observations are omitted whole and reflected in the context count.

## Database and recovery

Applied only `ava_reliability_foundation` to Supabase project `cikikocfvfshloqwnyfe`. The new `ava_messages` relation has owner RLS, primary-profile scope, an owned-case write check, and immutable answer/evidence fields. Only receipts merge on updates. Anonymous access is denied. The recovery ledger and recovery RPC remain service-only.

The full production SQL verification and read-only Supabase smoke passed. Synthetic live SQL asserted that account B could neither read account A's message nor complete A's session; repeated start/completion counted once. The transaction was rolled back, and a separate check confirmed zero remaining synthetic users, activities and messages.

The repeatable synthetic transaction is [ava-reliability-rollback.sql](../supabase/tests/ava-reliability-rollback.sql); it must retain its final rollback.

Recovered reply JSON is available for 24 hours. The existing daily cron purges expired reply data and retries interrupted reservation refunds; physical deletion can therefore occur on the following daily run. Conversations have their separate owner-scoped repository. No additional hosting function was introduced.

## Automated release evidence

- Full unit suite: **668 passed, 1 skipped** across **97 passing files, 1 skipped file**.
- Full browser run initially returned **126 passed / 12 failed**. Two old assertions expected the retired prompt-only day logger and the old request body. These were updated to verify the actual replacement workflows. Chromium navigation timeouts and Safari actionability failures were investigated and rerun.
- Added seven mounted Ava journeys in both Chromium and WebKit: case isolation, all supported card destinations, reviewed save receipts, narrow-screen picker/focus, exact day check-in context, negated suggestions/study route, and archive restore.
- Three long, multi-page journeys have a 60-second total test budget after traces showed successful WebKit actionability waits consuming the original 30-second budget on Windows. Assertions, source checks and individual expectation timeouts were retained.
- All twelve initial browser failures subsequently passed. Across the complete run and the targeted reruns, **all 140 distinct browser cases passed**, including the two newly added check-in cases. This was not one uninterrupted green run; CI reruns the complete suite on the release commit.
- Final shared gateway/reliability check: **50 passed** across four files after the last request/context changes.
- Final release build, lint, API/shared JavaScript syntax, and migration contract passed (**31 migrations, 25 schema checks**). Runtime dependency audit returned **0 vulnerabilities** after the Axios/DOMPurify lockfile updates; this is not a claim about development-only dependencies.

The first GitHub full browser run on `46ef2ffb` returned 135 passes, two flaky food-library journeys and three failures. It exposed two fixture assumptions and a shared modal-focus defect. Missing catalog configuration now produces an immediate unavailable state; the midnight fixture constructs its instant in the browser's local zone and installs the clock before mounting timers. `FocusTrap` now keeps focus during form rerenders and invokes the latest Escape callback without restarting initialization. Two mounted focus regressions cover early editing, rerenders, current callbacks and focus restoration; a third regression verifies prompt failure without a request to a fallback catalog host. The affected Ava and food-library browser journeys passed in both browsers. Explicit UTC and Asia/Kolkata midnight checks and real sequential keyboard entry passed: six browser checks, plus three unit regressions. CI now has 142 browser cases including both timezones.

Machine-readable logs and synthetic probe screenshots are retained in this Codex task's `ava-further-review` directory. Tests live in the repository for repeatable CI execution. The final deployed commit and deployment result are reported in the release message.

## Remaining validation and bounded follow-ups

These items have not been certified by this implementation:

1. **Clinical answer evaluation:** representative clinician-reviewed cases, source/claim agreement, extraction correctness, conflicting records and broader languages. Runtime validation cannot guarantee medical correctness. The unsourced categorical lab-threshold instructions were removed.
2. **Physical devices and people:** two real signed-in devices, native camera/audio/background behavior, screen readers, device notification delivery and participant usability sessions. Browser tests use synthetic local profiles and mocked provider outputs.
3. **Additional product capabilities:** conversational reminder scheduling, explicit other-person subject mode, a dedicated compatible-unit before/after comparison, historical source updated/deleted badges, and very long cloud-history pagination. Existing source actions retain captured evidence; they do not substitute the currently selected case's first record. Caregiver profiles remain disabled.
4. **Wider API workflow authority:** Ava/memory/meal-plan contracts are server-owned. Some other allowlisted operations still use legacy browser-authored workflow prompts and session-metering rules; the wider platform needs its own typed workflow contract before claiming universal quota/prompt enforcement.
5. **Project-wide database advisories:** two existing mutable-search-path functions, the public vector extension, disabled leaked-password protection, legacy policy/performance warnings. New session RPCs deliberately remain authenticated SECURITY DEFINER functions with tested owner checks; do not revoke their intended calls merely to silence an advisor. Private ledger tables deliberately have no browser policy. See [definer guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [search-path guidance](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), and [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

The delivered code fixes defined functional defects. This report does not mark every design hypothesis, medical answer, native capability or whole-platform advisory as complete.
