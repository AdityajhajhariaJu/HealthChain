// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getGutSnapshot } from '../../../services/GutHealthSummary';
import { GutDailyHome } from './GutDailyHome';

const state = vi.hoisted(() => ({ createObservation: vi.fn() }));
vi.mock('../../../services/HealthObservationService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/HealthObservationService')>()),
  captureObservationScope: vi.fn(async () => ({ ownerId: 'guest', profileId: 'default' })),
  createObservation: state.createObservation,
}));

beforeEach(() => {
  state.createObservation.mockReset();
  localStorage.clear();
  localStorage.setItem('hc_guest_mode', 'true');
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

it('keeps capture and navigation locked while saving, then preserves text after a failed write', async () => {
  let finish!: (value: { ok: false; error: string; details: string[] }) => void;
  state.createObservation.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  render(
    <GutDailyHome
      snapshot={getGutSnapshot()}
      observations={[]}
      onOpenRecords={vi.fn()}
      onOpenVisit={vi.fn()}
      onRefresh={vi.fn(async () => {})}
    />
  );
  const input = screen.getByRole('textbox', {
    name: 'Describe a meal or how you felt',
  }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'Evening bloating' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save & see my understanding' }));
  await waitFor(() => expect(state.createObservation).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('group', { name: 'Gut entry' }).getAttribute('aria-busy')).toBe('true');
  expect(input.matches(':disabled')).toBe(true);
  expect(screen.getByRole('tab', { name: 'Meal' }).matches(':disabled')).toBe(true);
  expect(screen.getByRole('button', { name: 'Log' }).matches(':disabled')).toBe(true);
  expect(screen.getByRole('button', { name: 'History' }).matches(':disabled')).toBe(true);
  expect(screen.getByRole('status').textContent).toBe('Saving your entry…');

  await act(async () =>
    finish({ ok: false, error: 'STORAGE_FAILED', details: ['Storage is unavailable.'] })
  );
  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toBe('Storage is unavailable.')
  );
  expect(input.value).toBe('Evening bloating');
  expect(input.matches(':disabled')).toBe(false);
  expect(screen.getByRole('tab', { name: 'Meal' }).matches(':disabled')).toBe(false);
  expect(screen.getByRole('button', { name: 'Log' }).matches(':disabled')).toBe(false);
  expect(screen.getByRole('button', { name: 'History' }).matches(':disabled')).toBe(false);
  expect(
    screen.getByRole('button', { name: 'Save & see my understanding' }).matches(':disabled')
  ).toBe(false);
  expect(state.createObservation.mock.calls[0][0].payload).toEqual({
    kind: 'symptom',
    symptom: 'Evening bloating',
  });
});
