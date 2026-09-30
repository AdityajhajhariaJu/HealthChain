# Diet implementation plan and release tickets

30 September 2026. Owner: application engineering. Source: [DIET-USER-BEHAVIOR-AND-USE-CASES.md](DIET-USER-BEHAVIOR-AND-USE-CASES.md). This is an executable backlog; a checked ticket requires the listed evidence. Published research informs design hypotheses, not claims about our customers.

## Delivery order

1. Establish bounded preferences and account-scoped reusable records. Preserve old plans, nutrition provenance and deletion tombstones.
2. Connect planning inputs and eligibility to the gateway. Validate responses before quota completion and persistence.
3. Make daily logging independent of generation. Connect favorites, history, timing, qualitative context and corrections to canonical observations.
4. Connect plan dates, selected meals, household portions, pantry and shopping to one plan revision.
5. Complete review, product lookup and optional reminders with honest platform capabilities.
6. Run state, gateway, browser and production gates. Commit and push the existing master branch; verify the deployed commit.

## Tickets

| Ticket | Coverage           | Work and acceptance                                                                                                                                                                                                                                              | State   |
| ------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| D01    | A1,A4,A5,A7–A10,F3 | Practical preferences: purpose, optional numbers, temporary travel location, dislikes, budget band/currency, preparation time, equipment, skill, household, voice locale. Reload and shared profile sync preserve edits. Residence is not overwritten by travel. | Implemented |
| D02    | A2,A3,A6,B3,F1     | Bounded gateway personalization; vegetarian/vegan handled as food preferences, allergy and medical eligibility remain explicit. Reject invalid/contradictory requests and ingredient violations; recovery fingerprints cover preferences.                        | Implemented |
| D03    | C1,C2,C3,C10,C13   | Personal favorites with delete tombstones, recent/copy meals, name-only logging without AI/network, deliberate repeat action, optional estimate. Unknown nutrients remain unknown.                                                                               | Implemented |
| D04    | C4,F6              | Location-aware shortcuts and selectable speech language; feature detection and text fallback. No inferred language from nationality.                                                                                                                             | Implemented |
| D05    | C8–C12,C14         | Actual date/time, approximate precision, amount, hunger/fullness and notes. Corrections preserve immutable provenance/history, deletion has undo, plan consumption is confirmed explicitly.                                                                      | Implemented |
| D06    | E1,E2,F3           | Dashboard slots follow schedule; all observations remain visible once, including unscheduled meals. Numbers can be hidden, missing logs use neutral copy.                                                                                                        | Implemented |
| D07    | B1,B2,B5,B7,B8     | Ideas have a review step, never log automatically. Select days/meals, pin accepted meals, repeat a meal for batch cooking, custom alternative/reason. No unnecessary weekly AI call for a meal idea.                                                             | Implemented |
| D08    | B4,B6,B9,B10       | Plan start date/day mapping, lifecycle controls, household recipe quantities separated from individual nutrition, raw/dry basis explained; ingredients/oil/recipe preparation remain inspectable.                                                                | Implemented |
| D09    | D1–D4              | Grocery categories, conservative synonyms, pantry subtraction only for matching units, selected meals and household factors, manual additions, package size rounding and sharing. Recalculate after plan edits without losing checks/manual items.               | Implemented |
| D10    | C5,C6,C7,F1        | Barcode lookup from a real catalog with source attribution, missing/invalid field handling, per-100g/per-100ml basis and actual consumed quantity. Unsupported camera scanning has manual-code fallback. AI image review and label correction stay available.    | Implemented |
| D11    | E4,E5,E6,F4        | Full dated timeline with range/search; no six-entry cap. Explicit symptom/no-symptom and unknown days stay distinct. Pattern sample size and minimum evidence visible. Export dates, source and unknowns.                                                        | Implemented |
| D12    | E3,E7,E8,E9,E10    | Recheck shared hydration, Ava handoff, guide/notes, optional rainbow checklist and movement. Do not equate checklist choices with consumed food or compensated calories.                                                                                         | Implemented |
| D13    | F2                 | Optional meal/preparation reminders: chosen slots/time, permission status, quiet hours and deduplication. Native scheduling supported; web in-app prompts described honestly and do not claim delivery after browser closes.                                     | Implemented; physical-device gate pending |
| D14    | F5,F6,C13          | Account/profile boundaries, record tombstones, multi-device merge, accessibility labels, narrow screens and offline failures. Save confirmation precedes UI success.                                                                                             | Implemented |
| D15    | All                | Focused regression suite, Chromium/WebKit journeys, production build/lint, deployment commit/status and isolated live smoke test. No customer meals fabricated during verification.                                                                              | Complete; production verified |
| D16    | Research           | Prepare participant tasks, interview guide and outcome measures. Recruit 12–18 consenting users across situations; observe task success and burden. Actual interviews require participants; never fabricate validation results.                                  | Protocol complete; participant sessions pending |

## Release gates

- Old profiles and plans render; previous generation recovery keys still work when no new preferences are supplied.
- Optional estimates and unknown values never turn into verified values or zeroes.
- Creating a plan, choosing an idea and saving a favorite never creates an eaten observation.
- Selected date, captured time, timezone, consumed portion and original source remain distinguishable.
- Profile changes during an async action cannot write into a different profile.
- Shopping reflects the selected plan revision and portions; pantry units are never guessed.
- Browser and native reminder capability is visible before enabling reminders.
- Gateway generation stays within provider token and deployment duration limits; quota completion follows validated output.
- Build and focused meaningful regression tests pass; deployed commit matches the release.

