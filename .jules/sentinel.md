## 2026-10-19 - [Fixed timing attack vulnerability in cron and recovery scripts]
**Vulnerability:** Timing attack vulnerability using standard string comparison `!==` for secrets.
**Learning:** Standard string comparison can allow attackers to guess the secret character by character based on response time.
**Prevention:** Always use `crypto.timingSafeEqual` with proper buffer length checking for comparing security-sensitive secrets.
