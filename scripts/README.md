# HealthChain360 Scripts & Staging Evaluation Harness

This directory contains deployment verification scripts and live-model evaluation harnesses.

## Maintained commands

- `npm run verify:repository`: reject tracked generated output and root scratch files.
- `npm run verify:syntax`: parse JavaScript in API, server, shared and script directories, including nested endpoints.
- `npm run build`: TypeScript, Vite and emitted-manifest startup JavaScript budget.
- `npm run verify:migrations`: migration/bundle/schema-contract alignment.
- `npm run build:migrations`: regenerate the initial-install SQL bundle; do not reapply it to an existing production database.
- `npm run smoke:supabase`: read-only anonymous API exposure/configuration check.
- `npm run eval:diet-plan` and `npm run eval:model`: controlled provider evaluations.
- `scripts/lib/legacy-gut-observations.ts`: pure legacy import preview with provenance checks; it does not write production data.
- `node scripts/serve-lighthouse.mjs`: local CI audit server for `dist`, with compressed text responses matching production hosting. Build first; restart it after rebuilding.

Historical one-off patch scripts were removed. Recover them from Git history when researching an old change; do not re-run them against current source.

## Live-Model Clinical Grounding Evaluation Harness

File: `scripts/eval-live-model.ts`

The evaluation harness validates:
1. **Clinical Grounding:** Ensures sparse patient intakes do not trigger ungrounded diagnostic assertions.
2. **Security & Prompt Injection Resistance:** Ensures that prompt injection payloads embedded in medical records or notes are treated strictly as untrusted patient data.
3. **Response Invariance:** Executes multiple runs against the same clinical input to confirm extracted values and units remain invariant across requests.
4. **Clinical Actionability:** Ensures outputs prioritize constructive clinician questions and uncertainty disclosures.

### Running the Live-Model Evaluation

To run with your Gemini API key in staging:

```bash
# Using CLI argument
npx tsx scripts/eval-live-model.ts --apiKey YOUR_GEMINI_API_KEY

# Using environment variable
export GEMINI_API_KEY="your-gemini-api-key"
npm run eval:model
```

If run without an API key, the script will validate the safety invariants and request schema contracts without performing external network requests.