## Accuracy and validation boundaries

Recipe/photo estimates are estimates. Catalog entries and photographed labels can be incorrect; show their source and allow correction. This release cannot establish that every nutrition answer is correct, that every allergy is safe, or that every customer will be satisfied. Human research and representative real label/meal audits are recorded separately from automated functional verification.

## Implementation evidence

- D01/D02: shared bounded preferences and gateway constraints, conservative preference checks, vegetarian/vegan eligibility, country/region and temporary travel. Real-provider synthetic evaluations passed a 7-day vegan Osaka plan with 3 daily meals and a vegetarian California no-cooking plan with 5 daily meals; both respected 15-minute preparation limits. These evaluations establish request/output compatibility, not verified ingredient nutrition.
- D03–D06: account-scoped reusable library, nullable nutrients, source-preserving portion reuse, actual eating confirmation, corrections/undo, optional feelings and numbers, schedule projection. Contract and canonical meal-command regression tests pass. Copying a meal clears the previous occasion's feelings and reaction.
- D07–D09: selected shopping meals, accepted/pinned recipes, manual ideas/partial plans, start dates, household ingredient factors, compatible-unit pantry subtraction, manual grocery additions/package sizes and check preservation. Grocery and lifecycle tests plus Chromium/WebKit user journeys exercise the connections.
- D10: real public catalog API, validated barcode, per-100 basis, source/version, nullable missing fields, manually confirmed consumed amount, fallback when photo detection is unsupported. API contracts and browser portion math are covered.
- D11: full canonical dated history, explicit reactions with unknown onset, symptom-answer knowledge, minimum pattern evidence, contextual record export and CSV formula escaping. Legacy deleted or moved meals do not reappear through a reaction.
- D12/D14: shared hydration/medication regressions, Ava food handoff, account change, asynchronous scope guards, deletion/reset merge protection, focus-trapped tools and narrow-screen preference editing. The baseline editor now reads the latest saved profile when opened, preventing immediate edits from losing a newly added reminder.
- D13: native scheduling and cancellation use separate IDs, account guards and serialized updates; unit tests cover permission/quiet-hour/category behavior. Browser prompts explain that closing the browser stops delivery. Real Android/iOS delivery, battery restrictions and screen-reader/keyboard checks still require physical devices.
- D16: [research protocol](DIET-USER-RESEARCH-PROTOCOL.md) includes recruitment, consent, representative tasks and outcome thresholds. No participant interviews or clinician nutrition validation were fabricated.

## Supported scope and remaining external gates

The current product supports the primary account profile. Caregiver profile support remains disabled in the application and database; this release does not activate it. Shared-cooking household portions do not imply multiple patient profiles.

Native delivery validation, actual user research, and a representative dietitian-reviewed nutrition/content evaluation remain separate gates. Concurrent whole shopping-list edits use the existing latest-update rule; automatic record merging is available for favorites/pantry, but this is not a claim that every simultaneous shopping edit can be reconciled without review.

## Release verification log

- 94 test files passed: **631 tests passed, one pre-existing skipped test**. A further mounted diary-card regression passed after fixing the discovered Ava card write side effect.
- Final connected browser coverage passed across Chromium and WebKit: **54 distinct journeys** (36 everyday-food/shared-tracker checks plus 18 unchanged scanner/shared-diary/onboarding checks). The barcode Safari scenario also passed twice independently after the build had finished; production image optimization and browser tests must run sequentially to avoid development reload interference.
- Production TypeScript/Vite build and configured ESLint checks passed. The final release build is repeated after the diary-card fix. No customer health records or account generation quota were used for these checks.
- Primary-profile database constraint and existing disabled caregiver boundary were verified read-only; no Diet schema migration was required.
- The Ava diary card is now a pure read view; mounting/rerendering/opening it cannot create another meal or symptom observation. Its visual card and navigation are retained.
- Deployment and live smoke results are recorded after pushing the release commit.

Deployment verification caught Vercel counting a new helper as an API function, exceeding the existing plan's 12-function limit. The origin helper was moved into shared code; the public product route remains enabled. The original failed deployment did not replace the existing production site.

## Production release evidence

- Code and plan pushed on existing `master`: `98c05d29`; hosting correction and Ava audit: `bb0927f9`.
- Vercel confirmed successful deployment `HMx7PWFNiV2URovohrGUpkBRoXBW` for `bb0927f9`.
- Isolated smoke at `https://healthchain360.com/app/dietician`: preferences and packaged-food tools rendered, real product lookup worked, reload succeeded, no horizontal overflow at 390 px, no page errors. This used disposable guest-only local data and did not invoke AI generation or create production patient records.
- Real `GET /api/food-product?code=3017620422003`: HTTP 200, documented product source, `per_100g` basis, 539 catalog kcal per 100 g. This is an example catalog response, not an endorsement that every package variant has that label.
- Native-origin preflight: HTTP 204 and `Access-Control-Allow-Origin: https://localhost`.
- The helper move was covered by 19 gateway/product/origin regression tests. Complete tests, release logs, screenshots and production smoke JSON are retained in the task's `diet-generation-incident` artifact directory.
- D15 is closed for this release. D13's physical-device gate and D16's participant sessions remain explicitly open. Ava's remaining work is tracked separately in [AVA-DEEP-RECHECK.md](AVA-DEEP-RECHECK.md).
