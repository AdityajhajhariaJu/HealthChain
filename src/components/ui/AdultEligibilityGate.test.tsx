// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../services/DurableHealthStorage', () => ({ isOwnerErased: () => false }));
vi.mock('../../services/storage', () => ({ getItemSync: (key: string) => localStorage.getItem(key),
  setItemSync: (key: string, value: string) => localStorage.setItem(key, value) }));
import AdultEligibilityGate from './AdultEligibilityGate';
beforeEach(() => { localStorage.clear(); localStorage.setItem('hc_guest_mode', 'true'); });
afterEach(cleanup);
const show = (path = '/app/today') => render(<MemoryRouter initialEntries={[path]}>
  <AdultEligibilityGate><div>Workspace mounted</div></AdultEligibilityGate>
</MemoryRouter>);
it('does not mount workspace features until an explicit adult confirmation', () => {
  show();
  expect(screen.queryByText('Workspace mounted')).toBeNull();
  expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByText('Workspace mounted')).toBeTruthy();
  expect(JSON.parse(localStorage.getItem('hc_adult_eligibility_guest')!)).toMatchObject({ minimumAge: 18, confirmed: true });
});
it('keeps privacy and account deletion information accessible without confirmation', () => {
  show('/delete-account'); expect(screen.getByText('Workspace mounted')).toBeTruthy();
});
it('does not apply a guest confirmation to another signed-in account', () => {
  show(); fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  localStorage.removeItem('hc_guest_mode'); localStorage.setItem('hc_account', JSON.stringify({ id: 'new-owner' }));
  fireEvent(window, new Event('hc_account_scope_changed'));
  expect(screen.queryByText('Workspace mounted')).toBeNull();
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
});
