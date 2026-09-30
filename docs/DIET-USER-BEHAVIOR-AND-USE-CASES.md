# Diet: user behavior, expectations and mini-feature review

30 September 2026 · HealthChain360 · Research and product specification

## 1. Verdict

Diet is not yet complete across every everyday use case. The production repairs establish specific generation, recovery, persistence and connection workflows. The location release adds country/region to onboarding and subsequent meal generation. Those results do not establish complete personalization, a finished daily experience, or flawless nutrition answers.

This review combines current source inspection with published behavior research and official competitor documentation. **The user thoughts and journeys below are design hypotheses, not quotations from HealthChain customers or findings from our own user study.** People can have several needs at once, and their needs can change between days. Country, age, weight and diagnosis should not be used to guess personality, motivation, religion or willingness to share data.

The central product question is: **Can this person make a useful food decision and record reality with the time, money, food and energy they actually have today?**

## 2. What psychology changes in the design

### 2.1 People need capability, opportunity and motivation

The COM-B framework considers skills/knowledge, the person's environment/resources, and motivation together. A motivated person may still have no kitchen, little money, a night shift or a family that chooses dinner. A useful design should address these constraints rather than interpret non-use as poor discipline. [Original COM-B research](https://link.springer.com/article/10.1186/1748-5908-6-42)

Design hypothesis: ask about cooking time, equipment, cost and household control before producing a plan. Make instructions understandable to beginners. Let people keep familiar meals and choose the level of tracking they want.

### 2.2 Every entry creates work

