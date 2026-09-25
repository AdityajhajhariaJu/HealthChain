import React from 'react';
import { Activity, Clock, HelpCircle, ShieldCheck, Utensils, Pill, FileText } from 'lucide-react';
import type { GutBacktraceProjection } from '../../services/GutResolutionService';
import type { GutSourceReference } from './GutSourceRecord';

interface Props {
  projection: GutBacktraceProjection;
  onOpenSource?: (source: GutSourceReference) => void;
}

export const GutBacktraceTimeline: React.FC<Props> = ({ projection, onOpenSource }) => {
  const { anchorTimestamp, anchorType, anchorTimezone, timedItems, dateOnlyItems, summary, caveat } = projection;
  const [showAll, setShowAll] = React.useState(false);
  const visibleTimed = showAll ? timedItems : timedItems.slice(0, 4);
  const visibleDated = showAll ? dateOnlyItems : dateOnlyItems.slice(0, 4);

  const anchorDateFormatted = React.useMemo(() => {
    try {
      const dt = new Date(anchorTimestamp);
      return dt.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: anchorTimezone,
      });
    } catch {
      return anchorTimestamp;
    }
  }, [anchorTimestamp, anchorTimezone]);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #FFFDFC 0%, #FFF7F8 100%)',
        border: '1px solid #F1E5E7',
        borderRadius: '20px',
        padding: '18px 20px',
        marginTop: '16px',
        boxShadow: '0 4px 18px rgba(189, 44, 88, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'radial-gradient(circle at 30% 20%, #FFE0E8, #E97993)',
              color: '#A41942',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Clock size={17} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#AD234A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              48-HOUR RECORD REVIEW WINDOW
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              {anchorType === 'symptom_onset' ? 'Anchored to reported symptom onset' : 'Anchored to when this question was saved'}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', background: '#FFFFFF', padding: '4px 10px', borderRadius: '99px', border: '1px solid #F1E5E7' }}>
          {anchorDateFormatted}
        </div>
      </div>

      <p style={{ fontSize: '12.5px', color: '#475569', margin: '0 0 14px', lineHeight: 1.45 }}>
        {summary}
      </p>

      {/* Timed Timeline Events */}
      {timedItems.length > 0 ? (
        <div style={{ position: 'relative', paddingLeft: '22px', borderLeft: '2px solid #F6CCD6', margin: '12px 0 16px 8px', display: 'grid', gap: '14px' }}>
          {visibleTimed.map((item) => (
            <div key={item.id} style={{ position: 'relative' }}>
              {/* Timeline marker */}
              <div
                style={{
                  position: 'absolute',
                  left: '-28px',
                  top: '4px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: item.kind === 'meal' ? '#CD3153' : item.kind === 'medication' ? '#7C3AED' : '#F59E0B',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 0 0 2px #F6CCD6',
                }}
              />

              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #F1E5E7',
                  borderRadius: '12px',
                  padding: '9px 12px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '99px',
                        background: '#FEF2F3',
                        color: '#AD234A',
                        border: '1px solid #F9D2D7',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {item.kind === 'meal' && <Utensils size={10} />}
                      {item.kind === 'medication' && <Pill size={10} />}
                      {item.kind === 'context' && <FileText size={10} />}
                      {item.kind === 'digestion' && <Activity size={10} />}
                      {item.kind === 'medication' ? 'MEDICATION NOTE' : item.kind.toUpperCase()}
                    </span>
                    <strong style={{ fontSize: '13px', color: '#0F172A' }}>{item.label}</strong>
                  </div>

                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#CD3153', whiteSpace: 'nowrap' }}>
                    {item.hoursPrior === 0 ? 'At anchor time' : `-${item.hoursPrior}h before anchor`}
                  </span>
                </div>

                {item.detail && (
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748B' }}>
                    {item.detail}
                  </p>
                )}

                <div style={{ marginTop: '4px', fontSize: '10.5px', color: '#94A3B8', display: 'flex', gap: '8px' }}>
                  <span>{item.timePrecision === 'exact' ? 'User-reported occurrence time' : 'Approximate user-reported occurrence time'}</span>
                  {onOpenSource && (
                    <button
                      type="button"
                      onClick={() => onOpenSource({ sourceKind: item.sourceKind, sourceId: item.sourceId, localDate: item.sourceLocalDate || item.localDate })}
                      style={{ background: 'none', border: 'none', padding: 0, color: '#AD234A', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Open source record &rarr;
                    </button>
                  )}
                </div>
                <details style={{ marginTop: 6, fontSize: 11, color: '#64748B' }}>
                  <summary style={{ cursor: 'pointer', color: '#AD234A', fontWeight: 700 }}>Why this appears / source</summary>
                  <p>Reported occurrence {item.occurredAt}; {item.localDate} in the review timezone. {item.sourceLocalDate && item.sourceLocalDate !== item.localDate ? `Recorded under ${item.sourceLocalDate} in the source. ` : ''}{item.kind === 'medication' ? 'This is a medication context note, not a confirmed dose taken. ' : ''}The record appears because its reported occurrence falls within the 48-hour window. Timing alone does not establish a cause.</p>
                  <p>Source: {item.sourceKind} · {item.sourceId}{item.revision === null ? '' : ` · revision ${item.revision}`}{item.reportedAt ? ` · entered ${item.reportedAt}` : ''}.</p>
                </details>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '12px 14px', background: '#FFFFFF', border: '1px dashed #F1E5E7', borderRadius: '12px', fontSize: '12.5px', color: '#64748B', marginBottom: '14px' }}>
          No verified timed occurrence is available in this 48-hour record window.
        </div>
      )}

      {/* Date-Only Records */}
      {dateOnlyItems.length > 0 && (
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #F1E5E7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 800, color: '#8D7167', marginBottom: '6px' }}>
            <HelpCircle size={14} /> SAME-DATE RECORDS (TIME UNNOTED)
          </div>
          <p style={{ fontSize: '11.5px', color: '#64748B', margin: '0 0 8px', lineHeight: 1.4 }}>
            Recorded on dates within the 48-hour span, but without specific hours. Sequence relative to the report cannot be verified.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {visibleDated.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 9px',
                  borderRadius: '8px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  fontSize: '11.5px',
                  color: '#334155',
                }}
              >
                <span style={{ fontWeight: 700, color: '#64748B', fontSize: '10.5px' }}>{item.localDate}:</span>
                <span>{item.label}</span>
                {item.detail && <span style={{ color: '#94A3B8', fontSize: '10.5px' }}>({item.detail})</span>}
                <details style={{ width: '100%', color: '#64748B' }}>
                  <summary style={{ cursor: 'pointer', color: '#AD234A', fontWeight: 700 }}>Source and timing limit</summary>
                  <span>Source {item.sourceKind} · {item.sourceId}{item.revision === null ? '' : ` · revision ${item.revision}`}. Time of occurrence is unknown; this record may be before or after the question. {item.kind === 'medication' ? 'A medication note does not confirm a dose was taken. ' : ''}{item.reportedAt ? `Entered ${item.reportedAt}. ` : ''}</span>
                  {onOpenSource && <button type="button" onClick={() => onOpenSource({ sourceKind: item.sourceKind, sourceId: item.sourceId, localDate: item.localDate })} style={{ display: 'block', marginTop: 4, border: 0, background: 'none', color: '#AD234A', cursor: 'pointer' }}>Open source record &rarr;</button>}
                </details>
              </div>
            ))}
          </div>
        </div>
      )}

      {(timedItems.length > 4 || dateOnlyItems.length > 4) && <button type="button" onClick={() => setShowAll((value) => !value)} style={{ border: '1px solid #F1E5E7', background: '#FFFFFF', color: '#AD234A', borderRadius: 10, padding: '7px 12px', cursor: 'pointer' }}>{showAll ? 'Show fewer records' : `Show ${timedItems.length + dateOnlyItems.length - visibleTimed.length - visibleDated.length} more records`}</button>}

      {/* Honest Clinical Caveat */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px',
          padding: '10px 12px',
          background: '#FFF9FA',
          border: '1px solid #F9D2D7',
          borderRadius: '10px',
          fontSize: '11.5px',
          color: '#8D354B',
          lineHeight: 1.45,
        }}
      >
        <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#AD234A' }} />
        <span>{caveat}</span>
      </div>
    </div>
  );
};
