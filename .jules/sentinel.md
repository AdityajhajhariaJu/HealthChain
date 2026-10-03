## 2024-10-03 - Prevent Information Leakage in API Error Responses
**Vulnerability:** The API routes `api/trials.js` and `api/create-order.js` were returning internal system error details (such as stack traces or third-party provider error messages) directly to the client in HTTP 500/502 responses.
**Learning:** Detailed error messages can inadvertently expose sensitive information about the backend architecture, third-party integrations, and internal system state to unauthorized users, increasing the attack surface.
**Prevention:** Always catch exceptions in API handlers, log the detailed errors server-side for debugging, and return only generic, user-friendly error messages (e.g., 'Internal Server Error' or 'Payment provider error') to the client.
