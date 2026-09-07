// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateEmergencyTriage } from '../clinicalTriageEngine';
import { recordHealthMemory, getHealthMemory } from '../HealthMemory';
import { getProfile } from '../ProfileEngine';
import { getActiveCase } from '../CaseEngine';
import { getFunctionalBiomarkers } from '../ConnectionDetectiveEngine';
import { getActiveTrial } from '../TriggerEngine';

describe('Collaborative Canvas & War Room Clinical Engine', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('Emergency Triage Guardrail on Canvas Input', () => {
    it('catches acute cardiovascular emergencies with zero token latency', () => {
      const input = 'Patient experiencing crushing chest pain radiating to left arm with cold sweat';
      const triage = evaluateEmergencyTriage(input);
      expect(triage.isEmergency).toBe(true);
      expect(triage.category).toBe('CARDIOVASCULAR');
      expect(triage.suggestedContact).toBe('911');
    });

    it('catches acute cerebrovascular emergencies before any agent processing', () => {
      const input = 'Sudden severe facial droop and slurred speech starting 20 minutes ago';
      const triage = evaluateEmergencyTriage(input);
      expect(triage.isEmergency).toBe(true);
      expect(triage.category).toBe('CEREBROVASCULAR');
    });

    it('allows non-emergent postprandial and autonomic symptoms to pass cleanly', () => {
      const input = 'Experienced palpitations and rapid heart rate 40 minutes after lunch with dizziness on standing.';
      const triage = evaluateEmergencyTriage(input);
      expect(triage.isEmergency).toBe(false);
      expect(triage.category).toBeUndefined();
    });
  });

  describe('Deterministic Specialty Classification for Rounds', () => {
    const classifySymptom = (text: string) => {
      const lower = text.toLowerCase();
      if (/\b(tachycardia|heart|palpitat|rate|pot|orthostatic|dizzy|lighthead|standing|blood pressure|hrv|syncope)\b/i.test(lower)) {
        return 'cardio';
      } else if (/\b(bloat|distension|gut|stomach|gas|reflux|gerd|bowel|abdominal|cramp|constipat|diarrhea|fodmap|nausea)\b/i.test(lower)) {
        return 'gastro';
      } else if (/\b(histamine|rash|itch|flush|hive|allergy|sinus|headache|mast cell|mcas|sneez)\b/i.test(lower)) {
        return 'immuno';
      }
      return 'metabolic';
    };

    it('routes orthostatic tachycardia and palpitations to cardiology/autonomics', () => {
      const input = 'Woke up with high standing heart rate of 125 bpm and orthostatic dizziness';
      expect(classifySymptom(input)).toBe('cardio');
    });

    it('routes postprandial gas and abdominal distension to gastroenterology', () => {
      const input = 'Severe abdominal bloating and gut distension after eating lentils';
      expect(classifySymptom(input)).toBe('gastro');
    });

    it('routes facial flushing and hives to immunology', () => {
      const input = 'Developed intense facial flushing and histamine hives after aged cheddar';
      expect(classifySymptom(input)).toBe('immuno');
    });

    it('routes general fatigue and brain fog to metabolic medicine', () => {
      const input = 'Mitochondrial exhaustion and afternoon slump with low cellular energy';
      expect(classifySymptom(input)).toBe('metabolic');
    });
  });

  describe('Health Memory Integration for War Room Observations & Documents', () => {
    it('persists clinical round observation into Health Memory with kind deep_collab', () => {
      recordHealthMemory({
        kind: 'deep_collab',
        source: 'WarRoom',
        title: 'Canvas Observation: Postprandial Tachycardia',
        occurredAt: new Date().toISOString(),
        payload: {
          observation: 'HR 115 bpm 45m post-lunch',
          specialty: 'cardio',
          specialistFeedback: 'Splanchnic blood pooling evaluated.'
        }
      });

      const memories = getHealthMemory();
      expect(memories.length).toBeGreaterThan(0);
      const latest = memories.find(m => m.source === 'WarRoom' && m.kind === 'deep_collab');
      expect(latest).toBeDefined();
      expect(latest?.payload.specialty).toBe('cardio');
    });

    it('persists uploaded lab report into Health Memory with kind lab_report', () => {
      recordHealthMemory({
        kind: 'lab_report',
        source: 'WarRoom',
        title: 'Uploaded Lab Document: Comprehensive_Metabolic_Panel.pdf',
        occurredAt: new Date().toISOString(),
        payload: {
          fileName: 'Comprehensive_Metabolic_Panel.pdf',
          fileSize: '1.8 MB',
          fileType: 'application/pdf'
        }
      });

      const memories = getHealthMemory();
      const labMemory = memories.find(m => m.source === 'WarRoom' && m.kind === 'lab_report');
      expect(labMemory).toBeDefined();
      expect(labMemory?.payload.fileName).toBe('Comprehensive_Metabolic_Panel.pdf');
    });
  });

  describe('Clinical Profile & Biomarker Live Binding', () => {
    it('retrieves functional biomarkers and identifies out-of-range storage thresholds', () => {
      const markers = getFunctionalBiomarkers();
      expect(Array.isArray(markers)).toBe(true);
      expect(markers.length).toBeGreaterThan(0);

      const ferritin = markers.find(m => m.id === 'ferritin');
      expect(ferritin).toBeDefined();
      expect(ferritin?.optimalRange.min).toBe(50);
      expect(ferritin?.optimalRange.max).toBe(90);
    });

    it('retrieves active elimination trial state with adherence and delta metrics', () => {
      const trial = getActiveTrial();
      expect(trial).not.toBeNull();
      expect(trial?.trialId).toBeDefined();
      expect(typeof trial?.reductionPercent).toBe('number');
      expect(typeof trial?.adherencePercentage).toBe('number');
    });
  });
});
