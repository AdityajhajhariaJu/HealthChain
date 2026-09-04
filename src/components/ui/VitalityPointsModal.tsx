import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Zap, Sparkles, CheckCircle2, ArrowRight, Flame, Droplets, HeartPulse, Award, ShieldCheck, ChevronRight, Gift, Brain, Heart } from 'lucide-react';
import { getVitalityState, TIERS, VitalityState } from '../../services/VitalityPointsEngine';
import { triggerHapticLight } from '../../services/haptics';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function VitalityPointsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<VitalityState>(getVitalityState());
  const [activeTab, setActiveTab] = useState<'quests' | 'tiers' | 'history'>('quests');
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleOpen = () => {
      setState(getVitalityState());
      setIsOpen(true);
    };
    const handleUpdate = () => {
      setState(getVitalityState());
    };

    window.addEventListener('hc_open_points_modal', handleOpen);
    window.addEventListener('hc_points_updated', handleUpdate);
    return () => {
      window.removeEventListener('hc_open_points_modal', handleOpen);
      window.removeEventListener('hc_points_updated', handleUpdate);
    };
  }, []);

  const handleClose = () => {
    triggerHapticLight();
    setIsOpen(false);
  };

  const handleQuestAction = (route: string) => {
    triggerHapticLight();
    setIsOpen(false);
    navigate(route);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTierObj = TIERS.find(t => t.name === state.tier) || TIERS[0];

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: isMobile ? '12px' : '24px',
        }}
        onClick={handleClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Vitality Points & Rewards"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)',
            border: '1px solid #E2E8F0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #064E3B 0%, #065F46 50%, #047857 100%)',
              padding: isMobile ? '20px 20px 16px' : '26px 28px 20px',
              color: '#FFFFFF',
              position: 'relative',
            }}
          >
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                HealthChain Vitality
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>
                    {state.points}
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#A7F3D0' }}>PTS</span>
                </div>
                <div style={{ fontSize: '13px', color: '#D1FAE5', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{currentTierObj.badge} Level {state.tierLevel}: <strong>{state.tier}</strong></span>
                </div>
              </div>

              {state.tierLevel < 4 && (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11.5px', color: '#A7F3D0', fontWeight: 600 }}>
                    {state.pointsToNextTier} PTS to {TIERS[state.tierLevel]?.name || 'Next Tier'}
                  </span>
                  <div style={{ width: '130px', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '999px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${state.tierProgress}%`, height: '100%', background: '#34D399', borderRadius: '999px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Ava Tier Strategy Concierge Bridge */}
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  handleClose();
                  navigate('/app/ava', {
                    state: {
                      initialPrompt: `Hi Ava, I currently have ${state.points} Vitality Points at ${state.tier} (Level ${state.tierLevel}). I need ${state.pointsToNextTier} more points to reach the next tier (${TIERS[state.tierLevel]?.name || 'Next Tier'}). Could you review my clinical profile and build an achievable 7-day personalized habit roadmap to help me advance?`
                    }
                  });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backdropFilter: 'blur(8px)',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'}
              >
                <Sparkles size={14} color="#A7F3D0" />
                <span>Strategize Health Tier with Ava</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', padding: '4px 12px' }}>
            {[
              { id: 'quests', label: 'Daily Missions' },
              { id: 'tiers', label: 'Tiers & Perks' },
              { id: 'history', label: 'History' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHapticLight();
                  setActiveTab(tab.id as any);
                }}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2.5px solid #059669' : '2.5px solid transparent',
                  color: activeTab === tab.id ? '#065F46' : '#64748B',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div style={{ padding: isMobile ? '16px' : '20px', overflowY: 'auto', flex: 1 }}>
            {activeTab === 'quests' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '2px' }}>
                  Complete daily health actions to level up your Vitality status:
                </div>

                {/* Quest 1: Daily Checkin */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: state.completedQuests.dailyCheckin ? '#F0FDF4' : '#FFFFFF',
                    border: `1px solid ${state.completedQuests.dailyCheckin ? '#BBF7D0' : '#E2E8F0'}`,
                    borderRadius: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <HeartPulse size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>10-Sec Daily Symptom Pulse</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>Keep your baseline updated</div>
                    </div>
                  </div>
                  {state.completedQuests.dailyCheckin ? (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={15} /> +2 PTS
                    </span>
                  ) : (
                    <button onClick={() => handleQuestAction('/app/today')} className="btn btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      Log (+2 PTS)
                    </button>
                  )}
                </div>

                {/* Quest 2: Lifestyle Vitals */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: state.completedQuests.lifestyleLog ? '#F0FDF4' : '#FFFFFF',
                    border: `1px solid ${state.completedQuests.lifestyleLog ? '#BBF7D0' : '#E2E8F0'}`,
                    borderRadius: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Droplets size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Log Hydration, Sleep or Energy</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>1-tap lifestyle micro-tags</div>
                    </div>
                  </div>
                  {state.completedQuests.lifestyleLog ? (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={15} /> +1 PTS
                    </span>
                  ) : (
                    <button onClick={() => handleQuestAction('/app/today')} className="btn btn-outline btn-sm" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      Tag (+1 PTS)
                    </button>
                  )}
                </div>

                {/* Quest 3: Research Hub */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: state.completedQuests.researchSearch ? '#F0FDF4' : '#FFFFFF',
                    border: `1px solid ${state.completedQuests.researchSearch ? '#BBF7D0' : '#E2E8F0'}`,
                    borderRadius: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FDF4FF', color: '#C026D3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Explore Clinical Trials & Research</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>Search global registries for any topic</div>
                    </div>
                  </div>
                  {state.completedQuests.researchSearch ? (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={15} /> +2 PTS
                    </span>
                  ) : (
                    <button onClick={() => handleQuestAction('/app/trials')} className="btn btn-outline btn-sm" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      Search (+2 PTS)
                    </button>
                  )}
                </div>

                {/* Quest 4: Mystery Drop */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Gift size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Daily Mystery Vitality Drop</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>Tap to claim your daily random drop</div>
                    </div>
                  </div>
                  <button onClick={() => handleQuestAction('/app/today')} className="btn btn-outline btn-sm" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    Play (+1-5 PTS)
                  </button>
                </div>

                {/* Quest 5: Longevity Brain Byte */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F0F9FF', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Brain size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Longevity Brain Byte Quiz</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>Daily evidence-based micro trivia</div>
                    </div>
                  </div>
                  <button onClick={() => handleQuestAction('/app/today')} className="btn btn-outline btn-sm" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    Quiz (+2 PTS)
                  </button>
                </div>

                {/* Quest 6: Mindful Breathwork */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FAF5FF', color: '#7E22CE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Heart size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>60-Sec Mindful HRV Reset</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>4-4-4 Calming Vagal Nerve Rhythm</div>
                    </div>
                  </div>
                  <button onClick={() => handleQuestAction('/app/today')} className="btn btn-outline btn-sm" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    Reset (+3 PTS)
                  </button>
                </div>

                {/* Quest 7: Clinical Consult */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: state.completedQuests.clinicalConsult ? '#F0FDF4' : '#FFFFFF',
                    border: `1px solid ${state.completedQuests.clinicalConsult ? '#BBF7D0' : '#E2E8F0'}`,
                    borderRadius: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFF7ED', color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Start a Specialist Consult</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>Quick consult or J.A.R.V.I.S. investigation</div>
                    </div>
                  </div>
                  <button onClick={() => handleQuestAction('/app/consult')} className="btn btn-outline btn-sm" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    Start (+5 PTS)
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'tiers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {TIERS.map(tier => {
                  const isCurrent = tier.name === state.tier;
                  const isUnlocked = state.points >= tier.min;
                  return (
                    <div
                      key={tier.level}
                      style={{
                        padding: '16px',
                        borderRadius: '16px',
                        background: isCurrent ? '#F0FDF4' : '#FFFFFF',
                        border: isCurrent ? '2px solid #059669' : '1px solid #E2E8F0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>{tier.badge}</span>
                          <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>{tier.name}</span>
                          {isCurrent && (
                            <span style={{ background: '#059669', color: '#FFFFFF', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase' }}>
                              Current
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: isUnlocked ? '#059669' : '#94A3B8' }}>
                          {tier.min}{tier.max < 9000 ? ` - ${tier.max}` : '+'} PTS
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: 1.4 }}>
                        {tier.perk}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {state.history.length > 0 ? (
                  state.history.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: '#F8FAFC',
                        border: '1px solid #F1F5F9',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{item.reason}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                          {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#059669' }}>
                        +{item.amount} PTS
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    No points history recorded yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
