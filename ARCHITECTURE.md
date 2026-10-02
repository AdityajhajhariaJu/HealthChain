# HealthChain architecture

This guide describes the active source tree as of 3 October 2026. The [functional audit](docs/WHOLE-APP-FUNCTIONAL-AUDIT.md) records provider/device boundaries and known remaining work.

## Directory responsibilities

```text
api/                       Vercel endpoints and authenticated/provider guards
server/                    Server-only validation, rate limits and transports
shared/                    Pure contracts used by frontend and backend
src/
  App.tsx                  Routes and lightweight global UI/auth detection
  main.tsx                 Native preference restore, providers and mount
  features/                Auth, daily dashboard, Gut, Diet, Ava/clinical,
                           profiles, case preparation, tools and legal pages
    gut-health/components/ Gut views and their scoped styles
    account/               Deferred account bootstrap, recovery and conflicts
      components/          Account recovery, conflict review and product tour
    auth/components/       Landing sections, media and workflow examples
    consultation/components/ Ava memory, check-in and conversation tools
    dashboard/components/  Case forms, evidence picker, investigation and archive canvas
    calm/                  Meditation player and atmosphere rendering
    profile/components/    Profile completion, editing and device connections
    jarvis/                Clinical intake, symptom catalog and badges
  components/layout/       Protected shell and navigation
  components/ui/           UI shared across feature domains
  domain/                  Observation and clinical domain types/contracts
  services/                Scoped repositories, commands, sync and integrations
    ai/                    Model transport, safety contracts and operation modules
    testFixtures/          Test-only examples and feature contract expectations
  stores/                  Zustand stores, including the action island
  hooks/                   Reusable React hooks
  data/                    Maintained local catalogs and reference definitions
scripts/                   Build/schema guards and operational evaluations
  lib/                     Static import guards and legacy migration preview
tests/e2e/                 Browser user journeys and failure-path fixtures
supabase/
  migrations/              Append-only schema/policy history
  tests/                   Rolled-back synthetic database checks
  verify_production.sql    Live schema and permission assertions
  APPLY_ALL.sql            Generated initial-install migration bundle
public/                    Referenced static assets and discovery files
android/, ios/             Native project source and platform configuration
docs/                      Audits, use cases, implementation and release records
```

## Runtime and loading

Routes load their own screen modules. The dashboard defers Gut Health, medication/hydration dialogs, photo analysis and meditation until opened. The progress archive loads its 3D renderer only in the archive tab. PDF export is dynamic and absent from the initial static JavaScript graph. `SafeRoute` supplies loading/error recovery; feature boundaries preserve the surrounding page during tool loading.

Vite chooses shared chunks automatically, with the small public-screen icons grouped into one request. On an anonymous landing visit, the screen owns session detection once its content mounts; the root does not fetch auth ahead of the landing chunks. Other public pages retain root session detection. `AccountRuntime` loads `features/account/AccountLifecycle` when account, guest or erasure recovery is needed. The Supabase client stays outside the public static import graph; its initial-session event still restores durable accounts. Public launches resolve the session before setting guest mode, so an early click cannot move a restored account into guest storage. Public visitors load the landing scenario catalog as pure data. Creating a case or inspecting a workflow loads the corresponding case/reasoning implementation. Ava owns its React Query provider. `scripts/check-build-budget.mjs` checks both the startup graph and landing's static imports, rejecting the auth client, clinical repositories, account workers, charts, 3D and PDF code in those graphs. Bundle analysis is optional and stays outside public production assets.

Simple shell notifications, consent controls and public landing decoration use CSS with reduced-motion support. Public rendering has no JavaScript animation-runtime dependency; the Rollup module-graph guard in `scripts/lib/public-static-boundaries.mjs` checks the actual static imports. The landing controller owns session and workspace launch, while its sections own presentation and local input/disclosure state. Workflow overview cards appear once in a stable responsive grid using normal page scrolling. Example reasoning opens a deferred, named dialog with focus containment, Escape/return focus and mobile evidence columns. Opening an illustrative case closes the dialog first so workspace loading and failures stay visible. Feature animations remain owned by their lazy screens/dialogs. `useMountedRef` resets on effect setup, so Strict Mode replay cannot permanently suppress completed feature requests. Model caches include the full input and account/profile generation; the appointment discussion guide does not use an unscoped session-storage cache.

Public catalog reads share in-flight requests, have independent five-minute expiration and bounded cache keys. A cancelled view does not cancel another consumer's public request. Failed requests can retry; confirmed content mutations invalidate the cache. Account health records do not use this public cache.

## Data ownership and synchronization

The active account/profile scopes repositories and storage. Local events, source records, AI interpretations, reviewed memory and plans retain separate meaning. Commands write the canonical owner-scoped records; cross-feature views use their shared projections and explicit links.

Cases, observations, conversations and sync queues use IndexedDB where appropriate. Small settings and compatibility projections use local storage. Native Preferences writes are serialized; startup restores with bounded parallel reads and an overall deadline. Delayed restore reads cannot overwrite later edits or revive cleared values. Native restore timing and two-device convergence still require signed-device acceptance.

The sync outbox keeps version and conflict information. Concurrent conflicts are preserved for review; it is inaccurate to describe all sync as silently dropping an older device's work. Logout retains owned durable records and recovery receipts; confirmed erasure removes only the selected owner's data with retry tracking.

Recovery requests from browser reconnect, Capacitor network events and native resume share `AccountRecovery`'s coalesced worker. A change arriving during a pass schedules a fresh pass without building an unbounded scan queue. Auth bootstrap runs once per account/profile generation; network work is deferred outside the Supabase auth callback. Daily tracker projections group observations by date once, write only changed projections, and retain tombstones and exact recorded units.

## APIs, authority and persistence

Browser APIs use the page origin. Bundled native APIs use the configured HTTPS backend or `https://healthchain360.com`; CSP and CORS must allow the chosen backend. Native Auth callbacks use PKCE and the registered app scheme. Provider redirect configuration and phone return acceptance remain external gates.

Model calls pass through `/api/gemini`, operation controls, bounded transport, request/quota ledgers and response validation. Structure checks are distinct from clinical or food-composition correctness. Razorpay creates/verifies orders through the shared server catalog and authoritative fulfillment/refund ledger. Pending receipts survive interruption and block duplicate checkout until reconciled.

`services/geminiService.ts` preserves the existing import API while implementations live in `services/ai`: consultation, collaboration, investigation, diet, vision and Gut operations share transport and clinical safety contracts. Temporary model result caches retain at most 16 entries per operation and key requests by account generation and selected profile. Durable reviewed history remains in its repositories.

Payment and deletion endpoints share exact-origin CORS configuration in `server/cors.js`. Public trial searches reuse the public-origin policy, bound conditions and result size, and keep the timeout active until the response body finishes.

Supabase RLS enforces owner boundaries. Internal ledger mutations stay server-only; some owned history is readable by clients. Content-admin authority comes from fresh server-controlled metadata or a server-only allowlist. Public fitness covers are distinct from private medical originals.

## Maintenance and deployment

Use the committed lockfile and keep generated folders ignored. Run schema, repository, unit, build and browser gates before release. Apply only missing database migrations on an existing project; `APPLY_ALL.sql` is for initial installation, not repeated incremental deployment. Verify the exact pushed SHA and deployed assets. The [maintenance record](docs/REPOSITORY-MAINTENANCE.md) explains the measured changes and limits.
