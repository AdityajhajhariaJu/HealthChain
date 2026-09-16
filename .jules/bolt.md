## 2024-05-24 - Unmemoized static list filtering
**Learning:** Found multiple instances where large static arrays (like FOOD_DATABASE and ALL_SPECIALISTS) were being filtered synchronously on every React render during text input searches, creating unnecessary CPU work.
**Action:** Always wrap derived list filtering operations in `useMemo` when the source data is static or large, especially when the dependency is a frequent user input (like a search query). This prevents layout thrashing on every keystroke.
