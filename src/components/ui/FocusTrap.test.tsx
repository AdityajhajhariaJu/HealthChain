// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import FocusTrap from './FocusTrap';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('keeps focus in an edited field across form rerenders and uses the latest Escape handler', () => {
  vi.useFakeTimers();
  const closed = vi.fn();
  function Form() {
    const [value, setValue] = useState('');
    return (
      <FocusTrap onEscape={() => closed(value)}>
        <button type="button">Close form</button>
        <input
          aria-label="Editable note"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </FocusTrap>
    );
  }
  render(<Form />);
  act(() => vi.advanceTimersByTime(50));
  const input = screen.getByLabelText('Editable note');
  input.focus();
  fireEvent.change(input, { target: { value: 'An exact user note' } });
  expect(document.activeElement).toBe(input);
  act(() => vi.advanceTimersByTime(100));
  expect(document.activeElement).toBe(input);
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(closed).toHaveBeenCalledWith('An exact user note');
});

it('does not steal early input focus and restores the original trigger on close', () => {
  vi.useFakeTimers();
  const trigger = document.createElement('button');
  document.body.append(trigger);
  trigger.focus();
  const view = render(
    <FocusTrap onEscape={() => {}}>
      <button type="button">Close form</button>
      <input aria-label="Early note" />
    </FocusTrap>
  );
  const input = screen.getByLabelText('Early note');
  input.focus();
  act(() => vi.advanceTimersByTime(50));
  expect(document.activeElement).toBe(input);
  view.unmount();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});
