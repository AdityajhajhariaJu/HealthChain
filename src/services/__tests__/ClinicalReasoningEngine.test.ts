
import {describe,it,expect} from 'vitest';
import {alignChronology,extractDateString,detectCorrectionQueue,buildTriProngChallenges,runClinicalReasoningPipeline} from '../ClinicalReasoningEngine';
import {normalizeClinicalReview} from '../clinicalReview';
import {facts,groundedReview} from '../testFixtures/groundedFixtures';
describe('Evidence-driven reasoning',()=>{
 it('does not invent interpretations with empty input',()=>{const p=runClinicalReasoningPipeline({});expect(p.stage1_facts).toEqual([]);expect(p.stage4_perspectives).toEqual([]);expect(p.stage5_alternatives).toEqual([]);expect(p.stage8_synthesis.urgencyLevel).toBe('not_assessed');});
 it('normalizes exact dates and rejects invalid dates',()=>{expect(extractDateString('25/12/2024')).toBe('2024-12-25');expect(extractDateString('2024-02-31')).toBeNull();expect(extractDateString('March 2024')).toBeNull();});
 it('never treats an entry timestamp as an event date',()=>{const t=alignChronology([{...facts[0],eventDate:undefined} as any]);expect(t.entries[0].eventDate).toBeUndefined();expect(t.entries[0].temporalConfidence).toBe('undated');});
 it('sorts explicit event dates chronologically',()=>{const t=alignChronology([{...facts[0],id:'later',eventDate:'2026-02-01'},{...facts[0],id:'earlier'}] as any);expect(t.entries[0].relatedFactIds).toEqual(['earlier']);});
 it('does not compare unrelated analytes merely sharing units',()=>{expect(detectCorrectionQueue([{...facts[0],fact:'Glucose 90 mg/dl'},{...facts[1],fact:'Potassium 4 mmol/l'}] as any)).toEqual([]);});
 it('flags structured same-analyte conflicting values',()=>{const m={...facts[0],analyte:'glucose',value:90,unit:'mg/dl'};expect(detectCorrectionQueue([m,{...m,id:'other',fact:'Different value',value:100}] as any)[0].type).toBe('conflicting_values');});
 it('does not turn repeated measurements on different days into duplicates',()=>{expect(detectCorrectionQueue([facts[0],{...facts[0],id:'other',eventDate:'2026-02-02'}] as any)).toEqual([]);});
 it('allows empty support and conflict, rather than filling them',()=>{const a={id:'a',title:'Unrelated proposal'};const c=buildTriProngChallenges([a as any],facts as any,[])[0];expect(c.supportingEvidence).toEqual([]);expect(c.conflictingEvidence).toEqual([]);});
 it('rejects unknown question IDs',()=>{const r=groundedReview();expect(()=>normalizeClinicalReview(r,r.reasoningPipeline,{questionId:'wrong',answerText:'Yesterday'})).toThrow();});
 it('preserves three answers and never treats unknown as resolved',()=>{let r=groundedReview();for(const answerText of ['I do not know','Yesterday','After walking']) r=normalizeClinicalReview(r,r.reasoningPipeline,{questionId:r.focusedQuestion.id,answerText});expect(r.documentedFacts.map((f:any)=>f.fact)).toEqual(expect.arrayContaining(['I do not know','Yesterday','After walking']));expect(r.selectiveUpdate.resolvedQuestions).toEqual([]);expect(r.focusedQuestion.status).toBe('answered');expect(r.documentedFacts.filter((f:any)=>f.id.startsWith('feedback_')).every((f:any)=>f.confidence==='self_reported')).toBe(true);});
 it('does not strengthen a hypothesis when its name is negated',()=>{const r=groundedReview();const u=normalizeClinicalReview(r,r.reasoningPipeline,{questionId:r.focusedQuestion.id,answerText:'The activity relationship was not established'});expect(u.selectiveUpdate.affectedConclusions.some((x:any)=>x.shift==='strengthened')).toBe(false);});
});
