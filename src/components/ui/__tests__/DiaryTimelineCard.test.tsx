// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

const writes = vi.hoisted(() => ({ meal: vi.fn(), checkin: vi.fn() }));
vi.mock('../../../services/ProfileEngine', () => ({ addNutritionLog: writes.meal, recordDailyCheckin: writes.checkin }));
vi.mock('../../../services/haptics', () => ({ triggerHapticLight: vi.fn() }));
import { DiaryTimelineCard } from '../DiaryTimelineCard';

afterEach(() => { cleanup(); vi.clearAllMocks(); });
test('viewing, rerendering and opening saved diary records never creates observations', () => {
  const open = vi.fn();
  const entries = [{ time: 'Time not recorded', category: 'Breakfast', items: ['Coffee', 'Headache-shaped biscuit'] }];
  const view = render(<StrictMode><DiaryTimelineCard entries={entries} onOpenRiver={open} /></StrictMode>);
  view.rerender(<StrictMode><DiaryTimelineCard entries={[...entries]} onOpenRiver={open} /></StrictMode>);
  fireEvent.click(screen.getByRole('button', { name: /View Health River/ }));
  expect(open).toHaveBeenCalledTimes(1);
  expect(writes.meal).not.toHaveBeenCalled();
  expect(writes.checkin).not.toHaveBeenCalled();
  expect(screen.queryByText(/Synced/)).toBeNull();
  expect(screen.getByText('Breakfast')).toBeTruthy();
});
