// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  disk: new Map<string, unknown>(),
  getSession: vi.fn(),
  from: vi.fn(),
  enqueue: vi.fn(async () => true),
}));
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => mocks.disk.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    mocks.disk.set(key, value);
  }),
  del: vi.fn(async (key: string) => {
    mocks.disk.delete(key);
  }),
}));
vi.mock('../supabaseClient', () => ({
  supabase: { auth: { getSession: mocks.getSession }, from: mocks.from },
}));
vi.mock('../SyncOutbox', () => ({ enqueueSync: mocks.enqueue }));
import {
  captureHealthMemoryScope,
  hydrateHealthMemory,
  recordHealthMemory,
  getHealthMemory,
  flushHealthMemory,
  reviseHealthMemory,
  syncHealthMemoryFromSupabase,
} from '../HealthMemory';
import {
  normalizeAvaMessages,
  mergeAvaMessages,
  loadAvaMessages,
  newAvaMessage,
  persistAvaMessages,
} from '../AvaConversationRepository';
import {
  validateHealthArchive,
  restoreHealthArchive,
  addDurableArchiveData,
} from '../HealthArchive';
import {
  MessageRenderer,
  cleanChatMessageText,
  extractActionSuggestions,
} from '../../features/consultation/AvaHealthBuddy';
import { evaluateEmergencyTriage } from '../clinicalTriageEngine';

