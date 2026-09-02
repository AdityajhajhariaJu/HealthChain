import React, { useState, useEffect } from 'react';
import { FitnessNav } from '../../components/ui/FitnessNav';
import { motion } from 'framer-motion';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FitnessService } from '../../services/FitnessService';
import { supabase } from '../../services/supabaseClient';
import { triggerHapticLight } from '../../services/haptics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, Legend, Cell } from 'recharts';
import { Activity, Flame, Clock, Award, Target, Brain, Zap, Camera } from 'lucide-react';

export const ProgressGallery: React.FC = () => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'trends' | 'balance' | 'photos'>('trends');

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

  // 2. Process data for Balance Radar
  const getBalanceData = () => {
    let cardio = 0;
    let strength = 0;
    let mindfulness = 0;
    let flexibility = 0;
    let endurance = 0;

    history.forEach(h => {
      const type = h.fitness_content?.type || h.content_type || 'unknown';
      const cat = h.category?.slug || '';
      const diff = h.fitness_content?.difficulty || 'Beginner';

      if (type === 'meditation' || type === 'soundscape' || type === 'sleep_story') {
        mindfulness += 10;
      } else if (type === 'workout') {
        if (cat.includes('strength') || cat.includes('core')) strength += 10;
        else if (cat.includes('yoga') || cat.includes('stretch')) flexibility += 10;
        else cardio += 10;
        
        if (diff === 'Advanced') endurance += 5;
        if (h.duration_seconds > 1800) endurance += 5; // > 30 mins
      }
    });

    // Add base scores so chart looks good even if empty
    return [
      { subject: 'Cardio', A: cardio + 20, fullMark: 100 },
      { subject: 'Strength', A: strength + 15, fullMark: 100 },
      { subject: 'Mindfulness', A: mindfulness + 25, fullMark: 100 },
      { subject: 'Flexibility', A: flexibility + 10, fullMark: 100 },
      { subject: 'Endurance', A: endurance + 15, fullMark: 100 },
    ];
  };

  const radarData = getBalanceData();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#10B981' }}>Loading Analytics...</div>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FBF9F6',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '40px',
    }}>
      <div style={{ paddingTop: isMobile ? "12px" : "24px" }}><FitnessNav /></div>

      <div style={{ padding: isMobile ? '12px 16px 0' : '24px 32px 0' }}>
        <h1 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '8px' }}>
          My Analytics
        </h1>
        <p style={{ color: '#64748B', fontSize: '15px', marginBottom: '24px' }}>
          Track your trends, lifestyle balance, and transformation.
        </p>

        {/* Custom Tab Switcher */}
        <div style={{ display: 'flex', background: '#E2E8F0', padding: '4px', borderRadius: '12px', marginBottom: '24px' }}>
          {['trends', 'balance', 'photos'].map((tab) => (
            <button
              key={tab}
              onClick={() => { triggerHapticLight(); setActiveTab(tab as any); }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab ? '#FFFFFF' : 'transparent',
                color: activeTab === tab ? '#0F172A' : '#64748B',
                fontWeight: activeTab === tab ? 700 : 600,
                fontSize: '14px',
                boxShadow: activeTab === tab ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s',
                textTransform: 'capitalize'
              }}
            >
              {tab}
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
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Active Energy</h3>
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
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Exercise Minutes</h3>
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

        {/* Tab 2: Balance Radar */}
        {activeTab === 'balance' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: '#38BDF8', filter: 'blur(80px)', transform: 'translateZ(0)', willChange: 'transform', opacity: 0.3, borderRadius: '50%' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', position: 'relative', zIndex: 1 }}>
                <div style={{ background: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: '10px', color: '#38BDF8' }}><Target size={20} /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Lifestyle Balance</h3>
                </div>
              </div>
              <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                Visual mapping of your comprehensive health routine. Watch this shape expand as you tackle different workout genres.
              </p>

              <div style={{ height: '320px', width: '100%', position: 'relative', zIndex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius={isMobile ? "70%" : "80%"} data={radarData}>
                    <PolarGrid stroke="rgba(0,0,0,0.05)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }} />
                    <Radar name="My Routine" dataKey="A" stroke="#38BDF8" strokeWidth={3} fill="#38BDF8" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Pro Tip */}
              <div style={{ background: '#F1F5F9', borderRadius: '16px', padding: '16px', display: 'flex', gap: '12px', marginTop: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <Brain color="#F59E0B" size={24} style={{ flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  <strong style={{ color: '#0F172A' }}>Coach's Insight:</strong> Your mindfulness score is growing beautifully, but your flexibility could use some attention. Try a 10-minute Yoga flow tomorrow!
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 3: Photos (Existing Mock Gallery) */}
        {activeTab === 'photos' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
             <div style={{ background: '#FFF', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Transformation</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Physical progress log</p>
                </div>
                <button style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A', cursor: 'pointer', minWidth: '40px', minHeight: '40px', flexShrink: 0 }}>
                  <Camera size={18} />
                </button>
              </div>

              {/* Stacked Polaroids (Mock) */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 40px', position: 'relative' }}>
                <div style={{ position: 'relative', zIndex: 1, transform: 'rotate(-5deg) translateY(10px)', background: 'white', padding: '10px 10px 40px', borderRadius: '8px', boxShadow: '0 10px 20px rgba(0,0,0,0.08)' }}>
                  <div style={{ width: '130px', height: '150px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80" alt="Day 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ position: 'absolute', bottom: '12px', width: '100%', textAlign: 'center', fontFamily: '"Comic Sans MS", cursive, sans-serif', fontSize: '14px', fontWeight: 'bold' }}>Day 1</div>
                </div>
                
                <div style={{ position: 'absolute', zIndex: 3, transform: 'rotate(2deg) translateY(-10px)', background: 'white', padding: '12px 12px 50px', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                  <div style={{ width: '150px', height: '170px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                    <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80" alt="Day 30" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ position: 'absolute', bottom: '15px', width: '100%', textAlign: 'center', fontFamily: '"Comic Sans MS", cursive, sans-serif', fontSize: '18px', fontWeight: 'bold' }}>Day 30</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
      </div>
    </div>
  );
};

export default ProgressGallery;
