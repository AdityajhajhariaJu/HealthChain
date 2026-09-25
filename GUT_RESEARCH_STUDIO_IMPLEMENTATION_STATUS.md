# Gut Research Studio implementation status

Updated 26 September 2026. This file records what the current production-master code does and what remains a release gate. It does not claim clinical effectiveness or a finished research synthesis.

## Implemented in this slice

- The four existing Clinical onboarding icon cards remain the first step. One question opens a short, source-aware reading. The visible UI has three textured actions: personal records, general research, and a next step. The diagram and source map were removed after owner feedback.
- A pure typed dossier projection distinguishes explicit with/without reports, unresolved outcomes, same-date context, and timed context. Exact source routes stay available. Foreign-profile questions cannot link current-profile meals.
- A user can optionally enter exact or approximate symptom onset; it is stored separately from question creation time and used as the backtrace anchor. Without it, the browsing window is explicitly anchored to the saved question.
- The optional comparison of two saved meal names, one missing-fact explanation, connected questions, source change receipt, and research-source status check sit behind relevant disclosures and paths. A source correction or retraction is shown as publication metadata change, never an automatic personal verdict.
- The Study Bridge presents title/index-based population and topic cues while marking comparator, measured outcome, and setting unknown until verified. Research requests continue to use generic whitelisted symptom/topic terms, without sending question text or meal names.

## Verification completed

- TypeScript, ESLint, production build, 504 unit tests, migration contract (25 SQL files/17 schema checks), anonymous Supabase smoke check, and the Gut browser journeys in Chromium and WebKit.
- The 320px and 390px first-use and source flows were checked; the simplified screen was visually inspected at desktop and mobile sizes.

## Gates still open

- Independent clinician/dietitian review of the exact health copy, any study findings, and any future food challenge protocol. The app must not turn a paper title or observational association into a treatment instruction.
- Authenticated two-device/profile sync and RLS verification with real accounts. The anonymous smoke test cannot establish this.
- Source-span-reviewed study findings, guideline-version monitoring, and clinical synthesis. The current Study Bridge is deliberately metadata-only; the source status check does not monitor guideline changes or infer a new evidence conclusion.
- Moderated user research, accessibility review at 200% zoom, food-fear and task-success measures, and willingness-to-pay testing before claiming the experience is clinically beneficial or worth $20/month.

The earlier ticket definitions and acceptance gates remain in `GUT_RESEARCH_STUDIO_IMPLEMENTATION_PLAN.md`. Do not mark those gates complete solely because this code is deployed.
