## 1. Who this notice covers
This notice describes HealthChain's websites, Android and iOS applications, account services, health-record workspace, AI features, diet and activity tools, and sound library. The operator is **[[OPERATOR_NAME]]**, based in **[[OPERATOR_COUNTRY]]**, at **[[OPERATOR_ADDRESS]]**. Contact **[[PRIVACY_EMAIL]]** for privacy questions and rights requests. The operator decides why and how HealthChain processes personal information and acts as the controller where that concept applies.

HealthChain helps you organize information and prepare questions for a qualified clinician. It does not provide medical care, diagnosis, prescriptions or emergency services. Information you provide may be sensitive even when a feature is described as wellness or education. This notice is separate from your agreement to the Terms of Service and your individual permission choices.

## 2. Information you choose to provide
**Account information:** name, email address, account identifier, authentication information and account preferences. Password authentication is handled by Supabase Auth. If you choose Google sign-in, the authentication provider supplies the details permitted by that sign-in flow; its own privacy terms also apply.

**Health records and context:** symptoms, history, diagnoses you report, medications, allergies, measurements, case notes, timelines, clinician questions, uploaded images and documents, extracted record highlights, and information you put into Health Memory. AI-generated summaries, observations and suggested discussion topics can also contain sensitive information. A generated statement is not a verified clinical finding.

**Diet, activity and wellbeing:** meal descriptions, nutrition preferences, hydration, habits, symptom check-ins, workout/session progress, body measurements, progress photos, and saved sound-library preferences. The categories collected depend on the features you use; you can leave optional fields blank.

**Device health imports:** if you enable an available integration, HealthChain requests read access to steps, sleep, heart rate and total calories. Only samples you permit can be imported. The app uses a limited date range, stores imported records in your account workspace and can synchronize them to Supabase. The shipped integration does not request permission to write into Apple Health or Health Connect. You can change permissions in your device's health settings. Denying permission does not prevent manual logging.

**Support and transactions:** messages or feedback you send, an email address you supply for a reply, purchase identifiers, plan/entitlement information, quota usage, payment status and refund/recovery information. Payment processors receive the payment details entered in their checkout. HealthChain does not need your complete card details in its health database.

You are responsible for having authority to upload someone else's records. Do not put another person's information into your account without the necessary authorization. Shared devices, exports and documents can expose information to people outside the app.

## 3. Information processed during operation
Hosting and security services receive ordinary connection information such as an IP address, request time, browser/device characteristics, request route and diagnostic events. Authentication, synchronization, request deduplication, abuse prevention and quota accounting require technical identifiers. Rate-limit keys are stored as keyed hashes rather than raw IP addresses in HealthChain's counter store.

Optional product measurement is off until you choose it. The app records allowlisted events such as a general workspace visit, use of the check-in feature or checkout completion. It excludes symptoms, severity, messages, document contents, record identifiers, arbitrary button labels and search/prompt contents. HealthChain does not load Google Analytics, Google Ads, Meta Pixel or AppsFlyer tracking in this release. First-party optional events can be linked to your account identifier when signed in and are stored in Supabase. Change this choice in Settings.

Selecting an audio track makes a network request to HealthChain's hosting provider. Streaming transfers audio data to your device; it does not add the full library to the app installation. Optional downloads create local copies for offline playback. Your device or browser can evict those copies.

## 4. Why we process information
We process information to provide the features you select, authenticate and protect your account, keep records synchronized, generate requested AI outputs, import permitted device samples, deliver requested reminders, account for purchases/quotas, respond to support requests, and investigate service faults or abuse.

We use optional measurement to understand general product usage. We do not use personal health records to build advertising audiences, sell health information, or train a HealthChain advertising model. Operational processing necessary for sign-in, requested features and security is separate from optional measurement.

We may preserve limited information to meet an applicable legal obligation, handle a transaction or claim, and protect the service. A lawful disclosure or retention exception does not authorize unrelated advertising use of health data.

## 5. AI processing and your choice
Before an AI request is sent, the app identifies **Google Gemini API** and asks for your permission. The request travels through HealthChain's server on Vercel. Depending on the feature, it can include the message you enter, relevant health profile/case/Health Memory context, meal information, an image, or a document you choose to analyze. The app does not need permission to send every record for every feature; relevance depends on that feature's input.

Decline the prompt to keep using manual organization and other available features. Withdraw permission in Settings to prevent future AI requests. Requests already sent may have been processed and cannot be recalled by changing the device setting. Consent is versioned and scoped to the account on that device; a changed disclosure can require a new choice.

HealthChain's server and Google need to process readable inputs to produce outputs. Transport encryption does not make this flow end-to-end encrypted. Google applies its API data-processing, safety and retention terms. Paid and unpaid API terms differ; production processing must use a configuration approved for sensitive information. This notice does not promise that all provider copies are instantly deleted or that every Google service has the same terms. The applicable [Gemini API terms](https://ai.google.dev/gemini-api/terms) describe the provider's handling.

AI can be inaccurate, incomplete or inappropriate. HealthChain does not use AI outputs to make legally binding decisions about insurance, employment, eligibility for treatment or access to healthcare. A clinician remains responsible for clinical decisions.

