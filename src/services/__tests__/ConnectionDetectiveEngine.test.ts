// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getConnectionStreams,
  getSpecialistDialogue,
  getClinicalMisses,
  getConnectionMapGraph,
  getDoctorDossier,
  getCausalCascadeStages,
  getSymptomCluster,
  getNodeDetail,
  evaluateSymptomCluster,
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

  it('generates multi-specialist consensus dialogue across 6 renowned chairs', () => {
    const dialogue = getSpecialistDialogue();
    expect(dialogue.length).toBeGreaterThanOrEqual(6);
    const roles = dialogue.map((d) => d.role);
    expect(roles).toContain('Cardiologist');
    expect(roles).toContain('Neurologist');
    expect(roles).toContain('Endocrinologist');
    expect(roles).toContain('Gastroenterologist');
    expect(roles).toContain('Immunologist');
    expect(roles).toContain('Clinic Director');

    dialogue.forEach((d) => {
      expect(d.doctorName).toBeDefined();
      expect(d.credentials).toBeDefined();
      expect(d.finding.length).toBeGreaterThan(15);
      expect(d.organ.length).toBeGreaterThan(2);
    });
  });

  it('extracts "What 15-Minute Visits Missed" cross-system gaps with hidden connections', () => {
    const misses = getClinicalMisses();
    expect(misses.length).toBeGreaterThanOrEqual(4);

    const primaryCareMiss = misses.find((m) => m.overlookedBy.includes('Primary Care'));
    expect(primaryCareMiss).toBeDefined();
    expect(primaryCareMiss?.whatWasMissed).toContain('Ferritin');
    expect(primaryCareMiss?.clinicalImpact).toBeDefined();
    expect(primaryCareMiss?.hiddenConnection).toBeDefined();
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

  it('provides a 5-stage sequential causal cascade simulator', () => {
    const stages = getCausalCascadeStages();
    expect(stages).toHaveLength(5);
    stages.forEach((stage, idx) => {
      expect(stage.stage).toBe(idx + 1);
      expect(stage.title.length).toBeGreaterThan(5);
      expect(stage.organSystem.length).toBeGreaterThan(3);
      expect(stage.mechanism.length).toBeGreaterThan(15);
      expect(stage.clinicalSigns.length).toBeGreaterThan(0);
      expect(stage.upstreamCause.length).toBeGreaterThan(5);
      expect(stage.downstreamEffect.length).toBeGreaterThan(5);
    });
  });

  it('provides 7 interactive symptom cluster items with involved boards', () => {
    const cluster = getSymptomCluster();
    expect(cluster.length).toBeGreaterThanOrEqual(7);
    cluster.forEach((item) => {
      expect(item.id).toBeDefined();
      expect(item.name.length).toBeGreaterThan(3);
      expect(item.commonMisattribution.length).toBeGreaterThan(5);
      expect(item.involvedBoards.length).toBeGreaterThan(0);
    });
  });

  it('evaluates symptom cluster cross-matching in real time', () => {
    const emptyResult = evaluateSymptomCluster([]);
    expect(emptyResult.matchConfidence).toBe(0);

    const evaluated = evaluateSymptomCluster(['symp_fatigue', 'symp_palpitations', 'symp_bloat']);
    expect(evaluated.matchConfidence).toBeGreaterThanOrEqual(85);
    expect(evaluated.summonedBoards.length).toBeGreaterThanOrEqual(3);
    expect(evaluated.summaryNote).toContain('Cross-referencing');
  });

  it('retrieves detailed node breakdown for conditions and symptoms', () => {
    const ferritinDetail = getNodeDetail('cond_ferritin');
    expect(ferritinDetail).toBeDefined();
    expect(ferritinDetail?.title).toBe('Subclinical Ferritin Depletion');
    expect(ferritinDetail?.biomarkers.length).toBeGreaterThan(0);
    expect(ferritinDetail?.dietaryTriggers.length).toBeGreaterThan(0);
    expect(ferritinDetail?.specialistQuote.doctor).toContain('Elena Chen');
    expect(ferritinDetail?.confirmatoryWorkup.length).toBeGreaterThan(0);

    const potsDetail = getNodeDetail('cond_pots');
    expect(potsDetail).toBeDefined();
    expect(potsDetail?.title).toContain('POTS');
    expect(potsDetail?.specialistQuote.doctor).toContain('Marcus Vance');
  });
});

