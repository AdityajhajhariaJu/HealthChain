
import {describe,it,expect} from 'vitest';
import {buildVersionedEvidenceSet,generateMeaningfulPerspectives,executeBoundedComparison,runSubstantiveDebateRound} from '../MultiPerspectiveReviewEngine';
import {facts,rawReview} from '../testFixtures/groundedFixtures';
describe('Grounded multi-perspective review',()=>{
 it('does not pad an empty review with specialties',()=>expect(generateMeaningfulPerspectives(buildVersionedEvidenceSet([]))).toEqual([]));
 it('preserves a single justified perspective without padding',()=>expect(generateMeaningfulPerspectives(buildVersionedEvidenceSet(facts as any),[],rawReview.perspectives)).toHaveLength(1));
 it('preserves more than three distinct justified perspectives',()=>{const p=Array.from({length:4},(_,i)=>({...rawReview.perspectives[0],id:'p'+i,questionAddressed:'Question '+i}));expect(generateMeaningfulPerspectives(buildVersionedEvidenceSet(facts as any),[],p)).toHaveLength(4);});
 it('rejects nonexistent evidence references',()=>{expect(generateMeaningfulPerspectives(buildVersionedEvidenceSet(facts as any),[],[{...rawReview.perspectives[0],evidenceConsidered:['fake']}])).toEqual([]);});
 it('changes version identity when provenance changes',()=>expect(buildVersionedEvidenceSet(facts as any).hash).not.toBe(buildVersionedEvidenceSet(facts.map(f=>({...f,source:'Other'})) as any).hash));
 it('does not choose a cause from fact count or normal keywords',()=>{const e=buildVersionedEvidenceSet(facts as any);expect(executeBoundedComparison([],e).outcomeType).toBe('insufficient_evidence');expect(executeBoundedComparison([],e).disagreements).toEqual([]);});
 it('accepts an explicitly grounded bounded comparison',()=>{const c=executeBoundedComparison([],buildVersionedEvidenceSet(facts as any),{outcomeType:'multiple_unrelated_issues',outcomeSummary:'Distinct questions remain.',evidenceIds:['f1']});expect(c.outcomeType).toBe('multiple_unrelated_issues');});
 it('never claims the local debate adapter performed a new assessment',async()=>{const d=await runSubstantiveDebateRound('id','Specialty',[],{},buildVersionedEvidenceSet([]));expect(d.revisingEvidenceBasis).toEqual([]);expect(d.revisedHypothesis).toContain('no new clinical assessment');});
});
