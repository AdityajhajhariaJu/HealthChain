const origins = new Set([
  'https://healthchain360.com',
  'https://www.healthchain360.com',
  'https://healthchain-live.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
]);
export function trustedOrigin(origin) {
  return typeof origin === 'string' && origins.has(origin);
}
export function allowedOrigin(origin) {
  if (typeof origin !== 'string') return false;
  if (origins.has(origin)) return true;
  try {
    const url = new URL(origin);
    return (
      url.origin === origin &&
      url.protocol === 'https:' &&
      (url.hostname.endsWith('.vercel.app') || url.hostname.endsWith('.healthchain360.com'))
    );
  } catch {
    return false;
  }
}
