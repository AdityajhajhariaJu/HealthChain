## 2024-05-24 - Authorization Bypass in Admin Endpoint
**Vulnerability:** The `/api/admin-content.js` endpoint only authenticated users via JWT but did not perform an authorization check to verify the user had admin privileges before executing administrative actions.
**Learning:** Endpoints mapped to administrative functionalities must explicitly perform role-based or identity-based authorization checks after authentication to prevent privilege escalation. Relying solely on authentication leaves sensitive routes open to any logged-in user.
**Prevention:** Always add a strict authorization check (e.g. `user.id === process.env.ADMIN_USER_ID`) right after authentication for all admin endpoints.
