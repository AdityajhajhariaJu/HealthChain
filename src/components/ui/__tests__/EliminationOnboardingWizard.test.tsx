// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getActiveTrialV2 } from '../../../services/TrialWorkflowService';
import { getActiveTrial } from '../../../services/TriggerEngine';
import { EliminationOnboardingWizard } from '../EliminationOnboardingWizard';

describe('truthful Gut Health onboarding', () => {
  const onComplete = vi.fn();
  const onOpenGutHealth = vi.fn();
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it('lets an unsure person finish with observation without inventing a trial or severity', () => {
    render(
      <EliminationOnboardingWizard onComplete={onComplete} onOpenGutHealth={onOpenGutHealth} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'I am not sure yet' }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(screen.getByRole('button', { name: /See my next step/i }).hasAttribute('disabled')).toBe(
      true
    );
    fireEvent.click(screen.getByLabelText('None of these apply'));
    fireEvent.click(screen.getByRole('button', { name: /See my next step/i }));
    expect(screen.getByText(/begin without guessing a food cause/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Open Gut Health/i }));
    expect(onOpenGutHealth).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
    expect(getActiveTrial()).toBeNull();
    expect(getActiveTrialV2()).toBeNull();
    expect(screen.queryByText(/\d+% fit/i)).toBeNull();
  });

  it('routes unresolved celiac concern to clinician discussion before dietary restriction', () => {
    render(
      <EliminationOnboardingWizard onComplete={onComplete} onOpenGutHealth={onOpenGutHealth} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Bloating or abdominal discomfort/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    fireEvent.click(screen.getByLabelText(/Celiac disease is possible/i));
    fireEvent.click(screen.getByRole('button', { name: /See my next step/i }));
    expect(screen.getByText(/ask about testing before removing gluten/i)).toBeTruthy();
    expect(getActiveTrial()).toBeNull();
    expect(getActiveTrialV2()).toBeNull();
  });
});
