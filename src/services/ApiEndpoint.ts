import { Capacitor } from '@capacitor/core';

export function resolveBackendBase(configured: string | undefined, native: boolean): string {
  const base = configured?.trim().replace(/\/+$/, '');
  if (base) {
    const parsed = new URL(base);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Invalid backend URL configuration.');
    if (native && parsed.protocol !== 'https:') throw new Error('The mobile backend must use HTTPS.');
    return base;
  }
  return native ? 'https://healthchain360.com' : '';
}

export function apiEndpoint(path: string): string {
  if (!path.startsWith('/api/') || path.startsWith('//') || path.includes('\\')) throw new Error('Invalid API path.');
  return resolveBackendBase(import.meta.env.VITE_BACKEND_URL, Capacitor.getPlatform() !== 'web') + path;
}
