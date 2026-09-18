## 2024-05-24 - Missing Admin Authorization Check
**Vulnerability:** The admin content endpoint `api/admin-content.js` had the authorization check commented out ("TODO: Add strict admin role check here"), which could allow any authenticated user to potentially perform admin actions.
**Learning:** Hardcoded placeholders ("TODOs") for security checks can easily be missed before moving to production, creating privilege escalation opportunities.
**Prevention:** Implement fail-closed security logic from the beginning. If the required environment variable `ADMIN_USER_ID` is missing, deny access immediately.
