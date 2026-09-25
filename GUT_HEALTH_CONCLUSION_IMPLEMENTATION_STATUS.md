# Gut Health conclusion experience — implementation status

**Updated:** 26 September 2026  
**Repository:** `C:\Users\adity\OneDrive\Desktop\HealthChain-Live`  
**Starting revision:** `1f4a7021` on `master` (matched `origin/master` before edits)  
**Implementation commits:** `e052751c` and `023d12cf` (pushed to `origin/master`)  
**Scope:** Implementation ledger for `C:\Users\adity\Desktop\HealthChain-Gut-Health-Conclusion-Experience-Implementation-Plan-2026-09-26.md`.

## What this change implements

- A single read projection combines existing Diet meals with profile-scoped canonical observations for the Gut workspace, record view, evidence counts, and copied visit brief. Linked observations are not counted as second meals. Undated meal observations stay inspectable and are excluded from dated comparisons.
- Conclusion cards show actual with / without / unknown-or-disputed counts and source-linked occasions. The visual is explicitly labeled as a count, not a probability. Each occasion opens its exact source.
- Empty conclusions distinguish “no meal linked to this question” from “no matching reports,” and expose a separate route to saved records so the no-data state is not mistaken for missing account history.
- The conclusion is now the first explanation on the answer screen. The additional connection reading sits behind **How these records connect**, so the user can get the answer before opening the detailed path.
- Intent and symptom inference remain editable; draft suggestions do not become saved facts without selection. Excluding a source applies only to the question and does not delete the original record.
- Current-concern guidance says the app cannot assess urgency and marks independent review as pending. General NIDDK links open the original source; the app no longer presents its own unreviewed paraphrase as a research summary.
- Europe PMC retrieval searches title and abstract fields so a topic appearing in an abstract is not lost by a title-only post-filter. Empty results say that the search may miss relevant work. Paper cards continue to identify the fields that have not been checked in the original study.
- Observation sync copy is limited to queue facts (`pending`, `no_pending`, `local_only`, `unavailable`). It does not claim that a second device has refreshed. A profile switch starts a fresh cloud observation load and drops the previous profile’s sync message.
- The older Ava Connections guide now links to the same Gut workspace. The dashboard card remains the regular white card with its orange icon and has a question-led description.
- Visit-history copying uses the shared projection and labels missing dates, source IDs/revisions, medication/context notes, and the limits of personal reports.

No example person, meal, outcome, user count, or research result was added as product data. NIDDK URLs and Europe PMC study results are external source metadata, not personal observations.

## Ticket ledger

Status meanings: **Implemented** = code present; **Partial** = some code present but the plan’s completion condition still needs work; **Gate** = needs a qualified reviewer, authenticated environment, user evaluation, or deployment evidence; **Not done** = no implementation claimed.

