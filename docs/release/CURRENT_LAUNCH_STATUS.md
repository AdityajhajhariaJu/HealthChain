# Current launch status — 5 October 2026

This is the current status for the completion work. Earlier dated verification remains historical evidence. The main app features remain; the changes add adult confirmation, the selected native offer, accurate screen descriptions and security fixes.

## Master publication

The operator requested all completed review content in production. On 5 October 2026, the exact reviewed commit `50869198` was fast-forwarded into `master` and pushed to the main repository; [PR #92](https://github.com/AdityajhajhariaJu/HealthChain/pull/92) is merged. The earlier privacy review in PR #88 is included. The frozen backup repository was not pushed or changed.

[Quality Gates](https://github.com/AdityajhajhariaJu/HealthChain/actions/runs/37321430054) and [Lighthouse CI](https://github.com/AdityajhajhariaJu/HealthChain/actions/runs/37321429989) passed. Quality reports 1,038 unit cases passed and two skipped, all 240 browser cases passed, and 133 production journeys passed plus one successful retry. Optional live Supabase smoke was skipped. [Vercel production deployment](https://vercel.com/adityas-projects-6fa2e77d/health-chain/GyKopHK2YNxAg94D6MBzg5dMVWYZ) succeeded. All fourteen public policy editions returned HTTP 200 and matched the prepared content after line-ending normalization. Live UI checks confirmed the policy hub, US Privacy supplement and adult entry screen, without customer records, AI requests or purchases.

Publication updates the website and web app. It does not replace an installed mobile binary or enable unfinished native checkout. Policies retain draft labels for the actual missing operator/provider/retention facts.

## Confirmed product decisions

- Minimum user age: **18**. Workspace, onboarding and checkout wait for an explicit account-scoped adult confirmation. This is self-attestation, not identity or date-of-birth verification.
- Launch intent and primary audience: **worldwide**, explicitly including **India, USA, UK, Germany, Australia, Switzerland, Italy and Brazil** as primary audiences. None is treated as secondary to India. This does not certify compliance or store/AI availability in every territory; all named countries appear on Gemini's current available-region list.
- Mobile apps: **one-month automatically renewing Pro subscription**, initiated by a deliberate store purchase. Offer `com.healthchain.app.pro30`; Google base plan `monthly` (`P1M`). Store-localized prices remain authoritative. Quarterly identifiers remain only for restoration/verification compatibility.
- Website: existing Razorpay prepaid plans, with **no automatic renewal added**.
- Signed builds and phone tests: **operator-owned**, as requested. This completion work does not claim they passed.

## Completed work and verified account facts

| Area | Current evidence |
|---|---|
| Retired public tables | Operator confirmed no other app uses the project. Applied `contain_retired_client_tables`: 18 tables, zero anonymous/authenticated table or column access, zero remaining policies, existing service access preserved for all 18. Rows were not deleted. No HealthChain source references those tables. |
| Database RPCs | Reviewed the six intentionally authenticated SECURITY DEFINER functions. Hardened case deletion against missing/mismatched owner claims while keeping service deletion. A synthetic test revealed and fixed the existing text-versus-UUID case deletion error. Owner deletion, missing/cross-account rejection and service behavior pass in rolled-back SQL tests. |
| Vector extension | Moved `vector` into `extensions` and updated the legacy matcher to use its relocated operator. Operator and zero-row matcher checks pass. |
| Database baseline | No public application table lacks RLS. Advisor informational findings for service-only/no-client-policy tables are intentional; do not add permissive policies to hide them. Authenticated owner RPC warnings are reviewed, not automatically defects. |
| Password protection | Live advisor and dashboard confirm breached-password protection disabled. Supabase organization is Free; the built-in feature requires Pro+. Do not claim browser password rules are an equivalent server control. |
| Vercel | Logged-in team dashboard confirms **Hobby**, project data preferences disabled globally, and no log drains. Current published runtime-log retention for Hobby is **one hour**, which is not a promise about all security logs/backups. |
| Gemini | ARIA paid Tier 1 remains operator-confirmed. Paid requests are excluded from product-improvement use; standard abuse monitoring retains inputs/context/outputs for **55 days** and allows review of flagged content. |
| Supabase | Live project metadata confirms **Mumbai (`ap-south-1`)** and Free. Selected database region does not restrict every provider/support processing location. Internal copy/deletion exceptions and manual exports are not fully verified. |
| Store access | The currently signed-in Google account opens Play Console account creation. It does not currently expose an app/product console. App Store Connect requests Apple sign-in. This does not establish that the operator has no other developer account. |
| In-app reporting | Settings → Help & Feedback Center provides an explicit harmful/offensive AI-answer report category. Reports contain only user-selected text. Submission errors preserve the draft; reviewed feedback errors log a fixed category. Floating feedback now waits for a confirmed database write before showing success. |
| Screen accuracy | Corrected unsupported wearable-score/biological-forecast claims and unknown-allergy/condition defaults. The timeline and activity indicator remain, with descriptions matching their actual inputs. |

## Actual remaining account/release steps

| Pending | Concrete completion step |
|---|---|
| Operator identity | Supply the real legal person/entity name, country, correspondence address, telephone and governing-law provision. Existing support/privacy email is recorded. Age and launch intent are already resolved. |
| Hosting arrangement | Direct Supabase health routing is prepared and its staged function passes five live boundary probes. Activate server secrets and the new web/mobile routing, coordinate retirement of old clients, and use a commercial Vercel plan for the remaining website. Pro alone does not permit health inputs on Vercel. See `HEALTH_BACKEND_ACTIVATION.md`; no paid upgrade or production frontend switch was performed. |
| Password protection | Concrete selected implementation: Supabase Pro plus its server-enforced leaked-password protection. The current account remains Free and the setting disabled until the recurring charge is approved and the Auth setting verified. |
| Native account setup | Access the publishing accounts; create the monthly products and actual prices, configure Apple capability/Supabase Apple provider, server-only verification keys and authenticated purchase notifications. Production enablement requires real configuration and the operator's lifecycle evidence. |
| Store identity and forms | Google requires an organization account for health apps. Apple has a legal-entity requirement for apps collecting sensitive health information. Complete the applicable verified identity and publisher requirements; neither rule establishes that this app automatically needs a medical-practice licence. |
| Privacy completion | Review accepted provider terms and transfer safeguards, confirm outstanding retention/deletion exceptions and payment retention, then finalize the truthful policies and store forms. No hired lawyer is a repository requirement. |
| AI/provider availability | Fixed the identified Gut false rejection without disabling diagnosis/cause checks. A maintained official-country list and signed server-observed regional gate are implemented for the prepared direct route. Activation and account/paid-provider evidence remain; source/output tests do not constitute Google's approval. |
| Store submission | Use `STORE_REVIEW_READINESS.md` and `STORE_DISCLOSURES.md`; enter matching declarations, screenshots and full reviewer login/access. `/review-demo` is supplemental fictional demonstration, not a substitute for access to the actual app. |
| Release | Reviewed source and web assets are published to `master` and the live website. Complete the remaining facts/account setup, then submit the matching operator-built mobile binaries and store metadata. Installed mobile apps still need a new binary. |

## AI evidence from this completion run

The earlier live model evaluation ran 12 Gut and 10 clinical fictional scenarios through the current prompts/normalizers; urgent paths use local safety handling. Authentication, quota and persistence are excluded. All ten clinical scenarios returned results. Gut case `G4-disputed-occasion` was withheld because the guard misclassified “more definitive assessment” as an unsupported clinical diagnosis. The scoped correction recognizes a future assessment as process wording; asserted diagnoses and definitive causes still fail the existing checks. The recorded G4 narrative now passes the unchanged grounding validator, and a normalizer regression covers the exact wording. This does not retroactively convert the earlier failed live run into a passing live run or certify future model outputs. Full local synthetic evidence stays outside the public repository.

## Prepared follow-up activation

`master` and the active website still use the existing health route. Latest master `44493fc107c595a069cf1d2f6ea7cc6b78a49a18` was verified before preparing this follow-up branch. Supabase function `healthchain-health` version 4 is staged with its preserved custom authentication and rejects AI without a signed regional proof. No customer health rows, purchases or actual account erasures were used for its five live probes. No server secret or paid plan was provisioned. The combined published baseline for Supabase Pro and one-seat Vercel Pro is $45/month plus any usage/additional compute/seats/taxes; approval and coordinated activation are still required. Details and rollback behavior are in `HEALTH_BACKEND_ACTIVATION.md`.

Sources checked 5 October 2026: [Gemini regions](https://ai.google.dev/gemini-api/docs/available-regions), [Gemini terms](https://ai.google.dev/gemini-api/terms), [Google abuse monitoring](https://ai.google.dev/gemini-api/docs/usage-policies), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Vercel DPA](https://vercel.com/legal/dpa), [Vercel runtime logs](https://vercel.com/docs/logs/runtime), [Supabase DPA](https://supabase.com/legal/customer-resources/data-processing-addendum), [Supabase password security](https://supabase.com/docs/guides/auth/password-security), [Google publisher accounts](https://support.google.com/googleplay/android-developer/answer/10788890?hl=en), [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/).
