// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './ToastProvider';

function Trigger() {
  const { info } = useToast();
  return <button onClick={() => info('Saved')}>Notify</button>;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('bounds notification timers and clears them on dismissal and unmount', () => {
  vi.useFakeTimers();
  const view = render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>
  );
  for (let index = 0; index < 20; index++) fireEvent.click(screen.getByText('Notify'));
  expect(screen.getAllByRole('button', { name: 'Dismiss notification' })).toHaveLength(4);
  const count = vi.getTimerCount();
  fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss notification' })[0]);
  expect(vi.getTimerCount()).toBe(count - 1);
  view.unmount();
  act(() => vi.runAllTimers());
  expect(vi.getTimerCount()).toBe(0);
});
