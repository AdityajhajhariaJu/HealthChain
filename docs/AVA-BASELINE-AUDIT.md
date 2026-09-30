# Ava audit and implementation plan

Date: 30 September 2026
Code reviewed: HealthChain-Live, master, `bbb51f15`
Live database checked: Supabase project `cikikocfvfshloqwnyfe`
Scope: architecture, medical evidence handling, personalization, saved actions, case/profile isolation, attachments, research handoffs, quotas, recovery, persistence, mobile design, accessibility, and connected tools.

## Assessment

**Ava is connected to useful parts of the app, but it does not yet meet the reliability and accuracy standard requested.** There are reproducible failures in the main workflows. A broader feature catalogue would not resolve them.

The recommended product is a dependable health companion that helps people understand saved information, describe changes, reflect on wellbeing, and prepare for care. Every displayed measurement, saved action, memory, and research claim needs an identifiable source or an explicit uncertainty label. Ava should not claim clinician supervision, continuous monitoring, unlimited access, or guaranteed medical correctness where these are not provided.

This report is an audit and implementation specification. The app source and production deployment were not changed during the audit. Audit probes, screenshots, and results are stored separately from the application repository.

## Evidence and limits

- Six targeted existing test files passed: **34 tests**. These cover action helpers/components, widget parsing, memory, gateway helpers, and run context. Several “isolation” tests simulate variables or storage keys without mounting the complete Ava workflow.
- Synthetic browser probes exercised the mounted application at **1440 × 1000** and **390 × 844**, using fabricated cases and profile data. External network calls were blocked, and AI responses were mocked.
- An isolated gateway probe exercised the real `api/gemini.js` handler with mocked authentication, quota RPCs, request ledger, and provider responses. It did not consume production credits.
- Live Supabase checks were read-only metadata, function definitions, and aggregate queries. RLS is enabled on the six initially checked tables, plus cases and user devices. Quota/provisioning functions are executable by the service role and are not executable by `anon` or `authenticated`. The connected wellness completion function has a separate ownership defect, described in AVA-16.
- The recent finished-request aggregate for Ava, memory extraction, and lab analysis returned no rows in the queried seven-day interval. This does not establish clinical answer accuracy or overall production usage.
- Native camera, real-device keyboard/background behavior, delivery of push notifications, two-device sync, and a clinician-reviewed live answer evaluation remain unverified. They need explicit release checks.

Evidence: [browser results](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/probe-results.json>), [gateway results](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/gateway-results.json>), [research handoff results](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/study-results.json>), [connected tools results](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/tools-results.json>), [live database metadata](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/supabase-metadata.json>).

## Connections: current state

| Connection | What exists | Assessment |
|---|---|---|
| Profile → Ava | Demographics, conditions, medication names, family history | Incomplete: saved profile allergies are omitted; active medication dose/status and important dates are not carried reliably |
| Selected case → chat request | Case context and filtering of turns by case ID | The probed Case B chat request correctly excluded Case A turns; selection, transcript display, actions, and connected tools do not use that scope consistently |
| Ava → case timeline/visit questions | Editable confirmation dialogs and case destinations | Useful foundation; message provenance and default destination must be corrected, with durable save acknowledgements |
| Ava → Health Memory | Automatic fact extraction and session events | Case content enters an unscoped memory path; user correction/confirmation is missing |
| Ava → meal diary | Quick Meal sheet and canonical meal commands | The explicit meal logger is connected; the composer’s meal-photo button uses lab analysis |
| Ava → daily check-in | A conversational “Log your day” prompt | No corresponding structured daily-check-in save is executed by this path |
| Ava → research | Trial handoff and study badge | Query/reload can cause a render loop; source presence and citation fidelity are not reliable |
| Ava → Clinical Connections | Modal and review graph | Resolves the globally active case instead of Ava’s selected case |
| Ava → Whole Health River | Profile-derived timeline and ask-Ava handoff | Invents timestamps, symptom scores, and a causal relationship; new entries only update component state |
| Ava → notifications | General app push infrastructure exists | No Ava conversational tool execution was found for creating a verified reminder; delivery was not tested in this audit |
| Ava → calm session completion | Shared Meditation Player and fitness completion RPC | Built-in Ava ID is incompatible with the live UUID contract; completion errors are only logged; the privileged RPC lacks an ownership check |
| Ava → subscription/accounting | Authenticated gateway, quota reservation, request ledger | Database permissions are sound; operation classification, blank responses, and replay behavior need correction |

