
// @vitest-environment jsdom
import {describe,it,expect,beforeEach} from 'vitest';
import {normalizeClinicalReview,buildReviewEvidence} from '../clinicalReview';
import {getUnifiedCaseScope} from '../caseWorkspace';
import {createCaseDraft,setActiveCase,getActiveCaseId,saveReviewSnapshot,getCase,clearCaseEngineCache} from '../CaseEngine';
import {evaluateTrialCriteria} from '../../features/tools/ClinicalTrialsMatcher';
import {facts,groundedReview,rawReview} from '../testFixtures/groundedFixtures';
describe('Clinical architecture acceptance boundaries',()=>{
 beforeEach(()=>{localStorage.clear();clearCaseEngineCache();});
 it('resolves an explicit case without changing active state',()=>{const a=createCaseDraft({title:'A'}),b=createCaseDraft({title:'B'});setActiveCase(b.id);expect(getUnifiedCaseScope(a.id).caseId).toBe(a.id);expect(getActiveCaseId()).toBe(b.id);});
 it('does not silently replace an invalid requested case',()=>{createCaseDraft({title:'A'});expect(getUnifiedCaseScope('nonexistent').caseItem).toBeNull();});
 it('excludes example cases from automatic context',()=>{const a=createCaseDraft({title:'Real'});createCaseDraft({title:'Example',intakeData:{scenarioId:'demo'}});expect(getUnifiedCaseScope().caseId).toBe(a.id);});
 it('never verifies an unknown source when the corpus is missing',()=>{const r=normalizeClinicalReview({executiveSummary:'Test',documentedFacts:[{id:'fake',fact:'Invented',source:'Nonexistent.pdf'}]});expect(r.documentedFacts).toEqual([]);expect(r.quarantinedFacts[0].sourceVerificationStatus).toBe('unverified_reference');});
 it('rejects an invented claim citing a real source and ID',()=>{const r=normalizeClinicalReview({...rawReview,documentedFacts:[{...facts[0],fact:'Invented finding'}]},null,undefined,{evidence:facts});expect(r.quarantinedFacts).toHaveLength(1);expect(r.documentedFacts.some((f:any)=>f.fact==='Invented finding')).toBe(false);});
 it('keeps real source text without claiming clinician verification',()=>{const r=groundedReview();expect(r.documentedFacts.find((f:any)=>f.id==='f2').sourceVerificationStatus).toBe('source_text_located');});
 it('marks new file extraction provisional',()=>{const r=normalizeClinicalReview({executiveSummary:'Extraction',documentedFacts:[{fact:'Extracted passage',source:'New.pdf',page:2}]},null,undefined,{evidence:[],attachmentNames:['New.pdf']});expect(r.documentedFacts[0].sourceVerificationStatus).toBe('provisional_extraction');});
 it('quarantines unreferenced contradictions',()=>{const r=normalizeClinicalReview({...rawReview,contradictions:[{itemA:{factId:'fake'},itemB:{factId:'f1'}}]},null,undefined,{evidence:facts});expect(r.contradictions).toEqual([]);});
 it('preserves a contradiction between identified observations',()=>{const r=normalizeClinicalReview({...rawReview,contradictions:[{topic:'Timing',itemA:{factId:'f1'},itemB:{factId:'f2'}}]},null,undefined,{evidence:facts});expect(r.contradictions[0].itemA.finding).toBe(facts[0].fact);});
 it('persists clarification evidence through reload',()=>{const c=createCaseDraft({title:'Continuity'});let r=groundedReview();r=normalizeClinicalReview(r,r.reasoningPipeline,{questionId:r.focusedQuestion.id,answerText:'After walking'});saveReviewSnapshot({caseId:c.id,type:'jarvis',report:r});clearCaseEngineCache();const saved=getCase(c.id)!.reviews[0].report;expect(saved.documentedFacts.some((f:any)=>f.fact==='After walking')).toBe(true);});
 it('does not use example records as review input',()=>expect(buildReviewEvidence('',{intakeData:{scenarioId:'demo'},medicalRecords:[{findings:'Example'}]})).toEqual([]));
 it('checks both age bounds from registry data',()=>{const r=evaluateTrialCriteria({title:'Adults',eligibility:{minimumAge:'18 Years',maximumAge:'65 Years'}},[],[],{age:70});expect(r.criteriaBreakdown.ageCriteria.status).toBe('potential_mismatch');});
 it('does not turn narrative age words into eligibility',()=>{expect(evaluateTrialCriteria({title:'Adults and children'},[],[],{age:30}).criteriaBreakdown.ageCriteria.status).toBe('unspecified');});
 it('does not infer study sex criteria from a topic mention',()=>{expect(evaluateTrialCriteria({title:'Pregnancy outcomes'},[],[],{gender:'female'}).criteriaBreakdown.genderCriteria.status).toBe('unspecified');});
 it('leaves profile gender distinct from registry sex',()=>{expect(evaluateTrialCriteria({eligibility:{sex:'FEMALE'}},[],[],{gender:'female'}).criteriaBreakdown.genderCriteria.status).toBe('unspecified');});
});
