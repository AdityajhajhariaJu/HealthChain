// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ listener: undefined as any, unsubscribe: vi.fn() }));
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: any) => {
        auth.listener = callback;
        return { data: { subscription: { unsubscribe: auth.unsubscribe } } };
      },
    },
  },
}));
vi.mock('../../features/account/AccountLifecycle', () => ({
  default: () => <div>Account recovery active</div>,
}));
import AccountRuntime from './AccountRuntime';

beforeEach(() => {
  localStorage.clear();
  auth.unsubscribe.mockClear();
  auth.listener = undefined;
});
afterEach(cleanup);
const renderRuntime = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AccountRuntime />
    </MemoryRouter>
  );

it('keeps anonymous public pages free of account recovery, then activates after sign-in', async () => {
  const view = renderRuntime('/pricing');
  expect(screen.queryByText('Account recovery active')).toBeNull();
  await vi.waitFor(() => expect(auth.listener).toEqual(expect.any(Function)));
  await act(async () => {
    auth.listener('SIGNED_IN', { user: { id: 'synthetic' } });
  });
  expect(await screen.findByText('Account recovery active')).toBeTruthy();
  await act(async () => {
    auth.listener('SIGNED_OUT', null);
  });
  expect(screen.getByText('Account recovery active')).toBeTruthy();
  view.unmount();
  expect(auth.unsubscribe).toHaveBeenCalledOnce();
});

it('does not leave an auth subscription behind when unmounted before the client loads', async () => {
  const view = renderRuntime('/pricing');
  view.unmount();
  await vi.dynamicImportSettled();
  expect(auth.listener).toBeUndefined();
  expect(auth.unsubscribe).not.toHaveBeenCalled();
});

it('lets anonymous landing own auth detection and activates recovery when guest work begins', async () => {
  renderRuntime();
  await vi.dynamicImportSettled();
  expect(auth.listener).toBeUndefined();
  expect(screen.queryByText('Account recovery active')).toBeNull();
  await act(async () => {
    localStorage.setItem('hc_guest_mode', 'true');
    window.dispatchEvent(new Event('hc_profile_updated'));
  });
  expect(await screen.findByText('Account recovery active')).toBeTruthy();
  await vi.waitFor(() => expect(auth.listener).toEqual(expect.any(Function)));
});

it.each(['guest', 'erasure'])(
  'restores %s work even when the browser opens a public page',
  async (kind) => {
    localStorage.setItem(
      kind === 'guest' ? 'hc_guest_mode' : 'hc_erasure_pending_owners',
      kind === 'guest' ? 'true' : '["synthetic"]'
    );
    renderRuntime();
    expect(await screen.findByText('Account recovery active')).toBeTruthy();
  }
);
