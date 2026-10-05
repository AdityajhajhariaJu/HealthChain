# Health backend activation — 5 October 2026

This preparation preserves the app's existing explanations, source review, Gut reasoning, meal planning, record extraction, account deletion, quotas and purchase behavior. It reuses the reviewed gateway handlers on Supabase. It is not a declaration of worldwide legal compliance or provider certification.

## Proposed data path

AI: device → Vercel country check (opaque request ID only; no health input or account token) → Supabase Edge Function → paid Gemini. Account deletion and condition-based trial searches go directly to the same Supabase function. Ordinary web hosting, catalog queries and payment APIs remain on Vercel.

The country check uses Vercel's injected country/address headers, not a browser-declared country. A two-minute signed proof binds the observed country and a pseudonymous rate principal to the request ID. The function verifies it before reading AI input. Unsupported/unverifiable countries fail closed; there is no health-request fallback to Vercel. Existing saved records are unaffected. Network location is not proof of nationality or residency and does not defeat VPNs/proxies. Maintain `shared/gemini-regions.json` against Google's official list; named primary audiences IN/US/GB/DE/AU/CH/IT/BR are included.

Supabase's standard DPA permits sensitive data under its stated conditions. An ordinary Vercel Pro upgrade does not grant permission for sensitive health inputs; this preparation removes their active API processing from Vercel. Do not enable a HIPAA-regulated PHI workflow based on this runbook. The frontend configuration remains opt-in until the account setup and live checks below pass.

## Account approval required

| Account | Prepared action | Published baseline |
|---|---|---|
| Supabase organization `oiuqnkociaaflmucewvk` | Upgrade Free → Pro, retain the existing Mumbai project, enable leaked-password protection in Auth, and keep the normal spend cap. | $25/month includes one Micro project's compute credit; additional projects/compute/usage/taxes can increase the total. |
| Vercel team `adityas-projects-6fa2e77d` | Upgrade Hobby → Pro for commercial website hosting; retain one deploying seat. Review a spend threshold and automatic pause action before activation. | $20/month includes one deploying seat and $20 usage credit; overages/additional seats/taxes are extra. |

The combined baseline is $45/month, not a maximum invoice or a Gemini/store fee. No upgrade, contract acceptance or card submission is performed by preparing this code. Built-in leaked-password protection is a managed Auth setting, not a browser password checker. Verify the actual setting/advisor after enabling it; the current Free-plan warning stays pending until then.

## Secret provisioning

Generate a random `AI_REGION_SIGNING_KEY` privately, at least 32 characters. Set the identical value as a server secret on Vercel and Supabase. Never use a `VITE_` prefix, print it, include it in a command-line argument, or commit a populated environment file.

Provision the existing **paid** Gemini `GEMINI_API_KEY` into Supabase server secrets. Supabase supplies its URL, anon and service-role keys to its function runtime; do not copy service credentials into the browser. If Apple revocation is configured, provision its server-only `APPLE_SIGN_IN_TEAM_ID`, `APPLE_SIGN_IN_KEY_ID` and `APPLE_SIGN_IN_PRIVATE_KEY` here too. The existing deletion fallback remains when Apple configuration is unavailable.

Account secrets must be supplied through an authorized secret-management channel. Only these providers need them. Never paste credentials into a public PR, policy, screenshot or chat response.

## Deployment and verification order

1. Build the function from the repository root: `node scripts/build-health-edge-function.mjs <private-output-directory>`. Upload the generated `index.js` as the `healthchain-health` function entrypoint using the Supabase deployment tool/API. This intentionally uses the bundled file; directly uploading only the TypeScript entrypoint would omit its reviewed relative dependencies.
2. Set `verify_jwt=false` on this function because the gateway preserves the bounded guest flow. The existing handlers explicitly validate signed-in users through Supabase `getUser()`. Erasure still requires a verified account; disabling the platform JWT gate does not remove these checks. The region proof is an additional AI gate, not user authentication.
3. Deploy/review Vercel source with `AI_REGION_SIGNING_KEY` configured but leave the frontend migration flag absent until the function is verified. Exercise only fictional probes: CORS/unsupported origins, invalid/missing proof before input consumption, invalid user deletion, and a bounded guest AI request with a real signed regional proof. Verify consent, quota, ledger/refund and cancellation paths. Do not use customer health records to test.
4. Prepare a Vercel deployment and operator-built mobile binaries with `VITE_HEALTH_BACKEND_URL=https://cikikocfvfshloqwnyfe.supabase.co/functions/v1/healthchain-health`. During web activation also set the Vercel server flag `HEALTHCHAIN_HEALTH_BACKEND=supabase`. The retired Vercel health handlers return HTTP 410 before database/provider work. There is no proxy for old binaries.
5. Test the deployed web route and exact mobile binaries. The operator owns signed builds/phone tests. Old installations/cached frontend assets must update; they can otherwise attempt to send a body to the retired Vercel URL even though processing is refused. Do not claim the old-client data path is resolved merely because a handler returns 410. Coordinate retirement with the mobile release/update instructions.
6. Recheck Supabase Auth's breached-password setting/security advisor and private provider/account evidence. Update visible privacy notices and store disclosures to the actual activated path, Pro retention and account facts. Only then record the related launch attestations. Unresolved business identity, store products/Apple setup, retention exceptions and signed-device work remain separate release requirements.

## Failure handling

If new routing has been enabled, leave the Vercel retirement flag enabled on failure and show the temporary-unavailability response. Repair/redeploy the Supabase function or roll back its last healthy version. Do not silently restore health processing on Vercel as an availability fallback without a separately verified sensitive-data arrangement. Secret rotation requires updating both signers/verifiers; outstanding proofs expire within two minutes.

Sources: [Supabase DPA](https://supabase.com/legal/customer-resources/data-processing-addendum), [password security](https://supabase.com/docs/guides/auth/password-security), [Supabase pricing](https://supabase.com/pricing), [function secrets](https://supabase.com/docs/guides/functions/secrets), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Vercel DPA](https://vercel.com/legal/dpa), [Vercel Pro pricing](https://vercel.com/docs/plans/pro-plan), [Vercel request headers](https://vercel.com/docs/headers/request-headers), [Gemini regions](https://ai.google.dev/gemini-api/docs/available-regions).
