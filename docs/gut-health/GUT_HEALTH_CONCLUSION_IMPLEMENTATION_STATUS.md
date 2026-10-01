# Gut Health conclusion experience — implementation status

**Updated:** 26 September 2026
**Repository:** `C:\Users\adity\OneDrive\Desktop\HealthChain-Live`
**Starting revision for this completion pass:** `1660b1bb` on `master` (matched `origin/master`)
**Earlier implementation commits:** `e052751c`, `023d12cf`, `1660b1bb` (pushed to `origin/master`)
**Scope:** Implementation ledger for `C:\Users\adity\Desktop\HealthChain-Gut-Health-Conclusion-Experience-Implementation-Plan-2026-09-26.md`.

## Follow-up pass: first-use value and care return

- A plain-language question now asks for one quick confirmation before suggested meal and symptom labels become structured comparison fields. It shows exact matching saved meals when present and says when the named meal is absent. The user can continue without suggestions. No meal or symptom report is fabricated.
- The current-concern branch now leads with a visible care action, NIDDK-linked general safety wording, same-date source records, optional recalled onset, a focused patient-labeled care summary, and an optional later account. It does not determine urgency or cause.
- The answer card places its action immediately below the personal-record conclusion on mobile. General source notes in the answer and Research views state what NIDDK or Monash discusses, how narrowly it fits the question, and what it cannot conclude about the user. These notes are pending independent clinical review and are not in the reviewed-claim registry.
- A Gut-linked Case Prep question reads the current scoped Gut answer, counts, and patient follow-up. Its source button returns to that exact Gut question.
- `GUT_HEALTH_CLINICAL_AND_USER_VALIDATION_PACKET.md` is also on the non-OneDrive Desktop. It contains clinician review fields and an eight-person comprehension/usefulness protocol. The user will coordinate reviewers and participants. No clinical signoff, observed usefulness, or $20/month willingness is claimed.
- Follow-up automated checks: 513 unit tests across 75 files; lint, TypeScript, production build; 22/22 Gut browser cases in Chromium/WebKit before the final exact-return change, then 18/18 targeted first-use/Case Prep cases after that change. Authenticated two-device proof, manual screen-reader/200% zoom checks, clinical review, user study, and production deployment proof remain open.

## What this change implements

- A single read projection combines existing Diet meals with profile-scoped canonical observations for the Gut workspace, record view, evidence counts, and copied visit brief. Linked observations are not counted as second meals. Undated meal observations stay inspectable and are excluded from dated comparisons.
- Conclusion cards show actual with / without / unknown-or-disputed counts and source-linked occasions. The visual is explicitly labeled as a count, not a probability. Each occasion opens its exact source.
- Empty conclusions distinguish “no meal linked to this question” from “no matching reports,” and expose a separate route to saved records so the no-data state is not mistaken for missing account history.
- The conclusion is now the first explanation on the answer screen. The additional connection reading sits behind **How these records connect**, so the user can get the answer before opening the detailed path.
- Intent and symptom inference remain editable; draft suggestions require a one-step confirmation before they become comparison fields. Excluding a source applies only to the question and does not delete the original record.
- Current-concern guidance says the app cannot assess urgency and marks independent review as pending. Short NIDDK and Monash source-navigation notes now appear with links and applicability limits; they are not labeled independently reviewed research findings.
- Europe PMC retrieval searches title and abstract fields so a topic appearing in an abstract is not lost by a title-only post-filter. Empty results say that the search may miss relevant work. Paper cards continue to identify the fields that have not been checked in the original study.
- Observation sync copy is limited to queue facts (`pending`, `no_pending`, `local_only`, `unavailable`). It does not claim that a second device has refreshed. A profile switch starts a fresh cloud observation load and drops the previous profile’s sync message.
- The older Ava Connections guide now links to the same Gut workspace. The dashboard card remains the regular white card with its orange icon and has a question-led description.
- Visit-history copying uses the shared projection and labels missing dates, source IDs/revisions, medication/context notes, and the limits of personal reports.
- A missing-outcome prompt now appears only when exactly one stable, unanswered occasion is likely to change the reading. Several unknown outcomes no longer trigger a single-item prompt that cannot settle the comparison.
- General research discovery now has a 15-minute memory cache keyed only by generic symptom/topic; no personal question, meal, account, profile, or observation is retained in the cache. PMID deduplication and review-type reading priority are covered by tests.
- The user-facing synthesis registry now requires source location, a short source passage, population/exposure/comparator/outcome/setting, limitations, independent reviewer qualification, and review date/version. It contains no claims until a qualified reviewer approves them; the UI says so explicitly.
- Copyable question briefs now include exact citations for saved or currently displayed study records and state that these are discovery citations, not reviewed findings or personal explanations.
- Gut's canonical feature contract now names the question-led product, points to the real Today Gut route, and prohibits diagnosis, personal causal verdicts, unreviewed research synthesis, and self-directed treatment/challenge plans.
- Added route/data/research/release handoff in `GUT_HEALTH_COMPLETION_PACKET_2026-09-26.md`.

