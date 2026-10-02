// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeClinicalReview } from '../../services/clinicalReview';
import { clinicalSourceFingerprint } from '../../services/clinicalReviewSourceState';
import JarvisInvestigator from './JarvisInvestigator';

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
  error: vi.fn(),
  session: vi.fn(),
  cases: [
    {
      id: 'existing',
      title: 'My ongoing concern',
      status: 'active',
      intakeData: { chiefComplaint: 'My actual symptom history' },
      medicalRecords: [],
      reviews: [],
      events: [],
      currentSummary: {},
    },
  ],
}));
vi.mock('../../services/geminiService', () => ({ runJarvisInvestigation: mocks.run }));
vi.mock('../../services/CaseEngine', () => ({
  getCase: (id: string) => mocks.cases.find((c) => c.id === id),
  getCases: () => mocks.cases,
  getActiveCase: () => null,
  getActiveCaseId: () => null,
  setActiveCase: vi.fn(),
  createCaseDraft: mocks.create,
  saveReviewSnapshot: mocks.save,
}));
vi.mock('../../hooks/useCaseWorkspace', () => ({ useCaseWorkspace: () => mocks.cases }));
vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => false }));
vi.mock('../../services/ProfileEngine', () => ({
  getProfile: () => ({ isPro: true }),
  getProfileKey: () => 'test-profile',
  getProfileEngineState: () => ({ activeId: 'profile_1' }),
}));
vi.mock('../../services/authSession', () => ({ getActiveSession: mocks.session }));
vi.mock('../../services/TrialEngine', () => ({ openTrialModal: vi.fn() }));
vi.mock('../../services/HealthMemory', () => ({
  recordHealthMemory: vi.fn(),
  getHealthMemory: vi.fn(() => []),
}));
vi.mock('../../services/VitalityPointsEngine', () => ({ awardPoints: vi.fn() }));
vi.mock('../../services/haptics', () => ({
  triggerHapticSelection: vi.fn(),
  triggerHapticLight: vi.fn(),
  triggerHapticSuccess: vi.fn(),
}));
vi.mock('../../components/ui/ToastProvider', () => ({
  useToast: () => ({ error: mocks.error, success: vi.fn(), info: vi.fn() }),
}));
vi.mock('./components/CompilingAnimation', () => ({
  CompilingAnimation: () => <p>Review in progress</p>,
}));

