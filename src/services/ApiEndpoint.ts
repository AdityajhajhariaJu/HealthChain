import { Capacitor } from '@capacitor/core';

export function resolveBackendBase(configured: string | undefined, native: boolean): string {
  const base = configured?.trim().replace(/\/+$/, '');
  if (base) {
    const parsed = new URL(base);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    )
      throw new Error('Invalid backend URL configuration.');
    if (native && parsed.protocol !== 'https:')
      throw new Error('The mobile backend must use HTTPS.');
    return base;
  }
  return native ? 'https://healthchain360.com' : '';
}

export function apiEndpoint(path: string): string {
  if (!/^\/api\/[a-z-]+(?:\?[^#]*)?$/.test(path)) throw new Error('Invalid API path.');
  const healthBase = import.meta.env.VITE_HEALTH_BACKEND_URL;
  if (
    healthBase &&
    ['/api/gemini', '/api/delete-account', '/api/trials'].includes(path.split('?')[0])
  ) {
    const base = resolveBackendBase(healthBase, true);
    const parsed = new URL(base);
    if (
      parsed.origin !== 'https://cikikocfvfshloqwnyfe.supabase.co' ||
      parsed.pathname !== '/functions/v1/healthchain-health'
    )
      throw new Error('The health backend must use the configured Supabase function.');
    return base + path;
  }
  return (
    resolveBackendBase(import.meta.env.VITE_BACKEND_URL, Capacitor.getPlatform() !== 'web') + path
  );
}

export function aiRegionEndpoint(requestId: string): string {
  return (
    resolveBackendBase(import.meta.env.VITE_BACKEND_URL, Capacitor.getPlatform() !== 'web') +
    '/api/gemini?region=1&requestId=' +
    encodeURIComponent(requestId)
  );
}
