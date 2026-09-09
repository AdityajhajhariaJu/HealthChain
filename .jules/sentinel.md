## 2025-05-18 - Privilege Escalation via User-Controlled Table Name
**Vulnerability:** In `api/admin-content.js`, the `table` variable was read directly from the user's request payload (`req.body`) and passed into the Supabase client initialized with the Service Role Key. This allowed any authenticated user to potentially modify or delete data in any table.
**Learning:** Using the Service Role Key bypasses Row Level Security (RLS). When user input is used to determine which table to query using this key, it leads to a critical broken access control vulnerability.
**Prevention:** Always validate and restrict user input against a strict allowlist (e.g., `ALLOWED_TABLES`) when constructing queries, especially when using elevated privileges like the Service Role Key.
