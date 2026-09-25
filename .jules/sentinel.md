## 2026-09-25 - Authorization Bypass in Admin Content API
**Vulnerability:** The `/api/admin-content` endpoint assumed all authenticated users were authorized due to missing validation against the `ADMIN_USER_ID`.
**Learning:** Hardcoding a "TODO: Add strict admin role check here" in a production-ready application can lead to authorization bypass where any authenticated user can perform administrative tasks.
**Prevention:** Always employ a fail-closed approach and validate the specific authorized identities or roles explicitly, particularly for endpoints handling administrative or database operations.
