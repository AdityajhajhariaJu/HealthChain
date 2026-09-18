// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
  };
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

import { ClinicalEliminationModal } from '../ClinicalEliminationModal';
import { startTrial, getActiveTrial } from '../../../services/TriggerEngine';
import { startNewTrialV2, getActiveTrialV2, getChecklistCompletion, getHealthEvents } from '../../../services/TrialWorkflowService';

describe('ClinicalEliminationModal Patient-First Overhaul Tests', () => {
  let containerDiv: HTMLDivElement;
  const mockOnClose = vi.fn();
  const mockOnTrialUpdated = vi.fn();

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

  it('renders Abundance Guide Card, persisted checklist, and tri-state adherence when trial is active', async () => {
    // Start active trial
    startTrial('hunt_bloat');
    startNewTrialV2({ protocolId: 'hunt_bloat', durationDays: 28 });

    render(
      <ClinicalEliminationModal
        isOpen={true}
        onClose={mockOnClose}
        onTrialUpdated={mockOnTrialUpdated}
      />,
      { container: containerDiv }
    );

    // Abundance guide card
    expect(screen.getByText('What You Can Abundantly Enjoy Today')).toBeTruthy();
    expect(screen.getByText(/Restriction is temporary/)).toBeTruthy();

    // Persisted checklist
    expect(screen.getByText("Today's Action Checklist")).toBeTruthy();

    // Open progressive disclosure for adherence & notes
    fireEvent.click(screen.getByText(/Add protocol adherence & notes/i));

    // Tri-state adherence radio
    expect(screen.getByText('Followed')).toBeTruthy();
    expect(screen.getByText('Partly followed')).toBeTruthy();
    expect(screen.getByText('Did not follow')).toBeTruthy();

    // Severity check-in requires selection (disabled initially when severityScore is null)
    const saveBtn = screen.getByText(/Select a score to record check-in/i);
    expect(saveBtn.closest('button')?.disabled).toBe(true);

    // Select severity score on slider
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '4' } });

    // Button should now be active
    const activeSaveBtn = screen.getByText("Save Today's Check-In");
    expect(activeSaveBtn.closest('button')?.disabled).toBe(false);

    // Select "Partly followed"
    fireEvent.click(screen.getByText('Partly followed'));

    // Save check-in
    fireEvent.click(activeSaveBtn);
    expect(mockOnTrialUpdated).toHaveBeenCalled();
  });

  it('persists checklist completions durably by date', async () => {
    startTrial('hunt_bloat');
    startNewTrialV2({ protocolId: 'hunt_bloat', durationDays: 28 });

    render(
      <ClinicalEliminationModal
        isOpen={true}
        onClose={mockOnClose}
        onTrialUpdated={mockOnTrialUpdated}
      />,
      { container: containerDiv }
    );

    const checklistItem = screen.getByText(/Avoid all hidden alliums/i);
    fireEvent.click(checklistItem);

    const todayKey = new Date().toLocaleDateString('en-CA');
    const completedTasks = getChecklistCompletion('hunt_bloat', todayKey);
    expect(completedTasks.length).toBeGreaterThan(0);
  });

  it('locks rechallenge tab when baseline observation count is insufficient', async () => {
    startTrial('hunt_bloat');
    const v2 = startNewTrialV2({ protocolId: 'hunt_bloat', durationDays: 28 });
    v2.baseline.completedObservations = 2; // only 2 of 5 observations logged
    localStorage.setItem('hc_trial_v2_profile_1', JSON.stringify(v2));

    render(
      <ClinicalEliminationModal
        isOpen={true}
        onClose={mockOnClose}
        onTrialUpdated={mockOnTrialUpdated}
      />,
      { container: containerDiv }
    );

    // Navigate to Rechallenge tab
    fireEvent.click(screen.getByText(/Timeline/i));

    // Should display Observation Density Gate Locked
    expect(screen.getByText(/Baseline Calibration Gate: Rechallenge Locked/i)).toBeTruthy();
    expect(screen.getByText(/Missing logs do not advance the trial/i)).toBeTruthy();
  });

  it('supports patient agency controls: Pause, Resume, and Stop with reason', async () => {
    startTrial('hunt_bloat');
    startNewTrialV2({ protocolId: 'hunt_bloat', durationDays: 28 });

    render(
      <ClinicalEliminationModal
        isOpen={true}
        onClose={mockOnClose}
        onTrialUpdated={mockOnTrialUpdated}
      />,
      { container: containerDiv }
    );

    // Click Pause
    const pauseBtn = screen.getByText('Pause Trial');
    fireEvent.click(pauseBtn);

    // Trial should show paused banner
    expect(screen.getByText('Trial Paused')).toBeTruthy();

    // Click Stop Trial to open stop dialog
    const stopBtn = screen.getByText('Stop Trial');
    fireEvent.click(stopBtn);

    expect(screen.getByText('Stop Current Trial?')).toBeTruthy();
    expect(screen.getByText('Symptoms resolved / feel better')).toBeTruthy();

    // Confirm stop
    const confirmStopBtn = screen.getByText('Confirm Stop');
    fireEvent.click(confirmStopBtn);

    const active = getActiveTrial();
    expect(active).toBeNull();
  });

  it('supports food challenge execution, live observation logging, and outcome evaluation', async () => {
    startTrial('hunt_bloat');
    const v2 = startNewTrialV2({ protocolId: 'hunt_bloat', durationDays: 28 });
    v2.baseline.completedObservations = 5; // Unlocks calibration gate!
    localStorage.setItem('hc_trial_v2_profile_1', JSON.stringify(v2));

    render(
      <ClinicalEliminationModal
        isOpen={true}
        onClose={mockOnClose}
        onTrialUpdated={mockOnTrialUpdated}
      />,
      { container: containerDiv }
    );

    // Navigate to Rechallenge tab
    fireEvent.click(screen.getByText(/Timeline/i));

    // Calibration should be unlocked
    expect(screen.getByText(/Baseline Calibration Complete: Challenge Phase Unlocked/i)).toBeTruthy();

    // Start a 48h challenge with first available food
    const startChallengeBtn = screen.getAllByText(/Start 48h Challenge/i)[0];
    fireEvent.click(startChallengeBtn);

    // Active challenge card should now be visible
    expect(screen.getByText(/Active Food Reintroduction/i)).toBeTruthy();
    expect(screen.getByText(/48-Hour Observation Timeline/i)).toBeTruthy();

    // Log asymptomatic observation
    const asymptomaticBtn = screen.getByText(/Asymptomatic \/ Clear/i);
    fireEvent.click(asymptomaticBtn);

    expect(screen.getByText(/No Adverse Reaction/i)).toBeTruthy();

    // Open reaction logger
    const reactionBtn = screen.getByText(/Reaction Observed/i);
    fireEvent.click(reactionBtn);

    expect(screen.getByText(/Record Reaction Severity & Symptoms/i)).toBeTruthy();

    // Save reaction
    const saveReactionBtn = screen.getByText(/Save Reaction Observation/i);
    fireEvent.click(saveReactionBtn);

    // Reaction should appear in challenge log
    expect(screen.getByText(/Symptom Trigger Identified/i)).toBeTruthy();

    // Confirm trigger and complete
    const confirmTriggerBtn = screen.getByText(/Confirm Trigger & Keep Set Aside/i);
    fireEvent.click(confirmTriggerBtn);

    // Should now show in completed reintroductions
    expect(screen.getByText(/Completed Reintroductions/i)).toBeTruthy();
    expect(screen.getByText(/Trigger Identified ⚠️/i)).toBeTruthy();
  });

  it('renders clinical SBAR dossier and printable container in Doctor Report tab', async () => {
    startTrial('hunt_bloat');
    startNewTrialV2({ protocolId: 'hunt_bloat', durationDays: 28 });

    render(
      <ClinicalEliminationModal
        isOpen={true}
        onClose={mockOnClose}
        onTrialUpdated={mockOnTrialUpdated}
      />,
      { container: containerDiv }
    );

    // Navigate to Doctor Report tab
    fireEvent.click(screen.getByText(/Doctor Report/i));

    // Milestone banner and SBAR text
    expect(screen.getByText(/Doctor Visit Summary/i)).toBeTruthy();
    expect(screen.getByText(/CLINICAL SBAR PHYSICIAN BRIEF/i)).toBeTruthy();
    expect(screen.getByText(/1-Tap Copy Summary/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Print/i })).toBeTruthy();

    // Printable dossier container for high-res PDF print
    const printableDossier = document.querySelector('.clinical-trial-printable-dossier');
    expect(printableDossier).toBeTruthy();
    expect(printableDossier?.textContent).toContain('S — SITUATION');
    expect(printableDossier?.textContent).toContain('B — BACKGROUND');
    expect(printableDossier?.textContent).toContain('A — ASSESSMENT');
    expect(printableDossier?.textContent).toContain('R — CLINICAL RECOMMENDATIONS');

    // Click 1-Tap Copy Summary
    const copyBtn = screen.getByText(/1-Tap Copy Summary/i);
    fireEvent.click(copyBtn);
    expect(screen.getByText(/Copied to Clipboard!/i)).toBeTruthy();

    // Click Print
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const printBtn = screen.getByRole('button', { name: /Print/i });
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('renders correctly in inline mode without portal', () => {
    startTrial('hunt_bloat');
    const { container } = render(
      <ClinicalEliminationModal inline={true} />
    );

    expect(container.textContent).toContain('28-Day Bloating & Visceral Fermentation Hunt');
    expect(container.textContent).toContain('What You Can Abundantly Enjoy Today');
    expect(container.textContent).toContain("Today's Action Checklist");
  });

  it('handles isOpen transition from false to true without hook count mismatch (React error #310 prevention)', () => {
    startTrial('hunt_bloat');
    const { rerender } = render(
      <ClinicalEliminationModal isOpen={false} />
    );

    // Transition to isOpen=true: must not throw "Rendered more hooks than during previous render"
    expect(() => {
      rerender(<ClinicalEliminationModal isOpen={true} />);
    }).not.toThrow();

    expect(screen.getAllByText(/28-Day Bloating & Visceral Fermentation Hunt/i).length).toBeGreaterThanOrEqual(1);

    // Transition back to isOpen=false: must not throw "Rendered fewer hooks than during previous render"
    expect(() => {
      rerender(<ClinicalEliminationModal isOpen={false} />);
    }).not.toThrow();
  });

  it('renders native onboarding wizard when no active trial exists', () => {
    // No trial started
    render(
      <ClinicalEliminationModal
        isOpen={true}
        onClose={mockOnClose}
        onTrialUpdated={mockOnTrialUpdated}
      />,
      { container: containerDiv }
    );

    // Onboarding header badge and wizard orientation rendered
    expect(screen.getAllByText(/ELIMINATION SUITE ONBOARDING/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/A Scientific Investigation, Not a Permanent Diet/i)).toBeTruthy();
    expect(screen.getByText(/Begin Symptom Triage/i)).toBeTruthy();
  });

  it('allows retaking intake, viewing assessment, and resetting protocol from overflow menu', () => {
    startTrial('hunt_bloat');
    startNewTrialV2({
      protocolId: 'hunt_bloat',
      durationDays: 28,
      intakeAssessment: {
        symptoms: ['bloating'],
        timing: 'delayed',
        baselineSeverity: 7,
        safetyAcknowledged: true,
        completedAt: new Date().toISOString(),
        matchedProtocolId: 'hunt_bloat',
      },
    });

    render(
      <ClinicalEliminationModal
        isOpen={true}
        onClose={mockOnClose}
        onTrialUpdated={mockOnTrialUpdated}
      />,
      { container: containerDiv }
    );

    // Open overflow menu
    const overflowBtn = screen.getByRole('button', { name: /Trial options/i });
    fireEvent.click(overflowBtn);

    // Menu options visible
    expect(screen.getByText(/Retake Guided Intake/i)).toBeTruthy();
    expect(screen.getByText(/View Intake Assessment/i)).toBeTruthy();
    expect(screen.getByText(/Reset Protocol & Start Fresh/i)).toBeTruthy();

    // 1. Click View Intake Assessment
    fireEvent.click(screen.getByText(/View Intake Assessment/i));
    expect(screen.getByText(/Intake Assessment Record/i)).toBeTruthy();
    expect(screen.getAllByText(/bloating/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/7 \/ 10/i)).toBeTruthy();

    // Close assessment record
    fireEvent.click(screen.getByText(/Close Record/i));

    // 2. Open overflow menu again and test Reset Protocol
    fireEvent.click(overflowBtn);
    fireEvent.click(screen.getByText(/Reset Protocol & Start Fresh/i));

    // Confirmation dialog appears
    expect(screen.getByText(/Reset Protocol & Start Fresh\?/i)).toBeTruthy();
    expect(screen.getByText(/Active trial will be cleared/i)).toBeTruthy();

    // Confirm reset
    fireEvent.click(screen.getByText(/Yes, Reset Protocol/i));

    // Trial should now be null and mode switched to onboarding
    expect(getActiveTrial()).toBeNull();
    expect(getActiveTrialV2()).toBeNull();
    expect(screen.getAllByText(/ELIMINATION SUITE ONBOARDING/i).length).toBeGreaterThanOrEqual(1);
  });
});

