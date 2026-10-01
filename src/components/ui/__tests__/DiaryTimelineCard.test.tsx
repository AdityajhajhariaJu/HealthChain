// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { DiaryTimelineCard } from '../DiaryTimelineCard';

const writes = vi.hoisted(() => ({ meal: vi.fn(), checkin: vi.fn() }));
vi.mock('../../../services/ProfileEngine', () => ({
  addNutritionLog: writes.meal,
  recordDailyCheckin: writes.checkin,
}));
vi.mock('../../../services/haptics', () => ({ triggerHapticLight: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
test('viewing, rerendering and opening saved diary records never creates observations', () => {
  const open = vi.fn();
  const entries = [
    {
      time: 'Time not recorded',
      category: 'Breakfast',
      items: ['Coffee', 'Headache-shaped biscuit'],
    },
  ];
  const view = render(
    <StrictMode>
      <DiaryTimelineCard entries={entries} onOpenRiver={open} />
    </StrictMode>
  );
  view.rerender(
    <StrictMode>
      <DiaryTimelineCard entries={[...entries]} onOpenRiver={open} />
    </StrictMode>
  );
  fireEvent.click(screen.getByRole('button', { name: /View Health River/ }));
  expect(open).toHaveBeenCalledTimes(1);
  expect(writes.meal).not.toHaveBeenCalled();
  expect(writes.checkin).not.toHaveBeenCalled();
  expect(screen.queryByText(/Synced/)).toBeNull();
  expect(screen.getByText('Breakfast')).toBeTruthy();
});
