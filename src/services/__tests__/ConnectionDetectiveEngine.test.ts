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
  getFunctionalBiomarkers,
  getKineticChainPathways,
  getClinicalProfilePresets,
  saveFunctionalBiomarkers,
  resetFunctionalBiomarkers,
  computeBiomarkerStatus,
  getConnectionDetectiveReport,
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

  it('generates multi-specialist consensus dialogue across 6 clinical disciplines', () => {
    const dialogue = getSpecialistDialogue();
    expect(dialogue.length).toBeGreaterThanOrEqual(6);
    const roles = dialogue.map((d) => d.role);
    expect(roles.some((r) => r.includes('Cardiology'))).toBe(true);
    expect(roles.some((r) => r.includes('Neurology'))).toBe(true);
    expect(roles.some((r) => r.includes('Endocrinology'))).toBe(true);
    expect(roles.some((r) => r.includes('Gastroenterology'))).toBe(true);
    expect(roles.some((r) => r.includes('Immunology'))).toBe(true);

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

  it('retrieves detailed node breakdown for conditions and symptoms including dural kinetic axis', () => {
    const ferritinDetail = getNodeDetail('cond_ferritin');
    expect(ferritinDetail).toBeDefined();
    expect(ferritinDetail?.title).toBe('Subclinical Ferritin Depletion');
    expect(ferritinDetail?.biomarkers.length).toBeGreaterThan(0);
    expect(ferritinDetail?.dietaryTriggers.length).toBeGreaterThan(0);
    expect(ferritinDetail?.specialistQuote.doctor).toContain('Endocrine');
    expect(ferritinDetail?.confirmatoryWorkup.length).toBeGreaterThan(0);

    const potsDetail = getNodeDetail('cond_pots');
    expect(potsDetail).toBeDefined();
    expect(potsDetail?.title).toContain('POTS');
    expect(potsDetail?.specialistQuote.doctor).toContain('Cardiology');

    const duralDetail = getNodeDetail('cond_dural_kinetic');
    expect(duralDetail).toBeDefined();
    expect(duralDetail?.title).toContain('Ascending Craniosacral Dural Traction');

    const backDetail = getNodeDetail('symp_back');
    expect(backDetail).toBeDefined();
    expect(backDetail?.biochemicalMechanism).toContain('Sacroiliac pelvic torsion');
  });

  it('detects Craniosacral Dural Kinetic Axis when lower back and headache are selected together', () => {
    const result = evaluateSymptomCluster(['symp_back', 'symp_headache']);
    expect(result.summaryNote).toContain('Craniosacral Dural Kinetic Axis');
    expect(result.summaryNote).toContain('Greater Occipital Nerve');
  });

  it('provides 20 dual-band functional lab biomarkers with optimal vs hospital cutoff ranges', () => {
    const biomarkers = getFunctionalBiomarkers();
    expect(biomarkers).toHaveLength(20);

    const ferritin = biomarkers.find((b: any) => b.id === 'ferritin')!;
    expect(ferritin).toBeDefined();
    expect(ferritin.standardRange.max).toBe(150);
    expect(ferritin.optimalRange.min).toBe(50);
    expect(ferritin.whyDoctorsMissIt).toBeDefined();
    expect(ferritin.actionableDietaryCofactors.length).toBeGreaterThan(0);

    const tsh = biomarkers.find((b: any) => b.id === 'tsh')!;
    expect(tsh).toBeDefined();
    expect(tsh.optimalRange.max).toBe(2.0);

    const dao = biomarkers.find((b: any) => b.id === 'dao_activity')!;
    expect(dao).toBeDefined();
    expect(dao.status).toBe('critical_low');

    const tsat = biomarkers.find((b: any) => b.id === 'tsat')!;
    expect(tsat).toBeDefined();
    expect(tsat.optimalRange.min).toBe(25);

    const apob = biomarkers.find((b: any) => b.id === 'apob')!;
    expect(apob).toBeDefined();
    expect(apob.optimalRange.max).toBe(70);

    const mma = biomarkers.find((b: any) => b.id === 'mma')!;
    expect(mma).toBeDefined();
    expect(mma.optimalRange.max).toBe(0.20);
  });

  it('provides 8 multi-system kinetic chain pathways with step-by-step biomechanical referral and 3-minute releases', () => {
    const pathways = getKineticChainPathways();
    expect(pathways).toHaveLength(8);

    const craniosacral = pathways.find((p: any) => p.id === 'chain_craniosacral')!;
    expect(craniosacral).toBeDefined();
    expect(craniosacral.pathwaySteps.length).toBe(4);
    expect(craniosacral.palpationSign).toBeDefined();
    expect(craniosacral.correctiveProtocol.durationSeconds).toBe(180);
    expect(craniosacral.correctiveProtocol.steps.length).toBeGreaterThanOrEqual(3);

    const techneck = pathways.find((p: any) => p.id === 'chain_techneck_vagus')!;
    expect(techneck).toBeDefined();
    expect(techneck.primarySymptom).toContain('Palpitations');

    const pots = pathways.find((p: any) => p.id === 'chain_diaphragmatic_pots')!;
    expect(pots).toBeDefined();
    expect(pots.primarySymptom).toContain('POTS');

    const thoracic = pathways.find((p: any) => p.id === 'chain_thoracic_outlet')!;
    expect(thoracic).toBeDefined();
    expect(thoracic.primarySymptom).toContain('Cold Hands');

    const psoas = pathways.find((p: any) => p.id === 'chain_psoas_splanchnic')!;
    expect(psoas).toBeDefined();
    expect(psoas.primarySymptom).toContain('Hypersensitivity');

    const stellate = pathways.find((p: any) => p.id === 'chain_cervicothoracic_sympathetic')!;
    expect(stellate).toBeDefined();
    expect(stellate.primarySymptom).toContain('Adrenaline');
  });

  it('provides clinical profile simulation presets for rapid telemetry switching', () => {
    const presets = getClinicalProfilePresets();
    expect(presets.length).toBeGreaterThanOrEqual(3);

    const baseline = presets.find((p) => p.id === 'profile_baseline')!;
    expect(baseline).toBeDefined();
    expect(baseline.biomarkerValues['ferritin']).toBe(14);
    expect(baseline.biomarkerValues['tsh']).toBe(3.2);
  });

  it('persists customized functional biomarkers and dynamically updates status', () => {
    // Override Ferritin to an optimal value of 75 ng/mL
    saveFunctionalBiomarkers({ ferritin: 75, tsh: 1.5 });

    const updated = getFunctionalBiomarkers();
    const ferritin = updated.find((b) => b.id === 'ferritin')!;
    expect(ferritin.userValue).toBe(75);
    expect(ferritin.status).toBe('optimal');

    const tsh = updated.find((b) => b.id === 'tsh')!;
    expect(tsh.userValue).toBe(1.5);
    expect(tsh.status).toBe('optimal');

    // Verify report reflects the live biomarker values
    const report = getConnectionDetectiveReport();
    const labsStream = report.streams.find((s) => s.id === 'labs')!;
    expect(labsStream.items[0]).toContain('Serum Ferritin: 75 ng/mL');
    expect(labsStream.items[0]).toContain('Optimal bone marrow storage');
    expect(report.nodeDetails['cond_ferritin'].biomarkers[0].userValue).toBe('75 ng/mL');
    expect(report.nodeDetails['cond_ferritin'].biomarkers[0].status).toBe('normal');

    // Reset restores the original baseline
    resetFunctionalBiomarkers();
    const restored = getFunctionalBiomarkers();
    const restoredFerritin = restored.find((b) => b.id === 'ferritin')!;
    expect(restoredFerritin.userValue).toBe(14);
    expect(restoredFerritin.status).toBe('suboptimal_low');
  });

  it('accurately computes dual-band status categories across the clinical spectrum', () => {
    const sample = getFunctionalBiomarkers()[0]; // Ferritin: standard 12-150, optimal 50-90
    expect(computeBiomarkerStatus(sample, 8)).toBe('critical_low');
    expect(computeBiomarkerStatus(sample, 25)).toBe('suboptimal_low');
    expect(computeBiomarkerStatus(sample, 65)).toBe('optimal');
    expect(computeBiomarkerStatus(sample, 120)).toBe('suboptimal_high');
    expect(computeBiomarkerStatus(sample, 220)).toBe('critical_high');
  });
});



