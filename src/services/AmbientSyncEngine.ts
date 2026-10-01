import { Capacitor } from '@capacitor/core';

export interface BiometricData {
  heartRate: number;
  hrv: number;
  sleepHours: number;
  deepSleepPercentage: number;
  readings: { timestamp: string; value: number }[];
}

export class AmbientSyncEngine {
  /**
   * Proactively requests HealthKit (iOS) or Health Connect (Android) permissions
   * and pulls the last 7 days of biometric telemetry.
   */
  static async pullLiveBiometrics(): Promise<BiometricData | null> {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      console.warn('AmbientSyncEngine: Cannot access hardware biometrics from a web browser. Compile to iOS/Android to read physical sensors.');
      return null;
    }

    // No current caller uses this legacy adapter. A real typed adapter is
    // required before enabling it; never return sample data as hardware data.
    return null;
  }

  /**
   * Generates a proactive AI briefing prompt based on raw hardware telemetry.
   */
  static generateBriefingPrompt(biometrics: BiometricData): string {
    return `Unverified supplied biometric data: ${JSON.stringify(biometrics)}. Source and measurement dates must be checked. These values alone do not establish stress, fatigue, recovery, or a need for an intervention.`;
  }
}
