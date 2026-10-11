## 2025-02-15 - Prevent Information Leakage in API Response
**Vulnerability:** The `/api/trials.js` backend handler was leaking internal error details to the client in a 500 response (`details: err.message`).
**Learning:** This could expose sensitive backend details or architecture information to malicious actors. Error payloads should not contain raw internal error messages.
**Prevention:** Remove raw error details from client-facing JSON payloads in 500 status responses. Log the complete error object server-side instead using `console.error(..., err)`.
