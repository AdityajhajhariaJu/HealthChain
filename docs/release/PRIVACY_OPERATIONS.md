# Privacy request and incident operations

**Operator checklist to adopt and verify before launch.** These are procedures to implement, not claims that an unstaffed support process already meets every deadline.

## Requests and appeals

Monitor the published privacy inbox and record each access, correction, portability, withdrawal, deletion and appeal request with its receipt time, requested scope, applicable market and assigned operator. Do not place customer records in GitHub issues or public logs. Verify ownership proportionately; never ask for a password, full payment-card number or unnecessary medical records.

Identify the applicable deadline and notice/extension rules. For an applicable GDPR request the ordinary response period is one month; other jurisdictions have their own conditions. A refusal needs a supported reason and the applicable appeal/complaint route. Do not use the same response template to deny all requests. [GDPR Article 12](https://eur-lex.europa.eu/eli/reg/2016/679/oj)

For access/export, confirm the account scope, gather the supported account records and deliver them securely to the verified requester. Explain any unavailable records and provider/retention limits. The application's archive is useful but does not by itself prove that every provider log or legal record has been included.

For deletion, use the supported authenticated server route or the operator's verified administrative process. Check database deletion, Storage API deletion, session revocation, Auth deletion and client owner erasure; preserve the erasure guard against stale queued restores. Retry a partial failure rather than reporting success. Notify applicable processors/recipients and handle backups where the relevant law requires it. Record the necessary completion metadata without retaining a replacement copy of the person's health file.

The service-only erasure marker retains the former account ID and request time without an automatic expiry. Review its necessity and justified period against the actual recovery window. Before any restore exposes health records, reconcile markers for deletions occurring after the backup; restoring an old snapshot can otherwise lose those markers. Keep this procedure and any restricted marker export outside the public repository.

For withdrawal, distinguish optional measurement, future AI requests, device access and core account health processing. Explain which features need the withdrawn processing and provide the supported deletion/guest alternatives. Withdrawal does not create consent for another purpose or automatically cancel an independently billed store subscription.

The new Settings cloud-health withdrawal is account-specific **on that device**. It pauses subsequent health reads/writes and signed-in AI there; it does not remotely change other device receipts, erase earlier provider inputs or centrally record consent. For an account-wide request, record and enforce the requested server-side restriction through a verified administrative process, revoke affected sessions where necessary, and explain retention/deletion choices. Do not claim that a local preference alone fulfils an account-wide instruction. Account deletion remains the supported complete in-app removal route.

### Request routing and time limits

Use the earliest applicable duty; acknowledge promptly, without treating acknowledgment as completion. Keep a restricted request register with request ID, receipt/authentication time, jurisdiction/scope, verification performed, assigned operator, due date, processors contacted, action taken and response. Keep minimal verification evidence rather than a second health-file copy.

| Applicable request | Clock/action |
|---|---|
| EU/UK GDPR | Ordinary response within one month; up to two additional months for a permitted complexity/number extension, with reasons communicated within the first month. Follow the actual law on identity verification and charging/refusal. |
| Washington consumer health | Ordinary fulfillment within 45 days of receipt; authentication does not extend that clock. One permitted 45-day extension requires timely reasons. Appeal response within 45 days. Notify relevant recipients/processors of deletion; the conditional archive/backup delay cannot exceed six months after authentication. Preserve the restoration erasure guard. [RCW 19.373.040](https://app.leg.wa.gov/RCW/default.aspx?cite=19.373.040). |
| Nevada consumer health | Ordinary response within 45 days after authenticating the request, with a permitted additional 45 days and timely reasons. Active deletion/recipient notification has a separate 30-day period after authentication; backup exception can extend only within the statutory conditions. Appeals have their own 45-day period. [SB370 sections 24–27](https://www.leg.state.nv.us/Statutes/82nd2023/Stats202329.html). |
| India SPDI grievance, where applicable | Designate and publish the grievance officer's name/contact, and address grievances expeditiously within one month. Electronic notice/withdrawal must meet the applicable consent rules; the local receipt is not a substitute for a responsible contact. [Gazette rules 5–7](https://www.wipo.int/wipolex/en/legislation/details/15063). |
| Australia, Switzerland, Brazil and other markets | Apply the actual access/correction/deletion/appeal period and exceptions for the request, not a universal GDPR template. Promptly identify the law and due date in the register; retain the route to OAIC, FDPIC, ANPD or the relevant authority. |

Reply structure: confirm the verified request/scope, explain actions and provider limits, give any lawful refusal/extension reason, and provide the applicable appeal/complaint route. Deliver exports securely rather than as public issue attachments. Account-wide withdrawal and deletion instructions must reach the relevant processors when law requires; record their responses and actual exceptions rather than assuming Gemini's standard 55-day retention is an automatic exemption from consumer rights.

## Incident handling

Assign an incident contact and backup contact. On a suspected exposure, record the time and affected systems, stop the exposed path, preserve necessary forensic evidence securely, revoke compromised credentials/sessions and involve the relevant hosting/database/provider support. Avoid copying private health records into public debugging channels.

Determine what was accessible or disclosed, which accounts/data categories are affected, which laws/contracts apply, and whether notification duties have been triggered. Use actual evidence rather than assuming that an RLS flag, hashed key or medical disclaimer prevents a breach. Check consumer health obligations, including the FTC rule where applicable, and jurisdiction-specific regulatory/individual deadlines. [FTC guidance](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0)

Prepare factual notifications describing the affected information, timing, protective steps, operator actions and contact route as required. Do not announce a certification, complete deletion or absence of access that has not been verified. Keep a restricted incident record, remediation evidence and a follow-up review of provider contracts, logs, retention and request handling.

### Incident clocks for the primary markets

Start the register immediately on awareness; preserve that timestamp even when scope is uncertain. Provider involvement does not transfer the controller's own duties. Unauthorized disclosure to a provider can be a health-data breach even without a hacker. Reports can require staged updates; do not wait for complete forensic certainty to miss a triggered deadline.

| Applicable regime | Trigger and timing |
|---|---|
| EU/UK GDPR | Notify the relevant authority without undue delay and, where feasible, within 72 hours of awareness unless the breach is unlikely to risk individuals' rights/freedoms. High-risk affected individuals generally need notice without undue delay. Record why a notification is or is not required. [ICO breach guidance](https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach/personal-data-breaches-a-guide/). |
| US FTC HBNR | For covered unsecured health-data breaches, notify affected US individuals without unreasonable delay and within 60 calendar days. FTC notification for 500+ people is at the same time; fewer than 500 follows the annual reporting period. Media notice has a separate 500-residents-in-one-area threshold. State laws can require earlier notices, including Washington's applicable 30-day rule. [FTC](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0), [Washington](https://www.atg.wa.gov/washington-s-data-breach-notification-laws). |
| Australia NDB | If coverage and suspicion criteria apply, conduct a reasonable, expeditious assessment and take all reasonable steps to finish within 30 calendar days. An eligible breach likely to cause serious harm, not remedied to avoid that harm, requires OAIC/individual notification as soon as practicable. This is not a universal 72-hour rule. [OAIC](https://www.oaic.gov.au/privacy/notifiable-data-breaches/preventing-preparing-for-and-responding-to-data-breaches/data-breach-preparation-and-response/part-4-notifiable-data-breach-ndb-scheme). |
| India CERT-In | Covered entities must report specified cyber incidents within six hours of noticing or being informed of them. Maintain the required point of contact, time synchronization and 180-day ICT logs in India where the directions apply. Confirm scope and a working log/reporting arrangement; Vercel Hobby's runtime retention alone does not fulfil this. [Directions](https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf). |
| Switzerland FADP | Breaches likely to create high risk require FDPIC notice as soon as possible; notify individuals when necessary for their protection or required by the authority. [FDPIC guidance](https://www.edoeb.admin.ch/dam/en/sd-web/T64CAUyvAMcF/1_2%20Leitfaden%20des%20ED%C3%96B%20betreffend%20die%20Meldung%20von%20Datensicherheitsverletzungen%20und%20Information%20der%20Betroffenen%20nach%20Art.%2024%20DSG_EN.pdf). |
| Brazil LGPD/ANPD | Where relevant risk or harm triggers reporting, the ordinary period for ANPD and affected-person notices is three working days after awareness, subject to applicable legal exceptions/extensions. Apply the actual regulation and qualifying agent rules; do not treat every minor event as automatically reportable. [ANPD](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca). |

India's final DPDP framework has phased commencement; do not substitute future DPDP clocks for the currently applicable CERT-In/other duties. See `WORLDWIDE_PRIVACY_REVIEW.md`. For other countries, add the actual triggered duty to the register; worldwide availability is not evidence that one notification covers every authority.

Incident notice fields: operator/contact, discovery and event period, affected data/categories and recipients, likely consequences, containment/remediation, steps individuals can take, and available assistance. Use required local format/language/channels and keep delivery evidence privately. Do not send these notices until an actual incident and appropriate authorization; this runbook is preparation, not an external message.

## Routine release review

Verify security advisors and owner policies after schema changes; review service-only grants; monitor scheduled cleanup failures; and confirm that the chosen paid AI/provider terms remain applicable. Reconcile SDK and store data declarations whenever a provider or collection purpose changes. A new purpose or health-sharing category needs the relevant notice and affirmative permission before use.

For optional product measurement, periodically verify refusal/GPC and withdrawal behavior, server-controlled administrator access and the 90-day aggregate cleanup. Reports are event counts rather than unique users or verified revenue. Do not combine exports with identifiable health records or add health-specific categories without a separate purpose and legal review. See `MEASUREMENT.md` for the collected fields and legacy-deployment limits.

Review the public legal identity/contact, policy version, support inbox, deletion instructions and store forms together. Keep the frozen backup checkpoint separate from ordinary active-repository releases.

## Operator review

The operator can complete the documented factual/contract review without hiring a lawyer. Record supported facts and unresolved obligations for the selected markets; the code does not require a paid certificate. See `PROVIDER_REVIEW.md`.
