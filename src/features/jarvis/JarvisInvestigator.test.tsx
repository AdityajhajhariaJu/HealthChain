// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import JarvisInvestigator from './JarvisInvestigator';

const mocks = vi.hoisted(() => ({ run: vi.fn(), create: vi.fn(), save: vi.fn(), error: vi.fn(), session: vi.fn(), cases: [{ id: 'existing', title: 'My ongoing concern', status: 'active', intakeData: { chiefComplaint: 'My actual symptom history' }, medicalRecords: [], reviews: [], events: [], currentSummary: {} }] }));
vi.mock('../../services/geminiService', () => ({ runJarvisInvestigation: mocks.run }));
vi.mock('../../services/CaseEngine', () => ({ getCase: (id: string) => mocks.cases.find(c => c.id === id), getCases: () => mocks.cases, getActiveCase: () => null, getActiveCaseId: () => null, setActiveCase: vi.fn(), createCaseDraft: mocks.create, saveReviewSnapshot: mocks.save }));
vi.mock('../../hooks/useCaseWorkspace', () => ({ useCaseWorkspace: () => mocks.cases }));
vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => false }));
vi.mock('../../services/ProfileEngine', () => ({ getProfile: () => ({ isPro: true }), getProfileKey: () => 'test-profile', getProfileEngineState: () => ({ activeId: 'profile_1' }) }));
vi.mock('../../services/authSession', () => ({ getActiveSession: mocks.session }));
vi.mock('../../services/TrialEngine', () => ({ openTrialModal: vi.fn() }));
vi.mock('../../services/HealthMemory', () => ({ recordHealthMemory: vi.fn(), getHealthMemory: vi.fn(() => []) }));
vi.mock('../../services/VitalityPointsEngine', () => ({ awardPoints: vi.fn() }));
vi.mock('../../services/haptics', () => ({ triggerHapticSelection: vi.fn(), triggerHapticLight: vi.fn(), triggerHapticSuccess: vi.fn() }));
vi.mock('../../components/ui/ToastProvider', () => ({ useToast: () => ({ error: mocks.error, success: vi.fn() }) }));
vi.mock('../../components/ui/CompilingAnimation', () => ({ CompilingAnimation: () => <p>Review in progress</p> }));

beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); mocks.session.mockResolvedValue({ user: { id: 'user' } }); });
afterEach(cleanup);
const open = (step = 1) => render(<MemoryRouter initialEntries={[`/app/consult?caseId=existing&review=new${step > 1 ? `&step=${step}` : ''}`]}><JarvisInvestigator /></MemoryRouter>);
describe('Clinical Review case continuity', () => {
  it('includes selected evidence and saves the result into the same case', async () => {
    mocks.run.mockResolvedValue({ executiveSummary: 'Review summary', primaryHypothesis: 'Reported concern', questionsForClinician: ['What history is missing?'] });
    open(6);
    fireEvent.click(screen.getByRole('button', { name: 'Review and save to My Cases' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'existing', type: 'jarvis' })));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.run.mock.calls[0][0]).toBe('My actual symptom history');
    expect(mocks.run.mock.calls[0][3]).toBe(mocks.cases[0]);
    expect(screen.getByRole('heading', { name: 'Your record review is ready' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Review summary' })).toBeTruthy();
    expect(screen.queryByText('Clinical dossier')).toBeNull();
    expect(screen.queryByText(/Layer 1/i)).toBeNull();
  }, 15000);
  it('keeps the input and case selection after a failed review', async () => {
    mocks.run.mockResolvedValue(null);
    open(6);
    fireEvent.click(screen.getByRole('button', { name: 'Review and save to My Cases' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect((screen.getByRole('textbox', { name: 'Clinical timeline and symptom notes' }) as HTMLTextAreaElement).value).toBe('My actual symptom history');
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('awaits authentication and never invokes AI for a missing session', async () => {
    mocks.session.mockResolvedValue(null);
    open(6);
    fireEvent.click(screen.getByRole('button', { name: 'Review and save to My Cases' }));
    await waitFor(() => expect(mocks.session).toHaveBeenCalled());
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it('navigates seamlessly across the 6 visual onboarding steps and supports onset chips', async () => {
    open();
    // Step 1: Advance to Step 2 (Timeline)
    fireEvent.click(screen.getByRole('button', { name: 'Next: Timeline (Step 2)' }));
    expect(screen.getByRole('heading', { name: 'When did you first notice this?' })).toBeTruthy();

    // Step 2: Click an onset chip
    fireEvent.click(screen.getByRole('button', { name: 'Past few days' }));

    // Advance to Step 3 (Pattern)
    fireEvent.click(screen.getByRole('button', { name: 'Next: Pattern (Step 3)' }));
    expect(screen.getByRole('heading', { name: 'How is the symptom behaving?' })).toBeTruthy();

    // Advance to Step 4 (Story)
    fireEvent.click(screen.getByRole('button', { name: 'Next: Tell Your Story (Step 4)' }));
    expect(screen.getByRole('heading', { name: 'Describe what you are experiencing' })).toBeTruthy();
    const textarea = screen.getByRole('textbox', { name: 'Clinical timeline and symptom notes' }) as HTMLTextAreaElement;
    expect(textarea.value).toContain('Onset: Past few days.');

    // Advance to Step 5 (Evidence)
    fireEvent.click(screen.getByRole('button', { name: 'Next: Add Evidence (Step 5)' }));
    expect(screen.getByRole('heading', { name: 'Lab Reports & Medical Evidence' })).toBeTruthy();

    // Advance to Step 6 (Launchpad)
    fireEvent.click(screen.getByRole('button', { name: 'Next: Scope & Run (Step 6)' }));
    expect(screen.getByRole('heading', { name: 'Review Scope & Launchpad' })).toBeTruthy();
    expect(screen.getByText('Evidence Readiness Checklist')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Where should this review be saved?' })).toBeTruthy();

    // Navigate back to Step 5 (Evidence)
    fireEvent.click(screen.getByRole('button', { name: '← Back to Evidence' }));
    expect(screen.getByRole('heading', { name: 'Lab Reports & Medical Evidence' })).toBeTruthy();
  });

  it('allows adding custom symptoms and filtering categories properly', async () => {
    open();
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
    fireEvent.click(screen.getByRole('button', { name: 'Next: Pattern (Step 3)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Tell Your Story (Step 4)' }));
    const textarea = screen.getByRole('textbox', { name: 'Clinical timeline and symptom notes' }) as HTMLTextAreaElement;
    expect(textarea.value).toContain('Primary symptoms: Sudden left ear fullness.');
  });

  it('searches symptoms using clinical synonym aliases', () => {
    open();
    const searchInput = screen.getByRole('textbox', { name: 'Search or add symptom' });
    // Search by alias 'migraine'
    fireEvent.change(searchInput, { target: { value: 'migraine' } });
    expect(screen.getByRole('button', { name: 'Headache' })).toBeTruthy();
    
    // Search by alias 'dysphagia'
    fireEvent.change(searchInput, { target: { value: 'dysphagia' } });
    expect(screen.getByRole('button', { name: 'Difficulty Swallowing' })).toBeTruthy();
  });
});
