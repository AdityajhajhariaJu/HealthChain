/**
 * Canonical Domain Model for Clinical Elimination Trials (TrialV2)
 * Schema Version: 2
 */

export type TrialStatus =
  | 'draft'
  | 'baseline'
  | 'restriction'
  | 'ready_for_challenge'
  | 'challenge_active'
  | 'recovery'
  | 'personalization'
  | 'paused'
  | 'completed'
  | 'stopped';

export type ChallengeStatus =
  | 'planned'
  | 'active'
  | 'reaction_recorded'
  | 'completed'
  | 'stopped';

export type ChallengeOutcome =
  | 'no_reaction'
  | 'reaction_recorded'
  | 'inconclusive'
  | 'clinician_review_needed';

export type AdherenceLevel =
  | 'unknown'
  | 'followed'
  | 'partly_followed'
  | 'not_followed';

export interface TrialBaselineRequirement {
  requiredObservations: number;
  completedObservations: number;
  baselineSeverity: number | null;
}

export interface TrialConsentRecord {
  acceptedAt?: string;
  acknowledgedLimitations: boolean;
  supervisingClinician?: string;
}

export interface TrialIntakeAssessment {
  symptoms: string[];
  timing: string;
  baselineSeverity: number | null;
  safetyAcknowledged: boolean;
  completedAt: string;
  matchedProtocolId?: string;
}

export interface FoodVerdictItem {
  id: string;
  name: string;
  category?: string;
  classification: 'confirmed_trigger' | 'cleared_safe' | 'inconclusive';
  severityDropOrDelta?: number;
  reactionDescription?: string;
  suggestedSwap?: string;
  notes?: string;
}

export interface ClinicalVerdictData {
  graduatedAt: string;
  initialBaselineSeverity: number | null;
  finalSeverity: number | null;
  symptomReductionPercentage: number | null;
  confirmedTriggers: FoodVerdictItem[];
  clearedFoods: FoodVerdictItem[];
  inconclusiveFoods: FoodVerdictItem[];
  clinicianDossierSummary: string;
  maintenanceDietRecommendations: string[];
}

export interface TrialV2 {
  id: string;
  schemaVersion: 2;
  profileId: string;
  caseId?: string;
  protocolId: string;
  protocolVersion: string;
  status: TrialStatus;
  startedAt: string;
  completedAt?: string;
  timezone: string;
  totalDurationDays: number;
  currentElapsedDays: number;
  baseline: TrialBaselineRequirement;
  activeFilters: string[];
  currentChallengeId?: string;
  statusBeforePause?: TrialStatus;
  consent: TrialConsentRecord;
  intakeAssessment?: TrialIntakeAssessment;
  stoppedReason?: 'flare' | 'difficulty' | 'clinician_advice' | 'completed' | 'switched' | 'other';
  stoppedAt?: string;
  verdict?: ClinicalVerdictData;
}

export interface FoodChallenge {
  id: string;
  trialId: string;
  itemId: string;
  displayName: string;
  doseDescription: string;
  quantity?: number;
  unit?: string;
  startedAt: string;
  endedAt?: string;
  observationWindowHours: number;
  status: ChallengeStatus;
  outcome?: ChallengeOutcome;
  observations: Array<{
    timestamp: string;
    hoursSinceIngestion: number;
    severityScore: number;
    symptomNotes?: string;
    hasReaction: boolean;
  }>;
}

export interface TrialDailyObservation {
  id: string;
  trialId: string;
  dateKey: string;
  dayIndex: number;
  severityScore: number | null;
  adherence: AdherenceLevel;
  note?: string;
  recordedAt: string;
}

export interface TrialChecklistCompletion {
  id: string;
  trialId: string;
  dateKey: string;
  completedTaskIds: string[];
  updatedAt: string;
}

export interface HealthEvent {
  id: string;
  profileId: string;
  caseId?: string;
  trialId?: string;
  type:
    | 'meal_logged'
    | 'symptom_logged'
    | 'daily_checkin'
    | 'trial_started'
    | 'task_completed'
    | 'exposure_logged'
    | 'challenge_started'
    | 'challenge_response'
    | 'challenge_completed'
    | 'trial_paused'
    | 'trial_resumed'
    | 'trial_completed'
    | 'trial_stopped';
  occurredAt: string;
  recordedAt: string;
  timezone: string;
  source: 'today' | 'diet' | 'ava' | 'trial' | 'import';
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface ProtocolGovernance {
  intendedUse: string;
  notFor: string[];
  evidenceScope: string;
  sourceReferences: string[];
  contentVersion: string;
  reviewedBy?: string;
  reviewedAt?: string;
  nextReviewAt?: string;
  minimumNutritionRequirements: string[];
  stopRules: string[];
  challengeRules: {
    minimumBaselineDays: number;
    observationWindowHours: number;
    recoveryDaysBetweenChallenges: number;
  };
}
