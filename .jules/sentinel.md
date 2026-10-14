
## 2026-10-14 - [MEDIUM] Fix information leakage in error responses
**Vulnerability:** Internal error details (like stack traces, db constraint messages, API proxy details) were being returned in API response JSON structures (e.g., `details: err.message` in `api/trials.js` and `fulfillment_error: error.message` in `api/razorpay-webhook.js`).
**Learning:** In Vercel serverless functions (like `api/*.js`), passing `err.message` directly to the client exposes internal architectural and operational information that could be leveraged by attackers.
**Prevention:** Always employ generic error messages in API responses to clients, and log detailed exception messages (e.g., `console.error(..., err)`) exclusively on the server side.
