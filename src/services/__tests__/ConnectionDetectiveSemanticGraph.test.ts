
// @vitest-environment jsdom
import {describe,it,expect,beforeEach} from 'vitest';
import {deriveSemanticEvidenceGraphFromEngineReview,toggleDecoupleEdge,getDecoupledEdgeIds} from '../ConnectionDetectiveEngine';
import {createCaseDraft,setActiveCase,clearCaseEngineCache} from '../CaseEngine';
import {groundedReview} from '../testFixtures/groundedFixtures';
describe('Source-linked semantic graph',()=>{
 beforeEach(()=>{localStorage.clear();clearCaseEngineCache();});
 it('empty input cannot invent measurements, records or recurrence',()=>{const g=deriveSemanticEvidenceGraphFromEngineReview({},{});expect(g.nodes).toEqual([]);expect(g.edges).toEqual([]);});
 it('legacy snapshots cannot populate an apparently grounded map',()=>expect(deriveSemanticEvidenceGraphFromEngineReview({documentedFacts:[{fact:'Example'}]}).nodes).toEqual([]));
 it('renders saved evidence IDs and only referenced relationships',()=>{const r=groundedReview();const g=deriveSemanticEvidenceGraphFromEngineReview(r);expect(g.nodes.some(n=>n.id==='f1')).toBe(true);expect(g.edges.some(e=>e.from==='f1' && e.to==='a1')).toBe(true);expect(g.edges.some(e=>e.relation==='documented_by_clinician')).toBe(false);});
 it('does not invent timing or repeated observations',()=>{const g=deriveSemanticEvidenceGraphFromEngineReview(groundedReview());expect(g.edges.some(e=>e.count || e.timeDelta)).toBe(false);});
 it('computes timing only from explicit event timestamps',()=>{const r=groundedReview();r.documentedFacts[0].eventDate='2026-01-01T10:00:00Z';r.documentedFacts[1].eventDate='2026-01-01T10:20:00Z';expect(deriveSemanticEvidenceGraphFromEngineReview(r).edges.find(e=>e.timeDelta)?.timeDelta).toBe('20 min');});
 it('keeps separation choices local to their case',()=>{const a=createCaseDraft({title:'A'}),b=createCaseDraft({title:'B'});setActiveCase(a.id);toggleDecoupleEdge('support_f1_a1');expect(getDecoupledEdgeIds()).toContain('support_f1_a1');setActiveCase(b.id);expect(getDecoupledEdgeIds()).toEqual([]);setActiveCase(a.id);expect(getDecoupledEdgeIds()).toContain('support_f1_a1');});
});