## Confirmed findings

**P1** means a release blocker for the requested dependable clinical/wellbeing experience. **P2** means an important functional, trust, or usability gap. Evidence is identified as browser/gateway reproduction or source inspection; these findings are not claims about the accuracy of every live model response.

### AVA-01 — Case selection is not authoritative · P1

**Browser reproduction:** selecting General Health Conversation while a case is active leaves that case selected. The picker removes `caseId`, then a URL effect resolves the active/first case again. Legacy `importCase` and router state can also override selection.

**Connected-tool reproduction:** Ava selected Case A while the global case resolver returned Case B. Clinical Connections uses that global resolver. Ava’s Case Prep/Gut Health callbacks also omit the selected case ID. On mobile, the case selector is absent.

Change: make General an explicit mode; resolve account/profile/case once; pass it to every tool, route, attachment, request, and save. Clear conflicting legacy navigation state. Provide the same case controls on mobile.

Sources: [picker](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1445>), [URL effect](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1533>), [case resolver](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/caseWorkspace.ts:67>), [Connections scope](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/ui/ConnectionDetectiveView.tsx:305>), [tool handoffs](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:3148>).

### AVA-02 — Transcript, saved actions, and history disagree about the case · P1

**Browser reproduction:** Case A messages remain visible after selecting Case B. The individual B chat payload excludes A, which is a protection worth retaining.

**Source inspection:** the action toolbar for an older message uses the currently selected case and its documented answers, rather than the originating message’s case. An old observation can default to the wrong destination. Saved-action IDs use transient message indexes, so trimming/reloading can cause misleading indicators or duplicate actions. The global transcript is trimmed to the greeting plus the last 20 messages, which can discard another case’s history.

Change: persistent conversation and message IDs; case-specific history; message-bound action provenance/destinations; durable action deduplication. Preserve legacy messages as unassigned when their case is unknown.

Sources: [transcript rendering](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:2249>), [action destinations](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:2556>), [index-based save state](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1487>), [history trimming](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1669>).

### AVA-03 — Automatic memory mixes cases and loses provenance · P1

**Browser reproduction:** a B conversation caused memory extraction to include A’s content; the extracted A fact and session memory were saved with no case ID. Main chat filtering does not protect the separate extractor.

**Source inspection:** extraction uses the shared transcript. Attachment interpretations are embedded in user-message text. The prompt asks the model not to promote them into facts, but there is no structured provenance enforcement or user confirmation. The returned array’s item types are not validated before calling string methods. Memory context also does not subscribe directly to memory updates.

Change: extract only from the current conversation’s explicit user statements; validate each candidate; retain message/source IDs and case/profile IDs; offer “Remember this?” with edit, reject, correct, and forget controls. Distinguish user reports, source records, and AI summaries.

Sources: [memory writes](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1654>), [extractor](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/geminiService.ts:1999>), [context cache](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1381>).

### AVA-04 — Personalization omits safety-relevant facts · P1

**Browser reproduction:** a saved synthetic penicillin allergy was absent from the Ava chat payload.

**Source inspection:** the shared profile compiler includes medication names, but not profile allergies, active/discontinued status, dose, or schedule. Its character cap can cut context arbitrarily. Ava disables global lab inclusion. A nonempty general memory snippet can select the case prompt even without an attached case, disabling general daily-check-in context.

The “Using context” panel is not a manifest of the actual request. It lists only a small memory/meal subset and does not expose omitted case records, profile fields, or truncation.

Change: typed context with mandatory allergies and relevant active medications, source dates, units, unresolved contradictions, and explicit missing information. Keep General/Case mode independent from whether a context string happens to be nonempty. Show a plain-language, accurate context drawer with inclusion controls.

Sources: [profile compiler](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/MemoryService.js:23>), [truncation](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/MemoryService.js:112>), [Ava context options](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/geminiService.ts:351>), [context panel](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1381>).

### AVA-05 — Meal photos use lab analysis; report details are lost · P1

