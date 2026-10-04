# HealthChain launch preparation — 4 October 2026

**Release status: preparation completed for review; store submission is blocked pending the decisions and external checks below.** A successful web build is not evidence of a signed Android/iOS release or a legal approval. No first-pass store approval or next-day publication is promised.

## What this preparation adds

Seven original documents cover Terms of Service, Acceptable Use, App Licence, Privacy Policy, Consumer Health Privacy, Privacy and Security, and Account Deletion. The policy hub includes United States and International editions, regional rights supplements, section navigation, pricing links and print support. The same underlying Markdown generates the React pages and fourteen script-free HTML pages. The latter can be read by the Health Connect permission rationale viewer, which has JavaScript disabled.

These documents describe HealthChain's actual providers and controls. They do not copy a competitor's wording or claim that HealthChain shares a competitor's medical-device status, certifications, clinical operations or corporate identity. They remain visibly marked as drafts until the operator supplies and approves the missing facts.

Privacy changes remove Google Analytics/Ads dispatch and global free-text click collection; retain only optional, bounded first-party events; exclude health details and respect Global Privacy Control. AI requests wait for an affirmative, versioned account-specific choice identifying Google Gemini. Declining sends no request body, and Settings provides withdrawal. Profile summarization requires an explicit action. Health imports and optional meal dictation explain their data flow before permission.

Native preparation adds the iOS privacy manifest and accurate usage descriptions, includes the manifest in the Xcode resource target, disables Android backup/cleartext traffic, and removes SDK-contributed permissions that the application does not use. The four remaining read categories are steps, sleep, heart rate and total calories. No permission to write health records is requested.

API preparation uses an exact AI origin allowlist and persistent shared rate counters. The counter keys are server-keyed hashes rather than raw IP addresses. Production fails closed if the database counter is unavailable. The service-only counter migration has been applied and verified with rolled-back synthetic transactions. It does not change the other application's shared tables. The production Vercel cron secret was added as a secret; it takes effect with a deployment using the updated environment.

Hosted audio remains excluded from both native asset copies. Optional offline audio caching is separate from the install package.

## Decisions needed from the operator

| Decision | Concrete proposal or required facts | Why it matters |
|---|---|---|
| Legal operator | Supply legal person/company name, country, correspondence address, privacy/support email, applicable governing law, launch countries and age scope. | The app cannot name a fictitious controller or claim coverage in every jurisdiction. |
| Age and sensitive-health scope | Adults-only launch is proposed. Confirm how core cloud health processing obtains a valid basis/explicit consent for each selected market, and whether third-party/child records are permitted. | AI consent alone does not settle every health-data obligation. A declaration needs to match the onboarding and processing actually deployed. |
| Google Gemini | Confirm production uses the applicable paid-service billing, review its processor terms, and confirm data-retention/transfer arrangements. | A configured key does not prove paid billing. Google's unpaid API conditions differ and restrict sensitive inputs. |
| Native purchases | Recommended initial option: free native launch with native purchase/upgrade links disabled and web billing retained. Alternative: native store products with server receipt verification, restoration and refund handling. | A web Razorpay checkout cannot be assumed acceptable for digital features in all native storefronts. No billing mode has been changed without this decision. |
| iOS login | Hide Google sign-in on iOS initially and retain email login, or configure and implement Apple sign-in. | The current Google login flow needs review under Apple's equivalent-login requirement. Existing Google users need a working access/recovery path if that button is hidden. |
| Shared database | Review the containment SQL and its rollback/snapshot in the private local launch packet. Confirm the other application's ownership and migrate its clients before applying containment. | The shared application's client-access configuration requires containment. Changing it can break that application's clients. Detailed production evidence is retained locally rather than committed to this public repository. No containment migration has been applied. |
| Build toolchain | Decide whether to approve Tailwind 4 migration and visual regression testing. | The current development dependency audit reports five high findings through the Tailwind 3 watcher/glob chain. The production dependency audit is clean. Existing CI audits both and will fail until resolved. |
| Authentication | Enable supported breached-password protection or implement/review an equivalent server-enforced control. | The live Supabase check is disabled; its built-in leaked-password option requires a paid plan. Client password rules are not an equivalent server control. |
| Retention and contracts | Confirm provider security-log/back-up periods, deletion handling, payment retention, processor agreements and any required EU/UK representative/transfer mechanism. | The policy must describe records actually retained and rights that can actually be delivered. |

Major decisions remain pending because the operator requested discussion before major changes. Continuing the preparation does not approve a particular billing, age, account, provider-cost or shared-database option.

## Native and store checks still required

This Windows computer has Java 17 and no Android SDK. It cannot produce the current Capacitor Android release here, and it cannot run Xcode. Supply/install the supported Android toolchain and configure a release signing key; build and validate the AAB and its actual merged manifest. Do not publish keystore files or passwords. Optional remote Android push needs Firebase client/server configuration if it will be offered at launch.

On a Mac, configure the Apple developer team, bundle identifier, HealthKit capabilities and any enabled push/auth capabilities. Archive with the required Xcode/SDK version, validate signing, inspect Xcode's aggregate SDK privacy report and submit the archive to TestFlight. A parsed project and privacy plist cannot replace these checks. Apple's current submission requirements specify Xcode 26 or later and the appropriate 26 SDK for uploads since 28 April 2026. [Apple submission requirements](https://developer.apple.com/news/upcoming-requirements/)

Verify the final build on real Android and iOS devices: first launch, consent decline/accept/withdrawal, each selected health permission, partial permissions, denied camera/microphone, foreground/background audio, calls/interruption, offline recovery, account switching, export/import, account deletion, notifications, keyboard/zoom, narrow screens and failed billing/network requests. Use synthetic records, then confirm production configuration without exposing health content.

Complete Apple App Privacy, age-rating and review-access details; Google Data Safety, Health Apps and account-deletion declarations; content rights for every hosted audio track; accurate screenshots; support contact; and the developer-account identity, agreements and applicable testing requirements. A new personal Play developer account may need twelve opted-in testers for fourteen continuous days before production access, so tomorrow's launch cannot be assumed. [Google account testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)

Store medical claims must describe organization and appointment preparation. The AI provides generated considerations rather than clinician care, diagnosis, treatment or a verified emergency triage service. The reviewer must receive real access to the reviewed functionality and a functioning backend; browser tester flags are not a substitute for server-controlled entitlements. [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/), [Google health declarations](https://support.google.com/googleplay/android-developer/answer/13996367)

## Publication workflow

1. Resolve the decisions above and implement the selected native billing/login and market-consent behavior.
2. Enter verified facts in `shared/legal-config.json`. Set `reviewStatus` to `approved` only after reviewing the actual deployed processing, retention and applicable legal obligations. Regenerate policies with `npm run build:policies`.
3. Complete dependency, source, database, web and native checks. Populate a copy of `launch-attestation.example.json` with verified evidence. Do not simply change its booleans to make the gate green.
4. Run `npm run verify:launch -- path/to/completed-attestation.json`. This combines local checks with clearly labelled owner attestations; it does not certify compliance or predict a store decision.
5. Publish the finalized public policies/deletion page, verify them while signed out, validate both signed binaries, upload for testing, and submit the matching store declarations/reviewer instructions. Resolve any reviewer feedback before general release.

The backup repository remains the frozen checkpoint and must not be pushed to or updated.
