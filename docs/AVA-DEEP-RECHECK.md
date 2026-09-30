# Ava: deeper architecture and interaction recheck

Implementation update: see [Ava implementation and release checks](AVA-IMPLEMENTATION-STATUS.md). The findings below describe the historical audit baseline.

30 September 2026. Baseline application: `98c05d29`. Preserve the current theme, floral background, conversational tone and the user's preferred combination of dropdowns and interactive cards. This is a functional and behavioral audit, with a concrete implementation backlog. It is not a claim of clinical validation or universal satisfaction.

## Current assessment

Ava still has known release blockers. The earlier [16-finding baseline audit](AVA-BASELINE-AUDIT.md) was an audit, not a completed implementation. New browser probes reproduced the case-selection, transcript, memory, attachment, study-route and keyboard problems. Read-only live database inspection confirmed that the wellness completion owner-check defect is still present.

One connected defect was fixed during this recheck: the diary card previously created extra observations just by rendering. It assigned calories/macros from the number of food names and inferred symptom severity. It is now a read view with the same visual card and Health River navigation. A mounted StrictMode regression and an actual Ava browser probe confirm that rendering it leaves one existing meal as one meal. Do not repair old affected customer records automatically: they need provenance review before any deletion or correction.

The desired experience is achievable as a collection of bounded, reliable workflows. More cards alone will not establish reliability. Every card needs a defined purpose, message identity, source, destination and truthful result.

## Evidence collected in this recheck

All browser probes used isolated synthetic guest profiles, blocked external HTTPS calls and mocked model responses. They did not consume a customer consultation or write production patient records. Live database checks read function definitions and permissions only; no cross-user exploit was attempted.

| Check | Observed result |
| --- | --- |
| Case B chat request | Correctly excluded Case A turns; keep this protection |
| Visible Case B transcript | Still displayed Case A messages |
| Choosing General | Restored the globally active case instead of respecting General |
| Separate memory extractor | Included Case A statements while talking about B; stored facts without case ID |
| Saved synthetic allergy | Absent from the actual Ava provider payload |
| Meal-image composer entry | Called `lab_analysis`; exact extracted biomarker did not survive into the chat |
| Study-ID URL | Reproduced a maximum-update-depth error |
| Case dialog | Focus remained outside; Escape did not close it |
| 320 px mobile | No horizontal overflow; no visible case selector; composer controls only 30–34 px high |
| Reply with calm, workout and diary widgets | Rendered the diary card but neither calm nor workout action; widget markup itself was hidden |
| Reply explicitly saying not to use breathing | Still added a “Recommended Clinical Protocol” breathing card |
| Existing diary rendered inside chat | Meal count stayed 1 after the fix; previously rendering could write more records |
| Live wellness completion RPC | SECURITY DEFINER, authenticated execution allowed, caller-supplied owner ID, no comparison with `auth.uid()` |

Reproducers and machine-readable results are saved in the task's `ava-recheck` artifact directory: `probe.mjs`, `probe-results.json`, `interaction-probe.mjs`, `interaction-results.json`; screenshots include desktop, mobile, mixed-card and negated-card states. The baseline report contains the earlier gateway and connected-tool reproductions. Old gateway findings have not been relabelled as newly tested live results.

## New interaction findings beyond the baseline

### AVA-17: one widget can suppress the other choices — P2

`MessageRenderer` uses a chain of early returns. A diary tag wins over a calm/workout tag regardless of the order in the answer. A combined answer therefore loses actions. Repeated widgets and unknown/truncated tags have no consistent partial-recovery contract.

Implement ordered validated message segments. Preserve explanatory text and each supported card in order; isolate a malformed item to an unavailable state. Bound payload size/card count and retain a plain reply when a card fails. Render the same structure after reload. A parser success test alone is insufficient: mount the complete reply and operate every action.

### AVA-18: mentioning an exercise becomes recommending it — P1

