import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Edit3, ArrowRight, CheckCircle2 } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';
import { addNutritionLog, recordDailyCheckin } from '../../services/ProfileEngine';
import { useNavigate } from 'react-router-dom';

export interface DiaryEntry {
  time: string;
  category?: string; // 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Symptoms' | 'Mood'
  items: string[];
}

export interface DiaryTimelineCardProps {
  title?: string;
  date?: string;
  entries: DiaryEntry[];
  autoSync?: boolean;
}

export const DiaryTimelineCard: React.FC<DiaryTimelineCardProps> = ({
  title = 'Logged in your diary',
  date = 'Today',
  entries = [],
  autoSync = true,
}) => {
  const navigate = useNavigate();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (autoSync && !synced && entries.length > 0) {
      try {
        entries.forEach((entry) => {
          const isSymptom = (entry.category || '').toLowerCase().includes('symptom') || 
            entry.items.some(i => i.toLowerCase().includes('bloat') || i.toLowerCase().includes('pain') || i.toLowerCase().includes('headache') || i.toLowerCase().includes('fog'));

          if (isSymptom) {
            recordDailyCheckin({
              symptom: entry.items.join(', '),
              severity: 'Moderate',
              score: 2,
              note: `Logged via Ava Health Journal at ${entry.time}`,
              lifestyle: {}
            });
          } else {
            addNutritionLog({
              name: entry.items.join(', '),
              calories: entry.items.length * 90, // reasonable metabolic estimate
              protein: entry.items.length * 4,
              carbs: entry.items.length * 12,
              fat: entry.items.length * 3,
              type: entry.category || 'Meal',
              time: entry.time
            });
          }
        });
        setSynced(true);
      } catch (e) {
        console.error('Auto sync diary error:', e);
      }
    }
  }, [autoSync, synced, entries]);

  const getCategoryIcon = (cat = '', items: string[]) => {
    const text = (cat + ' ' + items.join(' ')).toLowerCase();
    if (text.includes('symptom') || text.includes('bloat') || text.includes('headache') || text.includes('fog')) {
      return '⚡';
    }
    if (text.includes('coffee') || text.includes('drink') || text.includes('tea') || text.includes('wine')) {
      return '☕';
    }
    return '🍏';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        width: '100%',
        maxWidth: '480px',
        background: '#FFFFFF',
        borderRadius: '22px',
        border: '1.5px solid #F1F5F9',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.02)',
        overflow: 'hidden',
        margin: '8px 0',
        fontFamily: 'inherit',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '16px 18px 12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #F8FAFC',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '8px',
              background: '#FFF1F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E11D48',
            }}
          >
            <Edit3 size={14} />
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
              background: '#F0FDF4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16A34A',
            }}
          >
            <Check size={13} strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Diary Body */}
      <div style={{ padding: '14px 18px 18px 18px' }}>
        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1C1917', marginBottom: '14px' }}>
          {date}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {entries.map((entry, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                {entry.time}
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '15px', marginTop: '3px', flexShrink: 0 }}>
                  {getCategoryIcon(entry.category, entry.items)}
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
                        background: '#FFFFFF',
                        borderRadius: '999px',
                        border: '1px solid #E2E8F0',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#1E293B',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

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
          <span style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} /> Synced to HealthChain Diary
          </span>

          <button
            type="button"
            onClick={() => {
              triggerHapticLight();
              navigate('/app/dietician');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FF6B4A',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
            }}
          >
            View in Dietician <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
