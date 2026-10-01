# HealthChain architecture

This guide describes the active source tree as of 1 October 2026. The [functional audit](docs/WHOLE-APP-FUNCTIONAL-AUDIT.md) records provider/device boundaries and known remaining work.

## Directory responsibilities

```text
api/                       Vercel endpoints and authenticated/provider guards
server/                    Server-only validation, rate limits and transports
shared/                    Pure contracts used by frontend and backend
src/
  App.tsx                  Routes, account lifecycle and global recovery
  main.tsx                 Native preference restore, providers and mount
  features/                Auth, daily dashboard, Gut, Diet, Ava/clinical,
                           profiles, case preparation, tools and legal pages
    gut-health/components/ Gut views and their scoped styles
  components/layout/       Protected shell and navigation
  components/ui/           UI shared across feature domains
  domain/                  Observation and clinical domain types/contracts
  services/                Scoped repositories, commands, sync and integrations
  stores/                  Zustand stores, including the action island
  hooks/                   Reusable React hooks
  data/                    Maintained local catalogs and reference definitions
scripts/                   Build/schema guards and operational evaluations
  lib/                     Maintainer-only legacy migration preview
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

Vite chooses shared chunks automatically. The previous PDF manual chunk pulled nearly 1 MB of export dependencies into startup. `scripts/check-build-budget.mjs` uses the actual emitted manifest to reject regressions. Bundle analysis is optional and is not a public production asset.

Public catalog reads share in-flight requests, have independent five-minute expiration and bounded cache keys. A cancelled view does not cancel another consumer's public request. Failed requests can retry; confirmed content mutations invalidate the cache. Account health records do not use this public cache.

## Data ownership and synchronization

The active account/profile scopes repositories and storage. Local events, source records, AI interpretations, reviewed memory and plans retain separate meaning. Commands write the canonical owner-scoped records; cross-feature views use their shared projections and explicit links.

Cases, observations, conversations and sync queues use IndexedDB where appropriate. Small settings and compatibility projections use local storage. Native Preferences writes are serialized; startup restores with bounded parallel reads and an overall deadline. Delayed restore reads cannot overwrite later edits or revive cleared values. Native restore timing and two-device convergence still require signed-device acceptance.

The sync outbox keeps version and conflict information. Concurrent conflicts are preserved for review; it is inaccurate to describe all sync as silently dropping an older device's work. Logout retains owned durable records and recovery receipts; confirmed erasure removes only the selected owner's data with retry tracking.

## APIs, authority and persistence

Browser APIs use the page origin. Bundled native APIs use the configured HTTPS backend or `https://healthchain360.com`; CSP and CORS must allow the chosen backend. Native Auth callbacks use PKCE and the registered app scheme. Provider redirect configuration and phone return acceptance remain external gates.

Model calls pass through `/api/gemini`, operation controls, bounded transport, request/quota ledgers and response validation. Structure checks are distinct from clinical or food-composition correctness. Razorpay creates/verifies orders through the shared server catalog and authoritative fulfillment/refund ledger. Pending receipts survive interruption and block duplicate checkout until reconciled.

Supabase RLS enforces owner boundaries. Internal ledger mutations stay server-only; some owned history is readable by clients. Content-admin authority comes from fresh server-controlled metadata or a server-only allowlist. Public fitness covers are distinct from private medical originals.

## Maintenance and deployment

Use the committed lockfile and keep generated folders ignored. Run schema, repository, unit, build and browser gates before release. Apply only missing database migrations on an existing project; `APPLY_ALL.sql` is for initial installation, not repeated incremental deployment. Verify the exact pushed SHA and deployed assets. The [maintenance record](docs/REPOSITORY-MAINTENANCE.md) explains the measured changes and limits.