## 6. Providers, integrations and disclosures
**Supabase** supplies authentication, database storage, private-object storage and synchronization. It processes account details, stored health records, transaction/usage records and technical information required for those functions.

**Vercel** hosts the website, streamed media and server APIs. It handles connection/hosting information and the request data processed through those APIs, including AI inputs sent to Google.

**Google Gemini API** processes the inputs necessary for the AI features you authorize.

**Razorpay** processes web checkout and payment verification while enabled. Apple or Google handles a store purchase if a supported store-billing option is offered. Checkout screens identify the processor and price before you buy.

**Apple Health / Google Health Connect** provides the health samples you explicitly permit. Device permission is separate from AI permission. Notification delivery, where configured and enabled, uses Apple Push Notification service or Firebase Cloud Messaging; delivery tokens and technical metadata are needed. Reminders are optional. Notification previews can be visible on a locked or shared device.

**Research and food-information sources:** a feature may request general search terms or product codes from services such as ClinicalTrials.gov, Europe PMC and Open Food Facts. Do not put a name, contact details or private record text into a public search query. Selecting an external article, trial or product link opens a service with its own rules.

**Device/browser features:** camera capture, file selection and optional speech dictation depend on your browser and operating system. Speech services may process audio remotely under that provider's terms. The transcript you choose to save then becomes HealthChain content; do not assume browser dictation runs entirely offline. Typing and manual entry remain available.

We disclose information to providers only for the service functions described, subject to applicable contracts and configuration. We may also disclose information when you direct us to export/share it, when legally required, to investigate a security issue, or in a legitimate business reorganization subject to applicable privacy protections. HealthChain does not automatically publish private cases or records to a public community.

## 7. Storage, security and device risks
Guest records primarily remain in browser/device storage. Guest mode is not an anonymity system: online features, AI requests and media/research connections can still disclose connection information and the inputs you choose to send. Guest data can be lost if you clear storage, uninstall, change devices or lose the device.

Signed-in records can exist both locally and in Supabase so synchronization can recover them. Local storage and Capacitor Preferences are not described as a separately encrypted clinical vault. Use device encryption, a strong screen lock, private accounts and caution on shared devices. Exports and offline downloads are files under your control.

The service uses HTTPS connections, authenticated server operations and ownership checks for its core health records. Provider infrastructure has its own security controls. Android automatic backup/transfer rules exclude application storage in this release; those rules do not control files you export yourself. No internet service or device can guarantee absolute security. HealthChain does not claim HIPAA certification, universal legal compliance, independent security certification or regulatory medical-device approval in this notice.

## 8. Retention and deletion
Active account records are retained to provide the workspace until you delete individual content or your account, subject to applicable legal requirements. Guest data and saved exports stay on the device until removed or evicted.

Use **Settings → Delete Account** to request permanent deletion of the signed-in account. The server verifies identity, revokes sessions, removes controlled application records, removes supported private Storage objects, and deletes the authentication account. The app then attempts to erase the corresponding local owner records. A deletion failure is reported so you can retry or contact support; closing an account is not merely deactivation.

Provider backups and security logs may outlive the active record. External payment processors can retain transactions under their accounting, fraud-prevention and legal rules. Deleted content should not be reintroduced into an active workspace during a backup restore. Your downloaded exports, copies shared with other people, and information previously processed by external providers are outside the app's direct deletion transaction.

[[RETENTION_DETAILS]]

The public [account deletion page](/delete-account) explains the request routes and exceptions. Account deletion does not by itself cancel an independently managed store subscription or automatically create a refund; manage any such subscription with its seller.

## 9. Your controls and requests
You can correct records, use available export controls, remove content, request account deletion, change optional measurement, withdraw future AI permission, and revoke device health/notification permissions. Some records/features require particular data to work; explain your request if a control is unavailable.

Contact **[[PRIVACY_EMAIL]]** with the account email and a description of the request. Do not email medical files, passwords or full payment details just to identify an account. We use proportionate verification and can ask an authorized agent to show authority. We will explain a refusal or extension and available appeal/complaint routes when required.

Rights may include access, correction, deletion, portability, restriction, objection and withdrawal of consent. Mandatory rights and response periods depend on the law that applies. We do not retaliate for exercising privacy rights. Withdrawal affects future consent-based processing and does not invalidate processing already lawfully completed.

## 10. International processing
HealthChain and its providers may process data outside your country, including in India, the United States and other provider locations. The connected database region is India; other providers and their support/log infrastructure can use different regions. Applicable safeguards can include approved processor contracts and transfer mechanisms. We do not treat merely using the app as a substitute for a legally required transfer safeguard or explicit consent.

The regional supplement below explains additional rights where applicable. The label “International” does not mean that every country has identical rules or that the service is approved in every market.

## 11. Eligibility, changes and contact
[[ELIGIBILITY_DETAILS]] HealthChain is not marketed as a children's service. Do not submit a child's records unless the approved service scope and law permit it and you hold the necessary authority.

We will publish the current notice and update date here. A materially new data purpose or provider-sharing requirement will receive an appropriate notice and fresh permission when required; a policy change alone does not authorize hidden new collection.

For questions, security reports or accessibility help, contact **[[PRIVACY_EMAIL]]**. The operator's correspondence details appear in section 1.
