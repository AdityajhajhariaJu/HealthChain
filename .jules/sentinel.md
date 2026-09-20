## 2025-02-27 - Fix authorization bypass in admin endpoint
**Vulnerability:** Found an admin endpoint (`api/admin-content.js`) that accepted requests from any authenticated user without verifying their role or ID.
**Learning:** The `TODO` comment suggested that it was assumed to be an internal route and that authorization wasn't strictly necessary. In reality, external users with valid JWTs could execute internal admin functionality if `process.env.ADMIN_USER_ID` checks were not strictly enforced.
**Prevention:** Always implement strong authorization validation using a fail-closed approach (e.g. `!adminUserId || user.id !== adminUserId => 403 Forbidden`) regardless of if an endpoint is thought to be internal-only.
