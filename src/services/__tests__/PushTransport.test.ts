import { generateKeyPairSync } from 'node:crypto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
beforeEach(() => vi.resetModules()); afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('uses authenticated FCM v1, sends a generic preview and returns provider acceptance without health facts', async () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  vi.stubEnv('FCM_SERVICE_ACCOUNT_JSON', JSON.stringify({ project_id: 'synthetic-project', client_email: 'synthetic@example.invalid', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }));
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'synthetic-oauth', expires_in: 3600 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'projects/synthetic-project/messages/synthetic' }) }); vi.stubGlobal('fetch', fetcher);
  const { sendRemotePushTest } = await import('../../../server/push-transport.js');
  expect(await sendRemotePushTest('android', 'synthetic-token', 'owner', 'request')).toEqual({ accepted: true });
  expect(fetcher.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token');
  const sent = JSON.parse(fetcher.mock.calls[1][1].body); expect(sent.message.data.ownerId).toBe('owner'); expect(sent.message.android.ttl).toBe('300s');
  expect(Object.keys(sent.message.data).sort()).toEqual(['ownerId', 'profileId', 'requestId', 'route', 'type']); expect(sent.message.notification.body).not.toMatch(/medication|allergy|calorie/i);
});
it('fails closed when credentials are missing', async () => {
  vi.stubEnv('FCM_SERVICE_ACCOUNT_JSON', ''); const { sendRemotePushTest } = await import('../../../server/push-transport.js');
  await expect(sendRemotePushTest('android', 'token', 'owner', 'request')).rejects.toThrow('not configured');
});
