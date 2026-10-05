// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ insert: vi.fn(), session: vi.fn(), success: vi.fn(), error: vi.fn(), award: vi.fn() }));
vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => false }));
vi.mock('../../services/haptics', () => ({ triggerHapticLight: vi.fn(), triggerHapticSuccess: vi.fn() }));
vi.mock('../../services/VitalityPointsEngine', () => ({ awardPoints: m.award }));
vi.mock('./ToastProvider', () => ({ useToast: () => ({ success: m.success, error: m.error }) }));
vi.mock('../../services/DurableHealthStorage', () => ({ isOwnerErased: () => false }));
vi.mock('../../services/supabaseClient', () => ({ supabase: { auth: { getSession: m.session }, from: () => ({ insert: m.insert }) } }));
import FeedbackWidget from './FeedbackWidget';
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); localStorage.setItem('hc_guest_mode', 'true');
  m.session.mockResolvedValue({ data: { session: null } });
  m.insert.mockResolvedValue({ error: null });
  render(<MemoryRouter initialEntries={['/app/profile']}><FeedbackWidget /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Feedback message' }), { target: { value: 'Fictional report of an offensive answer' } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('preserves a failed report and never announces success or logs the provider payload', async () => {
  m.insert.mockResolvedValue({ error: { message: 'synthetic-private-provider-detail' } });
  const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
  fireEvent.click(screen.getByRole('button', { name: 'Submit feedback to HealthChain' }));
  await waitFor(() => expect(m.error).toHaveBeenCalled());
  expect((screen.getByRole('textbox', { name: 'Feedback message' }) as HTMLTextAreaElement).value).toContain('Fictional report');
  expect(m.success).not.toHaveBeenCalled(); expect(m.award).not.toHaveBeenCalled();
  expect(log.mock.calls).toEqual([['Feedback submission unavailable.']]);
});
it('announces success and awards points only after the report is saved', async () => {
  let complete: (value: { error: null }) => void = () => {};
  m.insert.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit feedback to HealthChain' }));
  await waitFor(() => expect(m.insert).toHaveBeenCalledTimes(1));
  expect(m.success).not.toHaveBeenCalled(); expect(m.award).not.toHaveBeenCalled();
  complete({ error: null });
  await waitFor(() => expect(m.success).toHaveBeenCalledTimes(1));
  expect(m.award).toHaveBeenCalledTimes(1);
});
