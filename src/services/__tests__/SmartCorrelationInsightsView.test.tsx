// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SmartCorrelationInsightsView } from '../../components/ui/SmartCorrelationInsightsView';
import { getDigestionLogs, saveDigestionLog } from '../ProfileEngine';

describe('Descriptive food observations', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('shows no benchmark foods or invented comparisons with an empty record', () => {
    render(<SmartCorrelationInsightsView />);
    expect(screen.getByText(/No repeated patterns yet/i)).toBeTruthy();
    expect(screen.queryByText(/Eggs benedict|Spinach dip|4\/4 day match/i)).toBeNull();
  });

  it('keeps a saved digestion entry as a real dated observation', () => {
    saveDigestionLog('2026-09-07', { stomachScore: 6, bloatingScore: 7, bristolType: 3 });
    const logs = getDigestionLogs();
    expect(logs['2026-09-07']?.bloatingScore).toBe(7);
    expect(logs['2026-09-07']?.bristolType).toBe(3);
  });
});