| Ticket | Status | Evidence / remaining work |
| --- | --- | --- |
| GH-01 Baseline and route ledger | Partial | Dashboard, Today query-param, Ava handoff, workspace and source routes inspected during implementation. Deployment SHA, feature-flag state, route walkthrough, and a full route diagram still need recording. |
| GH-02 Source and outcome inventory | Implemented in code | Shared profile-scoped projection now feeds workspace, records, source IDs/counts and copy export. Verify with authenticated multi-source fixtures before calling integration complete. |
| GH-03 Visual prototype | Partial | The active UI is the implementation; advanced connection detail is collapsed after the conclusion. Desktop/mobile/320 px visual review has not been performed. |
| GH-04 Clinical content policy | Gate | Pending independent clinician/dietitian review. The UI marks this status and does not show app-authored NIDDK paraphrases. Reviewer and date are intentionally blank. |
| GH-05 Unified scoped Gut read model | Implemented in code | Diet and canonical meal records merge once; dated/undated counts and shared visit export use the same projection. |
| GH-06 Provenance and time semantics | Partial | Exact source IDs, canonical revisions and time precision are preserved. Legacy Diet records may not have revisions; DST, timezone and delayed-report scenarios still need integration verification. |
| GH-07 Profile and sync integrity | Partial / Gate | Visible profile-scoped queue states and fresh loads on profile switch are implemented. Two-account/two-device, RLS, offline queue, conflict and deletion verification are not established here. |
| GH-08 Versioned question contract | Partial | Conclusion rules version is stored and legacy threads receive a read-time default. Full account migration/profile-switch testing remains. |
| GH-09 Progressive intake | Partial | Four selectable Clinical-style intent cards, optional question details and direct answer path remain. The full A→D progress shell/prototype and accessibility review are not implemented. |
| GH-10 Path-specific questions | Partial | Draft text stays editable; inferred symptom/meal is not silently persisted; suggestions require selection. Current-concern/choice/care path task evaluation remains. |
| GH-11 Existing-data reveal | Implemented in code | Existing records and explicit outcomes surface with source links; exclusions are question-only. Confirm across all observation kinds in integration review. |
| GH-12 Current-concern care branch | Partial / Gate | Non-triage wording and pending clinical-review status are visible. Reviewed red-flag copy and clinician sign-off are not complete. |
| GH-13 Deterministic conclusion engine | Partial | Existing count/counterexample/unknown logic and additional state labels are surfaced. Not all eleven plan states have distinct tested fixtures/actions. |
| GH-14 First-viewport conclusion | Implemented in code; visual Gate | Plain-language conclusion, count visualization, source-linked occasions, and one primary action precede the optional connection detail. Screenshot review is still required. |
| GH-15 Evidence source drawer | Implemented in code | Meal, observation and digestion records open exact IDs; unavailable sources are not substituted. Verify deleted/revised-source behavior in authenticated scenarios. |
| GH-16 Visualization system | Partial | Actual count balance, occasion ribbon, backtrace and preparation/context detail exist. Research-fit, visit-story, and change-receipt visual consistency still need design review. |
| GH-17 One-fact investigator | Partial | Existing missing outcome/onset prompts are optional and tied to a source. Burden ranking across all question states is not implemented. |
| GH-18 Reviewed evidence registry | Gate | Link metadata has version and pending-review status. Exact reviewed claims/passages, applicability fields, reviewer and review date are absent; no user-facing finding is claimed. |
| GH-19 Retrieval and status service | Partial | Title/abstract search, correction/retraction checks, source links, and outage states exist. Guideline/review prioritization, caching and robust deduplication are not complete. |
| GH-20 Research applicability and synthesis | Partial | Study bridge shows known/unknown metadata and directs users to the source. It does not verify study results or synthesize a body of reviewed evidence. |
| GH-21 Research result UI | Partial | Research is separate from personal conclusions; studies remain an optional exploration path. A reviewed, concise applicability result is waiting on GH-18/20. |
| GH-22 Choice and outcome | Partial | Chosen option and actual reported outcome remain separate. Reopening the same question after a meal/outcome needs end-to-end validation. |
| GH-23 Visit-ready brief | Partial | Brief and records use the unified projection and distinguish personal reports/context. Automatically including reviewed research citations/applicability is not complete. |
| GH-24 Case Prep and visit return | Partial | Existing Case Prep handoff remains; Ava Connections has a direct handoff to Gut. A documented visit outcome linked back to the exact Gut question needs integration work. |
| GH-25 Living change receipt | Partial | Evidence fingerprints include canonical source revision and the UI can show a changed-source receipt. Publication change alerts do not update a clinical claim; reviewed-source downgrade behavior is not implemented. |
| GH-26 Food-trial boundary | Implemented as gate | No new elimination/challenge program was opened. Existing trial data remains separate from linked meal reports. |
| GH-27 Copy and visual polish | Partial | Dashboard copy, source language, sync language, and duplicate connection summary were refined. Final Clinical visual review is outstanding. |
| GH-28 Functional/accessibility verification | Not run | No tests/build/browser checks were run for this implementation pass. Existing retrieval expectation was updated for the new title+abstract behavior. |
| GH-29 Human usefulness evaluation | Gate | Requires moderated user tasks and clinician/dietitian review; code cannot establish satisfaction, benefit, or $20/month value. |
| GH-30 Controlled production rollout | Gate | Requires CI/release evidence, RLS/sync proof, clinical registry review, deployment SHA, feature flag/rollback and privacy-minimal analytics review. |

## Release boundary

This implementation improves source consistency and the first answer. It does **not** establish clinical effectiveness, independent research synthesis, authenticated cross-device reliability, or willingness to pay. Keep any clinical/research finding gated until a qualified reviewer records the exact claim, source passage, applicability, reviewer and date. Keep the food-challenge gate closed. Do not treat this status document as a clinical approval or deployment record.

## Verification performed in this pass

- Inspected the dirty diff and relevant call sites manually.
- Did not execute unit tests, browser tests, lint, TypeScript, build, database migrations, or deployment. Those need an explicitly authorized verification pass.
