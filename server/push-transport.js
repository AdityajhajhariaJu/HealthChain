import { createSign } from 'node:crypto';
import { connect } from 'node:http2';
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
let firebaseToken;
function jwt(header, claims, key, algorithm) {
  const unsigned = `${encode(header)}.${encode(claims)}`;
  const signer = createSign(algorithm); signer.update(unsigned); signer.end();
  return `${unsigned}.${signer.sign({ key: key.replace(/\\n/g, '\n'), dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}
export function pushConfigured(platform) {
  return platform === 'android' ? Boolean(process.env.FCM_SERVICE_ACCOUNT_JSON)
    : platform === 'ios' && Boolean(process.env.APNS_PRIVATE_KEY && process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID);
}
async function fcmToken(account) {
  if (firebaseToken?.email === account.client_email && firebaseToken.until > Date.now() + 60000) return firebaseToken.token;
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt({ alg: 'RS256', typ: 'JWT' }, { iss: account.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }, account.private_key, 'RSA-SHA256');
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(10000), redirect: 'error' });
  const value = await response.json();
  if (!response.ok || typeof value.access_token !== 'string') throw new Error('Push provider authentication failed');
  firebaseToken = { email: account.client_email, token: value.access_token, until: Date.now() + Math.min(Number(value.expires_in) || 3600, 3600) * 1000 };
  return value.access_token;
}
async function sendFcm(token, data) {
  const account = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON);
  if (!/^[a-z][a-z0-9-]{3,62}$/.test(account.project_id) || typeof account.client_email !== 'string' || typeof account.private_key !== 'string') throw new Error('Push provider configuration is invalid');
  const bearer = await fcmToken(account);
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, { method: 'POST', headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { token, notification: { title: 'HealthChain notification test', body: 'Your remote notification connection is working.' }, data,
      android: { priority: 'high', ttl: '300s', collapse_key: 'healthchain_remote_test', notification: { channel_id: 'healthchain_daily_reminders_v2' } } } }), signal: AbortSignal.timeout(10000), redirect: 'error' });
  const value = await response.json();
  if (!response.ok) return { accepted: false, expired: value.error?.details?.some(item => item.errorCode === 'UNREGISTERED') || false };
  return { accepted: typeof value.name === 'string' };
}
async function sendApns(token, data) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return { accepted: false, expired: true };
  const environment = process.env.APNS_ENVIRONMENT || 'production';
  if (!['production', 'sandbox'].includes(environment)) throw new Error('Push provider environment is invalid');
  const bearer = jwt({ alg: 'ES256', kid: process.env.APNS_KEY_ID }, { iss: process.env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }, process.env.APNS_PRIVATE_KEY, 'SHA256');
  const client = connect(environment === 'sandbox' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com');
  return new Promise((resolve, reject) => {
    let stream, done = false;
    const finish = (error, value) => { if (done) return; done = true; clearTimeout(timer); stream?.close(); client.close(); if (error) reject(error); else resolve(value); };
    const timer = setTimeout(() => { finish(new Error('Push provider timed out')); client.destroy(); }, 10000);
    client.on('error', () => finish(new Error('Push provider connection failed')));
    try {
      stream = client.request({ ':method': 'POST', ':path': `/3/device/${token}`, authorization: `bearer ${bearer}`, 'apns-topic': process.env.APNS_TOPIC || 'com.healthchain.app', 'apns-push-type': 'alert', 'apns-priority': '10', 'apns-expiration': String(Math.floor(Date.now() / 1000) + 300), 'apns-collapse-id': 'healthchain_remote_test' });
      let status = 0, body = ''; stream.setEncoding('utf8'); stream.on('response', headers => { status = Number(headers[':status']); });
      stream.on('data', chunk => { if (body.length < 10000) body += chunk; });
      stream.on('error', () => finish(new Error('Push provider request failed')));
      stream.on('end', () => { let reason; try { reason = JSON.parse(body).reason; } catch { /* APNs success has an empty body. */ }
        finish(null, { accepted: status === 200, expired: status === 410 || ['BadDeviceToken', 'Unregistered'].includes(reason) }); });
      stream.end(JSON.stringify({ aps: { alert: { title: 'HealthChain notification test', body: 'Your remote notification connection is working.' }, sound: 'default' }, ...data }));
    } catch { finish(new Error('Push provider request failed')); }
  });
}
export async function sendRemotePushTest(platform, token, ownerId, requestId) {
  if (!pushConfigured(platform)) throw new Error('Remote push is not configured');
  const data = { type: 'remote_test', route: '/app/today', ownerId, profileId: 'profile_1', requestId };
  return platform === 'android' ? sendFcm(token, data) : sendApns(token, data);
}