A separate keyword rule adds a calm recommendation for words such as breathing/anxiety/4-7-8. It ignores negation, quoting, historic discussion, contraindication discussion and whether the person requested relaxation. It can also duplicate a calm widget already in the answer.

Remove recommendation inference from ordinary reply wording. Use a validated, explicitly supported action proposal with a unique message/action ID and deduplicate it. A phrase saying “do not use” must never produce the rejected exercise's primary action. Approved wellness copy must describe the actual activity without unsupported measured benefits or a “clinical protocol” label implying individual approval.

### AVA-19: “already documented” can imply evidence it has not established — P1

The badge appears when any word from a current case topic or value occurs in a model reply. It neither checks the originating message's case nor verifies that the reply's actual claim agrees with that record. Negative, changed and historic values can all match the same word.

Show “Related saved record” with the exact value/unit/date and source link until an explicit claim-to-record relation is verified. Do not present token similarity as clinical agreement. Contradictions and missing dates should remain visible. Opening a source must open the referenced record, not the first record of the currently selected case.

### AVA-20: old cards can silently change their evidence — P2

Diary cards obtain the current latest three meals on every render. Source actions and documented-answer badges use the currently selected case/study. A historic answer can acquire a new record, lose the original reference, or default an action into another case.

Bind each message to stable source IDs and a captured source version. Show “Record updated since this answer” when applicable; let the person refresh explicitly. Keep a separate clearly labelled live overview if needed. Deleted/unavailable records get a stable unavailable state; never substitute another person's or case's data.

### AVA-21: saving a question does not have durable duplicate protection — P2

Saved-action indicators use message array indexes and component state. Reload and transcript trimming can reset or reuse those indexes. Substring question detection can select Ava's follow-up question as an appointment question. The confirmation dialog helps, but its defaults and success indicators still need authority.

Use a stable message/action ID, destination scope and persisted receipt with record ID. Separate “answer this now” from “ask at a visit.” A successful retry returns the existing receipt. Keep the editable confirmation step and show local-save/pending-sync/failure separately.

### AVA-22: switching while an attachment or tool is running is incomplete — P1

The upload scope checks the account/profile key, not the selected conversation case. Cross-case drafts have a generic session fallback. A callback can finish into a different conversation even when the main chat mutation correctly rejects a stale request.

Capture one immutable account/profile/conversation/case scope for generation, file reading, extraction, memory proposals, card actions and tool returns. Cancel or quarantine a stale result. Keep separate attachment/draft state per conversation. Recheck the scope immediately before every write and before displaying its result.

### AVA-23: immersive continuity is missing — P2

Cards open several modal/route destinations without a common return contract. General users need the draft, expanded details, selected case and exact reading position preserved. Auto-scroll uses the thinking state as a reason to move to the bottom; this can interrupt someone reading an older answer. The current transcript lacks a live log region.

Persist expansion state by stable message/card ID. Preserve the composer and reading position when entering/returning from tools. Scroll automatically only when the person is following the newest messages; otherwise show a new-answer indicator. Announce one completed answer and action status, not every animated character. Add cancel/skip-animation and recoverable retry controls.

### AVA-24: dropdown roles need clear meanings — P2

Use a select/picker for choosing a conversation or a value, a disclosure for opening supporting details, and a menu for commands. Do not use one unlabeled chevron for all three. A compact summary may expand sources, interpretation and uncertainty without hiding the actual next step.

