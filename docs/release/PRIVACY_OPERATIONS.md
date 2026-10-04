# Privacy request and incident operations

**Operator checklist to adopt and verify before launch.** These are procedures to implement, not claims that an unstaffed support process already meets every deadline.

## Requests and appeals

Monitor the published privacy inbox and record each access, correction, portability, withdrawal, deletion and appeal request with its receipt time, requested scope, applicable market and assigned operator. Do not place customer records in GitHub issues or public logs. Verify ownership proportionately; never ask for a password, full payment-card number or unnecessary medical records.

Identify the applicable deadline and notice/extension rules. For an applicable GDPR request the ordinary response period is one month; other jurisdictions have their own conditions. A refusal needs a supported reason and the applicable appeal/complaint route. Do not use the same response template to deny all requests. [GDPR Article 12](https://eur-lex.europa.eu/eli/reg/2016/679/oj)

For access/export, confirm the account scope, gather the supported account records and deliver them securely to the verified requester. Explain any unavailable records and provider/retention limits. The application's archive is useful but does not by itself prove that every provider log or legal record has been included.

For deletion, use the supported authenticated server route or the operator's verified administrative process. Check database deletion, Storage API deletion, session revocation, Auth deletion and client owner erasure; preserve the erasure guard against stale queued restores. Retry a partial failure rather than reporting success. Notify applicable processors/recipients and handle backups where the relevant law requires it. Record the necessary completion metadata without retaining a replacement copy of the person's health file.

For withdrawal, distinguish optional measurement, future AI requests, device access and core account health processing. Explain which features need the withdrawn processing and provide the supported deletion/guest alternatives. Withdrawal does not create consent for another purpose or automatically cancel an independently billed store subscription.

## Incident handling

Assign an incident contact and backup contact. On a suspected exposure, record the time and affected systems, stop the exposed path, preserve necessary forensic evidence securely, revoke compromised credentials/sessions and involve the relevant hosting/database/provider support. Avoid copying private health records into public debugging channels.

Determine what was accessible or disclosed, which accounts/data categories are affected, which laws/contracts apply, and whether notification duties have been triggered. Use actual evidence rather than assuming that an RLS flag, hashed key or medical disclaimer prevents a breach. Check consumer health obligations, including the FTC rule where applicable, and jurisdiction-specific regulatory/individual deadlines. [FTC guidance](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0)

Prepare factual notifications describing the affected information, timing, protective steps, operator actions and contact route as required. Do not announce a certification, complete deletion or absence of access that has not been verified. Keep a restricted incident record, remediation evidence and a follow-up review of provider contracts, logs, retention and request handling.

## Routine release review

Verify security advisors and owner policies after schema changes; review service-only grants; monitor scheduled cleanup failures; and confirm that the chosen paid AI/provider terms remain applicable. Reconcile SDK and store data declarations whenever a provider or collection purpose changes. A new purpose or health-sharing category needs the relevant notice and affirmative permission before use.

Review the public legal identity/contact, policy version, support inbox, deletion instructions and store forms together. Keep the frozen backup checkpoint separate from ordinary active-repository releases.
