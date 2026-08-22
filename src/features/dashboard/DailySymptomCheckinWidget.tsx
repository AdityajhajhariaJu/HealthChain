import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Check, Sparkles, Flame, ChevronRight, Edit3, HeartPulse } from 'lucide-react';
import { getProfile, recordDailyCheckin, getTodayCheckin, getRecentCheckins } from '../../services/ProfileEngine';
import { triggerHapticLight } from '../../services/haptics';

interface DailySymptomCheckinWidgetProps {
  onCheckinComplete?: (checkin: any) => void;
}

const DEFAULT_SYMPTOMS = ['Headache', 'Dizziness', 'Fatigue', 'Sinus Pressure', 'Pain', 'Overall Energy'];

const SEVERITY_OPTIONS = [
  { label: 'None', score: 0, color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', emoji: '🟢' },
  { label: 'Mild', score: 1, color: '#0EA5E9', bg: '#F0F9FF', border: '#BAE6FD', emoji: '🟡' },
  { label: 'Moderate', score: 2, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', emoji: '🟠' },
  { label: 'Severe', score: 3, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', emoji: '🔴' },
];

export default function DailySymptomCheckinWidget({ onCheckinComplete }: DailySymptomCheckinWidgetProps) {
  const [profile, setProfile] = useState(getProfile());
  const [todayCheckin, setTodayCheckin] = useState<any>(getTodayCheckin());
  const [recentCheckins, setRecentCheckins] = useState<any[]>(getRecentCheckins(7));
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [selectedSymptom, setSelectedSymptom] = useState<string>('Overall Energy');
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  // Derive top suggested symptoms from active profile conditions
  const suggestedSymptoms = useMemo(() => {
    const fromConditions = (profile?.conditions || [])
      .map((c: string) => {
        if (c.toLowerCase().includes('headache')) return 'Headache';
        if (c.toLowerCase().includes('dizz') || c.toLowerCase().includes('vertigo')) return 'Dizziness';
        if (c.toLowerCase().includes('sinus') || c.toLowerCase().includes('rhinitis')) return 'Sinus Congestion';
        if (c.toLowerCase().includes('pain') || c.toLowerCase().includes('spasm')) return 'Muscle/Neck Pain';
        if (c.toLowerCase().includes('fog') || c.toLowerCase().includes('fatigue')) return 'Brain Fog';
        return c.split(',')[0].slice(0, 18);
      })
      .filter(Boolean);

    const merged = Array.from(new Set([...fromConditions, ...DEFAULT_SYMPTOMS])).slice(0, 5);
    return merged;
  }, [profile?.conditions]);

  useEffect(() => {
    if (suggestedSymptoms.length > 0 && selectedSymptom === 'Overall Energy') {
      setSelectedSymptom(suggestedSymptoms[0]);
    }
  }, [suggestedSymptoms]);

  useEffect(() => {
    const handleUpdate = () => {
      setProfile(getProfile());
      setTodayCheckin(getTodayCheckin());
      setRecentCheckins(getRecentCheckins(7));
    };
    window.addEventListener('hc_profile_updated', handleUpdate);
    window.addEventListener('hc_daily_checkin_completed', handleUpdate);
    return () => {
      window.removeEventListener('hc_profile_updated', handleUpdate);
      window.removeEventListener('hc_daily_checkin_completed', handleUpdate);
    };
  }, []);

  const handleSelectSeverity = (option: typeof SEVERITY_OPTIONS[0]) => {
    triggerHapticLight();
    const entry = recordDailyCheckin({
      symptom: selectedSymptom,
      severity: option.label,
      score: option.score,
      note: note.trim() || undefined,
    });
    setTodayCheckin(entry);
    setRecentCheckins(getRecentCheckins(7));
    setIsEditing(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 4000);
    if (onCheckinComplete) onCheckinComplete(entry);
  };

  // Streak calculation
  const streakDays = useMemo(() => {
    if (!profile.dailyCheckins || profile.dailyCheckins.length === 0) return 0;
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const found = profile.dailyCheckins.some((c: any) => c.date && c.date.startsWith(dStr));
      if (found) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  }, [profile.dailyCheckins]);

  return (
    <div
      className="card"
      style={{
        padding: '20px 24px',
        borderRadius: '20px',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background decoration */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '180px',
          height: '100%',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(14, 165, 233, 0.04) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HeartPulse size={16} />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              10-Second Daily Check-in
            </span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              {todayCheckin && !isEditing ? `Today's Log: ${todayCheckin.symptom}` : `How is your ${selectedSymptom} today?`}
            </h3>
          </div>
        </div>

        {streakDays > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#FFF7ED',
              border: '1px solid #FFEDD5',
              padding: '3px 8px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#C2410C',
            }}
          >
            <Flame size={13} color="#EA580C" />
            <span>{streakDays} Day Streak</span>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {todayCheckin && !isEditing ? (
          /* COMPLETED TODAY VIEW */
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 16px',
                background: '#F8FAFC',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>
                  {SEVERITY_OPTIONS.find(o => o.label === todayCheckin.severity)?.emoji || '🟢'}
                </span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                    {todayCheckin.severity} {todayCheckin.symptom}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    {justSaved ? '✨ Logged! Ava & J.A.R.V.I.S. longitudinal trends updated.' : 'Feeds automatic clinical correlation into your cases.'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}
                >
                  <Edit3 size={13} /> Update
                </button>
              </div>
            </div>

            {/* 7-Day Mini Trend Indicator */}
            {recentCheckins.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', paddingLeft: '4px' }}>
                <span style={{ fontWeight: 600 }}>Past 7 Days:</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {recentCheckins.slice(0, 7).reverse().map((c, i) => {
                    const opt = SEVERITY_OPTIONS.find(o => o.label === c.severity) || SEVERITY_OPTIONS[0];
                    return (
                      <div
                        key={i}
                        title={`${new Date(c.date).toLocaleDateString(undefined, { weekday: 'short' })}: ${c.symptom} (${c.severity})`}
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: opt.color,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* ACTIVE 1-TAP CHECK-IN FORM */
          <motion.div
            key="active-form"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {/* Symptom Quick Selector Chips */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {suggestedSymptoms.map((symptom) => {
                const isSelected = selectedSymptom === symptom;
                return (
                  <button
                    key={symptom}
                    onClick={() => {
                      triggerHapticLight();
                      setSelectedSymptom(symptom);
                    }}
                    style={{
                      background: isSelected ? '#0F172A' : '#F1F5F9',
                      color: isSelected ? '#FFFFFF' : '#475569',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    {symptom}
                  </button>
                );
              })}
            </div>

            {/* 1-Tap Severity Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
              }}
            >
              {SEVERITY_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleSelectSeverity(option)}
                  style={{
                    padding: '10px 6px',
                    background: option.bg,
                    border: `1px solid ${option.border}`,
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{option.emoji}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: option.color }}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Optional Note expander */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
              <button
                onClick={() => setShowNoteInput(prev => !prev)}
                style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '11.5px', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                {showNoteInput ? 'Hide note' : '+ Add optional symptom detail / trigger'}
              </button>
              {isEditing && todayCheckin && (
                <button
                  onClick={() => setIsEditing(false)}
                  style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '11.5px', cursor: 'pointer', padding: 0 }}
                >
                  Cancel
                </button>
              )}
            </div>

            {showNoteInput && (
              <input
                type="text"
                placeholder="e.g. Worse after screen time / improving with water..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  width: '100%',
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
