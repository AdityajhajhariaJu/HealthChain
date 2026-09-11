
import {describe,it,expect} from 'vitest';
import {classifyClinicalInformation,validateCategorizedItem,partitionBeforeReasoning,INFORMATION_CATEGORY_REGISTRY} from '../ClinicalInformationClassifier';
describe('Information provenance',()=>{
 it('defines all eight categories',()=>expect(Object.keys(INFORMATION_CATEGORY_REGISTRY)).toHaveLength(8));
 it('does not promote a number in AI prose to a measurement',()=>expect(classifyClinicalInformation({text:'Consider 120 bpm',source:'AI engine'}).category).toBe('ai_consideration'));
 it('does not promote a reported doctor discussion to a clinician note',()=>expect(classifyClinicalInformation({text:'My doctor discussed pain',source:'Patient report'}).category).toBe('user_report'));
 it('retains explicit source category',()=>expect(classifyClinicalInformation({text:'120 bpm',category:'user_report'}).category).toBe('user_report'));
 it('leaves unknown page and model version missing',()=>{expect(classifyClinicalInformation({text:'Result',file:'Report.pdf'})).toMatchObject({category:'extracted_finding',page:undefined});expect(classifyClinicalInformation({text:'Proposal',source:'AI'})).toMatchObject({modelVersion:'',supportingEvidenceIds:[]});});
 it('quarantines invalid metadata before partitioning',()=>{const p=partitionBeforeReasoning([{text:'Result',file:'Report.pdf'}]);expect(p.allValid).toBe(false);expect(p.invalidItems).toHaveLength(1);expect(p.extractedFindings).toEqual([]);});
 it('accepts a complete provisional extraction',()=>{const item=classifyClinicalInformation({id:'f',text:'Result',file:'Report.pdf',page:2});expect(validateCategorizedItem(item).isValid).toBe(true);expect(partitionBeforeReasoning([item]).extractedFindings).toHaveLength(1);});
 it('handles null without crashing',()=>expect(partitionBeforeReasoning([null]).allValid).toBe(false));
});