A qualitative study involving people with low or medium socioeconomic status identified burden of use, privacy and cost as barriers; some participants described abandoning apps after difficult data entry or failure to find a food. This is evidence from that study population, not a universal abandonment rate. [Nutrition barriers study](https://humanfactors.jmir.org/2022/4/e40123/)

Design hypothesis: a repeated breakfast should take fewer steps than a first-time recipe. An unknown food should still be recordable. Favorites, recent meals, copy yesterday and corrections are central features, not decorative extras.

### 2.3 People may record a better-looking day instead of an honest day

Interviews within an attentive-eating app trial described discomfort taking meal photos socially, difficulty fitting the app into routines, and less recording when participants expected judgment. Some found missed rewards demotivating. The parent trial did not establish an overall weight-loss benefit from the app; the qualitative findings inform design rather than prove a treatment effect. [User-experience study](https://mhealth.jmir.org/2020/10/e16780/)

Design hypothesis: support discreet text or later logging, make missing entries neutral, and reward useful participation without ranking food or bodies. Honest records are more useful than an impressive streak.

### 2.4 Returning should feel easy

NIDDK describes habit change as a process with planning, barriers and setbacks, and encourages regrouping after setbacks. This supports a recovery-oriented experience. [NIDDK habit-change guidance](https://www.niddk.nih.gov/health-information/diet-nutrition/changing-habits-better-health)

Design hypothesis: after five missed days, offer “Continue from today,” “Adjust my plan,” and optional backfill. Do not make reconstructing the entire gap a condition of returning.

### 2.5 Detailed numbers can create misplaced confidence

Product reasoning: a total of 2,114 kcal can look precise even when it came from estimated ingredients and portions. Matching a daily target mathematically does not verify the real nutrient content. Show whether a value came from a package label, a food database, manual entry, or an AI estimate. Keep unknown values distinct from zero and make assumptions easy to inspect.

### 2.6 Some people need less numerical tracking

A systematic review of 27 studies found associations between diet/fitness tracking and disordered eating in cross-sectional research, while experimental research did not reproduce that association. It does not establish that tracking causes eating disorders for everyone. [Systematic review](https://pubmed.ncbi.nlm.nih.gov/40640999/)

Design hypothesis: offer an optional experience without calorie rings, weight goals or streak pressure; let users keep qualitative meal and wellbeing records. Avoid “earn food,” “burn off dinner,” shame notifications and automatic compensatory restriction.

### 2.7 Personalization must remain under the person's control

Product reasoning: a recommendation should explain the input that shaped it—country, cuisine, available time, ingredients or stated goal—and offer an easy correction. Do not infer an emotional condition from missed logs or use private health records to pressure someone into engagement. Ask whether reminders or adaptation are wanted.

## 3. The situations we need to serve

These are contexts to recruit for research, not permanent customer labels.

| Situation                                       | Likely thought / need                                   | What would make the experience useful                                                               |
| ----------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Busy worker or student                          | “I have 15 minutes and very little energy.”             | Few ingredients, low preparation effort, repeat meals, leftovers, fast logging.                     |
| Family cook                                     | “Four people eat together; I do not want four menus.”   | Household recipe quantities, individual portions, family-friendly alternatives and shared shopping. |
| Person living abroad                            | “I live in Germany but usually cook South Indian food.” | Residence and cuisine as separate preferences; accessible substitutions and multilingual names.     |
| Person on a tight budget                        | “I cannot buy a special ingredient for one meal.”       | Budget bands, pantry use, repeated ingredients and waste reduction; no invented local prices.       |
| Person building a routine                       | “Help me make one useful change.”                       | Small optional goals, understandable portions and supportive review.                                |
| Experienced nutrition tracker                   | “I want to inspect and correct the numbers.”            | Sources, gram-based portions, raw/cooked distinction, recipe yield and exports.                     |
| Person observing digestive symptoms             | “What did I eat, when, and what happened afterward?”    | Reliable times, uncertainty, explicit no-symptom check-ins and cautious pattern summaries.          |
| Person with documented medical or allergy needs | “Does this really respect my restrictions?”             | Clear eligibility, ingredient verification and clinician-supported pathways; no guessed safety.     |
| Person uncomfortable with calorie tracking      | “Help me with meals without grading me.”                | Qualitative tracking, adjustable feedback and no compulsory weight target.                          |
| Traveler, shift worker or irregular eater       | “My day does not look like breakfast at 8.”             | Temporary location, chosen meal times, flexible slots and correct dates/time zones.                 |

## 4. Complete use-case and expectation inventory

**Status key:** Present = a path exists in inspected code or prior recorded verification; Partial = useful foundation with a specific gap; Proposed = an additional capability to design/validate. Present is not a claim that every edge case has been tested.

### A. Setup and personalization

| Mini-feature / user expectation                 | Current position                                                                                          | Intended behavior                                                                                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| A1. Choose why I am here                        | Partial: food planning and logging exist; onboarding concentrates on nutrition targets.                   | Offer planning, simple logging, nutrition tracking and food/symptom observation. Allow more than one.                                      |
| A2. Country and region                          | Present: onboarding, profile and model request now connected.                                             | Explain why location is asked; use residence for availability and local dishes. Allow correction.                                          |
| A3. Preferred cuisine                           | Present: explicit cuisine can differ from residence.                                                      | Support familiar food, mixed cuisines and the person's own preferences without stereotypes.                                                |
| A4. Travel or moving country                    | Partial: location is editable.                                                                            | Offer temporary versus permanent change; preserve old plan context and old diary dates.                                                    |
| A5. Likes, dislikes and ingredients I never eat | Proposed: structured dislikes are not in the plan request.                                                | Ask directly; distinguish preference, religious choice, intolerance and allergy.                                                           |
| A6. Medical profile and dietary restrictions    | Partial: stored, but automatic generation blocks saved restrictions/allergies rather than verifying them. | Show the limitation before generation, preserve manual logging, and provide a verified pathway before claiming restricted personalization. |
| A7. Budget and food availability                | Proposed.                                                                                                 | Ask a local-currency budget band or “keep it inexpensive”; do not invent grocery prices or stock.                                          |
| A8. Cooking time, skill and equipment           | Proposed.                                                                                                 | Ask maximum effort/time and available tools; distinguish active prep from elapsed time.                                                    |
| A9. Household size and who chooses meals        | Proposed.                                                                                                 | One household recipe with each person's portion; account for shared meals without copying private health goals to everyone.                |
| A10. Routine, units and tracking preference     | Partial: units and three supported meal schedules exist.                                                  | Match the diary to the chosen schedule; allow grams and meaningful household measures, custom times and optional numerical tracking.       |

### B. Meal ideas and planning

| Mini-feature / user expectation             | Current position                                                              | Intended behavior                                                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| B1. “What can I eat now?”                   | Partial: week planning exists; empty meal-card suggestions open the log form. | Offer two or three practical ideas based on time, cuisine and available ingredients; separate this from recording a meal.                |
| B2. Plan only what I need                   | Partial: automatic generation is a fixed seven-day request.                   | Allow a dinner, one day, work lunches or selected days without demanding a whole new week.                                               |
| B3. Complete weekly plan                    | Present: generation, recovery and saving previously verified.                 | Match confirmed preferences, show assumptions, preserve current work on failure, and explain access/quota before the action.             |
| B4. Recipes I can actually cook             | Present: measured drafts, steps and preparation time.                         | Specify raw/dry/cooked quantities, oil, recipe yield, portion size and optional ingredients. Avoid unrealistic timing.                   |
| B5. Simple replacement                      | Partial: manual replacement exists.                                           | Let me choose “too costly,” “unavailable,” “too slow,” or “do not like it”; show alternatives and the nutrition effect before accepting. |
| B6. Change quantity                         | Present: serving multipliers and manual edits.                                | Keep ingredient quantities, estimated nutrients, grocery list and the amount actually eaten consistent. Add household yield.             |
| B7. Keep meals I like                       | Partial: editing and archives exist.                                          | Pin accepted meals, replace only selected meals, and keep corrections during regeneration.                                               |
| B8. Reuse and batch cook                    | Proposed.                                                                     | Repeat meals deliberately, use leftovers and record the fraction of a cooked batch eaten.                                                |
| B9. Calendar dates and meal timing          | Partial: plan days are numbered and diary dates are separate.                 | Make “Day 3” map to a visible date; distinguish planned time from eaten time; support moving a meal.                                     |
| B10. Pause, resume, complete and past plans | Present: multiple lifecycle states and archives.                              | Use simple actions and a clear history; pausing should not erase meals or imply failure.                                                 |

### C. Logging actual food

| Mini-feature / user expectation          | Current position                                                                                                | Intended behavior                                                                                                                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| C1. Type what I ate                      | Present: plain-language analysis and shared quick intake.                                                       | Save useful meal descriptions even if nutrients or grams are unknown; preview estimates before relying on them.                                 |
| C2. Recent meals and favorites           | Partial: curated and plan-derived presets.                                                                      | A true personal library: my meals, recipes, brands, usual quantities and recent entries.                                                        |
| C3. Copy a routine meal or yesterday     | Proposed.                                                                                                       | Copy as a new diary entry with editable date/amount; do not duplicate the entire day accidentally.                                              |
| C4. Voice entry                          | Partial: shared quick intake uses browser speech when supported, with en-IN fixed.                              | Match chosen language, show the transcript, allow correction and provide text fallback.                                                         |
| C5. Food photo                           | Present: camera/upload estimate flow; actual live image analysis was outside the previous browser verification. | Ask what is hidden or ambiguous—oil, fillings, quantity—and make review and retake easy. A photo is not a scale.                                |
| C6. Packaged item                        | Present: photographed labels normalized to per 100 g.                                                           | Show per 100 g and my consumed amount separately; keep source, serving conversion and label corrections visible.                                |
| C7. Barcode product lookup               | Proposed: inspected scanner has no product-catalog barcode resolver.                                            | Match the exact product and country/version; if missing, offer a label photo or manual entry without guessing.                                  |
| C8. Portion and recipe yield             | Partial: grams, serving multipliers and editable quantities exist.                                              | Support bowl/piece/ml/grams where meaningful, specify uncertainty, distinguish raw and cooked food, and calculate batch portions.               |
| C9. Confirm a planned meal was eaten     | Present: explicit confirmation, duplicate prevention.                                                           | Offer “as planned,” “different amount,” and “different meal”; generation alone must never mark food as eaten.                                   |
| C10. Restaurant, canteen and mixed meals | Partial: free-text/photo routes can capture them.                                                               | Allow a rough description and missing nutrients; do not present an exact answer without portion and recipe evidence.                            |
| C11. Date and actual time                | Partial: date navigation and quick timing offsets exist.                                                        | Let me log yesterday or an approximate time without inventing precision; make the selected diary date visible at confirmation.                  |
| C12. Correct, delete and undo            | Partial: correction and deletion exist.                                                                         | Make mistaken taps reversible and preserve previous recipe/assessment provenance; editing a recipe should not silently rewrite old eaten meals. |
| C13. Offline capture and sync            | Present foundation: local saves, queues and aggregate status.                                                   | Show local versus cloud state; preserve entries through retries and explain a failure without asking users to repeatedly re-enter food.         |
| C14. Optional meal context               | Proposed for the primary Diet flow.                                                                             | Optional hunger/fullness, setting and notes; users choose what to record. Do not demand emotional disclosure.                                   |

### D. Shopping and practical cooking

| Mini-feature / user expectation         | Current position                                           | Intended behavior                                                                                                                                               |
| --------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1. Calculate the list from meals       | Present: measured plan quantities and serving multipliers. | Follow the chosen plan revision and included dates; show when the list becomes stale.                                                                           |
| D2. Already in my pantry                | Proposed.                                                  | Subtract stock explicitly; keep “already have,” “bought,” and “remove from this list” distinct.                                                                 |
| D3. Ingredient names and shopping units | Partial: grouping uses normalized text and exact units.    | Resolve synonyms carefully, avoid duplicate “curd/yogurt” entries when equivalent, organize store sections and distinguish recipe amount from package quantity. |
| D4. Household shopping and waste        | Partial: checkboxes and text copy exist.                   | Share a practical list, add manual items, account for servings/leftovers and avoid buying a single-use ingredient unnecessarily.                                |

### E. Understanding the day and symptoms

| Mini-feature / user expectation | Current position                                                       | Intended behavior                                                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1. Daily overview              | Partial: nutrient rings and meal feed exist, but five slots are fixed. | Follow the user's schedule and tracking mode; show known nutrition and incomplete data clearly.                                                      |
| E2. Useful feedback             | Partial: totals and guide cards exist.                                 | Answer one relevant question or offer a small next step; avoid grading the person or treating a partial diary as the complete diet.                  |
| E3. Water logging               | Present: shared hydration, add/remove quantities.                      | Support bottle sizes and corrections, consistent totals across screens and optional goals; medical fluid limits require a reviewed pathway.          |
| E4. Post-meal reaction timeline | Partial: today-only list, currently limited to six recent entries.     | Let me find older meals, see exact/approximate/unknown times and add a delayed reaction; absence of a report is unknown.                             |
| E5. Digestion calendar          | Present: dated symptom/stool observations and no-data states.          | Distinguish no record, checked without symptoms and reported symptoms; keep corrections and privacy simple.                                          |
| E6. Food/symptom insights       | Present foundation: observed same-day matches and comparative counts.  | Show denominators, missing days and timing limits; require sufficient evidence before emphasizing a pattern; no automatic causal food ban.           |
| E7. Discuss with Ava            | Present: the plan handoff was previously verified.                     | Bring the actual plan or selected diary records, their date, source and uncertainty; let me ask a practical question and review what will be shared. |
| E8. Guardrails / meal guide     | Present: guide generation previously verified.                         | Explain a few relevant planning constraints; a generic guide is not proof that every suggested ingredient is safe.                                   |
| E9. Rainbow food variety        | Present as a separate self-reported color checklist.                   | Make its meaning clear and keep it optional; color ticks must not manufacture nutrient intake or disease protection.                                 |
| E10. Movement / posture timer   | Present in the Longevity area.                                         | Optional supportive activity; do not present exercise as payment for eating or imply guaranteed glucose benefits.                                    |

### F. Trust, support and accessibility

| Mini-feature / user expectation                    | Current position                                                                                 | Intended behavior                                                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1. Nutrition provenance                           | Partial: uncertainty and source foundations exist; generated recipes are estimates.              | Source/amount/assumption visible on every assessment; prefer verifiable ingredient or label evidence when available.                                                 |
| F2. Reminders                                      | Partial: check-in, medicine and hydration infrastructure; no dedicated meal/prep category found. | Opt-in, chosen time, quiet hours, snooze, duplicate suppression and supported-platform delivery status. Never promise a closed-browser reminder from an in-app card. |
| F3. Progress without pressure                      | Partial: vitality points and colorful progress exist.                                            | Optional numerical feedback; praise useful effort and restarting without promoting restriction or perfect streaks.                                                   |
| F4. Export and clinician discussion                | Present: printing, case export and Ava handoff.                                                  | Export date ranges and factual observations with source/uncertainty; clearly distinguish plans from consumed meals.                                                  |
| F5. Privacy and data control                       | Existing shared account/profile foundations; additional UX validation needed.                    | Private by default, clear sharing scope, editable/deletable data and no sensitive notification previews.                                                             |
| F6. Language, accessibility and device constraints | Partial: responsive layout and browser-dependent capture paths.                                  | Local food names and selected language, accessible controls, visible errors, low-bandwidth/manual alternatives and supported-camera/voice fallbacks.                 |

## 5. Concrete gaps found in today's implementation

These are source-confirmed behaviors or product omissions. They are not a fresh claim that every other function passed a complete live audit.

1. **Location-aware planning does not yet make the whole experience local.** Shared quick intake still uses Indian capsules and a fixed en-IN speech locale. Generalize examples, names, measures and language while preserving the user's selected cuisine. [Quick intake source](C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/ui/QuickMealIntakeSheet.tsx:57)
2. **Diary meal slots do not follow selected schedules.** The dashboard has a fixed five-slot configuration even though planning supports three meals, three meals plus a snack, or five smaller meals. [Dashboard source](C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dietician/DieticianDashboardTracker.tsx:92)
3. **“Saved Meals” does not yet mean a full personal favorites/recipe library.** Its list is derived from current-plan meals or curated presets; those choices cannot cover a person's normal food routine. [Diet source](C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dietician/Dietician.tsx:584)
4. **Suggestions can lead to logging instead of ideas.** The empty breakfast/lunch cards use suggestion or eating prompts but their action opens a log form. That breaks the expectation of someone who has not chosen a meal yet. [Dashboard copy](C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dietician/DieticianDashboardTracker.tsx:472)
5. **Restriction personalization is not finished.** The automatic-plan gate blocks any saved restriction other than None, and saved allergies. Even Vegetarian or Vegan currently triggers this gate. This protects against unsupported safety claims, but the UI must communicate eligibility early and the capability needs a properly verified design. [Generation gate](C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/dietPlanValidation.ts:3)
6. **Practical personalization fields are absent from the weekly request.** Budget, cooking capacity, dislikes, pantry and household servings cannot reliably constrain generation until they are collected, validated and used. [Gateway request](C:/Users/adity/OneDrive/Desktop/HealthChain-Live/shared/diet-plan-request.js:47)
7. **Grocery calculation has arithmetic foundations, not a complete shopping workflow.** Text-and-unit grouping cannot by itself resolve ingredient synonyms, pantry stock, package sizes or store sections. [Grocery projection](C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/dietGroceryProjection.ts:6)
8. **Timeline discovery is limited.** Only today's six latest meal records are shown in the inspected timeline. Older/later reactions need a deliberate history route. [Timeline source](C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/ui/PostMealReactionTimeline.tsx:149)
9. **Food reminder delivery needs an explicit feature contract.** The notification categories contain no dedicated meal/preparation reminder, and the daily-reminder service supports native scheduling. A browser test notification is not recurring background delivery. [Notification categories](C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/NotificationEngine.ts:8), [Scheduling support](C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/DailyCheckinNotificationService.ts:45)
10. **A photographed label is not a barcode lookup.** The scanner mentions a barcode in fallback copy, but the inspected app has no barcode-to-product catalog resolver. Avoid that expectation until implemented. [Scanner source](C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/ui/ARGroceryLens.tsx:859)

### Competitive expectation, with limits

MyFitnessPal's official setup describes goals, challenges, cooking time, dislikes, dietary restrictions and cuisine, and its planner connects meals to groceries. That is a useful benchmark for practical input collection, not proof of accuracy or a reason to reproduce every feature. [MyFitnessPal planner instructions](https://support.myfitnesspal.com/hc/en-us/articles/34603055097869-How-to-use-the-Meal-Planner)

Cronometer documents reusable custom meals, cooked recipe weight, food data sources and several logging methods. These demonstrate that frequent-food reuse, recipe yield and source visibility are established workflow capabilities in a competing product. Availability can depend on platform and subscription. [Custom meals](https://support.cronometer.com/hc/en-us/articles/17687459173908-Create-Custom-Meal), [Recipe weight](https://support.cronometer.com/hc/en-us/articles/28780966141204-Pro-Custom-Recipes), [Data sources](https://support.cronometer.com/hc/en-us/articles/360018239472-Data-Sources), [Logging methods](https://cronometer.com/blog/4-ways-to-log-food-on-cronometer/)

## 6. The user journeys to design around

### Journey 1: A tired person needs dinner now

Open Diet → choose “Meal ideas” → use confirmed location/cuisine → ask available time and ingredients only if needed → show three choices → inspect a simple recipe → replace one ingredient if necessary → optionally save the meal.

After eating, offer an editable actual amount and date/time before adding it to the diary. Choosing a recipe should not imply consumption.

### Journey 2: Plan and shop for a family

Choose days/meals and household servings → provide time, budget, pantry and restrictions → review plan → pin accepted dishes → replace rejected dishes without losing the rest → calculate groceries for the chosen dates → subtract pantry → share shopping → cook the recipe yield → log each person's actual portion privately.

### Journey 3: Record an ordinary breakfast

Open diary → see recent/favorite breakfasts → choose the usual meal → adjust today's quantity if needed → confirm visible date/time → save locally → show sync status. No need to regenerate a seven-day plan or re-enter ingredients every morning.

### Journey 4: Someone ate out and cannot know the recipe

Record dish/name or photo → optionally choose a rough amount → show uncertain/unknown nutrition → allow later correction. A useful incomplete record should be accepted without turning guessed oil or serving size into verified facts.

### Journey 5: Investigate a digestive concern

Record food and actual/approximate time → later record symptoms or explicitly no symptoms → review dates and contexts → show a cautious pattern with counts and gaps → bring selected records and questions to Ava/case prep. Do not automatically diagnose a food intolerance or recommend broad elimination from sparse matches.

### Journey 6: Return after a difficult week

Offer continue today, update routine, or pause tracking → preserve old records → resume with one useful action → provide optional backfill. Do not penalize the gap, guess what was eaten, or demand an explanation.

### Journey 7: A person changes country or works nights

Choose temporary/permanent location and preferred cuisine → retain food preferences → adapt ingredient access and meal slots → preserve past diary times → let the user confirm time zone changes and meal dates. Country alone does not determine cuisine, religion or schedule.

## 7. What onboarding should ask—and when

### Initial useful setup

1. What do you want help with today: ideas, planning, logging, nutrients or food/symptom records?
2. Where do you currently live? Country and optional region; explain the use.
3. What food do you normally like to eat? Local cuisine, another cuisine or a mix.
4. Are there foods you avoid, and why? Preference, religious choice, intolerance and allergy remain distinct. Medical disclosures should be optional with a clear explanation of limitations.
5. Do you want numerical nutrition targets or simple meal records? Biometrics are needed only for the supported estimation pathway, not for recording a meal name.

### Before planning recipes

6. Which days and meals do you need?
7. How much active cooking time do you have?
8. What equipment and cooking confidence do you have?
9. What budget range should the plan respect? Currency follows the user's choice, not an assumed nationality.
10. How many people eat the recipe, and do they share the same meals?
11. What ingredients do you already have?
12. What ingredients or dishes do you dislike?
13. Do you prefer variety, repeated meals, batch cooking or leftovers?
14. How often do you eat at a restaurant/canteen or rely on prepared food?
15. Do you have any clinician-set food or fluid limits that require a separately supported pathway?

### Ask later, only when relevant

16. Which portion units are familiar to you?
17. What are your actual meal times, including shifts?
18. Would a reminder help, and at what time? Ask notification permission after explaining that feature.
19. Would you like optional hunger/fullness/context notes?
20. When moving or traveling, should the location change be temporary?

Keep optional questions skippable, save progress, and let people edit one field without repeating an eight-step wizard. Progressive collection is a proposed design direction to test; it is not a proven optimal questionnaire length.

## 8. Work order

### First: make everyday promises consistent

- Align diary slots with the chosen schedule and correct idea-versus-log labels.
- Extend localization to quick intake, voice, examples, units and ingredient naming.
- Explain restricted-plan eligibility early; keep useful logging available and avoid unverified safety promises.
- Make original source, actual consumed portion and uncertainty visible throughout the diary/plan/scanner.
- Provide a personal favorites/recipe library and fast repeat logging.
- Provide clear old-history access and correct selected-date/time confirmation.

### Next: make plans usable in real life

- Add budget, time, equipment, dislikes, household yield and pantry preferences to collection, validation, generation and persistence.
- Add meal ideas, partial plans, pin/replace selected meals and reason-based substitutions.
- Add batch cooking, leftovers, raw/cooked weights and a practical grocery workflow.
- Add optional nonnumerical tracking and supportive restart experiences.
- Add opt-in meal/preparation reminders with tested platform delivery.

### Later: build on validated demand

- A curated country-aware product/ingredient catalog and dedicated barcode lookup.
- Recipe import, richer household collaboration and grocery-provider integrations where supported.
- Better long-term reviews based on record completeness and actual data.
- More local language/cuisine coverage informed by user testing.

No health-score badge, new ring or additional AI screen should take priority over these recurring tasks unless user research establishes a clear need.

## 9. How we validate the behavioral assumptions

### Proposed research—not completed research

Recruit roughly 12–18 people across the contexts in section 3, with different budgets, cuisines, languages, cooking access and tracking experience. This is a practical qualitative discovery sample, not a statistically representative estimate. Include people who stopped using a food app. Provide an alternative nonnumerical path for participants who do not want calorie tracking; involve appropriate clinical expertise for sensitive medical/restricted pathways.

Ask about a real recent day before showing the app:

- Walk me through choosing, obtaining and eating yesterday's meals.
- Who decided what you ate? What constrained the choice?
- Which food-app task did you postpone or stop doing, and why?
- What does “one serving” mean in your home?
- When would you choose text, a photograph, voice or a reusable meal?
- What would you expect Saved Meals to contain?
- What would you expect an app to do when you miss a day?
- Which numbers do you trust, and what evidence would change that trust?
- What reminder would help? What reminder would be unwelcome?
- What would make a meal plan realistic enough to use tomorrow?

Then observe tasks without coaching: plan a quick dinner, reject an ingredient, repeat breakfast, log a changed portion, record an unknown restaurant meal, find last week's food, check a package per 100 g versus consumed portion, and resume after a gap.

### Proposed acceptance measures

| Measure                                                   | What it answers                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| Unassisted task completion and wrong-turn count           | Can people do the intended task and understand each label?           |
| Time to repeat a usual meal versus first entry            | Does reuse reduce work?                                              |
| Corrections to portion, date, source and ingredients      | Are assumptions visible and controllable?                            |
| Planned meals actually used, and reasons for swaps        | Are time, taste, cost and availability constraints respected?        |
| Ability to explain estimate versus label-derived value    | Is trust calibrated?                                                 |
| Grocery omissions, duplicates and leftover waste          | Does planning become practical shopping?                             |
| Return after a missed day, optional reminder satisfaction | Is the experience supportive without pressure?                       |
| Self-reported usefulness, effort and discomfort           | Does engagement help the person rather than merely increase app use? |
| Save/reload/retry and account/device isolation checks     | Can the experience be trusted technically?                           |

Set targets after measuring a baseline. Retention or daily logging frequency alone cannot establish improved wellbeing or accurate records. Use consented, minimal analytics; do not collect sensitive meal/mood text simply to optimize engagement.

## 10. Definition of ready

Each important mini-feature needs: a clear user job; an understandable entry point; support for ordinary exceptions; correct connected data; honest uncertainty; recovery from a mistake or failure; appropriate privacy; and observed usability with relevant people.

The next product milestone should be **a coherent path from choosing food to shopping/cooking to recording what was actually eaten and reviewing useful observations**. Completion requires the behavioral and practical gaps above to be addressed and tested. It cannot be certified by a successful generation button alone.
