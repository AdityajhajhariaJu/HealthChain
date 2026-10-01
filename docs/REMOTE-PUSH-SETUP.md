# Remote notification setup and acceptance

The deployed web app uses in-app notifications. Native daily hydration, medication,
meal and check-in reminders use local device schedules. Remote push is a separate
connection: the new authenticated `/api/push-test` endpoint tests the current
account's registered installation with FCM on Android or APNs on iPhone.
It does not create a scheduled server reminder service or replace local reminders.

## Android

1. Register Android package `com.healthchain.app` in the intended Firebase project.
   Place its `google-services.json` at `android/app/google-services.json`.
2. Enable FCM HTTP v1 and set `FCM_SERVICE_ACCOUNT_JSON` in the Vercel project's
   server environment to a service account authorized to send FCM messages.
   Keep credentials out of Git and all `VITE_` variables. Redeploy the API after
   environment changes and rebuild/install the native app after Firebase changes.
3. Sign in, grant notifications and use Settings → Test remote push connection.
   The API reports provider acceptance; confirm the actual notification on the phone.

## iPhone

1. Enable Push Notifications for `com.healthchain.app` in the Apple developer
   account and use a matching signing/provisioning profile. Registration callbacks
   and entitlements are now in the native project. Build and sign on macOS.
2. Set server environment `APNS_PRIVATE_KEY` (the `.p8` key), `APNS_KEY_ID`,
   `APNS_TEAM_ID`, `APNS_TOPIC=com.healthchain.app` and `APNS_ENVIRONMENT`.
   Use `sandbox` for a development installation and `production` for distributed
   builds. Never commit the signing key. Redeploy after environment changes.
3. Use the same on-device remote test and confirm notification receipt.

## Required physical acceptance

- Android and iPhone: foreground, background and terminated app; tap returns to Today.
- Denied permission, expired token and missing provider credentials report failure.
- Account A → logout → B: stale A actions cannot navigate or modify B records.
- Repeat tests do not create medication doses or hydration records.
- Local reminders: timezone changes, daylight-saving transitions, quiet hours,
  disabled reminders and schedule changes; check actual device delivery.
- Server acceptance never appears as proof of phone delivery. Provider rejection
  and invalid tokens are surfaced; invalid token cleanup targets that installation.

Automated tests validate ownership, authentication, provider acceptance handling,
FCM request structure, listener readiness, action routing and duplicate receipt
events. They do not prove APNs signing, Firebase project permissions, a native
build, phone receipt or a scheduled server reminder service. Those gates remain
open until provider configuration and physical devices are available.

References: [Capacitor native push setup](https://capacitorjs.com/docs/apis/push-notifications),
[Firebase HTTP v1 sending](https://firebase.google.com/docs/cloud-messaging/send/v1-api),
[Apple token-based APNs connection](https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns).
