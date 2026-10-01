// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { pendingCount } = vi.hoisted(() => ({ pendingCount: vi.fn(async () => 2) }));
vi.mock('../../../services/SyncOutbox', () => ({ getSyncStatus: async () => { const count = await pendingCount(); return {pendingCount: count, state: count ? 'sync_pending' : 'synced'}; }, flushSyncOutbox: vi.fn() }));
vi.mock('../../../services/supabaseClient', () => ({ supabase: { auth: { getSession: vi.fn(async () => ({
  data: { session: { user: { id: 'account-a' } } },
})) } } }));
import { SyncStatusIndicator } from '../SyncStatusIndicator';

describe('aggregate account sync status', () => {
  beforeEach(() => { localStorage.setItem('hc_account', JSON.stringify({id:'account-a'})); pendingCount.mockResolvedValue(2); });
  afterEach(cleanup);

  it('does not report Synced when a ledger write finishes but profile saves remain', async () => {
    render(<SyncStatusIndicator />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Status: Sync pending (2)' })).toBeTruthy());
    await act(async () => { window.dispatchEvent(new CustomEvent('hc_sync_complete', { detail: { area: 'health_memory' } })); });
    expect(screen.getByRole('button', { name: 'Status: Sync pending (2)' })).toBeTruthy();
    expect(screen.queryByText('Synced')).toBeNull();
    pendingCount.mockResolvedValue(0);
    await act(async () => { window.dispatchEvent(new CustomEvent('hc_sync_complete', { detail: { at: '2026-09-30T10:00:00Z' } })); });
    expect(screen.getByText('Synced')).toBeTruthy();
  });

  it('keeps a queued-save error visible when an unrelated ledger write succeeds', async () => {
    render(<SyncStatusIndicator />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Status: Sync pending (2)' })).toBeTruthy());
    await act(async () => {
      window.dispatchEvent(new CustomEvent('hc_sync_error', { detail: { message: 'Save failed' } }));
      window.dispatchEvent(new CustomEvent('hc_sync_complete', { detail: { area: 'health_memory' } }));
    });
    expect(screen.getByRole('button', { name: 'Status: Sync failed, retry available' })).toBeTruthy();
  });
});
