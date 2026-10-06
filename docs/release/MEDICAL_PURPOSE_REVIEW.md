# Medical purpose and claims review — 5 October 2026

The reviewed intended purpose is adult personal record organization, explanations of recorded terms and preparation for clinician conversations. Ordinary diet/activity logging, preference-based meal planning, research links and audio remain. No feature removal or provider change is selected by this review.

## Source and output evidence

| Reachable function | Reviewed boundary/evidence |
|---|---|
| Case discussion and clinician brief | `src/services/ai/consultation.ts` forbids invented diagnoses/probabilities/causes, prescriptions and test orders. Output templates preserve source facts and questions; downstream normalization restricts treatment/test fields. The tour now describes visit briefs rather than lab requisitions. |
| Ava explanations | Shared safety rules require uncertainty, source facts, clinician review and urgent local care for severe/emergency concerns; no dosing or treatment directives. Visible AI permission now also states these limitations. |
| Gut reasoning | Source-linked associations, timing and counterexamples; asserted diagnoses/causes and treatment directions are rejected. The earlier disputed-record failure was a false match on future assessment wording, corrected with regression evidence rather than weakening diagnosis checks. |
| Lab/document extraction | Exact written values/units/ranges and terminology; no invented targets, deficiencies, causes or diagnosis from raw scans. Original records remain the reference. |
| Meal planning and daily logs | Preference-based ordinary planning and logging, without claiming disease treatment, proven medical benefit or medical suitability. Unknown allergies/conditions must remain unknown. |
| Research/trial discovery | Public references and questions for professional discussion, not enrollment eligibility or treatment selection. |
| Unused drug/differential/MDT exports | No released UI callers were identified in the prior source audit. Do not advertise them as active or connect them without a new actual-function review. |

Prior recorded-response replay passed 12 Gut and 10 clinical fictional cases, with urgent cases handled locally. That is useful regression evidence, not clinical validation, a fresh live-provider pass or Google's approval. The changed medical wording does not itself prove every possible model answer follows the intended boundary.

## Store and regulatory interpretation

Google requires truthful health declarations, privacy/consent and a clear limitation/reminder for non-device health apps. The listing draft states that the app does not diagnose/treat/cure/prevent disease and asks users to consult a qualified healthcare professional. The app's shared disclaimer/AI consent reinforces clinician review. A declaration must match the final behavior. [Google health policy](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en)

Apple evaluates health claims and possible harm, accurate metadata, permission for third-party AI sharing and review access. Medical-accuracy/validated-measurement claims need supporting methodology; this release must not claim such validation. Health data and legal-entity rules are separate from a medical-practice licence. [Apple guidelines](https://developer.apple.com/app-store/review/guidelines/)

FDA examples include patient record/logging tools, education that can be tailored to a patient, clinician questions and trial discovery outside medical-device regulation when their intended purpose and behavior meet those limits. Thus, personal context or the word “health” alone does not automatically require device approval. This is an inference from the examples, not an FDA classification decision about HealthChain. Personalized diagnosis, treatment selection or clinical assessment must be assessed separately. [FDA examples](https://www.fda.gov/medical-devices/device-software-functions-including-mobile-medical-applications/examples-software-functions-are-not-medical-devices)

EU MDCG software guidance and UK MHRA guidance also examine intended purpose and actual function. Pure storage/reference/wellbeing can differ from patient-specific processing intended for diagnosis, prediction or treatment decisions. A disclaimer cannot exempt the latter. The EU framework is not automatically identical to FDA's examples. [MDCG 2019-11 revision 1](https://health.ec.europa.eu/system/files/2025-06/mdcg_2019_11_en.pdf), [MHRA software guidance](https://www.gov.uk/government/publications/medical-devices-software-applications-apps)

Gemini separately restricts clinical practice/medical advice, under-18-directed clients and unsupported regions. The reachable source/output review supports the bounded explanation/organization purpose; it does not authorize any generated medical directive. All named primary countries are on the maintained official region list. The supported-country check on the existing Vercel AI handler was published on 6 October 2026 using the platform-observed country, before account/counter/model calls; unsupported/unverified production locations are denied while saved records/manual tools remain. It needs no new provider or secret. See `VERIFICATION.md` for publication evidence; this is not a new live-provider or clinical validation run. The direct route's signed proof gate remains inactive. [Gemini terms](https://ai.google.dev/gemini-api/terms), [regions](https://ai.google.dev/gemini-api/docs/available-regions)

## Release conclusion

The intended-purpose and wording review is completed in source; no automatic medical licence, hired clinician agreement or blanket feature removal is established. Keep claims and actual answers within the reviewed scope and use the prepared store declaration. Reassess before adding ranked diagnoses, patient-specific causal findings, disease treatment/medication changes, diagnostic scan interpretation, validated biological forecasts or autonomous triage. Regulatory authorization would depend on the actual added medical function and market. Operator/business identity, provider arrangement and signed-store evidence remain separate unfinished facts.
