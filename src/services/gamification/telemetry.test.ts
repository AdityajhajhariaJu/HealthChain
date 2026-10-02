// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import {
  flushActivityTelemetry,
  getActivityTelemetry,
  installActivityTelemetry,
  observeActivity,
} from './telemetry';
it('bounds operational metadata and records no user payloads or query strings', () => {
  localStorage.setItem('hc_guest_mode', 'true');
  for (let i = 0; i < 250; i++) observeActivity(`api:operation${i}`, 'completed');
  const state = getActivityTelemetry();
  expect(state.recent).toHaveLength(60);
  expect(Object.keys(state.counts).length).toBeLessThanOrEqual(121);
  observeActivity('PRIVATE SYMPTOM?token=secret', 'completed');
  expect(JSON.stringify(getActivityTelemetry())).not.toContain('PRIVATE');
  flushActivityTelemetry();
  localStorage.setItem('hc_unified_profile_guest', JSON.stringify({ activeId: 'fresh-profile' }));
});
it('observes successful and failed fetches without consuming bodies or leaking between owners', async () => {
  localStorage.setItem('hc_guest_mode', 'true');
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('original body', { status: 200 }))
    .mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError'));
  const native = window.fetch;
  window.fetch = fetchMock;
  installActivityTelemetry();
  const response = await window.fetch('/api/gemini?token=SECRET', {
    method: 'POST',
    body: 'PRIVATE PROMPT',
  });
  expect(await response.text()).toBe('original body');
  await expect(window.fetch('/api/gemini')).rejects.toMatchObject({ name: 'AbortError' });
  expect(getActivityTelemetry().counts['api:/api/gemini']).toMatchObject({
    completed: 1,
    failed: 1,
  });
  expect(JSON.stringify(getActivityTelemetry())).not.toMatch(/SECRET|PRIVATE PROMPT|original body/);
  let finish!: (value: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const delayed = window.fetch('/api/gemini');
  localStorage.removeItem('hc_guest_mode');
  localStorage.setItem('hc_account', JSON.stringify({ id: 'another-owner' }));
  finish(new Response('ok'));
  await delayed;
  expect(getActivityTelemetry().counts['api:/api/gemini']).toBeUndefined();
  window.fetch = native;
  flushActivityTelemetry();
});
