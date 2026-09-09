// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getEliminationProtocolState, saveEliminationProtocolState, getProfile } from '../ProfileEngine';
import { PROTOCOLS, ProtocolId } from '../../components/ui/EliminationProtocolSuite';

describe('EliminationProtocolSuite & Protocol State Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return initial clean elimination protocol state with no active protocol until user starts one', () => {
    const state = getEliminationProtocolState();
    expect(state).toBeDefined();
    expect(state.activeProtocolId).toBeNull();
    expect(state.protocols).toEqual({});
  });

  it('should save updated protocol state and dispatch hc_elimination_updated event', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    saveEliminationProtocolState('heartburn_hunt', {
      streakDays: 5,
      adherenceScore: 98,
      currentDay: 6,
    });

    const state = getEliminationProtocolState();
    expect(state.activeProtocolId).toBe('heartburn_hunt');
    expect(state.protocols.heartburn_hunt.streakDays).toBe(5);
    expect(state.protocols.heartburn_hunt.adherenceScore).toBe(98);

    const eliminationEvent = dispatchSpy.mock.calls.find(
      (call) => call[0] instanceof CustomEvent && (call[0] as CustomEvent).type === 'hc_elimination_updated'
    );
    expect(eliminationEvent).toBeDefined();

    dispatchSpy.mockRestore();
  });

  it('should verify all 4 clinical protocols have complete medical definitions', () => {
    const protocolIds: ProtocolId[] = ['bloating_hunt', 'heartburn_hunt', 'transit_hunt', 'vagal_hunt'];

    protocolIds.forEach((pId) => {
      const proto = PROTOCOLS[pId];
      expect(proto).toBeDefined();
      expect(proto.id).toBe(pId);
      expect(proto.name).toBeDefined();
      expect(proto.clinicalAuthority).toBeDefined();
      expect(proto.mechanism).toBeDefined();
      expect(proto.targetDurationDays).toBeGreaterThanOrEqual(14);
      expect(proto.phases.length).toBeGreaterThanOrEqual(2);
      expect(proto.forbiddenFoods.length).toBeGreaterThanOrEqual(4);
      expect(proto.safeSwaps.length).toBeGreaterThanOrEqual(3);
      expect(proto.dailyChecklist.length).toBe(4);
      expect(proto.symptomDrop.reductionPct).toBeGreaterThan(0);
    });
  });

  it('should verify forbidden foods have dangerous levels and clear clinical whys', () => {
    Object.values(PROTOCOLS).forEach((proto) => {
      proto.forbiddenFoods.forEach((food) => {
        expect(food.food).toBeDefined();
        expect(food.category).toBeDefined();
        expect(food.why.length).toBeGreaterThan(10);
        expect(['high', 'moderate']).toContain(food.dangerLevel);
      });
    });
  });
});
