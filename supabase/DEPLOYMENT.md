# HealthChain Supabase release runbook

The application code and migrations are versioned together. On a new database,
apply every SQL file in `supabase/migrations/` in filename order. On an existing
production database, inspect the migration history and schema first, then apply
only the missing changes. Several historical migrations are not safe to rerun
against objects that were created manually or by an older release.

## SQL Editor

1. Open the production project's Supabase SQL Editor.
2. For a new database, run `supabase/APPLY_ALL.sql` once. For an existing
   database, compare `supabase/migrations/` with the migration ledger and live
   objects, then apply the missing migrations in order. Do not rerun the entire
   bundle as an incremental release.
3. Run `supabase/verify_production.sql` as one query. It must not raise an
   exception, and its “Expected: zero rows” queries must return zero rows.
4. From a checkout with the production `VITE_SUPABASE_URL` and anonymous key,
   run:

   ```text
   npm run smoke:supabase
   ```

For automatic checks on every push, set the GitHub repository variable
`ENABLE_SUPABASE_SMOKE=true` and repository secrets
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The guarded CI job then runs
the same read-only smoke check after the normal quality gates.

The smoke check is read-only. It verifies that the required relations exist and
that anonymous requests cannot read server-only AI or payment rows.

## CLI alternative

If the Supabase CLI is linked to the production project, apply the migration
directory with the CLI's normal migration command, then run the verifier and
smoke check above. Keep the migration files in Git; do not edit production
tables manually to “make the error go away.”

## Safety requirements

- Never put `SUPABASE_SERVICE_ROLE_KEY` in the browser, `.env` files committed to
  Git, screenshots, or support tickets.
- The client uses only the publishable/anonymous key. Server-only API routes
  use the service role key through deployment secrets.
- If the verifier reports missing tables or views, stop release promotion. A
  successful login alone does not prove that AI accounting, deletion, or the
  operator views are installed.
- Check security advisors after DDL changes. The document embedding table is
  optional, but if present it must have RLS and no browser-role table grants.
- After the migrations pass, test with a non-production account: create a case,
  add one Health Memory item, refresh, sign in from a second device/profile,
  and confirm both records are restored. Then exercise account deletion only
  with that disposable account.
