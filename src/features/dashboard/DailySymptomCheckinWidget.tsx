import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Check, Sparkles, Flame, Edit3, HeartPulse, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { getProfile, recordDailyCheckin, getTodayCheckin, getRecentCheckins } from '../../services/ProfileEngine';
import { triggerHapticLight } from '../../services/haptics';

interface DailySymptomCheckinWidgetProps {
  onCheckinComplete?: (checkin: any) => void;
}

const DEFAULT_SYMPTOMS = ['Headache', 'Dizziness', 'Fatigue', 'Neck / Muscle Pain', 'Overall Energy'];

const SEVERITY_OPTIONS = [
  { label: 'None', score: 0, desc: 'Zero discomfort', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', activeBg: '#DCFCE7', emoji: '🟢' },
  { label: 'Mild', score: 1, desc: 'Slight / manageable', color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD', activeBg: '#E0F2FE', emoji: '🟡' },
  { label: 'Moderate', score: 2, desc: 'Noticeable / limiting', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', activeBg: '#FEF3C7', emoji: '🟠' },
  { label: 'Severe', score: 3, desc: 'Intense / disruptive', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', activeBg: '#FEE2E2', emoji: '🔴' },
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

  // Clean and derive candidate symptoms from active conditions
  const suggestedSymptoms = useMemo(() => {
    const rawConditions = profile?.conditions || [];
    const extracted: string[] = [];

    rawConditions.forEach((c: string) => {
      const lower = (c || '').toLowerCase();
      // Skip generic boilerplate terms
      if (lower.includes('diagnostic ambig') || lower.includes('undifferentiated') || lower.includes('unknown') || lower.includes('review')) {
        return;
      }
      if (lower.includes('headache') || lower.includes('migraine')) extracted.push('Headache');
      else if (lower.includes('dizz') || lower.includes('vertigo')) extracted.push('Dizziness');
      else if (lower.includes('sinus') || lower.includes('rhinitis')) extracted.push('Sinus Pressure');
      else if (lower.includes('neck') || lower.includes('cervical') || lower.includes('spasm') || lower.includes('pain')) extracted.push('Neck / Muscle Pain');
      else if (lower.includes('fog') || lower.includes('fatigue')) extracted.push('Fatigue / Fog');
      else if (lower.includes('nausea') || lower.includes('reflux') || lower.includes('gi')) extracted.push('Digestion');
      else {
        const clean = c.split(',')[0].trim();
        if (clean.length > 2 && clean.length <= 18) extracted.push(clean);
      }
    });

    const unique = Array.from(new Set([...extracted, ...DEFAULT_SYMPTOMS])).slice(0, 5);
    return unique;
  }, [profile?.conditions]);

  useEffect(() => {
    if (suggestedSymptoms.length > 0 && (selectedSymptom === 'Overall Energy' || !suggestedSymptoms.includes(selectedSymptom))) {
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
    setTimeout(() => setJustSaved(false), 3500);
    if (onCheckinComplete) onCheckinComplete(entry);
  };

  // 7-day streak calculation
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
      style={{
        borderRadius: '24px',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
        border: '1px solid #E2E8F0',
        boxShadow: '0 8px 30px -4px rgba(15, 23, 42, 0.05)',
        padding: '24px 28px',
        marginBottom: '28px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #A7F3D0',
            }}
          >
            <HeartPulse size={19} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                10-Second Daily Check-in
              </span>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>1-Tap Longitudinal Pulse</span>
            </div>
            <h3 style={{ margin: '2px 0 0', fontSize: '17px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px' }}>
              {todayCheckin && !isEditing ? `Today's Log: ${todayCheckin.symptom}` : `How is your ${selectedSymptom} today?`}
            </h3>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {streakDays > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#FFF7ED',
                border: '1px solid #FED7AA',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#C2410C',
              }}
            >
              <Flame size={14} color="#EA580C" />
              <span>{streakDays} Day Streak</span>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {todayCheckin && !isEditing ? (
          /* COMPLETED STATE */
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                padding: '16px 20px',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: SEVERITY_OPTIONS.find(o => o.label === todayCheckin.severity)?.bg || '#F0FDF4',
                    border: `1px solid ${SEVERITY_OPTIONS.find(o => o.label === todayCheckin.severity)?.border || '#BBF7D0'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  {SEVERITY_OPTIONS.find(o => o.label === todayCheckin.severity)?.emoji || '🟢'}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{todayCheckin.severity} {todayCheckin.symptom}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
                      ({SEVERITY_OPTIONS.find(o => o.label === todayCheckin.severity)?.desc})
                    </span>
                  </div>
                    {justSaved
                      ? '✨ Logged in your daily wellness timeline.'
                      : 'Saved in your personal daily log · Tap to update anytime'}
                </div>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <Edit3 size={14} /> Update Rating
              </button>
            </div>

            {/* 7-Day Visual Spark Bar */}
            {recentCheckins.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#64748B',
                }}
              >
                <span style={{ fontWeight: 600, color: '#334155' }}>Recent Trajectory:</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {recentCheckins.slice(0, 7).reverse().map((c, i) => {
                    const opt = SEVERITY_OPTIONS.find(o => o.label === c.severity) || SEVERITY_OPTIONS[0];
                    const dayLabel = new Date(c.date).toLocaleDateString(undefined, { weekday: 'narrow' });
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }} title={`${c.symptom}: ${c.severity}`}>
                        <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>{dayLabel}</span>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: opt.color, border: '2px solid #FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* ACTIVE 1-TAP FORM */
          <motion.div
            key="active-form"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* Symptom Selector Chips */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
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
                      background: isSelected ? '#0F172A' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#475569',
                      border: isSelected ? '1px solid #0F172A' : '1px solid #E2E8F0',
                      boxShadow: isSelected ? '0 2px 6px rgba(15, 23, 42, 0.15)' : 'none',
                      padding: '6px 14px',
                      borderRadius: '999px',
                      fontSize: '12.5px',
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
                gap: '10px',
              }}
            >
              {SEVERITY_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleSelectSeverity(option)}
                  style={{
                    padding: '14px 10px',
                    background: option.bg,
                    border: `1.5px solid ${option.border}`,
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.06)';
                    e.currentTarget.style.background = option.activeBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
                    e.currentTarget.style.background = option.bg;
                  }}
                >
                  <span style={{ fontSize: '20px', marginBottom: '2px' }}>{option.emoji}</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: option.color }}>
                    {option.label}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', textAlign: 'center', lineHeight: 1.2 }}>
                    {option.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Optional Trigger Note */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setShowNoteInput(prev => !prev)}
                style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', padding: 0, fontWeight: 500, textDecoration: 'underline' }}
              >
                {showNoteInput ? 'Hide note' : '+ Add optional trigger / context'}
              </button>
              {isEditing && todayCheckin && (
                <button
                  onClick={() => setIsEditing(false)}
                  style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                >
                  Cancel
                </button>
              )}
            </div>

            {showNoteInput && (
              <input
                type="text"
                placeholder="e.g. Worse after screen time, relieved with hydration..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  width: '100%',
                  outline: 'none',
                  background: '#FFFFFF',
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
