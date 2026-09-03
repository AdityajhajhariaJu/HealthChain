import { FitnessNav } from '../../components/ui/FitnessNav';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Share, X, Award, Star, Zap, Activity } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FitnessService } from '../../services/FitnessService';
import { supabase } from '../../services/supabaseClient';
import { triggerHapticLight } from '../../services/haptics';

// Static Badge Dictionary for rich metadata
const BADGE_DICTIONARY = [
  { slug: 'first_workout', title: 'First Step', desc: 'Completed your first ever session.', icon: '🥉', color: '#F59E0B', rarity: 'Common' },
  { slug: '3_day_streak', title: 'Momentum', desc: 'Maintained a 3-day active streak.', icon: '🔥', color: '#EF4444', rarity: 'Uncommon' },
  { slug: '10_workouts', title: 'Dedicated', desc: 'Completed 10 total sessions.', icon: '🥇', color: '#10B981', rarity: 'Rare' },
  { slug: 'mindful_master', title: 'Zen Master', desc: 'Logged 5 mindfulness minutes.', icon: '🧘', color: '#8B5CF6', rarity: 'Rare' },
  { slug: 'early_bird', title: 'Early Bird', desc: 'Completed a workout before 6 AM.', icon: '🌅', color: '#3B82F6', rarity: 'Epic' },
  { slug: 'night_owl', title: 'Night Owl', desc: 'Completed a workout after 9 PM.', icon: '🦉', color: '#6366F1', rarity: 'Epic' },
  { slug: 'iron_lungs', title: 'Iron Lungs', desc: 'Finished the advanced breathing track.', icon: '💨', color: '#06B6D4', rarity: 'Legendary' },
  { slug: 'marathoner', title: 'Marathoner', desc: 'Burned over 10,000 active calories.', icon: '👟', color: '#F43F5E', rarity: 'Legendary' }
];

export const TrophyCabinet: React.FC = () => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [earnedSlugs, setEarnedSlugs] = useState<Set<string>>(new Set());
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const badges = await FitnessService.getUserBadges(session.user.id);
        const slugs = new Set(badges.map(b => b.badge_slug));
        setEarnedSlugs(slugs);
        
        // Mock data if none earned yet
        if (slugs.size === 0) {
          setEarnedSlugs(new Set(['first_workout', 'early_bird']));
        }
      } else {
        // Mock data for preview
        setEarnedSlugs(new Set(['first_workout', '3_day_streak', 'mindful_master']));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#8B5CF6' }}>Loading Trophies...</div>;
  }

  const earnedCount = earnedSlugs.size;
  const totalCount = BADGE_DICTIONARY.length;

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#FBF9F6', // Dark cinematic theme
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '40px',
      overflowX: 'hidden'
    }}>
      <div style={{ paddingTop: isMobile ? "12px" : "24px" }}><FitnessNav /></div>
      {/* Header */}
      <div style={{ padding: isMobile ? '32px 24px 16px' : '48px 40px 24px' }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? '32px' : '42px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
          Trophy Cabinet <Trophy size={32} color="#F59E0B" />
        </h1>
        <p style={{ margin: '8px 0 0', color: '#64748B', fontSize: '16px' }}>Your lifetime achievements and milestones.</p>
      </div>

      <div style={{ padding: isMobile ? '0 24px 24px' : '0 40px 40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', backgroundColor: 'rgba(0,0,0,0.02)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>{earnedCount}/{totalCount}</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Unlocked</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderLeft: '1px solid rgba(0,0,0,0.05)', borderRight: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#8B5CF6' }}>Top 5%</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Ranking</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>{earnedCount * 150}</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Points</div>
          </div>
        </div>

        {/* Badges Grid */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '24px' }}>All Badges</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
            gap: '16px' 
          }}>
            {BADGE_DICTIONARY.map((badge, idx) => {
              const isEarned = earnedSlugs.has(badge.slug);
              
              return (
                <motion.div 
                  key={badge.slug}
                  whileHover={isEarned ? { scale: 1.05, y: -4 } : {}}
                  whileTap={isEarned ? { scale: 0.95 } : {}}
                  onClick={() => {
                    if (isEarned) {
                      triggerHapticLight();
                      setSelectedBadge(badge);
                    }
                  }}
                  style={{
                    backgroundColor: isEarned ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.02)',
                    borderRadius: '24px',
                    padding: '24px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    border: `1px solid ${isEarned ? badge.color : 'rgba(0,0,0,0.02)'}`,
                    cursor: isEarned ? 'pointer' : 'default',
                    opacity: isEarned ? 1 : 0.4,
                    boxShadow: isEarned ? `0 10px 25px -5px ${badge.color}40` : 'none',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Glossy overlay */}
                  {isEarned && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }} />
                  )}

                  <div style={{ 
                    fontSize: '48px', 
                    marginBottom: '12px',
                    filter: isEarned ? `drop-shadow(0 0 12px ${badge.color})` : 'grayscale(100%)',
                  }}>
                    {badge.icon}
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>{badge.title}</h3>
                  {isEarned ? (
                    <span style={{ fontSize: '11px', color: badge.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{badge.rarity}</span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>LOCKED</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Share/Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              backgroundColor: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px'
            }}
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '360px',
                background: `linear-gradient(135deg, #FFFFFF 0%, #FBF9F6 100%)`,
                borderRadius: '32px',
                padding: '32px',
                boxShadow: `0 25px 50px -12px ${selectedBadge.color}60`,
                border: `1px solid ${selectedBadge.color}80`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                textAlign: 'center', position: 'relative', overflow: 'hidden'
              }}
            >
              <button 
                onClick={() => setSelectedBadge(null)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>

              {/* Decorative Background Glow */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) translateZ(0)', width: '200px', height: '200px', borderRadius: '50%', background: selectedBadge.color, filter: 'blur(80px)', willChange: 'transform', opacity: 0.3, zIndex: 0 }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ 
                  fontSize: '80px', 
                  marginBottom: '24px',
                  filter: `drop-shadow(0 0 20px ${selectedBadge.color})`,
                }}>
                  {selectedBadge.icon}
                </div>
                
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${selectedBadge.color}20`, padding: '6px 12px', borderRadius: '12px', marginBottom: '16px', border: `1px solid ${selectedBadge.color}40` }}>
                  <Star size={14} color={selectedBadge.color} fill={selectedBadge.color} />
                  <span style={{ color: selectedBadge.color, fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {selectedBadge.rarity} Achievement
                  </span>
                </div>

                <h2 style={{ color: '#0F172A', fontSize: '32px', fontWeight: 900, margin: '0 0 12px', lineHeight: 1.1 }}>
                  {selectedBadge.title}
                </h2>
                <p style={{ color: '#64748B', fontSize: '16px', lineHeight: 1.5, margin: '0 0 40px' }}>
                  {selectedBadge.desc}
                </p>

                                  <button
                    onClick={() => {
                      triggerHapticLight();
                      if (navigator.share) {
                        navigator.share({
                          title: `I unlocked the ${selectedBadge.title} badge!`,
                          text: `I just earned the ${selectedBadge.title} achievement on HealthChain360!`,
                          url: window.location.href,
                        }).catch(console.error);
                      } else {
                        alert('Your browser does not support native sharing. Screenshot this card instead!');
                      }
                    }}
                  style={{
                    width: '100%',
                    backgroundColor: selectedBadge.color,
                    color: '#0F172A',
                    fontSize: '16px',
                    fontWeight: 700,
                    padding: '16px',
                    borderRadius: '20px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }}
                >
                  <Share size={20} /> Share Achievement
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrophyCabinet;

