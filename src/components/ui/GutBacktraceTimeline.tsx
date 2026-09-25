import React from 'react';
import { Activity, Clock, HelpCircle, ShieldCheck, Utensils, Pill, FileText } from 'lucide-react';
import type { GutBacktraceProjection } from '../../services/GutResolutionService';

interface Props {
  projection: GutBacktraceProjection;
  onOpenHistory?: (date?: string) => void;
}

export const GutBacktraceTimeline: React.FC<Props> = ({ projection, onOpenHistory }) => {
  const { anchorTimestamp, anchorType, timedItems, dateOnlyItems, summary, caveat } = projection;

  const anchorDateFormatted = React.useMemo(() => {
    try {
      const dt = new Date(anchorTimestamp);
      return dt.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return anchorTimestamp;
    }
  }, [anchorTimestamp]);

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
              {anchorType === 'symptom_onset' ? 'Anchored to verified onset' : 'Anchored to question report'}
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
          {timedItems.map((item) => (
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
                      {item.kind.toUpperCase()}
                    </span>
                    <strong style={{ fontSize: '13px', color: '#0F172A' }}>{item.label}</strong>
                  </div>

                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#CD3153', whiteSpace: 'nowrap' }}>
                    {item.hoursPrior === 0 ? 'At report time' : `-${item.hoursPrior}h prior`}
                  </span>
                </div>

                {item.detail && (
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748B' }}>
                    {item.detail}
                  </p>
                )}

                <div style={{ marginTop: '4px', fontSize: '10.5px', color: '#94A3B8', display: 'flex', gap: '8px' }}>
                  <span>{item.timePrecision === 'exact' ? 'Exact recorded timestamp' : 'Approximate meal time'}</span>
                  {onOpenHistory && item.occurredAt && (
                    <button
                      type="button"
                      onClick={() => onOpenHistory(item.occurredAt.slice(0, 10))}
                      style={{ background: 'none', border: 'none', padding: 0, color: '#AD234A', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Open date record &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '12px 14px', background: '#FFFFFF', border: '1px dashed #F1E5E7', borderRadius: '12px', fontSize: '12.5px', color: '#64748B', marginBottom: '14px' }}>
          No exact timed meals or context logged in the 48 hours leading to this anchor.
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
            {dateOnlyItems.map((item) => (
              <span
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
              </span>
            ))}
          </div>
        </div>
      )}

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
