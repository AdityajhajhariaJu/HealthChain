import { FitnessNav } from '../../components/ui/FitnessNav';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, ChevronRight, Activity, Calendar, Award, Target, Plus, Zap } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FitnessService } from '../../services/FitnessService';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../components/ui/ToastProvider';
import { triggerHapticLight } from '../../services/haptics';

export const SportsHub: React.FC = () => {
  const isMobile = useIsMobile();
  const toast = useToast();
  const [sports, setSports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState<any | null>(null);

  useEffect(() => {
    loadSports();
  }, []);

  const loadSports = async () => {
    try {
      setLoading(true);
      // Fetching from seeded database
      const data = await FitnessService.getSports(); 
      setSports(data);
    } catch (err) {
      console.error(err);
      // Fallback if the RPC/tables aren't fully populated yet for sports specifically
            setSports([
        { id: '1', name: 'Cricket', emoji: '??', focus: 'Rotational Power & Speed', image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80', activeUsers: '1.2M' },
        { id: '2', name: 'Tennis', emoji: '??', focus: 'Agility & Kinetic Chain', image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80', activeUsers: '850K' },
        { id: '3', name: 'Football', emoji: '?', focus: 'Sprint Stamina & Core', image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80', activeUsers: '2.1M' },
        { id: '4', name: 'Athletics', emoji: '??', focus: 'Explosive Jump & Sprint', image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80', activeUsers: '920K' },
        { id: '5', name: 'Basketball', emoji: '??', focus: 'Vertical Jump & Agility', image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80', activeUsers: '1.5M' },
        { id: '6', name: 'Swimming', emoji: '??', focus: 'Shoulder Mobility & Core', image: 'https://images.unsplash.com/photo-1519315901367-f34f8589b2cc?auto=format&fit=crop&q=80', activeUsers: '600K' },
        { id: '7', name: 'Volleyball', emoji: '??', focus: 'Vertical Power & Reaction Time', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&q=80', activeUsers: '750K' },
        { id: '8', name: 'Boxing', emoji: '??', focus: 'Fast-Twitch Core & Shoulder Endurance', image: 'https://images.unsplash.com/photo-1549719386-74dfc47db431?auto=format&fit=crop&q=80', activeUsers: '1.8M' },
        { id: '9', name: 'Golf', emoji: '?', focus: 'Core Stability & Rotational Flexibility', image: 'https://images.unsplash.com/photo-1587223962930-cb7f31384c19?auto=format&fit=crop&q=80', activeUsers: '1.1M' },
        { id: '10', name: 'Martial Arts', emoji: '??', focus: 'Hip Mobility & Explosive Striking', image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80', activeUsers: '950K' },
        { id: '11', name: 'Cycling', emoji: '??', focus: 'Quad Endurance & Hip Hinge Power', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80', activeUsers: '2.5M' },
        { id: '12', name: 'Rowing', emoji: '??', focus: 'Posterior Chain & Lactic Threshold', image: 'https://images.unsplash.com/photo-1543162791-c91836585148?auto=format&fit=crop&q=80', activeUsers: '400K' },
        { id: '13', name: 'Rugby', emoji: '??', focus: 'Full Body Armor & Impact Resilience', image: 'https://images.unsplash.com/photo-1506509971987-1335b0e8b15d?auto=format&fit=crop&q=80', activeUsers: '800K' },
        { id: '14', name: 'Gymnastics', emoji: '??', focus: 'Extreme Core Control & Flexibility', image: 'https://images.unsplash.com/photo-1566352932971-f925bba5677c?auto=format&fit=crop&q=80', activeUsers: '550K' },
        { id: '15', name: 'Badminton', emoji: '??', focus: 'Multi-Directional Agility & Wrist Snap', image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80', activeUsers: '1.3M' },
        { id: '16', name: 'Table Tennis', emoji: '??', focus: 'Hand-Eye Coordination & Lateral Quickness', image: 'https://images.unsplash.com/photo-1611250282006-4484dd3fba6b?auto=format&fit=crop&q=80', activeUsers: '1.4M' },
        { id: '17', name: 'Surfing', emoji: '??', focus: 'Balance, Core & Paddling Endurance', image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80', activeUsers: '650K' },
        { id: '18', name: 'Wrestling', emoji: '??', focus: 'Isometric Strength & Grappling Leverage', image: 'https://images.unsplash.com/photo-1628863673413-5290b224e75d?auto=format&fit=crop&q=80', activeUsers: '350K' },
        { id: '19', name: 'Rock Climbing', emoji: '??', focus: 'Grip Strength & Pulling Power', image: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&q=80', activeUsers: '850K' },
        { id: '20', name: 'Hockey', emoji: '??', focus: 'Low-Stance Power & Lateral Agility', image: 'https://images.unsplash.com/photo-1515788349830-79883c076b92?auto=format&fit=crop&q=80', activeUsers: '1.1M' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#10B981' }}>Loading Sports Hub...</div>;
  }

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#F8FAFC',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '40px',
      overflowX: 'hidden'
    }}>
      <div style={{ paddingTop: isMobile ? "12px" : "24px" }}><FitnessNav /></div>
      {/* Hero Header */}
      <div style={{ padding: isMobile ? '12px 16px 0' : '24px 32px 0' }}>
        <section
          style={{
            position: 'relative',
            borderRadius: isMobile ? '20px' : '24px',
            padding: isMobile ? '32px 20px' : '48px 40px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            minHeight: '220px'
          }}
        >
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0,
            backgroundImage: 'url(https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80)',
            backgroundSize: 'cover', backgroundPosition: 'center'
          }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.6) 100%)', zIndex: 0 }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: '16px', backdropFilter: 'blur(8px)', width: 'fit-content', marginBottom: '8px' }}>
              <Target size={14} color="#10B981" />
              <span style={{ color: 'white', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Pro Training Hub</span>
            </div>
            
            <h1 style={{ margin: '0', color: 'white', fontWeight: '800', lineHeight: 1.1, fontSize: isMobile ? '32px' : '42px', letterSpacing: '-1px' }}>
              Train Like An <span style={{ color: '#10B981' }}>Athlete.</span>
            </h1>
            
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', lineHeight: 1.5, margin: '8px 0 0', fontWeight: 500 }}>
              Macrocycle programs designed for 20+ professional sports. Select your discipline to unlock periodized training.
            </p>
          </div>
        </section>
      </div>

      {/* Grid of Sports */}
      <div style={{ padding: isMobile ? '0 16px' : '0 32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Select Discipline <ChevronRight size={20} color="#94A3B8" />
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
          gap: isMobile ? '12px' : '20px' 
        }}>
          {sports.map((sport) => (
            <motion.div
              key={sport.id}
              whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { triggerHapticLight(); setSelectedSport(sport); }}
              style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(0,0,0,0.05)',
                position: 'relative'
              }}
            >
              <div style={{ height: '140px', position: 'relative' }}>
                <img src={sport.image || sport.cover_image_url} alt={sport.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0) 100%)' }} />
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.9)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  {sport.emoji}
                </div>
                <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px' }}>
                  <h3 style={{ color: 'white', fontWeight: 800, fontSize: '18px', margin: 0 }}>{sport.name}</h3>
                </div>
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Key Focus</div>
                <div style={{ fontSize: '14px', color: '#334155', fontWeight: 500, lineHeight: 1.3 }}>{sport.focus || sport.description}</div>
                
                {sport.activeUsers && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '16px' }}>
                    <Activity size={14} color="#10B981" />
                    <span style={{ fontSize: '13px', color: '#10B981', fontWeight: 600 }}>{sport.activeUsers} Training</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal for Sport Detail */}
      <AnimatePresence>
        {selectedSport && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              backgroundColor: 'white',
              overflowY: 'auto'
            }}
          >
            <div style={{ position: 'relative', height: '40vh', width: '100%' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${selectedSport.image || selectedSport.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)' }} />
              
              <button 
                onClick={() => setSelectedSport(null)}
                style={{ position: 'absolute', top: 'env(safe-area-inset-top, 44px)', left: '16px', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(12px)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
              >
                <ChevronRight size={24} color="#000" style={{ transform: 'rotate(180deg)' }} />
              </button>
            </div>

            <div style={{ padding: '0 24px 100px', marginTop: '-40px', position: 'relative', zIndex: 5 }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', marginBottom: '16px' }}>
                {selectedSport.emoji}
              </div>
              
              <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', lineHeight: 1.1 }}>
                {selectedSport.name} <br/>
                <span style={{ color: '#10B981' }}>Macrocycle.</span>
              </h1>
              
              <p style={{ fontSize: '16px', color: '#64748B', lineHeight: 1.6, marginBottom: '32px' }}>
                A complete periodized training program designed to build {selectedSport.focus?.toLowerCase()}. Split into GPP (General Physical Preparedness), SPP, and Peak phases.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '40px' }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  <Calendar size={24} color="#3B82F6" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>12 Weeks</div>
                  <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Full Cycle</div>
                </div>
                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  <Zap size={24} color="#F59E0B" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>4 Days</div>
                  <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Per Week</div>
                </div>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>Program Phases</h3>
              
              {/* Timeline UI */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  { phase: 'Phase 1: GPP', weeks: 'Weeks 1-4', desc: 'Building foundational strength, aerobic capacity, and tissue tolerance.', color: '#3B82F6' },
                  { phase: 'Phase 2: SPP', weeks: 'Weeks 5-8', desc: 'Sport-specific strength conversion. Higher intensity, complex movements.', color: '#8B5CF6' },
                  { phase: 'Phase 3: Peak', weeks: 'Weeks 9-12', desc: 'Maximal power output and speed. Tapering volume for performance.', color: '#10B981' }
                ].map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: p.color, border: '4px solid white', boxShadow: '0 0 0 2px #E2E8F0', zIndex: 2 }} />
                      {i !== 2 && <div style={{ width: '2px', flex: 1, backgroundColor: '#E2E8F0', margin: '4px 0' }} />}
                    </div>
                    <div style={{ paddingBottom: '32px', paddingTop: '-4px' }}>
                      <div style={{ fontSize: '12px', color: p.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{p.weeks}</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>{p.phase}</div>
                      <div style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.5 }}>{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px calc(16px + env(safe-area-inset-bottom, 16px))', background: 'linear-gradient(to top, rgba(255,255,255,1) 80%, rgba(255,255,255,0) 100%)', zIndex: 20 }}>
              <button
                onClick={async () => {
                  triggerHapticLight();
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session?.user) {
                    toast.error("Sign In Required", "You must be signed in to enroll in a program.");
                    return;
                  }
                  try {
                    await FitnessService.startProgram(session.user.id, selectedSport.id);
                    toast.success("Enrolled!", `You have successfully enrolled in the ${selectedSport.name} track.`);
                    setSelectedSport(null);
                  } catch (e) {
                    toast.error("Enrollment Failed", "Could not enroll in the program at this time.");
                  }
                }}
                style={{ width: '100%', backgroundColor: '#0F172A', color: 'white', fontSize: '18px', fontWeight: 700, padding: '18px', borderRadius: '24px', border: 'none', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <Plus size={20} /> Enroll in {selectedSport.name} Track
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SportsHub;
