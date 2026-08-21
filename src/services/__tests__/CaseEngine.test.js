// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createCaseDraft, getCases, getCase } from '../CaseEngine';

// Mock localStorage
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: function (key) {
      return store[key] || null;
    },
    setItem: function (key, value) {
      store[key] = value.toString();
    },
    removeItem: function (key) {
      delete store[key];
    },
    clear: function () {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('CaseEngine', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a draft case correctly', () => {
    const draft = createCaseDraft({
      title: 'Test Draft Case',
      intakeData: { chiefComplaint: 'Headache' },
    });

    expect(draft).toBeDefined();
    expect(draft.title).toBe('Test Draft Case');
    expect(draft.intakeData.chiefComplaint).toBe('Headache');
    expect(draft.status).toBe('active');

    // Check if it was saved
    const cases = getCases();
    expect(cases.length).toBe(1);
    expect(cases[0].id).toBe(draft.id);
  });

  it('fetches an existing case by ID', () => {
    const draft = createCaseDraft({ title: 'Fetch Me' });
    const fetchedCase = getCase(draft.id);

    expect(fetchedCase).toBeDefined();
    expect(fetchedCase.title).toBe('Fetch Me');
  });
});
