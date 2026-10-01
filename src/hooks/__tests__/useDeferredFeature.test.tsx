// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useDeferredFeature } from '../useDeferredFeature';

afterEach(cleanup);

it('defers initialization, preserves a closed draft, and releases it when the parent leaves', () => {
  const initialize = vi.fn();
  function Tool({ open }: { open: boolean }) {
    const [draft, setDraft] = useState('');
    useEffect(() => {
      initialize();
    }, []);
    return open ? (
      <input
        aria-label="Tool draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    ) : null;
  }
  function Parent({ open }: { open: boolean }) {
    const loaded = useDeferredFeature(open);
    return loaded ? <Tool open={open} /> : null;
  }
  const view = render(<Parent open={false} />);
  expect(initialize).not.toHaveBeenCalled();
  view.rerender(<Parent open />);
  fireEvent.change(screen.getByLabelText('Tool draft'), {
    target: { value: 'My unfinished note' },
  });
  view.rerender(<Parent open={false} />);
  expect(screen.queryByLabelText('Tool draft')).toBeNull();
  view.rerender(<Parent open />);
  expect((screen.getByLabelText('Tool draft') as HTMLInputElement).value).toBe(
    'My unfinished note'
  );
  expect(initialize).toHaveBeenCalledTimes(1);
  view.unmount();
  render(<Parent open />);
  expect((screen.getByLabelText('Tool draft') as HTMLInputElement).value).toBe('');
});
