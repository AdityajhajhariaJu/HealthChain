import { captureAccountScope, isAccountScopeCurrent } from './AccountScope';
import { supabase } from './supabaseClient';
import { getItemSync, setItemSync } from './storage';

export interface DeviceMetric { id?: string; user_id: string; metric_type: string; value: number; unit: string; start_time: string; end_time: string; source_device: string }
export function validDeviceMetric(item: DeviceMetric, ownerId: string) {
  const expected = item.metric_type === 'steps' ? 'count' : item.metric_type === 'heartRate_average' ? 'bpm' : item.metric_type === 'totalCalories' ? 'kilocalorie' : null;
  return item.user_id === ownerId && typeof item.metric_type === 'string' && Number.isFinite(item.value) && item.value >= 0 &&
    Number.isFinite(Date.parse(item.start_time)) && Number.isFinite(Date.parse(item.end_time)) && Date.parse(item.end_time) >= Date.parse(item.start_time) &&
    (expected ? item.unit === expected && (item.metric_type !== 'heartRate_average' || item.value > 0) : /^sleep(?:_|$)/.test(item.metric_type) && ['minute', 'hour', 'second'].includes(item.unit));
}
const key = (owner: string) => `hc_device_metrics:${owner}:profile_1`;
function merge(rows: DeviceMetric[]) {
  const map = new Map<string, DeviceMetric>();
  for (const item of rows) map.set(`${item.metric_type}:${item.start_time}:${item.end_time}`, item);
  return [...map.values()].sort((a, b) => b.end_time.localeCompare(a.end_time));
}
export function saveDeviceMetricLocally(item: DeviceMetric) {
  const scope = captureAccountScope();
  if (!validDeviceMetric(item, scope.accountId) || !isAccountScopeCurrent(scope)) throw new Error('Invalid or stale device sample.');
  let rows: DeviceMetric[] = []; try { rows = JSON.parse(getItemSync(key(scope.accountId)) || '[]'); } catch {}
  const serialized = JSON.stringify(merge([...rows.filter(row => validDeviceMetric(row, scope.accountId)), item]));
  setItemSync(key(scope.accountId), serialized);
  if (getItemSync(key(scope.accountId)) !== serialized) throw new Error('Device health data could not be saved locally.');
}
export async function loadDeviceMetricContext() {
  const scope = captureAccountScope();
  const empty = { status: 'unavailable', role: 'device_observation', samples: [] as DeviceMetric[], notice: 'No verified device readings available; absence is not zero activity.' };
  if (scope.accountId === 'guest') return empty;
  let local: DeviceMetric[] = []; try { local = JSON.parse(getItemSync(key(scope.accountId)) || '[]'); } catch {}
  const localOnly = () => ({ status: local.some(item => validDeviceMetric(item, scope.accountId)) ? 'device_copy_only' : 'unavailable', role: 'device_observation',
    samples: merge(local.filter(item => validDeviceMetric(item, scope.accountId))).slice(0, 12),
    notice: 'Device copy only. Cloud availability is unknown; preserve source units and dates.' });
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!isAccountScopeCurrent(scope) || session?.user.id !== scope.accountId) return empty;
    const { data, error } = await supabase.from('user_health_metrics').select('id,user_id,metric_type,value,unit,start_time,end_time,source_device').eq('user_id', scope.accountId).order('start_time', { ascending: false }).limit(200);
    if (!isAccountScopeCurrent(scope)) return empty;
    const samples = merge([...(data || []), ...local].filter(item => validDeviceMetric(item, scope.accountId))).slice(0, 12);
    return { status: samples.length ? (error ? 'device_copy_only' : 'available') : error ? 'unavailable' : 'no_data', role: 'device_observation', samples,
      notice: 'Actual imported source samples, with original units and periods. Heart rate is an average, sleep stages may overlap, and device calorie estimates are not food intake. Do not infer a diagnosis or sum overlapping periods.' };
  } catch { return isAccountScopeCurrent(scope) ? localOnly() : empty; }
}
