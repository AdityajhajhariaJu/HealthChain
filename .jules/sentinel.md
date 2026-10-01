## 2026-10-01 - Fix broken error handling exposing internal info
**Vulnerability:** Admin endpoint returns error.message directly.
**Learning:** Returning detailed error messages can expose sensitive server information or internal configurations.
**Prevention:** Catch errors and return generic error messages (e.g. 'Internal Server Error').
