# Gut Health clinical and user validation packet

Prepared 26 September 2026. This is a test script and review form, **not** clinical approval or a report of completed participant testing. Use the staging build and fictitious test records. Do not collect participants' medical history, names, or screenshots of their accounts.

## 1. Clinical review to coordinate

**Reviewers:** at least one independent gastroenterology clinician for current-concern/care language and one registered dietitian familiar with GI nutrition for food/research language. Record name, qualification, affiliation, conflict of interest, review date, source version, and exact approved wording. A blank field is not approval.

| Review item | Current source and locator | Decision to record |
| --- | --- | --- |
| Current-concern prompt: severe/constant pain, bleeding, chest pain, breathing difficulty; no automated urgency grade | [NIDDK indigestion symptoms and care guidance](https://www.niddk.nih.gov/health-information/digestive-diseases/indigestion-dyspepsia/symptoms-causes), “When should I seek help from a doctor?” | Approve exact wording / revise / block. Check whether “promptly” is appropriate for each sign and whether any must say emergency care. |
| Bloating overview: multiple possible contexts; diary cannot isolate cause | [NIDDK gas symptoms and causes](https://www.niddk.nih.gov/health-information/digestive-diseases/gas-digestive-tract/symptoms-causes), “What causes gas?” and related conditions | Approve exact wording / revise / block. |
| Abdominal discomfort, reflux, nausea, and bowel-change source notes | NIDDK URLs and locators in `src/services/GutPublicSourceGuide.ts` | Approve population, symptom scope, caveat and referral language separately. |
| Caffeine note: IBS evidence is largely observational/open challenge; no personal cause | [Monash University, caffeine and IBS](https://www.monashfodmap.com/blog/does-caffeine-affect-ibs-symptoms/) | Check applicability to a user who has not said they have IBS; approve/revise/block. |
| Dairy note: lactose intolerance is one possibility, not a diary diagnosis | [NIDDK lactose intolerance](https://www.niddk.nih.gov/health-information/digestive-diseases/lactose-intolerance/symptoms-causes) | Check symptom wording, allergy distinction, and avoidance of unnecessary restriction. |
| Personal comparison: explicit with/without/unknown/conflict, timing, no cause inference | `GutResolutionService.ts`, `GutConclusionCard.tsx`, sample output for mixed/conflicting/zero records | Check interpretation, action prompts, and whether any label could be read as a safety verdict. |
| Care summary and Case Prep return | `GutCurrentConcernService.ts`, `GutLinkedQuestionSummary.tsx`, Case Prep output | Check patient versus clinician provenance and whether source dates can be mistaken for symptom onset. |

**Approval record:** reviewer ___; qualification ___; reviewed code/content revision ___; items approved ___; exact edits required ___; source passage/location checked ___; date ___; signature/record URL ___. Publish a reviewed claim into `GutReviewedEvidence.ts` only after its exact passage, population, comparator, outcome, limitations, reviewer and date are captured. A source link alone does not satisfy this gate.

## 2. Moderated user study to coordinate

Recruit **8 people** if possible: four with a diagnosed gut condition and four with undiagnosed digestive concerns; include at least three people who primarily use a narrow phone. Avoid recruiting only existing HealthChain users. Give each participant a staging account with invented records. Do not coach them through the UI. Ask them to think aloud; after each task, ask what they believe the product concluded. Record anonymous participant ID only.

### Tasks and fixtures

1. **First use, no records:** “You noticed pain after lunch today. Open Gut Health and decide what this screen can help you do now.” Fixture: no saved meals or digestion reports. Observe whether they see the care guidance, understand that no cause was found, and can produce a patient-labeled summary or decide to seek care.
2. **Question with existing evidence:** “You wonder whether chai is connected with bloating.” Fixture: one chai meal with an explicit bloating report, one chai meal with no outcome; names/preparations differ. Observe whether they confirm the suggested meal/symptom, find the conclusion and action, inspect a source, and refrain from calling chai a proven cause.
3. **Research fit:** Ask them to explore caffeine or dairy from the same question. Observe whether they can state what the source discusses, whether it fits them, and what is still unknown. A paper title must not be mistaken for a treatment recommendation.
4. **Visit and return:** Add the question to Case Prep, enter a clearly patient-reported visit note, return to Gut Health, and explain what changed. Correct the note and verify the return view changes. No test should assert a clinician diagnosis from patient-entered text.
5. **Mobile/assistive pass:** Run the first and second tasks at 320 px and 200% browser zoom; check keyboard and screen-reader reading order, labels, source links, and primary action visibility. Include reduced motion.

### Questions to ask without leading

- “In one sentence, what did you learn from your own records?”
- “What does the research say, and what does it *not* say about you?”
- “What would you do next, if anything?”
- “What, if anything, felt confusing or made you worry more?”
- “Would this have helped a real decision or visit you have had? What was missing?”
- “Would you pay $20 per month for this as it works today? Why or why not?”

### Scorecard (fill after observing)

| Participant | Task completed unaided? | Correct personal conclusion? | Separates research? | Finds next action? | Time to first useful reading | Concern/food restriction triggered? | Concrete value quote | $20 willingness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P01–P08 |  |  |  |  |  |  |  |  |

Predeclared gates: at least **80%** correctly explain their conclusion and next action; at least **80%** distinguish personal records from general research; median first-use path under **3 minutes**; no observed increase in unnecessary food restriction or worry. Record all failures verbatim, change the design, and rerun failed tasks. Payment willingness requires direct participant evidence; repeat opens or test counts are not proof.

## 3. Release decision record

Record staging URL/SHA ___; test account scope and deletion ___; clinician content approval ___; authenticated two-device/RLS result ___; 320/390 px and 200% zoom result ___; user-study results ___; unresolved failures ___; rollout flag/rollback owner ___. Until these are filled, describe Gut Health as an implemented source-aware aid, not an independently clinically reviewed or validated $20/month health outcome.
