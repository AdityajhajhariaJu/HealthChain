
// @vitest-environment jsdom
import {describe,it,expect,beforeEach} from 'vitest';
import {getConnectionDetectiveReport,getFunctionalBiomarkers,evaluateSymptomCluster,getConnectionStreams} from '../ConnectionDetectiveEngine';
import {createCaseDraft,saveReviewSnapshot,setActiveCase,clearCaseEngineCache} from '../CaseEngine';
import {groundedReview} from '../testFixtures/groundedFixtures';
describe('Detective patient-data boundary',()=>{
 beforeEach(()=>{localStorage.clear();clearCaseEngineCache();});
 it('keeps the four stream identities without fabricated entries',()=>{const r=getConnectionDetectiveReport({},null);expect(r.streams.map(s=>s.id)).toEqual(['labs','notes','vitals','diet']);expect(r.streams.every(s=>s.count===0)).toBe(true);});
 it('does not create consensus, codes, tests or clinical misses without evidence',()=>{const r=getConnectionDetectiveReport({},null);expect(r.consensusDialogue).toEqual([]);expect(r.doctorDossier.testsToOrder).toEqual([]);expect(r.doctorDossier.icdCodes).toEqual([]);expect(r.clinicalMisses).toEqual([]);});
 it('reads the same grounded summary as the Engine',()=>{const saved=groundedReview();const r=getConnectionDetectiveReport(saved,{id:'c',title:'Case',intakeData:{}});expect(r.mapData.narrative).toBe(saved.executiveSummary);expect(r.primaryHypothesis).toBe(saved.primaryHypothesis);});
 it('does not use template lab measurements for an empty profile',()=>expect(getFunctionalBiomarkers()).toEqual([]));
 it('does not infer a cause from selected symptom names',()=>{const r=evaluateSymptomCluster(['symp_back','symp_headache']);expect(r.matchConfidence).toBe(0);expect(r.summaryNote).not.toContain('Dural');});
 it('reads actual saved extracted biomarkers and their printed interval',()=>{const c=createCaseDraft({title:'Lab review'});const r=groundedReview();r.functionalBiomarkers=[{factId:'f2',biomarker:'Recorded marker',value:'10 mg/L',standardRange:'5-15 mg/L'}];saveReviewSnapshot({caseId:c.id,type:'jarvis',report:r});setActiveCase(c.id);const b=getFunctionalBiomarkers();expect(b).toHaveLength(1);expect(b[0].userValue).toBe(10);expect(b[0].actionableDietaryCofactors).toEqual([]);});
 it('preserves qualitative and censored lab results instead of dropping or classifying them',()=>{const c=createCaseDraft({title:'Mixed lab review'});const r=groundedReview();r.functionalBiomarkers=[
  {factId:'qual',biomarker:'ANA',value:'Negative',standardRange:'Negative'},
  {factId:'censored',biomarker:'CRP',value:'<3 mg/L',standardRange:'0-5 mg/L'},
  {factId:'object',biomarker:'TSH',value:'2.4 mIU/L',standardRange:{min:0.4,max:4.0,unit:'mIU/L'}},
 ];saveReviewSnapshot({caseId:c.id,type:'jarvis',report:r});setActiveCase(c.id);const b=getFunctionalBiomarkers();expect(b).toHaveLength(3);expect(b.find(x=>x.id==='qual')?.originalValue).toBe('Negative');expect(b.find(x=>x.id==='qual')?.extractionState).toBe('needs_review');expect(b.find(x=>x.id==='censored')?.extractionState).toBe('needs_review');expect(b.find(x=>x.id==='object')?.isComparable).toBe(true);expect(b.find(x=>x.id==='object')?.originalRange).toContain('0.4 - 4');});
 it('does not populate biomarkers from a legacy snapshot',()=>{const c=createCaseDraft({title:'Old'});saveReviewSnapshot({caseId:c.id,type:'jarvis',report:{executiveSummary:'Old',functionalBiomarkers:[{value:'10 mg/L'}]}});setActiveCase(c.id);expect(getFunctionalBiomarkers()).toEqual([]);});
});




