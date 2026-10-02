/** Compatibility API; implementation ownership lives in services/ai by operation. */
export { parseModelJson } from './modelJson';
export type { Message } from './ai/gut';
export { fetchGutQuestionFrame, fetchGutReasoning } from './ai/gut';
export {
  chatWithGemini,
  fetchMedicineData,
  chatWithTherapyGemini,
  analyzeLabReport,
} from './ai/consultation';
export {
  selectMDTSpecialists,
  chatWithMDTSpecialist,
  runMDTConference,
  generateMDTReport,
  runDebateRound,
  generateParallelMultiReport,
} from './ai/collaboration';
export {
  analyzeFoodEntry,
  generateDieticianAdvice,
  generateNutritionalGuardrails,
  generateGroceryList,
  hasPendingDietPlanRequest,
  clearPendingDietPlanRequest,
  generateMealPlan,
} from './ai/diet';
export {
  suggestSpecialists,
  runDifferentialAnalysis,
  generateProfileSynthesis,
  checkDrugInteractions,
  simulatePathway,
  generateCasePrepAnalysis,
  generateCaseConnectionMap,
  generateAppointmentQuestions,
  askAppointmentCoach,
  refineAppointmentBrief,
  runJarvisInvestigation,
  extractClinicalMemory,
} from './ai/investigation';
export type { FoodSmartAlternative, FoodAnalysisResult } from './ai/vision';
export { analyzeFoodImage, analyzeMedicineImage } from './ai/vision';
