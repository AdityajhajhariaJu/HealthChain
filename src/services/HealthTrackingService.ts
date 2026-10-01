import { Health } from '@capgo/capacitor-health';
import { enqueueSync } from './SyncOutbox';
import { supabase } from './supabaseClient';
import { captureAccountScope, isAccountScopeCurrent } from './AccountScope';
import { saveDeviceMetricLocally } from './DeviceMetricRepository';

export type SupportedHealthMetric = 'steps' | 'sleep' | 'heartRate' | 'calories';
export interface HealthSyncResult { queued: number; skipped: number; failures: number; status: 'queued' | 'partial' | 'no_data' }
const permissions = ['steps', 'sleep', 'heartRate', 'totalCalories', 'weight', 'height'] as const;
export async function isHealthSupported(): Promise<boolean> {
  try { return !!(await Health.isAvailable())?.available; } catch { return false; }
}
export async function checkHealthPermissions(): Promise<boolean> {
  try {
    if (!(await Health.isAvailable())?.available) return false;
    return !!(await Health.checkAuthorization({ read: [...permissions] }))?.readAuthorized?.length;
  } catch { return false; }
}
export async function requestHealthPermissions(): Promise<boolean> {
  try { return !!(await Health.requestAuthorization({ read: [...permissions] }))?.readAuthorized?.length; }
  catch { return false; }
}

/** Import actual device samples into the outbox. Queued does not mean uploaded. */
export async function syncHealthData(daysBack = 7): Promise<HealthSyncResult> {
  if (!Number.isInteger(daysBack) || daysBack < 1 || daysBack > 30) throw new Error('Choose a health import window from 1 to 30 days.');
  const scope = captureAccountScope();
  if (scope.accountId === 'guest') throw new Error('Sign in before importing device health data.');
  const { data: { session } } = await supabase.auth.getSession();
  const current = () => isAccountScopeCurrent(scope);
  if (!current() || session?.user?.id !== scope.accountId) throw new Error('Account changed. Reconnect health devices.');
  const assertCurrent = () => { if (!current()) throw new Error('Account changed. Reconnect health devices.'); };
  const endDate = new Date(), startDate = new Date(); startDate.setDate(startDate.getDate() - daysBack);
  const range = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
  const result: HealthSyncResult = { queued: 0, skipped: 0, failures: 0, status: 'no_data' };
  const save = async (sample: { value: number; startDate: string; endDate: string; unit?: string }, metricType: string, expectedUnit?: string) => {
    assertCurrent();
    if (!Number.isFinite(sample.value) || sample.value < 0 || !Number.isFinite(Date.parse(sample.startDate)) ||
        !Number.isFinite(Date.parse(sample.endDate)) || Date.parse(sample.endDate) < Date.parse(sample.startDate) ||
        expectedUnit && sample.unit !== expectedUnit || !sample.unit || metricType === 'heartRate_average' && sample.value === 0) {
      result.skipped++; return;
    }
    const row = {
      user_id: scope.accountId, metric_type: metricType, value: sample.value, unit: sample.unit,
      start_time: sample.startDate, end_time: sample.endDate, source_device: 'capacitor_health_sync',
    };
    saveDeviceMetricLocally(row);
    const queued = await enqueueSync('health_metrics_upsert', scope.accountId, row);
    assertCurrent();
    if (queued) result.queued++; else result.failures++;
  };
  for (const metric of [
    { type: 'steps', unit: 'count', aggregation: 'sum', storedType: 'steps' },
    { type: 'heartRate', unit: 'bpm', aggregation: 'average', storedType: 'heartRate_average' },
    { type: 'totalCalories', unit: 'kilocalorie', aggregation: 'sum', storedType: 'totalCalories' },
  ] as const) {
    assertCurrent();
    try {
      const data = await Health.queryAggregated({ dataType: metric.type, ...range, bucket: 'day', aggregation: metric.aggregation });
      assertCurrent();
      for (const sample of data.samples || []) await save(sample, metric.storedType, metric.unit);
    } catch (error) { assertCurrent(); result.failures++; console.warn('Device health import failed for', metric.type, error); }
  }
  try {
    const data = await Health.readSamples({ dataType: 'sleep', ...range }); assertCurrent();
    // Preserve stage and unit; overlapping sleep stages must not be summed into a total.
    for (const sample of data.samples || []) await save(sample, sample.sleepState ? `sleep_${sample.sleepState}` : 'sleep');
  } catch (error) { assertCurrent(); result.failures++; console.warn('Device sleep import failed', error); }
  assertCurrent();
  result.status = result.failures ? 'partial' : result.queued ? 'queued' : 'no_data';
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hc_health_sync_complete', { detail: { ...result, ownerId: scope.accountId, at: new Date().toISOString() } }));
  return result;
}
