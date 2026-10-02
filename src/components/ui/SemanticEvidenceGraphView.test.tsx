// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SemanticEvidenceGraphView } from './SemanticEvidenceGraphView';

afterEach(cleanup);

it('opens the precise displayed-case source through a keyboard-accessible control', () => {
  const inspect = vi.fn();
  render(
    <SemanticEvidenceGraphView
      graph={{
        caseId: 'displayed-case',
        nodes: [
          {
            id: 'finding-1',
            label: 'Recorded measurement',
            category: 'extracted_finding',
            sourceDocName: 'Original report',
            caseId: 'displayed-case',
            recordId: 'record-1',
            pageNumber: 3,
            passageText: 'Exact saved passage',
          },
        ],
        edges: [],
        decoupledEdgeIds: [],
        downstreamPipeline: {
          consideration: null,
          questionStillOpen: null,
          appointmentBrief: null,
        },
      }}
      onOpenSourceModal={inspect}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Inspect source for Recorded measurement' }));
  expect(inspect).toHaveBeenCalledWith(
    expect.objectContaining({
      caseId: 'displayed-case',
      recordId: 'record-1',
      findingId: 'finding-1',
      pageNumber: 3,
      passageText: 'Exact saved passage',
      findingClaim: 'Recorded measurement',
    })
  );
});
