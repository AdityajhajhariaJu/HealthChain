// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ search: '', pathname: '/app/today', hash: '', state: {} }),
  useNavigate: () => vi.fn(),
}));
import { TherapeuticOutcomeCard } from '../TherapeuticOutcomeCard';
import { getHealthEvents, saveActiveTrialV2, startNewTrialV2 } from '../../../services/TrialWorkflowService';

describe('Gut plan card', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    localStorage.setItem('hc_unified_profile', JSON.stringify({ activeId: 'profile_1', profiles: { profile_1: { id: 'profile_1', profileName: 'Test' } } }));
  });

  it('offers a low-burden starting point without claiming a trigger', () => {
    render(<TherapeuticOutcomeCard />);
    expect(screen.getByText('Gut plan records')).toBeTruthy();
    expect(screen.getByText('START WITH OBSERVATION')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Find a starting point/i }));
    expect(screen.getByText(/Find your starting point/i)).toBeTruthy();
  });

  it('saves a selected score to the trial record with unknown adherence', () => {
    const trial = startNewTrialV2({ protocolId: 'hunt_bloat' });
    render(<TherapeuticOutcomeCard />);
    expect(screen.getByText(/0 recorded check-ins/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Check in' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    const events = getHealthEvents({ profileId: trial.profileId, trialId: trial.id, type: 'daily_checkin' });
    expect(events).toHaveLength(1);
    expect(events[0].payload.severityScore).toBe(5);
    expect(events[0].payload.adherenceLevel).toBe('unknown');
    expect(screen.getByText(/Today’s recorded symptom score: 5\/10/i)).toBeTruthy();
  });

  it('shows a completed plan as records without displaying its old verdict', () => {
    const trial = startNewTrialV2({ protocolId: 'hunt_bloat' });
    trial.status = 'completed';
    trial.verdict = { graduatedAt: '2026-09-20T00:00:00Z', initialBaselineSeverity: 8, finalSeverity: 2, symptomReductionPercentage: 75, confirmedTriggers: [], clearedFoods: [], inconclusiveFoods: [], clinicianDossierSummary: 'Old claim', maintenanceDietRecommendations: [] };
    saveActiveTrialV2(trial);
    render(<TherapeuticOutcomeCard />);
    expect(screen.getByText(/completed · 0 recorded check-ins/i)).toBeTruthy();
    expect(screen.queryByText(/75%|Old claim/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Review records/i }));
    expect(screen.getByText(/This plan is completed/i)).toBeTruthy();
  });
});
