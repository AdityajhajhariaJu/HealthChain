import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { VitalityNav } from '../../components/ui/VitalityNav';
import { motion } from 'framer-motion';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FitnessService } from '../../services/FitnessService';
import { supabase } from '../../services/supabaseClient';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { useToast } from '../../components/ui/ToastProvider';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Flame, Clock, Camera, MessageSquare, ListChecks } from 'lucide-react';
import { SpatialGalleryCanvas } from '../../components/ui/SpatialGalleryCanvas';
import { getProfile } from '../../services/ProfileEngine';
import { getCases } from '../../services/CaseEngine';
import { getItemSync, setItemSync } from '../../services/storage';

export const ProgressGallery: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'trends' | 'balance' | 'photos' | 'vault'>('trends');
  const [userPhoto, setUserPhoto] = useState<string | null>(() => getItemSync('hc_progress_photo'));

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setUserPhoto(dataUrl);
        setItemSync('hc_progress_photo', dataUrl);
        triggerHapticSuccess();
        awardPoints(10, '📸 Progress Snapshot Logged', 'milestone', `photo_${Date.now()}`);
        toast.success('Private photo saved', 'Your visual note was added (+10 activity points). HealthChain does not interpret appearance as a clinical result.');
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const rawHistory = await FitnessService.getUserFitnessHistory(session.user.id);
        setHistory(rawHistory || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 1. Process data for 7-day Trend Lines
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  });

  const trendsData = last7Days.map(dateStr => {
    // find all history for this day
    const dayRecords = history.filter(h => h.completed_at?.startsWith(dateStr));
    const cals = dayRecords.reduce((sum, r) => sum + (r.calories_burned || 0), 0);
    const mins = dayRecords.reduce((sum, r) => sum + Math.round((r.duration_seconds || 0) / 60), 0);
    const dObj = new Date(dateStr);
    return {
      date: dateStr,
      displayDate: dObj.toLocaleDateString('en-US', { weekday: 'short' }),
      calories: cals,
      minutes: mins
    };
  });

  // 2. Exact activity counts. These are not health scores or clinical interpretations.
  const getRecordedActivity = () => {
    const profile = getProfile();
    const cases = getCases();

    // Nutrition Quality (from diet food logs)
    const foodLogs = profile?.dietFoodLogs || {};
    const daysLogged = Object.keys(foodLogs).length;

    // Mindfulness & Autonomic Calm (from logged sessions)
    let mindfulnessMinutes = 0;
    history.forEach(h => {
      const type = h.fitness_content?.type || h.content_type || 'unknown';
      if (type === 'meditation' || type === 'soundscape' || type === 'sleep_story' || type === 'breathwork') {
        mindfulnessMinutes += Math.round((h.duration_seconds || 300) / 60);
      }
    });

    // Circadian Sleep & Rest (from daily checkins and sleep records)
    const checkins = profile?.dailyCheckins || [];

    // Hydration & Habits
    const habitKeys = (() => {
      try {
        return Object.keys(localStorage).filter(k => k.startsWith('healthchain_habits_'));
      } catch {
        return [];
      }
    })();

    // Biomarkers & Lab Records
    const recordsCount = cases.reduce((acc, c) => acc + (c.medicalRecords?.length || 0), 0);

    return [
      { subject: 'Food log days', value: daysLogged },
      { subject: 'Calm minutes', value: mindfulnessMinutes },
      { subject: 'Check-ins', value: checkins.length },
      { subject: 'Habit days', value: habitKeys.length },
      { subject: 'Saved records', value: recordsCount },
    ];
  };

  const activityData = getRecordedActivity();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#FBF9F6',
        padding: isMobile ? '16px' : '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{ width: '180px', height: '32px', background: '#E2E8F0', borderRadius: '8px', marginBottom: '4px' }} />
        <div style={{ width: '280px', height: '18px', background: '#E2E8F0', borderRadius: '6px', marginBottom: '16px' }} />
        <div style={{
          height: isMobile ? '280px' : '360px',
          background: '#FFFFFF',
          borderRadius: '24px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ width: '180px', height: '180px', borderRadius: '50%', border: '3px dashed #CBD5E1', opacity: 0.6 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FBF9F6',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '40px',
    }}>
      <div style={{ paddingTop: isMobile ? "12px" : "24px" }}><VitalityNav /></div>

      <div style={{ padding: isMobile ? '12px 16px 0' : '24px 32px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', margin: '0 0 8px 0' }}>
              Recorded activity
            </h1>
            <p style={{ color: '#64748B', fontSize: '15px', margin: 0 }}>
              See what you actually logged. Counts are activity history, not health scores.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHapticLight();
              const totalEnergy = trendsData.reduce((s, d) => s + d.calories, 0);
              const totalRest = trendsData.reduce((s, d) => s + d.minutes, 0);
              navigate('/app/ava', {
                state: {
                  initialPrompt: `Can you summarize what I actually logged in the last 7 days? I recorded ${totalEnergy} kcal of activity estimates and ${totalRest} calming minutes. Please separate the recorded facts from assumptions, identify gaps, and suggest what may be useful to discuss with my clinician.`
                }
              });
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
              transition: 'transform 0.15s ease'
            }}
          >
            <MessageSquare size={16} color="#C4B5FD" /> Review logs with Ava
          </button>
        </div>

        {/* Custom Tab Switcher */}
        <div role="tablist" aria-label="Recorded activity sections" style={{ display: 'flex', background: '#F4E5DC', padding: '4px', borderRadius: '12px', marginBottom: '24px', overflowX: 'auto', gap: 4 }}>
          {[
            { id: 'trends', label: 'Trends' },
            { id: 'balance', label: 'Log coverage' },
            { id: 'photos', label: 'Private photos' },
            { id: 'vault', label: 'Record timeline' }
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => { triggerHapticLight(); setActiveTab(tab.id as any); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? '#FFFFFF' : 'transparent',
                color: activeTab === tab.id ? '#0F172A' : '#64748B',
                fontWeight: activeTab === tab.id ? 700 : 600,
                fontSize: '14px',
                boxShadow: activeTab === tab.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Trend Lines */}
        {activeTab === 'trends' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Calories Area Chart */}
            <div style={{ background: '#FFF', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <div style={{ background: '#FEF2F2', padding: '8px', borderRadius: '10px', color: '#EF4444' }}><Flame size={20} /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Active Energy Expenditure</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Last 7 Days (kcal)</p>
                </div>
              </div>
              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      labelStyle={{ color: '#64748B', fontWeight: 600, marginBottom: '4px' }}
                      itemStyle={{ color: '#EF4444', fontWeight: 700 }}
                    />
                    <Area type="monotone" dataKey="calories" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCalories)" activeDot={{ r: 6, strokeWidth: 0, fill: '#EF4444' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Duration Area Chart */}
            <div style={{ background: '#FFF', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <div style={{ background: '#ECFEFF', padding: '8px', borderRadius: '10px', color: '#06B6D4' }}><Clock size={20} /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Restorative & Calming Minutes</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Last 7 Days (mins)</p>
                </div>
              </div>
              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                    <Tooltip 
                      cursor={{ fill: '#F1F5F9' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      labelStyle={{ color: '#64748B', fontWeight: 600, marginBottom: '4px' }}
                      itemStyle={{ color: '#06B6D4', fontWeight: 700 }}
                    />
                    <Bar dataKey="minutes" fill="#06B6D4" radius={[6, 6, 0, 0]} barSize={isMobile ? 24 : 32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 2: Exact log coverage */}
        {activeTab === 'balance' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: '#10B981', filter: 'blur(80px)', opacity: 0.2, borderRadius: '50%' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', position: 'relative', zIndex: 1 }}>
                <div style={{ background: '#FFF1E8', padding: '8px', borderRadius: '10px', color: '#C2410C' }}><ListChecks size={20} /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>What you have recorded</h3>
                </div>
              </div>
              <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                Exact counts from your HealthChain activity. A lower count means less information was logged—not worse health.
              </p>

              <div style={{ height: '320px', width: '100%', position: 'relative', zIndex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData} layout="vertical" margin={{ top: 4, right: 20, left: isMobile ? 18 : 54, bottom: 4 }}>
                    <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis type="category" dataKey="subject" width={isMobile ? 96 : 120} axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }} />
                    <Tooltip cursor={{ fill: '#FFF1E8' }} contentStyle={{ borderRadius: 12, border: '1px solid #F8D8C6' }} />
                    <Bar dataKey="value" name="Recorded" fill="#DF7045" radius={[0, 8, 8, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div style={{ background: '#FFF9F5', borderRadius: '16px', padding: '16px', display: 'flex', gap: '12px', marginTop: '16px', border: '1px solid #F8D8C6' }}>
                <ListChecks color="#C2410C" size={24} style={{ flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                  <strong style={{ color: '#0F172A' }}>How to read this:</strong> These bars only show coverage. Use them to spot missing context before an appointment; they do not measure wellbeing, adherence, recovery, or clinical progress.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 3: Photos */}
        {activeTab === 'photos' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
             <div style={{ background: '#FFF', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Private visual notes</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Date-stamped photos for your own reference; no clinical inference</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                <button 
                  onClick={() => { triggerHapticLight(); fileInputRef.current?.click(); }}
                  title="Snap or upload progress photo"
                  aria-label="Snap or upload progress photo"
                  style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A', cursor: 'pointer', minWidth: '40px', minHeight: '40px', flexShrink: 0 }}
                >
                  <Camera size={18} />
                </button>
              </div>

              {userPhoto ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 40px', position: 'relative' }}>
                  <div style={{ position: 'relative', zIndex: 3, background: 'white', padding: '12px 12px 50px', borderRadius: '14px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0' }}>
                    <div style={{ width: '180px', height: '210px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                      <img 
                        src={userPhoto} 
                        alt="Latest Progress" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                    <div style={{ position: 'absolute', bottom: '15px', width: '100%', textAlign: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.3px' }}>Current Benchmark</div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '20px', border: '1.5px dashed #CBD5E1', margin: '16px 0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', marginBottom: '16px' }}>
                    <Camera size={26} />
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>
                    No private photos yet
                  </h4>
                  <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748B', maxWidth: '340px', lineHeight: 1.5 }}>
                    Add a date-stamped photo if it helps you remember a visible change. HealthChain does not diagnose or score appearance.
                  </p>
                  <button
                    type="button"
                    onClick={() => { triggerHapticLight(); fileInputRef.current?.click(); }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Camera size={16} /> Add private photo
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tab 4: 3D Spatial Health Records Vault */}
        {activeTab === 'vault' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ background: '#FFF', padding: isMobile ? '16px' : '24px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                  Spatial Memory Vault
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                  Explore your saved laboratory records, imaging, and case snapshots by date. Items shown here remain source records, not diagnoses.
                </p>
              </div>
              <SpatialGalleryCanvas />
            </div>
          </motion.div>
        )}
        
      </div>
    </div>
  );
};

export default ProgressGallery;
