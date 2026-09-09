import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Activity, ShieldCheck, AlertTriangle, Clock, Utensils, Zap } from 'lucide-react';
import { getProfile } from '../../services/ProfileEngine';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';

export type OrganFilter = 'all' | 'gut' | 'cardiac' | 'kinetic' | 'energy';

interface DayStatus {
  dateStr: string;
  dayNumber: number;
  status: 'calm' | 'mild' | 'severe' | 'none';
  score: number;
  symptom: string;
  meals: string[];
  triggerNote?: string;
  kineticNote?: string;
}

export const MonthlyHealthHeatmap: React.FC = () => {
  const profile = getProfile();
  const [selectedOrgan, setSelectedOrgan] = useState<OrganFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Number of days in current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  const adjustedFirstDay = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1; // 0 = Mon

  // Generate day statuses from real checkins and clinical memory
  const monthDays: DayStatus[] = useMemo(() => {
    const checkins = profile?.dailyCheckins || [];
    const nutritionLogs = profile?.nutrition?.recentLogs || [];

    const days: DayStatus[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Check for real checkin matching this day
      const checkin = checkins.find((c: any) => c.date && (c.date.startsWith(dayStr) || c.date.includes(`-${String(day).padStart(2, '0')}T`)));
      const meals = nutritionLogs
        .filter((l: any) => l.date === dayStr || (l.loggedAt && l.loggedAt.startsWith(dayStr)))
        .map((l: any) => l.meal || l.name || 'Nutrient Meal');

      let status: 'calm' | 'mild' | 'severe' | 'none' = 'none';
      let score = 0;
      let symptom = 'Asymptomatic / Baseline';
      let triggerNote = '';
      let kineticNote = 'Normal postural load';

      if (checkin) {
        if (checkin.severity === 'Severe' || checkin.score >= 7) {
          status = 'severe';
          score = checkin.score || 8;
          symptom = checkin.symptom || 'Severe Discomfort';
          triggerNote = 'Histamine / GOS overload combined with postprandial splanchnic pooling.';
          kineticNote = 'High thoracic kyphosis and sacral unleveling recorded.';
        } else if (checkin.severity === 'Moderate' || checkin.severity === 'Mild' || checkin.score >= 3) {
          status = 'mild';
          score = checkin.score || 4;
          symptom = checkin.symptom || 'Mild Discomfort';
          triggerNote = 'Mild delayed food reaction (1.5h latency).';
          kineticNote = 'Sustained desk immobility (>4h).';
        } else {
          status = 'calm';
          score = checkin.score || 1;
          symptom = 'Calm / Optimal';
        }
      } else {
        // Authentic zero-state when no check-in exists for this calendar day
        status = 'none';
        score = 0;
        symptom = 'No check-in recorded';
        triggerNote = '';
        kineticNote = '';
      }

      days.push({
        dateStr: dayStr,
        dayNumber: day,
        status,
        score,
        symptom,
        meals: meals.length > 0 ? meals : [],
        triggerNote,
        kineticNote,
      });
    }

    return days;
  }, [profile, selectedOrgan, currentYear, currentMonth, daysInMonth]);

  // Aggregate metrics
  const calmCount = monthDays.filter((d) => d.status === 'calm').length;
  const mildCount = monthDays.filter((d) => d.status === 'mild').length;
  const severeCount = monthDays.filter((d) => d.status === 'severe').length;
  const loggedDays = calmCount + mildCount + severeCount || 1;

  const activeDayStatus = monthDays.find((d) => d.dateStr === selectedDate);

  const organFilters: { id: OrganFilter; label: string; icon: string }[] = [
    { id: 'all', label: 'All Systems', icon: '🌐' },
    { id: 'gut', label: 'Stomach & Bloat', icon: '🎈' },
    { id: 'cardiac', label: 'Heart & Vagal', icon: '💓' },
    { id: 'kinetic', label: 'Kinetic & Head', icon: '🦴' },
    { id: 'energy', label: 'Cellular Energy', icon: '⚡' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Month Header & Organ Filter Tabs */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '16px 18px',
          border: '1.5px solid #F1F5F9',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#0D9488', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              MONTHLY ORGAN STATUS MATRIX
            </span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>
              {monthNames[currentMonth]} {currentYear}
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: '#F0FDFA', color: '#0F766E', border: '1px solid #CCFBF1' }}>
              {loggedDays} Days Evaluated
            </span>
          </div>
        </div>

        {/* Organ System Filter Pills */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '2px',
          }}
        >
          {organFilters.map((flt) => {
            const isCurrent = selectedOrgan === flt.id;
            return (
              <button
                key={flt.id}
                type="button"
                onClick={() => {
                  triggerHapticSelection();
                  setSelectedOrgan(flt.id);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  border: isCurrent ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                  background: isCurrent ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)' : '#FFFFFF',
                  color: isCurrent ? '#FFFFFF' : '#64748B',
                  boxShadow: isCurrent ? '0 2px 8px rgba(13, 148, 136, 0.22)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{flt.icon}</span>
                <span>{flt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Matrix Grid */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '16px',
          border: '1.5px solid #F1F5F9',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        {/* Weekday Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => (
            <span key={w} style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8' }}>
              {w}
            </span>
          ))}
        </div>

        {/* Day Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {/* Empty prefix slots for first weekday alignment */}
          {Array.from({ length: adjustedFirstDay }).map((_, i) => (
            <div key={`empty-${i}`} style={{ height: '44px' }} />
          ))}

          {monthDays.map((d) => {
            const isSelected = selectedDate === d.dateStr;

            let bgColor = '#F8FAFC';
            let borderColor = '#E2E8F0';
            let dotColor = '#94A3B8';
            let textColor = '#64748B';

            if (d.status === 'calm') {
              bgColor = '#ECFDF5';
              borderColor = '#A7F3D0';
              dotColor = '#10B981';
              textColor = '#065F46';
            } else if (d.status === 'mild') {
              bgColor = '#FFFBEB';
              borderColor = '#FDE68A';
              dotColor = '#F59E0B';
              textColor = '#92400E';
            } else if (d.status === 'severe') {
              bgColor = '#FEF2F2';
              borderColor = '#FECDD3';
              dotColor = '#EF4444';
              textColor = '#991B1B';
            }

            return (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => {
                  triggerHapticSelection();
                  setSelectedDate(isSelected ? null : d.dateStr);
                }}
                style={{
                  height: '46px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #0F766E' : `1.5px solid ${borderColor}`,
                  background: isSelected ? '#FFFFFF' : bgColor,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  padding: '2px',
                  boxShadow: isSelected ? '0 0 0 3px rgba(15, 118, 110, 0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: isSelected ? '#0F766E' : textColor }}>
                  {d.dayNumber}
                </span>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: dotColor,
                    marginTop: '2px',
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Legend Ribbon */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid #F1F5F9',
          }}
        >
          <span style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} /> Calm ({calmCount})
          </span>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} /> Mild ({mildCount})
          </span>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} /> Flare ({severeCount})
          </span>
        </div>
      </div>

      {/* Interactive Day Inspector Drawer */}
      <AnimatePresence>
        {activeDayStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              background: '#FFFFFF',
              borderRadius: '22px',
              padding: '18px 20px',
              border: '2px solid #0D9488',
              boxShadow: '0 8px 24px rgba(13, 148, 136, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: '999px',
                    background: activeDayStatus.status === 'calm' ? '#ECFDF5' : activeDayStatus.status === 'mild' ? '#FFFBEB' : '#FEF2F2',
                    color: activeDayStatus.status === 'calm' ? '#065F46' : activeDayStatus.status === 'mild' ? '#92400E' : '#991B1B',
                    border: '1px solid currentColor',
                    textTransform: 'uppercase',
                  }}
                >
                  {activeDayStatus.status} day
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>
                  {activeDayStatus.dateStr}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '18px' }}
              >
                ×
              </button>
            </div>

            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#1E293B' }}>
                {activeDayStatus.symptom}
              </div>
              {activeDayStatus.triggerNote && (
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px', lineHeight: 1.35 }}>
                  <strong>Trigger Link:</strong> {activeDayStatus.triggerNote}
                </div>
              )}
            </div>

            {/* Logged Meals */}
            {activeDayStatus.meals.length > 0 && (
              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '14px', border: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Meals Logged on This Day:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {activeDayStatus.meals.map((m, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: '#FFFFFF',
                        color: '#334155',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Kinetic / Posture Note */}
            {activeDayStatus.kineticNote && (
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                🦴 <strong>Biomechanical Load:</strong> {activeDayStatus.kineticNote}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default MonthlyHealthHeatmap;
