## 2025-10-08 - Prevent Error Detail Leakage in API Routes
**Vulnerability:** Information leakage through `err.message` in HTTP 500 error responses (`api/trials.js`).
**Learning:** Returning exception messages directly to the client can accidentally expose internal system structure, file paths, or upstream provider information.
**Prevention:** Always log exceptions securely on the server side (e.g., using `console.error`) and return generic error messages (like 'Internal Server Error' or 'Failed to fetch') to the client in production APIs.
