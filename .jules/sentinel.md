## 2024-10-24 - Prevent timing attacks on CRON_SECRET
**Vulnerability:** The API endpoints used for CRON jobs (`api/cron/revoke-expired.js` and `api/recover.js`) were comparing the `CRON_SECRET` using standard string equality (`!==`). This is susceptible to timing attacks, allowing an attacker to incrementally guess the secret token by observing the response time.
**Learning:** Hardcoded tokens for authorization or webhooks must be compared in constant time to prevent leaking the secret through timing variations in string comparison operations.
**Prevention:** Always use `crypto.timingSafeEqual` (or an equivalent secure comparison function) when comparing sensitive tokens, secrets, or signatures.
