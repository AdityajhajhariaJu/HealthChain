import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProfile } from '../../services/ProfileEngine';
import { triggerHapticSelection } from '../../services/haptics';
import { listMealDiary, type MealDiary } from '../../services/MealCommandService';

interface DayStatus {
  dateStr: string;
  dayNumber: number;
  hasCheckin: boolean;
  status: 'calm' | 'mild' | 'severe' | 'none';
  symptom: string;
  meals: string[];
}

export const MonthlyHealthHeatmap: React.FC = () => {
  const profile = getProfile();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [mealDiary, setMealDiary] = useState<MealDiary>({});

  useEffect(() => {
    let active = true;
    const refreshMeals = () => {
      void listMealDiary().then((diary) => { if (active) setMealDiary(diary); })
        .catch(() => { if (active) setMealDiary({}); });
    };
    refreshMeals();
    window.addEventListener('hc_observations_updated', refreshMeals);
    window.addEventListener('hc_profile_updated', refreshMeals);
    return () => {
      active = false;
      window.removeEventListener('hc_observations_updated', refreshMeals);
      window.removeEventListener('hc_profile_updated', refreshMeals);
    };
  }, []);

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

  // Show recorded check-ins and meals without inferring a trigger or a diagnosis.
  const monthDays: DayStatus[] = useMemo(() => {
    const checkins = profile?.dailyCheckins || [];

    const days: DayStatus[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Check for real checkin matching this day
      const checkin = checkins.find((c: any) => c.date && (c.date.startsWith(dayStr) || c.date.includes(`-${String(day).padStart(2, '0')}T`)));
      const meals = (mealDiary[dayStr] || []).map((meal) => meal.name);

      let status: 'calm' | 'mild' | 'severe' | 'none' = 'none';
      let symptom = 'No check-in recorded';

      if (checkin) {
        const severity = String(checkin.severity || '').toLowerCase();
        symptom = String(checkin.symptom || checkin.note || 'Check-in recorded');
        if (severity === 'severe') {
          status = 'severe';
        } else if (severity === 'moderate' || severity === 'mild') {
          status = 'mild';
        } else if (severity === 'none' || severity === 'calm' || severity === 'stable') {
          status = 'calm';
        }
      }

      days.push({
        dateStr: dayStr,
        dayNumber: day,
        hasCheckin: Boolean(checkin),
        status,
        symptom,
        meals,
      });
    }

    return days;
  }, [profile, mealDiary, currentYear, currentMonth, daysInMonth]);

  // Aggregate metrics
  const calmCount = monthDays.filter((d) => d.status === 'calm').length;
  const mildCount = monthDays.filter((d) => d.status === 'mild').length;
  const severeCount = monthDays.filter((d) => d.status === 'severe').length;
  const loggedDays = monthDays.filter((day) => day.hasCheckin).length;

  const activeDayStatus = monthDays.find((d) => d.dateStr === selectedDate);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Month header */}
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
              MONTHLY SYMPTOM CALENDAR
            </span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>
              {monthNames[currentMonth]} {currentYear}
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: '#F0FDFA', color: '#0F766E', border: '1px solid #CCFBF1' }}>
              {loggedDays} days with check-ins
            </span>
          </div>
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

            const statusDescription = d.status === 'none'
              ? d.symptom
              : `${d.status} symptoms: ${d.symptom}`;

            return (
              <button
                key={d.dateStr}
                type="button"
                aria-label={`${d.dateStr}, Day ${d.dayNumber}: ${statusDescription}${isSelected ? ' (Selected)' : ''}`}
                aria-pressed={isSelected}
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
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        {/* Screen Reader Table Alternative */}
        <div className="sr-only">
          <h4>{monthNames[currentMonth]} {currentYear} Health Status Alternative</h4>
          <table>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Status</th>
                <th scope="col">Symptom</th>
              </tr>
            </thead>
            <tbody>
              {monthDays.map((d) => (
                <tr key={d.dateStr}>
                  <td>{d.dateStr}</td>
                  <td>{d.status}</td>
                  <td>{d.symptom}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <span style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94A3B8' }} /> Missing or unclassified ({monthDays.length - calmCount - mildCount - severeCount})
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
                    background: activeDayStatus.status === 'calm' ? '#ECFDF5' : activeDayStatus.status === 'mild' ? '#FFFBEB' : activeDayStatus.status === 'severe' ? '#FEF2F2' : '#F1F5F9',
                    color: activeDayStatus.status === 'calm' ? '#065F46' : activeDayStatus.status === 'mild' ? '#92400E' : activeDayStatus.status === 'severe' ? '#991B1B' : '#475569',
                    border: '1px solid currentColor',
                    textTransform: 'uppercase',
                  }}
                >
                  {activeDayStatus.status === 'none' ? activeDayStatus.hasCheckin ? 'Severity not recorded' : 'No check-in' : `${activeDayStatus.status} day`}
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

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default MonthlyHealthHeatmap;
