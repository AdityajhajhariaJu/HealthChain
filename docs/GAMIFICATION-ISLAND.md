# Cozy island and shared gamification hub

Implemented 3 October 2026. The dashboard thumbnail and full Zen Garden share the same island stage and atmosphere. The main garden loads procedural low-poly 3D only when opened; an inline illustration appears immediately and remains usable without WebGL. No external model, texture, image or additional dependency is required.

## One authoritative ledger, separate views

`profile.gamification` is the owner/profile-scoped source of truth. `services/gamification/model.ts` owns deterministic receipts, migration, projection and merging. `policy.ts` owns reward categories, daily budgets, stage thresholds and palettes. `trophies.ts` projects achievements. `GamificationHub.ts` is the facade for commands and snapshots. Points, Trophy Cabinet, Garden and its live preview consume this hub; the old points/garden APIs are compatibility adapters.

The existing ProfileEngine, Native Preferences and profile snapshot/outbox persist and synchronize the ledger. Reward writes preserve clinical demographics and do not append clinical memory or undo history. Reward receipt IDs remain durable even when the points screen limits its displayed history to 120 entries. Distinct offline devices merge receipt unions, then derive the same daily caps instead of adding device totals. Existing point balances, known saved reward IDs, legitimate garden stages and imported account badges are preserved. The former mock seed counts do not grant a mature island.

Operational telemetry is exposed by the same hub, with a separate bounded session-storage sidecar. It records screen/interaction counts, eligible completion types and frontend fetch outcomes/durations. It retains at most 121 aggregate operation keys and 60 recent events per owner/profile. API queries, request/response bodies, tokens and symptom wording are excluded. Telemetry is best-effort, batched, and never earns rewards or creates a profile-sync feedback loop. It measures frontend requests, not the provider's internal server calls or retries. No analytics provider receives these events.

## Reward policy

The first three **different categories** each day earn **3, 2 and 1 garden growth**, plus **5 points each**: maximum **6 growth and 15 points/day**. The five categories are saving a useful record, keeping a reflection, taking a calming moment, saving research, and preparing for an appointment. Tending and a calming session share one category. A completed profile and appointment preparation share another.

Only completed/saved actions qualify. Canonical observation creation rewards a confirmed new user record; imports, edits, migration and idempotent replay do not. Gut question/reflection, saved research and chosen preparation steps connect through the Gut repository. Ava rewards explicitly saved records/questions, not conversation generation. Existing callers route through a capped compatibility adapter. Repeated synthesis, generated diet/clinical plans, research browsing, API calls, hydration targets, food-color targets and movement targets earn no extra growth. Symptoms, health improvement and medical severity never affect reward amounts.

Each action type produces at most one receipt per day; distinct action types in an already-counted category can retain trophy evidence without a second reward. Rewards require local readback confirmation. Late commands after an owner/profile switch are rejected. Daily limits use the ledger's fixed named timezone; merge resolves independently created timezone settings deterministically. Devices with materially incorrect clocks remain a local participation-game limitation, not an entitlement/security boundary.

| Island stage          | Growth required | Participation days required | Visual addition                   |
| --------------------- | --------------: | --------------------------: | --------------------------------- |
| A little sanctuary    |               0 |                           0 | Cottage, resting trees and paths  |
| First blossoms        |               9 |                           3 | Flower beds                       |
| A peaceful pond       |              45 |                          10 | Pond, bridge and bench            |
| A flourishing retreat |             150 |                          28 | Pavilion, greenhouse and lanterns |
| Your cozy haven       |             360 |                          60 | Orchard and windmill              |

Both requirements must be met. Participation days are not consecutive. A break removes no points, growth, unlocked structures or trophies. One useful activity per day unlocks blossoms in 3 days, the pond in 15 days, the retreat in 50 days and the haven in 120 days. Maximum daily participation unlocks the same stages in 3, 10, 28 and 60 days. Thousands of repeated first-day actions still leave the starter island at 6 growth.

## User flow and rendering

Open the live dashboard preview, inspect the island, choose Meadow/Blossom/Golden dusk, and tend once. The same scrolling view shows today's growth, days of care, points, the next transformation's requirements, a plain-language explanation, recent contributions and shortcuts to calm, trophies and point history. Buttons and view controls support keyboard focus; Escape closes the containing dialog and returns focus to its trigger. The point hub explains categories, tiers and receipt history without promising an unconditional award.

The 3D renderer uses an orthographic camera fitted to its container, low-poly meshes, capped pixel ratio (1–1.5), no post-processing and demand rendering. A maximum 24-fps timer supplies gentle ambient motion only while visible and motion is allowed. Hidden tabs, offscreen scenes and reduced-motion preferences stop ambient animation. The dashboard uses animated inline SVG rather than maintaining a second WebGL renderer. Rendering failure falls back to that same illustration while rewards remain independent.

## Verification and release boundary

Pure policy tests cover flooding, casual/heavy pacing, long breaks, permanent duplicate prevention, migration, timezone/DST and simultaneous-device merging. Hub tests cover owner isolation, readback failure, sanitized explanations and profile merge. Telemetry tests verify bounds and fetch/body/error preservation. Built-browser tests cover lazy loading, single tending, atmosphere persistence, shared points/trophies, narrow screens, reduced motion, focus restoration, WebGL fallback and unrewarded API traffic.

See `REPOSITORY-MAINTENANCE.md` for the final executed results. Browser/provider responses are controlled fixtures. Signed Android/iOS device performance, actual account synchronization across two devices and long-term user pacing still require acceptance testing; these checks do not establish clinical correctness or universal device performance.