**Browser reproduction:** the composer’s meal image used operation `lab_analysis`. A synthetic exact biomarker returned by that analyser was not passed into chat. Only the report name, summary, and interpretation were included.

**Source inspection:** file reading checks account/profile scope but not case changes during processing. Original evidence, exact values, units, reference ranges, dates, and page references are not retained in the conversational evidence path. Unreadable/fallback summaries can look like successfully read reports. At the maximum allowed raw file size, base64 plus JSON can exceed the gateway’s vision limit.

The lab prompt includes absolute causal claims about ferritin, vitamin D, and TSH. These require clinical review and replacement with source-aware interpretation. For example, the Endocrine Society states that outcome-specific vitamin D thresholds are not established for the healthy populations covered by its guidance; NICE evaluates thyroid results using reference ranges, repeated tests, and clinical context. These sources do not support the prompt’s universal causal statements. [Endocrine Society](https://www.endocrine.org/clinical-practice-guidelines/vitamin-d-for-prevention-of-disease), [NICE thyroid guidance](https://www.nice.org.uk/guidance/NG145/chapter/recommendations).

Change: separate food/photo and medical-document paths. Reuse the existing verified nutrition contract: packaged products show **per 100 g**; food portions use a stated portion basis and source, with photo-only estimates labelled as estimates. For reports, retain the original document and validated extraction; show unreadable/missing values instead of guessing. Bind uploads to an immutable conversation scope.

Sources: [upload pipeline](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1719>), [summary-only handoff](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1762>), [meal-photo control](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:2907>), [lab prompt](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/geminiService.ts:395>).

### AVA-06 — Emergency matching misses ordinary wording · P1

**Browser evaluation of the actual matcher:**

| Synthetic input | Current emergency flag |
|---|---|
| “My lips are blue and I cannot breathe.” | False |
| “I plan to kill myself tonight.” | False |
| “Mujhe saans nahi aa rahi” | False |
| “I am not coughing up blood.” | True |
| “What does coughing up blood mean?” | True |

These are failures of the deterministic guard. They do not prove how the live model would respond afterward. The matcher is English regex matching without reliable negation, educational-question, or timing handling. A server counterpart is absent. Emergency UI contains US and Indian contact options, but the primary text is US-oriented.

Change: clinically reviewed red-flag handling with language variants and intent/negation checks; conservative escalation when uncertain; country-appropriate contacts; a visible help entry independent of successful AI generation. Never let quotas or provider outages block emergency resources.

Source: [triage rules](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/clinicalTriageEngine.ts:23>).

### AVA-07 — Research handoff can loop and falsely claim an abstract · P1

**Browser reproduction:** opening `/app/ava?studyId=NCT00000000` generated “Maximum update depth exceeded.” The incoming study object is recreated on render; an effect writes it to state repeatedly.

The badge displayed “Abstract Attached” even though only an ID/title fallback existed. Dismissing the study does not clear all restoration state. Study session keys are not scoped to account/profile/case. The chat handoff omits source URL and retrieval time, and asks for study “findings” even when the source may be a trial registration containing objectives rather than results.

Change: stable study loading, explicit unavailable/ID-only states, scoped storage, complete dismissal, authoritative retrieval, and a distinction between registration, abstract, and reported results. Every scientific claim must link to a supporting passage.

Sources: [study state](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1284>), [research prompt](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1861>), [abstract label](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:2793>).

### AVA-08 — Failed-looking answers and retries can consume credits · P1

**Isolated gateway reproduction:** a provider HTTP 200 with `candidates: []` returned HTTP 200, marked the ledger completed, and retained one feature reservation. The client then treats that empty response as an error. Reusing the same request ID returned HTTP 409 rather than replaying a stored answer.

**Source inspection:** Ava’s UI keeps a request ID for retries, but the chat service generates another one on each call. A successful generation whose response is lost can be regenerated and charged again. No Ava result recovery store exists. Provider calls have no explicit deadline coordinated with the client/server budgets, and process termination can leave reservations unfinished. The release helper does not inspect a returned RPC error.

Change: one stable request ID and payload hash from send through retry; persist the validated response; replay it without charging again; reserve/complete/refund through a recoverable state machine. Reject blank, blocked, malformed, or unusably truncated answers before treating generation as completed.

Sources: [mutation call](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1642>), [new backend request ID](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/geminiService.ts:370>), [duplicate handling](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/api/gemini.js:203>), [reservation release](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/api/gemini.js:332>), [completion](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/api/gemini.js:447>).

### AVA-09 — The gateway trusts browser operation labels and policy · P1

**Isolated gateway reproduction:** an unknown operation label reached the provider with no Ava feature reservation. The general authenticated daily allowance still applied; this bypass is specifically about feature accounting. The browser-supplied Ava system instruction reached the provider, with a server safety suffix appended.

Unlike newer dedicated Gut/Diet payload paths, Ava does not have a server-owned operation contract, context assembly, or complete input validation. The browser supplies clinical context and can misrepresent its provenance. Database RLS protects reads; it does not validate claims passed to the AI gateway.

Change: an allowlisted operation/endpoint, authenticated ownership checks, server-controlled mode and clinical policy, validated payload limits, and scoped retrieval of records. Preserve compatible contracts for other features. Guest controls must use a shared limiter suitable for multiple server instances.

Sources: [operation label](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/api/gemini.js:117>), [feature classification](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/api/gemini.js:245>), [policy forwarding](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/api/gemini.js:349>), [gateway evidence](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/gateway-results.json>).

### AVA-10 — Whole Health River invents evidence · P1

**Browser reproduction:** an untimed meal became **08:00**; an untimed symptom became **12:30**; a zero symptom score became **5/10**. The first meal and first symptom were automatically marked as a causal trigger/reaction. The UI displayed the invented causal link.

**Source inspection:** sorting uses time-of-day strings without retaining complete dates; state is initialized once without a refresh subscription. “Add moment” only updates component state and is not persisted through the health observation ledger. Its ask-Ava prompt presupposes an anatomical/biochemical relationship.

Change: canonical observations with complete date/time and precision; “Time not recorded” when missing; preserve zero values; show temporal association only when actually supported. Do not manufacture causality. Persist entries, refresh on changes, and pass source IDs into any discussion.

Sources: [timeline derivation](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/ui/WholeHealthRiverModal.tsx:37>), [automatic causal assignment](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/ui/WholeHealthRiverModal.tsx:76>), [local-only entries](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/ui/WholeHealthRiverModal.tsx:108>), [ask-Ava handoff](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:3121>); [screenshot](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/ava-river.png>).

### AVA-11 — Conversation does not reliably complete requested actions · P2

“Log your day” fills a prompt but does not execute a structured check-in save. A generated diary card displays existing diary records; it does not prove a new meal was saved. “Explain source” selects the first case record rather than the cited source. “Open related review” always opens Jarvis instead of the actual relevant saved review. Notification creation from conversation has no verified execution path.

Change: typed action drafts that call existing authoritative services after confirmation, return saved IDs and status, and link to the result. User-facing “saved” or “reminder scheduled” wording must depend on that result. Show pending sync distinctly from a durable cloud acknowledgement.

Sources: [daily check-in shortcut](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:3028>), [diary card](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:319>), [source/review shortcuts](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:2577>).

### AVA-12 — Quota presentation and product promises are inconsistent · P2

The local `hc_trial_ava_count` is not account/profile scoped. It can block a different account on the same browser despite that account’s remaining server allowance. Devices can disagree. Infrastructure failures can be converted into an upgrade prompt, and rate-limit errors can be presented as exhausted free access.

Upgrade messages promise unlimited conversations, continuous biomarker tracking, or 24/7 care support, while server plans use finite Ava allowances and no human-care service is connected in this flow.

Change: server-authoritative entitlements; accurate remaining balance; typed quota/rate/outage errors; retained drafts and a clear resume flow. Use product wording that matches the actual service.

Sources: [local counter](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/TrialEngine.ts:19>), [upgrade claims](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1697>), [monitoring claims](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1802>), [outage converted to upgrade](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/api/gemini.js:315>).

### AVA-13 — Chat persistence is vulnerable to silent loss and device conflicts · P2

Message changes write the complete profile through an asynchronous helper that Ava does not await. The shared profile save also updates demographics/profile timestamps, normalizes medications, creates a profile memory snapshot, and queues profile upserts. Chat activity therefore changes unrelated profile versioning.

The profile sync merge does not append/merge Ava messages by stable ID. Concurrent device snapshots can overwrite conversation history. Storage helpers swallow local quota errors, weakening Ava’s outer recovery handler. A generic session draft fallback can populate a different case’s empty editor.

Change: dedicated conversation/message storage and outbox; append-based syncing; explicit pending/synced/failed states; stable IDs; truthful retention controls. Isolate chat updates from clinical profile timestamps. Remove the cross-case draft fallback.

Sources: [draft restore](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1269>), [chat persistence](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:1593>), [profile save](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/ProfileEngine.js:337>), [device merge](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/ProfileEngine.js:1114>), [storage errors](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/storage.ts:38>).

### AVA-14 — Mobile and keyboard access are incomplete · P2

The tested widths had no horizontal page overflow. However, mobile omits the case picker. Composer controls are about 30–34 px, making them harder to operate by touch; this is a usability concern, not a claim that every control violates WCAG.

The case dialog did not move focus inside, and Escape did not close it. The case/save dialogs lack a consistent focus trap/restoration pattern. Chat has no live log region announcing new answers. The interface simulates typing after receiving a complete response, with no cancel control.

Change: persistent mobile case/context controls; larger touch targets; shared accessible dialog component; restrained live announcements; cancel/retry/restore controls. Verify real keyboards, screen readers, 320 px width, zoom, reduced motion, and dark mode.

Sources: [case dialog](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:720>), [save dialog](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:948>), [composer controls](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:2937>).

### AVA-15 — Widgets and the page need a coherent product contract · P2

Workout/somatic and calm widgets call the same calm-session handler. Generative text tags are not a validated action protocol. The page mixes many surface/accent styles and has roughly 3,300 lines combining routing, persistence, clinical context, quotas, uploads, dialogs, and presentation.

The built-in calm session ID is `ava-calm-reset-1`. Source inspection shows that the player passes this string to `complete_workout_session`; live metadata confirms that its content ID argument requires a UUID. For a signed-in user this completion path cannot satisfy the API contract. The player celebrates completion before the call and catches its error only in the console. This path also has no session-start record; the database function updates existing pending history rather than creating a session. Actual live completion was not invoked during the audit.

Change: approved, purpose-specific wellbeing sessions with clear descriptions and safe opt-out. Use a registered content ID or a dedicated contract for built-in sessions; create the session record, log actual elapsed time, and show a confirmed save status. Avoid unsupported calorie measurements. Replace text-tag action guessing with typed capabilities. Split Ava into scoped conversation controller, context/evidence services, attachment service, action executor, and reusable clinical UI components.

Sources: [workout routing](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:414>), [default calm session](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/consultation/AvaHealthBuddy.tsx:108>), [completion UI](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/ui/MeditationPlayer.tsx:692>), [completion service](<C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/services/FitnessService.ts:202>), [live RPC contract](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/supabase-wellness-contract.json>).

### AVA-16 — Privileged wellness completion lacks owner verification · P1

**Live database definition review:** the connected `complete_workout_session` function is `SECURITY DEFINER`, is executable by authenticated users, and accepts a caller-supplied `p_user_id`. Its owner is `postgres` with RLS bypass privileges. Its body does not compare that ID with `auth.uid()` or otherwise authorize the target user. It updates matching pending fitness history, changes counters/badges, and returns that user's completed-workout count with elevated database privileges. No mutation or cross-user exploit was performed.

This provides a path for a signed-in caller to alter another user's matching pending history and obtain their workout count. Anonymous execution is disabled. RLS on the ordinary tables does not repair the missing ownership check inside this privileged function.

Change: derive the owner from authentication, reject mismatched IDs, verify ownership of the exact pending session, validate duration/calorie inputs, and make completion idempotent. Use the smallest necessary privileges. Add a two-user regression test proving that one account cannot read or complete the other's session through this RPC. Review the directly related wellness RPCs for the same authorization pattern before release.

Evidence: [live function definition and permissions](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/supabase-wellness-contract.json>).

## Product and design direction

Keep the modern clinical appearance requested: white/slate surfaces, readable dark text, one principal teal accent, subtle borders, and restrained shadows. Use red for urgent/error states and selected controls where appropriate. History, neutral choices, close icons, and explanatory labels should not all become red. Preserve Quick Log’s own approved style.

The main conversation should have:

1. A persistent **General / named case** control and an accurate “Information used” drawer on desktop and mobile.
2. Three clear starting goals: **Understand a record**, **Describe a change / prepare for a visit**, and **Reflect / feel calmer**.
3. Plain replies with expandable evidence. Show “You reported”, “Your record says”, “General guidance”, and “Not enough information” only where they clarify the answer.
4. Actions directly under the relevant answer: review a cited source, edit/save a note, add a visit question, or open the right feature.
5. A compact composer with separate document and food-photo entry points, useful processing states, retained drafts, and recoverable errors.
6. Conversation history, new conversation, export/delete controls, and an editable memory view.
7. Visible urgent-help access without requiring a successful model response or a subscription.

Avoid a large dashboard inside chat. Existing health tools should open with the right patient/case and return a clear saved result.

Current official competitor material supports structured workflows and clear scope. Wysa describes structured reflection and a clinically designed exercise library with explicit limits on crisis/medical use. [Wysa FAQ](https://www.wysa.com/faq). Ada’s January 2026 announcement also describes simplifying its app and retiring several trackers to focus on assessment quality; do not copy an outdated feature checklist. [Ada update](https://ada.com/editorial/ada-introduces/). These are product references, not proof that copying them makes Ava clinically validated.

## Target architecture

`Explicit conversation scope → validated evidence/context → server-owned Ava policy → structured response → checked claims/actions → user confirmation → authoritative save/schedule → source-linked memory`

Recommended contracts:

- **Conversation:** ID, owner user ID, profile ID, explicit General/Case mode, optional case ID, lifecycle/retention state.
- **Message:** stable ID, conversation ID, role, content, source references, request ID, timestamp, delivery/generation status.
- **Context manifest:** included source IDs, record type, date/time precision, units, mandatory safety facts, exclusions, unknowns, and context version.
- **Response:** reply, source-backed claims, unresolved questions, approved action drafts, urgency, and request ID. Validate types and semantics before displaying successful completion.
- **Action receipt:** stable action ID, originating message, destination scope, saved record ID, and pending/synced/failed status.
- **Memory:** explicit user/source fact, originating message/source, case/profile scope, confirmation state, validity dates, and correction/deletion state.
- **Generation:** owner, stable request ID, payload hash, state, validated response, reservation/release status, and expiration/recovery timestamps.

Gemini supports schema-constrained outputs, which can make action and extraction payloads predictable. Schema compliance still needs separate source and clinical checks. [Google structured-output documentation](https://ai.google.dev/gemini-api/docs/structured-output). Retrieval/citation tooling should preserve evidence metadata; a general web search alone is insufficient to establish a personalized medical conclusion. [Google grounding documentation](https://ai.google.dev/gemini-api/docs/google-search).

Use existing meal, observation, case question, medication, and reminder services as the owners of those actions. Ava prepares and explains; these services provide the actual stored outcome. Do not create parallel versions of their records inside chat.

## Implementation order and acceptance checks

| Phase | Work | Completion criteria |
|---|---|---|
| 1. Ownership, truth and scope | AVA-16 first, then AVA-01/02/03/04/10; secure the wellness RPC; stop invented timeline values/causality; make scope explicit; isolate memory; include safety facts | Cross-user RPC attempts are rejected; A/B/General switching and tool routes remain correct; no cross-case action defaults; missing time stays missing; zero stays zero; exact allergy fixture appears in the approved context |
| 2. Gateway and recovery | AVA-08/09/12; server contract, operation allowlist, stable IDs, persisted answer replay, quota error types and reservation recovery | Same send/retry produces one charge and one replayable result; blank/blocked/invalid results do not consume a consultation credit; unknown operations are rejected; account/device balances agree |
| 3. Clinical evidence and attachments | AVA-05/06/07; document/photo separation, units and source references, stable research load, reviewed triage and medical prompts | Exact fixture values/units/dates survive; unreadable files fail honestly; query/reload/dismiss study paths are stable; registration objectives are never presented as results; all blocking triage fixtures pass |
| 4. Actions and persistence | AVA-11/13; structured daily check-in, saved notes/questions, cited-source navigation, durable conversation storage and scoped drafts | Every “saved” claim has a receipt; cloud failure is visible; two-device/offline conversations merge without loss; no unrelated profile timestamps change from chat-only activity |
| 5. Clinical UI and wellbeing | AVA-14/15; mobile case controls, shared dialogs, evidence drawer, approved sessions and durable completion, history/memory controls | Keyboard/screen-reader flow works; native camera and virtual keyboard work; controls remain usable at small widths/zoom; chosen wellbeing card opens the stated session and produces one confirmed completion record |
| 6. Release evaluation | Realistic regression suite, clinical answer evaluation, production telemetry, gradual rollout and rollback | All identified defects have regression coverage; clinician-reviewed safety/evidence evaluation passes its defined gates; production monitoring can detect failures without exposing patient text |

Detailed release gates:

- Mount the actual Ava page in tests; do not substitute variable-only “invariant” simulations for routing, asynchronous state, or persistence.
- Test General, missing/deleted case, explicit URL case, legacy import link, switch during generation/upload, account change, profile change, and study refresh.
- Test outage, timeout after provider success, concurrent retry, interrupted generation, invalid provider output, quota failure, exhausted allowance, and expired subscriptions.
- Test fresh and contradictory records, historical values, missing units, missing/zero measurements, unreadable reports, food images, multiple attachments, and input injection.
- Evaluate ordinary wellbeing questions, medication questions with allergies/active status, symptom changes, urgent language variants, negation, hypothetical questions, research with no results, and insufficient evidence.
- Test offline save, storage pressure, reload, two devices, deletion/export, memory correction, and action deduplication.
- Test wellness completion with two users, registered and built-in content, partial sessions, retry, and reload; reject wrong-owner and invalid session requests.
- For reminders, verify confirmation, persisted schedule, permission denial, timezone/DST behavior, delivery failure, cancellation, and duplicate suppression on supported native devices.
- Track response success/latency, blank/blocked output, retry/replay, charge/refund consistency, save/sync failure, scope mismatches, and safety escalations. Redact clinical text from operational logs.
- WHO highlights inaccurate/incomplete health AI responses and the need for clearly defined tasks, reliability evaluation, stakeholder involvement, and post-release audits. Medical output needs a clinician-reviewed evaluation and continuing oversight. [WHO guidance](https://www.who.int/news/item/18-01-2024-who-releases-ai-ethics-and-governance-guidance-for-large-multi-modal-models).

The attainable commitment is **no known unresolved release blockers, reliable execution of defined workflows, source-supported answers, and honest uncertainty**. A universal promise that every medical answer will always be right is not supported by this audit.

## Audit artifacts and reproduction

- [Main browser probe](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/probe.mjs>) → [results](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/probe-results.json>)
- [Isolated gateway probe](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/gateway-probe.mjs>) → [results](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/gateway-results.json>)
- [Research route probe](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/study-probe.mjs>) → [results](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/study-results.json>)
- [River/scope probe](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/tools-probe.mjs>) → [results](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/tools-results.json>)
- [Desktop screenshot](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/ava-desktop.png>), [mobile screenshot](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/ava-mobile.png>), [case screenshot](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/ava-case-scope.png>), [study screenshot](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/ava-study.png>), [River screenshot](<C:/Users/adity/Documents/Codex/2026-09-29/my-local-healthchain-repository-is-at/ava-audit/ava-river.png>)

The browser probes require the local Vite server on port 3001 and the repository’s installed Playwright runtime. They create synthetic local browser data and block external HTTPS requests. They are audit reproducers, not yet permanent regression tests.

Existing targeted-test command, from HealthChain-Live:

```powershell
npm test -- --run --maxWorkers=2 src/features/consultation/__tests__/AvaTaskCompletion.test.tsx src/services/__tests__/AvaWidgetParser.test.ts src/services/__tests__/ConnectionTriggerWidget.test.ts src/services/__tests__/HealthMemory.test.ts src/services/__tests__/geminiGateway.test.js src/services/__tests__/RunContext.test.ts
```
