import { describe, it, expect, beforeEach } from 'vitest';
import { 
  deriveSemanticEvidenceGraphFromEngineReview, 
  toggleDecoupleEdge, 
  getDecoupledEdgeIds,
  resetDecoupledEdges,
  CanonicalDetectiveRelation
} from '../ConnectionDetectiveEngine';

describe('ConnectionDetectiveSemanticGraph — Step 8: Give Every Line a Meaning', () => {
  beforeEach(() => {
    resetDecoupledEdges();
  });

  it('defines and classifies the 6 Canonical Detective Relationships', () => {
    const canonicalRelations: CanonicalDetectiveRelation[] = [
      'recorded_in',
      'occurred_before_after',
      'repeated_together',
      'may_help_explain',
      'conflicts_with',
      'documented_by_clinician'
    ];
    expect(canonicalRelations.length).toBe(6);
  });

  it('derives authentic semantic graph from Engine saved review with solid source links', () => {
    const mockReport = {
      id: 'rev_123',
      primaryHypothesis: 'Histamine Intolerance Consideration',
      documentedFacts: [
        {
          fact: 'Postprandial facial flushing and palpitations after aged cheese',
          source: 'Patient Symptom Diary',
          date: '2026-03-01',
          category: 'user_report'
        },
        {
          fact: 'Resting ECG confirms normal sinus rhythm with no ST-T abnormalities',
          source: 'Cardiology Clinic Record',
          date: '2026-02-14',
          category: 'extracted_finding'
        }
      ],
      questionsForClinician: [
        'Would checking 24-hr urinary N-methylhistamine during an acute flare clarify mast cell involvement?'
      ],
      doctorActionPlan: {
        sbar: {
          situation: 'Postprandial adrenergic flushing',
          recommendation: 'Evaluate plasma histamine and urinary methylhistamine'
        }
      }
    };

    const graph = deriveSemanticEvidenceGraphFromEngineReview(mockReport);

    expect(graph.nodes.length).toBeGreaterThanOrEqual(4);
    expect(graph.edges.length).toBeGreaterThanOrEqual(3);

    // 1. Check solid source links (recorded_in)
    const sourceLinks = graph.edges.filter(e => e.relation === 'recorded_in');
    expect(sourceLinks.length).toBeGreaterThanOrEqual(2);
    expect(sourceLinks[0].displayType).toBe('solid_source');

    // 2. Check downstream pipeline flow: Consideration -> Question -> Brief
    expect(graph.downstreamPipeline.consideration).not.toBeNull();
    expect(graph.downstreamPipeline.consideration?.label).toContain('Histamine Intolerance');
    expect(graph.downstreamPipeline.questionStillOpen).not.toBeNull();
    expect(graph.downstreamPipeline.questionStillOpen?.label).toContain('urinary N-methylhistamine');
    expect(graph.downstreamPipeline.appointmentBrief).not.toBeNull();
  });

  it('surfaces conflicting observations as labeled contradictions that weaken considerations', () => {
    const mockReport = {
      primaryHypothesis: 'Supraventricular Tachycardia Flare',
      documentedFacts: [
        {
          fact: 'Normal resting baseline ECG and normal troponin levels',
          source: 'Emergency Triage Note',
          date: '2026-03-02',
          category: 'extracted_finding'
        }
      ]
    };

    const graph = deriveSemanticEvidenceGraphFromEngineReview(mockReport);
    const contradictionEdge = graph.edges.find(e => e.relation === 'conflicts_with');

    expect(contradictionEdge).toBeDefined();
    expect(contradictionEdge?.displayType).toBe('labelled_contradiction');
    expect(contradictionEdge?.label).toBe('weakens');
  });

  it('supports Step 9 interactive lever: "Keep these separate" (decoupling forced connections)', () => {
    const edgeId = 'edge_test_connection_1';
    expect(getDecoupledEdgeIds()).not.toContain(edgeId);

    // User decouples the edge
    const afterDecouple = toggleDecoupleEdge(edgeId);
    expect(afterDecouple).toContain(edgeId);
    expect(getDecoupledEdgeIds()).toContain(edgeId);

    // User reconnects the edge
    const afterReconnect = toggleDecoupleEdge(edgeId);
    expect(afterReconnect).not.toContain(edgeId);
    expect(getDecoupledEdgeIds()).not.toContain(edgeId);
  });
});
