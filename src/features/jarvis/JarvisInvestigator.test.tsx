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
const open = () => render(<MemoryRouter initialEntries={['/app/consult?caseId=existing&review=new']}><JarvisInvestigator /></MemoryRouter>);
describe('Clinical Data Engine case continuity', () => {
  it('includes selected evidence and saves the result into the same case', async () => {
    mocks.run.mockResolvedValue({ executiveSummary: 'Review summary', primaryHypothesis: 'Reported concern', questionsForClinician: ['What history is missing?'] });
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Review and save to My Cases' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'existing', type: 'jarvis' })));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.run.mock.calls[0][0]).toContain('Selected case evidence');
    expect(screen.getByRole('heading', { name: 'Your record review is ready' })).toBeTruthy();
  });
  it('keeps the input and case selection after a failed review', async () => {
    mocks.run.mockResolvedValue(null);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Review and save to My Cases' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect((screen.getByRole('textbox', { name: 'Clinical timeline and symptom notes' }) as HTMLTextAreaElement).value).toBe('My actual symptom history');
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('awaits authentication and never invokes AI for a missing session', async () => {
    mocks.session.mockResolvedValue(null);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Review and save to My Cases' }));
    await waitFor(() => expect(mocks.session).toHaveBeenCalled());
    expect(mocks.run).not.toHaveBeenCalled();
  });
});
