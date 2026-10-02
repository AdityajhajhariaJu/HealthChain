# Gut and clinical verdict regressions

The October 2026 real-example audit found missing counterexamples, flattened conflicting reports, lost meal preparation and onset, unsupported conclusions surviving in secondary views, and urgent advice losing priority. These fixes apply to the verdict workflows; they do not constitute clinical validation of the app.

## Evidence and interpretation

- Gut requests select up to 12 occasions across conflicting, negative, positive and unknown outcome groups. Aggregate counts still cover every matching record. The app owns the displayed record-count sentence.
- Each report retains its source-specific answer, revision and occurrence precision. Confirmed preparation is scoped to that occasion. Exact onset ordering is distinct from date-only or approximate timing.
- Research inputs preserve population cues and correction notices. Citation passages include results and conclusions, with personal evidence reserved before paper excerpts. Source links establish provenance, not medical entailment.
- A saved Gut reading becomes stale when its question, records, guidance, research contents or version changes, including corrections to a paper with the same PMID.
- Clinical biomarker values and printed ranges bind to their own marker. Dates come from the source; sample collection dates take priority over report dates when available. Unknown units remain unknown.
- Same-marker, same-date measurements can enter the correction queue. Different-date changes remain longitudinal observations. Ambiguous numeric dates do not acquire an assumed order. Gaps describe intervals between supplied records, not an absence of symptoms or care.
- Specific unsupported diagnoses, definitive causes, invented quantities and mismatched measurements are withheld. Supporting and conflicting citations both participate in checks. Verified same-unit differences can be calculated; arbitrary statistical confidence cannot.
- A rejected claim withholds the review's interpretations, comparison, questions and model red flags across the main answer and secondary views. Original source facts remain visible.

## Care priority and saved reviews

Urgent guidance is visible while entering Gut or clinical concerns, before authentication or provider calls. The service also returns a local emergency result without a Gemini request. Bleeding or unintended weight loss receives prompt assessment guidance. Breathlessness with a recent hemoglobin value below its own printed range receives assessment priority; the range comparison does not diagnose a cause.

The phrase screen handles common denials, compound negation and clearly resolved history. It is not a complete triage system. A missing match means urgency was not assessed, not that symptoms are safe.

Clinical verdicts carry `verdictVersion: 2` alongside the existing grounding contract. Earlier saved Jarvis interpretations require refresh from original records. The historical stored records are preserved. Gut uses `gut-reading-v3` and a new freshness marker.

## Reproduction

Run `npx vitest run` for deterministic regression tests. `npm run eval:model` runs 12 synthetic Gut examples and 7 clinical examples using production prompts, response validation and normalizers. Two emergency examples use the local path; 17 examples call Gemini. The harness replaces authentication, quota and persistence, so it does not validate those services. It never reports a simulated pass when a key is missing.

Configure `GEMINI_API_KEY` in the environment or `.env.local`; keys are sent in the provider header. `VERDICT_EVAL_OUTPUT` optionally writes the synthetic run to a chosen local path. Output may contain source abstracts and must not be committed as a build or report artifact. Live responses can vary; assertions and manual inspection complement each other.

The browser regression suites are `clinical-grounding.spec.ts` and `gut-reasoning-flow.spec.ts`. They check offline urgent notices, mobile layout, persistence, refinement, source views and old-review refresh behavior.

Care wording was checked against [NHS chest pain](https://www.nhs.uk/symptoms/chest-pain/), [NHS stomach ache](https://www.nhs.uk/symptoms/stomach-ache/) and [NHS iron deficiency anaemia](https://www.nhs.uk/conditions/iron-deficiency-anaemia/). The local quantity and claim checks cover specific failure patterns; they are not a general proof of every sentence's clinical correctness. Expert clinical and user validation remains necessary.
