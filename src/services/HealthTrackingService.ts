import { Health } from '@capgo/capacitor-health';
import { enqueueSync } from './SyncOutbox';

export type SupportedHealthMetric = 'steps' | 'sleep' | 'heartRate' | 'calories';

function accountId(): string | null {
  try {
    const acct = localStorage.getItem('hc_account');
    if (!acct) return null;
    const parsed = JSON.parse(acct);
    return parsed?.id || parsed?.user?.id || null;
  } catch {
    return null;
  }
}

export async function isHealthSupported(): Promise<boolean> {
  try {
    const available = await Health.isAvailable();
    return !!available?.available;
  } catch {
    return false;
  }
}

export async function checkHealthPermissions(): Promise<boolean> {
  try {
    const available = await Health.isAvailable();
    if (!available?.available) return false;
    const status = await Health.checkAuthorization({ read: ['steps', 'sleep', 'heartRate', 'totalCalories', 'weight', 'height'] });
    return status?.readAuthorized && status.readAuthorized.length > 0;
  } catch (err) {
    console.warn('Health checkAuthorization error:', err);
    return false;
  }
}

export async function requestHealthPermissions(): Promise<boolean> {
  try {
    const status = await Health.requestAuthorization({
      read: ['steps', 'sleep', 'heartRate', 'totalCalories', 'weight', 'height']
    });
    return !!(status?.readAuthorized && status.readAuthorized.length > 0);
  } catch (err) {
    console.error('Failed to request health permissions:', err);
    return false;
  }
}

export async function syncHealthData(daysBack: number = 7): Promise<void> {
  const userId = accountId();
  if (!userId) return;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const isoStart = startDate.toISOString();
  const isoEnd = endDate.toISOString();

  const metricsToFetch = [
    { type: 'steps', unit: 'count' },
    { type: 'heartRate', unit: 'bpm' },
    { type: 'totalCalories', unit: 'kilocalorie' }
  ] as const;

  for (const metric of metricsToFetch) {
    try {
      const result = await Health.queryAggregated({
        dataType: metric.type as any,
        startDate: isoStart,
        endDate: isoEnd,
        bucket: 'day',
        aggregation: 'sum'
      });

      if (result && Array.isArray(result.samples)) {
        for (const sample of result.samples) {
          if (!sample.value) continue;
          
          const payload = {
            user_id: userId,
            metric_type: metric.type,
            value: sample.value,
            unit: metric.unit,
            start_time: sample.startDate,
            end_time: sample.endDate,
            source_device: 'capacitor_health_sync'
          };
          
          await enqueueSync('health_metrics_upsert', userId, payload);
        }
      }
    } catch (err) {
      console.warn(`Failed to sync health metric ${metric.type}:`, err);
    }
  }

  try {
    const sleepResult = await Health.readSamples({
      dataType: 'sleep',
      startDate: isoStart,
      endDate: isoEnd
    });
    
    if (sleepResult && Array.isArray(sleepResult.samples)) {
      for (const sample of sleepResult.samples) {
        if (!sample.value) continue;
        
        const payload = {
          user_id: userId,
          metric_type: (sample as any).sleepState ? `sleep_${(sample as any).sleepState}` : 'sleep',
          value: sample.value, 
          unit: sample.unit || 'minute',
          start_time: sample.startDate,
          end_time: sample.endDate,
          source_device: 'capacitor_health_sync'
        };
        
        await enqueueSync('health_metrics_upsert', userId, payload);
      }
    }
  } catch (err) {
    console.warn(`Failed to sync sleep:`, err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_health_sync_complete', { 
      detail: { at: new Date().toISOString() } 
    }));
  }
}
