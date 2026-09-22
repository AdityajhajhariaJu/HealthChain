## 2024-10-24 - Authorization Bypass in Admin Route
**Vulnerability:** The `/api/admin-content` route was missing a strict role check for the `ADMIN_USER_ID`, allowing any authenticated user to potentially modify fitness content using the powerful `service_role` key.
**Learning:** Internal admin routes must enforce explicit authorization checks. Relying on authentication alone or "assuming authorized" is insufficient when the route performs sensitive data mutations with elevated privileges.
**Prevention:** Always implement a fail-closed authorization check. Deny access and return 403 immediately if the required environment variable (`ADMIN_USER_ID`) is missing, misconfigured, or doesn't match the authenticated user.
