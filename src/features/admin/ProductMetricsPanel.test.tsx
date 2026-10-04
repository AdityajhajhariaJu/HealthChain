// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('../../services/supabaseClient', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'synthetic-token' } } }) } } }));
import ProductMetricsPanel from './ProductMetricsPanel';
const fetcher = vi.fn();
const rows = [1, 2].map((hits, index) => ({ day: `2026-10-0${index + 1}`, event: 'audio_action', dimension: 'playing', platform: 'web', hits }));
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('hc_account', JSON.stringify({ id: 'synthetic-admin' }));
  fetcher.mockReset(); vi.stubGlobal('fetch', fetcher);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('combines daily counts without presenting them as users or revenue', async () => {
  fetcher.mockResolvedValue(new Response(JSON.stringify({ rows }), { status: 200 }));
  render(<ProductMetricsPanel />);
  await screen.findByRole('cell', { name: 'Audio · playing · web' });
  expect(screen.getByRole('cell', { name: /^3$/ })).toBeTruthy();
  expect(screen.getByText(/not unique users, individual histories or verified revenue/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Analytics period'), { target: { value: '7' } });
  await waitFor(() => expect(fetcher.mock.calls[fetcher.mock.calls.length - 1]?.[0]).toContain('?days=7'));
});
it('shows an access failure and supports a successful retry', async () => {
  fetcher.mockResolvedValueOnce(new Response('{}', { status: 403 }));
  render(<ProductMetricsPanel />);
  expect((await screen.findByRole('alert')).textContent).toContain('cannot view');
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ rows: [] }), { status: 200 }));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh counts' }));
  await screen.findByText('No optional measurement received in this period.');
  expect(screen.queryByRole('alert')).toBeNull();
});
it('does not display a previous administrator response after an account switch', async () => {
  let resolve!: (response: Response) => void;
  fetcher.mockImplementation(() => new Promise<Response>(done => { resolve = done; }));
  render(<ProductMetricsPanel />);
  await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  localStorage.setItem('hc_account', JSON.stringify({ id: 'different-account' }));
  resolve(new Response(JSON.stringify({ rows }), { status: 200 }));
  await screen.findByText('No optional measurement received in this period.');
  expect(screen.queryByRole('table')).toBeNull();
});
