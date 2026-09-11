
// @vitest-environment jsdom
import {describe,it,expect,beforeEach} from 'vitest';
import {createCaseDraft,saveReviewSnapshot,ensureRecordPassages,getRecordPassage,addCaseQuestion,getCaseQuestions,updateCaseQuestionOutcome,clearCaseEngineCache} from '../CaseEngine';
import {groundedReview} from '../testFixtures/groundedFixtures';
describe('Landing promise implementation',()=>{
 beforeEach(()=>{localStorage.clear();clearCaseEngineCache();});
 it('saves only grounded perspective contributions',()=>{const c=createCaseDraft({title:'Review'});const saved=saveReviewSnapshot({caseId:c.id,type:'jarvis',report:groundedReview()});expect(saved.reviews[0].perspectives).toHaveLength(1);expect(saved.reviews[0].perspectives![0].supportingEvidenceIds).toEqual(['f1','f2']);});
 it('does not manufacture specialty cards for legacy summaries',()=>{const c=createCaseDraft({title:'Old'});expect(saveReviewSnapshot({caseId:c.id,type:'jarvis',report:{executiveSummary:'Summary'}}).reviews[0].perspectives).toEqual([]);});
 it('preserves question outcome workflow',()=>{const c=createCaseDraft({title:'Visit'});const q=addCaseQuestion(c.id,{questionText:'What changed?',raisedBySpecialty:'User',supportingEvidenceIds:[]});updateCaseQuestionOutcome(c.id,q.id,'addressed','Discussed at appointment');expect(getCaseQuestions(c.id)[0].outcomeNote).toBe('Discussed at appointment');});
 it('keeps original passage IDs and pages',()=>{const r={id:'r',filename:'Report.pdf',source:'Uploaded',type:'report',addedAt:'2026-01-01',findings:'Summary',passages:[{id:'p',page:3,text:'Original passage'}]};const c=createCaseDraft({medicalRecords:[r]});expect(getRecordPassage(c.id,'r','p')?.passage?.page).toBe(3);});
 it('does not assign a page number or verification to a legacy summary',()=>{const r=ensureRecordPassages({id:'r',filename:'Old',source:'Uploaded',type:'report',addedAt:'',findings:'Stored summary'});expect(r.passages![0].page).toBeUndefined();expect(r.passages![0].section).toContain('Stored summary');});
 it('does not invent a passage for an empty record',()=>expect(ensureRecordPassages({id:'r',filename:'Empty',source:'',type:'',addedAt:'',findings:''}).passages).toEqual([]));
});
