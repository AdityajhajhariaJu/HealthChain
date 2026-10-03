import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Share, Star, Trophy, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/ToastProvider';
import { VitalityNav } from '../../components/ui/VitalityNav';
import { useIsMobile } from '../../hooks/useIsMobile';
import { captureAccountScope, isAccountScopeCurrent } from '../../services/AccountScope';
import { FitnessService } from '../../services/FitnessService';
import { triggerHapticLight } from '../../services/haptics';
import { supabase } from '../../services/supabaseClient';
import { getGamificationHub, importEarnedTrophies } from '../../services/GamificationHub';
import { getActiveProfileScope } from '../../services/profileScope';

import { TROPHIES } from '../../services/gamification/trophies';
import { getVitalityState } from '../../services/VitalityPointsEngine';

const BADGE_DICTIONARY = TROPHIES.filter((badge) => !badge.slug.startsWith('garden_'));

export const TrophyCabinet: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [earnedSlugs, setEarnedSlugs] = useState<Set<string>>(new Set());
  const badgeRequest = useRef(0);
  const badgeScope = useRef('');
  const [badgeError, setBadgeError] = useState('');
  const [, setPointsRevision] = useState(0);
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
    const refresh = () => {
      void loadBadges();
    };
    const refreshOwner = () => {
      const scope = captureAccountScope();
      if (badgeScope.current !== `${scope.key}:${scope.epoch}`) refresh();
    };
    const refreshPoints = () => {
      setPointsRevision((value) => value + 1);
      setEarnedSlugs(new Set(getGamificationHub().trophies));
    };
    refresh();
    window.addEventListener('hc_profile_updated', refreshOwner);
    window.addEventListener('hc_points_updated', refreshPoints);
    window.addEventListener('hc_logout', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      badgeRequest.current++;
      window.removeEventListener('hc_profile_updated', refreshOwner);
      window.removeEventListener('hc_points_updated', refreshPoints);
      window.removeEventListener('hc_logout', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const loadBadges = async () => {
    const scope = captureAccountScope();
    const rewardScope = getActiveProfileScope();
    const request = ++badgeRequest.current;
    badgeScope.current = `${scope.key}:${scope.epoch}`;
    const current = () => request === badgeRequest.current && isAccountScopeCurrent(scope);
    try {
      setLoading(true);
      setEarnedSlugs(new Set(getGamificationHub().trophies));
      setSelectedBadge(null);
      setBadgeError('');
      if (scope.accountId === 'guest') return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!current()) return;

      if (session?.user?.id === scope.accountId) {
        const badges = await FitnessService.getUserBadges(session.user.id);
        if (!current()) return;
        importEarnedTrophies(
          badges.map((b) => b.badge_slug),
          rewardScope
        );
        setEarnedSlugs(new Set(getGamificationHub().trophies));
      } else {
        // Local achievements remain available when the account session is unavailable.
        setEarnedSlugs(new Set(getGamificationHub().trophies));
      }
    } catch (err) {
      console.error(err);
      if (current())
        setBadgeError(
          'Saved milestones could not be loaded. Retry to check your recorded achievements.'
        );
    } finally {
      if (current()) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        role="status"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          color: '#7C3AED',
        }}
      >
        Loading milestones…
      </div>
    );
  }

  const earnedCount = BADGE_DICTIONARY.filter((badge) => earnedSlugs.has(badge.slug)).length;
  const totalCount = BADGE_DICTIONARY.length;
  const vitalityState = getVitalityState();

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#FBF9F6',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '40px',
        overflowX: 'hidden',
      }}
    >
      <div style={{ paddingTop: isMobile ? '12px' : '24px' }}>
        <VitalityNav />
      </div>
      {/* Header */}
      <div style={{ padding: isMobile ? '32px 24px 16px' : '48px 40px 24px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: isMobile ? 'clamp(26px, 7vw, 32px)' : '42px',
            fontWeight: 800,
            color: '#0F172A',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            letterSpacing: '-0.5px',
          }}
        >
          Milestones <Trophy size={32} color="#DF7045" />
        </h1>
        <p style={{ margin: '8px 0 0', color: '#64748B', fontSize: '16px' }}>
          Useful actions you completed.
        </p>
      </div>

      <div
        style={{
          padding: isMobile ? '0 24px 24px' : '0 40px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
        }}
      >
        {badgeError && (
          <div
            role="alert"
            style={{ padding: 12, color: '#92400E', background: '#FFFBEB', borderRadius: 12 }}
          >
            {badgeError}{' '}
            <button type="button" onClick={() => void loadBadges()}>
              Retry milestones
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '12px',
            backgroundColor: 'rgba(0,0,0,0.02)',
            padding: '20px',
            borderRadius: '24px',
            border: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
              {earnedCount}/{totalCount}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#64748B',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              Recorded
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              borderLeft: '1px solid rgba(0,0,0,0.05)',
              borderRight: '1px solid rgba(0,0,0,0.05)',
              padding: '0 4px',
            }}
          >
            <div
              style={{
                fontSize: isMobile ? '14px' : '18px',
                fontWeight: 800,
                color: '#8B5CF6',
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {vitalityState.tier}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#64748B',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              Activity level
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>
              {vitalityState.points}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#64748B',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              Activity points
            </div>
          </div>
        </div>

        {/* Badges Grid */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '20px' }}>
            Recorded milestones
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: '16px',
            }}
          >
            {BADGE_DICTIONARY.map((badge, _idx) => {
              const isEarned = earnedSlugs.has(badge.slug);

              return (
                <motion.div
                  key={badge.slug}
                  role={isEarned ? 'button' : undefined}
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
                    overflow: 'hidden',
                  }}
                >
                  {/* Glossy overlay */}
                  {isEarned && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background:
                          'linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  <div
                    style={{
                      fontSize: '48px',
                      marginBottom: '12px',
                      filter: isEarned ? `drop-shadow(0 0 12px ${badge.color})` : 'grayscale(100%)',
                    }}
                  >
                    {badge.icon}
                  </div>
                  <h3
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: '#0F172A',
                      margin: '0 0 4px',
                    }}
                  >
                    {badge.title}
                  </h3>
                  {isEarned ? (
                    <span
                      style={{
                        fontSize: '11px',
                        color: badge.color,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {badge.category}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                      Not yet recorded
                    </span>
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
            data-overlay-viewport="center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={selectedBadge.title}
            style={{
              position: 'fixed',
              zIndex: 1000,
              backgroundColor: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              data-overlay-panel=""
              role="dialog"
              aria-modal="true"
              aria-label={`Achievement: ${selectedBadge.title}`}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '360px',
                maxHeight: 'var(--overlay-available-height)',
                overflowY: 'auto',
                background: `linear-gradient(135deg, #FFFFFF 0%, #FBF9F6 100%)`,
                borderRadius: '32px',
                padding: '32px 24px',
                boxShadow: `0 25px 50px -12px ${selectedBadge.color}60`,
                border: `1px solid ${selectedBadge.color}80`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                aria-label="Close milestone dialog"
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(0,0,0,0.05)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0F172A',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>

              {/* Decorative Background Glow */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) translateZ(0)',
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  background: selectedBadge.color,
                  filter: 'blur(80px)',
                  willChange: 'transform',
                  opacity: 0.3,
                  zIndex: 0,
                }}
              />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    fontSize: '80px',
                    marginBottom: '24px',
                    filter: `drop-shadow(0 0 20px ${selectedBadge.color})`,
                  }}
                >
                  {selectedBadge.icon}
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: `${selectedBadge.color}20`,
                    padding: '6px 12px',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    border: `1px solid ${selectedBadge.color}40`,
                  }}
                >
                  <Star size={14} color={selectedBadge.color} fill={selectedBadge.color} />
                  <span
                    style={{
                      color: selectedBadge.color,
                      fontSize: '12px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    {selectedBadge.category} milestone
                  </span>
                </div>

                <h2
                  style={{
                    color: '#0F172A',
                    fontSize: '32px',
                    fontWeight: 900,
                    margin: '0 0 12px',
                    lineHeight: 1.1,
                  }}
                >
                  {selectedBadge.title}
                </h2>
                <p
                  style={{
                    color: '#64748B',
                    fontSize: '16px',
                    lineHeight: 1.5,
                    margin: '0 0 32px',
                  }}
                >
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
                        initialPrompt: `I recorded the "${b.title}" milestone on HealthChain (${b.desc}). Please summarize the underlying activity without inferring that it changed my health, and suggest one useful next step for my active case.`,
                      },
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
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
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
                          toast.success(
                            'Achievement Copied!',
                            'Badge details copied to clipboard. Ready to share!'
                          );
                        } else {
                          toast.info(
                            'Share Badge',
                            'Take a screenshot of this badge card to share!'
                          );
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
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
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
