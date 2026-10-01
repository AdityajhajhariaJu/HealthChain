// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { getRunScope } from '../RunContext';

describe('RunContext profile isolation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('hc_account', JSON.stringify({ id: 'user-1' }));
  });

  it('creates different transient scopes for caregiver profiles', () => {
    window.localStorage.setItem('hc_unified_profile_user-1', JSON.stringify({
      activeId: 'profile_1',
      profiles: {
        profile_1: { id: 'profile_1', demographics: { updatedAt: '2026-08-21T00:00:00.000Z' } },
        profile_2: { id: 'profile_2', demographics: { updatedAt: '2026-08-21T00:00:00.000Z' } },
      },
    }));
    const firstScope = getRunScope('parallel', 'draft', 'ui');

    window.localStorage.setItem('hc_unified_profile_user-1', JSON.stringify({
      activeId: 'profile_2',
      profiles: {
        profile_1: { id: 'profile_1', demographics: { updatedAt: '2026-08-21T00:00:00.000Z' } },
        profile_2: { id: 'profile_2', demographics: { updatedAt: '2026-08-21T00:00:00.000Z' } },
      },
    }));
    const secondScope = getRunScope('parallel', 'draft', 'ui');

    expect(secondScope).not.toBe(firstScope);
  });

  it('gives explicit guest mode priority over a stale signed-in account and legacy profile', () => {
    localStorage.setItem('hc_unified_profile', JSON.stringify({ id: 'private-legacy-profile' }));
    const signedIn = getRunScope('lab', 'draft', 'session');
    localStorage.setItem('hc_guest_mode', 'true');
    const guest = getRunScope('lab', 'draft', 'session');
    expect(guest).not.toBe(signedIn); expect(guest).toContain('_guest_profile-default_');
  });
});
