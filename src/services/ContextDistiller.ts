export function generateDistilledBiometricContext(): string {
  // In a real app, this would read from local SQLite/Zustand store 
  // and compress thousands of rows into this dense string.
  
  // Fake "Semantic Distillation" for the pitch
  const distilled = `
[SYSTEM: DISTILLED_USER_STATE_V1]
- HRV: Low (32ms) - Stress indicated.
- Sleep: 4h 12m (Poor, 12m Deep).
- Meds: Metformin 500mg (Taken 8:00 AM).
- Nutritionist Note: "Drop sodium intake this week."
- War Room AI Flag: "Miso Soup logged, sodium warning triggered."
[END_DISTILLATION]
  `.trim();
  
  return distilled;
}
