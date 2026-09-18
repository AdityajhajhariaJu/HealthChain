## 2024-05-15 - Missing Authorization on Admin API
**Vulnerability:** Admin endpoint `api/admin-content.js` lacked authorization checks, allowing any authenticated user to perform admin actions.
**Learning:** Vercel serverless functions are publicly accessible endpoints, even if intended for internal use. Authentication is not authorization.
**Prevention:** Always employ a fail-closed authorization approach, comparing the user ID against `ADMIN_USER_ID` environment variable for admin endpoints.
