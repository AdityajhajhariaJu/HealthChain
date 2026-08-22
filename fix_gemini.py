import re

with open("src/services/geminiService.ts", "r", encoding="utf-8") as f:
    content = f.read()

replacement = """import { compilePatientContext } from './MemoryService';
import { getActiveCase, AppointmentBrief } from './CaseEngine';
import { supabase } from './supabaseClient';
import { parseModelJson } from './modelJson';
export { parseModelJson } from './modelJson';

const API_URL = import.meta.env.DEV ? 'http://localhost:3000/api/gemini' : '/api/gemini';

async function sha256Hash(text: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Date.now().toString();
  }
}

const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 60000, idempotencyKey?: string) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Offline');
  }

  let sessionToken = '';
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      sessionToken = data.session.access_token;
    }
  } catch {}

  if (!import.meta.env.DEV && !sessionToken) {
    throw new Error('Please sign in to use secure AI health processing.');
  }

  const requestId = idempotencyKey || await sha256Hash(options.body || Date.now().toString());

  const secureOptions = {
    ...options,
    headers: {
      ...options.headers,
      'X-HC-Request-Id': requestId,
      'X-HC-Operation': options.headers?.['X-HC-Operation'] || 'gemini',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    }
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...secureOptions, signal: controller.signal });
    if (!response.ok && response.status === 401) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        window.dispatchEvent(new Event('hc_logout'));
        throw new Error('Session expired. Please log in again.');
      }
      secureOptions.headers['Authorization'] = `Bearer ${data.session.access_token}`;
      return await fetch(url, { ...secureOptions, signal: controller.signal });
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
};"""

content = re.sub(r"^.*?clearTimeout\(timeout\);\s*\}\s*\};", replacement, content, flags=re.DOTALL)

# Add idempotencyKey to the requests
content = content.replace("const request = (async () => {", "const request = (async () => {\n    const idempotencyKey = await sha256Hash('mdt-' + requestKey);")

with open("src/services/geminiService.ts", "w", encoding="utf-8") as f:
    f.write(content)
