# Provider feature decision — 5 October 2026

**Feature/provider review proposal. No provider switch, paid upgrade or feature shutdown has been performed.** The operator subsequently authorized source publication: `74119209` was merged to `master` and the website policies deployed on 5 October 2026 with draft labels intact. This does not resolve the feature/provider decisions below or establish a store-ready release.

## Why a decision is needed

[Gemini API terms](https://ai.google.dev/gemini-api/terms) prohibit clinical practice and providing medical advice, API clients directed toward or likely accessed by under-18s, and access outside the available regions. The terms also distinguish paid processing from zero retention. Permission from a user and a disclaimer do not change the provider's permitted use.

Source review found remaining personalized medical interpretation alongside record-organization instructions:

| Source | Actual requested behavior | Review finding |
|---|---|---|
| `src/services/ai/investigation.ts`, `checkDrugInteractions` | Compare the person's medicine regimen and assign interaction severity | Personalized medication-risk assessment; cannot mark provider permission established. |
| `src/services/ai/consultation.ts`, `LAB_SYSTEM_PROMPT` | Former instructions mixed transcription with personal interpretation/lifestyle advice | Contradiction corrected to source-attributed transcription, term explanations and record-check questions. Actual output and the complete surrounding flow still need review. |
| `src/services/ai/collaboration.ts`, parallel report | Former instructions mixed record organization with new diagnoses/mechanisms/action plans | Corrected to conditions explicitly supplied in original records, attributed facts and record-check questions. Other specialist/differential stages still request personal assessments; the entire flow is not cleared. |
| `src/services/ai/investigation.ts`, differential flow | Generate possible conditions from personal symptoms and records | Calling these discussion pathways or setting confidence to zero does not establish that the behavior meets provider restrictions. |
| Specialist selection, Gut reasoning and individualized diet flows | Triage/interpret a person's health facts or tailor nutrition | Review complete inputs, outputs and UI; do not classify as allowed merely from operation names or disclaimers. |
| Profile summaries, document transcription and public education | Organize supplied facts or explain general concepts | Potentially narrower scope, but still requires verified handling of sensitive inputs, age/region controls and actual output review. |

The [Vercel standard DPA](https://vercel.com/legal/dpa), Schedule 1 section 6, excludes sensitive/special-category customer data. Its scope and any separate agreement that covers HealthChain's health-data API traffic must be verified. [Vercel offers a paid self-service BAA to Pro teams](https://vercel.com/changelog/hipaa-baas-are-now-available-to-pro-teams) for eligible HIPAA workloads; this is not evidence that this account has one, nor that HIPAA applies to every consumer wellness app. No automatic purchase or agreement acceptance is proposed.

## Option A: prepare a restricted initial release

Keep manual record organization, logging, sound playback and general education. Prepare explicit unavailable states and server enforcement for personalized medication-risk ratings, AI condition generation, lab advice, specialist triage and other unapproved personalized recommendations. Retain health records and account data; do not delete them. AI requests that remain available still need provider permission, age/region controls and a hosting arrangement covering their inputs. Restriction alone does not fix hosting contracts or cloud-health consent.

Produce the exact feature list, UI wording, server allowlist and regression evidence for review before activation. Do not silently replace clinical output with a fabricated safe result or continue charging quota for blocked processing.

## Option B: preserve the intended features and prepare a provider change

Assess an AI API and backend arrangement whose actual agreements cover the intended feature behavior and data categories. Compare accepted terms, costs, data location, retention, deletion, available regions and necessary clinical safeguards. Keep the existing provider unchanged until the replacement and costs are approved. A different endpoint, BAA, enterprise plan or model name alone does not certify allowed medical use or regulatory status.

Produce a concrete migration design, affected features, credentials/configuration requirements and test plan before switching or incurring charges. Do not treat privacy-policy wording as authorization to use a prohibited flow.

## Independent work that can proceed now

Verify current affirmative AI permission, account boundaries, cancellation/withdrawal, deletion and Storage byte removal; minimize inputs and diagnostic logging; record verified plan/region facts and provider retention exceptions; correct contradictory prompts; update notices and the release gate without inventing missing operator/market facts or marking unverified agreements as accepted.
