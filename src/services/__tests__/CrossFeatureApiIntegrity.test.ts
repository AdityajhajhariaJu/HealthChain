// @vitest-environment jsdom
// Consent behavior is covered separately; these cases isolate account/clinical boundaries.
vi.mock('../AIConsent', () => ({ requestAIConsent: async () => {}, hasAIConsent: () => true, AI_CONSENT_VERSION: '2026-10-04' }));
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  query: vi.fn(),
  read: vi.fn(),
  queue: vi.fn(),
}));
vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: mocks.session } } }));
vi.mock('../SyncOutbox', () => ({ enqueueSync: mocks.queue }));
vi.mock('../MemoryService', () => ({ compilePatientContext: () => '' }));
vi.mock('../CaseEngine', () => ({ getActiveCase: () => null }));
vi.mock('@capgo/capacitor-health', () => ({
  Health: { queryAggregated: mocks.query, readSamples: mocks.read },
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'ios' } }));
import { analyzeLabReport } from '../geminiService';
import { syncHealthData } from '../HealthTrackingService';
import { AmbientSyncEngine } from '../AmbientSyncEngine';
const account = (id: string) => localStorage.setItem('hc_account', JSON.stringify({ id }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
const report = {
  testName: 'Synthetic report',
  biomarkers: {
    Ferritin: { value: 22, unit: 'ng/mL', status: 'NORMAL', referenceRange: '15–200' },
    Zero: { value: 0, unit: 'count' },
  },
  abnormalities: [],
};
const response = () =>
  new Response(
    JSON.stringify({
      candidates: [
        { finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(report) }] } },
      ],
    }),
    { status: 200 }
  );
const sample = (value: number, unit: string) => ({
  value,
  unit,
  startDate: '2026-09-30T00:00:00Z',
  endDate: '2026-10-01T00:00:00Z',
});
beforeEach(() => {
  localStorage.clear();
  account('account-a');
  mocks.session.mockReset();
  mocks.session.mockResolvedValue({
    data: { session: { user: { id: 'account-a' }, access_token: 'synthetic-token' } },
  });
  mocks.query.mockReset();
  mocks.query.mockResolvedValue({ samples: [] });
  mocks.read.mockReset();
  mocks.read.mockResolvedValue({ samples: [] });
  mocks.queue.mockReset();
  mocks.queue.mockResolvedValue(true);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response())
  );
});
afterEach(() => vi.unstubAllGlobals());
describe('API data remains source- and owner-bound', () => {
  it('does not manufacture local functional findings or overwrite zero during lab extraction', async () => {
    expect(await analyzeLabReport('synthetic', 'image/png', {})).toEqual(report);
    const sent = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(sent.systemInstruction.parts[0].text).toContain(
      'Demographics do not supply a missing reference range'
    );
  });
  it('rejects an account switch during authentication before sending a clinical request', async () => {
    const auth = deferred<any>();
    mocks.session.mockReturnValue(auth.promise);
    const pending = analyzeLabReport('private A', 'image/png', {});
    account('account-b');
    auth.resolve({ data: { session: { user: { id: 'account-b' }, access_token: 'synthetic-B' } } });
    expect(await pending).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('discards the provider response after a switch without retrying it under another account', async () => {
    const provider = deferred<Response>();
    vi.mocked(fetch).mockReturnValue(provider.promise);
    const pending = analyzeLabReport('private A', 'image/png', {});
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    account('account-b');
    provider.resolve(response());
    expect(await pending).toBeNull();
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('does not attach a stale signed-in token in explicit guest mode', async () => {
    localStorage.setItem('hc_guest_mode', 'true');
    await analyzeLabReport('guest', 'image/png', {});
    expect((vi.mocked(fetch).mock.calls[0][1]?.headers as any).Authorization).toBeUndefined();
  });
  it('lets an explicit guest proceed when account recovery and asynchronous hashing are stalled', async () => {
    localStorage.setItem('hc_guest_mode', 'true');
    mocks.session.mockImplementation(() => new Promise(() => {}));
    const digest = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('crypto', { subtle: { digest } });
    await expect(analyzeLabReport('guest with blocked storage', 'image/png', {})).resolves.toEqual(
      report
    );
    expect(mocks.session).not.toHaveBeenCalled();
    expect(digest).not.toHaveBeenCalled();
    const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers['X-HC-Request-Id']).toMatch(/^[a-zA-Z0-9._:-]{8,120}$/);
  });
  it('does not present an HTTP 429 as a purchased allowance failure', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 429 }));
    const quota = vi.fn();
    window.addEventListener('hc_quota_exceeded', quota);
    await analyzeLabReport('synthetic', 'image/png', {});
    expect(quota).not.toHaveBeenCalled();
    window.removeEventListener('hc_quota_exceeded', quota);
  });
});
describe('actual health-device ingestion', () => {
  it('averages heart rate, preserves zero activity, and preserves sleep stage and units', async () => {
    mocks.query.mockImplementation(async ({ dataType }: any) => ({
      samples: [
        sample(
          dataType === 'heartRate' ? 68 : 0,
          dataType === 'heartRate' ? 'bpm' : dataType === 'steps' ? 'count' : 'kilocalorie'
        ),
      ],
    }));
    mocks.read.mockResolvedValue({ samples: [{ ...sample(45, 'minute'), sleepState: 'rem' }] });
    expect(await syncHealthData()).toMatchObject({ status: 'queued', queued: 4, failures: 0 });
    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({ dataType: 'heartRate', aggregation: 'average' })
    );
    expect(mocks.queue).toHaveBeenCalledWith(
      'health_metrics_upsert',
      'account-a',
      expect.objectContaining({ metric_type: 'heartRate_average', value: 68, unit: 'bpm' })
    );
    expect(mocks.queue).toHaveBeenCalledWith(
      'health_metrics_upsert',
      'account-a',
      expect.objectContaining({ metric_type: 'steps', value: 0 })
    );
    expect(mocks.queue).toHaveBeenCalledWith(
      'health_metrics_upsert',
      'account-a',
      expect.objectContaining({ metric_type: 'sleep_rem', value: 45, unit: 'minute' })
    );
  });
  it('stops a delayed device result after logout/account switch', async () => {
    const native = deferred<any>();
    mocks.query.mockReturnValue(native.promise);
    const pending = syncHealthData();
    await vi.waitFor(() => expect(mocks.query).toHaveBeenCalledOnce());
    account('account-b');
    native.resolve({ samples: [sample(100, 'count')] });
    await expect(pending).rejects.toThrow('Account changed');
    expect(mocks.queue).not.toHaveBeenCalled();
  });
  it('reports failed reads and failed queues instead of declaring cloud sync complete', async () => {
    mocks.query.mockRejectedValue(new Error('native denied'));
    expect(await syncHealthData()).toMatchObject({ status: 'partial', failures: 3 });
    mocks.query.mockResolvedValue({ samples: [sample(10, 'count')] });
    mocks.queue.mockResolvedValue(false);
    expect(await syncHealthData()).toMatchObject({ status: 'partial', queued: 0 });
  });
  it('rejects explicit guests, even when a previous auth session remains', async () => {
    localStorage.setItem('hc_guest_mode', 'true');
    await expect(syncHealthData()).rejects.toThrow('Sign in');
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it('does not return fake hardware readings from the unused native adapter', async () => {
    expect(await AmbientSyncEngine.pullLiveBiometrics()).toBeNull();
  });
});
