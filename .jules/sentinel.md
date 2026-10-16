## 2026-10-16 - Prevent API error message leakage in serverless functions
**Vulnerability:** The `/api/trials` endpoint leaked upstream API error details directly to the client by attaching `err.message` to a 500 response payload.
**Learning:** Returning raw exception messages to the client on server failure creates an information disclosure vulnerability that can expose backend dependencies and internal stack states.
**Prevention:** In backend API routes (e.g., Vercel Serverless Functions), ensure 500 error responses use generic messages (like 'Internal Server Error' or 'Failed to fetch') and log the detailed `error.message` payloads exclusively server-side using `console.error()` to preserve debuggability safely.
