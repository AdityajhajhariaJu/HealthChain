// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: ({ children, whileHover, whileTap, ...props }: any) => <div {...props}>{children}</div>,
    },
  };
});

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ search: '', pathname: '/app/today', hash: '', state: {} }),
  useNavigate: () => vi.fn(),
}));

import { TherapeuticOutcomeCard } from '../TherapeuticOutcomeCard';
import { startTrial, getActiveTrial } from '../../../services/TriggerEngine';
import { startNewTrialV2, getActiveTrialV2, getHealthEvents } from '../../../services/TrialWorkflowService';

describe('TherapeuticOutcomeCard Dual-Sync & Quick Logging Tests', () => {
  let containerDiv: HTMLDivElement;

  beforeEach(() => {
    containerDiv = document.createElement('div');
    document.body.appendChild(containerDiv);
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    if (containerDiv && containerDiv.parentNode) {
      containerDiv.parentNode.removeChild(containerDiv);
    }
  });

  it('renders active trial status and quick check-in button', () => {
    startTrial('hunt_bloat');
    startNewTrialV2({ protocolId: 'hunt_bloat', durationDays: 28 });

    render(<TherapeuticOutcomeCard />, { container: containerDiv });

    expect(screen.getByText(/DAY 1\/28/i)).toBeTruthy();
    expect(screen.getByText('Check-In')).toBeTruthy();
  });

  it('synchronizes quick-log score to both TriggerEngine (V1) and TrialWorkflowService (V2)', () => {
    startTrial('hunt_bloat');
    const v2 = startNewTrialV2({ protocolId: 'hunt_bloat', durationDays: 28 });
    expect(v2.baseline.completedObservations).toBe(0);

    render(<TherapeuticOutcomeCard />, { container: containerDiv });

    // Click Check-In to reveal quick score buttons
    const checkinBtn = screen.getByText('Check-In');
    fireEvent.click(checkinBtn);

    // Score buttons [2, 4, 6, 8] should be visible
    const score4Btn = screen.getByText('4');
    fireEvent.click(score4Btn);

    // V1 state updated
    const v1Updated = getActiveTrial();
    expect(v1Updated?.currentSeverity).toBe(4);

    // V2 state MUST be synchronized (P0 bug fix verified)
    const v2Updated = getActiveTrialV2();
    expect(v2Updated).toBeDefined();
    expect(v2Updated?.baseline.completedObservations).toBeGreaterThanOrEqual(1);

    const events = getHealthEvents({ profileId: v2Updated!.profileId, trialId: v2Updated!.id, type: 'daily_checkin' });
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[events.length - 1].payload.severityScore).toBe(4);
  });

  it('renders guided intake callout when no active elimination trial exists', () => {
    // No trial started
    render(<TherapeuticOutcomeCard />, { container: containerDiv });

    // Inactive card callout
    expect(screen.getByText(/GUIDED INTAKE AVAILABLE/i)).toBeTruthy();
    expect(screen.getByText(/Clinical Food Reset & Elimination/i)).toBeTruthy();
    expect(screen.getByText(/Begin Guided Reset Onboarding →/i)).toBeTruthy();

    // Clicking button opens modal
    const startBtn = screen.getByText(/Begin Guided Reset Onboarding →/i);
    fireEvent.click(startBtn);

    // Modal rendered in onboarding mode
    expect(screen.getAllByText(/Elimination Suite Onboarding/i).length).toBeGreaterThanOrEqual(1);
  });
});
