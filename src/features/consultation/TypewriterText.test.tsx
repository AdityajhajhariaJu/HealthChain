// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { TypewriterText } from './TypewriterText';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('cancels a previous reply when its content changes and completes the replacement once', async () => {
  vi.useFakeTimers();
  const complete = vi.fn();
  const view = render(
    <StrictMode>
      <TypewriterText
        content="An older and much longer reply that must never finish"
        onComplete={complete}
      />
    </StrictMode>
  );
  await act(() => vi.advanceTimersByTimeAsync(20));
  view.rerender(
    <StrictMode>
      <TypewriterText content="New reply" onComplete={complete} />
    </StrictMode>
  );
  await act(() => vi.runAllTimersAsync());
  expect(screen.getByText('New reply')).toBeDefined();
  expect(complete).toHaveBeenCalledTimes(1);
});
