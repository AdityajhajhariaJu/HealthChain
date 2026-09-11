
import {describe,it,expect} from 'vitest';
import {buildStructuredClinicalAnswer,sanitizeArbitraryPercentages} from '../StructuredAnswerEngine';
import {groundedReview} from '../testFixtures/groundedFixtures';
describe('Structured answers',()=>{
 it('removes confidence claims without asserting supporting evidence',()=>{const s=sanitizeArbitraryPercentages('82% match, with 95% confidence');expect(s).not.toMatch(/82%|95%|supported by documented/);});
 it('keeps empty layers empty instead of inventing findings',()=>{const a=buildStructuredClinicalAnswer({});expect(a.layer3_otherExplanations.balancedEvidence).toEqual([]);expect(a.layer4_whatWeStillNeed.completeMissingList).toEqual([]);expect(a.layer2_whyThisMatters.sourcePassages).toEqual([]);});
 it('renders grounded observations and proposed alternatives in five layers',()=>{const a=groundedReview().structuredAnswer;expect(a.layer2_whyThisMatters.sourcePassages).toHaveLength(2);expect(a.layer3_otherExplanations.relationshipStatuses[0].status).toBe('proposed');expect(a.layer3_otherExplanations.balancedEvidence[0].conflictingEvidence).toEqual([]);});
 it('does not claim two arbitrary facts establish a connection',()=>{const a=buildStructuredClinicalAnswer({documentedFacts:[{fact:'A'},{fact:'B'}],alternatives:[{title:'Proposal'}]});expect(a.layer3_otherExplanations.relationshipStatuses.every(r=>r.status==='proposed')).toBe(true);});
 it('honors an explicit user priority',()=>expect(buildStructuredClinicalAnswer({userPriority:'Discuss mobility'}).layer5_nextStep.chosenAction).toBe('Discuss mobility'));
});
