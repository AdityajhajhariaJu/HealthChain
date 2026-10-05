// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ load: vi.fn(), buy: vi.fn(), restore: vi.fn(), manage: vi.fn() }));
vi.mock('../../services/StorePurchases', () => ({ loadStoreProducts: m.load, buyStorePlan: m.buy,
  restoreStorePurchases: m.restore, manageStoreSubscription: m.manage,
  productForPlan: (products: any[], plan: string) => products.find(p => p.identifier === (plan === 'pro_30_days' ? 'monthly' : 'quarterly')),
}));
vi.mock('../../components/ui/ToastProvider', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
import NativePricing from './NativePricing';
beforeEach(() => { vi.resetAllMocks(); m.load.mockResolvedValue({ products: [{ identifier: 'monthly', priceString: '$4.99' }], activeSubscription: false }); m.buy.mockResolvedValue({ success: true, message: 'Confirmed' }); });
afterEach(cleanup);
it('shows localized recurring price and keeps missing products disabled', async () => {
  render(<MemoryRouter><NativePricing /></MemoryRouter>);
  const buy = await screen.findByRole('button', { name: 'Subscribe · $4.99' });
  expect(buy.hasAttribute('disabled')).toBe(false); expect(screen.getByRole('button', { name: 'Subscribe' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByText(/renew automatically/)).toBeTruthy(); expect(screen.queryByText(/₹/)).toBeNull();
  fireEvent.click(buy); expect(m.buy).toHaveBeenCalledWith('pro_30_days');
});
it('provides restore and management and blocks another subscription on an active account', async () => {
  m.load.mockResolvedValue({ products: [{ identifier: 'monthly', priceString: '$4.99' }], activeSubscription: true });
  m.restore.mockResolvedValue({ success: true, message: 'Restored' }); m.manage.mockResolvedValue(undefined);
  render(<MemoryRouter><NativePricing /></MemoryRouter>);
  expect((await screen.findByRole('button', { name: 'Subscribe · $4.99' })).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Manage subscription' })); expect(m.manage).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Restore purchases' })); expect(m.restore).toHaveBeenCalled();
});
