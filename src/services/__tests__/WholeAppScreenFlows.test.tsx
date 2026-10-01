// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TopUpModal from '../../features/brand/TopUpModal';
import ClinicalTrialsMatcher from '../../features/tools/ClinicalTrialsMatcher';
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  checkout: vi.fn(),
  trials: vi.fn(),
  papers: vi.fn(),
  memory: vi.fn(),
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
  caseItem: {
    id: 'case-a',
    title: 'Migraine',
    intakeData: { chiefComplaint: 'Migraine' },
    reviews: [],
    differentials: [],
  } as any,
}));
vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: mocks.session } } }));
vi.mock('../razorpay', () => ({ initiateRazorpayCheckout: mocks.checkout }));
vi.mock('../ProfileEngine', () => ({
  getProfile: () => ({
    demographics: { age: 35, gender: 'female' },
    conditions: [],
    medications: [],
  }),
  getProfileKey: () => 'hc_unified_profile_synthetic-owner',
  getProfileEngineState: () => ({ activeId: 'profile_1' }),
}));
vi.mock('../caseWorkspace', () => ({ getUnifiedCaseScope: () => ({ caseItem: mocks.caseItem }) }));
vi.mock('../clinicalTrialsService', () => ({ fetchLiveTrials: mocks.trials }));
vi.mock('../pubMedService', () => ({
  fetchRecentLiterature: mocks.papers,
  cleanMedicalText: (text: any) => String(text || ''),
}));
vi.mock('../HealthMemory', () => ({ recordHealthMemory: mocks.memory }));
vi.mock('../VitalityPointsEngine', () => ({ awardPoints: vi.fn() }));
vi.mock('../analytics', () => ({ trackPurchase: vi.fn() }));
vi.mock('../haptics', () => ({ triggerHapticLight: vi.fn(), triggerHapticSuccess: vi.fn() }));
vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => false }));
vi.mock('../../components/ui/ToastProvider', () => ({ useToast: () => mocks.toast }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('hc_account', JSON.stringify({ id: 'synthetic-owner' }));
  mocks.session.mockResolvedValue({
    data: {
      session: {
        user: { id: 'synthetic-owner', email: 'synthetic@example.test' },
        access_token: 'synthetic-token',
      },
    },
  });
  mocks.caseItem = {
    id: 'case-a',
    title: 'Migraine',
    intakeData: { chiefComplaint: 'Migraine' },
    reviews: [],
    differentials: [],
  };
  mocks.papers.mockResolvedValue([]);
});
afterEach(cleanup);
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
function trial(id: string, title: string) {
  return {
    id,
    title,
    status: 'RECRUITING',
    conditions: [title.split(' ')[0]],
    summary: title,
    eligibility: {},
    location: 'Registry location',
    interventions: [],
  };
}

it('the actual top-up modal calls the shared Razorpay recovery flow once', async () => {
  const pending = deferred<any>();
  mocks.checkout.mockReturnValue(pending.promise);
  const onSuccess = vi.fn();
  render(
    <MemoryRouter>
      <TopUpModal feature="ava_replies" onClose={vi.fn()} onSuccess={onSuccess} />
    </MemoryRouter>
  );
  const button = screen.getByRole('button', { name: 'Buy Now' });
  fireEvent.click(button);
  fireEvent.click(button);
  await vi.waitFor(() => expect(mocks.checkout).toHaveBeenCalledTimes(1));
  expect(mocks.checkout.mock.calls[0][0]).toBe('topup_ava');
  await act(async () => pending.resolve({ success: true, orderId: 'synthetic-order' }));
  expect(onSuccess).toHaveBeenCalledTimes(1);
});

it('the actual top-up modal recovers its button after a missing session', async () => {
  mocks.session.mockResolvedValue({ data: { session: null } });
  render(
    <MemoryRouter>
      <TopUpModal feature="ava_replies" onClose={vi.fn()} onSuccess={vi.fn()} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Buy Now' }));
  await vi.waitFor(() =>
    expect(mocks.toast.error).toHaveBeenCalledWith('Sign in required', expect.any(String))
  );
  expect((screen.getByRole('button', { name: 'Buy Now' }) as HTMLButtonElement).disabled).toBe(
    false
  );
  expect(mocks.checkout).not.toHaveBeenCalled();
});

it('a delayed old case research search cannot overwrite or record the next case results', async () => {
  const old = deferred<any[]>();
  mocks.trials.mockImplementation((terms: string[]) =>
    terms.includes('Migraine')
      ? old.promise
      : Promise.resolve([trial('new-study', 'Arthritis study')])
  );
  render(
    <MemoryRouter>
      <ClinicalTrialsMatcher />
    </MemoryRouter>
  );
  await vi.waitFor(() => expect(mocks.trials).toHaveBeenCalledTimes(1));
  mocks.caseItem = {
    id: 'case-b',
    title: 'Arthritis',
    intakeData: { chiefComplaint: 'Arthritis' },
    reviews: [],
    differentials: [],
  };
  await act(async () => window.dispatchEvent(new Event('hc_active_case_updated')));
  await screen.findByText('Arthritis study');
  await act(async () => old.resolve([trial('old-study', 'Migraine old study')]));
  expect(screen.queryByText('Migraine old study')).toBeNull();
  expect(mocks.memory.mock.calls.every(([value]) => value.caseId === 'case-b')).toBe(true);
});

it('cached partial research results retain the provider failure status', async () => {
  mocks.trials.mockRejectedValue(new Error('synthetic source outage'));
  render(
    <MemoryRouter>
      <ClinicalTrialsMatcher />
    </MemoryRouter>
  );
  await vi.waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain('Partial Source Failure:')
  );
  cleanup();
  mocks.trials.mockClear();
  render(
    <MemoryRouter>
      <ClinicalTrialsMatcher />
    </MemoryRouter>
  );
  await vi.waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain('Partial Source Failure:')
  );
  expect(mocks.trials).not.toHaveBeenCalled();
});
