## 2024-05-18 - Admin Authorization Bypass in Content API
**Vulnerability:** The `api/admin-content.js` route verified a user was authenticated but failed to check if they had admin privileges, allowing any logged-in user to modify `fitness_content` (or arbitrary tables) using the service role key.
**Learning:** Internal routes often have deferred ("TODO") security checks that leak to production. Relying solely on `supabase.auth.getUser` only confirms identity, not authorization level.
**Prevention:** Always implement fail-closed authorization checks (e.g., matching against `ADMIN_USER_ID`) simultaneously with authentication checks. Never deploy "TODO" security bypasses to production.
