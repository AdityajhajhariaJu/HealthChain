// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ observations: vi.fn() }));
vi.mock('../HealthObservationService', () => ({ listObservationHistory: state.observations }));
vi.mock('../GutHealthSummary', () => ({ getGutSnapshot: () => ({ days: [], meals: [], undatedMealObservations: [], digestionDateCount: 0 }), mergeGutSnapshotWithObservations: (base: any) => base, formatGutVisitNote: () => '', summarizeRecordedBloating: () => ({}) }));
vi.mock('../../components/ui/GutDailyHome', () => ({ GutDailyHome: ({ observations }: any) => <div data-testid="observations">{observations.map((item: any) => item.id).join(',')}</div> }));
vi.mock('../../components/ui/GutResolutionWorkspace', () => ({ GutResolutionWorkspace: () => null }));
vi.mock('../../components/ui/QuickMealIntakeSheet', () => ({ QuickMealIntakeSheet: () => null }));
vi.mock('../../components/ui/DigestionCalendarHeatmap', () => ({ DigestionCalendarHeatmap: () => null }));
vi.mock('../../components/ui/GutSourceRecord', () => ({ GutSourceRecord: () => null }));
vi.mock('../../components/ui/GutLinkStrip', () => ({ GutLinkStrip: () => null }));
import { GutHealthModal } from '../../components/ui/GutHealthModal';
afterEach(cleanup);
it('rejects the previous owner observation read after an account change', async () => {
  localStorage.clear(); localStorage.setItem('hc_account',JSON.stringify({id:'gut-owner-a'}));
  let resolveOld!: (value: any[]) => void;
  state.observations.mockReturnValueOnce(new Promise(resolve => { resolveOld=resolve; })).mockResolvedValue([{id:'owner-b-record'}]);
  render(<GutHealthModal isOpen onClose={() => {}} />);
  await vi.waitFor(() => expect(state.observations).toHaveBeenCalledTimes(1));
  localStorage.setItem('hc_account',JSON.stringify({id:'gut-owner-b'}));
  await act(async () => window.dispatchEvent(new Event('hc_profile_updated')));
  await vi.waitFor(() => expect(screen.getByTestId('observations').textContent).toBe('owner-b-record'));
  await act(async () => resolveOld([{id:'private-owner-a-record'}]));
  expect(screen.getByTestId('observations').textContent).toBe('owner-b-record');
});
