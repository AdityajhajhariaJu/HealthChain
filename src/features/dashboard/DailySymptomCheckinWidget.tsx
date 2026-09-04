import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Edit3, HeartPulse, Sparkles, Zap, Trophy, Award, CheckCircle2, Activity, AlertCircle, AlertTriangle, MessageCircle } from 'lucide-react';
import { getProfile, recordDailyCheckin, getTodayCheckin, getRecentCheckins } from '../../services/ProfileEngine';
import { triggerHapticLight } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { trackFeatureUsed } from '../../services/analytics';

interface DailySymptomCheckinWidgetProps {
  onCheckinComplete?: (checkin: any) => void;
}

const DEFAULT_SYMPTOMS = ['Headache', 'Dizziness', 'Fatigue', 'Neck / Muscle Pain', 'Overall Energy'];

const SEVERITY_OPTIONS = [
  { label: 'None', score: 0, desc: 'Zero discomfort', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', activeBg: '#DCFCE7', iconBg: '#DCFCE7', icon: CheckCircle2 },
  { label: 'Mild', score: 1, desc: 'Slight / manageable', color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD', activeBg: '#E0F2FE', iconBg: '#E0F2FE', icon: Activity },
  { label: 'Moderate', score: 2, desc: 'Noticeable / limiting', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', activeBg: '#FEF3C7', iconBg: '#FEF3C7', icon: AlertCircle },
  { label: 'Severe', score: 3, desc: 'Intense / disruptive', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', activeBg: '#FEE2E2', iconBg: '#FEE2E2', icon: AlertTriangle },
];

export default function DailySymptomCheckinWidget({ onCheckinComplete }: DailySymptomCheckinWidgetProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getProfile());
  const [todayCheckin, setTodayCheckin] = useState<any>(getTodayCheckin());
  const [recentCheckins, setRecentCheckins] = useState<any[]>(getRecentCheckins(7));
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [selectedSymptom, setSelectedSymptom] = useState<string>('Overall Energy');
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  
  const [hydration, setHydration] = useState<string>(todayCheckin?.lifestyle?.hydration || '');
  const [sleep, setSleep] = useState<string>(todayCheckin?.lifestyle?.sleep || '');
  const [energy, setEnergy] = useState<string>(todayCheckin?.lifestyle?.energy || '');

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
      else if (lower.includes('neck') || lower.includes('cervical') || lower.includes('spasm') || lower.includes('pain')) extracted.push('Neck / Muscle Pain');
      else if (lower.includes('fog') || lower.includes('fatigue')) extracted.push('Fatigue / Fog');
      else if (lower.includes('nausea') || lower.includes('reflux') || lower.includes('gi')) extracted.push('Digestion');
      else {
        const clean = c.split(',')[0].trim();
        if (clean.length > 2 && clean.length <= 18) extracted.push(clean);
      }
    });

    return Array.from(new Set([...extracted, ...DEFAULT_SYMPTOMS])).slice(0, 5);
  }, [profile?.conditions]);

  useEffect(() => {
    if (suggestedSymptoms.length > 0 && (selectedSymptom === 'Overall Energy' || !suggestedSymptoms.includes(selectedSymptom))) {
      setSelectedSymptom(suggestedSymptoms[0]);
    }
  }, [suggestedSymptoms]);

  useEffect(() => {
    const handleUpdate = () => {
      const p = getProfile();
      const tc = getTodayCheckin();
      setProfile(p);
      setTodayCheckin(tc);
      setRecentCheckins(getRecentCheckins(7));
      if (tc?.lifestyle) {
        setHydration(tc.lifestyle.hydration || '');
        setSleep(tc.lifestyle.sleep || '');
        setEnergy(tc.lifestyle.energy || '');
      }
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
      lifestyle: { hydration, sleep, energy }
    });
    setTodayCheckin(entry);
    setRecentCheckins(getRecentCheckins(7));
    setIsEditing(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3500);

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

  const handleQuickLifestyleToggle = (type: 'hydration' | 'sleep' | 'energy', value: string) => {
    triggerHapticLight();
    let newHydration = hydration;
    let newSleep = sleep;
    let newEnergy = energy;

    if (type === 'hydration') newHydration = hydration === value ? '' : value;
    if (type === 'sleep') newSleep = sleep === value ? '' : value;
    if (type === 'energy') newEnergy = energy === value ? '' : value;

    setHydration(newHydration);
    setSleep(newSleep);
    setEnergy(newEnergy);

    const todayStr = new Date().toISOString().split('T')[0];
    awardPoints(1, 'Daily Lifestyle Tag', 'lifestyle', `lifestyle_${todayStr}`);

    if (todayCheckin) {
      const entry = recordDailyCheckin({
        symptom: todayCheckin.symptom,
        severity: todayCheckin.severity,
        score: todayCheckin.score,
        note: todayCheckin.note,
        lifestyle: { hydration: newHydration, sleep: newSleep, energy: newEnergy }
      });
      setTodayCheckin(entry);
    }
  };

  const weekDays = useMemo(() => {
    const days: any[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const checkin = (profile?.dailyCheckins || []).find((c: any) => c.date && c.date.startsWith(dateStr));
      days.push({
        dateStr,
        dayShort: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayLetter: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        isToday: i === 0,
        checkin,
        isLogged: !!checkin
      });
    }
    return days;
  }, [profile?.dailyCheckins]);

  const milestone = useMemo(() => {
    if (streakDays < 3) return { target: 3, label: '3-Day Rhythm', remaining: 3 - streakDays, icon: Zap };
    if (streakDays < 7) return { target: 7, label: '7-Day Horizon', remaining: 7 - streakDays, icon: Trophy };
    if (streakDays < 14) return { target: 14, label: '14-Day Baseline', remaining: 14 - streakDays, icon: Award };
    return { target: 30, label: '30-Day Champion', remaining: 30 - streakDays, icon: Sparkles };
  }, [streakDays]);

  return (
    <div
      style={{
        borderRadius: isMobile ? '20px' : '24px',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        padding: isMobile ? '16px' : '20px 24px',
        marginBottom: isMobile ? '16px' : '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          marginBottom: isMobile ? '12px' : '16px',
          gap: isMobile ? '8px' : '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Daily Check-in
              </span>
              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>1-Tap Log</span>
            </div>
            <h3 style={{ margin: '1px 0 0', fontSize: isMobile ? '15.5px' : '17px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px' }}>
              {todayCheckin && !isEditing ? `Today's Log: ${todayCheckin.symptom}` : `How is your ${selectedSymptom} today?`}
            </h3>
          </div>
        </div>

        {/* Streak Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: isMobile ? 'flex-start' : 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: streakDays > 0 ? '#FFF7ED' : '#F8FAFC',
              border: `1px solid ${streakDays > 0 ? '#FED7AA' : '#E2E8F0'}`,
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 700,
              color: streakDays > 0 ? '#C2410C' : '#64748B',
            }}
          >
            <Flame size={13} color={streakDays > 0 ? '#EA580C' : '#94A3B8'} />
            <span>{streakDays > 0 ? `${streakDays}d Streak` : 'Daily Log'}</span>
            {streakDays > 0 && milestone.remaining > 0 && (
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#9A3412', borderLeft: '1px solid #FDBA74', paddingLeft: '4px' }}>
                {milestone.remaining}d to {milestone.label}
              </span>
            )}
          </div>
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
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                padding: '18px 22px',
                background: '#FFFFFF',
                borderRadius: '18px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 10px rgba(15,23,42,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {(() => {
                  const opt = SEVERITY_OPTIONS.find(o => o.label === todayCheckin.severity) || SEVERITY_OPTIONS[0];
                  const Icon = opt.icon;
                  return (
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: opt.iconBg || '#DCFCE7',
                        border: `1.5px solid ${opt.border || '#BBF7D0'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: opt.color || '#059669',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      }}
                    >
                      <Icon size={18} strokeWidth={2.5} />
                    </div>
                  );
                })()}
                <div>
                  <div style={{ fontSize: '15.5px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{todayCheckin.severity} {todayCheckin.symptom}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
                      ({SEVERITY_OPTIONS.find(o => o.label === todayCheckin.severity)?.desc})
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
                    {justSaved
                      ? '✨ Logged in your daily wellness timeline!'
                      : 'Saved in your personal daily log · Tap to update anytime'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    triggerHapticLight();
                    const prompt = `I just logged my daily symptom check-in: ${todayCheckin.severity} discomfort for ${todayCheckin.symptom}${todayCheckin.note ? ` (Note: "${todayCheckin.note}")` : ''}. What clinical steps or lifestyle adjustments can help manage this?`;
                    navigate('/app/ava', { state: { initialPrompt: prompt } });
                  }}
                  className="btn btn-sm"
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    border: '1px solid #C7D2FE',
                    cursor: 'pointer',
                  }}
                >
                  <MessageCircle size={14} /> Discuss with Ava
                </button>

                <button
                  onClick={() => {
                    triggerHapticLight();
                    setSelectedSymptom(todayCheckin.symptom);
                    setNote(todayCheckin.note || '');
                    setIsEditing(true);
                  }}
                  className="btn btn-outline btn-sm"
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '10px',
                    padding: '8px 14px',
                  }}
                >
                  <Edit3 size={14} /> Update Rating
                </button>
              </div>
            </div>

            {/* Clinical Relief Triage Banner if Moderate or Severe */}
            {(todayCheckin.severity === 'Moderate' || todayCheckin.severity === 'Severe') && (
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px 16px', 
                  background: '#FEF2F2', 
                  border: '1px solid #FECACA', 
                  borderRadius: '14px', 
                  gap: '12px', 
                  flexWrap: 'wrap' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} color="#DC2626" />
                  <span style={{ fontSize: '13px', color: '#991B1B', fontWeight: 600 }}>
                    You reported {todayCheckin.severity.toLowerCase()} discomfort. Would you like clinical management guidance?
                  </span>
                </div>
                <button
                  onClick={() => {
                    triggerHapticLight();
                    navigate('/app/ava', {
                      state: {
                        initialPrompt: `I reported ${todayCheckin.severity} discomfort for ${todayCheckin.symptom}${todayCheckin.note ? ` ("${todayCheckin.note}")` : ''}. Can you guide me through clinical relief strategies, safety red flags to watch for, and what questions to prepare for my physician?`
                      }
                    });
                  }}
                  style={{
                    background: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
                  }}
                >
                  <MessageCircle size={13} /> Immediate Relief with Ava
                </button>
              </div>
            )}

            {/* Optional 1-Tap Lifestyle Quick Chips */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '12px 16px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                <Zap size={13} color="#6366F1" /> Quick Tags:
              </span>
              
              {/* Hydration */}
              <button
                onClick={() => handleQuickLifestyleToggle('hydration', '💧 2L+ Hydrated')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: hydration === '💧 2L+ Hydrated' ? '1px solid #38BDF8' : '1px solid #E2E8F0',
                  background: hydration === '💧 2L+ Hydrated' ? '#F0F9FF' : '#FFFFFF',
                  color: hydration === '💧 2L+ Hydrated' ? '#0284C7' : '#64748B',
                  transition: 'all 0.15s ease',
                }}
              >
                💧 2L+ Water {hydration === '💧 2L+ Hydrated' && '✓'}
              </button>

              {/* Sleep */}
              <button
                onClick={() => handleQuickLifestyleToggle('sleep', '⚡ 7-8h Rested')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: sleep === '⚡ 7-8h Rested' ? '1px solid #A855F7' : '1px solid #E2E8F0',
                  background: sleep === '⚡ 7-8h Rested' ? '#FAF5FF' : '#FFFFFF',
                  color: sleep === '⚡ 7-8h Rested' ? '#7E22CE' : '#64748B',
                  transition: 'all 0.15s ease',
                }}
              >
                💤 7-8h Sleep {sleep === '⚡ 7-8h Rested' && '✓'}
              </button>

              {/* Energy */}
              <button
                onClick={() => handleQuickLifestyleToggle('energy', '🚀 High Energy')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: energy === '🚀 High Energy' ? '1px solid #F59E0B' : '1px solid #E2E8F0',
                  background: energy === '🚀 High Energy' ? '#FFFBEB' : '#FFFFFF',
                  color: energy === '🚀 High Energy' ? '#B45309' : '#64748B',
                  transition: 'all 0.15s ease',
                }}
              >
                🚀 Peak Energy {energy === '🚀 High Energy' && '✓'}
              </button>
            </div>

            {/* 7-Day Week Capsule Bar (Past 6 days + Today) */}
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                padding: isMobile ? '12px 14px' : '14px 18px',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                gap: isMobile ? '10px' : '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>7-Day Week Progress:</span>
              </div>
              <div style={{ display: 'flex', gap: isMobile ? '4px' : '8px', alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                {weekDays.map((day: any, i: number) => {
                  const checkin = day.checkin;
                  const opt = checkin ? (SEVERITY_OPTIONS.find(o => o.label === checkin.severity) || SEVERITY_OPTIONS[0]) : null;
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '3px',
                        padding: isMobile ? '4px 6px' : '6px 8px',
                        borderRadius: '8px',
                        background: day.isToday ? '#F0FDFA' : (day.isLogged ? '#F8FAFC' : 'transparent'),
                        border: day.isToday ? '1.5px solid #14B8A6' : (day.isLogged ? '1px solid #E2E8F0' : '1px dashed #E2E8F0'),
                        minWidth: isMobile ? '30px' : '34px',
                      }}
                      title={checkin ? `${day.dayShort}: ${checkin.symptom} (${checkin.severity})` : `${day.dayShort}: Not logged`}
                    >
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: day.isToday ? '#0D9488' : '#64748B' }}>
                        {isMobile ? day.dayLetter : day.dayShort}
                      </span>
                      <div
                        style={{
                          width: isMobile ? '16px' : '18px',
                          height: isMobile ? '16px' : '18px',
                          borderRadius: '50%',
                          background: day.isLogged ? (opt?.bg || '#DCFCE7') : '#F1F5F9',
                          border: day.isLogged ? `1.5px solid ${opt?.color || '#10B981'}` : '1.5px solid #CBD5E1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '9px',
                          color: opt?.color || '#10B981',
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
          </motion.div>
        ) : (
          /* ACTIVE 1-TAP FORM */
          <motion.div
            key="active-form"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {/* Symptom Selector Chips */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
              {suggestedSymptoms.map((symptom) => {
                const isSelected = selectedSymptom === symptom;
                return (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setSelectedSymptom(symptom);
                    }}
                    style={{
                      background: isSelected ? '#0F172A' : '#F8FAFC',
                      color: isSelected ? '#FFFFFF' : '#475569',
                      border: isSelected ? '1px solid #0F172A' : '1px solid #E2E8F0',
                      boxShadow: isSelected ? '0 2px 4px rgba(15, 23, 42, 0.12)' : 'none',
                      padding: '5px 12px',
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

            {/* 1-Tap Severity Grid: Minimalist, Single-Row Apple Health Segmented Control */}
            <div
              role="group"
              aria-label="Select symptom severity"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: isMobile ? '6px' : '8px',
              }}
            >
              {SEVERITY_OPTIONS.map((option) => {
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleSelectSeverity(option)}
                    title={`${option.label}: ${option.desc}`}
                    style={{
                      padding: isMobile ? '9px 4px' : '10px 8px',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobile ? '4px' : '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = option.border;
                      e.currentTarget.style.background = option.bg;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: option.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: isMobile ? '12px' : '13px',
                        fontWeight: 600,
                        color: '#1E293B',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Optional Trigger Note */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-2px' }}>
              <button
                type="button"
                onClick={() => setShowNoteInput(prev => !prev)}
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
                {showNoteInput ? 'Hide note' : '+ Add note (optional)'}
              </button>
              {isEditing && todayCheckin && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: '2px 0',
                  }}
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
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  width: '100%',
                  outline: 'none',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