vi.mock('../../services/ClinicalIntakeDraft', () => ({
  clinicalDraftKey: (id: string) => 'test-draft:' + id,
  loadClinicalIntakeDraft: vi.fn(async () => null),
  saveClinicalIntakeDraft: vi.fn(async () => undefined),
}));
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.session.mockResolvedValue({ user: { id: 'user' } });
  mocks.save.mockImplementation(({ report }: any) => ({
    ...mocks.cases[0],
    reviews: [
      { report: { ...report, sourceFingerprint: clinicalSourceFingerprint(mocks.cases[0]) } },
    ],
  }));
});
afterEach(cleanup);
const open = async (step = 1) => {
  render(
    <MemoryRouter initialEntries={['/app/consult?caseId=existing&review=new']}>
      <JarvisInvestigator />
    </MemoryRouter>
  );
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'Save & Exit' }) as HTMLButtonElement).disabled
    ).toBe(false)
  );
  const next = [
    /Next: Timeline/,
    /Next: Pattern/,
    /Next: Tell Your Story/,
    /Next: Add Evidence/,
    /Next: Scope & Run/,
  ];
  for (let i = 1; i < step; i++) fireEvent.click(screen.getByRole('button', { name: next[i - 1] }));
};
describe('Clinical Review case continuity', () => {
  it('includes selected evidence and saves the result into the same case', async () => {
    mocks.run.mockResolvedValue(
      normalizeClinicalReview(
        {
          executiveSummary: 'Review summary',
          primaryHypothesis: 'Reported concern',
          questionsForClinician: ['What history is missing?'],
        },
        null,
        undefined,
        {
          evidence: [
            {
              id: 'current_intake',
              fact: 'My actual symptom history',
              source: 'Patient intake',
              category: 'user_report',
            },
          ],
        }
      )
    );
    await open(6);
    fireEvent.click(screen.getByRole('button', { name: 'Review and save to My Cases' }));
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith(
        expect.objectContaining({ caseId: 'existing', type: 'jarvis' })
      )
    );
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.run.mock.calls[0][0]).toBe('My actual symptom history');
    expect(mocks.run.mock.calls[0][3]).toStrictEqual(mocks.cases[0]);
    expect(screen.getByRole('heading', { name: 'Your record review is ready' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Review summary' })).toBeTruthy();
    expect(screen.queryByText('Clinical dossier')).toBeNull();
    expect(screen.queryByText(/Layer 1/i)).toBeNull();
  }, 15000);
  it('keeps the input and case selection after a failed review', async () => {
    mocks.run.mockResolvedValue(null);
    await open(6);
    fireEvent.click(screen.getByRole('button', { name: 'Review and save to My Cases' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.getByRole('region', { name: 'Review input summary' }).textContent).toContain(
      'My actual symptom history'
    );
    expect(
      (screen.getByRole('button', { name: 'Review and save to My Cases' }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('awaits authentication and never invokes AI for a missing session', async () => {
    mocks.session.mockResolvedValue(null);
    await open(6);
    fireEvent.click(screen.getByRole('button', { name: 'Review and save to My Cases' }));
    await waitFor(() => expect(mocks.session).toHaveBeenCalled());
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it('navigates seamlessly across the 6 visual onboarding steps and supports onset chips', async () => {
    await open();
    // Step 1: Advance to Step 2 (Timeline)
    fireEvent.click(screen.getByRole('button', { name: /Next: Timeline/i }));
    expect(screen.getByRole('heading', { name: 'When did you first notice this?' })).toBeTruthy();

    // Step 2: Click an onset chip
    fireEvent.click(screen.getByRole('button', { name: 'Past few days' }));

    // Advance to Step 3 (Pattern)
    fireEvent.click(screen.getByRole('button', { name: /Next: Pattern/i }));
    expect(screen.getByRole('heading', { name: 'How is the symptom behaving?' })).toBeTruthy();

    // Advance to Step 4 (Story)
    fireEvent.click(screen.getByRole('button', { name: /Next: Tell Your Story/i }));
    expect(
      screen.getByRole('heading', { name: 'Describe what you are experiencing' })
    ).toBeTruthy();
    const textarea = screen.getByRole('textbox', {
      name: 'Clinical timeline and symptom notes',
    }) as HTMLTextAreaElement;
    expect(textarea.value).toContain('Onset: Past few days.');

    // Advance to Step 5 (Evidence)
    fireEvent.click(screen.getByRole('button', { name: /Next: Add Evidence/i }));
    expect(screen.getByRole('heading', { name: 'Lab Reports & Medical Evidence' })).toBeTruthy();

    // Advance to Step 6 (Launchpad)
    fireEvent.click(screen.getByRole('button', { name: /Next: Scope & Run/i }));
    expect(screen.getByRole('heading', { name: 'Review Scope & Launchpad' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Review input summary' }).textContent).toContain(
      'Onset: Past few days.'
    );
    expect(
      screen.getByRole('combobox', { name: 'Where should this review be saved?' })
    ).toBeTruthy();

    // Navigate back to Step 5 (Evidence)
    fireEvent.click(screen.getByRole('button', { name: '← Back to Evidence' }));
    expect(screen.getByRole('heading', { name: 'Lab Reports & Medical Evidence' })).toBeTruthy();
  }, 15000);

  it('allows adding custom symptoms and filtering categories properly', async () => {
    await open();
    // Verify clinical symptom cloud renders
    expect(screen.getByRole('button', { name: 'Fatigue' })).toBeTruthy();

    // Type a custom symptom in the search box
    const searchInput = screen.getByRole('textbox', { name: 'Search or add symptom' });
    fireEvent.change(searchInput, { target: { value: 'Sudden left ear fullness' } });

    // Click add custom symptom button
    fireEvent.click(screen.getAllByRole('button', { name: /Add "Sudden left ear/i })[0]);

    // Verify it is added to selected symptoms shelf
    expect(screen.getByText('1 SELECTED')).toBeTruthy();
    expect(screen.getAllByText('Sudden left ear fullness').length).toBeGreaterThanOrEqual(1);

    // Advance to Step 4 (Story notes) and check it was appended into history
    fireEvent.click(screen.getByRole('button', { name: /Continue with 1 symptom/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next: Pattern/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next: Tell Your Story/i }));
    const textarea = screen.getByRole('textbox', {
      name: 'Clinical timeline and symptom notes',
    }) as HTMLTextAreaElement;
    expect(textarea.value).toContain('Primary symptoms: Sudden left ear fullness.');
  }, 15000);

  it('searches symptoms using clinical synonym aliases', async () => {
    await open();
    const searchInput = screen.getByRole('textbox', { name: 'Search or add symptom' });
    // Search by alias 'migraine'
    fireEvent.change(searchInput, { target: { value: 'migraine' } });
    expect(screen.getByRole('button', { name: 'Headache' })).toBeTruthy();

    // Search by alias 'dysphagia'
    fireEvent.change(searchInput, { target: { value: 'dysphagia' } });
    expect(screen.getByRole('button', { name: 'Difficulty Swallowing' })).toBeTruthy();
  });
});
