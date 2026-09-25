// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GutSourceRecord } from '../GutSourceRecord';
import { GutBacktraceTimeline } from '../GutBacktraceTimeline';
import type { GutMeal } from '../../../services/GutHealthSummary';
import type { GutBacktraceProjection } from '../../../services/GutResolutionService';

afterEach(cleanup);

const meals: GutMeal[] = [
  { id: 'meal-a', name: 'Breakfast', date: '2026-09-24', time: null, reaction: null },
  { id: 'meal-b', name: 'Lunch', date: '2026-09-24', time: null, reaction: 'Bloating' },
];

describe('Gut source record navigation', () => {
  it('opens the selected meal rather than another meal from the same date', () => {
    render(<GutSourceRecord source={{ sourceKind: 'diet_meal', sourceId: 'meal-b', localDate: '2026-09-24' }} meals={meals} days={[]} onBack={vi.fn()} onOpenDate={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Lunch' })).toBeTruthy();
    expect(screen.getByText('Bloating')).toBeTruthy();
    expect(screen.queryByText('Breakfast')).toBeNull();
    expect(screen.getByText('meal-b')).toBeTruthy();
  });

  it('does not substitute a same-date record when the source is missing', () => {
    render(<GutSourceRecord source={{ sourceKind: 'diet_meal', sourceId: 'deleted-meal', localDate: '2026-09-24' }} meals={meals} days={[]} onBack={vi.fn()} onOpenDate={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('no longer available');
    expect(screen.queryByText('Breakfast')).toBeNull();
    expect(screen.queryByText('Lunch')).toBeNull();
  });

  it('passes the exact source identity from a backtrace item', () => {
    const onOpenSource = vi.fn();
    const projection: GutBacktraceProjection = {
      anchorTimestamp: '2026-09-25T12:00:00.000Z', anchorType: 'question_time', anchorTimezone: 'UTC', windowHours: 48,
      timedItems: [{ id: 'timed-meal-b', kind: 'meal', label: 'Lunch', occurredAt: '2026-09-24T12:00:00.000Z', localDate: '2026-09-24', hoursPrior: 24, timePrecision: 'exact', timeMeaning: 'user_reported_occurrence', sourceKind: 'diet_meal', sourceId: 'meal-b', revision: null, reportedAt: null }],
      dateOnlyItems: [], summary: 'One record', caveat: 'Timing does not prove causation.',
    };
    render(<GutBacktraceTimeline projection={projection} onOpenSource={onOpenSource} />);
    fireEvent.click(screen.getByRole('button', { name: /Open source record/i }));
    expect(onOpenSource).toHaveBeenCalledWith({ sourceKind: 'diet_meal', sourceId: 'meal-b', localDate: '2026-09-24' });
  });
});