No example person, meal, outcome, user count, or research result was added as product data. NIDDK URLs and Europe PMC study results are external source metadata, not personal observations.

## Ticket ledger

Status meanings: **Verified** = code and the stated automated evidence pass; **Code complete** = implemented but not all planned validation has run; **In progress** = a documented subset is done and an acceptance item remains; **Externally gated** = requires a qualified reviewer, authenticated staging, real participants, or production deployment evidence; **Not started** = no work claimed.

| Ticket | Status | Evidence / remaining work |
| --- | --- | --- |
| GH-01 Baseline and route ledger | In progress | `GUT_HEALTH_COMPLETION_PACKET_2026-09-26.md` contains route/data map and reachable entry points. The starting revision is recorded above; the resulting code revision is available from the completion commit. Production deployment SHA and Gut runtime feature-flag state were not available in repository. |
| GH-02 Source and outcome inventory | Verified | Source/count/missingness table in completion packet; shared projection and `GutHealthSummary` tests. Cross-account staging verification remains under GH-07. |
| GH-03 Visual prototype | In progress | Existing Clinical-style UI and 320/390 px automated flow checks are present. Manual screenshot/design-owner review is still required; no fabricated prototype data was shipped. |
| GH-04 Clinical content policy | Externally gated | The approved-claim schema and pending state are implemented. A qualified GI clinician/dietitian must review care copy and any future claim; no reviewer approval is claimed. |
| GH-05 Unified scoped Gut read model | Verified | `GutHealthSummary.ts`, `GutResolutionService.ts`; tests cover source merging and no duplicate linked observations. |
| GH-06 Provenance and time semantics | Verified | Source IDs/revisions, occurrence/report timestamps, exact/approximate/date-only values, timezone and delayed-report behavior have unit fixtures in `GutResolutionService.test.ts`. |
| GH-07 Profile and sync integrity | Externally gated | Profile-scoped merge/outbox tests and anonymous Supabase smoke pass. Authenticated two-account/two-device, offline conflict, guest-promotion, and deletion proof still require staging test accounts/devices. |
| GH-08 Versioned question contract | Code complete | Conclusion rules version is recorded on new questions and read-time backfilled for legacy questions; profile sync merge tests pass. Authenticated old-record migration remains under GH-07. |
| GH-09 Progressive intake | Verified | Four real buttons, editable question, optional details, saved-draft continuity and no required meal; first-use tests check 320 px and the four paths. One compact confirmation appears only when the wording suggests a structured meal or symptom. |
| GH-10 Path-specific questions | Verified | User-controlled intent/symptom/meal; example text remains editable and inferred fields require explicit selection. First-use and intent-resolution tests cover this boundary. |
| GH-11 Existing-data reveal | Verified | Exact meal/source actions, explicit outcome handling, and question-only exclusions are covered by service, source-record and Gut browser tests. |
| GH-12 Current-concern care branch | Externally gated | A first-screen action, short patient-labeled care summary, same-date record links, recalled onset and later account are implemented. NIDDK-linked non-triage copy is pending independent review. No automated urgency grade or cause is shown. |
| GH-13 Deterministic conclusion engine | Verified | Tests cover the eleven planned answer families, mixed/conflict/date-only/unknown counts and decision/visit states. Multiple unknown occasions do not trigger a low-value single-fact prompt. |
| GH-14 First-viewport conclusion | In progress | Conclusion/count/action appears before optional detail and is exercised on mobile/desktop browser paths. Final owner visual inspection remains outstanding. |
| GH-15 Evidence source drawer | Verified | Exact source IDs and revisions open without nearby-date substitution; source component tests and mobile name-variant browser path cover the drill-in. Authenticated deletion behavior remains under GH-07. |
| GH-16 Visualization system | Code complete | Count balance, source occasion actions, backtrace, preparation comparison, study-fit metadata bridge, change receipt, and visit follow-through are data-driven; unknown/date-only meanings remain textual. Owner visual review is open under GH-03/14. |
| GH-17 One-fact investigator | Verified | A prompt is tied to one stable unknown source only when exactly one such outcome can alter the comparison. Multiple unknowns say one answer will not settle the question and invite the user to leave it open. Unit-tested. |
| GH-18 Reviewed evidence registry | Externally gated | Schema and validator implemented in `GutReviewedEvidence.ts`; the registry intentionally contains zero claims. Public source-navigation notes appear separately and visibly say independent review is pending. No reviewed synthesis renders until a qualified approval is recorded. |
| GH-19 Retrieval and status service | Verified | Title/abstract query, generic query taxonomy, review-type reading priority, PMID deduplication, correction/retraction filtering, exact-PMID refresh, 15-minute memory cache, and outage copy tested. |
| GH-20 Research applicability and synthesis | Externally gated | Public NIDDK/Monash source notes explain population fit and limits; the metadata bridge reports unknowns without extracting an abstract-only result. A valid independently reviewed evidence body is required before clinical synthesis; none is approved yet. |
| GH-21 Research result UI | Verified | The panel distinguishes reviewed synthesis from search discovery and clearly says when no reviewed finding exists. Research-appraisal browser test asserts this state and checks original source links. |
| GH-22 Choice and outcome | Code complete | Planned choice, actual selected Diet meal, and user-entered outcome are separate; service tests cover save/correction. Authenticated end-to-end return on a second device remains unverified. |
| GH-23 Visit-ready brief | Code complete | Shared records projection, patient-report labels, question conclusion, and saved/live research citations with a discovery-only caveat. Citation formatter is unit-tested; user review of the final exported brief remains open. |
| GH-24 Case Prep and visit return | Verified | Specific case selection, live scoped question reading, patient-question source reference, exact-question return, and provenance-labeled outcome have a browser round-trip test. |
| GH-25 Living change receipt | Code complete | Fingerprints include revisions/source kind and tests cover added, removed, revised, and changed comparison sources. There are no reviewed research claims to downgrade yet; that depends on GH-18. |
| GH-26 Food-trial boundary | Verified | Existing records remain inspectable and Gut does not launch a food challenge. Separate protocol, consent, nutrition-safety and clinician gates stay closed. |
| GH-27 Copy and visual polish | In progress | Dashboard card/icon theme, short labels, source language, reduced-motion, and responsive styles are preserved. Manual Clinical design-owner review is still open. |
| GH-28 Functional/accessibility verification | In progress | Follow-up pass: 513 unit tests across 75 files, lint, TypeScript, production build, 22/22 Gut browser cases, and 18/18 targeted first-use/Case Prep cases after exact-return routing. The earlier broader browser run had four non-Gut WebKit failures listed below. Screen-reader and 200% zoom manual checks remain open. |
| GH-29 Human usefulness evaluation | Externally gated | The completion packet contains the task protocol and predeclared success thresholds. No participant comprehension, satisfaction, clinical benefit or $20/month willingness-to-pay result is claimed. |
| GH-30 Controlled production rollout | Externally gated | Quality workflow targets pushes to `master`; anonymous smoke passed. Production deployment SHA, runtime flag, rollback owner, authenticated RLS proof and privacy-analytics review require release-system access/evidence. |