Disclosure controls need an accessible button, expanded state and keyboard operation. Modal tools need contained focus, Escape, a visible close action and focus restoration. These requirements follow the [W3C disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) and [modal-dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Real screen-reader and native-keyboard checks remain required; a browser accessibility snapshot is not a substitute.

### AVA-25: availability and result states need one product contract — P2

Each capability needs available/loading/review-required/saving/saved/pending-sync/failed/stale/unavailable states. A successful model reply is not successful execution of a tool. The page currently lacks a consistent manifest of which data each reply used, how fresh it was, and which action really ran.

Use concise contextual states inside the relevant card. Unknown data stays unknown. Missing product, unreadable document, empty diary, denied permission and offline service each need an appropriate fallback. Avoid replacing infrastructure failures with an upgrade card. Operational telemetry should record timings/error codes and IDs without patient text.

## How the card/dropdown experience should work

| User situation / expectation | Useful interaction | Required behavior |
| --- | --- | --- |
| “Explain this report simply” | Record summary card; expandable exact findings, meaning and source | Preserve original values, units, ranges, date/page; uncertain extraction is visible; no diagnostic certainty from the card |
| “What changed?” | Dated before/after comparison; expand the underlying records | Compare compatible units and dates; missing values are not zero; revisions do not overwrite old evidence |
| “Could my medicine relate to this?” | Medication facts and questions card | Include saved allergies and active/discontinued status; separate saved schedule from actual dose; do not change treatment automatically |
| “I ate this / log my day” | Editable meal/check-in draft | Ask only necessary missing fields; save through canonical services on explicit confirmation; show a receipt; displaying it never writes |
| “Help me feel calmer” | Optional supported relaxation card with a short activity description | The button launches the named session; it can be stopped; save actual participation after supported completion; no invented calories |
| “Help me ask my clinician” | Editable appointment-question card | Preserve originating source/message and explicitly chosen destination; avoid duplicate questions and false “saved” states |
| “Show the evidence” | Source disclosure with title, record/study type, date and link | Distinguish trial registration/objectives from published results; cite the supporting passage; unavailable source stays unavailable |
| “What do you remember?” | Reviewable memory proposals and an editable memory drawer | User confirms/rejects/corrects/forgets; case isolation and provenance are retained; AI inference is not silently turned into fact |
| “I changed topic/case” | Persistent General / case picker on mobile and desktop | Transcript, draft, attachment, memory, card action and tools move together; General remains General |
| “I'm unsure / just browsing” | Concise reply and optional follow-up choices | No default write, clinical certainty or irrelevant intervention; accessible text fallback remains available |
| “It failed / I'm offline” | Retry/status card retaining the original request and draft | Retry replays an existing result when possible; no duplicate debit or saved record; local/pending/cloud states are distinguishable |
| “I'm travelling / need a reminder” | Localized resource/help or schedule draft | Country/timezone and permissions are explicit; urgent resources remain reachable without successful generation or subscription |

These are design hypotheses to test with people, not psychological diagnoses or claims about every user's preference. Measure task success, confidence in what was saved, ability to find evidence, reading burden and time to recover from a failure. Preserve the user's preferred richness through relevant optional details rather than making every reply a form.

## Target architecture and contracts

1. **Conversation controller:** explicit General/Case mode; stable conversation/message IDs; captured account/profile/case scope; per-conversation drafts and attachments; history without a global 20-message overwrite.
2. **Context assembler:** mandatory safety facts, exact source records, timestamps/units/provenance, bounded truncation policy and an accurate inclusion manifest. The manifest displayed for an answer matches its actual request.
3. **Server-owned Ava gateway:** allowlisted operation, validated limits and context ownership, explicit mode, stable request ID/payload hash, deadline, usable-output validation, durable result replay and correct reserve/complete/refund handling.
4. **Response adapter:** reply plus ordered supported cards, source references, uncertainty and approved action drafts. Validate schema and meaning independently; model output cannot execute arbitrary tools or claim a write.
5. **Action executor:** review/confirm, verify scope/source version, execute the existing meal/check-in/case/reminder/session service, persist receipt, then acknowledge. Do not introduce parallel patient records inside chat.
6. **Persistence and memory:** merge stable messages/receipts, explicit retention/export/delete, user-reviewed memory provenance and corrections. Clinical profile timestamps do not change just because a chat turn is saved.
7. **Interaction components:** shared source disclosure, record card, follow-up choices, confirmation form, status card and accessible dialogs. Keep the existing Ava theme and use consistent state handling across each component.

## Ordered tickets and acceptance gates

| Step / ticket | Dependencies | Deliverable and acceptance | Current state |
| --- | --- | --- | --- |
| 1 / AVA-16 | Live schema verification | Reject another account's owner ID; verify one owned pending session; validate inputs; idempotent completion; two-user tests; review related privileged RPCs | Confirmed unresolved blocker |
| 2 / AVA-01,02,22 | Conversation identity | A/B/General and missing/deleted case journeys; mobile picker; transcript/action/tool/upload scope agrees; no stale result writes | Reproduced unresolved blockers |
| 3 / AVA-03,04,20 | Step 2 | Mandatory allergies/medication facts; source manifest; user-reviewed memory; immutable answer source IDs; no cross-case extraction | Reproduced / inspected unresolved |
| 4 / AVA-08,09,12 | Server request contract | Same ID and body retry: one charge/result; blank/truncated/blocked refunded; unknown operation rejected; timeout/outage distinct from upgrade | Baseline unresolved; gateway revalidation required |
| 5 / AVA-05,06,07 | Steps 2–4 | Separate food/document paths; exact fixtures survive; study route stable; reviewed urgency/negation/language evaluation and resources | Reproduced unresolved blockers |
| 6 / AVA-10,11,13,21 | Canonical actions + message IDs | Truthful river and explicit check-in; durable save receipts; no duplicate record from view/retry/reload; stable action indicators and history merge | Diary read-side write fixed; remaining work open |
| 7 / AVA-15,17,18,19 | Steps 2–6 | Every named session/action runs its advertised purpose; ordered multi-card replies; no negation-driven recommendation, duplication or false evidence agreement | New card failures reproduced |
| 8 / AVA-14,23,24,25 | Stable component contracts | Accessible dropdown/disclosure/dialog behavior, mobile controls, return/scroll/draft continuity, all failure states, reduced motion | Mobile/keyboard gaps reproduced; implementation open |
| 9 / Release evaluation | Steps 1–8 | Mounted regression, two-user/two-device testing, clinician-reviewed answer/source evaluation, native session/notification tests, production error telemetry and rollback | External and implementation gates remain open |

## Regression matrix

- **Scope:** A/B/General; legacy URL versus explicit General; unavailable/deleted case; change account/case during request, upload, extraction, memory confirmation and save; old message actions after switching.
- **Content:** zero/missing/incompatible units, two contradictory records, historic/fresh values, missing source dates, unreadable document, incomplete extraction, food photo versus lab report, quoted instructions inside a report, trial without results.
- **Cards:** zero/one/multiple/repeated/unknown/truncated cards; malicious unsupported action; reordered segments; negation/quotation/history; explicit user decline; action no longer available; source revised/deleted; view/reload never writes.
- **Writes:** double click, retry, interrupted response after success, offline outbox, local storage full, cloud failure, deleted destination, wrong owner, receipt reload, no cross-profile write; correction and undo preserve provenance.
- **Recovery/accounting:** provider timeout/429/5xx, blank/blocked response, stale subscription, exhausted allowance, result replay, changed payload under same request ID, concurrent retries, reservation recovery after termination.
- **Experience:** 320/390/1440 px; zoom, touch, keyboard and screen reader; expanded sources and scroll retained; modal close returns focus; new-answer indicator while reading history; language choices; native keyboard and background behavior.

## Definition of ready

Close a ticket only with its acceptance evidence. Do not mark the whole Ava feature near-perfect while the owner-check, case/memory, allergy-context, urgency, attachment and accounting defects remain open. Automated tests establish defined functional behavior; clinician review and actual user research establish separate evidence about content quality and usability. The approved theme and rich interaction style are preserved throughout the implementation.
