## 2026-09-14 - [CRITICAL] Fix missing admin authorization on admin-content API
**Vulnerability:** Missing authorization check on `api/admin-content.js` which allowed any authenticated user to perform admin actions (insert, update, delete).
**Learning:** An internal endpoint relied entirely on Supabase authentication (JWT verification) without enforcing authorization (role or user ID checking).
**Prevention:** Always verify that an authenticated user is actually authorized for the specific resource and action they are attempting to access.
