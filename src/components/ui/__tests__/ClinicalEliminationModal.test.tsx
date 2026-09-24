// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
import { ClinicalEliminationModal } from '../ClinicalEliminationModal';
import { getProfileKey } from '../../../services/ProfileEngine';
import { appendHealthEvent, getActiveTrialV2, getHealthEvents, recordDailyObservation, saveActiveTrialV2, startFoodChallenge, startNewTrialV2 } from '../../../services/TrialWorkflowService';

describe('Food trial record screen', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    localStorage.setItem('hc_unified_profile', JSON.stringify({ activeId: 'profile_1', profiles: { profile_1: { id: 'profile_1', profileName: 'Test' } } }));
  });

  it('offers observation when there is no plan', () => {
    render(<ClinicalEliminationModal inline />);
    expect(screen.getByText(/Find your starting point/i)).toBeTruthy();
    expect(getActiveTrialV2()).toBeNull();
  });

  it('requires a score and shows a saved dated check-in', () => {
    const trial = startNewTrialV2({ protocolId: 'hunt_bloat' });
    const updated = vi.fn();
    render(<ClinicalEliminationModal inline onTrialUpdated={updated} />);
    const save = screen.getByRole('button', { name: 'Save check-in' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByRole('spinbutton', { name: /Symptom severity/i }), { target: { value: '4' } });
    fireEvent.click(save);
    expect(updated).toHaveBeenCalled();
    const events = getHealthEvents({ profileId: trial.profileId, trialId: trial.id, type: 'daily_checkin' });
    expect(events).toHaveLength(1);
    expect(events[0].payload.severityScore).toBe(4);
    expect(events[0].payload.adherenceLevel).toBe('unknown');
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByText(/4\/10/)).toBeTruthy();
  });

  it('keeps blank history unknown and has source-based visit notes', () => {
    startNewTrialV2({ protocolId: 'hunt_bloat' });
    render(<ClinicalEliminationModal inline />);
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByText(/Blank dates are unknown/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Visit notes' }));
    expect(screen.getByText(/0 dated check-ins and 0 challenge records/i)).toBeTruthy();
  });

  it('pauses, resumes, and stops while preserving records', () => {
    const trial = startNewTrialV2({ protocolId: 'hunt_bloat' });
    recordDailyObservation(trial.id, { date: '2026-09-20', severityScore: 6, adherenceLevel: 'unknown' });
    render(<ClinicalEliminationModal inline />);
    fireEvent.click(screen.getByRole('button', { name: /Pause plan/i }));
    expect(getActiveTrialV2()?.status).toBe('paused');
    fireEvent.click(screen.getByRole('button', { name: /Resume record/i }));
    expect(getActiveTrialV2()?.status).toBe('baseline');
    fireEvent.click(screen.getByRole('button', { name: /Stop plan/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm stop' }));
    expect(getActiveTrialV2()?.status).toBe('stopped');
    expect(getHealthEvents({ profileId: trial.profileId, trialId: trial.id, type: 'daily_checkin' })).toHaveLength(1);
  });

  it('does not unlock an unreviewed food challenge after five check-ins', () => {
    const trial = startNewTrialV2({ protocolId: 'hunt_bloat', acknowledgedLimitations: true });
    for (let day = 1; day <= 5; day++) {
      appendHealthEvent({ profileId: trial.profileId, trialId: trial.id, type: 'daily_checkin', occurredAt: `2026-09-0${day}T12:00:00Z`, timezone: 'UTC', source: 'trial', payload: { date: `2026-09-0${day}`, severityScore: 3 } });
    }
    render(<ClinicalEliminationModal inline />);
    expect(screen.getByText(/unavailable while the plan and its safety rules receive verified clinical review/i)).toBeTruthy();
    expect(startFoodChallenge(trial.id, { itemId: 'oats', displayName: 'Oats', doseDescription: 'Two spoons' })).toBeNull();
  });

  it('shows completed plans as records without endorsing an old verdict', () => {
    const trial = startNewTrialV2({ protocolId: 'hunt_bloat' });
    trial.status = 'completed';
    trial.verdict = { graduatedAt: '2026-09-20T00:00:00Z', initialBaselineSeverity: 8, finalSeverity: 2, symptomReductionPercentage: 75, confirmedTriggers: [], clearedFoods: [], inconclusiveFoods: [], clinicianDossierSummary: 'Old claim', maintenanceDietRecommendations: [] };
    saveActiveTrialV2(trial);
    render(<ClinicalEliminationModal inline />);
    expect(screen.getByText(/This plan is completed/i)).toBeTruthy();
    expect(screen.queryByText(/75%|Old claim/i)).toBeNull();
  });

  it('preserves legacy-only records without claiming verified consent', () => {
    localStorage.setItem(`hc_active_elimination_trial:${getProfileKey()}:profile_1`, JSON.stringify({ trialId: 'hunt_bloat', startDate: '2026-09-01T00:00:00Z', totalDays: 28, currentDay: 2, symptomScores: [] }));
    render(<ClinicalEliminationModal inline />);
    expect(screen.getByText('Legacy plan preserved')).toBeTruthy();
  });

  it('handles modal open transitions', () => {
    startNewTrialV2({ protocolId: 'hunt_bloat' });
    const { rerender } = render(<ClinicalEliminationModal isOpen={false} />);
    rerender(<ClinicalEliminationModal isOpen />);
    expect(screen.getByRole('dialog', { name: 'Food trial records' })).toBeTruthy();
    rerender(<ClinicalEliminationModal isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
