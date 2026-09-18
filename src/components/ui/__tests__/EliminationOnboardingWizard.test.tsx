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
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
  };
});

import { EliminationOnboardingWizard } from '../EliminationOnboardingWizard';
import { getActiveTrial } from '../../../services/TriggerEngine';
import { getActiveTrialV2 } from '../../../services/TrialWorkflowService';

describe('EliminationOnboardingWizard Tests', () => {
  let containerDiv: HTMLDivElement;
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnProtocolSelect = vi.fn();
  const mockOnBrowseProtocols = vi.fn();

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

  it('renders Step 0 clinical philosophy and navigates to Step 1', () => {
    render(
      <EliminationOnboardingWizard
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        onProtocolSelect={mockOnProtocolSelect}
        onBrowseProtocols={mockOnBrowseProtocols}
      />,
      { container: containerDiv }
    );

    // Step 0 orientation
    expect(screen.getByText(/Elimination Suite Onboarding/i)).toBeTruthy();
    expect(screen.getByText(/A Scientific Investigation, Not a Permanent Diet/i)).toBeTruthy();
    expect(screen.getByText(/Washout Reset/i)).toBeTruthy();
    expect(screen.getByText(/Food Challenge/i)).toBeTruthy();
    expect(screen.getByText(/Food Freedom/i)).toBeTruthy();

    // Advance to Step 1
    const nextBtn = screen.getByText(/Begin Symptom Triage/i);
    fireEvent.click(nextBtn);

    // Should now be on Step 1
    expect(screen.getByText(/What symptoms are you experiencing most frequently\?/i)).toBeTruthy();
    expect(screen.getByText(/Bloating & Abdominal Distension/i)).toBeTruthy();
    expect(screen.getByText(/Post-Wheat Fatigue & Joint Stiffness/i)).toBeTruthy();
  });

  it('progresses through symptom selection and latency to safety screening', () => {
    render(
      <EliminationOnboardingWizard
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
      { container: containerDiv }
    );

    // Step 0 -> Step 1
    fireEvent.click(screen.getByText(/Begin Symptom Triage/i));

    // Next button disabled before symptom selection
    const nextBtn = screen.getByText(/Continue to Safety Check/i);
    expect(nextBtn.closest('button')?.disabled).toBe(true);

    // Select Bloating symptom
    fireEvent.click(screen.getByText(/Bloating & Abdominal Distension/i));

    // Select Latency
    fireEvent.click(screen.getByText(/1 to 4 Hours Post-Meal/i));

    // Next button now enabled
    expect(nextBtn.closest('button')?.disabled).toBe(false);
    fireEvent.click(nextBtn);

    // Step 2 Safety Screening rendered
    expect(screen.getByText(/Clinical Safety & Contraindications Check/i)).toBeTruthy();
    expect(screen.getByText(/None of the exclusions apply/i)).toBeTruthy();
  });

  it('triggers Safety Stop screen when clinical exclusions are selected', () => {
    render(
      <EliminationOnboardingWizard
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
      { container: containerDiv }
    );

    // Step 0 -> Step 1
    fireEvent.click(screen.getByText(/Begin Symptom Triage/i));
    fireEvent.click(screen.getByText(/Heartburn, Reflux & Throat Burning/i));
    fireEvent.click(screen.getByText(/Continue to Safety Check/i));

    // Select an exclusion flag: Eating Disorder
    fireEvent.click(screen.getByText(/Active eating disorder or severe food-related anxiety/i));

    // Button updates to Review Safety Guidance
    const reviewBtn = screen.getByText(/Review Safety Guidance/i);
    fireEvent.click(reviewBtn);

    // Step 3 Clinician Safety Stop screen should be displayed
    expect(screen.getByText(/Clinical Consultation Recommended First/i)).toBeTruthy();
    expect(screen.getByText(/What you can safely do right now/i)).toBeTruthy();

    // Clicking Close to Dashboard calls onCancel
    fireEvent.click(screen.getByText(/Close to Dashboard/i));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('recommends matching protocol and activates trial on Step 5 with dual-sync', () => {
    render(
      <EliminationOnboardingWizard
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
      { container: containerDiv }
    );

    // Step 0 -> Step 1
    fireEvent.click(screen.getByText(/Begin Symptom Triage/i));

    // Step 1: Select Histamine symptom
    fireEvent.click(screen.getByText(/Flushing, Hives & Sudden Warmth/i));
    fireEvent.click(screen.getByText(/Continue to Safety Check/i));

    // Step 2: Confirm no exclusions & proceed
    fireEvent.click(screen.getByText(/View Matched Protocols/i));

    // Step 4: Algorithmic Matcher shows Histamine Reset
    expect(screen.getByText(/Personalized Clinical Match/i)).toBeTruthy();
    expect(screen.getByText(/28-Day Histamine & Mast Cell Flare Hunt/i)).toBeTruthy();

    // Advance to Step 5 Baseline Calibration
    fireEvent.click(screen.getByText(/Calibrate & Commit/i));

    // Step 5: Baseline Severity slider and informed consent
    expect(screen.getByText(/Step 4 of 4: Baseline & Activation/i)).toBeTruthy();

    // Check informed consent button
    fireEvent.click(screen.getByText(/I understand this protocol is a structured/i));

    // Activate Reset button
    const activateBtn = screen.getByText(/Activate.*Reset/i);
    fireEvent.click(activateBtn);

    // Verify callback was called
    expect(mockOnComplete).toHaveBeenCalled();

    // Verify dual sync: both TriggerEngine and TrialWorkflowService have active trial
    const legacyTrial = getActiveTrial();
    expect(legacyTrial).not.toBeNull();
    expect(legacyTrial?.trialId).toBe('hunt_histamine');

    const canonicalTrial = getActiveTrialV2();
    expect(canonicalTrial).not.toBeNull();
    expect(canonicalTrial?.protocolId).toBe('hunt_histamine');
    expect(canonicalTrial?.intakeAssessment).toBeDefined();
    expect(canonicalTrial?.intakeAssessment?.symptoms).toContain('histamine');
    expect(canonicalTrial?.intakeAssessment?.matchedProtocolId).toBe('hunt_histamine');
  });

  it('allows browsing all protocols directly from onboarding', () => {
    render(
      <EliminationOnboardingWizard
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        onBrowseProtocols={mockOnBrowseProtocols}
      />,
      { container: containerDiv }
    );

    // Click Browse All Protocols in Step 0
    const browseBtn = screen.getByText(/Browse All 11 Protocols Instead/i);
    fireEvent.click(browseBtn);

    expect(mockOnBrowseProtocols).toHaveBeenCalled();
  });
});
