// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import DDxBoard from './DDxBoard';

const model = vi.hoisted(() => ({ generate: vi.fn(), save: vi.fn() }));
vi.mock('../../services/geminiService', () => ({ generateCaseConnectionMap: model.generate }));
vi.mock('../../services/CaseEngine', () => ({ updateCaseConnectionMap: model.save }));
vi.mock('../../services/VitalityPointsEngine', () => ({ awardPoints: vi.fn() }));
vi.mock('../../services/haptics', () => ({
  triggerHapticLight: vi.fn(),
  triggerHapticSuccess: vi.fn(),
}));
vi.mock('../../services/RunContext', () => ({ getRunScope: () => 'synthetic-map-run' }));
vi.mock('../../components/ui/ToastProvider', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock('../../components/ui/CaseConnectionMap', () => ({
  CaseConnectionMap: () => <div>Saved map</div>,
}));
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
});

it('finishes an async map request after Strict Mode replays mount effects', async () => {
  let finish!: (value: unknown) => void;
  model.generate.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  render(
    <StrictMode>
      <MemoryRouter>
        <DDxBoard
          item={
            {
              id: 'synthetic-case',
              title: 'Synthetic',
              currentSummary: { topDiagnoses: [{ condition: 'Uncertain consideration' }] },
              reviews: [],
            } as any
          }
        />
      </MemoryRouter>
    </StrictMode>
  );
  expect(screen.getByText('Mapping case connections...')).toBeDefined();
  await act(async () => finish(null));
  await waitFor(() => expect(screen.queryByText('Mapping case connections...')).toBeNull());
  expect(screen.getByRole('button', { name: /Generate Connection Map/ })).toBeDefined();
  expect(model.generate).toHaveBeenCalledTimes(1);
});
