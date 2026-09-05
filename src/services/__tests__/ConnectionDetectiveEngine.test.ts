// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getConnectionStreams,
  getSpecialistDialogue,
  getClinicalMisses,
  getConnectionMapGraph,
  getDoctorDossier,
} from '../ConnectionDetectiveEngine';

describe('ConnectionDetectiveEngine', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns all 4 converging streams (labs, notes, vitals, diet)', () => {
    const streams = getConnectionStreams();
    expect(streams).toHaveLength(4);
    const ids = streams.map((s) => s.id);
    expect(ids).toContain('labs');
    expect(ids).toContain('notes');
    expect(ids).toContain('vitals');
    expect(ids).toContain('diet');

    const labsStream = streams.find((s) => s.id === 'labs');
    expect(labsStream?.count).toBeGreaterThanOrEqual(1);
    expect(labsStream?.items.length).toBeGreaterThan(0);
  });

  it('generates multi-specialist consensus dialogue across 4 specialties', () => {
    const dialogue = getSpecialistDialogue();
    expect(dialogue.length).toBeGreaterThanOrEqual(4);
    const roles = dialogue.map((d) => d.role);
    expect(roles).toContain('Cardiologist');
    expect(roles).toContain('Neurologist');
    expect(roles).toContain('Endocrinologist');
    expect(roles).toContain('Gastroenterologist');

    dialogue.forEach((d) => {
      expect(d.finding.length).toBeGreaterThan(15);
      expect(d.organ.length).toBeGreaterThan(2);
    });
  });

  it('extracts "What 15-Minute Visits Missed" cross-system gaps', () => {
    const misses = getClinicalMisses();
    expect(misses.length).toBeGreaterThanOrEqual(3);

    const primaryCareMiss = misses.find((m) => m.overlookedBy.includes('Primary Care'));
    expect(primaryCareMiss).toBeDefined();
    expect(primaryCareMiss?.whatWasMissed).toContain('Ferritin');
    expect(primaryCareMiss?.clinicalImpact).toBeDefined();
  });

  it('generates a valid connection map graph topology', () => {
    const graph = getConnectionMapGraph();
    expect(graph.centralSymptoms.length).toBeGreaterThan(0);
    expect(graph.conditions.length).toBeGreaterThan(0);
    expect(graph.connections.length).toBeGreaterThan(0);
    expect(graph.precautions.length).toBeGreaterThan(0);

    const symptomIds = new Set(graph.centralSymptoms.map((s) => s.id));
    const conditionIds = new Set(graph.conditions.map((c) => c.id));
    const allNodeIds = new Set([...symptomIds, ...conditionIds]);

    graph.connections.forEach((conn) => {
      expect(allNodeIds.has(conn.from)).toBe(true);
      expect(allNodeIds.has(conn.to)).toBe(true);
    });
  });

  it('compiles a complete physician SBAR dossier with ICD-10 and citations', () => {
    const dossier = getDoctorDossier();
    expect(dossier.sbar.situation).toBeDefined();
    expect(dossier.sbar.background).toBeDefined();
    expect(dossier.sbar.assessment).toBeDefined();
    expect(dossier.sbar.recommendation).toBeDefined();

    expect(dossier.testsToOrder.length).toBeGreaterThanOrEqual(3);
    expect(dossier.icdCodes.length).toBeGreaterThanOrEqual(3);
    expect(dossier.citations.length).toBeGreaterThanOrEqual(2);

    dossier.icdCodes.forEach((item) => {
      expect(item.code).toMatch(/^[A-Z][0-9]+/);
    });
  });
});
