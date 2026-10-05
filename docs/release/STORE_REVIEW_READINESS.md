# HealthChain store submission packet

Current selection: adults 18+, worldwide launch intent and primary audiences including India, USA, UK, Germany, Australia, Switzerland, Italy and Brazil, monthly automatic renewal in mobile apps only. See CURRENT_LAUNCH_STATUS.md for verified work and remaining account steps. Signed builds and phone tests belong to the operator.

## Listing draft

Name: HealthChain

Apple subtitle: Health records & visit prep

Google short description: Organize health records, track habits, and prepare questions for your clinician.

Description:

HealthChain helps adults organize health information and prepare for conversations with a qualified clinician. Keep symptoms, meal logs, medicines and uploaded records together, review saved timelines, and use AI explanations to understand terms and identify questions to discuss at your next appointment.

AI features use Google Gemini after you choose whether to allow the selected information to be processed. AI can make mistakes; check summaries against your original records. HealthChain is not a medical device and does not diagnose, treat, cure or prevent a medical condition. It does not provide medical care or replace professional advice. Consult a qualified healthcare professional about health concerns. For an emergency, contact local emergency services.

The mobile Pro plan is a one-month subscription purchased through the App Store or Google Play. It renews automatically until cancelled through your store account. The store displays the localized price before purchase. Restore purchases and subscription management are available in the mobile app. Account deletion does not cancel your store subscription. Website plans have separate prepaid billing.

Privacy: https://www.healthchain360.com/privacy

Terms: https://www.healthchain360.com/terms

Account deletion: https://www.healthchain360.com/delete-account

Support: healthchain360@gmail.com

Verify finalized policy URLs after deployment. Existing policies remain drafts until real operator/provider facts are complete. Do not submit this copy as final if the shipped behavior differs.

## Reviewer instructions

Provide a dedicated account containing fictional records and full access to the submitted features, with a functioning backend. Put credentials only in private store review fields. The existing /review-demo is supplemental, read-only demonstration and does not replace authenticated access.

1. Open the app, confirm 18+ eligibility and sign in using private reviewer credentials.
2. Open Settings → All policies to inspect Privacy, Terms and Account Deletion.
3. Open Ava or a case review with fictional records. Decline AI processing, then allow it to inspect the actual flow. Permission is withdrawable in Settings.
4. Open Settings → Help & Feedback Center → Harmful or offensive AI answer to inspect in-app reporting.
5. Open Pro pricing: one monthly offer, localized store price, automatic renewal disclosure, Terms/Privacy, Restore purchases and Manage subscription.
6. Use the store's sandbox review account for purchase/restore/manage checks. Do not require outside-store payment or a browser tester entitlement flag.
7. Use a separate disposable fictional account for deletion. Recreate reviewer access if the account is deleted before submission. Deletion explains external billing cancellation.

## Forms and publishing accounts

| Field | Prepared answer / remaining verification |
|---|---|
| Developer identity | Enter the real operator's verified details. Current Google account opens account creation; Apple requests sign-in. Google requires organization registration for health apps; Apple's sensitive-health-data rule requires a legal entity. Complete applicable enrollment, identity and agreements in the owner's publishing account. Neither rule automatically imposes a medical-practice licence. |
| Target audience | Google: 18 and over. Complete Apple's age questionnaire truthfully; app eligibility differs from the calculated store rating. |
| Countries | Intended available storefronts and primary audiences worldwide, including India, USA, UK, Germany, Australia, Switzerland, Italy and Brazil. Review local restrictions and AI-provider availability before selecting distribution. |
| Category | Draft Health & Fitness. Declare the actual health/AI/integration features regardless of category. |
| Google Health Apps | Declare applicable health-information/management and read-only Health Connect uses. Public trial links alone do not establish human-subject research. Do not claim regulated-device status without evidence. |
| App Privacy / Data Safety | Use STORE_DISCLOSURES.md and actual final SDK/build flows. Account, health, uploaded media/documents, AI inputs and relevant provider/device processing must be accurate. Each form's definitions of sharing and service-provider exceptions differ. |
| HealthKit / Health Connect | Explain the four actual read categories: steps, sleep, heart rate and total calories, their purpose and optional permission. Include the script-free privacy rationale page. Do not advertise write access. |
| AI | Disclose Google processing and permission, and the in-app harmful/offensive-content report route. Avoid licensed-clinician, guaranteed-diagnosis or biological-prediction claims. |
| Subscriptions | Apple product com.healthchain.app.pro30, one month. Google same product with monthly base plan (P1M). Configure actual price/tax/storefronts, server-only credentials and authenticated notifications. Quarterly is not a new launch offer. |
| Deletion | In-app deletion and public /delete-account. Verify final public content and operator device results; explain billing cancellation separately. |
| Screenshots | Capture exact final operator-built screens with fictional records: Today/logging, records/timeline, case organization, Ava, monthly pricing and privacy/settings. Upload the console's required size sets. Do not invent screens or hide AI limits. |
| Review access | Actual working credentials/backend and necessary instructions; the supplemental static demo alone is insufficient. |
| Testing / release | Check the account's current production-access requirements. Do not automatically apply personal-account tester rules to an organization account. Upload operator-signed binaries and matching declarations after policies/backend match. |

A hired lawyer is not a requirement imposed by this packet. Store identity verification, account agreements, purchase setup and truthful disclosures remain necessary.

Sources: [Apple](https://developer.apple.com/app-store/review/guidelines/), [Google Health Apps](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en), [Google Console Requirements](https://support.google.com/googleplay/android-developer/answer/10788890?hl=en), [Google AI policy](https://support.google.com/googleplay/android-developer/answer/13985936?hl=en).
