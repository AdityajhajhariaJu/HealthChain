import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, HeartPulse, CheckCircle2 } from 'lucide-react';
import { getProfile, recordDailyCheckin, getTodayCheckin, getRecentCheckins } from '../../services/ProfileEngine';
import { triggerHapticLight } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { trackFeatureUsed } from '../../services/analytics';

interface DailySymptomCheckinWidgetProps {
  onCheckinComplete?: (checkin: any) => void;
}

const DEFAULT_SYMPTOMS = ['Headache', 'Dizziness', 'Fatigue', 'Neck Pain', 'Overall Energy'];

const SEVERITY_OPTIONS = [
  { label: 'None', score: 0, desc: 'Zero discomfort', color: '#059669', bg: '#F0FDF4', border: '#86EFAC', activeBg: '#DCFCE7' },
  { label: 'Mild', score: 1, desc: 'Slight / manageable', color: '#0284C7', bg: '#F0F9FF', border: '#7DD3FC', activeBg: '#E0F2FE' },
  { label: 'Moderate', score: 2, desc: 'Noticeable / limiting', color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', activeBg: '#FEF3C7' },
  { label: 'Severe', score: 3, desc: 'Intense / disruptive', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', activeBg: '#FEE2E2' },
];

export default function DailySymptomCheckinWidget({ onCheckinComplete }: DailySymptomCheckinWidgetProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getProfile());
  const [todayCheckin, setTodayCheckin] = useState<any>(getTodayCheckin());
  const [, setRecentCheckins] = useState<any[]>(getRecentCheckins(7));
  const [justSaved, setJustSaved] = useState(false);
  const [selectedSymptom, setSelectedSymptom] = useState<string>('Headache');
  const [note, setNote] = useState(todayCheckin?.note || '');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const suggestedSymptoms = useMemo(() => {
    const rawConditions = profile?.conditions || [];
    const extracted: string[] = [];

    rawConditions.forEach((c: string) => {
      const lower = (c || '').toLowerCase();
      if (lower.includes('diagnostic ambig') || lower.includes('undifferentiated') || lower.includes('unknown') || lower.includes('review')) {
        return;
      }
      if (lower.includes('headache') || lower.includes('migraine')) extracted.push('Headache');
      else if (lower.includes('dizz') || lower.includes('vertigo')) extracted.push('Dizziness');
      else if (lower.includes('sinus') || lower.includes('rhinitis')) extracted.push('Sinus Pressure');
      else if (lower.includes('neck') || lower.includes('cervical') || lower.includes('spasm') || lower.includes('pain')) extracted.push('Neck Pain');
      else if (lower.includes('fog') || lower.includes('fatigue')) extracted.push('Fatigue');
      else if (lower.includes('nausea') || lower.includes('reflux') || lower.includes('gi')) extracted.push('Digestion');
      else {
        const clean = c.split(',')[0].trim();
        if (clean.length > 2 && clean.length <= 14) extracted.push(clean);
      }
    });

    return Array.from(new Set([...extracted, ...DEFAULT_SYMPTOMS])).slice(0, 5);
  }, [profile?.conditions]);

  useEffect(() => {
    if (todayCheckin?.symptom) {
      setSelectedSymptom(todayCheckin.symptom);
      if (todayCheckin.note) setNote(todayCheckin.note);
    } else if (suggestedSymptoms.length > 0 && !suggestedSymptoms.includes(selectedSymptom)) {
      setSelectedSymptom(suggestedSymptoms[0]);
    }
  }, [suggestedSymptoms, todayCheckin]);

  useEffect(() => {
    const handleUpdate = () => {
      const p = getProfile();
      const tc = getTodayCheckin();
      setProfile(p);
      setTodayCheckin(tc);
      setRecentCheckins(getRecentCheckins(7));
      if (tc?.note) setNote(tc.note);
    };
    window.addEventListener('hc_profile_updated', handleUpdate);
    window.addEventListener('hc_daily_checkin_completed', handleUpdate);
    return () => {
      window.removeEventListener('hc_profile_updated', handleUpdate);
      window.removeEventListener('hc_daily_checkin_completed', handleUpdate);
    };
  }, []);

  const streakDays = useMemo(() => {
    if (!profile?.dailyCheckins || profile.dailyCheckins.length === 0) return 0;
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dLocalStr = `${year}-${month}-${day}`;
      const dIsoStr = d.toISOString().split('T')[0];
      const found = profile.dailyCheckins.some((c: any) => c?.date && (c.date.startsWith(dLocalStr) || c.date.startsWith(dIsoStr)));
      if (found) streak++;
      else if (i > 0) break;
    }
    return streak;
  }, [profile?.dailyCheckins]);

  const handleSelectSeverity = (option: typeof SEVERITY_OPTIONS[0]) => {
    triggerHapticLight();
    const entry = recordDailyCheckin({
      symptom: selectedSymptom,
      severity: option.label,
      score: option.score,
      note: note.trim() || undefined,
      lifestyle: todayCheckin?.lifestyle || {}
    });
    setTodayCheckin(entry);
    setRecentCheckins(getRecentCheckins(7));
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);

    // Award Vitality Points
    const todayStr = new Date().toISOString().split('T')[0];
    awardPoints(2, `Daily Log: ${selectedSymptom}`, 'checkin', `checkin_${todayStr}`);
    trackFeatureUsed('daily_checkin', { symptom: selectedSymptom, severity: option.label, score: option.score });

    if (streakDays + 1 === 3) {
      awardPoints(5, '🔥 3-Day Rhythm Streak Milestone', 'streak', `streak_3_${todayStr}`);
    } else if (streakDays + 1 === 7) {
      awardPoints(15, '🌟 7-Day Horizon Master Milestone', 'milestone', `streak_7_${todayStr}`);
    }

    if (onCheckinComplete) onCheckinComplete(entry);
  };

  const weekDays = useMemo(() => {
    const days: any[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateLocalStr = `${year}-${month}-${day}`;
      const dateIsoStr = d.toISOString().split('T')[0];
      const checkin = (profile?.dailyCheckins || []).find((c: any) => c.date && (c.date.startsWith(dateIsoStr) || c.date.startsWith(dateLocalStr)));
      days.push({
        dayShort: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayLetter: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        isToday: i === 0,
        checkin,
        isLogged: !!checkin
      });
    }
    return days;
  }, [profile?.dailyCheckins]);

  return (
    <div
      style={{
        borderRadius: isMobile ? '20px' : '24px',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        padding: isMobile ? '14px' : '20px 22px',
        marginBottom: isMobile ? '16px' : '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header: Clean, balanced 2-column layout that never breaks on mobile */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '9px',
              background: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #A7F3D0',
              flexShrink: 0,
            }}
          >
            <HeartPulse size={16} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>
              Daily Check-in
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '1px 6px', borderRadius: '999px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              +2 PTS
            </span>
          </div>
        </div>

        {/* Aligned Streak Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: streakDays > 0 ? '#FFF7ED' : '#F8FAFC',
            border: `1px solid ${streakDays > 0 ? '#FED7AA' : '#E2E8F0'}`,
            padding: '3px 9px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 700,
            color: streakDays > 0 ? '#C2410C' : '#64748B',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <Flame size={12} color={streakDays > 0 ? '#EA580C' : '#94A3B8'} />
          <span style={{ whiteSpace: 'nowrap' }}>{streakDays > 0 ? `${streakDays}d Streak` : 'Daily Log'}</span>
        </div>
      </div>

      {/* Main Question Title */}
      <h3 style={{ margin: '0 0 10px', fontSize: isMobile ? '16px' : '17.5px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px' }}>
        {selectedSymptom === 'Overall Energy'
          ? 'How is your energy today?'
          : `How is your ${selectedSymptom} today?`}
      </h3>

      {/* Symptom Focus Pills: Horizontal scroll with zero truncation */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '2px',
          marginBottom: '14px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {suggestedSymptoms.map((symptom) => {
          const isSelected = selectedSymptom === symptom;
          const hasLogForThis = todayCheckin?.symptom === symptom;
          return (
            <button
              key={symptom}
              type="button"
              onClick={() => {
                triggerHapticLight();
                setSelectedSymptom(symptom);
              }}
              aria-label={`Select symptom focus: ${symptom}`}
              style={{
                background: isSelected ? '#0F172A' : (hasLogForThis ? '#ECFDF5' : '#F8FAFC'),
                color: isSelected ? '#FFFFFF' : (hasLogForThis ? '#059669' : '#475569'),
                border: isSelected ? '1px solid #0F172A' : (hasLogForThis ? '1px solid #A7F3D0' : '1px solid #E2E8F0'),
                boxShadow: isSelected ? '0 2px 4px rgba(15, 23, 42, 0.12)' : 'none',
                padding: '5px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: isSelected ? 700 : (hasLogForThis ? 600 : 500),
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{symptom}</span>
              {hasLogForThis && <span style={{ fontSize: '10px' }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* 4-Option Severity Row: Always workable & responsive */}
      <div
        role="group"
        aria-label="Select symptom severity"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: isMobile ? '6px' : '8px',
          marginBottom: '10px',
        }}
      >
        {SEVERITY_OPTIONS.map((option) => {
          const isCurrentlyLogged = todayCheckin?.symptom === selectedSymptom && todayCheckin?.severity === option.label;
          return (
            <button
              key={option.label}
              type="button"
              onClick={() => handleSelectSeverity(option)}
              aria-label={`Mark ${option.label} for ${selectedSymptom}: ${option.desc}`}
              style={{
                padding: isMobile ? '10px 4px' : '11px 8px',
                background: isCurrentlyLogged ? option.activeBg : '#FFFFFF',
                border: isCurrentlyLogged ? `2px solid ${option.color}` : '1px solid #E2E8F0',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isCurrentlyLogged ? `0 2px 8px ${option.color}25` : '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: option.color,
                    flexShrink: 0,
                  }}
                />
                {isCurrentlyLogged && (
                  <span style={{ fontSize: '10px', color: option.color, fontWeight: 900 }}>✓</span>
                )}
              </div>
              <span
                style={{
                  fontSize: isMobile ? '12px' : '13px',
                  fontWeight: isCurrentlyLogged ? 800 : 600,
                  color: isCurrentlyLogged ? option.color : '#1E293B',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {option.label}
              </span>
              <span
                style={{
                  fontSize: '9.5px',
                  color: isCurrentlyLogged ? option.color : '#94A3B8',
                  lineHeight: 1,
                  fontWeight: isCurrentlyLogged ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}
              >
                {option.score === 0 ? 'Zero' : option.desc.split('/')[0].trim()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Immediate Status Feedback (When logged) */}
      {todayCheckin && todayCheckin.symptom === selectedSymptom && (
        <motion.div
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 11px',
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '10px',
            marginBottom: '10px',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={13} color="#059669" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#065F46' }}>
              {todayCheckin.severity === 'None'
                ? `No ${todayCheckin.symptom} reported today`
                : `${todayCheckin.severity} ${todayCheckin.symptom} logged`}
            </span>
            {justSaved && (
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#059669', background: '#DCFCE7', padding: '1px 5px', borderRadius: '4px' }}>
                +2 PTS!
              </span>
            )}
          </div>

          {(todayCheckin.severity === 'Moderate' || todayCheckin.severity === 'Severe') && (
            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                navigate('/app/ava', {
                  state: {
                    initialPrompt: `I reported ${todayCheckin.severity} ${todayCheckin.symptom}. Can you suggest clinical relief strategies and what safety signs I should monitor?`
                  }
                });
              }}
              style={{
                background: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              Relief tips with Ava →
            </button>
          )}
        </motion.div>
      )}

      {/* Optional Note Row */}
      <div style={{ marginBottom: '10px' }}>
        {!showNoteInput && !note ? (
          <button
            type="button"
            onClick={() => setShowNoteInput(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '2px 0',
              fontWeight: 500,
            }}
          >
            + Add note (optional)
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="e.g. Worse in afternoon, improved with rest..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => {
                if (todayCheckin && note !== todayCheckin.note) {
                  const entry = recordDailyCheckin({
                    symptom: selectedSymptom,
                    severity: todayCheckin.severity,
                    score: todayCheckin.score,
                    note: note.trim() || undefined,
                    lifestyle: todayCheckin.lifestyle || {}
                  });
                  setTodayCheckin(entry);
                }
              }}
              aria-label="Optional note describing symptom context or triggers"
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                flex: 1,
                outline: 'none',
                background: '#FFFFFF',
                color: '#0F172A',
              }}
            />
            {note && (
              <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>Saved</span>
            )}
          </div>
        )}
      </div>

      {/* Compact 7-Day Rhythm Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '8px',
          borderTop: '1px solid #F1F5F9',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>
          7-Day Rhythm
        </span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {weekDays.map((day: any, i: number) => {
            const checkin = day.checkin;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                }}
                title={checkin ? `${day.dayShort}: ${checkin.symptom} (${checkin.severity})` : `${day.dayShort}: Not logged`}
              >
                <span style={{ fontSize: '9px', fontWeight: 700, color: day.isToday ? '#0D9488' : '#94A3B8' }}>
                  {day.dayLetter}
                </span>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: day.isLogged ? '#DCFCE7' : (day.isToday ? '#F0FDFA' : '#F1F5F9'),
                    border: day.isLogged ? '1.5px solid #10B981' : (day.isToday ? '1.5px solid #14B8A6' : '1px solid #E2E8F0'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8.5px',
                    color: day.isLogged ? '#059669' : '#94A3B8',
                    fontWeight: 800,
                  }}
                >
                  {day.isLogged ? '✓' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
