import { VitalityNav } from '../../components/ui/VitalityNav';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Share, X, Star, MessageSquare } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FitnessService } from '../../services/FitnessService';
import { supabase } from '../../services/supabaseClient';
import { triggerHapticLight } from '../../services/haptics';
import { getVitalityState } from '../../services/VitalityPointsEngine';
import { useToast } from '../../components/ui/ToastProvider';

// Static Badge Dictionary for rich metadata
const BADGE_DICTIONARY = [
  { slug: 'first_checkin', title: 'First Health Check-in', desc: 'Recorded your first health check-in.', icon: '📝', color: '#D97706', category: 'Check-in' },
  { slug: '3_day_streak', title: 'Three Check-ins Recorded', desc: 'Recorded check-ins on three consecutive days. Missing a day never erases your history.', icon: '📅', color: '#DF7045', category: 'Continuity' },
  { slug: 'clinical_scholar', title: 'Research Reviewed', desc: 'Opened clinical research and explored its relevance.', icon: '🧬', color: '#059669', category: 'Research' },
  { slug: 'mindful_master', title: 'Calm Session Recorded', desc: 'Completed five minutes of a calming exercise.', icon: '🧘', color: '#7C3AED', category: 'Zen Mode' },
  { slug: 'early_bird', title: 'Morning Vitals Recorded', desc: 'Added a morning vital reading before 9 AM.', icon: '🌅', color: '#2563EB', category: 'Record' },
  { slug: 'night_owl', title: 'Evening Reflection Recorded', desc: 'Added a health note after 8 PM.', icon: '🌙', color: '#6366F1', category: 'Reflection' },
  { slug: 'iron_lungs', title: 'Breathing Session Recorded', desc: 'Completed a guided breathing reset.', icon: '💨', color: '#0891B2', category: 'Zen Mode' },
  { slug: 'profile_complete', title: 'Health Profile Organized', desc: 'Completed the core health profile fields used for case context.', icon: '🛡️', color: '#BE123C', category: 'Profile' }
];

export const TrophyCabinet: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [earnedSlugs, setEarnedSlugs] = useState<Set<string>>(new Set());
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedBadge) {
        setSelectedBadge(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBadge]);

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
      } else {
        // Guest user starts with zero unlocked badges until earned
        setEarnedSlugs(new Set());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div role="status" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#7C3AED' }}>Loading milestones…</div>;
  }

  const earnedCount = earnedSlugs.size;
  const totalCount = BADGE_DICTIONARY.length;
  const vitalityState = getVitalityState();

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#FBF9F6',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '40px',
      overflowX: 'hidden'
    }}>
      <div style={{ paddingTop: isMobile ? "12px" : "24px" }}><VitalityNav /></div>
      {/* Header */}
      <div style={{ padding: isMobile ? '32px 24px 16px' : '48px 40px 24px' }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? '32px' : '42px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
          Milestones <Trophy size={32} color="#DF7045" />
        </h1>
        <p style={{ margin: '8px 0 0', color: '#64748B', fontSize: '16px' }}>A calm record of useful actions—not a measure of your health or worth.</p>
      </div>

      <div style={{ padding: isMobile ? '0 24px 24px' : '0 40px 40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', backgroundColor: 'rgba(0,0,0,0.02)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>{earnedCount}/{totalCount}</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Recorded</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderLeft: '1px solid rgba(0,0,0,0.05)', borderRight: '1px solid rgba(0,0,0,0.05)', padding: '0 4px' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#8B5CF6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{vitalityState.tier}</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Activity level</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>{vitalityState.points}</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Activity points</div>
          </div>
        </div>

        {/* Badges Grid */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>Your recorded milestones</h2>
          <p style={{ color: '#64748B', fontSize: '13px', margin: '0 0 24px' }}>They mark completed actions only. There are no random rewards, penalties, or lost progress.</p>
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
                  role={isEarned ? "button" : undefined}
                  tabIndex={isEarned ? 0 : undefined}
                  aria-label={`${badge.title} - ${isEarned ? 'recorded' : 'not yet recorded'}`}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && isEarned) {
                      e.preventDefault();
                      triggerHapticLight();
                      setSelectedBadge(badge);
                    }
                  }}
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
                    <span style={{ fontSize: '11px', color: badge.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{badge.category}</span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Not yet recorded</span>
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
            role="dialog"
            aria-modal="true"
            aria-label={selectedBadge.title}
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
              role="dialog"
              aria-modal="true"
              aria-label={`Achievement: ${selectedBadge.title}`}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '360px',
                maxHeight: 'min(90vh, 580px)',
                overflowY: 'auto',
                background: `linear-gradient(135deg, #FFFFFF 0%, #FBF9F6 100%)`,
                borderRadius: '32px',
                padding: '32px 24px',
                boxShadow: `0 25px 50px -12px ${selectedBadge.color}60`,
                border: `1px solid ${selectedBadge.color}80`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                textAlign: 'center', position: 'relative'
              }}
            >
              <button 
                type="button"
                onClick={() => setSelectedBadge(null)}
                aria-label="Close milestone dialog"
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A', cursor: 'pointer' }}
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
                    {selectedBadge.category} milestone
                  </span>
                </div>

                <h2 style={{ color: '#0F172A', fontSize: '32px', fontWeight: 900, margin: '0 0 12px', lineHeight: 1.1 }}>
                  {selectedBadge.title}
                </h2>
                <p style={{ color: '#64748B', fontSize: '16px', lineHeight: 1.5, margin: '0 0 32px' }}>
                  {selectedBadge.desc}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    const b = selectedBadge;
                    setSelectedBadge(null);
                    navigate('/app/ava', {
                      state: {
                        initialPrompt: `I recorded the "${b.title}" milestone on HealthChain (${b.desc}). Please summarize the underlying activity without inferring that it changed my health, and suggest one useful next step for my active case.`
                      }
                    });
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 700,
                    padding: '14px',
                    borderRadius: '20px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    marginBottom: '10px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                  }}
                >
                  <MessageSquare size={18} color="#38BDF8" /> Discuss Milestone with Ava
                </button>

                <button
                  onClick={async () => {
                      triggerHapticLight();
                      const shareData = {
                        title: `My ${selectedBadge.title} milestone`,
                        text: `I recorded the ${selectedBadge.title} milestone on HealthChain360.`,
                        url: window.location.href,
                      };
                      if (navigator.share) {
                        try {
                          await navigator.share(shareData);
                        } catch (err) {
                          // user cancelled share or error
                        }
                      } else {
                        try {
                          if (navigator.clipboard?.writeText) {
                            await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                            toast.success('Achievement Copied!', 'Badge details copied to clipboard. Ready to share!');
                          } else {
                            toast.info('Share Badge', 'Take a screenshot of this badge card to share!');
                          }
                        } catch {
                          toast.info('Share Badge', 'Take a screenshot of this badge card to share!');
                        }
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
                  <Share size={20} /> Share milestone
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

