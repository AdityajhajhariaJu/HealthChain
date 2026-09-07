// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDigestionLogs, saveDigestionLog, getProfile } from '../ProfileEngine';
import { BRISTOL_STOOL_INFO, STOMACH_COMFORT_INFO } from '../../components/ui/DigestionCalendarHeatmap';

describe('DigestionCalendarHeatmap & Digestion Logs Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save and retrieve a digestion log entry for a specific date', () => {
    const testDate = '2026-05-24';
    const logData = {
      equilibriumScore: 92,
      status: 'optimal' as const,
      stomachComfort: 'calm' as const,
      stomachScore: 1,
      bloatingScore: 1,
      distensionPattern: 'flat_all_day' as const,
      bristolType: 4 as const,
      bowelFrequency: 1,
    };

    saveDigestionLog(testDate, logData);

    const allLogs = getDigestionLogs();
    expect(allLogs[testDate]).toBeDefined();
    expect(allLogs[testDate].equilibriumScore).toBe(92);
    expect(allLogs[testDate].status).toBe('optimal');
    expect(allLogs[testDate].bristolType).toBe(4);
    expect(allLogs[testDate].bloatingScore).toBe(1);
  });

  it('should dispatch hc_digestion_updated event with correct payload on save', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const testDate = '2026-05-25';

    saveDigestionLog(testDate, {
      equilibriumScore: 35,
      status: 'severe_flare',
      stomachComfort: 'severe_burning',
      stomachScore: 8,
      bloatingScore: 8,
      bristolType: 2,
    });

    const digestionEvent = dispatchSpy.mock.calls.find(
      (call) => call[0] instanceof CustomEvent && (call[0] as CustomEvent).type === 'hc_digestion_updated'
    );
    expect(digestionEvent).toBeDefined();

    const customEvt = digestionEvent?.[0] as CustomEvent;
    expect(customEvt.detail.dateKey).toBe(testDate);
    expect(customEvt.detail.logData.status).toBe('severe_flare');
    expect(customEvt.detail.logData.bloatingScore).toBe(8);

    dispatchSpy.mockRestore();
  });

  it('should verify all 7 Bristol Stool types have complete clinical definitions', () => {
    for (let type = 1; type <= 7; type++) {
      const info = BRISTOL_STOOL_INFO[type as keyof typeof BRISTOL_STOOL_INFO];
      expect(info).toBeDefined();
      expect(info.type).toBe(type);
      expect(info.label).toContain(`Type ${type}`);
      expect(info.sublabel).toBeDefined();
      expect(info.clinicalNote).toBeDefined();
      expect(info.badgeColor).toBeDefined();
      expect(info.icon).toBeDefined();
    }
  });

  it('should verify all upper GI stomach comfort levels have clinical icons and palettes', () => {
    const levels = ['calm', 'mild_acid', 'moderate_reflux', 'severe_burning', 'nausea'] as const;
    levels.forEach((lvl) => {
      const sInfo = STOMACH_COMFORT_INFO[lvl];
      expect(sInfo).toBeDefined();
      expect(sInfo.label).toBeDefined();
      expect(sInfo.icon).toBeDefined();
      expect(sInfo.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
