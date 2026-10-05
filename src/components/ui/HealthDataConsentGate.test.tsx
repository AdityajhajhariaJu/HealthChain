// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../services/DurableHealthStorage', () => ({ isOwnerErased: () => false }));
vi.mock('../../services/storage', () => ({
  getItemSync: (key: string) => localStorage.getItem(key),
  setItemSync: (key: string, value: string) => localStorage.setItem(key, value),
}));
import HealthDataConsentGate from './HealthDataConsentGate';
import { hasHealthDataConsent, healthDataChoice } from '../../services/HealthDataConsent';
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('hc_account', JSON.stringify({ id: 'owner-a' }));
});
afterEach(cleanup);
const show = (path = '/app/today') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <HealthDataConsentGate>
        <div>Workspace available</div>
      </HealthDataConsentGate>
    </MemoryRouter>
  );
it('requires a separate unchecked health consent before enabling cloud storage', () => {
  show();
  expect(screen.queryByText('Workspace available')).toBeNull();
  const allow = screen.getByRole('button', {
    name: 'Allow cloud health storage',
  }) as HTMLButtonElement;
  expect(allow.disabled).toBe(true);
  expect(hasHealthDataConsent()).toBe(false);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(allow);
  expect(screen.getByText('Workspace available')).toBeTruthy();
  expect(hasHealthDataConsent()).toBe(true);
});
it('keeps local organization available when cloud processing is declined', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Keep records on this device' }));
  expect(screen.getByText('Workspace available')).toBeTruthy();
  expect(healthDataChoice()).toBe(false);
});
it.each(['/privacy', '/delete-account'])('keeps %s accessible without permission', (path) => {
  show(path);
  expect(screen.getByText('Workspace available')).toBeTruthy();
  expect(hasHealthDataConsent()).toBe(false);
});
it('requires a fresh choice after the account changes', () => {
  show();
  fireEvent.click(screen.getByRole('checkbox'));
  localStorage.setItem('hc_account', JSON.stringify({ id: 'owner-b' }));
  fireEvent(window, new Event('hc_account_scope_changed'));
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  expect(hasHealthDataConsent()).toBe(false);
});
it('does not clear a checked choice for an ordinary same-account profile refresh', () => {
  show();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent(window, new Event('hc_profile_updated'));
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Allow cloud health storage' }));
  expect(hasHealthDataConsent()).toBe(true);
});
