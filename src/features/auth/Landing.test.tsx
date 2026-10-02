// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Landing from './Landing';

const dependencies = vi.hoisted(() => ({
  session: vi.fn(),
  navigate: vi.fn(),
  activate: vi.fn(),
  reset: vi.fn(),
}));
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => dependencies.navigate,
}));
vi.mock('../../services/authSession', () => ({ getActiveSession: dependencies.session }));
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
  },
}));
vi.mock('../../services/CaseEngine', () => ({ setActiveCase: dependencies.activate }));
vi.mock('../../stores/useMDTStore', () => ({
  useMDTStore: { getState: () => ({ reset: dependencies.reset }) },
}));
vi.mock('../../services/haptics', () => ({ triggerHapticLight: vi.fn() }));
vi.mock('../../services/analytics', () => ({ trackButtonClick: vi.fn(), trackPageView: vi.fn() }));
vi.mock('../../components/ui/ToastProvider', () => ({ useToast: () => ({ error: vi.fn() }) }));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: true,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

for (const signedIn of [true, false]) {
  it(`waits for auth restoration before choosing ${signedIn ? 'the account' : 'guest mode'}`, async () => {
    let resolveSession!: (session: unknown) => void;
    dependencies.session.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      })
    );
    render(
      <StrictMode>
        <MemoryRouter>
          <Landing />
        </MemoryRouter>
      </StrictMode>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    expect(localStorage.getItem('hc_guest_mode')).toBeNull();
    expect(dependencies.activate).not.toHaveBeenCalled();
    await act(async () => resolveSession(signedIn ? { user: { id: 'synthetic-account' } } : null));
    if (signedIn) {
      await waitFor(() =>
        expect(dependencies.navigate).toHaveBeenCalledWith('/app', { replace: true })
      );
      expect(localStorage.getItem('hc_guest_mode')).toBeNull();
      expect(dependencies.activate).not.toHaveBeenCalled();
    } else {
      await waitFor(() =>
        expect(dependencies.navigate).toHaveBeenCalledWith('/app/consult?new=true')
      );
      expect(localStorage.getItem('hc_guest_mode')).toBe('true');
      expect(dependencies.activate).toHaveBeenCalledTimes(1);
      expect(dependencies.reset).toHaveBeenCalledTimes(1);
    }
  });
}