const switchAccount = (id: string) => {
  localStorage.setItem('hc_account', JSON.stringify({ id }));
  localStorage.removeItem('hc_guest_mode');
  captureHealthMemoryScope();
};
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const oldMemory = {
  id: 'old-memory',
  profileId: 'profile_1',
  kind: 'health_buddy',
  source: 'ava',
  title: 'Old offline fact',
  occurredAt: '2026-09-29T10:00:00Z',
  createdAt: '2026-09-29T10:00:00Z',
  updatedAt: '2026-09-29T10:00:00Z',
  payload: { userConfirmed: true },
};
beforeEach(() => {
  cleanup();
  window.dispatchEvent(new Event('hc_logout'));
  localStorage.clear();
  mocks.disk.clear();
  mocks.enqueue.mockClear();
  mocks.from.mockReset();
  mocks.getSession.mockReset();
  mocks.getSession.mockImplementation(async () => ({
    data: { session: { user: { id: JSON.parse(localStorage.getItem('hc_account') || '{}').id } } },
  }));
  mocks.from.mockReturnValue({ upsert: vi.fn(async () => ({ error: null })) });
  switchAccount('user-a');
});
describe('Ava ownership and offline durability', () => {
  it('does not revive an IndexedDB-only forgotten proposal during a mount-time write', async () => {
    localStorage.setItem('hc_guest_mode', 'true');
    const scope = captureHealthMemoryScope();
    mocks.disk.set(
      scope.key,
      JSON.stringify([
        { ...oldMemory, dedupeKey: 'forgotten-offline', deletedAt: new Date().toISOString() },
      ])
    );
    recordHealthMemory({
      kind: 'health_buddy',
      source: 'ava',
      title: 'Should stay forgotten',
      occurredAt: new Date().toISOString(),
      payload: {},
      dedupeKey: 'forgotten-offline',
    });
    await flushHealthMemory(scope);
    expect(getHealthMemory()).toEqual([]);
  });
  it('does not upload A memory using a delayed B session', async () => {
    const auth = deferred<any>();
    mocks.getSession.mockReturnValue(auth.promise);
    recordHealthMemory({
      kind: 'health_buddy',
      source: 'ava',
      title: 'Account A fact',
      occurredAt: new Date().toISOString(),
      payload: {},
    });
    switchAccount('user-b');
    auth.resolve({ data: { session: { user: { id: 'user-b' } } } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.from).not.toHaveBeenCalled();
    expect(getHealthMemory().map((item) => item.title)).not.toContain('Account A fact');
  });
  it('does not merge a delayed cloud read into another account', async () => {
    const read = deferred<any>();
    const query = {
      select: () => query,
      eq: () => query,
      order: () => query,
      range: () => read.promise,
    };
    mocks.from.mockReturnValue(query);
    const pending = syncHealthMemoryFromSupabase();
    await new Promise((resolve) => setTimeout(resolve, 0));
    switchAccount('user-b');
    read.resolve({
      data: [
        {
          id: 'cloud-a',
          profile_id: 'profile_1',
          kind: 'health_buddy',
          source: 'ava',
          title: 'A cloud fact',
          occurred_at: oldMemory.occurredAt,
          created_at: oldMemory.createdAt,
          updated_at: oldMemory.updatedAt,
          payload: {},
        },
      ],
      error: null,
    });
    await pending;
    expect(getHealthMemory()).toEqual([]);
  });
  it('merges offline IndexedDB history before a new mount-time write', async () => {
    localStorage.setItem('hc_guest_mode', 'true');
    const scope = captureHealthMemoryScope();
    mocks.disk.set(scope.key, JSON.stringify([oldMemory]));
    recordHealthMemory({
      kind: 'profile_event',
      source: 'profile',
      title: 'New profile snapshot',
      occurredAt: new Date().toISOString(),
      payload: {},
    });
    await flushHealthMemory(scope);
    expect(getHealthMemory().map((item) => item.title)).toEqual(
      expect.arrayContaining(['Old offline fact', 'New profile snapshot'])
    );
    expect(JSON.parse(localStorage.getItem(scope.key)!)).toHaveLength(2);
  });
  it('persists forgetting across service cache clear and reload hydration', async () => {
    localStorage.setItem('hc_guest_mode', 'true');
    const scope = captureHealthMemoryScope();
    const item = recordHealthMemory({
      kind: 'health_buddy',
      source: 'ava',
      title: 'Forget this fact',
      occurredAt: new Date().toISOString(),
      payload: {},
      dedupeKey: 'forgotten',
    });
    await flushHealthMemory(scope);
    await reviseHealthMemory(item.id, null, scope);
    window.dispatchEvent(new Event('hc_logout'));
    await hydrateHealthMemory();
    expect(getHealthMemory().some((entry) => entry.id === item.id)).toBe(false);
    expect(
      JSON.parse(localStorage.getItem(scope.key)!).find((entry: any) => entry.id === item.id)
        .deletedAt
    ).toBeTruthy();
  });
  it('filters malformed memories rather than exposing objects as facts', () => {
    const scope = captureHealthMemoryScope();
    localStorage.setItem(
      scope.key,
      JSON.stringify([4, {}, { ...oldMemory, title: { unsafe: true } }])
    );
    expect(getHealthMemory()).toEqual([]);
  });
});
describe('Conversation and archive boundaries', () => {
  it('keeps concurrent stale snapshots from losing a newer conversation', async () => {
    localStorage.setItem('hc_guest_mode', 'true');
    const a = newAvaMessage('user', 'First case', 'a'),
      b = newAvaMessage('model', 'First answer', 'a'),
      c = newAvaMessage('user', 'Second case', 'b');
    await Promise.all([
      persistAvaMessages([a, b]),
      persistAvaMessages([a, c]),
      persistAvaMessages([a]),
    ]);
    expect(loadAvaMessages().map((message) => message.id)).toEqual(
      expect.arrayContaining([a.id, b.id, c.id])
    );
  });
  it('rejects malformed roles/content and assigns stable legacy IDs', () => {
    const raw = [
      { role: 'model', content: { bad: true } },
      { role: 'system', content: 'not allowed' },
      { role: 'user', content: 'A valid statement', caseId: 'A' },
    ];
    const first = normalizeAvaMessages(raw);
    expect(first).toHaveLength(1);
    expect(first[0].id).toBe(normalizeAvaMessages(raw)[0].id);
  });
  it('does not give identical legacy turns in different accounts the same cloud identity', () => {
    const a = normalizeAvaMessages([{ role: 'model', content: 'Common greeting' }])[0].id;
    switchAccount('user-b');
    const b = normalizeAvaMessages([{ role: 'model', content: 'Common greeting' }])[0].id;
    expect(a).not.toBe(b);
  });
  it('merges concurrent messages and action receipts without replacing a transcript', () => {
    const a = newAvaMessage('user', 'Case A turn', 'A');
    const b = newAvaMessage('user', 'General turn', '');
    const reply = newAvaMessage('model', 'Reply', 'A', {
      receipts: { obs: { caseId: 'A', savedAt: '2026-09-30' } },
    });
    const result = mergeAvaMessages(
      [a, reply],
      [b, { ...reply, receipts: { q: { caseId: 'A', savedAt: '2026-09-30' } } }]
    );
    expect(result).toHaveLength(3);
    expect(result.find((item) => item.id === reply.id)?.receipts).toHaveProperty('obs');
    expect(result.find((item) => item.id === reply.id)?.receipts).toHaveProperty('q');
  });
  it('restores the app’s v2 archive and strips entitlement claims', async () => {
    const key = 'hc_ava_messages_user-a_profile_1',
      profile = 'hc_unified_profile_user-a';
    const message = newAvaMessage('user', 'Archived conversation', '');
    const result = await restoreHealthArchive(
      {
        format: 'healthchain-user-data-v2',
        ownerId: 'user-a',
        localStorage: {
          [key]: JSON.stringify([message]),
          [profile]: JSON.stringify({ profiles: [{ is_pro: true, conditions: ['Asthma'] }] }),
        },
      },
      ['hc_ava_messages_user-a', 'hc_unified_profile_user-a']
    );
    expect(result.count).toBe(2);
    expect(loadAvaMessages()[0].content).toBe('Archived conversation');
    expect(localStorage.getItem(profile)).not.toContain('is_pro');
  });
  it('fails clearly for wrong owner, malformed history and zero restorable entries', () => {
    expect(() =>
      validateHealthArchive(
        { format: 'healthchain-user-data-v2', ownerId: 'user-b', localStorage: {} },
        []
      )
    ).toThrow('different account');
    expect(() =>
      validateHealthArchive({ localStorage: {}, format: 'healthchain-user-data-v2' }, [])
    ).toThrow('No restorable');
    expect(() =>
      validateHealthArchive(
        {
          format: 'healthchain-user-data-v2',
          localStorage: { hc_ava_messages_user_a: '[{"role":"model","content":3}]' },
        },
        ['hc_ava_messages_user']
      )
    ).toThrow();
  });
});
describe('Immersive answers remain truthful', () => {
  it('renders all supported cards in message order and uses the captured diary snapshot', () => {
    render(
      <MessageRenderer
        content={
          'First [WIDGET:BREATHWORK] Second [WIDGET:WORKOUT] Third [WIDGET:DIARY_TIMELINE] End'
        }
        onOpenCalm={() => {}}
        onOpenWorkout={() => {}}
        diaryEntries={[{ name: 'Recorded lunch', occurredAt: null }]}
      />
    );
    expect(screen.getByText('Optional comfortable breathing')).toBeTruthy();
    expect(screen.getByText('Explore movement activities')).toBeTruthy();
    expect(screen.getByText('Recorded lunch')).toBeTruthy();
    expect(screen.getByText('Time not recorded')).toBeTruthy();
    expect(screen.getByText('End')).toBeTruthy();
  });
  it('does not turn rejected breathing text into a recommendation', () => {
    render(<MessageRenderer content="Do not try 4-7-8 breathing; it made you dizzy." />);
    expect(screen.queryByText('Open breathing guide')).toBeNull();
  });
  it('keeps literal source JSON outside a recognized card', () => {
    const literal = 'Original note: {"time":"08:00","category":"Medication"}';
    expect(cleanChatMessageText(literal)).toBe(literal);
    render(<MessageRenderer content={literal + ' [WIDGET:BREATHWORK] After: {"time":"09:00"}'} />);
    expect(screen.getByText(literal)).toBeTruthy();
    expect(screen.getByText('After: {"time":"09:00"}')).toBeTruthy();
  });
  it('does not save an ordinary assistant follow-up as a clinician question', () => {
    expect(
      extractActionSuggestions('How did you feel after lunch?', 'I felt pain after lunch', {
        hasCase: true,
        hasRecords: false,
        hasStudy: false,
        hasReview: false,
      }).canAddQuestion
    ).toBe(false);
  });
  it.each([
    'I cannot breathe',
    'I want to end my life',
    'I am suicidal',
    'मुझे सांस नहीं आ रही',
    'सीने में तेज दर्द है',
  ])('recognizes urgent explicit text: %s', (text) => {
    expect(evaluateEmergencyTriage(text).isEmergency).toBe(true);
  });
  it.each([
    'What is crushing chest pain?',
    'I have no crushing chest pain',
    'I do not want to die',
  ])('does not interrupt clear education or negation: %s', (text) => {
    expect(evaluateEmergencyTriage(text).isEmergency).toBe(false);
  });
});
