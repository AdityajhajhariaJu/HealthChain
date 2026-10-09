## 2026-10-09 - React.memo for LivingAtmosphereCanvas
**Learning:** Using `React.memo` effectively on complex, animated child components like `LivingAtmosphereCanvas` prevents them from re-rendering unecessarily when the parent updates frequently (e.g. `MeditationPlayer` due to internal countdown timers).
**Action:** Identify expensive components using `requestAnimationFrame` loops and apply `React.memo` to isolate them from frequent prop-agnostic parent re-renders.
