# AI feature and hosting review — 5 October 2026

The operator wants to preserve the main app. No blanket redesign or feature removal is required by this review. See CURRENT_LAUNCH_STATUS.md for the current facts.

| Reachable flow | Current behavior | Boundary to verify |
|---|---|---|
| Case review | Organizes source facts, possibilities, gaps and clinician questions; normalizers suppress ranked diagnoses, test orders and treatment/diet swaps. | Review actual generated explanations, rather than treating a prompt as a guarantee. |
| Ava | Health explanations and user-selected record context. | Check fabricated facts, diagnosis assertions, medicine changes and treatment instructions. |
| Gut reasoning | Source-linked reports, counterexamples, research context and recorded timing. | Associations must not become diagnoses or treatment. The disputed-record false rejection is fixed: future assessment wording is allowed, while definitive diagnoses/causes remain blocked. |
| Meal planning | Preferences, ordinary planning and supplied constraints. | Unknown conditions/allergies must stay unknown; do not claim disease treatment or proven benefit. |
| Lab/document extraction | Transcribes original values/ranges and explains terms. | Check fidelity; do not invent units, dates or optimal targets. |
| Unused exports | No production UI caller was found for checkDrugInteractions, runDifferentialAnalysis, selectMDTSpecialists, chatWithMDTSpecialist, generateMDTReport or generateCasePrepAnalysis. | Definitions/allowlisted operation names are not proof of a current screen feature. Review before connecting them to released UI. |

Current corrections remove unsupported claims about wearable score weights, biological forecasting and missing allergy/condition information. Existing screens and core workflows remain.

[Gemini terms](https://ai.google.dev/gemini-api/terms) prohibit clinical practice/medical advice, under-18-directed/likely-under-18 clients and unsupported-region access. Adult self-attestation now precedes workspace, onboarding and checkout. India, UK, Germany, Switzerland, Italy, Australia, USA and Brazil are [supported regions](https://ai.google.dev/gemini-api/docs/available-regions). Worldwide intent does not establish provider access everywhere. Source/output tests are not Google's approval.

## Hosting completion

The logged-in Vercel team is Hobby. [Hobby](https://vercel.com/docs/plans/hobby) permits personal non-commercial use only. The [standard DPA](https://vercel.com/legal/dpa), in its stated Pro/Enterprise scope, prohibits sensitive/special-category Customer Data.

The prepared completion path preserves the UI and Gemini provider: move sensitive AI, deletion and trial-search requests directly to Supabase. Its staged function passes five live boundary probes; frontend activation waits for server secrets and account checks. A signed country proof checks the official available-country list before AI input consumption. The website requires a commercial-eligible Vercel plan, but ordinary Pro alone does not establish health-data permission. A HIPAA BAA applies to a relevant HIPAA workload; this does not classify every consumer health app as HIPAA-regulated. No paid upgrade, contract acceptance or feature shutdown was performed. See `HEALTH_BACKEND_ACTIVATION.md`.
