import { afterEach, expect, it, vi } from 'vitest';
const query = vi.hoisted(() => vi.fn());
vi.mock('../supabaseClient', () => ({ supabase: { from: query } }));
import { FitnessService } from '../FitnessService';
afterEach(() => vi.unstubAllEnvs());
it('reports missing activity configuration promptly without a fallback-host request', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
  await expect(FitnessService.getAllActiveContent()).rejects.toThrow('not configured');
  expect(query).not.toHaveBeenCalled();
});
