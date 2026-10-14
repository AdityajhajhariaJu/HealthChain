## 2025-03-09 - Memoize LivingAtmosphereCanvas to prevent unnecessary re-renders in MeditationPlayer
**Learning:** `LivingAtmosphereCanvas` was re-rendering unnecessarily every second because its parent `MeditationPlayer` has a `setInterval` timer. This caused performance issues as the canvas logic was run constantly.
**Action:** Always verify if expensive canvas or animation child components are wrapped in `React.memo` when placed inside a parent component with frequent state updates.
