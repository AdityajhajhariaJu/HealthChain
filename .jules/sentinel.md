## 2024-05-18 - Fix timing attack vulnerabilities in auth tokens
**Vulnerability:** Weak string comparison (`!==`) for authentication secrets like `CRON_SECRET` in backend endpoints.
**Learning:** Exposed endpoints used standard equality which leaks execution time differences, allowing attackers to incrementally guess the secret token.
**Prevention:** Use `crypto.timingSafeEqual` for all secret validation with pre-flight byte-length checks to avoid crashing the server on mismatched inputs.
