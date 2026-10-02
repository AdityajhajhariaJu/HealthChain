// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
const transport = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('../ai/transport', () => ({
  API_URL: '/synthetic-model',
  fetchWithTimeout: transport.fetch,
  sha256Hash: vi.fn(),
}));
vi.mock('../profileScope', () => ({
  getActiveProfileScope: () => localStorage.getItem('synthetic-profile') || 'profile_1',
}));
import { simulatePathway } from '../ai/investigation';

beforeEach(() => {
  localStorage.clear();
  window.dispatchEvent(new Event('hc_logout'));
  transport.fetch
    .mockReset()
    .mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        timelineDescription: 'Discuss timing',
                        risks: ['Review supplied context'],
                        milestones: [],
                        alternative: 'Ask your clinician',
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 }
        )
    );
});

it('reuses unchanged guides and re-evaluates changed records, profiles and owners', async () => {
  const topic = { id: 'same-topic', title: 'Discuss recorded symptom timing' };
  const profile = {
    demographics: { age: 42, gender: 'female' },
    conditions: ['Recorded condition'],
    medications: [{ name: 'Recorded medicine' }],
    allergies: ['Recorded allergy'],
  };
  localStorage.setItem('hc_account', JSON.stringify({ id: 'owner-a' }));
  await simulatePathway(topic, profile);
  await simulatePathway(topic, profile);
  expect(transport.fetch).toHaveBeenCalledTimes(1);
  const request = JSON.parse(transport.fetch.mock.calls[0][1].body).contents[0].parts[0].text;
  expect(request).toContain(topic.title);
  expect(request).toContain('Age 42');
  expect(request).toContain('Recorded medicine');
  expect(request).toContain('Recorded allergy');
  await simulatePathway(topic, { ...profile, conditions: ['Changed recorded condition'] });
  localStorage.setItem('synthetic-profile', 'profile_2');
  await simulatePathway(topic, profile);
  localStorage.setItem('hc_account', JSON.stringify({ id: 'owner-b' }));
  await simulatePathway(topic, profile);
  expect(transport.fetch).toHaveBeenCalledTimes(4);
  window.dispatchEvent(new Event('hc_logout'));
  await simulatePathway(topic, profile);
  expect(transport.fetch).toHaveBeenCalledTimes(5);
});
