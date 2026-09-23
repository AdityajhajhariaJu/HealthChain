## 2026-09-23 - Authorization Bypass in Admin API
**Vulnerability:** The `api/admin-content.js` serverless function assumed authorized access based on an incomplete TODO, allowing any authenticated user to potentially access admin actions.
**Learning:** Internal routes exposed via serverless functions are accessible over the internet and require strict authorization checks, not just authentication.
**Prevention:** Always employ a fail-closed authorization approach, immediately denying access (e.g., returning 403) if the required environment variable (`ADMIN_USER_ID`) is missing, misconfigured, or does not strictly match the user's ID.
