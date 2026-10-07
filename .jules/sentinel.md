## 2024-10-07 - Remove info leakage in trials.js
**Vulnerability:** Information leakage due to error details being returned in a 500 response.
**Learning:** Backend handlers catching unhandled exceptions shouldn't expose the underlying error message to end users.
**Prevention:** Use generic error messages for 500 responses.
