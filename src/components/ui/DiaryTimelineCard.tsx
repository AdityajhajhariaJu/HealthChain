import { motion } from 'framer-motion';
import { ArrowRight, Check, CheckCircle2, Edit3, Waves } from 'lucide-react';
import React from 'react';
import { triggerHapticLight } from '../../services/haptics';

export interface DiaryEntry {
  time: string;
  category?: string; // 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Posture' | 'Vascular' | 'Medication' | 'Symptoms' | 'Mood'
  items: string[];
}

export interface DiaryTimelineCardProps {
  title?: string;
  date?: string;
  entries: DiaryEntry[];
  onOpenRiver?: () => void;
}

export const DiaryTimelineCard: React.FC<DiaryTimelineCardProps> = ({
  title = 'Your diary records',
  date = 'Today',
  entries = [],
  onOpenRiver,
}) => {
  // Displaying an existing record is never a command to create another record.

  const getCategoryMeta = (cat = '', items: string[]) => {
    const text = cat.toLowerCase();
    if (text.includes('posture') || text.includes('sitting') || text.includes('chair') || text.includes('desk') || text.includes('lumbar')) {
      return { icon: '🪑', label: 'Posture & Ergonomics', bg: '#F0FDFA', color: '#0F766E', border: '#CCFBF1' };
    }
    if (text.includes('symptom') || text.includes('bloat') || text.includes('headache') || text.includes('pain') || text.includes('fog')) {
      return { icon: '⚡', label: 'Symptoms', bg: '#FFF1F2', color: '#E11D48', border: '#FECDD3' };
    }
    if (text.includes('coffee') || text.includes('espresso') || text.includes('tea') || text.includes('caffeine') || text.includes('drink') || text.includes('wine')) {
      return { icon: '☕', label: 'Vascular / Hydration', bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' };
    }
    if (text.includes('pill') || text.includes('med') || text.includes('metformin') || text.includes('supplement') || text.includes('vitamin')) {
      return { icon: '💊', label: 'Medication', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' };
    }
    return { icon: '🥗', label: cat || 'Nutrition', bg: '#FFFFFF', color: '#1E293B', border: '#E2E8F0' };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        width: '100%',
        maxWidth: '500px',
        background: '#FFFFFF',
        borderRadius: '22px',
        border: '1.5px solid #E2E8F0',
        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06), 0 2px 8px rgba(15, 23, 42, 0.02)',
        overflow: 'hidden',
        margin: '8px 0',
        fontFamily: 'inherit',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '14px 18px 12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '9px',
              background: '#F0FDFA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F766E',
            }}
          >
            <Edit3 size={15} />
          </div>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917', letterSpacing: '-0.2px' }}>
            {title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#ECFDF5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <Check size={13} strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Diary Body */}
      <div style={{ padding: '14px 18px 16px 18px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#64748B', marginBottom: '12px' }}>
          {date}
        </div>

        {entries.length === 0 ? (
          <div style={{ padding: '16px 0', textAlign: 'center', fontSize: '13px', color: '#64748B' }}>
            No journal entries recorded for this timeline yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {entries.map((entry, idx) => {
              const meta = getCategoryMeta(entry.category, entry.items);
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0F766E' }}>
                      {entry.time}
                    </span>
                    {entry.category && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '1px 7px',
                          borderRadius: '999px',
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`,
                        }}
                      >
                        {meta.label}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontSize: '16px', marginTop: '2px', flexShrink: 0 }}>
                      {meta.icon}
                    </span>

                    {/* Pill Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                      {entry.items.map((item, iIdx) => (
                        <span
                          key={iIdx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 12px',
                            background: meta.bg,
                            borderRadius: '999px',
                            border: `1px solid ${meta.border}`,
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: meta.color === '#1E293B' ? '#1E293B' : meta.color,
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '11.5px', color: entries.length > 0 ? '#059669' : '#94A3B8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            {entries.length > 0 ? (
              <>
                <CheckCircle2 size={13} /> From your saved diary
              </>
            ) : (
              'Awaiting diary input'
            )}
          </span>

          <button
            type="button"
            onClick={() => {
              triggerHapticLight();
              if (onOpenRiver) {
                onOpenRiver();
              } else {
                window.dispatchEvent(new CustomEvent('hc_open_whole_health_river'));
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0F766E',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 6px',
              minHeight: '44px',
            }}
          >
            <Waves size={13} /> View Health River <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
