# Native subscriptions and Apple login setup

The operator selected **monthly automatically renewing subscriptions in the mobile apps only**, plus native Apple sign-in while retaining Google/email login. Minimum user age is 18. Launch intent and primary audiences are worldwide, explicitly including India, USA, UK, Germany, Australia, Switzerland, Italy and Brazil, subject to store/provider availability and applicable local requirements. This branch prepares the code. Native checkout is disabled until account configuration and signed-device evidence exist. Web Razorpay plans remain prepaid. New binaries must use the activated direct health route described in `HEALTH_BACKEND_ACTIVATION.md`.

| Plan | Both-store product ID | Apple period | Google auto-renewing base plan |
|---|---|---|---|
| pro_30_days | com.healthchain.app.pro30 | 1 month | monthly, P1M |

The launch catalog and native screen offer only `pro_30_days`. The quarterly identifier is retained solely for verification/restoration compatibility; do not create or advertise it as a new launch offer.

Register products, storefronts, tax settings and prices in App Store Connect/Play Console. Use one Apple subscription group with appropriate levels. Initially use standard offers without trials, promotions, installments, prepaid or special billing plans; those need matching disclosures. Native screens use localized store prices/calendar periods, explain renewal, and include Terms/Privacy, Restore purchases and Manage subscription. Active recorded subscriptions block another checkout. Razorpay refuses new native digital checkout, including older upgrade entry points. Separate native top-ups are unavailable because their expiring-credit model needs redesign.

## Server and notifications

Use the SERVER ONLY settings in `.env.example`; never put keys in VITE_ variables, Git or a mobile bundle. Supply a stable random STORE_ACCOUNT_TOKEN_SECRET of at least 32 characters. Rotation needs a purchase-binding migration plan.

Apple needs an App Store Server API private key/key ID/issuer ID and numerical App Apple ID. Keep production/Sandbox deployments separate. The official library checks certificate chain/revocation, environment and bundle. Public Apple Root CA G3 comes from [Apple PKI](https://www.apple.com/certificateauthority/); SHA-256 `63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179`.

Google needs a restricted service account permitted to query and acknowledge this app's subscriptions. Configure authenticated Pub/Sub real-time developer notifications with the exact receiver audience and approved service-account email. Production rejects test purchases unless the staging-only test setting is explicitly enabled. The server acknowledges only after successful durable fulfillment, including pending purchases completed while the app is closed; it never consumes a subscription. Already acknowledged renewals are not acknowledged again.

Receiver: `https://YOUR_REVIEWED_BACKEND/api/store-purchases`. Customer GET/POST requires verified Supabase authentication. Notifications require Apple V2 signatures or Google OIDC identity/audience/email verification. They find the existing account binding and fetch current store state rather than trusting client amount, expiry, user ID or an old device receipt. Use staging flags for controlled sandbox tests; enable production only after notification/lifecycle validation. Verify API routing and public-certificate packaging.

Vercel rewrites this public endpoint to `verify-payment?checkout=store`, which dispatches to the separate server-side native handler before the web gateway checks. This keeps the deployment at 12 API functions. Both handlers retain their provider-specific authentication, rate limits and fulfillment checks; web payment URLs remain unchanged.

Migration `20261005070452_native_store_purchases.sql` is applied. Its table and atomic RPC are service-only; period keys deduplicate renewals and group keys support notifications. It stores hashes/IDs/dates/entitlements, not raw receipts/tokens or medical data. Auth deletion cascades the ledger. Synthetic SQL tests use generated accounts and roll back all rows.

Android pending checkout queries the account's purchases to register a non-granted ledger binding. Notification fulfillment requires that binding. If first registration failed before the app closed, or an Apple deferred purchase has no previously recorded group, an unknown notification is ignored; foreground recovery/explicit restore must establish the entitlement. Verify these first-purchase cases in the sandbox before activation; automatic background delivery has not been established for an unbound purchase.

## Apple login

Enable Sign in with Apple for `com.healthchain.app` and provision its entitlement in the Apple developer account. Enable the Supabase Apple provider with this bundle ID as a native Client ID. Native ID-token login does not need a web OAuth client secret; adding web OAuth later requires its own setup/rotation.

AuthenticationServices receives random state/hashed nonce; Supabase validates the ID token with the raw nonce. Cancellation is normal. First-authorization names are saved only after authentication; later sign-ins do not erase them. Google/email remain. Test existing Google accounts and Apple's private-relay email; do not merge accounts on an unverified email claim.

Account deletion requests a fresh native authorization code for the same Apple identity, without changing the Supabase session. Server-only APPLE_SIGN_IN_TEAM_ID/KEY_ID/PRIVATE_KEY create a short-lived client secret; Apple code exchange plus signature/bundle/subject verification precede token revocation. No Apple refresh/access token is retained. If Apple proof/configuration is unavailable, HealthChain data deletion still completes and directs the user to Apple's manual revocation instructions, as described in [Apple TN3194](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple). Test automatic revocation, manual fallback, subsequent authorization and externally revoked credentials on a signed device. Revocation keys are separate from App Store Server API keys. Native credential-change notifications and foreground checks sign out only the same current account on confirmed revocation/not-found; offline failures and account switches do not sign out another account.

The iOS button uses Apple's generated black sign-in artwork from `https://appleid.cdn-apple.com/appleid/button?color=black&border=false&height=44&type=sign-in&width=290`, bundled locally. Verify its size, contrast and presentation on the signed device.

## Required signed-device checks

Test purchase, cancel, pending/Ask to Buy, termination before confirmation, account switch, restore, renewal without opening the app, cancellation with access until expiry, grace, billing retry/on-hold, expiry, refund, duplicate/out-of-order notification, changed plan and refund reversal. Check real prices, publisher access, signatures and confirmation screens. **Changes/refund reversals and overlapping web/store purchases require actual event review before enabling general release.** Synthetic tests do not establish these flows end to end.

The pinned purchase SDK is patched reproducibly by npm postinstall to keep native purchase-object diagnostics in debug builds; Capacitor logging is debug-only. Inspect release logs and the actual aggregate SDK privacy manifest. A new signed AAB/Xcode archive and real-device review are still required.

Sources: [Capgo purchases](https://capgo.app/docs/plugins/native-purchases/), [Apple server library](https://github.com/apple/app-store-server-library-node), [Google subscriptions v2](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2), [Supabase Apple login](https://supabase.com/docs/guides/auth/social-login/auth-apple).
