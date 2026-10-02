import { expect, it, vi } from 'vitest';
import { createCoalescedTask } from '../CoalescedTask';

it('scans once for a synchronous burst, then reads changes made during that scan', async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const scan = vi.fn().mockReturnValueOnce(held).mockResolvedValue(undefined);
  const request = createCoalescedTask(scan);
  const first = request();
  for (let i = 0; i < 100; i++) expect(request()).toBe(first);
  await Promise.resolve();
  expect(scan).toHaveBeenCalledTimes(1);
  for (let i = 0; i < 100; i++) expect(request()).toBe(first);
  release();
  await first;
  expect(scan).toHaveBeenCalledTimes(2);
  await request();
  expect(scan).toHaveBeenCalledTimes(3);
});

it('allows a failed scan to be retried without an overlapping worker', async () => {
  const scan = vi
    .fn()
    .mockRejectedValueOnce(new Error('storage unavailable'))
    .mockResolvedValue(undefined);
  const request = createCoalescedTask(scan);
  await expect(request()).rejects.toThrow('storage unavailable');
  await request();
  expect(scan).toHaveBeenCalledTimes(2);
});
