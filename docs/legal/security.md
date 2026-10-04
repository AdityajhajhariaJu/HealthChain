## Privacy controls you can use
Your private workspace is intended for your account rather than a public feed. You choose when to provide records, enable device imports, use AI, allow optional measurement, export files, or request deletion.

Settings includes withdrawal of future AI permission and optional measurement. Device health and notification permissions can be changed through operating-system settings. Guest use keeps most workspace records on the current device but is not an anonymous browsing system.

## How requests are protected
HealthChain uses HTTPS for its hosted APIs, validates account tokens for authenticated operations and uses owner checks on core health-record tables. Provider infrastructure supplies additional controls. Server-only credentials do not belong in the frontend. API abuse controls and quotas limit requests.

AI features need readable inputs at HealthChain's server and Google Gemini, so they are not described as end-to-end encrypted. Browser storage and Capacitor Preferences are also not described as a separately encrypted medical vault. A screen lock, device encryption and careful use of exports matter.

## Measurement and advertising
This release uses optional, allowlisted first-party product counts after your choice. Browser and server validation allow only fixed categories; the service stores combined daily counts without account or device identifiers. Reports require authorized administrator access and cover up to 90 days. It does not load third-party advertising pixels. Health records, symptoms, severity, raw prompts, uploads, selected sounds, payment amounts, exception text and arbitrary button text are excluded from measurement.

## Deleting information
Use **Settings → Delete Account** or the [public request page](/delete-account). Successful deletion removes controlled active records and supported private uploads, revokes sessions and deletes the account. External provider/payment records, lawful retention and backup handling have separate limits explained in the [Privacy Policy](/privacy).

## Reporting a concern
Report a vulnerability or suspected account compromise to **[[SUPPORT_EMAIL]]**. Include a description and safe reproduction steps. Do not send another person's private records, authentication tokens or passwords. For an urgent medical issue, contact local emergency services rather than this support channel.

HealthChain does not advertise a security certification or regulatory healthcare approval based on these product controls. See the Privacy Policy for data categories, providers, permissions, rights and retention.
