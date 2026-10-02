import { expect, it } from 'vitest';
import { SessionBootstrapGate } from '../SessionBootstrapGate';

it('initializes once per account epoch, and reinitializes after logout or an account switch', () => {
  const gate = new SessionBootstrapGate();
  expect(gate.begin('account-a:1')).toBe(true);
  for (let i = 0; i < 100; i++) expect(gate.begin('account-a:1')).toBe(false);
  expect(gate.begin('account-b:2')).toBe(true);
  expect(gate.begin('account-a:3')).toBe(true);
  gate.reset();
  expect(gate.begin('account-a:3')).toBe(true);
});
