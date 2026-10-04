// Shared client/server contract. No arbitrary strings or per-person identifiers.
export const MEASUREMENT_VERSION = '2026-10-04-aggregate-v2';
export const METRIC_DIMENSIONS = Object.freeze({
  page_view: ['/', '/pricing', '/privacy', '/terms', '/terms-policies', '/privacy-security', '/delete-account', '/acceptable-use', '/app-license', '/consumer-health-privacy', '/login', '/signup', '/help', '/review-demo', 'workspace'],
  feature_used: ['workspace'], button_click: ['get_started', 'feedback', 'workspace_action'],
  begin_checkout: ['web_checkout'], purchase: ['web_checkout'], onboarding: ['started', 'completed'],
  audio_action: ['playing', 'offline_playing', 'downloaded', 'download_failed', 'playback_failed'],
  ai_request: ['started', 'completed', 'failed'], app_error: ['screen', 'asset_load'],
});
export function validMetric(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === 3 && ['event', 'dimension', 'platform'].every(key => Object.hasOwn(value, key)) &&
    ['event', 'dimension', 'platform'].every(key => typeof value[key] === 'string') &&
    Object.hasOwn(METRIC_DIMENSIONS, value.event) && METRIC_DIMENSIONS[value.event].includes(value.dimension) &&
    ['web', 'android', 'ios'].includes(value.platform);
}
export function metricPayload(event, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  if (event === 'page_view' && typeof payload.path === 'string') {
    const path = payload.path.split(/[?#]/, 1)[0];
    const dimension = path === '/app' || path.startsWith('/app/') ? 'workspace' : path;
    return METRIC_DIMENSIONS.page_view.includes(dimension) ? { dimension } : null;
  }
  if (event === 'feature_used' && ['today', 'daily_checkin'].includes(payload.feature)) return { dimension: 'workspace' };
  if (event === 'button_click') {
    if (payload.button === 'Get Started') return { dimension: 'get_started' };
    if (payload.button === 'feedback_submitted') return { dimension: 'feedback' };
    if (['clinical_parent_pillar_select', 'clinical_station_jump', 'clinical_parent_pillar_open'].includes(payload.button)) return { dimension: 'workspace_action' };
  }
  if (['begin_checkout', 'purchase'].includes(event) && typeof payload.value === 'number' &&
    Number.isFinite(payload.value) && payload.value >= 0 && payload.value <= 1000000) return { dimension: 'web_checkout' };
  if (['onboarding', 'audio_action', 'ai_request', 'app_error'].includes(event) &&
    METRIC_DIMENSIONS[event].includes(payload.action)) return { dimension: payload.action };
  return null;
}
