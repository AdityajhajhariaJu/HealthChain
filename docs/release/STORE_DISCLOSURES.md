# Store privacy and reviewer preparation

**Working mapping, not a submitted declaration.** Reconcile these rows with the final signed app, enabled providers, consent behavior and the store questionnaires before submission. Data sent through a processor can still count as collection. “Guest” does not automatically mean anonymous, and an account identifier links records to a person.

| Data | Actual feature/purpose | Recipient or storage | Declaration preparation |
|---|---|---|---|
| Name, email, account ID | Authentication, profile and support | Supabase; chosen Google sign-in provider | Contact info and identifiers; account-linked; app functionality. |
| Symptoms, conditions, medicines, allergies, notes, lab highlights, AI summaries | User records, case organization and requested AI features | Account database/local store; relevant permitted inputs through Vercel to Google Gemini | Health data; account-linked for signed-in use; functionality/personalization. Do not label the records anonymous. |
| Steps, sleep, heart rate, calories, nutrition and workout history | Optional activity/device imports and logging | Local account cache and Supabase | Health/fitness; optional integrations; four read permissions; functionality/personalization. |
| Photos and uploaded documents | Progress photos, records and selected analysis | Local storage; supported private Supabase uploads; selected AI input through the server | Photos and user content/files, potentially health data. Identify collection/storage by the actual feature. |
| Voice dictation | Optional meal transcription | Browser/OS speech service may process audio | Confirm provider/platform handling before marking Audio Data absent or ephemeral. HealthChain does not save a raw voice recording in its own workspace. |
| Purchases and payment references | Web plan/top-up fulfillment and support | Razorpay and HealthChain payment/accounting records | Purchase history; linked to account; functionality. Card/bank fields are processed by the payment provider; verify its SDK flow rather than claiming HealthChain stores those fields. |
| Notification registration token | Optional remote notifications | Supabase and enabled APNs/FCM transport | Device identifier where applicable; functionality. Remote Android push is not configured in this checkout. Local reminder permission is separate. |
| Limited page/feature/purchase events | Optional first-party product measurement | HealthChain's Supabase analytics table | Product interaction/analytics; optional. Include account linkage where present. Raw prompts, health details, severity and free text are excluded. |
| HTTP connection and security metadata | Delivery, fraud prevention and rate limits | Hosting logs and service-only hashed counters | Assess actual technical data and provider retention. Hashing a key is not a blanket anonymity claim. |
| Feedback/support content | User-initiated support | HealthChain feedback records and support inbox | Customer support/user content; can be sensitive if the user includes it. |

The app's iOS manifest declares the observed app collection categories and no cross-company advertising tracking, plus the approved UserDefaults API reason. It is included in the resource target. The aggregate manifest of third-party SDKs and the App Store privacy answers must still be checked from the actual archive. [Apple privacy manifests](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests), [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/)

Advertising SDK requests have been removed from the application. Do not reuse the old Google Ads/Analytics declaration or screenshots. A user selecting optional measurement does not authorize sensitive health data to an advertising analytics service. [Google Analytics sensitive-data restriction](https://support.google.com/analytics/answer/13297105)

Google's processor/service-provider exceptions and ephemeral handling depend on the actual contract and processing; do not mark all AI transfer as “not shared” solely because it passes through HealthChain's API. Disclose the provider, categories and purpose in the visible consent flow and the applicable store answers. [Google User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)

## Public links and review journey

Planned public policy pages are `/terms-policies`, `/privacy`, `/terms`, `/acceptable-use`, `/app-license`, `/consumer-health-privacy`, `/privacy-security` and `/delete-account`. The Health Connect rationale uses `https://healthchain360.com/privacypolicy.html`, which is readable without JavaScript. US HTML editions use `-us.html`. These URLs must be verified after the finalized publication; the local drafts are not evidence that production now contains final policies.

Provide the reviewer with a dedicated synthetic test account, correct login instructions, working account entitlements, any required demo steps and a monitored support contact. Do not place credentials in this document or the repository. Include clear steps to test account deletion, AI refusal/permission, health imports with partial permissions, manual logging and hosted audio without downloading the whole library.

Suggested store description: “HealthChain helps you organize health records, symptoms and daily logs into a connected case and prepare questions for a qualified clinician. Optional AI features generate considerations from information you choose to provide. Optional device-health imports and sound playback support personal organization and wellbeing.”

Suggested medical limitation: “HealthChain does not provide medical care, diagnosis, prescriptions or emergency services. AI can make mistakes. Seek advice from a qualified clinician and contact local emergency services for urgent medical concerns.” Do not describe this draft wording as regulatory classification or medical-device approval.

Before reviewing digital purchases, select and implement the approved native billing strategy. Provide price, duration, what is included, cancellation/restoration and refund behavior matching the actual storefront. No unconfigured store purchase option should be advertised as available. [Google payments policy](https://support.google.com/googleplay/android-developer/answer/9858738), [Apple in-app purchase guidance](https://developer.apple.com/in-app-purchase/)
