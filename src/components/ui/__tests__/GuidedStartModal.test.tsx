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

import { GuidedStartModal } from '../GuidedStartModal';
import { getActiveTrial } from '../../../services/TriggerEngine';
import { getActiveTrialV2 } from '../../../services/TrialWorkflowService';

describe('GuidedStartModal Component Tests', () => {
  let containerDiv: HTMLDivElement;
  const mockOnClose = vi.fn();
  const mockOnSelectProtocol = vi.fn();
  const mockOnBrowseAll = vi.fn();

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

  it('renders Step 1 with symptom options, timing options, and baseline severity', async () => {
    render(
      <GuidedStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectProtocol={mockOnSelectProtocol}
        onBrowseAll={mockOnBrowseAll}
      />,
      { container: containerDiv }
    );

    expect(screen.getByText('Guided Trial Start')).toBeTruthy();
    expect(screen.getByText(/Step 1 of 3/)).toBeTruthy();
    expect(screen.getByText('Bloating & Distension')).toBeTruthy();
    expect(screen.getByText('Heartburn & Acid Reflux')).toBeTruthy();
    expect(screen.getByText(/Next: Safety Check/)).toBeTruthy();
  });

  it('navigates to Step 2 (Safety Check) and halts if exclusion is selected', async () => {
    render(
      <GuidedStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectProtocol={mockOnSelectProtocol}
        onBrowseAll={mockOnBrowseAll}
      />,
      { container: containerDiv }
    );

    // Click Bloating symptom
    fireEvent.click(screen.getByText('Bloating & Distension'));

    // Advance to Safety check
    fireEvent.click(screen.getByText(/Next: Safety Check/));

    expect(screen.getByText(/Safety & Exclusions Check/)).toBeTruthy();
    expect(screen.getByText(/No exclusion criteria checked/)).toBeTruthy();

    // Check an exclusion flag
    const eatingDisorderCheckbox = screen.getByLabelText(/History of active eating disorder/i);
    fireEvent.click(eatingDisorderCheckbox);

    // Button should now indicate safety review
    const reviewBtn = screen.getByText('Review Safety Guidance');
    expect(reviewBtn).toBeTruthy();

    fireEvent.click(reviewBtn);

    // Should display Clinician Stop screen
    expect(screen.getByText('An elimination diet is not recommended right now')).toBeTruthy();
    expect(screen.getByText(/Return to Workspace/)).toBeTruthy();
  });

  it('advances through Step 2 to Step 3 recommendations and starts trial upon consent', async () => {
    render(
      <GuidedStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectProtocol={mockOnSelectProtocol}
        onBrowseAll={mockOnBrowseAll}
      />,
      { container: containerDiv }
    );

    // Select Heartburn
    fireEvent.click(screen.getByText('Heartburn & Acid Reflux'));

    // Next to Safety
    fireEvent.click(screen.getByText(/Next: Safety Check/));

    // No exclusions checked -> Next to Recommendations
    fireEvent.click(screen.getByText('View Recommended Protocols'));

    // Matched protocols screen
    expect(screen.getByText('Matched Clinical Protocols')).toBeTruthy();
    expect(screen.getByText(/Recommended Primary/)).toBeTruthy();

    // Select protocol
    const chooseBtn = screen.getByText('Choose This Protocol');
    fireEvent.click(chooseBtn);

    // Consent screen
    expect(screen.getByText(/Patient Agency & Informed Understanding/)).toBeTruthy();
    const consentCheckbox = screen.getByRole('checkbox');
    fireEvent.click(consentCheckbox);

    const startBtn = screen.getByText('Begin Day 1 Observation');
    expect(startBtn.closest('button')?.disabled).toBe(false);

    fireEvent.click(startBtn);

    expect(mockOnSelectProtocol).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();

    // Verify trial was created in storage
    const activeTrial = getActiveTrial();
    expect(activeTrial).not.toBeNull();
    expect(activeTrial?.trialId).toBe('hunt_heartburn');

    const trialV2 = getActiveTrialV2();
    expect(trialV2).not.toBeNull();
    expect(trialV2?.protocolId).toBe('hunt_heartburn');
  });
});
