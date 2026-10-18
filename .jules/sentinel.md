## 2024-11-20 - [HIGH] Fix timing attack vulnerability in secret comparison
**Vulnerability:** CRON_SECRET authorization headers were compared using standard string equality (`!==`) in `api/cron/revoke-expired.js` and `api/recover.js`.
**Learning:** Standard string comparisons can leak the length and characters of the secret via timing attacks because they return early on character mismatches.
**Prevention:** Always use `crypto.timingSafeEqual()` with buffered inputs for comparing secrets, API keys, or signatures to ensure constant-time comparison.