## Release boundary

Code completion is not clinical approval, authenticated cross-device proof, user satisfaction, effectiveness, or willingness to pay. Keep the research registry empty until a qualified independent reviewer records the exact claim, source passage/location, applicability, reviewer and date. Keep food challenges closed. A push to `master` is not proof of deployment.

## Verification performed in the earlier completion pass

- Unit suite: **511 passed across 74 files**. `npm run lint`, `npm run build` (TypeScript plus production Vite build), and `npm run verify:migrations` passed. Migration validation found 25 SQL files and 17 schema checks.
- Serialized Playwright run: **42/46 passed** across Chromium and WebKit. All Gut E2E cases passed in both browsers, including onboarding, source inspection/return, saved-meal-name variants, open-question continuity, research appraisal, and Case Prep handoff. The four failures were non-Gut WebKit tests: Clinical invalid-case review button visibility/stability; connected-workspace draft progression button visibility/stability; Today article test expecting a missing `Show recommended` control; and unsupported-document test back-button visibility/stability. These are recorded as release-suite failures, not Gut passes.
- `git diff --check` passed after removing trailing whitespace from the status ledger.
- Anonymous Supabase smoke passed in this completion pass: the observation relation was available and protected relations denied anonymous reads.
- Anonymous smoke checks relation availability and that protected relations deny anonymous reads. It does not validate authenticated two-device behavior or prove data cannot cross accounts.
- Build output includes existing Vite chunk warnings for modules imported both dynamically and statically. The build itself passed.
