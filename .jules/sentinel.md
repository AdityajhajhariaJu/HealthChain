## 2026-09-11 - Authorization Bypass in Admin API
**Vulnerability:** Missing strict authorization check on the `api/admin-content.js` endpoint.
**Learning:** A `TODO` comment was left for an authorization check, which was never implemented, leaving the endpoint potentially accessible to unauthorized users.
**Prevention:** Ensure that all endpoints with sensitive operations (like insert/update/delete) have authorization checks implemented *before* they are pushed to production, rather than leaving them as `TODO` items.
