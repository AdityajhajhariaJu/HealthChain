## 2025-02-28 - Secure API Error Messages

**Vulnerability:** Detailed error messages (`error.message` and `error.error?.description`) from third-party services (Razorpay) and internal APIs (ClinicalTrials) were being exposed to the client in 500 error responses (`api/create-order.js` and `api/trials.js`).
**Learning:** Returning detailed error objects to the client provides attackers with internal context, dependency structures, and potential infrastructure details that can be exploited.
**Prevention:** Always log detailed error messages internally (`console.error`) and return a generic, sanitized message to the client (e.g., "Payment provider unavailable. Please try again later.").
