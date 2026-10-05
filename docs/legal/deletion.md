## Delete your HealthChain account
You can request deletion without installing the app. On the HealthChain website, sign in to the relevant account, open **Settings**, choose **Delete Account**, read the confirmation and type **DELETE**. The same control is available in the mobile app.

[Open Settings](/app/settings) · [Sign in](/login)

If you cannot sign in or the self-service flow fails, email **[[PRIVACY_EMAIL]]** with the subject “HealthChain account deletion”. Send it from the account email where possible and identify the account you want deleted. This opens an actual support request when you send the email; simply opening this page does not submit one. We will verify ownership before deleting records. Do not attach health records, passwords, payment-card details or identity documents unless proportionate verification is specifically requested.

## What successful deletion removes
The server revokes account sessions, removes controlled account-associated profiles, cases, Health Memory, observations/logs, device records, private uploaded objects, optional first-party analytics, AI usage/accounting and application payment/entitlement records included in its deletion transaction, and deletes the authentication account. The app attempts to erase corresponding owner-scoped local storage after confirmation.

If remote deletion fails, the app reports an error rather than pretending the account is deleted. A partial failure may require a retry or support assistance. An account is not treated as permanently deleted merely because you signed out or removed the app.

## Exceptions and copies
Processor security logs, legally retained transaction records and protected provider backups can have separate retention periods. Previously processed AI requests cannot be recalled from a provider by a device setting. Files you exported, copies you shared, records in your Apple Health/Health Connect account and third-party payment histories are outside the deletion transaction.

A restricted marker containing the deleted account identifier and deletion-request time remains to prevent delayed synchronization or a restored backup from recreating the erased records. It contains no health-record payload and currently has no automatic expiry. The operator must review its retention against the confirmed recovery window and applicable law.

Backup restoration must preserve or reconcile deletion markers before restored records become accessible; an older backup alone can omit a later deletion request.

[[RETENTION_DETAILS]]

Deleting an account does not itself cancel an independently managed store subscription. Cancel through its seller's subscription controls and use the seller's refund process where applicable.

## Sign in with Apple
For an Apple-linked account, the iOS app may ask you to confirm the same Apple identity so the server can revoke its sign-in access. This does not change which HealthChain account is deleted. If no usable Apple authorization is available, HealthChain deletion still proceeds and the completion notice directs you to remove Apple access manually: **iPhone Settings → your name → Sign in with Apple → HealthChain → Delete**. You can also manage these connections at **account.apple.com → Sign-In and Security → Sign in with Apple**. Follow [Apple's current instructions](https://support.apple.com/en-us/102571) if the labels differ on your device. Removing Apple sign-in access and cancelling an App Store subscription are separate actions.

## Guest/device-only data
Guest use does not create an identified cloud account. Clear the relevant site/app data to remove guest records, and remove any exported files or downloaded audio separately. Export first if you need a copy. Clearing storage is irreversible and does not delete a separate signed-in cloud account.

## Assistance and rights
Deletion and privacy requests: **[[PRIVACY_EMAIL]]**. Requests are verified and handled within the applicable legal response period. An authorized agent can contact us with proof of authority. Use the regional privacy notice for additional rights or an appeal. Operator: **[[OPERATOR_NAME]], [[OPERATOR_ADDRESS]]**.
