# HealthChain privacy impact assessment — 5 October 2026

**Technical assessment prepared; operator approval is outstanding.** This records actual design risks and mitigations. It is not a claim that the operator has completed every formal DPIA requirement or obtained supervisory approval.

Purpose: adults organize their own health information and prepare clinician questions, with optional AI, health-device import, general diet/activity planning and media. The app does not decide insurance, employment or access to care. All named primary markets have equal status. The controller's legal identity, establishment and responsible contact have not yet been supplied.

## Data and necessity

Account details go to Supabase Auth and the chosen sign-in provider. Manual health profiles/cases, symptoms, medicines, allergies, measurements and logs are primarily local and can synchronize to Supabase after the separate health choice. Selected relevant messages/context/images/documents go through the current Vercel API to paid Gemini after separate AI permission. Technical security/quota/payment records have distinct purposes. Optional product measurement uses allowlisted daily aggregates without health text or person histories. Device imports request four read categories, without health writes. Support receives only content the user chooses to submit.

Local-only organization avoids cloud health storage; declining AI avoids Gemini input. Optional fields can be blank. User-generated exports and browser speech services create separate risks and are disclosed. Cloud/AI processing requires readable inputs; neither HTTPS nor provider at-rest protection establishes end-to-end encryption or an encrypted local clinical vault.

## Risk treatment

| Risk and possible consequence | Existing or prepared treatment | Residual fact/action |
|---|---|---|
| Silent health uploads or bundled consent; loss of control | Separate unchecked health choice, local-only refusal, distinct AI/measurement/device choices; health REST/private Storage boundary, version/account receipts | New web/native releases must contain the change. Consent records are per-device, not centralized proof. Administrative account-wide requests must be operated. |
| Requests continue after withdrawal/account switch | Cloud requests abort where possible; late bodies are discarded; AI request/response controls already do the same; queued health changes remain local | A provider may already have received an in-flight body. Other devices/older clients need separate withdrawal or administrator action. |
| Account mixing, public exposure or restored erased records | Core owner RLS/authentication; 18 retired tables have no client grants; scoped queues; service-only deletion and restricted erasure markers; preserve markers on restores | Recheck new tables/RPCs and Storage paths. Do not treat client consent as server authorization. Marker expiry needs a justified recovery-window decision. |
| Shared/lost device, exported record disclosure | Honest local-storage disclosure, owner-scoped erasure, native backup exclusions, recommendations for screen lock and device encryption | Local store is not a separate encrypted vault. User exports/earlier device backups cannot be recalled. Operator-owned phone verification is outstanding. |
| Incorrect AI summaries, diagnosis/treatment assertions, delay seeking care | Source-fidelity/uncertainty guards, constrained output normalization, clinician/emergency reminders, user reporting; recorded model regression | AI is probabilistic; no accuracy/clinical validation guarantee. Re-review actual answers and future prompts/models. See `MEDICAL_PURPOSE_REVIEW.md`. |
| Overseas access or use beyond the intended purpose | Paid Gemini non-training terms and 55-day abuse-monitoring disclosure; current Vercel data preferences disabled; private database; explicit destination explanation | Actual applicable agreements, transfer safeguards, provider deletion handling and Hobby commercial eligibility need account evidence. Consent alone does not cure an incompatible contract. |
| Excess retention, misleading deletion guarantee | Active records removable; server deletion covers controlled rows, supported Storage and Auth; aggregate counts bounded to 90 days; reply retrieval expires after 24 hours; exceptions disclosed | Verify operational cleanup, manual copies/statutory criteria and backup handling. Do not promise zero provider retention or fabricate a payment-record period. |
| Missed rights or incident deadlines | Request/appeal route and country-specific response/incident procedure prepared | Operator must assign responsibility, monitor inbox and establish reporting/log capability for applicable laws, especially CERT-In scope. |

## Proportionality and conclusion

The main record, explanation and clinician-preparation features remain. Privacy controls reduce unnecessary transmission while allowing deliberate cloud and AI use. No health advertising, sale, geofence or automated insurance/employment/care-access decision was identified in this release. Adult confirmation is self-attestation; it is not identity verification and does not authorize another person's records.

Residual legal/operational risks cannot be accepted on the operator's behalf. Complete controller/contact facts, processor/transfer evidence and justified retention/incident arrangements before final sign-off. Evaluate formal DPIA/DPO/representative triggers against actual scale, establishment and processing, rather than automatically requiring paid certification. Where a formal assessment identifies unmitigated high risk requiring consultation, complete that process before the affected processing.

Approval record to keep privately: responsible operator, assessment date/version, user consultation/feedback considered, provider agreements and safeguards, retained-risk decisions, remaining mitigations and review date. Reassess on a new health purpose, recipient, model capability, device permission, automated decision or material incident. This assessment does not authorize the inactive routing alternative.
