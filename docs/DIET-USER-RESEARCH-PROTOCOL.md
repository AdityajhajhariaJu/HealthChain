# Diet usability research and acceptance protocol

30 September 2026. Status: protocol prepared; no participant sessions have been conducted or claimed. Owner: product research. Related implementation: D01–D16 in DIET-IMPLEMENTATION-TICKETS.md.

## Decisions this study must inform

Test whether people can choose familiar food, record actual eating without a generation dependency, understand quantities and uncertainty, and recover from changed plans. Purpose and location are explicit preferences, not inferred psychological traits. The published behavior review provides hypotheses; it does not establish how HealthChain customers behave.

## Participants and consent

Recruit 12–18 consenting adults across countries and ordinary cooking arrangements: Indian and non-Indian cuisines, people living abroad, budget/time constraints, shared households, restaurant eating, occasional tracking, nutrition tracking, and symptom recording. Include keyboard/screen reader users and both Android/iOS devices. Let participants decline weight/calorie questions and use fictional food records. Collect only necessary study notes, explain retention, allow withdrawal, and keep customer identifiers and health details out of public tickets. Do not recruit children into this adult planning study.

A separate clinician/dietitian review is needed for nutrition content and medically constrained menus. This usability study cannot certify allergy safety, nutrition truth or treatment suitability.

## Tasks and expected observations

| Task | Scenario                                                                            | Acceptance signal                                                                                                | Related tickets |
| ---- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------- |
| 1    | Save country/region, then explicitly choose a different cuisine                     | Participant distinguishes residence from cuisine and can edit both                                               | D01,D02,D04     |
| 2    | Travel temporarily, then return home                                                | Home residence survives; override expires visibly                                                                | D01             |
| 3    | Select a 15-minute, economical, vegan setup and available equipment                 | The user understands preferences and can inspect ingredients; rejected output preserves the old plan             | D01,D02         |
| 4    | Hide nutrition numbers and record a meal                                            | Task works without a weight/calorie target or judgment about good/bad food                                       | D03,D06         |
| 5    | Log a restaurant meal by name while offline                                         | Record saves with unknown nutrition, persists after reload, does not wait for AI                                 | D03,D05,D14     |
| 6    | Use speech in a chosen language, or unsupported browser                             | Transcript is reviewed; text fallback works without permission loops                                             | D04             |
| 7    | Save a familiar meal, repeat it tomorrow, change its measured amount                | A favorite is not counted as eaten; the new occurrence has the correct date; unsupported scaling stays unknown   | D03,D05         |
| 8    | Look up a packaged food and check the label                                         | Participant identifies per-100g versus per-100ml and consumed amount; missing fields are not interpreted as zero | D10             |
| 9    | Capture a real-food photo with an uncertain portion                                 | Participant understands this is an estimate and can correct or save the name                                     | D10             |
| 10   | Choose an idea and build a partial plan                                             | No weekly AI requirement; no food is logged just by planning                                                     | D07             |
| 11   | Pin a chosen breakfast, replace the remaining week                                  | Accepted recipe is retained; availability/time conflicts are clear                                               | D07             |
| 12   | Start a plan on Thursday and prepare for three people                               | Day dates make sense; recipe and shopping amounts scale; personal nutrition does not multiply by three           | D08,D09         |
| 13   | Select two meals, subtract matching pantry stock, enter pack size and an extra item | User can explain what needs purchasing; incompatible units are not converted                                     | D09             |
| 14   | Edit/remove a food record and undo removal                                          | Correction/undo succeeds across reload; the deleted version does not reappear from sync                          | D05,D14         |
| 15   | Record a reaction or no reaction, leave another symptom unreported                  | Participant distinguishes explicit answers from unknown days; report time is not presented as onset              | D11             |
| 16   | Find older records by date/name and export them                                     | All relevant occasions are findable; export preserves dates, unknowns and original sources                       | D11             |
| 17   | Ask Ava about a qualitative food record                                             | Handoff preserves the user’s intent and numbers preference; it does not turn missing ingredients into facts      | D12             |
| 18   | Add water from Diet and inspect Health Today                                        | Same amount and target appear across screens and reload                                                          | D12             |
| 19   | Enable meal/preparation reminders, set quiet hours, deny permission                 | Browser/native capability is understood before opt-in; no duplicate or wrong-account reminder                    | D13,D14         |
| 20   | Stop/archive a plan and restore an earlier choice                                   | Diary is unaffected; stopped/active statuses and restored revision are understood                                | D08             |

## Interview guide

Before tasks: What is the last situation in which you had to decide what to eat? What constraints changed the decision? Which foods, units and language are familiar? Who shops and who cooks? How much recording would be reasonable on a busy day? Which numbers would you rather not see?

After tasks: What did you expect the action to do? What did the app actually do? Which values did you believe were measured, calculated, estimated or unknown? What would you check before trusting this meal? Did any wording feel judgmental or demanding? What would make you stop using the feature? What felt unnecessary?

Avoid leading questions about “loving” personalization or agreeing with an existing design. Observe errors before explaining the interface; separate prompted success from unaided success.

## Measures and go/no-go rules

Record unaided task success, time, mistaken interpretation, recovery success, requests for help, perceived burden (1–5), confidence in the data basis (1–5), and the participant’s explanation of source/portion. Segment results by use situation; do not infer attitudes from nationality or health status. Small samples support design findings, not population percentages or universal satisfaction claims.

Release blockers from sessions: wrong-account writes; planning presented as eating; unknown nutrition shown as zero/verified; unit/basis confusion leading to a wrong consumption entry; inability to recover from a failed save; a reminder capability promise the device cannot deliver; an accessibility barrier preventing a core task. Fix, reproduce with a regression test, and retest the affected task with the participant’s consent.

A proposed usability target is at least 90% unaided completion for core tasks and zero unresolved critical interpretation/privacy errors in the observed sample. This is a target to measure, not a result. For each session, preserve failures and dissenting feedback; do not cherry-pick satisfied users.

## Device and content verification separate from research

Native release gate: on representative real Android and iOS devices test foreground/background/closed-app delivery, revoked permission, timezone change, quiet hours, restart, notification click routing and logout cancellation. Automated scheduling mocks are not proof of OS delivery.

Content gate: use representative real regional packages and prepared meals, compare transcribed/catalog values against current labels, review source/version and g/ml basis, document discrepancies and unknowns, and assess realistic recipe portions with an appropriately qualified reviewer. Barcode/photo/catalog data never becomes clinically verified because a UI test passed.

## Findings log template

Session ID; consent/date; device/language/use situation; task; unaided outcome; exact observed behavior or short consented quote; expected behavior; severity; source confidence; issue ticket; correction; retest outcome. Current findings log: empty; recruitment and real sessions remain external work.
