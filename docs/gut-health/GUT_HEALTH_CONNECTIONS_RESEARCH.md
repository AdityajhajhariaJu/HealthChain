# Gut Health: connected product research and implementation roadmap

Research date: 25 September 2026. “ISB” is interpreted here as **IBS**; the product must also serve people with gut concerns who do not have an IBS diagnosis.

## Honest assessment

HealthChain has more than a diary: question threads, explicit meal outcomes, conflicting report handling, a dated backtrace, source drilldown, research lookup, a decision planner, a separate food trial record, and a Case Prep handoff. Yet these sit behind separate screens. The user sees a question launcher before seeing the *relationship* among these assets. The result can feel like a generic form with extra pages.

The new **Living Question Map** makes the first layer of those relationships visible inside a question. It is a first product step, not a claim that the whole experience is complete. It shows counts from current records and lets a user expand meal reports, time/context, research, and next action. It keeps the evidence types separate and opens exact source records. The map must continue to evolve into a typed, provenance-aware graph rather than accumulating decorative connectors.

## What established products already do

| Product | Verified capability | Lesson for HealthChain |
| --- | --- | --- |
| [Monash FODMAP app](https://www.monashfodmap.com/get-app-help/) | Tested food guide, diary for food/symptoms/bowel/stress, clinician export, and structured reintroduction. | A diary and a food list are table stakes. A useful pathway should help with a specific decision and avoid unnecessary restriction. |
| [mySymptoms](https://www.mysymptoms.net/ios-user-guide/) | Configurable time windows, correlation rankings, onset-delay charts, and event drilldown. Its own guide states that correlation does not identify cause. | Automatic “trigger” scores are neither novel nor sufficient. Show counterexamples, missing data, and the source behind any association. |
| [Cara Care](https://cara.care/en) | Food/symptom tracking, personalized program, recipes, and mind–body exercises. | A program can feel coherent when tracking feeds guidance; disconnected modules do not. |
| [Nerva](https://faq.nervaibs.com/hc/en-us/articles/21424449279641-What-is-Nerva) | A six-week gut-directed hypnotherapy program followed by maintenance. | Repeated value can come from a focused intervention, not more things to log. HealthChain should not imply its general research screen is a therapeutic program. |
| [FoodMarble](https://foodmarble.com/more/ibs/) | A device-backed baseline/reset/discovery journey combining meals, symptoms, and breath readings. | A staged investigation gives people a reason to return. Its measurements and claims cannot be imitated without the device and validation. |
| [Mahana IBS](https://accessgudid.awsprod.nlm.nih.gov/devices/00860006172015) | A prescription digital therapeutic delivering CBT for IBS. | A treatment claim requires a different evidence and regulatory path from a consumer reasoning aid. |
| [TummyTrials study](https://pmc.ncbi.nlm.nih.gov/articles/PMC5432136/) | Feasibility of low-burden single-person food experiments, while documenting the difficulty of preserving rigor in daily life. | A carefully bounded “test one question” workflow is promising, but should not be sold as causal proof. |

**Positioning:** HealthChain cannot honestly claim that food correlation, a symptom map, or personal experiments are world firsts. Its potential distinction is an integrated *question-to-decision record*: the person can see what they reported, what else could explain it, which research applies generally, what is unknown, what they chose, and what happened at a visit. That combination is a product hypothesis to validate with users, not a proven clinical outcome.

## Clinical and reasoning boundaries

- The [ACG IBS guideline](https://webfiles.gi.org/links/PCC/ACG_Clinical_Guideline__Management_of_Irritable.11.pdf) supports a limited low-FODMAP trial and suggests gut-directed psychotherapies for global symptoms. The app should not turn an observed coincidence into an unsupervised long-term exclusion diet.
- [NICE IBS guidance](https://www.nice.org.uk/guidance/cg61/chapter/recommendations) calls for clinical assessment of red flags and specialist expertise for exclusion diets. A new or concerning symptom must route to care guidance before pattern exploration.
- The [British Society of Gastroenterology guideline](https://doi.org/10.1136/gutjnl-2021-324598) describes multiple food-related mechanisms and gut–brain factors. A one-food/one-symptom graph omitting stress, illness, medication context, and timing can be misleading.
- The [TummyTrials feasibility work](https://pmc.ncbi.nlm.nih.gov/articles/PMC5432136/) found everyday self-experimentation possible but methodologically difficult. A voluntary experiment needs clinician review gates, a defined question, measured outcome, and a stopping rule.

Use five distinct edge labels in the product: **explicitly linked report**, **same-date context**, **reported time sequence**, **general research**, and **care follow-through**. Never display these as equivalent evidence. Missing data remains unknown. A dated meal does not prove symptom timing; a medication note does not prove a dose was taken. Every displayed edge must have a source ID, account/profile scope, revision when present, and a way to inspect or correct the source.

## The intended everyday journey

1. **Choose one job.** The four textured cards choose current concern, decision, pattern, or care question. One question opens a thread; the user need not complete a broad intake.
2. **Get a useful first answer from existing data.** The Living Question Map shows actual linked reports and gaps. If the answer needs one missing fact, ask for that fact only at the relevant moment.
3. **Inspect the chain.** Expand a node to see specific meals, explicit outcomes, same-date alternatives, time precision, and research. Opening a source goes to that exact record.
4. **Choose one safe move.** Examples: clarify an unreported outcome, compare two real occasions, prepare a clinician question, or continue a clinician-reviewed food trial. Do not create an automatic restriction recommendation.
5. **Return for a reason.** A new record changes the answer and produces a change receipt. A case outcome or user reflection closes or revises the question. A streak or daily notification is not the primary value.

## Current code and the next tickets

### Released in this change

- **C0 — Visible source-aware map.** `GutConnectionTrail.tsx` brings existing derived records, context, research state, and next step into a 2×2 expandable map on each thread. Sources open by ID. Exact source navigation no longer opens an unrelated digestion date dialog.

### Next implementation tickets, in dependency order

| Ticket | Concrete work | Acceptance test |
| --- | --- | --- |
| C1 — Typed connection graph | Add a pure `GutConnectionGraph` service with typed nodes/edges, provenance, source revision, account/profile scope, and edge meaning. Derive it from current Gut, Diet, observation, trial, and Case Prep stores. Replace ad hoc counts in the map. | Same-date context never increments explicit symptom evidence; changing a source revision updates the graph; cross-profile edges are rejected. |
| C2 — Honest time anchor | Let the person optionally provide symptom onset with exact/approximate/date-only precision. Keep question-save time distinct. Recompute backtrace only from confirmed occurrence data. | A question saved days after symptoms does not present its save time as symptom onset; date-only events never appear in an hourly order. |
| C3 — One missing fact | For a focused meal question, select one informative unknown occasion and ask whether the chosen symptom was present. Skip if records conflict, source ID is unstable, or the person does not know. | Answer updates only that source-linked occasion; “I don't know” remains unknown; no daily questionnaire is created. |
| C4 — Alternative explanations | Reveal medication *notes*, illness/sleep/stress contexts, other meals, and conflicting reports as separate branches with exact source drilldown. Do not calculate a causal score from sparse records. | Users can open each context source; medication notes are never labeled taken doses; a counterexample remains visible. |
| C5 — Decision and follow-through | Connect decision options, selected priority, actual choice, user-reported outcome, and Case Prep follow-through back to the originating question. | The thread shows what changed after a real decision or visit, including provenance; no clinician finding is fabricated. |
| C6 — Research applicability | Show condition/population/intervention/outcome limitations alongside citations and publication notices; link the research node to the person's question *topic* only, never send personal text to the search service. | A pediatric study is flagged for an adult question; source URL and limitation remain visible; private meal text never enters the search query. |
| C7 — Trial gate | Keep new restriction/challenge flows behind independent clinical review. When approved, require a narrow question, baseline, optional reminders, stopping rule, clinician/dietitian guidance where indicated, and evidence provenance. | No trial begins from a correlation alone; stop/pause and adverse symptom paths are reachable. |
| C8 — Outcome validation | Run moderated tests with people who have and lack an IBS diagnosis. Measure question-to-useful-next-step completion, source inspection, interpretation of uncertainty, care-brief usefulness, and logging burden. | Participants can explain the difference between a recorded association and a cause; the median path does not require routine daily logging. |
| C9 — Production verification | Exercise authenticated two-device sync, profile switching, source revisions, deletion, browser/mobile layout, and independent clinical review of care copy. | No wrong-profile source appears; source changes refresh the thread; reviewers sign off before treatment claims or trial expansion. |

## Design rule for a $20 subscription

The user should be able to name a real benefit after one session: “I know what my records do and do not show, and I know the next useful question or care step.” Richer graphs are worthwhile only when they shorten that path. The product should report uncertainty honestly and make a return visit valuable when *something changed*, rather than make people feel obliged to feed an endless tracker.
