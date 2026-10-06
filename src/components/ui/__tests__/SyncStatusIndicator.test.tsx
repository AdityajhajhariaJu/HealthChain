// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncStatusIndicator } from '../SyncStatusIndicator';
import { setHealthDataConsent } from '../../../services/HealthDataConsent';
const { pendingCount, retrySync } = vi.hoisted(() => ({ pendingCount: vi.fn(async () => 2), retrySync: vi.fn() }));
vi.mock('../../../services/SyncOutbox', () => ({
  getSyncStatus: async () => {
    const count = await pendingCount();
    return { pendingCount: count, state: count ? 'sync_pending' : 'synced' };
  },
  flushSyncOutbox: retrySync,
}));
vi.mock('../../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: 'account-a' } } },
      })),
    },
  },
}));

describe('aggregate account sync status', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('hc_account', JSON.stringify({ id: 'account-a' }));
    setHealthDataConsent(true);
    pendingCount.mockReset();
    retrySync.mockReset();
    pendingCount.mockResolvedValue(2);
  });
  afterEach(cleanup);

  it('does not report Synced when a ledger write finishes but profile saves remain', async () => {
    render(<SyncStatusIndicator />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Status: Sync pending (2)' })).toBeTruthy()
    );
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hc_sync_complete', { detail: { area: 'health_memory' } })
      );
    });
    expect(screen.getByRole('button', { name: 'Status: Sync pending (2)' })).toBeTruthy();
    expect(screen.queryByText('Synced')).toBeNull();
    pendingCount.mockResolvedValue(0);
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hc_sync_complete', { detail: { at: '2026-09-30T10:00:00Z' } })
      );
    });
    expect(screen.getByText('Synced')).toBeTruthy();
  });

  it('keeps a queued-save error visible when an unrelated ledger write succeeds', async () => {
    render(<SyncStatusIndicator />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Status: Sync pending (2)' })).toBeTruthy()
    );
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hc_sync_error', { detail: { message: 'Save failed' } })
      );
      window.dispatchEvent(
        new CustomEvent('hc_sync_complete', { detail: { area: 'health_memory' } })
      );
    });
    expect(
      screen.getByRole('button', { name: 'Status: Sync failed, retry available' })
    ).toBeTruthy();
  });

  it('does not claim cloud synchronization before permission is given', async () => {
    setHealthDataConsent(false);
    pendingCount.mockResolvedValue(0);
    render(<SyncStatusIndicator />);
    expect(screen.getByLabelText('Status: Saved on this device')).toBeTruthy();
    expect(screen.queryByText('Synced')).toBeNull();
    expect(pendingCount).not.toHaveBeenCalled();
  });

  it('shows device storage after withdrawal and ignores sync events until permission returns', async () => {
    render(<SyncStatusIndicator />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Status: Sync pending (2)' })).toBeTruthy());
    await act(async () => {
      setHealthDataConsent(false);
      for (const event of ['hc_sync_pending', 'hc_sync_complete', 'hc_sync_error', 'hc_sync_conflict'])
        window.dispatchEvent(new CustomEvent(event, { detail: { count: 2, message: 'Synthetic error' } }));
    });
    expect(screen.getByLabelText('Status: Saved on this device')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Status: Sync/ })).toBeNull();
    pendingCount.mockResolvedValue(0);
    await act(async () => { setHealthDataConsent(true); });
    await waitFor(() => expect(screen.getByText('Synced')).toBeTruthy());
  });

  it('does not let an in-flight status reply restore Synced after withdrawal', async () => {
    let finish!: (count: number) => void;
    pendingCount.mockImplementationOnce(() => new Promise<number>(resolve => { finish = resolve; }));
    render(<SyncStatusIndicator />);
    await waitFor(() => expect(pendingCount).toHaveBeenCalledOnce());
    await act(async () => {
      setHealthDataConsent(false);
      finish(0);
    });
    expect(screen.getByLabelText('Status: Saved on this device')).toBeTruthy();
    expect(screen.queryByText('Synced')).toBeNull();
  });

  it('resets the status when the next account has no health permission', async () => {
    pendingCount.mockResolvedValue(0);
    render(<SyncStatusIndicator />);
    await waitFor(() => expect(screen.getByText('Synced')).toBeTruthy());
    await act(async () => {
      localStorage.setItem('hc_account', JSON.stringify({ id: 'account-b' }));
      window.dispatchEvent(new Event('hc_account_scope_changed'));
    });
    expect(screen.getByLabelText('Status: Saved on this device')).toBeTruthy();
    expect(screen.queryByText('Synced')).toBeNull();
    expect(pendingCount).toHaveBeenCalledOnce();
  });

  it('keeps device storage visible when an earlier manual retry fails after withdrawal', async () => {
    let fail!: (reason: Error) => void;
    retrySync.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { fail = reject; }));
    render(<SyncStatusIndicator />);
    const button = await screen.findByRole('button', { name: 'Status: Sync pending (2)' });
    await act(async () => { button.click(); });
    expect(retrySync).toHaveBeenCalledOnce();
    await act(async () => {
      setHealthDataConsent(false);
      fail(new Error('Synthetic retry failure'));
    });
    expect(screen.getByLabelText('Status: Saved on this device')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Status: Sync failed, retry available' })).toBeNull();
  });
});
