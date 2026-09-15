import React, { useState } from 'react';
import { MeaningfulPerspective, BoundedComparisonSummary, VersionedEvidenceSet } from '../../services/MultiPerspectiveReviewEngine';
import { triggerHapticLight } from '../../services/haptics';

interface MeaningfulMultiPerspectiveViewProps {
  perspectives: MeaningfulPerspective[];
  boundedComparison?: BoundedComparisonSummary;
  versionedEvidence?: VersionedEvidenceSet;
}

const sectionStyle: React.CSSProperties = {
  borderTop: '1px solid #E2E8F0',
  paddingTop: 16,
  marginTop: 16,
};

const labelStyle: React.CSSProperties = {
  margin: '0 0 6px',
  color: '#475569',
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  color: '#334155',
  fontSize: 13,
  lineHeight: 1.55,
};

export const MeaningfulMultiPerspectiveView: React.FC<MeaningfulMultiPerspectiveViewProps> = ({
  perspectives,
  boundedComparison,
  versionedEvidence,
}) => {
  const [activePerspectiveId, setActivePerspectiveId] = useState(perspectives[0]?.id || '');

  if (!perspectives.length) return null;

  const current = perspectives.find((perspective) => perspective.id === activePerspectiveId) || perspectives[0];

  return (
    <section style={{ marginTop: 16 }} aria-labelledby="perspectives-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <h3 id="perspectives-title" style={{ margin: 0, color: '#0F172A', fontSize: 18 }}>
          Clinical perspectives
        </h3>
        {versionedEvidence && (
          <span style={{ color: '#64748B', fontSize: 12 }}>
            Based on {versionedEvidence.facts.length} documented {versionedEvidence.facts.length === 1 ? 'fact' : 'facts'}
          </span>
        )}
      </div>

      <div role="tablist" aria-label="Clinical perspectives" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 12, paddingBottom: 4 }}>
        {perspectives.map((perspective) => {
          const selected = perspective.id === current.id;
          return (
            <button
              key={perspective.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                triggerHapticLight();
                setActivePerspectiveId(perspective.id);
              }}
              style={{
                border: `1px solid ${selected ? '#0D9488' : '#CBD5E1'}`,
                background: selected ? '#F0FDFA' : '#FFFFFF',
                color: selected ? '#0F766E' : '#475569',
                borderRadius: 999,
                padding: '7px 12px',
                fontSize: 13,
                fontWeight: selected ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {perspective.specialty}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" style={sectionStyle}>
        <h4 style={{ margin: '0 0 4px', color: '#0F172A', fontSize: 17 }}>{current.specialty}</h4>
        <p style={{ margin: 0, color: '#64748B', fontSize: 13 }}>{current.selectionReason}</p>

        <div style={sectionStyle}>
          <p style={labelStyle}>Question</p>
          <p style={{ margin: 0, color: '#0F172A', fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>
            {current.questionAddressed}
          </p>
        </div>

        <div style={sectionStyle}>
          <p style={labelStyle}>Interpretation</p>
          <p style={{ margin: 0, color: '#334155', fontSize: 14, lineHeight: 1.6 }}>{current.interpretation}</p>
        </div>

        <details style={sectionStyle}>
          <summary style={{ cursor: 'pointer', color: '#0F766E', fontSize: 13, fontWeight: 800 }}>
            Evidence and limitations
          </summary>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginTop: 14 }}>
            <div>
              <p style={labelStyle}>Evidence reviewed</p>
              <ul style={listStyle}>{current.evidenceConsidered.map((item, index) => <li key={index}>{item}</li>)}</ul>
            </div>
            <div>
              <p style={labelStyle}>Evidence against</p>
              <ul style={listStyle}>{current.evidenceAgainst.map((item, index) => <li key={index}>{item}</li>)}</ul>
            </div>
            <div>
              <p style={labelStyle}>Missing information</p>
              <ul style={listStyle}>{current.missingInformation.map((item, index) => <li key={index}>{item}</li>)}</ul>
            </div>
          </div>
        </details>

        <div style={sectionStyle}>
          <p style={labelStyle}>Question for {current.questionForAnotherPerspective.targetSpecialty}</p>
          <p style={{ margin: '0 0 6px', color: '#0F172A', fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>
            {current.questionForAnotherPerspective.question}
          </p>
          <p style={{ margin: 0, color: '#64748B', fontSize: 13, lineHeight: 1.5 }}>
            {current.questionForAnotherPerspective.clinicalRationale}
          </p>
        </div>

        <div style={sectionStyle}>
          <p style={labelStyle}>What could change this view</p>
          <p style={{ margin: 0, color: '#334155', fontSize: 14, lineHeight: 1.5 }}>{current.whatWouldChangeInterpretation}</p>
        </div>
      </div>

      {boundedComparison && (
        <details style={sectionStyle}>
          <summary style={{ cursor: 'pointer', color: '#0F766E', fontSize: 13, fontWeight: 800 }}>
            Compare perspectives · {boundedComparison.outcomeType.replace(/_/g, ' ')}
          </summary>
          <div style={{ marginTop: 14 }}>
            <p style={{ margin: '0 0 14px', color: '#334155', fontSize: 14, lineHeight: 1.6 }}>{boundedComparison.outcomeSummary}</p>

            {boundedComparison.sharedModelAssumptions.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={labelStyle}>Shared assumptions</p>
                <ul style={listStyle}>{boundedComparison.sharedModelAssumptions.map((item, index) => <li key={index}>{item}</li>)}</ul>
              </div>
            )}

            {boundedComparison.disagreements.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={labelStyle}>Disagreements</p>
                <ul style={listStyle}>
                  {boundedComparison.disagreements.map((item, index) => (
                    <li key={index} style={{ marginBottom: 6 }}>
                      {item.disputePoint} <strong>Needed:</strong> {item.evidenceNeededToResolve}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p style={labelStyle}>Takeaway</p>
            <p style={{ margin: 0, color: '#0F172A', fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>
              {boundedComparison.clearDecisionOrQuestion}
            </p>
          </div>
        </details>
      )}
    </section>
  );
};
