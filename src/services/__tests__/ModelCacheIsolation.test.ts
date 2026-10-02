// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import { invalidateAccountScope } from '../AccountScope';
import { modelRequestKey, ModelResultCache } from '../ai/modelCache';

vi.mock('../profileScope', () => ({
  getActiveProfileScope: () => localStorage.getItem('synthetic-profile') || 'profile_1',
}));
beforeEach(() => localStorage.clear());

it('separates identical input across owners, selected profiles and logout epochs', () => {
  localStorage.setItem('hc_account', JSON.stringify({ id: 'owner-a' }));
  const first = modelRequestKey({ concern: 'synthetic input' });
  expect(modelRequestKey({ concern: 'synthetic input' })).toBe(first);
  localStorage.setItem('synthetic-profile', 'profile_2');
  expect(modelRequestKey({ concern: 'synthetic input' })).not.toBe(first);
  localStorage.removeItem('synthetic-profile');
  localStorage.setItem('hc_account', JSON.stringify({ id: 'owner-b' }));
  expect(modelRequestKey({ concern: 'synthetic input' })).not.toBe(first);
  localStorage.setItem('hc_account', JSON.stringify({ id: 'owner-a' }));
  invalidateAccountScope();
  expect(modelRequestKey({ concern: 'synthetic input' })).not.toBe(first);
});

it('evicts older memory entries without deleting saved reviews, and clears on logout', () => {
  const cache = new ModelResultCache(2);
  localStorage.setItem('hc_cases_owner-a', 'durable review');
  cache.set('old', {});
  cache.set('recent', {});
  cache.set('new', {});
  expect(cache.has('old')).toBe(false);
  expect(cache.has('recent')).toBe(true);
  window.dispatchEvent(new Event('hc_logout'));
  expect(cache.has('recent')).toBe(false);
  expect(localStorage.getItem('hc_cases_owner-a')).toBe('durable review');
});
