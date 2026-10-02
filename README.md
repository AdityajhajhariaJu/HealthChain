# HealthChain

Private React application for connected health records, appointment preparation, Ava, daily tracking and food planning. Vite serves the web frontend; Capacitor supplies the Android/iOS shell; Vercel hosts the APIs; Supabase supplies Auth, Postgres and Storage. Payments use Razorpay.

## Local development

Use Node.js 22 or newer and the committed lockfile.

```sh
npm ci
cp .env.example .env
npm run dev
```

Set the public Supabase URL/key in `.env`. Keep service credentials and model/payment keys server-side. The local frontend runs on port 3001. `/api/gemini` is proxied to a separately running local backend on port 3000; content and barcode development adapters use their production handlers. A frontend-only Vite server does not provide every hosted API.

## Verification

```sh
npm run verify:repository
npm run verify:syntax
npm run verify:migrations
npm run lint
npm run build
npx cap copy android
npx cap copy ios
npm test -- --run
npx playwright install chromium webkit
npm run e2e -- --workers=1
npm run e2e:production
```

The build checks TypeScript, emits a Vite manifest and enforces budgets for startup and the complete public landing route. ESLint checks TypeScript/TSX Hook order as well as JavaScript. Native parity tests read generated configuration, so a clean checkout must build/copy before running them. Generate bundle analysis only when needed by setting `ANALYZE=true`; `bundle-stats.html` stays outside the deployed output.

The complete browser suite uses Vite's source server because some recovery fixtures import repository modules. `e2e:production` separately verifies the built landing, auth boundary, guest assessment, case save and Ava reply/reload through the UI with mocked providers. Build first and free port 3001 before starting production journeys.

After building, `npx cap copy` refreshes the native web assets/configuration. Run `npx cap sync android` and `npx cap sync ios` after changing native plugin dependencies; keep the Swift package paths portable. Signed native builds and phone acceptance require the platform toolchains and configured providers. Playwright runs resource-heavy workspace journeys serially by default; provisioned machines can override `--workers`.

## Repository map

- [Architecture](ARCHITECTURE.md): runtime ownership, data flow and directory responsibilities.
- [Cleanup and performance record](docs/REPOSITORY-MAINTENANCE.md): this cleanup's scope, measurements and verification.
- [Functional audit](docs/WHOLE-APP-FUNCTIONAL-AUDIT.md): routes, feature connections and remaining acceptance boundaries.
- [Database release runbook](supabase/DEPLOYMENT.md): incremental migrations and live verification.
- [Operational scripts](scripts/README.md): evaluation and maintenance commands.
- `docs/gut-health/`: historical Gut plans, research and validation records.
- `docs/release/`: store-review acceptance information.

Keep generated output, test reports, caches and one-off editing scripts out of Git. Preserve historical database migrations and original health records. Earlier scratch scripts and obsolete visual PDFs are recoverable from Git history before the cleanup commit.
