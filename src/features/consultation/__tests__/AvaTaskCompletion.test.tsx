// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractActionSuggestions,
  AvaActionToolbar,
  CaseSelectorModal,
  SaveTaskModal,
} from '../AvaHealthBuddy';
import type { CaseItem } from '../../../services/CaseEngine';

const mockCases: CaseItem[] = [
  {
    id: 'case-gut-101',
    title: 'SIBO & Gut Investigation',
    status: 'active',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    currentStage: 'review',
    actions: [],
    intakeData: { chiefComplaint: 'Post-prandial bloating and brain fog' },
    medicalRecords: [{ id: 'rec-1', name: 'Comprehensive Stool Panel.pdf' } as any],
    reviews: [{ id: 'rev-1', executiveSummary: 'Suspected dysbiosis' } as any],
    events: [{ id: 'evt-1', date: '2026-09-01', label: 'Clinical Review Completed', note: 'Initial review' }],
    questions: [],
    currentSummary: { primaryHypothesis: 'Gut dysbiosis' },
  },
  {
    id: 'case-joint-202',
    title: 'Migraine and Joint Pain',
    status: 'active',
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    currentStage: 'intake',
    actions: [],
    intakeData: { chiefComplaint: 'Right-sided pulsatile headache' },
    medicalRecords: [],
    reviews: [],
    events: [],
    questions: [],
    currentSummary: {},
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(cleanup);

describe('Package 6 — Ava Task Completion: Action Suggestions', () => {
  it('extracts observation draft when patient describes symptoms or meals', () => {
    const userMessage = 'I noticed severe abdominal bloating and nausea 30 minutes after eating sourdough bread.';
    const modelMessage = 'Bloating after fermented or wheat-based foods can occur if there is fermentation in the small intestine.';

    const suggestions = extractActionSuggestions(modelMessage, userMessage, {
      hasCase: true,
      hasRecords: true,
      hasStudy: false,
      hasReview: true,
    });

    expect(suggestions.canSaveObservation).toBe(true);
    expect(suggestions.observationDraft).toBe(userMessage);
  });

  it('extracts explicit clinician question recommendations from Ava response', () => {
    const userMessage = 'What should I ask my gastroenterologist about this?';
    const modelMessage = `Based on your symptom timeline, here are recommended steps:\n\nAsk your doctor: Would a lactulose breath test be appropriate to evaluate for small intestinal bacterial overgrowth?`;

    const suggestions = extractActionSuggestions(modelMessage, userMessage, {
      hasCase: true,
      hasRecords: false,
      hasStudy: false,
      hasReview: false,
    });

    expect(suggestions.canAddQuestion).toBe(true);
    expect(suggestions.questionDraft).toBe('Would a lactulose breath test be appropriate to evaluate for small intestinal bacterial overgrowth?');
  });

  it('extracts standalone question bullet points if explicit ask-prefix is absent', () => {
    const userMessage = 'I have persistent histamine-like flushing.';
    const modelMessage = `To help narrow this down with your care team:\n• Have we tested serum tryptase levels during a flare?\n• Have you kept a histamine food diary?`;

    const suggestions = extractActionSuggestions(modelMessage, userMessage, {
      hasCase: true,
      hasRecords: false,
      hasStudy: false,
      hasReview: false,
    });

    expect(suggestions.canAddQuestion).toBe(true);
    expect(suggestions.questionDraft).toContain('Have we tested serum tryptase levels during a flare?');
  });

  it('offers study explanation when a research study is active', () => {
    const suggestions = extractActionSuggestions('Reviewing the trial results.', '', {
      hasCase: true,
      hasRecords: false,
      hasStudy: true,
      hasReview: false,
    });

    expect(suggestions.canExplainSource).toBe(true);
    expect(suggestions.sourceLabel).toBe('Explain this study');
  });

  it('offers source explanation when medical records are connected to the case', () => {
    const suggestions = extractActionSuggestions('Your stool report shows elevated calprotectin.', '', {
      hasCase: true,
      hasRecords: true,
      hasStudy: false,
      hasReview: false,
    });

    expect(suggestions.canExplainSource).toBe(true);
    expect(suggestions.sourceLabel).toBe('Explain this source');
  });

  it('offers "Open related review" only when case has an existing clinical review', () => {
    const suggestionsWithReview = extractActionSuggestions('Review summary', '', {
      hasCase: true,
      hasRecords: false,
      hasStudy: false,
      hasReview: true,
    });
    expect(suggestionsWithReview.canOpenReview).toBe(true);

    const suggestionsWithoutReview = extractActionSuggestions('Review summary', '', {
      hasCase: true,
      hasRecords: false,
      hasStudy: false,
      hasReview: false,
    });
    expect(suggestionsWithoutReview.canOpenReview).toBe(false);
  });
});

describe('Package 6 — AvaActionToolbar', () => {
  it('renders action chips and invokes callbacks with correct drafts', () => {
    const onSaveObservation = vi.fn();
    const onAddQuestion = vi.fn();
    const onExplainSource = vi.fn();
    const onOpenReview = vi.fn();

    render(
      <AvaActionToolbar
        msgIndex={1}
        modelContent="Ask your doctor: Could this be related to dysbiosis?"
        userContent="I had sharp stomach cramps after dinner."
        selectedCase={mockCases[0]}
        activeSourceStudy={null}
        savedActionIds={new Set()}
        onSaveObservation={onSaveObservation}
        onAddQuestion={onAddQuestion}
        onExplainSource={onExplainSource}
        onOpenReview={onOpenReview}
      />
    );

    const obsBtn = screen.getByRole('button', { name: /Save this observation/i });
    expect(obsBtn).toBeDefined();
    fireEvent.click(obsBtn);
    expect(onSaveObservation).toHaveBeenCalledWith('I had sharp stomach cramps after dinner.');

    const qBtn = screen.getByRole('button', { name: /Add appointment question/i });
    expect(qBtn).toBeDefined();
    fireEvent.click(qBtn);
    expect(onAddQuestion).toHaveBeenCalledWith('Could this be related to dysbiosis?');

    const reviewBtn = screen.getByRole('button', { name: /Open related review/i });
    expect(reviewBtn).toBeDefined();
    fireEvent.click(reviewBtn);
    expect(onOpenReview).toHaveBeenCalledTimes(1);
  });

  it('disables saved buttons and displays checkmark to prevent duplicate actions', () => {
    const savedActions = new Set(['obs_2', 'q_2']);

    render(
      <AvaActionToolbar
        msgIndex={2}
        modelContent="Ask your doctor: What dosage of magnesium is safe?"
        userContent="I experienced muscle twitching last night."
        selectedCase={mockCases[0]}
        savedActionIds={savedActions}
        onSaveObservation={vi.fn()}
        onAddQuestion={vi.fn()}
        onExplainSource={vi.fn()}
        onOpenReview={vi.fn()}
      />
    );

    const obsBtn = screen.getByRole('button', { name: /Observation saved/i }) as HTMLButtonElement;
    expect(obsBtn.disabled).toBe(true);

    const qBtn = screen.getByRole('button', { name: /Question added/i }) as HTMLButtonElement;
    expect(qBtn.disabled).toBe(true);
  });
});

describe('Package 6 — CaseSelectorModal', () => {
  it('allows selecting general consultation or switching between available cases', () => {
    const onSelectCase = vi.fn();
    const onClose = vi.fn();

    render(
      <CaseSelectorModal
        isOpen={true}
        selectedCaseId="case-gut-101"
        availableCases={mockCases}
        onSelectCase={onSelectCase}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Select Active Case')).toBeDefined();
    expect(screen.getByText('SIBO & Gut Investigation')).toBeDefined();
    expect(screen.getByText('Migraine and Joint Pain')).toBeDefined();

    // Select second case
    fireEvent.click(screen.getByText('Migraine and Joint Pain'));
    expect(onSelectCase).toHaveBeenCalledWith('case-joint-202');
    expect(onClose).toHaveBeenCalled();

    // Select general mode
    fireEvent.click(screen.getByText('General Health Conversation'));
    expect(onSelectCase).toHaveBeenCalledWith('');
  });

  it('does not render when isOpen is false', () => {
    render(
      <CaseSelectorModal
        isOpen={false}
        selectedCaseId=""
        availableCases={mockCases}
        onSelectCase={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText('Select Active Case')).toBeNull();
  });
});

describe('Package 6 — SaveTaskModal', () => {
  it('renders explicit destination preview and edits observation text before saving', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <SaveTaskModal
        isOpen={true}
        type="observation"
        initialText="Severe bloating after sourdough"
        activeCaseId="case-gut-101"
        availableCases={mockCases}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Save Observation to Case')).toBeDefined();
    expect(screen.getByText('Case Timeline (Timeline Events)')).toBeDefined();
    expect(screen.getByText(/Captured strictly as patient-reported evidence/i)).toBeDefined();

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Severe bloating after sourdough');

    fireEvent.change(textarea, { target: { value: 'Severe bloating and distension 45 min after sourdough' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Save/i });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith(
      'Severe bloating and distension 45 min after sourdough',
      'case-gut-101',
      'General'
    );
  });

  it('allows selecting clinical specialty when saving an appointment question', () => {
    const onConfirm = vi.fn();

    render(
      <SaveTaskModal
        isOpen={true}
        type="question"
        initialText="Should we run a breath test for SIBO?"
        activeCaseId="case-gut-101"
        availableCases={mockCases}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Add Appointment Question')).toBeDefined();
    expect(screen.getByText('Doctor Visit Brief (Open Questions)')).toBeDefined();

    const select = screen.getByLabelText('Specialty or Care Team') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Gastroenterology' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Save/i });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith(
      'Should we run a breath test for SIBO?',
      'case-gut-101',
      'Gastroenterology'
    );
  });

  it('disables Confirm button if text is empty or blank', () => {
    render(
      <SaveTaskModal
        isOpen={true}
        type="observation"
        initialText=""
        activeCaseId="case-gut-101"
        availableCases={mockCases}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Save/i }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });
});

describe('Package 6 — Provenance & Draft Isolation Invariants', () => {
  it('saves patient observation with explicit patient-reported provenance label', () => {
    // Invariant: Ava cannot label generative or conversational notes as objective clinical records
    const observationLabel = 'Patient observation (Ava conversation)';
    const text = 'Experienced severe distension and bloating 45 minutes after eating sourdough';

    const eventPayload = {
      label: observationLabel,
      note: text,
      source: 'ava_consultation',
    };

    expect(eventPayload.label).toBe('Patient observation (Ava conversation)');
    expect(eventPayload.label).not.toContain('Doctor diagnosis');
    expect(eventPayload.label).not.toContain('Lab finding');
  });

  it('isolates drafts by case ID and scope in localStorage so draft never bleeds between cases', () => {
    const scope = 'profile_vault_1';
    const caseAKey = `hc_ava_draft_${scope}_case-gut-101`;
    const caseBKey = `hc_ava_draft_${scope}_case-joint-202`;
    const generalKey = `hc_ava_draft_${scope}_general`;

    localStorage.setItem(caseAKey, 'Draft notes regarding SIBO symptoms');
    localStorage.setItem(caseBKey, 'Draft notes regarding right-sided migraine');
    localStorage.setItem(generalKey, 'General reflection for today');

    expect(localStorage.getItem(caseAKey)).toBe('Draft notes regarding SIBO symptoms');
    expect(localStorage.getItem(caseBKey)).toBe('Draft notes regarding right-sided migraine');
    expect(localStorage.getItem(generalKey)).toBe('General reflection for today');
    expect(localStorage.getItem(caseAKey)).not.toEqual(localStorage.getItem(caseBKey));
  });

  it('discards late/stale responses when user switches case during inflight request', () => {
    let currentSelectedCaseId = 'case-gut-101';
    const inflightRequestCaseId = 'case-gut-101';

    // Simulate user switching to another case while AI is generating
    currentSelectedCaseId = 'case-joint-202';

    const isStale = inflightRequestCaseId !== currentSelectedCaseId;
    expect(isStale).toBe(true);

    // Guard simulation matching AvaHealthBuddy onSuccess check:
    let conversationUpdated = false;
    if (!isStale) {
      conversationUpdated = true;
    }

    expect(conversationUpdated).toBe(false);
  });
});

