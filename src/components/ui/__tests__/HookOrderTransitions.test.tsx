// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CaseConnectionMap } from '../CaseConnectionMap';
import { ConflictResolutionModal } from '../ConflictResolutionModal';
import { RichReportTemplate } from '../RichReportTemplate';

afterEach(cleanup);

it('can populate and clear a mounted connection map without changing Hook order', () => {
  const { rerender } = render(<CaseConnectionMap data={null} />);
  expect(screen.getByText('Awaiting Clinical Intake')).toBeTruthy();
  rerender(
    <CaseConnectionMap
      data={{
        conditions: [{ id: 'one', name: 'Recorded concern', category: 'metabolic' }],
        centralSymptoms: [],
        connections: [],
      }}
    />
  );
  expect(screen.getByText('Recorded concern')).toBeTruthy();
  rerender(<CaseConnectionMap data={null} />);
  expect(screen.getByText('Awaiting Clinical Intake')).toBeTruthy();
});

it('can open, close and reopen a mounted conflict dialog', () => {
  const props = { onClose: vi.fn(), caseItem: { id: 'synthetic', conflicts: [] } as any };
  const { rerender } = render(<ConflictResolutionModal {...props} isOpen={false} />);
  rerender(<ConflictResolutionModal {...props} isOpen />);
  expect(screen.getByText('All Conflicts Resolved')).toBeTruthy();
  rerender(<ConflictResolutionModal {...props} isOpen={false} />);
  rerender(<ConflictResolutionModal {...props} isOpen />);
  expect(screen.getByText('All Conflicts Resolved')).toBeTruthy();
});

it('can render a report that arrives after the view is mounted', () => {
  const { rerender } = render(<RichReportTemplate report={null as any} />);
  rerender(<RichReportTemplate report={{ executiveSummary: 'Recorded summary' }} />);
  expect(screen.getByText('Recorded summary')).toBeTruthy();
  rerender(<RichReportTemplate report={null as any} />);
});
