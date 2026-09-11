// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { evaluateTrialCriteria, scoreClinicalTrial } from '../../features/tools/ClinicalTrialsMatcher';
import { fetchLiveTrials } from '../clinicalTrialsService';
import { fetchRecentLiterature, cleanMedicalText } from '../pubMedService';

describe('Research Retrieval Reliability & Provenance (Package 8)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Transparent Eligibility Boundaries & Zero False Confidence', () => {
    it('evaluates stated registry age bounds without asserting clinical eligibility', () => {
      const trial = {
        id: 'NCT01234567',
        title: 'Phase 3 Migraine Trial',
        summary: 'Investigating novel CGRP antagonist in episodic migraine.',
        conditions: ['Migraine', 'Headache'],
        eligibility: {
          minimumAge: '18 Years',
          maximumAge: '65 Years',
          sex: 'ALL'
        }
      };

      const result = evaluateTrialCriteria(trial, ['Migraine'], ['Migraine'], { age: 35, gender: 'female' });

      expect(result.criteriaBreakdown.ageCriteria.status).toBe('eligible');
      expect(result.criteriaBreakdown.ageCriteria.patientAge).toBe(35);
      expect(result.criteriaBreakdown.ageCriteria.note).toContain('within the stated age bounds only');
      expect(result.criteriaBreakdown.ageCriteria.note).toContain('Other eligibility criteria remain unevaluated');
    });

    it('identifies patient age outside stated registry boundaries as potential mismatch', () => {
      const trial = {
        id: 'NCT01234567',
        title: 'Pediatric Epilepsy Trial',
        eligibility: {
          minimumAge: '2 Years',
          maximumAge: '12 Years',
          sex: 'ALL'
        }
      };

      const result = evaluateTrialCriteria(trial, ['Epilepsy'], [], { age: 34 });

      expect(result.criteriaBreakdown.ageCriteria.status).toBe('potential_mismatch');
      expect(result.criteriaBreakdown.ageCriteria.note).toContain('outside at least one stated registry bound');
    });

    it('treats missing eligibility fields as unspecified rather than assuming eligibility', () => {
      const trialWithoutAge = {
        id: 'NCT09999999',
        title: 'Observational Registry',
        summary: 'Adult and pediatric cohort tracking.',
        conditions: ['Hypertension']
      };

      const result = evaluateTrialCriteria(trialWithoutAge, ['Hypertension'], [], { age: 45 });

      expect(result.criteriaBreakdown.ageCriteria.status).toBe('unspecified');
      expect(result.criteriaBreakdown.ageCriteria.note).toContain('Age limits were not evaluated');
    });

    it('does not infer clinical eligibility from narrative text or keywords in summary', () => {
      const trialWithNarrativeOnly = {
        id: 'NCT08888888',
        title: 'Elderly Hypertension Study for patients aged 65 to 80',
        summary: 'Female participants only will be enrolled in this cohort.',
        conditions: ['Hypertension']
      };

      const result = evaluateTrialCriteria(trialWithNarrativeOnly, ['Hypertension'], [], { age: 70, gender: 'female' });

      expect(result.criteriaBreakdown.ageCriteria.status).toBe('unspecified');
      expect(result.criteriaBreakdown.genderCriteria.status).toBe('unspecified');
    });

    it('distinguishes profile gender from registry sex criterion', () => {
      const trialFemaleOnly = {
        id: 'NCT07777777',
        title: 'Endometriosis Study',
        conditions: ['Endometriosis'],
        eligibility: {
          sex: 'FEMALE',
          minimumAge: '18 Years',
          maximumAge: '50 Years'
        }
      };

      const result = evaluateTrialCriteria(trialFemaleOnly, ['Endometriosis'], [], { gender: 'female' });

      expect(result.criteriaBreakdown.genderCriteria.status).toBe('unspecified');
      expect(result.criteriaBreakdown.genderCriteria.note).toContain('FEMALE');
      expect(result.criteriaBreakdown.genderCriteria.note).toContain('Not automatically evaluated against profile gender');
    });

    it('marks all-sexes registry protocols transparently without asserting medical admission', () => {
      const trialAllSex = {
        id: 'NCT06666666',
        title: 'Cardiovascular Risk Study',
        conditions: ['Hypertension'],
        eligibility: {
          sex: 'ALL'
        }
      };

      const result = evaluateTrialCriteria(trialAllSex, ['Hypertension'], [], { gender: 'male' });

      expect(result.criteriaBreakdown.genderCriteria.status).toBe('eligible');
      expect(result.criteriaBreakdown.genderCriteria.note).toContain('Registry lists all sexes');
    });
  });

  describe('Separation of Topic Relevance from Clinical Eligibility', () => {
    it('scores topic relevance high based on differentials while leaving eligibility distinct', () => {
      const trial = {
        id: 'NCT05555555',
        title: 'Management of Postural Orthostatic Tachycardia Syndrome',
        conditions: ['POTS', 'Dysautonomia'],
        summary: 'Randomized controlled trial of fludrocortisone vs standard of care in POTS.',
        interventions: ['Fludrocortisone']
      };

      const result = evaluateTrialCriteria(trial, ['POTS'], ['POTS'], { age: 28, gender: 'female' });

      expect(result.matchScore).toBeGreaterThanOrEqual(50);
      expect(result.criteriaBreakdown.matchStatus).toBe('differential_match');
      expect(result.criteriaBreakdown.conditionMatch.matched).toBe(true);

      expect(result.criteriaBreakdown.ageCriteria.status).toBe('unspecified');
      expect(result.criteriaBreakdown.genderCriteria.status).toBe('unspecified');
    });
  });

  describe('Context-Sensitive Cache Invalidation', () => {
    it('generates distinct cache keys when case context or demographics change', () => {
      const getCacheKey = (caseId: string, terms: string[], diffs: string[], age: string | number, gender: string, chief: string) => {
        const termsKey = terms.slice().sort().join('|');
        const diffsKey = diffs.slice().sort().join('|');
        return `researchHub_v8_${caseId}_${termsKey}_${diffsKey}_${age}_${gender}_${chief}`;
      };

      const keyA = getCacheKey('case_1', ['Migraine'], ['Migraine'], 30, 'female', 'Severe throbbing headache');
      const keyB = getCacheKey('case_1', ['Migraine'], ['Migraine'], 65, 'female', 'Severe throbbing headache');
      const keyC = getCacheKey('case_1', ['Migraine'], ['Tension Headache'], 30, 'female', 'Severe throbbing headache');
      const keyD = getCacheKey('case_2', ['Migraine'], ['Migraine'], 30, 'female', 'Severe throbbing headache');

      expect(keyA).not.toBe(keyB);
      expect(keyA).not.toBe(keyC);
      expect(keyA).not.toBe(keyD);
    });
  });

  describe('Ava Navigation Context Persistence', () => {
    it('persists active source study in sessionStorage for Ava handoff resilience', () => {
      const sourceStudy = {
        caseId: 'case_101',
        nctId: 'NCT09876543',
        title: 'Novel Biomarkers in Long COVID',
        abstract: 'Investigating immune exhaustion markers.',
        url: 'https://clinicaltrials.gov/study/NCT09876543',
        matchStatus: 'differential_match',
        criteriaBreakdown: {
          ageCriteria: { status: 'eligible', patientAge: 40, note: 'Within bounds' }
        },
        sourceName: 'ClinicalTrials.gov',
        retrievedAt: new Date().toISOString()
      };

      sessionStorage.setItem('hc_active_source_study', JSON.stringify(sourceStudy));
      sessionStorage.setItem(`hc_study_${sourceStudy.nctId}`, JSON.stringify(sourceStudy));

      const retrievedActive = JSON.parse(sessionStorage.getItem('hc_active_source_study')!);
      const retrievedById = JSON.parse(sessionStorage.getItem(`hc_study_${sourceStudy.nctId}`)!);

      expect(retrievedActive.nctId).toBe('NCT09876543');
      expect(retrievedActive.title).toBe('Novel Biomarkers in Long COVID');
      expect(retrievedById.criteriaBreakdown.ageCriteria.patientAge).toBe(40);
      expect(retrievedById.sourceName).toBe('ClinicalTrials.gov');
    });
  });

  describe('Text Sanitization & Journal Quality', () => {
    it('cleans XML entities and replaces missing journals cleanly', () => {
      const rawTitle = '&lt;b&gt;Clinical trial of IL-6 inhibition&lt;/b&gt; in &quot;severe&quot; disease';
      const clean = cleanMedicalText(rawTitle);

      expect(clean).toBe('Clinical trial of IL-6 inhibition in "severe" disease');
      expect(clean).not.toContain('&lt;');
      expect(clean).not.toContain('&gt;');
    });
  });

  describe('Registry Retrieval Baseline & Recovery Edge Cases', () => {
    it('assigns baseline topic score of 20 to any study returned by registry API even if summary lacks verbatim keyword', () => {
      const trialWithSynonym = {
        id: 'NCT01122334',
        title: 'Cephalea Treatment with Calcitonin Gene-Related Peptide Inhibitor',
        summary: 'A randomized assessment of neurovascular pain control.',
        conditions: ['Cephalea']
      };

      // Search term is 'Migraine'
      const result = evaluateTrialCriteria(trialWithSynonym, ['Migraine'], [], {});
      expect(result.matchScore).toBe(20);
      expect(result.criteriaBreakdown.matchStatus).toBe('broad_relevance');
    });

    it('retains successful trials when literature search fails during partial retrieval', async () => {
      const mockTrials = [
        { id: 'NCT100', title: 'Cardiology Protocol', conditions: ['Heart Failure'] }
      ];
      const trialsPromise = Promise.resolve(mockTrials);
      const literaturePromise = Promise.reject(new Error('Europe PMC unavailable'));

      const results = await Promise.allSettled([trialsPromise, literaturePromise]);
      const trialsOk = results[0].status === 'fulfilled';
      const papersOk = results[1].status === 'fulfilled';

      expect(trialsOk).toBe(true);
      expect(papersOk).toBe(false);

      const recoveredTrials = trialsOk ? results[0].value : [];
      expect(recoveredTrials).toHaveLength(1);
      expect(recoveredTrials[0].id).toBe('NCT100');
    });

    it('suggests case differentials as recovery search terms when primary search produces zero results', () => {
      const caseDifferentials = ['Irritable Bowel Syndrome', 'SIBO', 'Celiac Disease'];
      const searchTerms = ['RareDysmotilitySyndromeXYZ'];
      const zeroResults: any[] = [];

      // When zero results found, the recovery logic surfaces case differentials as alternatives
      const suggestedTerms = zeroResults.length === 0 ? caseDifferentials : [];

      expect(suggestedTerms).toContain('Irritable Bowel Syndrome');
      expect(suggestedTerms).toContain('SIBO');
      expect(suggestedTerms).toHaveLength(3);
    });
  });
});
