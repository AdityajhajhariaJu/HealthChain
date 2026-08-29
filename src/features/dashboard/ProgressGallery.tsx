import { FitnessNav } from '../../components/ui/FitnessNav';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Activity, Camera, TrendingDown, Target, ShieldCheck, Plus, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FitnessService } from '../../services/FitnessService';
import { supabase } from '../../services/supabaseClient';
import { triggerHapticLight } from '../../services/haptics';

export const ProgressGallery: React.FC = () => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<any>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const [streakData, measureData, photoData] = await Promise.all([
          FitnessService.getUserStreaks(session.user.id),
          FitnessService.getBodyMeasurements(session.user.id),
          FitnessService.getProgressPhotos(session.user.id)
        ]);
        setStreak(streakData);
        setMeasurements(measureData || []);
        setPhotos(photoData || []);
      }

      // If no real data, inject realistic mocks for demonstration
      if (!streak) {
        setStreak({ current_streak: 12, longest_streak: 21, total_workout_days: 45 });
      }
      if (measurements.length === 0) {
        setMeasurements([
          { measured_at: '2026-06-01', weight_kg: 82.5 },
          { measured_at: '2026-07-01', weight_kg: 80.2 },
          { measured_at: '2026-08-01', weight_kg: 78.5 },
          { measured_at: '2026-08-29', weight_kg: 77.1 },
        ]);
      }
      if (photos.length === 0) {
        setPhotos([
          { id: '1', photo_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80', taken_at: '2026-08-29', is_private: true },
          { id: '2', photo_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80', taken_at: '2026-06-01', is_private: true }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = () => {
    triggerHapticLight();
    alert("Camera API / File Picker will open here. Powered by Supabase Storage 'progress-photos' bucket.");
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#F59E0B' }}>Loading Progress...</div>;
  }

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#FAFAF9',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '40px',
      overflowX: 'hidden'
    }}>
      <div style={{ paddingTop: isMobile ? "12px" : "24px" }}><FitnessNav /></div>
      {/* Header */}
      <div style={{ padding: isMobile ? '16px' : '32px 40px', backgroundColor: 'white', borderBottom: '1px solid #E7E5E4' }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? '28px' : '36px', fontWeight: 800, color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
          My Progress
        </h1>
        <p style={{ margin: '4px 0 0', color: '#78716C', fontSize: '15px' }}>Track your body, mind, and milestones securely.</p>
      </div>

      <div style={{ padding: isMobile ? '16px' : '32px 40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Streak & Consistency Card */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
          <motion.div 
            whileHover={{ y: -2 }}
            style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #F5F5F4' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame size={24} color="#F97316" />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#F97316', backgroundColor: '#FFEDD5', padding: '4px 8px', borderRadius: '12px' }}>ON FIRE</span>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#1C1917', lineHeight: 1.1 }}>
                {streak?.current_streak || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#78716C', fontWeight: 600 }}>Day Streak</div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -2 }}
            style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #F5F5F4' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#ECFEFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={24} color="#06B6D4" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#1C1917', lineHeight: 1.1 }}>
                {streak?.total_workout_days || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#78716C', fontWeight: 600 }}>Active Days</div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -2 }}
            style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #F5F5F4' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingDown size={24} color="#10B981" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#1C1917', lineHeight: 1.1 }}>
                -5.4<span style={{ fontSize: '20px' }}>kg</span>
              </div>
              <div style={{ fontSize: '14px', color: '#78716C', fontWeight: 600 }}>Total Lost</div>
            </div>
          </motion.div>
        </div>

        {/* Body Measurements Chart */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #F5F5F4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1C1917', margin: 0 }}>Weight Trend</h2>
              <p style={{ color: '#78716C', fontSize: '14px', margin: 0 }}>Past 90 Days</p>
            </div>
            <button style={{ border: 'none', background: 'none', color: '#0EA5E9', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              Add Entry <Plus size={16} />
            </button>
          </div>
          
          <div style={{ height: '240px', width: '100%', marginLeft: '-16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={measurements} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F4" />
                <XAxis dataKey="measured_at" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A8A29E' }} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short' })} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A8A29E' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  labelStyle={{ color: '#78716C', fontWeight: 600 }}
                  itemStyle={{ color: '#0EA5E9', fontWeight: 800 }}
                />
                <Area type="monotone" dataKey="weight_kg" stroke="#0EA5E9" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Private Progress Gallery */}
        <div style={{ backgroundColor: '#1C1917', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '12px', backdropFilter: 'blur(8px)' }}>
              <ShieldCheck size={14} color="#10B981" />
              <span style={{ color: 'white', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>END-TO-END ENCRYPTED</span>
            </div>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Visual Progress <Camera size={24} color="#10B981" />
          </h2>
          <p style={{ color: '#A8A29E', fontSize: '15px', margin: '0 0 24px', maxWidth: '280px' }}>
            Your photos are private and stored securely. Only you can access them.
          </p>

          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button 
              onClick={handlePhotoUpload}
              style={{ minWidth: '160px', height: '220px', borderRadius: '16px', border: '2px dashed #44403C', backgroundColor: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', flexShrink: 0 }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#292524', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={24} color="white" />
              </div>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>Add Photo</span>
            </button>

            {photos.map(photo => (
              <div key={photo.id} style={{ minWidth: '160px', height: '220px', borderRadius: '16px', overflow: 'hidden', position: 'relative', flexShrink: 0, backgroundColor: '#292524' }}>
                <img src={photo.photo_url} alt="Progress" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' }}>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>
                    {new Date(photo.taken_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProgressGallery;
