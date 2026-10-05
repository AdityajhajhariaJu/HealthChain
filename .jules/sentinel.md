## 2026-10-05 - Prevent API Error Leakage
**Vulnerability:** API routes returned raw error messages and stack details (like `error.message` and `err.message`) in 500/502 HTTP responses, risking internal implementation disclosure to end users.
**Learning:** Detailed error messages were passed directly to client responses rather than being safely logged internally and substituted with generic user-facing messages.
**Prevention:** Always use generic HTTP error messages for client responses (e.g., 'Internal Server Error', 'Payment gateway error') and keep detailed diagnostic payloads restricted to secure server-side logs.
